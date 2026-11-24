import test from 'node:test';
import assert from 'node:assert/strict';
import { mount, find, walk, text, fire, input, flush } from './helpers/vueHost.js';
import { resetApi, calls } from './helpers/adminApi.js';
import { route } from './helpers/adminRouter.js';
import Refund from '../src/views/hirer/HirerRefundRequestView.vue';

const createUrl = URL.createObjectURL, revokeUrl = URL.revokeObjectURL;
let created, revoked, timers, status;
test.beforeEach(() => {
  created = []; revoked = []; timers = []; status = 'held'; route.params = { id: 'refund-job' };
  window.setInterval = callback => { timers.push(callback); return timers.length; }; window.clearInterval = () => {};
  URL.createObjectURL = file => { const url = `blob:refund-${created.length}`; created.push({ url, name: file.name }); return url; };
  URL.revokeObjectURL = url => revoked.push(url);
});
test.afterEach(() => { URL.createObjectURL = createUrl; URL.revokeObjectURL = revokeUrl; });
function setup(post) {
  resetApi({ get: async url => ({ data: url.startsWith('/jobs/') ? { _id: 'refund-job', title: 'งานทดสอบคืนเงิน' } : { status, totalDue: 123 } }), post: post || (async () => { status = 'disputed'; return { data: {} }; }) });
}
const file = name => new File(['evidence'], name, { type: 'image/png', lastModified: 123 });
const evidence = view => walk(view.root).find(node => node.tag === 'input' && node.props.type === 'file');
async function choose(view, files) { const el = evidence(view); el.files = files; fire(el, 'change'); await flush(); }
const captions = view => walk(view.root).filter(node => node.tag === 'figcaption').map(text);
const dialog = view => walk(view.root).find(node => node.props.role === 'dialog');
async function openConfirmation(view) { await input(find(view.root, 'textarea'), 'งานไม่เป็นไปตามที่ตกลงไว้'); fire(find(view.root, 'form'), 'submit'); await flush(); assert(dialog(view)); }

test('refund evidence removes one file, keeps remaining files and releases each image URL', async () => {
  setup(); const view = await mount(Refund);
  try {
    await choose(view, [file('first.png'), file('middle.png'), file('last.png')]);
    const remove = walk(view.root).find(node => node.props['aria-label'] === 'เอารูป middle.png ออก');
    fire(remove, 'click'); await flush();
    assert.deepEqual(captions(view), ['first.png', 'last.png']);
    assert.deepEqual(revoked, ['blob:refund-1']);
    await choose(view, [file('middle.png')]);
    assert.deepEqual(captions(view), ['first.png', 'last.png', 'middle.png']);
  } finally { view.unmount(); }
  assert.equal(revoked.length, 4); assert.equal(new Set(revoked).size, 4);
});

test('invalid or excessive evidence preserves existing files; cancelling the picker changes nothing', async () => {
  setup(); const view = await mount(Refund);
  try {
    await choose(view, [file('kept.png')]);
    await choose(view, [new File(['invalid'], 'invalid.txt', { type: 'text/plain' })]);
    assert.deepEqual(captions(view), ['kept.png']); assert(text(view.root).includes('ไม่เกิน 3 ภาพ'));
    await choose(view, [file('two.png'), file('three.png'), file('four.png')]);
    assert.deepEqual(captions(view), ['kept.png']);
    await choose(view, []); assert.deepEqual(captions(view), ['kept.png']);
    await choose(view, [file('kept.png')]); assert.deepEqual(captions(view), ['kept.png']);
    assert.deepEqual(revoked, []);
  } finally { view.unmount(); }
});

test('refund confirmation stays in the page; cancelling preserves form and submits nothing', async () => {
  setup(); const view = await mount(Refund);
  try {
    await choose(view, [file('kept.png')]); await openConfirmation(view);
    assert(text(dialog(view)).includes('ยังไม่ถือว่าได้รับเงินคืน'));
    assert.equal(calls.some(call => call.method === 'post'), false);
    fire(find(dialog(view), 'button', 'ยกเลิก'), 'click'); await flush();
    assert.equal(dialog(view), undefined); assert.deepEqual(captions(view), ['kept.png']);
    assert.equal(calls.some(call => call.method === 'post'), false);
  } finally { view.unmount(); }
});

test('refund sends only retained evidence once after confirmation', async () => {
  setup(); const view = await mount(Refund);
  try {
    await choose(view, [file('keep.png'), file('remove.png')]);
    fire(walk(view.root).find(node => node.props['aria-label'] === 'เอารูป remove.png ออก'), 'click'); await flush();
    await openConfirmation(view);
    const form = find(dialog(view), 'form'); fire(form, 'submit'); fire(form, 'submit'); await flush(); await flush();
    const posts = calls.filter(call => call.method === 'post'); assert.equal(posts.length, 1);
    assert.equal(posts[0].url, '/payments/refund-job/refund-request');
    assert.deepEqual(posts[0].args[0].getAll('evidence').map(item => item.name), ['keep.png']);
    assert.equal(posts[0].args[0].get('reason'), 'งานไม่เป็นไปตามที่ตกลงไว้');
    assert(text(view.root).includes('ส่งคำขอคืนเงินแล้ว'));
  } finally { view.unmount(); }
});

test('refund can be requested without images; API failure retains reason and evidence for retry', async () => {
  let fail = true;
  setup(async () => { if (fail) throw { response: { data: { message: 'ส่งคำขอไม่สำเร็จชั่วคราว' } } }; status = 'disputed'; return { data: {} }; });
  const view = await mount(Refund);
  try {
    await openConfirmation(view); fire(find(dialog(view), 'form'), 'submit'); await flush();
    assert(text(view.root).includes('ส่งคำขอไม่สำเร็จชั่วคราว'));
    assert.equal(calls.filter(call => call.method === 'post')[0].args[0].getAll('evidence').length, 0);
    fail = false; await choose(view, [file('retry.png')]); await openConfirmation(view);
    fire(find(dialog(view), 'form'), 'submit'); await flush();
    assert.equal(calls.filter(call => call.method === 'post')[1].args[0].getAll('evidence')[0].name, 'retry.png');
  } finally { view.unmount(); }
});

test('refund confirmation cannot post after the payment status changes or page is left', async () => {
  setup(); const view = await mount(Refund);
  try {
    await openConfirmation(view); status = 'disputed'; timers.forEach(callback => callback()); await flush();
    fire(find(dialog(view), 'form'), 'submit'); await flush();
    assert.equal(calls.some(call => call.method === 'post'), false);
    assert(text(view.root).includes('สถานะรายการเปลี่ยนแปลงแล้ว'));
  } finally { view.unmount(); }
  status = 'held'; const other = await mount(Refund); await openConfirmation(other); other.unmount(); await flush();
  assert.equal(calls.some(call => call.method === 'post'), false);
});
