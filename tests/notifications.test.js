import test from 'node:test';
import assert from 'node:assert/strict';
import { createPinia, setActivePinia } from 'pinia';
import { notificationDestination, notificationRequiredRole, latestNotifications } from '../src/services/notificationNavigation.js';
import { useNotificationsStore } from '../src/stores/notifications.js';
import { resetApi, calls } from './helpers/adminApi.js';

test('job notifications use the existing payment and tracking routes for each role', () => {
  const item = { relatedEntityType: 'Job', relatedEntityId: 'job-1', type: 'payment_update' };
  assert.deepEqual(notificationDestination(item, 'hirer'), { name: 'hirer-mock-payment', params: { id: 'job-1' } });
  assert.deepEqual(notificationDestination(item, 'worker'), { name: 'worker-job-tracking', params: { id: 'job-1' } });
  assert.deepEqual(notificationDestination({ ...item, type: 'job_update' }, 'hirer'), { name: 'hirer-job-detail', params: { id: 'job-1' } });
});

test('service notifications preserve request detail and request history destinations', () => {
  const item = { relatedEntityType: 'ServiceRequest', relatedEntityId: 'request-1' };
  const history = { path: '/hirer/my-jobs', query: { view: 'services' } };
  assert.deepEqual(notificationDestination(item, 'worker'), { name: 'worker-service-request-detail', params: { id: 'request-1' } });
  assert.deepEqual(notificationDestination(item, 'hirer'), history);
  assert.deepEqual(notificationDestination({ relatedEntityType: 'ServiceRequestResult' }, 'hirer'), history);
});

test('notification URL fallbacks only accept paths inside the app', () => {
  assert.equal(notificationDestination({ url: '/profile/history' }, 'hirer'), '/profile/history');
  assert.equal(notificationDestination({ data: { path: '/notifications' } }, 'hirer'), '/notifications');
  for (const url of ['https://example.com', '//example.com', 'javascript:alert(1)']) {
    assert.equal(notificationDestination({ url }, 'hirer'), null);
  }
});

test('bell preview selects the newest five without modifying store order', () => {
  const items = Array.from({ length: 8 }, (_, index) => ({ _id: String(index), createdAt: new Date(2026, 10, 24, index).toISOString() }));
  const snapshot = items.map(item => item._id);
  assert.deepEqual(latestNotifications(items).map(item => item._id), ['7', '6', '5', '4', '3']);
  assert.deepEqual(items.map(item => item._id), snapshot);
});

test('refreshing the notification preview makes no read requests', async () => {
  setActivePinia(createPinia());
  const item = { _id: 'notification-1', title: 'มีผู้สมัครใหม่', read: false };
  resetApi({ get: async () => ({ data: [item] }) });
  const store = useNotificationsStore();
  await store.refresh();
  assert.equal(store.unreadCount, 1);
  assert.equal(store.items[0].read, false);
  assert(calls.every(call => call.method === 'get'));
});

test('failed read and read-all requests preserve unread state', async () => {
  setActivePinia(createPinia());
  resetApi({ patch: async () => { throw new Error('offline'); } });
  const store = useNotificationsStore();
  store.receive({ _id: 'notification-1', read: false });
  await assert.rejects(store.markRead(store.items[0]));
  await assert.rejects(store.markAllRead());
  assert.equal(store.unreadCount, 1);
  assert.equal(store.items[0].read, false);
});

test('reading one item updates the shared unread count only once', async () => {
  setActivePinia(createPinia());
  resetApi({ patch: async () => ({ data: {} }) });
  const store = useNotificationsStore();
  store.receive({ _id: 'notification-1' });
  store.receive({ _id: 'notification-2' });
  await store.markRead(store.items.find(item => item._id === 'notification-1'));
  assert.equal(store.unreadCount, 1);
  assert.equal(store.items.find(item => item._id === 'notification-1').isRead, true);
  assert.equal(store.items.find(item => item._id === 'notification-2').isRead, undefined);
});

test('read-all does not clear a new socket notification arriving during the request', async () => {
  setActivePinia(createPinia());
  let finish;
  resetApi({ patch: () => new Promise(resolve => { finish = resolve; }) });
  const store = useNotificationsStore();
  store.receive({ _id: 'older' });
  const pending = store.markAllRead();
  store.receive({ _id: 'newer' });
  finish({ data: {} });
  await pending;
  assert.equal(store.unreadCount, 1);
  assert.equal(store.items.find(item => item._id === 'older').isRead, true);
  assert.equal(store.items.find(item => item._id === 'newer').isRead, undefined);
});

test('worker approval and legacy payment notifications have usable destinations', () => {
  assert.deepEqual(notificationDestination({ relatedEntityType: 'ServicePost', relatedEntityId: 'service-1', type: 'system' }, 'worker'), { name: 'worker-my-service-management', params: { id: 'service-1' } });
  assert.deepEqual(notificationDestination({ relatedEntityType: 'Payment', relatedEntityId: 'payment-1', type: 'payment_update' }, 'worker'), { name: 'worker-payment-transactions' });
});

test('new nearby job notifications open the application detail, not private tracking', () => {
  assert.deepEqual(notificationDestination({ type: 'new_nearby_job', relatedEntityType: 'Job', relatedEntityId: 'job-1' }, 'worker'), { name: 'worker-job-detail', params: { id: 'job-1' } });
});

test('notification targets accept populated entity IDs', () => {
  assert.deepEqual(notificationDestination({ type: 'new_nearby_job', relatedEntityType: 'Job', relatedEntityId: { _id: 'job-1' } }, 'worker'), { name: 'worker-job-detail', params: { id: 'job-1' } });
});

test('a delayed refresh retains socket messages received while fetching', async () => {
  setActivePinia(createPinia());
  const replies = [];
  resetApi({ get: () => new Promise(resolve => replies.push(resolve)) });
  const store = useNotificationsStore();
  const older = { _id: 'older', isRead: false };
  store.receive(older);
  const pending = store.refresh();
  store.receive({ _id: 'newer', isRead: false });
  replies.forEach(resolve => resolve({ data: [older] }));
  await pending;
  assert.deepEqual(new Set(store.items.map(item => item._id)), new Set(['older', 'newer']));
  assert.equal(store.unreadCount, 2);
});

test('a delayed refresh cannot undo a successful read action', async () => {
  setActivePinia(createPinia());
  const replies = [];
  resetApi({ get: () => new Promise(resolve => replies.push(resolve)), patch: async () => ({ data: {} }) });
  const store = useNotificationsStore();
  store.receive({ _id: 'older', isRead: false });
  const pending = store.refresh();
  await store.markRead(store.items[0]);
  replies.forEach(resolve => resolve({ data: [{ _id: 'older', isRead: false }] }));
  await pending;
  assert.equal(store.items[0].isRead, true);
  assert.equal(store.unreadCount, 0);
});

test('notification role follows job ownership and service event recipients', () => {
  const item = { relatedEntityType: 'Job', type: 'application_update', relatedEntityId: 'job-1' };
  assert.equal(notificationRequiredRole(item, { account: { _id: 'me' }, job: { hirer: { _id: 'me' }, selectedWorker: 'other' } }), 'hirer');
  assert.equal(notificationRequiredRole(item, { account: { _id: 'me' }, job: { hirer: 'other', selectedWorker: { _id: 'me' } } }), 'worker');
  assert.equal(notificationRequiredRole({ relatedEntityType: 'ServicePost' }), 'worker');
  assert.equal(notificationRequiredRole({ relatedEntityType: 'ServiceRequestResult' }), 'hirer');
});

test('an applicant is sent to read-only job details rather than another worker tracking page', () => {
  assert.deepEqual(notificationDestination({ relatedEntityType: 'Job', relatedEntityId: 'job-1' }, 'worker', { account: { _id: 'me' }, job: { selectedWorker: 'someone-else' } }), { name: 'worker-job-detail', params: { id: 'job-1' } });
});

test('responses from an old session cannot mark notifications in a new session read', async () => {
  for (const action of ['markRead', 'markAllRead']) {
    setActivePinia(createPinia());
    let finish;
    resetApi({ patch: () => new Promise(resolve => { finish = resolve; }) });
    const store = useNotificationsStore();
    store.receive({ _id: 'old-session' });
    const pending = store[action](store.items[0]);
    store.clear();
    store.receive({ _id: 'new-session' });
    finish({ data: {} });
    await pending;
    assert.equal(store.unreadCount, 1);
    assert.equal(store.items[0]._id, 'new-session');
    assert.equal(store.items[0].isRead, undefined);
  }
});
