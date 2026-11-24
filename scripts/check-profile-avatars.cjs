const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {launchBrowser}=require('./ui-browser.cjs');
const {fixture:baseFixture,user,setContext}=require('./check-all-pages-ui.cjs');
const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQ0AAAAASUVORK5CYII=';
const avatar=id=>`/uploads/avatars/__fixture-${id}.png`;
let role='hirer',ownAvatar=avatar('own'),failUpload=false,browser,activeViewer=null;
const account=()=>activeViewer||({...user,currentRole:role==='admin'?'hirer':role,isAdmin:role==='admin',avatarUrl:ownAvatar});
function decorate(value){
 if(Array.isArray(value))return value.map(decorate);
 if(!value||typeof value!=='object')return value;
 const out=Object.fromEntries(Object.entries(value).map(([k,v])=>[k,decorate(v)]));
 if(out.fullName)out.avatarUrl=out._id===user._id?ownAvatar:avatar(out._id||'other');
 if(out.hirer){out.hirerAvatarUrl=out.hirer.avatarUrl;out.hirerName=out.hirer.fullName;}
 return out;
}
const cases=[
 ['hirer','/hirer','.feed-card .user-avatar img'],
 ['worker','/worker/feed','.feed-card .user-avatar img'],
 ['hirer','/hirer/my-jobs/job-1/applicants','.applicant-card .avatar img'],
 ['hirer','/hirer/my-jobs/job-1/applicants/worker-1/confirm','.worker .avatar img'],
 ['hirer','/hirer/jobs/job-1','.job-head .avatar img'],
 ['hirer','/hirer/hire/service-1','.post-head .avatar img'],
 ['hirer','/hirer/my-jobs/job-1','.who .avatar img'],
 ['hirer','/hirer/my-jobs/job-1/review','.avatar img'],
 ['worker','/worker/jobs','.job-row .job-avatar img'],
 ['worker','/worker/jobs/job-1','.job-head .job-avatar img'],
 ['worker','/worker/jobs/job-1/tracking','.job-head .job-avatar img'],
 ['worker','/worker/jobs/job-1/review','.profile-block .avatar img'],
 ['worker','/worker/service-requests/request-1','.avatar img'],
 ['worker','/worker/my-services/service-1','.post-avatar img'],
 ['worker','/worker/service-posts/service-1','.worker-avatar img'],
 ['admin','/admin/users','.member-avatar img'],
 ['admin','/admin/jobs','.avatar-circle img'],
];
(async()=>{
 browser=await launchBrowser(async(endpoint,url,req)=>{
  if(endpoint==='/auth/me')return {body:account()};
  if(endpoint.endsWith('/review-status'))return {body:{eligible:true,canReview:true,reviewed:false}};
  if(endpoint==='/users/'+user._id)return {body:{...user,avatarUrl:ownAvatar}};
  if(endpoint==='/users/me/avatar'&&req.method==='POST'){
   if(failUpload)return {status:503,body:{message:'Fixture upload failed'}};
   ownAvatar=avatar('saved');return {body:{avatarUrl:ownAvatar}};
  }
  const result=await baseFixture(endpoint,url,req);return result?{...result,body:decorate(result.body)}:result;
 },async url=>url.pathname.startsWith('/uploads/avatars/__fixture-')?{contentType:'image/png',base64:png}:null);
 const {evaluate,until,send}=browser;
 async function visit(nextRole,route){role=nextRole;setContext(role,route);await browser.navigate(route,{token:'isolated-avatar-fixture',user:account()});}
 const checks=[];
 for(const [r,route,selector]of cases){
  await visit(r,route);
  // Feed markup differs across roles; inspect images in listing content rather than the header.
  const actual=route==='/hirer'||route==='/worker/feed'?'main .user-avatar img':selector;
  await until(`!!document.querySelector(${JSON.stringify(actual)})`);
  await until(`[...document.querySelectorAll(${JSON.stringify(actual)})].every(img=>img.complete&&img.naturalWidth>0)`);
  for(const width of [390,1440]){
   await send('Emulation.setDeviceMetricsOverride',{width,height:960,deviceScaleFactor:1,mobile:false});
   assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'),route+' overflow');
  }
  console.log('PASS',route);
  checks.push({route,images:await evaluate(`[...document.querySelectorAll(${JSON.stringify(actual)})].map(img=>new URL(img.src).pathname)`)});
 }
 await visit('admin','/admin/users');await until('!!document.querySelector(".inspect-btn")');await evaluate('document.querySelector(".inspect-btn").click()');await until('!!document.querySelector(".selected-avatar img")');assert(await evaluate('document.querySelector(".selected-avatar img").naturalWidth>0'));
 await visit('admin','/admin/jobs');await evaluate(`[...document.querySelectorAll('.post-switch button')].find(b=>b.textContent.includes('Worker')).click()`);await until('!!document.querySelector(".avatar-circle img")');assert(await evaluate('document.querySelector(".avatar-circle img").naturalWidth>0'));
 const file=path.resolve('.password-recovery/avatar-fixture.png');fs.writeFileSync(file,Buffer.from(png,'base64'));
 async function upload(){const doc=await send('DOM.getDocument');const {nodeId}=await send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'input[type=file]'});await send('DOM.setFileInputFiles',{nodeId,files:[file]});}
 for(const r of ['hirer','worker','admin']){
  ownAvatar=avatar('own');await visit(r,r==='admin'?'/admin/profile':'/profile');await until('!!document.querySelector(".avatar-large img")');await upload();await until('document.querySelector(".avatar-large img").src.includes("__fixture-saved")');
  await until('!!document.querySelector(".app-topbar .user-avatar img, .admin-topbar .user-avatar img, .profile-btn .user-avatar img")');
  const state=await evaluate('JSON.parse(localStorage.getItem("jangdi_auth"))');assert.equal(state.user.avatarUrl,avatar('saved'));
  failUpload=true;await upload();await until('document.body.innerText.includes("Fixture upload failed")');assert(await evaluate('document.querySelector(".avatar-large img").src.includes("__fixture-saved")'));failUpload=false;
 }
 // Another authenticated account sees the uploaded owner's avatar, while its own header stays distinct.
 activeViewer={...user,_id:'other-viewer',fullName:'Another Viewer',currentRole:'worker',isAdmin:false,avatarUrl:avatar('viewer')};
 await visit('worker','/worker/jobs/job-1');
 await until('!!document.querySelector(".job-head .job-avatar img")');
 assert(await evaluate('document.querySelector(".job-head .job-avatar img").src.includes("__fixture-saved")'));
 await visit('worker','/profile');await until('!!document.querySelector(".avatar-large img")');
 assert(await evaluate('document.querySelector(".avatar-large img").src.includes("__fixture-viewer")'));
 activeViewer=null;
 assert.deepEqual(browser.errors,[]);assert.deepEqual(browser.unknown,[]);
 fs.writeFileSync('.password-recovery/avatar-browser-report.json',JSON.stringify({checks,uploadRoles:['hirer','worker','admin'],errors:browser.errors},null,2));
 console.log(JSON.stringify({pages:checks.length,uploadRoles:3,errors:browser.errors.length,checks}));
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{if(browser)await browser.close()});
