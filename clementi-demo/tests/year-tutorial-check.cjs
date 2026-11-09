const test=require('node:test'),assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm');
const dist=path.join(__dirname,'..','dist'),KEY='downstairs-clementi-tour-v2';
function load(language,saved,seed=7){
  let lang=language;const store=new Map(saved?[[KEY,JSON.stringify(saved)]]:[]);
  const doc={body:{dataset:{}},querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},createElement:()=>({})};
  const ctx={console,document:doc,localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v))},setInterval(){},setTimeout(){},performance:{now:()=>0},innerWidth:1440,innerHeight:900,CM_I18N:{getLanguage:()=>lang}};
  ctx.window=ctx;ctx.globalThis=ctx;vm.createContext(ctx);
  for(const f of ['year-engine.js','year-tutorial.js'])vm.runInContext(fs.readFileSync(path.join(dist,f),'utf8'),ctx,{filename:f});
  ctx.CM_YEAR_APP={getState:()=>({seed,year:1,maxYears:7,metrics:{stay:57,social:57,comfort:57},cash:100}),icon:()=>'<svg></svg>'};
  return {T:ctx.CM_YEAR_TOUR,store,ctx};
}
test('the tutorial is loaded after the game and styled',()=>{
  const html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
  assert(html.indexOf('src="year-tutorial.js"')>html.indexOf('src="year-app.js"'),'runs after the year app');
  assert(html.includes('href="year-tutorial.css"'));
});
test('year one is played, not read: the steps follow the round and most ask the player to act',()=>{
  const {T}=load('zh'),steps=T.steps(),ids=steps.map(s=>s.id);
  for(const id of ['knock','reply','ask','back','pick','confirm','next'])assert(steps.find(s=>s.id===id)?.acts,id+' is something the player does');
  assert.equal(steps.filter(s=>s.mode==='info').length<=steps.length/2,true,'reading steps are the minority');
  const order=steps.map(s=>s.phase);assert.deepEqual(order,[...order].sort((a,b)=>a-b),'steps follow visit → decide → act → report');
  assert.equal(steps.at(-1).id,'next','the tutorial ends with the start of year two');
  assert(ids.indexOf('knock')<ids.indexOf('reply')&&ids.indexOf('reply')<ids.indexOf('ask')&&ids.indexOf('ask')<ids.indexOf('back'));
});
test('the words are short and complete in Chinese and English, with the real start and goal values',()=>{
  const cjk=/[㐀-鿿]/;
  for(const language of ['zh','en']){const {T}=load(language);
    for(const s of [...T.steps(),...T.extras()]){
      assert(s.title&&s.title.length>1,'title for '+s.id);
      for(const v of [s.title,s.text,s.ok].filter(Boolean))assert.equal(cjk.test(v),language==='zh',language+' text: '+v);
      if(language==='zh')assert(s.text.length<=24,'short Chinese line for '+s.id+': '+s.text);
    }
    const welcome=T.steps()[0].text;assert(welcome.includes('7')&&welcome.includes('70'),welcome);
  }
});
test('a finished or skipped tutorial stays closed for that save; replay starts again from the top',()=>{
  assert.equal(load('zh').T.finished(),false);
  assert.equal(load('zh',{seed:7,done:1}).T.finished(),true);
  assert.equal(load('zh',{seed:7,skipped:1}).T.finished(),true);
  const back=load('zh',{seed:7,done:1,at:16});back.T.replay();assert.equal(back.T.finished(),false);assert.deepEqual(JSON.parse(back.store.get(KEY)),{seed:7});
});
test('every new save starts the tutorial again, even after it was finished or skipped',()=>{
  for(const old of [{seed:7,done:1,at:16},{seed:7,skipped:1},{done:1}]){
    const fresh=load('zh',old,123456);
    assert.equal(fresh.T.finished(),false,'new save after '+JSON.stringify(old));
    assert.deepEqual(JSON.parse(fresh.store.get(KEY)),{seed:123456});
  }
});
test('after the first need the player is sent round the other homes; deciding is suggested once every home is heard or has declined',()=>{
  const {T,ctx}=load('zh'),steps=T.steps(),ids=steps.map(s=>s.id),more=steps.find(s=>s.id==='more'),decide=steps.find(s=>s.id==='decide');
  assert(ids.indexOf('needs')<ids.indexOf('more')&&ids.indexOf('more')<ids.indexOf('decide')&&ids.indexOf('decide')<ids.indexOf('pick'),'visit more, then decide, then pick a card');
  assert.equal(more.target,'.yr-zone-homes','it points at the homes, not at the decide button');assert.equal(more.acts,false,'nothing is blocked while visiting');
  assert.equal(decide.target,'#year-next');assert(decide.acts,'once all are heard, the decide button is the thing to press');
  const E=ctx.CM_YEARS,s=E.create({seed:7});ctx.CM_YEAR_APP.getState=()=>s;
  const plan=s.visitPlans.y1;plan.accepted=['chen','lin','kumar','ali'];plan.reasons={students:0,rahman:1};plan.seen={};
  assert.equal(T.homes().length,6);assert(T.homes().every(h=>h.st==='left'),'nothing heard yet');
  for(const i of E.additionalVisits(s).filter(i=>plan.accepted.includes(i.residentId)))E.learn(s,i.id);
  assert.deepEqual(T.homes().filter(h=>h.st==='left').map(h=>h.id).sort(),['rahman','students'],'homes that would decline still have to be knocked on');
  E.noteRefusal(s,'students');E.noteRefusal(s,'rahman');
  assert(T.homes().every(h=>h.st!=='left'),'heard or declined: the year’s visits are done');
  assert.equal(T.homes().filter(h=>h.st==='found').length,4);
});
