'use strict';
// Sound: generated music per moment of the game, effects for actions, remembered volume settings.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dist=path.join(__dirname,'..','dist'),src=fs.readFileSync(path.join(dist,'year-sound.js'),'utf8');
function load(saved){
  const store=new Map(saved?[['downstairs-clementi-sound',JSON.stringify(saved)]]:[]),listeners={};
  const doc={readyState:'complete',hidden:false,body:{dataset:{}},addEventListener(t,f){(listeners[t]||=[]).push(f);},querySelector:()=>null,querySelectorAll:()=>[],getElementById:()=>null,createElement:()=>({}),contains:()=>false};
  const ctx={document:doc,localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v))},setInterval(){},setTimeout(){},addEventListener(){},innerWidth:1280};
  ctx.window=ctx;ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(src,ctx,{filename:'year-sound.js'});
  return {S:ctx.CM_SOUND,store,listeners};
}
test('the sound script loads last and needs no audio files',()=>{
  const html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
  assert(html.indexOf('src="year-sound.js"')>html.indexOf('src="year-tutorial.js"'));
  assert(html.includes('href="year-sound.css"'));
  assert(!/\.(mp3|ogg|wav|m4a)['"]/.test(src),'everything is synthesised');
});
test('every moment of the game has its own music, and every action its own sound',()=>{
  const {S}=load();
  assert.deepEqual([...S.scenes()].sort(),['build','decide','home','lose','map','report','title','win']);
  for(const fx of ['tap','step','bump','look','knock','enter','refused','voice','reply','trust','found','card','flip','confirm','build','service','report','year','alert','tour','win','lose'])assert(S.effects().includes(fx),fx);
});
test('nothing plays before the first tap, and volume settings are clamped and remembered',()=>{
  const {S,store}=load({music:2,sfx:-1,muted:false});
  assert.deepEqual({...S.prefs()},{music:1,sfx:0,muted:false});
  assert.equal(S.unlocked(),false);S.play('tap');assert.deepEqual([...S.played()],['tap'],'requested');assert.equal(S.running(),false,'but no audio context yet');
  S.set({music:.3,muted:true});assert.deepEqual(JSON.parse(store.get('downstairs-clementi-sound')),{music:.3,sfx:0,muted:true});
  assert.deepEqual({...load().S.prefs()},{music:.55,sfx:.75,muted:false},'defaults for a new player');
});
test('the music is in key: chords and melody notes fit, and the bass stays where speakers can play it',()=>{
  const scenes=vm.runInNewContext('('+src.slice(src.indexOf('const SCENES={')+'const SCENES='.length,src.indexOf('};',src.indexOf('const SCENES={'))+1)+')');
  for(const [name,s] of Object.entries(scenes)){
    assert(s.bpm>=60&&s.bpm<=104,name+' tempo');assert(s.level>0&&s.level<=1);
    const scale=new Set(s.scale.map(m=>m%12));
    for(const [voicing,bass] of s.chords){assert(voicing.length>=3&&voicing.every(m=>m>=46&&m<=70),name+' voicing range');assert(bass>=32&&bass<=50,name+' bass');
      assert(voicing.filter(m=>scale.has(m%12)).length>=2,name+' chord shares notes with the melody scale');}
    assert(s.scale.every(m=>m>=60&&m<=88),name+' melody range');
    for(const v of Object.values(s.mix))assert(v>=0&&v<.3,name+' mix level');
  }
});
