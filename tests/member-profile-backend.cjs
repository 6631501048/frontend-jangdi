const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm');const {createRequire}=require('node:module');
const ownerId='507f1f77bcf86cd799439011',viewerId='507f1f77bcf86cd799439012';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'jangdi-member-profile-'));
const filename=path.resolve('../backend/src/controllers/user.controller.js'),localRequire=createRequire(filename);
let user,jobStatus,saved;
const models={User:{findById:()=>({select:async()=>user,then:(ok,fail)=>Promise.resolve(user).then(ok,fail)})},Job:{exists:async query=>query.status.$in.includes(jobStatus)&&query.$or.some(pair=>String(pair.hirer)===ownerId&&String(pair.selectedWorker)===viewerId)?{_id:'job'}:null}};
const mod={exports:{}};
const stub=id=>id==='../models'?models:id==='path'?{...path,join:(...args)=>args.at(-1)==='avatars'?temp:path.join(...args)}:localRequire(id);
vm.runInThisContext('(function(require,module,exports,__dirname){'+fs.readFileSync(filename,'utf8')+'\n})',{filename})(stub,mod,mod.exports,path.dirname(filename));const controller=mod.exports;
function account(overrides={}){return {_id:ownerId,fullName:'Owner',phone:'0800000000',email:'owner@lamduan.mfu.ac.th',isProfileComplete:false,bankAccount:undefined,contactAddress:{address:'PRIVATE'},studentId:'PRIVATE',googleId:'PRIVATE',async save(){saved++},toObject(){const {save,toObject,...rest}=this;return rest},...overrides};}
async function call(name,{viewer={_id:viewerId},body={}}={}){const res={statusCode:200,status(code){this.statusCode=code;return this},json(body){this.body=body;return this}};await controller[name]({params:{id:ownerId},user:viewer,body},res,error=>{throw error});return res;}
test.beforeEach(()=>{user=account();saved=0;jobStatus=null});
test.after(()=>{if(path.dirname(temp)===os.tmpdir()&&path.basename(temp).startsWith('jangdi-member-profile-'))fs.rmSync(temp,{recursive:true,force:true});});
test('unrelated users and applicants before selection cannot read contact email or private bank/address data',async()=>{
 for(const state of [null,'waiting','pending_review']){jobStatus=state;const {body}=await call('getProfile');assert.equal(body.canViewEmail,false);for(const key of ['email','bankAccount','contactAddress','studentId','googleId'])assert.equal(body[key],undefined);}
});
test('selected job counterparts can read email during work and after completion without bank details',async()=>{
 user.bankAccount={bankName:'PRIVATE',accountNumber:'PRIVATE'};
 for(const state of ['assigned','in_progress','awaiting_confirmation','disputed','completed','cancelled']){jobStatus=state;const {body}=await call('getProfile');assert.equal(body.email,user.email,state);assert.equal(body.canViewEmail,true);assert.equal(body.bankAccount,undefined);assert.equal(body.contactAddress,undefined);if(state==='completed')assert.equal(body.phone,undefined);}
});
test('new members must supply every bank field and whitespace cannot bypass onboarding',async()=>{
 for(const bankAccount of [undefined,{},null,{bankName:'Test',accountNumber:'0000000000'},{bankName:' ',accountNumber:'0000000000',accountHolderName:'Test'}]){const result=await call('updateProfile',{viewer:{_id:ownerId},body:{fullName:'New name',bankAccount}});assert.equal(result.statusCode,400);assert.equal(saved,0);assert.equal(user.isProfileComplete,false);assert.equal(user.fullName,'Owner');}
});
test('new members can complete onboarding using explicitly dummy bank details',async()=>{
 const bankAccount={bankName:'Test Bank',accountNumber:'0000000000',accountHolderName:'Test Account'};const result=await call('updateProfile',{viewer:{_id:ownerId},body:{bankAccount}});assert.equal(result.statusCode,200);assert.equal(result.body.user.isProfileComplete,true);assert.deepEqual(result.body.user.bankAccount,bankAccount);assert.equal(saved,1);
});
test('existing completed accounts and admin account edits do not require retroactive bank details',async()=>{
 for(const overrides of [{isProfileComplete:true},{isAdmin:true}]){user=account(overrides);const result=await call('updateProfile',{viewer:{_id:ownerId},body:{phone:'0811111111'}});assert.equal(result.statusCode,200);assert.equal(result.body.user.phone,'0811111111');}
});

test('an unrelated viewer cannot access email even when the target has completed jobs with someone else',async()=>{
 jobStatus='completed';const {body}=await call('getProfile',{viewer:{_id:'507f1f77bcf86cd799439099'}});assert.equal(body.email,undefined);assert.equal(body.canViewEmail,false);
});
