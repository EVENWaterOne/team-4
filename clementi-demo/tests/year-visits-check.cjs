'use strict';
// Six homes: yearly visit appointments, refusal reasons, ten-object rooms and bilingual content.
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const dist=path.join(__dirname,'..','dist'),ctx={};ctx.globalThis=ctx;vm.createContext(ctx);
for(const f of ['data.js','year-translations.js','year-content.js','i18n.js','year-engine.js','year-home.js'])vm.runInContext(fs.readFileSync(path.join(dist,f),'utf8'),ctx,{filename:f});
const E=ctx.CM_YEARS,C=ctx.CM_YEAR_CONTENT,H=ctx.CM_HOME,ids=E.households().map(h=>h.id),cjk=/[㐀-鿿]/;
const advance=s=>{E.summarize(s);E.beginPolicies(s);for(const i of E.issues(s))E.choose(s,i.id,'community');assert(E.resolveYear(s).ok);if(s.year<7)E.nextYear(s);};

// 1. Each year 3–6 homes accept, all four counts occur, and the draw is reproducible from the save.
const counts={3:0,4:0,5:0,6:0},reasonUse=new Set();let repeats=0,pairs=0;
for(let seed=1;seed<=400;seed++){const s=E.create({seed});let previous=null;for(let y=1;y<=7;y++){const a=E.availability(s);assert(a.accepted.length>=3&&a.accepted.length<=6,'3–6 accept');counts[a.accepted.length]++;
  for(const id of ids){if(a.accepted.includes(id)){assert(E.canVisit(s,id));assert.equal(E.refusal(s,id),null);}else{const r=E.refusal(s,id);assert(Number.isInteger(r.reasonIndex)&&r.reasonIndex>=0&&r.reasonIndex<C.refusals[id].length);reasonUse.add(id+r.reasonIndex);if(previous&&previous[id]!==undefined){pairs++;if(previous[id]===r.reasonIndex)repeats++;}}}
  previous=a.reasons;advance(s);}}
Object.entries(counts).forEach(([n,c])=>assert(c>600,'count '+n+' occurs often: '+c));
assert.equal(reasonUse.size,ids.length*6,'every refusal reason appears');assert.equal(repeats,0,'a home never gives the same reason two years running ('+pairs+' pairs)');
const a1=E.availability(E.create({seed:99})),a2=E.availability(E.create({seed:99}));assert.equal(JSON.stringify(a1),JSON.stringify(a2),'same seed, same appointments');
let s=E.create({seed:5});const before=JSON.stringify(E.availability(s));s=E.migrate(JSON.parse(JSON.stringify(s)));assert.equal(JSON.stringify(E.availability(s)),before,'appointments survive save and reload');

// 2. A declined home cannot be learned; noting the refusal marks it seen without other effects.
const refused=ids.find(id=>!E.canVisit(s,id))||(()=>{s=E.create({seed:3});return ids.find(id=>!E.canVisit(s,id));})();assert(refused);
const issue=E.additionalVisits(s).find(i=>i.residentId===refused),economy=JSON.stringify([s.metrics,s.cash,s.staffTotal,s.assets]);
assert(!E.learn(s,issue.id).ok);assert(!E.recordNeeds(s,refused,[{title:'t',detail:'d'}]).ok);assert.equal(E.refusal(s,refused).seen,false);
const noted=E.noteRefusal(s,refused);assert(noted.ok&&noted.seen);assert.equal(E.refusal(s,refused).seen,true);assert.equal(JSON.stringify([s.metrics,s.cash,s.staffTotal,s.assets]),economy);
assert(!E.noteRefusal(s,E.availability(s).accepted[0]).ok,'an accepting home has no refusal');
const old=JSON.parse(JSON.stringify(s));delete old.seed;delete old.visitPlans;const migrated=E.migrate(old);assert(E.availability(migrated).accepted.length>=3,'older saves receive appointments');

// 3. Six homes, ten reachable objects each, complete bilingual stories and refusals.
assert.equal(JSON.stringify(ids.slice().sort()),JSON.stringify(['ali','chen','kumar','lin','rahman','students']));
let objects=0;
for(const id of ids){const L=H.layout(id),home=C.homes[id];assert.equal(L.props.length,10,id+' has ten objects');assert.equal(C.refusals[id].length,6,id+' has six refusal reasons');
  for(const r of C.refusals[id]){assert(['door','note','message','neighbour','silent'].includes(r.mode));assert(!/改天|下次|几天|下午|今天|明天|today|tomorrow|another day|next time|this afternoon|few days/i.test(r.line.zh+r.line.en+r.short.zh+r.short.en),id+' refusal lasts the year: '+r.short.zh);for(const f of ['short','line'])assert(cjk.test(r[f].zh)&&!cjk.test(r[f].en)&&r[f].en.length>3,id+' refusal '+f);}
  const occupied=new Set();for(const p of L.props){objects++;for(let x=p.x;x<p.x+p.width;x++)for(let y=p.y;y<p.y+p.height;y++){const k=x+','+y;assert(!occupied.has(k),id+' overlap '+k);occupied.add(k);}
    let reachable=false;for(let x=p.x;x<p.x+p.width;x++)for(let y=p.y;y<p.y+p.height;y++)if(H.path(id,L.entry,[x,y],true))reachable=true;assert(reachable,p.id+' reachable');}
  assert(H.path(id,L.entry,L.resident,true),id+' resident reachable');
  for(const p of home.props)for(const f of ['name','look','story']){assert(cjk.test(p[f].zh),p.kind+' '+f+' zh');assert(!cjk.test(p[f].en)&&p[f].en.length>3,p.kind+' '+f+' en');for(const v of p.variants||[])if(v[f])assert(cjk.test(v[f].zh)&&!cjk.test(v[f].en));}
  for(let y=1;y<=7;y++){const st={year:y};for(const p of H.layout(id).props){const zh=H.propById(st,id,p.id,'zh'),en=H.propById(st,id,p.id,'en');assert(!/\{|\}/.test(zh.story+en.story+zh.look+en.look),'templates filled');}}
}
assert.equal(objects,60);

// 4. Every annual case (including the five new ones) has a first-person need line and a linked object.
for(let y=1;y<=7;y++){const st=E.create({seed:1});st.year=y;E.availability(st);for(const c of E.additionalVisits(st)){const key=c.id.replace(/^y\d+-/,'');assert(C.voiceNeed[key],'voice line for '+key);assert(cjk.test(C.voiceNeed[key].zh)&&!cjk.test(C.voiceNeed[key].en));if(!key.startsWith('visit-'))assert(H.hintProps(st,c.residentId,key,'zh').length>=1,'a room object leads to '+key);}}

// 5. English for the new annual content, and objects named in free text are found by whole words.
ctx.CM_I18N.setLanguage('en');for(let y=1;y<=7;y++){const st=E.create({seed:1});st.year=y;for(const c of E.additionalVisits(st))for(const v of [c.title,c.need,c.story,c.question,...c.policies.flatMap(p=>[p.title,p.description,p.result])])assert(!cjk.test(ctx.CM_I18N.t(v)),'English: '+ctx.CM_I18N.t(v));}
const st={year:1};assert.equal(H.findMentioned(st,'chen','Tell me about the fan?','en'),'chen-fan-3');assert.equal(H.findMentioned(st,'chen','That was fantastic','en'),null);assert.equal(H.findMentioned(st,'chen','门边那把伞是谁买的？','zh'),'chen-umbrella-7');assert.equal(H.findMentioned(st,'ali','Does it matter?','en'),null);
console.log('PASS 3–6 homes accept each year from a saved seed, 36 refusal reasons with no back-to-back repeats, declined homes stay closed, 60 reachable bilingual objects, every annual need has a voice line and a linked object');
