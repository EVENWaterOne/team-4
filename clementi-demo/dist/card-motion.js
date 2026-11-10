/* Card motion for the pixel UI (pixel-card-motion.css holds the looks).
   - Drag to play: drag a policy card up out of the hand and let go to choose it (Slay the Spire).
     While held it sways with the pointer's speed (Balatro). Let go lower and it springs back.
     A plain click still chooses, and the keyboard is untouched.
   - Discard: when the hand changes (next need, another need, or confirm), copies of the old cards
     leave: the chosen one flies into its slot in the side list, the rest fall away to the lower right.
   Only runs with data-ui="pixel", a mouse or pen, and no reduced-motion preference. */
(function(root){
  'use strict';
  const doc=root.document;
  const on=()=>doc.documentElement.dataset.ui==='pixel'&&!root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const en=()=>(doc.documentElement.lang||'').toLowerCase().startsWith('en');
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const now=()=>root.performance.now();
  let drag=null,allowClick=false,suppressUntil=0;

  /* —— drag to play —— */
  doc.addEventListener('pointerdown',e=>{
    if(!on()||e.button!==0||e.pointerType==='touch'||drag)return;
    const btn=e.target.closest?.('.yr-policy .yr-card>.policy-option');
    if(!btn||btn.disabled)return;
    const card=btn.parentElement,panel=card.closest('.yr-policy');
    drag={btn,card,panel,row:card.parentElement,head:panel?.querySelector('.yr-policy-head'),id:e.pointerId,x:e.clientX,y:e.clientY,lx:e.clientX,lt:e.timeStamp,vx:0,tilt:0,live:false,armed:false,raf:0};
  },true);

  function begin(d){
    d.live=true;
    d.card.classList.add('is-dragging');d.row?.classList.add('is-drag');d.panel?.classList.add('is-card-drag');
    if(d.head)d.head.dataset.pxmDrop=en()?'Drag up here to choose':'拖到这里，松手选定';
    doc.documentElement.classList.add('pxm-grabbing');
    d.reach=Math.min(120,Math.round(d.card.offsetHeight*.32));
    const tick=()=>{if(drag!==d)return;d.vx*=.84;const t=clamp(Math.round(d.vx*10),-12,12);if(t!==d.tilt){d.tilt=t;d.card.style.setProperty('--drag-tilt',t+'deg');}d.raf=root.requestAnimationFrame(tick);};
    d.raf=root.requestAnimationFrame(tick);
  }

  root.addEventListener('pointermove',e=>{
    const d=drag;if(!d||e.pointerId!==d.id)return;
    const dx=e.clientX-d.x,dy=e.clientY-d.y;
    if(!d.live){if(Math.hypot(dx,dy)<7)return;begin(d);}
    const dt=Math.max(8,e.timeStamp-d.lt);d.vx=d.vx*.5+((e.clientX-d.lx)/dt)*.5;d.lx=e.clientX;d.lt=e.timeStamp;
    d.card.style.setProperty('--drag-x',Math.round(dx)+'px');d.card.style.setProperty('--drag-y',Math.round(dy)+'px');
    const armed=dy<-d.reach;
    if(armed!==d.armed){d.armed=armed;d.card.classList.toggle('is-armed',armed);d.panel?.classList.toggle('is-play-armed',armed);if(d.head)d.head.dataset.pxmDrop=armed?(en()?'Release to choose':'松手选定这张'):(en()?'Drag up here to choose':'拖到这里，松手选定');}
    e.preventDefault();
  },{passive:false});

  function finish(d,play){
    drag=null;root.cancelAnimationFrame(d.raf);
    doc.documentElement.classList.remove('pxm-grabbing');
    d.row?.classList.remove('is-drag');d.panel?.classList.remove('is-card-drag','is-play-armed');
    if(!d.live)return;
    suppressUntil=now()+400;
    if(play&&d.btn.isConnected&&!d.btn.disabled){
      const r=d.card.getBoundingClientRect(),from={x:r.left+r.width/2,y:r.top+r.height/2,tilt:d.tilt};
      const issue=d.btn.dataset.issue,policy=d.btn.dataset.policy;
      allowClick=true;try{d.btn.click();}finally{allowClick=false;}
      land(issue,policy,from);
      if(d.card.isConnected)settle(d);
      return;
    }
    settle(d);
  }
  // back to the hand: drop the drag state and let the transition carry it home
  function settle(d){d.card.classList.remove('is-dragging','is-armed');['--drag-x','--drag-y','--drag-tilt'].forEach(k=>d.card.style.removeProperty(k));}
  // the re-rendered chosen card starts where it was dropped and lands in its slot
  function land(issue,policy,from){
    const btn=[...doc.querySelectorAll('.yr-policy .yr-card>.policy-option')].find(b=>b.dataset.issue===issue&&b.dataset.policy===policy);
    const card=btn?.parentElement;if(!card||!card.classList.contains('is-on'))return;
    card.classList.remove('is-picked-now');
    const rest=root.getComputedStyle(card).transform,base=rest==='none'?'':rest,r=card.getBoundingClientRect();
    const dx=Math.round(from.x-(r.left+r.width/2)),dy=Math.round(from.y-(r.top+r.height/2));
    card.classList.add('pxm-landed');
    card.animate([{transform:'translate('+dx+'px,'+dy+'px) rotate('+from.tilt+'deg) '+base},{transform:'translate(0px,-12px) '+base,offset:.7},{transform:rest}],{duration:220,easing:'cubic-bezier(.2,1.1,.4,1)'});
    const row=card.parentElement;row.classList.remove('pxm-thud');void row.offsetWidth;row.classList.add('pxm-thud');
    root.setTimeout(()=>{card.classList.remove('pxm-landed');row.classList.remove('pxm-thud');},420);
  }
  root.addEventListener('pointerup',e=>{const d=drag;if(d&&e.pointerId===d.id)finish(d,d.armed);});
  root.addEventListener('pointercancel',e=>{const d=drag;if(d&&e.pointerId===d.id)finish(d,false);});
  root.addEventListener('blur',()=>{if(drag)finish(drag,false);});
  doc.addEventListener('keydown',e=>{if(drag&&e.key==='Escape')finish(drag,false);});

  /* —— clicks: swallow the click that ends a drag; copy the old hand out before it is replaced —— */
  root.addEventListener('click',e=>{
    if(allowClick)return;
    if(now()<suppressUntil&&e.target.closest?.('.yr-policy .yr-card')){e.stopImmediatePropagation();e.preventDefault();return;}
    if(!on())return;
    const t=e.target.closest?.('[data-year-action]');if(!t||t.disabled)return;
    const action=t.dataset.yearAction;if(action!=='switch'&&action!=='next')return;
    const panel=doc.querySelector('.yr-panel.yr-policy');if(!panel)return;
    const slot=panel.querySelector('.yr-policy-item.is-now'),chosen=panel.querySelector('.policy-options>.yr-card.is-on');
    if(action==='switch'&&t.classList.contains('is-now'))return;
    if(action==='next'&&!chosen)return;
    discard(panel,slot,chosen);
  },true);

  function discard(panel,slot,chosen){
    const cards=[...panel.querySelectorAll('.policy-options>.yr-card')];if(!cards.length)return;
    const layer=doc.createElement('div');layer.className='pxm-ghosts';layer.setAttribute('aria-hidden','true');
    const W=root.innerWidth,H=root.innerHeight,s=slot?.getBoundingClientRect();
    const jobs=cards.map((card,n)=>{
      const tf=root.getComputedStyle(card).transform;
      card.style.transition='none';card.style.transform='none';
      const r=card.getBoundingClientRect(),g=card.cloneNode(true);
      g.classList.remove('is-dealing','is-picked-now','pxm-landed','is-dragging','is-armed');
      g.removeAttribute('style');
      Object.assign(g.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',transform:tf});
      g.querySelectorAll('button').forEach(b=>{b.tabIndex=-1;b.removeAttribute('data-year-action');});
      layer.append(g);
      return {g,r,base:tf==='none'?'':tf,mine:card===chosen,n};
    });
    doc.body.append(layer);
    // if the game kept this hand (a refusal toast, say), put the cards back and drop the copies
    root.setTimeout(()=>{if(!cards.some(c=>c.isConnected))return;cards.forEach(c=>{c.style.removeProperty('transition');c.style.removeProperty('transform');});layer.remove();},0);
    let k=0;
    for(const j of jobs){
      const cx=j.r.left+j.r.width/2,cy=j.r.top+j.r.height/2;
      if(j.mine&&s){
        const sx=Math.round(s.left+s.width/2-cx),sy=Math.round(s.top+s.height/2-cy),sc=clamp(s.height/j.r.height,.1,.4).toFixed(3);
        j.g.animate([{transform:j.base||'none'},{transform:'translate(0px,-18px) '+j.base,offset:.3},{transform:'translate('+sx+'px,'+sy+'px) scale('+sc+')',opacity:1,offset:.88},{transform:'translate('+sx+'px,'+sy+'px) scale('+sc+')',opacity:0}],{duration:320,easing:'cubic-bezier(.5,0,.2,1)',fill:'forwards'});
      }else{
        const tx=Math.round(W+j.r.width*.6-cx),ty=Math.round(H+j.r.height*.4-cy),rot=16+k*7;
        j.g.animate([{transform:j.base||'none'},{transform:'translate(0px,-12px) '+j.base,offset:.25},{transform:'translate('+tx+'px,'+ty+'px) rotate('+rot+'deg)'}],{duration:300,delay:k*45,easing:'cubic-bezier(.55,0,.85,.35)',fill:'both'});
        k++;
      }
    }
    root.setTimeout(()=>layer.remove(),560);
    if(chosen&&slot){const id=slot.dataset.id;root.setTimeout(()=>{const item=[...doc.querySelectorAll('.yr-policy-item')].find(b=>b.dataset.id===id);if(!item)return;item.classList.add('pxm-slot-hit');root.setTimeout(()=>item.classList.remove('pxm-slot-hit'),300);},280);}
  }

  root.CM_CARD_MOTION={isDragging:()=>!!drag?.live};
})(window);
