'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const dist=path.join(__dirname,'..','dist'),context={};context.window=context;context.globalThis=context;vm.createContext(context);
for(const file of ['data.js','engine.js'])vm.runInContext(fs.readFileSync(path.join(dist,file),'utf8'),context,{filename:file});
const E=context.CM_ENGINE,D=context.CM_DATA;
function issue(kind){const s=E.create();s.issues.forEach(i=>i.status='resolved');s.queue=[{at:0,kind}];s.flags['seen_'+kind]=false;E.tick(s,1);assert(s.issues.find(i=>i.id===kind&&i.status==='open'));return s;}
assert.equal(D.cards.filter(c=>!c.actionOption).length,11);assert(D.cards.filter(c=>c.actionOption).length>=19);assert(D.cards.find(c=>c.id==='action-corner'));
assert(D.cards.every(c=>Array.isArray(c.goals)&&c.effectChanges&&Array.isArray(c.land)));
assert.equal(D.plots.length,11);assert.equal(D.plots[5].id,'locked');
for(const id of ['cover','corner','aac','ramp'])assert(D.cards.find(c=>c.id===id).land.length>=2);
assert(D.plots.every(p=>p.scenePosition.length===2&&p.sceneSize.length===2));

let s=E.create();assert.equal(s.issues[0].channel,'world');
for(const [kind,expected]of Object.entries(D.issueChannels)){const t=issue(kind);assert.equal(t.issues.find(i=>i.id===kind).channel,expected);}
console.log('PASS split public observations/private mail and discoverable action catalogue');

s=issue('noise');const before={budget:s.budget,trust:s.trust,social:s.social,renters:s.groups.renters};
assert(E.available(s,'action-mediate').ok);assert(E.play(s,'action-mediate').ok);
assert.equal(s.trust,before.trust-3);assert.equal(s.budget,before.budget);assert.equal(s.social,before.social+8);assert.equal(s.groups.renters,before.renters+8);
assert.equal(s.projects.length,0);assert.equal(s.events.length,1);assert.equal(s.events[0].type,'decision');assert.equal(s.events[0].changes.trust,-3);assert.equal(s.events[0].cardId,'action-mediate');
assert.equal(E.play(s,'action-mediate').ok,false);assert.equal(s.events.length,1);
s=issue('noise');s.trust=2;assert.equal(E.available(s,'action-mediate').ok,false);assert.equal(E.play(s,'action-mediate').ok,false);assert.equal(s.trust,2);
console.log('PASS free-library mediation charges once, reports exact deltas, and cannot repeat');

s=issue('stall');assert.equal(E.available(s,'action-corner').ok,false);
s=E.create();s.queue=[];s.issues.forEach(i=>i.status='resolved');assert(E.play(s,'corner','void-b').ok);E.tick(s,45);s.queue=[{at:s.time,kind:'stall'}];E.tick(s,1);
assert(E.available(s,'action-corner').ok);assert.equal(E.available(s,'corner','void').ok,false);
const reuse={budget:s.budget,staff:s.staffUsed,social:s.social,elders:s.groups.elders,events:s.events.length};
assert(E.play(s,'action-corner').ok);assert.equal(s.budget,reuse.budget);assert.equal(s.staffUsed,reuse.staff);assert.equal(s.social,reuse.social+4);assert.equal(s.groups.elders,reuse.elders+4);assert.equal(s.events.length,reuse.events+1);assert.equal(s.events.at(-1).cardId,'action-corner');
assert.equal(E.play(s,'action-corner').ok,false);
console.log('PASS completed residents’ corner can host later gatherings once without rebuilding or extra staff');

s=E.create();const budget=s.budget;
assert.equal(E.play(s,'cover','route-west',{x:4,z:0,rotation:0}).ok,false);assert.equal(s.budget,budget);
assert.equal(E.play(s,'cover','route-west',{x:0,z:0,rotation:Math.PI/3}).ok,false);assert.equal(s.budget,budget);
assert.equal(E.play(s,'cover','route-west',{x:0,z:0,rotation:Math.PI/2}).ok,false);assert.equal(s.budget,budget);
assert.equal(E.play(s,'ramp','crossing-b',{x:0,z:0,rotation:Math.PI/2}).ok,false);assert.equal(s.budget,budget);
assert(E.play(s,'cover','route-west',{x:.5,z:.2,rotation:Math.PI}).ok);
assert.equal(s.plots['route-west'].placement.x,.5);assert.equal(s.projects[0].placement.rotation,Math.PI);
assert.equal(s.events[0].type,'start');assert.equal(s.events[0].changes.budget,-20);assert.equal(s.events[0].plotId,'route-west');
E.tick(s,55);assert.equal(s.plots['route-west'].status,'complete');assert.equal(s.plots.route.status,'available');assert.equal(s.plots['route-west'].placement.z,.2);assert(s.flags.routeCovered);
const done=s.events.find(e=>e.type==='complete');assert.equal(done.changes.comfort,12);assert.equal(done.changes.trust,5);assert.equal(done.changes.groups.elders,14);assert.equal(done.changes.budget,0);
const compact=E.create();assert(E.play(compact,'corner','void-b',{x:0,z:0,rotation:Math.PI/2}).ok);assert.equal(compact.projects[0].placement.rotation,Math.PI/2);
console.log('PASS multiple sites, validated relative placement, saved orientation and completion feedback');

const old=JSON.parse(JSON.stringify(s));delete old.events;delete old.eventSerial;delete old.schema;
old.issues.forEach(i=>{delete i.channel;delete i.read;});delete old.plots['room-b'];
const oldTime=old.time,oldBudget=old.budget;assert.equal(E.migrate(old),old);assert.equal(old.time,oldTime);assert.equal(old.budget,oldBudget);assert.equal(old.plots['route-west'].placement.x,.5);assert(old.plots['room-b']);assert(old.issues.every(i=>i.channel));assert(Array.isArray(old.events));
console.log('PASS old saves gain channels/sites/events without resetting construction or resources');

s=issue('petition');assert(E.play(s,'action-startvote').ok);E.tick(s,1);assert.equal(s.vote.support,58);
assert(E.play(s,'action-meeting').ok);assert.equal(s.vote.support,70);assert.equal(E.play(s,'action-meeting').ok,false);
assert.equal(E.available(s,'nrp').ok,false);assert(E.play(s,'action-door').ok);assert.equal(s.vote.support,80);assert(s.vote.approved);s.budget=140;assert(E.play(s,'nrp').ok);
s=issue('land');assert(E.play(s,'cca','garden').ok);s.issues.find(i=>i.id==='land').status='open';assert.equal(E.available(s,'action-keep').ok,false);assert.equal(E.choose(s,'land','keep').ok,false);assert(!s.flags.gardenKept);
console.log('PASS voting stays independent and a building garden cannot also be promised unchanged');

s=issue('petition');s.groups={elders:100,owners:100,families:100,care:100,renters:100};s.comfort=100;s.social=100;s.hold=-10000;
for(let n=0;n<65;n++){assert(E.play(s,'action-defer').ok);E.tick(s,60);}
assert.equal(s.events.length,50);assert.equal(s.eventSerial,65);assert(s.events[0].id<s.events[49].id);
console.log('PASS feedback stream is chronological, monotonic and capped');

let presented;context.HDBScene={ready:true,sync(state,options){presented={state,options};}};
context.CM_APP={getSelection(){return 'cover';}};
vm.runInContext(fs.readFileSync(path.join(dist,'scene-adapter.js'),'utf8'),context,{filename:'scene-adapter.js'});
s=E.create();context.CM_SCENE.sync(s,{issues:[{id:'route',channel:'world'},{id:'housing',channel:'mail'}],placement:{x:.2,z:0,rotation:0}});
assert.equal(presented.state.plots.length,11);assert.equal(context.CM_SCENE.plotIds[6],'route-west');assert.equal(presented.options.issues.length,1);assert.equal(presented.options.issues[0].id,'route');assert.equal(presented.options.placement.x,.2);
assert.equal(presented.state.issues,s.issues);
console.log('PASS scene adapter includes all sites and excludes private mail from map bubbles');

// Preserve the established gameplay regressions, updating only the old fixed
// catalogue-count assertion to distinguish normal cards from new action cards.
const prior=fs.readFileSync(path.join(__dirname,'engine-check.cjs'),'utf8').replace('assert.equal(D.cards.length, 11);','assert.equal(D.cards.filter(c => !c.actionOption).length, 11);');
new Function('require','__dirname','console',prior)(require,__dirname,console);
console.log('All upgraded engine checks passed.');
