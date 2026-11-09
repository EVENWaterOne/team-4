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
  constructor() { this.domElement = new Element('canvas'); this.shadowMap = {}; this.renders = 0; }
  setPixelRatio(value) { this.pixelRatio = value; }
  setSize(w, h) { this.domElement.width = w * this.pixelRatio; this.domElement.height = h * this.pixelRatio; this.lastSize = [w, h]; }
  setAnimationLoop(callback) { this.loop = callback; }
  render() { this.renders++; }
}
const container = new Element(), errorNode = new Element(), hoverNode = new Element();
const calls = [];
const sandbox = {
  console, AbortController, performance: { now: () => wallClock }, __FakeRenderer: FakeRenderer,
  ResizeObserver: class { observe() {} },
  document: {
    readyState: 'loading', addEventListener() {},
    createElement: tag => new Element(tag),
    getElementById: id => id === 'world-scene' ? container : id === 'world-error' ? errorNode : id === 'world-hover' ? hoverNode : null
  },
  matchMedia: () => ({ matches: false }), devicePixelRatio: 1,
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
bundle = bundle.slice(0, end) + 'window.__CM_SCENE_TEST={initialize,animate,actors,walkers,traffic,clouds,domLabels,staticHits,issueLabels,projectNodes,workerActors,socialActors,updateTraffic,vehicleCollision,previewGroup};\n' + bundle.slice(end);
vm.runInContext(bundle, context, { filename: 'scene.bundle.js' });
context.__CM_SCENE_TEST.initialize();
const scene = context.__CM_SCENE_TEST;
assert.equal(context.HDBScene.ready, true, context.HDBScene.diagnostics().error);

assert.equal(context.HDBScene.diagnostics().plotIds.length,context.CM_DATA.plots.length,'every candidate space must exist in 3D');
// Selection exposes applicable places, rather than every candidate space.
context.CM_SCENE.sync(model,{selectingCard:'cca',selectedPlot:'garden',showLand:false,paused:true,simTime:0});scene.animate(1100);
const invalidSiteLabel=scene.domLabels.find(l=>l.kind==='plot'&&l.id===0);
const validSiteLabel=scene.domLabels.find(l=>l.kind==='plot'&&l.id===3);
assert.equal(invalidSiteLabel.anchor.visible,false,'candidate label clutter: incompatible route hidden for CCA');
assert.equal(invalidSiteLabel.node.style.display,'none','incompatible candidate DOM must not be displayed');
assert.equal(validSiteLabel.anchor.visible,true,'applicable garden label remains visible');
assert.equal(validSiteLabel.node.style.display,'block');
assert.equal(validSiteLabel.node.style.pointerEvents,'auto','valid candidate stays clickable');
validSiteLabel.node.listeners.click[0]({preventDefault(){},stopPropagation(){}});assert.deepEqual(calls.pop(),['plot','garden']);
context.CM_SCENE.sync(model,{selectingCard:null,selectedPlot:null,showLand:true,paused:true,simTime:0});scene.animate(1200);
assert.equal(invalidSiteLabel.anchor.visible,true,'explicit land display restores other spaces');
context.CM_SCENE.sync(model,{selectingCard:null,selectedPlot:null,showLand:false,paused:true,simTime:0});scene.animate(1300);
assert.equal(invalidSiteLabel.anchor.visible,false,'normal hidden land view removes candidate labels');

assert.equal(context.CM_DATA.plots.length,11);
for(const actor of scene.actors.filter(a=>a.id!=='lin-child')){assert(actor.node.userData.face,'principal actor has face');assert(actor.node.userData.profile,'principal actor has distinguishing profile');}
for(const key of ['a','b','c','d','e','f','g','h']){const building=scene.projectNodes.get('building:'+key),windows=building.children.filter(n=>n.isMesh&&n.geometry.parameters.height> .8&&n.geometry.parameters.height<1.4);assert(windows.some(n=>n.geometry.parameters.depth<.1&&n.position.z>0),'front windows '+key);assert(windows.some(n=>n.geometry.parameters.depth<.1&&n.position.z<0),'rear windows '+key);assert(windows.some(n=>n.geometry.parameters.width<.1&&n.position.x>0),'right-side windows '+key);assert(windows.some(n=>n.geometry.parameters.width<.1&&n.position.x<0),'left-side windows '+key);}
let worstGap=Infinity;for(let tick=0;tick<=2400;tick++){scene.updateTraffic(tick*.25);const diag=context.HDBScene.diagnostics();worstGap=Math.min(worstGap,diag.vehicleMinDistance);assert.equal(diag.vehicleOverlaps,0,'vehicle overlap at '+tick*.25);}
for(const jump of [10000,50000,1,0,987.4]){scene.updateTraffic(jump);assert.equal(context.HDBScene.diagnostics().vehicleOverlaps,0,'time-jump traffic stays separated');}
assert(context.HDBScene.previewPlacement('room-b','aac',{x:.4,z:.2,rotation:Math.PI/2}));
assert.equal(context.HDBScene.diagnostics().placementPreview.plotId,'room-b');assert.equal(scene.previewGroup.children.length,1);context.HDBScene.clearPreview();assert.equal(scene.previewGroup.children.length,0);
model.plots['room-b']={cardId:'aac',status:'building',remaining:40,placement:{x:.4,z:.2,rotation:Math.PI/2}};
model.projects=[{cardId:'aac',plotId:'room-b',remaining:40,total:65,placement:{x:.4,z:.2,rotation:Math.PI/2}}];
context.CM_SCENE.sync(model,{paused:true,simTime:15});assert.equal(context.HDBScene.diagnostics().constructionWorkers,3);
const snap=()=>JSON.stringify([...scene.actors,...scene.traffic,...scene.workerActors].map(a=>[a.node.position.toArray(),a.node.rotation.toArray()]));
scene.animate(4000);const paused=snap();scene.animate(5000);assert.equal(snap(),paused,'world actors and construction workers pause together');
model.flags.noiseResolved=true;context.CM_SCENE.sync(model,{paused:false,simTime:18});scene.animate(6000);assert(context.HDBScene.diagnostics().socialParticipants>=4);
const socialBefore=scene.socialActors[0].node.userData.limbs.arms[0].rotation.x;context.CM_SCENE.sync(model,{paused:false,simTime:19});scene.animate(7000);assert.notEqual(scene.socialActors[0].node.userData.limbs.arms[0].rotation.x,socialBefore,'social gathering really animates');
assert(context.HDBScene.cue({type:'start',cardId:'aac',plotId:'room-b'}));assert(context.HDBScene.diagnostics().cueEffects>0);
const modelPlot=context.__CM_SCENE_TEST.projectNodes.get('plot:room-b');assert(modelPlot,'added sites have camera anchors');
console.log('PASS upgraded scene: 11 natural sites, eight detailed personas, four-sided buildings, 600s SAT collision audit + large time jumps, preview, worker and social motion, pause and cues. Min vehicle centre gap '+worstGap);
