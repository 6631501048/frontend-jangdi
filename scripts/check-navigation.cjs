const fs=require('node:fs'),assert=require('node:assert/strict');
const {launchBrowser}=require('./ui-browser.cjs');
const {fixture:baseFixture,user,setContext}=require('./check-all-pages-ui.cjs');
let browser,role='hirer',checkoutCalls=0,expireSession=false;
const base=process.argv.includes('--shared')?JSON.parse(fs.readFileSync('.password-recovery/share/session.json','utf8')).url:(process.env.HIRER_PREVIEW_URL||'http://localhost:5173');
process.env.HIRER_PREVIEW_URL=base;
const paymentPath='/hirer/my-jobs/job-1/mock-payment';
const checks=[];
const fillStep=`(()=>{for(const el of document.querySelectorAll('.step-body input,.step-body textarea,.step-body select')){if(el.readOnly||el.disabled||el.type==='file')continue;if(el.tagName==='SELECT'){el.value=[...el.options].find(o=>!o.disabled&&o.value)?.value||'';el.dispatchEvent(new Event('change',{bubbles:true}));continue;}el.value=el.type==='datetime-local'?'2027-12-30T10:00':el.type==='date'?'2027-12-30':el.type==='number'?(Number(el.min)>=40?'350':'2'):'ข้อมูลที่กรอกไว้ต้องไม่หาย';el.dispatchEvent(new Event('input',{bubbles:true}));}})()`;
(async()=>{
 browser=await launchBrowser(async(endpoint,url,req)=>{
  if(expireSession&&endpoint==='/jobs/job-1')return {status:401,body:{message:'Fixture session expired'}};
  if(endpoint==='/auth/login'&&req.method==='POST')return {body:{token:'local-navigation-fixture',user:{...user,currentRole:'hirer'}}};
  if(endpoint==='/payments/job-1/checkout'&&req.method==='POST'){checkoutCalls++;return {body:{url:'https://checkout.stripe.com/c/pay/__jangdi_navigation_fixture__'}};}
  if(endpoint==='/payments/job-1/stripe/sync')return {body:{status:'pending'}};
  if(endpoint==='/payments/stripe/status')return {body:{ready:true}};
  if(endpoint==='/payments/job-1/mock')return {body:{id:'payment-1',status:'pending',paymentMode:'stripe_test',amount:350,totalDue:374.5,platformFeeAmount:24.5,hasStripeSession:true}};
  if(['/admin/jobs','/admin/service-posts'].includes(endpoint)){const response=await baseFixture(endpoint,url,req);return {...response,body:{...response.body,total:45,totalPages:3}};}
  if(['/jobs/my','/jobs/my-as-worker'].includes(endpoint)){const response=await baseFixture(endpoint,url,req);return {...response,body:response.body.map(job=>({...job,status:url.searchParams.get('status')||job.status,backendStatus:url.searchParams.get('status')||job.status}))};}
  return baseFixture(endpoint,url,req);
 },async url=>{
  if(url.hostname==='checkout.stripe.com'&&url.pathname==='/c/pay/__jangdi_navigation_fixture__')return {contentType:'text/html',base64:Buffer.from(`<h1>Isolated Stripe fixture</h1><a id="cancel" href="${base}${paymentPath}?checkout=cancelled">Cancel</a><a id="success" href="${base}${paymentPath}?checkout=success">Return success</a>`).toString('base64')};
  return null;
 });
 const {send,evaluate,until,delay}=browser;
 async function visit(nextRole,route,fresh=false){role=nextRole;setContext(role,route);if(fresh){await send('Page.navigate',{url:base+'/login'});await delay(150);await send('Page.resetNavigationHistory');}await browser.navigate(route,{token:'local-navigation-fixture',user:{...user,currentRole:role==='admin'?'hirer':role,isAdmin:role==='admin'}});}
 async function click(selector){await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);await delay(70);}
 async function pathIs(path){await until(`location.pathname===${JSON.stringify(path)}`);}
 async function nativeBack(){await evaluate('history.back()');await delay(150);}
 async function nativeForward(){await evaluate('history.forward()');await delay(150);}
 for(const width of [390,1440]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:960,deviceScaleFactor:1,mobile:width===390});
  for(const result of ['success','cancelled']){
   await visit('hirer',paymentPath+'?checkout='+result,true);
   await until('!!document.querySelector(".payment-navigation")');
   assert.equal(await evaluate('history.state.back'),'/hirer/my-jobs/job-1');
   assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
   await evaluate('document.querySelector(".payment-navigation button").focus()');
   await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
   await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
   assert.equal(await evaluate('document.activeElement.getAttribute("href")'),'/hirer/my-jobs');
   await nativeBack();await pathIs('/hirer/my-jobs/job-1');
   await nativeForward();await pathIs(paymentPath);await until('!!document.querySelector(".payment-navigation")');
   await click('.app-header .back-btn');await pathIs('/hirer/my-jobs/job-1');
   checks.push({width,name:`Stripe ${result}: new-tab return, browser Back/Forward, header exit`});
  }
  await visit('hirer',paymentPath,true);await until('!!document.querySelector(".payment-navigation")');
  await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('ชำระผ่าน Stripe ทดสอบ')).click()`);
  await until('location.hostname==="checkout.stripe.com"');assert.equal((await send('Target.getTargets')).targetInfos.filter(t=>t.type==='page').length,1);
  await click('#cancel');await pathIs(paymentPath);await until('!!document.querySelector(".payment-navigation")');
  await click('.payment-navigation a');await pathIs('/hirer/my-jobs');
  checks.push({width,name:'Checkout stays in same tab; cancel returns to app; My Jobs exit works'});
  for(const [r,route]of [['hirer','/hirer/post-job'],['worker','/worker/service-posts/new']]){
   await visit(r,route,true);await click('.category-card');await click('.actions .btn-primary');
   await until('document.querySelector(".step-dot.active")?.textContent.trim()==="2"');await until('new URLSearchParams(location.search).get("step")==="2"');
   await evaluate(fillStep);await delay(100);assert.equal(await evaluate('document.querySelector(".actions .btn-primary").disabled'),false);
   await click('.actions .btn-primary');await until('document.querySelector(".step-dot.active")?.textContent.trim()==="3"');
   await nativeBack();await until('document.querySelector(".step-dot.active")?.textContent.trim()==="2"');assert.equal(await evaluate('document.querySelector(".step-body input").value'),'ข้อมูลที่กรอกไว้ต้องไม่หาย');
   await nativeForward();await until('document.querySelector(".step-dot.active")?.textContent.trim()==="3"');
   assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));checks.push({width,name:r+' wizard: browser Back/Forward retains draft'});
  }
  await visit('hirer','/hirer/my-jobs?status=assigned',true);await until('!!document.querySelector(".job-card, .job-row, article.card")');
  await click('.job-card, .job-row, article.card');await pathIs('/hirer/my-jobs/job-1');await click('.app-header .back-btn');await pathIs('/hirer/my-jobs');assert.equal(await evaluate('new URLSearchParams(location.search).get("status")'),'assigned');checks.push({width,name:'Job details return to the original list tab'});
  await visit('admin','/admin/jobs',true);await until('!!document.querySelector(".pagination button")');await evaluate('document.querySelectorAll(".pagination button")[1].click()');await until('new URLSearchParams(location.search).get("page")==="2"');
  await nativeBack();await until('new URLSearchParams(location.search).get("page")===null');await until('document.querySelector(".pagination").textContent.includes("1 / 3")');
  await nativeForward();await until('new URLSearchParams(location.search).get("page")==="2"');await until('document.querySelector(".pagination").textContent.includes("2 / 3")');checks.push({width,name:'Admin pagination follows browser Back/Forward'});
  console.log('PASS',width,'px navigation journeys');
 }
 for(const [r,route,parent]of [['worker','/worker/service-requests/request-1','/worker/jobs'],['worker','/worker/jobs/job-1','/worker/jobs'],['hirer','/hirer/jobs/job-1','/hirer']]){
  await visit(r,route,true);await click('button[aria-label="ย้อนกลับ"]');await pathIs(parent);checks.push({name:'Direct link back fallback: '+route});
 }
 for(const expired of [false,true]){
 expireSession=expired;setContext('hirer',paymentPath);await browser.navigate(paymentPath+'?checkout=success',expired?{token:'expired-local-fixture',user:{...user,currentRole:'hirer'}}:null);
 await pathIs('/login');assert.equal(await evaluate('new URLSearchParams(location.search).get("redirect")'),paymentPath+'?checkout=success');
 expireSession=false;
 await evaluate(`{const inputs=document.querySelectorAll('form input');for(const el of inputs){if(el.type==='email')el.value='navigation-fixture@lamduan.mfu.ac.th';else if(el.type==='password')el.value='fixture-password';el.dispatchEvent(new Event('input',{bubbles:true}));}document.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));}`);
 await pathIs(paymentPath);await until('!!document.querySelector(".payment-navigation")');checks.push({name:(expired?'Expired':'Missing')+' session: re-authentication restores the intended payment page'});
 }
 assert.equal(checkoutCalls,2);assert.deepEqual(browser.errors,[]);assert.deepEqual(browser.unknown,[]);
 fs.writeFileSync('.password-recovery/navigation-browser-report.json',JSON.stringify({checks,checkoutCalls,errors:browser.errors},null,2));console.log(JSON.stringify({checks:checks.length,checkoutCalls,errors:browser.errors}));
})().catch(async error=>{console.error(error);if(browser)console.error(JSON.stringify({errors:browser.errors,unknown:browser.unknown,page:await browser.evaluate('({url:location.href,text:document.body.innerText.slice(0,800),links:[...document.querySelectorAll(".payment-navigation a")].map(a=>a.href)})').catch(()=>null)}));process.exitCode=1}).finally(async()=>browser?.close());
