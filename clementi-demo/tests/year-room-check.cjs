'use strict';
// Home visit room: the map column is the big one, and a tile cursor shows what a tap will do.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dist=path.join(__dirname,'..','dist');
function load(language){
  const ctx={};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
  for(const f of ['data.js','year-translations.js','year-content.js','i18n.js','year-engine.js','year-home.js'])vm.runInContext(fs.readFileSync(path.join(dist,f),'utf8'),ctx,{filename:f});
  ctx.CM_I18N?.setLanguage?.(language);
  return {E:ctx.CM_YEARS,H:ctx.CM_HOME};
}
test('the room layers: route under the furniture, cursor over the resident, labels over the player',()=>{
  const {E,H}=load('zh'),s=E.create({seed:3});
  for(const id of E.households().map(h=>h.id)){
    const html=H.panel(id,{state:s}),at=k=>html.indexOf(k);
    for(const k of ['id="cm-home-route"','id="cm-home-cursor"','id="cm-home-player"','id="cm-home-cursor-tag"','class="cm-home-caption"','class="cm-home-you"'])assert(at(k)>0,id+' has '+k);
    assert(at('id="cm-home-route"')<at('data-home-prop='),'route dots sit under the furniture');
    assert(at('data-home-person=')<at('id="cm-home-cursor"')&&at('id="cm-home-cursor"')<at('id="cm-home-player"'),'brackets sit over the resident and under the player');
    assert(at('id="cm-home-player"')<at('id="cm-home-cursor-tag"'),'labels are never hidden behind the player');
    assert.equal((html.match(/class="cm-home-bookmark/g)||[]).length,10,'ten bookmarks in one shelf');
    assert(!html.includes('cm-home-shelf-head'),'no separate shelf heading row');
  }
});
test('the pictured hints are short and in the right language',()=>{
  const cjk=/[㐀-鿿]/;
  for(const language of ['zh','en']){const {E,H}=load(language),html=H.panel('kumar',{state:E.create({seed:1})});
    const caption=html.slice(html.indexOf('class="cm-home-caption"'),html.indexOf('</div>',html.indexOf('class="cm-home-caption"')));
    const words=[...caption.matchAll(/<span>([^<]+)<\/span>/g)].map(m=>m[1]);assert.equal(words.length,3,'walk, look, talk');
    for(const t of words){assert.equal(cjk.test(t),language==='zh',t);if(language==='zh')assert(t.length<=7,t);}
    for(const k of ['W','A','S','D','Enter'])assert(caption.includes('<kbd>'+k+'</kbd>'));
  }
});
test('the room stylesheet loads after the HUD and sizes the map from the window height',()=>{
  const html=fs.readFileSync(path.join(dist,'index.html'),'utf8'),css=fs.readFileSync(path.join(dist,'year-room.css'),'utf8');
  assert(html.indexOf('href="year-room.css"')>html.indexOf('href="year-hud.css"'));
  assert(/grid-template-columns:minmax\(0,calc\(\(100dvh - \d+px\) \* 1\.5556/.test(css),'map column follows the 14 × 9 room ratio');
  for(const k of ['is-look','is-talk','is-exit','is-blocked','is-walk'])assert(css.includes('.cm-home-cursor'+(k==='is-walk'?'':'.'+k))||css.includes(k),k);
});
test('the open need shows its three directions as small cards, without a “visit again” button',()=>{
  const app=fs.readFileSync(path.join(dist,'year-app.js'),'utf8'),css=fs.readFileSync(path.join(dist,'year-hud.css'),'utf8');
  assert(!app.includes('yr-revisit')&&!app.includes('回去再聊'),'no revisit button');
  for(const k of ['yr-mini-band','yr-mini-title','yr-mini-fx','yr-mini-foot'])assert(app.includes(k)&&css.includes('.'+k),k);
  assert(app.includes('function fitDetail'),'the detail is fitted below the top bar');
});
