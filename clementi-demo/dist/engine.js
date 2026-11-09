(function (root) {
  'use strict';
  const D = root.CM_DATA;
  const card = id => D.cards.find(c => c.id === id);
  const clamp = v => Math.max(0, Math.min(100, v));
  const channel = id => D.issueChannels && D.issueChannels[id] || 'mail';
  function migrate(s) {
    if (!s || !s.groups) return create();
    s.schema=2;s.flags=s.flags||{};s.flags.completed=s.flags.completed||{};s.plots=s.plots||{};
    s.projects=Array.isArray(s.projects)?s.projects:[];s.issues=Array.isArray(s.issues)?s.issues:[];
    s.queue=Array.isArray(s.queue)?s.queue:[];s.history=Array.isArray(s.history)?s.history:[];
    s.events=Array.isArray(s.events)?s.events.slice(-50):[];
    s.eventSerial=Math.max(Number(s.eventSerial)||0,...s.events.map(e=>Number(e.id)||0));
    D.plots.forEach(p=>{if(!s.plots[p.id])s.plots[p.id]={cardId:null,status:p.kind==='locked'?'locked':'available',remaining:0};});
    s.issues.forEach(i=>{i.channel=channel(i.id);if(i.read==null)i.read=false;});
    if(root.CM_NEEDS){
      root.CM_NEEDS.ensure(s);
      if(quietHoursAgreed(s)){
        s.flags.quietHoursAgreed=true;s.flags.noiseResolved=true;
        const noise=s.issues.find(i=>i.id==='noise');if(noise){delete noise.partialSupport;resolve(s,['noise']);}
      }else if(s.flags.completed.corner||s.flags.completed.event){
        s.flags.noiseResolved=false;s.flags.noisePartiallySupported=true;
        const noise=s.issues.find(i=>i.id==='noise');
        if(noise)partial(s,['noise'],'相聚机会已经增加，仍需当面约定适合学生与轮班住户的安静时段。');
        else if(s.flags.seen_noise){s.flags.seen_noise=false;schedule(s,0,'noise');}
      }
      if(s.flags.careSupported)partial(s,['care','carealt'],'已获得活动、友伴、转介或住房方向的支持；正式白天照护仍需跟进。');
      if(s.flags.childcarePartiallySupported&&!s.flags.completed.child)partial(s,['childcare'],'已获得交流或亲子支持；正式托育仍需另外落实。');
    }
    return s;
  }
  function snapshot(s) { return {budget:s.budget,trust:s.trust,staffUsed:s.staffUsed,social:s.social,comfort:s.comfort,stay:metrics(s).stay,groups:Object.assign({},s.groups)}; }
  function emit(s,type,meta,before) {
    if(!Array.isArray(s.events))s.events=[];
    const after=snapshot(s),changes={groups:{}};
    ['budget','trust','staffUsed','social','comfort','stay'].forEach(k=>{changes[k]=Math.round((after[k]-before[k])*1000)/1000;});
    Object.keys(after.groups).forEach(k=>{const delta=after.groups[k]-before.groups[k];if(delta)changes.groups[k]=delta;});
    const event=Object.assign({id:(s.eventSerial||0)+1,type,at:s.time,changes},meta||{});
    s.eventSerial=event.id;s.events.push(event);s.events=s.events.slice(-50);return event;
  }
  function actionContext(s,cardId) {
    const c=typeof cardId==='object'?cardId:card(cardId);
    if(!c||!c.actionOption)return null;
    return (s.issues||[]).find(i=>i.status==='open'&&c.issueKinds.includes(i.id)&&(i.options||[]).some(o=>o.id===c.actionOption))||null;
  }
  function placementFor(plotId,placement,cardId) {
    const p=D.plots.find(p=>p.id===plotId);if(!p)return null;
    const size=p.sceneSize||[6,6],limitX=Math.min(1,size[0]/5),limitZ=Math.min(1,size[1]/5);
    const value=Object.assign({x:0,z:0,rotation:0},placement||{});
    if(!Number.isFinite(value.x)||!Number.isFinite(value.z)||!Number.isFinite(value.rotation))return null;
    if(Math.abs(value.x)>limitX+.0001||Math.abs(value.z)>limitZ+.0001)return null;
    const quarter=Math.round(value.rotation/(Math.PI/2));
    if(Math.abs(value.rotation-quarter*Math.PI/2)>.001)return null;
    const rotation=((quarter%4)+4)%4*Math.PI/2,c=typeof cardId==='object'?cardId:card(cardId);
    if(c&&c.allowedRotations&&!c.allowedRotations.some(angle=>Math.abs(angle-rotation)<.001))return null;
    return {x:value.x,z:value.z,rotation};
  }
  function log(s, text) { s.history.unshift({ time: s.time, text }); s.history = s.history.slice(0, 70); }
  function adjust(s, changes) { Object.keys(changes).forEach(k => { if (Object.prototype.hasOwnProperty.call(s.groups, k)) s.groups[k] = clamp(s.groups[k] + changes[k]); else if (k === 'trust' || k === 'social' || k === 'comfort') s[k] = clamp(s[k] + changes[k]); }); }
  function metrics(s) { return { stay: Object.values(s.groups).filter(v => v >= 68).length / 5 * 100, social: Math.round(s.social), comfort: Math.round(s.comfort) }; }
  function quietHoursAgreed(s){return s.flags.quietHoursAgreed===true||s.residentNeeds?.actions?.['action-mediate']===true;}
  function schedule(s, delay, kind) { if (!s.queue.some(q => q.kind === kind) && !s.flags['seen_' + kind]) s.queue.push({ at: s.time + delay, kind }); }
  function openIssue(s, kind) {
    if (s.flags['seen_' + kind]) return true;
    if ((kind==='noise'&&(root.CM_NEEDS?quietHoursAgreed(s):s.flags.noiseResolved))||(kind==='housing'&&s.flags.appealReviewed)||((kind==='care'||kind==='carealt')&&s.flags.careSupported&&!root.CM_NEEDS)||(kind==='land'&&s.flags.gardenUse)||(kind==='childcare'&&s.flags.completed.child)) { s.flags['seen_'+kind]=true; return true; }
    // The enhanced UI limits visible prompts, not the existence of later needs.
    if (!root.CM_NEEDS && s.issues.filter(i => i.status === 'open').length >= 3) return false;
    const templates = {
      route: ['那段没有遮的路', '陈玉英', '下雨时，陈玉英在去食阁的路上走走停停。她说：“家里还是熟悉的，就是雨天不敢走出去。”屋内安全与屋外通路是不同的问题。', [['cover','修建有盖走廊','预算 20 · 工期 55 秒；改善这段屋外路线'],['ramp','先修无障碍接驳','预算 14 · 40 秒；改善高差，但仍然会淋雨'],['ease','先处理屋内安全','预算 22 · 60 秒；屋外路线仍需安排']]],
      noise: ['楼上的年轻人', '陈玉英 / 学生 / 阿丽', '学生偶尔晚间聚会，陈玉英睡不好；轮班的阿丽也希望有可预期的安静时段。学生说，他们还不清楚楼里的生活约定。', [['mediate','约定作息并当面调解','居民信任 -3；先建立安静时段，后续仍需相处机会'],['corner','建设居民角','预算 18 · 持续人手 1；提供日常相遇空间'],['event','约一次食阁交流','预算 10 · 临时人手 1；完成后归还']]],
      housing: ['卖不出去的房子', '拉赫曼与努尔', '夫妻想换小一点的房子，却在模拟 EIP 配额条件下遇到困难。他们希望有人说明下一步。这里不是金文泰任何真实楼栋的配额数据。', [['appeal','协助准备个案申诉','居民信任 -8 · 35 秒模拟受理；不保证豁免或成交'],['extend','建议延长出售安排','居民信任 -3；暂缓压力，90 秒后需要后续支持'],['advice','安排换房咨询','预算 8；先厘清可行的住房与援助选择']]],
      help: ['从楼上的邻居到搭把手的人', '学生 / 陈玉英', '见过面之后，一位学生提出顺路代买日用品。陈玉英愿意试试，但也希望先约好时间。阿丽提醒，邻里互助需要尊重每个人的休息。', [['accept','约好时间，建立互助联系','处得来 +5；长者与租户各 +5'],['light','保留随手帮忙的方式','处得来 +3；租户 +3，不新增持续服务']]],
      rumor: ['张叔带来的另一种说法', '张叔 / 拉赫曼夫妇', '模拟申诉已获受理，夫妻得到了下一步换房支持。张叔说：“有人不明白为什么这户得到个案帮助。”这只是转述；可以解释程序，也可以逐户了解，不能把传言当作事实。', [['explain','公开解释个案审理原则','预算 8；处得来 +7，居民信任 +4'],['talk','与有疑问的住户分别谈谈','居民信任 -3；处得来 +8'],['later','先继续个案跟进','屋主 +4；暂不消除社区疑问']]],
      waiting: ['等待之外还可以做什么', '拉赫曼与努尔', '延长出售安排给了夫妻更多时间，房子的去向却还没有确定。他们希望这次有具体跟进。', [['appeal','协助提交个案资料','居民信任 -8；35 秒后得到模拟受理反馈'],['advice2','补上换房与援助咨询','预算 10；屋主 +16，明确后续选择']]],
      care: ['白天的照护，谁来接手', '库马尔与德薇', '夫妻轮流请假照顾长辈。活动中心可以提供友伴与转介，但并不等于有人整天照护。需要在邻里支持、正式服务连接及住房选择之间安排。', [['visits','建立探访与照护转介','预算 9 · 持续人手 1；缓解信息与孤立压力'],['aac','设乐龄活动中心','预算 34 · 人手 2；活动、友伴与服务转介'],['cca','支持社区关怀公寓试点','预算 68 · 人手 3 · 花园地块；需较长工期']]],
      land: ['同一片地，两种期待', '林家 / 照护家庭', '街角花园是唯一较大的可用地块。林家希望增加托育与儿童空间，照护家庭希望获得社区关怀住房。无论哪边，原来的花园都会缩小；未被满足的一方仍需要其他办法。', [['child','把地块用于托育与儿童空间','预算 46 · 持续人手 2 · 工期 80 秒'],['cca','把地块用于关怀住房与服务','预算 68 · 持续人手 3 · 工期 110 秒'],['keep','保留花园，先做分散支持','年轻家庭 +3；照护需求仍通过其他服务处理']]],
      childcare: ['孩子的地方还能怎么安排', '林家', '花园地块已经安排了关怀住房。林家理解长者需要服务，但他们的日常托育压力仍然存在。能否先在现有空间内安排小规模支持？', [['small','利用现有空间安排亲子支持','预算 12；年轻家庭 +14、处得来 +3'],['event','先组织家庭参与的邻里活动','预算 10 · 临时人手 1；缓解交流需求，不能代替正式托育']]],
      carealt: ['没有新公寓，照护怎样继续', '德薇', '街角地块已用于儿童空间。德薇说，母亲也愿意留在原来的家，只是需要知道可以找谁帮忙。', [['visits','建立持续探访及正式服务转介','预算 9 · 持续人手 1'],['aac','用空置房间提供活动和转介','预算 34 · 持续人手 2'],['refer','安排专项照护服务咨询','预算 12；照护家庭 +12，不新增日间照护设施']]],
      stall: ['早餐之后，摊位还能开多久', '黄美兰', '黄美兰还想继续见到熟客，也希望每周能多休息一天。她不想把继续经营变成对社区的责任。', [['support','支持她调整营业与邻里安排','预算 10；长者 +5、处得来 +4，保留相聚时间'],['corner','让居民角接住部分相聚需求','居民角已建则直接安排；否则建设预算 18、人手 1']]],
      petition: ['老居民提出邻里更新请愿', '张叔', '旧公共区域需要更新。是否推进，必须由合资格屋主投票。支持率与居民对你的信任是两件事；75% 是本计划的推进门槛。', [['startvote','发起公开投票与意见征集','初始支持率 58%；不会把居民信任直接换算成选票'],['defer','先做小范围更新，再征集意见','居民信任 +2；60 秒后重新提出请愿']]],
      ballot: ['邻里更新：居民如何选择', '合资格屋主', '投票支持率公开显示。听取担忧与解释施工安排可以帮助居民作出决定；达到 75% 后，才可以打出邻里更新牌。', [['meeting','说明工程内容与施工影响','预算 8；支持率 +12 个百分点，只进行一次'],['door','逐户听取意见并修改安排','居民信任 -3；支持率 +10 个百分点，只进行一次'],['build','启动已获同意的邻里更新','支持率达到 75% 后：预算 58 · 工期 100 秒']]],
      foodreturn: ['食阁的那个位子又有人了', '黄美兰 / 陈玉英', '有盖路线完工后，陈玉英重新走到了食阁。黄美兰把咖啡推过来，学生也向她打了招呼。设施改变了出门的条件，接下来是人与人怎样相处。', [['good','把反馈记下来，继续留意','居民信任 +3；这条路线的承诺已兑现']]]
    };
    const t = templates[kind]; if (!t) return true;
    s.flags['seen_' + kind] = true;
    const renewedIssue = { id: kind, channel:channel(kind), read:false, title: t[0], person: t[1], body: t[2], age: 0, stage: 0, status: 'open', options: t[3].map(o => ({id:o[0],label:o[1],hint:o[2]})) };
    const previousIndex = s.issues.findIndex(i => i.id === kind);
    if (previousIndex >= 0) s.issues[previousIndex] = renewedIssue;
    else s.issues.push(renewedIssue);
    if(root.CM_NEEDS&&kind==='noise'&&s.flags.noisePartiallySupported&&!quietHoursAgreed(s))partial(s,[kind],'相聚机会已经增加，仍需当面约定适合学生与轮班住户的安静时段。');
    if(root.CM_NEEDS&&['care','carealt'].includes(kind)&&s.flags.careSupported)partial(s,[kind],'已获得活动、友伴、转介或住房方向的支持；正式白天照护仍需跟进。');
    if(root.CM_NEEDS&&kind==='childcare'&&s.flags.childcarePartiallySupported)partial(s,[kind],'已获得交流或亲子支持；正式托育仍需另外落实。');
    log(s, '新消息：' + t[0]); return true;
  }
  function resolve(s, ids) { ids.forEach(id => { const issue = s.issues.find(i => i.id === id && i.status !== 'resolved'); if (issue) { issue.status = 'resolved'; log(s, '已回应：' + issue.title); } }); }
  function pending(s, ids) { ids.forEach(id => { const i = s.issues.find(x => x.id === id && x.status === 'open'); if (i) i.status = 'pending'; }); }
  function partial(s,ids,message){ids.forEach(id=>{const i=s.issues.find(x=>x.id===id);if(!i)return;i.partialSupport=true;i.status='open';i.age=0;i.stage=0;if(!i.body.includes(message))i.body+='\n【已获得部分支持】'+message;});}
  function create() {
    const groups = { elders: 52, owners: 48, families: 72, care: 70, renters: 78 };
    const s = { schema:2, time: 0, budget: 90, trust: 62, staffTotal: 6, staffUsed: 0, social: 62, comfort: 42, groups: groups, initialGroups: Object.assign({},groups), plots: {}, projects: [], issues: [], history: [], events:[],eventSerial:0, flags: { completed: {}, events: 0 }, vote: null, hold: 0, danger: 0, outcome: null, started: true, queue: [{at:25,kind:'noise'},{at:50,kind:'housing'},{at:110,kind:'care'},{at:145,kind:'land'},{at:180,kind:'petition'},{at:245,kind:'stall'}] };
    D.plots.forEach(p => { s.plots[p.id] = { cardId: null, status: p.id === 'locked' ? 'locked' : 'available', remaining: 0 }; });
    openIssue(s,'route');if(root.CM_NEEDS)root.CM_NEEDS.ensure(s); log(s, '你接手了这片已经有人生活的社区。先看看路上的陈玉英。'); return s;
  }
  function available(s, cardId, plotId, placement) {
    const c = card(cardId); if (!c) return {ok:false,message:'没有找到这张牌。'};
    if (s.outcome) return {ok:false,message:'本局已结束，可以重新开始。'};
    if(c.actionOption){
      const context=actionContext(s,c);if(!context)return {ok:false,message:'暂时没有需要这项行动的情境。先观察社区或查看来信。'};
      if(root.CM_NEEDS&&['small','refer'].includes(c.actionOption)&&s.residentNeeds?.actions?.[c.id])return {ok:false,message:'这项部分支持已经安排，仍需跟进其他实际服务。'};
      if(c.requiresCompleted&&!s.flags.completed[c.requiresCompleted])return {ok:false,message:'需要先完成居民角，再用现有空间安排相聚。'};
      if((c.actionOption==='meeting'||c.actionOption==='door')&&s.flags['vote_'+c.actionOption])return {ok:false,message:'这一轮意见征集已经完成，请尝试另一种安排。'};
      if(c.actionOption==='keep'&&s.plots.garden&&s.plots.garden.status!=='available')return {ok:false,message:'花园已有工程或设施，不能再承诺保留原状。'};
      if(s.budget+.0001<c.budget)return {ok:false,message:'预算还差 '+Math.ceil(c.budget-s.budget)+'。预算会随时间恢复。'};
      if(s.trust<(c.trustCost||0))return {ok:false,message:'居民信任不足。'};
      return {ok:true,message:'可以安排。',issueId:context.id};
    }
    if (s.projects.some(p => p.cardId === cardId)) return {ok:false,message:'这项安排正在进行。'};
    if (cardId !== 'event' && s.flags.completed[cardId]) return {ok:false,message:'这项安排已经完成。'};
    if (cardId === 'event' && s.flags.lastEvent != null && s.time - s.flags.lastEvent < 60) return {ok:false,message:'先让这次交流留下相处时间，60 秒后可再办。'};
    if (s.budget + 0.0001 < c.budget) return {ok:false,message:'预算还差 ' + Math.ceil(c.budget-s.budget) + '。预算会随时间恢复。'};
    if (s.staffUsed + c.staff > s.staffTotal) return {ok:false,message:'可用人手不足；持续服务会占用人手。'};
    if (c.trustCost && s.trust < c.trustCost) return {ok:false,message:'居民信任不足以支持这次安排。'};
    if (cardId === 'nrp' && !(s.vote && s.vote.approved)) return {ok:false,message:'需先征集至少 75% 合资格屋主支持。投票独立于居民信任。'};
    if (c.land.length) {
      if (!plotId) return {ok:false,message:'请在地图上选择：' + c.land.map(id => D.plots.find(p=>p.id===id).name).join('、') + '。'};
      if (!c.land.includes(plotId)) return {ok:false,message:'这里的用地类型不适合这张牌。'};
      const p = s.plots[plotId];
      if (!p || p.status === 'locked') return {ok:false,message:'这片区域已有用途或被规划锁定，不能建设。'};
      if (p.status !== 'available') return {ok:false,message:'这片地已经被占用，一块地只能安排一种设施。'};
      if(placement&&Number.isFinite(placement.rotation)&&['cover','ramp'].includes(cardId)&&!placementFor(plotId,{x:0,z:0,rotation:placement.rotation},c))return {ok:false,message:'走廊与坡道需要顺着现有通路放置。',messageEn:'Linkways and ramps must follow the existing path.'};
      if(!placementFor(plotId,placement,c))return {ok:false,message:'请把设施放在描边范围内，并使用四分之一圈的朝向。'};
    } else if (plotId === 'locked') return {ok:false,message:'规划锁定区域不能用于建设。'};
    return {ok:true,message:'可以安排。'};
  }
  function play(s, cardId, plotId, placement) {
    migrate(s);
    const check = available(s,cardId,plotId,placement); if (!check.ok) return check;
    const c = card(cardId);
    if(c.actionOption)return choose(s,check.issueId,c.actionOption);
    const before=snapshot(s);
    s.budget -= c.budget; s.staffUsed += c.staff; if (c.trustCost) s.trust -= c.trustCost;
    const land = c.land.length ? plotId : null;
    const position=land?placementFor(land,placement,c):null;
    s.projects.push({id:cardId+'-'+Math.round(s.time*1000),cardId:cardId,plotId:land,remaining:c.duration,total:c.duration,placement:position});
    if (land) s.plots[land] = {cardId:cardId,status:'building',remaining:c.duration,placement:position};
    if(land==='garden')s.flags.gardenKept=false;
    if (cardId === 'cover') pending(s,['route']);
    if (cardId === 'appeal') pending(s,['housing','waiting']);
    if (cardId === 'corner' || cardId === 'event') pending(s,['noise']);
    if (['visits','aac','cca'].includes(cardId)) pending(s,['care','carealt']);
    if (['cca','child'].includes(cardId)) pending(s,['land']);
    if (cardId === 'nrp') { pending(s,['ballot','petition']); adjust(s,{comfort:-2}); }
    log(s, '已安排：' + c.title + '（' + c.duration + ' 秒）');
    emit(s,'start',{cardId,plotId:land,placement:position},before);
    return {ok:true,message:c.title+'已安排；完成后会看到居民与地图的变化。'};
  }
  function complete(s,p) {
    const before=snapshot(s);
    const c=card(p.cardId); s.flags.completed[c.id]=true;
    if (p.plotId) s.plots[p.plotId]={cardId:c.id,status:'complete',remaining:0,placement:p.placement||{x:0,z:0,rotation:0},completedAt:s.time};
    adjust(s,c.effectChanges||{}); log(s,'完成：'+c.title+'。'+c.effects);
    if (c.id==='cover') { s.flags.routeCovered=true; resolve(s,['route']); schedule(s,7,'foodreturn'); if (s.flags.noiseResolved) schedule(s,30,'help'); }
    if (c.id==='ease') { s.flags.homeSafer=true; const i=s.issues.find(i=>i.id==='route'&&i.status!=='resolved'); if(i){i.body+='\n屋内改造已完成，但去食阁的露天路段仍然会淋雨。'; if(i.status==='pending')i.status='open';} }
    if (c.id==='corner'||c.id==='event') {
      if(root.CM_NEEDS&&!quietHoursAgreed(s)){s.flags.noiseResolved=false;s.flags.noisePartiallySupported=true;partial(s,['noise'],'相聚机会已经增加，仍需当面约定适合学生与轮班住户的安静时段。');}
      else{s.flags.noiseResolved=true;resolve(s,['noise']);}
      schedule(s,30,'help');
    }
    if (c.id==='corner') resolve(s,['stall']);
    if(c.id==='event'){
      const waiting=s.issues.find(i=>i.id==='childcare'&&i.status==='pending');
      if(root.CM_NEEDS&&waiting){s.flags.childcarePartiallySupported=true;partial(s,['childcare'],'邻里活动增进交流，但不能替代正式托育。');}
      else if(!root.CM_NEEDS)resolve(s,['childcare']);
    }
    if (['visits','aac','cca'].includes(c.id)) { s.flags.careSupported=true;if(root.CM_NEEDS)partial(s,['care','carealt'],'已获得活动、友伴、转介或住房方向的支持；正式白天照护仍需跟进。');else resolve(s,['care','carealt']); }
    if(c.id==='cca'){s.flags.gardenUse='cca';resolve(s,['land']);schedule(s,18,'childcare');}
    if(c.id==='child'){s.flags.gardenUse='child';resolve(s,['land','childcare']);schedule(s,18,'carealt');}
    if(c.id==='appeal'){s.flags.appealReviewed=true;resolve(s,['housing','waiting']);schedule(s,20,'rumor');log(s,'模拟个案已受理，屋主获得后续换房支持。这不表示真实豁免获批或房屋已成交。');}
    if(c.id==='event'){s.staffUsed=Math.max(0,s.staffUsed-c.staff);s.flags.lastEvent=s.time;s.flags.events++;}
    if(c.id==='nrp'){s.flags.neighbourhoodRenewed=true;resolve(s,['ballot','petition']);}
    emit(s,'complete',{cardId:c.id,plotId:p.plotId,placement:p.placement||null},before);
  }
  function spend(s,budget,trust) { if(s.budget<budget)return {ok:false,message:'预算不足，需要 '+budget+'。'};if(s.trust<trust)return {ok:false,message:'居民信任不足。'};s.budget-=budget;s.trust-=trust;return null; }
  function chooseInternal(s,issueId,optionId) {
    if(s.outcome)return {ok:false,message:'本局已结束。'};
    const i=s.issues.find(x=>x.id===issueId);if(!i||i.status!=='open')return {ok:false,message:'这件事已回应或正在安排中。'};
    if(!i.options.some(o=>o.id===optionId))return {ok:false,message:'没有这个选项。'};
    if(root.CM_NEEDS&&['small','refer'].includes(optionId)&&s.residentNeeds?.actions?.['action-'+optionId])return {ok:false,message:'这项部分支持已经安排，仍需跟进其他实际服务。'};
    const cid=card(optionId);
    if(cid){
      if(optionId==='corner'&&s.flags.completed.corner&&issueId==='stall'){adjust(s,{social:4,elders:4});resolve(s,[issueId]);log(s,'黄美兰调整营业安排，居民角接住了部分相聚需求。');return {ok:true,message:'居民角接住部分日常相聚，黄美兰可以安排更多休息。'};}
      const result=play(s,optionId,cid.land[0]||null);if(result.ok&&['stall','childcare'].includes(issueId))pending(s,[issueId]);return result;
    }
    let error;
    if(optionId==='mediate'){if((error=spend(s,0,3)))return error;adjust(s,{social:8,renters:8});s.flags.quietHoursAgreed=true;s.flags.noiseResolved=true;delete i.partialSupport;resolve(s,[issueId]);schedule(s,35,'help');log(s,'居民约定了安静时段；学生与轮班住户都参与了调解。');}
    else if(optionId==='extend'){if((error=spend(s,0,3)))return error;adjust(s,{owners:6});resolve(s,[issueId]);schedule(s,90,'waiting');log(s,'延长安排暂时缓解压力，90 秒后仍需要具体跟进。');}
    else if(optionId==='advice'||optionId==='advice2'){if((error=spend(s,optionId==='advice'?8:10,0)))return error;adjust(s,{owners:optionId==='advice'?10:16,trust:2});resolve(s,[issueId]);if(optionId==='advice')schedule(s,80,'waiting');else s.flags.housingAdvised=true;log(s,'拉赫曼夫妇获得了具体换房与援助咨询。');}
    else if(optionId==='accept'||optionId==='light'){adjust(s,optionId==='accept'?{social:5,elders:5,renters:5,trust:3}:{social:3,renters:3,trust:2});s.flags.neighbourHelp=true;resolve(s,[issueId]);log(s,'学生与陈玉英约好了互相联系的方式。阿丽的休息时间也得到尊重。');}
    else if(optionId==='explain'||optionId==='talk'){if((error=spend(s,optionId==='explain'?8:0,optionId==='talk'?3:0)))return error;adjust(s,optionId==='explain'?{social:7,trust:4}:{social:8});resolve(s,[issueId]);log(s,'居民讨论了个案审理程序；没有把传言当作楼栋的事实。');}
    else if(optionId==='later'){adjust(s,{owners:4});resolve(s,[issueId]);log(s,'继续跟进住房个案，社区疑问暂未通过沟通消除。');}
    else if(optionId==='keep'){if(s.plots.garden&&s.plots.garden.status!=='available')return {ok:false,message:'花园已有工程或设施，不能再承诺保留原状。'};adjust(s,{families:3,trust:2});s.flags.gardenKept=true;resolve(s,[issueId]);log(s,'街角花园暂时保留；照护和托育需求需要其他支持。');}
    else if(optionId==='small'){if((error=spend(s,12,0)))return error;adjust(s,{families:14,social:3,trust:2});s.flags.childcarePartiallySupported=true;if(root.CM_NEEDS)partial(s,[issueId],'已在现有空间安排亲子支持；正式托育仍需另外落实。');else resolve(s,[issueId]);log(s,'在现有空间安排了小规模亲子支持，不能视为新建托育中心。');}
    else if(optionId==='refer'){if((error=spend(s,12,0)))return error;adjust(s,{care:12,trust:3});s.flags.careSupported=true;if(root.CM_NEEDS)partial(s,[issueId,'care'],'已获得正式服务咨询与转介；具体白天照护仍需落实。');else resolve(s,[issueId,'care']);log(s,'照护家庭获得正式服务咨询与转介，没有新增日间照护设施。');}
    else if(optionId==='support'){if((error=spend(s,10,0)))return error;adjust(s,{elders:5,social:4,trust:3});resolve(s,[issueId]);s.flags.stallSupported=true;log(s,'黄美兰可以多休息一天，熟客也保留了固定相聚时间。');}
    else if(optionId==='startvote'){s.vote={support:58,active:true,approved:false};resolve(s,[issueId]);schedule(s,1,'ballot');log(s,'邻里更新投票开始：58%。支持率独立于居民信任。');}
    else if(optionId==='defer'){adjust(s,{trust:2});resolve(s,[issueId]);s.flags.seen_petition=false;schedule(s,60,'petition');log(s,'先安排局部改善，60 秒后重新征集更新意见。');}
    else if(optionId==='meeting'||optionId==='door'){
      if(!s.vote)return {ok:false,message:'需要先发起投票。'};
      if(s.flags['vote_'+optionId])return {ok:false,message:'这一轮意见征集已经完成，请尝试另一种安排。'};
      if((error=spend(s,optionId==='meeting'?8:0,optionId==='door'?3:0)))return error;
      s.flags['vote_'+optionId]=true;s.vote.support=Math.min(100,s.vote.support+(optionId==='meeting'?12:10));if(optionId==='meeting')adjust(s,{trust:3});
      if(s.vote.support>=75){s.vote.approved=true;s.vote.active=false;log(s,'居民投票达到 '+s.vote.support+'%，可以启动邻里更新。');}else log(s,'意见征集后，投票支持率为 '+s.vote.support+'%。');
      return {ok:true,message:'投票支持率 '+s.vote.support+'%。'+(s.vote.approved?'已达到推进门槛。':'尚未达到 75%。')};
    }
    else if(optionId==='build'){return play(s,'nrp',null);}
    else if(optionId==='good'){adjust(s,{trust:3});resolve(s,[issueId]);}
    else return {ok:false,message:'这个安排暂不可用。'};
    return {ok:true,message:'已回应：'+i.title+'。'};
  }
  function choose(s,issueId,optionId) {
    migrate(s);const before=snapshot(s),serial=s.eventSerial;
    const result=chooseInternal(s,issueId,optionId);
    if(result.ok&&serial===s.eventSerial){const action=card('action-'+optionId),id=action?action.id:optionId;emit(s,'decision',{cardId:id,issueId,optionId},before);root.CM_NEEDS?.recordAction(s,id);}
    return result;
  }
  function worsen(s,i) {
    const before=snapshot(s);
    i.stage++; const severe=i.stage>1; const amount=severe?5:4;
    const effects={route:{comfort:-amount,elders:-amount,trust:-2},noise:{social:-amount,renters:-amount,trust:-2},housing:{owners:-amount,trust:-2},waiting:{owners:-amount,trust:-2},care:{care:-amount,social:-2,trust:-2},land:{families:-3,care:-2,trust:-1},childcare:{families:-amount,trust:-1},carealt:{care:-amount,trust:-1},rumor:{social:-amount,trust:-2},stall:{social:-3,elders:-2},petition:{comfort:-2},ballot:{trust:-1},help:{social:-2},foodreturn:{}};
    adjust(s,effects[i.id]||{trust:-1});
    if(i.stage===1){i.body+='\n【后续】这件事已等待约一分钟，居民开始追问。';log(s,'等待中的变化：'+i.title+'。');}
    if(i.id==='route'&&i.stage===2){i.body+='\n黄美兰说她好几天没来；女儿提出接她离开。';log(s,'黄美兰留的位子空了几天。陈玉英的女儿开始讨论搬家。');}
    if(i.id==='noise'&&i.stage===2){i.body+='\n房东收到更多投诉，开始考虑结束学生的租约。';log(s,'噪音投诉升级，租户的居住稳定受到影响。');}
    if(i.id==='housing'&&i.stage===2)log(s,'拉赫曼夫妇的等待没有新进展，他们对管理者的信任降低。');
    emit(s,'worsen',{issueId:i.id,stage:i.stage,channel:i.channel||channel(i.id)},before);
  }
  function tick(s,dt) {
    if(!s.started||s.outcome||!Number.isFinite(dt)||dt<=0)return s;
    let remaining=dt;
    while(remaining>0&&!s.outcome){
      const step=Math.min(1,remaining);remaining-=step;s.time+=step;s.budget=Math.min(140,s.budget+0.4*step);
      const done=[];s.projects.forEach(p=>{p.remaining=Math.max(0,p.remaining-step);if(p.plotId)s.plots[p.plotId].remaining=p.remaining;if(p.remaining<=0)done.push(p);});
      done.forEach(p=>{s.projects=s.projects.filter(x=>x!==p);complete(s,p);});
      s.queue.sort((a,b)=>a.at-b.at);
      for(let n=0;n<s.queue.length;){const q=s.queue[n];if(q.at>s.time){n++;continue;}if(openIssue(s,q.kind))s.queue.splice(n,1);else n++;}
      s.issues.filter(i=>i.status==='open'&&!i.partialSupport).forEach(i=>{i.age+=step;if(i.age>=(i.stage+1)*60)worsen(s,i);});
      const m=metrics(s),promisesKept=!root.CM_NEEDS||root.CM_NEEDS.campaign(s).complete;if(promisesKept&&m.stay>=68&&m.social>=70&&m.comfort>=70)s.hold+=step;else s.hold=0;
      if(m.stay<25||m.social<25||m.comfort<25)s.danger+=step;else s.danger=0;
      if(s.hold>=60){s.outcome='win';log(s,root.CM_NEEDS?'出行委托已回访，三项目标同时稳定维持了 60 秒。本局完成。':'三项目标同时稳定维持了 60 秒。本局完成。');}
      else if(s.danger>=45){s.outcome='lose';log(s,'至少一项目标持续低于危险线 45 秒。社区需要重新安排支持。');}
    }
    return s;
  }
  root.CM_ENGINE={create:create,migrate:migrate,metrics:metrics,tick:tick,play:play,choose:choose,available:available,actionContext:actionContext,placementFor:placementFor};
})(typeof globalThis !== 'undefined' ? globalThis : window);
