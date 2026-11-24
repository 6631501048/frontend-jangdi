import test from 'node:test';
import assert from 'node:assert/strict';
import { createProofImageLoader } from '../src/services/proofImageLoader.js';
const job = { _id:'job1', completionProofUrl:'/uploads/job-proofs/first.jpg' };
function setup(fetchImage) {
  let state, clock=0;
  const revoked=[];
  const loader=createProofImageLoader({fetchImage,describeError:async error=>error.message,onChange:value=>state=value,revokeUrl:url=>revoked.push(url),now:()=>clock});
  return {loader,revoked,get state(){return state;},advance(){clock+=5000;}};
}
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
test('a failed initial image request retries the same proof on the next poll',async()=>{
  let calls=0;const ctx=setup(async()=>{if(++calls===1)throw new Error('offline');return 'blob:recovered';});
  await ctx.loader.load(job);assert.equal(ctx.state.error,'offline');assert.equal(ctx.state.loading,false);
  await ctx.loader.load(job);assert.equal(calls,1);
  ctx.advance();await ctx.loader.load(job);assert.equal(ctx.state.url,'blob:recovered');assert.equal(ctx.state.error,'');
});
test('successful images are reused and concurrent polls share the request',async()=>{
  const request=deferred();let calls=0;const ctx=setup(()=>{calls++;return request.promise;});
  const a=ctx.loader.load(job),b=ctx.loader.load(job);assert.equal(a,b);assert.equal(calls,1);
  request.resolve('blob:one');await a;await ctx.loader.load(job);assert.equal(calls,1);assert.equal(ctx.state.url,'blob:one');
});
test('a forced retry cannot be overwritten by an older request for the same image',async()=>{
  const first=deferred(),second=deferred();let calls=0;const ctx=setup(()=>++calls===1?first.promise:second.promise);
  const a=ctx.loader.load(job),b=ctx.loader.load(job,true);second.resolve('blob:new');await b;first.resolve('blob:stale');await a;
  assert.equal(ctx.state.url,'blob:new');assert.deepEqual(ctx.revoked,['blob:stale']);
});
test('replacement reloads and revokes the prior image',async()=>{
  let calls=0;const ctx=setup(async()=>`blob:${++calls}`);await ctx.loader.load(job);
  await ctx.loader.load({...job,completionProofUrl:'/uploads/job-proofs/replaced.png'});
  assert.equal(ctx.state.url,'blob:2');assert.deepEqual(ctx.revoked,['blob:1']);
});
test('permission errors stop automatic retries but allow an explicit retry',async()=>{
  let calls=0;const ctx=setup(async()=>{calls++;throw Object.assign(new Error('forbidden'),{response:{status:403}});});
  await ctx.loader.load(job);ctx.advance();await ctx.loader.load(job);assert.equal(calls,1);
  await ctx.loader.load(job,true);assert.equal(calls,2);
});
test('leaving the page revokes an image which finishes loading after disposal',async()=>{
  const request=deferred(),ctx=setup(()=>request.promise);const loading=ctx.loader.load(job);ctx.loader.dispose();request.resolve('blob:late');await loading;
  assert.deepEqual(ctx.revoked,['blob:late']);await ctx.loader.load(job);
});
test('clearing metadata clears loading and prevents stale images reappearing',async()=>{
  const request=deferred(),ctx=setup(()=>request.promise);const loading=ctx.loader.load(job);
  await ctx.loader.load({_id:'job1',completionProofUrl:null});assert.equal(ctx.state.url,null);assert.equal(ctx.state.loading,false);
  request.resolve('blob:old');await loading;assert.equal(ctx.state.url,null);assert.deepEqual(ctx.revoked,['blob:old']);
});
test('a browser image error invalidates successful cache and enables a manual reload',async()=>{
  let calls=0;const ctx=setup(async()=>`blob:${++calls}`);await ctx.loader.load(job);ctx.loader.fail('cannot decode');
  assert.equal(ctx.state.url,null);assert.equal(ctx.state.error,'cannot decode');await ctx.loader.load(job,true);assert.equal(ctx.state.url,'blob:2');
});
