'use strict';
// Exact iframe viewports avoid the minimum width of headless Edge windows.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawn,spawnSync}=require('node:child_process'),{pathToFileURL}=require('node:url');
const assert=require('node:assert/strict');
const gameDir=path.resolve(__dirname,'..'),dist=path.join(gameDir,'dist');
const arg=name=>process.argv[process.argv.indexOf(name)+1];
const width=Number(arg('--width'))||1440,height=Number(arg('--height'))||900;
const output=fs.mkdtempSync(path.join(os.tmpdir(),'clementi-campaign-layout-'));
const edge=process.env.EDGE_PATH||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const checks=async function(){
 const passed=[],rects={},wait=ms=>new Promise(r=>setTimeout(r,ms));
 const check=(value,label)=>{if(!value)throw new Error(label);passed.push(label);};
 const click=q=>{const el=document.querySelector(q);if(!el)throw new Error('Missing '+q);if(el.disabled)throw new Error('Disabled '+q);el.click();};
 const box=el=>{if(typeof el==='string')el=document.querySelector(el);const r=el.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),right:Math.round(r.right),bottom:Math.round(r.bottom)};};
 const overlap=(a,b)=>Math.min(a.right,b.right)-Math.max(a.x,b.x)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>1;
 const horizontal=(el,label)=>{const r=box(el);check(r.x>=-1&&r.right<=innerWidth+1,label+' stays within width');check(el.scrollWidth<=el.clientWidth+1,label+' has no horizontal content overflow');};
 const close=()=>{if(document.querySelector('#modal').open)click('#modal [data-cp-action="close"]');};
 function dialog(label){const el=document.querySelector('#modal'),r=box(el);check(el.open,label+' opens');horizontal(el,label);check(r.y>=-1&&r.bottom<=innerHeight+1,label+' stays inside viewport');check(/auto|scroll/.test(getComputedStyle(el).overflowY),label+' supports native vertical scrolling');const body=el.querySelector('.modal-body');horizontal(body,label+' body');}
 function main(label){
  const ids={header:'.campaign-header',resources:'#campaign-resources',requests:'.campaign-requests',plan:'.campaign-plan',roster:'.campaign-roster',map:'#world-scene'};
  rects[label]=Object.fromEntries(Object.entries(ids).map(([k,q])=>[k,box(q)]));
  check(document.querySelectorAll('.request-card').length===3,label+': exactly three daily requests');
  check(document.querySelectorAll('.cp-resource').length===4,label+': day, budget, staff and visits visible');
  for(const [k,q]of Object.entries(ids))horizontal(document.querySelector(q),label+': '+k);
  for(const [a,b]of [['header','requests'],['requests','plan'],['requests','roster'],['plan','roster']])check(!overlap(rects[label][a],rects[label][b]),label+': '+a+' does not overlap '+b);
  check(document.documentElement.scrollWidth<=innerWidth+1,label+': page has no horizontal scroll');
  for(const strong of document.querySelectorAll('.cp-resource strong')){const range=document.createRange();range.selectNodeContents(strong);const r=range.getBoundingClientRect(),holder=strong.closest('.cp-resource').getBoundingClientRect();check(r.left>=holder.left-1&&r.right<=holder.right+1,label+': resource value remains readable');}
  const button=document.querySelector('#advance-day');check(box(button).w>150&&getComputedStyle(button).display!=='none',label+': execute action visible');
  if(innerWidth<=820){check(rects[label].map.h>=230,label+': mobile map is at least 230px');check(document.documentElement.scrollHeight>innerHeight,label+': mobile content scrolls as a page');check(rects[label].map.bottom<=rects[label].requests.y+1,label+': map precedes requests');check(rects[label].requests.bottom<=rects[label].plan.y+1,label+': plan follows requests');}
 }
 let result;
 try{
  check(!!window.CM_CAMPAIGN_APP&&!!window.CM_CAMPAIGN,'rebuilt app and engine load');
  if(document.querySelector('[data-cp-action="start"]'))click('[data-cp-action="start"]');await wait(500);main('Fresh plan');
  const app=window.CM_CAMPAIGN_APP,E=window.CM_CAMPAIGN,s=app.getState();
  app.showOptions(E.requests(s)[0].id);dialog('Options');check(document.querySelectorAll('.option-card').length>=2,'several approaches can be compared');click('.option-card:not(:disabled)');await wait(50);main('Reserved plan');
  check(!!document.querySelector('.plan-row'),'a selected action appears in the plan');horizontal(document.querySelector('.plan-row'),'plan row');
  const row=document.querySelector('.plan-row'),title=row.querySelector('div'),remove=row.querySelector('button');check(!overlap(box(title),box(remove)),'plan title and remove control do not overlap');
  app.showHome('chen');await wait(50);dialog('One-home exploration');check(document.querySelectorAll('#cm-home-panel').length===1,'one home remains mounted');horizontal(document.querySelector('.cm-home-board'),'indoor map');close();
  app.advance();dialog('Daily report');check(document.querySelectorAll('.report-result').length===3,'report shows all three consequences');check(!!document.querySelector('[data-cp-action="next-day"]'),'next day action available');click('[data-cp-action="next-day"]');await wait(50);main('Second day');
  app.restart();click('[data-cp-action="new-game"]');click('[data-cp-action="start"]');await wait(700);window.scrollTo(0,0);
  result={ok:true,viewport:{width:innerWidth,height:innerHeight},passed,rects};
 }catch(e){result={ok:false,viewport:{width:innerWidth,height:innerHeight},passed,rects,error:e.message,stack:e.stack};}
 parent.postMessage({campaignLayout:result},'*');
};
let html=fs.readFileSync(path.join(dist,'index.html'),'utf8').replace('<head>','<head><base href="'+pathToFileURL(dist+path.sep).href+'">');
html=html.replace('</body>','<script>addEventListener("load",()=>('+checks.toString()+')());</script></body>');
const escape=s=>s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const shell='<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#172637"><iframe style="display:block;border:0;width:'+width+'px;height:'+height+'px" srcdoc="'+escape(html)+'"></iframe><pre id="layout-result" hidden></pre><script>addEventListener("message",e=>{if(e.data.campaignLayout)document.getElementById("layout-result").textContent=JSON.stringify(e.data.campaignLayout)})</script></body></html>';
const page=path.join(output,'layout.html'),screenshot=path.join(output,'campaign-plan.png');fs.writeFileSync(page,shell);
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
