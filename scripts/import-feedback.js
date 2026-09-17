// Run with an exported copy of the old feedback.jsonl; repeat imports are safe.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { database,pool } from '../analytics.js';
try {
  if(!process.argv[2])throw new Error('Укажи путь к feedback.jsonl');
  const lines=(await readFile(process.argv[2],'utf8')).split(/\r?\n/);
  const db=await database();let added=0,skipped=0;
  for(let i=0;i<lines.length;i++){
    if(!lines[i].trim())continue;
    let r;try{r=JSON.parse(lines[i]);}catch{skipped++;continue;}
    if(typeof r.ruleId!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(r.ruleId)||typeof r.helpful!=='boolean'||!['ru','en'].includes(r.language)||typeof r.createdAt!=='string'||!Number.isFinite(Date.parse(r.createdAt))){skipped++;continue;}
    const key=createHash('sha256').update(JSON.stringify([i,r.ruleId,r.helpful,r.language,r.createdAt])).digest('hex');
    const result=await db.query('INSERT INTO doctor_feedback(rule_id,helpful,language,created_at,legacy_key) VALUES($1,$2,$3,$4,$5) ON CONFLICT(legacy_key) DO NOTHING',[r.ruleId,r.helpful,r.language,r.createdAt,key]);added+=result.rowCount;
  }
  console.log(`Добавлено: ${added}; некорректных строк: ${skipped}`);
}catch{console.error('Импорт не выполнен полностью. Проверь файл и DATABASE_URL; повторный запуск допустим.');process.exitCode=1;}
finally{await pool?.end();}
