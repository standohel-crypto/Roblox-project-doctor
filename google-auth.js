import { randomBytes, createHash } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { authDatabase, createSession, passwordHash, sameOrigin } from './auth.js';
const digest=value=>createHash('sha256').update(value).digest('hex');
const secure=process.env.NODE_ENV==='production'||!!process.env.RENDER;
const cookieName=secure?'__Host-doctor_oauth':'doctor_oauth';
const cookieOptions={httpOnly:true,secure,sameSite:'lax',path:'/'};
function config(){
 try {
  const origin=new URL(process.env.PUBLIC_URL).origin;
  if(!process.env.GOOGLE_CLIENT_ID||!process.env.GOOGLE_CLIENT_SECRET|| (secure&&!origin.startsWith('https://')))return null;
  return {origin,clientId:process.env.GOOGLE_CLIENT_ID,clientSecret:process.env.GOOGLE_CLIENT_SECRET,redirectUri:origin+'/api/auth/google/callback'};
 }catch{return null;}
}
let ready;
async function database(){
 const pool=await authDatabase();
 if(!ready)ready=pool.query(`CREATE TABLE IF NOT EXISTS doctor_google_identities (
 sub text PRIMARY KEY,user_id bigint NOT NULL UNIQUE REFERENCES doctor_users(id) ON DELETE CASCADE);
 CREATE TABLE IF NOT EXISTS doctor_oauth_flows (
 state_hash char(64) PRIMARY KEY,browser_hash char(64) NOT NULL,verifier text NOT NULL,nonce text NOT NULL,expires_at timestamptz NOT NULL);
 ALTER TABLE doctor_users ADD COLUMN IF NOT EXISTS display_name varchar(100);`).catch(e=>{ready=null;throw e;});
 await ready;return pool;
}
export function validGooglePayload(payload,nonce){
 return !!payload && typeof payload.sub==='string' && payload.sub.length>0 && payload.sub.length<=255 && payload.nonce===nonce;
}
export function installGoogleAuth(app,{clientFactory=c=>new OAuth2Client({clientId:c.clientId,clientSecret:c.clientSecret,redirectUri:c.redirectUri,transporterOptions:{timeout:15000}})}={}){
 app.get('/api/auth/config',(_req,res)=>res.json({googleEnabled:!!config()}));
 app.post('/api/auth/google/start',sameOrigin,async(req,res)=>{
  const c=config();if(!c)return res.status(503).json({message:'Вход через Google пока недоступен.'});
  try {
   const pool=await database();
   await pool.query('DELETE FROM doctor_oauth_flows WHERE expires_at<now()');
   // Bound pending flows globally; no sessions or access tokens are exposed to JavaScript.
   const count=await pool.query('SELECT count(*)::int AS n FROM doctor_oauth_flows');
   if(count.rows[0].n>=1000)return res.status(429).json({message:'Слишком много запросов. Повтори позже.'});
   const state=randomBytes(32).toString('hex'),browser=randomBytes(32).toString('hex'),verifier=randomBytes(32).toString('base64url'),nonce=randomBytes(32).toString('hex');
   await pool.query("INSERT INTO doctor_oauth_flows VALUES($1,$2,$3,$4,now()+interval '10 minutes')",[digest(state),digest(browser),verifier,nonce]);
   const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');
   url.search=new URLSearchParams({client_id:c.clientId,redirect_uri:c.redirectUri,response_type:'code',scope:'openid profile',state,nonce,prompt:'select_account',code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'}).toString();
   res.cookie(cookieName,browser,{...cookieOptions,maxAge:10*60*1000});res.json({url:url.toString()});
  }catch{res.status(503).json({message:'Вход через Google временно недоступен.'});}
 });
 app.get('/api/auth/google/callback',async(req,res)=>{
  res.set('Referrer-Policy','no-referrer');
  const fail=()=>res.redirect('/page/?auth=google_error');
  const c=config();if(!c)return fail();
  const state=req.query.state;
  const browser=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1);
  res.clearCookie(cookieName,cookieOptions);
  if(typeof state!=='string'||! /^[a-f0-9]{64}$/.test(state)||! /^[a-f0-9]{64}$/.test(browser||''))return fail();
  try {
   const pool=await database();
   const flow=(await pool.query('DELETE FROM doctor_oauth_flows WHERE state_hash=$1 AND browser_hash=$2 AND expires_at>now() RETURNING verifier,nonce',[digest(state),digest(browser)])).rows[0];
   if(!flow||req.query.error||typeof req.query.code!=='string'||req.query.code.length>4096)return fail();
   const client=clientFactory(c);
   const {tokens}=await client.getToken({code:req.query.code,codeVerifier:flow.verifier,redirect_uri:c.redirectUri});
   if(!tokens.id_token)return fail();
   const ticket=await client.verifyIdToken({idToken:tokens.id_token,audience:c.clientId});
   const payload=ticket.getPayload();
   if(!validGooglePayload(payload,flow.nonce))return fail();
   // Identity is Google's stable sub, never a browser-supplied ID or matching email.
   let user=(await pool.query('SELECT user_id FROM doctor_google_identities WHERE sub=$1',[payload.sub])).rows[0];
   if(!user){
    const connection=await pool.connect();
    try {
     await connection.query('BEGIN');
     await connection.query('SELECT pg_advisory_xact_lock(hashtext($1))',[payload.sub]);
     user=(await connection.query('SELECT user_id FROM doctor_google_identities WHERE sub=$1',[payload.sub])).rows[0];
     if(!user){
      const name=typeof payload.name==='string'?payload.name.slice(0,100):'Google user';
      const password=await passwordHash(randomBytes(48).toString('base64url'));
      const row=(await connection.query('INSERT INTO doctor_users(username,password_hash,display_name) VALUES($1,$2,$3) RETURNING id',['g_'+randomBytes(10).toString('hex'),password,name])).rows[0];
      await connection.query('INSERT INTO doctor_google_identities(sub,user_id) VALUES($1,$2)',[payload.sub,row.id]);user={user_id:row.id};
     }
     await connection.query('COMMIT');
    }catch(e){await connection.query('ROLLBACK');throw e;}finally{connection.release();}
   }
   await createSession(req,res,user.user_id,pool);
   res.redirect('/page/?auth=google_ok');
  }catch{console.error('Google sign-in failed (no tokens logged)');fail();}
 });
}
