// Isolated fixture session: no real notification reads or account changes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { launchBrowser } = require('./ui-browser.cjs');
const { fixture: baseFixture, user, setContext } = require('./check-all-pages-ui.cjs');
const { auditAccessibility } = require('./ui-accessibility.cjs');
const output = path.resolve('docs/ui-review/notifications');
const makeItems = (count = 7) => Array.from({ length: count }, (_, index) => ({
  _id: `notification-${index}`, title: index === 0 ? 'มีการอัปเดตการชำระเงิน' : `มีความเคลื่อนไหวเกี่ยวกับงาน ${index + 1}`,
  message: 'งานทำความสะอาดห้องพัก · กดเพื่อดูรายละเอียดและสถานะล่าสุด',
  relatedEntityType: 'Job', relatedEntityId: 'job-1', type: index === 0 ? 'payment_update' : 'job_update',
  createdAt: new Date(Date.now() - index * 3600000).toISOString(), read: count === 7 && index >= 3,
}));
let items = makeItems(), failLoad = false, failReadAll = false, failRead = false;
let roleForJob = 'hirer';
let browser;
(async () => {
  fs.mkdirSync(output, { recursive: true });
  browser = await launchBrowser(async (endpoint, url, request) => {
    if (endpoint === '/notifications' && request.method === 'GET') {
      if (failLoad) return { status: 503, body: { message: 'ไม่สามารถเชื่อมต่อได้ กรุณาลองอีกครั้ง' } };
      return { body: url.searchParams.get('unreadOnly') === 'true' ? items.filter(item => !item.read) : items };
    }
    if (endpoint === '/notifications/read-all' && request.method === 'PATCH') {
      if (failReadAll) return { status: 503, body: { message: 'ลองอีกครั้ง' } };
      items = items.map(item => ({ ...item, read: true }));
      return { body: {} };
    }
    if (/^\/notifications\/[^/]+\/read$/.test(endpoint) && request.method === 'PATCH') {
      if (failRead) return { status: 503, body: {} };
      const id = endpoint.split('/')[2];
      items = items.map(item => item._id === id ? { ...item, read: true } : item);
      return { body: {} };
    }
    const result = await baseFixture(endpoint, url, request);
    if (endpoint === '/jobs/job-1' && roleForJob === 'worker') return { body: { ...result.body, status: 'in_progress', hirer: { ...user, _id: 'other-hirer' }, selectedWorker: user } };
    return result;
  });
  const { send, evaluate, until, delay } = browser;
  const checks = [];
  async function navigate(role = 'hirer', route = role === 'worker' ? '/worker/feed' : '/hirer') {
    roleForJob = role;
    setContext(role, route);
    await browser.navigate(route, { token: 'local-fixture-only', user: { ...user, currentRole: role } });
    await until('!document.querySelector(".feed-list[aria-busy=true]")');
  }
  async function click(selector) {
    await evaluate(`{const el=document.querySelector(${JSON.stringify(selector)});el.focus();el.click();}`);
    await delay(120);
  }
  async function key(key, shift = false) {
    const code = key === 'Escape' ? 27 : key === 'Tab' ? 9 : 13;
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key, windowsVirtualKeyCode: code, modifiers: shift ? 8 : 0 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode: code, modifiers: shift ? 8 : 0 });
    await delay(80);
  }
  async function open() {
    await click('.notification-button');
    await until('!!document.querySelector("#notification-preview") && !document.querySelector("#notification-preview [aria-busy=true]")');
    await delay(250);
  }
  async function audit(name, width) {
    assert(await evaluate('document.documentElement.scrollWidth <= innerWidth'), `${name}: no horizontal overflow`);
    const rect = await evaluate(`{const r=document.querySelector('#notification-preview').getBoundingClientRect();({top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:innerWidth,height:innerHeight})}`);
    assert(rect.left >= -1 && rect.right <= rect.width + 1 && rect.top >= -1 && rect.bottom <= rect.height + 1, `${name}: panel stays in viewport`);
    assert.deepEqual(await evaluate(`(${auditAccessibility.toString()})()`), { contrast: [], unnamed: [], smallTargets: [] });
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(output, `${name}-${width}.png`), Buffer.from(shot.data, 'base64'));
    checks.push(name);
  }

  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 960, deviceScaleFactor: 1, mobile: false });
  await navigate();
  const initialPath = await evaluate('location.pathname');
  const writesBefore = browser.mutations.length;
  await open();
  assert.equal(await evaluate('location.pathname'), initialPath);
  assert.equal(browser.mutations.length, writesBefore, 'Opening never marks anything read');
  assert.equal(await evaluate('document.querySelectorAll("#notification-preview .notification-card").length'), 5);
  assert.equal(await evaluate('document.querySelector("#notification-preview").getAttribute("aria-modal")'), null);
  assert.equal(await evaluate('document.querySelector(".app-shell").inert'), false);
  assert.equal(await evaluate('document.querySelector("#notification-preview strong").textContent'), items[0].title);
  await audit('desktop-popover', 1440);
  await key('Escape');
  await until('!document.querySelector("#notification-preview")');
  assert.equal(await evaluate('document.activeElement.className'), 'notification-button');
  await open();
  await evaluate('document.querySelector("input[type=search]").focus()');
  await until('!document.querySelector("#notification-preview")');
  assert.equal(await evaluate('document.activeElement.type'), 'search');
  checks.push('desktop Escape, focus return and focus-out dismissal');

  await open();
  await click('#notification-preview .notification-card');
  await until('location.pathname.endsWith("/mock-payment")');
  assert.equal(items[0].read, true);
  assert.equal(browser.mutations.filter(item => item.path === '/api/notifications/notification-0/read').length, 1);
  checks.push('hirer notification opens existing payment route and marks only the selected item');
  await navigate(); await open();
  failReadAll = true;
  await click('.preview-toolbar button');
  await until('!!document.querySelector(".action-error")');
  assert.equal(items.filter(item => !item.read).length, 2);
  failReadAll = false;
  await click('.preview-toolbar button');
  await until('!document.querySelector(".notification-badge")');
  assert.equal(await evaluate('document.querySelector(".preview-toolbar button").disabled'), true);
  checks.push('read-all failure recovery, success and shared unread badge');
  await key('Escape');

  items = makeItems();
  for (const width of [320, 390, 768]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 960, deviceScaleFactor: 1, mobile: false });
    await navigate(); await open();
    const modal = width <= 640;
    assert.equal(await evaluate('document.querySelector("#notification-preview").getAttribute("aria-modal")'), modal ? 'true' : null);
    assert.equal(await evaluate('document.querySelector(".app-shell").inert'), modal);
    if (modal) {
      assert.equal(await evaluate('document.body.style.overflow'), 'hidden');
      await key('Tab');
      assert.equal(await evaluate('document.activeElement.className'), 'preview-close');
      await key('Tab', true);
      assert.equal(await evaluate('document.activeElement.getAttribute("href")'), '/notifications');
      await key('Tab');
      assert.equal(await evaluate('document.activeElement.className'), 'preview-close');
    }
    await audit(modal ? 'mobile-sheet' : 'tablet-popover', width);
    await key('Escape');await until('!document.querySelector("#notification-preview")');
    assert.equal(await evaluate('document.querySelector(".app-shell").inert'), false);
    assert.equal(await evaluate('document.body.style.overflow'), '');
    assert.equal(await evaluate('document.activeElement.className'), 'notification-button');
  }
  checks.push('mobile focus trap, Escape, scroll unlock and focus return');

  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 960, deviceScaleFactor: 1, mobile: false });
  await navigate();await open();
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 960, deviceScaleFactor: 1, mobile: false });
  await until('document.querySelector("#notification-preview")?.getAttribute("aria-modal") === "true" && document.querySelector(".app-shell").inert');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 960, deviceScaleFactor: 1, mobile: false });
  await until('document.querySelector("#notification-preview")?.getAttribute("aria-modal") === null && !document.querySelector(".app-shell").inert');
  assert.equal(await evaluate('document.body.style.overflow'), '');
  await key('Escape');
  checks.push('open panel switches between desktop and mobile without leaving background locked');

  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 960, deviceScaleFactor: 1, mobile: false });
  await navigate(); await open();
  await click('.preview-footer a');
  await until('location.pathname === "/notifications" && document.querySelectorAll(".notification-card").length === 7');
  assert.equal(await evaluate('document.querySelector(".app-shell").inert'), false);
  await click('.notification-filters button:nth-child(2)');
  assert.equal(await evaluate('document.querySelectorAll(".notification-card").length'), 3);
  await click('.mark-all-button');
  await until('document.body.textContent.includes("อ่านครบแล้ว")');
  await click('.notification-filters button');
  assert.equal(await evaluate('document.querySelectorAll(".notification-card").length'), 7);
  checks.push('view all, unread filter and read-all share the same state');

  items = [];
  await navigate();await open();
  assert(await evaluate('document.querySelector("#notification-preview").textContent.includes("ยังไม่มีการแจ้งเตือน")'));
  await audit('empty-sheet', 390);
  await key('Escape');
  items = makeItems();failLoad = true;
  await navigate();await open();
  assert(await evaluate('!!document.querySelector("#notification-preview [role=alert]")'));
  failLoad = false;
  await click('#notification-preview .retry-button');
  await until('document.querySelectorAll("#notification-preview .notification-card").length === 5');
  checks.push('empty state, failed load and retry');
  await key('Escape');

  await navigate('worker');await open();
  await click('#notification-preview .notification-card');
  await until('location.pathname === "/worker/jobs/job-1/tracking"');
  await until(`document.querySelector('.app-shell').__vueParentComponent.appContext.config.globalProperties.$pinia._s.get('notifications').items.find(item => item._id === 'notification-0')?.read === true`);
  assert.equal(items[0].read, true, 'Selected worker notification has finished marking read');
  checks.push('worker notification opens the existing tracking route');
  items = makeItems(120);
  await navigate();await open();
  assert.equal(await evaluate('document.querySelector(".notification-badge").textContent'), '99+');
  assert(await evaluate('document.querySelector(".notification-button").getAttribute("aria-label").includes("120")'));
  checks.push('99+ badge retains the accessible unread count');
  await key('Escape');

  await evaluate(`document.querySelector('.app-shell').__vueParentComponent.appContext.config.globalProperties.$pinia._s.get('notifications').receive({_id:'socket-message',title:'มีผู้สมัครใหม่',message:'มีคนสนใจงานของคุณ',createdAt:new Date().toISOString()})`);
  assert.equal(await evaluate('!!document.querySelector("#notification-preview")'), false);
  assert(await evaluate('document.querySelector(".notification-button").getAttribute("aria-label").includes("121")'));
  checks.push('incoming socket notification updates unread count without opening the panel');
  await open();
  await evaluate(`document.querySelector('.app-shell').__vueParentComponent.appContext.config.globalProperties.$pinia._s.get('notifications').receive({_id:'socket-message-open',title:'มีคำขอใหม่ล่าสุด',createdAt:new Date(Date.now()+1000).toISOString()})`);
  await until('document.querySelector("#notification-preview .notification-heading strong")?.textContent === "มีคำขอใหม่ล่าสุด"');
  checks.push('incoming socket notification appears in an already open preview');
  await key('Escape');

  items = makeItems(32);
  for (const role of ['worker', 'hirer']) {
    for (const width of [320, 390, 1440]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 960, deviceScaleFactor: 1, mobile: false });
      await navigate(role);
      await until('document.querySelector(".notification-badge")?.textContent === "32"');
      const bell = await evaluate(`(() => {
        const button = document.querySelector('.notification-button');
        const badge = button.querySelector('.notification-badge');
        const svg = button.querySelector('svg');
        const b = button.getBoundingClientRect(), n = badge.getBoundingClientRect();
        const icon = svg.getBoundingClientRect(), header = button.closest('header').getBoundingClientRect();
        return { tag: button.tagName, fill: getComputedStyle(svg).fill,
          iconWidth: icon.width, iconHeight: icon.height,
          badgePosition: getComputedStyle(badge).position,
          contained: n.top >= header.top && n.bottom <= header.bottom && n.left >= b.left && n.right <= b.right + 6,
          underlined: getComputedStyle(badge).textDecorationLine.includes('underline') };
      })()`);
      assert.deepEqual(bell, { tag: 'BUTTON', fill: 'none', iconWidth: 22, iconHeight: 22, badgePosition: 'absolute', contained: true, underlined: false });
      const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      fs.writeFileSync(path.join(output, `${role}-feed-count32-${width}.png`), Buffer.from(shot.data, 'base64'));
      await open();
      await key('Escape');
    }
    checks.push(`${role} feed count32: outlined bell, attached badge and opening at 320/390/1440px`);
  }

  assert.deepEqual(browser.errors, []);assert.deepEqual(browser.unknown, []);
  assert(browser.mutations.every(item => item.method === 'PATCH' && item.path.startsWith('/api/notifications/')));
  fs.writeFileSync(path.join(output, 'checks.json'), JSON.stringify({ fixtureData: true, checks, errors: browser.errors, requests: browser.mutations }, null, 2));
  console.log(`PASS: ${checks.length} notification UI checks with isolated fixture API responses.`);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => browser?.close());
