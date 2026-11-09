'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ctx={document:{addEventListener(){}}};ctx.window=ctx;ctx.globalThis=ctx;vm.createContext(ctx);
for(const file of ['data.js','home-exploration.js','campaign-engine.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..','dist',file),'utf8'),ctx,{filename:file});
const E=ctx.CM_CAMPAIGN,clone=v=>JSON.parse(JSON.stringify(v));
const test=(name,fn)=>{fn();console.log('PASS '+name);};
const request=(s,kind)=>{const r=E.requests(s).find(r=>r.kind===kind);assert(r,'Missing '+kind+' on day '+s.day);return r;};
const plan=(s,kind,option)=>{const r=E.plan(s,request(s,kind).id,option);assert(r.ok,r.message);};
const resolve=s=>{const r=E.resolveDay(s);assert(r.ok,r.message);return r.report;};
const advance=s=>{assert(E.nextDay(s).ok);};
function discover(s,id,topic='constraint'){
  assert(E.visit(s,id).ok);const h=E.households().find(h=>h.id===id);
  s.homeExplorations[id]={position:[5,6],seen:[h.keyProp]};
  assert(E.observe(s,id,h.keyProp).ok);assert(E.recordTalk(s,id,topic).ok);return E.intel(s,id);
}

test('fresh campaign has a finite day, budget and human capacity, with immutable projections',()=>{
  const s=E.create();assert.equal(s.mode,'campaign-v1');assert.equal(s.day,1);assert.equal(s.budget,36);assert.equal(s.staffTotal,2);
  assert.equal(E.households().length,8);assert.equal(E.requests(s).length,3);assert.equal(E.summary(s).target,10);
  const before=JSON.stringify(s);E.requests(s);E.planned(s);E.summary(s);E.intel(s,'chen');assert.equal(JSON.stringify(s),before);
  assert(!('tick' in E),'there is no waiting-for-money simulation loop');
  for(const p of ctx.CM_DATA.plots)assert(s.plots[p.id],'retained 3D site '+p.id);
});

test('every key clue exists in the retained playable room rather than only in engine metadata',()=>{
  for(const h of E.households())assert(ctx.CM_HOME.layout(h.id).props.some(p=>p.id===h.keyProp),'missing real room object '+h.keyProp);
});

test('plans reserve resources, can be replaced or removed, and reject overspending atomically',()=>{
  const s=E.create();plan(s,'route','escort');plan(s,'rest','mediate');
  assert.equal(s.budget,36);assert.equal(E.planned(s).cost,6);assert.equal(E.planned(s).staff,2);assert.equal(E.planned(s).remainingBudget,30);
  const before=JSON.stringify(s);assert(!E.plan(s,request(s,'care').id,'service-call').ok);assert.equal(JSON.stringify(s),before);
  assert(E.unplan(s,request(s,'route').id).ok);assert.equal(E.planned(s).staff,1);assert.equal(s.budget,36);assert(!E.unplan(s,request(s,'route').id).ok);
  s.budget=1;const poor=JSON.stringify(s);assert(!E.plan(s,request(s,'route').id,'cover').ok);assert.equal(JSON.stringify(s),poor);
});

test('two unique visits are finite, returning to a household is free, and a new day releases capacity',()=>{
  const s=E.create();assert(E.visit(s,'chen').ok);assert(E.visit(s,'chen').revisit);assert(E.visit(s,'ali').ok);
  assert(!E.visit(s,'kumar').ok);assert.equal(s.visits.length,2);assert(!E.visit(s,'not-a-resident').ok);
  resolve(s);assert(!E.visit(s,'kumar').ok);advance(s);assert.equal(s.visits.length,0);assert(E.visit(s,'kumar').ok);
});

test('adapted options require a real home observation and a relevant successful conversation',()=>{
  const s=E.create(),h=E.households().find(h=>h.id==='chen');
  assert(!E.recordTalk(s,'chen','constraint').ok);assert(!E.observe(s,'chen',h.keyProp).ok);assert(!E.plan(s,request(s,'route').id,'relay').ok);
  assert(E.visit(s,'chen').ok);assert(!E.observe(s,'chen',h.keyProp).ok,'a claimed object is not an observation');
  s.homeExplorations.chen={seen:[h.keyProp]};assert(!E.observe(s,'chen','ali-calendar-3').ok,'no cross-home clue');assert(E.observe(s,'chen',h.keyProp).ok);
  assert(!E.intel(s,'chen').known);assert(!E.intel(s,'chen').unlocked);assert(E.recordTalk(s,'chen','need').ok);assert(!E.intel(s,'chen').unlocked);
  assert(E.recordTalk(s,'chen','cooperate').ok);assert(E.intel(s,'chen').unlocked);assert(E.plan(s,request(s,'route').id,'relay').ok);
  assert.equal(E.planned(s).staff,0);assert.equal(E.planned(s).cost,3);assert(!E.intel(s,'kumar').known);assert(!E.intel(s,'kumar').unlocked);
  assert(!E.recordTalk(s,'chen','build-for-free').ok);
});

test('unknown private constraints stay behind the intel view and generic locked-action reasons',()=>{
  const s=E.create(),privateFact=E.households().find(h=>h.id==='kumar').intel;
  assert.notEqual(E.intel(s,'kumar').detail,privateFact);assert(!E.intel(s,'kumar').detail.includes('午休'));
  assert(!JSON.stringify(E.requests(s)).includes('午休'));assert(!request(s,'care').options.find(o=>o.id==='book-call').unlocked);
  discover(s,'kumar');assert.equal(E.intel(s,'kumar').detail,privateFact);assert(request(s,'care').options.find(o=>o.id==='book-call').unlocked);
});

test('investigation unlocks a staffing-versus-cash choice without making ordinary support obsolete',()=>{
  const s=E.create();discover(s,'ali');discover(s,'kumar');
  for(const [kind,ordinaryId,adaptedId] of [['rest','mediate','rest-window'],['care','service-call','book-call']]){
    const r=request(s,kind),ordinary=r.options.find(o=>o.id===ordinaryId),adapted=r.options.find(o=>o.id===adaptedId);
    assert(ordinary.unlocked&&adapted.unlocked);assert(adapted.staff<ordinary.staff);assert(adapted.cost>ordinary.cost);assert(adapted.effect.includes('预算'));
    plan(s,kind,adaptedId);assert.equal(E.planned(s).items.find(i=>i.requestId===r.id).optionId,adaptedId);
    plan(s,kind,ordinaryId);assert.equal(E.planned(s).items.find(i=>i.requestId===r.id).optionId,ordinaryId,'ordinary help remains selectable after discovery');
  }
  assert.equal(E.planned(s).cost,8);assert.equal(E.planned(s).staff,2);assert.equal(s.budget,36);
  plan(s,'rest','rest-window');plan(s,'care','book-call');assert.equal(E.planned(s).cost,13);assert.equal(E.planned(s).staff,0);assert.equal(s.budget,36);
});

test('end of day spends once, creates visible consequences, then offers a distinct next decision',()=>{
  const s=E.create();plan(s,'route','escort');plan(s,'rest','mediate');const r=resolve(s);
  assert.equal(r.met,2);assert.equal(r.total,3);assert.equal(r.spent,6);assert.equal(s.budget,30);assert.equal(s.phase,'report');assert.equal(s.pressure.kumar,1);
  assert.equal(s.staffUsed,0);assert(!E.resolveDay(s).ok);assert(!E.plan(s,'d1-care','service-call').ok);assert.equal(s.budget,30);
  const oldTasks=E.requests(s).map(r=>r.residentId).join();advance(s);assert.equal(s.day,2);assert.equal(s.budget,40);assert.equal(E.planned(s).staff,0);assert.equal(s.report,null);
  assert.notEqual(E.requests(s).map(r=>r.residentId).join(),oldTasks);assert(!E.nextDay(s).ok);assert.equal(s.budget,40);
});

test('long-term work does not satisfy today and only reduces work after its stated delay',()=>{
  const s=E.create();plan(s,'route','cover');plan(s,'rest','quiet-agreement');const r1=resolve(s);
  assert.equal(r1.met,0);assert.equal(r1.results.filter(r=>r.status==='partial').length,2);assert.equal(s.projects.length,1);assert(s.improvements['quiet-agreement']);assert(!s.improvements.cover);
  assert(!request(s,'rest').automatic,'the report cannot retroactively meet today’s rest');assert.equal(s.budget,0);assert.equal(s.plots['route-west'].status,'building');
  advance(s);assert(request(s,'gathering').automatic);assert(!request(s,'route').automatic);plan(s,'route','escort');plan(s,'children','family-support');const r2=resolve(s);
  assert.equal(r2.met,3);assert(r2.completed.some(c=>c.id==='cover'));assert.equal(s.plots['route-west'].status,'complete');assert(s.flags.completed.cover);
  assert(!request(s,'route').automatic,'cover also starts helping the day after completion');advance(s);assert(request(s,'route').automatic);assert(request(s,'rest').automatic);
  assert(!E.plan(s,request(s,'route').id,'escort').ok,'automatic support cannot be paid for again');
  plan(s,'care','service-call');const r3=resolve(s);assert.equal(r3.met,3);assert.equal(r3.spent,4);assert.equal(s.pressure.kumar,0,'a later real arrangement relieves prior pressure');
});

test('late investments state their actual activation day and cannot waste the final campaign window',()=>{
  const s=E.create();resolve(s);advance(s);
  assert(request(s,'route').options.find(o=>o.id==='cover').effect.includes('第4天'));
  resolve(s);advance(s);assert(request(s,'route').options.find(o=>o.id==='cover').effect.includes('第5天'));
  resolve(s);advance(s);const late=request(s,'route').options.find(o=>o.id==='cover');assert(!late.unlocked);assert(late.reason.includes('来不及'));assert(!E.plan(s,request(s,'route').id,'cover').ok);
});

test('a temporary-support strategy can succeed without a mandatory building recipe',()=>{
  const s=E.create();
  const strategy=[[['route','escort'],['rest','mediate']],[['route','escort'],['gathering','organize']],[['rest','mediate'],['care','service-call']],[['route','escort'],['stall','stall-support']],[['route','escort'],['housing','housing-help']]];
  for(let d=0;d<5;d++){strategy[d].forEach(([kind,option])=>plan(s,kind,option));resolve(s);if(d<4)advance(s);}
  assert.equal(s.met,10);assert.equal(s.total,15);assert.equal(s.outcome,'win');assert.equal(s.phase,'ended');assert.equal(Object.keys(s.improvements).length,0);
  assert(!Object.values(s.pressure).some(p=>p>=3));assert(E.summary(s).detail.includes('临时支援'));assert(!E.nextDay(s).ok);assert(!E.resolveDay(s).ok);
});

test('early investment creates a different winning strategy and frees later staff',()=>{
  const s=E.create();plan(s,'route','cover');plan(s,'rest','quiet-agreement');resolve(s);advance(s);
  plan(s,'route','escort');plan(s,'children','family-support');resolve(s);advance(s);
  assert.equal(E.requests(s).filter(r=>r.automatic).length,2);plan(s,'care','service-call');resolve(s);advance(s);
  plan(s,'stall','stall-support');plan(s,'participation','meeting-help');resolve(s);advance(s);
  plan(s,'housing','housing-help');resolve(s);assert.equal(s.met,12);assert.equal(s.outcome,'win');assert.equal(E.summary(s).longTerm,2);
  assert.equal(s.projects.length,0);assert(E.summary(s).detail.includes('不用每次重新派人'));
});

test('investigation changes feasible daily allocations and gives a higher-quality outcome',()=>{
  const s=E.create();discover(s,'chen');plan(s,'route','relay');plan(s,'rest','mediate');plan(s,'care','service-call');assert.equal(E.planned(s).staff,2);assert.equal(resolve(s).met,3);advance(s);
  discover(s,'students');plan(s,'route','escort');plan(s,'gathering','reschedule');plan(s,'children','family-support');assert.equal(resolve(s).met,3);advance(s);
  discover(s,'ali');plan(s,'route','relay');plan(s,'rest','rest-window');plan(s,'care','service-call');assert.equal(resolve(s).met,3);advance(s);
  discover(s,'huang');plan(s,'route','escort');plan(s,'stall','stall-hours');plan(s,'participation','meeting-help');assert.equal(resolve(s).met,3);advance(s);
  discover(s,'rahman');plan(s,'route','relay');plan(s,'rest','rest-window');plan(s,'housing','housing-list');assert.equal(resolve(s).met,3);
  assert.equal(s.met,15);assert.equal(s.outcome,'win');assert.equal(s.budget,13);assert(Object.values(s.pressure).every(p=>p===0));
});

test('one Chen discovery cannot solve every day; availability is forecast and knowledge does not disappear',()=>{
  const s=E.create();discover(s,'chen');
  plan(s,'route','relay');plan(s,'rest','mediate');plan(s,'care','service-call');const r1=resolve(s);assert(r1.nextHint.includes('明天没有顺路同行'));advance(s);
  const relay=request(s,'route').options.find(o=>o.id==='relay');assert(E.intel(s,'chen').unlocked);assert(!relay.unlocked);assert(relay.reason.includes('已知约定仍保留'));assert(request(s,'route').detail.includes('没有顺路邻居'));
  assert(!E.plan(s,request(s,'route').id,'relay').ok);plan(s,'route','escort');plan(s,'gathering','organize');assert(!E.plan(s,request(s,'children').id,'family-support').ok,'three ordinary jobs require three staff');resolve(s);advance(s);
  assert(request(s,'route').options.find(o=>o.id==='relay').unlocked);plan(s,'route','relay');plan(s,'rest','mediate');plan(s,'care','service-call');const r3=resolve(s);assert(r3.nextHint.includes('明天没有顺路同行'));advance(s);
  assert(!request(s,'route').options.find(o=>o.id==='relay').unlocked);plan(s,'route','escort');plan(s,'stall','stall-support');assert(!E.plan(s,request(s,'participation').id,'meeting-help').ok);resolve(s);advance(s);
  plan(s,'route','relay');plan(s,'rest','mediate');plan(s,'housing','housing-help');resolve(s);assert.equal(s.met,13);assert.equal(s.outcome,'win');assert.notEqual(s.met,15);
});

test('neglect produces pressure and a finite graded ending rather than an infinite waiting win',()=>{
  const s=E.create();for(let d=1;d<=5;d++){resolve(s);if(d<5)advance(s);}
  assert.equal(s.outcome,'lose');assert.equal(s.met,0);assert.equal(s.pressure.chen,3);assert.equal(s.total,15);assert.equal(s.budget,76);
  assert(!E.visit(s,'chen').ok);assert(!E.nextDay(s).ok);assert(!E.resolveDay(s).ok);assert.equal(s.budget,76);
});

test('new-mode saves restore real plans, knowledge and project delay without migrating the old game',()=>{
  const s=E.create('test-seed');discover(s,'chen');plan(s,'route','cover');resolve(s);advance(s);plan(s,'children','family-support');
  const restored=E.migrate(clone(s));assert.equal(restored.seed,'test-seed');assert.equal(restored.day,2);assert.equal(restored.budget,22);assert(E.intel(restored,'chen').unlocked);assert.equal(restored.projects[0].remaining,1);
  assert.equal(E.planned(restored).cost,4);assert.equal(E.planned(restored).staff,1);assert.equal(restored.caseTalks.length,0);resolve(restored);advance(restored);assert(request(restored,'route').automatic);
  const legacy={schema:2,budget:99,groups:{elders:50},flags:{completed:{cover:true}}},before=clone(legacy),fresh=E.migrate(legacy);assert.equal(fresh.day,1);assert.equal(fresh.budget,36);assert.deepEqual(legacy,before);assert(!fresh.improvements.cover);
  const forged=clone(s);forged.intel.chen.observed=['chen-umbrella-2'];forged.homeExplorations.chen.seen=[];assert(!E.intel(E.migrate(forged),'chen').unlocked);
});

console.log('All five-day campaign engine checks passed.');
