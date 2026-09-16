import { execFile } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { explainDiagnostic } from './diagnostics.js';
const projectPath=path.resolve(import.meta.dirname,'..');
const wrapperPath=path.join(projectPath,'node_modules','luau-lsp','src','index.js');
const definitionsPath=path.join(projectPath,'definitions','roblox.d.luau');
export function parseDiagnostics(output) {
 const issues=[];
 for(const text of output.split(/\r?\n/)) {
  const match=text.match(/^(.+)\((\d+),(\d+)\):\s*([^:]+):\s*(.*)$/);
  if(!match)continue;
  const [,file,line,column,rawCategory,message]=match;
  const category=rawCategory.trim();const description=explainDiagnostic(category,message);
  issues.push({severity:category.endsWith('Error')?'critical':'warning',category,ruleId:description.ruleId,line:Number(line),column:Number(column),...description.ru,translations:{ru:description.ru,en:description.en},originalMessage:message});
 }
 return issues;
}
function runAnalyzer(filePath,workingDirectory) {
 return new Promise((resolve,reject)=>{
  const startedAt=Date.now();
  execFile(process.execPath,[wrapperPath,'analyze','--platform=roblox',`--definitions=${definitionsPath}`,filePath],{cwd:workingDirectory,timeout:30000,maxBuffer:1024*1024,windowsHide:true},(error,stdout,stderr)=>{
   console.log('Результат запуска Luau:',{durationMs:Date.now()-startedAt,exitCode:error?(error.code??null):0,signal:error?.signal??null,killed:error?.killed??false});
   const issues=parseDiagnostics(`${stdout}\n${stderr}`);
   if(error && !(error.code===1&&!error.killed&&!error.signal&&issues.length>0)){reject(error);return;}
   resolve(issues);
  });
 });
}
export async function analyzeWithLuau(code) {
 const directory=await mkdtemp(path.join(tmpdir(),'project-doctor-'));
 try {
  const filePath=path.join(directory,'input.luau');await writeFile(filePath,code,'utf8');
  const issues=await runAnalyzer(filePath,directory);
  return {valid:!issues.some(i=>i.severity==='critical'),message:issues.length?`Найдено проблем: ${issues.length}`:'В рамках текущих проверок проблем не найдено',issues};
 } finally {
  try{await rm(directory,{recursive:true,force:true,maxRetries:5,retryDelay:200});}
  catch(error){console.error('Не удалось удалить временную папку:',directory,error.message);}
 }
}
