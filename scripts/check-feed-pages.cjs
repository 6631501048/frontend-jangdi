// Chrome uses an isolated session and intercepts all account requests and writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { launchBrowser } = require('./ui-browser.cjs');
const { fixture: baseFixture, user, setContext } = require('./check-all-pages-ui.cjs');
const { auditAccessibility } = require('./ui-accessibility.cjs');
const out = path.resolve('docs/ui-review/feed-audit');
const now = Date.now();
const job = (id, extra = {}) => ({ _id: id, title: `งาน ${id}`, description: `รายละเอียดประกาศ ${id}`, status: 'waiting', category: 'cleaning', price: 100, hirer: { _id: 'other-hirer', fullName: 'ผู้ว่าจ้างทั่วไป' }, createdAt: new Date(now - 1000).toISOString(), scheduledAt: new Date(now + 86400000).toISOString(), ...extra });
const service = (id, extra = {}) => ({ _id: id, title: `บริการ ${id}`, description: `รายละเอียดบริการ ${id}`, status: 'active', category: 'cleaning', fee: 100, worker: { _id: 'other-worker', fullName: 'ผู้รับจ้างทั่วไป' }, createdAt: new Date(now).toISOString(), availabilityStart: new Date(now).toISOString(), availabilityEnd: new Date(now + 86400000).toISOString(), maxSimultaneousOrders: 2, currentOrderCount: 0, locationLabel: 'สถานที่บริการทดสอบ', serviceRadiusMeters: 0, ...extra });
const initialJobs = () => [job('title-only', { title: 'หัวข้อเฉพาะ [งานหลัก]', hirer: { _id: 'mali', fullName: 'มาลี ใจดี' } }), job('errands', { category: 'errands' }), job('delivery', { category: 'delivery' }), ...Array.from({ length: 13 }, (_, i) => job(`bulk-${i}`)), ...['assigned', 'completed', 'cancelled', 'pending_review', 'rejected'].map(status => job(status, { status })), ...['preview-user', { _id: 'preview-user' }, { id: 'preview-user' }].map((hirer, i) => job(`own-${i}`, { hirer, description: 'ห้ามแสดงงานของฉัน' }))];
const initialServices = () => [service('available'), service('delivery', { category: 'delivery', serviceRadiusMeters: 2000 }), service('full', { currentOrderCount: 2 }), service('expired', { availabilityEnd: new Date(now - 10000).toISOString() }), service('closed', { status: 'closed' }), service('pending', { status: 'pending_review' }), service('own', { worker: 'preview-user' })];
let jobs = initialJobs(), services = initialServices(), fail = false, viewer = user, browser;
const checks = [];
(async () => {
  fs.mkdirSync(out, { recursive: true });
  browser = await launchBrowser(async (endpoint, url, request) => {
    if (request.method !== 'GET') return { status: 405, body: { message: 'Read-only feed audit' } };
    if (endpoint === '/auth/me') return { body: viewer };
    if (endpoint === '/service-posts/requests/my-as-hirer') return { body: [] };
    if (endpoint === '/jobs' || endpoint === '/service-posts') {
      if (fail) return { status: 503, body: { message: 'ทดสอบการเชื่อมต่อขัดข้อง' } };
      const category = url.searchParams.get('category'), search = (url.searchParams.get('search') || '').trim().toLowerCase();
      const source = endpoint === '/jobs' ? jobs : services;
      return { body: source.filter(item => (!category || item.category === category) && (endpoint !== '/jobs' || !search || [item.title, item.description, item.hirer?.fullName].some(value => String(value || '').toLowerCase().includes(search)))) };
    }
    return baseFixture(endpoint, url, request);
  });
  const { evaluate, until, send, delay } = browser;
  async function navigate(role, account = user) {
    const route = role === 'hirer' ? '/hirer' : '/worker/feed';
    viewer = { ...account, currentRole: role }; setContext(role, route);
    await browser.navigate(route, { token: 'isolated-feed-audit', user: viewer });
    await until('document.querySelector(".feed-list")?.getAttribute("aria-busy") === "false"');
  }
  async function search(value) {
    await evaluate(`{const input=document.querySelector('input[type=search]');input.value=${JSON.stringify(value)};input.dispatchEvent(new Event('input',{bubbles:true}));}`);
    await until('document.querySelector(".feed-list")?.getAttribute("aria-busy") === "false"'); await delay(100);
  }
  async function click(selector) { await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`); await delay(150); }
  async function total(count) { await until(`document.querySelector('.feed-heading p')?.textContent === 'พบ ${count} ประกาศ'`); }
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 960, deviceScaleFactor: 1, mobile: false });
  for (const role of ['hirer', 'worker']) {
    jobs = initialJobs(); services = initialServices(); fail = false;
    await navigate(role); await total(18);
    assert.equal(await evaluate('document.querySelectorAll(".feed-list .card").length'), 10);
    await click('.show-more'); assert.equal(await evaluate('document.querySelectorAll(".feed-list .card").length'), 18);
    assert(!await evaluate('document.querySelector(".feed-list").textContent.includes("ห้ามแสดงงานของฉัน")'));
    checks.push(`${role}: valid jobs/services, own and closed/full/expired records hidden, pagination`);
    await search('หัวข้อเฉพาะ'); await total(1);
    const href = await evaluate('document.querySelector(".feed-list .btn-details").getAttribute("href")');
    assert.equal(href, role === 'hirer' ? '/hirer/jobs/title-only' : '/worker/jobs/title-only');
    await search('มาลี'); await total(1);
    await search('['); await total(1);
    await search('ไม่มีประกาศนี้'); await total(0); assert(await evaluate('!!document.querySelector(".empty-state")'));
    await click('.reset-btn'); await total(18);
    await evaluate(`[...document.querySelectorAll('.categories button')].find(button => button.textContent.includes('งานจิปาถะ')).click()`);
    await total(1); await click('.reset-btn'); await total(18);
    await click('.tabs button:nth-child(3)'); await total(2);
    assert(await evaluate('document.querySelector(".feed-list").textContent.includes("สถานที่บริการทดสอบ")'));
    await click('.tabs button:nth-child(2)'); await total(16);
    checks.push(`${role}: title/publisher/literal search, category/tabs, empty/reset, detail links and location`);
    await navigate(role);
    for (const width of [320, 390, 768, 1440]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 960, deviceScaleFactor: 1, mobile: false });
      assert(await evaluate('document.documentElement.scrollWidth <= innerWidth'));
      assert.deepEqual(await evaluate(`(${auditAccessibility.toString()})()`), { contrast: [], unnamed: [], smallTargets: [] });
      const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      fs.writeFileSync(path.join(out, `${role}-${width}.png`), Buffer.from(shot.data, 'base64'));
    }
    checks.push(`${role}: responsive and accessibility at 320/390/768/1440px`);
    fail = true; await navigate(role); assert(await evaluate('!!document.querySelector(".error-state")'));
    fail = false; await click('.error-state button'); await total(18);
    fail = true; await navigate(role); assert(await evaluate('!!document.querySelector(".error-state")'));
    jobs.push(job('latest', { description: 'งานที่เข้ามาใหม่ระหว่างเปิดหน้า', createdAt: new Date(Date.now() + 1000).toISOString() })); fail = false;
    await delay(10500); await total(19);
    assert(await evaluate('document.querySelector(".feed-list").textContent.includes("งานที่เข้ามาใหม่ระหว่างเปิดหน้า")'));
    checks.push(`${role}: failed load/retry and automatic refresh recovers and displays new work`);
  }
  const livePath = path.resolve('.password-recovery/feed-audit/live-snapshot.json');
  if (fs.existsSync(livePath)) {
    const snapshot = JSON.parse(fs.readFileSync(livePath, 'utf8')); jobs = snapshot.jobs; services = snapshot.services;
    const ownerId = jobs[0]?.hirer?._id || jobs[0]?.hirer;
    for (const role of ['hirer', 'worker']) {
      for (const id of ['feed-audit-viewer', ownerId].filter(Boolean)) {
        await navigate(role, { ...user, _id: id });
        const expected = jobs.filter(item => item.status === 'waiting' && String(item.hirer?._id || item.hirer) !== id).length + services.filter(item => item.status === 'active' && new Date(item.availabilityEnd) >= new Date() && Number(item.currentOrderCount || 0) < Number(item.maxSimultaneousOrders ?? Infinity) && String(item.worker?._id || item.worker) !== id).length;
        await total(expected);
      }
      checks.push(`${role}: real public API snapshot renders with account-specific own-post filtering`);
    }
  }
  assert.deepEqual(browser.errors, []); assert.deepEqual(browser.unknown, []); assert.deepEqual(browser.mutations, []);
  fs.writeFileSync(path.join(out, 'checks.json'), JSON.stringify({ fixtureData: true, liveSnapshotUsed: fs.existsSync(livePath), checks, errors: browser.errors, mutations: browser.mutations }, null, 2));
  console.log(`PASS: ${checks.length} feed check groups, including both roles and current public API snapshot.`);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => browser?.close());
