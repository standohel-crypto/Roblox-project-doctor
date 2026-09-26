import { Pool } from 'pg';
import { createHash, timingSafeEqual } from 'node:crypto';
import path from 'node:path';

export const pool = process.env.DATABASE_URL ? new Pool({
  connectionString: process.env.DATABASE_URL, max: 4,
  connectionTimeoutMillis: 4000, statement_timeout: 5000
}) : null;
pool?.on('error', () => console.error('Соединение статистики прервано'));
let initialization;
export async function database() {
  if (!pool) throw new Error('DATABASE_URL не настроен');
  if (!initialization) initialization = pool.query(`
    CREATE TABLE IF NOT EXISTS doctor_visits (
      day date NOT NULL, visitor_id uuid NOT NULL, last_seen timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY(day, visitor_id));
    CREATE INDEX IF NOT EXISTS doctor_visits_seen ON doctor_visits(last_seen);
    CREATE TABLE IF NOT EXISTS doctor_feedback (
      id bigserial PRIMARY KEY, rule_id varchar(80) NOT NULL, helpful boolean NOT NULL,
      language varchar(2) NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
      legacy_key text UNIQUE);
    CREATE INDEX IF NOT EXISTS doctor_feedback_date ON doctor_feedback(created_at);
    CREATE TABLE IF NOT EXISTS doctor_runs (
      id bigserial PRIMARY KEY, kind text NOT NULL, status text NOT NULL DEFAULT 'running',
      started_at timestamptz NOT NULL DEFAULT now(), duration_ms integer, issues integer);
    CREATE INDEX IF NOT EXISTS doctor_runs_date ON doctor_runs(started_at);
  `).catch(error => { initialization = null; throw error; });
  await initialization;
  return pool;
}
const daySQL = "(now() AT TIME ZONE 'Asia/Almaty')::date";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function adminAuth(req, res, next) {
  res.set('Cache-Control', 'no-store');
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.length < 24) return res.status(503).send('Доступ администратора не настроен');
  const value = req.headers.authorization || '';
  const decoded = value.startsWith('Basic ') ? Buffer.from(value.slice(6), 'base64').toString() : '';
  const digest = value => createHash('sha256').update(value).digest();
  if (!timingSafeEqual(digest(decoded), digest(`admin:${password}`))) {
    res.set('WWW-Authenticate', 'Basic realm="Project Doctor", charset="UTF-8"');
    return res.status(401).send('Требуется вход');
  }
  next();
}
export function installAnalytics(app) {
  app.post('/api/presence', async (req, res) => {
    if (!uuid.test(req.body?.visitorId || '')) return res.status(400).json({message:'Неверный ID'});
    try {
      const db = await database();
      await db.query(`INSERT INTO doctor_visits(day,visitor_id) VALUES (${daySQL},$1)
        ON CONFLICT(day,visitor_id) DO UPDATE SET last_seen=now()`, [req.body.visitorId]);
      const {rows} = await db.query(`SELECT
        (SELECT count(DISTINCT visitor_id)::int FROM doctor_visits WHERE last_seen > now()-interval '60 seconds') AS online,
        (SELECT count(*)::int FROM doctor_visits WHERE day=${daySQL}) AS today`);
      res.set('Cache-Control','no-store').json(rows[0]);
    } catch { res.status(503).json({message:'Статистика временно недоступна'}); }
  });
  app.post('/api/feedback', async (req,res) => {
    const {ruleId,helpful,language} = req.body ?? {};
    if (typeof ruleId!=='string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(ruleId) || typeof helpful!=='boolean' || !['ru','en'].includes(language)) return res.status(400).json({saved:false});
    try {
      const db = await database();
      await db.query('INSERT INTO doctor_feedback(rule_id,helpful,language) VALUES($1,$2,$3)',[ruleId,helpful,language]);
      res.json({saved:true});
    } catch { console.error('Отзыв не сохранён: база недоступна'); res.status(503).json({saved:false}); }
  });
  // Count valid server requests, never source code or AI response text.
  app.use(async (req,res,next) => {
    if (req.method!=='POST' || !['/code','/api/review'].includes(req.path)) return next();
    const {code,language}=req.body??{};
    if (typeof code!=='string'||!code.trim()||Buffer.byteLength(code)>50000 || (req.path==='/api/review'&&!['ru','en'].includes(language))) return next();
    let id;
    const kind=req.path==='/code'?'luau':'ai', start=Date.now();
    try { const db=await database(); id=(await db.query('INSERT INTO doctor_runs(kind) VALUES($1) RETURNING id',[kind])).rows[0].id; }
    catch { console.error('Запрос анализа не учтён: база статистики недоступна'); }
    let outcome='failed', issues=null;
    const json=res.json;
    res.json=function(body) {
      outcome = res.statusCode<400 && (kind==='ai' ? body?.status==='done' : Array.isArray(body?.issues)) ? 'done' : 'failed';
      issues = kind==='luau' && Array.isArray(body?.issues) ? body.issues.length : null;
      return json.call(this,body);
    };
    res.once('close',()=>{
      if (!id) return;
      const status=res.writableFinished?outcome:'interrupted';
      pool.query('UPDATE doctor_runs SET status=$1,duration_ms=$2,issues=$3 WHERE id=$4',
        [status,Math.min(Date.now()-start,2147483647),issues,id]).catch(()=>console.error('Результат анализа не учтён: база недоступна'));
    });
    next();
  });
  app.use('/admin',adminAuth);
  const root=path.join(import.meta.dirname,'admin');
  app.get('/admin',(_,res)=>res.sendFile(path.join(root,'index.html')));
  app.get('/admin/app.js',(_,res)=>res.sendFile(path.join(root,'app.js')));
  app.get('/admin/style.css',(_,res)=>res.sendFile(path.join(root,'style.css')));
  app.get('/admin/stats',async(req,res)=>{
    const days=Number(req.query.days??7);
    if (![1,7,30].includes(days)) return res.status(400).json({error:'Неверный период'});
    try {
      const db=await database();
      const start=`((${daySQL}-($1::int-1))::timestamp AT TIME ZONE 'Asia/Almaty')`;
      const [visits,runs,votes,rules,recent,daily] = await Promise.all([
        db.query(`SELECT count(DISTINCT visitor_id)::int AS visitors,
          (SELECT count(DISTINCT visitor_id)::int FROM doctor_visits WHERE last_seen>now()-interval '60 seconds') AS online,
          count(*) FILTER(WHERE day=${daySQL})::int AS today FROM doctor_visits WHERE day>=${daySQL}-($1::int-1)`,[days]),
        db.query(`SELECT kind,count(*)::int AS total,
          count(*) FILTER(WHERE status='done')::int AS done,
          count(*) FILTER(WHERE status='failed')::int AS failed,
          count(*) FILTER(WHERE status='interrupted' OR (status='running' AND started_at<now()-interval '2 minutes'))::int AS interrupted,
          count(*) FILTER(WHERE status='running' AND started_at>=now()-interval '2 minutes')::int AS running,
          round(avg(duration_ms) FILTER(WHERE status='done'))::int AS avg_ms
          FROM doctor_runs WHERE started_at>=${start} GROUP BY kind`,[days]),
        db.query(`SELECT count(*) FILTER(WHERE helpful)::int AS yes,count(*) FILTER(WHERE NOT helpful)::int AS no FROM doctor_feedback WHERE created_at>=${start}`,[days]),
        db.query(`SELECT rule_id,count(*) FILTER(WHERE helpful)::int AS yes,count(*) FILTER(WHERE NOT helpful)::int AS no FROM doctor_feedback WHERE created_at>=${start} GROUP BY rule_id ORDER BY count(*) DESC,rule_id LIMIT 100`,[days]),
        db.query(`SELECT rule_id,helpful,language,created_at FROM doctor_feedback WHERE created_at>=${start} ORDER BY created_at DESC,id DESC LIMIT 100`,[days]),
        db.query(`SELECT to_char(day,'YYYY-MM-DD') AS day,count(*)::int AS visitors FROM doctor_visits WHERE day>=${daySQL}-($1::int-1) GROUP BY day ORDER BY day`,[days])
      ]);
      res.json({generatedAt:new Date().toISOString(),days,visits:visits.rows[0],runs:runs.rows,votes:votes.rows[0],rules:rules.rows,recent:recent.rows,daily:daily.rows});
    } catch { res.status(503).json({error:'База статистики недоступна. Проверь DATABASE_URL и подключение.'}); }
  });
}
