'use strict';
// Visit events: the resident speaks first, the investigator answers with choices, and the
// need is only recorded (and turned gold) once the resident has opened up.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dist=path.join(__dirname,'..','dist'),wait=ms=>new Promise(r=>setTimeout(r,ms));
function fixture(language='zh',model=null){
  const elements=new Map(),handlers={},saved=[],toasts=[],calls=[];
  const element=(id,dataset={})=>({id,dataset,innerHTML:'',textContent:'',value:'',disabled:false,querySelector:()=>null,querySelectorAll:()=>[],focus(){},hasAttribute(){return false;}});
  const doc={getElementById:id=>elements.get(id)||null,querySelector:()=>null,addEventListener(type,fn){(handlers[type]||=[]).push(fn);},_handlers:handlers};
  const context={document:doc,URL,setTimeout,clearTimeout,matchMedia:()=>({matches:true}),localStorage:{getItem:()=>null,setItem(){}},location:model?{protocol:'http:',hostname:'127.0.0.1'}:{protocol:'file:',hostname:''}};
  // Served by the launcher: the fake local server answers the connection check and voices each beat.
  if(model)context.fetch=async(url,options={})=>{if(String(url).startsWith('/api/ai-check'))return {ok:true,json:async()=>({configured:true,ok:true})};if(url==='/api/dialogue'){const {messages}=JSON.parse(options.body),body=JSON.parse(messages[1].content);calls.push({system:messages[0].content,body});const out=await model(body);return out.error?{ok:false,json:async()=>({error:out.error})}:{ok:true,json:async()=>({text:JSON.stringify(out)})};}throw new Error('unexpected '+url);};
  context.window=context;context.globalThis=context;vm.createContext(context);
  if(model)vm.runInContext(fs.readFileSync(path.join(dist,'vendor/downstairs-ai/llm.js'),'utf8'),context,{filename:'llm.js'});
  for(const file of ['data.js','year-translations.js','year-content.js','i18n.js','year-engine.js','year-home.js','year-events.js','year-dialogue.js'])vm.runInContext(fs.readFileSync(path.join(dist,file),'utf8'),context,{filename:file});
  const E=context.CM_YEARS,ui=context.CM_YEAR_TALK,state=E.create({seed:7});const plan=state.visitPlans['y1'];plan.accepted=['chen','students','lin','ali','kumar','rahman'];plan.reasons={};
  context.CM_I18N?.setLanguage?.(language);
  ui.initialize({getState:()=>state,getLanguage:()=>language,canTalkTo:()=>true,save(){saved.push(1);},render(){},toast(m){toasts.push(m);},onLearned(){},approach(){},close(){},open(){}});
  elements.set('modal',{open:true});
  const visit=id=>E.issues(state).find(i=>i.residentId===id)||E.additionalVisits(state).find(i=>i.residentId===id);
  async function mount(resident){const i=visit(resident),p=element('year-talk-panel',{yearTalkIssue:i.id});elements.set(p.id,p);p.innerHTML=ui.panel(i.id);ui.mount(i.id);await wait(120);return i;}
  const record=i=>state.caseTalks.find(r=>r.year===state.year&&r.issueId===i.id);
  const click=(attr,value)=>{const camel=attr.replace(/^data-/,'').replace(/-([a-z])/g,(_,c)=>c.toUpperCase()),button={disabled:false,dataset:{[camel]:value},hasAttribute:k=>k===attr,closest:q=>q==='button'?button:null};for(const fn of handlers.click||[])fn({target:{closest:q=>q==='button'?button:null}});};
  return {context,E,ui,state,mount,record,click,toasts,calls,html:()=>elements.get('year-talk-panel')?.innerHTML||''};
}
const choose=async(f,i)=>{f.click('data-year-talk-choice',String(i));await wait(5);};
test('the resident speaks first, addressing the investigator, and nothing is recorded yet',async()=>{
  const f=fixture(),i=await f.mount('chen'),r=f.record(i);
  assert.equal(r.exchanges.length,1);assert.equal(r.exchanges[0].opening,true);assert.equal(r.event.node,'open');
  assert(r.exchanges[0].reply.includes('调查员'),'the opening line addresses the player as the investigator');
  assert(!f.E.learned(f.state,i.id));assert(f.html().includes('data-year-talk-choice="0"'));assert(f.html().includes('你 · 社区调查员'));assert(f.html().includes('事件 · 雨天回家'));
});
test('caring and listening open her up; the follow-up question reveals the gold need',async()=>{
  const f=fixture(),i=await f.mount('chen'),r=f.record(i);
  await choose(f,1);assert.equal(r.event.node,'care');assert(r.exchanges[1].reply.includes('门边那把伞'),'she points at the umbrella by the door');
  await choose(f,0);assert.equal(r.event.node,'story');assert(r.exchanges[2].reply.endsWith('社区管不管？'),'her story ends with a question to the investigator');
  assert(!f.html().includes('is-ready'),'two replies are not yet enough');
  await choose(f,1);assert.equal(r.event.node,'daily');
  assert(!f.E.learned(f.state,i.id));assert(f.html().includes('is-ready'),'the follow-up glows once she has opened up');
  await choose(f,0);assert.equal(r.event.node,'reveal');assert(f.E.learned(f.state,i.id));
  const x=r.exchanges[4];assert.equal(x.clue,f.context.CM_YEAR_CONTENT.voiceNeed['rain-route'].zh);assert(x.reply.includes(x.clue));
  assert(f.html().includes('<mark class="year-talk-clue'),'the need is gold');assert(f.html().includes('已获得需求'));
  await choose(f,0);assert.equal(r.event.node,'close');assert(!f.html().includes('data-year-talk-choice='),'nothing left to answer once the visit has closed');
});
test('the openness meter has four cells: asking opens at the third, the fourth is the worry shared, then it glows with trust',async()=>{
  const f=fixture(),i=await f.mount('chen');
  const meter=()=>{const h=f.html(),bar=h.match(/<span class="year-talk-trust-bar">(.*?)<\/span>/)[1];return {level:Number(h.match(/year-talk-trust" data-level="(\d)"/)[1]),cells:(bar.match(/<i /g)||[]).length,lit:(bar.match(/is-on/g)||[]).length,label:h.match(/year-talk-trust-bar">.*?<\/span><small[^>]*>([^<]*)</)[1]};};
  const seen=[];const look=()=>{const m=meter();assert.equal(m.cells,4,'four cells');assert.equal(m.lit,Math.min(4,m.level));seen.push(m.level+':'+m.label);};
  look();await choose(f,1);look();await choose(f,0);look();assert(!f.html().includes('is-ready'),'not yet at the second cell');
  await choose(f,1);look();assert(f.html().includes('is-ready'),'asking opens at the third cell');
  await choose(f,0);look();await choose(f,0);look();
  assert.deepEqual(seen,['0:还拘谨','1:放松些','2:熟络些','3:聊开了','4:说出心事','5:信任你']);
});
test('going by the book costs trust: asking too soon only earns a gentle lead',async()=>{
  const f=fixture(),i=await f.mount('chen'),r=f.record(i);
  await choose(f,2);assert.equal(r.event.node,'form');
  await choose(f,0);assert.equal(r.event.node,'story');
  await choose(f,0);assert.equal(r.event.node,'wait','one warm reply is not enough');assert(!f.E.learned(f.state,i.id));assert(!r.exchanges.some(x=>x.clue));
  await choose(f,1);assert.equal(r.event.node,'wait','nor are two');assert(!f.E.learned(f.state,i.id));
  await choose(f,1);assert.equal(r.event.node,'reveal');assert(f.E.learned(f.state,i.id));
});
test('an inspected object becomes a reply, its story is heard and counts toward trust',async()=>{
  const f=fixture(),i=await f.mount('chen'),r=f.record(i),umbrella=f.context.CM_HOME.layout('chen').props.find(p=>p.kind==='umbrella');
  await choose(f,0);f.ui.observe({id:umbrella.id,name:'门边的雨伞'});assert(f.html().includes('data-year-talk-object="'+umbrella.id+'"'));
  f.click('data-year-talk-object',umbrella.id);await wait(5);assert(f.context.CM_HOME.heard(f.state,'chen').includes(umbrella.id));assert.equal(r.event.node,'story','talking about an object keeps the scene where it was');
  await choose(f,0);assert.equal(r.event.node,'reveal','listening plus a linked object story is enough');
});
test('every yearly case and every household has a complete bilingual event whose object exists in the room',()=>{
  const f=fixture(),C=f.context.CM_YEAR_CONTENT,EV=f.context.CM_YEAR_EVENTS,keys=Object.keys(C.voiceNeed);
  assert(keys.length>=26);
  for(const key of keys){const ev=EV.cases[key];assert(ev,'event for '+key);for(const field of ['title','open','lure','care','careReply','detail','hook'])assert(ev[field]?.zh&&ev[field]?.en&&!/[㐀-鿿]/.test(ev[field].en),key+'.'+field);}
  for(let year=1;year<=7;year++){const s=f.E.create({seed:year});s.year=year;for(const h of f.E.households()){const i=f.E.issues(s).find(x=>x.residentId===h.id)||f.E.additionalVisits(s).find(x=>x.residentId===h.id);if(!i)continue;const key=i.id.replace(/^y\d+-/,''),ev=EV.forCase(key,h.id);assert(ev,'year '+year+' '+h.id);assert(f.context.CM_HOME.layout(h.id).props.some(p=>p.kind===ev.hint),key+' hint '+ev.hint+' is in the room');}}
  for(const id of f.E.households().map(h=>h.id))assert(EV.persona[id]?.cold?.zh&&EV.persona[id]?.cold?.en,'persona '+id);
});
test('in English the resident opens, and is answered, in English',async()=>{
  const f=fixture('en'),i=await f.mount('kumar'),r=f.record(i);
  assert(!/[㐀-鿿]/.test(r.exchanges[0].reply),'opening in English');
  await choose(f,1);await choose(f,0);await choose(f,1);await choose(f,0);
  assert(r.exchanges.every(x=>!/[㐀-鿿]/.test(x.reply+x.player)),'every line stays English');assert(f.E.learned(f.state,i.id));
});
test('with DeepSeek the resident’s opening and every reply are voiced by the model, while the rules keep the need gold',async()=>{
  const f=fixture('zh',body=>({narration:'她把伞靠回门边。',reply:'（DeepSeek）'+(body.beat?.tone==='open'?'调查员，你来啦，坐。':'嗯，我跟你说。'),needs:[{title:'x',detail:'y',quote:'z'}]}));
  await wait(20);const i=await f.mount('chen'),r=f.record(i);await wait(40);
  assert.equal(r.exchanges.length,1);assert.equal(r.exchanges[0].voiced,'deepseek');assert(r.exchanges[0].reply.startsWith('（DeepSeek）'),'the opening comes from the model');
  const open=f.calls[0].body;assert.equal(open.beat.tone,'open');assert(open.beat.mustConvey.includes('调查员'),'the model is told what the scripted opening says');assert(open.event,'the event goes with it');
  for(const n of [1,0,1]){f.click('data-year-talk-choice',String(n));await wait(40);}
  assert.equal(r.event.node,'daily');assert(r.exchanges.slice(1).every(x=>x.voiced==='deepseek'&&x.reply.startsWith('（DeepSeek）')));assert(!f.E.learned(f.state,i.id),'a model offering a need early changes nothing');
  f.click('data-year-talk-choice','0');await wait(40);
  const x=r.exchanges[4],need=f.context.CM_YEAR_CONTENT.voiceNeed['rain-route'].zh;assert.equal(r.event.node,'reveal');assert(f.E.learned(f.state,i.id));
  assert.equal(f.calls.at(-1).body.beat.needSentence,need,'the model must say the need sentence');assert(x.reply.includes(need),'the need sentence is kept even when the model leaves it out');assert.equal(x.clue,need);
});
test('if DeepSeek fails mid-visit the written line is used and the visit goes on',async()=>{
  const f=fixture('zh',()=>({error:'Key 无效或已失效'}));await wait(20);const i=await f.mount('chen'),r=f.record(i);await wait(40);
  assert.equal(r.exchanges.length,1);assert(!r.exchanges[0].voiced);assert(r.exchanges[0].reply.includes('调查员'));assert(f.toasts.some(t=>t.includes('Key 无效')),'the player is told why, once');
  f.click('data-year-talk-choice','1');await wait(40);assert.equal(r.exchanges.length,2);assert.equal(r.event.node,'care');assert.equal(f.toasts.length,1,'the reason is not repeated every line');
});
test('the object card offers the question and closes',async()=>{
  const f=fixture(),i=await f.mount('chen'),r=f.record(i),umbrella=f.context.CM_HOME.layout('chen').props.find(p=>p.kind==='umbrella');
  f.ui.observe({id:umbrella.id,name:'门边的雨伞'});assert(f.html().includes('year-talk-object'));assert(!f.html().includes('class="year-talk-choice is-obj"'),'the question lives on the card, not among the replies');
  f.click('data-year-talk-object-close','');assert(!f.html().includes('class="year-talk-object'));
});
test('with DeepSeek the replies on offer are worded by the model for this moment, and fall back to the written lines',async()=>{
  const said=[];
  const f=fixture('zh',body=>{said.push(body);const want=body.nextChoices||[];
    const options=want.map((c,n)=>({tone:c.tone,text:n===2?'This line is in the wrong language':'（AI）回应'+c.tone+'·'+(body.beat?.node||'free')}));
    return {narration:'她把伞靠回门边。',reply:'嗯，我跟你说。',needs:[],options};});
  await wait(20);const i=await f.mount('chen'),r=f.record(i);await wait(40);
  const open=said[0];assert.deepEqual(open.nextChoices.map(c=>c.tone),['listen','care','form'],'the brief lists the replies the game will offer');assert(open.nextChoices.every(c=>c.intent&&c.example),'each with what it is for and the written line as a guide');
  let html=f.html();assert(html.includes('（AI）回应listen·open')&&html.includes('（AI）回应care·open'),'the model words the replies');
  assert(!html.includes('wrong language'),'a line in the wrong language is not shown');assert(html.includes('data-year-talk-choice="2"'),'that reply keeps its written line instead');
  f.click('data-year-talk-choice','1');await wait(40);assert.equal(r.event.node,'care');assert.equal(r.exchanges[1].player,'（AI）回应care·open','the player says the worded line');
  html=f.html();assert(html.includes('（AI）回应listen·care'),'the next replies are worded for the new moment');
  assert(f.calls.at(-1).system.includes('nextChoices'),'the model is told how to word them');
  // A typed line rewords the replies for what was just said.
  await f.ui.listen(i.id,{question:'下雨天出门难吗？'});await wait(40);assert(f.html().includes('（AI）回应listen·free'));assert.equal(r.exchanges.at(-1).tone,'free');
});
test('the player’s own lines stand out, typed ones most of all, and Enter sends the reply box',async()=>{
  const f=fixture(),i=await f.mount('chen'),r=f.record(i);
  await choose(f,1);await f.ui.listen(i.id,{question:'下雨天出门难吗？'});await wait(5);
  const html=f.html();assert((html.match(/class="year-talk-player"/g)||[]).length>=1,'a chosen line is the player’s bubble');assert(html.includes('class="year-talk-player is-typed"'),'a typed line is marked as the player’s own words');assert(html.includes('自己说的'));
  const keydown=f.context.document._handlers?.keydown||[];assert(keydown.length,'the reply box listens for keys');
  let sent=0;const form={requestSubmit(){sent++;}},box=id=>({id,value:'你好',disabled:false,closest:q=>q.startsWith('form')?form:null});
  const press=(target,extra={})=>{let stopped=false;for(const fn of keydown)fn({key:'Enter',target,shiftKey:false,isComposing:false,keyCode:13,preventDefault(){stopped=true;},...extra});return stopped;};
  assert(press(box('year-talk-question')));assert.equal(sent,1,'Enter sends');
  press(box('year-talk-question'),{shiftKey:true});press(box('year-talk-question'),{isComposing:true});press(box('year-talk-question'),{keyCode:229});assert.equal(sent,1,'Shift+Enter and an open input method do not');
  const empty=box('year-talk-question');empty.value='  ';press(empty);press(box('something-else'));assert.equal(sent,1,'nor an empty box, nor other fields');
});
