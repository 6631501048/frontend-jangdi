// Local browser verification with isolated fixture data. Never uses a real account.
// Start Vite on 127.0.0.1:5175, then run: node scripts/check-hirer-ui.cjs
const { spawn } = require('node:child_process');
const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const WebSocket = require('ws');

const base = process.env.HIRER_PREVIEW_URL || 'http://127.0.0.1:5175';
const chromePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const output = path.resolve('docs/ui-review');
const profile = mkdtempSync(path.join(tmpdir(), 'jangdi-hirer-ui-'));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let browser;
let socket;
let seq = 0;
const pending = new Map();
const errors = [];
const requests = [];
let mode = 'populated';
let loadingGate;
const now = Date.now();
const services = Array.from({ length: 12 }, (_, i) => ({
  _id: `service-${i}`, worker: { _id: `worker-${i}`, fullName: i === 0 ? 'มินท์ · ช่วยดูแลงานบ้าน' : i === 1 ? 'ก้อง · รับส่งของในพื้นที่' : `ผู้รับจ้าง ${i + 1}` },
  category: i === 1 ? 'delivery' : 'cleaning', status: 'active',
  description: i === 1 ? 'รับของไปส่งถึงที่ นัดหมายเวลาได้ แจ้งรายละเอียดจุดรับและจุดส่งก่อนเริ่มงาน' : 'รับทำความสะอาดห้องพักและคอนโด ใส่ใจทุกมุม พร้อมช่วยให้วันยุ่ง ๆ ของคุณเบาขึ้น',
  fee: i === 1 ? 80 : 350, serviceType: 'pickup_delivery', locationLabel: 'เชียงราย · รอบมหาวิทยาลัย',
  availabilityStart: new Date(now).toISOString(), availabilityEnd: new Date(now + 86400000).toISOString(),
  createdAt: new Date(now - i * 60000).toISOString(), maxSimultaneousOrders: 5, currentOrderCount: 0, serviceRadiusMeters: 3000,
}));
services.push({ ...services[0], _id: 'own-service', worker: { _id: 'preview-user', fullName: 'บริการของฉัน' } });
services.push({ ...services[0], _id: 'full-service', currentOrderCount: 5 });
services.push({ ...services[0], _id: 'expired-service', availabilityEnd: new Date(now - 86400000).toISOString() });
const jobs = [
  { _id: 'own-job', hirer: { _id: 'preview-user', fullName: 'งานของฉัน' }, category: 'cleaning', title: 'ประกาศงานของฉัน', status: 'waiting', createdAt: new Date(now).toISOString() },
  { _id: 'job-1', hirer: { fullName: 'พลอย' }, category: 'tutoring', title: 'หาคนช่วยติวภาษาอังกฤษ เตรียมสอบปลายภาค', price: 250, status: 'waiting', createdAt: new Date(now - 120000).toISOString(), locationText: 'ออนไลน์' },
  { _id: 'closed-job', hirer: { fullName: 'ปิดแล้ว' }, category: 'tutoring', title: 'งานที่เสร็จแล้ว', status: 'completed', createdAt: new Date(now).toISOString() },
];

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++seq;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timed out: ${method}`)); }, 15000);
    pending.set(id, { resolve: value => { clearTimeout(timeout); resolve(value); }, reject: error => { clearTimeout(timeout); reject(error); } });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(`${result.exceptionDetails.exception?.description || result.exceptionDetails.text}: ${expression}`);
  return result.result.value;
}
async function until(expression) {
  for (let n = 0; n < 100; n++) {
    if (await evaluate(expression)) return;
    await delay(100);
  }
  throw new Error(`Timed out: ${expression}`);
}
async function click(selector) {
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  await delay(150);
}
async function fixture(event) {
  const url = new URL(event.request.url);
  requests.push(url.pathname);
  if (url.pathname.startsWith('/socket.io/')) {
    await send('Fetch.failRequest', { requestId: event.requestId, errorReason: 'Aborted' });
    return;
  }
  if (!/\/(api\/)?(jobs|service-posts|notifications)(\/|$)/.test(url.pathname)) {
    await send('Fetch.continueRequest', { requestId: event.requestId });
    return;
  }
  if (mode === 'loading') await loadingGate;
  let data = [];
  if (mode !== 'empty') {
    if (/\/requests\/my-as-hirer/.test(url.pathname)) data = [{ _id: 'request-1', servicePost: 'service-0', status: 'pending', createdAt: new Date(now).toISOString() }];
    else if (/\/service-posts\/?$/.test(url.pathname)) data = services;
    else if (/\/jobs\/?$/.test(url.pathname)) data = jobs;
    else if (/unread-count/.test(url.pathname)) data = { count: 0 };
  }
  await send('Fetch.fulfillRequest', { requestId: event.requestId, responseCode: mode === 'error' && /\/jobs\/?$/.test(url.pathname) ? 503 : 200,
    responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' }, { name: 'Access-Control-Allow-Headers', value: 'authorization, content-type' }, { name: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' }],
    body: Buffer.from(JSON.stringify(mode === 'error' ? { message: 'ไม่สามารถเชื่อมต่อได้ กรุณาลองอีกครั้ง' } : data)).toString('base64') });
}
async function reload() {
  await send('Page.navigate', { url: `${base}/hirer` });
  await until(`document.querySelector('h1') && !document.querySelector('.loading-state')`);
}
async function screenshot(name) {
  const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  writeFileSync(path.join(output, name), Buffer.from(result.data, 'base64'));
}

(async () => {
  mkdirSync(output, { recursive: true });
  browser = spawn(chromePath, ['--headless=new', '--remote-debugging-port=9339', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-background-networking', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let target;
  for (let n = 0; n < 80; n++) {
    try { target = (await (await fetch('http://127.0.0.1:9339/json')).json()).find(item => item.type === 'page'); if (target) break; } catch {}
    await delay(150);
  }
  assert(target, 'Chrome remote debugging must start');
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(resolve => socket.once('open', resolve));
  socket.on('message', message => {
    const event = JSON.parse(message);
    if (event.id) {
      const handler = pending.get(event.id);
      pending.delete(event.id);
      if (event.error) handler?.reject(new Error(event.error.message)); else handler?.resolve(event.result);
    }
    if (event.method === 'Fetch.requestPaused') fixture(event.params).catch(error => errors.push(error.message));
    if (event.method === 'Runtime.exceptionThrown') errors.push(event.params.exceptionDetails.text);
  });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('jangdi_auth', ${JSON.stringify(JSON.stringify({ token: 'local-fixture-only', user: { _id: 'preview-user', fullName: 'ธนวิทย์', currentRole: 'hirer', isProfileComplete: true, isEmailVerified: true } }))})` });
  await reload();
  await evaluate('Promise.race([document.fonts.ready.then(() => true), new Promise(resolve => setTimeout(resolve, 4000))])');
  assert.equal(await evaluate('document.querySelectorAll(".card").length'), 10, JSON.stringify({ requests, text: await evaluate('document.body.innerText') }));
  await click('.show-more');
  assert.equal(await evaluate('document.querySelectorAll(".card").length'), 13);
  assert.equal(await evaluate('!!document.querySelector("a[href*=full-service], a[href*=expired-service], a[href*=closed-job]")'), false);
  assert.equal(await evaluate('document.querySelector(".btn-apply[disabled]").textContent'), 'รอผู้รับจ้างตอบรับ');
  assert.equal(await evaluate(`!!document.querySelector('a[href="/hirer/hire/own-service"]')`), false);
  assert.equal(await evaluate(`!!document.querySelector('a[href="/hirer/service-posts/own-service"], a[href="/hirer/jobs/own-job"]')`), false);
  assert.equal(await evaluate('document.querySelector(".post-job").getAttribute("href")'), '/hirer/post-job');
  assert.equal(await evaluate('document.querySelector(".request-history-link").getAttribute("href")'), '/hirer/my-jobs?view=services');
  assert.equal(await evaluate(`document.querySelector('a[href="/hirer/hire/service-1"]').textContent`), 'รับบริการ');
  assert.equal(await evaluate(`document.querySelector('a[href="/hirer/jobs/job-1"]').textContent`), 'รายละเอียด');

  // Real keyboard events: skip link, focus ring, toggling the filter with Enter.
  await reload();
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  assert.equal(await evaluate('document.activeElement.className'), 'skip-link');
  await evaluate('document.querySelector(".filter-btn").focus()');
  assert.equal(await evaluate('getComputedStyle(document.activeElement).outlineStyle'), 'solid');
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r' });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await delay(100);
  assert.equal(await evaluate('document.querySelector(".filter-btn").getAttribute("aria-expanded")'), 'false');
  await click('.filter-btn');
  await click('.categories button:nth-child(3)');
  await until('document.querySelectorAll(".card").length === 1');
  assert.equal(await evaluate('document.querySelector(".categories button:nth-child(3)").getAttribute("aria-pressed")'), 'true');
  await click('.reset-btn');
  await until('document.querySelectorAll(".card").length === 10');
  await evaluate(`const input = document.querySelector('#hirer-search'); input.value = 'ไม่มีบริการคำนี้'; input.dispatchEvent(new Event('input', {bubbles:true}));`);
  await until('document.querySelector(".empty-state h3")?.textContent.includes("ไม่พบ")');
  await click('.empty-state button');
  await until('document.querySelectorAll(".card").length === 10');

  const layout = [];
  for (const width of [320, 375, 390, 768, 1024, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 950, deviceScaleFactor: 1, mobile: false });
    await evaluate('window.scrollTo(0,0)');
    const result = await evaluate(`({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, columns: getComputedStyle(document.querySelector('.feed-list')).gridTemplateColumns.split(' ').length, smallTargets: [...document.querySelectorAll('main a, main button, header a, header button')].filter(el => el.getClientRects().length && el.getBoundingClientRect().height < 43).map(el => el.textContent.trim()) })`);
    assert(result.scrollWidth <= width, `Horizontal overflow at ${width}: ${result.scrollWidth}`);
    assert.deepEqual(result.smallTargets, [], `Touch targets at ${width}`);
    layout.push(result);
    if ([390, 1440].includes(width)) await screenshot(`hirer-${width}.png`);
  }
  // Reflow under increased browser text size.
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 950, deviceScaleFactor: 1, mobile: false });
  await evaluate('document.documentElement.style.fontSize = "200%"');
  assert(await evaluate('document.documentElement.scrollWidth <= innerWidth'), '200% text must reflow');
  await evaluate('document.documentElement.style.fontSize = ""');

  mode = 'error';
  await reload();
  assert(await evaluate('!!document.querySelector(".error-state[role=alert]")'));
  mode = 'populated';
  await click('.error-state button');
  await until('document.querySelectorAll(".card").length === 10');
  mode = 'empty';
  await reload();
  assert.equal(await evaluate('document.querySelector(".empty-state h3").textContent'), 'ยังไม่มีประกาศในตอนนี้');
  await screenshot('hirer-empty-390.png');

  mode = 'loading';
  let releaseLoading;
  loadingGate = new Promise(resolve => { releaseLoading = resolve; });
  await send('Page.navigate', { url: `${base}/hirer` });
  await until('!!document.querySelector(".loading-state")');
  assert.equal(await evaluate('document.querySelector(".feed-list").getAttribute("aria-busy")'), 'true');
  mode = 'populated';
  releaseLoading();
  await until('document.querySelectorAll(".card").length === 10');

  // Calculate contrast from colors actually used in the rendered page.
  const contrast = await evaluate(`(() => {
    const rgb = c => c.match(/[\\d.]+/g).slice(0,3).map(Number);
    const lum = c => rgb(c).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4 }).reduce((s,v,i) => s + v * [.2126,.7152,.0722][i],0);
    return ['.post-job', '.start-card p', '.eyebrow', '.categories button.active', '.tabs button.active', '.history-copy span', '.request-count', '.search-help', '.desc', '.time', '.type-badge.service', '.btn-apply:disabled', '.btn-details', '.post-meta dt', '.price strong', '.filter-btn'].map(selector => {
      const el = document.querySelector(selector), style = getComputedStyle(el);
      let parent = el, bg = style.backgroundColor;
      while(bg === 'rgba(0, 0, 0, 0)' && parent.parentElement) { parent = parent.parentElement; bg = getComputedStyle(parent).backgroundColor; }
      const a = lum(style.color), b = lum(bg);
      return {selector, foreground:style.color, background:bg, ratio: +( (Math.max(a,b)+.05)/(Math.min(a,b)+.05)).toFixed(2)};
    });
  })()`);
  for (const pair of contrast) assert(pair.ratio >= 4.5, `Contrast ${pair.selector}: ${pair.ratio}`);
  assert.deepEqual(errors, []);
  writeFileSync(path.join(output, 'checks.json'), JSON.stringify({ fixtureData: true, layout, contrast, checks: ['feed pagination and visibility guards', 'pending and own-service actions', 'job, service, post-job and request-history links', 'keyboard focus and Enter activation', 'category filter, search and reset', '200% text reflow', 'loading, error retry and empty state'], errors }, null, 2));
  console.log('PASS: responsive layouts, keyboard focus, filters, routes, states and contrast. Evidence: docs/ui-review/');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  socket?.close();
  if (browser && browser.exitCode === null) {
    const exited = new Promise(resolve => browser.once('exit', resolve));
    browser.kill();
    await Promise.race([exited, delay(3000)]);
  }
  // Only remove the isolated Chrome profile created in the OS temporary directory.
  if (path.dirname(profile) === tmpdir() && path.basename(profile).startsWith('jangdi-hirer-ui-')) {
    try { rmSync(profile, { recursive: true, force: true }); } catch {}
  }
});
