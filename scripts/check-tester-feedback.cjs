const fs=require('node:fs'),assert=require('node:assert/strict');const {launchBrowser}=require('./ui-browser.cjs');const {fixture:baseFixture,user,setContext}=require('./check-all-pages-ui.cjs');const {auditAccessibility}=require('./ui-accessibility.cjs');
if(process.argv.includes('--shared'))process.env.HIRER_PREVIEW_URL=JSON.parse(fs.readFileSync('.password-recovery/share/session.json','utf8')).url;
let browser,role='hirer',failSend=false,comments=[],jobPosts=[];const checks=[];
(async()=>{
 browser=await launchBrowser(async(endpoint,url,request)=>{
  if(endpoint==='/tester-feedback'&&request.method==='POST'){
   if(failSend)return {status:503,body:{message:'ทดสอบส่งไม่สำเร็จ กรุณาลองใหม่'}};
   const body=JSON.parse(request.postData);const item={...body,_id:String(comments.length+1).padStart(24,'0'),author:{...user},role,status:'new',createdAt:new Date().toISOString()};comments.unshift(item);return {status:201,body:{message:'ส่งความคิดเห็นถึงผู้ดูแลแล้ว',id:item._id}};
  }
  if(endpoint==='/admin/tester-feedback'){
   const status=url.searchParams.get('status')||'all';const all=comments.filter(item=>status==='all'||item.status===status);const page=Math.min(Number(url.searchParams.get('page')||1),Math.max(1,Math.ceil(all.length/20)));return {body:{items:all.slice((page-1)*20,page*20),total:all.length,page,totalPages:Math.max(1,Math.ceil(all.length/20))}};
  }
  if(/^\/admin\/tester-feedback\/[^/]+\/read$/.test(endpoint)&&request.method==='PATCH'){const id=endpoint.split('/')[3],item=comments.find(item=>item._id===id);assert(item);item.status='read';item.readAt=new Date().toISOString();return {body:{item,message:'อ่านแล้ว'}};}
  if(endpoint==='/jobs'&&request.method==='POST'){jobPosts.push(JSON.parse(request.postData));return {status:201,body:{job:{_id:'new-job',status:'pending_review'}}};}
  return baseFixture(endpoint,url,request);
 });
 const {send,evaluate,until,delay}=browser;
 async function visit(r,route){role=r;setContext(r,route);await browser.navigate(route,{token:'isolated-feedback-fixture',user:{...user,currentRole:r==='admin'?'hirer':r,isAdmin:r==='admin'}});}
 async function click(selector){await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);await delay(70);}
 async function inspect(name){for(const width of [320,390,768,1440]){await send('Emulation.setDeviceMetricsOverride',{width,height:960,deviceScaleFactor:1,mobile:false});await delay(40);assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'),name+' overflow '+width);assert.deepEqual(await evaluate(`(${auditAccessibility.toString()})()`),{contrast:[],unnamed:[],smallTargets:[]},name+' accessibility '+width);}checks.push(name);}
 for(const r of ['hirer','worker']){
  await visit(r,r==='hirer'?'/hirer':'/worker/feed');await click('header button');await until(`!!document.querySelector('.role-drawer')`);await click('.role-drawer a[href^="/feedback"]');await until('!!document.querySelector("#feedback-message")');
  await evaluate(`{const el=document.querySelector('#feedback-message');el.value='ความคิดเห็นทดสอบจาก ${r}\\nปุ่มใช้งานสะดวก <script>ข้อความต้องแสดงอย่างปลอดภัย</script>';el.dispatchEvent(new Event('input',{bubbles:true}));}`);
  if(r==='hirer'){
   failSend=true;await evaluate('document.querySelector("form").dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}))');await until('!!document.querySelector(".error")');assert(await evaluate('document.querySelector("#feedback-message").value.includes("hirer")'));assert.equal(comments.length,0);failSend=false;
  }
  await inspect(r+' feedback form');await evaluate('document.querySelector("form").dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}))');await until('!!document.querySelector(".success")');assert.equal(await evaluate('document.querySelector("#feedback-message").value'),'');
 }
 assert.equal(comments.length,2);assert.equal(comments[0].role,'worker');assert.equal(comments[1].pagePath,'/hirer');
 await visit('admin','/admin/dashboard');await click('header button');await until(`[...document.querySelectorAll('a')].some(a=>a.pathname==='/admin/tester-feedback')`);await click('a[href="/admin/tester-feedback"]');await until('document.querySelectorAll(".feedback-item").length===2');assert(await evaluate('document.querySelector(".message").textContent.includes("<script>")'));await inspect('admin feedback inbox');
 await click('.feedback-item button');await until('document.querySelector(".feedback-item .read-badge").textContent.includes("อ่านแล้ว")&&!document.querySelector(".feedback-item .read-badge").textContent.includes("ยัง")');assert.equal(comments.filter(item=>item.status==='read').length,1);
 await evaluate('{const el=document.querySelector("#feedback-status");el.value="new";el.dispatchEvent(new Event("change",{bubbles:true}))}');await until('document.querySelectorAll(".feedback-item").length===1');checks.push('admin marks read and filters unread comments');
 const base=process.env.HIRER_PREVIEW_URL||'http://localhost:5173';await send('Browser.grantPermissions',{origin:new URL(base).origin,permissions:['geolocation']});await send('Emulation.setGeolocationOverride',{latitude:20.044,longitude:99.895,accuracy:10});
 await visit('hirer','/hirer/post-job');await click('.category-card');await click('.actions .btn-primary');await until('!!document.querySelector("#job-extra-notes")');assert.equal(await evaluate('document.querySelector("#job-extra-notes").required'),false);
 await evaluate(`{for(const el of document.querySelectorAll('.step-body input')){if(el.readOnly||el.disabled)continue;el.value=el.type==='datetime-local'?'2027-12-30T10:00':el.type==='number'?(Number(el.min)>=40?'100':'2'):'งานทดสอบไม่ใส่รายละเอียดเพิ่มเติม';el.dispatchEvent(new Event('input',{bubbles:true}));}}`);
 await click('.location-btn');await until('document.querySelector(".location-btn").textContent.includes("เลือกตำแหน่งแล้ว")');await inspect('optional extra notes');assert.equal(await evaluate('document.querySelector(".actions .btn-primary").disabled'),false);await click('.actions .btn-primary');await until('document.querySelector(".step-dot.active")?.textContent.trim()==="3"');await click('.actions .btn-primary');await until('!!document.querySelector(".success-title")');assert.equal(jobPosts.length,1);assert.equal(jobPosts[0].notes,'');checks.push('Hirer submits a job with blank extra notes');
 assert.deepEqual(browser.errors,[]);assert.deepEqual(browser.unknown,[]);
 fs.mkdirSync('docs/ui-review/tester-feedback',{recursive:true});fs.writeFileSync('docs/ui-review/tester-feedback/checks.json',JSON.stringify({checks,widths:[320,390,768,1440],errors:browser.errors},null,2));console.log(JSON.stringify({checks:checks.length,comments:comments.length,jobPosts:jobPosts.length,errors:browser.errors}));
})().catch(async error=>{console.error(error);if(browser)console.error(JSON.stringify({errors:browser.errors,unknown:browser.unknown,page:await browser.evaluate('({url:location.href,text:document.body.innerText.slice(0,1000)})').catch(()=>null)}));process.exitCode=1}).finally(async()=>browser?.close());
