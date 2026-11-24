const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const os=require('node:os');const http=require('node:http');const {createShareServer}=require('../scripts/share-gateway.cjs');
test('share gateway serves built SPA routes and proxies API bytes without exposing source files',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'jangdi-share-test-'));fs.writeFileSync(path.join(directory,'index.html'),'<h1>JangDi test</h1>');
 const incoming=[];const backend=http.createServer((req,res)=>{let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{incoming.push({url:req.url,body,authorization:req.headers.authorization,signature:req.headers['stripe-signature']});res.setHeader('content-type','application/json');res.statusCode=req.url.startsWith('/uploads/job-proofs')?403:200;res.end(JSON.stringify({ok:true}));});});
 await new Promise(resolve=>backend.listen(0,'127.0.0.1',resolve));
 const gateway=createShareServer({directory,backendPort:backend.address().port,publicOrigin:'https://fixture.trycloudflare.com'});await new Promise(resolve=>gateway.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+gateway.address().port;
 try{
  for(const route of ['/','/login','/profile','/worker/feed'])assert((await(await fetch(base+route)).text()).includes('JangDi test'));
  for(const route of ['/.env','/.git/config','/src/main.js','/scripts/share-backend.cjs'])assert.equal((await fetch(base+route)).status,404);
  const body='{ "raw" : "stripe bytes unchanged" }';await fetch(base+'/api/payments/stripe/webhook',{method:'POST',body,headers:{'stripe-signature':'fixture-signature'}});assert.equal(incoming.at(-1).body,body);assert.equal(incoming.at(-1).signature,'fixture-signature');
  await fetch(base+'/api/jobs?status=waiting',{headers:{authorization:'Bearer fixture'}});assert.equal(incoming.at(-1).url,'/api/jobs?status=waiting');assert.equal(incoming.at(-1).authorization,'Bearer fixture');
  assert.equal((await fetch(base+'/uploads/job-proofs/private.png')).status,403);assert.equal((await fetch(base+'/health')).status,200);
 }finally{await Promise.all([new Promise(resolve=>gateway.close(resolve)),new Promise(resolve=>backend.close(resolve))]);if(path.dirname(directory)===os.tmpdir()&&path.basename(directory).startsWith('jangdi-share-test-'))fs.rmSync(directory,{recursive:true,force:true});}
});
