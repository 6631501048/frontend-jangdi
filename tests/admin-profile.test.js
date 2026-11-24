import test from 'node:test';
import assert from 'node:assert/strict';
import { mount, find, walk, text, fire, input, flush } from './helpers/vueHost.js';
import { resetApi, calls } from './helpers/adminApi.js';
import Profile from '../src/views/ProfileView.vue';

const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
let account, storage;
test.beforeEach(() => {
  account = { _id: 'admin-profile-test', isAdmin: true, currentRole: 'hirer', isProfileComplete: false, fullName: 'ผู้ดูแลตัวอย่าง', email: 'admin@lamduan.mfu.ac.th', phone: '0800000000', bankAccount: { bankName: 'ข้อมูลเดิม', accountNumber: '123' } };
  storage = new Map([['jangdi_auth', JSON.stringify({ token: 'fixture-only', user: account })]]);
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
});
test.afterEach(() => { if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage); else delete globalThis.localStorage; });
function setup(patch, failLoad = false) {
  resetApi({ get: async url => {
    if (url === '/auth/me') { if (failLoad) throw new Error('offline'); return { data: account }; }
    if (url.endsWith('/reviews')) return { data: { reviews: [], averageRating: 0, reviewCount: 0 } };
    if (url.endsWith('/posts')) return { data: { jobs: [], servicePosts: [] } };
    throw new Error('Unexpected request');
  }, patch: patch || (async (url, changes) => { account = { ...account, ...changes }; return { data: { user: account } }; }) });
}

test('admin profile contains account settings and skips marketplace sections and requests', async () => {
  setup(); const view = await mount(Profile);
  try {
    assert(text(view.root).includes('โปรไฟล์ผู้ดูแลระบบ'));
    for (const label of ['คะแนนและรีวิว', 'ประวัติประกาศ', 'ข้อมูลที่อยู่', 'บัญชีธนาคาร', 'รหัสนักศึกษา', 'แนะนำตัว', 'Facebook', 'Instagram', 'Line']) assert(!text(view.root).includes(label), label);
    assert.equal(walk(view.root).some(node => node.props.class === 'app-topbar' || node.props.class === 'role-drawer'), false);
    assert.deepEqual(calls.map(call => call.url), ['/auth/me']);
    assert(find(view.root, 'button', 'เปลี่ยนรหัสผ่าน'));
    assert(find(view.root, 'button', 'เปลี่ยนรูปโปรไฟล์'));
  } finally { view.unmount(); }
});

test('admin edits only name and phone without overwriting hidden member data or admin status', async () => {
  setup(); const view = await mount(Profile);
  try {
    fire(find(view.root, 'button', 'แก้ไขข้อมูลส่วนตัว'), 'click'); await flush();
    await input(walk(view.root).find(node => node.props['aria-label'] === 'ชื่อ–นามสกุล'), 'ชื่อผู้ดูแลใหม่');
    await input(walk(view.root).find(node => node.props['aria-label'] === 'เบอร์โทรศัพท์'), '0811111111');
    fire(find(view.root, 'button', 'บันทึก'), 'click'); await flush();
    const patch = calls.find(call => call.method === 'patch');
    assert.equal(patch.url, '/users/admin-profile-test');
    assert.deepEqual(patch.args[0], { fullName: 'ชื่อผู้ดูแลใหม่', phone: '0811111111' });
    const saved = JSON.parse(storage.get('jangdi_auth')).user;
    assert.equal(saved.isAdmin, true); assert.equal(saved.bankAccount.accountNumber, '123');
    assert(text(view.root).includes('ชื่อผู้ดูแลใหม่'));
  } finally { view.unmount(); }
});

test('admin save failure keeps editable values and the admin profile context', async () => {
  setup(async () => { throw { response: { data: { message: 'บันทึกไม่สำเร็จชั่วคราว' } } }; });
  const view = await mount(Profile);
  try {
    fire(find(view.root, 'button', 'แก้ไขข้อมูลส่วนตัว'), 'click'); await flush();
    const name = walk(view.root).find(node => node.props['aria-label'] === 'ชื่อ–นามสกุล'); await input(name, 'ข้อมูลที่ยังไม่บันทึก');
    fire(find(view.root, 'button', 'บันทึก'), 'click'); await flush();
    assert(text(view.root).includes('บันทึกไม่สำเร็จชั่วคราว'));
    assert.equal(name.value, 'ข้อมูลที่ยังไม่บันทึก'); assert(text(view.root).includes('โปรไฟล์ผู้ดูแลระบบ'));
  } finally { view.unmount(); }
});

test('admin profile load failure keeps the admin view and exposes retry', async () => {
  setup(undefined, true); const view = await mount(Profile);
  try {
    assert(text(view.root).includes('โหลดข้อมูลโปรไฟล์ไม่สำเร็จ'));
    assert(find(view.root, 'button', 'ลองอีกครั้ง'));
    assert(!text(view.root).includes('คะแนนและรีวิว'));
    assert.equal(calls.some(call => /reviews|posts/.test(call.url)), false);
  } finally { view.unmount(); }
});

test('member profiles retain reviews, post history, address and payment details', async () => {
  account.isAdmin = false; account.isProfileComplete = true;
  storage.set('jangdi_auth', JSON.stringify({ token: 'fixture-only', user: account })); setup();
  const view = await mount(Profile);
  try {
    for (const label of ['จัดการโปรไฟล์', 'คะแนนและรีวิว', 'ประวัติประกาศ', 'ข้อมูลที่อยู่', 'บัญชีธนาคาร']) assert(text(view.root).includes(label), label);
    assert(calls.some(call => call.url.endsWith('/reviews'))); assert(calls.some(call => call.url.endsWith('/posts')));
  } finally { view.unmount(); }
});
