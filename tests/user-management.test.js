import test from 'node:test';
import assert from 'node:assert/strict';
import { mount, walk, text, find, input, fire, flush } from './helpers/vueHost.js';
import { calls, resetApi } from './helpers/adminApi.js';
import Users from '../src/views/admin/ManageUsersView.vue';
const oldStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const member = (id, extra = {}) => ({ _id: id, fullName: `สมาชิก ${id}`, email: `${id}@lamduan.mfu.ac.th`, studentId: `student-${id}`, currentRole: 'worker', accountStatus: 'active', isEmailVerified: true, createdAt: '2026-11-20T00:00:00Z', ...extra });
test.beforeEach(() => Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => JSON.stringify({ token:'fixture',user:{_id:'self',isAdmin:true} }),setItem(){},removeItem(){} } }));
test.afterEach(() => { if(oldStorage)Object.defineProperty(globalThis,'localStorage',oldStorage);else delete globalThis.localStorage; });
const rows = view => walk(view.root).filter(n=>n.tag==='tr'&&n.props.class?.includes('user-row'));
const action = (view, kind) => walk(view.root).find(n=>n.tag==='button'&&n.props.class?.includes(`action-btn ${kind}`));
async function select(view,name) { fire(walk(view.root).find(n=>n.props['aria-label']===`ดูรายละเอียดบัญชี ${name}`),'click');await flush(); }
async function confirm(view) { const dialog=walk(view.root).find(n=>n.props.role==='dialog');await input(find(dialog,'textarea'),'ตรวจสอบแล้วตามรายงานที่ได้รับ');fire(find(dialog,'form'),'submit');await flush();await flush(); }

test('member counters, pagination and combined filters use the complete loaded list',async()=>{
  const data=Array.from({length:23},(_,i)=>member(String(i),{currentRole:i%2?'worker':'hirer',accountStatus:i%3===0?'warned':'active'}));
  resetApi({get:async()=>({data})});const view=await mount(Users);
  try{
    assert.equal(rows(view).length,10);
    fire(walk(view.root).find(n=>n.props['aria-label']==='หน้ารายชื่อถัดไป'),'click');await flush();assert(text(rows(view)[0]).includes('สมาชิก 10'));
    await input(find(view.root,'input'),'student-22');assert.equal(rows(view).length,1);assert(text(rows(view)[0]).includes('สมาชิก 22'));
    fire(find(view.root,'button','ล้างตัวกรอง'),'click');await flush();assert.equal(rows(view).length,10);assert(text(rows(view)[0]).includes('สมาชิก 0'));
    const tabs=walk(view.root).find(n=>n.props.class==='role-tabs');fire(find(tabs,'button','ผู้รับจ้าง'),'click');await flush();
    assert(rows(view).every(n=>text(n).includes('ผู้รับจ้าง')));
    assert.equal(calls.filter(c=>c.method==='get').length,1,'local filtering never mixes server subsets');
  }finally{view.unmount();}
});

test('protected admin and own accounts cannot trigger moderation even through a programmatic click',async()=>{
  for(const data of [[member('protected',{isAdmin:true})],[member('self')]]){
    resetApi({get:async()=>({data})});const view=await mount(Users);
    try{await select(view,data[0].fullName);for(const kind of ['warn','suspend','clear'])fire(action(view,kind),'click');await flush();assert.equal(calls.some(c=>c.method==='post'),false);assert(text(view.root).includes('บัญชีนี้ไม่สามารถเปลี่ยนสถานะ'));}
    finally{view.unmount();}
  }
});

test('warning, suspension and restoration keep the existing API and refresh persisted history',async()=>{
  let person=member('target');
  resetApi({get:async()=>({data:[person]}),post:async(url,body)=>{person={...person,accountStatus:({warn:'warned',suspend:'suspended',clear:'active'})[body.action],moderationHistory:[...(person.moderationHistory||[]),{action:body.action,newStatus:({warn:'warned',suspend:'suspended',clear:'active'})[body.action],reason:body.reason,performedAt:new Date().toISOString()}]};return {data:{user:person}};}});
  const view=await mount(Users);
  try{
    await select(view,person.fullName);
    for(const kind of ['warn','suspend','clear']){fire(action(view,kind),'click');await flush();await confirm(view);}
    const posts=calls.filter(c=>c.method==='post');assert.deepEqual(posts.map(c=>c.args[0].action),['warn','suspend','clear']);assert(posts.every(c=>c.url==='/admin/users/target/suspend'&&c.args[0].reason==='ตรวจสอบแล้วตามรายงานที่ได้รับ'));
    assert.equal(walk(view.root).filter(n=>n.tag==='time').length,3);assert(text(view.root).includes('อัปเดตบัญชีเป็น “ใช้งานปกติ” แล้ว'));
  }finally{view.unmount();}
});

test('cancelling makes no request and failed moderation retains the account for retry',async()=>{
  const person=member('target');resetApi({get:async()=>({data:[person]}),post:async()=>{throw {response:{data:{message:'ทดสอบดำเนินการไม่สำเร็จ'}}};}});
  const view=await mount(Users);
  try{
    await select(view,person.fullName);fire(action(view,'suspend'),'click');await flush();let dialog=walk(view.root).find(n=>n.props.role==='dialog');fire(find(dialog,'button','ยกเลิก'),'click');await flush();assert.equal(calls.some(c=>c.method==='post'),false);
    fire(action(view,'suspend'),'click');await flush();await confirm(view);assert(text(view.root).includes('ทดสอบดำเนินการไม่สำเร็จ'));assert(action(view,'suspend'));assert.equal(action(view,'suspend').props.disabled,false);
  }finally{view.unmount();}
});

test('a successful moderation followed by refresh failure is not reported as a failed moderation',async()=>{
  let failLoad=false;const person=member('target');
  resetApi({get:async()=>{if(failLoad)throw new Error('offline');return {data:[person]};},post:async()=>{failLoad=true;return {data:{user:{...person,accountStatus:'suspended'}}};}});
  const view=await mount(Users);
  try{await select(view,person.fullName);fire(action(view,'suspend'),'click');await flush();await confirm(view);assert(text(view.root).includes('อัปเดตสถานะแล้ว แต่ยังโหลดประวัติล่าสุดไม่ได้'));assert.equal(action(view,'suspend').props.disabled,true);}
  finally{view.unmount();}
});
