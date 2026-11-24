const { spawn } = require('node:child_process');
const { mkdtempSync, readFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const WebSocket = require('ws');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function launchBrowser(fixture, assetFixture) {
  const profile = mkdtempSync(path.join(tmpdir(), 'jangdi-pages-ui-'));
  const child = spawn(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-background-networking', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let target;
  for (let n = 0; n < 100; n++) {
    try {
      const port = readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0];
      target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(item => item.type === 'page');
      if (target) break;
    } catch {}
    await delay(100);
  }
  if (!target) { child.kill(); throw new Error('Chrome did not start'); }
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
  let seq = 0;
  let initScript;
  let navigationSequence=0;
  const pending = new Map(), errors = [], unknown = [], mutations = [], cancelledRequests = [];
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
    pending.set(id, { resolve: value => { clearTimeout(timeout); resolve(value); }, reject: error => { clearTimeout(timeout); reject(error); } });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const fulfill = (requestId, result) => send('Fetch.fulfillRequest', {
    requestId, responseCode: result.status || 200,
    responseHeaders: [{ name:'Content-Type', value:'application/json' }, { name:'Access-Control-Allow-Origin', value:'*' }, { name:'Access-Control-Allow-Headers', value:'authorization, content-type' }, { name:'Access-Control-Allow-Methods', value:'GET, OPTIONS, POST, PATCH' }],
    body: Buffer.from(JSON.stringify(result.body)).toString('base64'),
  });
  socket.on('message', message => {
    const event = JSON.parse(message);
    if (event.id) {
      const handler = pending.get(event.id); pending.delete(event.id);
      if (event.error) handler?.reject(new Error(event.error.message)); else handler?.resolve(event.result);
    }
    if (event.method === 'Runtime.exceptionThrown') errors.push(event.params.exceptionDetails.exception?.description || event.params.exceptionDetails.text);
    if (event.method === 'Fetch.requestPaused') (async () => {
      const { requestId, request } = event.params;
      const url = new URL(request.url);
      const asset = assetFixture && await assetFixture(url, request);
      if (asset) return send('Fetch.fulfillRequest', {requestId, responseCode:asset.status || 200, responseHeaders:[{name:'Content-Type',value:asset.contentType || 'image/png'}], body:asset.base64 || ''});
      if (url.pathname.startsWith('/socket.io/')) return send('Fetch.failRequest', { requestId, errorReason:'Aborted' });
      if (url.pathname.startsWith('/api/')) {
        if (request.method === 'OPTIONS') return fulfill(requestId, {body:{}});
        if (request.method !== 'GET') mutations.push({method:request.method,path:url.pathname});
        const result = await fixture(url.pathname.slice(4), url, request);
        if (!result) { unknown.push(`${request.method} ${url.pathname}`); return fulfill(requestId, {status:404,body:{message:'No local fixture'}}); }
        return fulfill(requestId, result);
      }
      // Avoid making Google OAuth or map requests from a fixture session.
      if (/accounts\.google\.com|maps\.google|googleapis\.com\/maps/.test(url.hostname + url.pathname)) return send('Fetch.failRequest', { requestId, errorReason:'Aborted' });
      return send('Fetch.continueRequest', { requestId });
    })().catch(error => {
      // Chrome invalidates paused requests when a navigation cancels them.
      // Record these separately; runtime exceptions and other CDP failures remain failures.
      if (error.message === 'Invalid InterceptionId.') cancelledRequests.push(error.message);
      else errors.push(error.message);
    });
  });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setFocusEmulationEnabled', {enabled:true});
  await send('Fetch.enable', {patterns:[{urlPattern:'*'}]});
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', {expression,returnByValue:true,awaitPromise:true});
    if (result.exceptionDetails) throw new Error(`${result.exceptionDetails.exception?.description}: ${expression}`);
    return result.result.value;
  };
  const until = async expression => {
    for (let n=0; n<100; n++) { if (await evaluate(expression)) return; await delay(100); }
    throw new Error(`Timed out: ${expression}`);
  };
  async function navigate(route, session) {
    if (initScript) await send('Page.removeScriptToEvaluateOnNewDocument', {identifier:initScript});
    const marker=`navigation-${++navigationSequence}`;
    const storage = session ? `localStorage.setItem('jangdi_auth', ${JSON.stringify(JSON.stringify(session))})` : "localStorage.removeItem('jangdi_auth')";
    const source = `window.__uiTestNavigation=${JSON.stringify(marker)};${storage}`;
    initScript = (await send('Page.addScriptToEvaluateOnNewDocument', {source})).identifier;
    await send('Page.navigate', {url:(process.env.HIRER_PREVIEW_URL || 'http://127.0.0.1:5175')+route});
    // A slow tunnel can leave the previous document visible after Page.navigate resolves.
    await until(`window.__uiTestNavigation===${JSON.stringify(marker)} && !!document.querySelector(".app-shell h1, .app-shell h2")`);
    await delay(250);
  }
  async function close() {
    socket.close();
    if (child.exitCode === null) { const exited = new Promise(resolve => child.once('exit', resolve)); child.kill(); await Promise.race([exited,delay(3000)]); }
    // profile is an absolute mkdtemp result; only remove this run's isolated directory.
    if (path.dirname(profile) === tmpdir() && path.basename(profile).startsWith('jangdi-pages-ui-')) {
      try { rmSync(profile, {recursive:true,force:true}); } catch {}
    }
  }
  return {send,evaluate,until,navigate,close,errors,unknown,mutations,cancelledRequests,delay};
}
module.exports = {launchBrowser};
