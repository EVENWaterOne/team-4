'use strict';
// Pixel motion trial (everything except the cards): loaded after the pixel theme, scoped to it,
// smooth and short, silent under reduced motion, and its two new sounds exist.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dist=path.join(__dirname,'..','dist');
const css=fs.readFileSync(path.join(dist,'pixel-motion.css'),'utf8'),js=fs.readFileSync(path.join(dist,'pixel-motion.js'),'utf8'),html=fs.readFileSync(path.join(dist,'index.html'),'utf8');

test('the motion files load after the pixel theme and the sound script',()=>{
  assert(html.indexOf('href="pixel-motion.css"')>html.indexOf('href="pixel-guide.css"'),'stylesheet after the last pixel sheet');
  assert(html.indexOf('src="pixel-motion.js"')>html.indexOf('src="year-sound.js"'),'script after the sound');
});

test('every rule is scoped to the pixel UI, with no blur, glow or rounded corners',()=>{
  const body=css.replace(/\/\*[\s\S]*?\*\//g,'');
  const selectors=[...body.matchAll(/(?:^|[{}])\s*([^{}@]+?)\s*\{/g)].map(m=>m[1].trim()).filter(s=>s&&!/^(from|to|\d[\d.,%\s]*%)$/.test(s)&&!/^[\d%,\s]+$/.test(s));
  assert(selectors.length>20,'found the rules');
  for(const s of selectors)for(const part of s.split(/,(?![^(]*\))/))assert(/^\[data-ui="pixel"\]/.test(part.trim())||/^\d+%/.test(part.trim()),'scoped: '+part.trim());
  assert(!/blur\(|border-radius:\s*[1-9]|backdrop-filter|drop-shadow/.test(body),'no soft effects');
  for(const m of body.matchAll(/box-shadow:([^;}]+)/g))for(const layer of m[1].split(/,(?![^(]*\))/))assert(!/^\s*(inset\s+)?-?\d+px\s+-?\d+px\s+[1-9]/.test(layer),'hard shadows only: '+layer);
});

test('motion is short and smooth, eased with the theme tokens; steps only for blinks',()=>{
  const body=css.replace(/\/\*[\s\S]*?\*\//g,'');
  assert(!/steps\(\s*([2-9]|\d{2,})/.test(body+js),'no frame-by-frame steps(n>1)');
  let runs=0;
  for(const m of body.matchAll(/(?:^|[;{])\s*animation:([^;}]+)/g)){
    if(/^\s*none/.test(m[1]))continue;
    for(const run of m[1].split(/,(?![^(]*\))/)){
      runs++;const name=/(pxfx-[\w-]+|px-room-[\w-]+|cm-[\w-]+)/.exec(run)?.[1];
      if(/steps\(/.test(run))assert(['pxfx-goal','px-room-breathe'].includes(name),'steps only for blinks: '+run);
      else assert(/var\(--px-ease(-loop)?\)|\blinear\b/.test(run),'eased with a theme token: '+run);
      if(/infinite/.test(run))continue;
      const d=/(\d*\.?\d+)(m?s)\b/.exec(run);if(d)assert((d[2]==='ms'?+d[1]/1000:+d[1])<=0.62,'short: '+run);
    }
  }
  assert(runs>15,'found the animations');
  assert(/easing:ease\(\)/.test(js)&&/--px-ease/.test(js),'scripted moves use the theme easing');
  assert(/@media \(prefers-reduced-motion:no-preference\)/.test(css)&&/@media \(prefers-reduced-motion:reduce\)/.test(css));
  assert(/prefers-reduced-motion: reduce/.test(js)&&/data-ui|dataset\.ui/.test(js),'the script checks both the theme and reduced motion');
});

test('the script is harmless without a page and exposes a skip',()=>{
  const ctx={};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(js,ctx,{filename:'pixel-motion.js'});
  assert.equal(ctx.CM_PIXEL_MOTION,undefined,'no document: nothing runs');
  const listeners={},doc={readyState:'complete',documentElement:{dataset:{ui:'pixel'}},body:{},addEventListener(t,f){(listeners[t]||=[]).push(f);},querySelector:()=>null,querySelectorAll:()=>[],getElementById:()=>null};
  let observed=null;const page={document:doc,MutationObserver:class{constructor(f){this.f=f;}observe(target,opts){observed=opts;}},matchMedia:()=>({matches:false}),setTimeout,clearTimeout};page.window=page;
  vm.createContext(page);vm.runInContext(js,page,{filename:'pixel-motion.js'});
  assert.equal(typeof page.CM_PIXEL_MOTION.skip,'function');assert.equal(page.CM_PIXEL_MOTION.busy(),false);
  assert.deepEqual({...observed},{childList:true,subtree:true});assert(listeners.pointerdown,'press feedback on pointer down');
});

test('the count has its own climbing blip and a chord for crossing 70',()=>{
  const src=fs.readFileSync(path.join(dist,'year-sound.js'),'utf8');
  assert(/\btick\(t,n\)\{/.test(src)&&/\bgoal\(t\)\{/.test(src));
  assert(/sound\('tick',n\+\+\)/.test(js)&&/sound\('goal'\)/.test(js));
});
