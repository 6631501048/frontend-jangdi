import test from 'node:test';
import assert from 'node:assert/strict';
import {mount,find,walk,text,fire,input,flush} from './helpers/vueHost.js';
import {resetApi,calls} from './helpers/adminApi.js';
import {route} from './helpers/adminRouter.js';
import Reports from '../src/views/admin/HandleReportsView.vue';
import Payments from '../src/views/admin/ProcessPaymentView.vue';
import SlipForm from '../src/components/PaymentSlipForm.vue';
import Posts from '../src/views/admin/ManagePostsView.vue';
import Users from '../src/views/admin/ManageUsersView.vue';
import Sos from '../src/views/admin/ReceiveSosView.vue';
const payment={_id:'payment1',job:{title:'งานทดสอบ'},status:'awaiting_verification',paymentMode:'slip_demo',amount:100,platformFeeAmount:5,netAmountToWorker:100,hasInboundSlip:true,inboundSlipVersion:'version1'};
const report={_id:'report1',reason:'ทดสอบรายงานผู้ใช้',status:'pending',description:'รายละเอียดรายงาน'};
async function confirm(root,notes){await input(find(root,'textarea'),notes);fire(find(root,'form'),'submit');await flush();}
test('reports open an in-page reason form, validate, and post without native dialogs',async()=>{
  resetApi({get:async()=>({data:[report]}),post:async(url,body)=>({data:{report:{...report,status:body.status,resolutionNotes:body.resolutionNotes}}})});
  const view=await mount(Reports);
  try{
    fire(find(view.root,'button','ทดสอบรายงานผู้ใช้'),'click');await flush();
    fire(find(view.root,'button','บันทึกแก้ไขแล้ว'),'click');await flush();assert.equal(calls.filter(c=>c.method==='post').length,0);
    await confirm(view.root,'สั้น');assert.ok(text(view.root).includes('กรุณาระบุเหตุผล'));assert.equal(calls.filter(c=>c.method==='post').length,0);
    await confirm(view.root,'ตรวจสอบและแก้ไขแล้ว');
    const posted=calls.find(c=>c.method==='post');assert.equal(posted.url,'/admin/reports/report1/resolve');assert.deepEqual(posted.args[0],{status:'resolved',resolutionNotes:'ตรวจสอบและแก้ไขแล้ว'});
    assert.equal(walk(view.root).some(n=>n.props.role==='dialog'),false);
  }finally{view.unmount();}
});
test('cancelled report decision makes no request; API errors are visible and actions recover',async()=>{
  resetApi({get:async()=>({data:[report]}),post:async()=>{throw {response:{data:{message:'บันทึกไม่สำเร็จ ลองใหม่'}}};}});
  const view=await mount(Reports);
  try{
    fire(find(view.root,'button','ทดสอบรายงานผู้ใช้'),'click');await flush();fire(find(view.root,'button','ยกเลิกรายงาน'),'click');await flush();fire(find(view.root,'button','ยกเลิก'),'click');await flush();assert.equal(calls.filter(c=>c.method==='post').length,0);
    fire(find(view.root,'button','บันทึกแก้ไขแล้ว'),'click');await flush();await confirm(view.root,'ตรวจสอบรายงานเรียบร้อย');assert.ok(text(view.root).includes('บันทึกไม่สำเร็จ ลองใหม่'));assert.equal(find(view.root,'button','บันทึกแก้ไขแล้ว').props.disabled,false);
  }finally{view.unmount();}
});
test('unreadable slip can be rejected without enabling approval or relying on prompt',async()=>{
  route.query={status:'awaiting_verification'};resetApi({get:async url=>{if(url.includes('/slips/'))throw new Error('โหลดสลิปไม่ได้');return {data:[payment]};},post:async()=>({data:{message:'ปฏิเสธแล้ว'}})});
  const view=await mount(Payments);
  try{
    fire(find(view.root,'button','งานทดสอบ'),'click');await flush();
    fire(find(view.root,'button','อนุมัติรับเงินจำลอง'),'click');await flush();assert.ok(text(view.root).includes('ยังเปิดรูปสลิปไม่สำเร็จ'));assert.equal(calls.some(c=>c.method==='post'),false);
    fire(find(view.root,'button','ปฏิเสธสลิป'),'click');await flush();await confirm(view.root,'รูปสลิปเสีย กรุณาส่งใหม่');
    const posted=calls.find(c=>c.method==='post');assert.equal(posted.url,'/admin/payments/payment1/slip-review');assert.equal(posted.args[0].decision,'rejected');assert.equal(posted.args[0].version,'version1');
  }finally{view.unmount();}
});
test('readable slip approval posts its displayed version and entered notes',async()=>{
  route.query={status:'awaiting_verification'};resetApi({get:async url=>({data:url.includes('/slips/')?new Blob(['test'],{type:'image/png'}):[payment]}),post:async()=>({data:{message:'อนุมัติแล้ว'}})});
  const view=await mount(Payments);
  try{
    fire(find(view.root,'button','งานทดสอบ'),'click');await flush();fire(find(view.root,'img'),'load');await flush();fire(find(view.root,'button','อนุมัติรับเงินจำลอง'),'click');await flush();await confirm(view.root,'ตรวจสอบรูปและยอดถูกต้อง');
    assert.deepEqual(calls.find(c=>c.method==='post').args[0],{decision:'approved',notes:'ตรวจสอบรูปและยอดถูกต้อง',version:'version1'});
  }finally{view.unmount();}
});
test('slip payout form confirms inside the page and sends its selected image',async()=>{
  resetApi({post:async()=>({data:{message:'บันทึกแล้ว'}})});const view=await mount(SlipForm,{endpoint:'/admin/payments/payment1/slips/payout',requireNotes:true});
  try{
    const image=new File(['image'],'slip.png',{type:'image/png'});fire(find(view.root,'input'),'change',{target:{files:[image]}});await input(find(view.root,'textarea'),'จ่ายค่าจ้างจำลองแล้ว');
    fire(find(view.root,'form'),'submit');await flush();assert.equal(calls.some(c=>c.method==='post'),false);
    const dialog=walk(view.root).find(n=>n.props.role==='dialog');fire(find(dialog,'form'),'submit');await flush();
    const posted=calls.find(c=>c.method==='post');assert.equal(posted.url,'/admin/payments/payment1/slips/payout');assert.equal(posted.args[0].get('slip').name,'slip.png');assert.equal(posted.args[0].get('notes'),'จ่ายค่าจ้างจำลองแล้ว');
  }finally{view.unmount();}
});

test('admin sees Stripe wages awaiting payout and the recipient bank account with mock fee separated',async()=>{
  route.query={status:'payout_pending'};
  resetApi({get:async()=>({data:[{...payment,status:'payout_pending',paymentMode:'stripe_test',hasInboundSlip:false,mockGatewayFeePercent:3,mockGatewayFeeAmount:3,worker:{fullName:'Worker Test',bankAccount:{bankName:'ธนาคารทดสอบ',accountNumber:'1234567890',accountHolderName:'Worker Test'}}}]} )});
  const view=await mount(Payments);
  try {
    fire(find(view.root,'button','งานทดสอบ'),'click');await flush();
    assert.ok(text(view.root).includes('1234567890'));
    assert.ok(text(view.root).includes('ค่าธรรมเนียม Stripe mock 3%'));
    assert.ok(text(view.root).includes('ยืนยันจ่ายค่าจ้างและแนบสลิป'));
    assert.equal(calls.some(c=>c.method==='post'),false);
  } finally {view.unmount();}
});

test('Stripe refund proof uses the evidence endpoint without triggering another refund decision',async()=>{
  route.query={status:'refund_pending'};
  resetApi({get:async()=>({data:[{...payment,status:'refunded',paymentMode:'stripe_test',hasInboundSlip:false,refundStatus:'succeeded',stripeRefundId:'re_test_refund',refundAmount:105,hasRefundSlip:false}]}),post:async()=>({data:{message:'แนบหลักฐานแล้ว'}})});
  const view=await mount(Payments);
  try {
    fire(find(view.root,'button','งานทดสอบ'),'click');await flush();
    assert.ok(text(view.root).includes('ไม่ต้องโอนคืนผ่านธนาคารซ้ำ'));
    const inputs=walk(view.root).filter(n=>n.tag==='input');
    fire(inputs.find(n=>n.props.type==='file'),'change',{target:{files:[new File(['proof'],'refund.png',{type:'image/png'})]}});
    await input(inputs.find(n=>n.props.type==='number'),'105');
    await input(inputs.find(n=>n.props.type==='text'),'re_test_refund');
    await input(find(view.root,'textarea'),'แนบหลักฐานการคืนเงินจาก Stripe สำเร็จแล้ว');
    fire(find(view.root,'form'),'submit');await flush();
    const dialog=walk(view.root).find(n=>n.props.role==='dialog');assert.ok(dialog);
    fire(find(dialog,'form'),'submit');await flush();
    const posts=calls.filter(c=>c.method==='post');assert.equal(posts.length,1);
    assert.equal(posts[0].url,'/admin/payments/payment1/slips/refund');
    assert.equal(posts[0].args[0].get('amount'),'105');assert.equal(posts[0].args[0].get('reference'),'re_test_refund');
  } finally {view.unmount();}
});
test('post approval and rejection use page dialogs and send the intended action',async()=>{
  for(const action of ['approve','reject']){
    route.query={};const post={_id:'post1',title:'ประกาศทดสอบ',status:'pending_review'};
    resetApi({get:async()=>({data:{jobs:[post],total:1,counts:{pending_review:1},totalPages:1}}),post:async()=>({data:{}})});
    const view=await mount(Posts);
    try{
      fire(find(view.root,'button',action==='approve'?'Approve':'Reject'),'click');await flush();
      const dialog=walk(view.root).find(node=>node.props.role==='dialog');assert.ok(dialog);
      if(action==='reject')await input(find(dialog,'textarea'),'เหตุผลปฏิเสธประกาศทดสอบ');
      fire(find(dialog,'form'),'submit');await flush();
      const posted=calls.find(c=>c.method==='post');assert.equal(posted.url,`/admin/jobs/post1/${action}`);
      if(action==='reject')assert.equal(posted.args[0].reason,'เหตุผลปฏิเสธประกาศทดสอบ');
    }finally{view.unmount();}
  }
});
test('user moderation asks for a reason in-page and targets the selected account',async()=>{
  let user={_id:'user1',fullName:'ผู้ใช้ทดสอบ',currentRole:'worker',accountStatus:'active'};
  resetApi({get:async()=>({data:[user]}),post:async()=>{user={...user,accountStatus:'suspended'};return {data:{user}};}});
  const view=await mount(Users);
  try{
    fire(find(view.root,'li','ผู้ใช้ทดสอบ'),'click');await flush();fire(find(view.root,'button','Suspend'),'click');await flush();await confirm(view.root,'ตรวจสอบแล้วต้องระงับบัญชี');
    const posted=calls.find(c=>c.method==='post');assert.equal(posted.url,'/admin/users/user1/suspend');assert.deepEqual(posted.args[0],{action:'suspend',reason:'ตรวจสอบแล้วต้องระงับบัญชี'});
  }finally{view.unmount();}
});
test('SOS resolution confirms the entered case notes without a native confirm',async()=>{
  route.query={};const alert={_id:'sos1',worker:{fullName:'ผู้ขอความช่วยเหลือ'},status:'active'};
  resetApi({get:async()=>({data:[alert]}),post:async()=>({data:{}})});
  const view=await mount(Sos);
  try{
    fire(find(view.root,'button','ผู้ขอความช่วยเหลือ'),'click');await flush();await input(find(view.root,'textarea'),'ติดต่อและช่วยเหลือเรียบร้อยแล้ว');
    const close=walk(view.root).find(node=>node.tag==='button' && node.props.class?.includes('action-btn primary'));assert.ok(close);fire(close,'click');await flush();
    const dialog=walk(view.root).find(node=>node.props.role==='dialog');assert.ok(dialog);fire(find(dialog,'form'),'submit');await flush();
    const posted=calls.find(c=>c.method==='post');assert.equal(posted.url,'/admin/sos/sos1/resolve');assert.equal(posted.args[0].adminNotes,'ติดต่อและช่วยเหลือเรียบร้อยแล้ว');
  }finally{view.unmount();}
});
