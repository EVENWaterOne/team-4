'use strict';
// Browser lifecycle regression: reload a settled year during its map presentation.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),output=fs.mkdtempSync(path.join(os.tmpdir(),'clementi-ux-resume-')),wait=ms=>new Promise(r=>setTimeout(r,ms));
const page=path.join(output,'resume.html');
fs.writeFileSync(page,fs.readFileSync(path.join(root,'dist/index.html'),'utf8').replace('<head>','<head><base href="'+pathToFileURL(path.join(root,'dist')+path.sep).href+'">'));
const executable=process.env.EDGE_PATH||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const child=spawn(executable,['--headless=new','--no-first-run','--no-default-browser-check','--disable-extensions','--disable-background-networking','--disable-gpu','--enable-unsafe-swiftshader','--user-data-dir='+path.join(output,'profile'),'--window-size=1440,1000','--remote-debugging-port=0',pathToFileURL(page).href],{windowsHide:true,stdio:'ignore'});
let socket,serial=0,loadSerial=0;const pending=new Map();
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial,timer=setTimeout(()=>{pending.delete(id);reject(Error(method+' timeout'));},15000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});
const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text+' '+JSON.stringify(r.exceptionDetails.exception));return r.result.value;};
const until=async(expression,label,timeout=15000)=>{const start=Date.now();while(!await evaluate(expression)){if(Date.now()-start>timeout)throw Error(label+' timeout');await wait(80);}};
const click=selector=>evaluate('document.querySelector('+JSON.stringify(selector)+').click()');
async function main(){try{
 const portfile=path.join(output,'profile/DevToolsActivePort'),start=Date.now();while(!fs.existsSync(portfile)){if(Date.now()-start>15000)throw Error('Edge startup timeout');await wait(100);}
 const port=fs.readFileSync(portfile,'utf8').split(/\r?\n/)[0],pages=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json(),tab=pages.find(p=>p.type==='page');socket=new WebSocket(tab.webSocketDebuggerUrl);
 socket.addEventListener('message',e=>{const m=JSON.parse(String(e.data));if(m.method==='Page.loadEventFired')loadSerial++;const t=pending.get(m.id);if(!t)return;clearTimeout(t.timer);pending.delete(m.id);m.error?t.reject(Error(m.error.message)):t.resolve(m.result);});
 await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
 await until('!!window.CM_YEAR_APP&&!!window.HDBScene?.ready','game');
 await click('.need-ticket');
 assert(await evaluate('document.querySelector("#modal").open&&CM_YEAR_APP.getState().caseTalks.length===0&&document.querySelector(".need-ticket").dataset.known==="true"'),'reading a letter reveals a board need without inventing a visit');
 await click('#modal [data-year-action="close"]');
 await click('#year-next');assert(await evaluate('document.querySelector("#year-next").disabled'),'each need needs a choice before proceeding');
 await click('[data-policy="community"]');await click('#year-next');await click('[data-policy="community"]');await click('#year-next');
 assert(await evaluate('CM_YEAR_APP.diagnostics().presentation==="review"&&CM_YEAR_APP.getState().cash===100'),'review remains reversible and uncharged');
 await click('#year-next');await until('CM_YEAR_APP.diagnostics().presentation==="enact"','enact');
 const economic='(()=>{const s=CM_YEAR_APP.getState();return JSON.stringify([s.year,s.cash,s.staffTotal,s.metrics,s.assets,s.reports])})()',settled=await evaluate(economic);
 assert(await evaluate('document.querySelector("#year-goals").textContent.includes("50")&&!document.querySelector(".year-report")'),'goals do not reveal the report early');
 await send('Page.enable');const loadBefore=loadSerial;await send('Page.reload',{ignoreCache:true});const reloadStart=Date.now();while(loadSerial===loadBefore){if(Date.now()-reloadStart>15000)throw Error('reload event timeout');await wait(50);}await until('!!window.CM_YEAR_APP&&CM_YEAR_APP.getState().phase==="report"','reload');
 assert.equal(await evaluate(economic),settled,'reload cannot apply the annual ledger twice');
 assert(await evaluate('CM_YEAR_APP.diagnostics().presentation==="enact"'),'map presentation resumes after reload');
 await until('CM_YEAR_APP.diagnostics().presentation==="report"','automatic completion',13000);
 assert.equal(await evaluate(economic),settled,'finishing a resumed presentation cannot change the settled ledger');
 await click('#year-next');assert(await evaluate('CM_YEAR_APP.getState().year===2&&CM_YEAR_APP.getState().phase==="visit"'),'next year starts after the report');
 await wait(650);assert(await evaluate('CM_YEAR_APP.getState().year===2&&CM_YEAR_APP.diagnostics().presentation==="visit"&&!HDBScene.diagnostics().policyPresentation'),'old animation has no late effect on the next year');
 console.log('PASS letter reveal, required choices, reversible review, delayed metrics, reload during enactment, exact-once ledger, automatic finish, next-year cleanup');
 }finally{if(socket?.readyState===WebSocket.OPEN){try{await send('Browser.close');}catch(_){}socket.close();}if(child.exitCode===null)child.kill();for(const t of pending.values())clearTimeout(t.timer);}}
main().catch(e=>{console.error(e);console.error(output);process.exitCode=1;});
