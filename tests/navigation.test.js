import test from 'node:test';
import assert from 'node:assert/strict';
import {loginDestination,fallbackPath,safePreviousPath,navigateBack,preparePaymentReturnHistory,navigationScroll} from '../src/services/navigation.js';
const user={currentRole:'hirer'};
test('direct-linked pages have parents for each role, job, review and service request',()=>{
 for(const [path,parent,account]of [
  ['/hirer/my-jobs/j/mock-payment','/hirer/my-jobs/j',user],['/hirer/my-jobs/j/applicants/w/confirm','/hirer/my-jobs/j/applicants',user],
  ['/hirer/my-jobs/j','/hirer/my-jobs',user],['/hirer/payment/transactions','/hirer/payment',user],
  ['/worker/jobs/j/review','/worker/jobs/j/tracking',{currentRole:'worker'}],['/worker/service-requests/r','/worker/jobs?view=services',{currentRole:'worker'}],
  ['/profile/ratings','/profile',user],['/notifications','/admin/dashboard',{isAdmin:true}],['/worker/jobs','/worker/feed',{currentRole:'worker'}]
 ])assert.equal(fallbackPath({path},account),parent,path);
});
test('back targets reject external sites, other roles, same page and completed forms',()=>{
 const route={path:'/hirer/my-jobs/j/mock-payment'};
 for(const previous of [null,'https://checkout.stripe.com/x','//evil.test/x','/\\evil.test','/login','/worker/jobs','/admin/users',route.path,'/hirer/post-job','/hirer/my-jobs/j/applicants/w/confirm'])assert.equal(safePreviousPath(previous,route,user),false,String(previous));
 assert.equal(safePreviousPath('/hirer/my-jobs?status=assigned',route,user),true);
});
test('back uses internal history once, otherwise replaces with a safe parent',()=>{
 const calls=[];const router={options:{history:{state:{back:null}}},back(){calls.push('back')},replace(to){calls.push(to)}};
 navigateBack(router,{path:'/hirer/my-jobs/j/mock-payment'},user);assert.deepEqual(calls,['/hirer/my-jobs/j']);
 router.options.history.state.back='/hirer/my-jobs?status=assigned';navigateBack(router,{path:'/hirer/jobs/j'},user);assert.equal(calls.at(-1),'back');
 navigateBack(router,{path:'/hirer/my-jobs/j/mock-payment'},user,'/hirer/my-jobs/j',true);assert.equal(calls.at(-1),'/hirer/my-jobs/j');
 router.options.history.state.back='/hirer/my-jobs/j';navigateBack(router,{path:'/hirer/my-jobs/j/mock-payment'},user,'/hirer/my-jobs/j',true);assert.equal(calls.at(-1),'back');
});
test('a fresh success or cancel Stripe return seeds a local parent without marking payment paid',()=>{
 for(const result of ['success','cancelled']){
  const location='/hirer/my-jobs/j/mock-payment?checkout='+result;const calls=[];
  const history={location,state:{back:null},replace:p=>calls.push(['replace',p]),push:p=>calls.push(['push',p])};
  assert.equal(preparePaymentReturnHistory(history),true);assert.deepEqual(calls,[['replace','/hirer/my-jobs/j'],['push',location]]);
 }
});
test('ordinary routes, refreshes and returns with a valid parent do not add artificial history',()=>{
 for(const [location,back]of [['/hirer/my-jobs/j/mock-payment',null],['/hirer?checkout=success',null],['/hirer/my-jobs/j/mock-payment?checkout=success','/hirer/my-jobs/j']]){
  const history={location,state:{back},replace(){throw Error('Unexpected replace')},push(){throw Error('Unexpected push')}};assert.equal(preparePaymentReturnHistory(history),false);
 }
});
test('browser back restores scroll while query-only form steps keep their own scroll behavior',()=>{
 const saved={left:0,top:500};assert.equal(navigationScroll({path:'/hirer'},{path:'/profile'},saved),saved);
 assert.equal(navigationScroll({path:'/hirer/post-job'},{path:'/hirer/post-job'},null),false);
 assert.deepEqual(navigationScroll({path:'/profile'},{path:'/hirer'},null),{left:0,top:0});
});

test('sign-in restores a payment deep link but rejects external or other-role redirects',()=>{
 const account={currentRole:'hirer',isProfileComplete:true};
 assert.equal(loginDestination(account,'/hirer/my-jobs/j/mock-payment?checkout=success'),'/hirer/my-jobs/j/mock-payment?checkout=success');
 for(const target of ['https://evil.test','//evil.test','/worker/jobs','/admin/users','/login'])assert.equal(loginDestination(account,target),'/hirer');
 assert.equal(loginDestination({...account,isProfileComplete:false},'/hirer/my-jobs/j/mock-payment'),'/register');
});
