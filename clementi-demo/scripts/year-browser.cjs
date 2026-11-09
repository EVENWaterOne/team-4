'use strict';
// Real Edge/CDP coverage for the annual story flow. No external model requests.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawn}=require('node:child_process'),{pathToFileURL}=require('node:url'),assert=require('node:assert/strict');
const gameDir=path.resolve(__dirname,'..'),dist=path.join(gameDir,'dist'),single=process.argv.includes('--single');
const executable=process.env.EDGE_PATH||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
assert.ok(fs.existsSync(executable),'Set EDGE_PATH to a preinstalled Edge executable.');
const output=fs.mkdtempSync(path.join(os.tmpdir(),'clementi-year-browser-'));

const checks=async function(){
  const passed=[],wait=ms=>new Promise(r=>setTimeout(r,ms));
  const check=(value,label)=>{if(!value)throw new Error(label);passed.push(label);};
  const until=async(fn,label,timeout=12000)=>{const started=performance.now();while(!fn()){if(performance.now()-started>timeout)throw new Error('Timed out: '+label);await wait(35);}};
  const click=selector=>{const el=document.querySelector(selector);if(!el)throw new Error('Missing '+selector);if(el.disabled)throw new Error('Disabled '+selector);if(typeof el.click==='function')el.click();else el.dispatchEvent(new MouseEvent('click',{bubbles:true}));};
  const checkpoint=async name=>{window.__yearCheckpoint={name,waiting:true};await until(()=>window.__yearCheckpoint.waiting===false,'capture '+name,20000);};
  const close=()=>{if(document.querySelector('#modal').open)click('#modal [data-year-action="close"]');};
  try{
    await until(()=>window.CM_YEAR_APP&&window.CM_YEARS&&window.CM_YEAR_TALK&&window.CM_HOME,'annual modules');
    const app=window.CM_YEAR_APP,E=window.CM_YEARS,s=app.getState();
    check(s.mode==='years-v1'&&!window.CM_CAMPAIGN&&!window.CM_ENGINE&&!window.CM_NEEDS,'only the annual decision engine owns the default game');
    check(s.year===1&&s.phase==='visit'&&E.issues(s).length===2&&Object.values(s.metrics).every(v=>v===50),'a new story begins in year one with two simple visits and three clear goals');
    check(document.querySelector('#year-budget').hidden&&document.querySelectorAll('.goal-meter').length===3,'budget stays out of the visit screen while all three goals remain visible');
    const initialIssue=E.issues(s)[0];check(!E.choose(s,initialIssue.id,'balanced').ok&&!document.querySelector('.policy-option'),'policies cannot be selected before the annual needs are understood');
    let firstMetrics=JSON.stringify(s.metrics);
    for(let year=1;year<=10;year++){
      const list=E.issues(s);check(s.year===year&&s.phase==='visit','year '+year+' starts with visits');
      click('#year-next');
      for(let index=0;index<list.length;index++){
        const item=list[index];await until(()=>document.querySelector('#year-talk-panel')?.dataset.yearTalkIssue===item.id&&window.CM_HOME.isActive(item.residentId),'open current annual home');
        if(year===1&&index===0){check(document.querySelectorAll('#cm-home-panel').length===1&&document.querySelector('[data-year-talk-listen]'),'one room has one clear listen button');await checkpoint('visit');}
        click('[data-year-talk-listen]');await until(()=>E.learned(s,item.id),'one conversation learns '+item.id);
        const record=s.caseTalks.find(r=>r.year===year&&r.issueId===item.id);
        check(record?.exchanges.length===1,'year '+year+' visit '+(index+1)+' needs only one reply');
        check(!document.querySelector('[data-year-talk-listen]')&&document.querySelector('[data-year-talk-continue]'),'learned visit has a single continue action');
        if(year===1){check(window.CM_HOME.evidence(s,item.residentId).observations.length===0,'first-year need is understood without object collection');check(JSON.stringify(s.metrics)===firstMetrics&&s.budget===3&&E.choices(s).length===0,'the visit cannot spend the annual budget or choose a policy');}
        click('[data-year-talk-continue]');
      }
      await until(()=>s.phase==='needs'&&!document.querySelector('#modal').open,'needs summary');
      check(document.querySelectorAll('.needs-summary article').length===2&&E.issues(s).every(i=>E.learned(s,i.id)),'year '+year+' summarizes both actual resident needs');
      check(document.querySelector('#year-budget').hidden,'needs summary remains free from budget controls');
      click('#year-next');check(s.phase==='policy'&&!document.querySelector('#year-budget').hidden,'year '+year+' begins policy decisions after the needs summary');
      const before=JSON.stringify(s.metrics);
      if(year===1){
        click('[data-year-action="choose"][data-policy="focused"]');check(E.choices(s)[0].policyId==='focused'&&JSON.stringify(s.metrics)===before&&s.budget===3,'a policy choice is only a preview, without spending or changing goals');
        click('[data-year-action="choose"][data-policy="maintain"]');check(E.choices(s)[0].policyId==='maintain'&&JSON.stringify(s.metrics)===before&&s.budget===3,'a policy can be changed without duplicate charges');
      }
      click('[data-year-action="choose"][data-policy="balanced"]');click('#year-next');
      check(s.phase==='policy'&&document.querySelector('.policy-focus').textContent.includes('需求 2'),'year '+year+' requires a policy for the second need');
      click('[data-year-action="choose"][data-policy="balanced"]');
      const preview=E.preview(s);check(E.choices(s).length===2&&JSON.stringify(s.metrics)===before,'year '+year+' has two selected policies before a single annual resolution');
      if(year===1)await checkpoint('policy');
      click('#year-next');
      check(JSON.stringify(s.metrics)===JSON.stringify(preview.after)&&s.report.results.length===2,'year '+year+' report exactly matches the policy preview');
      const snapshot=JSON.stringify([s.metrics,s.budget,s.reports.length]);check(!E.resolveYear(s).ok&&JSON.stringify([s.metrics,s.budget,s.reports.length])===snapshot,'year '+year+' cannot be resolved twice');
      if(year===1){check(document.querySelector('.year-report')&&s.phase==='report','the annual result is a clear next stage');await checkpoint('report');}
      if(year<10){check(!s.outcome&&s.phase==='report','no ending occurs before year ten');click('#year-next');check(s.year===year+1&&s.phase==='visit'&&s.budget===3,'next year resets only the policy budget and begins new visits');}
    }
    check(s.year===10&&s.phase==='ended'&&s.outcome==='win'&&Object.values(s.metrics).every(v=>v>=70)&&document.querySelector('.year-ending'),'ten actual annual rounds finish as soon as all three goals reach seventy');
    check(s.caseTalks.length===20&&s.caseTalks.every(r=>r.exchanges.length===1)&&s.reports.length===10,'the complete story retains twenty short visits and ten annual decisions');
    const beforeWait=JSON.stringify([s.year,s.metrics,s.outcome]);await wait(150);check(JSON.stringify([s.year,s.metrics,s.outcome])===beforeWait,'the ending needs no additional waiting period');
    const saved=JSON.parse(localStorage.getItem('downstairs-clementi-years-v1'));
    check(localStorage.getItem('downstairs-clementi-v1')===window.__oldClassic&&localStorage.getItem('downstairs-clementi-campaign-v1')===window.__oldCampaign&&saved.state.mode==='years-v1'&&saved.state.year===10&&!JSON.stringify(saved).includes('apiKey'),'annual saves are independent from previous systems and contain no credentials');
    await checkpoint('ending');
    check(!window.CM_HOME.isActive()&&!document.querySelector('#modal').open&&document.querySelector('#game').scrollWidth<=innerWidth+1,'the final community has no active room or horizontal overflow');
    window.__yearBrowser={ok:true,passed,year:s.year,outcome:s.outcome,metrics:s.metrics,viewport:{width:innerWidth,height:innerHeight}};
  }catch(error){window.__yearBrowser={ok:false,passed,error:error.message,stack:error.stack,year:window.CM_YEAR_APP?.getState?.()?.year,phase:window.CM_YEAR_APP?.getState?.()?.phase};}
};

let html=fs.readFileSync(path.join(single?gameDir:dist,single?'金文泰-AI整合版.html':'index.html'),'utf8');
if(!single)html=html.replace('<head>','<head><base href="'+pathToFileURL(dist+path.sep).href+'">');
html=html.replace('<head>','<head><script>window.__oldClassic=JSON.stringify({classic:"preserved"});window.__oldCampaign=JSON.stringify({fiveDay:"preserved"});localStorage.setItem("downstairs-clementi-v1",window.__oldClassic);localStorage.setItem("downstairs-clementi-campaign-v1",window.__oldCampaign);</script>');
html=html.replace('</body>','<script>addEventListener("load",()=>('+checks.toString()+')());</script></body>');
const page=path.join(output,'year.html');fs.writeFileSync(page,html);
async function main(){
  const wait=ms=>new Promise(r=>setTimeout(r,ms)),args=['--headless=new','--no-first-run','--no-default-browser-check','--disable-extensions','--disable-background-networking','--disable-gpu','--enable-unsafe-swiftshader','--user-data-dir='+path.join(output,'profile'),'--window-size='+(process.env.SMOKE_WIDTH||1440)+',1050','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0',pathToFileURL(page).href];
  const child=spawn(executable,args,{windowsHide:true,stdio:['ignore','ignore','pipe']});let logs='',socket,serial=0;const pending=new Map(),screenshots={};child.stderr.on('data',chunk=>{logs=(logs+chunk).slice(-100000);});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial,timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timed out: '+method));},15000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});
  try{
    const portFile=path.join(output,'profile','DevToolsActivePort'),started=Date.now();while(!fs.existsSync(portFile)){if(Date.now()-started>15000||child.exitCode!==null)throw new Error('No local Edge test endpoint.');await wait(100);}
    const port=fs.readFileSync(portFile,'utf8').split(/\r?\n/)[0],pages=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json(),target=pages.find(p=>p.type==='page'&&p.url===pathToFileURL(page).href)||pages.find(p=>p.type==='page');assert(target,'No annual test page.');socket=new WebSocket(target.webSocketDebuggerUrl);
    socket.addEventListener('message',event=>{const message=JSON.parse(String(event.data)),task=pending.get(message.id);if(!task)return;clearTimeout(task.timer);pending.delete(message.id);message.error?task.reject(new Error(message.error.message)):task.resolve(message.result);});
    await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
    let result;while(!result){
      if(Date.now()-started>150000)throw new Error('Annual browser flow timed out.');
      const response=await send('Runtime.evaluate',{expression:'JSON.stringify({result:window.__yearBrowser||null,checkpoint:window.__yearCheckpoint||null})',returnByValue:true}),status=JSON.parse(response.result.value||'{}');
      if(status.checkpoint?.waiting&&!screenshots[status.checkpoint.name]){await send('Runtime.evaluate',{expression:'window.HDBScene?.invalidate?.()'});await wait(400);const shot=await send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false}),file=path.join(output,'year-'+status.checkpoint.name+'.png');fs.writeFileSync(file,Buffer.from(shot.data,'base64'));screenshots[status.checkpoint.name]=file;await send('Runtime.evaluate',{expression:'window.__yearCheckpoint.waiting=false'});}
      result=status.result;if(!result)await wait(100);
    }
    await send('Runtime.evaluate',{expression:'window.HDBScene?.invalidate?.()'});await wait(300);const canvas=await send('Runtime.evaluate',{expression:'(()=>{const el=document.querySelector("#world-scene canvas");if(!el)return null;const c=getComputedStyle(el),r=el.getBoundingClientRect();return {display:c.display,visibility:c.visibility,opacity:c.opacity,width:r.width,height:r.height}})()',returnByValue:true});result.canvas=canvas.result.value;
    const dom=await send('Runtime.evaluate',{expression:'document.documentElement.outerHTML',returnByValue:true});fs.writeFileSync(path.join(output,'page.html'),dom.result.value||'');
    console.log(JSON.stringify({...result,single,realtime:true,screenshots,output},null,2));assert.equal(result.ok,true,result.error);assert(result.canvas&&result.canvas.display!=='none'&&result.canvas.visibility==='visible'&&Number(result.canvas.opacity)>0&&result.canvas.width>0,'The retained room flow must leave a visible 3D world.');
  }finally{
    fs.writeFileSync(path.join(output,'browser.log'),logs);if(socket?.readyState===WebSocket.OPEN){try{await send('Browser.close');}catch(_){}socket.close();}if(child.exitCode===null)child.kill();for(const task of pending.values())clearTimeout(task.timer);
  }
}
main().catch(error=>{console.error(error);console.error('Output: '+output);process.exitCode=1;});
