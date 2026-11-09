'use strict';
// Exact iframe viewports avoid the minimum width of headless Edge windows.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawn,spawnSync}=require('node:child_process'),{pathToFileURL}=require('node:url');
const assert=require('node:assert/strict');
const gameDir=path.resolve(__dirname,'..'),dist=path.join(gameDir,'dist');
const arg=name=>process.argv[process.argv.indexOf(name)+1];
const width=Number(arg('--width'))||1440,height=Number(arg('--height'))||900;
const output=fs.mkdtempSync(path.join(os.tmpdir(),'clementi-year-layout-'));
const edge=process.env.EDGE_PATH||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const checks=async function(){
 const passed=[],rects={},wait=ms=>new Promise(r=>setTimeout(r,ms));
 const check=(ok,label)=>{if(!ok)throw new Error(label);passed.push(label);};
 const click=q=>{const el=document.querySelector(q);if(!el)throw new Error('Missing '+q);if(el.disabled)throw new Error('Disabled '+q);el.click();};
 const box=el=>{if(typeof el==='string')el=document.querySelector(el);const r=el.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),right:Math.round(r.right),bottom:Math.round(r.bottom)};};
 const overlap=(a,b)=>Math.min(a.right,b.right)-Math.max(a.x,b.x)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>1;
 const horizontal=(el,label)=>{const r=box(el);check(r.x>=-1&&r.right<=innerWidth+1,label+' within viewport width');check(el.scrollWidth<=el.clientWidth+1,label+' no horizontal content overflow');};
 const close=()=>{if(document.querySelector('#modal').open)click('#modal [data-year-action="close"]');};
 const textFits=(el,label)=>{const range=document.createRange();range.selectNodeContents(el);const r=range.getBoundingClientRect(),holder=el.getBoundingClientRect();check(r.left>=holder.left-1&&r.right<=holder.right+1,label+' text fits');};
 function dialog(label){const el=document.querySelector('#modal'),r=box(el);check(el.open,label+' opens');horizontal(el,label);check(r.y>=-1&&r.bottom<=innerHeight+1,label+' within viewport height');check(/auto|scroll/.test(getComputedStyle(el).overflowY),label+' native vertical scrolling');horizontal(el.querySelector('.modal-body'),label+' body');}
 function audit(label,phase){
  window.scrollTo(0,0);const ids={header:'.year-header',goals:'#year-goals',strip:'.year-strip',main:'.year-main',cta:'#year-next',map:'#world-scene'};
  rects[label]=Object.fromEntries(Object.entries(ids).map(([k,q])=>[k,box(q)]));
  for(const [name,q]of Object.entries(ids))horizontal(document.querySelector(q),label+' '+name);
  for(const [a,b]of [['header','strip'],['header','main'],['strip','main']])check(!overlap(rects[label][a],rects[label][b]),label+' '+a+' does not cover '+b);
  check(document.querySelectorAll('.goal-meter').length===3,label+' three visible goals');
  check(document.querySelector('#year-budget').hidden===(phase!=='policy'),label+' budget only in policy step');
  check(rects[label].cta.h>=43&&rects[label].cta.w>180,label+' one prominent next action');
  for(const el of document.querySelectorAll('.goal-meter strong'))textFits(el,label+' goal');
  check(document.documentElement.scrollWidth<=innerWidth+1,label+' page no horizontal scroll');
  if(innerWidth<=820){check(rects[label].map.h>=180&&rects[label].map.h<=230,label+' compact mobile map');check(rects[label].map.bottom<=rects[label].main.y+1,label+' map before current step');check(/auto|scroll/.test(getComputedStyle(document.body).overflowY)&&document.documentElement.scrollHeight>=innerHeight,label+' natural page scrolling');if(phase==='policy')check(document.documentElement.scrollHeight>innerHeight,label+' long policy content can scroll');check(getComputedStyle(document.querySelector('.year-header')).position==='sticky',label+' goals stay in sticky header');}
 }
 let result;
 try{
  check(!!window.CM_YEAR_APP&&!!window.CM_YEARS,'annual app and engine load');
  const app=window.CM_YEAR_APP,E=window.CM_YEARS,s=app.getState();await wait(250);audit('Visit','visit');
  check(document.querySelectorAll('.visit-card').length===2,'visit has exactly two households');
  // Typography fixtures only; the annual model and its outcomes are never changed.
  for(const n of [0,70,100])for(const el of document.querySelectorAll('.goal-meter strong')){const saved=el.innerHTML;el.innerHTML=n+'<small>/70</small>';textFits(el,'goal typography '+n+'/70');el.innerHTML=saved;}
  app.showHome(E.issues(s)[0].id);await wait(60);dialog('Retained small room');horizontal(document.querySelector('.cm-home-board'),'room map');check(document.querySelectorAll('#cm-home-panel').length===1,'one home is mounted');
  click('[data-year-talk-settings]');dialog('Dialogue settings');close();
  click('[data-year-action="notes"]');dialog('Notebook');close();
  E.issues(s).forEach(i=>check(E.learn(s,i.id).ok,'real annual learn API'));check(E.summarize(s).ok,'real annual summary API');app.render();audit('Needs','needs');
  check(document.querySelectorAll('.needs-summary article').length===2,'two concise needs');
  for(const el of document.querySelectorAll('.needs-summary article>.ui-icon:last-child'))check(box(el).w<=20,'summary check icon stays compact');
  check(E.beginPolicies(s).ok,'real annual policy phase');app.render();audit('Policies','policy');
  check(document.querySelectorAll('.policy-option').length===3,'three policy choices');
  for(const el of document.querySelectorAll('.policy-option'))horizontal(el,'policy card');
  for(const i of E.issues(s)){const p=i.policies.find(p=>p.cost===1);check(E.choose(s,i.id,p.id).ok,'real balanced policy chosen');}app.render();audit('Chosen policies','policy');
  for(const el of document.querySelectorAll('.policy-effects,.policy-cost'))horizontal(el,'policy numeric effects');
  check(E.resolveYear(s).ok,'real annual settlement');app.render();audit('Annual report','report');
  check(document.querySelectorAll('.report-metrics>div').length===3,'report has three goal changes');
  for(const el of document.querySelectorAll('.report-metrics strong'))horizontal(el,'report value');
  while(s.year<10){check(E.nextYear(s).ok,'next annual round');E.issues(s).forEach(i=>E.learn(s,i.id));E.summarize(s);E.beginPolicies(s);for(const i of E.issues(s))E.choose(s,i.id,i.policies.find(p=>p.cost===1).id);check(E.resolveYear(s).ok,'next year settles');}
  app.render();audit('Ten-year ending','ended');check(s.year===10&&!!s.outcome,'ten real annual rounds reach an ending');
  for(const el of document.querySelectorAll('.report-metrics strong'))horizontal(el,'ending value');
  app.restart();click('[data-year-action="new-game"]');await wait(250);window.scrollTo(0,0);window.HDBScene?.invalidate?.();
  result={ok:true,viewport:{width:innerWidth,height:innerHeight},passed,rects};
 }catch(e){result={ok:false,viewport:{width:innerWidth,height:innerHeight},passed,rects,error:e.message,stack:e.stack};}
 parent.postMessage({campaignLayout:result},'*');
};
let html=fs.readFileSync(path.join(dist,'index.html'),'utf8').replace('<head>','<head><base href="'+pathToFileURL(dist+path.sep).href+'">');
html=html.replace('</body>','<script>addEventListener("load",()=>('+checks.toString()+')());</script></body>');
const escape=s=>s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const shell='<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#172637"><iframe style="display:block;border:0;width:'+width+'px;height:'+height+'px" srcdoc="'+escape(html)+'"></iframe><pre id="layout-result" hidden></pre><script>addEventListener("message",e=>{if(e.data.campaignLayout)document.getElementById("layout-result").textContent=JSON.stringify(e.data.campaignLayout)})</script></body></html>';
const page=path.join(output,'layout.html'),screenshot=path.join(output,'year-visit.png');fs.writeFileSync(page,shell);
async function realtime(){
 const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const child=spawn(edge,['--headless=new','--no-first-run','--no-default-browser-check','--disable-extensions','--disable-background-networking','--disable-gpu','--enable-unsafe-swiftshader','--user-data-dir='+path.join(output,'profile'),'--window-size='+Math.max(width+24,560)+','+(height+100),'--remote-debugging-address=127.0.0.1','--remote-debugging-port=0',pathToFileURL(page).href],{windowsHide:true,stdio:['ignore','ignore','pipe']});
 let logs='',socket,serial=0;child.stderr.on('data',chunk=>logs+=chunk);const pending=new Map();
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial,timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout '+method));},12000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});
 try{
  const portFile=path.join(output,'profile','DevToolsActivePort'),started=Date.now();
  while(!fs.existsSync(portFile)){if(Date.now()-started>12000||child.exitCode!==null)throw new Error('No Edge test endpoint');await wait(100);}
  const port=fs.readFileSync(portFile,'utf8').split(/\r?\n/)[0],pages=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json(),target=pages.find(p=>p.type==='page'&&p.url===pathToFileURL(page).href)||pages.find(p=>p.type==='page');
  assert.ok(target,'No local layout page');socket=new WebSocket(target.webSocketDebuggerUrl);
  socket.addEventListener('message',event=>{const m=JSON.parse(String(event.data)),task=pending.get(m.id);if(!task)return;clearTimeout(task.timer);pending.delete(m.id);m.error?task.reject(new Error(m.error.message)):task.resolve(m.result);});
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  let report;while(!report){if(Date.now()-started>35000)throw new Error('Layout checks timed out');const r=await send('Runtime.evaluate',{expression:'document.querySelector("#layout-result").textContent',returnByValue:true});report=r.result.value?JSON.parse(r.result.value):null;if(!report)await wait(150);}
  await send('Runtime.evaluate',{expression:'document.querySelector("iframe").contentWindow.HDBScene?.invalidate?.()'});await wait(3600);
  const image=await send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false,clip:{x:0,y:0,width,height,scale:1}});fs.writeFileSync(screenshot,Buffer.from(image.data,'base64'));
  const dom=await send('Runtime.evaluate',{expression:'document.documentElement.outerHTML',returnByValue:true});fs.writeFileSync(path.join(output,'page.html'),dom.result.value||'');
  console.log(JSON.stringify({...report,realtime:true,screenshot,output},null,2));assert.equal(report.ok,true,report.error);
 }finally{fs.writeFileSync(path.join(output,'browser.log'),logs);if(socket?.readyState===WebSocket.OPEN){try{await send('Browser.close');}catch(_){}socket.close();}if(child.exitCode===null)child.kill();for(const p of pending.values()){clearTimeout(p.timer);p.reject(new Error('Browser closed'));}}
}
if(process.argv.includes('--realtime')){realtime().catch(error=>{console.error(error);process.exitCode=1;});}else{
const run=spawnSync(edge,['--headless=new','--no-first-run','--no-default-browser-check','--disable-extensions','--disable-background-networking','--disable-gpu','--enable-unsafe-swiftshader','--user-data-dir='+path.join(output,'profile'),'--window-size='+Math.max(width+24,560)+','+(height+100),'--virtual-time-budget=4500','--dump-dom','--screenshot='+screenshot,pathToFileURL(page).href],{windowsHide:true,encoding:'utf8',timeout:45000,maxBuffer:25*1024*1024});
fs.writeFileSync(path.join(output,'browser.log'),run.stderr||'');fs.writeFileSync(path.join(output,'page.html'),run.stdout||'');if(run.error)throw run.error;
const match=(run.stdout||'').match(/<pre id="layout-result"[^>]*>([\s\S]*?)<\/pre>/);assert.ok(match,'No browser report; see '+output);
const report=JSON.parse(match[1].replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&'));
console.log(JSON.stringify({...report,screenshot,output},null,2));assert.equal(report.ok,true,report.error);
}
