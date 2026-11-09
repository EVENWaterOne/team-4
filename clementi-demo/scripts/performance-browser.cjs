'use strict';

// Controlled, real-browser work counters. This is not an FPS benchmark.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process'),{pathToFileURL}=require('node:url');
const root=path.resolve(process.argv.find(a=>a.startsWith('--root='))?.slice(7)||path.join(__dirname,'..'));
const output=fs.mkdtempSync(path.join(os.tmpdir(),'clementi-perf-measure-'));
const dist=path.join(root,'dist'),bundle=fs.readFileSync(path.join(dist,'scene.bundle.js'),'utf8');
const calls=bundle.match(/renderer\.render\(\s*scene\s*,\s*camera\s*\)/g)||[];
assert.ok(calls.length>=1,'Expected a scene draw entry for work counting.');
fs.writeFileSync(path.join(output,'measured-scene.js'),bundle.replace(/renderer\.render\(\s*scene\s*,\s*camera\s*\)/g,'(window.__perfProbe.draws++,renderer.render(scene,camera))'));
const controls=`<script>window.__perfProbe={draws:0,writes:0,pending:new Map(),serial:0};{const p=window.__perfProbe;window.requestAnimationFrame=fn=>{const id=++p.serial;p.pending.set(id,fn);return id;};window.cancelAnimationFrame=id=>p.pending.delete(id);const set=Storage.prototype.setItem;Storage.prototype.setItem=function(...a){p.writes++;return set.apply(this,a);};}</script>`;
const measure=async function(){
 const p=window.__perfProbe;let clock=performance.now();
 const frames=n=>{let ms=0;for(let i=0;i<n;i++){clock+=40;const callbacks=[...p.pending.values()];p.pending.clear();const t=performance.now();callbacks.forEach(fn=>fn(clock));ms+=performance.now()-t;}return ms;};
 const click=s=>{const node=document.querySelector(s);if(!node)throw new Error('Missing '+s);node.dispatchEvent(new MouseEvent('click',{bubbles:true}));};
 const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 try{
  if(!window.HDBScene?.ready)throw new Error('WebGL scene did not initialise');
  window.CM_FLOW.isActive=()=>false;
  document.querySelector('#entry-flow')?.remove();
  const app=window.CM_APP;app.enterCase({resume:false});click('[data-action="tutorial-skip"]');app.showResident('chen');app.render();
  frames(3);const drawBefore=p.draws,pausedCpuMs=frames(12),pausedDraws=p.draws-drawBefore;
  const observer=new MutationObserver(()=>{});observer.observe(document.body,{subtree:true,attributes:true,childList:true,characterData:true});
  const t=performance.now();for(let i=0;i<20;i++)app.render();const repeatedUiCpuMs=performance.now()-t,uiMutations=observer.takeRecords().length;observer.disconnect();
  const beforeZoom=p.draws;window.HDBScene.zoom(.12);frames(2);const cameraDraws=p.draws-beforeZoom;
  click('#modal [data-action="close"]');await wait(0);app.render();const runningBefore=p.draws;let runningCpuMs=0;
  for(let i=0;i<6;i++){window.CM_ENGINE.tick(app.getState(),.04);app.render();runningCpuMs+=frames(1);}const runningDraws=p.draws-runningBefore;
  app.showHome('chen');const state=app.getState(),budget=state.budget,simTime=state.time,writeBefore=p.writes;
  click('[data-home-tile="8,6"]');await wait(1500);const walkingWrites=p.writes-writeBefore;
  if(JSON.stringify(state.homeExplorations.chen.position)!=='[8,6]'||state.time!==simTime||state.budget!==budget)throw new Error('Room movement or pause semantics changed: '+JSON.stringify({position:state.homeExplorations.chen.position,time:state.time,simTime,budget:state.budget,expectedBudget:budget,modalOpen:document.querySelector('#modal').open,active:window.CM_HOME.isActive('chen')}));
  Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));
  const beforeHidden=p.draws;frames(5);const hiddenDraws=p.draws-beforeHidden;
  Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));frames(1);
  window.__perfResult={ok:true,pausedFramesOffered:12,pausedDraws,pausedCpuMs:Number(pausedCpuMs.toFixed(2)),repeatedUiCalls:20,uiMutations,repeatedUiCpuMs:Number(repeatedUiCpuMs.toFixed(2)),cameraDraws,runningDraws,runningCpuMs:Number(runningCpuMs.toFixed(2)),walkingWrites,hiddenDraws,scene:window.HDBScene.diagnostics(),viewport:{width:innerWidth,height:innerHeight}};
 }catch(error){window.__perfResult={ok:false,error:error.message,stack:error.stack};}
 const node=document.createElement('pre');node.id='perf-result';node.hidden=true;node.textContent=JSON.stringify(window.__perfResult);document.body.append(node);
};
let html=fs.readFileSync(path.join(dist,'index.html'),'utf8').replace('<head>','<head><base href="'+pathToFileURL(dist+path.sep).href+'">'+controls);
html=html.replace('src="scene.bundle.js"','src="'+pathToFileURL(path.join(output,'measured-scene.js')).href+'"');
html=html.replace('</body>','<script>window.addEventListener("load",()=>('+measure.toString()+')());</script></body>');
const page=path.join(output,'test.html');fs.writeFileSync(page,html);
const browser=process.env.EDGE_PATH||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const run=spawnSync(browser,['--headless=new','--no-first-run','--no-default-browser-check','--disable-extensions','--disable-background-networking','--disable-gpu','--enable-unsafe-swiftshader','--user-data-dir='+path.join(output,'profile'),'--window-size=960,720','--virtual-time-budget=6000','--dump-dom',pathToFileURL(page).href],{windowsHide:true,encoding:'utf8',timeout:45000,maxBuffer:20*1024*1024});
fs.writeFileSync(path.join(output,'browser.log'),run.stderr||'');fs.writeFileSync(path.join(output,'page.html'),run.stdout||'');
if(run.error)throw run.error;
const match=(run.stdout||'').match(/<pre id="perf-result"[^>]*>([\s\S]*?)<\/pre>/);assert.ok(match,'No result; inspect '+output);
const result=JSON.parse(match[1].replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&'));
result.root=root;result.output=output;result.offlineBytes=fs.statSync(path.join(root,'金文泰-AI整合版.html')).size;
fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));assert.equal(result.ok,true,result.error);
