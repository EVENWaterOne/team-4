'use strict';
// Urgent needs: from year 3 a situation nobody asked for joins the year's list and must be decided.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dist=path.join(__dirname,'..','dist');
function load(){const ctx={console};ctx.window=ctx;ctx.globalThis=ctx;vm.createContext(ctx);for(const f of ['data.js','year-translations.js','year-content.js','i18n.js','year-engine.js'])vm.runInContext(fs.readFileSync(path.join(dist,f),'utf8'),ctx,{filename:f});return ctx;}
test('years 1–2 have none; from year 3 one (two in year 6), never repeating, fixed per save',()=>{
  const {CM_YEARS:E}=load();
  for(const seed of [1,7,42,9001]){const s=E.create({seed}),keys=[];
    for(let y=1;y<=7;y++){s.year=y;const list=E.urgent(s);assert.equal(list.length,y<3?0:[6].includes(y)?2:1,'year '+y);list.forEach(i=>{keys.push(i.urgentKey);assert(i.urgent&&i.who&&i.alert&&i.policies.length===3);assert(E.learned(s,i.id),'urgent needs are known without a visit');});
      assert.deepEqual(E.urgent(s).map(i=>i.id),list.map(i=>i.id),'the same save draws the same situations');}
    assert.equal(new Set(keys).size,keys.length,'no situation repeats in seven years');}
});
test('an urgent need sits on the decision list and blocks the year until it is decided',()=>{
  const {CM_YEARS:E}=load(),s=E.create({seed:3});s.year=3;s.phase='visit';
  E.summarize(s);E.beginPolicies(s);const u=E.urgent(s)[0];assert(E.issues(s).some(i=>i.id===u.id));
  assert(!E.resolveYear(s).ok,'cannot close the year with the urgent need undecided');
  assert(E.choose(s,u.id,'community').ok);const r=E.resolveYear(s);assert(r.ok);assert(r.report.results.some(x=>x.issueId===u.id));
});
test('urgent content is complete in English',()=>{
  const ctx=load(),E=ctx.CM_YEARS,I=ctx.CM_I18N;I.setLanguage('en');const s=E.create({seed:5}),cjk=/[㐀-鿿]/;
  const seen=new Set();for(let seed=0;seed<40&&seen.size<12;seed++){const t=E.create({seed});for(let y=3;y<=7;y++){t.year=y;for(const i of E.urgent(t)){if(seen.has(i.urgentKey))continue;seen.add(i.urgentKey);
    for(const text of [i.who,i.alert,i.title,i.need,i.story,...i.policies.flatMap(p=>[p.title,p.description,p.result])]){const en=I.t(text);assert(!cjk.test(en),i.urgentKey+': '+text+' → '+en);}}}}
  assert.equal(seen.size,12,'all twelve situations checked');
});
test('urgent cards only cost points, and spending more loses less',()=>{
  const {CM_YEARS:E}=load(),s=E.create({seed:8});s.year=3;const u=E.urgent(s)[0],by=id=>u.policies.find(p=>p.id===id),loss=p=>Object.values(p.effects).reduce((n,v)=>n+v,0);
  for(const p of u.policies)assert(Object.values(p.effects).every(v=>v<=0),p.id+' never adds points');
  assert(by('community').cost<by('service').cost&&by('service').cost<by('capital').cost);
  assert(loss(by('community'))<loss(by('service'))&&loss(by('service'))<=loss(by('capital')),'more money, smaller loss');
  assert(loss(by('community'))<0,'the cheapest card always costs something');
  const r=E.urgentRules();assert.equal(r.from,3);assert.equal(JSON.stringify(r.cost),JSON.stringify({community:by('community').cost,service:by('service').cost,capital:by('capital').cost}));
});
