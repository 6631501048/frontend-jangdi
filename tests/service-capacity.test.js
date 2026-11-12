import test from 'node:test';
import assert from 'node:assert/strict';
import {mount, find, walk, text, fire, input, flush} from './helpers/vueHost.js';
import {resetApi, calls} from './helpers/adminApi.js';
import {route} from './helpers/adminRouter.js';
import CreateService from '../src/views/worker/WorkerCreateServicePostView.vue';
import MyService from '../src/views/worker/WorkerMyServicePostView.vue';

async function category(view, label='ทำความสะอาด') {
  fire(find(view.root,'button',label),'click'); await flush();
  fire(find(view.root,'button','ถัดไป'),'click'); await flush();
}
const capacityInput = view => walk(view.root).find(node=>node.tag==='input' && node.props.max==='3');

test('selected capacity survives going back and choosing the same or another category',async()=>{
  resetApi(); const view=await mount(CreateService);
  try{
    await category(view);
    await input(capacityInput(view),'1');
    fire(find(view.root,'button','เปลี่ยนประเภทงาน'),'click'); await flush();
    await category(view);
    assert.equal(Number(capacityInput(view).value),1);
    await input(capacityInput(view),'2');
    fire(find(view.root,'button','ย้อนกลับ'),'click'); await flush();
    await category(view,'สอนพิเศษ');
    assert.equal(Number(capacityInput(view).value),2);
  }finally{view.unmount();}
});

test('review and submitted payload keep capacity one; fractional capacities are rejected',async()=>{
  resetApi({post:async()=>({data:{}})});
  const previous=Object.getOwnPropertyDescriptor(navigator,'geolocation');
  Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition:success=>success({coords:{latitude:13,longitude:100}})}});
  const view=await mount(CreateService);
  try{
    await category(view);
    const inputs=walk(view.root).filter(node=>node.tag==='input');
    await input(inputs.find(node=>node.props.type==='text'),'ทดสอบจำนวนงาน');
    await input(find(view.root,'textarea'),'รายละเอียดบริการทดสอบ');
    await input(inputs.find(node=>node.props.min==='40'),'100');
    await input(capacityInput(view),'1.5');
    await input(inputs.find(node=>node.props.type==='date'),'2099-01-01');
    await input(inputs.find(node=>node.props.placeholder?.includes('อาคาร')),'อาคารทดสอบ');
    const time=find(view.root,'select');for(const option of time.options)option.selected=option.value==='06:00 AM';fire(time,'change');await flush();
    assert.equal(Boolean(find(view.root,'button','ถัดไป').props.disabled),true);
    await input(capacityInput(view),'1');
    assert.equal(Boolean(find(view.root,'button','ถัดไป').props.disabled),false);
    fire(find(view.root,'button','ถัดไป'),'click');await flush();
    assert.ok(text(view.root).includes('จำนวนงานที่รับพร้อมกันสูงสุด1 งาน'));
    fire(find(view.root,'button','Confirm'),'click');await flush();
    const posted=calls.find(call=>call.method==='post');
    assert.equal(posted.url,'/service-posts');assert.equal(posted.args[0].maxSimultaneousOrders,1);
  }finally{
    view.unmount();if(previous)Object.defineProperty(navigator,'geolocation',previous);else delete navigator.geolocation;
  }
});

test('accepting a request disables all other accept actions until capacity is refreshed',async()=>{
  route.params={id:'post1'};route.query={};
  window.setInterval=()=>1;window.clearInterval=()=>{};window.addEventListener=()=>{};window.removeEventListener=()=>{};
  let count=0,finish;
  const post={_id:'post1',title:'บริการรับหนึ่งงาน',status:'active',fee:100,category:'cleaning',maxSimultaneousOrders:1,currentOrderCount:0,availabilityEnd:'2099-01-01'};
  resetApi({get:async url=>({data:url==='/service-posts/my'?[{...post,status:count?'closed':'active',currentOrderCount:count}]:[1,2].map(id=>({
    _id:'request'+id,servicePost:post,status:count && id===1?'accepted':'pending',resultingJob:count && id===1?{_id:'job1',status:'assigned'}:null,
  }))}),patch:async()=>{await new Promise(resolve=>{finish=()=>{count=1;resolve();};});return {data:{}};}});
  const view=await mount(MyService);
  try{
    await flush();
    const accepts=walk(view.root).filter(node=>node.tag==='button' && text(node).includes('ยอมรับคำขอ'));
    assert.equal(accepts.length,2);
    fire(accepts[0],'click');await flush();
    assert.ok(accepts.every(button=>button.props.disabled));
    fire(accepts[1],'click');await flush();
    assert.equal(calls.filter(call=>call.method==='patch').length,1);
  }finally{view.unmount();finish?.();await flush();}
});

test('a full post shows one of one jobs and offers no further accept action',async()=>{
  route.params={id:'post1'};route.query={};
  window.setInterval=()=>1;window.clearInterval=()=>{};window.addEventListener=()=>{};window.removeEventListener=()=>{};
  const post={_id:'post1',title:'เต็มแล้ว',status:'closed',closeReason:'capacity',maxSimultaneousOrders:1,currentOrderCount:1,availabilityEnd:'2099-01-01'};
  resetApi({get:async url=>({data:url==='/service-posts/my'?[post]:[{_id:'request2',status:'pending',servicePost:post}]})});
  const view=await mount(MyService);
  try{
    assert.ok(text(view.root).includes('1 / 1 งาน'));
    assert.equal(walk(view.root).some(node=>node.tag==='button' && text(node).includes('ยอมรับคำขอ')),false);
  }finally{view.unmount();}
});
