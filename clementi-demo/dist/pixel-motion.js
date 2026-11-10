/* Pixel motion trial (everything except the cards): short, smooth motion on top of the pixel UI,
 * eased with the theme's --px-ease token (docs/pixel-ui.md: the pixel look is in the shapes, not the
 * frame rate). Only the rhythm and feel are borrowed from other games; every shape here is our own.
 * · Year report: the results step in one by one, each effect fires a pixel bit into its goal bar,
 *   the number counts up with a climbing blip, and a goal that crosses 70 bursts gold. A click on
 *   the report, or Space / Enter / Escape, skips straight to the end.
 * · Openness meter: a little thought bubble pops over the resident and a gold bit flies into the
 *   cell that is about to light.
 * · Need quote: the gold highlight sweeps across the quote one character at a time, then the
 *   "need found" card stamps down.
 * · Room cursor: the brackets glide from cell to cell, squeeze on press, and the route
 *   dots appear one after another (the dots and squeeze live in pixel-motion.css).
 * Runs only with the pixel UI and without reduced motion; the markup and game state are untouched,
 * and every change is put back once its motion ends. */
(function(root){
  'use strict';
  const doc=root.document;if(!doc||typeof root.MutationObserver!=='function')return;
  const pixel=()=>doc.documentElement.dataset.ui==='pixel';
  const calm=()=>!!root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const live=()=>pixel()&&!calm();
  const sound=(name,arg)=>{try{root.CM_SOUND?.play?.(name,arg);}catch(_){}};
  const wait=ms=>new Promise(done=>root.setTimeout(done,ms));
  const GOALS=['stay','social','comfort'],TARGET=70;
  const pct=v=>Math.max(0,Math.min(1,(v-30)/50))*100;
  // The theme's easing, read live so a change to the token (say, back to steps) reaches these moves too.
  const ease=()=>{try{return root.getComputedStyle?.(doc.documentElement).getPropertyValue('--px-ease').trim()||'cubic-bezier(.2,.8,.3,1)';}catch(_){return 'cubic-bezier(.2,.8,.3,1)';}};

  /* —— Flying bits: small squares in a fixed layer above everything ——
   * An open <dialog> sits in the browser's top layer, so while one is open the bits fly inside it. */
  let layer=null;
  function bits(){
    const host=doc.querySelector('dialog[open]')||doc.body;if(layer&&layer.isConnected&&layer.parentNode===host)return layer;
    layer?.remove();layer=doc.createElement('div');layer.className='pxfx-layer';layer.setAttribute('aria-hidden','true');host.appendChild(layer);return layer;
  }
  // Points come in viewport pixels; the layer may not start at the viewport corner (a moving dialog).
  function local(p){const o=bits().getBoundingClientRect();return {x:p.x-o.left,y:p.y-o.top};}
  function centre(el){const r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,r};}
  // A low arc, sampled finely so the bit follows the curve, eased as a whole with the theme's easing.
  function fly(from,to,{cls='',frames=16,duration=260,lift=40,size=10,delay=0,fade=false}={}){
    from=local(from);to=local(to);const bit=doc.createElement('i');bit.className='pxfx-bit '+cls;bit.style.width=bit.style.height=size+'px';
    const at=t=>'translate('+(from.x+(to.x-from.x)*t-size/2).toFixed(1)+'px,'+(from.y+(to.y-from.y)*t-lift*4*t*(1-t)-size/2).toFixed(1)+'px)';
    bit.style.transform=at(0);bits().appendChild(bit);
    if(typeof bit.animate!=='function'){bit.remove();return Promise.resolve();}
    const frames_=[];for(let i=0;i<=frames;i++){const t=i/frames,f={transform:at(t),offset:t};if(fade)f.opacity=t<.55?1:Math.max(0,1-(t-.55)/.45);frames_.push(f);}
    const run=bit.animate(frames_,{duration,delay,fill:'both',easing:ease()});
    return run.finished.catch(()=>{}).then(()=>bit.remove());
  }
  // A burst of bits thrown outward from one point, then gone.
  function burst(at,{count=8,reach=34,cls='is-gold',size=8}={}){
    for(let i=0;i<count;i++){const a=(i/count)*Math.PI*2+.3,r=reach*(.7+.3*(i%2));fly(at,{x:at.x+Math.cos(a)*r,y:at.y+Math.sin(a)*r},{cls:cls+' is-spark',frames:8,duration:280,lift:6,size:i%2?size-2:size,fade:true});}
  }

  /* —— Year report: Balatro-style item-by-item count —— */
  let tally=null;const handled=new WeakSet();
  // The first-year tutorial explains the finished bars; the count never runs underneath it.
  const touring=()=>!!root.CM_YEAR_TOUR?.isActive?.();
  function goalRow(report,key){
    const row=report.querySelector('.yr-report-goal.is-'+key);if(!row)return null;
    const strong=row.querySelector(':scope>strong'),arrow=strong?.querySelector(':scope>span'),num=arrow?.nextSibling,base=row.querySelector('.yr-report-base'),delta=row.querySelector('.yr-report-delta');
    const a=parseInt(strong?.firstChild?.textContent,10),b=parseInt(num?.textContent,10);
    if(!num||num.nodeType!==3||!base||!delta||!Number.isFinite(a)||!Number.isFinite(b))return null;
    return {key,row,num,base,delta,track:row.querySelector('.yr-report-track'),a,b,value:a,cheered:false,saved:{base:base.getAttribute('style'),delta:delta.getAttribute('style'),down:delta.classList.contains('is-down')}};
  }
  function paintRow(g){
    const lo=Math.min(g.a,g.value),hi=Math.max(g.a,g.value);
    g.base.style.width=pct(lo).toFixed(1)+'%';g.delta.style.left=pct(lo).toFixed(1)+'%';g.delta.style.setProperty('--w',(pct(hi)-pct(lo)).toFixed(1)+'%');
    g.delta.classList.toggle('is-down',g.value<g.a);g.num.textContent=' '+g.value+' ';
    g.row.classList.remove('pxfx-bump');void g.row.offsetWidth;g.row.classList.add('pxfx-bump');
  }
  function edge(g){const r=g.track.getBoundingClientRect();return {x:r.left+r.width*pct(g.value)/100,y:r.top+r.height/2};}
  function cheer(g){
    if(g.cheered||g.a>=TARGET||g.b<TARGET||g.value<TARGET)return;g.cheered=true;
    g.row.classList.add('pxfx-goal');sound('goal');
    const mark=g.track.querySelector('b');if(mark)burst(centre(mark),{count:10,reach:40});
  }
  function chipAmount(chip){const m=/(\d+)/.exec(chip.textContent||'');const n=m?parseInt(m[1],10):0;return chip.classList.contains('is-down')||/[-−]\s*\d/.test(chip.textContent||'')?-n:n;}
  async function count(t){
    const {report}=t,alive=()=>!t.done&&report.isConnected;let n=0,pace=1;
    await wait(300);if(alive())report.classList.add('pxfx-counting');
    for(const result of report.querySelectorAll('.yr-result')){
      if(!alive())return;result.classList.add('pxfx-in');sound('tap');await wait(150*pace);
      const flights=[];
      for(const chip of result.querySelectorAll('.yr-result-effects>span')){
        if(!alive())return;const g=t.rows.find(x=>chip.classList.contains('is-'+x.key));chip.classList.add('pxfx-hit');if(!g)continue;
        const amount=chipAmount(chip);
        flights.push(fly(centre(chip),edge(g),{cls:'is-'+g.key+(amount<0?' is-down':''),duration:Math.round(260*pace)}).then(()=>{
          if(!alive())return;g.value=Math.max(0,Math.min(100,g.value+amount));paintRow(g);sound('tick',n++);cheer(g);}));
        await wait(120*pace);
      }
      await Promise.all(flights);await wait(90*pace);pace=Math.max(.6,pace*.88);
    }
    // Whatever the policies did not explain (the year's own drift, the 0–100 cap) settles last.
    for(const g of t.rows){
      if(!alive())return;
      if(g.value!==g.b){const from=g.value,steps=Math.min(4,Math.abs(g.b-from));for(let i=1;i<=steps;i++){if(!alive())return;g.value=Math.round(from+(g.b-from)*i/steps);paintRow(g);if(i===steps)sound('tick',n++);cheer(g);await wait(55);}}
      g.row.classList.add('pxfx-settled');await wait(110);
    }
    if(!alive())return;report.querySelector('.yr-money')?.classList.add('pxfx-in');await wait(200);
    finish(t);
  }
  function finish(t){
    if(!t||t.done)return;t.done=true;if(tally===t)tally=null;
    const {report}=t;report.classList.remove('pxfx-tally','pxfx-counting');report.removeEventListener('click',t.skip,true);doc.removeEventListener('keydown',t.key,true);
    for(const g of t.rows){
      g.base.setAttribute('style',g.saved.base||'');g.delta.setAttribute('style',g.saved.delta||'');g.delta.classList.toggle('is-down',g.saved.down);
      g.delta.classList.remove('is-growing');g.num.textContent=' '+g.b+' ';g.row.classList.remove('pxfx-bump');
    }
    report.querySelectorAll('.pxfx-in,.pxfx-hit,.pxfx-settled').forEach(el=>el.classList.remove('pxfx-in','pxfx-hit','pxfx-settled'));
  }
  function startTally(report){
    if(tally&&tally.report===report)return;if(tally)finish(tally);
    const rows=GOALS.map(k=>goalRow(report,k)).filter(Boolean);if(!rows.length)return;
    const t={report,rows,done:false};tally=t;
    // Skip on a click inside the report (buttons still do their own job) or on a confirming key.
    t.skip=e=>{if(!e.target.closest?.('button,a,summary,input'))finish(t);};
    t.key=e=>{if(['Escape',' ','Enter'].includes(e.key)&&!e.target.closest?.('input,textarea'))finish(t);};
    report.addEventListener('click',t.skip,true);doc.addEventListener('keydown',t.key,true);
    report.classList.add('pxfx-tally');for(const g of rows){g.delta.classList.remove('is-growing');g.delta.style.setProperty('--w','0%');g.base.style.width=pct(g.a).toFixed(1)+'%';g.delta.style.left=pct(g.a).toFixed(1)+'%';g.num.textContent=' '+g.a+' ';}
    count(t).catch(()=>finish(t));
  }
  function checkReport(){
    const report=doc.querySelector('#year-content .yr-report:not(.year-ending)');
    if(tally&&(!tally.report.isConnected||tally.report!==report||touring()))finish(tally);
    // Only a report that has just arrived carries the growing bars (the app's own "fresh" signal).
    if(!report||handled.has(report)||!report.querySelector('.yr-report-delta.is-growing'))return;
    handled.add(report);if(live()&&!touring())startTally(report);
  }

  /* —— Openness meter: a thought bubble over the resident, then a bit into the cell —— */
  let lastLevel={talk:null,level:null};
  function residentPoint(){
    const person=doc.querySelector('#cm-home-map [data-home-person]');if(!person)return null;
    const r=person.getBoundingClientRect();if(!r.width||r.bottom<0||r.top>root.innerHeight)return null;return {x:r.left+r.width*.62,y:r.top+4};
  }
  function think(at,delay){
    // Three squares stepping up and to the right, small to big, gone once the bit leaves.
    const sizes=[4,6,8],p=local(at);sizes.forEach((s,i)=>{const dot=doc.createElement('i');dot.className='pxfx-think';dot.style.cssText='width:'+s+'px;height:'+s+'px;transform:translate('+Math.round(p.x+i*7-s/2)+'px,'+Math.round(p.y-8-i*9-s/2)+'px);animation-delay:'+(delay+i*40)+'ms';bits().appendChild(dot);root.setTimeout(()=>dot.remove(),delay+360);});
    return {x:at.x+14,y:at.y-26};
  }
  function checkTrust(){
    const panel=doc.getElementById('year-talk-panel'),meter=panel?.querySelector('.year-talk-trust');
    if(meter){
      const talk=panel.dataset.yearTalkIssue||'',level=Number(meter.dataset.level);
      if(talk===lastLevel.talk&&level===5&&lastLevel.level<5&&!meter.dataset.pxfxFull&&live()){meter.dataset.pxfxFull='1';meter.classList.add('pxfx-full');root.setTimeout(()=>burst(centre(meter.querySelector('.year-talk-trust-bar')||meter),{count:8,reach:30}),120);}
      lastLevel={talk,level};
    }
    const cells=[...doc.querySelectorAll('#modal .year-talk-trust-bar i.is-rising:not([data-pxfx])')];if(!cells.length)return;
    cells.forEach(c=>c.dataset.pxfx='1');if(!live())return;
    const from=residentPoint();
    cells.forEach(cell=>{
      const d=Math.round((parseFloat(cell.style.getPropertyValue('--d'))||0)*1000),start=from?think(from,d):centre(cell.closest('.year-talk-trust')?.querySelector('svg')||cell);
      cell.classList.add('pxfx-await');
      fly(start,centre(cell),{cls:'is-gold',delay:d+(from?140:40),duration:210,lift:from?28:12,size:8});
    });
  }

  /* —— Need quote: a gold sweep, character by character, then the card stamps down —— */
  // The dialogue redraws while a line is still "fresh"; the same quote or card within a short while is not replayed.
  const seenLately={};
  function lately(kind,text){const now=Date.now(),was=seenLately[kind];seenLately[kind]={text,at:now};return !!was&&was.text===text&&now-was.at<20000;}
  function sweep(mark){
    const text=mark.textContent||'';if(!text)return 0;const chars=[...text],per=Math.max(12,Math.min(42,Math.round(900/chars.length)));
    mark.textContent='';mark.classList.add('pxfx-sweep');mark.style.setProperty('--per',per+'ms');
    chars.forEach((c,i)=>{const s=doc.createElement('span');s.className='pxfx-ch';s.style.setProperty('--k',i);s.textContent=c;mark.appendChild(s);});
    const total=(chars.length+5)*per+40;
    root.setTimeout(()=>{if(!mark.isConnected)return;mark.textContent=text;mark.classList.remove('pxfx-sweep','is-fresh');mark.style.removeProperty('--per');},total);
    return total;
  }
  function stamp(card,delay){
    card.classList.add('pxfx-wait');
    root.setTimeout(()=>{if(!card.isConnected)return;card.classList.remove('pxfx-wait');card.classList.add('pxfx-stamp');sound('card');root.setTimeout(()=>card.classList.remove('pxfx-stamp'),360);},delay);
  }
  function checkClue(){
    const marks=[...doc.querySelectorAll('#modal .year-talk-clue.is-fresh:not([data-pxfx])')],cards=[...doc.querySelectorAll('#modal .year-talk-found.is-fresh:not([data-pxfx])')];
    if(!marks.length&&!cards.length)return;
    marks.forEach(m=>m.dataset.pxfx='1');cards.forEach(c=>c.dataset.pxfx='1');if(!live())return;
    let delay=0;
    for(const mark of marks)if(!lately('clue',mark.textContent||''))delay=Math.max(delay,sweep(mark));
    for(const card of cards)if(!lately('card',card.textContent||''))stamp(card,delay?delay+60:0);
  }

  /* —— Room cursor: glide from the last cell; squeeze on press —— */
  const lastBox=new WeakMap();
  function checkCursor(){
    const map=doc.getElementById('cm-home-map');if(!map)return;
    const g=doc.getElementById('cm-home-cursor'),box=g?.querySelector('.cm-home-cursor-fill');
    if(!g||!box||g.getAttribute('visibility')==='hidden'){if(g)lastBox.delete(g);return;}
    const now={x:+box.getAttribute('x'),y:+box.getAttribute('y')},was=lastBox.get(g);lastBox.set(g,now);
    if(!was||(was.x===now.x&&was.y===now.y)||!live()||typeof g.animate!=='function')return;
    const dx=was.x-now.x,dy=was.y-now.y,top=doc.getElementById('cm-home-cursor-tag');
    for(const el of [g,top].filter(Boolean))el.animate([{transform:'translate('+dx+'px,'+dy+'px)'},{transform:'none'}],{duration:110,easing:ease()});
  }
  let pressTimer=0;
  function press(e){
    const map=e.target.closest?.('#cm-home-map');if(!map||!live())return;
    map.dataset.pxfxPress='1';root.clearTimeout(pressTimer);
    const up=()=>{pressTimer=root.setTimeout(()=>{delete map.dataset.pxfxPress;},70);};
    doc.addEventListener('pointerup',up,{once:true,capture:true});doc.addEventListener('pointercancel',up,{once:true,capture:true});
    pressTimer=root.setTimeout(()=>{delete map.dataset.pxfxPress;},600);
  }

  /* —— Watching the page —— */
  let queued=false;
  function check(){queued=false;if(!pixel())return;checkReport();checkTrust();checkClue();checkCursor();}
  function start(){
    new root.MutationObserver(()=>{if(!queued){queued=true;(root.queueMicrotask||(f=>Promise.resolve().then(f)))(check);}}).observe(doc.body,{childList:true,subtree:true});
    doc.addEventListener('pointerdown',press,{capture:true,passive:true});
    check();
  }
  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',start,{once:true});else start();
  root.CM_PIXEL_MOTION={skip:()=>finish(tally),busy:()=>!!tally};
})(typeof window!=='undefined'?window:globalThis);
