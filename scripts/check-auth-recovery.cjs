// Isolated Chrome and fixture API: no account changes or real email is sent.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { launchBrowser } = require('./ui-browser.cjs');
const { fixture: baseFixture, user, setContext } = require('./check-all-pages-ui.cjs');
const { auditAccessibility } = require('./ui-accessibility.cjs');
const output = path.resolve('docs/ui-review/auth-recovery');
const validToken = 'ab'.repeat(32), expiredToken = 'cd'.repeat(32);
let failMail = false, failReset = false, browser;
const submitted = [], checks = [];
(async () => {
  fs.mkdirSync(output, { recursive: true });
  setContext('worker', '/worker/feed');
  browser = await launchBrowser(async (endpoint, url, request) => {
    const body = request.postData ? JSON.parse(request.postData) : {};
    if (request.method === 'POST' && ['/auth/login', '/auth/forgot-password', '/auth/reset-password'].includes(endpoint)) {
      assert(!Object.keys(request.headers).some(key => key.toLowerCase() === 'authorization'), 'Public auth does not attach an existing JWT');
      submitted.push({ endpoint, body });
    }
    if (endpoint === '/auth/login') return body.password === 'working-password' ? { body: { token: 'fixture-login-session', user: { ...user, currentRole: 'worker' } } } : { status: 401, body: { message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' } };
    if (endpoint === '/auth/forgot-password') return failMail ? { status: 503, body: { message: 'ระบบส่งอีเมลยังไม่พร้อม กรุณาลองใหม่ภายหลัง หรือเข้าสู่ระบบด้วย Google' } } : { body: { message: 'ตรวจสอบอีเมล', retryAfterSeconds: 60 } };
    if (endpoint === '/auth/reset-password') {
      if (body.token === expiredToken) return { status: 400, body: { code: 'RESET_LINK_INVALID', message: 'ลิงก์ไม่ถูกต้อง หมดอายุ หรือถูกใช้งานแล้ว กรุณาขอลิงก์ใหม่' } };
      if (failReset) return { status: 503, body: { message: 'ลองใหม่อีกครั้ง' } };
      assert.equal(body.token, validToken); return { body: { message: 'ตั้งรหัสผ่านสำเร็จ' } };
    }
    if (endpoint === '/auth/password') return { status: 401, body: { message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' } };
    return baseFixture(endpoint, url, request);
  });
  const { evaluate, until, send, navigate, delay } = browser;
  async function set(selector, value) { await evaluate(`{ const input=document.querySelector(${JSON.stringify(selector)}); input.value=${JSON.stringify(value)}; input.dispatchEvent(new Event('input',{bubbles:true})); }`); }
  async function click(selector) { await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`); await delay(100); }
  async function submit() { await evaluate('document.querySelector("form").requestSubmit()'); await delay(150); }
  async function audit(name) {
    assert(await evaluate('document.documentElement.scrollWidth <= innerWidth'), `${name}: no overflow`);
    assert.deepEqual(await evaluate(`(${auditAccessibility.toString()})()`), { contrast: [], unnamed: [], smallTargets: [] });
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(output, `${name}.png`), Buffer.from(shot.data, 'base64'));
  }
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 960, deviceScaleFactor: 1, mobile: false });
  await navigate('/login');
  await set('input[type=email]', 'STUDENT@LAMDUAN.MFU.AC.TH'); await set('input[type=password]', 'wrong-password'); await submit();
  await until('!!document.querySelector(".error")');
  assert.equal(await evaluate('location.pathname'), '/login');
  assert.equal(submitted.at(-1).body.email, 'student@lamduan.mfu.ac.th');
  await set('input[type=password]', 'working-password'); await submit(); await until('location.pathname === "/worker/feed"');
  checks.push('password login: normalized email, wrong password inline, successful worker redirect');

  await navigate('/login'); await click('.recovery-link'); await until('location.pathname === "/forgot-password"');
  const before = submitted.length;
  await set('input[type=email]', 'student@gmail.com'); await submit();
  assert.equal(submitted.length, before); assert(await evaluate('document.querySelector(".error").textContent.includes("lamduan")'));
  await set('input[type=email]', 'STUDENT@LAMDUAN.MFU.AC.TH'); failMail = true; await submit();
  assert(await evaluate('document.querySelector(".error").textContent.includes("ระบบส่งอีเมลยังไม่พร้อม")'));
  assert.equal(await evaluate('!!document.querySelector(".recovery-notice")'), false);
  failMail = false; await submit(); await until('!!document.querySelector(".recovery-notice")');
  assert(await evaluate('document.querySelector("button[type=submit]").disabled'));
  await audit('forgot-success-390');
  checks.push('forgot password: domain validation, SMTP error, generic confirmation and resend cooldown');

  await navigate('/reset-password'); assert(await evaluate('document.querySelector("h1").textContent.includes("ขอลิงก์ใหม่")'));
  await audit('reset-missing-390');
  await navigate(`/reset-password#token=${expiredToken}`);
  await until('location.hash === ""');
  await set('input[autocomplete=new-password]', 'new-password-123');
  // The inputs live in separate labels; select their shared type in document order.
  await evaluate('document.querySelectorAll("input[type=password]")[1].value="new-password-123";document.querySelectorAll("input[type=password]")[1].dispatchEvent(new Event("input",{bubbles:true}))');
  await submit(); await until('document.querySelector("h1").textContent.includes("ขอลิงก์ใหม่")');
  checks.push('missing/expired link gives a new-link action; secret fragment is removed');

  const session = { token: 'local-fixture-session', user: { ...user, currentRole: 'worker', isProfileComplete: false } };
  await navigate(`/reset-password#token=${validToken}`, session);
  assert.equal(await evaluate('location.pathname'), '/reset-password');
  await set('input[type=password]', 'new-password-123');
  await evaluate('document.querySelectorAll("input[type=password]")[1].value="different-password";document.querySelectorAll("input[type=password]")[1].dispatchEvent(new Event("input",{bubbles:true}))');
  const resetBefore = submitted.length; await submit(); assert.equal(submitted.length, resetBefore);
  await evaluate('document.querySelectorAll("input[type=password]")[1].value="new-password-123";document.querySelectorAll("input[type=password]")[1].dispatchEvent(new Event("input",{bubbles:true}))');
  failReset = true; await submit(); assert(await evaluate('!!document.querySelector(".error")'));
  assert.equal(await evaluate('document.querySelector("input[type=password]").value'), 'new-password-123');
  failReset = false; await submit(); await until('document.querySelector("h1").textContent === "ตั้งรหัสผ่านสำเร็จ"');
  assert.equal(await evaluate('localStorage.getItem("jangdi_auth")'), null);
  await click('.recovery-primary'); await until('location.pathname === "/login"');
  checks.push('reset: incomplete-profile session allowed, matching validation, retry, success clears session');

  await navigate('/profile', { ...session, user: { ...session.user, isProfileComplete: true } });
  await until('!document.querySelector(".profile-state[role=status]")');
  await evaluate(`window.alert = message => { window.passwordAlert = message }; [...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'เปลี่ยนรหัสผ่าน').click()`);
  await until('!!document.querySelector(".modal input")');
  await set('input[autocomplete=current-password]', 'wrong-password');
  await set('input[aria-label="รหัสผ่านใหม่"]', 'new-password-123');
  await set('input[aria-label="ยืนยันรหัสผ่านใหม่"]', 'new-password-123');
  await click('.modal-actions .btn-gold');
  await until('!!window.passwordAlert');
  assert.equal(await evaluate('location.pathname'), '/profile');
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("jangdi_auth")).token'), session.token);
  assert(await evaluate('window.passwordAlert.includes("รหัสผ่านปัจจุบันไม่ถูกต้อง")'));
  checks.push('incorrect current password preserves the profile session');

  for (const width of [320, 390, 768, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 960, deviceScaleFactor: 1, mobile: false });
    for (const route of ['/login', '/forgot-password', `/reset-password#token=${validToken}`]) {
      await navigate(route); await audit(`${route.split(/[\/#]/)[1]}-${width}`);
      await evaluate('document.querySelector("input")?.focus()');
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
      assert(await evaluate('document.activeElement.matches("input,a,button")'));
      assert(await evaluate('getComputedStyle(document.activeElement).outlineStyle !== "none"'), 'keyboard focus is visible');
    }
  }
  checks.push('login/forgot/reset: responsive, contrast, targets and keyboard focus at 320/390/768/1440px');
  assert.deepEqual(browser.errors, []); assert.deepEqual(browser.unknown, []);
  fs.writeFileSync(path.join(output, 'checks.json'), JSON.stringify({ fixtureData: true, checks, errors: browser.errors }, null, 2));
  console.log(`PASS: ${checks.length} auth flow groups including 12 responsive page checks.`);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => browser?.close());
