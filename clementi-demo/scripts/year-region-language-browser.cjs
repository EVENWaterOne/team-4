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
 await until('!!window.CM_FLOW&&!document.querySelector(".flow-loading")&&!!document.querySelector("[data-flow-action=map]")','entry title');
 await click('[data-flow-action="language"][data-language="en"]');
 await click('[data-flow-action="map"]');assert(await evaluate('document.querySelectorAll(".flow-case").length===3&&document.querySelector("#entry-flow").textContent.includes("Choose a neighbourhood")'),'original three-region selection in English');
 await click('.flow-case[data-case="punggol"]');await click('[data-flow-action="details"]');assert(await evaluate('!document.querySelector("[data-flow-action=enter]")'),'unimplemented region cannot enter the Clementi game');
 await click('[data-flow-action="map"]');await click('.flow-case[data-case="clementi"]');await click('[data-flow-action="details"]');await click('[data-flow-action="enter"]');await until('!CM_FLOW.isActive()','enter game');
 const scan='(()=>{const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),out=[];let n;while(n=w.nextNode()){const p=n.parentElement;if(p&&!p.closest("script,style,[hidden],#entry-flow")&&p.getClientRects().length&&/[\\u3400-\\u9fff]/.test(n.nodeValue)&&n.nodeValue.trim()!=="中文")out.push(n.nodeValue.trim())}return out})()';
 assert.deepEqual(await evaluate(scan),[],'visit interface is fully English');
 await click('[data-year-action="visit"]');assert.deepEqual(await evaluate(scan),[],'room interface is fully English');assert(await evaluate('document.querySelector("#year-talk-question").placeholder.includes("ask")||document.querySelector("#year-talk-question").placeholder.includes("Ask")'),'English free-question placeholder');
 await evaluate('(()=>{const input=document.querySelector("#year-talk-question");input.value="What is difficult about going out in rainy weather? What would help you?";input.dispatchEvent(new Event("input",{bubbles:true}));document.querySelector("[data-year-talk-form]").requestSubmit()})()');
 await until('CM_YEAR_APP.getState().caseTalks.some(t=>t.exchanges.length)','English DeepSeek reply',55000);assert(await evaluate('CM_YEAR_APP.getState().caseTalks[0].exchanges[0].source==="deepseek"&&!/[\\u3400-\\u9fff]/.test(CM_YEAR_APP.getState().caseTalks[0].exchanges[0].reply)'),'real AI follows English locale');
 await wait(350);const roomShot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(root,'../../.board-preview/english-room.png'),Buffer.from(roomShot.data,'base64'));
 await click('[data-year-talk-return]');await evaluate('(()=>{const E=CM_YEARS,s=CM_YEAR_APP.getState();if(!E.issues(s).length)E.learn(s,E.additionalVisits(s)[0].id);CM_YEAR_APP.render()})()');
 await click('.need-ticket');assert.deepEqual(await evaluate(scan),[],'need and policies are fully English');await click('#modal [data-year-action="close"]');await click('#year-next');assert.deepEqual(await evaluate(scan),[],'policy cards are fully English');
 await click('[data-policy="community"]');await click('#year-next');await click('#year-next');await click('#year-next');assert.deepEqual(await evaluate(scan),[],'report is fully English');await wait(350);const reportShot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(root,'../../.board-preview/english-report.png'),Buffer.from(reportShot.data,'base64'));
 const economy=await evaluate('JSON.stringify([CM_YEAR_APP.getState().cash,CM_YEAR_APP.getState().metrics,CM_YEAR_APP.getState().year])');await click('[data-year-action="regions"]');await click('[data-flow-action="details"]');await click('[data-flow-action="enter"]');await until('!CM_FLOW.isActive()','return from region map');assert.equal(await evaluate('JSON.stringify([CM_YEAR_APP.getState().cash,CM_YEAR_APP.getState().metrics,CM_YEAR_APP.getState().year])'),economy,'browsing regions preserves progress');await click('[data-year-action="language"]');assert(await evaluate('document.documentElement.lang==="zh-CN"'),'switch back to Chinese');assert.equal(await evaluate('JSON.stringify([CM_YEAR_APP.getState().cash,CM_YEAR_APP.getState().metrics,CM_YEAR_APP.getState().year])'),economy,'locale never changes game state');
 console.log('PASS restored regional map, unplayable regions, English room/cards/report, Chinese switching, identical economy');
 }finally{if(socket?.readyState===WebSocket.OPEN){try{await send('Browser.close');}catch(_){}socket.close();}if(child.exitCode===null)child.kill();for(const t of pending.values())clearTimeout(t.timer);}}
main().catch(e=>{console.error(e);console.error(output);process.exitCode=1;});
