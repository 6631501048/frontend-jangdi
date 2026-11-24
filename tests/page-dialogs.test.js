import test from 'node:test';
import assert from 'node:assert/strict';
import { mount, find, walk, text, fire, input, flush } from './helpers/vueHost.js';
import { resetApi, calls } from './helpers/adminApi.js';
import { route } from './helpers/adminRouter.js';
import Applicants from '../src/views/hirer/HirerApplicantsView.vue';
import Tracking from '../src/views/worker/WorkerJobTrackingView.vue';
import Profile from '../src/views/ProfileView.vue';
import Drawer from '../src/components/AppRoleDrawer.vue';

const oldStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const oldGeo = Object.getOwnPropertyDescriptor(navigator, 'geolocation');
let account, storage;
const dialog = view => walk(view.root).find(node => node.props.role === 'dialog' && String(node.props.class || '').includes('decision-panel'));
const posts = () => calls.filter(call => call.method === 'post');
async function confirm(view) { fire(find(dialog(view), 'form'), 'submit'); await flush(); await flush(); }
function geo(value) { Object.defineProperty(navigator, 'geolocation', { configurable: true, value }); }
test.beforeEach(() => {
  account = { _id: 'dialog-user', fullName: 'ผู้ใช้ทดสอบ', email: 'fixture@lamduan.mfu.ac.th', isProfileComplete: true, currentRole: 'hirer' };
  storage = new Map([['jangdi_auth', JSON.stringify({ token: 'fixture-session', user: account })]]);
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
  window.setInterval = () => 1; window.clearInterval = () => {}; route.params = { id: 'dialog-job' };
  geo({ getCurrentPosition: success => success({ coords: { latitude: 20, longitude: 99 } }) });
});
test.afterEach(() => {
  if (oldStorage) Object.defineProperty(globalThis, 'localStorage', oldStorage); else delete globalThis.localStorage;
  if (oldGeo) Object.defineProperty(navigator, 'geolocation', oldGeo); else delete navigator.geolocation;
});
function setup(post, patch) {
  resetApi({ get: async url => ({ data:
    url === '/auth/me' ? account : url.endsWith('/reviews') ? { reviews: [] } : url.endsWith('/posts') ? { jobs: [], servicePosts: [] } :
    url.startsWith('/jobs/') && !url.endsWith('/applicants') && !url.endsWith('/timeline') ? { _id: 'dialog-job', title: 'ทดสอบกล่องยืนยัน', hirer: { _id: 'hirer', fullName: 'ผู้ว่าจ้าง' }, status: post?.applicants ? 'waiting' : 'in_progress', scheduledAt: new Date(Date.now() - 86400000).toISOString(), price: 100 } :
    url.endsWith('/mock') ? { status: 'held' } : url.endsWith('/applicants') || url.endsWith('/timeline') ? [] : {} }),
    post: post || (async () => ({ data: {} })), patch: patch || (async () => ({ data: {} })),
  });
}

test('expired-job cancellation opens a page dialog, cancelling posts nothing, confirming posts once', async () => {
  const post = async () => ({ data: {} }); post.applicants = true; setup(post);
  const view = await mount(Applicants);
  try {
    fire(find(view.root, 'button', 'ลบงาน'), 'click'); await flush(); assert(dialog(view)); assert.equal(posts().length, 0);
    fire(find(dialog(view), 'button', 'ยกเลิก'), 'click'); await flush(); assert.equal(posts().length, 0);
    fire(find(view.root, 'button', 'ลบงาน'), 'click'); await flush(); const form = find(dialog(view), 'form'); fire(form, 'submit'); fire(form, 'submit'); await flush();
    assert.equal(posts().length, 1); assert.equal(posts()[0].url, '/jobs/dialog-job/cancel'); assert.equal(posts()[0].args[0].expiredNoApplicants, true);
  } finally { view.unmount(); }
});

test('SOS requires confirmation, sends selected coordinates once and displays status in the page', async () => {
  setup(); const view = await mount(Tracking);
  try {
    fire(find(view.root, 'button', 'กดเพื่อแจ้งเหตุฉุกเฉิน'), 'click'); await flush(); assert(dialog(view)); assert.equal(posts().length, 0);
    fire(find(dialog(view), 'button', 'ยกเลิก'), 'click'); await flush(); assert.equal(posts().length, 0);
    fire(find(view.root, 'button', 'กดเพื่อแจ้งเหตุฉุกเฉิน'), 'click'); await flush(); await confirm(view);
    assert.deepEqual(posts().map(call => [call.url, call.args[0]]), [['/sos', { jobId: 'dialog-job', lat: 20, lng: 99 }]]);
    assert(text(view.root).includes('ส่ง SOS พร้อมตำแหน่งสำเร็จ'));
  } finally { view.unmount(); }
});

test('SOS location failure, unavailable API and synchronous errors each need an explicit no-location confirmation', async () => {
  for (const location of [undefined, { getCurrentPosition: (success, failure) => failure({ code: 1 }) }, { getCurrentPosition() { throw new Error('blocked'); } }]) {
    geo(location); setup(); const view = await mount(Tracking);
    try {
      fire(find(view.root, 'button', 'กดเพื่อแจ้งเหตุฉุกเฉิน'), 'click'); await flush(); await confirm(view);
      assert(text(dialog(view)).includes('ส่ง SOS โดยไม่มีพิกัด')); assert.equal(posts().length, 0);
      fire(find(dialog(view), 'button', 'ยกเลิก'), 'click'); await flush(); assert.equal(posts().length, 0);
      fire(find(view.root, 'button', 'กดเพื่อแจ้งเหตุฉุกเฉิน'), 'click'); await flush(); await confirm(view); await confirm(view);
      assert.deepEqual(posts()[0].args[0], { jobId: 'dialog-job' });
      assert(text(view.root).includes('ส่ง SOS สำเร็จ (ไม่มีพิกัด)'));
    } finally { view.unmount(); }
  }
});

test('SOS errors stay in the page and allow a deliberate retry', async () => {
  let fail = true; setup(async () => { if (fail) throw { response: { data: { message: 'ทดสอบส่ง SOS ไม่สำเร็จ' } } }; return { data: {} }; });
  const view = await mount(Tracking);
  try {
    fire(find(view.root, 'button', 'กดเพื่อแจ้งเหตุฉุกเฉิน'), 'click'); await flush(); await confirm(view);
    assert(walk(view.root).some(node => node.props.role === 'alert' && text(node).includes('ทดสอบส่ง SOS ไม่สำเร็จ')));
    fail = false; fire(find(view.root, 'button', 'กดเพื่อแจ้งเหตุฉุกเฉิน'), 'click'); await flush(); await confirm(view);
    assert.equal(posts().length, 2); assert(text(view.root).includes('ส่ง SOS พร้อมตำแหน่งสำเร็จ'));
  } finally { view.unmount(); }
});

test('leaving a pending SOS confirmation or geolocation request never sends an SOS afterward', async () => {
  setup(); const view = await mount(Tracking);
  fire(find(view.root, 'button', 'กดเพื่อแจ้งเหตุฉุกเฉิน'), 'click'); await flush(); view.unmount(); await flush(); assert.equal(posts().length, 0);
  let success; geo({ getCurrentPosition: callback => { success = callback; } });
  const other = await mount(Tracking); fire(find(other.root, 'button', 'กดเพื่อแจ้งเหตุฉุกเฉิน'), 'click'); await flush(); await confirm(other);
  other.unmount(); success({ coords: { latitude: 20, longitude: 99 } }); await flush(); assert.equal(posts().length, 0);
});

test('role-switch failures stay in the drawer without changing identity, then support retry', async () => {
  let fail = true; setup(undefined, async () => { if (fail) throw { response: { data: { message: 'ทดสอบสลับบทบาทไม่สำเร็จ' } } }; return { data: { user: { ...account, currentRole: 'worker' } } }; });
  const view = await mount(Drawer, { modelValue: true });
  try {
    fire(find(view.root, 'button', 'สลับเป็นผู้รับจ้าง'), 'click'); await flush();
    assert(text(view.root).includes('ทดสอบสลับบทบาทไม่สำเร็จ')); assert.equal(JSON.parse(storage.get('jangdi_auth')).user.currentRole, 'hirer');
    fail = false; fire(find(view.root, 'button', 'สลับเป็นผู้รับจ้าง'), 'click'); await flush();
    assert.equal(JSON.parse(storage.get('jangdi_auth')).user.currentRole, 'worker');
    assert.equal(text(view.root).includes('ทดสอบสลับบทบาทไม่สำเร็จ'), false);
  } finally { view.unmount(); }
});

test('member and admin password validation/errors/success remain inside the profile', async () => {
  for (const isAdmin of [false, true]) {
    account.isAdmin = isAdmin; storage.set('jangdi_auth', JSON.stringify({ token: 'fixture-session', user: account }));
    let fail = true;
    setup(undefined, async () => { if (fail) throw { response: { status: 401, data: { message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' } } }; return { data: { token: 'updated-fixture-session' } }; });
    const view = await mount(Profile);
    try {
      fire(find(view.root, 'button', 'เปลี่ยนรหัสผ่าน'), 'click'); await flush();
      const modal = walk(view.root).find(node => node.props.role === 'dialog');
      fire(find(modal, 'form'), 'submit'); await flush(); assert(text(modal).includes('อย่างน้อย 8 ตัวอักษร'));
      for (const [label, value] of [['รหัสผ่านปัจจุบัน', 'wrong'], ['รหัสผ่านใหม่', 'updated-password'], ['ยืนยันรหัสผ่านใหม่', 'updated-password']]) await input(walk(modal).find(node => node.props['aria-label'] === label), value);
      fire(find(modal, 'form'), 'submit'); await flush(); assert(text(modal).includes('รหัสผ่านปัจจุบันไม่ถูกต้อง'));
      assert.equal(JSON.parse(storage.get('jangdi_auth')).token, 'fixture-session');
      fail = false; fire(find(modal, 'form'), 'submit'); await flush();
      assert(text(view.root).includes('เปลี่ยนรหัสผ่านสำเร็จ')); assert.equal(JSON.parse(storage.get('jangdi_auth')).token, 'updated-fixture-session');
      assert.equal(walk(view.root).some(node => node.props.role === 'dialog'), false);
    } finally { view.unmount(); }
  }
});
