const assert = require('node:assert/strict');
const { launchBrowser } = require('./ui-browser.cjs');
const { fixture, user, setContext } = require('./check-all-pages-ui.cjs');

let browser;
(async () => {
  async function feedFixture(endpoint, url, request) {
    const response = await fixture(endpoint, url, request);
    if (endpoint === '/jobs' || endpoint === '/service-posts') {
      const field = endpoint === '/jobs' ? 'hirer' : 'worker';
      const base = response.body[0];
      const owners = ['preview-user', { _id: 'preview-user', fullName: 'เจ้าของประกาศ' }, { id: 'preview-user' }];
      return { body: [
        ...owners.map((owner, index) => ({ ...base, _id: `own-${field}-${index}`, [field]: owner, title: 'ประกาศของฉัน', description: 'ประกาศของฉัน' })),
        { ...base, _id: `other-${field}`, [field]: { _id: 'other-account', fullName: user.fullName }, description: `ประกาศจากคนอื่น ${field}` },
      ] };
    }
    return response;
  }
  browser = await launchBrowser(feedFixture);
  const { evaluate, until, delay } = browser;
  for (const role of ['hirer', 'worker']) {
    const feed = role === 'hirer' ? '/hirer' : '/worker/feed';
    setContext(role, feed);
    const session = { token: 'local-fixture-only', user: { ...user, currentRole: role } };
    await browser.navigate(feed, session);
    await until('document.querySelectorAll(".feed-list .card").length === 2');
    assert.equal(await evaluate('document.querySelector(".feed-list").textContent.includes("ประกาศของฉัน")'), false);
    assert.equal(await evaluate('document.querySelector(".feed-heading").textContent.includes("พบ 2 ประกาศ")'), true);
    await evaluate(`{ const input = document.querySelector('input[type=search]'); input.value = 'ประกาศของฉัน'; input.dispatchEvent(new Event('input', { bubbles:true })); }`);
    await until('!!document.querySelector(".empty-state")');
    assert.equal(await evaluate('document.querySelectorAll(".feed-list .card").length'), 0);
    const management = role === 'hirer' ? '/hirer/my-jobs' : '/worker/jobs?view=services';
    setContext(role, management);
    await browser.navigate(management, session);
    if (role === 'worker') {
      await until(`!![...document.querySelectorAll('button')].find(button => button.textContent.includes('รอผู้ขอรับบริการ (1)'))`);
      await evaluate(`[...document.querySelectorAll('button')].find(button => button.textContent.includes('รอผู้ขอรับบริการ (1)')).click()`);
    }
    await delay(200);
    assert(await evaluate(`document.body.textContent.includes(${JSON.stringify(role === 'hirer' ? 'ช่วยทำความสะอาดห้องพักช่วงบ่าย' : 'รับทำความสะอาดห้องพัก')})`), `${role}: own posts must remain in management: ${await evaluate('document.body.innerText')}`);
    console.log(`PASS ${role}: own jobs/services hidden, other accounts visible, own posts retained in management.`);
  }
  assert.deepEqual(browser.errors, []);
  assert.deepEqual(browser.unknown, []);
  assert.deepEqual(browser.mutations, []);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => browser?.close());
