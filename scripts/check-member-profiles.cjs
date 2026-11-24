const fs=require('node:fs'),assert=require('node:assert/strict');
const {launchBrowser}=require('./ui-browser.cjs');const {fixture:baseFixture,user,setContext}=require('./check-all-pages-ui.cjs');const {auditAccessibility}=require('./ui-accessibility.cjs');
if(process.argv.includes('--shared'))process.env.HIRER_PREVIEW_URL=JSON.parse(fs.readFileSync('.password-recovery/share/session.json','utf8')).url;
let browser,role='hirer',related=true,newMember=false,failSave=false;const patches=[],checks=[];
const person=id=>({_id:id,fullName:id==='worker-1'?'มินท์ พร้อมช่วย':'พลอย ใจดี',avatarUrl:'',shortDescription:'พร้อมช่วยงานในชุมชน ติดต่อเรื่องงานผ่านอีเมลได้',credibilityScore:4.8,reviewCount:2,canViewEmail:related,...(related?{email:`${id}@lamduan.mfu.ac.th`}:{})});
const account=()=>({...user,...(newMember?{bankAccount:undefined}:{}),_id:role==='worker'?'worker-viewer':user._id,currentRole:role,isProfileComplete:!newMember});
(async()=>{
 browser=await launchBrowser(async(endpoint,url,request)=>{
  if(endpoint==='/auth/me')return {body:account()};
  if(endpoint==='/users/'+user._id&&request.method==='PATCH'){
   const changes=JSON.parse(request.postData);patches.push(changes);
   if(failSave)return {status:503,body:{message:'บันทึกยังไม่สำเร็จ กรุณาลองใหม่'}};
   newMember=false;return {body:{user:{...account(),...changes,isProfileComplete:true}}};
  }
  if(/^\/users\/(worker-1|hirer-1)$/.test(endpoint))return {body:person(endpoint.split('/').at(-1))};
  if(/^\/users\/[^/]+\/reviews$/.test(endpoint))return {body:{reviews:[{_id:'r',rating:5,fromUser:{fullName:'สมาชิกตัวอย่าง'},comment:'ติดต่อสะดวกและทำงานเรียบร้อย'}]}};
  const response=await baseFixture(endpoint,url,request);
  if(endpoint==='/jobs/job-1')return {...response,body:{...response.body,status:'in_progress',hirer:person('hirer-1'),selectedWorker:{_id:'worker-1',fullName:'มินท์ พร้อมช่วย'}}};
  return response;
 });
 const {evaluate,until,send,delay}=browser;
 async function visit(r,route){role=r;setContext(r,route);await browser.navigate(route,{token:'isolated-member-profile-fixture',user:account()});}
 async function inspect(name){for(const width of [320,390,768,1440]){await send('Emulation.setDeviceMetricsOverride',{width,height:960,deviceScaleFactor:1,mobile:false});await delay(30);assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'),name+' overflow '+width);const audit=await evaluate(`(${auditAccessibility.toString()})()`);assert.deepEqual(audit,{contrast:[],unnamed:[],smallTargets:[]},name+' accessibility '+width);}checks.push(name);}
 for(const [r,route,id]of [['hirer','/hirer/my-jobs/job-1','worker-1'],['worker','/worker/jobs/job-1','hirer-1'],['worker','/worker/jobs/job-1/tracking','hirer-1'],['hirer','/hirer/hire/service-1','worker-1'],['hirer','/hirer/my-jobs/job-1/applicants','worker-1'],['hirer','/hirer/service-posts/service-1','worker-1']]){
  await visit(r,route);await until(`!!document.querySelector('a[href="/users/${id}"]')`);await evaluate(`document.querySelector('a[href="/users/${id}"]').click()`);await until('!!document.querySelector(".member-profile h1")');assert.equal(await evaluate('location.pathname'),'/users/'+id);await until('!!document.querySelector("a[href^=mailto]")');
  await evaluate('document.querySelector(".app-header .back-btn").click()');await until(`location.pathname===${JSON.stringify(route)}`);checks.push('profile link/back: '+route);
 }
 related=false;await visit('hirer','/users/worker-1');await until('!!document.querySelector("#member-name")');assert.equal(await evaluate('!!document.querySelector("a[href^=mailto]")'),false);assert(await evaluate('document.body.innerText.includes("หลังยืนยันจ้าง")'));await inspect('unrelated public profile');
 related=true;await visit('worker','/users/hirer-1');await until('!!document.querySelector("a[href^=mailto]")');await inspect('counterpart profile email without LINE');
 fs.mkdirSync('docs/ui-review/member-profiles',{recursive:true});await send('Emulation.setDeviceMetricsOverride',{width:390,height:960,deviceScaleFactor:1,mobile:false});fs.writeFileSync('docs/ui-review/member-profiles/profile-390.png',Buffer.from((await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
 newMember=true;await visit('hirer','/register');await until('!!document.querySelector("input[name=bankName]")');assert.equal(await evaluate('document.querySelector("form").checkValidity()'),false);await inspect('new member bank form');
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:960,deviceScaleFactor:1,mobile:false});fs.writeFileSync('docs/ui-review/member-profiles/register-390.png',Buffer.from((await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
 await evaluate(`{for(const [name,value]of Object.entries({bankName:'ธนาคารทดสอบ',accountNumber:'0000000000',accountHolderName:'บัญชีสมมติ'})){const el=document.querySelector('input[name='+name+']');el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));}}`);
 failSave=true;await evaluate('document.querySelector("form").dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}))');await until('document.body.innerText.includes("บันทึกยังไม่สำเร็จ")');assert.equal(await evaluate('document.querySelector("input[name=accountNumber]").value'),'0000000000');
 failSave=false;await evaluate('document.querySelector("form").dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}))');await until('location.pathname==="/hirer"');assert.equal(patches.length,2);assert.equal(patches[1].bankAccount.accountNumber,'0000000000');checks.push('dummy bank onboarding, API failure retry and success');
 assert.deepEqual(browser.errors,[]);assert.deepEqual(browser.unknown,[]);fs.writeFileSync('docs/ui-review/member-profiles/checks.json',JSON.stringify({checks,widths:[320,390,768,1440],errors:browser.errors},null,2));console.log(JSON.stringify({checks:checks.length,errors:browser.errors}));
})().catch(async error=>{console.error(error);if(browser)console.error(JSON.stringify({errors:browser.errors,unknown:browser.unknown,page:await browser.evaluate('({url:location.href,text:document.body.innerText.slice(0,900)})').catch(()=>null)}));process.exitCode=1}).finally(async()=>browser?.close());
