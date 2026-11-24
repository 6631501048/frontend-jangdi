// Isolated fixture sessions; no real admin profile edits, role switches or logins.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { launchBrowser } = require('./ui-browser.cjs');
const { fixture: baseFixture, user, setContext } = require('./check-all-pages-ui.cjs');
const { auditAccessibility } = require('./ui-accessibility.cjs');
const output = path.resolve('docs/ui-review/admin-profile');
let account = { ...user, isAdmin: true, currentRole: 'hirer', isProfileComplete: false }, failSave = false, failLoad = false, browser;
const calls = [], checks = [];
(async () => {
  fs.mkdirSync(output, { recursive: true });
  browser = await launchBrowser(async (endpoint, url, request) => {
    calls.push({ endpoint, method: request.method, admin: account.isAdmin });
    if (endpoint === '/auth/me') return failLoad ? { status: 503, body: { message: 'ทดสอบโหลดบัญชีไม่สำเร็จ' } } : { body: account };
    if (endpoint === '/auth/login' && request.method === 'POST') return { body: { token: 'fixture-admin-login', user: account } };
    if (account.isAdmin && /\/users\/[^/]+\/(reviews|posts)$/.test(endpoint)) throw new Error('Admin profile must not load member reviews/posts');
    if (endpoint === '/users/preview-user' && request.method === 'PATCH') {
      const changes = JSON.parse(request.postData);
      assert.deepEqual(Object.keys(changes).sort(), ['fullName', 'phone']);
      if (failSave) return { status: 503, body: { message: 'ทดสอบบันทึกบัญชีไม่สำเร็จ' } };
      account = { ...account, ...changes, isProfileComplete: true }; return { body: { user: account } };
    }
    return baseFixture(endpoint, url, request);
  });
  const { evaluate, send, until, delay } = browser;
  async function navigate(route, loggedIn = true) {
    setContext(account.isAdmin ? 'admin' : account.currentRole, route);
    await browser.navigate(route, loggedIn ? { token: 'fixture-profile-session', user: account } : null);
  }
  async function click(selector) { await evaluate(`{const element=document.querySelector(${JSON.stringify(selector)});element.focus();element.click();}`); await delay(100); }
  async function button(label) { await evaluate(`[...document.querySelectorAll('button')].find(button=>button.textContent.trim()===${JSON.stringify(label)}).click()`); await delay(100); }
  async function set(selector, value) { await evaluate(`{const element=document.querySelector(${JSON.stringify(selector)});element.value=${JSON.stringify(value)};element.dispatchEvent(new Event('input',{bubbles:true}));}`); }
  async function assertAdminProfile() {
    await until('location.pathname === "/admin/profile" && !!document.querySelector(".admin-profile") && !document.querySelector(".profile-state[role=status]")');
    assert.equal(await evaluate('document.querySelectorAll(".admin-topbar").length'), 1);
    assert.equal(await evaluate('!!document.querySelector(".app-topbar, .role-drawer")'), false);
    assert.equal(await evaluate('document.querySelector("h1").textContent'), 'โปรไฟล์ผู้ดูแลระบบ');
    for (const text of ['คะแนนและรีวิว', 'ประวัติประกาศ', 'บัญชีธนาคาร', 'ข้อมูลที่อยู่', 'รหัสนักศึกษา']) assert(!await evaluate(`document.querySelector('.admin-profile').textContent.includes(${JSON.stringify(text)})`));
  }
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 960, deviceScaleFactor: 1, mobile: false });
  await navigate('/admin/dashboard'); await click('.admin-topbar .profile-btn'); await assertAdminProfile();
  checks.push('admin avatar opens /admin/profile with one admin header and account settings only');
  for (const route of ['/profile', '/profile/ratings', '/profile/history', '/admin/profile']) { await navigate(route); await assertAdminProfile(); }
  for (const route of ['/hirer', '/worker/feed', '/register']) { await navigate(route); await until('location.pathname === "/admin/dashboard"'); assert(await evaluate('!!document.querySelector(".admin-topbar")')); }
  account.currentRole = 'worker'; await navigate('/profile'); await assertAdminProfile(); account.currentRole = 'hirer';
  checks.push('legacy profile/review/history routes stay in admin; incomplete profile and stored role never send admin into member pages');

  failLoad = true; await navigate('/admin/profile'); await until('!!document.querySelector(".profile-error")');
  assert(await evaluate('!!document.querySelector(".admin-topbar")')); failLoad = false; await click('.profile-error button'); await assertAdminProfile();
  failSave = true; await button('แก้ไขข้อมูลส่วนตัว'); await set('input[aria-label="ชื่อ–นามสกุล"]', 'ผู้ดูแลแก้ไขแล้ว'); await set('input[aria-label="เบอร์โทรศัพท์"]', '0811111111');
  await button('บันทึก'); await until('document.querySelector(".profile-error")?.textContent.includes("ทดสอบบันทึกบัญชีไม่สำเร็จ")');
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify('input[aria-label="ชื่อ–นามสกุล"]')}).value`), 'ผู้ดูแลแก้ไขแล้ว');
  failSave = false; await button('บันทึก'); await assertAdminProfile();
  assert(await evaluate('JSON.parse(localStorage.getItem("jangdi_auth")).user.isAdmin'));
  checks.push('admin profile loads/retries and saves only name/phone while preserving admin identity and failed edits');

  await click('.admin-topbar .menu-btn'); await until('!!document.querySelector(".drawer")');
  assert(!await evaluate('document.querySelector(".drawer").textContent.includes("สลับเป็น")'));
  const links = await evaluate('[...document.querySelectorAll(".drawer nav a")].map(link=>link.getAttribute("href"))');
  assert(!links.includes('/admin/profile')); assert(links.every(link => link.startsWith('/admin/')));
  await click('.drawer a[href="/admin/jobs"]'); await until('location.pathname === "/admin/jobs"');
  await click('.admin-topbar .profile-btn'); await assertAdminProfile();
  checks.push('profile drawer retains admin destinations and returns to admin jobs/profile without role switching');

  for (const width of [320, 390, 768, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 960, deviceScaleFactor: 1, mobile: false });
    assert(await evaluate('document.documentElement.scrollWidth <= innerWidth'));
    assert.deepEqual(await evaluate(`(${auditAccessibility.toString()})()`), { contrast: [], unnamed: [], smallTargets: [] });
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(output, `admin-profile-${width}.png`), Buffer.from(shot.data, 'base64'));
    await button('เปลี่ยนรหัสผ่าน'); await until('!!document.querySelector(".modal[role=dialog]")');
    assert.equal(await evaluate('document.querySelectorAll(".modal input[type=password]").length'), 3);
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await until('!document.querySelector(".modal[role=dialog]")');
  }
  checks.push('admin profile responsive/contrast/targets and password-dialog Escape at 320/390/768/1440px');

  account.isProfileComplete = false; await navigate('/login', false);
  await set('input[type=email]', 'admin@lamduan.mfu.ac.th'); await set('input[type=password]', 'fixture-only-password'); await click('button[type=submit]');
  await until('location.pathname === "/admin/dashboard"');
  checks.push('admin login bypasses member registration even when isProfileComplete is false');

  for (const role of ['hirer', 'worker']) {
    account = { ...user, isAdmin: false, isProfileComplete: true, currentRole: role };
    await navigate('/profile'); await until('document.querySelector(".rating-summary") && !document.querySelector(".profile-state[role=status]")');
    assert.equal(await evaluate('location.pathname'), '/profile');
    assert(await evaluate('!!document.querySelector(".app-topbar") && !document.querySelector(".admin-topbar")'));
    assert(await evaluate('document.body.textContent.includes("ประวัติประกาศ") && document.body.textContent.includes("บัญชีธนาคาร")'));
    await navigate('/admin/profile'); await until('location.pathname === "/login"'); assert(!await evaluate('!!document.querySelector(".admin-topbar")'));
  }
  await navigate('/admin/profile', false); await until('location.pathname === "/login"');
  checks.push('hirer/worker retain member profile and cannot open admin profile; anonymous users require login');
  assert(!browser.mutations.some(item => item.path === '/api/auth/role'));
  assert.deepEqual(browser.errors, []); assert.deepEqual(browser.unknown, []);
  fs.writeFileSync(path.join(output, 'checks.json'), JSON.stringify({ fixtureData: true, checks, errors: browser.errors, mutations: browser.mutations }, null, 2));
  console.log(`PASS: ${checks.length} admin profile check groups with isolated fixture API responses.`);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => browser?.close());
