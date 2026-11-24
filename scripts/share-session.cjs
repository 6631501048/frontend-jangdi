const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {spawn}=require('node:child_process');
const {createShareServer}=require('./share-gateway.cjs');
const root=path.resolve(__dirname,'..');
const work=path.join(root,'.password-recovery','share');
fs.mkdirSync(work,{recursive:true});
const stateFile=path.join(work,'session.json');
const state={status:'starting',startedAt:Date.now(),controlPort:5181,controlToken:require('node:crypto').randomBytes(32).toString('hex'),processes:[{pid:process.pid,startedAt:Date.now(),name:'node'}]};
const children=[];let gateway,control,backend,closing=false,reloading=false;
function save(){fs.writeFileSync(stateFile,JSON.stringify(state,null,2));}
function launch(file,args,options={}){
 const child=spawn(file,args,{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe','ipc'],...options});
 children.push(child);state.processes.push({pid:child.pid,startedAt:Date.now(),name:path.basename(file).replace(/\.exe$/i,'')});save();
 const log=fs.createWriteStream(path.join(work,options.logName||'services.log'),{flags:'a'});
 child.stdout.on('data',chunk=>log.write(chunk));child.stderr.on('data',chunk=>log.write(chunk));
 child.once('error',error=>shutdown(error));
 return child;
}
async function shutdown(error){
 if(closing)return;closing=true;state.status=error?'failed':'stopped';state.error=error?.message;save();
 for(const child of children)if(child.exitCode===null)child.kill();gateway?.close();control?.close();
 if(error)console.error(error.message);setTimeout(()=>process.exit(error?1:0),250).unref();
}
async function waitUntil(check,timeout=30000){const start=Date.now();while(Date.now()-start<timeout){if(await check())return;await new Promise(resolve=>setTimeout(resolve,200));}throw new Error('Timed out while preparing test link');}
async function portFree(port){return new Promise((resolve,reject)=>{const probe=http.createServer();probe.once('error',()=>reject(new Error(`Port ${port} is already occupied; no existing process was stopped`)));probe.listen(port,'127.0.0.1',()=>probe.close(resolve));});}
async function startBackend(){
 let connected=false;
 const child=launch(process.execPath,[path.join(root,'scripts/share-backend.cjs')],{env:{...process.env,PORT:'4001',CLIENT_URL:state.url,TRUST_PROXY:'1'},logName:'backend.log'});
 backend=child;
 child.on('message',message=>{if(message==='db-ready')connected=true;});
 child.once('exit',()=>{if(!closing&&!reloading&&backend===child)shutdown(new Error('Test backend stopped'));});
 await waitUntil(()=>connected,45000);
}
(async()=>{
 await portFree(5180);await portFree(4001);await portFree(5181);save();
 const build=launch(process.execPath,[path.join(root,'node_modules/vite/bin/vite.js'),'build','--outDir',path.join(work,'dist')],{env:{...process.env,VITE_API_BASE_URL:'/api',VITE_SOCKET_URL:''},logName:'build.log'});
 await new Promise((resolve,reject)=>{build.once('error',reject);build.once('exit',code=>code===0?resolve():reject(new Error('Share build failed; see build.log')))});
 fs.writeFileSync(path.join(work,'cloudflared.yml'),'protocol: http2\n');
 const cloudflared=process.env.CLOUDFLARED_PATH||'C:/Program Files (x86)/cloudflared/cloudflared.exe';
 const tunnel=launch(cloudflared,['tunnel','--config',path.join(work,'cloudflared.yml'),'--no-autoupdate','--protocol','http2','--url','http://127.0.0.1:5180'],{logName:'tunnel.log',stdio:['ignore','pipe','pipe']});
 let output='';const capture=chunk=>{output+=chunk.toString();const match=output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);if(match)state.url=match[0];};tunnel.stdout.on('data',capture);tunnel.stderr.on('data',capture);
 tunnel.once('exit',()=>shutdown(new Error('Temporary tunnel closed')));
 await waitUntil(()=>state.url,60000);save();
 await startBackend();
 gateway=createShareServer({directory:path.join(work,'dist'),backendPort:4001,publicOrigin:state.url});
 await new Promise((resolve,reject)=>{gateway.once('error',reject);gateway.listen(5180,'127.0.0.1',resolve);});
 control=http.createServer(async(req,res)=>{
  res.setHeader('Content-Type','application/json');
  if(req.headers.authorization!==`Bearer ${state.controlToken}`){res.writeHead(401);return res.end('{"error":"Unauthorized"}');}
  if(req.method!=='POST'||req.url!=='/reload-backend'){res.writeHead(404);return res.end('{}');}
  if(reloading){res.writeHead(409);return res.end('{"error":"Reload in progress"}');}
  reloading=true;
  try{
   if(backend&&backend.exitCode===null){const stopped=new Promise(resolve=>backend.once('exit',resolve));backend.kill();await stopped;}
   await startBackend();state.status='ready';delete state.error;save();res.end('{"status":"ok"}');
  }catch(error){state.status='degraded';state.error='Backend reload failed; retry the local reload command.';save();res.writeHead(503);res.end('{"error":"Backend reload failed"}');}
  finally{reloading=false;}
 });
 await new Promise((resolve,reject)=>{control.once('error',reject);control.listen(5181,'127.0.0.1',resolve);});
 state.status='ready';save();console.log(state.url);
 let healthFailures=0,checkingHealth=false;
 const healthTimer=setInterval(async()=>{
  if(checkingHealth||closing)return;checkingHealth=true;
  try{
   const response=await fetch(state.url+'/health',{signal:AbortSignal.timeout(10000)});
   if(!response.ok||(await response.json()).status!=='ok')throw new Error('Public link unavailable');
   healthFailures=0;
   if(state.status==='degraded'){state.status='ready';delete state.error;save();}
  }catch{
   if(++healthFailures>=3){state.status='degraded';state.error='Public tunnel unavailable. Stop and start the share session to obtain a new URL.';save();}
  }finally{checkingHealth=false;}
 },30000);healthTimer.unref();
})().catch(shutdown);
process.on('SIGINT',()=>shutdown());process.on('SIGTERM',()=>shutdown());
