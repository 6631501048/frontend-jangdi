const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{const {url,status}=JSON.parse(fs.readFileSync('.password-recovery/share/session.json','utf8'));assert.equal(status,'ready');const results=[];
 for(const [route,expected]of [['/',200],['/login',200],['/profile',200],['/health',200],['/api/auth/me',401],['/api/jobs',200],['/api/jobs/my',401],['/api/notifications',401],['/.env',404],['/.git/config',404],['/src/main.js',404],['/scripts/share-backend.cjs',404],['/uploads/job-proofs/private.png',403]]){
  const res=await fetch(url+route,{signal:AbortSignal.timeout(15000)});assert.equal(res.status,expected,route);const body=await res.text();if(route==='/health')assert.equal(JSON.parse(body).status,'ok');results.push({route,status:res.status});
 }
 for(const [route,method]of [['/api/tester-feedback','POST'],['/api/admin/tester-feedback','GET']]){const res=await fetch(url+route,{method,signal:AbortSignal.timeout(15000)});assert.equal(res.status,401,route);await res.text();results.push({route,status:res.status});}
 const file=fs.readdirSync('../backend/uploads/avatars').find(name=>/\.(png|jpg|jpeg)$/i.test(name));if(file){const res=await fetch(url+'/uploads/avatars/'+encodeURIComponent(file),{signal:AbortSignal.timeout(15000)});assert.equal(res.status,200);assert(res.headers.get('content-type').startsWith('image/'));await res.arrayBuffer();results.push({route:'/uploads/avatars/[existing image]',status:res.status});}
 console.log(JSON.stringify({url,results},null,2));fs.writeFileSync('.password-recovery/share/http-check.json',JSON.stringify(results,null,2));
})().catch(err=>{console.error(err.message);process.exitCode=1});
