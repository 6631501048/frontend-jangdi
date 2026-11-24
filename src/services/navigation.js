export function homePath(user) {
  if (!user) return '/login';
  return user.isAdmin ? '/admin/dashboard' : user.currentRole === 'worker' ? '/worker/feed' : '/hirer';
}
export function fallbackPath(route, user) {
  const path = route.path || '';
  const job = path.match(/^\/hirer\/my-jobs\/([^/]+)(?:\/(.*))?$/);
  if (job) {
    if (job[2]?.includes('/confirm')) return `/hirer/my-jobs/${job[1]}/applicants`;
    return job[2] ? `/hirer/my-jobs/${job[1]}` : '/hirer/my-jobs';
  }
  if (path === '/hirer/payment/transactions') return '/hirer/payment';
  if (path.startsWith('/hirer/')) return '/hirer';
  const workerJob = path.match(/^\/worker\/jobs\/([^/]+)(?:\/(.*))?$/);
  if (workerJob) return workerJob[2] === 'review' ? `/worker/jobs/${workerJob[1]}/tracking` : '/worker/jobs';
  if (path === '/worker/payment/transactions') return '/worker/payment';
  if (/^\/worker\/(my-services|service-requests)\//.test(path) || path === '/worker/service-posts/new') return '/worker/jobs?view=services';
  if (path.startsWith('/worker/')) return '/worker/feed';
  if (path.startsWith('/profile/')) return user?.isAdmin ? '/admin/profile' : '/profile';
  if (path.startsWith('/admin/')) return '/admin/dashboard';
  return homePath(user);
}
export function safePreviousPath(previous, route, user) {
  if (typeof previous !== 'string' || !previous.startsWith('/') || previous.startsWith('//') || previous.includes('\\')) return false;
  const path = previous.split(/[?#]/)[0];
  if (path === route.path || !/^\/(hirer|worker|admin|profile|notifications|users|feedback)(\/|$)/.test(path)) return false;
  if (user?.isAdmin && /^\/(hirer|worker)(\/|$)/.test(path)) return false;
  if (!user?.isAdmin && path.startsWith('/admin')) return false;
  if (user?.currentRole === 'worker' && path.startsWith('/hirer')) return false;
  if (user?.currentRole !== 'worker' && path.startsWith('/worker')) return false;
  // Completed actions and external checkout are not useful back destinations.
  return !/\/(post-job|new|confirm|confirmed|mock-payment)(\/|$)/.test(path);
}
export function navigateBack(router, route, user, fallback, preferFallback = false) {
  const destination = fallback || fallbackPath(route, user);
  const previous = router.options?.history?.state?.back;
  if ((!preferFallback || previous === destination) && safePreviousPath(previous, route, user)) return router.back();
  return router.replace(destination);
}
// A Stripe return may open a fresh tab or follow an external history entry.
// Seed one local parent before initial routing so browser Back has an app destination.
export function preparePaymentReturnHistory(history) {
  const current = history.location;
  const url = new URL(current, 'https://jangdi.invalid');
  const match = url.pathname.match(/^\/hirer\/my-jobs\/([^/]+)\/mock-payment$/);
  if (!match || !['success','cancelled'].includes(url.searchParams.get('checkout'))) return false;
  const parent = `/hirer/my-jobs/${match[1]}`;
  if (safePreviousPath(history.state?.back, {path:url.pathname}, {currentRole:'hirer'})) return false;
  history.replace(parent);
  history.push(current);
  return true;
}
export function navigationScroll(to, from, savedPosition) {
  if (savedPosition) return savedPosition;
  if (to.path === from.path) return false;
  return {left:0,top:0};
}
// Return to the intended app page after re-authentication, with role boundaries intact.
export function loginDestination(user, requested) {
  if (!user?.isAdmin && !user?.isProfileComplete) return '/register';
  if (typeof requested !== 'string' || !requested.startsWith('/') || requested.startsWith('//') || requested.includes('\\')) return homePath(user);
  const path=requested.split(/[?#]/)[0];
  const allowed=user?.isAdmin ? /^\/admin(?:\/|$)/ : user?.currentRole==='worker' ? /^\/(worker|profile|notifications|users|feedback)(?:\/|$)/ : /^\/(hirer|profile|notifications|users|feedback)(?:\/|$)/;
  return allowed.test(path) ? requested : homePath(user);
}
