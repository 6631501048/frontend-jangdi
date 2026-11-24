// Shared by the bell preview and the full notification history.
export function notificationEntityId(value) {
  const id = value && typeof value === 'object' ? value._id || value.id : value;
  return typeof id === 'string' || typeof id === 'number' ? String(id) : null;
}

export function notificationRequiredRole(item, { job, account } = {}) {
  const accountId = notificationEntityId(account);
  if (job && accountId) {
    if (notificationEntityId(job.hirer) === accountId) return 'hirer';
    if (notificationEntityId(job.selectedWorker) === accountId) return 'worker';
  }
  if (['ServicePost', 'ServiceRequest', 'Payment'].includes(item.relatedEntityType)) return 'worker';
  if (item.relatedEntityType === 'ServiceRequestResult' || ['job_approved', 'job_rejected'].includes(item.type)) return 'hirer';
  if (item.type === 'new_nearby_job') return 'worker';
  if (item.relatedEntityType === 'Sos' && !account?.isAdmin) return 'worker';
  return null;
}

export function notificationDestination(item, role, { job, account } = {}) {
  const id = notificationEntityId(item.relatedEntityId);
  if (item.relatedEntityType === 'ServicePost' && id) return { name: 'worker-my-service-management', params: { id } };
  // Legacy demo notifications carry a Payment ID rather than a Job ID.
  if (item.relatedEntityType === 'Payment') return { name: 'worker-payment-transactions' };
  if (item.relatedEntityType === 'Sos') return { name: account?.isAdmin ? 'admin-sos' : 'worker-my-jobs' };
  if (item.relatedEntityType === 'ServiceRequestResult') return { path: '/hirer/my-jobs', query: { view: 'services' } };
  if (item.relatedEntityType === 'ServiceRequest' && id) return role === 'worker'
    ? { name: 'worker-service-request-detail', params: { id } }
    : { path: '/hirer/my-jobs', query: { view: 'services' } };
  if (item.relatedEntityType === 'Job' && id) {
    if (role === 'worker' && (item.type === 'new_nearby_job' || (job && notificationEntityId(job.selectedWorker) !== notificationEntityId(account)))) {
      return { name: 'worker-job-detail', params: { id } };
    }
    if (role === 'hirer' && item.type === 'payment_update') return { name: 'hirer-mock-payment', params: { id } };
    return { name: role === 'worker' ? 'worker-job-tracking' : 'hirer-job-detail', params: { id } };
  }
  if (item.to && typeof item.to === 'object') return item.to;
  const internal = value => typeof value === 'string' && value.startsWith('/') && !value.startsWith('//');
  if (internal(item.url)) return item.url;
  const path = item.data?.url || item.data?.path;
  return internal(path) ? path : null;
}

export function latestNotifications(items, limit = 5) {
  const timestamp = item => new Date(item.createdAt || 0).getTime() || 0;
  return [...items].sort((a, b) => timestamp(b) - timestamp(a)).slice(0, limit);
}
