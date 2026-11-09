'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const dist=path.join(__dirname,'..','dist'),elements={},snapshots=[];
class Element{
  constructor(id){this.id=id;this.hidden=false;this.dataset={};this.handlers={};this.attributes={};this.textContent='';}
  set innerHTML(value){this.html=value;snapshots.push(value);}get innerHTML(){return this.html||'';}
  addEventListener(type,handler){this.handlers[type]=handler;}
  setAttribute(key,value){this.attributes[key]=value;}
  contains(){return true;}
}
const document={readyState:'complete',querySelector:()=>true,querySelectorAll:()=>[],getElementById:id=>elements[id]||null,createElement:()=>new Element(''),head:{appendChild(){}},body:{appendChild(el){elements[el.id]=el;}},dispatchEvent(){}};
let currentLanguage='zh',entry;
const ctx={document,CM_ENGINE:{},CM_ART:{portrait:id=>'<svg data-portrait="'+id+'"></svg>'},CM_SG_MAP:{polygons:[[[103.6,1.2],[104.0,1.2],[104,1.5]]]},HDBScene:{ready:true},CM_I18N:{getLanguage:()=>currentLanguage,setLanguage(lang){currentLanguage=lang;}},setInterval:()=>1,clearInterval(){},setTimeout:fn=>fn(),addEventListener(){},CustomEvent:function(){},matchMedia:()=>({matches:true})};
ctx.window=ctx;ctx.globalThis=ctx;vm.createContext(ctx);
for(const file of ['data.js','community.js','flow.js'])vm.runInContext(fs.readFileSync(path.join(dist,file),'utf8'),ctx,{filename:file});
const C=ctx.CM_COMMUNITY,D=ctx.CM_DATA;
assert.equal(C.demographics.ageGroups.reduce((sum,g)=>sum+g.count,0),C.demographics.total);
assert.equal(C.demographics.total,104830);assert.equal(C.demographics.sourceRows,1638);assert.equal(C.demographics.subzones,9);
assert(Math.abs(C.demographics.ageGroups.reduce((sum,g)=>sum+g.percent,0)-100)<0.0001);
assert(C.demographics.method.en.includes('rounded'));assert(C.demographics.definition.en.includes('permanent residents'));
assert.equal(Object.keys(C.personas).length,8);
for(const r of D.residents){const p=C.personas[r.id];assert(p,`Persona ${r.id}`);for(const key of ['name','role','gender','home','tenure','family','routine','evidence']){assert(p[key].zh&&p[key].en,`Bilingual ${r.id}/${key}`);}assert(p.evidence.en.toLowerCase().includes('fictional')||p.evidence.en.includes('character design'));}
ctx.CM_FLOW.start({onEnter(value){entry=value;},hasSave:()=>false});
const stage=elements['entry-flow'];assert(stage.innerHTML.includes('开始新游戏'));
function click(action,extra={}){const target={dataset:{flowAction:action,...extra},closest(){return this;}};stage.handlers.click({target});}
click('map');assert(stage.innerHTML.includes('选择一片社区'));
click('details');assert(stage.innerHTML.includes('flow-detail-tabs'));assert(stage.innerHTML.includes('历史'));
assert(stage.innerHTML.includes('104,830'));assert.equal((stage.innerHTML.match(/data-flow-action="age-group" data-id=/g)||[]).length,6);
click('history-step',{index:'1'});assert(stage.innerHTML.includes('2011'));assert(stage.innerHTML.includes('住房、商业与交通连接起来'));
click('detail-tab',{id:'existing'});assert.equal((stage.innerHTML.match(/data-flow-action="amenity"/g)||[]).length,4);
click('amenity',{id:'space'});assert(stage.innerHTML.includes('一处空间的变化'));
click('detail-tab',{id:'challenges'});click('challenge',{index:'1'});assert(stage.innerHTML.includes('有限的地方怎样安排'));
click('age-group',{id:'0-14'});assert(stage.innerHTML.includes('两个孩子，4岁和1岁'));
click('person',{id:'ali'});assert(stage.innerHTML.includes('轮班护士'));
click('language',{language:'en'});assert(stage.innerHTML.includes('Challenges'));assert(stage.innerHTML.includes('Shift-working nurse'));
const english=stage.innerHTML.split(/<[^>]*>/g).join(' ').replace(/中文/g,'');
assert(!/[\u3400-\u9fff]/.test(english),'English introduction contains no leftover Chinese prose');
click('map');click('select-case',{case:'punggol'});click('details');assert(stage.innerHTML.includes('disabled'));assert(!stage.innerHTML.includes('data-flow-action="enter"'));
click('map');click('select-case',{case:'clementi'});click('details');click('enter');assert.equal(entry.caseId,'clementi');assert.equal(entry.resume,false);assert.equal(ctx.CM_FLOW.isActive(),false);
console.log('PASS community: verified aggregation, bilingual eight personas, history/amenity/challenge interactions, age-to-persona links, English rendering, planned cases and Clementi entry.');
