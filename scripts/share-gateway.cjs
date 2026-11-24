const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const backendRequire = createRequire(path.resolve(__dirname, '../../backend/package.json'));
const express = backendRequire('express');
function createShareServer({ directory, backendPort, publicOrigin }) {
  const app = express();
  app.disable('x-powered-by');
  const proxy = (req, res) => {
    const upstream = http.request({ hostname:'127.0.0.1',port:backendPort,path:req.originalUrl,method:req.method,headers:{...req.headers,host:`127.0.0.1:${backendPort}`,'x-forwarded-proto':'https','x-forwarded-host':new URL(publicOrigin).host} }, remote => {
      res.writeHead(remote.statusCode, remote.headers); remote.pipe(res);
    });
    upstream.on('error', () => { if (!res.headersSent) res.status(502).json({message:'ระบบทดสอบกำลังเชื่อมต่อ กรุณาลองใหม่อีกครั้ง'}); else res.destroy(); });
    req.on('aborted',()=>upstream.destroy()); req.pipe(upstream);
  };
  app.use((req,res,next)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    if(req.path==='/api'||req.path.startsWith('/api/')||req.path.startsWith('/uploads/')||req.path.startsWith('/socket.io/'))return proxy(req,res);
    if(req.path==='/health')return proxy(req,res);
    next();
  });
  app.use(express.static(directory,{dotfiles:'deny',index:false}));
  app.get('*',(req,res)=>{
    if(req.path.startsWith('/.')||/\.(?:env|js|map|json|vue|cjs|ps1)$/i.test(req.path))return res.sendStatus(404);
    res.setHeader('Cache-Control','no-store');res.sendFile(path.join(directory,'index.html'));
  });
  const server=http.createServer(app);
  server.on('upgrade',(req,socket,head)=>{
    if(!req.url.startsWith('/socket.io/'))return socket.destroy();
    const upstream=http.request({hostname:'127.0.0.1',port:backendPort,path:req.url,headers:{...req.headers,host:`127.0.0.1:${backendPort}`},method:'GET'});
    upstream.on('upgrade',(response,remote,remoteHead)=>{
      socket.write(`HTTP/1.1 ${response.statusCode} ${response.statusMessage}\r\n`+Object.entries(response.headers).map(([k,v])=>`${k}: ${v}\r\n`).join('')+'\r\n');
      if(remoteHead.length)socket.write(remoteHead);if(head.length)remote.write(head);
      remote.on('error',()=>socket.destroy());socket.on('error',()=>remote.destroy());remote.pipe(socket);socket.pipe(remote);
    });
    upstream.on('response',()=>socket.destroy());upstream.on('error',()=>socket.destroy());upstream.end();
  });
  return server;
}
module.exports={createShareServer};
