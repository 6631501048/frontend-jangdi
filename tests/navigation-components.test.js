import test from 'node:test';
import assert from 'node:assert/strict';
import {defineComponent,h,ref} from 'vue';
import {mount,find,text,fire,flush,input} from './helpers/vueHost.js';
import {route,routerCalls,routerHistory} from './helpers/adminRouter.js';
import {resetApi,calls} from './helpers/adminApi.js';
import AppHeader from '../src/components/AppHeader.vue';
import HirerJobs from '../src/views/hirer/HirerMyJobsView.vue';
import {useWizardSteps} from '../src/composables/useWizardSteps.js';
test.beforeEach(()=>{
 route.path='/hirer/my-jobs/j/mock-payment';route.query={};route.params={id:'j'};routerCalls.length=0;routerHistory.back=null;
 window.setInterval=()=>1;window.clearInterval=()=>{};
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>JSON.stringify({token:'fixture',user:{_id:'viewer',currentRole:'hirer',fullName:'Viewer'}}),setItem(){}}});
});
test('shared header calls a custom back handler exactly once without a second history action',async()=>{
 let count=0;const view=await mount(AppHeader,{title:'Test',onBack:()=>count++});try{fire(find(view.root,'button'),'click');await flush();assert.equal(count,1);assert.deepEqual(routerCalls,[]);}finally{view.unmount();}
});
test('payment header has an exit even in a new tab with no app history',async()=>{
 const view=await mount(AppHeader,{title:'Test',backTo:'/hirer/my-jobs/j'});try{fire(find(view.root,'button'),'click');await flush();assert.deepEqual(routerCalls,[{method:'replace',destination:'/hirer/my-jobs/j'}]);}finally{view.unmount();}
});
const Wizard=defineComponent({setup(){const step=useWizardSteps(3),draft=ref('');return()=>h('div',[h('input',{value:draft.value,onInput:e=>draft.value=e.target.value}),h('button',{onClick:()=>step.value++},'Next'),h('p',`Step ${step.value}: ${draft.value}`)])}});
test('browser back/forward changes wizard steps and retains entered data without pushing a loop',async()=>{
 route.path='/hirer/post-job';const view=await mount(Wizard);
 try{
  await input(find(view.root,'input'),'Retained draft');fire(find(view.root,'button'),'click');await flush();assert.deepEqual(routerCalls.at(-1),{method:'push',destination:{query:{step:'2'}}});
  route.query={step:'2'};await flush();fire(find(view.root,'button'),'click');await flush();route.query={step:'3'};await flush();const count=routerCalls.length;
  route.query={step:'2'};await flush();assert(text(view.root).includes('Step 2: Retained draft'));assert.equal(routerCalls.length,count);
  route.query={step:'3'};await flush();assert(text(view.root).includes('Step 3: Retained draft'));assert.equal(routerCalls.length,count);
 }finally{view.unmount();}
});
test('a direct link to a later wizard step restarts at the first step with no empty confirmation',async()=>{
 route.path='/hirer/post-job';route.query={step:'3'};const view=await mount(Wizard);try{assert(text(view.root).includes('Step 1:'));assert.deepEqual(routerCalls.at(-1),{method:'replace',destination:{query:{}}});}finally{view.unmount();}
});
test('job list loads the URL tab and responds to browser back to a different tab',async()=>{
 route.path='/hirer/my-jobs';route.query={status:'assigned'};
 resetApi({get:async(url,config)=>({data:[{_id:'j',title:config.params.status,status:config.params.status}]})});
 const view=await mount(HirerJobs);
 try{assert.equal(calls[0].args[0].params.status,'assigned');route.query={status:'waiting'};await flush();assert.equal(calls.at(-1).args[0].params.status,'waiting');assert.equal(routerCalls.length,0);}finally{view.unmount();}
});
import {useRoutePage} from '../src/composables/useRoutePage.js';
import AdminJobs from '../src/views/admin/BrowseJobsView.vue';
test('pagination follows history without adding another entry',async()=>{
 route.path='/admin/jobs';route.query={page:'2'};let changes=0;
 const Pager=defineComponent({setup(){const page=useRoutePage(()=>changes++);return()=>h('p',`Page ${page.value}`);}});
 const view=await mount(Pager);try{assert(text(view.root).includes('Page 2'));route.query={};await flush();assert(text(view.root).includes('Page 1'));assert.equal(changes,1);assert.deepEqual(routerCalls,[]);}finally{view.unmount();}
});
test('admin pagination recovers when the requested last page no longer exists',async()=>{
 route.path='/admin/jobs';route.query={page:'3'};
 resetApi({get:async()=>({data:{jobs:[],total:0,totalPages:1}})});
 const view=await mount(AdminJobs);try{await flush();assert.equal(calls[0].args[0].params.page,3);assert.equal(calls[1].args[0].params.page,1);assert(text(view.root).includes('1 / 1'));}finally{view.unmount();}
});
import JobDetail from '../src/views/hirer/HirerMyJobDetailView.vue';
test('a delayed job request keeps its original id when the user navigates away',async()=>{
 route.path='/hirer/my-jobs/j';let finish;
 resetApi({get:async url=>{
  if(url==='/jobs/j')return new Promise(resolve=>{finish=resolve});
  if(url==='/jobs/j/applicants')return {data:[]};
  throw Error('Unexpected request: '+url);
 }});
 const view=await mount(JobDetail);view.unmount();route.params={};route.path='/hirer/my-jobs';
 finish({data:{_id:'j',status:'waiting',price:100}});await flush();
 assert(calls.some(c=>c.url==='/jobs/j/applicants'));assert.equal(calls.some(c=>c.url.includes('undefined')),false);
});
