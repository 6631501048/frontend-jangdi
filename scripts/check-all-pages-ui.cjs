// Starts no real session and intercepts API traffic with local fixtures.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {launchBrowser} = require('./ui-browser.cjs');
const {auditAccessibility} = require('./ui-accessibility.cjs');
const output = path.resolve('docs/ui-review/all-pages');
const now = new Date('2026-11-23T06:00:00+07:00');
const user = {_id:'preview-user',fullName:'ธนวิทย์ ใจดี',email:'preview@lamduan.mfu.ac.th',phone:'0800000000',lineId:'jangdi-preview',isProfileComplete:true,isEmailVerified:true,credibilityScore:4.8,reviewCount:12,bankAccount:{bankName:'ธนาคารตัวอย่าง',accountNumber:'0000000000',accountHolderName:'ธนวิทย์ ใจดี'},contactAddress:{name:'ธนวิทย์',address:'มหาวิทยาลัยแม่ฟ้าหลวง เชียงราย',phone:'0800000000'}};
const worker = {...user,_id:'worker-1',fullName:'มินท์ พร้อมช่วย'};
let currentRole='hirer', currentRoute='', fail=false;
const job = () => ({_id:'job-1',title:'ช่วยทำความสะอาดห้องพักช่วงบ่าย',description:'ทำความสะอาดห้องพักและจัดของให้เรียบร้อย กรุณาแจ้งเวลาที่สะดวกก่อนเริ่มงาน',category:'cleaning',status:/\/review$/.test(currentRoute)?'completed':/tracking/.test(currentRoute)?'in_progress':'waiting',hirer:['/hirer','/worker/feed'].includes(currentRoute)?{...user,_id:'other-hirer',fullName:'พลอย ใจดี'}:user,selectedWorker:worker,price:350,deliveryFee:0,locationText:'เชียงราย · รอบมหาวิทยาลัย',scheduledAt:now.toISOString(),durationStart:now.toISOString(),durationEnd:'2027-12-31T10:00:00+07:00',createdAt:now.toISOString(),applicationExpiresAt:'2027-12-30T10:00:00+07:00',applicationsCount:1});
const service = {_id:'service-1',worker,category:'cleaning',title:'รับทำความสะอาดห้องพัก',description:'ใส่ใจทุกมุม พร้อมช่วยให้วันยุ่ง ๆ ของคุณเบาขึ้น',fee:350,status:'active',locationLabel:'เชียงราย · รอบมหาวิทยาลัย',availabilityStart:now.toISOString(),availabilityEnd:'2027-12-31T10:00:00+07:00',createdAt:now.toISOString(),maxSimultaneousOrders:3,currentOrderCount:0};
const request = {_id:'request-1',servicePost:service,hirer:user,status:'pending',orderDetails:'ช่วยทำความสะอาดห้องพักช่วงบ่าย นัดหมายเวลาก่อนเริ่มงาน',orderData:{requirements:'นำอุปกรณ์ทำความสะอาดมาเอง'},createdAt:now.toISOString()};
const payment = () => ({_id:'payment-1',id:'payment-1',job:job(),hirer:user,worker,status:'pending',paymentMode:'stripe_test',amount:350,platformFeeAmount:24.5,platformFeePercent:7,totalDue:374.5,netAmountToWorker:350});
const zeros = {pending:0,held:0,disputed:0,refunded:0,awaiting_verification:0,slip_rejected:0,payout_pending:0,refund_pending:0};
const overview = {rangeLabel:'พฤศจิกายน 2569',lifetime:{...zeros,total:0},period:{total:0,completedJobs:0,fees:0},transactions:[]};
async function fixture(endpoint,url,req) {
  if (req.method !== 'GET') {
    if (/\/jobs\/job-1\/apply/.test(endpoint)) return {body:{message:'สมัครงานเรียบร้อยแล้ว'}};
    return {status:400,body:{message:'ปิดการเขียนข้อมูลสำหรับตรวจ UI'}};
  }
  if (fail && !['/auth/me','/notifications','/payments/config'].includes(endpoint)) return {status:503,body:{message:'ไม่สามารถโหลดข้อมูลได้ กรุณาลองอีกครั้ง'}};
  if(endpoint==='/auth/me') return {body:{...user,currentRole,isAdmin:currentRole==='admin'}};
  if(endpoint==='/auth/verify-email') return {body:{message:'ยืนยันอีเมลแล้ว'}};
  if(endpoint==='/notifications') return {body:[{_id:'notice-1',title:'มีคำขอใช้บริการใหม่',message:'ตรวจดูรายละเอียดก่อนตอบรับคำขอได้เลย',relatedEntityType:'ServiceRequest',relatedEntityId:'request-1',createdAt:now.toISOString()}]};
  if(endpoint==='/payments/config') return {body:{feePercent:7,platformFeePercent:7,bank:{name:'ธนาคารตัวอย่าง',accountName:'JangDi ทดสอบ',accountNumber:'0000000000'}}};
  if(endpoint==='/payments/stripe/status') return {body:{ready:false}};
  if(endpoint==='/payments/overview') return {body:overview};
  if(/\/payments\/job-1\/mock$/.test(endpoint)) return {body:payment()};
  if(/\/jobs\/job-1\/review-status$/.test(endpoint)) return {body:{reviewed:false,canReview:true}};
  if(/\/jobs\/job-1\/timeline$/.test(endpoint)) return {body:[]};
  if(/\/jobs\/job-1\/applicants$/.test(endpoint)) return {body:[{_id:'application-1',worker,distanceMeters:1000}]};
  if(endpoint==='/jobs/job-1') return {body:job()};
  if(['/jobs','/jobs/my','/jobs/my-as-worker'].includes(endpoint)) return {body:[job()]};
  if(endpoint==='/service-posts/requests/request-1') return {body:request};
  if(endpoint.startsWith('/service-posts/requests/my-as-')) return {body:[request]};
  if(endpoint==='/service-posts/service-1') return {body:service};
  if(['/service-posts','/service-posts/my'].includes(endpoint)) return {body:[{...service,worker:endpoint.endsWith('/my')?user:worker}]};
  if(/\/users\/[^/]+\/reviews$/.test(endpoint)) return {body:{averageRating:4.8,total:1,reviews:[{_id:'review-1',reviewer:worker,rating:5,comment:'ตรงเวลาและสื่อสารเข้าใจง่าย',createdAt:now.toISOString()}]}};
  if(/\/users\/[^/]+\/posts$/.test(endpoint)) return {body:{jobs:[job()],servicePosts:[service]}};
  if(/\/users\/[^/]+$/.test(endpoint)) return {body:worker};
  if(endpoint==='/admin/dashboard') return {body:{totalUsers:128,totalJobs:42,pendingJobs:3,openSos:1}};
  if(endpoint==='/admin/financials') return {body:{rangeLabel:'พฤศจิกายน 2569',gross:1000,gatewayFees:20,workerPayouts:700,refunds:0,netCash:280,platformFees:50,held:230,completedJobs:2,pendingRefunds:0,pendingSlips:1,pendingPayouts:0,modes:{demo:0,stripe_test:1,slip_demo:1}}};
  if(endpoint==='/admin/users') return {body:[user,worker]};
  if(['/admin/posts','/admin/jobs','/admin/service-posts'].includes(endpoint)) return {body:{posts:[endpoint.endsWith('service-posts')?service:job()],jobs:[job()],servicePosts:[service],total:1,totalPages:1}};
  if(endpoint==='/admin/reports') return {body:[{_id:'report-1',reporter:user,reportedUser:worker,reason:'ขอให้ตรวจสอบการติดต่อ',description:'รายละเอียดสำหรับตรวจ UI',status:'pending',createdAt:now.toISOString()}]};
  if(endpoint==='/admin/sos') return {body:[{_id:'sos-1',worker,job:job(),location:{type:'Point',coordinates:[99.895,20.044]},status:'pending',message:'ขอความช่วยเหลือ',createdAt:now.toISOString()}]};
  if(endpoint==='/admin/payments/escrow') return {body:[{...payment(),status:'awaiting_verification',paymentMode:'slip_demo',hasInboundSlip:false}]};
  return null;
}
const routes = [
  ['public','/login','login'],['hirer','/register','register'],['public','/verify-email?token=fixture','verify'],['hirer','/verify-email/pending','verify-pending'],
  ['hirer','/hirer','hirer-home'],['hirer','/hirer/post-job','post-job'],['hirer','/hirer/my-jobs','hirer-jobs'],['hirer','/hirer/my-jobs?view=services','hirer-requests'],
  ['hirer','/hirer/my-jobs/job-1','hirer-job-detail'],['hirer','/hirer/my-jobs/job-1/applicants','applicants'],['hirer','/hirer/my-jobs/job-1/applicants/worker-1/confirm','selection'],
  ['hirer','/hirer/my-jobs/job-1/mock-payment','checkout'],['hirer','/hirer/my-jobs/job-1/confirmed','confirmed'],['hirer','/hirer/my-jobs/job-1/review','review-worker'],['hirer','/hirer/my-jobs/job-1/refund','refund'],
  ['hirer','/hirer/jobs/job-1','browse-job'],['hirer','/hirer/service-posts/service-1','hirer-service-detail'],['hirer','/hirer/hire/service-1','hire-service'],['hirer','/hirer/payment','hirer-payment'],['hirer','/hirer/payment/transactions','hirer-transactions'],
  ['worker','/worker/feed','worker-feed'],['worker','/worker/jobs','worker-jobs'],['worker','/worker/jobs?view=services','worker-services'],['worker','/worker/jobs/job-1','worker-job-detail'],['worker','/worker/jobs/job-1/tracking','tracking'],['worker','/worker/jobs/job-1/review','review-hirer'],
  ['worker','/worker/service-posts/new','post-service'],['worker','/worker/service-posts/service-1','worker-service-detail'],['worker','/worker/my-services/service-1','manage-service'],['worker','/worker/service-requests/request-1','request-detail'],['worker','/worker/payment','worker-payment'],['worker','/worker/payment/transactions','worker-transactions'],
  ['hirer','/profile','profile'],['hirer','/profile/ratings','ratings'],['hirer','/profile/history','history'],['hirer','/notifications','notifications'],
  ['admin','/admin/dashboard','admin-dashboard'],['admin','/admin/jobs','admin-jobs'],['admin','/admin/users','admin-users'],['admin','/admin/posts','admin-posts'],['admin','/admin/payments','admin-payments'],['admin','/admin/reports','admin-reports'],['admin','/admin/sos','admin-sos'],['admin','/admin/profile','admin-profile'],
];
module.exports={fixture,user,routes,setContext(role,route){currentRole=role;currentRoute=route;},setFailure(value){fail=value;}};
if(require.main===module){
let browser;
(async()=>{
  fs.mkdirSync(output,{recursive:true});
  browser=await launchBrowser(fixture);
  const {send,evaluate,navigate,until,delay}=browser;
  const report=[];
  for(const [role,route,name] of routes.filter(row=>!process.env.UI_ROUTES||process.env.UI_ROUTES.split(',').includes(row[2]))) {
    currentRole=role; currentRoute=route;
    const session=role==='public'?null:{token:'local-fixture-only',user:{...user,currentRole:role==='admin'?'hirer':role,isAdmin:role==='admin'}};
    await send('Emulation.setDeviceMetricsOverride',{width:1440,height:960,deviceScaleFactor:1,mobile:false});
    const before=browser.errors.length;
    await navigate(route,session);
    assert.equal(await evaluate('location.pathname'),route.split('?')[0],`Unexpected redirect: ${name}`);
    await evaluate('Promise.race([document.fonts.ready.then(()=>true),new Promise(resolve=>setTimeout(resolve,1500))])');
    const sizes=[];
    for(const width of [320,390,768,1440]) {
      await send('Emulation.setDeviceMetricsOverride',{width,height:960,deviceScaleFactor:1,mobile:false});
      const layout=await evaluate(`({width:innerWidth,scroll:document.documentElement.scrollWidth,heading:document.querySelector('h1')?.textContent.trim(),overflow:[...document.querySelectorAll('.app-shell *')].filter(el=>{const s=getComputedStyle(el);if(s.position==='fixed'||s.visibility==='hidden'||!el.getClientRects().length)return false;const r=el.getBoundingClientRect();return r.right>innerWidth+1&&r.width>0}).slice(0,5).map(el=>el.tagName+'.'+el.className)})`);
      sizes.push(layout);
      if(width===390) {
        const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
        fs.writeFileSync(path.join(output,`${name}-390.png`),Buffer.from(shot.data,'base64'));
      }
    }
    if(['login','worker-feed','admin-dashboard','profile'].includes(name)) {
      const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
      fs.writeFileSync(path.join(output,`${name}-1440.png`),Buffer.from(shot.data,'base64'));
    }
    const errors=browser.errors.slice(before);
    const accessibility=await evaluate(`(${auditAccessibility.toString()})()`);
    report.push({name,role,route,sizes,errors,accessibility,text:(await evaluate('document.body.innerText')).slice(0,240)});
    fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify({fixtureData:true,routes:report,unknown:browser.unknown,errors:browser.errors,mutations:browser.mutations},null,2));
    console.log(`${name}: ${sizes.some(item=>item.scroll>item.width)?'OVERFLOW':'layout OK'}${errors.length?' RUNTIME ERROR':''}`);
  }
  fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify({fixtureData:true,routes:report,unknown:browser.unknown,errors:browser.errors,mutations:browser.mutations},null,2));
  const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
  const labels={public:'เข้าสู่ระบบ',hirer:'ผู้ว่าจ้าง',worker:'ผู้รับจ้าง',admin:'ผู้ดูแลระบบ'};
  fs.writeFileSync(path.join(output,'index.html'),`<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>JangDi · ตรวจ UI ทุกหน้า</title><style>
  *{box-sizing:border-box}body{margin:0;background:#fcfaf8;color:#100e04;font:16px/1.6 system-ui,sans-serif}main{max-width:1280px;margin:auto;padding:32px 24px}h1{font-size:32px;margin:0 0 12px}p{color:#635b53}nav{display:flex;gap:8px;flex-wrap:wrap;margin:24px 0}button{min-height:44px;padding:8px 16px;border:1px solid #9c8e83;border-radius:10px;background:white;color:#100e04;font:inherit;cursor:pointer}button[aria-pressed=true]{background:#a24936;color:white}.gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:24px}article{min-width:0;border:1px solid #e9e1db;background:white;border-radius:20px;overflow:hidden}article[hidden]{display:none}article img{display:block;width:100%;height:420px;object-fit:cover;object-position:top;border-bottom:1px solid #e9e1db}article div{padding:16px}h2{font-size:18px;margin:0 0 8px}code{font-size:13px;overflow-wrap:anywhere}a{color:#a24936;text-underline-offset:4px}small{display:block;color:#635b53;margin:8px 0}:focus-visible{outline:3px solid #a24936;outline-offset:4px}</style><main><h1>JangDi · ภาพตัวอย่างทุกหน้า</h1><p>ภาพจากข้อมูลจำลองใน Chrome — ไม่มีบัญชีหรือรายการเงินจริง · ${report.length} กรณีเส้นทาง · ตรวจที่ความกว้าง 320, 390, 768 และ 1440px</p><p>คลิกภาพเพื่อดูเต็มหน้า · <a href="checks.json">ผลตรวจรายหน้า</a> · <a href="interactions.json">ผลตรวจฟอร์มและคีย์บอร์ด</a></p><nav aria-label="กรองบทบาท"><button aria-pressed="true" data-role="all">ทั้งหมด</button>${Object.entries(labels).map(([role,label])=>`<button aria-pressed="false" data-role="${role}">${label}</button>`).join('')}</nav><section class="gallery">${report.map(row=>`<article data-role="${row.role}"><a href="${row.name}-390.png" aria-label="ดูภาพเต็ม ${escape(row.sizes[0].heading||row.name)}"><img loading="lazy" src="${row.name}-390.png" alt="${escape(row.sizes[0].heading||row.name)} บนมือถือ"></a><div><h2>${escape(row.sizes[0].heading||row.name)}</h2><code>${escape(row.route)}</code><small>${labels[row.role]}</small><a href="${row.name}-390.png">ดูเต็มหน้า</a></div></article>`).join('')}</section></main><script>document.querySelectorAll('nav button').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('nav button').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));document.querySelectorAll('article').forEach(item=>item.hidden=button.dataset.role!=='all'&&item.dataset.role!==button.dataset.role)}));</script></html>`);
  assert.deepEqual(browser.unknown,[],'Every API request must use a known local fixture');
  assert.deepEqual(browser.errors,[],'Pages must render without runtime exceptions');
  assert.equal(report.filter(row=>row.sizes.some(size=>size.scroll>size.width)).length,0,'Every route must reflow without horizontal overflow');
  assert.deepEqual(report.filter(row=>row.accessibility.contrast.length||row.accessibility.unnamed.length||row.accessibility.smallTargets.length).map(row=>({name:row.name,...row.accessibility})),[],'Rendered text, control names and targets must pass the focused accessibility checks');
  console.log(`PASS: ${report.length} route scenarios across 4 widths.`);
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>browser?.close());
}
