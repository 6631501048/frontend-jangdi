import test from 'node:test';
import assert from 'node:assert/strict';
import {mount,find,text,fire,flush} from './helpers/vueHost.js';
import {resetApi,calls} from './helpers/adminApi.js';
import {route} from './helpers/adminRouter.js';
import Requests from '../src/components/HirerServiceRequests.vue';
import MyJobs from '../src/views/hirer/HirerMyJobsView.vue';

function timers(){
  let id=0;const callbacks=new Map();
  window.setInterval=callback=>{callbacks.set(++id,callback);return id;};
  window.clearInterval=id=>callbacks.delete(id);
  return callbacks;
}
const request={_id:'request1',servicePost:{_id:'post1',title:'รับหิ้วรายการทดสอบ',status:'closed'},orderDetails:'หิ้วข้าวไปหอพัก',createdAt:'2026-11-12T00:00:00Z'};

test('unselected requests remain visible independently of the public feed and explain the outcome',async()=>{
  timers();resetApi({get:async()=>({data:[{...request,status:'declined',declineReason:'capacity',respondedAt:'2026-11-12T01:00:00Z'}]})});
  const view=await mount(Requests);
  try{
    assert.ok(text(view.root).includes(request.servicePost.title));
    assert.ok(text(view.root).includes('ไม่ได้รับเลือก (ผู้รับจ้างรับงานครบแล้ว)'));
    assert.ok(text(view.root).includes(request.orderDetails));
    fire(find(view.root,'button','ไม่ได้รับเลือก / ปฏิเสธ'),'click');await flush();
    assert.ok(text(view.root).includes(request.servicePost.title));
    assert.equal(calls.some(call=>call.url==='/service-posts'),false);
  }finally{view.unmount();}
});

test('polling changes pending to unselected without losing the request history',async()=>{
  const callbacks=timers();let status='pending';
  resetApi({get:async()=>({data:[{...request,status,declineReason:status==='declined'?'capacity':null}]})});
  const view=await mount(Requests);
  try{
    assert.ok(text(view.root).includes('รอการตอบรับ'));
    status='declined';for(const callback of callbacks.values())callback();await flush();
    assert.ok(text(view.root).includes('ไม่ได้รับเลือก (ผู้รับจ้างรับงานครบแล้ว)'));
    assert.ok(text(view.root).includes(request.servicePost.title));
    assert.equal(text(view.root).includes('รอการตอบรับ'),false);
  }finally{view.unmount();}
  assert.equal(callbacks.size,0);
});

test('request history is available from My Jobs with no public listing or generated Job',async()=>{
  route.query={view:'services'};const callbacks=timers();
  resetApi({get:async()=>({data:[{...request,status:'declined',declineReason:'worker_declined'}]})});
  const view=await mount(MyJobs);
  try{
    assert.ok(text(view.root).includes('ผู้รับจ้างไม่รับคำขอ'));
    assert.ok(text(view.root).includes('คำขอใช้บริการของฉัน'));
    assert.equal(calls.some(call=>call.url==='/jobs/my'),false);
  }finally{view.unmount();route.query={};}
  assert.equal(callbacks.size,0);
});

test('a failed refresh keeps the previous outcome visible and supports retry',async()=>{
  const callbacks=timers();let fails=false;
  resetApi({get:async()=>{if(fails)throw new Error('offline');return {data:[{...request,status:'declined',declineReason:'refund'}]};}});
  const view=await mount(Requests);
  try{
    fails=true;for(const callback of callbacks.values())callback();await flush();
    assert.ok(text(view.root).includes('บริการปิดหลังคืนเงิน'));
    assert.ok(text(view.root).includes('โหลดประวัติคำขอไม่สำเร็จ'));
    fails=false;fire(find(view.root,'button','ลองใหม่'),'click');await flush();
    assert.equal(text(view.root).includes('โหลดประวัติคำขอไม่สำเร็จ'),false);
  }finally{view.unmount();}
});

test('accepted requests link to payment and job details even when the post is closed',async()=>{
  timers();resetApi({get:async()=>({data:[{...request,status:'accepted',resultingJob:{_id:'job1',status:'assigned'},paymentStatus:'pending'}]})});
  const view=await mount(Requests);
  try{
    assert.ok(text(view.root).includes('ดูการชำระเงิน'));assert.ok(text(view.root).includes('ดูรายละเอียดงาน'));
  }finally{view.unmount();}
});
