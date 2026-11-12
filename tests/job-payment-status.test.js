import test from 'node:test';
import assert from 'node:assert/strict';
import {mount,text} from './helpers/vueHost.js';
import {resetApi,calls} from './helpers/adminApi.js';
import JobPaymentStatus from '../src/components/JobPaymentStatus.vue';

test('completed work awaiting payout tells the worker that money has not been recorded as received',async()=>{
  resetApi();const view=await mount(JobPaymentStatus,{role:'worker',payment:{id:'p1',paymentMode:'stripe_test',status:'payout_pending',netAmountToWorker:100}});
  try {
    assert.ok(text(view.root).includes('รอ admin จ่ายค่าจ้าง'));
    assert.ok(text(view.root).includes('ยังไม่ถือว่า worker ได้รับค่าจ้าง'));
    assert.equal(calls.some(c=>c.url.includes('/slips/')),false);
  } finally {view.unmount();}
});

test('worker payout shows the amount, reference, date and private evidence after admin confirms',async()=>{
  resetApi({get:async()=>({data:new Blob(['image'],{type:'image/png'})})});
  const view=await mount(JobPaymentStatus,{role:'worker',payment:{id:'p1',paymentMode:'stripe_test',status:'released',hasPayoutSlip:true,paidAt:'2026-11-09T00:00:00Z',payoutAmount:100,payoutReference:'BANKREF123'}});
  try {
    assert.ok(text(view.root).includes('admin บันทึกจ่ายค่าจ้าง'));
    assert.ok(text(view.root).includes('BANKREF123'));
    assert.ok(calls.some(c=>c.url==='/payments/p1/slips/payout'));
  } finally {view.unmount();}
});

test('a legacy automatic release is not presented as confirmed worker payment',async()=>{
  resetApi();const view=await mount(JobPaymentStatus,{role:'worker',payment:{id:'p1',paymentMode:'stripe_test',status:'released'}});
  try {assert.ok(text(view.root).includes('รายการเดิมยังไม่มีหลักฐานจ่ายค่าจ้าง'));assert.equal(calls.some(c=>c.url.includes('/slips/')),false);}
  finally{view.unmount();}
});

test('refund status is visible to worker but refund proof is requested only for hirer',async()=>{
  for(const role of ['worker','hirer']){
    resetApi({get:async()=>({data:new Blob(['image'],{type:'image/png'})})});
    const view=await mount(JobPaymentStatus,{role,payment:{id:'p1',paymentMode:'stripe_test',refundMethod:'stripe',status:'refunded',hasRefundSlip:true}});
    try {
      assert.ok(text(view.root).includes('Stripe ยืนยันคืนเงินให้ผู้ว่าจ้างแล้ว'));
      assert.equal(calls.some(c=>c.url==='/payments/p1/slips/refund'),role==='hirer');
    } finally {view.unmount();}
  }
});
