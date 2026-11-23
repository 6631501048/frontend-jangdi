import test from 'node:test';
import assert from 'node:assert/strict';
import {mount,find,walk,text,fire,input,flush} from './helpers/vueHost.js';
import {resetApi,calls} from './helpers/adminApi.js';
import {route} from './helpers/adminRouter.js';
import Detail from '../src/views/hirer/HirerMyJobDetailView.vue';

function setup(status='awaiting_confirmation',post){
  route.params={id:'job1'};route.query={};
  window.setInterval=()=>1;window.clearInterval=()=>{};
  let currentStatus=status;
  resetApi({get:async url=>({data:url==='/jobs/job1'?{
    _id:'job1',title:'งานทดสอบป๊อปอัป',status:currentStatus,price:100,
    completionProofUrl:status==='awaiting_confirmation'?'/private/proof.png':null,
  }:url.includes('/completion-proof')?new Blob(['proof'],{type:'image/png'}):url.endsWith('/mock')?{
    status:currentStatus==='completed'?'payout_pending':'held',amount:100,
  }:url.endsWith('/timeline') || url.endsWith('/applicants')?[]:{}}),post:async(url,...args)=>{
    if(post)return post(url,...args);
    currentStatus='completed';return {data:{job:{status:'completed'}}};
  }});
}
const dialogIn=view=>walk(view.root).find(node=>node.props.role==='dialog');

test('completion opens an in-page confirmation and cancelling makes no request',async()=>{
  setup();const view=await mount(Detail);
  try{
    await flush();
    fire(find(view.root,'button','ยืนยันรับงานและปิดงาน'),'click');await flush();
    const dialog=dialogIn(view);assert.ok(dialog);
    assert.ok(text(dialog).includes('แอดมินจ่ายค่าจ้างพร้อมแนบสลิป'));
    assert.equal(calls.some(call=>call.method==='post'),false);
    fire(find(dialog,'button','ยกเลิก'),'click');await flush();
    assert.equal(dialogIn(view),undefined);assert.equal(calls.some(call=>call.method==='post'),false);
  }finally{view.unmount();}
});

test('completion posts once after confirmation and continues to the success popup',async()=>{
  setup();const view=await mount(Detail);
  try{
    await flush();fire(find(view.root,'button','ยืนยันรับงานและปิดงาน'),'click');await flush();
    const dialog=dialogIn(view);
    fire(find(dialog,'form'),'submit');fire(find(dialog,'form'),'submit');await flush();await flush();
    assert.deepEqual(calls.filter(call=>call.method==='post').map(call=>call.url),['/jobs/job1/confirm-completion']);
    assert.ok(text(view.root).includes('ยืนยันปิดงานสำเร็จ'));
  }finally{view.unmount();}
});

test('leaving the page cancels its pending confirmation without posting',async()=>{
  setup();const view=await mount(Detail);
  try{
    await flush();fire(find(view.root,'button','ยืนยันรับงานและปิดงาน'),'click');await flush();
  }finally{view.unmount();}
  await flush();
  assert.equal(calls.some(call=>call.method==='post'),false);
});

test('job cancellation collects the reason in the page instead of browser prompts',async()=>{
  setup('waiting',async()=>({data:{}}));const view=await mount(Detail);
  try{
    await flush();fire(find(view.root,'button','ยกเลิกประกาศงาน'),'click');await flush();
    const dialog=dialogIn(view);assert.ok(dialog);
    fire(find(dialog,'form'),'submit');await flush();assert.equal(calls.some(call=>call.method==='post'),false);
    await input(find(dialog,'textarea'),'เปลี่ยนกำหนดเวลางานแล้ว');
    fire(find(dialog,'form'),'submit');await flush();
    const posted=calls.find(call=>call.method==='post');
    assert.equal(posted.url,'/jobs/job1/cancel');assert.equal(posted.args[0].reason,'เปลี่ยนกำหนดเวลางานแล้ว');
  }finally{view.unmount();}
});
