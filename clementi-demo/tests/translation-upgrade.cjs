'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const dist=path.join(__dirname,'..','dist'),storage=new Map(),localeEvents=[];
const context={localStorage:{getItem(key){return storage.get(key)||null;},setItem(key,value){storage.set(key,String(value));}},dispatchEvent(e){localeEvents.push(e);},CustomEvent:function(type,options){this.type=type;this.detail=options.detail;}};
context.window=context;context.globalThis=context;vm.createContext(context);
for(const file of ['data.js','engine.js','i18n.js'])vm.runInContext(fs.readFileSync(path.join(dist,file),'utf8'),context,{filename:file});
const D=context.CM_DATA,E=context.CM_ENGINE,I=context.CM_I18N,chinese=/[\u3400-\u9fff]/,missing=new Map();let checked=0;
const originalData=JSON.stringify(D),state=E.create(),originalState=JSON.stringify(state);
storage.set('downstairs-clementi-v1',JSON.stringify({schema:1,state}));const savedModel=storage.get('downstairs-clementi-v1');
function en(text,label,exact){if(text==null)return;checked++;const translated=I.t(text);if(chinese.test(translated))missing.set(String(text),{label,en:translated});if(exact&&translated!==exact)missing.set(String(text),{label,en:translated,expected:exact});return translated;}
function exerciseIssue(kind){const s=E.create();s.issues.forEach(i=>i.status='resolved');s.queue=[{at:0,kind}];s.flags['seen_'+kind]=false;E.tick(s,1);assert(s.issues.find(i=>i.id===kind&&i.status==='open'));return s;}
assert.equal(I.getLanguage(),'zh');I.setLanguage('en');assert.equal(localeEvents.length,1);I.setLanguage('en');assert.equal(localeEvents.length,1);
for(const [key,value]of Object.entries(D.groups))en(value,'Group '+key);
for(const r of D.residents){for(const key of ['name','role','home','summary','wants'])en(r[key],`Resident ${r.id}/${key}`);r.relations.forEach((text,i)=>en(text,`Resident ${r.id}/relation${i}`));}
for(const p of D.plots){for(const key of ['name','description','coverage'])en(p[key],`Site ${p.id}/${key}`,p[key+'En']);}
for(const c of D.cards){
 for(const key of ['title','desc','effects'])en(c[key],`Card ${c.id}/${key}`,c[key+'En']);
 en(c.source.title,`Card ${c.id}/sourceTitle`);en(c.source.text,`Card ${c.id}/sourceText`);
 const translated=I.card(c);assert.equal(translated.id,c.id);assert.equal(translated.type,c.type);assert.equal(translated.actionOption,c.actionOption);
 const s=c.actionOption?exerciseIssue(c.issueKinds[0]):E.create();s.budget=140;s.staffTotal=100;s.hold=-10000;s.danger=-10000;
 if(c.requiresCompleted)s.flags.completed[c.requiresCompleted]=true;
 if(c.id==='nrp')s.vote={support:80,approved:true,active:false};
 if(['meeting','door'].includes(c.actionOption))s.vote={support:58,approved:false,active:true};
 const result=E.play(s,c.id,c.land[0]||null);assert(result.ok,`${c.id}: ${result.message}`);en(result.message,`Card ${c.id}/result`);
 E.tick(s,c.duration||0);s.history.forEach(h=>en(h.text,`Card ${c.id}/journal`));
}
en(D.disclaimer,'Disclaimer');
const kinds=Object.keys(D.issueChannels);let optionPositions=0;
for(const kind of kinds){
 const s=exerciseIssue(kind),issue=s.issues.find(i=>i.id===kind);
 for(const key of ['title','person','body'])en(issue[key],`Story ${kind}/${key}`);
 for(const option of issue.options){
  optionPositions++;en(option.label,`Story ${kind}/${option.id}/label`);en(option.hint,`Story ${kind}/${option.id}/hint`);
  const branch=exerciseIssue(kind);branch.budget=140;branch.staffTotal=100;
  if(kind==='ballot')branch.vote={support:80,approved:true,active:false};
  const result=E.choose(branch,kind,option.id);assert(result.ok,`${kind}/${option.id}: ${result.message}`);en(result.message,`Story ${kind}/${option.id}/result`);
  branch.history.forEach(h=>en(h.text,`Story ${kind}/${option.id}/journal`));
 }
 E.tick(s,121);s.issues.forEach(i=>en(i.body,`Worsened ${i.id}/body`));s.history.forEach(h=>en(h.text,`Worsened ${kind}/journal`));
}
assert.equal(optionPositions,35);
const errorSamples=[
 '没有找到这张牌。','本局已结束，可以重新开始。','这项安排正在进行。','这项安排已经完成。','先让这次交流留下相处时间，60 秒后可再办。',
 '预算还差 17。预算会随时间恢复。','可用人手不足；持续服务会占用人手。','居民信任不足以支持这次安排。',
 '需先征集至少 75% 合资格屋主支持。投票独立于居民信任。','请在地图上选择：食阁—车站步行段、A 栋门前步行段、食阁西侧接驳步道。',
 '这里的用地类型不适合这张牌。','这片区域已有用途或被规划锁定，不能建设。','这片地已经被占用，一块地只能安排一种设施。','规划锁定区域不能用于建设。','可以安排。',
 '预算不足，需要 12。','居民信任不足。','本局已结束。','这件事已回应或正在安排中。','没有这个选项。','需要先发起投票。',
 '这一轮意见征集已经完成，请尝试另一种安排。','这个安排暂不可用。',
 '暂时没有需要这项行动的情境。先观察社区或查看来信。','花园已有工程或设施，不能再承诺保留原状。',
 '请把设施放在描边范围内，并使用四分之一圈的朝向。','需要先完成居民角，再用现有空间安排相聚。',
 '居民投票达到 80%，可以启动邻里更新。','投票支持率 70%。尚未达到 75%。','投票支持率 80%。已达到推进门槛。',
 '正在安排「有盖走廊」 · 点击地图上的合适位置','持续占用 2 人','社区三目标：住得下80，处得来76，住得舒服73','打开来自陈玉英的信','剩余 23 / 55 秒'
];
errorSamples.forEach(text=>en(text,'Engine error/dynamic message'));

// Round-trip actual DOM text and accessible labels while preserving new live
// numbers. The localized view must not mutate the Chinese state or save data.
const attributes={title:'用现有居民角安排相聚','aria-label':'来自 陈玉英'};
const textNode={nodeValue:'预算 90',parentElement:{closest(){return null;}}};
const body={nodeType:1,getAttribute:key=>attributes[key],setAttribute:(key,value)=>{attributes[key]=value;},hasAttribute:key=>key in attributes,querySelectorAll(){return [];},closest(){return null;}};
const document={body,title:'',documentElement:{},createTreeWalker(){let index=0;return {nextNode(){return index++===0?textNode:null;}};}};
body.ownerDocument=document;context.document=document;
I.localize(body);assert.equal(textNode.nodeValue,'Budget 90');assert.equal(attributes.title,'Meet at the existing residents’ corner');
I.setLanguage('zh');assert.equal(textNode.nodeValue,'预算 90');assert.equal(attributes.title,'用现有居民角安排相聚');
textNode.nodeValue='预算 70';I.localize(body);I.setLanguage('en');assert.equal(textNode.nodeValue,'Budget 70');I.setLanguage('zh');assert.equal(textNode.nodeValue,'预算 70');
assert.equal(JSON.stringify(D),originalData,'Localization does not mutate source data');assert.equal(JSON.stringify(state),originalState,'Localization does not mutate the game model');
assert.equal(storage.get('downstairs-clementi-v1'),savedModel,'Language changes do not replace the game save');
assert.equal(storage.get('downstairs-clementi-language'),'zh');
if(missing.size)console.error('MISSING OR INCORRECT TRANSLATIONS\n'+JSON.stringify([...missing.entries()],null,2));
assert.equal(missing.size,0,`${missing.size} untranslated or incorrect core strings`);
console.log(`PASS translated ${D.cards.length} cards, ${D.residents.length} profiles, ${D.plots.length} sites, ${kinds.length} stories/${optionPositions} options, completion/decision journals and engine errors (${checked} text checks).`);
console.log('PASS language round-trip, current numeric text, original model and browser save preservation.');
