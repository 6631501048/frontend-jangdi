import test from 'node:test';import assert from 'node:assert/strict';
import {mount,find,walk,text,fire,input,flush} from './helpers/vueHost.js';
import {resetApi,calls} from './helpers/adminApi.js';import {route,routerCalls} from './helpers/adminRouter.js';
import Register from '../src/views/auth/RegisterView.vue';import PublicProfile from '../src/views/UserProfileView.vue';
let account,storage;
test.beforeEach(()=>{
 route.path='/register';route.query={};route.params={id:'member'};routerCalls.length=0;
 account={_id:'viewer',fullName:'Tester',phone:'0800000000',currentRole:'hirer',isProfileComplete:false};storage=new Map([['jangdi_auth',JSON.stringify({token:'fixture',user:account})]]);
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)}});
});
const bankInput=(view,name)=>walk(view.root).find(node=>node.tag==='input'&&node.props.name===name);
const submit=view=>fire(find(view.root,'form'),'submit',{preventDefault(){}});
test('first profile completion requires all bank fields and explains dummy data for testing',async()=>{
 resetApi({patch:async()=>{throw Error('Must not save')}});const view=await mount(Register);
 try{for(const name of ['bankName','accountNumber','accountHolderName'])assert('required' in bankInput(view,name).props);assert(text(view.root).includes('ข้อมูลบัญชีสมมติ'));submit(view);await flush();assert.equal(calls.length,0);assert(text(view.root).includes('กรุณากรอกชื่อธนาคาร'));}finally{view.unmount();}
});
test('dummy bank data is submitted with leading zeroes intact and completes onboarding',async()=>{
 resetApi({patch:async(url,changes)=>({data:{user:{...account,...changes,isProfileComplete:true}}})});const view=await mount(Register);
 try{await input(bankInput(view,'bankName'),' Test Bank ');await input(bankInput(view,'accountNumber'),'0000000000');await input(bankInput(view,'accountHolderName'),' Test Account ');submit(view);await flush();assert.deepEqual(calls[0].args[0].bankAccount,{bankName:'Test Bank',accountNumber:'0000000000',accountHolderName:'Test Account'});assert.equal(JSON.parse(storage.get('jangdi_auth')).user.isProfileComplete,true);assert.equal(routerCalls.at(-1).method,'replace');}finally{view.unmount();}
});
test('a profile save failure preserves all bank inputs for retry',async()=>{
 resetApi({patch:async()=>{throw {response:{data:{message:'Try again'}}}}});const view=await mount(Register);
 try{for(const name of ['bankName','accountNumber','accountHolderName'])await input(bankInput(view,name),'Dummy');submit(view);await flush();assert(text(view.root).includes('Try again'));assert.equal(bankInput(view,'accountNumber').value,'Dummy');assert.equal(routerCalls.length,0);}finally{view.unmount();}
});
function profileSetup(profile,fail=false){route.path='/users/member';resetApi({get:async url=>{if(fail&&!url.endsWith('/reviews'))throw {response:{data:{message:'ไม่พบผู้ใช้นี้'}}};return {data:url.endsWith('/reviews')?{reviews:[]}:profile};}});}
test('public member profile renders its photo and privacy note without banking or address data',async()=>{
 profileSetup({_id:'member',fullName:'Other Member',avatarUrl:'https://example.com/avatar.png',canViewEmail:false,bankAccount:{accountNumber:'PRIVATE-BANK'},contactAddress:{address:'PRIVATE-ADDRESS'}});const view=await mount(PublicProfile);
 try{assert(text(view.root).includes('Other Member'));assert(text(view.root).includes('หลังยืนยันจ้าง'));assert(!text(view.root).includes('PRIVATE'));assert.equal(walk(view.root).find(n=>n.tag==='img').props.src,'https://example.com/avatar.png');assert.equal(walk(view.root).some(n=>n.props.href?.startsWith('mailto:')),false);}finally{view.unmount();}
});
test('counterpart profile offers email contact even when LINE and phone are unavailable',async()=>{
 profileSetup({_id:'member',fullName:'Other Member',email:'member@lamduan.mfu.ac.th',canViewEmail:true});const view=await mount(PublicProfile);
 try{assert(walk(view.root).some(n=>n.props.href==='mailto:member@lamduan.mfu.ac.th'));assert(text(view.root).includes('member@lamduan.mfu.ac.th'));assert(!text(view.root).includes('หลังยืนยันจ้าง'));}finally{view.unmount();}
});
test('missing profiles show an error with a retry and a working header',async()=>{
 profileSetup({},true);const view=await mount(PublicProfile);try{assert(text(view.root).includes('ไม่พบผู้ใช้นี้'));assert(find(view.root,'button','ลองใหม่'));assert(walk(view.root).some(n=>n.props['aria-label']==='ย้อนกลับ'));}finally{view.unmount();}
});
