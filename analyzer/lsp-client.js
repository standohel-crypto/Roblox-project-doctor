import { spawn } from 'node:child_process';

// A small stdio JSON-RPC client. One process belongs to one analyzer worker.
export class LspClient {
 constructor(command,args,options={}) {
  this.pending=new Map();this.nextId=0;this.buffer=Buffer.alloc(0);this.closed=false;
  this.config=options.config||{};
  this.child=spawn(command,args,{cwd:options.cwd,windowsHide:true,detached:process.platform!=='win32',stdio:['pipe','pipe','pipe']});
  this.child.stdout.on('data',data=>this.receive(data));
  // Drain stderr, but do not log user source or diagnostics.
  this.child.stderr.on('data',()=>{});
  this.child.stdin.on('error',()=>this.stop(new Error('LSP input closed')));
  this.child.on('error',()=>this.stop(new Error('Cannot start Luau LSP')));
  this.child.on('exit',()=>this.stop(new Error('Luau LSP exited')));
 }
 send(message) {
  if(this.closed)throw new Error('Luau LSP is closed');
  const body=Buffer.from(JSON.stringify({jsonrpc:'2.0',...message}));
  this.child.stdin.write(Buffer.concat([Buffer.from(`Content-Length: ${body.length}\r\n\r\n`),body]));
 }
 notify(method,params){this.send({method,params});}
 request(method,params,timeout=40000) {
  return new Promise((resolve,reject)=>{
   const id=++this.nextId;
   const timer=setTimeout(()=>this.stop(new Error('Luau LSP request timeout')),timeout);
   this.pending.set(id,{resolve,reject,timer});
   try{this.send({id,method,params});}catch(error){clearTimeout(timer);this.pending.delete(id);reject(error);}
  });
 }
 receive(data) {
  try {
   this.buffer=Buffer.concat([this.buffer,data]);
   while(true) {
    const end=this.buffer.indexOf('\r\n\r\n');
    if(end<0){if(this.buffer.length>8192)throw new Error('Invalid LSP header');return;}
    const match=this.buffer.subarray(0,end).toString().match(/(?:^|\r\n)Content-Length:\s*(\d+)/i);
    if(!match)throw new Error('Missing LSP content length');
    const size=Number(match[1]);if(size>8*1024*1024)throw new Error('LSP response too large');
    if(this.buffer.length<end+4+size)return;
    const message=JSON.parse(this.buffer.subarray(end+4,end+4+size).toString('utf8'));
    this.buffer=this.buffer.subarray(end+4+size);this.handle(message);
   }
  }catch{this.stop(new Error('Invalid LSP response'));}
 }
 handle(message) {
  if(message.method && message.id!==undefined) {
   let result=null;
   if(message.method==='workspace/configuration')result=(message.params?.items||[]).map(()=>this.config);
   else if(message.method==='workspace/workspaceFolders')result=[];
   else if(!['client/registerCapability','client/unregisterCapability','workspace/diagnostic/refresh','window/workDoneProgress/create'].includes(message.method)) {
    this.send({id:message.id,error:{code:-32601,message:'Method not supported'}});return;
   }
   this.send({id:message.id,result});return;
  }
  const pending=this.pending.get(message.id);if(!pending)return;
  this.pending.delete(message.id);clearTimeout(pending.timer);
  if(message.error)pending.reject(new Error(`Luau LSP request failed (${message.error.code})`));
  else pending.resolve(message.result);
 }
 stop(error=new Error('Luau LSP stopped')) {
  if(this.closed)return;this.closed=true;
  for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(error);}this.pending.clear();
  const pid=this.child.pid;
  if(pid) {
   if(process.platform==='win32') {
    const killer=spawn('taskkill',['/PID',String(pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});killer.on('error',()=>this.child.kill());
   } else {try{process.kill(-pid,'SIGKILL');}catch{this.child.kill();}}
  }
  this.child.stdin.destroy();this.child.stdout.destroy();this.child.stderr.destroy();
 }
}
