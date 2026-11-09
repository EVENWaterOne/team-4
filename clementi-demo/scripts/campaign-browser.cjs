'use strict';
// Real-time Edge/CDP regression for the rebuilt five-day loop. No external model requests.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawn}=require('node:child_process'),{pathToFileURL}=require('node:url'),assert=require('node:assert/strict');
const gameDir=path.resolve(__dirname,'..'),dist=path.join(gameDir,'dist'),single=process.argv.includes('--single');
const executable=process.env.EDGE_PATH||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
assert.ok(fs.existsSync(executable),'Set EDGE_PATH to a preinstalled Edge executable.');
const output=fs.mkdtempSync(path.join(os.tmpdir(),'clementi-campaign-browser-'));

const checks=async function(){
  const passed=[],wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const check=(condition,label)=>{if(!condition)throw new Error(label);passed.push(label);};
  const until=async(predicate,label,timeout=7000)=>{const start=performance.now();while(!predicate()){if(performance.now()-start>timeout)throw new Error('Timed out: '+label);await wait(40);}};
  const click=selector=>{const el=document.querySelector(selector);if(!el)throw new Error('Missing '+selector);if(el.disabled)throw new Error('Disabled '+selector);if(typeof el.click==='function')el.click();else el.dispatchEvent(new MouseEvent('click',{bubbles:true}));};
  const snapshot=s=>JSON.stringify({budget:s.budget,plans:s.plans,projects:s.projects,day:s.day,met:s.met,total:s.total,pressure:s.pressure});
  const close=()=>{if(document.querySelector('#modal').open)click('#modal [data-cp-action="close"]');};
  const checkpoint=async name=>{window.__campaignCheckpoint={name,waiting:true};await until(()=>window.__campaignCheckpoint.waiting===false,'capture '+name,15000);};
  const option=(request,choice)=>'[data-cp-action="choose"][data-request="'+request+'"][data-option="'+choice+'"]';
  const choose=async(kind,choice)=>{const request=window.CM_CAMPAIGN.requests(window.CM_APP.getState()).find(r=>r.kind===kind);if(!request)throw new Error('No request '+kind);click('#request-list [data-cp-action="options"][data-id="'+request.id+'"]');click(option(request.id,choice));await wait(30);};
  const talk=async(id,propSelector,question)=>{
    if(propSelector){click(propSelector);await until(()=>window.CM_HOME.evidence(window.CM_APP.getState(),id).observations.length>0,'observe '+id);}
    click('[data-home-person="'+id+'"]');await until(()=>window.CM_HOME.canTalk(id)&&!document.querySelector('#case-question').disabled,'approach '+id);
    document.querySelector('#case-question').value=question;document.querySelector('[data-case-talk-form]').requestSubmit();
    await until(()=>window.CM_CAMPAIGN.intel(window.CM_APP.getState(),id).unlocked,'unlock '+id);
  };
  try{
    await until(()=>!!window.CM_APP&&!!window.CM_CAMPAIGN&&!!window.CM_CASE_TALK&&!!window.CM_HOME,'modules');
    const app=window.CM_APP,E=window.CM_CAMPAIGN,s=app.getState();
    check(s.mode==='campaign-v1'&&!window.CM_ENGINE&&!window.CM_NEEDS&&!window.CM_TALK,'only the rebuilt system is active, with the retained room exploration');
    check(document.querySelector('#modal').open&&!!document.querySelector('[data-cp-action="start"]'),'the new loop has a clear playable introduction');click('[data-cp-action="start"]');
    check(s.day===1&&s.budget===36&&s.staffTotal===2&&s.visits.length===0&&E.requests(s).length===3,'a fresh day has 36 budget, 2 staff, 2 visits and 3 requests');
    click('#request-list [data-cp-action="visit"][data-id="chen"]');
    check(window.CM_HOME.isActive('chen')&&document.querySelectorAll('#cm-home-panel').length===1&&s.visits.length===1,'the first visit opens one household and consumes one unique visit');
    const beforeTalk=snapshot(s);await talk('chen','[data-home-prop="chen-umbrella-2"]','我留意到门边的雨伞，有哪些时间和安排限制？');
    const chenSession=s.caseTalks.find(v=>v.day===1&&v.residentId==='chen');
    check(chenSession.exchanges.length===1&&E.intel(s,'chen').unlocked&&snapshot(s)===beforeTalk,'a real room observation and one exchange unlock a different allocation without spending or scheduling');
    click('[data-case-return]');check(!document.querySelector('#modal').open&&!window.CM_HOME.isActive(),'leaving the home returns to the planning board');
    await choose('route','relay');check(s.budget===36&&E.planned(s).cost===3&&E.planned(s).staff===0,'the adapted relay reserves 3 budget and zero staff without charging yet');
    // Mock only transport, through the actual settings UI; this never calls a real API.
    click('[data-cp-action="settings"]');
    const settingsForm=document.querySelector('[data-case-settings-form]');settingsForm.elements.provider.value='openai';settingsForm.elements.baseUrl.value='https://example.invalid/v1';settingsForm.elements.model.value='local-fixture';settingsForm.elements.apiKey.value='campaign-test-secret';settingsForm.requestSubmit();click('[data-case-return]');
    const originalChat=window.V2LLM.chat;let finishLate,modelCalls=0;window.V2LLM.chat=()=>{modelCalls++;return new Promise(resolve=>{finishLate=resolve;});};
    click('#request-list [data-cp-action="visit"][data-id="chen"]');click('[data-home-person="chen"]');await until(()=>window.CM_HOME.canTalk('chen')&&!document.querySelector('#case-question').disabled,'revisit Chen');
    check(s.visits.length===1&&s.caseTalks.find(v=>v.day===1&&v.residentId==='chen').exchanges.length===1,'same-day return preserves both the visit allowance and conversation count');
    document.querySelector('#case-question').value='你还能接受怎样的互助？';document.querySelector('[data-case-talk-form]').requestSubmit();await until(()=>modelCalls===1,'start local delayed roleplay');close();
    click('#request-list [data-cp-action="visit"][data-id="ali"]');
    check(window.CM_HOME.isActive('ali')&&!window.CM_HOME.isActive('chen')&&document.querySelectorAll('#cm-home-panel').length===1&&s.visits.length===2,'switching to a second home never leaves a duplicate room');
    finishLate({text:JSON.stringify({narration:'迟到的场景',reply:'这条答复不能写入另一户。'}),meta:{}});await wait(80);window.V2LLM.chat=originalChat;
    check(s.caseTalks.find(v=>v.day===1&&v.residentId==='chen').exchanges.length===1&&!document.querySelector('#case-talk-panel').textContent.includes('迟到')&&s.caseTalks.find(v=>v.day===1&&v.residentId==='ali').exchanges.length===0,'a late model reply cannot cross a closed room into another household or consume a question');
    const field=document.querySelector('#case-question'),position=JSON.stringify(s.homeExplorations.ali.position);field.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));
    check(JSON.stringify(s.homeExplorations.ali.position)===position,'typing in the room dialogue cannot move the player');
    const blocked=app.showHome('kumar');check(blocked===false&&s.visits.length===2&&window.CM_HOME.isActive('ali'),'a third household cannot bypass the daily visit limit');
    click('[data-home-exit]');
    click('[data-cp-action="settings"]');const offlineForm=document.querySelector('[data-case-settings-form]');offlineForm.elements.provider.value='mock';offlineForm.elements.apiKey.value='';offlineForm.requestSubmit();click('[data-case-return]');
    await choose('rest','quiet-agreement');const rest=E.requests(s).find(r=>r.kind==='rest');
    click('#plan-list [data-cp-action="remove"][data-id="'+rest.id+'"]');check(s.budget===36&&!E.planned(s).items.some(i=>i.requestId===rest.id),'removing a planned action charges nothing and releases reserved staff');
    await choose('rest','quiet-agreement');await choose('care','service-call');
    check(E.planned(s).staff===2&&E.planned(s).cost===19&&s.budget===36,'three compatible actions fit two staff, including one long-term investment');
    await checkpoint('plan');
    click('#advance-day');check(s.phase==='report'&&s.budget===17&&s.met===2&&s.total===3&&s.pressure.ali===1&&document.querySelector('.day-report'),'the execution spends once and visibly distinguishes support from investment-day delay');
    const spent=s.budget,again=E.resolveDay(s);check(!again.ok&&s.budget===spent,'a day cannot be charged or resolved twice');
    await checkpoint('report');
    click('[data-cp-action="next-day"]');check(s.day===2&&s.phase==='plan'&&s.budget===27&&s.visits.length===0&&E.planned(s).remainingStaff===2,'the next day restores staff and visits, carries funds, and adds exactly 10 budget');
    check(E.requests(s).find(r=>r.kind==='gathering').automatic,'the one-day agreement now absorbs a related gathering request automatically');
    // The rest uses real engine decisions, never direct result/resource edits.
    check(E.plan(s,E.requests(s).find(r=>r.kind==='route').id,'cover').ok,'the new day can trade today’s service for a two-day investment');app.render();
    app.advance();check(s.phase==='report'&&s.report.results.find(r=>r.residentId==='chen').status==='partial'&&!s.improvements.cover&&s.projects.some(p=>p.id==='cover'&&p.remaining===1),'starting the roof leaves today’s outing unmet and retains one more preparation day');
    app.nextDay();check(s.day===3&&!E.requests(s).find(r=>r.kind==='route').automatic,'the two-day project cannot satisfy the next day prematurely');
    check(E.plan(s,E.requests(s).find(r=>r.kind==='route').id,'relay').ok,'persistent discovered conditions remain usable on a later day');check(E.plan(s,E.requests(s).find(r=>r.kind==='care').id,'service-call').ok,'later care contact still needs an actual allocation');app.advance();
    check(s.report.completed.some(p=>p.id==='cover')&&s.improvements.cover,'the second preparation day completes the investment');app.nextDay();
    check(s.day===4&&E.requests(s).find(r=>r.kind==='route').automatic&&E.planned(s).remainingStaff===2,'the completed route now absorbs repeat work and leaves today’s staff free');
    for(const r of E.requests(s).filter(r=>!r.automatic)){const o=r.options.find(o=>o.unlocked&&o.kind!=='investment'&&o.staff===1);check(E.plan(s,r.id,o.id).ok,'day 4 real action '+r.kind);}app.advance();app.nextDay();
    for(const r of E.requests(s).filter(r=>!r.automatic)){const o=r.options.find(o=>o.unlocked&&o.kind!=='investment'&&o.staff===1);check(E.plan(s,r.id,o.id).ok,'day 5 real action '+r.kind);}app.advance();
    check(s.day===5&&s.phase==='ended'&&['win','mixed','lose'].includes(s.outcome)&&s.total===15&&!!document.querySelector('.day-report'),'five actual day resolutions reach a finite report and graded ending');
    click('[data-cp-action="ending"]');check(!!document.querySelector('.campaign-ending')&&s.outcome==='win'&&s.met>=10,'the investigation and investment strategy produces a real winning ending');
    const saved=JSON.parse(localStorage.getItem('downstairs-clementi-campaign-v1'));
    check(localStorage.getItem('downstairs-clementi-v1')===window.__classicSentinel&&saved.state.mode==='campaign-v1'&&saved.state.day===5&&saved.state.caseTalks.some(v=>v.residentId==='chen'&&v.exchanges.length===1)&&!JSON.stringify(saved).includes('apiKey'),'new campaign saves retain visits and dialogue without touching the classic save or storing credentials');
    await checkpoint('ending');
    close();app.render();await wait(150);
    check(document.querySelector('#game').scrollWidth<=innerWidth+1&&document.querySelectorAll('#cm-home-panel').length===0,'the final community has no stale room or horizontal overflow');
    window.__campaignBrowser={ok:true,passed,day:s.day,outcome:s.outcome,met:s.met,total:s.total,viewport:{width:innerWidth,height:innerHeight}};
  }catch(error){window.__campaignBrowser={ok:false,passed,error:error.message,stack:error.stack,phase:window.CM_APP?.getState?.()?.phase,day:window.CM_APP?.getState?.()?.day};}
};

let html=fs.readFileSync(path.join(single?gameDir:dist,single?'金文泰-AI整合版.html':'index.html'),'utf8');
if(!single)html=html.replace('<head>','<head><base href="'+pathToFileURL(dist+path.sep).href+'">');
html=html.replace('<head>','<head><script>window.__classicSentinel=JSON.stringify({test:"classic-preserved"});localStorage.setItem("downstairs-clementi-v1",window.__classicSentinel);</script>');
html=html.replace('</body>','<script>addEventListener("load",()=>('+checks.toString()+')());</script></body>');
const page=path.join(output,'campaign.html');fs.writeFileSync(page,html);

async function main(){
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),args=['--headless=new','--no-first-run','--no-default-browser-check','--disable-extensions','--disable-background-networking','--disable-gpu','--enable-unsafe-swiftshader','--user-data-dir='+path.join(output,'profile'),'--window-size='+(process.env.SMOKE_WIDTH||1440)+',1050','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0',pathToFileURL(page).href];
  const child=spawn(executable,args,{windowsHide:true,stdio:['ignore','ignore','pipe']});let logs='',socket,serial=0;const pending=new Map(),screenshots={};child.stderr.on('data',chunk=>{logs=(logs+chunk).slice(-100000);});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial,timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timed out: '+method));},12000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});
  try{
    const portFile=path.join(output,'profile','DevToolsActivePort'),started=Date.now();while(!fs.existsSync(portFile)){if(Date.now()-started>12000||child.exitCode!==null)throw new Error('No local Edge test endpoint.');await wait(100);}
    const port=fs.readFileSync(portFile,'utf8').split(/\r?\n/)[0],pages=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json(),target=pages.find(p=>p.type==='page'&&p.url===pathToFileURL(page).href)||pages.find(p=>p.type==='page');assert(target,'No campaign test page.');socket=new WebSocket(target.webSocketDebuggerUrl);
    socket.addEventListener('message',event=>{const message=JSON.parse(String(event.data)),task=pending.get(message.id);if(!task)return;clearTimeout(task.timer);pending.delete(message.id);message.error?task.reject(new Error(message.error.message)):task.resolve(message.result);});
    await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
    let result;while(!result){
      if(Date.now()-started>65000)throw new Error('Campaign browser flow timed out.');
      const response=await send('Runtime.evaluate',{expression:'JSON.stringify({result:window.__campaignBrowser||null,checkpoint:window.__campaignCheckpoint||null})',returnByValue:true}),status=JSON.parse(response.result.value||'{}');
      if(status.checkpoint?.waiting&&!screenshots[status.checkpoint.name]){await send('Runtime.evaluate',{expression:'window.HDBScene?.invalidate?.()'});await wait(400);const capture=await send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false}),file=path.join(output,'campaign-'+status.checkpoint.name+'.png');fs.writeFileSync(file,Buffer.from(capture.data,'base64'));screenshots[status.checkpoint.name]=file;await send('Runtime.evaluate',{expression:'window.__campaignCheckpoint.waiting=false'});}
      result=status.result;if(!result)await wait(120);
    }
    await send('Runtime.evaluate',{expression:'window.HDBScene?.invalidate?.()'});await wait(400);const canvas=await send('Runtime.evaluate',{expression:'(()=>{const el=document.querySelector("#world-scene canvas");if(!el)return null;const c=getComputedStyle(el),r=el.getBoundingClientRect();return {display:c.display,visibility:c.visibility,opacity:c.opacity,width:r.width,height:r.height}})()',returnByValue:true});result.canvas=canvas.result.value;
    const finalCapture=await send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});screenshots.community=path.join(output,'campaign-community.png');fs.writeFileSync(screenshots.community,Buffer.from(finalCapture.data,'base64'));
    const dom=await send('Runtime.evaluate',{expression:'document.documentElement.outerHTML',returnByValue:true});fs.writeFileSync(path.join(output,'page.html'),dom.result.value||'');
    console.log(JSON.stringify({...result,single,realtime:true,screenshots,output},null,2));assert.equal(result.ok,true,result.error);assert(result.canvas&&result.canvas.display!=='none'&&result.canvas.visibility==='visible'&&Number(result.canvas.opacity)>0&&result.canvas.width>0,'The retained room/scene flow must leave a visible world canvas.');
  }finally{
    fs.writeFileSync(path.join(output,'browser.log'),logs);if(socket?.readyState===WebSocket.OPEN){try{await send('Browser.close');}catch(_){}socket.close();}if(child.exitCode===null)child.kill();for(const task of pending.values())clearTimeout(task.timer);
  }
}
main().catch(error=>{console.error(error);console.error('Output: '+output);process.exitCode=1;});
