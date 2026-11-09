// Writes docs/rooms-and-stories.md from dist/year-content.js so the list always matches the game.
const fs=require('fs'),vm=require('vm'),path=require('path');const ctx={};ctx.globalThis=ctx;vm.createContext(ctx);
for(const f of ['year-content.js','year-engine.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..','dist',f),'utf8'),ctx);
const C=ctx.CM_YEAR_CONTENT,E=ctx.CM_YEARS,names={chen:'陈玉英',rahman:'拉赫曼与努尔',lin:'林家（林志豪与周佳颖）',kumar:'库马尔与德薇',students:'四位合租学生',ali:'阿丽'};
const mode={door:'隔着铁门回话',note:'门上纸条',message:'手机消息',neighbour:'邻居转告'};
const cases={};for(let y=1;y<=10;y++){const s=E.create({seed:1});s.year=y;for(const c of E.additionalVisits(s)){const key=c.id.replace(/^y\d+-/,'');if(!key.startsWith('visit-'))(cases[c.residentId]||(cases[c.residentId]=[])).push({year:y,key,title:c.title});}}
const caseTitle=key=>{for(const list of Object.values(cases))for(const c of list)if(c.key===key)return '第'+c.year+'年「'+c.title+'」';return key;};
let out='# 六户住家：房间物件、家庭故事与拒绝探访\n\n> 由 `node scripts/build-rooms-doc.cjs` 根据 `dist/year-content.js` 生成，请改源文件后重新生成。\n\n';
out+='背景设定为当代金文泰组屋社区（游戏的“第N年”是任期年份，没有指定公历起点）。人物与故事均为虚构；甘榜搬迁、丽的呼声、电梯翻新、预购组屋、建国一代配套、底层婚礼、转售的族群比例限制等是新加坡的一般历史与制度背景，不对应任何真实住户。\n\n';
out+='## 玩法规则\n\n- 每年按存档种子随机让 **3–6 户** 答应探访，名单上不提前标出；点到未答应的户会播放敲门事件，之后名单显示“本年婉拒 · 原因”。同一户不会连续两年给出同一个原因。\n- 居民需要耐心：前两轮交流只聊日常和线索；第三轮起，或者第二轮里问到与本年需求相关的物件，居民才会说出需求。说出需求的那一句标为金色，下方的小图标播放“已获得需求”。\n- 每户10个物件。点物件可观察，点“问问这件事”或在问题里提到物件名，居民会讲出它背后的故事；听过的故事在房间右上角计数，并收进“笔记 → 家庭故事”。\n- 物件旁标注的“线索”表示它与哪一年的需求有关：先问这件物件，能更快听到那一年的需求。\n\n';
for(const id of C.households){const home=C.homes[id];out+='## '+names[id]+'\n\n'+home.description.zh+'\n\n';
  out+='**年度重点需求：** '+(cases[id]||[]).map(c=>'第'+c.year+'年「'+c.title+'」').join('、')+'\n\n';
  out+='### 房间物件（10）\n\n';
  home.props.forEach((p,i)=>{out+=(i+1)+'. **'+p.name.zh+'**（'+p.name.en+'）'+(p.hints.length?' — 线索：'+p.hints.map(caseTitle).join('、'):'')+'\n   - 观察：'+p.look.zh+'\n   - 故事：'+p.story.zh.replace('{older}','N+3').replace('{younger}','N')+'\n';for(const v of p.variants||[])out+='   - 第'+v.from+'年起'+(v.name?'改称“'+v.name.zh+'”':'')+(v.story?'：'+v.story.zh.replace(/\{older\}/g,'N+3').replace(/\{younger\}/g,'N'):(v.look?'：'+v.look.zh:''))+'\n';});
  out+='\n### 拒绝探访的原因（6）\n\n| 方式 | 名单标签 | 内容 |\n|---|---|---|\n';
  for(const r of C.refusals[id])out+='| '+mode[r.mode]+(r.speaker?'（'+r.speaker.zh+'）':'')+' | '+r.short.zh+' | '+r.line.zh+' |\n';
  out+='\n';}
out+='## 新写的五项年度需求（替代黄美兰与张叔）\n\n| 年份 | 住户 | 需求 | 居民说出的金色句子 |\n|---|---|---|---|\n';
for(const key of ['retired-days','not-on-call','hawker-seat','works-and-mother','old-friends-corner']){for(const [id,list] of Object.entries(cases))for(const c of list)if(c.key===key)out+='| 第'+c.year+'年 | '+names[id]+' | '+c.title+' | '+C.voiceNeed[key].zh+' |\n';}
out+='\n黄美兰（食阁摊主）和张叔（居委会志愿者）不再是可探访的住家，仍作为社区里的熟面孔出现在3D地图和其他住户的故事里。\n';
fs.writeFileSync(path.join(__dirname,'..','docs','rooms-and-stories.md'),out);console.log('docs/rooms-and-stories.md',out.length,'chars');
