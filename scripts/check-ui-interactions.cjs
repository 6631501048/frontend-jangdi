const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {launchBrowser}=require('./ui-browser.cjs');
const {fixture,user,setContext,setFailure}=require('./check-all-pages-ui.cjs');
const {auditAccessibility}=require('./ui-accessibility.cjs');
const output=path.resolve('docs/ui-review/all-pages');
let browser;
(async()=>{
 browser=await launchBrowser(fixture);
 const {send,evaluate,until,delay}=browser;
 const checks=[];
 async function navigate(role,route){setContext(role,route);await browser.navigate(route,{token:'local-fixture-only',user:{...user,currentRole:role==='admin'?'hirer':role,isAdmin:role==='admin'}});}
 async function click(selector){await evaluate(`{const el=document.querySelector(${JSON.stringify(selector)});el.focus();el.click();}`);await delay(100);}
 async function key(key,shift=false){const code=key==='Tab'?9:key==='Escape'?27:13;await send('Input.dispatchKeyEvent',{type:'keyDown',key,code:key,windowsVirtualKeyCode:code,modifiers:shift?8:0,...(key==='Enter'?{text:'\r',unmodifiedText:'\r'}:{})});await send('Input.dispatchKeyEvent',{type:'keyUp',key,code:key,windowsVirtualKeyCode:code,modifiers:shift?8:0});await delay(50);}
 async function screenshot(name){const image=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync(path.join(output,name),Buffer.from(image.data,'base64'));}
 async function inspect(name){
   await delay(250); // Inspect the settled state after Vue transition classes finish.
   const sizes=[];
   for(const width of [320,390,768,1440]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:960,deviceScaleFactor:1,mobile:false});
    const audit=await evaluate(`(${auditAccessibility.toString()})()`);
    const scroll=await evaluate('document.documentElement.scrollWidth');
    assert(scroll<=width,`${name}: horizontal overflow at ${width}`);
    assert.deepEqual(audit,{contrast:[],unnamed:[],smallTargets:[]},`${name} at ${width}`);
    sizes.push(width);
    if(width===390)await screenshot(`${name}-390.png`);
   }
   checks.push({name,widths:sizes});
 }
 for(const [role,route,button,panel] of [['worker','/worker/feed','.menu-button','.role-drawer'],['admin','/admin/dashboard','.menu-btn','.drawer']]){
   await navigate(role,route);await click(button);await until(`!!document.querySelector(${JSON.stringify(panel)})`);
   assert(await evaluate(`document.activeElement === document.querySelector(${JSON.stringify(panel)})`));
   await key('Tab');
   assert(await evaluate(`document.querySelector(${JSON.stringify(panel)}).contains(document.activeElement)`));
   await key('Tab',true);
   assert(await evaluate(`document.activeElement === document.querySelector(${JSON.stringify(panel+' .logout-btn, '+panel+' .logout')})`));
   await key('Escape');await until(`!document.querySelector(${JSON.stringify(panel)})`);
   assert(await evaluate(`document.activeElement === document.querySelector(${JSON.stringify(button)})`));
   checks.push({name:`${role} drawer: focus entry, Tab wrap, Escape, focus return`});
 }
 await navigate('hirer','/profile');
 await evaluate(`{const el=[...document.querySelectorAll('button')].find(el=>el.textContent.trim()==='เปลี่ยนรหัสผ่าน');el.focus();el.click();}`);
 await until('!!document.querySelector(".modal[role=dialog]")');
 assert.equal(await evaluate('document.activeElement.getAttribute("role")'),'dialog');
 await key('Tab');
 assert.equal(await evaluate('document.activeElement.getAttribute("autocomplete")'),'current-password');
 await key('Tab');
 assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'),'รหัสผ่านใหม่');
 await key('Tab');
 assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'),'ยืนยันรหัสผ่านใหม่');
 await inspect('password-dialog');
 await key('Escape');await until('!document.querySelector(".modal")');
 assert.equal(await evaluate('document.activeElement.textContent.trim()'),'เปลี่ยนรหัสผ่าน');
 await evaluate(`document.querySelectorAll('.card-actions')[0].querySelector('button:last-child').click()`);
 await until('!!document.querySelector(".field-grid input")');
 await inspect('profile-edit');

 const fillStep=`(() => {
   for(const el of document.querySelectorAll('.step-body input, .step-body textarea, .step-body select')) {
     if(el.readOnly||el.disabled||el.type==='file')continue;
     if(el.tagName==='SELECT'){el.value=[...el.options].find(option=>!option.disabled&&option.value)?.value||'';el.dispatchEvent(new Event('change',{bubbles:true}));continue;}
     el.value=el.type==='datetime-local'?'2027-12-30T10:00':el.type==='date'?'2027-12-30':el.type==='number'?(Number(el.min)>=40?'350':'2'):'รายละเอียดตัวอย่างสำหรับตรวจการแสดงผล';
     el.dispatchEvent(new Event('input',{bubbles:true}));
   }
 })()`;
 for(const [role,route,name] of [['hirer','/hirer/post-job','post-job'],['worker','/worker/service-posts/new','post-service']]){
   await navigate(role,route);
   assert(await evaluate('document.querySelector(".actions .btn-primary").disabled'),'Cannot advance without a category');
   await click('.category-card');await click('.actions .btn-primary');
   await until('document.querySelector(".step-dot.active")?.textContent.trim()==="2"');
   await evaluate(fillStep);await delay(100);
   await inspect(`${name}-details`);
   assert.equal(await evaluate('document.querySelector(".actions .btn-primary").disabled'),false,`${name} valid details must enable Next`);
   await click('.actions .btn-primary');
   await until('document.querySelector(".step-dot.active")?.textContent.trim()==="3"');
   await inspect(`${name}-review`);
   await click('.actions .btn-muted');
   await until('document.querySelector(".step-dot.active")?.textContent.trim()==="2"');
   assert.equal(await evaluate('document.querySelector(".step-body input").value'),'รายละเอียดตัวอย่างสำหรับตรวจการแสดงผล');
   checks.push({name:`${name}: required category, details, review, back preserves input; no submission`});
 }
 await navigate('worker','/worker/feed');
 await click('button.btn-apply');await until('document.querySelector("button.btn-apply")?.textContent.trim()==="สมัครแล้ว"');
 assert.equal(await evaluate('document.querySelector("button.btn-apply").disabled'),true);
 checks.push({name:'worker application: local request, submitted state, prevents repeat'});
 setFailure(true);await navigate('worker','/worker/feed');
 await until('!!document.querySelector(".error-state")');
 setFailure(false);await click('.error-state button');await until('!!document.querySelector(".card")');
 checks.push({name:'worker feed error and retry'});

 await send('Emulation.setDeviceMetricsOverride',{width:390,height:960,deviceScaleFactor:1,mobile:false});
 await evaluate('document.documentElement.style.fontSize="200%"');
 assert(await evaluate('document.documentElement.scrollWidth <= innerWidth'));
 checks.push({name:'worker feed reflow with 200% text'});
 assert.deepEqual(browser.errors,[]);assert.deepEqual(browser.unknown,[]);
 assert.deepEqual(browser.mutations,[{method:'POST',path:'/api/jobs/job-1/apply'}]);
 fs.writeFileSync(path.join(output,'interactions.json'),JSON.stringify({fixtureData:true,checks,errors:browser.errors,mutations:browser.mutations},null,2));
 console.log(`PASS: ${checks.length} interaction and form-state checks. No real API writes.`);
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>browser?.close());
