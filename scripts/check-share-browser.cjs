const fs=require('node:fs');const assert=require('node:assert/strict');const {io}=require('socket.io-client');const {launchBrowser}=require('./ui-browser.cjs');let browser;
(async()=>{
 const {url}=JSON.parse(fs.readFileSync('.password-recovery/share/session.json','utf8'));
 browser=await launchBrowser(()=>{throw new Error('Unexpected fixture API request')});process.env.HIRER_PREVIEW_URL=url;
 await browser.navigate('/login',null);
 const sizes=[];for(const width of [390,1440]){
  await browser.send('Emulation.setDeviceMetricsOverride',{width,height:960,deviceScaleFactor:1,mobile:false});
  assert(await browser.evaluate('document.documentElement.scrollWidth<=innerWidth'));
  assert(await browser.evaluate('!!document.querySelector("input[type=email]")&&!!document.querySelector("input[type=password]")'));
  sizes.push(width);
 }
 const assets=await browser.evaluate('[...document.querySelectorAll("script[src],link[href]")].map(el=>el.src||el.href)');assert(!assets.some(asset=>/^https?:\/\/(localhost|127\.0\.0\.1)/.test(asset)));
 assert.deepEqual(browser.errors,[]);
 const socketResult=await new Promise((resolve,reject)=>{const socket=io(url,{transports:['websocket'],reconnection:false,timeout:12000,auth:{token:'invalid-share-check'}});const timer=setTimeout(()=>{socket.close();reject(new Error('Socket check timed out'))},15000);socket.on('connect',()=>{clearTimeout(timer);socket.close();reject(new Error('Invalid session was accepted'))});socket.on('connect_error',error=>{clearTimeout(timer);socket.close();resolve(error.message)});});
 assert.equal(socketResult,'Authentication required');
 console.log(JSON.stringify({url,loginResponsiveWidths:sizes,localAssetURLs:false,socketAuthentication:socketResult,errors:browser.errors}));
 fs.writeFileSync('.password-recovery/share/browser-check.json',JSON.stringify({sizes,socketResult,errors:browser.errors},null,2));
})().catch(error=>{console.error(error);process.exitCode=1}).finally(async()=>browser?.close());
