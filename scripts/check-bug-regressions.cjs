const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { launchBrowser } = require('./ui-browser.cjs');
const { fixture: baseFixture, user, setContext } = require('./check-all-pages-ui.cjs');
const output = path.resolve('docs/ui-review/bug-audit');
let scenario = 'notifications', role = 'worker', notification;
let failProfileLoad = false, failLookup = false;
let browser;
const job = (id, status = 'in_progress') => ({ _id: id, title: `รายละเอียดงาน ${id}`, description: 'งานสำหรับตรวจการเปลี่ยนหน้า', status, category: 'cleaning', hirer: { ...user, _id: 'other-hirer' }, selectedWorker: status === 'waiting' ? null : user, price: 350, createdAt: new Date().toISOString() });
const makeNotification = (entity, type, id) => ({ _id: 'audit-notification', title: `ตรวจแจ้งเตือน ${entity}`, message: 'ตรวจ payload แบบเดียวกับ backend', relatedEntityType: entity, relatedEntityId: id, type, isRead: false, createdAt: new Date().toISOString() });

(async () => {
  fs.mkdirSync(output, { recursive: true });
  browser = await launchBrowser(async (endpoint, url, request) => {
    if (endpoint === '/notifications' && request.method === 'GET') return { body: notification && (!url.searchParams.has('unreadOnly') || !notification.isRead) ? [notification] : [] };
    if (endpoint.startsWith('/notifications/') && request.method === 'PATCH') { notification.isRead = true; return { body: {} }; }
    if (endpoint === '/auth/me' && failProfileLoad) return { status: 503, body: { message: 'ทดสอบโหลดโปรไฟล์ไม่สำเร็จ' } };
    if (endpoint === '/users/preview-user' && request.method === 'PATCH') return { status: 400, body: { message: 'ทดสอบบันทึกโปรไฟล์ไม่สำเร็จ' } };
    if (/^\/jobs\/job-[ab]$/.test(endpoint)) {
      if (failLookup) return { status: 503, body: { message: 'ทดสอบโหลดรายละเอียดไม่สำเร็จ' } };
      return { body: job(endpoint.split('/').at(-1), notification?.type === 'new_nearby_job' ? 'waiting' : 'in_progress') };
    }
    if (/^\/jobs\/job-[ab]\/timeline$/.test(endpoint)) return { body: [] };
    if (/^\/jobs\/job-[ab]\/review-status$/.test(endpoint)) return { body: { reviewed: false } };
    if (/^\/payments\/job-[ab]\/mock$/.test(endpoint)) return { body: { id: 'payment-1', status: 'pending', amount: 350, platformFeeAmount: 18, totalDue: 368, paymentMode: 'stripe_test' } };
    if (scenario === 'search' && endpoint === '/jobs') {
      const search = url.searchParams.get('search');
      if (search === 'old') { await new Promise(resolve => setTimeout(resolve, 450)); return { body: [] }; }
      return { body: search === 'new' ? [{ ...job('search-result', 'waiting'), description: 'new result' }] : [] };
    }
    if (scenario === 'search' && endpoint === '/service-posts') return { body: [] };
    return baseFixture(endpoint, url, request);
  });
  const { evaluate, until, delay, send } = browser;
  const results = [];
  async function navigate(nextRole, route) {
    role = nextRole;
    setContext(role, route);
    await browser.navigate(route, { token: 'local-fixture-only', user: { ...user, currentRole: role } });
  }
  async function click(selector) { await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`); await delay(100); }
  async function push(route) { await evaluate(`document.querySelector('.app-shell').__vueParentComponent.appContext.config.globalProperties.$router.push(${JSON.stringify(route)})`); }
  async function screenshot(name) {
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(output, `${name}.png`), Buffer.from(shot.data, 'base64'));
  }
  async function openNotification() {
    await click('.notification-button');
    await until('document.querySelectorAll("#notification-preview .notification-card").length === 1');
    await click('#notification-preview .notification-card');
  }
  for (const [entity, type, id, expected] of [
    ['ServicePost', 'system', 'service-1', '/worker/my-services/service-1'],
    ['Payment', 'payment_update', 'payment-1', '/worker/payment/transactions'],
    ['Job', 'new_nearby_job', 'job-a', '/worker/jobs/job-a'],
    ['Job', 'application_update', 'job-a', '/worker/jobs/job-a/tracking'],
  ]) {
    notification = makeNotification(entity, type, id);
    await navigate('worker', '/worker/feed');
    await openNotification();
    await until(`location.pathname === ${JSON.stringify(expected)}`);
    await until('!document.querySelector("#notification-preview")');
    assert.equal(notification.isRead, true);
    if (type === 'new_nearby_job' || entity === 'ServicePost') await screenshot(entity === 'ServicePost' ? 'worker-service-approval' : 'worker-nearby-job');
    results.push({ check: `worker ${entity}/${type}`, route: expected });
  }
  notification = makeNotification('ServicePost', 'system', 'service-1');
  await navigate('hirer', '/hirer');
  const writes = browser.mutations.length;
  await openNotification();
  await until('!!document.querySelector("#notification-preview .action-error")');
  assert.equal(await evaluate('location.pathname'), '/hirer');
  assert.equal(notification.isRead, false);
  assert.equal(browser.mutations.length, writes);
  assert(await evaluate('document.querySelector(".action-error").textContent.includes("สลับบทบาท")'));
  await screenshot('notification-role-message');
  results.push({ check: 'cross-role notification explains the required role and stays unread' });

  notification = makeNotification('Job', 'new_nearby_job', 'job-a');
  failLookup = true;
  await navigate('worker', '/worker/feed');await openNotification();
  await until('!!document.querySelector("#notification-preview .action-error")');
  assert.equal(notification.isRead, false);
  failLookup = false;
  await click('#notification-preview .notification-card');
  await until('location.pathname === "/worker/jobs/job-a"');
  results.push({ check: 'failed notification detail request stays open, unread and retryable' });

  notification = null;
  await navigate('worker', '/worker/jobs/job-a/tracking');
  await until('document.body.textContent.includes("รายละเอียดงาน job-a")');
  await push('/worker/jobs/job-b/tracking');
  await until('document.body.textContent.includes("รายละเอียดงาน job-b")');
  assert.equal(await evaluate('document.body.textContent.includes("รายละเอียดงาน job-a")'), false);
  results.push({ check: 'same-component detail navigation loads the new job immediately' });

  await navigate('worker', '/worker/jobs');
  await push('/worker/jobs?view=services');
  await until('document.querySelector(".section-tabs button.active")?.textContent === "บริการที่โพสต์"');
  await push('/worker/jobs');
  await until('document.querySelector(".section-tabs button.active")?.textContent === "งานที่สมัคร"');
  results.push({ check: 'worker My Jobs follows query navigation in both directions' });

  scenario = 'search';
  for (const nextRole of ['hirer', 'worker']) {
    await navigate(nextRole, nextRole === 'hirer' ? '/hirer' : '/worker/feed');
    await until('!document.querySelector(".feed-list[aria-busy=true]")');
    for (const term of ['old', 'new']) {
      await evaluate(`{const input=document.querySelector('input[type=search]');input.value=${JSON.stringify(term)};input.dispatchEvent(new Event('input',{bubbles:true}));}`);
      await delay(60);
    }
    await until('document.querySelectorAll(".feed-list .card").length === 1');
    await delay(650);
    assert.equal(await evaluate('document.querySelectorAll(".feed-list .card").length'), 1);
    assert(await evaluate('document.querySelector(".feed-list").textContent.includes("new result")'));
    results.push({ check: `${nextRole} feed ignores late responses from older search terms` });
  }
  scenario = 'profile'; failProfileLoad = true;
  await navigate('hirer', '/profile');
  await until('document.querySelector(".profile-error")?.textContent.includes("ทดสอบโหลดโปรไฟล์ไม่สำเร็จ")');
  assert(await evaluate(`[...document.querySelectorAll('button')].find(button=>button.textContent==='แก้ไขข้อมูลส่วนตัว').disabled`));
  failProfileLoad = false;await click('.profile-error button');
  await until('!document.querySelector(".profile-error") && !document.querySelector(".profile-state[role=status]")');
  await evaluate(`[...document.querySelectorAll('button')].find(button=>button.textContent==='แก้ไขข้อมูลส่วนตัว').click()`);
  await until('!!document.querySelector(".field-grid input")');
  await evaluate(`[...document.querySelectorAll('.card-actions button')].find(button=>button.textContent==='บันทึก').click()`);
  await until('document.querySelector(".profile-error")?.textContent.includes("ทดสอบบันทึกโปรไฟล์ไม่สำเร็จ")');
  assert(await evaluate('!!document.querySelector(".field-grid input")'));
  await screenshot('profile-save-error');
  results.push({ check: 'profile load and save errors are visible; load retries and failed edits stay available' });

  assert.deepEqual(browser.errors, []);
  assert.deepEqual(browser.unknown, []);
  assert(browser.mutations.every(item=>item.path.startsWith('/api/notifications/')||item.path==='/api/users/preview-user'));
  fs.writeFileSync(path.join(output, 'regressions.json'), JSON.stringify({ fixtureData: true, results, errors: browser.errors, requests: browser.mutations }, null, 2));
  console.log(`PASS: ${results.length} reproduced bug scenarios with fixture responses.`);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => browser?.close());
