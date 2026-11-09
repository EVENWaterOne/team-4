'use strict';
// Real Edge/CDP regression for optional visits, carried cash, staffing, and annual ledgers.
// Every policy and conversation is triggered through the rendered game; no state/result editing.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawn}=require('node:child_process'),{pathToFileURL}=require('node:url'),assert=require('node:assert/strict');
const gameDir=path.resolve(__dirname,'..'),dist=path.join(gameDir,'dist'),single=process.argv.includes('--single');
const executable=process.env.EDGE_PATH||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
assert.ok(fs.existsSync(executable),'Set EDGE_PATH to a preinstalled Edge executable.');
const output=fs.mkdtempSync(path.join(os.tmpdir(),'clementi-resources-browser-'));

const checks=async function(){
 const passed=[],wait=ms=>new Promise(r=>setTimeout(r,ms)),check=(v,label)=>{if(!v)throw new Error(label);passed.push(label);};
 const until=async(fn,label,timeout=15000)=>{const time=performance.now();while(!fn()){if(performance.now()-time>timeout)throw new Error('Timed out: '+label);await wait(35);}};
 const click=s=>{const e=document.querySelector(s);if(!e||e.disabled)throw new Error('Missing or disabled '+s);e.click();};
 const checkpoint=async name=>{window.__resourcesCheckpoint={name,waiting:true};await until(()=>!window.__resourcesCheckpoint.waiting,'capture '+name,20000);};
 try{
  await until(()=>window.HDBScene?.ready&&window.CM_YEAR_APP,'scene');
  const app=window.CM_YEAR_APP,s=app.getState(),E=window.CM_YEARS;for(const i of E.additionalVisits(s).filter(i=>['chen','students'].includes(i.residentId)))E.learn(s,i.id);app.render();
  click('#year-next');check(s.phase==='policy','finish visits enters policy cards');
  click('[data-year-action="choose"][data-policy="capital"]');click('#year-next');
  click('[data-year-action="choose"][data-policy="capital"]');click('#year-next');
  check(s.ux.stage==='review'&&s.cash===100,'execution review reserves resources without settling');
  click('#year-next');await until(()=>window.HDBScene.diagnostics().policyPresentation?.visual==='cover','cover reveal');await wait(1200);
  let projection=window.HDBScene.project('policy','active');check(projection?.visible&&projection.x>470&&projection.x<1070&&projection.y>210&&projection.y<790,'construction target is inside unobscured map workspace');
  check(s.ux.stage==='enact'&&window.HDBScene.diagnostics().policyPresentation.building,'a real construction reveal accompanies the first policy');
  check(window.HDBScene.diagnostics().policyPresentation.durationMs===6000,'building has a full six-second presentation');await checkpoint('focused-build');await until(()=>window.HDBScene.diagnostics().policyPresentation?.stage==='设施落成','complete structure');check(window.HDBScene.diagnostics().policyPresentation.visual==='cover','the first structure completes before the second begins');await checkpoint('completed-build');
  await until(()=>window.HDBScene.diagnostics().policyPresentation?.visual==='corner','corner reveal');await wait(800);projection=window.HDBScene.project('policy','active');check(projection?.visible&&projection.x>470&&projection.x<1070,'second policy has its own visible site');await checkpoint('focused-corner');
  await until(()=>document.querySelector('#game').dataset.phase==='report','annual report');
  check(window.HDBScene.diagnostics().policyPresentation===null,'annual report releases presentation effects');check(s.reports.length===1&&s.report.results.length===2,'animation settles exactly one annual report');
  click('#year-next');const visit=E.additionalVisits(s)[0];E.learn(s,visit.id);app.render();click('#year-next');click('[data-policy="community"]');click('#year-next');click('#year-next');await until(()=>window.HDBScene.diagnostics().policyPresentation?.stars===8,'coordination stars');check(!window.HDBScene.diagnostics().policyPresentation.building,'coordination uses only the circle and star presentation');await wait(800);await checkpoint('coordination-stars');await until(()=>document.querySelector('#game').dataset.phase==='report','coordination report');check(s.reports.length===2,'each presentation settles once');window.__resourcesBrowser={ok:true,passed,scene:window.HDBScene.diagnostics(),projection};
 }catch(error){window.__resourcesBrowser={ok:false,passed,error:error.stack||String(error)};}
};

let html=fs.readFileSync(path.join(single?gameDir:dist,single?'金文泰-AI整合版.html':'index.html'),'utf8');
if(!single)html=html.replace('<head>','<head><base href="'+pathToFileURL(dist+path.sep).href+'">');
html=html.replace('<head>','<head><script>window.__oldSaves={"downstairs-clementi-v1":JSON.stringify({classic:"preserved"}),"downstairs-clementi-campaign-v1":JSON.stringify({fiveDay:"preserved"}),"downstairs-clementi-years-v1":JSON.stringify({annual:"preserved"})};Object.entries(window.__oldSaves).forEach(([k,v])=>localStorage.setItem(k,v));</script>');
html=html.replace('</body>','<script>addEventListener("load",()=>('+checks.toString()+')());</script></body>');
const page=path.join(output,'resources.html');fs.writeFileSync(page,html);
async function main(){
  const wait=ms=>new Promise(r=>setTimeout(r,ms)),args=['--headless=new','--no-first-run','--no-default-browser-check','--disable-extensions','--disable-background-networking','--disable-gpu','--enable-unsafe-swiftshader','--user-data-dir='+path.join(output,'profile'),'--window-size='+(process.env.SMOKE_WIDTH||1440)+',1050','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0',pathToFileURL(page).href];
  const child=spawn(executable,args,{windowsHide:true,stdio:['ignore','ignore','pipe']});let logs='',socket,serial=0;const pending=new Map(),screenshots={};child.stderr.on('data',chunk=>{logs=(logs+chunk).slice(-100000);});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial,timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timed out: '+method));},15000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});
  try{
    const portFile=path.join(output,'profile','DevToolsActivePort'),started=Date.now();while(!fs.existsSync(portFile)){if(Date.now()-started>15000||child.exitCode!==null)throw new Error('No local Edge test endpoint.');await wait(100);}
    const port=fs.readFileSync(portFile,'utf8').split(/\r?\n/)[0],pages=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json(),target=pages.find(p=>p.type==='page'&&p.url===pathToFileURL(page).href)||pages.find(p=>p.type==='page');assert(target,'No resource test page.');socket=new WebSocket(target.webSocketDebuggerUrl);
    socket.addEventListener('message',event=>{const message=JSON.parse(String(event.data)),task=pending.get(message.id);if(!task)return;clearTimeout(task.timer);pending.delete(message.id);message.error?task.reject(new Error(message.error.message)):task.resolve(message.result);});
    await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
    let result;while(!result){
      if(Date.now()-started>150000)throw new Error('Resource browser flow timed out.');
      const response=await send('Runtime.evaluate',{expression:'JSON.stringify({result:window.__resourcesBrowser||null,checkpoint:window.__resourcesCheckpoint||null})',returnByValue:true}),status=JSON.parse(response.result.value||'{}');
      if(status.checkpoint?.waiting&&!screenshots[status.checkpoint.name]){await send('Runtime.evaluate',{expression:'window.HDBScene?.invalidate?.()'});await wait(400);const shot=await send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false}),file=path.join(output,'resources-'+status.checkpoint.name+'.png');fs.writeFileSync(file,Buffer.from(shot.data,'base64'));screenshots[status.checkpoint.name]=file;await send('Runtime.evaluate',{expression:'window.__resourcesCheckpoint.waiting=false'});}
      result=status.result;if(!result)await wait(100);
    }
    await send('Runtime.evaluate',{expression:'window.HDBScene?.invalidate?.()'});await wait(300);const canvas=await send('Runtime.evaluate',{expression:'(()=>{const el=document.querySelector("#world-scene canvas");if(!el)return null;const c=getComputedStyle(el),r=el.getBoundingClientRect();return {display:c.display,visibility:c.visibility,opacity:c.opacity,width:r.width,height:r.height}})()',returnByValue:true});result.canvas=canvas.result.value;
    const dom=await send('Runtime.evaluate',{expression:'document.documentElement.outerHTML',returnByValue:true});fs.writeFileSync(path.join(output,'page.html'),dom.result.value||'');
    const report={...result,assertions:result.passed?.length||0,single,realtime:true,screenshots,output};fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(report,null,2));
    console.log(JSON.stringify(result.ok?{...report,passed:undefined}:report,null,2));assert.equal(result.ok,true,result.error);assert(result.canvas&&result.canvas.display!=='none'&&result.canvas.visibility==='visible'&&Number(result.canvas.opacity)>0&&result.canvas.width>0,'The retained neighbourhood must have a visible real 3D canvas.');
  }finally{
    fs.writeFileSync(path.join(output,'browser.log'),logs);if(socket?.readyState===WebSocket.OPEN){try{await send('Browser.close');}catch(_){}socket.close();}if(child.exitCode===null)child.kill();for(const task of pending.values())clearTimeout(task.timer);
  }
}
main().catch(error=>{console.error(error);console.error('Output: '+output);process.exitCode=1;});
