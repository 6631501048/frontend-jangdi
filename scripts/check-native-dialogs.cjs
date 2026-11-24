// All API writes and geolocation are fixtures: no real SOS, cancellation, password or role changes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { launchBrowser } = require('./ui-browser.cjs');
const { fixture: baseFixture, user, setContext } = require('./check-all-pages-ui.cjs');
const { auditAccessibility } = require('./ui-accessibility.cjs');
const output = path.resolve('docs/ui-review/page-dialogs');
let role = 'hirer', failSOS = false, failSwitch = true, browser;
const checks = [], sosPayloads = [];
(async () => {
  fs.mkdirSync(output, { recursive: true });
  browser = await launchBrowser(async (endpoint, url, request) => {
    if (endpoint === '/auth/me') return { body: { ...user, currentRole: role === 'admin' ? 'hirer' : role, isAdmin: role === 'admin' } };
    if (endpoint === '/auth/password' && request.method === 'PATCH') return JSON.parse(request.postData).current === 'right-current' ? { body: { token: 'updated-fixture-only' } } : { status: 401, body: { message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' } };
    if (endpoint === '/auth/role' && request.method === 'PATCH') {
      if (failSwitch) return { status: 503, body: { message: 'ทดสอบสลับบทบาทไม่สำเร็จ กรุณาลองใหม่' } };
      role = JSON.parse(request.postData).role; return { body: { user: { ...user, currentRole: role } } };
    }
    if (endpoint === '/sos' && request.method === 'POST') {
      sosPayloads.push(JSON.parse(request.postData));
      return failSOS ? { status: 503, body: { message: 'ทดสอบส่ง SOS ไม่สำเร็จ' } } : { body: { message: 'ส่งสำเร็จ' } };
    }
    if (endpoint === '/jobs/job-1/cancel' && request.method === 'POST') return { body: {} };
    if (endpoint === '/jobs/job-1/applicants') return { body: [] };
    const result = await baseFixture(endpoint, url, request);
    if (endpoint === '/jobs/job-1') return { body: { ...result.body, status: role === 'worker' ? 'in_progress' : 'waiting', scheduledAt: new Date(Date.now() - 86400000).toISOString() } };
    if (endpoint === '/payments/job-1/mock') return { body: { ...result.body, status: 'held' } };
    return result;
  });
  const { evaluate, send, until, delay } = browser;
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.alert=window.confirm=window.prompt=()=>{throw new Error('Native dialog invoked')}` });
  async function navigate(nextRole, route) {
    role = nextRole; setContext(role, route);
    await browser.navigate(route, { token: 'isolated-dialog-fixture', user: { ...user, currentRole: role === 'admin' ? 'hirer' : role, isAdmin: role === 'admin' } });
  }
  async function click(selector) { await evaluate(`{const element=document.querySelector(${JSON.stringify(selector)});element.focus();element.click();}`); await delay(100); }
  async function button(label) { await evaluate(`[...document.querySelectorAll('button')].find(button=>button.textContent.trim()===${JSON.stringify(label)}).click()`); await delay(100); }
  async function set(selector, value) { await evaluate(`{const input=document.querySelector(${JSON.stringify(selector)});input.value=${JSON.stringify(value)};input.dispatchEvent(new Event('input',{bubbles:true}));}`); }
  async function escape() { for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await delay(100); }
  async function audit(name) {
    assert(await evaluate('document.documentElement.scrollWidth <= innerWidth'));
    assert.deepEqual(await evaluate(`(${auditAccessibility.toString()})()`), { contrast: [], unnamed: [], smallTargets: [] });
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(output, `${name}.png`), Buffer.from(shot.data, 'base64'));
  }
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 960, deviceScaleFactor: 1, mobile: false });
  await navigate('hirer', '/hirer/my-jobs/job-1/applicants');
  await until('!!document.querySelector(".delete-btn")'); await click('.delete-btn'); await until('!!document.querySelector(".decision-panel")');
  assert(!browser.mutations.length); await audit('expired-job-confirm-390'); await escape(); assert(!browser.mutations.length);
  await click('.delete-btn'); await click('.decision-confirm'); await until('location.pathname === "/hirer"');
  assert.equal(browser.mutations.filter(item => item.path.endsWith('/cancel')).length, 1);
  checks.push('expired-job cancellation uses page confirmation, Escape cancels, explicit confirmation posts once');

  for (const nextRole of ['hirer', 'worker', 'admin']) {
    await navigate(nextRole, nextRole === 'admin' ? '/admin/profile' : '/profile'); await until('!document.querySelector(".profile-state[role=status]")');
    await button('เปลี่ยนรหัสผ่าน'); await until('!!document.querySelector(".modal form")');
    await click('.modal-actions .btn-gold'); await until('!!document.querySelector(".password-error")');
    await set('input[autocomplete=current-password]', 'wrong-current'); await set('input[aria-label="รหัสผ่านใหม่"]', 'new-fixture-password'); await set('input[aria-label="ยืนยันรหัสผ่านใหม่"]', 'new-fixture-password');
    await click('.modal-actions .btn-gold'); await until('document.querySelector(".password-error")?.textContent.includes("รหัสผ่านปัจจุบันไม่ถูกต้อง")');
    assert.equal(await evaluate('JSON.parse(localStorage.getItem("jangdi_auth")).token'), 'isolated-dialog-fixture');
    await audit(`password-error-${nextRole}-390`);
    await set('input[autocomplete=current-password]', 'right-current'); await click('.modal-actions .btn-gold');
    await until('!!document.querySelector(".password-success") && !document.querySelector(".modal")');
    assert.equal(await evaluate('JSON.parse(localStorage.getItem("jangdi_auth")).token'), 'updated-fixture-only');
    checks.push(`${nextRole} profile password validation/failure/success stays in page and preserves session`);
  }
  for (const nextRole of ['hirer', 'worker']) {
    await navigate(nextRole, nextRole === 'hirer' ? '/hirer' : '/worker/feed'); await click('.menu-button'); await until('!!document.querySelector(".role-drawer")');
    failSwitch = true; await evaluate(`[...document.querySelectorAll('.role-drawer button')].find(button=>button.textContent.includes('สลับเป็น')).click()`);
    await until('!!document.querySelector(".drawer-error")'); await audit(`role-error-${nextRole}-390`);
    assert.equal(await evaluate('JSON.parse(localStorage.getItem("jangdi_auth")).user.currentRole'), nextRole);
    failSwitch = false; await evaluate(`[...document.querySelectorAll('.role-drawer button')].find(button=>button.textContent.includes('สลับเป็น')).click()`);
    await until(`location.pathname === ${JSON.stringify(nextRole === 'hirer' ? '/worker/feed' : '/hirer')} && !document.querySelector('.role-drawer')`);
    checks.push(`${nextRole} role-switch error is inline, preserves role and supports retry`);
  }
  await navigate('worker', '/worker/jobs/job-1/tracking'); await until('!!document.querySelector(".btn-sos")');
  await evaluate(`window.__geoMode='success';Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(success,failure){if(window.__geoMode==='success')success({coords:{latitude:20,longitude:99}});else if(window.__geoMode==='pending')window.__geoSuccess=success;else failure({code:1})}}})`);
  await click('.btn-sos'); await until('!!document.querySelector(".decision-panel")'); await audit('sos-confirm-390');
  const count = sosPayloads.length; await escape(); assert.equal(sosPayloads.length, count);
  await click('.btn-sos'); await click('.decision-confirm'); await until('document.querySelector(".sos-message")?.textContent.includes("พร้อมตำแหน่งสำเร็จ")');
  assert.deepEqual(sosPayloads.at(-1), { jobId: 'job-1', lat: 20, lng: 99 });
  await evaluate("window.__geoMode='denied'"); await click('.btn-sos'); await click('.decision-confirm'); await until('document.querySelector(".decision-panel h2")?.textContent === "ส่ง SOS โดยไม่มีพิกัด"');
  await audit('sos-without-location-390'); await escape(); assert.equal(sosPayloads.length, count + 1);
  await click('.btn-sos'); await click('.decision-confirm'); await until('document.querySelector(".decision-panel h2")?.textContent === "ส่ง SOS โดยไม่มีพิกัด"'); await click('.decision-confirm');
  await until('document.querySelector(".sos-message")?.textContent.includes("สำเร็จ (ไม่มีพิกัด)")'); assert.deepEqual(sosPayloads.at(-1), { jobId: 'job-1' });
  failSOS = true; await evaluate("window.__geoMode='success'"); await click('.btn-sos'); await click('.decision-confirm'); await until('document.querySelector(".sos-message[role=alert]")?.textContent.includes("ทดสอบส่ง SOS ไม่สำเร็จ")');
  failSOS = false; await click('.btn-sos'); await click('.decision-confirm'); await until('document.querySelector(".sos-message")?.textContent.includes("พร้อมตำแหน่งสำเร็จ")');
  checks.push('SOS confirmation, geolocation fallback, cancel, success and retry remain in the page');
  await evaluate("window.__geoMode='pending'"); await click('.btn-sos'); await click('.decision-confirm'); await until('!!window.__geoSuccess'); const beforeLeave = sosPayloads.length;
  await evaluate(`(async()=>{const callback=window.__geoSuccess;await document.querySelector('.app-shell').__vueParentComponent.appContext.config.globalProperties.$router.push('/worker/feed');callback({coords:{latitude:20,longitude:99}})})()`);
  await delay(200); assert.equal(sosPayloads.length, beforeLeave);
  checks.push('leaving tracking during geolocation does not send an SOS');

  for (const width of [320, 768, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 960, deviceScaleFactor: 1, mobile: false });
    await navigate('hirer', '/hirer/my-jobs/job-1/applicants'); await click('.delete-btn'); await audit(`expired-job-confirm-${width}`); await escape();
    await navigate('admin', '/admin/profile'); await button('เปลี่ยนรหัสผ่าน'); await click('.modal-actions .btn-gold'); await audit(`password-error-admin-${width}`); await escape();
  }
  checks.push('new page messages/dialogs fit 320/390/768/1440px with accessible names and contrast');
  assert.deepEqual(browser.errors, []); assert.deepEqual(browser.unknown, []);
  fs.writeFileSync(path.join(output, 'checks.json'), JSON.stringify({ fixtureData: true, checks, errors: browser.errors, mutations: browser.mutations }, null, 2));
  console.log(`PASS: ${checks.length} page-dialog check groups. No native dialogs or real API changes.`);
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>browser?.close());
