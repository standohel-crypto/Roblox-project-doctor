import path from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { LspClient } from './lsp-client.js';
import { explainDiagnostic } from './diagnostics.js';
const projectPath=path.resolve(import.meta.dirname,'..');
const config={platform:{type:'roblox'},sourcemap:{enabled:false,autogenerate:false},index:{enabled:false},diagnostics:{workspace:false,includeDependents:false},completion:{enabled:false},types:{roblox:true},plugin:{enabled:false}};
export function convertDiagnostics(items) {
 if(!Array.isArray(items))throw new Error('Missing Luau diagnostics');
 return items.map(d=>{
  if(typeof d.message!=='string'||!Number.isInteger(d.range?.start?.line)||!Number.isInteger(d.range?.start?.character))throw new Error('Invalid Luau diagnostic');
  const code=String(d.code??'');
  const prefix=d.message.match(/^([A-Za-z][A-Za-z0-9]*):\s*/);
  const category=prefix?prefix[1]:(/^\d+$/.test(code)?'TypeError':(code||'TypeError'));
  const message=prefix?d.message.slice(prefix[0].length):d.message;
  const description=explainDiagnostic(category,message);
  return {severity:d.severity===1?'critical':d.severity===2?'warning':'info',category,ruleId:description.ruleId,line:d.range.start.line+1,column:d.range.start.character+1,...description.ru,translations:{ru:description.ru,en:description.en},originalMessage:d.message};
 });
}
export class LuauAnalyzer {
 constructor({command,args,cwd=projectPath,timeout=45000,maxQueued=8,recycleAfter=250}={}) {
  this.command=command||process.env.LUAU_LSP_PATH||process.execPath;
  this.args=args||[...(process.env.LUAU_LSP_PATH?[]:[path.join(projectPath,'node_modules','luau-lsp','src','index.js')]),'lsp',`--definitions=${path.join(projectPath,'definitions','roblox.d.luau')}`];
  this.cwd=cwd;this.timeout=timeout;this.maxQueued=maxQueued;this.recycleAfter=recycleAfter;
  this.queue=[];this.running=false;this.client=null;this.count=0;this.closed=false;this.directory=null;
 }
 async start() {
  if(this.client&&!this.client.closed)return;
  if(!this.directory)this.directory=await mkdtemp(path.join(tmpdir(),'doctor-lsp-'));
  const client=new LspClient(this.command,this.args,{cwd:this.directory,config});this.client=client;this.count=0;
  const result=await client.request('initialize',{processId:process.pid,rootUri:null,workspaceFolders:null,capabilities:{workspace:{configuration:true},textDocument:{diagnostic:{dynamicRegistration:false,relatedDocumentSupport:false},publishDiagnostics:{relatedInformation:true}}},initializationOptions:{}},this.timeout);
  if(!result?.capabilities?.diagnosticProvider)throw new Error('Installed Luau LSP does not support pull diagnostics');
  client.notify('initialized',{});
  client.notify('workspace/didChangeConfiguration',{settings:{'luau-lsp':config}});
 }
 analyze(code) {
  if(this.closed)return Promise.reject(new Error('Analyzer stopped'));
  if(typeof code!=='string'||!code.trim()||Buffer.byteLength(code)>50000)return Promise.reject(new Error('Invalid or oversized Luau input'));
  if(this.queue.length>=this.maxQueued)return Promise.reject(new Error('Luau queue full; retry later'));
  return new Promise((resolve,reject)=>{
   const item={code,resolve,reject,created:Date.now()};
   item.timer=setTimeout(()=>{
    const index=this.queue.indexOf(item);if(index>=0){this.queue.splice(index,1);reject(new Error('Luau queue timeout; retry later'));}
   },this.timeout);
   this.queue.push(item);this.drain();
  });
 }
 async drain() {
  if(this.running)return;this.running=true;
  try {
   while(this.queue.length&&!this.closed) {
    const item=this.queue.shift();clearTimeout(item.timer);
    const remaining=this.timeout-(Date.now()-item.created);
    if(remaining<=0){item.reject(new Error('Luau queue timeout'));continue;}
    let timer;
    try {
     const result=await Promise.race([this.run(item.code),new Promise((_,reject)=>{
      timer=setTimeout(()=>{this.client?.stop();reject(new Error('Luau analysis timeout'));},remaining);
     })]);
     item.resolve(result);
    }catch(error){this.client?.stop();item.reject(error);}
    finally{clearTimeout(timer);item.code='';}
   }
  }finally{this.running=false;}
 }
 async run(code) {
  const started=Date.now();const cold=!this.client||this.client.closed;
  await this.start();const client=this.client;
  // One reusable virtual file, serialized requests. Never write user source to disk.
  const uri=pathToFileURL(path.join(this.directory,'input.luau')).href;
  client.notify('textDocument/didOpen',{textDocument:{uri,languageId:'luau',version:1,text:code}});
  try {
   const report=await client.request('textDocument/diagnostic',{textDocument:{uri}},this.timeout);
   if(report?.kind!=='full')throw new Error('Expected full Luau diagnostics');
   const issues=convertDiagnostics(report.items);
   console.log('Результат запуска Luau:',{durationMs:Date.now()-started,mode:'persistent-lsp',coldStart:cold,issues:issues.length});
   return {valid:!issues.some(i=>i.severity==='critical'),message:issues.length?`Найдено проблем: ${issues.length}`:'В рамках текущих проверок проблем не найдено',issues};
  }finally{
   if(!client.closed) {
    // Replace contents before closing to avoid retaining a user's source in the next job.
    client.notify('textDocument/didChange',{textDocument:{uri,version:2},contentChanges:[{text:''}]});
    client.notify('textDocument/didClose',{textDocument:{uri}});
   }
   if(++this.count>=this.recycleAfter)client.stop();
  }
 }
 async close() {
  this.closed=true;this.client?.stop();
  for(const item of this.queue){clearTimeout(item.timer);item.code='';item.reject(new Error('Analyzer stopped'));}this.queue=[];
  if(this.directory)await rm(this.directory,{recursive:true,force:true});
 }
}
const analyzer=new LuauAnalyzer();
export const analyzeWithLuau=code=>analyzer.analyze(code);
export const stopLuau=()=>analyzer.close();
process.once('exit',()=>analyzer.client?.stop());
for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>{analyzer.close().finally(()=>process.exit(signal==='SIGINT'?130:0));});
