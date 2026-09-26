import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { LuauAnalyzer,convertDiagnostics } from '../analyzer/luau.js';
import { LspClient } from '../analyzer/lsp-client.js';

test('LSP prefixes, positions, severities and translations',()=>{
 const result=convertDiagnostics([
  {code:1000,message:"TypeError: Expected this to be 'number', but got 'string'",severity:1,range:{start:{line:1,character:3}}},
  {code:1007,message:"SyntaxError: Expected identifier when parsing expression, got '=='",severity:1,range:{start:{line:0,character:0}}},
  {code:7,message:"LocalUnused: Variable 'coins' is never used",severity:2,range:{start:{line:3,character:2}}}
 ]);
 assert.equal(result[0].ruleId,'type-mismatch');assert.equal(result[0].line,2);assert.equal(result[0].column,4);
 assert.equal(result[1].ruleId,'syntax');assert.equal(result[2].ruleId,'unused-local');assert.equal(result[2].severity,'warning');
});
test('JSON-RPC framing accepts byte fragments and UTF-8',()=>{
 const client=Object.create(LspClient.prototype);client.buffer=Buffer.alloc(0);const received=[];
 client.handle=m=>received.push(m);client.stop=e=>{throw e;};
 for(const message of [{id:1,result:'Привет 😀'},{id:2,result:[]}]) {
  const body=Buffer.from(JSON.stringify(message));const frame=Buffer.concat([Buffer.from(`Content-Length: ${body.length}\r\n\r\n`),body]);
  for(const byte of frame)client.receive(Buffer.from([byte]));
 }
 assert.equal(received[0].result,'Привет 😀');assert.equal(received.length,2);
});
test('hung worker is terminated; queue is bounded and times out',async()=>{
 const a=new LuauAnalyzer({command:process.execPath,args:['-e','process.stdin.resume()'],timeout:180,maxQueued:1});
 try {
  const first=a.analyze('print(1)');const second=a.analyze('print(2)');
  const settled=Promise.allSettled([first,second]);
  await assert.rejects(a.analyze('print(3)'),/queue full/);
  const results=await settled;assert.ok(results.every(r=>r.status==='rejected'));assert.equal(a.client.closed,true);
 }finally{await a.close();}
});
const binary=process.env.TEST_LUAU_BIN;
const definitions=process.env.TEST_LUAU_DEFINITIONS||path.resolve('definitions/roblox.d.luau');
test('real Luau: Roblox types, queue isolation, refresh and restart', {skip:!binary},async()=>{
 const a=new LuauAnalyzer({command:binary,args:['lsp',`--definitions=${definitions}`],recycleAfter:100});
 try {
  const broken='--!strict\nlocal coins: number = "100"\nprint(coins)';
  const good='--!strict\nlocal part = Instance.new("Part")\npart.Anchored = true';
  const wrongProperty='--!strict\nlocal part = Instance.new("Part")\npart.Anchored = "yes"';
  const [one,two,three]=await Promise.all([a.analyze(broken),a.analyze(good),a.analyze(wrongProperty)]);
  assert.equal(one.valid,false);assert.equal(one.issues[0].ruleId,'type-mismatch');assert.equal(two.issues.length,0);assert.equal(three.valid,false);
  const pid=a.client.child.pid;
  await a.analyze('sharedSecret = 42');
  const isolated=await a.analyze('--!strict\nprint(sharedSecret)');
  assert.ok(isolated.issues.some(i=>i.ruleId==='unknown-global'));
  for(let i=0;i<6;i++)assert.equal((await a.analyze(i%2?good:broken)).valid,!!(i%2));
  assert.equal(a.client.child.pid,pid);
  a.client.stop();assert.equal((await a.analyze(good)).valid,true);assert.notEqual(a.client.child.pid,pid);
 }finally{await a.close();}
});
