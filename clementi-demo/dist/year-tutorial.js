/* Round-one tutorial: the player learns by playing year one.
 * Each step lights one thing (the rest of the screen goes grey, a gold loop is drawn around it) and waits
 * for the player to do it — knock, reply, ask, go back, pick a card, confirm, read the report.
 * Some steps leave the screen free and only ring the next thing. The tutorial ends with year one. */
(function(root){
  'use strict';
  const doc=root.document;if(!doc)return;
  const KEY='downstairs-clementi-tour-v2';
  const lang=()=>root.CM_I18N?.getLanguage?.()||'zh',w=(zh,en)=>lang()==='en'?en:zh;
  const reduced=()=>!!root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const val=v=>typeof v==='function'?v():v;
  function load(){try{return JSON.parse(root.localStorage.getItem(KEY)||'{}')||{};}catch(_){return {};}}
  function store(){try{root.localStorage.setItem(KEY,JSON.stringify(memory));}catch(_){}}
  let memory=load(),forced=false;
  const E=()=>root.CM_YEARS,app=()=>root.CM_YEAR_APP,state=()=>app()?.getState?.();
  const yearNo=()=>Number(state()?.year)||1;
  const start=()=>E()?.startMetrics?.()?.stay??57,goal=()=>E()?.goalTarget?.()??70,years=()=>state()?.maxYears||7;

  /* —— Where the player is —— */
  const PHASES=['visit','policy','enact','report'];
  const phase=()=>doc.body.dataset.phase||'';
  const phaseAt=()=>{const p=phase();return p==='ended'?3:Math.max(0,PHASES.indexOf(p));};
  const openDialog=()=>[...doc.querySelectorAll('dialog[open]')].pop()||null;
  const inHome=()=>{const d=openDialog();return d&&d.querySelector('.cm-home-layout')?d:null;};
  const refusalOpen=()=>{const d=openDialog();return !!d&&(d.classList.contains('refusal-modal')||!!d.querySelector('.refusal-event'));};
  const onMap=()=>phase()==='visit'&&!openDialog();
  const q=sel=>(openDialog()||doc).querySelector(sel);
  function visibleEl(e){if(!e)return false;const r=e.getBoundingClientRect();return r.width>4&&r.height>4&&r.bottom>0&&r.right>0&&r.top<root.innerHeight&&r.left<root.innerWidth&&!e.closest('[hidden]');}
  const seen=sel=>visibleEl(q(sel));
  const found=()=>{const d=inHome();return !!d&&visibleEl(d.querySelector('.year-talk-found'));};
  // Each home this year: its need heard, or it turned the player away, or still to visit.
  function homes(){const s=state(),Y=E();if(!s||!Y?.households)return [];return Y.households().map(h=>({id:h.id,st:Y.refusal(s,h.id)?.seen?'refused':Y.issues(s).some(i=>i.residentId===h.id&&Y.learned(s,i.id))?'found':'left'}));}
  const heardAll=()=>{const list=homes();return list.length>0&&list.every(h=>h.st!=='left');};

  /* —— Small pictures used in the cards, so most of it is shown rather than written —— */
  const ic=(n,c='')=>app()?.icon?.(n,c)||'';
  const svg=d=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+d+'</svg>';
  const TONE={listen:'<path d="M7.5 10a4.5 4.5 0 1 1 9 0c0 2.6-2.2 3.4-2.2 6a2.6 2.6 0 0 1-5.1.6"/><path d="M10.2 10.2a1.8 1.8 0 0 1 3.6 0c0 1-1 1.4-1.4 2"/>',care:'<path d="M12 19.5s-7-4.3-7-9.4A3.9 3.9 0 0 1 12 7.8a3.9 3.9 0 0 1 7 2.3c0 5.1-7 9.4-7 9.4z"/>',form:'<path d="M7.5 5.5h9v14h-9z"/><path d="M10 4h4v3h-4z"/><path d="M10 11h4M10 14.5h3"/>',ask:'<path d="M4.5 5.5h15v10h-8l-4 3v-3h-3z"/><path d="M10.4 8.9a1.7 1.7 0 1 1 2.3 1.6c-.4.2-.7.5-.7 1"/><path d="M12 13.4h.01"/>'};
  const pct=v=>Math.max(0,Math.min(100,(v-30)/50*100)).toFixed(0)+'%';
  const GOALS=[['stay','home'],['social','people'],['comfort','leaf']];
  function visGoals(){return '<div class="yt-goals">'+GOALS.map(([k,g])=>'<span class="is-'+k+'">'+ic(g)+'<i style="--a:'+pct(start())+';--t:'+pct(goal())+'"><b></b></i></span>').join('')+'<em><b>'+start()+'</b>'+ic('arrow')+'<b>≥ '+goal()+'</b></em></div>';}
  function visLoop(note){const st=[['door',w('探访','Visit')],['cards',w('决策','Decide')],['build',w('落实','Act')],['chart',w('报告','Report')]];
    return '<div class="yt-loop">'+st.map(([g,l],i)=>(i?'<i class="yt-loop-arrow">'+ic('arrow')+'</i>':'')+'<span>'+ic(g)+'<small>'+esc(l)+'</small></span>').join('')+'<b>× '+years()+'</b></div>'+(note||'');}
  function visTones(list){const L={listen:w('倾听','Listen'),care:w('关心','Care'),form:w('公事公办','By the book'),ask:w('追问','Ask')};return '<div class="yt-chips">'+list.map(t=>'<span class="yt-chip is-'+t+'">'+svg(TONE[t])+esc(L[t])+'</span>').join('')+'</div>';}
  function visTrust(){return '<div class="yt-trust"><span class="yt-trust-bar"><i class="is-on"></i><i class="is-on"></i><i class="is-on is-key"></i><i></i></span><i class="yt-loop-arrow">'+ic('arrow')+'</i><span class="yt-chip is-ask is-glow">'+svg(TONE.ask)+esc(w('追问','Ask'))+'</span></div>';}
  function visCard(){
    const types=[['community',w('社区协调','Community'),w('便宜','cheap')],['service',w('专业服务','Service'),w('稳妥','steady')],['capital',w('长期投资','Investment'),w('次年起','from next year')]];
    return '<div class="yt-card"><div class="yt-card-face"><span class="yt-card-cost">'+ic('money')+'2</span><span class="yt-card-staff">'+ic('people')+'0</span><span class="yt-card-fx">'+GOALS.map(([k,g],i)=>'<span class="is-'+k+'">'+ic(g)+'<i>'+'<b></b>'.repeat([1,0,2][i])+'</i></span>').join('')+'</span></div>'+
      '<ul class="yt-card-keys"><li>'+ic('money')+esc(w('花多少钱','what it costs'))+'</li><li>'+ic('people')+esc(w('要几个人','staff it needs'))+'</li><li><i class="yt-block"></i>'+esc(w('对目标的影响','effect on goals'))+'</li></ul></div>'+
      '<div class="yt-types">'+types.map(([k,l,s])=>'<span class="is-'+k+'"><b>'+esc(l)+'</b><small>'+esc(s)+'</small></span>').join('')+'</div>';}
  function visPreview(){
    const p=E()?.preview?.(state());if(!p?.after)return '';const before=p.before||state().metrics,s=state();
    const row=GOALS.map(([k,g])=>{const a=before[k],b=p.after[k],d=b-a;return '<span class="is-'+k+'">'+ic(g)+'<b>'+a+'</b>'+ic('arrow')+'<b>'+b+'</b><em class="'+(d<0?'is-neg':'')+'">'+(d>0?'+':'')+(d||'±0')+'</em></span>';}).join('');
    return '<div class="yt-preview">'+row+'<span class="is-cash">'+ic('money')+'<b>'+s.cash+'</b>'+ic('arrow')+'<b>'+p.remainingCash+'</b></span></div>';}
  function visHomes(){const list=homes(),n=list.filter(h=>h.st==='found').length,glyph={found:'found',refused:'refused',left:'door'};
    return '<div class="yt-homes">'+list.map(h=>'<span class="is-'+h.st+'">'+(root.CM_ART?.portrait?.(h.id)||'')+'<i>'+ic(glyph[h.st])+'</i></span>').join('')+'<em><b>'+n+'</b>'+esc(w(' 项需求',n===1?' need':' needs'))+'</em></div>';}
  function visNext(){return visLoop('<div class="yt-chips"><span class="yt-chip is-warn">'+ic('alert')+esc(w('第 3 年起：紧急情况','From year 3: emergencies'))+'</span><span class="yt-chip">'+ic('help')+esc(w('规则：顶栏「?」','Rules: “?” in the top bar'))+'</span></div>');}

  /* —— The script for year one. mode: info (grey, read, press OK) · do (grey, only the lit part works) · free (nothing blocked, just a ring) —— */
  const STEPS=[
    {id:'welcome',phase:0,mode:'info',where:onMap,delay:900,title:()=>w('欢迎，社区调查员','Welcome, surveyor'),text:()=>w(years()+' 年后，让三项目标都到 '+goal()+'。','In '+years()+' years, get all three goals to '+goal()+'.'),vis:()=>visGoals()+visLoop(),ok:()=>w('开始第 '+yearNo()+' 年','Start year '+yearNo())},
    {id:'knock',phase:0,mode:'do',where:onMap,delay:300,target:'.yr-zone-homes',tap:'.yr-home:not(.is-refused)',title:()=>memory.refused?w('换一户试试','Try another home'):w('点一户，进门','Pick a home'),text:()=>w('先听听住户最近怎么样。','Hear how they are doing.'),done:()=>!!inHome()},
    {id:'reply',phase:0,mode:'do',where:()=>!!inHome()&&seen('.year-talk-choice'),delay:900,away:'home',target:'.year-talk-respond',title:()=>w('回应一句','Reply'),text:()=>w('选一句，或自己打字。','Pick a line, or type your own.'),vis:()=>visTones(['listen','care','form']),on:{click:'[data-year-talk-choice]',submit:'[data-year-talk-form]'},done:found},
    {id:'open',phase:0,mode:'free',where:()=>!!inHome(),delay:700,away:'home',target:'.year-talk-trust',anchor:'.year-talk-panel',prefer:['left','bottom'],title:()=>w('多聊几句','Keep talking'),text:()=>w('聊开到第三格，就能追问。','At the third step you can ask further.'),vis:visTrust,done:()=>found()||seen('.year-talk-choice.is-ask.is-ready')},
    {id:'ask',phase:0,mode:'do',where:()=>!!inHome()&&seen('.year-talk-choice.is-ask'),delay:400,away:'home',target:'.year-talk-choice.is-ask',title:()=>w('追问','Ask further'),text:()=>w('问出 TA 真正需要的。','Find out what they really need.'),done:found},
    {id:'found',phase:0,mode:'info',where:found,delay:900,target:'.year-talk-found',title:()=>w('听到需求了！','A need!'),text:()=>w('金色这句已放进需求区。','The gold line goes to your Needs.'),ok:()=>w('好','OK'),done:()=>!inHome()},
    {id:'back',phase:0,mode:'do',where:()=>!!inHome(),delay:200,target:'[data-year-talk-return]',title:()=>w('回到社区','Back outside'),text:()=>'',done:()=>!openDialog()&&phase()==='visit'},
    {id:'needs',phase:0,mode:'info',where:()=>onMap()&&seen('.yr-need'),delay:700,target:'.yr-zone-needs',title:()=>w('需求在这里','Your needs'),text:()=>w('点开能看详情和三种做法。','Open one for details and three ways to help.'),ok:()=>w('好','OK')},
    {id:'more',phase:0,mode:'free',where:()=>onMap()&&!heardAll(),delay:500,target:'.yr-zone-homes',tap:'.yr-home.is-talked,.yr-home.is-unknown',prefer:['top','right'],title:()=>w('再去几户看看','Visit more homes'),text:()=>w('每户一年一个需求。每户都敲敲门，收齐了再去决策。','One need per home a year. Knock on every door, then decide.'),vis:visHomes,done:heardAll},
    {id:'decide',phase:0,mode:'do',where:()=>onMap()&&heardAll(),delay:700,target:'#year-next',title:()=>w('需求收齐了！','All needs heard!'),text:()=>w('能听到的需求都在需求区了，去决策吧。','Every need you could hear is in Needs. Time to decide.'),vis:visHomes,done:()=>phaseAt()>0},
    {id:'pick',phase:1,mode:'do',where:()=>phase()==='policy'&&!openDialog()&&seen('.policy-option'),delay:1300,target:'.policy-options',title:()=>w('选一张卡','Pick a card'),text:()=>w('三种做法，花费和效果都不同。','Three ways to help, each with its own cost and effect.'),vis:visCard,done:()=>seen('.policy-option[aria-pressed="true"]')},
    {id:'preview',phase:1,mode:'info',where:()=>phase()==='policy'&&!openDialog(),delay:500,target:['#year-goals','#year-resources'],title:()=>w('顶栏 = 选完的结果','The top bar shows the result'),text:()=>'',vis:visPreview,ok:()=>w('好','OK')},
    {id:'confirm',phase:1,mode:'do',where:()=>phase()==='policy'&&!openDialog()&&!!doc.querySelector('#year-next:not([disabled])'),delay:200,target:'#year-next',title:()=>w('确认','Confirm'),text:()=>'',on:{click:'#year-next'}},
    {id:'rest',phase:1,mode:'free',where:()=>phase()==='policy'&&!openDialog()&&seen('.yr-policy-side'),delay:900,target:'.yr-policy-side',prefer:['bottom','left'],title:()=>w('每项都选一张','A card for each need'),text:()=>w('全部确认后开始落实。','Once all are confirmed, the year is put into action.'),done:()=>phaseAt()>1},
    {id:'act',phase:2,mode:'free',where:()=>phase()==='enact',delay:600,target:'.yr-enact',prefer:['left','right','top'],title:()=>w('落实','Putting it in place'),text:()=>w('地图上一项一项进行。','One item at a time, on the map.'),done:()=>phaseAt()>2},
    {id:'report',phase:3,mode:'info',where:()=>phase()==='report'&&seen('.yr-report-goals'),delay:2000,target:'.yr-report-goals',title:()=>w('第 '+yearNo()+' 年的结果','Year '+yearNo()+' result'),text:()=>w('亮起的是今年的变化，竖线是 '+goal()+'。','The lit part is this year’s change; the line is '+goal()+'.'),ok:()=>w('好','OK')},
    {id:'next',phase:3,mode:'do',where:()=>phase()==='report'&&seen('.yr-report-next'),delay:200,target:'.yr-report-next',title:()=>w('第 '+yearNo()+' 年完成！','Year '+yearNo()+' done!'),text:()=>w('之后每年都是这四步。','Every year runs the same four steps.'),vis:visNext,on:{click:'.yr-report-next'},done:()=>phase()!=='report'}
  ];
  // Shown once, over the knock scene, when a home turns the player away.
  const TIPS=[{id:'refused',mode:'info',where:()=>refusalOpen()&&['knock','more'].includes(STEPS[cur]?.id),delay:2600,target:'.refusal-event',title:()=>w('这户今年不方便','Not this year'),text:()=>w('一整年都不能再去，换一户吧。','You cannot come back this year. Try another home.'),ok:()=>w('好','OK'),after:()=>{memory.refused=1;memory['tip-refused']=1;store();}}];
  // When a home step is waiting but the player is back outside.
  const AWAY={home:{id:'away-home',mode:'free',where:onMap,target:'.yr-zone-homes',prefer:['top','right'],title:()=>w('进一户继续聊','Go in and keep talking'),text:()=>w('还没听到需求。','No need heard yet.')}};

  /* —— Progress —— */
  let cur=Math.max(0,Math.min(STEPS.length,Number(memory.at)||0));
  const flags=new Set();
  const finishedAll=()=>!!(memory.done||memory.skipped);
  function advance(){cur++;memory.at=cur;store();}
  function complete(){memory.done=1;memory.at=STEPS.length;store();forced=false;hide();}
  // Progress belongs to one save: every new game (a fresh seed) starts the tutorial again.
  function sameSave(s){
    if(memory.seed===s.seed)return;
    memory={seed:s.seed};cur=0;flags.clear();forced=false;waitingFor=null;store();if(shown)hide();
  }

  /* —— The layer —— */
  let layer=null,els=null,shown=null,lastBox='',drawnFor=null,placedFor=undefined,raf=0,waitingFor=null,since=0;
  function build(){
    layer=doc.createElement('div');layer.className='yr-tour';layer.dataset.i18nIgnore='';layer.hidden=true;
    layer.innerHTML='<div class="yr-tour-shade"></div><div class="yr-tour-block" data-b="t"></div><div class="yr-tour-block" data-b="r"></div><div class="yr-tour-block" data-b="b"></div><div class="yr-tour-block" data-b="l"></div><div class="yr-tour-block yr-tour-cover"></div>'+
      '<svg class="yr-tour-ring" aria-hidden="true"><path class="is-glow"></path><path class="is-line"></path></svg><span class="yr-tour-tap" aria-hidden="true"><i></i></span>'+
      '<section class="yr-tour-card" role="dialog" aria-live="polite" aria-labelledby="yr-tour-title"></section>';
    els={shade:layer.querySelector('.yr-tour-shade'),blocks:[...layer.querySelectorAll('.yr-tour-block[data-b]')],cover:layer.querySelector('.yr-tour-cover'),ring:layer.querySelector('.yr-tour-ring'),glow:layer.querySelector('.is-glow'),line:layer.querySelector('.is-line'),tap:layer.querySelector('.yr-tour-tap'),card:layer.querySelector('.yr-tour-card')};
    layer.addEventListener('click',event=>{
      const b=event.target.closest('[data-tour]');
      if(b){event.preventDefault();event.stopPropagation();if(b.dataset.tour==='ok'&&shown){flags.add(shown.id);shown.after?.();tick();}else if(b.dataset.tour==='skip')skip();return;}
      if(event.target.classList.contains('yr-tour-block')){event.preventDefault();event.stopPropagation();nudge();}
    });
    ['pointerdown','mousedown','wheel'].forEach(type=>layer.addEventListener(type,event=>{if(event.target.classList?.contains('yr-tour-block'))event.stopPropagation();},{passive:true}));
  }
  function nudge(){const c=els.card;c.classList.remove('is-nudge');void c.offsetWidth;c.classList.add('is-nudge');}
  function targetOf(step){
    if(!step.target)return [];
    const list=Array.isArray(step.target)?step.target:[step.target];
    return list.map(sel=>q(sel)).filter(visibleEl);
  }
  function boxOf(nodes,pad){
    if(!nodes.length)return null;let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
    for(const n of nodes){const r=n.getBoundingClientRect();x0=Math.min(x0,r.left);y0=Math.min(y0,r.top);x1=Math.max(x1,r.right);y1=Math.max(y1,r.bottom);}
    const W=root.innerWidth,H=root.innerHeight;x0=Math.max(4,x0-pad);y0=Math.max(4,y0-pad);x1=Math.min(W-4,x1+pad);y1=Math.min(H-4,y1+pad);
    return {x:x0,y:y0,w:x1-x0,h:y1-y0,cx:(x0+x1)/2,cy:(y0+y1)/2};
  }
  const roundRect=(b,r)=>{r=Math.min(r,b.w/2,b.h/2);return 'M'+(b.x+r)+' '+b.y+'H'+(b.x+b.w-r)+'A'+r+' '+r+' 0 0 1 '+(b.x+b.w)+' '+(b.y+r)+'V'+(b.y+b.h-r)+'A'+r+' '+r+' 0 0 1 '+(b.x+b.w-r)+' '+(b.y+b.h)+'H'+(b.x+r)+'A'+r+' '+r+' 0 0 1 '+b.x+' '+(b.y+b.h-r)+'V'+(b.y+r)+'A'+r+' '+r+' 0 0 1 '+(b.x+r)+' '+b.y+'Z';};
  // A loop drawn by hand: a rounded rectangle traced with a slight wobble that overshoots its own start.
  function loopPath(b,seed){
    const g=9,VW=root.innerWidth,VH=root.innerHeight,x0=Math.max(5,b.x-g),y0=Math.max(5,b.y-g),x1=Math.min(VW-5,b.x+b.w+g),y1=Math.min(VH-5,b.y+b.h+g),W=x1-x0,H=y1-y0,R=Math.min(30,W/2,H/2),straightW=W-2*R,straightH=H-2*R,arc=Math.PI*R/2,P=2*straightW+2*straightH+4*arc;
    const at=s=>{s=((s%P)+P)%P;
      if(s<straightW)return [x0+R+s,y0,0,-1];s-=straightW;
      if(s<arc){const a=-Math.PI/2+s/R;return [x1-R+R*Math.cos(a),y0+R+R*Math.sin(a),Math.cos(a),Math.sin(a)];}s-=arc;
      if(s<straightH)return [x1,y0+R+s,1,0];s-=straightH;
      if(s<arc){const a=s/R;return [x1-R+R*Math.cos(a),y1-R+R*Math.sin(a),Math.cos(a),Math.sin(a)];}s-=arc;
      if(s<straightW)return [x1-R-s,y1,0,1];s-=straightW;
      if(s<arc){const a=Math.PI/2+s/R;return [x0+R+R*Math.cos(a),y1-R+R*Math.sin(a),Math.cos(a),Math.sin(a)];}s-=arc;
      if(s<straightH)return [x0,y1-R-s,-1,0];s-=straightH;
      {const a=Math.PI+s/R;return [x0+R+R*Math.cos(a),y0+R+R*Math.sin(a),Math.cos(a),Math.sin(a)];}};
    const begin=straightW*.18,len=P*1.07,n=Math.max(48,Math.round(len/7));let d='';
    for(let i=0;i<=n;i++){const t=i/n,s=begin+len*t,[x,y,nx,ny]=at(s);let off=1.8*Math.sin(s/43+seed)+.6*Math.sin(s/19+seed*2.3)+6*t-2;if(x+nx*off<3||x+nx*off>VW-3||y+ny*off<3||y+ny*off>VH-3)off=Math.min(0,off);d+=(i?'L':'M')+(x+nx*off).toFixed(1)+' '+(y+ny*off).toFixed(1);}
    return d;
  }

  function render(step){
    if(!layer)build();const host=openDialog()||doc.body;if(layer.parentNode!==host)host.appendChild(layer);
    shown=step;layer.hidden=false;layer.dataset.mode=step.mode;layer.classList.toggle('is-reduced',reduced());drawnFor=null;lastBox='';placedFor=undefined;
    const n=STEPS.indexOf(step)>=0?STEPS.indexOf(step):cur,total=STEPS.length,text=val(step.text),vis=step.vis?val(step.vis):'',sprite=root.CM_ART_PACK?.player?.src;
    els.card.innerHTML='<div class="yr-tour-progress" style="--p:'+((n+1)/total*100).toFixed(1)+'%"><i></i></div>'+
      '<div class="yr-tour-top">'+(sprite?'<span class="yr-tour-guide"><img src="'+sprite+'" alt=""></span>':'')+'<div><small>'+esc(w('新手教程 · 第 '+yearNo()+' 年','Tutorial · Year '+yearNo()))+'</small><h3 id="yr-tour-title">'+esc(val(step.title))+'</h3></div></div>'+
      (text?'<p class="yr-tour-text">'+esc(text)+'</p>':'')+(vis?'<div class="yr-tour-vis">'+vis+'</div>':'')+
      '<div class="yr-tour-foot"><button type="button" class="text-button yr-tour-skip" data-tour="skip">'+esc(w('跳过教程','Skip tutorial'))+'</button><span></span>'+
      (step.mode==='info'?'<button type="button" class="primary-button" data-tour="ok">'+esc(val(step.ok)||w('好','OK'))+'</button>':'<span class="yr-tour-hint">'+hand()+esc(step.mode==='do'?w('点亮着的地方','Use the lit area'):w('随时可以继续玩','Carry on playing'))+'</span>')+'</div>';
    els.card.classList.remove('is-in');void els.card.offsetWidth;els.card.classList.add('is-in');
    // A lit thing that sits below the fold of a scrolling panel is brought into view first.
    const first=(Array.isArray(step.target)?step.target:step.target?[step.target]:[]).map(q).find(Boolean),fr=first?.getBoundingClientRect();
    if(fr&&(fr.bottom>root.innerHeight-8||fr.top<8))first.scrollIntoView?.({block:'nearest',behavior:reduced()?'auto':'smooth'});
    update(true);
    if(step.mode==='info')root.requestAnimationFrame?.(()=>els.card.querySelector('[data-tour="ok"]')?.focus({preventScroll:true}));
    loop();
  }
  function hide(){shown=null;root.cancelAnimationFrame?.(raf);if(layer){layer.hidden=true;layer.remove();}}
  function update(force){
    if(!shown||!layer||layer.hidden)return;
    const step=shown,nodes=targetOf(step),hole=boxOf(nodes,6),W=root.innerWidth,H=root.innerHeight,key=hole?[hole.x,hole.y,hole.w,hole.h].map(Math.round).join(',')+'|'+W+'x'+H:'none|'+W+'x'+H;
    if(!force&&key===lastBox)return;lastBox=key;
    const free=step.mode==='free',svgMask="<svg xmlns='http://www.w3.org/2000/svg' width='"+W+"' height='"+H+"'><path fill-rule='evenodd' d='M0 0H"+W+"V"+H+"H0Z"+(hole?roundRect(hole,Math.min(16,hole.h/2)):'')+"'/></svg>",url='url("data:image/svg+xml,'+encodeURIComponent(svgMask)+'")';
    els.shade.style.webkitMaskImage=url;els.shade.style.maskImage=url;els.shade.hidden=free;
    const open=step.mode==='do'&&!!hole,[t,r,b,l]=els.blocks;
    if(open){Object.assign(t.style,{left:'0',top:'0',width:W+'px',height:hole.y+'px'});Object.assign(b.style,{left:'0',top:(hole.y+hole.h)+'px',width:W+'px',height:Math.max(0,H-hole.y-hole.h)+'px'});Object.assign(l.style,{left:'0',top:hole.y+'px',width:hole.x+'px',height:hole.h+'px'});Object.assign(r.style,{left:(hole.x+hole.w)+'px',top:hole.y+'px',width:Math.max(0,W-hole.x-hole.w)+'px',height:hole.h+'px'});}
    else els.blocks.forEach(e=>Object.assign(e.style,{width:'0',height:'0'}));
    els.cover.hidden=free||open;
    if(hole){const d=loopPath(hole,STEPS.indexOf(step)*1.7+1);els.line.setAttribute('d',d);els.glow.setAttribute('d',d);els.ring.style.display='';
      const len=els.line.getTotalLength?.()||2000;
      if(drawnFor!==step){drawnFor=step;[els.line,els.glow].forEach(p=>{p.style.transition='none';p.style.strokeDasharray=len;p.style.strokeDashoffset=reduced()?0:len;void p.getBoundingClientRect();if(!reduced()){p.style.transition='stroke-dashoffset .7s cubic-bezier(.45,.05,.3,1)';p.style.strokeDashoffset=0;}});}
      else [els.line,els.glow].forEach(p=>{p.style.transition='none';p.style.strokeDasharray=len;p.style.strokeDashoffset=0;});
    }else els.ring.style.display='none';
    // A tapping finger on the thing to press: the named element, or the lit area when it is a single button.
    const tapEl=step.mode==='do'?(step.tap?q(step.tap):nodes[0]):step.tap?q(step.tap):null,tr=visibleEl(tapEl)?tapEl.getBoundingClientRect():null;
    if(tr&&(step.tap||(tr.width<220&&tr.height<110))){els.tap.style.left=(tr.left+tr.width*.74)+'px';els.tap.style.top=(tr.top+tr.height*.68)+'px';els.tap.hidden=false;}else els.tap.hidden=true;
    const moved=!placedFor||!hole!==!placedFor||(hole&&Math.abs(hole.x-placedFor.x)+Math.abs(hole.y-placedFor.y)+Math.abs(hole.w-placedFor.w)+Math.abs(hole.h-placedFor.h)>28);
    // The note sits beside its anchor when it has one (so it does not cover the conversation), else beside the ring.
    if(force||moved){placedFor=hole?{...hole}:null;const anchor=step.anchor?boxOf([q(step.anchor)].filter(visibleEl),6):null;place(anchor||hole,step.prefer,anchor?hole:null);}  // beside the anchor, level with what is ringed
  }
  function place(hole,prefer,align){
    const c=els.card,W=root.innerWidth,H=root.innerHeight,m=16,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));c.style.width='';let cw=c.offsetWidth,ch=c.offsetHeight,left,top,side='none',tail=0;
    if(!hole){left=(W-cw)/2;top=(H-ch)/2;}
    else{
      const base=(hole.cy<H/2?['bottom','top']:['top','bottom']).concat(hole.cx<W/2?['right','left']:['left','right']),order=[...new Set([...(prefer||[]),...base])];let room,gap;
      for(gap of [26,12]){room={bottom:H-m-(hole.y+hole.h)-gap,top:hole.y-gap-m,right:W-m-(hole.x+hole.w)-gap,left:hole.x-gap-m};side=order.find(s=>(s==='bottom'||s==='top')?room[s]>=ch:room[s]>=cw)||'inside';if(side!=='inside')break;}
      if(side==='inside')for(const s of order.filter(x=>x==='left'||x==='right')){if(room[s]<250)continue;c.style.width=Math.floor(Math.min(cw,room[s]))+'px';const h=c.offsetHeight;if(h<=H-2*m){side=s;cw=c.offsetWidth;ch=h;break;}c.style.width='';}
      if(side==='bottom'){top=hole.y+hole.h+gap;left=clamp(hole.cx-cw/2,m,W-m-cw);tail=clamp(hole.cx-left,26,cw-26);}
      else if(side==='top'){top=hole.y-gap-ch;left=clamp(hole.cx-cw/2,m,W-m-cw);tail=clamp(hole.cx-left,26,cw-26);}
      else if(side==='right'){const cy=align?align.cy:hole.cy;left=hole.x+hole.w+gap;top=clamp(cy-ch/2,m,H-m-ch);tail=clamp(cy-top,26,ch-26);}
      else if(side==='left'){const cy=align?align.cy:hole.cy;left=hole.x-gap-cw;top=clamp(cy-ch/2,m,H-m-ch);tail=clamp(cy-top,26,ch-26);}
      else{left=clamp(hole.cx-cw/2,m,W-m-cw);top=hole.cy<H/2?H-m-ch:m;}
    }
    c.style.left=Math.round(left)+'px';c.style.top=Math.round(top)+'px';c.dataset.side=side;c.style.setProperty('--tail',Math.round(tail)+'px');
  }
  function loop(){root.cancelAnimationFrame?.(raf);const f=()=>{if(!shown)return;update(false);raf=root.requestAnimationFrame(f);};raf=root.requestAnimationFrame?.(f)||0;}

  /* —— One look at the game, several times a second —— */
  function tick(){
    const s=state();if(!s)return;
    sameSave(s);
    if(finishedAll()&&!forced){if(shown)hide();return;}
    if(!forced&&Number(s.year)>1){complete();return;}  // a save already past year one never shows it
    if(root.CM_FLOW?.isActive?.()){if(shown)hide();return;}
    // Move past what is done, or what the player has already gone beyond.
    while(cur<STEPS.length){const st=STEPS[cur];if(flags.has(st.id)||phaseAt()>st.phase||(st.done&&st.done())){flags.delete(st.id);advance();continue;}break;}
    if(cur>=STEPS.length){complete();return;}
    const tip=TIPS.find(t=>!memory['tip-'+t.id]&&t.where());
    if(tip){want(tip);return;}
    const step=STEPS[cur];
    if(step.where())want(step);
    else if(step.away&&AWAY[step.away].where())want(AWAY[step.away]);
    else{waitingFor=null;if(shown)hide();}
  }
  // A step appears once its screen has held still for its delay.
  function want(step,onShow){
    if(shown===step)return;
    const now=root.performance?.now?.()??Date.now();
    if(waitingFor!==step){waitingFor=step;since=now;if(shown)hide();return;}
    if(now-since>=(step.delay||0)){waitingFor=null;onShow?.();render(step);}
  }
  // Doing the lit thing counts as done; the game reacts first, then the tutorial moves on.
  ['click','submit'].forEach(type=>doc.addEventListener(type,event=>{
    const step=shown,sel=step?.on?.[type];if(!sel||layer?.contains(event.target))return;
    if(event.target.closest?.(sel))root.setTimeout(()=>{flags.add(step.id);tick();},type==='submit'?30:60);
  },true));
  // Info steps do not let keys reach the room behind them.
  doc.addEventListener('keydown',event=>{
    if(!shown||!layer||layer.hidden||shown.mode==='free')return;const inCard=els.card.contains(event.target);
    if(shown.mode==='info'&&!inCard&&/^(Arrow|[wasdWASD ]$|Enter$)/.test(event.key)){event.preventDefault();event.stopPropagation();if(event.key==='Enter')els.card.querySelector('[data-tour="ok"]')?.click();}
  },true);
  root.addEventListener?.('resize',()=>update(true));
  root.addEventListener?.('localechange',()=>{if(shown)render(shown);});
  root.setInterval(tick,250);

  function skip(){const s=state();if(s)sameSave(s);memory.skipped=1;store();forced=false;hide();}
  root.CM_YEAR_TOUR={
    isActive:()=>!!shown&&shown.mode!=='free',
    current:()=>shown?{id:shown.id,mode:shown.mode,step:Math.max(0,STEPS.indexOf(shown)),steps:STEPS.length}:null,
    finished:()=>{const s=state();if(s)sameSave(s);return finishedAll();},
    replay(){memory={seed:state()?.seed};cur=0;flags.clear();store();forced=true;waitingFor=null;hide();},
    skip,
    steps:()=>STEPS.map(x=>({id:x.id,phase:x.phase,mode:x.mode,title:val(x.title),text:val(x.text)||'',ok:x.mode==='info'?val(x.ok)||'':'',target:x.target||null,acts:x.mode==='do'})),
    homes,
    extras:()=>[...TIPS,...Object.values(AWAY)].map(x=>({id:x.id,title:val(x.title),text:val(x.text)||'',ok:x.ok?val(x.ok):''}))
  };
  function hand(){return '<svg class="yr-tour-hand" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11"/><path d="M12 10.5V9a1.5 1.5 0 0 1 3 0v2"/><path d="M15 10.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-.6a5 5 0 0 1-4-2L4.6 15.6a1.6 1.6 0 0 1 2.4-2.1L9 15"/></svg>';}
})(typeof window!=='undefined'?window:globalThis);
