(function (root) {
  'use strict';
  // A fixed rules catalogue: dialogue supplies evidence, never costs or effects.
  const CATALOG = [
    {id:'chen',nameEn:'Mdm Chen',title:['雨天也能去食阁','Reach the hawker centre in the rain'],issues:['route','foodreturn'],direct:['cover'],partial:['ramp','ease','visits'],limit:['坡道改善高差，EASE改善屋内安全；仍需补足屋外遮雨。','Ramps help level changes and EASE helps at home; the outdoor route still needs shelter.'],improved:['有盖路线已完工，回访确认雨天出行得到改善。','The sheltered route is complete; the follow-up confirms easier rainy-day outings.']},
    {id:'rahman',nameEn:'Rahman and Noor',title:['清楚换房的下一步','Know the next housing step'],issues:['housing','waiting'],direct:['appeal','action-advice','action-advice2'],partial:['action-extend'],limit:['延长安排只争取时间，仍需具体咨询或个案跟进。','An extension buys time; advice or individual follow-up is still needed.'],improved:['已核实咨询或个案受理的下一步；不代表豁免获批或房屋已成交。','The advice or case-review next step is checked; this does not guarantee an exemption or sale.']},
    {id:'lin',nameEn:'The Lin family',title:['附近有儿童与托育支持','Nearby support for children and childcare'],issues:['land','childcare'],direct:['child'],partial:['ramp','event','action-small'],limit:['通行、交流和亲子支持各有帮助，但不能当成正式托育已经落实。','Access, social events and family support help in different ways; they do not establish formal childcare.'],improved:['儿童与托育支持空间已完成并回访；具体服务与家庭压力仍需继续留意。','The children and family-support space is completed and reviewed; keep checking actual services and family pressures.']},
    {id:'kumar',nameEn:'Kumar and Devi',title:['白天照护需要可靠的支持','Reliable support for daytime caregiving'],issues:['care','carealt','land'],direct:[],partial:['aac','visits','cca','action-refer'],limit:['已获得活动、友伴、转介或住房方向的支持；正式白天照护仍需跟进。','Activities, companionship, referrals or a housing option provide support; formal daytime care still needs follow-up.'],improved:[]},
    {id:'students',nameEn:'Student tenants',title:['约好生活与安静时段','Agree everyday and quiet hours'],issues:['noise','help'],direct:['action-mediate'],partial:['corner','event','action-accept','action-light'],limit:['相遇与互助能建立关系，仍需本人参与明确的作息约定。','Meeting and helping build ties; the residents still need to agree explicit quiet hours.'],improved:['已共同约定作息并回访；继续留意约定是否在日常执行。','Quiet hours were agreed together and reviewed; keep checking how the agreement works.']},
    {id:'huang',nameEn:'Mdm Huang',title:['保留相聚，也能安心休息','Keep meeting while making room for rest'],issues:['stall'],direct:['action-support','action-corner'],partial:['corner','event','cover'],limit:['相聚空间或路线已经改善，仍要向摊主核实营业与休息安排。','Meeting space or access has improved; her working and rest arrangements still need to be checked.'],improved:['已回访营业和相聚安排，给她保留休息空间；继续经营不是义务。','The stall and gathering arrangements were reviewed with room for rest; continuing work is not an obligation.']},
    {id:'zhang',nameEn:'Uncle Zhang',title:['让居民理解程序并表达意见','Help residents understand and take part'],issues:['petition','ballot'],direct:['action-meeting','action-door'],partial:['action-startvote','action-explain','action-talk','nrp'],limit:['启动程序或完成工程不代表每户已理解；意见征集与信任分别记录。','Starting a process or finishing works does not mean every household understands; voting and trust stay separate.'],improved:['已说明工程或逐户听取意见，并回访表达机会；投票门槛仍独立计算。','Works were explained or views heard door to door, with participation reviewed; the vote threshold stays independent.']},
    {id:'ali',nameEn:'Ali',title:['白天也能安静休息','Rest quietly during the day'],issues:['noise'],direct:['action-mediate'],partial:['corner','event'],limit:['邻里相遇不能替代适合轮班作息的安静约定，也不要求她免费照护邻居。','Meeting neighbours does not replace quiet hours for shift work or oblige her to provide free care.'],improved:['已核实安静约定覆盖轮班休息需要；继续观察实际执行。','The quiet-hours agreement was checked against shift-work rest needs; keep observing its use.']}
  ];
  const labels = {
    unknown:['待了解','To understand'],confirmed:['已确认','Confirmed'],in_progress:['处理中','In progress'],
    review:['待回访','Follow up'],improved:['已改善','Improved'],partial:['部分帮助','Partial support']
  };
  const pick = (pair,lang) => pair[lang==='en'?1:0];
  const spec = id => CATALOG.find(item=>item.id===id);
  const actionIds = new Set(CATALOG.flatMap(item=>item.direct.concat(item.partial)).filter(id=>id.startsWith('action-')));
  const clean = value => typeof value==='string' ? value.trim().slice(0,120) : '';
  function ensure(s) {
    if (!s || typeof s!=='object') return null;
    let n=s.residentNeeds;
    if(!n||typeof n!=='object'||Array.isArray(n))n=s.residentNeeds={};
    n.version=1;if(!spec(n.focus))n.focus='chen';
    if(!n.records||typeof n.records!=='object'||Array.isArray(n.records))n.records={};
    if(!n.actions||typeof n.actions!=='object'||Array.isArray(n.actions))n.actions={};
    // Recover real immediate decisions from existing engine events during migration.
    for(const event of Array.isArray(s.events)?s.events:[]){
      if(event?.type==='decision'&&actionIds.has(event.cardId))n.actions[event.cardId]=true;
    }
    for(const item of CATALOG){
      let r=n.records[item.id];if(!r||typeof r!=='object'||Array.isArray(r))r=n.records[item.id]={};
      r.confirmed=r.confirmed===true;
      r.sources=Array.isArray(r.sources)?[...new Set(r.sources.map(clean).filter(Boolean))].slice(-12):[];
      r.reviewedCards=Array.isArray(r.reviewedCards)?r.reviewedCards.filter(id=>item.direct.includes(id)||item.partial.includes(id)):[];
    }
    return n;
  }
  function recordAction(s,id){const n=ensure(s);if(n&&actionIds.has(id))n.actions[id]=true;return !!(n&&actionIds.has(id));}
  function hasDialogue(s,id){return (Array.isArray(s.residentTalks)?s.residentTalks:[]).some(visit=>visit?.residentId===id&&Array.isArray(visit.exchanges)&&visit.exchanges.length>0);}
  function knownIssue(s,item){return (Array.isArray(s.issues)?s.issues:[]).some(issue=>{
    if(!item.issues.includes(issue.id))return false;
    // A visible map prompt is a clue; its account is evidence only once read.
    return issue.read===true;
  });}
  function finished(s,id,n){return id.startsWith('action-')?n.actions[id]===true:s.flags?.completed?.[id]===true;}
  function progress(s,item,n){
    const r=n.records[item.id],all=item.direct.concat(item.partial);
    const completed=all.filter(id=>finished(s,id,n));
    const direct=completed.filter(id=>item.direct.includes(id));
    const underway=(Array.isArray(s.projects)?s.projects:[]).filter(p=>all.includes(p.cardId));
    let status='unknown';
    if(r.confirmed){
      if(direct.some(id=>r.reviewedCards.includes(id)))status='improved';
      else if(underway.length)status='in_progress';
      else if(completed.some(id=>!r.reviewedCards.includes(id)))status='review';
      else if(completed.length)status='partial';
      else status='confirmed';
    }
    return {status,completed,direct,underway};
  }
  function get(s,id,lang='zh'){
    const item=spec(id),n=ensure(s);if(!item||!n)return null;
    const r=n.records[id],p=progress(s,item,n),en=lang==='en';
    const resident=root.CM_DATA?.residents?.find(v=>v.id===id),name=en?(resident?.nameEn||item.nameEn):(resident?.name||item.nameEn);
    const heard=hasDialogue(s,id),known=knownIssue(s,item),canConfirm=!r.confirmed&&(heard||known);
    const canReview=r.confirmed&&p.completed.some(card=>!r.reviewedCards.includes(card))&&!p.underway.length;
    let detail,nextAction='resident',nextLabel=en?'Visit this household':'拜访这户';
    if(p.status==='unknown'){
      detail=canConfirm?pick(['已经听到本人的困难，可以确认这项需求，再回社区安排。','You have heard the household’s difficulty. Confirm it before planning.'],lang):pick([r.sources.length?'线索已经记录。走近住户，问清最希望先改善的困难。':'先观察或与本人交谈，了解一项具体生活困难。',r.sources.length?'The observation is recorded. Ask what difficulty matters most.':'Observe or speak with the household to understand one concrete difficulty.'],lang);
      nextLabel=canConfirm?pick(['确认居民需求','Confirm the need'],lang):nextLabel;
    }else if(p.status==='confirmed'){
      detail=pick(['需求已确认。比较直接改善与部分帮助，再选择行动。','Need confirmed. Compare direct improvement with partial support, then choose an action.'],lang);nextAction='card';nextLabel=pick(['比较改善方案','Compare actions'],lang);
    }else if(p.status==='in_progress'){
      const remain=Math.ceil(Math.max(...p.underway.map(v=>Number(v.remaining)||0)));
      detail=pick(['关联安排正在执行，约剩'+remain+'经营秒。回到社区让时间推进。','Related work is underway, about '+remain+' simulation seconds left. Return to the neighbourhood to continue.'],lang);nextAction='card';nextLabel=pick(['查看正在进行的安排','View current work'],lang);
    }else if(p.status==='review'){
      detail=pick(['措施已经完成，回访本人，记录改善和仍然存在的困难。','The action is complete. Follow up to record improvements and remaining difficulties.'],lang);nextAction='review';nextLabel=pick(['回访核实结果','Check the result'],lang);
    }else if(p.status==='partial'){
      detail=pick(item.limit,lang);nextAction='card';nextLabel=pick(['继续补足支持','Find further support'],lang);
    }else{
      detail=pick(item.improved,lang);nextLabel=pick(['回看这户结果','Review this household'],lang);
    }
    return {id,name,title:(r.confirmed||heard||known)?pick(item.title,lang):pick(['听听这户的日常','Listen to life in this household'],lang),status:p.status,label:pick(labels[p.status],lang),detail,nextAction,nextLabel,directCards:item.direct.slice(),partialCards:item.partial.slice(),canConfirm,canReview,sources:r.sources.slice(),completedCards:p.completed.slice(),underwayCards:p.underway.map(v=>v.cardId),confirmed:r.confirmed};
  }
  function list(s,lang='zh'){ensure(s);return CATALOG.map(item=>get(s,item.id,lang));}
  function focus(s){return ensure(s)?.focus||'chen';}
  function setFocus(s,id){const n=ensure(s);if(!n||!spec(id))return false;n.focus=id;return true;}
  function observe(s,id,source='home'){
    const n=ensure(s);if(!n||!spec(id))return false;const text=clean(source);if(!text)return false;
    const r=n.records[id];if(!r.sources.includes(text)){r.sources.push(text);r.sources=r.sources.slice(-12);}return true;
  }
  function log(s,text){if(!Array.isArray(s.history))s.history=[];s.history.unshift({time:Number(s.time)||0,text});s.history=s.history.slice(0,70);}
  function confirm(s,id,source){
    const item=spec(id),n=ensure(s);if(!item||!n)return {ok:false,message:'没有找到这户需求。'};
    const valid=source==='dialogue'?hasDialogue(s,id):source==='issue'?knownIssue(s,item):false;
    if(!valid)return {ok:false,message:'先听本人说明，或查看与这户有关的有效委托。'};
    const r=n.records[id];if(r.confirmed)return {ok:false,message:'这项需求已经确认。'};
    r.confirmed=true;r.confirmedAt=Number(s.time)||0;if(!r.sources.includes(source))r.sources.push(source);
    log(s,'确认需求：'+pick(item.title,'zh')+'。');return {ok:true,message:'需求已确认，可以回社区比较方案。'};
  }
  function review(s,id){
    const item=spec(id),n=ensure(s);if(!item||!n)return {ok:false,message:'没有找到这户需求。'};
    const r=n.records[id],p=progress(s,item,n);
    if(!r.confirmed)return {ok:false,message:'先向本人确认这项需要，再记录回访。'};
    if(p.underway.length||!p.completed.length)return {ok:false,message:'相关安排尚未完成，先回社区等待。'};
    if(!p.completed.some(card=>!r.reviewedCards.includes(card)))return {ok:false,message:'这次改善已经回访记录。'};
    r.reviewedCards=[...new Set(r.reviewedCards.concat(p.completed))];r.reviewedAt=Number(s.time)||0;
    const result=get(s,id);log(s,'回访'+result.name+'：'+result.label+'。'+result.detail);
    return {ok:true,message:result.detail,status:result.status};
  }
  function campaign(s,lang='zh'){
    const need=get(s,'chen',lang);return {complete:need?.status==='improved',title:pick(['本局委托：雨天也能去食阁','This game: reach the hawker centre in the rain'],lang),detail:need?.detail||'',status:need?.status||'unknown',residentId:'chen'};
  }
  function related(s,cardId,lang='zh'){
    const item=spec(focus(s)),need=get(s,item.id,lang);
    if(item.id!=='chen'&&need.status==='unknown'&&!need.canConfirm)return {kind:'other',label:pick(['先了解需求','Understand first'],lang),detail:pick(['先向这户了解日常困难，再判断行动能提供什么帮助。','Understand this household’s daily difficulty before judging how an action could help.'],lang)};
    const kind=item.direct.includes(cardId)?'direct':item.partial.includes(cardId)?'partial':'other';
    return {kind,label:pick(kind==='direct'?['直接回应','Direct response']:kind==='partial'?['部分帮助','Partial support']:['其他需要','Another need'],lang),detail:kind==='direct'?pick(['回应当前关注：','Responds to: '],lang)+pick(item.title,lang):kind==='partial'?pick(item.limit,lang):pick(['这项行动不直接回应当前关注的需求，仍可用于其他安排。','This action does not directly address the focused need; it can support other plans.'],lang)};
  }
  root.CM_NEEDS={ensure,list,get,setFocus,focus,observe,confirm,review,campaign,related,recordAction};
})(typeof globalThis!=='undefined'?globalThis:window);
