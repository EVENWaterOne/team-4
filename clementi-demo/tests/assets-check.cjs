const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..','dist'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const entry of ['index.html','five-days.html','classic.html']){
 const document=fs.readFileSync(path.join(root,entry),'utf8');
 const assets=[...document.matchAll(/(?:src|href)="([^"]+)"/g)].map(m=>m[1]).filter(x=>!x.startsWith('http'));
 for(const file of assets)assert(fs.existsSync(path.join(root,file)),'Missing '+entry+' → '+file);
 const ids=[...document.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,entry+' unique ids');
}
assert(html.includes('src="year-engine.js"')&&html.includes('src="year-app.js"'),'the annual decision game owns the default entry');
assert(!html.includes('src="engine.js"')&&!html.includes('src="app.js"')&&!html.includes('src="needs.js"')&&!html.includes('src="campaign-engine.js"'),'rule engines never mix in the annual game');
assert(html.includes('src="year-home.js"')&&html.includes('src="year-refusal.js"')&&html.includes('src="year-content.js"')&&html.includes('src="year-dialogue.js"'),'single-house exploration and short annual roleplay stay connected');
assert(html.includes('id="year-next"')&&html.includes('id="year-goals"'),'the next step and three annual goals are accessible');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
assert(css.includes('#game #world-scene{position:absolute;inset:0;width:100%;height:100%'),'full-window scene');
const experience=fs.readFileSync(path.join(root,'experience.css'),'utf8');
assert(experience.includes('.ui-collapsed .world-feed'),'collapsible overlays');
assert(experience.includes('@media(max-width:560px)'),'small-screen overlay access');
assert(experience.includes('.library-grid'),'full card collection is accessible');
const classic=fs.readFileSync(path.join(root,'classic.html'),'utf8');
assert(classic.includes('id="mailbox"')&&classic.includes('id="placement-panel"'),'the previous mail and placement game remains accessible');
assert(!css.includes('transform:scale('),'text containers are not scaled');
console.log('PASS isolated annual/archived entries, local assets, unique ids, retained rooms, short visits and three clear goals.');
