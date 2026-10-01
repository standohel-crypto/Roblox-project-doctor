import { randomBytes, createHash, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { database } from './analytics.js';
const scrypt = promisify(scryptCallback);
const hash = value => createHash('sha256').update(value).digest('hex');
const secure = process.env.NODE_ENV === 'production' || !!process.env.RENDER;
const cookieName = secure ? '__Host-doctor_session' : 'doctor_session';
const cookieOptions = { httpOnly:true, secure, sameSite:'lax', path:'/' };
let ready;
async function db() {
 const pool = await database();
 if(!ready) ready = pool.query(`CREATE TABLE IF NOT EXISTS doctor_users (
 id bigserial PRIMARY KEY, username varchar(24) UNIQUE NOT NULL, password_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now());
 CREATE TABLE IF NOT EXISTS doctor_sessions (
 token_hash char(64) PRIMARY KEY, user_id bigint NOT NULL REFERENCES doctor_users(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL);
 CREATE INDEX IF NOT EXISTS doctor_sessions_expiry ON doctor_sessions(expires_at);`).catch(e=>{ready=null;throw e;});
 await ready; return pool;
}
export async function passwordHash(password) {
 const salt=randomBytes(16).toString('hex');
 const key=await scrypt(password,salt,64);
 return `${salt}:${key.toString('hex')}`;
}
export async function passwordMatches(password,stored) {
 const [salt,expected]=stored.split(':');
 const key=await scrypt(password,salt,64);
 const other=Buffer.from(expected,'hex');
 return key.length===other.length && timingSafeEqual(key,other);
}
const dummy = passwordHash(randomBytes(32).toString('hex'));
function token(req) {
 const value=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1);
 return /^[a-f0-9]{64}$/.test(value||'')?value:null;
}
export function sameOrigin(req,res,next) {
 let allowed;
 try { allowed=process.env.PUBLIC_URL ? new URL(process.env.PUBLIC_URL).origin : `${secure?'https':'http'}://${req.get('host')}`; } catch { return res.status(503).json({message:'Проверь PUBLIC_URL на сервере.'}); }
 if(req.get('origin')!==allowed)return res.status(403).json({message:'Запрос с другого сайта запрещён.'});
 next();
}
// Single-process throttling. Behind a proxy this deliberately uses the actual peer IP,
// never an untrusted X-Forwarded-For header. Shared IPs can share the limit.
const attempts=new Map();
let active=0;
function rateLimit(req,res,next) {
 const now=Date.now();
 for(const [k,v] of attempts)if(v.until<=now)attempts.delete(k);
 const key=req.ip; const item=attempts.get(key)||{count:0,until:now+15*60*1000};
 if(item.count>=30||active>=4||(!attempts.has(key)&&attempts.size>=10000))return res.status(429).json({message:'Слишком много попыток. Повтори позже.'});
 item.count++;attempts.set(key,item);next();
}
async function current(req) {
 const value=token(req);if(!value)return null;
 const pool=await db();
 const result=await pool.query('SELECT u.id,u.username FROM doctor_sessions s JOIN doctor_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()',[hash(value)]);
 return result.rows[0]||null;
}
async function session(req,res,userId,pool) {
 const value=randomBytes(32).toString('hex');
 await pool.query("INSERT INTO doctor_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '7 days')",[hash(value),userId]);
 const old=token(req);if(old)await pool.query('DELETE FROM doctor_sessions WHERE token_hash=$1',[hash(old)]);
 res.cookie(cookieName,value,{...cookieOptions,maxAge:7*86400000});
 await pool.query('DELETE FROM doctor_sessions WHERE expires_at<now()');
}
const endpoint=fn=>async(req,res)=>{try{await fn(req,res);}catch{res.status(503).json({message:'Аккаунты временно недоступны. Повтори позже.'});}};
export function installAuth(app) {
 app.use('/api/auth',(req,res,next)=>{res.set('Cache-Control','no-store');next();});
 app.get('/api/auth/me',endpoint(async(req,res)=>res.json({user:await current(req)})));
 for(const action of ['register','login'])app.post('/api/auth/'+action,sameOrigin,rateLimit,endpoint(async(req,res)=>{
  const username=typeof req.body?.username==='string'?req.body.username.trim().toLowerCase():'';
  const password=req.body?.password;
  if(!/^[a-z0-9_]{3,24}$/.test(username)||typeof password!=='string'||password.length<12||Buffer.byteLength(password)>256)return res.status(400).json({message:'Логин: 3–24 латинских буквы, цифры или _. Пароль: от 12 символов, максимум 256 байт.'});
  active++;
  try {
   const pool=await db();let user;
   if(action==='register') {
    const encoded=await passwordHash(password);
    try {
     const created=await pool.query('INSERT INTO doctor_users(username,password_hash) VALUES($1,$2) RETURNING id,username',[username,encoded]);
     user=created.rows[0];
    } catch(error) {
     if(error.code==='23505')return res.status(409).json({message:'Этот логин занят. Выбери другой.'});
     throw error;
    }
   } else {
    const found=await pool.query('SELECT id,username,password_hash FROM doctor_users WHERE username=$1',[username]);
    const match=await passwordMatches(password,found.rows[0]?.password_hash||await dummy);
    if(!match||!found.rows[0])return res.status(401).json({message:'Неверный логин или пароль.'});
    user={id:found.rows[0].id,username:found.rows[0].username};
   }
   await session(req,res,user.id,pool);res.json({user});
  }finally{active--;}
 }));
 app.post('/api/auth/logout',sameOrigin,endpoint(async(req,res)=>{
  const value=token(req);if(value){const pool=await db();await pool.query('DELETE FROM doctor_sessions WHERE token_hash=$1',[hash(value)]);}
  res.clearCookie(cookieName,cookieOptions);res.json({ok:true});
 }));
}
