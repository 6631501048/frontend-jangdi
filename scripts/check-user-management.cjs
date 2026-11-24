// Isolated admin account and fixture API: no real moderation or notifications.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {launchBrowser}=require('./ui-browser.cjs');
const {fixture:baseFixture,user,setContext}=require('./check-all-pages-ui.cjs');
const {auditAccessibility}=require('./ui-accessibility.cjs');
const output=path.resolve('docs/ui-review/user-management');
const names=['กมลวรรณ ใจดี','ธนกร พร้อมช่วย','พิมพ์ชนก แสงทอง','ณัฐพล มีสุข','ภัทรา วงศ์ดี','อารยา รุ่งเรือง'];
const initial=()=>Array.from({length:23},(_,i)=>({_id:`member-${i}`,fullName:`${names[i%names.length]}${i>=6?` ${i+1}`:''}`,email:`student${6631501000+i}@lamduan.mfu.ac.th`,studentId:String(6631501000+i),currentRole:i%2?'worker':'hirer',accountStatus:['active','warned','suspended'][i%3],isEmailVerified:i%4!==0,createdAt:new Date(Date.UTC(2026,10,24-i)).toISOString(),moderationHistory:i===0?[{action:'clear',newStatus:'active',reason:'ตรวจสอบข้อมูลและคืนสถานะบัญชีเรียบร้อย',performedAt:'2026-11-23T08:30:00Z'}]:[]}));
let members=initial(),failLoad=false,failAction=false,browser;const checks=[];
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 browser=await launchBrowser(async(endpoint,url,request)=>{
  if(endpoint==='/auth/me')return {body:{...user,isAdmin:true,currentRole:'hirer'}};
  if(endpoint==='/admin/users')return failLoad?{status:503,body:{message:'ทดสอบโหลดรายชื่อไม่สำเร็จ'}}:{body:members};
  if(/^\/admin\/users\/[^/]+\/suspend$/.test(endpoint)&&request.method==='POST'){
   if(failAction)return {status:503,body:{message:'ทดสอบเปลี่ยนสถานะไม่สำเร็จ'}};
   const id=endpoint.split('/')[3],body=JSON.parse(request.postData),person=members.find(item=>item._id===id);
   assert(person);assert(body.reason.trim().length>=5);
   person.accountStatus=({warn:'warned',suspend:'suspended',clear:'active'})[body.action];
   person.moderationHistory.push({action:body.action,newStatus:person.accountStatus,reason:body.reason,performedAt:new Date().toISOString()});
   const {moderationHistory,...result}=person;return {body:{user:result}};
  }
  return baseFixture(endpoint,url,request);
 });
 const {send,evaluate,until,delay}=browser;
 async function navigate(){setContext('admin','/admin/users');await browser.navigate('/admin/users',{token:'isolated-admin-fixture',user:{...user,isAdmin:true,currentRole:'hirer'}});await until('!document.querySelector(".loading-symbol")');}
 async function click(selector){await evaluate(`{const el=document.querySelector(${JSON.stringify(selector)});el.focus();el.click()}`);await delay(100);}
 async function search(value){await evaluate(`{const el=document.querySelector('input[type=search]');el.value=${JSON.stringify(value)};el.dispatchEvent(new Event('input',{bubbles:true}))}`);await delay(100);}
 async function select(id='member-0'){await click(`.user-row button[aria-label="ดูรายละเอียดบัญชี ${members.find(u=>u._id===id).fullName}"]`);await until('!!document.querySelector(".selected-identity")');await until('document.querySelector(".selected-identity h2").getBoundingClientRect().top < innerHeight * .6');await delay(500);}
 async function audit(name){assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));assert.deepEqual(await evaluate(`(${auditAccessibility.toString()})()`),{contrast:[],unnamed:[],smallTargets:[]});const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(output,`${name}.png`),Buffer.from(shot.data,'base64'));}
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1040,deviceScaleFactor:1,mobile:false});await navigate();
 assert.equal(await evaluate('document.querySelectorAll(".user-row").length'),10);
 assert.deepEqual(await evaluate('[...document.querySelectorAll(".metric-card strong")].map(e=>Number(e.textContent))'),[23,8,8,7]);
 await audit('directory-1440');await select();await audit('selected-1440');
 assert.equal(await evaluate('document.activeElement.id'),'user-detail');
 assert(await evaluate('document.querySelector(".moderation-history").textContent.includes("คืนสถานะบัญชีเรียบร้อย")'));
 await click('.close-details');assert(await evaluate('document.activeElement.classList.contains("inspect-btn")'));
 await evaluate('document.querySelector(".inspect-btn").focus()');for(const type of ['keyDown','keyUp'])await send('Input.dispatchKeyEvent',{type,key:'Enter',code:'Enter',windowsVirtualKeyCode:13,...(type==='keyDown'?{text:'\r',unmodifiedText:'\r'}:{})});await until('document.activeElement.id === "user-detail"');
 assert(await evaluate('getComputedStyle(document.activeElement).outlineStyle !== "none"'));await click('.close-details');
 checks.push('keyboard Enter opens account details, focus is visible and close returns to the selected row');
 await click('button[aria-label="หน้ารายชื่อถัดไป"]');assert(await evaluate('document.querySelector(".pagination").textContent.includes("11–20")'));
 await search('6631501022');assert.equal(await evaluate('document.querySelectorAll(".user-row").length'),1);
 await search('STUDENT6631501000');assert.equal(await evaluate('document.querySelectorAll(".user-row").length'),1);
 await search('ไม่พบชื่อทดสอบ');assert(await evaluate('document.querySelector(".directory-state").textContent.includes("ไม่พบสมาชิก")'));
 await click('.empty-reset');await click('.role-tabs button:nth-child(3)');assert.equal(await evaluate('document.querySelector(".result-bar p").textContent'),'พบ 11 บัญชี');
 await evaluate(`{const el=document.querySelector('.status-filter select');el.value='suspended';el.dispatchEvent(new Event('change',{bubbles:true}))}`);await delay(100);assert.equal(await evaluate('document.querySelector(".result-bar p").textContent'),'พบ 3 บัญชี');
 await click('.reset-filters');await select();await search('ธนกร');assert.equal(await evaluate('!!document.querySelector(".selected-identity")'),false);
 await click('.reset-filters');checks.push('consistent summary, search/name/email/ID, role+status filters, pagination, empty/reset and safe selection');
 await select();await click('.action-btn.suspend');await until('!!document.querySelector(".decision-panel")');
 assert(await evaluate('document.querySelector(".decision-panel").textContent.includes("กมลวรรณ ใจดี")'));
 await click('.decision-actions button');assert.equal(browser.mutations.length,0);
 for(const [action,status] of [['warn','warned'],['suspend','suspended'],['clear','active']]){
  await click(`.action-btn.${action}`);await until('!!document.querySelector(".decision-panel")');
  await evaluate(`{const el=document.querySelector('.decision-panel textarea');el.value='ตรวจสอบตามรายงานและบันทึกเหตุผลเรียบร้อย';el.dispatchEvent(new Event('input',{bubbles:true}))}`);
  await click('.decision-confirm');await until(`!document.querySelector('.decision-panel') && !!document.querySelector('.success-box') && !document.querySelector('.loading-symbol')`);
  assert.equal(members[0].accountStatus,status);assert(await evaluate('document.querySelector(".moderation-history").textContent.includes("ตรวจสอบตามรายงาน")'));
 }
 checks.push('warning/suspension/restoration preserve reason dialog, exact existing API, live counters and persisted history');
 failAction=true;await click('.action-btn.suspend');await evaluate(`{const el=document.querySelector('.decision-panel textarea');el.value='ตรวจสอบการลองใหม่ของคำขอนี้';el.dispatchEvent(new Event('input',{bubbles:true}))}`);await click('.decision-confirm');await until('document.querySelector(".moderation-actions [role=alert]")?.textContent.includes("ทดสอบเปลี่ยนสถานะ")');
 failAction=false;await click('.action-btn.suspend');await click('.decision-actions button');checks.push('API failure keeps selected account, permits retry and cancellation writes nothing');
 for(const width of [320,390,768,1024,1440]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:1040,deviceScaleFactor:1,mobile:false});await navigate();await audit(`directory-${width}`);await select();await audit(`selected-${width}`);
  await click('.action-btn.suspend');await until('!!document.querySelector(".decision-panel")');await audit(`decision-${width}`);
  for(const type of ['keyDown','keyUp'])await send('Input.dispatchKeyEvent',{type,key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await until('!document.querySelector(".decision-panel")');
 }
 checks.push('responsive list/detail/dialog, contrast, focus and touch targets at 320/390/768/1024/1440px');
 failLoad=true;await navigate();assert(await evaluate('!!document.querySelector(".error-box[role=alert]")'));failLoad=false;await click('.error-box button');await until('document.querySelectorAll(".user-row").length===10');
 members=[];await navigate();assert(await evaluate('document.querySelector(".directory-state").textContent.includes("ยังไม่มีสมาชิก")'));
 checks.push('initial API failure/retry and genuine empty account list');
 assert.deepEqual(browser.errors,[]);assert.deepEqual(browser.unknown,[]);assert(browser.mutations.every(item=>item.method==='POST'&&item.path==='/api/admin/users/member-0/suspend'));
 fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify({fixtureData:true,checks,errors:browser.errors,mutations:browser.mutations},null,2));console.log(`PASS: ${checks.length} user-management groups. No real users moderated.`);
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>browser?.close());
