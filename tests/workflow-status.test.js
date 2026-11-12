import test from 'node:test';
import assert from 'node:assert/strict';
import { mount, find, text, fire, flush } from './helpers/vueHost.js';
import { resetApi } from './helpers/adminApi.js';
import { route } from './helpers/adminRouter.js';
import { servicePostWorkflowStatus, requestWorkflowLabel } from '../src/services/workflowStatus.js';
import Services from '../src/views/worker/WorkerMyServicePostView.vue';
import RequestDetail from '../src/views/worker/WorkerServiceRequestDetailView.vue';
import RefundPage from '../src/views/hirer/HirerRefundRequestView.vue';
import HirerDetail from '../src/views/hirer/HirerMyJobDetailView.vue';
import JobPaymentStatus from '../src/components/JobPaymentStatus.vue';

function timers() {
  const callbacks = new Map(); let id = 0;
  window.setInterval = callback => { callbacks.set(++id, callback); return id; };
  window.clearInterval = timer => callbacks.delete(timer);
  window.addEventListener = () => {};
  window.removeEventListener = () => {};
  return callbacks;
}
const post = { _id: 'post1', title: 'บริการทดสอบคืนเงิน', status: 'active', category: 'cleaning',
  fee: 100, currentOrderCount: 0, maxSimultaneousOrders: 1, availabilityEnd: '2099-01-01', createdAt: '2026-01-01' };
const request = { _id: 'request1', status: 'accepted', servicePost: post, resultingJob: { _id: 'job1', status: 'disputed' } };

test('each refund stage has its own service group; refunded orders cannot revive stale work', () => {
  for (const status of ['disputed', 'refund_pending', 'refunded']) {
    assert.equal(servicePostWorkflowStatus(post, [{ ...request, paymentStatus: status }]), status);
  }
  assert.equal(servicePostWorkflowStatus(post, [
    { ...request, paymentStatus: 'refunded' }, { status: 'accepted', jobStatus: 'in_progress' },
  ]), 'in_progress');
  assert.equal(servicePostWorkflowStatus(post, [{ ...request, paymentStatus: 'refunded' }, { status: 'pending' }]), 'waiting');
  assert.equal(requestWorkflowLabel({ ...request, paymentStatus: 'refunded' }), 'คืนเงินแล้ว');
  assert.equal(servicePostWorkflowStatus(post, [{ status: 'accepted' }]), 'unknown');
  const closedRefund = { ...post, status: 'closed', closeReason: 'refund' };
  assert.equal(servicePostWorkflowStatus(closedRefund, [{ status: 'pending' }]), 'refunded');
  assert.equal(servicePostWorkflowStatus(closedRefund, [{ status: 'accepted', jobStatus: 'in_progress' }]), 'in_progress');
});

test('service list moves from refund review to refunded while the page stays open', async () => {
  route.params = {}; route.query = {}; const callbacks = timers(); let status = 'disputed';
  resetApi({ get: async url => ({ data: url === '/service-posts/my' ? [post] : [{ ...request, paymentStatus: status }] }) });
  const view = await mount(Services);
  try {
    await flush();
    fire(find(view.root, 'button', 'รอพิจารณาคืนเงิน'), 'click'); await flush();
    assert.ok(text(view.root).includes(post.title));
    status = 'refunded';
    for (const callback of callbacks.values()) callback();
    await flush(); await flush();
    assert.equal(text(view.root).includes(post.title), false);
    fire(find(view.root, 'button', 'คืนเงินแล้ว'), 'click'); await flush();
    assert.ok(text(view.root).includes(post.title));
  } finally { view.unmount(); }
  assert.equal(callbacks.size, 0);
});

test('accepted request detail displays the final refund result', async () => {
  route.params = { id: 'request1' }; timers();
  resetApi({ get: async url => ({ data: url === '/payments/config' ? {} : { ...request, paymentStatus: 'refunded' } }) });
  const view = await mount(RequestDetail);
  try { assert.ok(text(view.root).includes('สถานะ: คืนเงินแล้ว')); }
  finally { view.unmount(); }
});

test('Stripe payment returned by admin is described as an admin transfer', async () => {
  resetApi();
  const view = await mount(JobPaymentStatus, { role: 'worker', payment: { status: 'refunded', paymentMode: 'stripe_test', refundMethod: 'admin_transfer', hasRefundSlip: true } });
  try {
    assert.ok(text(view.root).includes('แอดมินบันทึกคืนเงินให้ผู้ว่าจ้างแล้ว'));
    assert.equal(text(view.root).includes('Stripe ยืนยันคืนเงิน'), false);
  } finally { view.unmount(); }
});

test('refund page polls admin approval and completion and never says it is waiting for Stripe', async () => {
  route.params = { id: 'job1' }; const callbacks = timers(); let status = 'refund_pending';
  resetApi({ get: async url => ({ data: url.startsWith('/jobs/') ? { title: 'ทดสอบคืนเงิน' } : {
    status, paymentMode: 'stripe_test', refundMethod: 'admin_transfer', refundStatus: status === 'refunded' ? 'succeeded' : 'pending',
  } }) });
  const view = await mount(RefundPage);
  try {
    assert.ok(text(view.root).includes('รอแอดมินโอนคืนและแนบหลักฐาน'));
    assert.equal(text(view.root).includes('กำลังรอ Stripe'), false);
    status = 'refunded'; for (const callback of callbacks.values()) callback(); await flush();
    assert.ok(text(view.root).includes('คืนเงินแล้ว'));
    assert.equal(text(view.root).includes('รอแอดมินโอนคืนและแนบหลักฐาน'), false);
  } finally { view.unmount(); }
});

test('hirer detail never shows refund review and completion banners together for stale job data', async () => {
  route.params = { id: 'job1' }; timers();
  resetApi({ get: async url => ({ data: url === '/jobs/job1' ? {
    _id: 'job1', title: 'ทดสอบสถานะเก่า', status: 'disputed', hirer: { _id: 'hirer1' },
  } : url.includes('/mock') ? { status: 'refunded', refundAmount: 105, refundMethod: 'admin_transfer', hasRefundSlip: true } : {} }) });
  const view = await mount(HirerDetail);
  try {
    await flush();
    assert.ok(text(view.root).includes('คืนเงินแล้ว (โหมดทดสอบ)'));
    assert.equal(text(view.root).includes('งานพักไว้ระหว่างพิจารณาคืนเงิน'), false);
  } finally { view.unmount(); }
});
