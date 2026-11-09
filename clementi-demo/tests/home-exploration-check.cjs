'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dist=path.join(__dirname,'..','dist');
const plain=value=>JSON.parse(JSON.stringify(value));
function fixture(){
  const elements=new Map(),handlers=new Map(),timers=new Map(),calls=[],saved=[];let nextTimer=0;
  const panel=id=>({id:'cm-home-panel',dataset:{homeResident:id},querySelectorAll(){calls.push(['prop-scan']);return [];},contains(target){return target.home===id;}});
  const doc={getElementById:id=>elements.get(id)||null,addEventListener(type,fn){let set=handlers.get(type);if(!set)handlers.set(type,set=new Set());set.add(fn);},removeEventListener(type,fn){handlers.get(type)?.delete(fn);}};
  const ctx={document:doc,setTimeout(fn){const id=++nextTimer;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);}};
  ctx.window=ctx;ctx.globalThis=ctx;vm.createContext(ctx);
  for(const file of ['data.js','engine.js','home-exploration.js'])vm.runInContext(fs.readFileSync(path.join(dist,file),'utf8'),ctx,{filename:file});
  const H=ctx.CM_HOME;let state=ctx.CM_ENGINE.create(),language='zh';
  elements.set('modal',{open:true});elements.set('cm-home-player',{style:{}});elements.set('cm-home-move-status',{textContent:''});elements.set('cm-home-observation',{innerHTML:''});
  const hooks={getState:()=>state,getLanguage:()=>language,save:()=>{calls.push(['save']);saved.push(plain(state));},onMove:id=>calls.push(['move',id]),onTalk:id=>calls.push(['talk',id]),onExit:()=>calls.push(['exit']),onObserve:(id,value)=>calls.push(['observe',id,plain(value)])};
  function mount(id){elements.set('cm-home-panel',panel(id));H.mount(id,hooks);}
  function click(id,type,value){const attrs={[type]:value};const target={home:id,dataset:{[type.replace(/^data-/, '').replace(/-([a-z])/g,(_,ch)=>ch.toUpperCase())]:value},hasAttribute:name=>Object.hasOwn(attrs,name),closest:()=>target};for(const fn of handlers.get('click')||[])fn({target});}
  function key(key,typing=false){for(const fn of handlers.get('keydown')||[])fn({key,target:{closest:selector=>typing&&selector.includes('input')?{}:null},preventDefault(){calls.push(['prevent']);}});}
  function flush(){let attempts=0;while(timers.size){if(++attempts>100)throw new Error('unbounded room path');const [id,fn]=timers.entries().next().value;timers.delete(id);fn();}}
  return {ctx,H,elements,calls,saved,timers,mount,click,key,flush,get state(){return state;},replaceState(){state=ctx.CM_ENGINE.create();},setLanguage(value){language=value;}};
}
const rules=state=>{const out=plain(state);delete out.homeExplorations;return out;};

test('all eight Clementi interiors have reachable objects, blocked furnishings and no cross-home doors',()=>{
  const g=fixture();
  for(const id of ['chen','rahman','lin','kumar','students','huang','zhang','ali']){
    const room=g.H.layout(id);assert.equal(room.width,11);assert.equal(room.height,8);assert(room.props.length>=3&&room.props.length<=5);
    assert.deepEqual(plain(room.door),[5,7]);assert(g.H.path(id,room.entry,room.resident,true));
    for(const object of room.props){let reachable=false;for(let y=object.y;y<object.y+object.height;y++)for(let x=object.x;x<object.x+object.width;x++){const route=g.H.path(id,room.entry,[x,y],true);if(route){reachable=true;const from=route.length?route.at(-1):room.entry;assert.equal(g.H.move({...g.state,homeExplorations:{[id]:{position:plain(from),seen:[]}}},id,x-from[0],y-from[1]).ok,false,'furniture blocks walking: '+object.id);}}assert(reachable,'object can be approached: '+object.id);}
    const html=g.H.panel(id);assert(!html.includes('data-home-resident="'+(['chen','lin'].find(other=>other!==id))+'"'),'one selected household only');assert(!/data-house-tab|flat_aisyah|宿舍/.test(html));
  }
});

test('movement is four-directional, never crosses walls or residents, and leaves original rules untouched',()=>{
  const g=fixture(),before=rules(g.state);g.mount('chen');
  assert.equal(g.H.move(g.state,'chen',1,1).ok,false);assert.equal(g.H.move(g.state,'chen',0,0).ok,false);
  for(let i=0;i<12;i++)g.H.move(g.state,'chen',-1,0);assert.deepEqual(plain(g.state.homeExplorations.chen.position),[1,6]);
  for(let i=0;i<12;i++)g.H.move(g.state,'chen',0,-1);assert.deepEqual(plain(g.state.homeExplorations.chen.position),[1,6],'umbrella prevents crossing upward');
  assert.equal(g.H.path('chen',[0,0],[5,6]),null,'path cannot start outside a walkable floor');
  const route=g.H.path('chen',[5,6],[7,3],true);assert(route.length);assert.equal(route.some(point=>point[0]===7&&point[1]===3),false,'route ends adjacent to the resident');
  assert.deepEqual(rules(g.state),before);
});

test('clicking a resident walks nearby before enabling talk; leaving proximity disables talk',()=>{
  const g=fixture(),before=rules(g.state);g.mount('chen');assert.equal(g.H.canTalk('chen'),false);
  g.click('chen','data-home-person','chen');assert.equal(g.calls.filter(c=>c[0]==='talk').length,0);g.flush();
  assert.equal(g.H.canTalk('chen'),true);assert.deepEqual(g.calls.filter(c=>c[0]==='talk'),[['talk','chen']]);
  g.key('ArrowDown');assert.equal(g.H.canTalk('chen'),false);assert(g.calls.some(c=>c[0]==='move'));
  assert.deepEqual(rules(g.state),before);
});

test('object inspection walks to the object and stores only this household’s valid observations',()=>{
  const g=fixture(),before=rules(g.state);g.mount('kumar');const prop=g.H.layout('kumar').props.find(p=>p.kind==='calendar');
  g.click('kumar','data-home-prop',prop.id);g.flush();
  const evidence=plain(g.H.evidence(g.state,'kumar','zh'));assert.equal(evidence.householdId,'kumar');assert.equal(evidence.observations.length,1);assert(evidence.observations[0].description.includes('照护'));
  assert.equal(g.H.evidence(g.state,'chen').observations.length,0);assert(g.calls.some(c=>c[0]==='observe'&&c[2].name==='照护日程'));assert.deepEqual(rules(g.state),before);
  g.state.homeExplorations.kumar.seen.push('chen-umbrella-2','untrusted-description');assert.equal(g.H.evidence(g.state,'kumar').observations.length,1,'saved foreign ids cannot leak another home');
  const english=g.H.evidence(g.state,'kumar','en');assert(english.observations[0].description.includes('work'));assert(!/migrant|1989|dorm/i.test(JSON.stringify(english)));
});

test('one active house is enforced, switching cancels pending movement, and reopening preserves its safe position',()=>{
  const g=fixture();g.mount('chen');g.key('ArrowRight');const previous=plain(g.state.homeExplorations.chen.position);
  g.click('chen','data-home-person','chen');assert(g.timers.size);g.mount('lin');g.flush();
  assert.equal(g.H.isActive('chen'),false);assert.equal(g.H.isActive('lin'),true);assert.equal(g.calls.some(c=>c[0]==='talk'),false);
  g.mount('chen');assert.equal(g.H.isActive('chen'),true);assert.notDeepEqual(previous,[5,6]);assert.deepEqual(plain(g.state.homeExplorations.chen.position),[6,5],'last completed step is preserved, pending steps are cancelled');
  g.H.unmount();assert.equal(g.H.isActive(),false);assert.equal(g.timers.size,0);
});

test('typing, native dialog closure and replacing the game cannot trigger stale room actions',()=>{
  const g=fixture();g.mount('ali');const initial=plain(g.state.homeExplorations.ali.position);g.key('w',true);assert.deepEqual(plain(g.state.homeExplorations.ali.position),initial,'text input keeps its letters');
  g.click('ali','data-home-person','ali');g.elements.get('modal').open=false;g.flush();assert.equal(g.H.canTalk('ali'),false);assert(!g.calls.some(c=>c[0]==='talk'));
  g.elements.get('modal').open=true;g.mount('chen');g.click('chen','data-home-person','chen');g.replaceState();g.flush();assert(!g.calls.some(c=>c[0]==='talk'));assert.equal(g.H.isActive(),false);
});

test('door and exit controls return to the neighbourhood without loading another household',()=>{
  const g=fixture();g.mount('chen');g.key('ArrowDown');assert.equal(g.calls.filter(c=>c[0]==='exit').length,1);assert.equal(g.H.isActive(),false);
  g.mount('huang');g.click('huang','data-home-exit','');assert.equal(g.calls.filter(c=>c[0]==='exit').length,2);assert.equal(g.H.isActive(),false);
});

test('automatic paths save their final position once and reuse the mounted object nodes',()=>{
  const g=fixture();g.mount('chen');const saves=g.saved.length;
  g.click('chen','data-home-person','chen');
  assert.notDeepEqual(plain(g.state.homeExplorations.chen.position),[5,6],'the live model moves immediately');
  assert.equal(g.saved.length,saves,'intermediate steps do not serialize the game');
  g.flush();assert.equal(g.saved.length,saves+1,'the completed path is persisted once');
  assert.deepEqual(g.saved.at(-1).homeExplorations.chen.position,plain(g.state.homeExplorations.chen.position));
  assert.equal(g.calls.filter(call=>call[0]==='prop-scan').length,1,'movement reuses the mounted object node list');
  const object=g.H.layout('chen').props.find(prop=>prop.kind==='umbrella'),before=g.saved.length;
  g.click('chen','data-home-prop',object.id);g.flush();
  assert.equal(g.saved.length,before+1,'walking and recording the observation share one save');
  assert(g.saved.at(-1).homeExplorations.chen.seen.includes(object.id));
});

test('interrupting a path persists its last completed step but a new game rejects an old pending save',()=>{
  const g=fixture();g.mount('chen');g.click('chen','data-home-person','chen');
  const stopped=plain(g.state.homeExplorations.chen.position),saves=g.saved.length;
  g.H.unmount();assert.equal(g.saved.length,saves+1);assert.deepEqual(g.saved.at(-1).homeExplorations.chen.position,stopped);
  g.flush();assert.deepEqual(plain(g.state.homeExplorations.chen.position),stopped);
  g.mount('chen');g.click('chen','data-home-tile','5,6');const oldSaves=g.saved.length;
  g.replaceState();g.H.unmount();g.flush();
  assert.equal(g.saved.length,oldSaves,'the replacement game must not serialize an obsolete room');
  assert.equal(g.state.homeExplorations,undefined);
});

test('annual rooms keep working controls and object discoveries while removing movement tutorials',()=>{
  const g=fixture(),before=rules(g.state),annual=g.H.panel('chen',{yearMode:true});
  assert(!/WASD|方向键|方向键或|关键物件|社区暂停|社区时间暂停/.test(annual));
  assert(annual.includes('data-home-mode="years"'));assert(annual.includes('data-home-step="0,-1"'));assert(annual.includes('data-home-person="chen"'));assert(annual.includes('id="cm-home-observation"'));
  assert(g.H.panel('chen').includes('WASD'),'classic mode retains its established help text');
  g.state.mode='years-resources-v1';g.mount('chen');assert(!/WASD|方向键/.test(g.elements.get('cm-home-move-status').textContent));
  const start=plain(g.state.homeExplorations.chen.position);g.key('ArrowRight');assert.notDeepEqual(plain(g.state.homeExplorations.chen.position),start,'keyboard movement still works');
  g.click('chen','data-home-person','chen');g.flush();assert(g.H.canTalk('chen'));assert(!/WASD|方向键/.test(g.elements.get('cm-home-move-status').textContent),'walking cannot restore the tutorial');
  const prop=g.H.layout('chen').props.find(item=>item.kind==='umbrella');g.click('chen','data-home-prop',prop.id);g.flush();
  assert.equal(g.elements.get('cm-home-observation').hidden,false);assert(g.elements.get('cm-home-observation').innerHTML.includes('雨伞'));
  delete before.mode;const after=rules(g.state);delete after.mode;assert.deepEqual(after,before,'shorter room UI does not affect game rules');
});

test('previously observed Lin furnishings grow with the annual family rather than preserving infant-era descriptions',()=>{
  const g=fixture(),stroller=g.H.layout('lin').props.find(p=>p.kind==='stroller');g.state.mode='years-resources-v1';g.state.year=2;g.mount('lin');g.click('lin','data-home-prop',stroller.id);g.flush();
  assert(g.H.evidence(g.state,'lin').observations[0].description.includes('祖母带孩子'));
  g.state.year=7;const current=g.H.evidence(g.state,'lin').observations[0];assert.equal(current.name,'旧推车');assert(current.description.includes('10岁和7岁'));assert(current.description.includes('回忆'));assert(!current.description.includes('祖母带孩子'));
  g.mount('lin');g.click('lin','data-home-prop',stroller.id);g.flush();assert(g.elements.get('cm-home-observation').innerHTML.includes('10岁和7岁'),'the visible inspection panel uses the same current-year facts as the notebook');
  const english=g.H.evidence(g.state,'lin','en').observations[0];assert(english.description.includes('10 and 7'));assert.equal(english.name,'Old pushchair');
  const mat=g.H.layout('lin').props.find(p=>p.kind==='toys'&&p.width>1);g.click('lin','data-home-prop',mat.id);g.flush();assert(g.elements.get('cm-home-observation').innerHTML.includes('学习、运动和交往'));
  delete g.state.mode;assert.equal(g.H.evidence(g.state,'lin').observations.find(o=>o.id===stroller.id).name,'婴儿推车','classic mode retains its original story');
});
