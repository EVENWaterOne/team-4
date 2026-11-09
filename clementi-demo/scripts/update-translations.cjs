'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dist=path.resolve(__dirname,'..','dist'),context={};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(dist,'data.js'),'utf8'),context);
const pairs=new Map();for(const c of context.CM_DATA.cards)for(const [a,b]of [['title','titleEn'],['desc','descEn'],['effects','effectsEn']])if(c[b])pairs.set(c[a],c[b]);
for(const p of context.CM_DATA.plots)for(const [a,b]of [['name','nameEn'],['description','descriptionEn'],['coverage','coverageEn']])if(p[b])pairs.set(p[a],p[b]);
for(const [zh,en]of [
 ['暂时没有需要这项行动的情境。先观察社区或查看来信。','No current situation needs this action. Observe the neighbourhood or check your mail.'],
 ['花园已有工程或设施，不能再承诺保留原状。','The garden already has works or a facility. You cannot promise to keep it unchanged.'],
 ['请把设施放在描边范围内，并使用四分之一圈的朝向。','Keep the facility within the outlined area and use a quarter-turn orientation.'],
 ['需要先完成居民角，再用现有空间安排相聚。','Complete the residents’ corner before using it for gatherings.'],
 ['放置位置超出这片空间的边界。','The placement is outside this space.'],
 ['走廊与坡道需要顺着现有通路放置。','Linkways and ramps must follow the existing path.'],
 ['住在这里的人','Your neighbours'],['你的行动卡','Your action cards'],['打开全部牌库','Open all cards'],['拿起一张，看看能改变什么','Pick up a card. Explore what it can change.'],['人物与地块为游戏示意','Illustrative characters and sites'],['社区观察','Neighbourhood observations'],['社区记录','Neighbourhood journal'],['地点地图','Location map'],['暂停经营','Pause the simulation'],['切换经营速度','Change simulation speed'],['三个目标与互动说明','Three goals and interactive guide'],
 ['用现有居民角安排相聚','Meet at the existing residents’ corner'],['使用已建居民角，不再扣建设费或新增人手；长者 +4、处得来 +4','Use the completed corner with no new construction cost or staff; older residents +4; community ties +4.']
])pairs.set(zh,en);
let source=fs.readFileSync(path.join(dist,'i18n.js'),'utf8');source=source.replace(/\n  \/\/ BEGIN APPROVED UPGRADE TRANSLATIONS[\s\S]*?\/\/ END APPROVED UPGRADE TRANSLATIONS\n/,'\n');
const block='\n  // BEGIN APPROVED UPGRADE TRANSLATIONS\n  add(`\n'+[...pairs].map(([zh,en])=>zh+'|||'+en).join('\n').replace(/`/g,'\\`').replace(/\$\{/g,'\\${')+'\n`);\n  // END APPROVED UPGRADE TRANSLATIONS\n';
source=source.replace('  const patterns = [',block+'\n  const patterns = [');new vm.Script(source);fs.writeFileSync(path.join(dist,'i18n.js'),source);console.log(`Updated ${pairs.size} upgrade translation pairs.`);
