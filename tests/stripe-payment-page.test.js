import test from 'node:test';
import assert from 'node:assert/strict';
import {mount,find,text,fire,flush} from './helpers/vueHost.js';
import {resetApi,calls} from './helpers/adminApi.js';
import {route} from './helpers/adminRouter.js';
import PaymentPage from '../src/views/hirer/HirerJobPaymentView.vue';

function setup({ready=true,query={},payment={},post}={}){
  route.params={id:'job1'};route.query=query;
  resetApi({get:async url=>({data:url==='/jobs/job1'?{title:'งานทดสอบ'}:
    url==='/payments/config'?{bank:{name:'ทดสอบ'}}:
    url==='/payments/stripe/status'?{ready}:
    {id:'pay1',status:'pending',paymentMode:'stripe_test',amount:100,platformFeeAmount:5,platformFeePercent:5,totalDue:105,...payment}}),post:post || (async()=>({data:{url:'https://checkout.stripe.com/c/pay/test'}}))});
}

test('payment page disables Stripe when backend configuration is missing',async()=>{
  setup({ready:false});const view=await mount(PaymentPage);
  try{assert.equal(find(view.root,'button','ชำระผ่าน Stripe ทดสอบ').props.disabled,true);assert.ok(text(view.root).includes('Stripe ทดสอบยังไม่พร้อม'));assert.equal(calls.some(c=>c.method==='post'),false);}
  finally{view.unmount();}
});

test('Stripe option explains PromptPay QR and does not claim payment on QR creation',async()=>{
  setup();const view=await mount(PaymentPage);
  try{
    assert.ok(text(view.root).includes('บัตร / PromptPay'));
    assert.ok(text(view.root).includes('สร้าง QR แล้วยังไม่ถือว่าชำระ'));
    assert.ok(text(view.root).includes('ไม่ต้องโอนเงินจริง'));
    assert.equal(calls.some(c=>c.method==='post'),false);
  }finally{view.unmount();}
});

test('cancelled/success return query never changes payment state or marks it paid',async()=>{
  for(const result of ['cancelled','success']){
    setup({query:{checkout:result}});const view=await mount(PaymentPage);
    try{assert.ok(text(view.root).includes(result==='success'?'กำลังตรวจสอบการชำระเงินกับ Stripe อัตโนมัติ':'สามารถเปิด Stripe เพื่อลองใหม่ได้'));assert.equal(calls.some(c=>c.method==='post'),false);}
    finally{view.unmount();}
  }
});

test('Stripe sessions reconcile automatically using the stored job, including without a return query',async()=>{
  for(const query of [{},{checkout:'success'}]){
    setup({query,payment:{hasStripeSession:true}});const view=await mount(PaymentPage);
    try{
      assert.equal(calls.filter(c=>c.method==='post' && c.url==='/payments/job1/stripe/sync').length,1);
      assert.ok(text(view.root).includes('แนบสลิป / หลักฐาน Stripe (ไม่บังคับ)'));
      assert.ok(text(view.root).includes('แนบรูปแล้วจะยังไม่ถือว่าชำระสำเร็จ'));
      assert.ok(text(view.root).includes('ขั้นตอนการชำระเงิน'));
    }finally{view.unmount();}
  }
});

test('completed Stripe payments do not poll or offer another payment',async()=>{
  setup({payment:{hasStripeSession:true,status:'held'}});const view=await mount(PaymentPage);
  try{
    assert.equal(calls.some(c=>c.method==='post'),false);
    assert.ok(text(view.root).includes('ชำระแล้ว ผู้รับจ้างเริ่มงานได้'));
    assert.ok(text(view.root).includes('บันทึกหลักฐาน Stripe'));
  }finally{view.unmount();}
});

test('successful reconciliation replaces pending with the server-confirmed state',async()=>{
  const payment={hasStripeSession:true};
  setup({payment,post:async()=>{payment.status='held';return {data:{status:'held'}};}});
  const view=await mount(PaymentPage);
  try{
    assert.ok(text(view.root).includes('ชำระแล้ว ผู้รับจ้างเริ่มงานได้'));
    assert.equal(text(view.root).includes('ตรวจสอบสถานะอัตโนมัติทุก 8 วินาที'),false);
  }finally{view.unmount();}
});

test('a failed Stripe status check keeps payment details and evidence available',async()=>{
  setup({payment:{hasStripeSession:true},post:async()=>{throw {response:{data:{message:'เชื่อมต่อ Stripe ไม่สำเร็จ'}}};}});
  const view=await mount(PaymentPage);
  try{
    assert.ok(text(view.root).includes('เชื่อมต่อ Stripe ไม่สำเร็จ'));
    assert.ok(text(view.root).includes('งานทดสอบ'));
    assert.ok(text(view.root).includes('บันทึกหลักฐาน Stripe'));
    assert.equal(text(view.root).includes('ชำระแล้ว ผู้รับจ้างเริ่มงานได้'),false);
  }finally{view.unmount();}
});

test('Checkout redirects only to the HTTPS Stripe host and sends no client amount',async()=>{
  for(const url of ['https://checkout.stripe.com/c/pay/test','https://evil.example/','http://checkout.stripe.com/','https://checkout.stripe.com.evil.example/']){
    let redirected;window.location={assign:value=>{redirected=value;}};
    setup({post:async()=>({data:{url}})});const view=await mount(PaymentPage);
    try{
      fire(find(view.root,'button','ชำระผ่าน Stripe ทดสอบ'),'click');await flush();
      const call=calls.find(c=>c.method==='post');assert.equal(call.url,'/payments/job1/checkout');assert.deepEqual(call.args,[]);
      if(url==='https://checkout.stripe.com/c/pay/test')assert.equal(redirected,url);
      else{assert.equal(redirected,undefined);assert.ok(text(view.root).includes('เปิด Stripe ทดสอบไม่สำเร็จ'));}
    }finally{view.unmount();}
  }
});

test('pending and failed refunds do not display refund completion',async()=>{
  for(const refundStatus of ['pending','failed']){
    setup({payment:{status:'disputed',refundDecision:'approved',refundStatus}});const view=await mount(PaymentPage);
    try{assert.ok(text(view.root).includes(refundStatus==='failed'?'Stripe คืนเงินไม่สำเร็จ':'กำลังรอ Stripe ยืนยันการคืนเงิน'));}
    finally{view.unmount();}
  }
});
