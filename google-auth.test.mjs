import test from 'node:test';
import assert from 'node:assert/strict';
import {validGooglePayload} from './google-auth.js';
test('Google identity requires stable subject and matching nonce',()=>{
 assert.equal(validGooglePayload({sub:'google-id',nonce:'expected'},'expected'),true);
 for(const payload of [null,{}, {sub:'',nonce:'expected'}, {sub:'google-id',nonce:'wrong'}, {sub:'google-id'}, {sub:123,nonce:'expected'}])assert.equal(validGooglePayload(payload,'expected'),false);
});
