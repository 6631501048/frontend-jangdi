import test from 'node:test';import assert from 'node:assert/strict';
import {mount,walk,find,text,fire,input,flush} from './helpers/vueHost.js';
import {resetApi,calls} from './helpers/adminApi.js';import {route,routerCalls} from './helpers/adminRouter.js';
import Feedback from '../src/views/FeedbackView.vue';import Inbox from '../src/views/admin/TesterFeedbackView.vue';import PostJob from '../src/views/hirer/HirerPostJobView.vue';
let stored;
test.beforeEach(()=>{
 route.path='/feedback';route.query={from:'/worker/jobs'};route.params={};routerCalls.length=0;
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>JSON.stringify({token:'fixture',user:{_id:'tester',currentRole:'worker',fullName:'Tester',isProfileComplete:true}}),setItem(){}}});
 window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});window.addEventListener=window.removeEventListener=()=>{};document.addEventListener=document.removeEventListener=()=>{};window.innerWidth=1440;
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{geolocation:{getCurrentPosition:callback=>callback({coords:{latitude:20,longitude:99}})}}});
 stored=[{_id:'1',message:'Found a bug',category:'bug',status:'new',author:{fullName:'Tester',email:'tester@example.com'},role:'worker',createdAt:new Date().toISOString()}];
});
test('feedback sends trimmed text and page context, then confirms only after API success',async()=>{
 resetApi({post:async()=>({data:{message:'Saved successfully'}})});const view=await mount(Feedback);
 try{await input(find(view.root,'textarea'),'  Found a bug  ');fire(find(view.root,'form'),'submit');await flush();assert.deepEqual(calls[0].args[0],{message:'Found a bug',category:'general',pagePath:'/worker/jobs'});assert(text(view.root).includes('Saved successfully'));assert.equal(find(view.root,'textarea').value,'');}finally{view.unmount();}
});
test('feedback rejects whitespace and preserves a failed submission for retry',async()=>{
 resetApi({post:async()=>{throw {response:{data:{message:'Try again'}}}}});const view=await mount(Feedback);
 try{await input(find(view.root,'textarea'),' ');fire(find(view.root,'form'),'submit');await flush();assert.equal(calls.length,0);await input(find(view.root,'textarea'),'Please improve this page');fire(find(view.root,'form'),'submit');await flush();assert(text(view.root).includes('Try again'));assert.equal(find(view.root,'textarea').value,'Please improve this page');}finally{view.unmount();}
});
test('feedback cannot be submitted twice while the first request is pending',async()=>{
 let finish;resetApi({post:()=>new Promise(resolve=>{finish=resolve})});const view=await mount(Feedback);
 try{await input(find(view.root,'textarea'),'Feedback');fire(find(view.root,'form'),'submit');fire(find(view.root,'form'),'submit');await flush();assert.equal(calls.length,1);finish({data:{message:'Done'}});await flush();}finally{view.unmount();}
});
test('admin inbox displays comments and persists marking read without changing job reviews',async()=>{
 route.path='/admin/tester-feedback';route.query={};resetApi({get:async()=>({data:{items:stored,total:stored.length,totalPages:1,page:1}}),patch:async url=>{assert.equal(url,'/admin/tester-feedback/1/read');stored[0].status='read';return {data:{item:stored[0]}}}});const view=await mount(Inbox);
 try{assert(text(view.root).includes('Found a bug'));fire(find(view.root,'button','ทำเครื่องหมายอ่านแล้ว'),'click');await flush();assert.equal(calls.filter(c=>c.method==='patch').length,1);assert(text(view.root).includes('ทำเครื่องหมายอ่านแล้ว'));assert.equal(stored[0].status,'read');}finally{view.unmount();}
});
test('an admin inbox fetch error has a retry and does not report an empty inbox',async()=>{
 resetApi({get:async()=>{throw {response:{data:{message:'Offline'}}}}});const view=await mount(Inbox);try{assert(text(view.root).includes('Offline'));assert(!text(view.root).includes('ยังไม่มีความคิดเห็นในสถานะนี้'));}finally{view.unmount();}
});
test('Hirer can review and submit a job with extra notes left empty',async()=>{
 route.path='/hirer/post-job';route.query={};let posted;
 resetApi({get:async()=>({data:{feePercent:7,platformFeePercent:7}}),post:async(url,body)=>{posted=body;return {data:{job:{status:'pending_review'}}}}});
 const view=await mount(PostJob);
 try{fire(find(view.root,'button','ทำความสะอาด'),'click');fire(find(view.root,'button','ถัดไป'),'click');await flush();
  for(const node of walk(view.root).filter(n=>n.tag==='input')){const type=node.props.type||'text';await input(node,type==='datetime-local'?'2027-12-30T10:00':type==='number'?(Number(node.props.min)>=40?'100':'2'):'Test job details');}
  const notes=walk(view.root).find(n=>n.props.id==='job-extra-notes');assert.equal(notes.props.required,undefined);assert.equal(notes.value,'');
  fire(find(view.root,'button','ใช้ตำแหน่งปัจจุบัน'),'click');await flush();const next=find(view.root,'button','ถัดไป');assert.equal(next.props.disabled,false);fire(next,'click');await flush();
  fire(find(view.root,'button','ยืนยันประกาศงาน'),'click');await flush();assert.equal(posted.notes,'');assert(text(view.root).includes('ประกาศงานสำเร็จ'));
 }finally{view.unmount();}
});
