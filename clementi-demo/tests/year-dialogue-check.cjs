'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dist=path.join(__dirname,'..','dist'),copy=v=>JSON.parse(JSON.stringify(v)),tick=()=>new Promise(r=>setImmediate(r));
// Tests that are not about refusals open every door for the current year.
function openAll(s){const plan=s.visitPlans?.['y'+s.year];if(plan){plan.accepted=['chen','students','lin','ali','kumar','rahman'];plan.reasons={};}}
function fixture(real=false,served=false){
  const elements=new Map(),handlers={},calls=[],saved=[];
  const element=(id,dataset={})=>({id,dataset,innerHTML:'',textContent:'',value:'',disabled:false,querySelector:()=>null,focus(){},hasAttribute(){return false;}});
  const doc={getElementById:id=>elements.get(id)||null,addEventListener(type,fn){(handlers[type]||=[]).push(fn);}};
  const create=()=>({mode:'years-v1',year:1,phase:'visit',budget:3,metrics:{stay:50,social:50,comfort:50},selected:{},learnedIssues:[],outcome:null,homeExplorations:{},history:[]});
  let state=create(),near=true,language='zh',networkCalls=0,approachCallback=null,approachCount=0;
  const issues=()=>[{id:'annual-chen',residentId:'chen',title:'雨天出行',need:'我希望雨天也能安全到食阁见熟人。',story:'这些年我仍喜欢自己出门，希望熟悉的路更好走。',question:'今年最希望社区改善什么？',policies:[{id:'cover',title:'有盖路线',cost:2,effects:{comfort:7}}]},{id:'annual-kumar',residentId:'kumar',title:'照护支持',need:'OTHER_PRIVATE_NEED',story:'OTHER_PRIVATE_STORY',question:'OTHER_QUESTION',policies:[]}];
  let E={issues:()=>copy(issues()),households:()=>[{id:'chen',name:'陈玉英'},{id:'kumar',name:'库马尔与德薇'}],learned:(s,id)=>s.learnedIssues.includes(id),learn(s,id){if(!['visit','needs','policy'].includes(s.phase))return {ok:false,message:'本年度已结算'};if(!s.learnedIssues.includes(id))s.learnedIssues.push(id);return {ok:true};}};
  E.recordNeeds=(s,residentId,needs)=>needs?.length?E.learn(s,issues().find(i=>i.residentId===residentId)?.id||'extra-'+residentId):{ok:true};
  class FormData{constructor(form){this.values=form.values;}get(k){return this.values[k]??null;}}
  const context={document:doc,FormData,URL,setTimeout,clearTimeout,CM_YEARS:E,CM_HOME:{evidence(s,id){return {observations:s.homeExplorations[id]?.seen?.map(name=>({name,description:'OLD_PROP_DESCRIPTION_NOT_FACT'}))||[]};}}};
  // Served by the local launcher: DeepSeek runs through /api/dialogue with the local key; the player never types one.
  let modelHandler=null;
  if(served){context.location={protocol:'http:',hostname:'127.0.0.1'};context.fetch=async(url,options={})=>{if(url==='/api/ai-status')return {ok:true,json:async()=>({configured:true})};if(String(url).startsWith('/api/ai-check'))return {ok:true,json:async()=>({configured:true,ok:true})};if(url==='/api/dialogue'){networkCalls++;const {messages}=JSON.parse(options.body);try{const answer=await modelHandler({provider:'local'},messages[0].content,messages[1].content);if(answer?.meta?.truncated)return {ok:false,json:async()=>({error:'回复被截断，请重试。'})};return {ok:true,json:async()=>({text:answer?.text})};}catch(error){return {ok:false,json:async()=>({error:error.message})};}}throw new Error('unexpected fetch '+url);};}
  context.window=context;context.globalThis=context;vm.createContext(context);
  if(real){for(const file of ['data.js','year-content.js','year-engine.js','year-home.js'])vm.runInContext(fs.readFileSync(path.join(dist,file),'utf8'),context,{filename:file});E=context.CM_YEARS;state=E.create({seed:7});openAll(state);}
  vm.runInContext(fs.readFileSync(path.join(dist,'year-dialogue.js'),'utf8'),context);
  const ui=context.CM_YEAR_TALK;
  const hooks={getState:()=>state,getLanguage:()=>language,canTalkTo:()=>near,save(){saved.push(JSON.stringify(state));},render(){calls.push(['render']);},toast(msg){calls.push(['toast',msg]);},onLearned(id){calls.push(['continue',id]);},approach(id,callback){approachCount++;approachCallback=callback;calls.push(['approach',id]);},close(){ui.cancel();elements.delete('year-talk-panel');calls.push(['close']);},open(...args){ui.cancel();elements.delete('year-talk-panel');calls.push(['open',...args]);}};
  ui.initialize(hooks);elements.set('year-talk-question',element('year-talk-question'));elements.set('year-talk-settings-status',element('year-talk-settings-status'));elements.set('modal',{open:true});
  function mount(id='annual-chen'){const p=element('year-talk-panel',{yearTalkIssue:id});elements.set(p.id,p);p.innerHTML=ui.panel(id);ui.mount(id);return p;}
  function click(attr,value='',parent=null){const camel=attr.replace(/^data-/,'').replace(/-([a-z])/g,(_,c)=>c.toUpperCase()),button={disabled:false,dataset:{[camel]:value},hasAttribute:k=>k===attr,closest:q=>q==='form'?parent:null};for(const fn of handlers.click||[])fn({target:{closest:q=>q==='button'?button:null}});}
  function submit(selector,values){const form={values,matches:q=>q===selector};for(const fn of handlers.submit||[])fn({target:form,preventDefault(){}});}
  function setup(){click('data-year-talk-mode','local');}
  function network(fn){modelHandler=fn;context.V2LLM={parseJSON:JSON.parse,chat:async()=>{throw new Error('only the local DeepSeek route is used');}};}
  const record=id=>state.caseTalks?.find(r=>r.year===state.year&&r.issueId===(id||'annual-chen'));
  return {context,ui,E,hooks,elements,calls,saved,mount,click,submit,setup,network,record,create,ask:q=>submit('[data-year-talk-form]',{question:q}),get state(){return state;},set state(v){state=v;},set near(v){near=v;},set language(v){language=v;},get approachCount(){return approachCount;},get networkCalls(){return networkCalls;},approach(){near=true;return approachCallback?.();},html:()=>elements.get('year-talk-panel')?.innerHTML||''};
}
const economy=s=>JSON.stringify([s.budget,s.metrics,s.selected,s.cash,s.staffTotal,s.assets]);
async function chat(f,id,questions){for(const q of questions){f.ask(q);await tick();}return f.record(id);}
test('patience: the first replies never state the need; it is recorded and marked gold only after the resident warms up',async()=>{
  const f=fixture();f.mount();const before=economy(f.state);assert(!f.E.learned(f.state,'annual-chen'));
  assert(await f.ui.listen('annual-chen',{question:'最近有什么不方便的事？'}));assert(!f.E.learned(f.state,'annual-chen'),'a direct question in the first exchange only earns a gentle lead');assert(!f.record().exchanges[0].reply.includes('我希望雨天也能安全到食阁见熟人。'));assert(!f.record().exchanges[0].clue);
  f.ask('这几年住在这里怎么样？');await tick();assert(!f.E.learned(f.state,'annual-chen'));
  f.ask('最近有什么不方便的事？');await tick();assert(!f.E.learned(f.state,'annual-chen'),'two exchanges are not yet enough');
  f.ask('最近有什么担心的事吗？');await tick();assert(f.E.learned(f.state,'annual-chen'),'after three exchanges the resident shares the need');
  const x=f.record().exchanges[3];assert.equal(x.clue,'我希望雨天也能安全到食阁见熟人。');assert(x.reply.includes(x.clue));
  assert(f.html().includes('<mark class="year-talk-clue is-fresh">我希望雨天也能安全到食阁见熟人。</mark>'),'the useful sentence is gold');assert(f.html().includes('year-talk-found is-fresh'));assert(f.html().includes('已获得需求'));assert(!f.html().includes('需求已记入右侧'),'the old text label is replaced by the icon');
  assert.equal(economy(f.state),before);assert(!f.calls.some(c=>c[0]==='close'),'finding the need keeps the room open');
  f.ask('还有别的吗？');await tick();assert(!f.record().exchanges[4].clue,'a recorded need is not gilded twice');
});
test('listen automatically approaches first, submits only on actual proximity, and duplicate clicks cannot create duplicate interviews',async()=>{
  const f=fixture();f.near=false;f.mount();const pending=f.ui.listen('annual-chen');assert.equal(f.approachCount,1);assert.equal(f.record().exchanges.length,0);assert.equal(await f.ui.listen('annual-chen'),false);f.approach();assert(await pending);assert.equal(f.record().exchanges.length,1);assert.equal(await f.ui.listen('annual-chen'),false);assert.equal(f.record().exchanges.length,1);
});
test('closing during automatic approach cancels the pending action and its late callback',async()=>{
  const f=fixture();f.near=false;f.mount();const pending=f.ui.listen('annual-chen');f.hooks.close();assert.equal(await pending,false);f.approach();await tick();assert.equal(f.state.caseTalks[0].exchanges.length,0);assert.equal(f.E.learned(f.state,'annual-chen'),false);
});
test('free follow-up remains available and remounting preserves the archive',async()=>{
  const f=fixture();f.mount();await f.ui.listen('annual-chen');f.ask('这几年变化在哪里？');await tick();f.ask('你最在意什么？');await tick();f.mount();f.ask('还要继续？');await tick();assert.equal(f.record().exchanges.length,4);assert(f.html().includes('自由提问'));
  f.state.year=2;f.state.learnedIssues=[];f.ui.refresh('annual-chen');assert(await f.ui.listen('annual-chen'));assert.equal(f.record().exchanges.length,1);assert.equal(f.state.caseTalks.filter(r=>r.issueId==='annual-chen').length,2);
});
test('model input contains only the current household, seen object names and the patience gate',async()=>{
  const f=fixture(false,true);let resolve,captured;f.network((config,system,user)=>{captured={config,system,ctx:JSON.parse(user)};return new Promise(r=>resolve=r);});f.setup();f.state.homeExplorations.chen={seen:['门边雨伞']};f.mount();const pending=f.ui.listen('annual-chen');assert.equal(await f.ui.listen('annual-chen'),false);assert.equal(f.networkCalls,1);
  assert.equal(captured.ctx.year,1);assert.equal(captured.ctx.resident.id,'chen');assert.deepEqual(captured.ctx.roomObjects,[{name:'门边雨伞'}]);assert.equal(captured.ctx.patience.revealAllowed,false);assert.equal(captured.ctx.patience.priorExchanges,0);assert(!('_gate' in captured.ctx));
  assert(!JSON.stringify(captured.ctx).includes('OTHER_PRIVATE'));assert(!JSON.stringify(captured.ctx).includes('OLD_PROP_DESCRIPTION'));assert(!JSON.stringify(captured.ctx).includes('test-secret'));assert(!captured.ctx.policies);assert(captured.system.includes('耐心')&&captured.system.includes('quote'));
  resolve({text:JSON.stringify({narration:'她望向门口。',reply:'希望雨天也能去食阁。',needs:[{title:'雨天',detail:'希望雨天也能去食阁。',quote:'希望雨天也能去食阁。'}]}),meta:{}});assert(await pending);assert.equal(f.record().exchanges.length,1);
  assert(!f.E.learned(f.state,'annual-chen'),'the rules layer refuses a need the model offers before the resident trusts the visitor');assert(!f.record().exchanges[0].clue);assert(!f.saved.join('').includes('test-secret'));assert(!JSON.stringify(f.state).includes('apiKey'));
});
test('a model need after enough patience is recorded and its exact quote, or the closest sentence, turns gold',async()=>{
  const f=fixture(false,true);let n=0;f.network(()=>{n++;return {text:JSON.stringify(n<4?{narration:'她倒了杯水。',reply:'先坐吧，慢慢聊。',needs:[]}:{narration:'她看向窗外。',reply:'说实话，下雨天我很少出门。我想雨天也能放心去食阁。你再坐一会儿吧。',needs:[{title:'雨天出门',detail:'雨天也能去食阁',quote:'我想雨天也能放心去食阁。'}]}),meta:{}};});f.setup();f.mount();
  await f.ui.listen('annual-chen');f.ask('最近好吗？');await tick();f.ask('住了多久了？');await tick();assert(!f.E.learned(f.state,'annual-chen'));f.ask('有什么困难？');await tick();
  assert(f.E.learned(f.state,'annual-chen'));assert.equal(f.record().exchanges[3].clue,'我想雨天也能放心去食阁。');
  const L=f.ui._locateClue;assert.equal(L('今天天气好。我还是想雨天也能去食阁见朋友。就这样。','雨天也能去食阁见熟人',''),'我还是想雨天也能去食阁见朋友。');assert.equal(L('完全无关的一句话。','',''),'完全无关的一句话。');
});
test('late model replies cannot learn a need after close, household switch, year change, new world, language change, lost proximity, or annual report phase',async()=>{
  for(const mutation of ['close','switch','year','state','language','near','phase']){
    const f=fixture(false,true);let resolve;f.network(()=>new Promise(r=>resolve=r));f.setup();f.mount();const original=f.state,pending=f.ui.listen('annual-chen');
    if(mutation==='close')f.hooks.close();if(mutation==='switch')f.mount('annual-kumar');if(mutation==='year')f.state.year++;if(mutation==='state')f.state=f.create();if(mutation==='language')f.language='en';if(mutation==='near'){f.near=false;f.ui.refresh('annual-chen');f.near=true;f.ui.refresh('annual-chen');}if(mutation==='phase')f.state.phase='report';
    resolve({text:JSON.stringify({narration:'迟到场景',reply:'迟到答复'}),meta:{}});assert.equal(await pending,false,mutation);assert.equal(original.caseTalks[0].exchanges.length,0,mutation);assert(!f.E.learned(original,'annual-chen'),mutation);
  }
});
test('invalid model output never learns a need and explicit offline fallback continues the same visit',async()=>{
  for(const answer of [{text:'bad',meta:{}},{text:JSON.stringify({narration:'n',reply:'r',effects:{stay:100}}),meta:{}},{text:JSON.stringify({narration:'n',reply:'r'}),meta:{truncated:true}}]){
    const f=fixture(false,true);f.network(()=>answer);f.setup();f.mount();assert.equal(await f.ui.listen('annual-chen'),false);assert.equal(f.record().exchanges.length,0);assert(!f.E.learned(f.state,'annual-chen'));assert(f.html().includes('role="alert"'));f.click('data-year-talk-offline');await tick();assert.equal(f.record().exchanges.length,1);assert.equal(f.record().exchanges[0].source,'offline');assert(!f.E.learned(f.state,'annual-chen'),'patience still applies offline');
  }
});
test('transcripts and notes escape model/player markup; settings offer only DeepSeek and offline, with no key field',async()=>{
  const f=fixture(false,true);f.network(()=>({text:JSON.stringify({narration:'<img src=x onerror=bad()>',reply:'<script>bad()</script>'}),meta:{}}));f.setup();f.mount();await f.ui.listen('annual-chen');f.ask('<svg onload=bad()>');await tick();assert(!f.html().includes('<script>'));assert(!f.html().includes('<img src=x'));assert(f.html().includes('&lt;script&gt;'));f.ui.notesModal();const notes=f.calls.filter(v=>v[0]==='open').at(-1)[2];assert(notes.includes('&lt;svg'));assert(!notes.includes('<script>'));
  f.ui.settingsModal();const settings=f.calls.filter(v=>v[0]==='open').at(-1)[2];assert.equal((settings.match(/data-year-talk-mode=/g)||[]).length,2);assert(settings.includes('data-year-talk-mode="local"')&&settings.includes('data-year-talk-mode="mock"'));assert(!/apiKey|type="password"|<input|<select/.test(settings),'no key or endpoint fields');
  const count=f.networkCalls;f.click('data-year-talk-mode','mock');assert.equal(f.ui.provider(),'mock');f.mount();f.ask('再了解一点');await tick();assert.equal(f.networkCalls,count,'offline mode never calls the model');assert(!f.saved.join('').includes('apiKey'));
});
test('unchanged refreshes preserve the live dialogue nodes and resolved annual reports remain read-only',async()=>{
  const f=fixture(),panel=f.mount();let writes=0,html=panel.innerHTML;Object.defineProperty(panel,'innerHTML',{get:()=>html,set:v=>{writes++;html=v;}});for(let i=0;i<5;i++)f.ui.refresh('annual-chen');assert.equal(writes,0);f.state.phase='report';assert.equal(await f.ui.listen('annual-chen'),false);assert.equal(f.record().exchanges.length,0);assert(!f.E.learned(f.state,'annual-chen'));
});
test('real yearly engine: freely visiting residents during policy decisions does not alter fiscal resources or choose policies',async()=>{
  const f=fixture(true),s=f.state,E=f.E,list=E.additionalVisits(s),before=JSON.stringify({metrics:s.metrics,cash:s.cash,workforce:s.workforce,selected:s.selected});
  assert(E.summarize(s).ok,'the annual opinion report does not require visits');assert(E.beginPolicies(s).ok);assert.equal(s.phase,'policy');
  f.mount(list[0].id);assert(await f.ui.listen(list[0].id));f.mount(list[1].id);assert(await f.ui.listen(list[1].id));assert.equal(s.phase,'policy');assert.equal(JSON.stringify({metrics:s.metrics,cash:s.cash,workforce:s.workforce,selected:s.selected}),before);assert.equal(E.choices(s).length,0);assert.equal(s.caseTalks.length,2);
});
test('every annual need across seven years surfaces as a short first-person gold sentence after a patient visit',async()=>{
  const f=fixture(true),s=f.state,seen=new Set();
  for(let year=1;year<=7;year++){
    s.year=year;s.phase='visit';s.learnedIssues={};s.discoveredNeeds={};f.E.availability(s);openAll(s);
    for(const current of f.E.additionalVisits(s)){f.mount(current.id);await f.ui.listen(current.id,{question:'你好'});await chat(f,current.id,['最近怎么样？','住在这里多久了？','有什么困难吗？']);const r=f.record(current.id),clue=r.exchanges.find(x=>x.clue)?.clue;
      assert(clue,'year '+year+' '+current.residentId+' reveals a need');assert(/^(我|摊位)/.test(clue),'first-person: '+clue);assert(clue.length<=60,'concise: '+clue);assert(f.E.learned(f.state,current.id));seen.add(current.id.replace(/^y\d+-/,''));}
    assert.equal(f.E.issues(s).filter(i=>!i.urgent).length,6);
  }
  for(const key of ['retired-days','not-on-call','hawker-seat','old-friends-corner'])assert(seen.has(key),'new annual case '+key);
});
test('an optional resident follow-up uses the shared room without counting as a required annual need',async()=>{
  const f=fixture(),households=f.E.households;f.E.households=()=>[...households(),{id:'rahman',name:'拉赫曼与努尔'}];
  f.E.visitIssue=(s,id)=>id==='extra-rahman'?{id,residentId:'rahman',title:'这一年的近况',need:'拉赫曼与努尔希望继续了解社区的变化。',story:'熟悉的生活还在继续。',question:'今年过得怎么样？',optional:true,policies:[]}:f.E.issues(s).find(i=>i.id===id);
  f.mount('extra-rahman');assert(f.html().includes('自由提问'));assert(await f.ui.listen('extra-rahman'));assert(f.html().includes('返回社区'));assert(f.html().includes('留意线索'));assert(!f.html().includes('已获得需求'));assert.equal(f.record('extra-rahman').optional,true);assert.equal(f.E.issues(f.state).filter(i=>f.E.learned(f.state,i.id)).length,0);
  f.click('data-year-talk-continue','extra-rahman');assert.deepEqual(f.calls.at(-1),['continue','extra-rahman']);f.ui.notesModal();assert(f.calls.filter(c=>c[0]==='open').at(-1)[2].includes('随访'));
});
test('an opinion report does not fabricate a visit, and residents remain available during needs and policy decisions',async()=>{
  for(const phase of ['needs','policy']){
    const f=fixture();f.state.phase=phase;f.state.learnedIssues.push('annual-chen');f.mount();assert(f.html().includes('data-year-talk-form'));assert.equal(f.record().exchanges.length,0);assert(await f.ui.listen('annual-chen'));assert.equal(f.record().exchanges.length,1);assert(f.html().includes('返回社区'));assert.equal(f.state.phase,phase);assert.equal(f.state.budget,3);
  }
});
test('the six Clementi homes have distinct offline voices and never inherit same-named downstairs characters',async()=>{
  const f=fixture(true),s=f.state,voices=new Set();
  assert.equal(JSON.stringify(f.E.households().map(h=>h.id).sort()),JSON.stringify(['ali','chen','kumar','lin','rahman','students']));
  for(const resident of f.E.households()){
    const issue=f.E.additionalVisits(s).find(i=>i.residentId===resident.id);f.mount(issue.id);assert(await f.ui.listen(issue.id,{question:'你好，最近怎么样？'}));
    const first=f.record(issue.id).exchanges[0];assert(first.reply.length<=120);assert(!/Lakshmi|Priya|Boss|水管|宿舍|陈好|林俊豪|郑慧玲/.test(first.reply));voices.add(first.reply);
    await chat(f,issue.id,['还有什么想聊聊的？','平常怎么过？','最近有什么不方便的事？']);const replies=f.record(issue.id).exchanges.map(x=>x.reply);assert(new Set(replies).size>=2,'follow-ups add context instead of repeating: '+resident.id);
  }
  assert.equal(voices.size,6);assert.equal(f.E.issues(s).length,6);assert.equal(s.cash,100);assert.equal(s.staffTotal,6);
});
test('model voice examples belong only to the current resident',async()=>{
  const f=fixture(true,true),s=f.state;let captured;f.network((config,system,user)=>{captured={system,ctx:JSON.parse(user)};return {text:JSON.stringify({narration:'她收好排班表。',reply:'白天也需要安静休息。'}),meta:{}};});f.setup();
  const ali=f.E.additionalVisits(s).find(i=>i.residentId==='ali');f.mount(ali.id);assert(await f.ui.listen(ali.id));
  assert(captured.ctx.resident.voice.tone.includes('轮班'));assert(captured.ctx.resident.voice.examples.every(line=>line.startsWith('我')));assert(!JSON.stringify(captured.ctx).includes('库马尔'));assert(!JSON.stringify(captured.ctx).includes('熟客'));assert(captured.ctx.request.voiceNeed.startsWith('我'));assert(!captured.ctx.policies);
});
test('a long optional chat keeps the room concise without deleting earlier conversation from the notebook',async()=>{
  const f=fixture();f.mount();await f.ui.listen('annual-chen');f.ask('第一段独有的问题');await tick();for(let i=0;i<5;i++){f.ask('后来第'+i+'段问题');await tick();}
  assert.equal(f.record().exchanges.length,7);assert(!f.html().includes('第一段独有的问题'));assert(f.html().includes('查看完整对话'));
  f.ui.notesModal();const notes=f.calls.filter(v=>v[0]==='open').at(-1)[2];assert(notes.includes('第一段独有的问题'));assert(notes.includes('后来第4段问题'));assert.equal(f.record().exchanges.length,7);
});
test('asking about room objects tells each family story, marks it heard, and a linked object opens the need sooner',async()=>{
  const f=fixture(true),s=f.state,H=f.context.CM_HOME,issue=f.E.additionalVisits(s).find(i=>i.residentId==='chen'),room=H.layout('chen'),id=kind=>room.props.find(p=>p.kind===kind).id;
  assert.equal(room.props.length,10);const before=economy(s);f.mount(issue.id);
  await f.ui.listen(issue.id,{question:'能说说“丽的呼声收音机”的故事吗？',objectId:id('radio')});const radio=f.record(issue.id).exchanges[0];assert(radio.reply.includes('李大傻'));assert.equal(radio.objectId,id('radio'));assert(H.heard(s,'chen').includes(id('radio')));assert(!f.E.learned(s,issue.id),'a story is not a need');
  f.ask('平常早上都去哪里？');await tick();assert(!f.E.learned(s,issue.id));
  await f.ui.ask('那门边的雨伞呢？');await tick();const umbrella=f.record(issue.id).exchanges[2];assert(umbrella.reply.includes('自动伞'),'typed object names are recognised');assert(f.E.learned(s,issue.id),'two exchanges plus a linked object story earn the need');assert.equal(umbrella.clue,'我想下雨的时候，也能安心去食阁见熟人。');
  f.ask('库马尔的服务资料册里写了什么？');await tick();assert(!/母亲|照护|资料册/.test(f.record(issue.id).exchanges.at(-1).reply),'another household’s objects cannot reveal its private life');
  assert.equal(H.storyCount(s,'chen').heard,2);assert.equal(economy(s),before);
  f.ui.notesModal();const notes=f.calls.filter(v=>v[0]==='open').at(-1)[2];assert(notes.includes('家庭故事'));assert(notes.includes('李大傻'));
});
test('the final-year pushchair story connects to growing children without reverting to infant care',async()=>{
  const f=fixture(true),s=f.state;s.year=7;f.E.availability(s);openAll(s);
  const H=f.context.CM_HOME,issue=f.E.additionalVisits(s).find(i=>i.residentId==='lin'),stroller=H.layout('lin').props.find(p=>p.kind==='stroller');
  f.mount(issue.id);await f.ui.listen(issue.id,{question:'能说说旧推车的故事吗？',objectId:stroller.id});
  const reply=f.record(issue.id).exchanges.at(-1).reply;assert(reply.includes('10岁和7岁'));assert(reply.includes('纪念'));assert(!/祖母推着推车|婴儿|托育/.test(reply));assert(reply.length<160);
});
test('a home that declined this year can never have its need recorded, even if a conversation is forced',async()=>{
  const f=fixture(true),s=f.E.create({seed:3}),plan=f.E.availability(s),refused=f.E.households().find(h=>!plan.accepted.includes(h.id));f.state=s;assert(refused,'seed 3 declines at least one home');
  assert(plan.accepted.length>=3&&plan.accepted.length<=6);const issue=f.E.additionalVisits(s).find(i=>i.residentId===refused.id);
  assert(!f.E.recordNeeds(s,refused.id,[{title:'x',detail:'y'}]).ok);assert(!f.E.learn(s,issue.id).ok);
  f.mount(issue.id);await f.ui.listen(issue.id,{question:'你好'});await chat(f,issue.id,['最近好吗？','有什么困难？','需要帮忙吗？']);assert(!f.E.learned(s,issue.id));assert(!f.record(issue.id).exchanges.some(x=>x.clue));
});
