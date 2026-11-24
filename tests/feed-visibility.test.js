import test from 'node:test';
import assert from 'node:assert/strict';
import { belongsToAccount, matchesFeedSearch } from '../src/services/feedVisibility.js';

test('feed ownership recognizes the same account across both roles and API owner formats', () => {
  for (const account of [{ _id: 'me' }, { id: 'me' }]) {
    for (const owner of ['me', { _id: 'me', fullName: 'เจ้าของประกาศ' }, { id: 'me' }]) {
      assert.equal(belongsToAccount(owner, account), true);
    }
    for (const owner of ['someone-else', { _id: 'someone-else' }, { id: 'someone-else' }]) {
      assert.equal(belongsToAccount(owner, account), false);
    }
  }
});

test('missing owner or account IDs are never mistaken for matching accounts', () => {
  for (const owner of [undefined, null, '', {}, { fullName: 'ไม่มีรหัสบัญชี' }]) {
    assert.equal(belongsToAccount(owner, { _id: 'me' }), false);
    for (const account of [undefined, null, '', {}]) {
      assert.equal(belongsToAccount(owner, account), false);
    }
  }
});

test('feed search finds titles independently of descriptions and treats punctuation literally', () => {
  const post = { title: 'รับส่ง [เอกสาร] ด่วน', name: 'Somchai ใจดี', description: 'นัดหมายเวลาได้' };
  for (const query of ['เอกสาร', '[', ' SOMCHAI ', 'ใจดี', 'นัดหมาย', '']) assert.equal(matchesFeedSearch(post, query), true);
  assert.equal(matchesFeedSearch(post, 'ทำความสะอาด'), false);
  assert.equal(matchesFeedSearch({}, 'งาน'), false);
});
