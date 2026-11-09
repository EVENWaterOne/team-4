'use strict';

// Real-browser integration check: preinstalled Edge, isolated profile, local files only.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const assert = require('node:assert/strict');
const gameDir = path.resolve(__dirname, '..');
const dist = path.join(gameDir, 'dist');
const single = process.argv.includes('--single');
const executable = process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
assert.ok(fs.existsSync(executable), 'Set EDGE_PATH to a preinstalled Chromium/Edge executable.');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'clementi-ai-browser-'));
const screenshot = path.join(output, 'clementi-resident-ai.png');

const checks = async function () {
  const passed=[];
  const check=(value,label)=>{if(!value)throw new Error(label);passed.push(label);};
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const click=selector=>{const el=document.querySelector(selector);if(!el)throw new Error('Missing control: '+selector);el.dispatchEvent(new MouseEvent('click',{bubbles:true}));};
  const resources=s=>JSON.stringify([s.time,s.budget,s.trust,s.staffUsed,s.groups,s.flags,s.projects,s.issues]);
  const ask=async question=>{document.querySelector('#cm-talk-question').value=question;document.querySelector('[data-talk-form]').requestSubmit();await wait(0);};
  try{
    const app=window.CM_APP,talk=window.CM_TALK,home=window.CM_HOME;
    check(!!app&&!!talk&&!!home&&!!window.CM_MAIL_UI,'Clementi, single-home exploration and envelope modules load');
    check(window.CM_DATA.residents.map(r=>r.id).join(',')==='chen,rahman,lin,kumar,students,huang,zhang,ali','correct eight Clementi households');
    check(!window.Downstairs?.initialState&&!window.V2World,'old game rules and character world are not loaded');
    window.CM_FLOW.showMap();click('[data-flow-action="details"]');click('[data-flow-action="enter"]');await wait(750);
    check(app.isPlaying()&&!window.CM_FLOW.isActive(),'original map and community entry still work');
    click('[data-action="tutorial-skip"]');click('#neighbours [data-id="chen"]');
    check(!!document.querySelector('[data-action="enter-home"]')&&!document.querySelector('#cm-home-panel'),'profile offers an explicit entry into one home');
    click('[data-action="enter-home"]');const state=app.getState(),before=resources(state);
    check(document.querySelector('#modal').classList.contains('home-modal')&&document.querySelectorAll('#cm-home-panel').length===1&&home.isActive('chen'),'only the selected household interior is active');
    check(document.querySelector('#cm-talk-question').disabled&&talk.session(state,'chen')===null,'talking waits until the player approaches and selects the resident');
    click('#cm-home-map [data-home-prop]');await wait(1500);
    const evidence=home.evidence(state,'chen','zh');check(evidence.observations.length===1,'walking to an object records a real indoor observation');
    check(!document.querySelector('#cm-home-panel').textContent.includes('拉赫曼'),'a home scene does not display other households');
    click('[data-home-person="chen"]');await wait(1500);
    check(home.canTalk('chen')&&!document.querySelector('#cm-talk-question').disabled,'walking to the resident enables the conversation');
    const field=document.querySelector('#cm-talk-question'),position=JSON.stringify(state.homeExplorations.chen.position);field.focus();field.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));
    check(JSON.stringify(state.homeExplorations.chen.position)===position,'typing in the dialogue never moves the player');
    await wait(400);check(resources(state)===before&&app.getPaused(),'indoor movement and reading keep the original simulation paused');
    const observation=evidence.observations[0];await ask('我留意到“'+observation.name+'”，这对你的日常有什么影响？');await ask('你现在有什么日常困难？');await ask('你希望我先考虑什么？');
    check(talk.session(state,'chen').exchanges.length===3&&resources(state)===before,'indoor dialogue keeps its three-question limit and does not spend resources');
    check(talk.context(state,'chen').home.observations.some(item=>item.id===observation.id),'AI context contains only inspected objects from this home');
    app.showHome('chen');check(talk.session(state,'chen').exchanges.length===3,'re-entering a home preserves its conversation count');
    click('[data-talk-notes]');check(!!document.querySelector('.cm-talk-history'),'the notebook preserves indoor conversations');
    click('[data-talk-card="cover"]');check(resources(state)===before&&!!document.querySelector('[data-action="use-card"][data-id="cover"]'),'suggestions only inspect the original action card');
    click('[data-action="use-card"][data-id="cover"]');app.showPlot('route-west');click('[data-action="confirm-placement"]');
    check(state.budget===70&&state.plots['route-west'].status==='building'&&!state.flags.completed.cover,'original construction still costs 20 and retains its work duration');
    app.showHome('kumar');check(!home.isActive('chen')&&home.isActive('kumar')&&document.querySelectorAll('#cm-home-panel').length===1,'entering a different household releases the earlier home');
    check(home.evidence(state,'kumar').observations.length===0,'household exploration evidence is isolated');
    click('[data-home-person="kumar"]');await wait(1500);await ask('你们家白天照护长辈的困难是什么？');
    check(/照护|长辈|服务/.test(talk.session(state,'kumar').exchanges[0].reply),'Kumar and Devi retain their caregiving identity');
    app.setLanguage('en');check(document.querySelector('#cm-talk-panel').textContent.includes('Offline demo'),'indoor interface follows the original game language');
    click('[data-talk-settings]');document.querySelector('[data-talk-settings-form]').requestSubmit();
    check(document.querySelector('#modal-title').textContent==='Resident dialogue settings','dialogue settings remain usable from inside a home');
    click('[data-talk-close]');window.CM_ENGINE.tick(state,60);app.render();
    const mailbox=document.querySelector('#mailbox');check(mailbox.classList.contains('is-envelope')&&mailbox.classList.contains('is-arriving')&&Number(mailbox.querySelector('.mailbox-count').textContent)>0,'new private mail visibly arrives as a folded envelope');
    check(mailbox.getBoundingClientRect().left<65,'the envelope is positioned at the left screen edge');
    const deliveries=mailbox.dataset.mailDelivery;app.render();app.render();check(mailbox.dataset.mailDelivery===deliveries,'ordinary renders do not replay a mail delivery');
    mailbox.click();check(!!document.querySelector('.mail-list'),'the animated envelope opens the original resident inbox');
    click('.mail-list [data-action="issue"][data-id="housing"]');check(state.issues.find(issue=>issue.id==='housing').read,'opening a private letter still marks it as read');
    app.setLanguage('zh');app.showHome('kumar');click('[data-home-person="kumar"]');await wait(800);
    const saved=JSON.parse(localStorage.getItem('downstairs-clementi-v1'));
    check(saved.state.residentTalks.some(s=>s.residentId==='kumar'&&s.exchanges.length===1)&&saved.state.homeExplorations.chen.seen.length>0&&!JSON.stringify(saved).includes('apiKey'),'autosave retains household exploration and dialogue without credentials');
    check(document.querySelector('#modal').scrollWidth<=document.querySelector('#modal').clientWidth+1,'the home and dialogue fit the dialog width');
    if(window.__smokeShowMail){click('[data-home-exit]');document.querySelector('#pause').onclick();window.CM_ENGINE.tick(state,60);app.render();await wait(700);}
    window.__clementiSmoke={ok:true,passed,viewport:{width:innerWidth,height:innerHeight}};
  }catch(error){window.__clementiSmoke={ok:false,passed,error:error.message,stack:error.stack};}
  const report=document.createElement('pre');report.id='clementi-browser-result';report.hidden=true;report.textContent=JSON.stringify(window.__clementiSmoke);document.body.append(report);
};

let html = fs.readFileSync(path.join(single ? gameDir : dist, single ? '金文泰-AI整合版.html' : 'index.html'), 'utf8');
if (!single) html = html.replace('<head>', '<head><base href="' + pathToFileURL(dist + path.sep).href + '">');
// Render a few scene frames, then keep the artwork still during DOM checks.
// The complete scene geometry/motion has its own upstream regression checks.
html = html.replace('<head>', '<head><script>window.__smokeShowMail=' + JSON.stringify(process.argv.includes('--mail')) + ';{const raf=window.requestAnimationFrame.bind(window);let frames=0;window.requestAnimationFrame=fn=>frames++<3?raf(fn):0;}</script>');
html = html.replace('</body>', '<script>window.addEventListener("load",()=>(' + checks.toString() + ')());</script></body>');
const page = path.join(output, 'test.html'); fs.writeFileSync(page, html);
const run = spawnSync(executable, [
  '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
  '--disable-background-networking', '--disable-gpu', '--enable-unsafe-swiftshader',
  '--user-data-dir=' + path.join(output, 'profile'), '--window-size=' + (process.env.SMOKE_WIDTH || 1440) + ',1050',
  '--virtual-time-budget=11000', '--dump-dom', '--screenshot=' + screenshot, pathToFileURL(page).href
], { windowsHide: true, encoding: 'utf8', timeout: 45000, maxBuffer: 20 * 1024 * 1024 });
fs.writeFileSync(path.join(output, 'browser.log'), run.stderr || '');
fs.writeFileSync(path.join(output, 'page.html'), run.stdout || '');
if (run.error) throw run.error;
const match = (run.stdout || '').match(/<pre id="clementi-browser-result"[^>]*>([\s\S]*?)<\/pre>/);
assert.ok(match, 'Browser did not produce a result. See ' + output);
const result = JSON.parse(match[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
console.log(JSON.stringify({ ...result, single, screenshot, output }, null, 2));
assert.equal(result.ok, true, result.error);
