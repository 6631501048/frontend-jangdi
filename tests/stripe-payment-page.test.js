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

test('cancelled/success return query never changes payment state or marks it paid',async()=>{
  for(const result of ['cancelled','success']){
    setup({query:{checkout:result}});const view=await mount(PaymentPage);
    try{assert.ok(text(view.root).includes(result==='success'?'กำลังรอ webhook ยืนยัน':'สามารถเปิด Stripe เพื่อลองใหม่ได้'));assert.equal(calls.some(c=>c.method==='post'),false);}
    finally{view.unmount();}
  }
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
