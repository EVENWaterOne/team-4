/* Five days in Clementi. Planning is deliberate; waiting never creates money. */
(function (root) {
  'use strict';
  const MODE='campaign-v1', DAYS=5, STAFF=2, VISITS=2, INITIAL_BUDGET=36, DAILY_BUDGET=10, TARGET=10;
  const copy=value=>JSON.parse(JSON.stringify(value));
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number.isFinite(Number(value))?Number(value):min));
  const CATALOG=[
    {id:'chen',name:'陈玉英',title:'雨天的日常出行',keyProp:'chen-umbrella-2',intel:'她想亲自去食阁见熟人，不希望只把食物送上门。本周第1、3、5天有邻居顺路外出；她愿意同行，但要提前约定时间。第2、4天没有顺路邻居，仍需陪同或已经完成的有盖路线。',topic:'哪些日子有邻居顺路，能提前约好出发时间吗？'},
    {id:'rahman',name:'拉赫曼与努尔',title:'换房资料的下一步',keyProp:'rahman-folders-1',intel:'夫妻已经整理好主要资料，只缺一份清单和预约说明。先核对资料，可减少反复跑窗口；不能承诺配额豁免或房屋成交。',topic:'哪些资料已经准备好，哪一步最不清楚？'},
    {id:'lin',name:'林家',title:'工作与接送的安排',keyProp:'lin-calendar-1',intel:'祖母能承担一次接送，但必须提前知道准确时间。先把接送时段对齐，可以减少临时调派；这不等于正式托育已经解决。',topic:'家人可以帮哪一个时段，需要提前知道什么？'},
    {id:'kumar',name:'库马尔与德薇',title:'联系照护服务',keyProp:'kumar-calendar-1',intel:'德薇能在午休接电话，资料册已经放好。提前约定回电并列出材料，可以直接完成这次服务联系；转介不等于有人整天照护。',topic:'什么时候方便接服务人员电话，资料准备到了哪一步？'},
    {id:'students',name:'合租学生',title:'让聚会与邻居作息相容',keyProp:'students-desk-1',intel:'学生愿意把聚会改到傍晚，并在食阁相聚。只要先把时间说清，就不必占用工作人员全程协调。',topic:'聚会能否改时间或地点，让白天休息的邻居不受打扰？'},
    {id:'huang',name:'黄美兰',title:'熟客相聚与摊主休息',keyProp:'huang-calendar-3',intel:'她想多留半天休息，熟客也愿意提前知道营业安排。公布明确的休息和相聚时间，比要求她继续开摊更合适。',topic:'你希望休息哪一段，熟客需要提前知道什么？'},
    {id:'zhang',name:'张叔',title:'让居民说明自己的意见',keyProp:'zhang-folders-3',intel:'公开资料已经备好，可以先收集书面问题，再按时段说明。这样每户都有表达机会，不必把所有人同时叫到现场。',topic:'能否先收集问题，再安排分时说明？'},
    {id:'ali',name:'阿丽',title:'轮班后的白天休息',keyProp:'ali-calendar-3',intel:'她这周在白天补眠，希望把热闹活动移到傍晚。明确安静时段就能减少打扰；护士身份不代表她应免费照护邻居。',topic:'你最需要安静的时段是什么，哪些安排可以错开？'}
  ];
  const house=id=>CATALOG.find(item=>item.id===id);
  const TOPICS=['need','constraint','cooperate'];
  const SCHEDULE=[
    ['route','rest','care'],
    ['route','gathering','children'],
    ['route','rest','care'],
    ['route','stall','participation'],
    ['route','rest','housing']
  ];
  const CASES={
    route:{residentId:'chen',title:'雨天也想去食阁',detail:'陈玉英今天想出门见熟人，需要一个安全可行的安排。',automatic:'cover',options:[
      {id:'escort',title:'工作人员陪同',description:'用一名人手陪她走完今天的路线。',cost:2,staff:1,kind:'support',effect:'满足今天的出行；明天仍需安排。'},
      {id:'relay',title:'约好顺路同行',description:'先问清能配合的日子和时间；邻居并非每天都顺路。',cost:3,staff:0,kind:'support',requiresIntel:true,effect:'满足今天的出行，不占工作人员；只对本次约定生效，第2、4天不可用。'},
      {id:'cover',title:'投资有盖路线',description:'本次投入用于路线施工，今天仍没有陪同行动。',cost:24,staff:1,duration:2,kind:'investment',improvement:'cover',effect:'施工2天，从第3天起自动满足后续雨天出行。'}]},
    rest:{residentId:'ali',title:'白天需要安静休息',detail:'阿丽轮班后需要休息，今天的活动安排需要协调。',automatic:'quiet-agreement',options:[
      {id:'mediate',title:'逐一协调今天的作息',description:'由工作人员联系相关住户，协调今天的安静时段。',cost:4,staff:1,kind:'support',effect:'满足今天的休息安排。'},
      {id:'rest-window',title:'按排班错开活动',description:'按已确认时段联络相关住户，使用额外的协调预算。',cost:6,staff:0,kind:'agreement',requiresIntel:true,effect:'满足今天的休息；省下工作人员，需要更多联络预算。'},
      {id:'quiet-agreement',title:'建立社区作息约定',description:'用一天建立学生与轮班住户都参与的安排。',cost:12,staff:1,duration:1,kind:'investment',improvement:'quiet-agreement',effect:'今天用于协商，从明天起自动回应休息与聚会时段请求。'}]},
    gathering:{residentId:'students',title:'聚会怎样不打扰邻居',detail:'学生想相聚，需要把活动与邻居作息协调好。',automatic:'quiet-agreement',options:[
      {id:'organize',title:'工作人员现场协调',description:'安排一名工作人员组织今天的交流。',cost:4,staff:1,kind:'support',effect:'满足今天的聚会安排。'},
      {id:'reschedule',title:'改到合适的时间地点',description:'按已确认意愿协调场地与通知，使用额外的协调预算。',cost:6,staff:0,kind:'agreement',requiresIntel:true,effect:'满足今天的聚会；省下工作人员，需要更多联络预算。'},
      {id:'quiet-agreement',title:'建立社区作息约定',description:'用一天建立学生与轮班住户都参与的安排。',cost:12,staff:1,duration:1,kind:'investment',improvement:'quiet-agreement',effect:'今天用于协商，从明天起自动回应休息与聚会时段请求。'}]},
    care:{residentId:'kumar',title:'把照护服务联系落实',detail:'库马尔与德薇希望今天把申请资料和服务联系推进一步。',options:[
      {id:'service-call',title:'工作人员协助联系',description:'陪同整理并联系正式服务。',cost:4,staff:1,kind:'support',effect:'完成今天的联系约定；不承诺已经获得日间照护。'},
      {id:'book-call',title:'按日程预约回电',description:'按已确认时段与资料组织预约，使用额外的联络预算。',cost:7,staff:0,kind:'support',requiresIntel:true,effect:'完成今天的联系；省下工作人员，需要更多联络预算，正式照护仍要跟进。'}]},
    children:{residentId:'lin',title:'今天的接送还缺一环',detail:'林家需要把工作与孩子接送的时间对齐。',options:[
      {id:'family-support',title:'工作人员协助接驳',description:'安排人员协助今天的接送联络与交接。',cost:4,staff:1,kind:'support',effect:'满足今天的接送安排；不等于正式托育。'},
      {id:'family-slot',title:'与家人对齐接送时段',description:'按已确认的家人时段协调交接，使用额外的协调预算。',cost:6,staff:0,kind:'agreement',requiresIntel:true,effect:'满足今天的接送；省下工作人员，需要更多联络预算。'}]},
    stall:{residentId:'huang',title:'留出休息，也保留相聚',detail:'黄美兰希望今天的熟客知道安排，自己也能留出休息。',options:[
      {id:'stall-support',title:'工作人员协助通知',description:'协助通知熟客并安排今天的相聚。',cost:4,staff:1,kind:'support',effect:'落实今天的营业与休息安排。'},
      {id:'stall-hours',title:'公布已商量好的时段',description:'按本人意愿联络熟客，使用额外的通知与协调预算。',cost:6,staff:0,kind:'agreement',requiresIntel:true,effect:'落实今天的安排；省下工作人员，需要更多联络预算，不要求她继续开摊。'}]},
    participation:{residentId:'zhang',title:'把居民的问题听清楚',detail:'张叔需要让不同住户都有表达意见的机会。',options:[
      {id:'meeting-help',title:'工作人员协助说明会',description:'由工作人员在场整理和回应问题。',cost:4,staff:1,kind:'support',effect:'完成今天的意见收集与说明。'},
      {id:'written-questions',title:'先收问题，再分时说明',description:'组织已核实的资料与分时说明，使用额外的协调预算。',cost:6,staff:0,kind:'agreement',requiresIntel:true,effect:'完成今天的表达安排；省下工作人员，需要更多协调预算，正式投票另行计算。'}]},
    housing:{residentId:'rahman',title:'换房资料需要明确下一步',detail:'拉赫曼与努尔希望今天把资料清单与后续预约弄清楚。',options:[
      {id:'housing-help',title:'工作人员协助整理',description:'协助核对资料并联络咨询窗口。',cost:4,staff:1,kind:'support',effect:'明确今天的资料与预约下一步，不保证豁免或成交。'},
      {id:'housing-list',title:'按清单预约咨询',description:'按已核实资料协调咨询预约，使用额外的联络预算。',cost:6,staff:0,kind:'support',requiresIntel:true,effect:'明确今天的下一步；省下工作人员，需要更多联络预算，不保证豁免或成交。'}]}
  };
  function valid(s){return !!s&&s.mode===MODE;}
  function fail(message){return {ok:false,message};}
  function playable(s){return valid(s)&&s.phase==='plan'&&!s.outcome;}
  function log(s,text){s.history.unshift({day:s.day,text});s.history=s.history.slice(0,90);}
  function emit(s,type,meta){const event={id:++s.eventSerial,type,at:s.time,changes:{groups:{}},...meta};s.events.push(event);s.events=s.events.slice(-50);return event;}
  function syncCompatibility(s){
    const p=s.pressure;
    s.staffTotal=STAFF;s.staffUsed=s.phase==='plan'?planned(s).staff:0;
    s.groups={elders:Math.max(25,78-p.chen*12-p.huang*3),owners:Math.max(25,76-p.rahman*12),families:Math.max(25,76-p.lin*12),care:Math.max(25,76-p.kumar*12),renters:Math.max(25,76-p.students*8-p.ali*4)};
    s.social=clamp(64+(s.improvements['quiet-agreement']?12:0)-p.ali*3-p.students*3,0,100);
    s.comfort=clamp(48+(s.improvements.cover?20:0)-p.chen*3,0,100);
  }
  function create(seed='clementi-five-days'){
    const s={mode:MODE,schema:1,seed:String(seed).slice(0,80),day:1,maxDays:DAYS,phase:'plan',budget:INITIAL_BUDGET,visits:[],plans:{},intel:{},pressure:{},projects:[],improvements:{},improvementFrom:{},history:[],report:null,reports:[],met:0,total:0,outcome:null,time:0,trust:60,started:true,groups:{},social:64,comfort:48,staffTotal:STAFF,staffUsed:0,flags:{completed:{}},plots:{},events:[],eventSerial:0,issues:[],homeExplorations:{},caseTalks:[]};
    CATALOG.forEach(h=>{s.intel[h.id]={observed:[],talked:[]};s.pressure[h.id]=0;});
    (root.CM_DATA?.plots||[]).forEach(p=>{s.plots[p.id]={cardId:null,status:p.kind==='locked'?'locked':'available',remaining:0};});
    syncCompatibility(s);log(s,'五天，十五项日常请求。每一天先了解，再安排；等待不会增加预算。');return s;
  }
  function migrate(s){
    if(!valid(s))return create();
    s.schema=1;s.maxDays=DAYS;s.day=Math.floor(clamp(s.day,1,DAYS));s.budget=clamp(s.budget,0,INITIAL_BUDGET+(DAYS-1)*DAILY_BUDGET);
    if(!['plan','report','ended'].includes(s.phase))s.phase='plan';
    s.outcome=['win','mixed','lose'].includes(s.outcome)?s.outcome:null;if(s.outcome)s.phase='ended';
    s.visits=Array.isArray(s.visits)?[...new Set(s.visits.filter(id=>house(id)))].slice(0,VISITS):[];
    s.plans=s.plans&&typeof s.plans==='object'&&!Array.isArray(s.plans)?s.plans:{};
    s.homeExplorations=s.homeExplorations&&typeof s.homeExplorations==='object'?s.homeExplorations:{};
    s.intel=s.intel&&typeof s.intel==='object'?s.intel:{};s.pressure=s.pressure&&typeof s.pressure==='object'?s.pressure:{};
    for(const h of CATALOG){const r=s.intel[h.id]||{};s.intel[h.id]={observed:Array.isArray(r.observed)&&r.observed.includes(h.keyProp)&&s.homeExplorations[h.id]?.seen?.includes(h.keyProp)?[h.keyProp]:[],talked:Array.isArray(r.talked)?[...new Set(r.talked.filter(t=>TOPICS.includes(t)))]:[]};s.pressure[h.id]=Math.floor(clamp(s.pressure[h.id],0,3));}
    s.improvements=s.improvements&&typeof s.improvements==='object'?s.improvements:{};
    s.improvementFrom=s.improvementFrom&&typeof s.improvementFrom==='object'?s.improvementFrom:{};
    for(const id of ['cover','quiet-agreement'])if(s.improvements[id])s.improvementFrom[id]=Math.floor(clamp(s.improvementFrom[id]||s.day,1,DAYS+1));
    s.projects=Array.isArray(s.projects)?s.projects.filter(p=>p&&['cover','quiet-agreement'].includes(p.id)&&!s.improvements[p.id]).map(p=>({...p,remaining:Math.ceil(clamp(p.remaining,1,p.id==='cover'?2:1)),total:p.id==='cover'?2:1})):[];
    s.history=Array.isArray(s.history)?s.history.slice(0,90):[];s.reports=Array.isArray(s.reports)?s.reports.slice(0,DAYS):[];
    s.met=Math.floor(clamp(s.met,0,15));s.total=Math.floor(clamp(s.total,0,15));s.time=clamp(s.time,0,DAYS*60);s.trust=clamp(s.trust,0,100);s.started=true;
    s.flags=s.flags&&typeof s.flags==='object'?s.flags:{};s.flags.completed=s.flags.completed||{};s.plots=s.plots||{};
    (root.CM_DATA?.plots||[]).forEach(p=>{if(!s.plots[p.id])s.plots[p.id]={cardId:null,status:p.kind==='locked'?'locked':'available',remaining:0};});
    s.events=Array.isArray(s.events)?s.events.slice(-50):[];s.eventSerial=Math.max(Number(s.eventSerial)||0,...s.events.map(e=>Number(e.id)||0));s.issues=[];
    s.caseTalks=Array.isArray(s.caseTalks)?s.caseTalks.slice(-80):[];
    const check=validatePlans(s,s.plans);if(!check.ok)s.plans={};syncCompatibility(s);return s;
  }
  function households(){return copy(CATALOG);}
  function intel(s,id){
    const h=house(id);if(!valid(s)||!h)return null;const r=s.intel[id]||{observed:[],talked:[]},observed=r.observed.includes(h.keyProp),talked=r.talked.length>0,unlocked=observed&&r.talked.some(t=>t==='constraint'||t==='cooperate');
    return {known:talked,observed,talked,unlocked,title:talked?h.title:'还没有听本人说明',detail:unlocked?h.intel:talked?'已经了解日常困难。查看关键物件，再问清时段、已有帮助或能否协作。':observed?'看到了关键物件。走近居民，问清它与今天安排的关系。':'先入户观察，再向本人了解一条能改变安排的条件。'};
  }
  function requests(s){
    if(!valid(s))return [];
    return SCHEDULE[s.day-1].map(kind=>{const c=CASES[kind],automatic=!!(c.automatic&&s.improvements[c.automatic]&&(s.improvementFrom?.[c.automatic]||1)<=s.day),known=intel(s,c.residentId),id='d'+s.day+'-'+kind;
      const options=c.options.map(o=>{let unlocked=true,reason='';if(automatic){unlocked=false;reason='长期安排已经自动回应，不必重复投入。';}else if(o.id==='relay'&&![1,3,5].includes(s.day)){unlocked=false;reason='今天没有可配合的顺路邻居。已知约定仍保留，改用陪同或已完成的有盖路线。';}else if(o.requiresIntel&&!known.unlocked){unlocked=false;reason='先查看本户关键物件，并问清约束或协作条件。';}else if(o.improvement&&s.improvements[o.improvement]){unlocked=false;reason='这项长期安排已经建立。';}else if(o.improvement&&s.projects.some(p=>p.id===o.improvement)){unlocked=false;reason='这项长期安排正在进行。';}else if(o.duration&&s.day+o.duration>DAYS){unlocked=false;reason='本次五天内已来不及投入使用。';}return {...copy(o),duration:o.duration||0,unlocked,reason,effect:o.duration?'今天用于筹备，不满足今天请求；从第'+(s.day+o.duration)+'天起，后续对应请求自动满足。':o.effect};});
      let detail=kind==='care'&&s.day===3?'上次联系之后，今天需要核对回电与材料的后续。':c.detail;
      if(kind==='route')detail+=[1,3,5].includes(s.day)?'今天有邻居顺路外出，能否同行需要提前商量。':'今天没有顺路邻居，需要另派陪同人手或使用已完成的有盖路线。';
      return {id,kind,residentId:c.residentId,title:c.title,detail,pressure:s.pressure[c.residentId],automatic,options};
    });
  }
  function visit(s,id){
    if(!playable(s))return fail('现在不能新增走访，请先开始下一天。');if(!house(id))return fail('没有找到这户居民。');
    if(s.visits.includes(id))return {ok:true,message:'今天已走访过这户，重进不再消耗次数。',revisit:true};
    if(s.visits.length>=VISITS)return fail('今天的两次走访已经用完。可以按已知信息安排，明天再拜访。');
    s.visits.push(id);log(s,'走访'+house(id).name+'。');return {ok:true,message:'进入一家，问清一个能改变安排的条件。',revisit:false};
  }
  function observe(s,id,propId){
    const h=house(id);if(!playable(s)||!h||!s.visits.includes(id))return fail('先进入今天走访的这户。');
    if(propId!==h.keyProp||!s.homeExplorations[id]?.seen?.includes(propId))return fail('这条线索还没有在本户实际观察到。');
    const r=s.intel[id];if(!r.observed.includes(propId))r.observed.push(propId);
    return {ok:true,message:intel(s,id).unlocked?'关键线索与本人说明已经对上，可以使用适配方案。':'记下了关键线索，再问问本人具体的安排条件。'};
  }
  function recordTalk(s,id,topic){
    if(!playable(s)||!house(id)||!s.visits.includes(id))return fail('这次交流不属于当前走访。');if(!TOPICS.includes(topic))return fail('没有识别这类交流主题。');
    const r=s.intel[id];if(!r.talked.includes(topic))r.talked.push(topic);
    return {ok:true,message:intel(s,id).unlocked?'线索与约束已确认，新的适配方案已可用。':'已经听到本人的说明；关键物件与具体条件会帮助你安排。'};
  }
  function validatePlans(s,plans){
    const today=requests(s),items=[],improvements=new Set();
    for(const [requestId,optionId] of Object.entries(plans)){
      const request=today.find(r=>r.id===requestId),option=request?.options.find(o=>o.id===optionId);
      if(!request||!option)return fail('今天的请求或行动已经变化，请重新选择。');if(!option.unlocked)return fail(option.reason);
      if(option.improvement&&improvements.has(option.improvement))return fail('同一长期安排不能重复投入。');if(option.improvement)improvements.add(option.improvement);
      items.push({requestId,optionId,title:option.title,residentId:request.residentId,cost:option.cost,staff:option.staff,kind:option.kind,duration:option.duration});
    }
    const cost=items.reduce((n,i)=>n+i.cost,0),staff=items.reduce((n,i)=>n+i.staff,0);
    if(cost>s.budget)return fail('预算还差'+(cost-s.budget)+'。撤回其他安排或换一个方案；空等不会补钱。');
    if(staff>STAFF)return fail('今天只有两名工作人员。需要调整安排，或通过走访寻找不占人手的办法。');
    return {ok:true,items,cost,staff,remainingBudget:s.budget-cost,remainingStaff:STAFF-staff};
  }
  function planned(s){
    if(!valid(s))return {items:[],cost:0,staff:0,remainingBudget:0,remainingStaff:STAFF};
    const result=validatePlans(s,s.plans||{});return result.ok?{items:result.items,cost:result.cost,staff:result.staff,remainingBudget:result.remainingBudget,remainingStaff:result.remainingStaff}:{items:[],cost:0,staff:0,remainingBudget:s.budget,remainingStaff:STAFF,error:result.message};
  }
  function plan(s,requestId,optionId){
    if(!playable(s))return fail('现在不能改动安排，请先开始下一天。');const next={...s.plans,[requestId]:optionId},check=validatePlans(s,next);if(!check.ok)return check;
    s.plans=next;s.staffUsed=check.staff;return {ok:true,message:'已放进今天的安排。推进一天时才扣预算，之前可以撤回。'};
  }
  function unplan(s,requestId){
    if(!playable(s))return fail('今天已经结算，不能撤回。');if(!Object.prototype.hasOwnProperty.call(s.plans,requestId))return fail('这项请求还没有排进行动。');
    delete s.plans[requestId];s.staffUsed=planned(s).staff;return {ok:true,message:'已经撤回，预算与人手仍可重新安排。'};
  }
  function completeProject(s,p){
    s.improvements[p.id]=true;s.improvementFrom[p.id]=s.day+1;
    if(p.id==='cover'){s.flags.completed.cover=true;s.flags.routeCovered=true;s.plots['route-west']={cardId:'cover',status:'complete',remaining:0,placement:{x:0,z:0,rotation:0},completedAt:s.time};}
    if(p.id==='quiet-agreement'){s.flags.quietHoursAgreed=true;s.flags.noiseResolved=true;}
    emit(s,'complete',{cardId:p.cardId,plotId:p.plotId||null});log(s,p.title+'已完成，从下一天开始减少重复调派。');
  }
  function resolveDay(s){
    if(!playable(s))return fail('这一天已经推进过了。');const check=validatePlans(s,s.plans);if(!check.ok)return check;
    const today=requests(s),results=[],completed=[];s.budget-=check.cost;s.time=s.day*60;
    for(const request of today){const choice=s.plans[request.id],option=request.options.find(o=>o.id===choice),met=request.automatic||!!(option&&option.kind!=='investment');
      const status=met?'met':option?.kind==='investment'?'partial':'deferred';
      let text=request.automatic?'之前建立的长期安排已经自动回应，今天没有再占用人手或预算。':met?option.effect:option?.kind==='investment'?'今天的人手用于长期筹备，这项今天的需要仍然延期；未来会减少重复调派。':'今天没有排到支持，这户的压力增加。下一天仍可重新安排。';
      if(option?.kind==='investment'){
        const id=option.improvement,project={id,title:option.title,cardId:id==='cover'?'cover':'action-mediate',plotId:id==='cover'?'route-west':null,remaining:option.duration,total:option.duration,startedDay:s.day};
        s.projects.push(project);if(project.plotId)s.plots[project.plotId]={cardId:'cover',status:'building',remaining:project.remaining,placement:{x:0,z:0,rotation:0}};
        emit(s,'start',{cardId:project.cardId,plotId:project.plotId});
      }
      s.pressure[request.residentId]=clamp(s.pressure[request.residentId]+(met?-1:1),0,3);
      results.push({requestId:request.id,residentId:request.residentId,title:request.title,status,text});
    }
    const met=results.filter(r=>r.status==='met').length;s.met+=met;s.total+=today.length;s.trust=clamp(s.trust+met-(today.length-met)*2,0,100);
    for(const p of s.projects){p.remaining--;if(p.plotId&&s.plots[p.plotId])s.plots[p.plotId].remaining=p.remaining;if(p.remaining<=0){completeProject(s,p);completed.push({id:p.id,title:p.title});}}
    s.projects=s.projects.filter(p=>p.remaining>0);s.plans={};s.staffUsed=0;
    if(s.day===DAYS){const highPressure=Object.values(s.pressure).some(v=>v>=3);s.outcome=s.met>=TARGET&&!highPressure?'win':s.met>=7?'mixed':'lose';s.phase='ended';}else s.phase='report';
    const nextTypes=SCHEDULE[s.day]||[],nextNames=nextTypes.map(kind=>house(CASES[kind].residentId).name).join('、');
    const routeForecast=[2,4].includes(s.day+1)?'明天没有顺路同行，请预留陪同人手或依靠已完成的有盖路线。':'明天有顺路邻居，仍需提前问清约定。';
    s.report={day:s.day,results,completed,spent:check.cost,met,total:today.length,nextHint:s.day<DAYS?'明天仍有三项请求：'+nextNames+'。'+routeForecast+'剩余预算保留，并补给10；两名人手和两次走访重新可用。':'五天结束。回看兑现的约定、仍有压力的家庭与留下的长期安排。'};
    s.reports.push(copy(s.report));log(s,'第'+s.day+'天完成'+met+'/'+today.length+'项请求，使用预算'+check.cost+'。');syncCompatibility(s);return {ok:true,message:'今天的结果已经记录。',report:copy(s.report)};
  }
  function nextDay(s){
    if(!valid(s)||s.phase!=='report'||s.day>=DAYS||s.outcome)return fail('现在不能开始下一天。');s.day++;s.phase='plan';s.budget+=DAILY_BUDGET;s.visits=[];s.plans={};s.report=null;s.staffUsed=0;log(s,'第'+s.day+'天开始：补给10预算，人手与走访次数恢复。');syncCompatibility(s);return {ok:true,message:'今天有新的安排要作决定。'};
  }
  function summary(s){
    if(!valid(s))return null;let title='先了解，再排今天的行动',detail='每天三项请求、两名人手、两次走访。长期安排会减少后续的重复工作。';
    const pressure=Object.values(s.pressure).reduce((n,v)=>n+v,0),longTerm=Object.keys(s.improvements).filter(id=>s.improvements[id]).length;
    if(s.outcome==='win'){title=longTerm?'日常开始自己运转':'承诺兑现，支援仍靠你';detail='兑现'+s.met+'/15项日常约定，'+longTerm+'项长期安排留下来。'+(longTerm?'今后有些需要不用每次重新派人。':'你靠临时支援稳住了本周；下一步可以减少重复调派。');}
    else if(s.outcome==='mixed'){title='撑过了五天，仍有约定待补';detail='兑现'+s.met+'/15项。回看哪些家庭延期、哪些投资来得太晚，再尝试另一种安排。';}
    else if(s.outcome==='lose'){title='安排没能跟上日常需要';detail='兑现'+s.met+'/15项。下次可以先问清约束，或更早投资能反复发挥作用的安排。';}
    return {day:s.day,maxDays:DAYS,phase:s.phase,met:s.met,total:s.total,target:TARGET,pressure,outcome:s.outcome,title,detail,longTerm};
  }
  root.CM_CAMPAIGN={create,migrate,households,requests,visit,observe,recordTalk,intel,plan,unplan,planned,resolveDay,nextDay,summary};
})(typeof window!=='undefined'?window:globalThis);
