'use strict';
// Checks real CSS geometry at an exact iframe viewport, independent of Edge's minimum window size.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawnSync}=require('node:child_process'),{pathToFileURL}=require('node:url');
const assert=require('node:assert/strict');
const gameDir=path.resolve(__dirname,'..'),dist=path.join(gameDir,'dist');
const width=Number(process.argv[process.argv.indexOf('--width')+1])||1440;
const height=Number(process.argv[process.argv.indexOf('--height')+1])||900;
const output=fs.mkdtempSync(path.join(os.tmpdir(),'clementi-focus-layout-'));
const edge=process.env.EDGE_PATH||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const checks=async function(){
  const passed=[],rects={},wait=ms=>new Promise(r=>setTimeout(r,ms));
  const check=(value,label)=>{if(!value)throw new Error(label);passed.push(label);};
  const click=q=>{const el=document.querySelector(q);if(!el)throw new Error('Missing '+q);el.click();};
  const visible=el=>!!el&&getComputedStyle(el).display!=='none'&&el.getBoundingClientRect().width>0;
  const rect=q=>{const el=document.querySelector(q);if(!visible(el))return null;const r=el.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),right:Math.round(r.right),bottom:Math.round(r.bottom)};};
  const overlaps=(a,b)=>a&&b&&Math.min(a.right,b.right)-Math.max(a.x,b.x)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>1;
  function audit(label){
    const selected={focus:rect('#focus-panel'),goals:rect('.neighbour-dock'),hand:rect('.hand-dock'),mail:rect('#mailbox'),feed:rect('#world-feed'),resources:rect('.resource-bar'),camera:rect('.camera-controls')};
    rects[label]=selected;
    check(!!selected.focus&&!!selected.goals&&!!selected.hand,label+': main need, goals and action entry visible');
    for(const [name,r] of Object.entries(selected))if(r)check(r.x>=-1&&r.right<=innerWidth+1&&r.y>=-1&&r.bottom<=innerHeight+1,label+': '+name+' stays inside viewport');
    for(const [a,b] of [['focus','goals'],['focus','hand'],['focus','feed'],['focus','resources'],['goals','hand'],['mail','focus'],['mail','goals'],['mail','hand'],['mail','feed'],['camera','hand']])check(!overlaps(selected[a],selected[b]),label+': '+a+' does not cover '+b);
    check(document.querySelectorAll('#metrics .metric-row').length===3,label+': all three goals remain available');
    check(document.querySelectorAll('#hand-cards .play-card').length<=3,label+': at most three suggested cards');
    check(document.documentElement.scrollWidth<=innerWidth+1,label+': no horizontal overflow');
  }
  let report;
  try{
    check(!!window.CM_APP&&!!window.CM_NEEDS,'game and needs module load');
    window.CM_FLOW.showMap();click('[data-flow-action="details"]');click('[data-flow-action="enter"]');await wait(800);click('[data-action="tutorial-skip"]');
    click('#pause');const dismiss=document.querySelector('[data-action="dismiss-notice"]');if(dismiss)dismiss.click();
    window.CM_APP.focusNeed('chen');await wait(150);audit('Chinese main screen');
    window.CM_APP.focusNeed('kumar');window.CM_APP.setLanguage('en');await wait(100);audit('English caregiving need');
    window.CM_APP.showNeeds();await wait(50);const modal=document.querySelector('#modal');check(modal.open,'all-needs dialog opens');check(document.querySelectorAll('.needs-list .need-row').length===8,'all eight households remain accessible');check(modal.scrollWidth<=modal.clientWidth+1,'needs dialog has no horizontal overflow');const endIcon=document.querySelector('.need-row>.ui-icon:last-child');check(!endIcon||endIcon.getBoundingClientRect().width<=20,'need row action icon stays compact');
    click('[data-action="close"]');window.CM_APP.setLanguage('zh');window.CM_APP.focusNeed('chen');
    const more=document.querySelector('.more-menu');if(more){more.open=true;const menu=rect('.more-menu-content');check(!!menu&&menu.x>=-1&&menu.right<=innerWidth+1&&menu.y>=-1,'secondary tools open inside viewport');more.open=false;}
    await wait(700);window.requestAnimationFrame=()=>0;
    report={ok:true,viewport:{width:innerWidth,height:innerHeight},passed,rects};
  }catch(e){report={ok:false,viewport:{width:innerWidth,height:innerHeight},passed,rects,error:e.message,stack:e.stack};}
  parent.postMessage({focusLayout:report},'*');
};
let html=fs.readFileSync(path.join(dist,'index.html'),'utf8').replace('<head>','<head><base href="'+pathToFileURL(dist+path.sep).href+'">');
html=html.replace('</body>','<script>addEventListener("load",()=>('+checks.toString()+')());</script></body>');
const escape=s=>s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const shell='<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#182638"><iframe style="display:block;border:0;width:'+width+'px;height:'+height+'px" srcdoc="'+escape(html)+'"></iframe><pre id="layout-result" hidden></pre><script>addEventListener("message",e=>{if(e.data.focusLayout)document.getElementById("layout-result").textContent=JSON.stringify(e.data.focusLayout)})</script></body></html>';
const page=path.join(output,'layout.html'),screenshot=path.join(output,'main-screen.png');fs.writeFileSync(page,shell);
const run=spawnSync(edge,['--headless=new','--no-first-run','--no-default-browser-check','--disable-extensions','--disable-background-networking','--disable-gpu','--enable-unsafe-swiftshader','--user-data-dir='+path.join(output,'profile'),'--window-size='+Math.max(width+24,560)+','+(height+100),'--virtual-time-budget=6000','--dump-dom','--screenshot='+screenshot,pathToFileURL(page).href],{windowsHide:true,encoding:'utf8',timeout:45000,maxBuffer:25*1024*1024});
fs.writeFileSync(path.join(output,'browser.log'),run.stderr||'');fs.writeFileSync(path.join(output,'page.html'),run.stdout||'');
if(run.error)throw run.error;
const match=(run.stdout||'').match(/<pre id="layout-result"[^>]*>([\s\S]*?)<\/pre>/);assert.ok(match,'No browser report; see '+output);
const result=JSON.parse(match[1].replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&'));
console.log(JSON.stringify({...result,screenshot,output},null,2));assert.equal(result.ok,true,result.error);
