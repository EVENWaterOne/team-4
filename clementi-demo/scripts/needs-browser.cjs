'use strict';

// Real Edge regression for the resident-led loop, independent of the older AI smoke test.
// Uses an isolated local profile and makes no external model requests.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { spawn, spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const assert = require('node:assert/strict');
const gameDir = path.resolve(__dirname, '..'), dist = path.join(gameDir, 'dist');
const single = process.argv.includes('--single');
const executable = process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
assert.ok(fs.existsSync(executable), 'Set EDGE_PATH to an installed Edge/Chromium executable.');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'clementi-needs-browser-'));
const screenshot = path.join(output, 'resident-needs-complete.png');

const checks = async function () {
  const passed = [];
  const check = (value, label) => { if (!value) throw new Error(label); passed.push(label); };
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const click = selector => {
    const el = document.querySelector(selector);
    if (!el) throw new Error('Missing control: ' + selector);
    if (el.disabled) throw new Error('Disabled control: ' + selector);
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  };
  const resources = s => JSON.stringify([s.time, s.budget, s.trust, s.staffUsed, s.social, s.comfort, s.groups, s.flags, s.projects, s.issues]);
  const closeDialog = () => { if (document.querySelector('#modal').open) click('#modal [data-action="close"]'); };
  const focusButton = () => document.querySelector('#focus-panel .focus-actions button');
  try {
    const app = window.CM_APP, needs = window.CM_NEEDS, engine = window.CM_ENGINE, home = window.CM_HOME;
    check(!!app && !!needs && !!home && !!window.CM_TALK_UI, 'resident needs, dialogue and one-home modules load');
    window.CM_FLOW.showMap(); click('[data-flow-action="details"]'); click('[data-flow-action="enter"]'); await wait(750);
    click('[data-action="tutorial-skip"]');
    // Freeze real elapsed time; construction below advances with the real engine tick.
    if (!app.getPaused()) click('#pause');
    const state = app.getState(), fresh = needs.get(state, 'chen');
    window.__needsInitial = { need: fresh, issues: state.issues.map(i => ({ id:i.id, read:i.read })) };
    check(app.isPlaying() && !window.CM_FLOW.isActive() && document.querySelector('#focus-panel').getBoundingClientRect().width > 0 && document.querySelectorAll('#hand-cards .play-card').length === 3 && !fresh.canConfirm,
      'fresh community shows one focus, three action cards and an unconfirmed opening request');
    check(focusButton()?.dataset.action === 'enter-home', 'the first primary action invites an actual resident visit');
    click('#focus-panel .focus-actions button');
    check(home.isActive('chen') && document.querySelectorAll('#cm-home-panel').length === 1, 'primary action enters only Chen’s home');
    click('[data-home-person="chen"]'); await wait(1300);
    const beforeTalk = resources(state);
    document.querySelector('#cm-talk-question').value = '雨天去食阁，最想先改善什么？';
    document.querySelector('[data-talk-form]').requestSubmit(); await wait(30);
    check(window.CM_TALK.session(state, 'chen').exchanges.length === 1 && !!document.querySelector('[data-talk-confirm-need="chen"]') && resources(state) === beforeTalk,
      'one offline exchange offers explicit confirmation without spending resources');
    click('[data-talk-confirm-need="chen"]');
    check(!document.querySelector('#modal').open && needs.get(state, 'chen').status === 'confirmed' && !!document.querySelector('#focus-panel [data-status="confirmed"]'),
      'confirmation returns to the community with a confirmed focus');
    click('#focus-panel .focus-actions button');
    check(!!document.querySelector('#modal .need-match[data-kind="direct"]') && !!document.querySelector('#modal .need-match[data-kind="partial"]'),
      'the next primary action compares direct improvement with partial support');
    click('#modal [data-action="card"][data-id="cover"]'); click('#modal [data-action="use-card"][data-id="cover"]');
    app.showPlot('route-west'); const budgetBeforeBuild = state.budget; click('[data-action="confirm-placement"]');
    check(state.budget === budgetBeforeBuild - 20 && state.plots['route-west'].status === 'building' && needs.get(state, 'chen').status === 'in_progress',
      'a legal covered route charges exactly 20 and records work in progress');
    closeDialog(); engine.tick(state, 55); app.render(); await wait(300); closeDialog(); app.render();
    check(state.flags.completed.cover && needs.get(state, 'chen').status === 'review' && focusButton()?.dataset.action === 'enter-home' && document.querySelector('#focus-panel').textContent.includes('待回访'),
      'completed work waits for follow-up rather than completing the personal need automatically');
    click('#focus-panel .focus-actions button'); click('[data-home-person="chen"]'); await wait(1300);
    const beforeReview = resources(state); click('[data-talk-review="chen"]');
    const once = JSON.stringify(state.residentNeeds.records.chen), duplicate = needs.review(state, 'chen');
    check(needs.get(state, 'chen').status === 'improved' && needs.campaign(state).complete && resources(state) === beforeReview && !duplicate.ok && JSON.stringify(state.residentNeeds.records.chen) === once && !document.querySelector('[data-talk-review="chen"]'),
      'explicit follow-up fulfils the promise once, with no repeated economic rewards');
    app.showHome('kumar');
    check(needs.get(state, 'kumar').status === 'unknown' && !document.querySelector('#cm-talk-panel .cm-need-card') && !document.querySelector('#cm-talk-panel').textContent.includes('白天照护需要可靠的支持'),
      'an unvisited household does not reveal its fixed need before evidence');
    closeDialog(); app.focusNeed('chen'); app.setLanguage('en');
    const saved = JSON.parse(localStorage.getItem('downstairs-clementi-v1'));
    check(document.querySelector('#focus-panel').textContent.includes('Improved') && saved.state.residentNeeds.records.chen.confirmed && saved.state.residentNeeds.records.chen.reviewedCards.includes('cover') && saved.state.residentTalks.some(s => s.residentId === 'chen' && s.exchanges.length === 1) && !JSON.stringify(saved).includes('apiKey'),
      'English UI and autosave retain the verified need and conversation without credentials');
    app.setLanguage('zh'); app.render(); window.HDBScene?.invalidate?.();
    await Promise.race([new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))), wait(500)]);
    await wait(200);
    check(document.querySelector('#focus-panel').textContent.includes('已改善') && document.querySelector('#game').scrollWidth <= innerWidth + 1,
      'the completed Chinese focus remains visible without horizontal overflow');
    window.__needsBrowser = { ok:true, passed, viewport:{width:innerWidth,height:innerHeight}, scene:window.HDBScene?.diagnostics?.(), adapter:window.CM_SCENE?.diagnostics?.() };
  } catch (error) {
    window.__needsBrowser = { ok:false, passed, error:error.message, stack:error.stack, initial:window.__needsInitial };
  }
  const report = document.createElement('pre'); report.id = 'clementi-needs-result'; report.hidden = true;
  report.textContent = JSON.stringify(window.__needsBrowser); document.body.append(report);
};

let html = fs.readFileSync(path.join(single ? gameDir : dist, single ? '金文泰-AI整合版.html' : 'index.html'), 'utf8');
if (!single) html = html.replace('<head>', '<head><base href="' + pathToFileURL(dist + path.sep).href + '">');
// Keep the production RAF lifecycle: capping frames before entry would hide the WebGL world.
// The test pauses community time above; production pause handling keeps the scene inexpensive.
html = html.replace('</body>', '<script>window.addEventListener("load",()=>(' + checks.toString() + ')());</script></body>');
const page = path.join(output, 'test.html'); fs.writeFileSync(page, html);
const browserArgs = [
  '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
  '--disable-background-networking', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--run-all-compositor-stages-before-draw',
  '--user-data-dir=' + path.join(output, 'profile'), '--window-size=' + (process.env.SMOKE_WIDTH || 1440) + ',1050'
];

// Optional real-time run: virtual-time dump-dom can capture an empty WebGL buffer
// even when the scene rendered correctly. CDP waits for real frames before capture.
async function realtime() {
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const child = spawn(executable, [...browserArgs, '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', pathToFileURL(page).href],
    { windowsHide:true, stdio:['ignore', 'ignore', 'pipe'] });
  let logs = '', socket, serial = 0;
  child.stderr.on('data', chunk => { logs += chunk; });
  const pending = new Map();
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++serial, timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timed out: ' + method)); }, 12000);
    pending.set(id, {resolve, reject, timer}); socket.send(JSON.stringify({id, method, params}));
  });
  try {
    const portFile = path.join(output, 'profile', 'DevToolsActivePort'), started = Date.now();
    while (!fs.existsSync(portFile)) { if (Date.now() - started > 12000 || child.exitCode !== null) throw new Error('Edge did not expose its local test endpoint.'); await wait(100); }
    const port = fs.readFileSync(portFile, 'utf8').split(/\r?\n/)[0];
    const pages = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
    const target = pages.find(item => item.type === 'page' && item.url === pathToFileURL(page).href) || pages.find(item => item.type === 'page');
    assert.ok(target, 'No local game page found.');
    socket = new WebSocket(target.webSocketDebuggerUrl);
    socket.addEventListener('message', event => {
      const message = JSON.parse(String(event.data)), task = pending.get(message.id); if (!task) return;
      clearTimeout(task.timer); pending.delete(message.id); if (message.error) task.reject(new Error(message.error.message)); else task.resolve(message.result);
    });
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, {once:true}); socket.addEventListener('error', reject, {once:true}); });
    let result;
    while (!result) {
      if (Date.now() - started > 40000) throw new Error('Real-time game checks timed out.');
      const reply = await send('Runtime.evaluate', {expression:'JSON.stringify(window.__needsBrowser || null)', returnByValue:true});
      result = JSON.parse(reply.result.value || 'null'); if (!result) await wait(200);
    }
    await send('Runtime.evaluate', {expression:'window.HDBScene?.invalidate?.()'}); await wait(500);
    const canvas = await send('Runtime.evaluate', {expression:'(()=>{const el=document.querySelector("#world-scene canvas");if(!el)return null;const css=getComputedStyle(el),r=el.getBoundingClientRect();return {display:css.display,visibility:css.visibility,opacity:css.opacity,width:r.width,height:r.height}})()', returnByValue:true});
    result.canvas = canvas.result.value;
    assert.ok(result.canvas && result.canvas.display !== 'none' && result.canvas.visibility === 'visible' && Number(result.canvas.opacity) > 0 && result.canvas.width > 0 && result.canvas.height > 0, 'The actual scene canvas must remain visible after home visits.');
    const image = await send('Page.captureScreenshot', {format:'png', fromSurface:true, captureBeyondViewport:false});
    fs.writeFileSync(screenshot, Buffer.from(image.data, 'base64'));
    const dom = await send('Runtime.evaluate', {expression:'document.documentElement.outerHTML', returnByValue:true});
    fs.writeFileSync(path.join(output, 'page.html'), dom.result.value || '');
    console.log(JSON.stringify({...result, single, realtime:true, screenshot, output}, null, 2));
    assert.equal(result.ok, true, result.error);
  } finally {
    fs.writeFileSync(path.join(output, 'browser.log'), logs);
    if (socket?.readyState === WebSocket.OPEN) { try { await send('Browser.close'); } catch (_) {} socket.close(); }
    if (child.exitCode === null) child.kill();
    for (const task of pending.values()) { clearTimeout(task.timer); task.reject(new Error('Browser closed.')); }
  }
}

if (process.argv.includes('--realtime')) {
  realtime().catch(error => { console.error(error); process.exitCode = 1; });
} else {
const run = spawnSync(executable, [...browserArgs,
  '--virtual-time-budget=15000', '--dump-dom', '--screenshot=' + screenshot, pathToFileURL(page).href
], { windowsHide:true, encoding:'utf8', timeout:45000, maxBuffer:20 * 1024 * 1024 });
fs.writeFileSync(path.join(output, 'browser.log'), run.stderr || ''); fs.writeFileSync(path.join(output, 'page.html'), run.stdout || '');
if (run.error) throw run.error;
const match = (run.stdout || '').match(/<pre id="clementi-needs-result"[^>]*>([\s\S]*?)<\/pre>/);
assert.ok(match, 'Browser did not produce a result. See ' + output);
const result = JSON.parse(match[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
console.log(JSON.stringify({ ...result, single, screenshot, output }, null, 2));
assert.equal(result.ok, true, result.error);
}
