'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const dist=path.join(__dirname,'..','dist');
function game(){const ctx={};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);for(const name of ['data.js','engine.js','needs.js'])vm.runInContext(fs.readFileSync(path.join(dist,name),'utf8'),ctx,{filename:name});return {E:ctx.CM_ENGINE,N:ctx.CM_NEEDS,s:ctx.CM_ENGINE.create()};}
const economic=s=>JSON.stringify([s.time,s.budget,s.trust,s.staffUsed,s.groups,s.social,s.comfort,s.plots,s.projects,s.flags,s.issues]);
const finish=(g,id,plot)=>{assert(g.E.play(g.s,id,plot).ok);const duration=g.s.projects.find(p=>p.cardId===id).total;g.E.tick(g.s,duration);};
const dialogue=(s,id)=>{s.residentTalks=[...(s.residentTalks||[]),{residentId:id,exchanges:[{player:'What matters?',reply:'My daily difficulty.'}]}];};
function open(g,kind){g.s.queue.push({at:g.s.time,kind});g.E.tick(g.s,1);const i=g.s.issues.find(i=>i.id===kind);assert(i,'issue '+kind);return i;}

let g=game();assert.equal(g.N.list(g.s).length,8);assert.equal(g.N.focus(g.s),'chen');assert(g.N.setFocus(g.s,'ali'));assert.equal(g.N.focus(g.s),'ali');assert.equal(g.N.setFocus(g.s,'invented'),false);assert.equal(g.N.focus(g.s),'ali');
const untouched=economic(g.s);g.N.observe(g.s,'chen','门口雨伞');assert.equal(g.N.get(g.s,'chen').status,'unknown');assert.equal(g.N.get(g.s,'chen').canConfirm,false);assert.equal(g.N.confirm(g.s,'chen','home').ok,false);assert.equal(g.N.confirm(g.s,'chen','dialogue').ok,false);assert.equal(g.N.confirm(g.s,'chen','issue').ok,false);assert.equal(g.N.review(g.s,'chen').ok,false);assert.equal(economic(g.s),untouched);
g.s.issues.find(i=>i.id==='route').read=true;assert(g.N.get(g.s,'chen').canConfirm);assert(g.N.confirm(g.s,'chen','issue').ok);assert.equal(g.N.get(g.s,'chen').status,'confirmed');assert.equal(g.N.confirm(g.s,'chen','issue').ok,false);assert.equal(economic(g.s),untouched.replace('"read":false','"read":true'));
console.log('PASS observations and unread prompts cannot confirm needs; explicit confirmation has no simulation cost');

g=game();g.N.setFocus(g.s,'kumar');for(const lang of ['zh','en']){const hidden=g.N.related(g.s,'aac',lang);assert.equal(hidden.kind,'other');assert(!/照护|caregiv|daytime care|AAC/i.test(hidden.detail));assert(!/照护|caregiv|daytime care|AAC/i.test(g.N.get(g.s,'kumar',lang).title));}g.N.observe(g.s,'kumar','home');assert.equal(g.N.related(g.s,'aac').label,'先了解需求');dialogue(g.s,'kumar');assert.equal(g.N.related(g.s,'aac').kind,'partial');
console.log('PASS unknown households do not leak private needs through card recommendations or association text');

g=game();dialogue(g.s,'chen');assert(g.N.confirm(g.s,'chen','dialogue').ok);assert(g.E.play(g.s,'cover','route-west').ok);assert.equal(g.N.get(g.s,'chen').status,'in_progress');assert.equal(g.N.get(g.s,'chen').canReview,false);assert.equal(g.N.review(g.s,'chen').ok,false);g.E.tick(g.s,55);assert.equal(g.N.get(g.s,'chen').status,'review');assert(g.N.get(g.s,'chen').canReview);const beforeReview=economic(g.s);assert(g.N.review(g.s,'chen').ok);assert.equal(g.N.get(g.s,'chen').status,'improved');assert(g.N.campaign(g.s).complete);assert.equal(economic(g.s),beforeReview);assert.equal(g.N.review(g.s,'chen').ok,false);
console.log('PASS confirmation, real construction and explicit follow-up form separate states without chat effects');

g=game();dialogue(g.s,'chen');g.N.confirm(g.s,'chen','dialogue');finish(g,'ramp','crossing');assert(g.N.review(g.s,'chen').ok);assert.equal(g.N.get(g.s,'chen').status,'partial');assert.equal(g.N.campaign(g.s).complete,false);assert.equal(g.N.related(g.s,'ramp').kind,'partial');assert.equal(g.N.related(g.s,'cover').kind,'direct');assert.equal(g.N.related(g.s,'child').kind,'other');finish(g,'cover','route');assert.equal(g.N.get(g.s,'chen').status,'review');g.N.review(g.s,'chen');assert.equal(g.N.get(g.s,'chen').status,'improved');
console.log('PASS a ramp is useful but cannot close the rain-shelter need; later direct support can complete it');

g=game();g.s.issues.find(i=>i.id==='route').status='resolved';const care=open(g,'care');assert.equal(g.N.confirm(g.s,'kumar','issue').ok,false);care.read=true;assert(g.N.confirm(g.s,'kumar','issue').ok);g.s.budget=140;finish(g,'aac','room');assert.equal(g.N.get(g.s,'kumar').status,'review');g.N.review(g.s,'kumar');assert.equal(g.N.get(g.s,'kumar').status,'partial');assert.equal(care.status,'open');assert.equal(care.partialSupport,true);const careValue=g.s.groups.care;g.s.queue=[];g.s.issues.filter(i=>i.id!=='care').forEach(i=>i.status='resolved');g.E.tick(g.s,65);assert.equal(g.s.groups.care,careValue);
const carealt=open(g,'carealt');carealt.read=true;assert(g.E.play(g.s,'action-refer').ok);assert.equal(g.N.get(g.s,'kumar').status,'review');g.N.review(g.s,'kumar');assert.equal(g.N.get(g.s,'kumar').status,'partial');const savedCare=economic(g.s);assert.equal(g.E.play(g.s,'action-refer').ok,false);assert.equal(g.E.choose(g.s,'carealt','refer').ok,false);assert.equal(economic(g.s),savedCare);
console.log('PASS activities and referral retain the care gap without repeated penalties or repeatable response gains');

g=game();dialogue(g.s,'kumar');g.N.confirm(g.s,'kumar','dialogue');finish(g,'cca','garden');assert.equal(g.N.get(g.s,'kumar').status,'review');g.N.review(g.s,'kumar');assert.equal(g.N.get(g.s,'kumar').status,'partial');assert(g.N.get(g.s,'kumar').detail.includes('正式白天照护仍需跟进'));
console.log('PASS care apartments do not manufacture a guarantee of full daytime care');

g=game();g.s.issues.forEach(i=>i.status='resolved');const childcare=open(g,'childcare');childcare.read=true;g.N.confirm(g.s,'lin','issue');assert(g.E.choose(g.s,'childcare','event').ok);g.E.tick(g.s,20);assert.equal(childcare.status,'open');assert.equal(childcare.partialSupport,true);g.N.review(g.s,'lin');assert.equal(g.N.get(g.s,'lin').status,'partial');assert(g.E.play(g.s,'action-small').ok);assert.equal(g.E.play(g.s,'action-small').ok,false);g.N.review(g.s,'lin');assert.equal(g.N.get(g.s,'lin').status,'partial');
console.log('PASS an event and small family support do not silently become formal childcare');

for(const project of ['corner','event']){
  g=game();const noise=open(g,'noise');noise.read=true;
  for(const id of ['students','ali'])assert(g.N.confirm(g.s,id,'issue').ok);
  finish(g,project,project==='corner'?'void':null);
  assert.equal(noise.status,'open');assert.equal(noise.partialSupport,true);assert.equal(g.s.flags.noiseResolved,false);
  for(const id of ['students','ali']){assert(g.N.review(g.s,id).ok);assert.equal(g.N.get(g.s,id).status,'partial');}
  assert(g.E.available(g.s,'action-mediate').ok);const trust=g.s.trust;assert(g.E.play(g.s,'action-mediate').ok);assert.equal(g.s.trust,trust-3);assert.equal(noise.status,'resolved');assert.equal(noise.partialSupport,undefined);
  for(const id of ['students','ali']){assert(g.N.review(g.s,id).ok);assert.equal(g.N.get(g.s,id).status,'improved');}
  g.s.budget=140;g.E.tick(g.s,project==='event'?60:1);finish(g,'event');assert.equal(noise.status,'resolved');assert.equal(g.s.flags.noiseResolved,true);assert.equal(g.E.play(g.s,'action-mediate').ok,false);
}
console.log('PASS a residents corner or event preserves the mediation path, while later events never reopen a real quiet-hours agreement');

g=game();const legacyNoise=open(g,'noise');legacyNoise.status='resolved';g.s.flags.noiseResolved=true;g.s.flags.completed.corner=true;g.E.migrate(g.s);assert.equal(legacyNoise.status,'open');assert.equal(legacyNoise.partialSupport,true);assert(g.E.available(g.s,'action-mediate').ok);
g.s.events.push({id:1,type:'decision',cardId:'action-mediate',issueId:'noise',optionId:'mediate',at:g.s.time});g.E.migrate(g.s);assert.equal(legacyNoise.status,'resolved');assert.equal(g.s.flags.quietHoursAgreed,true);assert.equal(legacyNoise.partialSupport,undefined);const copied=JSON.parse(JSON.stringify(g.s));g.E.migrate(copied);assert.equal(copied.issues.find(i=>i.id==='noise').status,'resolved');
console.log('PASS migration distinguishes old social-space completion from evidence that quiet hours were actually mediated');

g=game();g.s.hold=-10000;g.s.groups={elders:100,owners:100,families:100,care:100,renters:100};g.s.comfort=100;g.s.social=100;g.E.tick(g.s,250);for(const id of ['route','noise','housing','care','land','petition','stall'])assert(g.s.issues.some(i=>i.id===id),id+' must not be blocked by a three-message cap');assert(g.s.issues.filter(i=>i.status==='open').length>3);assert.equal(g.s.outcome,null);
console.log('PASS active-message limits no longer prevent later private requests or public decisions');

g=game();g.s.queue=[];g.s.issues.forEach(i=>i.status='resolved');g.s.groups={elders:100,owners:100,families:100,care:100,renters:100};g.s.comfort=100;g.s.social=100;g.E.tick(g.s,120);assert.equal(g.s.hold,0);assert.equal(g.s.outcome,null);g.s.flags.completed.cover=true;g.E.tick(g.s,60);assert.equal(g.s.outcome,null);assert.equal(g.N.campaign(g.s).complete,false);dialogue(g.s,'chen');g.N.confirm(g.s,'chen','dialogue');g.N.review(g.s,'chen');g.E.tick(g.s,59);assert.equal(g.s.outcome,null);assert.equal(g.s.hold,59);g.E.tick(g.s,1);assert.equal(g.s.outcome,'win');
console.log('PASS score-only waiting cannot win; the full 60-second window starts after the rain-route promise is reviewed');

g=game();for(const [id,plot]of [['cover','route'],['ramp','crossing'],['ease',null],['corner','void']])assert(g.E.play(g.s,id,plot).ok);g.E.tick(g.s,130);assert.equal(g.s.flags.completed.cover,true);assert(g.E.metrics(g.s).stay>=68);assert(g.E.metrics(g.s).social>=70);assert(g.E.metrics(g.s).comfort>=70);assert.equal(g.s.outcome,null);assert.equal(g.s.hold,0);
console.log('PASS the exact original four-card opening no longer wins without knowing or reviewing the resident promise');

g=game();const original=g.E.create();delete original.residentNeeds;original.time=84;original.budget=37;original.flags.completed.cover=true;original.groups.elders=80;original.residentTalks=[{residentId:'chen',exchanges:[{reply:'rain'}]}];original.events=[{id:1,type:'decision',cardId:'action-mediate',at:40}];original.plots['route-west']={cardId:'cover',status:'complete',remaining:0,placement:{x:.2,z:0,rotation:Math.PI}};const before=JSON.parse(economic(original));g.E.migrate(original);const afterMigration=JSON.parse(economic(original));assert.deepEqual(afterMigration.slice(0,9),before.slice(0,9));assert.deepEqual(afterMigration[9].completed,before[9].completed);assert.deepEqual(afterMigration[10],before[10]);assert.equal(g.N.get(original,'chen').status,'unknown');assert.equal(g.N.get(original,'chen').canConfirm,true);assert.equal(g.N.campaign(original).complete,false);g.N.confirm(original,'chen','dialogue');g.N.review(original,'chen');const restored=JSON.parse(JSON.stringify(original));g.E.migrate(restored);assert.equal(g.N.get(restored,'chen').status,'improved');assert.equal(restored.residentNeeds.actions['action-mediate'],true);assert.equal(restored.budget,37);assert.equal(restored.plots['route-west'].placement.x,.2);
console.log('PASS old saves retain resources, placements and dialogue without manufacturing confirmation or follow-up');
console.log('All resident-need system checks passed.');
