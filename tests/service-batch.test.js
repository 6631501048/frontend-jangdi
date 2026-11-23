import test from 'node:test';
import assert from 'node:assert/strict';
import {mount,walk,find,text,fire,flush} from './helpers/vueHost.js';
import {resetApi,calls} from './helpers/adminApi.js';
import {route} from './helpers/adminRouter.js';
import Services from '../src/views/worker/WorkerMyServicePostView.vue';

function setup({limit=3,count=0,fail=false}={}){
  const postId='507f1f77bcf86cd799439105';
  route.params={id:postId};route.query={};
  const timers=new Map();let timer=0;
  window.setInterval=callback=>{timers.set(++timer,callback);return timer;};window.clearInterval=id=>timers.delete(id);
  window.addEventListener=()=>{};window.removeEventListener=()=>{};
  const state={limit,count,fail,requests:[1,2,3].map(index=>({
    _id:`507f1f77bcf86cd79943920${index}`,status:'pending',hirer:{fullName:`ผู้ว่าจ้าง ${index}`},createdAt:`2026-11-12T00:00:0${index}Z`,
  }))};
  const post=()=>({_id:postId,title:'เลือกผู้ว่าจ้างพร้อมกัน',status:state.count>=limit?'closed':'active',closeReason:state.count>=limit?'capacity':null,
    fee:100,category:'delivery',maxSimultaneousOrders:limit,currentOrderCount:state.count,availabilityEnd:'2099-01-01'});
  resetApi({get:async url=>({data:url==='/service-posts/my'?[post()]:state.requests.map(request=>({...request,servicePost:post()}))}),post:async(url,body)=>{
    if(state.fail)throw {response:{data:{message:'บางคำขอเปลี่ยนสถานะแล้ว กรุณาเลือกใหม่'}}};
    assert.equal(url,`/service-posts/${postId}/requests/accept`);
    state.count+=body.requestIds.length;
    for(const request of state.requests){
      if(body.requestIds.includes(request._id)){request.status='accepted';request.resultingJob={_id:'job-'+request._id,status:'assigned'};}
      else if(state.count>=state.limit){request.status='declined';request.declineReason='capacity';}
    }
    return {data:{requests:body.requestIds}};
  }});
  return {state,timers};
}
const boxes=view=>walk(view.root).filter(node=>node.tag==='input' && node.props.type==='checkbox');
async function choose(view,label){const box=boxes(view).find(node=>node.props['aria-label']===`เลือกคำขอของ ผู้ว่าจ้าง ${label}`);assert.ok(box);fire(box,'change',{target:{checked:true}});await flush();return box;}
const dialog=view=>walk(view.root).find(node=>node.props.role==='dialog');

test('selection is limited to the remaining slots and does not send requests before confirmation',async()=>{
  setup({limit:3,count:1});const view=await mount(Services);
  try{
    await flush();await choose(view,1);await choose(view,2);
    assert.ok(boxes(view).find(node=>node.props['aria-label'].endsWith('3')).props.disabled);
    await choose(view,3);assert.ok(text(view.root).includes('ยอมรับที่เลือก (2)'));
    fire(find(view.root,'button','ยอมรับที่เลือก (2)'),'click');await flush();
    assert.ok(dialog(view));assert.equal(calls.some(call=>call.method==='post'),false);
    fire(find(dialog(view),'button','ยกเลิก'),'click');await flush();
    assert.equal(calls.some(call=>call.method==='post'),false);assert.ok(text(view.root).includes('ยอมรับที่เลือก (2)'));
  }finally{view.unmount();}
});

test('confirming sends the selected ids in one request and refreshes the full post',async()=>{
  const {state,timers}=setup({limit:2});const view=await mount(Services);
  try{
    await flush();await choose(view,1);await choose(view,3);
    fire(find(view.root,'button','ยอมรับที่เลือก (2)'),'click');await flush();
    const form=find(dialog(view),'form');fire(form,'submit');fire(form,'submit');await flush();await flush();
    const posts=calls.filter(call=>call.method==='post');assert.equal(posts.length,1);
    assert.deepEqual(posts[0].args[0].requestIds,[state.requests[0]._id,state.requests[2]._id]);
    assert.ok(text(view.root).includes('ยอมรับคำขอพร้อมกัน 2 รายการแล้ว'));
    assert.ok(text(view.root).includes('2 / 2 งาน'));assert.equal(boxes(view).length,0);
    assert.equal(calls.some(call=>call.method==='patch'),false);
  }finally{view.unmount();}
  assert.equal(timers.size,0);
});

test('a rejected batch keeps the request list visible and permits selecting again',async()=>{
  setup({limit:2,fail:true});const view=await mount(Services);
  try{
    await flush();await choose(view,1);await choose(view,2);
    fire(find(view.root,'button','ยอมรับที่เลือก (2)'),'click');await flush();fire(find(dialog(view),'form'),'submit');await flush();await flush();
    assert.ok(text(view.root).includes('บางคำขอเปลี่ยนสถานะแล้ว กรุณาเลือกใหม่'));
    assert.equal(boxes(view).length,3);assert.ok(text(view.root).includes('ยอมรับที่เลือก (2)'));
    assert.equal(text(view.root).includes('ยอมรับคำขอพร้อมกัน 2 รายการแล้ว'),false);
  }finally{view.unmount();}
});

test('capacity changes while the dialog is open prevent submitting a stale selection',async()=>{
  const {state,timers}=setup({limit:2});const view=await mount(Services);
  try{
    await flush();await choose(view,1);await choose(view,2);
    fire(find(view.root,'button','ยอมรับที่เลือก (2)'),'click');await flush();
    state.count=1;for(const callback of timers.values())callback();await flush();await flush();
    fire(find(dialog(view),'form'),'submit');await flush();
    assert.equal(calls.some(call=>call.method==='post'),false);
    assert.ok(text(view.root).includes('สถานะคำขอหรือจำนวนงานว่างเปลี่ยนแล้ว'));
  }finally{view.unmount();}
});

test('selecting available requests stops at the quota and clearing releases the selection',async()=>{
  setup({limit:2});const view=await mount(Services);
  try{
    await flush();fire(find(view.root,'button','เลือกตามจำนวนว่าง'),'click');await flush();
    assert.equal(boxes(view).filter(box=>box.props.checked).length,2);
    fire(find(view.root,'button','ล้างที่เลือก'),'click');await flush();
    assert.equal(boxes(view).filter(box=>box.props.checked).length,0);
    assert.ok(find(view.root,'button','ยอมรับที่เลือก (0)').props.disabled);
  }finally{view.unmount();}
});
