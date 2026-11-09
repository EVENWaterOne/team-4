'use strict';

// No browser, screenshots, or visual assertions. Real Three.js geometry runs
// with a renderer/DOM double to verify the scene and simulation contracts.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'scene-source.mjs'), 'utf8');
let bundle = fs.readFileSync(path.join(root, 'dist', 'scene.bundle.js'), 'utf8');
let wallClock = 1000;
let reduceMotion = false;

class Element {
  constructor(tag = 'div') {
    this.tagName = tag; this.style = {}; this.dataset = {}; this.attributes = {};
    this.children = []; this.listeners = {}; this.clientWidth = 1440; this.clientHeight = 900;
    this.hidden = false; this.textContent = '';
  }
  append(...nodes) { nodes.forEach(node => { node.parentNode = this; this.children.push(node); }); }
  prepend(node) { node.parentNode = this; this.children.unshift(node); }
  remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(node => node !== this); }
  addEventListener(type, callback) { (this.listeners[type] ||= []).push(callback); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  setPointerCapture() {}
  getBoundingClientRect() { return { left: 0, top: 0, width: this.clientWidth, height: this.clientHeight }; }
  getContext() { return { createLinearGradient: () => ({ addColorStop() {} }), fillRect() {} }; }
}
class FakeRenderer {
  constructor() { this.domElement=new Element('canvas');this.shadowMap={};this.renders=0;this.pending=new Map();this.serial=0;this.animating=false; }
  setPixelRatio(value){this.pixelRatio=value;}
  setSize(w,h){this.domElement.width=w*this.pixelRatio;this.domElement.height=h*this.pixelRatio;this.lastSize=[w,h];}
  // Model the bundled Three.js scheduler: it queues the next RAF after calling
  // the client, so stopping inside a callback must cancel after that stack.
  setAnimationLoop(callback){this.loop=callback;if(callback===null){this.pending.delete(this.requestId);this.animating=false;}else if(!this.animating){this.requestId=++this.serial;this.pending.set(this.requestId,true);this.animating=true;}}
  frame(now){this.pending.delete(this.requestId);this.loop?.(now);this.requestId=++this.serial;this.pending.set(this.requestId,true);}
  render(){this.renders++;}
}

const container = new Element(), errorNode = new Element(), hoverNode = new Element();
const calls = [];
const sandbox = {
  console, AbortController, performance: { now: () => wallClock }, __FakeRenderer: FakeRenderer,
  ResizeObserver: class { observe() {} },
  document: {
    readyState: 'loading', hidden:false, listeners:{}, addEventListener(type,fn){(this.listeners[type] ||= []).push(fn);},
    createElement: tag => new Element(tag),
    getElementById: id => id === 'world-scene' ? container : id === 'world-error' ? errorNode : id === 'world-hover' ? hoverNode : null
  },
  matchMedia: () => ({ get matches() { return reduceMotion; } }), devicePixelRatio: 1,
  CM_I18N: { t: text => text }
};
sandbox.window = sandbox;
const context = vm.createContext(sandbox);
for (const name of ['data.js', 'engine.js', 'scene-adapter.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, 'dist', name), 'utf8'), context, { filename: name });
}
const model = context.CM_ENGINE.create();
context.CM_APP = {
  getState: () => model, getSelection: () => 'cca',
  showPlot: id => calls.push(['plot', id]),
  showResident: id => calls.push(['resident', id]),
  showIssue: id => calls.push(['issue', id])
};
const testIssues = [
  { id: 'route', title: '那段没有遮的路', anchor: 'route', stage: 0 },
  { id: 'noise', title: '楼上的年轻人', anchor: 'void', stage: 1 },
  { id: 'housing', title: '卖不出去的房子', anchor: 'rahman', stage: 0 },
  { id: 'care', title: '白天的照护', anchor: 'kumar', stage: 0 }
];
assert.doesNotThrow(() => context.CM_SCENE.sync(model, {
  selectedPlot: 'garden', selectingCard: 'cca', showLand: true,
  paused: true, simTime: 0, language: 'zh', issues: testIssues
}));

// Substitute only the renderer. Geometry, transforms, scene graph, actor paths,
// labels, issue callbacks and projection use the shipped Three.js code.
assert.ok(bundle.includes('const C={'));
bundle = bundle.replace('const C={', 'THREE.WebGLRenderer=window.__FakeRenderer; const C={');
const end = bundle.lastIndexOf("if(document.readyState==='loading')");
assert.ok(end > 0);
bundle = bundle.slice(0, end) + 'window.__CM_SCENE_TEST={initialize,animate,actors,walkers,traffic,clouds,domLabels,staticHits,issueLabels,projectNodes,workerActors,socialActors,updateTraffic,vehicleCollision,previewGroup,get renderer(){return renderer;},facilityGroup};\n' + bundle.slice(end);
vm.runInContext(bundle, context, { filename: 'scene.bundle.js' });
context.__CM_SCENE_TEST.initialize();
const scene = context.__CM_SCENE_TEST;
assert.equal(context.HDBScene.ready, true, context.HDBScene.diagnostics().error);

const api=context.HDBScene;
const advance=(frames=1,step=32)=>{for(let i=0;i<frames;i++){wallClock+=step;scene.animate(wallClock);}};
const sync=extra=>context.CM_SCENE.sync(model,{paused:true,suspended:false,simTime:0,issues:[],showLand:true,...extra});
sync({});advance();
const still=api.diagnostics().renderStats;
assert.equal(still.loopRunning,false,'a stable paused scene actually stops its render callback');
advance(180);
assert.equal(api.diagnostics().renderStats.renderedFrames,still.renderedFrames,'six paused seconds perform no extra GPU draws');
assert.equal(api.diagnostics().renderStats.simulationUpdates,still.simulationUpdates,'paused actors/traffic are not recomputed');
sync({});advance();
assert.equal(api.diagnostics().renderStats.renderedFrames,still.renderedFrames,'an unchanged sync does not redraw the paused world');
assert(api.diagnostics().renderStats.staticTransforms>1000,'static building transforms are retained');

api.rotate(1);assert(api.diagnostics().renderStats.loopRunning,'camera controls wake the renderer');
advance(130);
const rotated=api.diagnostics().renderStats;
assert(rotated.renderedFrames>still.renderedFrames,'camera interpolation is drawn while the simulation is paused');
assert.equal(rotated.simulationUpdates,still.simulationUpdates,'camera movement does not restart the simulation');
assert.equal(rotated.loopRunning,false,'camera interpolation settles back to idle');
advance(60);assert.equal(api.diagnostics().renderStats.renderedFrames,rotated.renderedFrames);

api.previewPlacement('route-west','cover',{x:.2,z:0,rotation:Math.PI});advance();
assert(api.diagnostics().renderStats.renderedFrames>rotated.renderedFrames,'placement previews render while paused');
assert.equal(scene.previewGroup.children.length,1);api.clearPreview();advance();assert.equal(scene.previewGroup.children.length,0);

api.cue({type:'start',cardId:'cover',plotId:'route-west'});advance();
const cueFrame=api.diagnostics().renderStats.renderedFrames;
advance(15);assert(api.diagnostics().renderStats.renderedFrames>cueFrame,'visible transient cues still animate');
advance(180);assert.equal(api.diagnostics().cueEffects,0);assert.equal(api.diagnostics().renderStats.loopRunning,false,'expired cues return to idle');

api.cue({type:'decision',cardId:'event'});sync({suspended:true});advance();
const covered=api.diagnostics().renderStats.renderedFrames;
advance(80);assert.equal(api.diagnostics().renderStats.renderedFrames,covered,'an indoor or reading overlay suspends background effects');
sync({suspended:false});advance();assert(api.diagnostics().renderStats.renderedFrames>covered,'closing the overlay wakes the background');
advance(100);

context.document.hidden=true;for(const handler of context.document.listeners.visibilitychange||[])handler();
sync({paused:false,simTime:50});advance(30);
const hidden=api.diagnostics().renderStats.renderedFrames;
advance(30);assert.equal(api.diagnostics().renderStats.renderedFrames,hidden,'hidden tabs perform no rendering');
assert.equal(api.diagnostics().renderStats.loopRunning,false);
context.document.hidden=false;for(const handler of context.document.listeners.visibilitychange||[])handler();
sync({paused:true,simTime:50});advance();
assert(api.diagnostics().renderStats.renderedFrames>hidden);assert.equal(api.diagnostics().simTime,50,'resuming preserves the supplied game clock');

sync({paused:false,simTime:51});advance();const actorPosition=scene.actors[0].node.position.toArray();advance(5);
assert.notDeepEqual(scene.actors[0].node.position.toArray(),actorPosition,'running residents still walk');
assert.equal(api.diagnostics().vehicleOverlaps,0,'diagnostics retain the traffic collision audit');

model.plots['route-west']={cardId:'cover',status:'building',remaining:45,placement:{x:0,z:0,rotation:0}};
model.projects=[{cardId:'cover',plotId:'route-west',remaining:45,total:55,placement:{x:0,z:0,rotation:0}}];
sync({simTime:10});advance();
const constructionGroup=scene.facilityGroup.children[0],worker=scene.workerActors[0].node;
model.plots['route-west'].remaining=35;model.projects[0].remaining=35;
sync({simTime:20});advance();
assert.equal(scene.facilityGroup.children[0],constructionGroup,'progress updates keep the existing construction group');
assert.equal(scene.workerActors[0].node,worker,'progress updates keep the existing worker meshes');
const progressLabel=scene.domLabels.find(label=>label.constructionIndex===context.CM_DATA.plots.findIndex(plot=>plot.id==='route-west'));
assert(progressLabel.node.textContent.includes('36%'),'retained construction labels still show current progress');
console.log('PASS scene performance: paused and hidden rendering stop; camera, preview, cues and visibility wake correctly; animation clock and construction meshes remain intact.');
console.log(JSON.stringify({pausedDraws:0,pausedFramesChecked:180,staticTransforms:api.diagnostics().renderStats.staticTransforms,renderStats:api.diagnostics().renderStats}));

// Policies present already-settled state. They must never create duplicate
// facilities, retain highlight materials, or animate a reduced-motion scene.
model.plots['route-west'].status='complete';model.projects=[];sync({paused:true,simTime:20});advance(180);
const built=scene.facilityGroup.children.find(node=>node.userData.plotId==='route-west');
assert(built,'completed facility is the actual retained map model');
const normalScale=built.scale.clone(),meshNode=built.children.find(node=>node.isMesh),normalMaterial=meshNode.material,normalLabels=scene.domLabels.length,normalFacilities=scene.facilityGroup.children.length;
const geometryDisposals=[];let originalDisposals=0;normalMaterial.addEventListener('dispose',()=>originalDisposals++);
const policy=api.presentPolicy({visual:'cover',assetId:'cover',residentId:'chen',title:'连通有盖路线',kind:'build'});
assert.equal(policy.ok,true);assert.equal(policy.plotId,'route-west');assert.equal(api.diagnostics().policyPresentation.building,true);
assert(built.scale.y<normalScale.y,'the completed model begins a real construction reveal');
assert.notEqual(meshNode.material,normalMaterial,'highlights clone shared map materials');
const effect=scene.projectNodes.get('policy:active');effect.traverse(node=>{if(node.isMesh)node.geometry.addEventListener('dispose',()=>geometryDisposals.push(node));});
assert(effect.children.filter(node=>node.isMesh).length>=2,'the scene marks the site with a calm ring and halo');
assert.equal(policy.durationMs,3800);assert.equal(typeof api.policyDone,'function');assert.equal(api.policyDone(),false,'the step is not done until the build finishes');advance(45);assert(built.children.some(n=>n.isMesh&&!n.visible),'structure is still being built at 1.5 seconds');advance(140);assert.equal(built.scale.y,normalScale.y,'the building reaches its correct permanent height');assert(built.children.filter(n=>n.isMesh).every(n=>n.visible),'all building parts are present when construction finishes');
api.clearPolicyPresentation();advance(180);
assert.equal(built.scale.y,normalScale.y);assert.equal(meshNode.material,normalMaterial);assert.equal(originalDisposals,0,'shared art materials are never disposed');
assert(geometryDisposals.length>=2,'transient policy geometry is released');assert.equal(scene.domLabels.length,normalLabels);assert.equal(scene.projectNodes.has('policy:active'),false);
for(let n=0;n<12;n++){api.presentPolicy({visual:'action-mediate',residentId:'students',title:'共同约定作息',kind:'service'});assert.equal(api.diagnostics().policyPresentation.plotId,null,'social policies highlight the requesting resident');assert.equal(api.diagnostics().policyPresentation.stars,0,'coordination is marked by the calm ring only, with no rising stars');advance(2);api.clearPolicyPresentation();}
assert.equal(scene.facilityGroup.children.length,normalFacilities,'replays never build additional permanent facilities');assert.equal(scene.domLabels.length,normalLabels,'replays clean up all presentation labels');
const blockB=scene.projectNodes.get('building:b'),upperFloor=blockB.children.find(node=>node.isMesh&&node.position.y>3),upperWasVisible=upperFloor.visible;
api.presentPolicy({visual:'corner',assetId:'corner',residentId:'students',title:'设置共享活动点',kind:'build'});assert.equal(upperFloor.visible,false,'ground-floor policies temporarily reveal the space below obstructing storeys');api.clearPolicyPresentation();assert.equal(upperFloor.visible,upperWasVisible,'finishing or skipping the animation restores the original buildings');
reduceMotion=true;api.presentPolicy({visual:'cover',assetId:'cover',residentId:'chen',title:'有盖路线',kind:'build'});assert.equal(built.scale.y,normalScale.y,'reduced motion shows the complete facility immediately');advance(180);const staticPolicyFrame=api.diagnostics().renderStats.renderedFrames;advance(60);assert.equal(api.diagnostics().renderStats.renderedFrames,staticPolicyFrame,'reduced-motion highlight does not keep an idle render loop alive');api.clearPolicyPresentation();reduceMotion=false;advance(180);
console.log('PASS policy map presentations: correct sites, live model reveal, resident feedback, cleanup, safe replay and reduced-motion idle rendering.');

(async()=>{await Promise.resolve();assert.equal(scene.renderer.pending.size,0,'idle microtask cancels Three’s already-queued next RAF');for(let i=0;i<10;i++){api.invalidate();assert.equal(scene.renderer.pending.size,1,'wake schedules exactly one RAF chain');wallClock+=32;scene.renderer.frame(wallClock);await Promise.resolve();assert.equal(scene.renderer.pending.size,0,'pause cancels the post-callback RAF rather than leaking a loop');}console.log('PASS repeated render wake/sleep does not leak or multiply Three.js RAF chains.');})().catch(error=>{console.error(error);process.exitCode=1;});
