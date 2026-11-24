const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const vm=require('node:vm');
const {createRequire}=require('node:module');
const backendRoot=path.resolve('../backend');
const backendRequire=createRequire(path.join(backendRoot,'package.json'));
const express=backendRequire('express');
const ownerId='507f1f77bcf86cd799439011',viewerId='507f1f77bcf86cd799439012';
function controller(name,models,temp){
 const filename=path.join(backendRoot,'src/controllers',name+'.controller.js');
 const localRequire=createRequire(filename);
 const requireStub=id=>{
  if(id==='../models')return models;
  if(id==='path'&&temp)return {...path,join:(...args)=>args.at(-1)==='avatars'?temp:path.join(...args)};
  if(id.startsWith('../services/'))return new Proxy({},{get:()=>async(...args)=>args[0]});
  return localRequire(id);
 };
 const mod={exports:{}};vm.runInThisContext('(function(require,module,exports,__dirname){'+fs.readFileSync(filename,'utf8')+'\n})',{filename})(requireStub,mod,mod.exports,path.dirname(filename));return mod.exports;
}
test('real multipart avatar upload persists bytes and the same public URL is returned to owner, another user and admin',async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'jangdi-avatar-test-'));
 let persisted={_id:ownerId,fullName:'Owner',avatarUrl:null,email:'private@example.com',bankAccount:{accountNumber:'private'},contactAddress:{address:'private'}};
 const models={User:{findById:()=>({select:async()=>persisted})},Job:{exists:async()=>false}};
 const users=controller('user',models,temp);
 const app=express();
 app.post('/upload',(req,res,next)=>{req.user={...persisted,async save(){const {save,...record}=this;persisted=record;}};next()},...users.uploadAvatar);
 app.get('/users/:id',(req,res,next)=>{req.user={_id:req.query.as==='owner'?ownerId:viewerId,isAdmin:req.query.as==='admin'};next()},users.getProfile);
 app.use('/uploads/avatars',express.static(temp));
 app.use((err,req,res,next)=>res.status(400).json({message:err.message}));
 const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
 const base='http://127.0.0.1:'+server.address().port;
 try{
  const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQ0AAAAASUVORK5CYII=','base64');
  const form=new FormData();form.append('avatar',new Blob([bytes],{type:'image/png'}),'avatar.png');
  const response=await fetch(base+'/upload',{method:'POST',body:form});assert.equal(response.status,200);const {avatarUrl}=await response.json();assert.match(avatarUrl,/^\/uploads\/avatars\//);assert.equal(persisted.avatarUrl,avatarUrl);
  for(const as of ['owner','viewer','admin']){
   const res=await fetch(`${base}/users/${ownerId}?as=${as}`);assert.equal(res.status,200);const body=await res.json();assert.equal(body.avatarUrl,avatarUrl);
   if(as==='viewer')for(const key of ['email','bankAccount','contactAddress'])assert.equal(body[key],undefined);
  }
  const img=await fetch(base+avatarUrl);assert.equal(img.status,200);assert.match(img.headers.get('content-type'),/image\/png/);assert.deepEqual(Buffer.from(await img.arrayBuffer()),bytes);
  const invalid=new FormData();invalid.append('avatar',new Blob(['text'],{type:'text/plain'}),'not-image.txt');assert.equal((await fetch(base+'/upload',{method:'POST',body:invalid})).status,400);assert.equal(persisted.avatarUrl,avatarUrl);
 }finally{await new Promise(resolve=>server.close(resolve));if(path.dirname(temp)===os.tmpdir()&&path.basename(temp).startsWith('jangdi-avatar-test-'))fs.rmSync(temp,{recursive:true,force:true});}
});
test('admin member list explicitly projects the public avatar without private credentials',async()=>{
 let fields;
 const models={User:{find:()=>({select(value){fields=value;return this},sort:async()=>[{_id:ownerId,fullName:'Owner',avatarUrl:'/uploads/avatars/owner.png'}]})}};
 const admin=controller('admin',models);
 let body;await admin.getUsers({query:{}},{json(value){body=value}},err=>{throw err});
 assert(fields.split(' ').includes('avatarUrl'));assert.doesNotMatch(fields,/password|bankAccount|googleId|VerificationToken|lastKnownLocation/);assert.equal(body[0].avatarUrl,'/uploads/avatars/owner.png');
});
test('worker job summaries retain the populated hirer avatar',async()=>{
 const models={JobWaiting:{find:()=>({populate(){return this},sort:async()=>[{status:'waiting',job:{_id:'job',status:'waiting',hirer:{fullName:'Owner',avatarUrl:'/uploads/avatars/owner.png'}}}]})}};
 const jobs=controller('job',models);let body;await jobs.getMyWorkerJobs({query:{status:'waiting'},user:{_id:viewerId}},{json(value){body=value}},err=>{throw err});assert.equal(body[0].hirerAvatarUrl,'/uploads/avatars/owner.png');
});
