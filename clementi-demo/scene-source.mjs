import * as THREE from './vendor/three.module.js';

// A continuous illustrative Clementi neighbourhood; these are game-design
// positions, not surveyed parcels or approved sites for development.
const C={ground:0x7f846d,paving:0xcfb99b,road:0x555666,cream:0xe8d0ae,wall:0xb9aaa9,pale:0xd6b5a8,coral:0xc47568,teal:0x497f7b,mint:0x83a993,navy:0x303b57,dark:0x343548,amber:0xffc66d,orange:0xec9852,leaf:0x456c52,lightLeaf:0x779765,wood:0x805747,metal:0x6b7183,skin:0xd79e73};
const fallbackPlotIds=['route','void','room','garden','crossing','locked'];
const plotDefinitions=window.CM_DATA?.plots||[];
const plotIds=plotDefinitions.length?plotDefinitions.map(p=>p.id):fallbackPlotIds;
const fallbackPositions=[[-16,3],[-29,-3],[-11,-11],[6,27],[18,17],[37,-7]];
const plotPositions=plotIds.map((id,i)=>plotDefinitions[i]?.scenePosition||fallbackPositions[i]||[-44,5]);
const fallbackSizes=[[16,2.7],[9,3.5],[5.2,4.6],[8.5,8.5],[6.2,6.2],[9,18]];
const plotSizes=plotIds.map((id,i)=>plotDefinitions[i]?.sceneSize||fallbackSizes[i]||[6,4]);
const fallbackPlotNames=['食阁—车站步行段','A栋底层空间','社区空置房间','街角花园地块','旧组屋出口与过街处','既有建筑与规划保留区'];
const plotNames=plotIds.map((id,i)=>plotDefinitions[i]?.name||fallbackPlotNames[i]||id);
const residentNames={chen:'陈玉英',rahman:'拉赫曼夫妇',lin:'林家',kumar:'库马尔一家',students:'合租学生',huang:'黄美兰',zhang:'张叔',ali:'阿丽'};
const residentPositions={chen:[-27,0,1],rahman:[-12,0,-15],lin:[9,0,-36],kumar:[31,0,27],students:[-32,0,-18],huang:[-3,0,7],zhang:[-24,0,-2],ali:[35,0,-19]};
const issueAnchors={route:'route',noise:'void',neighbours:'void',housing:'rahman',waiting:'rahman',explain:'rahman',care:'kumar',carealt:'kumar',land:'garden',petition:'room',ballot:'room',stall:'huang',return:'chen'};
const scene=new THREE.Scene(),world=new THREE.Group(),facilityGroup=new THREE.Group(),storyGroup=new THREE.Group();
scene.add(world);world.add(facilityGroup,storyGroup);
const geometryCache=new Map(),materialCache=new Map(),projectNodes=new Map(),routeCache=new WeakMap();
const staticHits=[],facilityHits=[],actors=[],walkers=[],traffic=[],clouds=[],domLabels=[],issueLabels=new Map(),plotLabels=[],selectionTiles=[],fireworks=[];
let renderer,camera,container,labelLayer,resizeObserver;
let renderDirty=true,simulationDirty=true,loopRunning=false,lastAnimatedClock=NaN,trafficAuditDirty=true;
const renderStats={renderedFrames:0,simulationUpdates:0,labelPasses:0,idleSkips:0,hiddenSkips:0,staticTransforms:0};
const labelVector=new THREE.Vector3();
function invalidate(){renderDirty=true;if(ready&&renderer&&!document.hidden&&!loopRunning){loopRunning=true;renderer.setAnimationLoop(animate);}}
// Three queues its next RAF after this callback returns; cancel after that stack.
function sleepRenderer(){if(loopRunning){loopRunning=false;Promise.resolve().then(()=>{if(!loopRunning)renderer.setAnimationLoop(null);});}}
function freezeStaticTransforms(){scene.updateMatrixWorld(true);const dynamic=new Set([facilityGroup,storyGroup,previewGroup,...actors.map(a=>a.node),...walkers.map(a=>a.node),...traffic.map(a=>a.node),...clouds.map(c=>c.node),...selectionTiles]);function freeze(node){if(dynamic.has(node))return;node.updateMatrix();node.matrixAutoUpdate=false;node.matrixWorldAutoUpdate=false;renderStats.staticTransforms++;node.children.forEach(freeze);}world.children.forEach(freeze);scene.matrixAutoUpdate=false;world.matrixAutoUpdate=false;}
let state=null,options={placed:true,view:'neighborhood',selected:null,selectedPlot:null,validPlots:[],showLand:true,paused:true,simTime:0,language:'zh',issues:[]};
let angle=-Math.PI*.22,zoomLevel=1,drag=null,hoverTarget=null,signature='',storySignature='',ready=false,lastFrame=0,lastSync=0,simRate=1,previousSim=0,animationClock=0,observedState=null,observedPlots=[];
let cameraTarget=new THREE.Vector3(0,9,0),cameraPosition=new THREE.Vector3(),focusTarget=null,focusedIssue=null,fireworksLaunched=0;
const workerActors=[],socialActors=[],cueEffects=[],constructionModels=[];
let policyPresentation=null;
const constructionStarted=new Map();
const previewGroup=new THREE.Group();scene.add(previewGroup);let previewSelection=null,vehicleMinDistance=Infinity,vehicleOverlaps=0;
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
function t(text){return window.CM_I18N?.t?window.CM_I18N.t(text):text;}
function bilingual(zh,en){return options.language==='en'?en:zh;}
function plotLocked(index){return plotIds[index]==='locked'||plotDefinitions[index]?.kind==='locked';}
function geo(type,args){const key=type+args.join(',');if(!geometryCache.has(key))geometryCache.set(key,type==='box'?new THREE.BoxGeometry(...args):type==='sphere'?new THREE.SphereGeometry(...args):new THREE.CylinderGeometry(...args));return geometryCache.get(key);}
function mat(color,{emissive=false,transparent=false,opacity=1}={}){const key=[color,emissive,transparent,opacity].join('|');if(!materialCache.has(key))materialCache.set(key,new THREE.MeshLambertMaterial({color,emissive:emissive?color:0,emissiveIntensity:emissive?.55:0,transparent,opacity}));return materialCache.get(key);}
function mesh(type,args,color,x,y,z,parent=world,extra={}){const m=new THREE.Mesh(geo(type,args),mat(color,extra));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function box(w,h,d,color,x,y,z,parent=world,extra={}){return mesh('box',[w,h,d],color,x,y,z,parent,extra);}
function cylinder(r,h,color,x,y,z,parent=world,n=8){return mesh('cylinder',[r,r,h,n],color,x,y,z,parent);}
function sphere(r,color,x,y,z,parent=world){return mesh('sphere',[r,6,4],color,x,y,z,parent);}
function target(node,kind,id,hits=staticHits){node.traverse(o=>{if(o.isMesh){o.userData.kind=kind;o.userData.id=id;hits.push(o);}});projectNodes.set(kind+':'+id,node);return node;}
function getPlotIndex(id){return typeof id==='number'?id:plotIds.indexOf(id);}
function callAction(kind,id){if(kind==='issue')window.CM_APP?.showIssue?.(id);else if(kind==='resident')window.CM_APP?.showResident?.(id);else if(kind==='plot')window.CM_APP?.showPlot?.(plotIds[getPlotIndex(id)]);else window.DownstairsUI?.sceneBuilding?.();}

// Readable labels remain full-resolution DOM; only the physical world uses the
// low-poly/pixel-inspired art direction.
function registerDomLabel(anchor,value,{kind=null,id=null,background='#263347e8',color='#fff0d2',border='#e7be8699',size=12,offsetY=0,priority=0}={}){
  const node=document.createElement(kind?'button':'span');node.className='scene-text-label'+(kind?' scene-clickable-label':'');
  if(kind){node.type='button';node.dataset.sceneKind=kind;node.dataset.sceneId=String(id);node.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();callAction(kind,id);});node.addEventListener('pointerdown',e=>e.stopPropagation());}
  Object.assign(node.style,{position:'absolute',display:'none',pointerEvents:kind?'auto':'none',cursor:kind?'pointer':'default',color,background,border:'1px solid '+border,borderRadius:kind==='issue'?'9px':'4px',padding:kind==='issue'?'8px 11px':kind?'5px 8px':'3px 7px',font:'600 '+size+'px/1.45 system-ui,"Microsoft YaHei","PingFang SC",sans-serif',letterSpacing:'.01em',whiteSpace:kind==='issue'?'normal':'nowrap',maxWidth:kind==='issue'?'190px':'none',textAlign:'left',transform:'translate(-50%,-100%)',textShadow:'none',boxShadow:'0 3px 9px #19213745',imageRendering:'auto',WebkitFontSmoothing:'antialiased'});
  if(kind){node.onmouseenter=()=>{node.style.borderColor='#fff0be';node.style.boxShadow='0 0 0 2px #f5d49b55,0 4px 12px #17203566';};node.onmouseleave=()=>{node.style.borderColor=border;node.style.boxShadow='0 3px 9px #19213745';};}
  labelLayer.append(node);const label={anchor,node,value,kind,id,offsetY,priority};domLabels.push(label);updateLabelText(label);return label;
}
function updateLabelText(label){const value=typeof label.value==='function'?label.value():t(label.value);if(label.lastText!==value){label.lastText=value;label.node.textContent=value;label.node.setAttribute('aria-label',value);}}
function textSprite(value,x,y,z,parent=world,opts={}){const anchor=new THREE.Object3D();anchor.position.set(x,y,z);parent.add(anchor);registerDomLabel(anchor,value,opts);return anchor;}
function sign(value,w,h,x,y,z,parent=world,{background='#bc7558',color='#fff0cf',kind=null,id=null}={}){const board=box(w,h,.12,background,x,y,z,parent);registerDomLabel(board,value,{background:background+'ef',color,kind,id,size:12,offsetY:4});return board;}
function updateDomLabels(){if(!camera)return;renderStats.labelPasses++;scene.updateMatrixWorld();camera.updateMatrixWorld();const w=container.clientWidth,h=container.clientHeight;for(let i=domLabels.length-1;i>=0;i--){const label=domLabels[i];let p=label.anchor,attached=false,visible=true;while(p){if(!p.visible)visible=false;if(p===scene){attached=true;break;}p=p.parent;}if(!attached){label.node.remove();domLabels.splice(i,1);continue;}if(label.kind==='plot'){const key=plotIds[getPlotIndex(label.id)];if(options.selected){if(!(options.validPlots||[]).includes(key)&&options.selectedPlot!==key)visible=false;}else if(!options.showLand)visible=false;}const v=labelVector.setFromMatrixPosition(label.anchor.matrixWorld).project(camera);const shown=visible&&v.z>=-1&&v.z<=1&&v.x>=-1.1&&v.x<=1.1&&v.y>=-1.15&&v.y<=1.2;if(label.shown!==shown){label.shown=shown;label.node.style.display=shown?'block':'none';}if(!shown)continue;const left=Math.round((v.x+1)*.5*w)+'px',top=Math.round((1-v.y)*.5*h+label.offsetY)+'px',zIndex=String(label.priority+Math.round(1000-v.z*100));if(label.left!==left){label.left=left;label.node.style.left=left;}if(label.top!==top){label.top=top;label.node.style.top=top;}if(label.zIndex!==zIndex){label.zIndex=zIndex;label.node.style.zIndex=zIndex;}}}
function tree(x,z,parent=world,size=1){const g=new THREE.Group();g.position.set(x,0,z);parent.add(g);cylinder(.17*size,2.5*size,C.wood,0,1.3*size,0,g);[[-.7,3.1,0,1.7],[.65,3.8,.3,1.8],[0,4.5,-.2,1.65],[1.1,3.1,-.5,1.4],[-.9,4,.6,1.4]].forEach(([a,b,c,d],i)=>{const leaf=box(d*size,1.2*size,d*.9*size,i%2?C.leaf:C.lightLeaf,a*size,b*size,c*size,g);leaf.rotation.y=i*.32;});return g;}
function planter(x,z,parent=world,size=.65){box(size,.5,size,C.coral,x,.4,z,parent);sphere(size*.63,C.leaf,x,.9,z,parent);sphere(size*.42,C.lightLeaf,x+.1,1.2,z,parent);}
function bench(x,z,parent=world,rotation=0){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rotation;parent.add(g);for(let k=0;k<3;k++)box(2.05,.1,.17,C.wood,0,.78,-.23+k*.2,g);box(2.05,.14,.13,C.wood,0,1.17,-.37,g);box(2.05,.14,.13,C.wood,0,.98,-.37,g);for(const a of [-.78,.78])box(.12,.75,.55,C.navy,a,.4,0,g);return g;}
function lamp(x,z,parent=world){cylinder(.07,3.4,C.dark,x,1.75,z,parent);box(.7,.12,.7,C.navy,x,3.53,z,parent);box(.4,.42,.4,C.amber,x,3.23,z,parent,{emissive:true});}

function addSideWindows(g,w,d,levels=1,startY=1.8,spacing=2.2){
 for(let f=0;f<levels;f++){const y=startY+f*spacing;for(const x of [-w*.3,0,w*.3]){box(Math.min(1.2,w/5),.9,.055,C.navy,x,y,-d/2-.04,g);box(Math.min(.98,w/6),.7,.035,C.amber,x,y,-d/2-.08,g,{emissive:true});}
 for(const side of [-1,1])for(const z of [-d*.25,d*.25]){box(.055,.9,Math.min(1.1,d/3),C.navy,side*(w/2+.04),y,z,g);box(.035,.7,Math.min(.9,d/3.4),C.amber,side*(w/2+.08),y,z,g,{emissive:true});}}
}
function resolvedPlacement(index,placement){const [x,z]=plotPositions[index],offset=placement||{};return{x:x+(Number(offset.x)||0),z:z+(Number(offset.z)||0),rotation:Number(offset.rotation)||0};}
function setGroupPlacement(g,index,placement){const p=resolvedPlacement(index,placement);g.position.set(p.x,0,p.z);g.rotation.y=p.rotation;return g;}

function makePerson({shirt=C.teal,skin=C.skin,scale=1,child=false,id=null,hair=null,elder=false,accessory=null}={}){
 const profiles={chen:{hair:0xb7b3b1,elder:true,accessory:'cane',skirt:true},rahman:{hair:0xaaa6a0,elder:true,accessory:'glasses'},lin:{hair:0x38313a,accessory:'bag',longHair:true},kumar:{hair:0x292b30,beard:true},students:{hair:0x272a35,accessory:'backpack'},huang:{hair:0xb0a59b,elder:true,apron:true,longHair:true},zhang:{hair:0xc3b9ad,elder:true,accessory:'clipboard',cap:true},ali:{hair:0x2b2934,longHair:true,accessory:'bag'}};
 const profile={hair:hair||0x3b333c,elder,accessory,...profiles[id]},g=new THREE.Group();g.scale.setScalar(scale);g.userData.personId=id;
 const torso=box(.52,.73,.35,shirt,0,1.12,0,g);if(profile.elder)torso.rotation.x=.08;
 box(.39,.43,.36,skin,0,1.72,0,g);box(.43,.18,.4,profile.hair,0,1.98,-.015,g);
 box(.43,.22,.13,profile.hair,0,1.79,-.18,g);
 if(profile.longHair){box(.18,.38,.18,profile.hair,.2,1.72,-.15,g);sphere(.14,profile.hair,0,1.91,-.25,g);}
 if(profile.cap){box(.48,.1,.43,C.teal,0,2.05,0,g);box(.44,.05,.19,C.teal,0,2.01,.23,g);}
 const eyes=[],brows=[];for(const x of [-.105,.105]){box(.11,.09,.025,0xfaf0dc,x,1.76,.187,g);eyes.push(box(.045,.055,.035,C.dark,x,1.76,.205,g));brows.push(box(.12,.025,.035,profile.hair,x,1.85,.21,g));}
 const mouth=box(.1,.028,.035,C.dark,0,1.61,.206,g),mouthCorners=[box(.035,.035,.035,C.dark,-.067,1.61,.206,g),box(.035,.035,.035,C.dark,.067,1.61,.206,g)];box(.06,.07,.06,skin,0,1.69,.21,g);
 if(profile.beard)box(.32,.085,.08,profile.hair,0,1.56,.17,g);
 if(profile.accessory==='glasses'||id==='chen'||id==='zhang')for(const x of [-.11,.11]){box(.16,.025,.04,C.dark,x,1.81,.23,g);box(.16,.025,.04,C.dark,x,1.69,.23,g);for(const d of [-.075,.075])box(.025,.14,.04,C.dark,x+d,1.75,.23,g);}
 if(profile.apron)box(.39,.58,.045,C.cream,0,1.08,.2,g);
 if(profile.skirt)box(.55,.4,.41,0x75667f,0,.76,0,g);
 const legs=[],arms=[];for(const x of [-.15,.15]){const pivot=new THREE.Group();pivot.position.set(x,.79,0);g.add(pivot);box(.18,.63,.2,C.navy,0,-.31,0,pivot);box(.23,.13,.38,C.dark,0,-.63,.07,pivot);legs.push(pivot);}
 for(const x of [-.35,.35]){const pivot=new THREE.Group();pivot.position.set(x,1.4,0);g.add(pivot);box(.17,.21,.2,shirt,0,-.09,0,pivot);box(.14,.43,.17,skin,0,-.38,0,pivot);arms.push(pivot);}
 if(profile.accessory==='cane'){box(.055,1.13,.055,C.wood,.43,.62,.16,g);box(.18,.07,.07,C.wood,.37,1.18,.16,g);}
 if(profile.accessory==='backpack'){box(.43,.52,.25,0x89765b,0,1.17,-.28,g);for(const x of [-.17,.17])box(.045,.58,.05,0x89765b,x,1.24,.2,g);}
 if(profile.accessory==='bag'){box(.24,.38,.2,C.wood,.35,.92,.05,g);box(.035,.55,.05,C.cream,.25,1.27,.19,g);}
 if(profile.accessory==='clipboard'){box(.3,.4,.055,C.cream,.43,1.03,.25,g);box(.16,.035,.065,C.teal,.43,1.15,.29,g);}
 g.userData.limbs={legs,arms};g.userData.face={eyes,brows,mouth,mouthCorners};g.userData.profile=profile;if(child)g.scale.multiplyScalar(.6);return g;
}

function routePoint(points,progress){let route=routeCache.get(points);if(!route){const lengths=[],total=points.slice(1).reduce((sum,p,i)=>{const len=Math.hypot(p[0]-points[i][0],p[1]-points[i][1]);lengths.push(len);return sum+len;},0);route={lengths,total};routeCache.set(points,route);}const {lengths,total}=route;let distance=((progress%1)+1)%1*total;for(let i=0;i<lengths.length;i++){if(distance<=lengths[i]||i===lengths.length-1){const a=points[i],b=points[i+1],f=lengths[i]?distance/lengths[i]:0;return{x:a[0]+(b[0]-a[0])*f,z:a[1]+(b[1]-a[1])*f,angle:Math.atan2(b[0]-a[0],b[1]-a[1])};}distance-=lengths[i];}return{x:points[0][0],z:points[0][1],angle:0};}
function placeWalkingActor(actor,clock){
 let path=actor.path,speed=actor.speed||50;
 if(actor.id==='chen'){
  const coverIndex=state?.plots?.findIndex(p=>p?.cardId==='cover'&&p.status==='complete')??-1,covered=coverIndex>=0||!!state?.flags?.completed?.cover;
  const selected=coverIndex>=0?plotPositions[coverIndex]:[-16,3];
  const routeKey=coverIndex+':'+selected.join(',');if(actor.coveredRouteKey!==routeKey){actor.coveredRouteKey=routeKey;actor.coveredPath=[[-27,1],[selected[0]-Math.min(6,plotSizes[Math.max(0,coverIndex)]?.[0]/2||6),selected[1]],[selected[0]+Math.min(6,plotSizes[Math.max(0,coverIndex)]?.[0]/2||6),selected[1]],[-11,2],[-5,7],[-11,2],[-27,1]];}path=covered?actor.coveredPath:actor.detourPath;speed=covered?65:84;
 }
 let phase=(clock+(actor.offset||0))/speed,walking=true;
 if(actor.id==='chen'&&!state?.flags?.completed?.cover){const cycle=((clock%84)+84)%84;if(cycle>16&&cycle<29){phase=16/84;walking=false;}}
 const p=routePoint(path,phase);actor.node.position.set(p.x,.2,p.z);actor.node.rotation.y=p.angle;
 const swing=walking?Math.sin(clock*5.2+(actor.offset||0))*.38:0;actor.node.userData.limbs?.legs.forEach((leg,i)=>leg.rotation.x=i?swing:-swing);actor.node.userData.limbs?.arms.forEach((arm,i)=>arm.rotation.x=i?-swing:swing);
 const group={chen:'elders',rahman:'owners',lin:'families',kumar:'care',students:'renters',huang:'elders',zhang:'elders',ali:'renters'}[actor.id];
 const concernKinds={chen:['route','noise'],rahman:['housing','waiting'],lin:['land','childcare'],kumar:['care','carealt'],students:['noise'],huang:['stall'],zhang:['petition','rumor'],ali:['noise']}[actor.id]||[];const concern=(state?.issues||options.issues||[]).some(i=>i.status!=='resolved'&&i.stage>0&&(concernKinds.includes(i.id)||i.anchor===actor.id));const value=state?.groups?.[group]??70;
 const mood=concern||value<40?'worried':value>=68?'content':'neutral';const face=actor.node.userData.face;
 if(face){face.mouth.scale.y=mood==='worried'?2.1:1;face.mouth.rotation.z=0;face.mouthCorners?.forEach(c=>c.position.y=mood==='content'?1.646:mood==='worried'?1.579:1.61);face.brows.forEach((b,i)=>b.rotation.z=mood==='worried'?(i?-.28:.28):0);}
 actor.node.userData.mood=mood;if(walking&&state?.flags?.neighbourHelp&&['students','chen','ali'].includes(actor.id)&&Math.sin(clock*.18)>.92){const arm=actor.node.userData.limbs?.arms[0];if(arm){arm.rotation.z=-1.1;arm.rotation.x=Math.sin(clock*4)*.22;}}else actor.node.userData.limbs?.arms.forEach(a=>a.rotation.z=0);
}

function oldHDB(id,x,z,w=18,h=15,d=5,rotation=0,color=C.wall){
 const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rotation;world.add(g);const floors=Math.max(4,Math.round((h-2.8)/2.35));
 target(box(w,h-2.8,d,color,0,(h+2.8)/2,0,g),'building',id);for(const zSide of [-d*.35,d*.35])for(let a=-w/2+.7;a<w/2;a+=3)box(.4,2.8,.45,C.cream,a,1.45,zSide,g);
 box(w+.35,.3,d+.35,C.cream,0,2.75,0,g);box(w+.55,.28,d+.55,C.cream,0,h+.12,0,g);
 for(let floor=0;floor<floors;floor++){const y=3.8+floor*2.3;for(const side of [-1,1]){
  box(w+.17,.18,.15,floor%3===0?C.coral:floor%3===1?C.cream:C.teal,0,y-.85,side*(d/2+.12),g);
  for(let a=-w/2+1.2;a<w/2-.5;a+=2.35){box(1.35,1.25,.07,C.dark,a,y,side*(d/2+.04),g);box(1.06,1.04,.04,(floor+Math.round(a))%3?C.amber:0x65747d,a,y,side*(d/2+.09),g,{emissive:(floor+Math.round(a))%3!==0});box(.05,1.1,.06,C.cream,a,y,side*(d/2+.14),g);box(1.25,.06,.06,C.cream,a,y,side*(d/2+.14),g);}
  for(const end of [-1,1])for(const a of [-d*.25,d*.25]){box(.07,1.15,1.1,C.dark,end*(w/2+.04),y,a,g);box(.04,.93,.9,0x8e9a98,end*(w/2+.09),y,a,g);}
 }}
 box(1.1,h+.5,d+.2,C.pale,-w/2+.65,(h+.5)/2,0,g);for(let k=0;k<floors;k++)for(const side of [-1,1])box(.72,.8,.06,C.navy,-w/2+.65,3.5+k*2.3,side*(d/2+.16),g);
 cylinder(.55,1.2,0x758a81,-w/2+3,h+.85,0,g);box(2,1.5,2.1,C.pale,w/2-2,h+.9,0,g);sign('旧组屋 '+id.toUpperCase(),2.1,.5,-w/2+.7,2.05,d/2+.35,g,{background:'#b57b65'});projectNodes.set('building:'+id,g);g.userData.windowFaces=4;return g;
}

function tower(id,x,z,height,color){
 const g=new THREE.Group();g.position.set(x,0,z);world.add(g);target(box(8,height,8,color,0,height/2+.2,0,g),'building',id);box(8.6,.35,8.6,C.cream,0,height+.35,0,g);
 for(let f=0;f<height/2.2;f++){box(8.1,.13,8.1,f%3?C.cream:C.teal,0,1.4+f*2.2,0,g);for(const a of [-2.65,-.9,.9,2.65])for(const side of [-1,1]){box(1.05,1.25,.06,(f+Math.round(a))%3?C.amber:0x61747b,a,1.9+f*2.2,side*4.04,g,{emissive:f%3!==0});box(.06,1.25,1.05,C.amber,side*4.04,1.9+f*2.2,a,g,{emissive:f%3!==0});}}
 box(2.4,height+1,2.8,C.pale,-2.7,(height+1)/2,-2.65,g);g.userData.windowFaces=4;return g;
}

function path(x1,z1,x2,z2,width=2.3,color=C.paving){const length=Math.hypot(x2-x1,z2-z1),piece=box(width,.1,length,color,(x1+x2)/2,.17,(z1+z2)/2);piece.rotation.y=Math.atan2(x2-x1,z2-z1);return piece;}
function createSky(){const cv=document.createElement('canvas');cv.width=8;cv.height=1024;const ctx=cv.getContext('2d'),gradient=ctx.createLinearGradient(0,0,0,1024);gradient.addColorStop(0,'#535871');gradient.addColorStop(.46,'#ad8a94');gradient.addColorStop(.75,'#e1a987');gradient.addColorStop(1,'#c9b39a');ctx.fillStyle=gradient;ctx.fillRect(0,0,8,1024);scene.background=new THREE.CanvasTexture(cv);scene.fog=new THREE.Fog(0xa29b91,120,235);for(let i=0;i<9;i++){const g=new THREE.Group();g.position.set(-100+i*25,35+(i%3)*4,-91-(i%2)*18);world.add(g);for(let k=0;k<4;k++){const cloud=box(8+k%2*3,1.6,4.8,0xd5c4bf,k*5,Math.sin(k*2)*.8,0,g,{transparent:true,opacity:.48});cloud.castShadow=false;}clouds.push({node:g,x:g.position.x,phase:i*17});}}
function createGround(){
 box(320,1,300,C.ground,0,-.65,-15);
 for(const z of [-55,17,46])box(180,.1,6,C.road,0,.06,z);
 for(const x of [-62,18,62])box(6,.1,107,C.road,x,.07,-4.5);
 // Markings stop before each junction. Footpaths run beside, never across it.
 for(const z of [-55,17,46])for(let x=-85;x<87;x+=5)if(![-62,18,62].some(j=>Math.abs(x-j)<5.4))box(2,.025,.13,C.cream,x,.14,z);
 for(const x of [-62,18,62])for(let z=-52;z<48;z+=5)if(![-55,17,46].some(j=>Math.abs(z-j)<5.4))box(.13,.025,2,C.cream,x,.15,z);
 for(const z of [12.5,21.5,41.8,50])for(const span of [[-58,12],[24,58]])path(span[0],z,span[1],z,2.2);
 for(const x of [13.5,22.5])for(const span of [[-50,10],[24,39],[53,59]])path(x,span[0],x,span[1],2.2);
 for(const [x,z]of [[18,17],[18,46],[-62,17],[62,17]]){
  for(let k=0;k<7;k++){box(.45,.03,5.2,C.cream,x-1.8+k*.6,.18,z-5.1);box(5.2,.03,.45,C.cream,x-5.1,.18,z-1.8+k*.6);}
  for(const side of [-1,1]){box(2.35,.03,.2,C.cream,x+side*1.5,.18,z+side*4.2);box(.2,.03,2.35,C.cream,x+side*4.2,.18,z-side*1.5);}
 }
 [[-48,-14,-17,-14],[-41,2,12,2],[-30,2,-30,12],[-12,-15,-12,2],[-10,2,-4,8],[-44,25,12,25],[-24,25,-24,42],[-8,25,-8,40],[25,-20,47,-20],[30,-20,30,12],[27,25,47,25],[36,25,36,42],[4,-36,4,-28]].forEach(p=>path(...p,2.3));
  oldHDB('a',-29,-4,22,15,5);oldHDB('b',-9,-21,23,16,5);oldHDB('c',11,-28,16,17,5);oldHDB('d',-44,-24,19,14,5,Math.PI/2,C.pale);oldHDB('e',-32,28,21,14,5);oldHDB('f',-8,36,22,15,5);oldHDB('g',35,30,22,16,5);oldHDB('h',37,-7,23,17,5,Math.PI/2,C.pale);tower('new-1',-10,-43,30,0xc4b5a9);tower('new-2',8,-46,34,0xb9b5ac);textSprite('新组屋',0,32,-43,world,{background:'#4c5e6be8'});createHawker();createMarket();createTransit();
  const room=new THREE.Group();room.position.set(-11,0,-11);world.add(room);box(5,2.7,4.2,C.pale,0,1.55,0,room);box(5.3,.23,4.5,C.cream,0,3.05,0,room);box(1.1,1.95,.09,C.teal,0,1.25,2.16,room);box(1.2,.8,.08,C.amber,-1.6,1.9,2.17,room,{emissive:true});addSideWindows(room,5,4.2,1,1.9);projectNodes.set('space:room',room);for(const def of plotDefinitions.filter(p=>p.kind==='room'&&p.id!=='room')){const [rx,rz]=def.scenePosition;const vacant=new THREE.Group();vacant.position.set(rx,0,rz);world.add(vacant);box(5,2.7,4.2,C.pale,0,1.55,0,vacant);box(5.3,.23,4.5,C.cream,0,3.05,0,vacant);box(1.1,1.95,.09,C.teal,0,1.25,2.16,vacant);addSideWindows(vacant,5,4.2,1,1.9);projectNodes.set('space:'+def.id,vacant);}box(8.6,.12,8.6,0x829a6b,6,.19,27);bench(4,29);planter(8,24);tree(9.8,30.2,world,.7);path(3,24,9,29,1.4);
  box(18,.13,10,0x6f8d62,-46,.16,37);path(-51,35,-39,39,2.2);path(-47,33,-43,41,2.2);bench(-47,37);bench(-41,39,world,Math.PI);textSprite('邻里公园',-46,2,34,world,{background:'#4c6a55e8'});
  const trees=[[-53,-35],[-38,-37],[-27,-33],[-22,-29],[-49,-7],[-37,8],[-24,8],[-18,7],[-1,-29],[12,-37],[27,-34],[47,-30],[49,-14],[45,5],[50,13],[-52,32],[-49,43],[-48,51],[-40,52],[-34,50],[-29,47],[-29,36],[-54,53],[-22,47],[-15,46],[1,44],[9,41],[27,38],[44,38],[48,26],[52,32],[-58,-49],[35,-46],[52,-47]];trees.forEach(([x,z],i)=>{for(const roadZ of [-55,17,46])if(Math.abs(z-roadZ)<5)z=roadZ+(z>=roadZ?5:-5);for(const roadX of [-62,18,62])if(Math.abs(x-roadX)<5)x=roadX+(x>=roadX?5:-5);tree(x,z,world,.85+(i%4)*.18);});[[-34,10],[-19,10],[-2,11],[10,11],[26,11],[44,11],[-34,23],[-14,23],[6,23],[27,23],[46,23],[12,-20],[24,-15],[24,33]].forEach(([x,z])=>lamp(x,z));
  for(let i=0;i<28;i++){const x=-112+(i%14)*17,z=i<14?-88:83,height=10+(i*7%29);box(9+(i%3)*2,height,11,[0x727985,0x81808b,0x918591][i%3],x,height/2-.2,z);for(let k=0;k<3;k++)box(1,1.3,.08,C.amber,x-2.7+k*2.5,height*.7,z+5.57,world,{emissive:true});}for(let i=0;i<12;i++){const z=-70+i*14,x=i%2?-93:90,h=9+(i%4)*4;box(11,h,12,0x7e7f84,x,h/2-.1,z);}}
function createHawker(){const g=new THREE.Group();g.position.set(-1,0,7);world.add(g);box(17,.25,11,C.cream,0,.4,0,g);for(const x of [-7.7,0,7.7])for(const z of [-4.7,4.7])box(.25,4,.25,C.cream,x,2.3,z,g);box(18,.4,12,C.coral,0,4.48,0,g);box(18.2,.16,12.2,C.pale,0,4.78,0,g);for(let k=0;k<6;k++){box(2.4,1.4,.7,C.wood,-6.3+k*2.5,1.2,-3.8,g);box(2.5,.15,1,C.cream,-6.3+k*2.5,1.98,-3.6,g);box(2.1,.7,.08,k%2?C.amber:C.pale,-6.3+k*2.5,2.9,-4.25,g,{emissive:k%2===1});}for(const x of [-5.5,-1.7,2.2,5.7])for(const z of [-.5,2.6]){cylinder(.85,.13,C.cream,x,1.2,z,g);cylinder(.09,.9,C.metal,x,.7,z,g);for(const b of [-1.1,1.1])cylinder(.28,.6,C.coral,x,.52,z+b,g);}sign('食阁',4,.7,0,4.5,6.13,g,{background:'#bd7557'});textSprite('美兰的摊位',-3,2.65,3.4,world,{kind:'resident',id:'huang',background:'#87563fe8'});projectNodes.set('place:hawker',g);}
function createMarket(){const g=new THREE.Group();g.position.set(37,0,8);world.add(g);box(16,.28,11,C.cream,0,.35,0,g);box(16.8,.35,11.8,C.teal,0,4.4,0,g);for(const a of [-7,0,7])for(const b of [-4.7,4.7])box(.3,4,.3,C.cream,a,2.3,b,g);for(let k=0;k<5;k++){box(2.3,1.1,1.8,C.wood,-5.6+k*2.8,1.1,0,g);for(let m=0;m<5;m++)box(.32,.3,.38,[C.orange,C.leaf,C.amber][(m+k)%3],-6.3+k*2.8+m*.35,1.8,.2,g);}sign('菜市场与日常商店',8,.7,0,4.5,6,g,{background:'#4d7770'});for(let k=0;k<4;k++){box(2.8,3,4.5,C.pale,-5+k*3.35,1.6,-8.5,g);box(3.05,.2,4.7,C.coral,-5+k*3.35,3.2,-8.5,g);}projectNodes.set('place:market',g);}
function createTransit(){const g=new THREE.Group();g.position.set(39,0,-32);world.add(g);box(21,.35,11,C.cream,0,.4,0,g);box(20,4.5,8,0xc8b8a3,0,2.8,0,g);box(22,.4,12,C.teal,0,5.25,0,g);for(const x of [-8,-4,0,4,8])box(2.7,2.3,.06,0x739593,x,3,4.1,g);sign('金文泰站方向 · EW23',10,.8,0,5.4,6.1,g,{background:'#43776d'});path(24,-24,38,-24,3.5);addSideWindows(g,20,8,1,3);projectNodes.set('place:mrt',g);const hub=new THREE.Group();hub.position.set(43,0,56);world.add(hub);box(23,.22,12,0x9a9a87,0,.25,0,hub);for(const x of [-9,-3,3,9]){box(.25,3.7,.25,C.cream,x,2,0,hub);box(4.8,.25,8,C.teal,x,3.95,0,hub);bench(x,1,hub);}sign('巴士转换站方向',9,.7,0,4.15,4.3,hub,{background:'#476b69'});projectNodes.set('place:bus',hub);const clinic=new THREE.Group();clinic.position.set(39,0,-66);world.add(clinic);box(14,6,7,0xc6b8ab,0,3,0,clinic);box(14.7,.3,7.6,C.cream,0,6.3,0,clinic);sign('综合诊所方向',7,.7,0,6.4,3.85,clinic,{background:'#577b76'});addSideWindows(clinic,14,7,2,1.8);for(const x of [-4.5,0,4.5])box(2,1.2,.05,C.amber,x,3.2,3.55,clinic,{emissive:true});}
function createPeople(){const definitions=[
  {id:'chen',shirt:C.coral,path:[[-27,1],[-22,3],[-22,9],[-12,10],[-5,7],[-27,1]],directPath:[[-27,1],[-22,3],[-7,3],[-5,7],[-7,3],[-27,1]],detourPath:[[-27,1],[-22,3],[-22,9],[-12,10],[-5,7],[-12,10],[-27,1]],speed:84},
  {id:'rahman',shirt:0x6f8d95,path:[[-12,-15],[-10,-15],[-12,-15],[-12,-14],[-12,-15]],speed:110},
  {id:'lin',shirt:C.teal,path:[[9,-36],[4,-36],[4,-24],[4,-14],[9,-8],[4,-14],[4,-24],[4,-36],[9,-36]],speed:115,offset:20},
  {id:'kumar',shirt:C.orange,path:[[31,27],[28,24],[24,24],[24,12],[29,9],[31,27]],speed:130,offset:8},
  {id:'students',shirt:C.mint,path:[[-32,-18],[-42,-18],[-42,2],[-11,2],[-5,8],[-11,2],[-42,2],[-42,-18],[-32,-18]],speed:95,offset:27},
  {id:'huang',shirt:C.pale,path:[[-3,3.4],[-3,4.1],[-2,4.1],[-3,3.4]],speed:140},
  {id:'zhang',shirt:0x889ca4,path:[[-26,-1],[-26,2],[-16,2],[-16,-15],[-12,-15],[-16,-15],[-16,2],[-26,2],[-26,-1]],speed:105,offset:40},
  {id:'ali',shirt:0xc3919e,path:[[35,-19],[25,-19],[24,-26],[29,-26],[24,-26],[25,-19],[35,-19]],speed:125,offset:14}
];definitions.forEach(def=>{const node=makePerson({shirt:def.shirt,scale:1.1,id:def.id});world.add(node);target(node,'resident',def.id);const anchor=new THREE.Object3D();anchor.position.y=2.5;node.add(anchor);registerDomLabel(anchor,residentNames[def.id],{kind:'resident',id:def.id,background:'#303b50ec'});const actor={...def,node};actors.push(actor);placeWalkingActor(actor,0);});const child=makePerson({shirt:C.orange,scale:.9,child:true});world.add(child);actors.push({id:'lin-child',node:child,path:definitions[2].path,speed:115,offset:18.5});
  const paths=[[[ -40,2],[-12,2],[-5,7],[-12,2],[-40,2]],[[-31,24],[-8,24],[10,24],[-8,24],[-31,24]],[[25,-20],[26,8],[40,8],[26,8],[25,-20]],[[-42,39],[-33,43],[-40,48],[-48,43],[-42,39]],[[-11,10],[11,10],[12,17],[11,24],[-11,24],[-11,10]],[[27,25],[38,25],[43,40],[25,40],[27,25]],[[-24,-14],[-16,-14],[-16,2],[-24,2],[-24,-14]],[[24,-25],[39,-25],[43,-20],[24,-20],[24,-25]]];
  for(let i=0;i<24;i++){const node=makePerson({shirt:[C.teal,C.coral,C.cream,C.mint,0x9c8ca7,C.orange][i%6],scale:.76+(i%4)*.06,skin:[C.skin,0xc99570,0xaa7859,0xe3b68d][i%4],hair:[0x343239,0xa7a39b,0x574037][i%3],elder:i%6===0,accessory:i%4===0?'bag':null});world.add(node);const actor={node,path:paths[i%paths.length],speed:68+(i%7)*8,offset:i*11.7};walkers.push(actor);placeWalkingActor(actor,0);}}
function makeVehicle(bus=false,color=C.teal){const g=new THREE.Group(),w=bus?6.5:3.1,d=bus?2:1.6;box(w,bus?1.95:.8,d,color,0,bus?1.45:.8,0,g);box(w*.82,bus?.12:.7,d*.88,bus?C.amber:C.navy,0,bus?2.5:1.46,0,g);if(bus)for(let i=0;i<7;i++)for(const z of [-1.02,1.02])box(.6,.68,.04,C.amber,-2.6+i*.8,1.85,z,g,{emissive:true});for(const x of [-w*.33,w*.33])for(const z of [-d*.52,d*.52]){const wheel=cylinder(.36,.2,C.dark,x,.48,z,g);wheel.rotation.x=Math.PI/2;}return g;}
function roundedLoop(radius,reverse=false){
 const points=[];const corners=[[54,38,0,Math.PI/2],[-54,38,Math.PI/2,Math.PI],[-54,-47,Math.PI,Math.PI*1.5],[54,-47,Math.PI*1.5,Math.PI*2]];
 for(const [x,z,a,b]of corners)for(let k=0;k<=10;k++){const angle=a+(b-a)*k/10;points.push([x+Math.cos(angle)*radius,z+Math.sin(angle)*radius]);}
 if(reverse)points.reverse();points.push(points[0]);return points;
}
function createTraffic(){
 const loops=[roundedLoop(6.5),roundedLoop(9.5,true)];
 for(let i=0;i<8;i++){const bus=i<2,node=makeVehicle(bus,[C.teal,C.coral,C.cream,0x9dabb0,0xc8a975][i%5]);world.add(node);traffic.push({node,path:loops[i%2],speed:135,offset:Math.floor(i/2)*135/4+(i%2?9:0),bus,length:bus?6.5:3.1,width:bus?2:1.6,lane:i%2});}
 updateTraffic(0);
}
function vehicleCollision(a,b){
 const delta={x:b.node.position.x-a.node.position.x,z:b.node.position.z-a.node.position.z};
 const axes=[a.node.rotation.y,a.node.rotation.y+Math.PI/2,b.node.rotation.y,b.node.rotation.y+Math.PI/2];
 for(const angle of axes){const ax=Math.cos(angle),az=-Math.sin(angle),separation=Math.abs(delta.x*ax+delta.z*az);
  const project=v=>{const yaw=v.node.rotation.y,forward={x:Math.cos(yaw),z:-Math.sin(yaw)},side={x:Math.sin(yaw),z:Math.cos(yaw)};return Math.abs(forward.x*ax+forward.z*az)*v.length/2+Math.abs(side.x*ax+side.z*az)*v.width/2;};
  if(separation>project(a)+project(b)+.08)return false;
 }return true;
}
function updateTraffic(clock){
 // Equal speed and fixed headways prevent catch-up. Concentric rounded lanes
 // keep opposing vehicles separated through corners, including large time jumps.
 traffic.forEach(v=>{const p=routePoint(v.path,(clock+v.offset)/v.speed);v.node.position.set(p.x,.1,p.z);v.node.rotation.y=p.angle-Math.PI/2;});
 trafficAuditDirty=true;
}
function auditTraffic(){if(!trafficAuditDirty)return;trafficAuditDirty=false;vehicleMinDistance=Infinity;vehicleOverlaps=0;
 for(let i=0;i<traffic.length;i++)for(let j=i+1;j<traffic.length;j++){const a=traffic[i],b=traffic[j];vehicleMinDistance=Math.min(vehicleMinDistance,a.node.position.distanceTo(b.node.position));if(vehicleCollision(a,b))vehicleOverlaps++;}
}

function setFacility(id,index,placement=null,preview=false){const [x,z]=plotPositions[index],g=new THREE.Group();g.userData.facilityId=id;g.userData.plotId=plotIds[index];setGroupPlacement(g,index,placement);(preview?previewGroup:facilityGroup).add(g);if(id==='cover'){const length=plotSizes[index][0];g.scale.x=length/16;for(let a=-7.5;a<8;a+=3)for(const b of [-1,1])box(.13,2.8,.13,C.cream,a,1.6,b,g);box(16.2,.2,2.9,C.teal,0,3.1,0,g);box(16.3,.08,3,C.mint,0,3.25,0,g);sign('有盖走廊',3,.4,0,3.4,1.55,g,{background:'#477b74',kind:'plot',id:index});}
  else if(id==='corner'){bench(-2,0,g);bench(2,0,g,Math.PI);cylinder(.7,.13,C.cream,0,1.15,0,g);cylinder(.08,.9,C.metal,0,.65,0,g);planter(-3.5,0,g);sign('居民角',3,.45,0,2.4,1.8,g,{background:'#926b55',kind:'plot',id:index});}
  else if(id==='aac'){box(5.1,2.8,4.3,C.mint,0,1.6,0,g);box(5.4,.2,4.7,C.teal,0,3.1,0,g);box(1.1,2,.08,C.amber,-.8,1.4,2.2,g,{emissive:true});box(1.8,1,.08,C.amber,1.1,1.9,2.2,g,{emissive:true});sign('乐龄活动中心',5.2,.45,0,3.3,2.4,g,{background:'#477b74',kind:'plot',id:index});}
  else if(id==='cca'){box(7.5,.3,7.5,C.cream,0,.4,0,g);box(7,12,6.8,C.pale,0,6.5,0,g);for(let f=0;f<5;f++){box(7.2,.15,7,C.cream,0,2+f*2.2,0,g);for(const a of [-2.4,0,2.4])box(1.3,1.2,.08,C.amber,a,2.9+f*2.2,3.45,g,{emissive:true});}box(7.5,.3,7.5,C.teal,0,12.7,0,g);sign('社区关怀公寓',6,.5,0,2.05,3.95,g,{background:'#477b74',kind:'plot',id:index});}
  else if(id==='child'){box(7,3.2,6.2,C.pale,0,1.9,0,g);box(7.6,.3,6.8,C.orange,0,3.65,0,g);for(const a of [-2.2,0,2.2])box(1.5,1.4,.08,C.amber,a,2,3.15,g,{emissive:true});for(let a=0;a<4;a++)box(.5,.5,.5,[C.teal,C.coral,C.amber,C.mint][a],-2.3+a*1.4,.6,4,g);sign('托育与儿童空间',6,.45,0,3.9,3.6,g,{background:'#9b7651',kind:'plot',id:index});}
  else if(id==='ramp'){for(let a=0;a<12;a++)box(.45,.04+a*.032,3,C.paving,-2.7+a*.48,.3+a*.016,0,g);for(const b of [-1.55,1.55]){for(const a of [-2.5,0,2.5])box(.07,.9,.07,C.metal,a,.9,b,g);const rail=box(5.7,.07,.07,C.teal,0,1.35,b,g);rail.rotation.z=.07;}for(const a of [-2.7,2.7]){box(.12,2.3,.12,C.navy,a,1.4,2,g);box(.4,.8,.32,C.teal,a,2.2,2,g);box(.15,.2,.04,C.mint,a,2.35,2.18,g,{emissive:true});}textSprite('无障碍接驳',0,2.7,1,g,{kind:'plot',id:index,background:'#4f786de8'});}if(['aac','cca','child'].includes(id)){const dims=id==='aac'?[5.1,4.3,1,1.9]:id==='cca'?[7,6.8,5,2.9]:[7,6.2,1,2];addSideWindows(g,...dims);}if(!preview)target(g,'plot',index,facilityHits);else g.traverse(n=>{if(n.isMesh){n.material=n.material.clone();n.material.transparent=true;n.material.opacity=.3;n.material.depthWrite=false;n.castShadow=false;}});return g;}
function construction(index,p){
 const [w,d]=plotSizes[index],g=new THREE.Group();setGroupPlacement(g,index,p.placement);facilityGroup.add(g);box(w,.15,d,0xaf987b,0,.31,0,g);
 const height=p.cardId==='cca'?6:3.7;for(const a of [-w*.47,w*.47])for(const b of [-d*.45,d*.45])box(.1,height,.1,C.metal,a,height/2+.4,b,g);
 for(const y of [1,2.4,height])for(const b of [-d*.45,d*.45])box(w,.08,.08,C.metal,0,y,b,g);
 for(let a=0;a<Math.max(4,w/1.1);a++)box(.7,.75,.18,a%2?C.amber:C.navy,-w*.45+a*.9,.8,d*.48,g);
 box(.15,height+3,.15,C.orange,-w*.35,(height+3)/2,0,g);const crane=box(w+3,.15,.15,C.orange,0,height+3,0,g);
 for(let i=0;i<3;i++){const worker=makePerson({shirt:C.orange,scale:.85,skin:i===1?0xae7d5e:C.skin});worker.position.set((i-1)*Math.min(w*.24,2),.25,-d*.2);g.add(worker);box(.49,.12,.43,C.amber,0,2.05,0,worker);box(.5,.06,.5,C.amber,0,2,0,worker);box(.065,.65,.065,C.metal,.37,1.25,.17,worker);workerActors.push({node:worker,index,offset:i*1.7});}
 textSprite(()=>t('施工中')+' '+Math.round((state?.plots?.[index]?.progress||0)*100)+'%',0,height+1.5,d/2,g,{kind:'plot',id:index,background:'#6e5945ee'});
 domLabels[domLabels.length-1].constructionIndex=index;
 const key=index+':'+p.cardId;if(!constructionStarted.has(key))constructionStarted.set(key,Number(state.simTime)||0);g.userData.born=constructionStarted.get(key);g.userData.crane=crane;constructionModels.push(g);target(g,'plot',index,facilityHits);return g;
}

function createPlotAnchors(){plotIds.forEach((id,index)=>{
 const [x,z]=plotPositions[index],[w,d]=plotSizes[index],anchor=new THREE.Object3D();anchor.position.set(x,plotDefinitions[index]?.kind==='void'?1.2:.6,z);world.add(anchor);projectNodes.set('plot:'+index,anchor);projectNodes.set('plot:'+id,anchor);
 const hit=box(w,.055,d,C.amber,x,.25,z,world,{transparent:true,opacity:0});target(hit,'plot',index);
 // Natural spaces are outlined only while selecting, never tiled into a farm.
 const selection=new THREE.Group();selection.position.set(x,.29,z);world.add(selection);
 for(const side of [-1,1]){box(w,.045,.07,C.amber,0,0,side*d/2,selection,{transparent:true,opacity:.8});box(.07,.045,d,C.amber,side*w/2,0,0,selection,{transparent:true,opacity:.8});}
 selection.visible=false;selectionTiles.push(selection);
 const label=registerDomLabel(anchor,plotLocked(index)?'既有用途 · 不能建设':plotNames[index],{kind:'plot',id:index,background:plotLocked(index)?'#5a5c63e8':'#3c584fe8',offsetY:16});plotLabels.push(label);
});}

function syncFacilities(){
 if(!state)return;for(const [index,id]of plotIds.entries()){const vacant=projectNodes.get('space:'+id);if(vacant)vacant.visible=!state.plots[index];}const next=JSON.stringify(state.plots.map(p=>p?{cardId:p.cardId,status:p.status,placement:p.placement}:null));
 if(next!==signature){signature=next;facilityGroup.clear();facilityHits.length=0;workerActors.length=0;constructionModels.length=0;state.plots.forEach((p,index)=>{if(plotLocked(index)||!p)return;if(p.status==='building')construction(index,p);else setFacility(p.cardId,index,p.placement);});}
 domLabels.forEach(label=>{if(label.constructionIndex!=null)updateLabelText(label);});
 selectionTiles.forEach((tile,index)=>{tile.visible=!plotLocked(index)&&(options.selectedPlot===plotIds[index]||!!options.selected&&!state.plots[index]&&(options.validPlots||[]).includes(plotIds[index]));});
 plotLabels.forEach((label,index)=>{const p=state.plots[index],id=plotIds[index],wanted=options.selected?((options.validPlots||[]).includes(id)||options.selectedPlot===id):options.showLand;label.anchor.visible=(!p||p.status==='building')&&!!wanted;});
}

function syncStory(){
 const done=state?.flags?.completed||{},help=state?.flags?.noiseResolved||state?.flags?.neighbourHelp,key=JSON.stringify([done.cover,done.corner,done.aac,done.cca,done.child,done.nrp,done.ease,done.visits,done.event,help]);
 if(key===storySignature)return;storySignature=key;storyGroup.clear();socialActors.length=0;
 if(help||done.event){for(let i=0;i<4;i++){const node=makePerson({id:['students','chen','ali','huang'][i],shirt:[C.mint,C.coral,C.teal,C.cream][i],scale:1});node.position.set(-7+(i%2)*2.2,.3,9+Math.floor(i/2)*2);node.rotation.y=i%2?-Math.PI/2:Math.PI/2;storyGroup.add(node);socialActors.push({node,kind:'gathering',offset:i*1.3,x:node.position.x,z:node.position.z});}textSprite('邻里互助',-5,3.1,10,storyGroup,{background:'#4f786de8'});}
 if(done.visits||done.aac){for(let i=0;i<2;i++){const node=makePerson({shirt:i?C.coral:C.mint,id:i?'chen':'zhang',scale:.95});node.position.set(-24+i*1.8,.25,2.4);storyGroup.add(node);socialActors.push({node,kind:'befriending',offset:i*1.5,x:node.position.x,z:node.position.z});}}
 if(done.nrp){[[-20,5],[-10,5],[3,3],[26,25]].forEach(([x,z])=>planter(x,z,storyGroup,.9));for(const [x,z]of [[-22,10],[26,25]]){bench(x,z,storyGroup);lamp(x+2,z,storyGroup);}for(const z of [12.5,21.5])storyGroup.add(path(-23,z,-9,z,2.6,0xdec6a4));}
 if(done.ease){textSprite('居家安全改善',-29,3.2,-1.3,storyGroup,{background:'#4f786de8'});for(const x of [-29.7,-28.5])box(.06,1.1,.06,C.teal,x,.9,-1.18,storyGroup);box(1.7,.06,.06,C.teal,-29.1,1.45,-1.18,storyGroup);}
 if(done.cover)textSprite('熟悉的路又通了',-17,3.8,3,storyGroup,{background:'#4f786de8'});
}

function anchorPosition(anchor,id){if(anchor&&typeof anchor==='object'&&Number.isFinite(anchor.x)&&Number.isFinite(anchor.z))return new THREE.Vector3(anchor.x,Number(anchor.y)||2,anchor.z);const key=typeof anchor==='string'?anchor:(issueAnchors[id]||'room'),index=plotIds.indexOf(key);if(index>=0)return new THREE.Vector3(plotPositions[index][0],plotLocked(index)?7:3.6,plotPositions[index][1]);const actor=actors.find(a=>a.id===key);if(actor){const p=actor.node.position.clone();p.y+=3;return p;}const node=projectNodes.get('place:'+key);if(node){const p=new THREE.Vector3();node.getWorldPosition(p);p.y+=4;return p;}return new THREE.Vector3(-11,4,-11);}
function syncIssues(){const issues=(options.issues||[]).filter(i=>(!i.status||i.status==='open')&&i.channel!=='mail').slice(0,3),wanted=new Set(issues.map(i=>String(i.id)));for(const [id,entry]of issueLabels)if(!wanted.has(id)){world.remove(entry.anchor);entry.label.node.remove();const index=domLabels.indexOf(entry.label);if(index>=0)domLabels.splice(index,1);issueLabels.delete(id);}issues.forEach((issue,index)=>{let entry=issueLabels.get(String(issue.id));if(!entry){const anchor=new THREE.Object3D();world.add(anchor);const label=registerDomLabel(anchor,issue.title,{kind:'issue',id:issue.id,background:issue.stage>0?'#a75d48f5':'#5c4d39f5',border:'#ffd99b',size:13,offsetY:-24-index*6,priority:300});entry={anchor,label,issue};issueLabels.set(String(issue.id),entry);}entry.issue=issue;entry.label.value=()=> '◉ '+t(issue.title)+(issue.stage>0?' · '+t('需要关注'):'');entry.anchor.position.copy(anchorPosition(issue.anchor,issue.id));entry.label.node.style.background=issue.stage>0?'#a75d48f5':'#5c4d39f5';entry.label.node.style.outline=focusedIssue===issue.id?'2px solid #ffe2a1':'none';updateLabelText(entry.label);});}
function celebrateAt(position){if(reducedMotion?.matches)return;const count=110,geometry=new THREE.BufferGeometry(),positions=new Float32Array(count*3),colors=new Float32Array(count*3),velocities=[];for(let i=0;i<count;i++){const a=i*2.39996,r=1.4+(i%9)*.21;velocities.push(new THREE.Vector3(Math.cos(a)*r,1.4+(i%13)*.24,Math.sin(a)*r));new THREE.Color([0xffd17b,0xf4a58d,0xa0dfc1,0xffefc6][i%4]).toArray(colors,i*3);}geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));const material=new THREE.PointsMaterial({size:3,sizeAttenuation:false,vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}),points=new THREE.Points(geometry,material);points.position.copy(position);scene.add(points);fireworks.push({points,velocities,born:animationClock});fireworksLaunched++;}
function syncCelebrations(){const next=state.plots.map(p=>p&&p.status!=='building'?p.cardId:null);if(observedState===state)next.forEach((id,index)=>{if(id&&id!==observedPlots[index]){const [x,z]=plotPositions[index];celebrateAt(new THREE.Vector3(x,index===3?14:6,z));}});observedState=state;observedPlots=next;}
function animateFireworks(clock){for(let i=fireworks.length-1;i>=0;i--){const effect=fireworks[i],age=clock-effect.born;if(age>1.85||age<0){scene.remove(effect.points);effect.points.geometry.dispose();effect.points.material.dispose();fireworks.splice(i,1);continue;}const attribute=effect.points.geometry.attributes.position;effect.velocities.forEach((v,j)=>attribute.setXYZ(j,v.x*age,v.y*age-age*age*2,v.z*age));attribute.needsUpdate=true;effect.points.material.opacity=Math.max(0,1-age/1.85);}}

function clearPreview(){
 invalidate();
 previewGroup.traverse(n=>{if(n.isMesh&&n.material?.userData?.placementPreview)n.material.dispose();});previewGroup.clear();previewSelection=null;
 for(let i=domLabels.length-1;i>=0;i--){const label=domLabels[i];if(label.preview){label.node.remove();domLabels.splice(i,1);}}
}
function previewPlacement(plotId,cardId,placement={}){
 clearPreview();const index=getPlotIndex(plotId);if(index<0||plotLocked(index))return false;
 const before=domLabels.length,g=setFacility(cardId,index,placement,true);g.traverse(n=>{if(n.isMesh){n.material.userData.placementPreview=true;}});
 for(let i=before;i<domLabels.length;i++){domLabels[i].preview=true;domLabels[i].node.style.visibility='hidden';}
 previewSelection={plotId:plotIds[index],cardId,placement:{...placement},node:g};return true;
}
function cue(event={}){
 invalidate();
 const card=event.cardId||'',index=event.plotId?getPlotIndex(event.plotId):state?.plots?.findIndex(p=>p?.cardId===card)??-1;
 const position=index>=0?new THREE.Vector3(plotPositions[index][0],.35,plotPositions[index][1]):anchorPosition(issueAnchors[event.issueId],event.issueId);
 const g=new THREE.Group();g.position.copy(position);g.position.y=.4;world.add(g);const size=index>=0?Math.max(...plotSizes[index])*.6:3;
 for(const sign of [-1,1]){box(size*2,.08,.12,event.type==='worsen'?C.coral:C.amber,0,.02,sign*size,g,{transparent:true,opacity:.8});box(.12,.08,size*2,event.type==='worsen'?C.coral:C.amber,sign*size,.02,0,g,{transparent:true,opacity:.8});}
 if(event.type==='start'&&index>=0)constructionStarted.set(index+':'+card,Number(options.simTime)||0);
 const label=textSprite(()=>event.type==='worsen'?bilingual('居民正在担心','A concern is growing'):event.type==='complete'?bilingual('安排已完成','Action completed'):event.type==='decision'?bilingual('居民有了回应','A neighbour responds'):index>=0?bilingual('工程开始了','Work has begun'):bilingual('行动已安排','Action arranged'),0,4.5,0,g,{background:event.type==='worsen'?'#a75d48ed':'#6e5945ed'});
 cueEffects.push({node:g,born:performance.now()/1000,label,event,size});
 if((event.type==='decision'||event.type==='complete')&&index<0){
  const ids=event.issueId==='noise'||card.includes('mediate')?['students','chen','ali']:card==='event'?['huang','students','chen']:['zhang','rahman'];
  ids.forEach((id,i)=>{const n=makePerson({id,shirt:[C.teal,C.coral,C.cream][i%3],scale:1.15});n.position.set((i-1)*1.5,0,0);g.add(n);});
 }
 return true;
}
// A presentation is deliberately separate from simulation state: replays and
// skipped animations never build a second facility or apply policy effects.
const policySites={cover:'route-west',ramp:'crossing-b',corner:'void-b',aac:'room-b',child:'garden',appeal:'room',ease:'void',nrp:'garden',visits:'room-b',event:'void-b','action-mediate':'void-b'};
function clearPolicyPresentation({restoreCamera=true}={}){
 const p=policyPresentation;if(!p)return false;policyPresentation=null;
 if(p.model){p.model.scale.copy(p.originalScale);p.model.position.copy(p.originalPosition);p.parts.forEach(part=>part.node.visible=part.visible);}
 p.cutaway.forEach(({node,visible})=>{node.visible=visible;});
 p.materials.forEach(({node,original,highlight})=>{node.material=original;(Array.isArray(highlight)?highlight:[highlight]).forEach(m=>m.dispose());});
 p.group.removeFromParent();p.group.traverse(node=>{if(node.isMesh){node.geometry.dispose();(Array.isArray(node.material)?node.material:[node.material]).forEach(m=>m.dispose());}});
 p.label.node.remove();const labelIndex=domLabels.indexOf(p.label);if(labelIndex>=0)domLabels.splice(labelIndex,1);projectNodes.delete('policy:active');
 if(restoreCamera){focusTarget=p.cameraBefore.focusTarget;focusedIssue=p.cameraBefore.focusedIssue;zoomLevel=p.cameraBefore.zoomLevel;options.view=p.cameraBefore.view;cameraGoals();}
 invalidate();return true;
}
function presentPolicy(policy={}){
 if(!ready||!state)return {ok:false};
 clearPolicyPresentation();
 const visual=policy.visual||policy.assetId||'',isBuilding=(policy.kind==='build'||policy.policyId==='capital')&&['cover','ramp','corner','aac','child','cca'].includes(visual);
 let plotId=policy.plotId||policySites[visual],index=getPlotIndex(plotId),model=null;
 // Non-construction social decisions are shown at the neighbour who requested
 // them; physical improvements highlight the actual retained map facility.
 const physical=['cover','ramp','corner','aac','child','ease','nrp','appeal'].includes(visual);
 const resident=actors.find(a=>a.id===policy.residentId);
 if(!isBuilding&&resident){plotId=null;index=-1;}
 if(index<0&&isBuilding){plotId=policySites[policy.assetId]||'room-b';index=getPlotIndex(plotId);}
 if(index>=0)model=facilityGroup.children.find(n=>n.userData.plotId===plotIds[index]&&n.userData.facilityId===(policy.assetId||visual))||facilityGroup.children.find(n=>n.userData.plotId===plotIds[index]);
 let position=index>=0?new THREE.Vector3(plotPositions[index][0],.36,plotPositions[index][1]):resident?resident.node.position.clone():anchorPosition('room-b');position.y=.36;
 if(!model&&visual==='ease')position.set(-29,.36,-1.3);
 if(!model&&visual==='nrp')position.set(-17,.36,17);
 const group=new THREE.Group();group.position.copy(position);world.add(group);projectNodes.set('policy:active',group);
 const [width,depth]=index>=0?plotSizes[index]:[6,6],color=0xf3dca0;
 const effectMesh=(geometry,opacity=.8)=>{const material=new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,depthTest:false,toneMapped:false,side:THREE.DoubleSide}),node=new THREE.Mesh(geometry,material);node.renderOrder=30;group.add(node);return node;};
 const ring=effectMesh(new THREE.RingGeometry(.94,1,64),.5);ring.rotation.x=-Math.PI/2;ring.scale.set(Math.max(3,width*.65),Math.max(3,depth*.8),1);ring.position.y=.08;
 const halo=effectMesh(new THREE.CircleGeometry(1,48),.06);halo.rotation.x=-Math.PI/2;halo.scale.set(Math.max(3,width*.65),Math.max(3,depth*.8),1);halo.position.y=.05;
 const beacons=[];
 const starShape=new THREE.Shape();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,r=i%2?.28:.65,x=Math.cos(a)*r,y=Math.sin(a)*r;if(i===0)starShape.moveTo(x,y);else starShape.lineTo(x,y);}starShape.closePath();
 const markers=[];
 const scaffold=[];if(isBuilding){for(const side of [-1,1]){const beam=effectMesh(new THREE.BoxGeometry(Math.max(4,width),.1,.12),.65);beam.position.set(0,2.8,side*Math.max(2,depth*.5));scaffold.push(beam);}for(const end of [-1,1]){const beam=effectMesh(new THREE.BoxGeometry(.12,.1,Math.max(4,depth)),.65);beam.position.set(end*Math.max(2,width*.5),2.8,0);scaffold.push(beam);}const base=effectMesh(new THREE.BoxGeometry(Math.max(4,width),.16,Math.max(4,depth)),.28);base.position.y=.1;scaffold.push(base);}
 const parts=model?model.children.filter(node=>node.isMesh).map(node=>({node,visible:node.visible,y:node.position.y})).sort((a,b)=>a.y-b.y):[];
 const labelAnchor=new THREE.Object3D();labelAnchor.position.y=Math.max(5,model?5.7:4.5);group.add(labelAnchor);
 const label=registerDomLabel(labelAnchor,policy.title||bilingual('政策已落实','Policy delivered'),{background:'#203b4ff2',color:'#fff1cb',border:'#edcd8b99',size:13,priority:350});
 const highlighted=model||resident?.node,materials=[];highlighted?.traverse(node=>{if(!node.isMesh||!node.material)return;const original=node.material,highlight=(Array.isArray(original)?original:[original]).map(material=>{const copy=material.clone();if(copy.emissive){copy.emissive.setHex(color);copy.emissiveIntensity=.12;}return copy;});node.material=Array.isArray(original)?highlight:highlight[0];materials.push({node,original,highlight});});
 const cameraBefore={focusTarget:focusTarget?.clone()||null,focusedIssue,zoomLevel,view:options.view};
 policyPresentation={group,ring,halo,ringScale:ring.scale.clone(),beacons,markers,label,materials,cutaway:[],model:isBuilding?model:null,originalScale:model?.scale.clone(),originalPosition:model?.position.clone(),born:performance.now()/1000,waiting:!reducedMotion?.matches,waitStart:performance.now()/1000,animSec:reducedMotion?.matches?.18:isBuilding?3:2,plotId:index>=0?plotIds[index]:null,visual,residentId:policy.residentId||null,isBuilding,cameraBefore,parts,scaffold,title:policy.title||bilingual('政策落实','Policy delivery'),durationMs:isBuilding?3800:2800,stage:null};
 const right=new THREE.Vector3(Math.cos(angle),0,-Math.sin(angle)),upOnGround=new THREE.Vector3(-Math.sin(angle),0,-Math.cos(angle));
 // Aim into the open corridor between the left execution list and right board.
 // A negative right offset places the policy just right of viewport centre.
 focusTarget=position.clone().addScaledVector(right,-3).addScaledVector(upOnGround,-4);focusTarget.y=1.5;focusedIssue='policy';zoomLevel=.95;options.view='neighborhood';cameraGoals();
 // Void decks are under real upper storeys. Temporarily lift the obstructing
 // floor geometry out of view, so the feedback points to the ground-floor
 // facility rather than looking as if it was built on a roof.
 scene.updateMatrixWorld(true);
 const sightEnd=position.clone().add(new THREE.Vector3(0,1,0)),sightDirection=sightEnd.clone().sub(cameraPosition).normalize(),sightRay=new THREE.Ray(cameraPosition.clone(),sightDirection),sightDistance=cameraPosition.distanceTo(sightEnd),hitPoint=new THREE.Vector3();
 for(const [key,building]of projectNodes){if(!key.startsWith('building:'))continue;const bounds=new THREE.Box3().setFromObject(building);if(!sightRay.intersectBox(bounds,hitPoint)||cameraPosition.distanceTo(hitPoint)>sightDistance+2)continue;building.children.forEach(node=>{if(node.isMesh&&node.position.y>=2.5){policyPresentation.cutaway.push({node,visible:node.visible});node.visible=false;}});}
 if(policyPresentation.cutaway.length){label.value+=bilingual(' · 底层空间',' · Ground floor');updateLabelText(label);}
 if(reducedMotion?.matches){camera.position.copy(cameraPosition);camera.userData.look?.copy(cameraTarget);}
 animatePolicyPresentation(performance.now()/1000);invalidate();
 return {ok:true,plotId:policyPresentation.plotId,anchor:{x:position.x,z:position.z},building:isBuilding,durationMs:reducedMotion?.matches?180:policyPresentation.durationMs};
}
function animatePolicyPresentation(wallTime){
 const p=policyPresentation;if(!p)return;const motion=!reducedMotion?.matches;
 // Hold at the start until the camera has reached the site, so steps never overlap.
 if(p.waiting&&(camera.position.distanceTo(cameraPosition)<1.2||wallTime-p.waitStart>1.6)){p.waiting=false;p.born=wallTime;}
 const age=p.waiting?0:Math.max(0,wallTime-p.born),end=p.animSec;
 const buildProgress=motion?THREE.MathUtils.clamp((age-.7)/1.6,0,1):1;
 if(p.model){p.model.scale.y=p.originalScale.y*(motion?Math.min(1,.03+age*1.2):1);p.model.position.y=p.originalPosition.y;p.parts.forEach((part,i)=>{part.node.visible=part.visible&&(!motion||buildProgress>=(i+1)/Math.max(1,p.parts.length));});}
 p.scaffold.forEach(node=>node.visible=motion&&age<2.35);
 const stage=p.isBuilding?(age<.4?bilingual('场地准备','Preparing'):age<.7?bilingual('搭设施工','Setting up'):age<2.3?bilingual('结构施工','Building'):bilingual('设施落成','Completed')):bilingual('协调完成','Arranged');
 if(p.stage!==stage){p.stage=stage;p.label.value=p.title+' · '+stage+(p.cutaway.length?bilingual(' · 底层空间',' · Ground floor'):'');updateLabelText(p.label);}
 // The ring draws itself in, rests, and fades as the step ends.
 const grow=motion?Math.min(1,.7+age/.35*.3):1,fade=motion?THREE.MathUtils.clamp((end+.4-age)/.4,0,1):1;
 p.ring.scale.copy(p.ringScale).multiplyScalar(grow);p.ring.material.opacity=.5*fade;p.halo.material.opacity=.06*fade;
 p.materials.forEach(({highlight})=>highlight.forEach(material=>{if(material.emissive)material.emissiveIntensity=.12*fade;}));
 if(age>end+2)clearPolicyPresentation();
}
// The app waits for this before starting the next step.
function policyDone(){const p=policyPresentation;if(!p)return true;if(p.waiting)return false;return performance.now()/1000-p.born>=p.animSec;}
function animateConstruction(clock){
 constructionModels.forEach(g=>{const age=Math.max(0,clock-g.userData.born);g.scale.y=reducedMotion?.matches?1:Math.min(1,.16+age/1.2);if(g.userData.crane)g.userData.crane.rotation.y=Math.sin(clock*.3)*.055;});
 workerActors.forEach(worker=>{const phase=clock*3.4+worker.offset;worker.node.userData.limbs?.arms.forEach((arm,i)=>{arm.rotation.x=Math.sin(phase+i*.6)*.7-.4;});worker.node.rotation.y=Math.sin(clock*.4+worker.offset)*.3;});
 socialActors.forEach(actor=>{const phase=clock*2+actor.offset;actor.node.userData.limbs?.arms.forEach((arm,i)=>{arm.rotation.x=Math.sin(phase+i)*.22;arm.rotation.z=i===0?-.25:0;});if(actor.kind==='befriending'){actor.node.position.x=actor.x+Math.sin(clock*.15+actor.offset)*.7;actor.node.rotation.y=actor.offset?Math.PI/2:-Math.PI/2;}else actor.node.position.y=.3+Math.max(0,Math.sin(phase))*.04;});
}
function animateCues(wallTime){
 for(let i=cueEffects.length-1;i>=0;i--){const c=cueEffects[i],age=wallTime-c.born;if(age>5){world.remove(c.node);cueEffects.splice(i,1);continue;}const pulse=reducedMotion?.matches?1:1+Math.sin(age*4)*.025;c.node.scale.setScalar(pulse);c.node.traverse(n=>{if(n.userData?.limbs)n.userData.limbs.arms.forEach((arm,j)=>arm.rotation.x=Math.sin(age*3+j)*.3);});}
}

function cameraGoals(){const p=focusTarget||new THREE.Vector3(0,8,0);cameraTarget.copy(p);const distance=options.view==='overview'?115:92;cameraPosition.set(p.x+Math.sin(angle)*distance,p.y+(focusedIssue?56:65),p.z+Math.cos(angle)*distance);const aspect=(container.clientWidth||1200)/(container.clientHeight||800),h=(focusedIssue?20:options.view==='overview'?44:31)*(aspect<.8?1.22:1);camera.left=-h*aspect;camera.right=h*aspect;camera.top=h;camera.bottom=-h;camera.zoom=zoomLevel;camera.updateProjectionMatrix();invalidate();}
function resize(){if(!renderer)return;const w=Math.max(1,container.clientWidth),h=Math.max(1,container.clientHeight);renderer.setSize(w,h,false);renderer.domElement.style.width='100%';renderer.domElement.style.height='100%';cameraGoals();}
function focusIssue(id){const issue=(options.issues||[]).find(i=>i.id===id);if(!issue)return false;focusedIssue=id;focusTarget=anchorPosition(issue.anchor,id);zoomLevel=1;cameraGoals();syncIssues();return true;}
function sync(s,opts={}){const now=performance.now(),oldLanguage=options.language,oldPaused=options.paused,oldSuspended=options.suspended,oldTime=options.simTime,oldState=state;if(s&&s!==state){clearPolicyPresentation();constructionStarted.clear();signature='';storySignature='';clearPreview();for(const effect of cueEffects)world.remove(effect.node);cueEffects.length=0;}state=s||state;if(!state)return;const nextTime=Number(opts.simTime??s?.simTime??options.simTime)||0;if(lastSync&&nextTime>previousSim)simRate=THREE.MathUtils.clamp((nextTime-previousSim)/Math.max(.05,(now-lastSync)/1000),.25,4);lastSync=now;previousSim=nextTime;animationClock=nextTime;options={...options,...opts,simTime:nextTime};const visual=JSON.stringify([state.plots,state.groups,state.flags,options.selected,options.selectedPlot,options.validPlots,options.showLand,options.issues,options.language,options.view]);const changed=visual!==sync.visualSignature;sync.visualSignature=visual;if(changed||oldState!==state){syncFacilities();syncStory();syncIssues();syncCelebrations();simulationDirty=true;}if(opts.focusIssue&&opts.focusIssue!==focusedIssue)focusIssue(opts.focusIssue);if(oldLanguage!==options.language)domLabels.forEach(updateLabelText);if(changed||oldState!==state||oldTime!==nextTime||oldPaused!==options.paused||oldSuspended!==options.suspended)invalidate();}
function showOverview(){options.view='overview';focusTarget=null;focusedIssue=null;zoomLevel=1;cameraGoals();}
function showNeighborhood(){options.view='neighborhood';focusTarget=null;focusedIssue=null;zoomLevel=1;cameraGoals();}
function rotate(direction=1){angle+=Number(direction)*Math.PI/4;cameraGoals();}
function zoom(delta){zoomLevel=THREE.MathUtils.clamp(zoomLevel+Number(delta),.6,2.4);cameraGoals();}
function reset(){angle=-Math.PI*.22;zoomLevel=1;focusTarget=null;focusedIssue=null;options.view='neighborhood';cameraGoals();}
function project(kind,id){let node=kind==='resident'?actors.find(a=>a.id===id)?.node:projectNodes.get(kind+':'+id);if(!node&&kind==='issue')node=issueLabels.get(String(id))?.anchor;if(!node||!renderer)return null;scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);const v=new THREE.Vector3();node.getWorldPosition(v);if(kind==='resident')v.y+=2.4;v.project(camera);const r=renderer.domElement.getBoundingClientRect();return{x:r.left+(v.x+1)*.5*r.width,y:r.top+(1-v.y)*.5*r.height,visible:v.z>=-1&&v.z<=1};}
function raycast(event){const r=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);return ray.intersectObjects([...facilityHits,...staticHits],false).find(hit=>hit.object.visible&&hit.object.userData.kind)?.object||null;}
function updateHover(object){if(hoverTarget===object)return;hoverTarget=object;container.style.cursor=object?'pointer':'grab';const hit=object?.userData,message=!hit?'':hit.kind==='resident'?t('认识')+' '+t(residentNames[hit.id]):hit.kind==='plot'?t(plotNames[hit.id]):t('点击认识这里的居民');window.DownstairsUI?.sceneHover?.(message);}
function activate(object){if(!object)return;const{kind,id}=object.userData,related=(options.issues||[]).find(issue=>issue.anchor===(kind==='plot'?plotIds[id]:id));if(related&&kind!=='resident'){callAction('issue',related.id);return;}callAction(kind,id);}
function diagnostics(){auditTraffic();return{renderStats:{...renderStats,loopRunning,drawCalls:renderer?.info?.render?.calls??null,triangles:renderer?.info?.render?.triangles??null,geometries:renderer?.info?.memory?.geometries??geometryCache.size,materials:materialCache.size},ready,view:options.view,placed:true,plots:state?.plots?.filter(Boolean).length||0,plotIds:plotIds.slice(),residentHotspots:Object.keys(residentNames),oldHDBBlocks:8,newTowers:2,pedestrians:actors.length+walkers.length,vehicles:traffic.length,issues:issueLabels.size,paused:!!options.paused,simTime:animationClock,focusedIssue,width:renderer?.domElement.width,height:renderer?.domElement.height,domLabels:domLabels.length,fireworksActive:fireworks.length,fireworksLaunched,constructionWorkers:workerActors.length,socialParticipants:socialActors.length,vehicleMinDistance:Number.isFinite(vehicleMinDistance)?Math.round(vehicleMinDistance*100)/100:null,vehicleOverlaps,windowFaces:4,placementPreview:previewSelection?{plotId:previewSelection.plotId,cardId:previewSelection.cardId,placement:previewSelection.placement}:null,cueEffects:cueEffects.length,policyPresentation:policyPresentation?{visual:policyPresentation.visual,plotId:policyPresentation.plotId,residentId:policyPresentation.residentId,building:policyPresentation.isBuilding,stage:policyPresentation.stage,durationMs:policyPresentation.durationMs,stars:policyPresentation.isBuilding?0:policyPresentation.markers.length}:null};}

function animate(now){
 if(document.hidden){renderStats.hiddenSkips++;sleepRenderer();return;}
 const moving=!options.paused&&!options.suspended&&!reducedMotion?.matches;
 const look=camera.userData.look||(camera.userData.look=new THREE.Vector3().copy(cameraTarget));
 const cameraMoving=camera.position.distanceToSquared(cameraPosition)>.000004||look.distanceToSquared(cameraTarget)>.000004;
 const effects=!options.suspended&&(cueEffects.length>0||!!policyPresentation&&!reducedMotion?.matches);
 if(!renderDirty&&!moving&&!cameraMoving&&!effects){renderStats.idleSkips++;sleepRenderer();return;}
 if(now-lastFrame<32)return;lastFrame=now;
 animationClock=Number(options.simTime)||0;if(moving)animationClock+=Math.min(1,(now-lastSync)/1000)*simRate;
 if(options.suspended||!cameraMoving){camera.position.copy(cameraPosition);look.copy(cameraTarget);}else{const cameraEase=policyPresentation ? .22 : .1;camera.position.lerp(cameraPosition,cameraEase);look.lerp(cameraTarget,cameraEase);}camera.lookAt(look);
 if(simulationDirty||lastAnimatedClock!==animationClock){renderStats.simulationUpdates++;actors.forEach(actor=>placeWalkingActor(actor,animationClock));walkers.forEach(actor=>placeWalkingActor(actor,animationClock));updateTraffic(animationClock);clouds.forEach(cloud=>cloud.node.position.x=cloud.x+Math.sin((animationClock+cloud.phase)*.007)*8);for(const entry of issueLabels.values())entry.anchor.position.copy(anchorPosition(entry.issue.anchor,entry.issue.id));animateConstruction(animationClock);animateFireworks(animationClock);lastAnimatedClock=animationClock;simulationDirty=false;}
 animateCues(now/1000);if(!options.suspended)animatePolicyPresentation(now/1000);updateDomLabels();renderer.render(scene,camera);renderStats.renderedFrames++;renderDirty=false;
 const settling=camera.position.distanceToSquared(cameraPosition)>.000004||look.distanceToSquared(cameraTarget)>.000004;
 if(!moving&&!settling&&((!cueEffects.length&&(!policyPresentation||reducedMotion?.matches))||options.suspended))sleepRenderer();
}


function initialize(){container=document.getElementById('world-scene');if(!container)return;try{labelLayer=document.createElement('div');labelLayer.className='scene-label-layer';Object.assign(labelLayer.style,{position:'absolute',inset:'0',zIndex:'2',pointerEvents:'none',overflow:'hidden',imageRendering:'auto'});container.append(labelLayer);camera=new THREE.OrthographicCamera(-50,50,35,-35,.1,500);renderer=new THREE.WebGLRenderer({antialias:false,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(1.5,window.devicePixelRatio||1));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.domElement.id='hdb-world-canvas';renderer.domElement.setAttribute('aria-label',t('金文泰互动街区：拖动旋转，滚轮缩放，点击居民、地块或地图上的来信。'));renderer.domElement.style.touchAction='none';renderer.domElement.style.imageRendering='pixelated';container.prepend(renderer.domElement);scene.add(new THREE.HemisphereLight(0xd9bad3,0x3a4763,2.25));const sun=new THREE.DirectionalLight(0xffbd7d,3.2);sun.position.set(-35,100,65);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-85,right:85,top:85,bottom:-85,far:240});sun.shadow.normalBias=.08;scene.add(sun);createSky();createGround();createPlotAnchors();createPeople();createTraffic();freezeStaticTransforms();resizeObserver=new ResizeObserver(resize);resizeObserver.observe(container);resize();camera.position.copy(cameraPosition);camera.userData.look=new THREE.Vector3().copy(cameraTarget);camera.lookAt(cameraTarget);
  renderer.domElement.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,angle,moved:false};renderer.domElement.setPointerCapture(e.pointerId);});renderer.domElement.addEventListener('pointermove',e=>{if(drag){if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>6)drag.moved=true;if(drag.moved){angle=drag.angle-(e.clientX-drag.x)*.007;cameraGoals();updateHover(null);container.style.cursor='grabbing';}}else updateHover(raycast(e));});renderer.domElement.addEventListener('pointerup',e=>{if(drag&&!drag.moved)activate(raycast(e));drag=null;container.style.cursor='grab';});renderer.domElement.addEventListener('pointercancel',()=>drag=null);renderer.domElement.addEventListener('pointerleave',()=>{if(!drag)updateHover(null);});renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();zoom(-e.deltaY*.001);},{passive:false});ready=true;window.HDBScene={ready:true,sync,rotate,zoom,reset,showOverview,showNeighborhood,project,diagnostics,focusIssue,cue,presentPolicy,policyDone,clearPolicyPresentation,previewPlacement,clearPreview,invalidate,get view(){return options.view;}};loopRunning=true;renderer.setAnimationLoop(animate);document.addEventListener?.('visibilitychange',()=>{lastFrame=0;if(document.hidden)sleepRenderer();else invalidate();});window.DownstairsUI?.appSceneReady?.();
 }catch(error){console.error('Clementi scene could not initialize',error);let panel=document.getElementById('world-error');if(!panel){panel=document.createElement('div');panel.id='world-error';container.append(panel);}panel.textContent=t('浏览器未能打开3D场景。可刷新页面，或在支持WebGL的浏览器里继续。');panel.hidden=false;window.HDBScene={ready:false,diagnostics:()=>({ready:false,error:String(error.message||error)})};}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
