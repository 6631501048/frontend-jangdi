// All API writes are intercepted. Never requests a real refund or changes account data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { launchBrowser } = require('./ui-browser.cjs');
const { fixture: baseFixture, user, setContext } = require('./check-all-pages-ui.cjs');
const { auditAccessibility } = require('./ui-accessibility.cjs');
const output = path.resolve('docs/ui-review/hirer-refund');
let browser, paymentStatus = 'held', jobStatus = 'assigned', failSubmit = false;
const checks = [];
(async () => {
  fs.mkdirSync(output, { recursive: true });
  browser = await launchBrowser(async (endpoint, url, request) => {
    if (endpoint === '/payments/job-1/refund-request' && request.method === 'POST') {
      if (failSubmit) return { status: 503, body: { message: 'ส่งคำขอไม่สำเร็จชั่วคราว กรุณาลองใหม่' } };
      paymentStatus = 'disputed'; return { body: { message: 'ส่งคำขอคืนเงินแล้ว', paymentId: 'payment-1' } };
    }
    const result = await baseFixture(endpoint, url, request);
    if (endpoint === '/jobs/job-1') return { body: { ...result.body, status: jobStatus } };
    if (endpoint === '/payments/job-1/mock') return { body: { ...result.body, status: paymentStatus, paymentMode: 'stripe_test' } };
    return result;
  });
  const { send, evaluate, until, delay } = browser;
  async function navigate(route = '/hirer/my-jobs/job-1/refund') {
    setContext('hirer', route);
    await browser.navigate(route, { token: 'isolated-refund-fixture', user: { ...user, currentRole: 'hirer' } });
    await evaluate(`window.confirm = window.alert = window.prompt = () => { throw new Error('Browser-native dialogs must not be used for refund') }`);
    await until('!document.querySelector(".refund [role=status]")?.textContent.includes("กำลังโหลด")');
  }
  async function choose(names, type = 'image/png', oversized = false) {
    await evaluate(`(async () => {
      const transfer = new DataTransfer();
      for (const name of ${JSON.stringify(names)}) {
        const canvas = document.createElement('canvas'); canvas.width=160;canvas.height=120;
        const context=canvas.getContext('2d');context.fillStyle='#e5a48a';context.fillRect(0,0,160,120);context.fillStyle='#100e04';context.font='16px sans-serif';context.fillText(name,10,60);
        const blob = await new Promise(resolve => canvas.toBlob(resolve,'image/png'));
        transfer.items.add(new File([${oversized ? 'new Uint8Array(2*1024*1024+1)' : 'blob'}], name, {type:${JSON.stringify(type)},lastModified:123}));
      }
      const input=document.querySelector('#refund-evidence');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
    })()`);
    await delay(80);
  }
  async function reason() { await evaluate(`{const input=document.querySelector('textarea');input.value='งานไม่เป็นไปตามข้อตกลง กรุณาตรวจสอบหลักฐาน';input.dispatchEvent(new Event('input',{bubbles:true}));}`); }
  async function click(selector) { await evaluate(`{const el=document.querySelector(${JSON.stringify(selector)});el.focus();el.click();}`); await delay(100); }
  async function open() { await reason(); await click('.refund form > .actions button'); await until('!!document.querySelector(".decision-panel")'); }
  const names = () => evaluate('[...document.querySelectorAll(".evidence-preview figcaption")].map(el=>el.textContent)');
  async function audit(name) {
    assert(await evaluate('document.documentElement.scrollWidth <= innerWidth'));
    assert.deepEqual(await evaluate(`(${auditAccessibility.toString()})()`), { contrast: [], unnamed: [], smallTargets: [] });
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(output, `${name}.png`), Buffer.from(shot.data, 'base64'));
  }

  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 960, deviceScaleFactor: 1, mobile: false });
  for (const status of ['assigned', 'awaiting_confirmation']) {
    jobStatus = status; paymentStatus = 'held'; await navigate('/hirer/my-jobs/job-1');
    await until('!!document.querySelector(".refund-link")');
    assert.equal(await evaluate('document.querySelector(".refund-link").getAttribute("href")'), '/hirer/my-jobs/job-1/refund');
    await click('.refund-link'); await until('!!document.querySelector("#refund-evidence")'); await open();
    assert(await evaluate('document.querySelector(".decision-panel").textContent.includes("ยังไม่ถือว่าได้รับเงินคืน")'));
    assert.equal(browser.mutations.length, 0);
    await click('.decision-actions button');
    await until('!document.querySelector(".decision-panel")');
  }
  checks.push('both hirer job-state refund links open the internal form and page confirmation');

  await navigate();
  await choose(['first.png', 'remove.png', 'last.png']); assert.equal((await names()).length, 3);
  assert(await evaluate('document.querySelector(".choose-evidence").disabled'));
  await click('button[aria-label="เอารูป remove.png ออก"]'); assert.deepEqual(await names(), ['first.png', 'last.png']);
  await choose(['remove.png']); assert.deepEqual(await names(), ['first.png', 'last.png', 'remove.png']);
  await click('button[aria-label="เอารูป first.png ออก"]'); await click('button[aria-label="เอารูป last.png ออก"]'); await click('button[aria-label="เอารูป remove.png ออก"]');
  assert.deepEqual(await names(), []); assert.equal(await evaluate('document.activeElement.className'), 'btn outline choose-evidence');
  await choose(['first.png']); assert.deepEqual(await names(), ['first.png']);
  await choose(['bad.txt'], 'text/plain'); assert.deepEqual(await names(), ['first.png']);
  await choose(['large.png'], 'image/png', true); assert.deepEqual(await names(), ['first.png']);
  await choose(['second.png', 'third.png', 'fourth.png']); assert.deepEqual(await names(), ['first.png']);
  await choose(['first.png']); assert.deepEqual(await names(), ['first.png']);
  checks.push('remove individual/all evidence, reselect same file, preserve valid files on invalid/oversized/excessive picks');

  for (const width of [320, 390, 768, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 960, deviceScaleFactor: 1, mobile: false });
    await audit(`evidence-${width}`); await open(); await audit(`confirmation-${width}`);
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await until('!document.querySelector(".decision-panel")');
    assert.deepEqual(await names(), ['first.png']);
  }
  checks.push('responsive, contrast, targets and Escape cancellation at 320/390/768/1440px');
  failSubmit = true; await open(); await click('.decision-confirm'); await until('document.querySelector(".notice.error")?.textContent.includes("ส่งคำขอไม่สำเร็จชั่วคราว")');
  assert.deepEqual(await names(), ['first.png']);
  failSubmit = false; await open(); await click('.decision-confirm'); await until('document.querySelector(".refund").textContent.includes("ส่งคำขอคืนเงินแล้ว รอผู้ดูแล")');
  assert.equal(browser.mutations.filter(item => item.path.endsWith('/refund-request')).length, 2);
  checks.push('API failure preserves form/evidence and retry submits successfully');
  assert.deepEqual(browser.errors, []); assert.deepEqual(browser.unknown, []);
  assert(browser.mutations.every(item => item.method === 'POST' && item.path === '/api/payments/job-1/refund-request'));
  fs.writeFileSync(path.join(output, 'checks.json'), JSON.stringify({ fixtureData: true, checks, errors: browser.errors, mutations: browser.mutations }, null, 2));
  console.log(`PASS: ${checks.length} hirer refund check groups, with no real refunds.`);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => browser?.close());
