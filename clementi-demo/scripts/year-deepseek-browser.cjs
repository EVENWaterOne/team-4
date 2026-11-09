'use strict';
// Browser lifecycle regression: reload a settled year during its map presentation.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),output=fs.mkdtempSync(path.join(os.tmpdir(),'clementi-ux-resume-')),wait=ms=>new Promise(r=>setTimeout(r,ms));
const page=path.join(output,'resume.html');
fs.writeFileSync(page,fs.readFileSync(path.join(root,'dist/index.html'),'utf8').replace('<head>','<head><base href="'+pathToFileURL(path.join(root,'dist')+path.sep).href+'">'));
const executable=process.env.EDGE_PATH||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const child=spawn(executable,['--headless=new','--no-first-run','--no-default-browser-check','--disable-extensions','--disable-background-networking','--disable-gpu','--enable-unsafe-swiftshader','--user-data-dir='+path.join(output,'profile'),'--window-size=1440,1000','--remote-debugging-port=0','http://127.0.0.1:4201/'],{windowsHide:true,stdio:'ignore'});
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
 if(await evaluate('!!window.CM_FLOW?.isActive()')){await until('!!document.querySelector("[data-flow-action=map]")','entry');await click('[data-flow-action="map"]');await click('[data-flow-action="details"]');await click('[data-flow-action="enter"]');await until('!CM_FLOW.isActive()','enter');}
 assert(await evaluate('CM_YEARS.issues(CM_YEAR_APP.getState()).length===0&&document.querySelectorAll(".need-ticket").length===0'),'board starts empty');
 await click('[data-year-action="visit"]');
 assert(await evaluate('!!document.querySelector("#year-talk-question")&&!document.querySelector("#year-talk-question").disabled&&!document.querySelector("[data-year-talk-listen]")'),'free input is primary from entry');
 const ask=async q=>evaluate('(()=>{const input=document.querySelector("#year-talk-question");input.value='+JSON.stringify(q)+';input.dispatchEvent(new Event("input",{bubbles:true}));document.querySelector("[data-year-talk-form]").requestSubmit()})()');
 await ask('你好，先打个招呼。');
 await until('CM_YEAR_APP.getState().caseTalks.some(t=>t.exchanges.length)','live reply',55000);
 assert(await evaluate('CM_YEAR_APP.getState().caseTalks[0].exchanges[0].source==="deepseek"'),'real DeepSeek transport used');
 assert(await evaluate('CM_YEARS.issues(CM_YEAR_APP.getState()).length===0'),'greeting does not discover the hidden need');
 await ask('你最近出门有什么不方便，希望社区怎么帮助你？');
 await until('CM_YEAR_APP.getState().caseTalks[0].exchanges.length===2','discover the need',55000);
 assert(await evaluate('CM_YEARS.issues(CM_YEAR_APP.getState()).length===1'),'one household reveals exactly one fixed need');
 await ask('除了刚才的事，你还有别的需要吗？');
 await until('CM_YEAR_APP.getState().caseTalks[0].exchanges.length===3','follow up',55000);
 assert(await evaluate('CM_YEARS.issues(CM_YEAR_APP.getState()).length===1'),'follow-ups never create a second household need');
 assert(await evaluate('CM_YEARS.issues(CM_YEAR_APP.getState()).length>0&&document.querySelectorAll(".need-ticket").length>0'),'actual dialogue populates the same board');
 await wait(350);const chatShot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(root,'../../.board-preview/ux-free-chat.png'),Buffer.from(chatShot.data,'base64'));
 await click('[data-year-talk-return]');
 await click('.need-ticket');assert(await evaluate('document.querySelectorAll(".need-policy-preview article").length===3&&!document.querySelector("#modal [data-year-action=visit]")'),'board detail shows policies and has no enter-room action');await wait(350);const detailShot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(root,'../../.board-preview/ux-need-details.png'),Buffer.from(detailShot.data,'base64'));await click('#modal [data-year-action="close"]');
 await evaluate('window.__count=CM_YEARS.issues(CM_YEAR_APP.getState()).length');
 await click('.free-visit-card:nth-child(2)');await ask('你们的作息和邻里相处，有什么想改善的需要？');
 await until('CM_YEAR_APP.getState().caseTalks.filter(t=>t.exchanges.length).length===2','second live reply',55000);
 assert(await evaluate('CM_YEARS.issues(CM_YEAR_APP.getState()).length>window.__count'),'second visit adds needs instead of a fixed annual pair');
 await click('[data-year-talk-return]');await click('#year-next');
 await evaluate('(()=>{const E=CM_YEARS,s=CM_YEAR_APP.getState();for(const i of E.issues(s))E.choose(s,i.id,"community");CM_YEAR_APP.render()})()');
 await click('#year-next');assert(await evaluate('CM_YEAR_APP.diagnostics().presentation==="review"'),'every discovered need appears in review');await click('#year-next');await click('#year-next');
 assert(await evaluate('CM_YEAR_APP.diagnostics().presentation==="report"'),'all discovered needs settle into report');
 assert(await evaluate('!JSON.stringify(localStorage).includes("apiKey")'),'no credential in browser saves');
 console.log('PASS real DeepSeek household dialogues, empty initial board, dialogue-discovered needs, second visit adds needs, all-needs decisions and annual report, no stored key');
 }finally{if(socket?.readyState===WebSocket.OPEN){try{await send('Browser.close');}catch(_){}socket.close();}if(child.exitCode===null)child.kill();for(const t of pending.values())clearTimeout(t.timer);}}
main().catch(e=>{console.error(e);console.error(output);process.exitCode=1;});
