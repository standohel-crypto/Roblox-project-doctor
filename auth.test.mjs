import test from 'node:test';
import assert from 'node:assert/strict';
import {passwordHash,passwordMatches,sameOrigin} from './auth.js';
test('Passwords use independent salts and reject incorrect values',async()=>{
 const password='correct horse battery staple';
 const a=await passwordHash(password),b=await passwordHash(password);
 assert.notEqual(a,b);assert.equal(await passwordMatches(password,a),true);
 assert.equal(await passwordMatches('incorrect password',a),false);
});
test('Cross-origin and missing-origin mutations are blocked',()=>{
 const previous=process.env.PUBLIC_URL;process.env.PUBLIC_URL='https://doctor.example/page/';
 try{
 for(const origin of ['https://evil.example',undefined,'null']){
 let status,passed=false;
 const res={status(code){status=code;return this;},json(){}};
 sameOrigin({get:key=>key==='origin'?origin:'doctor.example'},res,()=>passed=true);
 assert.equal(status,403);assert.equal(passed,false);
 }
 let passed=false;sameOrigin({get:key=>key==='origin'?'https://doctor.example':'doctor.example'},{},()=>passed=true);assert.equal(passed,true);
 }finally{if(previous===undefined)delete process.env.PUBLIC_URL;else process.env.PUBLIC_URL=previous;}
});
