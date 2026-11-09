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
  const passed=[],wait=ms=>new Promise(r=>setTimeout(r,ms));
  const check=(value,label)=>{if(!value)throw new Error(label);passed.push(label);};
  const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
  const until=async(fn,label,timeout=15000)=>{const started=performance.now();while(!fn()){if(performance.now()-started>timeout)throw new Error('Timed out: '+label);await wait(35);}};
  const click=selector=>{const el=document.querySelector(selector);if(!el)throw new Error('Missing '+selector);if(el.disabled)throw new Error('Disabled '+selector);if(typeof el.click==='function')el.click();else el.dispatchEvent(new MouseEvent('click',{bubbles:true}));};
  const checkpoint=async name=>{window.__resourcesCheckpoint={name,waiting:true};await until(()=>window.__resourcesCheckpoint.waiting===false,'capture '+name,20000);};
  const economic=s=>JSON.stringify([s.metrics,s.cash,s.staffTotal,s.assets,s.selected]);
  const converse=async(issue,{revisit=false,followups=0}={})=>{
    const s=window.CM_YEAR_APP.getState(),E=window.CM_YEARS,before=economic(s),phase=s.phase;
    await until(()=>document.querySelector('#year-talk-panel')?.dataset.yearTalkIssue===issue.id&&window.CM_HOME.isActive(issue.residentId),'open '+issue.id);
    check(document.querySelectorAll('#cm-home-panel').length===1&&document.querySelectorAll('#year-talk-panel').length===1,'visit '+issue.id+' opens exactly one explorable room');
    const prior=s.caseTalks.find(r=>r.year===s.year&&r.issueId===issue.id)?.exchanges.length||0;
    if(revisit){check(prior>0&&document.querySelector('[data-year-talk-continue]')&&!document.querySelector('[data-year-talk-listen]'),'revisit preserves actual dialogue without forcing another introduction');click('#cm-home-map [data-home-person="'+issue.residentId+'"]');await until(()=>window.CM_HOME.canTalk(issue.residentId),'walk up for optional follow-up');}
    else{click('[data-year-talk-listen]');await until(()=>s.caseTalks.find(r=>r.year===s.year&&r.issueId===issue.id)?.exchanges.length===prior+1,'one short real dialogue '+issue.id);check(E.learned(s,issue.id),'one reply records '+issue.id);}
    check(window.CM_HOME.canTalk(issue.residentId),revisit?'optional revisits can still approach through the real room':'listen auto-approaches the resident using the real room path');
    check(document.querySelector('[data-year-talk-continue]')?.textContent.includes('返回社区'),'the visit has a clear return action instead of advancing the year');
    check(window.CM_HOME.evidence(s,issue.residentId).observations.length===0,'a visit needs no object collection');
    for(let n=0;n<followups;n++){
      const count=s.caseTalks.find(r=>r.year===s.year&&r.issueId===issue.id).exchanges.length;
      const details=document.querySelector('.year-talk-followup');details.open=true;
      const input=document.querySelector('#year-talk-question');input.value='这段安排还有什么想补充的？';input.dispatchEvent(new Event('input',{bubbles:true}));
      document.querySelector('[data-year-talk-form]').requestSubmit();
      await until(()=>s.caseTalks.find(r=>r.year===s.year&&r.issueId===issue.id).exchanges.length===count+1,'optional follow-up '+n);
    }
    check(economic(s)===before&&s.phase===phase,'optional dialogue cannot spend cash, reserve staff, change policies, or advance the annual phase');
    click('[data-year-talk-continue]');check(!document.querySelector('#modal').open&&s.phase===phase,'ending a visit returns to the same annual phase');
  };
  try{
    await until(()=>window.CM_YEAR_APP&&window.CM_YEARS&&window.CM_YEAR_TALK&&window.CM_HOME,'resource modules');
    const app=window.CM_YEAR_APP,E=window.CM_YEARS,s=app.getState();
    check(s.mode==='years-resources-v1'&&s.schema===2&&!window.CM_CAMPAIGN&&!window.CM_ENGINE&&!window.CM_NEEDS,'the resource decision engine alone owns the game');
    check(s.year===1&&s.phase==='visit'&&s.cash===100&&s.staffTotal===6&&Object.values(s.metrics).every(v=>v===50),'year one starts with 100 cash, six staff, and three goals');
    check(document.querySelectorAll('.goal-meter').length===3&&document.querySelector('#year-resources').textContent.includes('100')&&document.querySelector('#year-budget').hidden,'goals and resource balances are visible while policy reservations stay in their stage');
    check(document.querySelectorAll('.free-visit-card').length===8&&E.additionalVisits(s).length===6&&s.caseTalks.length===0,'all eight households are freely available with no fabricated conversations');
    const first=E.issues(s)[0],optional=E.additionalVisits(s)[0];
    check(!E.choose(s,first.id,'community').ok&&!document.querySelector('.policy-option'),'policy choices begin after the annual opinion report, independent of visiting');
    check(document.querySelectorAll('.need-ticket').length===2,'a persistent right-hand board holds every annual decision need');
    await checkpoint('map');
    click('[data-year-action="visit"][data-id="'+first.id+'"]');await until(()=>document.querySelector('[data-year-talk-listen]'),'first room');await checkpoint('visit');
    await converse(first);
    check(s.caseTalks.length===1&&s.caseTalks[0].exchanges.length===1,'a primary visit consists of one short reply');
    click('[data-year-action="visit"][data-id="'+optional.id+'"]');await converse(optional);
    check(E.issues(s).length===2&&s.caseTalks.length===2&&s.extraLearnedIssues[optional.id]===true,'an optional household does not add a third mandatory policy');
    const schedule={1:['capital','capital'],2:['community','community'],3:['capital','community'],4:['community','capital'],5:['service','community']};
    const financial=[];
    for(let year=1;year<=10;year++){
      check(s.year===year&&s.phase==='visit','year '+year+' begins with optional visits');
      const existing=JSON.parse(JSON.stringify(Object.values(s.assets))),cash=s.cash,staff=s.staffTotal,talks=s.caseTalks.length;
      click('#year-next');check(s.phase==='policy'&&document.querySelectorAll('.need-ticket').length===2,'year '+year+' moves directly from visits and the needs board to policy cards');
      check(s.caseTalks.length===talks&&s.cash===cash&&s.staffTotal===staff,'year '+year+' reading the opinion report creates no visits and consumes no resources');
      check(s.phase==='policy'&&document.querySelectorAll('.policy-option').length===3&&!document.querySelector('#year-budget').hidden,'year '+year+' has three genuine policy options without a visit requirement');
      const list=E.issues(s),before=JSON.stringify(s.metrics);
      check(list.every(i=>new Set(i.policies.map(p=>[p.cost,p.staff,p.assetId||'none'].join(':'))).size===3),'year '+year+' alternatives differ in spending, labour, and long-term operation');
      if(year===1){
        click('[data-year-action="choose"][data-policy="capital"]');
        const capital=E.preview(s);check(s.cash===cash&&s.staffTotal===staff&&capital.cost===45&&capital.staff===2&&capital.newOngoingStaff===1,'capital selection reserves cash, temporary execution staff, and a permanent operating post without charging');
        click('[data-year-action="choose"][data-policy="service"]');
        const service=E.preview(s);check(s.cash===cash&&s.staffTotal===staff&&service.cost===28&&service.staff===0&&service.newOngoingStaff===0,'changing the selection refunds the prior cash and workforce reservation');
        click('[data-year-action="choose"][data-policy="community"]');
        check(E.preview(s).cost===12&&E.preview(s).staff===1&&s.cash===cash,'basic coordination is cheaper and uses one temporary staff member');
        // Reopen a genuinely visited household during policy selection; four further replies prove no yearly three-question cap.
        click('[data-year-action="visits"]');click('#modal [data-year-action="visit"][data-id="'+first.id+'"]');
        await converse(first,{revisit:true,followups:4});
        check(s.caseTalks.find(r=>r.issueId===first.id).exchanges.length===5&&s.phase==='policy'&&E.choices(s)[0].policyId==='community','policy-phase repeat visits preserve archives and chosen policies beyond three replies');
      }
      const picks=schedule[year]||['community','community'];
      click('[data-year-action="choose"][data-policy="'+picks[0]+'"]');click('#year-next');
      check(s.phase==='policy'&&document.querySelector('.policy-focus').textContent.includes('需求 2'),'year '+year+' asks for exactly one policy per need');
      click('[data-year-action="choose"][data-policy="'+picks[1]+'"]');
      const preview=E.preview(s),f=preview.finance,h=preview.humanResources,active=existing.filter(a=>a.activeFromYear<=year);
      check(JSON.stringify(s.metrics)===before&&s.cash===cash&&s.staffTotal===staff&&E.choices(s).length===2,'year '+year+' preview leaves actual balances, workforce, and goals untouched');
      check(f.closing===f.opening+f.taxIncome+f.publicIncome+f.grantIncome-f.policySpending-f.operatingCosts&&f.netChange===f.totalIncome-f.totalExpenditure,'year '+year+' forecast ledger balances to the unit');
      check(f.publicIncome===active.reduce((n,a)=>n+a.annualRevenue,0)&&f.maintenanceCosts===active.reduce((n,a)=>n+a.annualMaintenance,0)&&f.taxBaseBonus===active.reduce((n,a)=>n+a.taxBonus,0),'year '+year+' only already operating asset levels earn income, incur maintenance, and improve the tax base');
      check(f.newAssets.every(a=>a.activeFromYear===year+1)&&h.closing===staff+1&&h.policyAssigned===E.choices(s).reduce((n,p)=>n+p.staff,0),'year '+year+' new assets activate next year while recruitment and temporary assignment remain distinct');
      if(year===1){check(f.publicIncome===0&&f.maintenanceCosts===0&&h.newOngoing===2&&h.ongoing===2,'new departments do not generate same-year revenue or maintenance');await checkpoint('policy');}
      if(year===2)check(f.publicIncome===6&&f.maintenanceCosts===6&&f.taxBaseBonus===7,'year two receives the exact first-year departments revenue and costs');
      if(year===4)check(f.publicIncome===14&&f.newAssets.some(a=>a.id==='corner'&&a.level===2&&a.upgrade&&a.newOngoingStaff===0)&&h.newOngoing===0,'upgrading an existing department earns its old level this year and adds no duplicate operating job');
      if(year===5)check(f.publicIncome===20,'the upgraded department starts its higher revenue in the following year');
      if(year===1){
        click('[data-year-action="settings"]');const form=document.querySelector('[data-year-talk-settings-form]');
        for(const [key,value] of Object.entries({provider:'openai',model:'browser-test',baseUrl:'https://example.invalid/v1',apiKey:'browser-secret-never-save'}))form.elements[key].value=value;
        form.requestSubmit();check(document.querySelector('[data-year-talk-settings-form] [name="apiKey"]').value==='','applied API credentials never appear in an input value');
        click('#modal [data-year-action="close"]');
      }
      click('#year-next');
      check(s.phase==='policy'&&app.diagnostics().presentation==='review'&&document.querySelectorAll('.plan-row').length===2&&s.cash===cash&&JSON.stringify(s.metrics)===before,'year '+year+' reviews all policies before spending or changing goals');
      if(year===1){await checkpoint('review');click('[data-year-action="edit-policies"]');check(app.diagnostics().presentation==='policy'&&E.choices(s).length===2,'review can return to cards without losing either choice');click('#year-next');}
      click('#year-next');
      check(app.diagnostics().presentation==='enact'&&!document.querySelector('.year-report')&&document.querySelector('#year-goals').textContent.includes(String(preview.before.stay)),'year '+year+' shows map enactment before the numeric annual report');
      if(year===1){await until(()=>window.HDBScene?.diagnostics?.().policyPresentation,'real map policy highlight');await checkpoint('enact');}
      if(year===2){await until(()=>app.diagnostics().presentation==='report','automatic map animation completion',13000);}else{click('#year-next');}
      check(app.diagnostics().presentation==='report'&&s.ux.stage===null,'year '+year+' finishes or skips the visual presentation safely');
      check(same(s.report.finance,f)&&same(s.report.humanResources,h)&&same(s.metrics,preview.after)&&s.cash===f.closing&&s.staffTotal===h.closing,'year '+year+' annual report exactly matches the financial, staffing, and goal previews');
      const reportText=document.querySelector('.year-report').textContent;
      check(reportText.includes('期初 '+f.opening)&&reportText.includes('期末 '+f.closing)&&reportText.includes('税收')&&reportText.includes('公共部门营收')&&reportText.includes('新增人力'),'year '+year+' report visibly explains income, expenditure, carried cash, and recruitment');
      const frozen=JSON.stringify([s.metrics,s.cash,s.staffTotal,s.assets,s.reports]);check(!E.resolveYear(s).ok&&JSON.stringify([s.metrics,s.cash,s.staffTotal,s.assets,s.reports])===frozen,'year '+year+' cannot settle or recruit twice');
      financial.push({year,opening:f.opening,tax:f.taxIncome,publicIncome:f.publicIncome,policy:f.policySpending,operating:f.operatingCosts,net:f.netChange,closing:f.closing,staff:h.closing,operatingStaff:h.ongoing});
      if(year===1)await checkpoint('report');
      if(year===4)await checkpoint('report-upgrade');
      if(year<10){check(!s.outcome&&s.phase==='report','year '+year+' does not end early even when goals reach seventy');click('#year-next');check(s.phase==='visit'&&s.year===year+1&&s.cash===f.closing&&s.openingCash===f.closing&&s.staffTotal===h.closing,'next year carries the actual cash and enlarged workforce forward');}
    }
    check(s.year===10&&s.phase==='ended'&&s.outcome==='win'&&Object.values(s.metrics).every(v=>v>=70)&&s.reports.length===10,'ten annual decisions reach all three community goals without mandatory visits or delays');
    click('#year-next');check(s.finalViewed&&document.querySelector('.year-ending'),'the tenth annual report leads to a clear final outcome');
    check(s.caseTalks.length===2&&s.caseTalks.reduce((n,r)=>n+r.exchanges.length,0)===6,'only the optional conversations actually played are stored over the whole decade');
    const saved=JSON.parse(localStorage.getItem('downstairs-clementi-years-resources-v1'));
    check(saved.state.mode==='years-resources-v1'&&saved.state.year===10&&same(saved.state.assets,s.assets)&&saved.state.cash===s.cash&&saved.state.staffTotal===s.staffTotal,'resource saves preserve real balances, assets, and staffing');
    check(Object.entries(window.__oldSaves).every(([key,value])=>localStorage.getItem(key)===value),'classic, five-day, and the older annual save slots remain isolated');
    check(!JSON.stringify(saved).includes('apiKey')&&!Object.values(localStorage).join('').includes('browser-secret-never-save'),'API secrets are absent from every local save');
    check(!window.CM_HOME.isActive()&&!document.querySelector('#modal').open&&document.querySelector('#game').scrollWidth<=innerWidth+1,'the final world has no active room, modal, or horizontal overflow');
    await checkpoint('ending');
    window.__resourcesBrowser={ok:true,passed,year:s.year,outcome:s.outcome,metrics:s.metrics,cash:s.cash,staff:s.staffTotal,financial,viewport:{width:innerWidth,height:innerHeight}};
  }catch(error){window.__resourcesBrowser={ok:false,passed,error:error.message,stack:error.stack,year:window.CM_YEAR_APP?.getState?.()?.year,phase:window.CM_YEAR_APP?.getState?.()?.phase};}
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
