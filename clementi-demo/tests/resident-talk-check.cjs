'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const dist=path.join(__dirname,'..','dist');
const plain=value=>JSON.parse(JSON.stringify(value));
function game(){
  const ctx={setTimeout,clearTimeout,TextDecoder};ctx.window=ctx;ctx.globalThis=ctx;
  vm.createContext(ctx);
  for(const file of ['data.js','engine.js','i18n.js','community.js','vendor/downstairs-ai/llm.js','resident-talk.js'])
    vm.runInContext(fs.readFileSync(path.join(dist,file),'utf8'),ctx,{filename:file});
  return {ctx,E:ctx.CM_ENGINE,T:ctx.CM_TALK,state:ctx.CM_ENGINE.create()};
}
const rules=state=>{const value=plain(state);delete value.residentTalks;delete value.residentTalkSerial;return value;};
async function main(){
  let g=game(),before=rules(g.state);
  assert.equal(g.T.session(g.state,'chen'),null);
  const first=g.T.open(g.state,'chen');assert.equal(first.startedAt,0);assert.equal(first.residentId,'chen');
  for(const question of ['你最需要什么？','有什么使用障碍？','你建议先考虑什么？']){
    const result=await g.T.respond(g.state,'chen',question);assert.equal(result.source,'offline');g.T.commit(g.state,'chen',question,result);
  }
  assert.deepEqual(rules(g.state),before,'interviews never change resources, time, issues, projects or scores');
  assert.equal(g.T.open(g.state,'chen').exchanges.length,3,'reopening does not reset the limit');
  await assert.rejects(g.T.respond(g.state,'chen','fourth'),/three questions/);
  const copy=g.T.session(g.state,'chen');copy.exchanges.length=0;assert.equal(g.T.session(g.state,'chen').exchanges.length,3);
  const second=g.T.newVisit(g.state,'chen','en');assert(second.id>first.id);assert.equal(second.exchanges.length,0);assert.equal(g.state.residentTalks.length,2);
  console.log('PASS free three-question visits, explicit fresh visits, immutable reads and unchanged Clementi simulation');

  g=game();g.state.time=75;g.T.open(g.state,'kumar');
  let ctx=g.T.context(g.state,'kumar','en');assert.equal(ctx.resident.id,'kumar');assert.equal(ctx.time,75);
  assert(ctx.resident.role.includes('caregiver'));assert(ctx.resident.family.includes('82-year-old'));
  assert(!JSON.stringify(ctx).includes('migrant worker'));assert(!JSON.stringify(ctx).includes('Kumar & Friends'));
  assert(!JSON.stringify(ctx).includes('1989'));assert(!JSON.stringify(ctx).includes('stages'));
  assert(g.T.notes(g.state,'kumar').barriers.some(text=>text.includes('不等于专业日间照护')));
  assert(g.T.notes(g.state,'ali').barriers.some(text=>text.includes('不意味着她可以无偿')));
  assert(g.T.notes(g.state,'rahman').barriers.some(text=>text.includes('不保证配额豁免')));
  assert(g.T.notes(g.state,'chen').barriers.some(text=>text.includes('EASE')));
  const knownNotes=plain(g.T.notes(g.state,'kumar'));
  const careQuestion=await g.T.respond(g.state,'kumar','你们家白天照护长辈的困难是什么？');
  assert(careQuestion.reply.includes('我们轮流请假照顾母亲'));
  assert(careQuestion.reply.includes('白天真的需要可靠的支持'));
  assert(careQuestion.reply.includes('哪些服务可以申请'));
  assert(careQuestion.reply.includes('不等于专业日间照护'),'natural dialogue must retain the care-service boundary');
  assert.deepEqual(plain(g.T.notes(g.state,'kumar')),knownNotes,'dialogue wording does not alter verifiable notes');
  console.log('PASS all personas and policy limits use the actual Clementi households rather than old Downstairs roles');

  g=game();g.state.issues.push({id:'care',channel:'mail',read:false,title:'UNREAD_CARE_TITLE',body:'UNREAD_CARE_BODY',status:'open',options:[]});
  g.state.issues.push({id:'housing',channel:'mail',read:true,title:'OTHER_PRIVATE_TITLE',body:'OTHER_PRIVATE_BODY',status:'open',options:[]});
  g.state.queue.push({at:700,kind:'FUTURE_EVENT_SECRET'});
  ctx=g.T.context(g.state,'kumar');
  for(const secret of ['UNREAD_CARE_TITLE','UNREAD_CARE_BODY','OTHER_PRIVATE_TITLE','OTHER_PRIVATE_BODY','FUTURE_EVENT_SECRET'])assert(!JSON.stringify(ctx).includes(secret),secret+' must stay out of context');
  g.state.issues.find(item=>item.id==='care').read=true;
  assert(JSON.stringify(g.T.context(g.state,'kumar')).includes('UNREAD_CARE_BODY'),'read own letter enters the context');
  assert(!JSON.stringify(g.T.context(g.state,'chen')).includes('UNREAD_CARE_BODY'),'another household cannot see the letter');
  g.state.issues.find(item=>item.id==='care').read=false;delete g.state.issues.find(item=>item.id==='care').channel;
  assert(!JSON.stringify(g.T.context(g.state,'kumar')).includes('UNREAD_CARE_BODY'),'legacy issue metadata cannot bypass canonical private-mail rules');
  assert.deepEqual(plain(g.T.relatedIssueIds('ali')),['noise']);
  console.log('PASS unread mail, other households’ private letters and scheduled future events are isolated');

  g=game();let report=g.T.notes(g.state,'chen');assert(report.suggestions.find(item=>item.id==='cover').available);
  g.state.budget=0;report=g.T.notes(g.state,'chen');assert(!report.suggestions.find(item=>item.id==='cover').available);assert(report.suggestions.find(item=>item.id==='cover').reason.includes('预算'));
  g.state.budget=90;g.state.staffUsed=6;assert(!g.T.notes(g.state,'chen').suggestions.find(item=>item.id==='visits').available);
  g.state.staffUsed=0;g.state.plots.route.status='complete';g.state.plots['route-west'].status='complete';
  assert(g.T.notes(g.state,'chen').suggestions.find(item=>item.id==='cover').available,'a remaining valid alternative plot is sufficient');
  g.state.plots['route-b'].status='complete';assert(!g.T.notes(g.state,'chen').suggestions.find(item=>item.id==='cover').available);
  assert(!g.T.notes(g.state,'zhang').suggestions.find(item=>item.id==='nrp').available,'NRP keeps the independent vote condition');
  console.log('PASS notes check actual budget, staff, alternative sites and independent NRP voting requirements');

  g=game();g.T.open(g.state,'chen');assert(g.E.play(g.state,'cover','route-west').ok);
  before=rules(g.state);ctx=g.T.context(g.state,'chen');assert(ctx.plans.find(item=>item.id==='cover').underway);assert(!ctx.plans.find(item=>item.id==='cover').completed);assert(ctx.plans.find(item=>item.id==='cover').duration===55);
  assert(g.T.notes(g.state,'chen').summary.includes('尚未完成'));assert(g.T.notes(g.state,'chen').barriers.some(text=>text.includes('未完成遮雨')));
  g.E.tick(g.state,55);assert(!g.T.notes(g.state,'chen').barriers.some(text=>text.includes('未完成遮雨')));
  assert(g.T.context(g.state,'chen').plans.find(item=>item.id==='cover').completed);
  console.log('PASS suggestions respect construction duration and completed work rather than granting chat effects');

  g=game();g.T.open(g.state,'chen');let request;
  g.ctx.V2LLM.chat=async(settings,system,user)=>{request={settings,system,user:JSON.parse(user)};return{text:'{"narration":"You listen.","reply":"Please shelter the path."}',meta:{}};};
  const result=await g.T.respond(g.state,'chen','What could help?',{provider:'openai',apiKey:'fake-key',model:'test',language:'en'});
  before=rules(g.state);assert.equal(result.source,'model');assert.equal(request.user.context.resident.id,'chen');assert(request.system.includes('AAC'));
  assert(!JSON.stringify(request.user).includes('fake-key'));assert(!('queue' in request.user.context));assert(!('flags' in request.user.context));
  g.T.commit(g.state,'chen','What could help?',result);assert.deepEqual(rules(g.state),before);assert.equal(g.T.session(g.state,'chen').language,'en');
  assert.throws(()=>g.T.commit(g.state,'chen','What could help?',result),/stale or unverified/);
  assert.throws(()=>g.T.commit(g.state,'chen','fake',{narration:'fake',reply:'fake',source:'model'}),/stale or unverified/);
  console.log('PASS online requests are scoped and only the original verified response can be committed once');

  g=game();g.T.open(g.state,'chen');before=plain(g.state);
  for(const response of [
    {text:'{"narration":"a","reply":"b","budget":999}'},
    {text:'{"narration":"","reply":"b"}'},
    {text:'{"narration":"a","reply":"b"}',meta:{truncated:true}},
    {text:JSON.stringify({narration:'a',reply:'x'.repeat(901)})},
    {text:'invalid json'}
  ]){g.ctx.V2LLM.chat=async()=>response;await assert.rejects(g.T.respond(g.state,'chen','hello',{provider:'openai',apiKey:'x'}));assert.deepEqual(plain(g.state),before);}
  g.ctx.V2LLM.chat=async()=>{throw new Error('service down');};await assert.rejects(g.T.respond(g.state,'chen','hello',{provider:'openai',apiKey:'x'}),/service down/);
  assert.deepEqual(plain(g.state),before);
  await assert.rejects(g.T.respond(g.state,'chen',' ',{}));await assert.rejects(g.T.respond(g.state,'chen','x'.repeat(601),{}));
  console.log('PASS failed, truncated, extra-field and invalid model output cannot change the game or consume questions');

  g=game();g.T.open(g.state,'chen');const generated=await g.T.respond(g.state,'chen','hello');generated.reply='edited';
  assert.throws(()=>g.T.commit(g.state,'chen','hello',generated),/changed/);assert.equal(g.T.session(g.state,'chen').exchanges.length,0);
  const one=await g.T.respond(g.state,'chen','one'),two=await g.T.respond(g.state,'chen','two');g.T.commit(g.state,'chen','one',one);assert.throws(()=>g.T.commit(g.state,'chen','two',two),/stale or unverified/);
  const stale=await g.T.respond(g.state,'chen','new');g.T.newVisit(g.state,'chen');assert.throws(()=>g.T.commit(g.state,'chen','new',stale),/stale or unverified/);
  const other=game();other.T.open(other.state,'chen');assert.throws(()=>g.T.commit(other.state,'chen','new',stale),/stale or unverified/);
  console.log('PASS modified, concurrent, replaced-session and cross-game responses cannot be saved');

  g=game();g.T.open(g.state,'chen');const endingReply=await g.T.respond(g.state,'chen','hello');g.state.outcome='win';
  assert(g.T.session(g.state,'chen'));assert(g.T.notes(g.state,'chen'));assert.throws(()=>g.T.open(g.state,'chen'),/ended/);assert.throws(()=>g.T.newVisit(g.state,'chen'),/ended/);
  await assert.rejects(g.T.respond(g.state,'chen','hello'),/ended/);assert.throws(()=>g.T.commit(g.state,'chen','hello',endingReply),/ended/);
  g=game();for(let n=0;n<85;n++)g.T.newVisit(g.state,'chen');assert.equal(g.state.residentTalks.length,80);assert.equal(g.T.session(g.state,'chen').id,85);
  const restored=plain(g.state);assert.equal(g.T.session(restored,'chen').id,85);assert.equal(g.T.newVisit(restored,'chen').id,86);assert.equal(restored.residentTalks.length,80);
  console.log('PASS finished games keep readable archives and session storage remains bounded after save restoration');

  g=game();g.ctx.CM_I18N.setLanguage('en');g.T.open(g.state,'ali','en');
  const barrier=await g.T.respond(g.state,'ali','Which facilities are difficult for you?');assert(barrier.reply.includes('nurse'));assert(barrier.reply.includes('I need quiet during the day'));
  const suggestion=await g.T.respond(g.state,'ali','What should we consider first?');assert(suggestion.reply.includes('look at'));
  assert.match(g.T.notes(g.state,'ali','en').suggestions[0].name,/Residents.*corner/i);
  console.log('PASS English preset questions reach the correct offline advice and policy limits');
  console.log('All Clementi resident interview checks passed.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
