'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dist=path.join(__dirname,'..','dist'),plain=v=>JSON.parse(JSON.stringify(v)),tick=()=>new Promise(resolve=>setImmediate(resolve));

function fixture(real=false){
  const elements=new Map(),handlers={},calls=[],saved=[];
  const el=(id,dataset={})=>({id,dataset,innerHTML:'',textContent:'',value:'',disabled:false,querySelector:()=>null,focus(){},hasAttribute(){return false;}});
  const doc={getElementById:id=>elements.get(id)||null,addEventListener(type,fn){(handlers[type]||=[]).push(fn);}};
  const households=[{id:'chen',name:'陈玉英',title:'今天要去食阁',keyProp:'chen-umbrella-2',intel:'下午学生能顺路陪同，不需要工作人员全程陪。',topic:'先约好下午的同行时间。'},{id:'kumar',name:'库马尔与德薇',title:'联系照护服务',keyProp:'kumar-calendar-1',intel:'KUMAR_PRIVATE_FACT',topic:'在窗口开放前准备材料。'}];
  const create=()=>({day:1,phase:'plan',budget:36,visits:['chen','kumar'],plans:[],outcome:null,homeExplorations:{chen:{seen:[]},kumar:{seen:[]}},knowledge:{},history:[{day:0,results:[{residentId:'chen',title:'之前出行',text:'已陪同',status:'met'},{residentId:'kumar',text:'OTHER_PRIVATE_RESULT'}]}]});
  let state=create(),playing=true,near=true,language='zh',networkCalls=0;
  let E={households:()=>plain(households),intel(s,id){const h=households.find(x=>x.id===id),k=s.knowledge[id]||{},observed=s.homeExplorations[id].seen.includes(h.keyProp),talked=!!k.constraint||!!k.cooperate;return {known:!!k.need||talked,observed,talked,unlocked:observed&&talked,title:h.title,detail:observed&&talked?h.intel:'先观察并问清限制。'};},requests:()=>[{residentId:'chen',title:'雨天出行',detail:'今天还想去食阁见熟人。',options:[{title:'陪同',description:'派人陪同',cost:2,staff:1,unlocked:true,effect:'今天出行完成'}]},{residentId:'kumar',title:'PRIVATE_REQUEST',detail:'PRIVATE_BODY',options:[]}],recordTalk(s,id,topic){if(!s.visits.includes(id)||s.phase!=='plan')return {ok:false,message:'走访结束'};(s.knowledge[id]||={})[topic]=true;return {ok:true};}};
  class FormData{constructor(form){this.values=form.values;}get(key){return this.values[key]??null;}}
  const context={document:doc,FormData,URL,setTimeout,clearTimeout,CM_CAMPAIGN:E,CM_HOME:{evidence(s,id){const h=households.find(x=>x.id===id);return {observations:s.homeExplorations[id].seen.map(prop=>({id:prop,name:prop===h.keyProp?'关键日程':'其他物件',description:'看过的物件描述'}))};}}};
  context.window=context;context.globalThis=context;vm.createContext(context);
  if(real){for(const file of ['data.js','home-exploration.js','campaign-engine.js'])vm.runInContext(fs.readFileSync(path.join(dist,file),'utf8'),context,{filename:file});E=context.CM_CAMPAIGN;state=E.create();E.visit(state,'chen');}
  vm.runInContext(fs.readFileSync(path.join(dist,'campaign-dialogue.js'),'utf8'),context);
  const ui=context.CM_CASE_TALK;
  const hooks={getState:()=>state,getLanguage:()=>language,isPlaying:()=>playing,canTalkTo:()=>near,save(){saved.push(JSON.stringify(state));},render(){calls.push(['render']);},toast(msg){calls.push(['toast',msg]);},close(){ui.cancel();elements.delete('case-talk-panel');calls.push(['close']);},open(...args){ui.cancel();elements.delete('case-talk-panel');calls.push(['open',...args]);}};
  ui.initialize(hooks);elements.set('case-question',el('case-question'));elements.set('case-settings-status',el('case-settings-status'));elements.set('modal',{open:true});
  function mount(id='chen'){const panel=el('case-talk-panel',{caseResident:id});elements.set(panel.id,panel);panel.innerHTML=ui.panel(id);ui.mount(id);return panel;}
  function click(attr,value='',parent=null){const camel=attr.replace(/^data-/,'').replace(/-([a-z])/g,(_,c)=>c.toUpperCase());const button={disabled:false,dataset:{[camel]:value},hasAttribute:k=>k===attr,closest:q=>q==='form'?parent:null};for(const fn of handlers.click||[])fn({target:{closest:q=>q==='button'?button:null}});}
  function submit(selector,values){const form={values,matches:q=>q===selector};for(const fn of handlers.submit||[])fn({target:form,preventDefault(){}});}
  const ask=question=>submit('[data-case-talk-form]',{question});
  function setup(values={}){submit('[data-case-settings-form]',{provider:'openai',baseUrl:'https://example.test/v1',model:'test-model',apiKey:'test-secret',...values});}
  function network(fn){context.V2LLM={parseJSON:JSON.parse,chat:async(...args)=>{networkCalls++;return fn(...args);}};}
  return {context,ui,E,hooks,elements,handlers,calls,saved,mount,click,submit,ask,setup,network,create,get state(){return state;},set state(s){state=s;},set near(v){near=v;},set playing(v){playing=v;},set language(v){language=v;},get networkCalls(){return networkCalls;},html:()=>elements.get('case-talk-panel')?.innerHTML||'',record:id=>state.caseTalks?.find(r=>r.residentId===id&&r.day===state.day)};
}

test('real observations and a constraint exchange unlock adapted choices; same-day remount never resets three questions',async()=>{
  const f=fixture();f.mount();const before=f.state.budget;
  f.ask('今天最需要什么？');await tick();assert.equal(f.record('chen').exchanges.length,1);assert.equal(f.E.intel(f.state,'chen').unlocked,false);
  f.state.homeExplorations.chen.seen.push('chen-umbrella-2');f.ui.focusQuestion('时间有什么限制？');assert.equal(f.record('chen').exchanges.length,1,'observation only prefills');
  f.ask('时间有什么限制？');await tick();assert.equal(f.E.intel(f.state,'chen').unlocked,true);assert(f.html().includes('适配方案已解锁'));assert(f.html().includes('下午学生能顺路陪同'));
  f.ask('能接受什么互助？');await tick();f.mount();f.ask('再问一次');await tick();assert.equal(f.record('chen').exchanges.length,3);assert.equal(f.state.budget,before);assert.deepEqual(f.state.plans,[]);
  f.state.day=2;f.ui.refresh('chen');f.ask('今天怎样？');await tick();assert.equal(f.record('chen').exchanges.length,1);assert.equal(f.state.caseTalks.find(r=>r.day===1).exchanges.length,3);
});

test('proximity prevents sending and an unchanged refresh preserves the live dialogue DOM',async()=>{
  const f=fixture();f.near=false;const panel=f.mount();f.ask('时间限制？');await tick();assert.equal(f.record('chen').exchanges.length,0);
  f.near=true;f.ui.refresh('chen');let writes=0,html=panel.innerHTML;Object.defineProperty(panel,'innerHTML',{get:()=>html,set:v=>{writes++;html=v;}});for(let i=0;i<5;i++)f.ui.refresh('chen');assert.equal(writes,0);
  f.ask('时间限制？');await tick();assert.equal(f.record('chen').exchanges.length,1);
});

test('a question about an actually inspected object counts as checking its constraint, without keyword guessing',async()=>{
  const f=fixture();f.state.homeExplorations.chen.seen.push('chen-umbrella-2');f.context.CM_HOME.evidence=()=>({observations:[{id:'chen-umbrella-2',name:'学习书桌',description:'已经亲眼查看的物件'}]});f.mount();f.ask('我留意到学习书桌，这对你的日常有什么影响？');await tick();assert.equal(f.record('chen').exchanges[0].topic,'constraint');assert.equal(f.E.intel(f.state,'chen').unlocked,true);
});

test('duplicate pending model submission commits once and scopes context to this home and actual observations',async()=>{
  const f=fixture();let resolve,captured;f.network((config,system,user)=>{captured={config,system,ctx:JSON.parse(user)};return new Promise(r=>resolve=r);});f.setup();f.mount();
  f.state.homeExplorations.chen.seen.push('chen-umbrella-2');f.ask('时间限制？');f.ask('时间限制？');assert.equal(f.networkCalls,1);
  assert.equal(captured.ctx.resident.id,'chen');assert.equal(captured.ctx.observed.length,1);assert(!JSON.stringify(captured.ctx).includes('KUMAR_PRIVATE'));assert(!JSON.stringify(captured.ctx).includes('PRIVATE_REQUEST'));assert(!JSON.stringify(captured.ctx).includes('OTHER_PRIVATE'));assert(!JSON.stringify(captured.ctx).includes('test-secret'));
  resolve({text:JSON.stringify({narration:'她指着日程。',reply:'下午可以顺路。'}),meta:{}});await tick();assert.equal(f.record('chen').exchanges.length,1);assert.equal(f.record('chen').exchanges[0].source,'model');assert(!JSON.stringify(f.state).includes('test-secret'));assert(!f.html().includes('test-secret'));
});

test('late model output is dropped after closing, switching homes, changing day, replacing state, changing language, or leaving proximity',async()=>{
  for(const mutation of ['close','switch','day','state','language','near']){
    const f=fixture();let resolve;f.network(()=>new Promise(r=>resolve=r));f.setup();f.mount();f.ask('时间限制？');const original=f.state;
    if(mutation==='close')f.hooks.close();if(mutation==='switch')f.mount('kumar');if(mutation==='day')f.state.day++;if(mutation==='state')f.state=f.create();if(mutation==='language')f.language='en';if(mutation==='near'){f.near=false;f.ui.refresh('chen');f.near=true;f.ui.refresh('chen');}
    resolve({text:JSON.stringify({narration:'迟到场景',reply:'迟到答复'}),meta:{}});await tick();assert.equal(original.caseTalks?.find(r=>r.residentId==='chen')?.exchanges.length,0,mutation);assert(!JSON.stringify(f.state.knowledge).includes('constraint'),mutation);
  }
});

test('invalid or truncated model responses use no questions; offline fallback is explicit',async()=>{
  for(const answer of [{text:'not json',meta:{}},{text:JSON.stringify({narration:'n',reply:'r',effect:{budget:100}}),meta:{}},{text:JSON.stringify({narration:'n',reply:'r'}),meta:{truncated:true}}]){
    const f=fixture();f.network(()=>answer);f.setup();f.mount();f.ask('时间限制？');await tick();assert.equal(f.record('chen').exchanges.length,0);assert(f.html().includes('本次未取得有效答复'));assert.equal(f.state.budget,36);
    f.click('data-case-offline');await tick();assert.equal(f.record('chen').exchanges.length,1);assert.equal(f.record('chen').exchanges[0].source,'offline');
  }
});

test('player and model markup is escaped in transcripts and archived notes',async()=>{
  const f=fixture();f.network(()=>({text:JSON.stringify({narration:'<img src=x onerror=bad()>',reply:'<script>bad()</script>'}),meta:{}}));f.setup();f.mount();f.ask('<svg onload=bad()>');await tick();assert(!f.html().includes('<script>'));assert(!f.html().includes('<img src=x'));assert(f.html().includes('&lt;script&gt;'));f.ui.notesModal();const body=f.calls.filter(c=>c[0]==='open').at(-1)[2];assert(body.includes('&lt;svg'));assert(!body.includes('<script>'));
});

test('changing endpoints never reuses credentials, clearing a key prevents online calls, and archives never store configuration',async()=>{
  const f=fixture();f.network(()=>({text:JSON.stringify({narration:'n',reply:'r'}),meta:{}}));f.setup();f.mount();f.ask('今天怎样？');await tick();assert.equal(f.networkCalls,1);
  f.ui.settingsModal();f.setup({baseUrl:'https://other.test/v1',apiKey:''});assert(f.elements.get('case-settings-status').textContent.includes('需填写'));
  f.mount();f.click('data-case-clear-key');f.ask('明天怎样？');await tick();assert.equal(f.networkCalls,1,'cleared memory key cannot make a request');assert.equal(f.record('chen').exchanges.length,1);assert(!JSON.stringify(f.state).includes('apiKey'));assert(!f.saved.join('').includes('test-secret'));
});

test('an ended day is read-only and cannot commit a new roleplay exchange',async()=>{
  const f=fixture();f.mount();f.state.phase='report';f.ask('时间限制？');await tick();assert.equal(f.record('chen').exchanges.length,0);assert.equal(f.state.knowledge.chen,undefined);
});

test('real campaign integration: room evidence plus roleplay changes available allocations and later dialogue sees completed lasting work',async()=>{
  const f=fixture(true),E=f.E,s=f.state;f.mount();const route=()=>E.requests(s).find(r=>r.kind==='route');
  assert.equal(route().options.find(o=>o.id==='relay').unlocked,false);s.homeExplorations.chen={position:[5,6],seen:['chen-umbrella-2']};assert(E.observe(s,'chen','chen-umbrella-2').ok);
  f.ask('我留意到门边的雨伞，今天该怎样安排？');await tick();assert(E.intel(s,'chen').unlocked);assert(f.record('chen').exchanges[0].reply.includes('不希望只把食物送上门'));assert.equal(route().options.find(o=>o.id==='relay').unlocked,true);assert.equal(E.planned(s).items.length,0);assert.equal(s.budget,36);
  assert(E.plan(s,route().id,'cover').ok);assert(E.resolveDay(s).ok);assert(E.nextDay(s).ok);assert(E.plan(s,route().id,'escort').ok);assert(E.resolveDay(s).ok);assert(E.nextDay(s).ok);assert(route().automatic);
  assert(E.visit(s,'chen').ok);f.mount();f.ask('今天最需要我们帮忙的是什么？');await tick();assert(f.record('chen').exchanges[0].reply.includes('长期安排已经接住'));assert.equal(f.record('chen').exchanges.length,1);
});
