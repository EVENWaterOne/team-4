(function (root) {
  'use strict';
  const nrp = { title: 'HDB · 邻里更新计划（NRP）', url: 'https://www.hdb.gov.sg/managing-my-home/upgrading-and-redevelopment/neighbourhood-renewal-programme-nrp', text: 'NRP 可改善公共空间、有盖走廊及无障碍设施；须有至少 75% 合资格屋主支持。预算、工期与效果数值为试玩设定。' };
  const ease = { title: 'HDB · 乐龄易（EASE）', url: 'https://www.hdb.gov.sg/managing-my-home/upgrading-and-redevelopment/enhancement-for-active-seniors-ease', text: 'EASE 改善住宅内及入口的长者安全与便利；不会替代屋外有盖路线。游戏中的经费与工期为试玩设定。' };
  const aac = { title: 'AIC · Active Ageing Centres', url: 'https://www.aic.sg/care-services/active-ageing-centres', text: '乐龄活动中心提供活动、友伴及信息转介。普通 AAC 并不等于日间照护中心；游戏中照护家庭受益指获得支持与转介。数值为试玩设定。' };
  const cca = { title: 'MOH · Community Care Apartments', url: 'https://www.moh.gov.sg/newsroom/age-eligibility-for-community-care-apartments-lowered-from-65-to-55-years-old---monthly-fees-reduced-by-18--to-75--with-new-subsidies-/', text: '社区关怀公寓结合适老住房与服务。这里模拟在社区增加住房及服务选择，未复刻真实申请资格、费用或审批。用地、工期与数值为试玩设定。' };
  const appeal = { title: 'CEA · EIP 与回购援助', url: 'https://www.cea.gov.sg/about-cea/newsroom-publications/ceanergy-blog/five-things-you-need-to-know-about-the-ethnic-integration-policy-buyback-assistance/', text: 'EIP 旨在促进族群融合；面临困难的屋主可寻求援助，HDB 按个案审理。游戏只模拟准备与受理申诉，不保证豁免或成交；楼栋状态、居民与数值均为虚构。' };
  const invented = { title: '设计取舍 · 非特定政策复刻', url: '', text: '这张牌用于测试同一片地如何分配、不同家庭如何得到支持；不是金文泰真实地块、真实项目或获批计划。全部数值为试玩设定。' };
  root.CM_DATA = {
    groups: { elders: '长期居住的长者', owners: '需要换房的屋主', families: '年轻家庭', care: '照护家庭', renters: '租户' },
    residents: [
      { id: 'chen', name: '陈玉英', age: '78', role: '独居长者', home: '旧组屋 A · 三房式', summary: '在这里住了四十多年。清晨常到食阁喝咖啡，最近因膝盖不适、雨天难走而少出门。', wants: '希望继续住在熟悉的社区，也能安全地去食阁。', relations: ['黄美兰每天替她留位子。', '张叔隔几天来探望。', '楼上的学生夜间活动令她睡不好。', '阿丽偶尔在电梯里帮她按楼层。'], group: 'elders' },
      { id: 'rahman', name: '拉赫曼与努尔', age: '63 / 60', role: '想换小屋的长期屋主', home: '旧组屋 B · 四房式', summary: '退休巴士车长与妻子住了三十多年。孩子已搬出，想换小屋，转售却一直没有进展。', wants: '得到清楚、可信的换房支持，而不只是继续等待。', relations: ['张叔帮他们联系援助，也转述邻居的担心。'], group: 'owners' },
      { id: 'lin', name: '林志豪与周佳颖', age: '35 / 33', role: '有两个孩子的年轻家庭', home: '新组屋 C · 四房式', summary: '搬来三年，家中有四岁和一岁的孩子。两人都工作，由林太白天帮忙照看。', wants: '更近的儿童活动与托育空间，也不希望祖母带孩子绕远。', relations: ['林太常在游乐场边与陈玉英聊天。', '关心花园地块会怎样使用。'], group: 'families' },
      { id: 'kumar', name: '库马尔与德薇', age: '48 / 45', role: '与长辈同住的照护家庭', home: '旧组屋 B · 五房式', summary: '两个孩子念中学，德薇八十二岁的母亲也同住。夫妻轮流请假照料，几乎没有自己的时间。', wants: '白天有可靠的照护支持，并知道哪些服务可以申请。', relations: ['黄美兰认识德薇的母亲，偶尔为她留一份小菜。'], group: 'care' },
      { id: 'students', name: '四位合租学生', age: '20–24', role: '来自不同地方的学生租户', home: '旧组屋 A · 楼上四房式', summary: '在附近高校读书，晚归与偶尔聚会打乱了邻居休息。他们还不熟悉楼里的日常约定。', wants: '保留生活空间，也希望能够与邻居说得上话。', relations: ['与楼下陈玉英有噪音摩擦。', '可以通过食阁活动认识黄美兰和老邻居。'], group: 'renters' },
      { id: 'huang', name: '黄美兰', age: '66', role: '食阁摊主', home: '食阁 · 炒粿条摊', summary: '在这里做了三十多年。她的摊位也是长者每天碰面的地方，最近开始考虑什么时候退休。', wants: '让熟客仍有相聚的地方，也给自己安排喘息的时间。', relations: ['每天见到陈玉英，很容易察觉她是否缺席。', '认识德薇的母亲。', '愿意帮忙介绍学生与长者认识。'], group: 'elders' },
      { id: 'zhang', name: '张叔', age: '71', role: '居委会志愿者', home: '旧组屋 B · 居民联络点', summary: '退休后参与居委会，认识许多老住户。热心串门，也会把听到的说法带给别人。', wants: '让居民知道决定怎样做出，并能表达意见。', relations: ['探望陈玉英。', '替拉赫曼夫妇牵线。', '他的转述需要向当事人核实。'], group: 'elders' },
      { id: 'ali', name: '阿丽', age: '29', role: '轮班护士、租户', home: '旧组屋 A · 小户型', summary: '近年搬来，轮班让休息时段与别人不同。和邻居不太熟，偶尔在电梯里遇到陈玉英。', wants: '白天也能安静休息，并找到适合轮班作息的相处方式。', relations: ['与陈玉英偶尔在电梯见面。', '学生的夜间活动也可能影响她休息。', '职业不意味着她能无偿承担邻里照护。'], group: 'renters' }
    ],
    plots: [
      { id: 'route', name: '食阁—车站步行段', kind: 'route', x: 727, y: 496, description: '现有露天步行段；可加建有盖走廊，不占花园地块。' },
      { id: 'void', name: 'A 栋底层空间', kind: 'void', x: 321, y: 382, description: '目前闲置的底层公共空间；可改成居民角。' },
      { id: 'room', name: '社区空置房间', kind: 'room', x: 565, y: 267, description: '一间可改装的社区房间；可设乐龄活动中心。' },
      { id: 'garden', name: '街角花园地块', kind: 'garden', x: 887, y: 310, description: '唯一较大的演示地块；社区关怀公寓与儿童设施争用此处。建设会减少现有绿地。' },
      { id: 'crossing', name: '旧组屋出口与过街处', kind: 'crossing', x: 572, y: 473, description: '现有高差与绕行处；可增设坡道和无障碍接驳。' },
      { id: 'locked', name: '既有建筑与规划保留区', kind: 'locked', x: 1018, y: 568, description: '已有用途、不可建设。这里的边界只是玩法演示，未核实真实规划。' }
    ],
    cards: [
      { id: 'cover', title: '有盖走廊', type: '设施', desc: '沿食阁至车站的现有步行段加盖，雨天也能继续走熟悉的路。', budget: 20, staff: 0, duration: 55, land: ['route'], source: nrp, effects: '住得舒服 +12；长者状态 +14。路线变直、雨天恢复外出。' },
      { id: 'ramp', title: '无障碍坡道', type: '设施', desc: '改善旧组屋出口与过街接驳的高差；不替代有盖路线。', budget: 14, staff: 0, duration: 40, land: ['crossing'], source: nrp, effects: '住得舒服 +9；长者 +8，照护家庭 +4。' },
      { id: 'ease', title: '居家改造 · EASE', type: '政策', desc: '为有需要的住户改善屋内及入口安全；屋外未遮蔽路段仍需另外处理。', budget: 22, staff: 0, duration: 60, land: [], source: ease, effects: '住得舒服 +10；长者 +12，照护家庭 +8。不会解决淋雨路线。' },
      { id: 'corner', title: '居民角', type: '设施', desc: '把闲置底层改成可以坐下聊天的地方；持续安排一名联络人。', budget: 18, staff: 1, duration: 45, land: ['void'], source: nrp, effects: '处得来 +12；租户 +10，年轻家庭 +5。持续占用人手 1。' },
      { id: 'aac', title: '乐龄活动中心', type: '设施', desc: '安排活动、友伴与服务转介。它提供支持与连接，不等于日间照护中心。', budget: 34, staff: 2, duration: 65, land: ['room'], source: aac, effects: '处得来 +10；长者 +10，照护家庭 +12。持续占用人手 2。' },
      { id: 'cca', title: '社区关怀公寓试点', type: '设施', desc: '让适老住房与基本支持服务留在社区；占用整块街角花园，并需持续人手。', budget: 68, staff: 3, duration: 110, land: ['garden'], source: cca, effects: '长者 +22，照护家庭 +24；处得来 +5；年轻家庭 -7、舒适 -3（原有花园减少）。持续人手 3。' },
      { id: 'child', title: '托育与儿童空间', type: '设施', desc: '在街角增加儿童活动及托育支持空间；同一地块便不能再建关怀公寓。', budget: 46, staff: 2, duration: 80, land: ['garden'], source: invented, effects: '年轻家庭 +24；处得来 +5；住得舒服 +3。持续占用人手 2，花园面积减少。' },
      { id: 'visits', title: '友伴探访与照护转介', type: '服务', desc: '建立持续探访安排，留意独居住户，并帮助家庭连接正式服务。', budget: 9, staff: 1, duration: 15, land: [], source: aac, effects: '长者 +9，照护家庭 +10；处得来 +5。持续占用人手 1，不替代专业日间照护。' },
      { id: 'event', title: '食阁邻里交流', type: '活动', desc: '让不同作息、不同居住年限的邻居坐下来认识彼此；人手仅在筹备期间占用。', budget: 10, staff: 1, duration: 20, land: [], source: invented, effects: '处得来 +8；租户 +8，年轻家庭 +5；信任 +5。完成后归还人手，可间隔 60 秒重办。' },
      { id: 'nrp', title: '邻里更新 · NRP', type: '政策', desc: '通过独立居民投票后，推进公共区域的整片更新。支持率必须达到 75%。', budget: 58, staff: 0, duration: 100, land: [], source: nrp, effects: '住得舒服 +17，处得来 +7；各群体 +4。需 75% 投票支持，施工期间有噪音。' },
      { id: 'appeal', title: 'EIP 个案申诉支持', type: '政策', desc: '协助拉赫曼夫妇整理资料、请求个案审理；消耗 8 点居民信任，不能保证豁免或成交。', budget: 0, staff: 0, duration: 35, land: [], source: appeal, trustCost: 8, effects: '模拟受理后，换房屋主状态 +24。后续仍需解释程序；信任 -8。' }
    ],
    settings: { target: { stay: 68, social: 70, comfort: 70 }, stableSeconds: 60, dangerLine: 25, dangerSeconds: 45, greenLine: 68 },
    disclaimer: '金文泰单案例可玩原型。8 户居民及故事均为虚构；地图、地块、经费、工期、配额状态与数值均为玩法假设，不代表真实金文泰规划或住户。政策说明附官方来源。'
  };
  const data = root.CM_DATA;
  const spatial = {
    route:[[-16,3],[16,2.7]], void:[[-29,-3],[9,3.5]], room:[[-11,-11],[5.2,4.6]],
    garden:[[6,27],[8.5,8.5]], crossing:[[18,17],[6.2,6.2]], locked:[[37,-7],[9,18]]
  };
  data.plots.forEach(p => { p.scenePosition=spatial[p.id][0];p.sceneSize=spatial[p.id][1]; });
  data.plots.push(
    {id:'route-west',name:'A 栋门前步行段',nameEn:'Block A approach',kind:'route',x:520,y:440,scenePosition:[-30,3],sceneSize:[12,2.7],description:'连接旧组屋与食阁的另一段露天路；可沿既有步道加盖，让陈玉英接上熟悉的食阁路线。',descriptionEn:'An alternative uncovered section between the older blocks and hawker centre. A shelter here connects Mdm Chen to her familiar route.',coverage:'陈玉英与旧组屋住户',coverageEn:'Mdm Chen and older-block residents'},
    {id:'route-b',name:'食阁西侧接驳步道',nameEn:'West hawker approach',kind:'route',x:680,y:468,scenePosition:[-18,9.5],sceneSize:[12,2.7],description:'食阁西侧的绕行接驳段；沿现有路线加盖，同样改善长者前往食阁的连续通路。',descriptionEn:'The western approach to the hawker centre. Sheltering this existing section also improves the continuous route for older neighbours.',coverage:'长者与食阁访客',coverageEn:'Older residents and hawker visitors'},
    {id:'void-b',name:'B 栋底层公共空间',nameEn:'Block B void deck',kind:'void',x:460,y:320,scenePosition:[-10,-21],sceneSize:[9,3.5],description:'B 栋现有底层空间，可安排居民角；更接近拉赫曼夫妇日常活动的位置。',descriptionEn:'An existing shared ground-floor space in Block B, suitable for a residents’ corner near Rahman and Noor.',coverage:'B 栋居民与换房屋主',coverageEn:'Block B neighbours and owners looking to move'},
    {id:'room-b',name:'西侧社区空置房间',nameEn:'West community room',kind:'room',x:330,y:440,scenePosition:[-44,5],sceneSize:[5.2,4.6],description:'组屋西侧可改装的现有小房间；可设活动与转介服务，保留街角花园。',descriptionEn:'An existing small room west of the blocks, suitable for activities and referrals while leaving the corner garden available.',coverage:'西侧长者与照护家庭',coverageEn:'Older and caregiving households on the west side'},
    {id:'crossing-b',name:'南侧过街接驳处',nameEn:'Southern crossing connection',kind:'crossing',x:725,y:600,scenePosition:[18,46],sceneSize:[6.2,6.2],description:'南侧道路与住宅步道之间的高差接驳；可增设坡道，不替代遮雨路线。',descriptionEn:'A level change between the southern road and residential path. A ramp helps access but does not shelter the route.',coverage:'南侧家庭与行动不便的住户',coverageEn:'Southern households and neighbours with mobility needs'}
  );
  const effects = {
    cover:{comfort:12,elders:14,trust:5},ramp:{comfort:9,elders:8,care:4,trust:3},ease:{comfort:10,elders:12,care:8,trust:3},
    corner:{social:12,renters:10,families:5,trust:4},aac:{social:10,elders:10,care:12,trust:4},
    cca:{elders:22,care:24,social:5,families:-7,comfort:-3,trust:3},child:{families:24,social:5,comfort:3,trust:3},
    visits:{elders:9,care:10,social:5,trust:3},event:{social:8,renters:8,families:5,trust:5},
    nrp:{comfort:19,social:7,elders:4,owners:4,families:4,care:4,renters:4,trust:6},appeal:{owners:24}
  };
  function goals(changes){return [...new Set(Object.keys(changes).map(k=>k==='social'?'social':k==='comfort'?'comfort':Object.hasOwn(data.groups,k)?'stay':null).filter(Boolean))];}
  data.cards.forEach(c=>{c.effectChanges=effects[c.id];c.goals=goals(c.effectChanges);c.staffMode=c.staff?(c.id==='event'?'temporary':'ongoing'):'none';c.allowedRotations=['cover','ramp'].includes(c.id)?[0,Math.PI]:[0,Math.PI/2,Math.PI,Math.PI*1.5];});
  data.cards.find(c=>c.id==='cover').land.push('route-west','route-b');
  data.cards.find(c=>c.id==='ramp').land.push('crossing-b');
  data.cards.find(c=>c.id==='corner').land.push('void-b');
  data.cards.find(c=>c.id==='aac').land.push('room-b');
  const actionSpecs = [
    ['mediate','约定作息并当面调解','Agree quiet hours together',['noise'],0,3,'居民信任 -3；先建立安静时段，后续仍需相处机会','Trust -3; agree quiet hours, then keep building relationships.',{social:8,renters:8}],
    ['extend','建议延长出售安排','Extend the sale arrangements',['housing'],0,3,'居民信任 -3；暂缓压力，90 秒后需要后续支持','Trust -3; eases immediate pressure, with follow-up in 90 seconds.',{owners:6}],
    ['advice','安排换房咨询','Arrange housing advice',['housing'],8,0,'预算 8；先厘清可行的住房与援助选择','Budget 8; clarify housing and assistance options.',{owners:10,trust:2}],
    ['advice2','补上换房与援助咨询','Follow up with housing advice',['waiting'],10,0,'预算 10；屋主 +16，明确后续选择','Budget 10; owners +16, with a clearer next step.',{owners:16,trust:2}],
    ['accept','约好时间，建立互助联系','Agree a time to help',['help'],0,0,'处得来 +5；长者与租户各 +5','Community ties +5; older residents and tenants +5.',{social:5,elders:5,renters:5,trust:3}],
    ['light','保留随手帮忙的方式','Keep help informal',['help'],0,0,'处得来 +3；租户 +3，不新增持续服务','Community ties +3; tenants +3; no new ongoing service.',{social:3,renters:3,trust:2}],
    ['explain','公开解释个案审理原则','Explain individual case review',['rumor'],8,0,'预算 8；处得来 +7，居民信任 +4','Budget 8; community ties +7; trust +4.',{social:7,trust:4}],
    ['talk','与有疑问的住户分别谈谈','Speak with concerned neighbours',['rumor'],0,3,'居民信任 -3；处得来 +8','Trust -3; community ties +8.',{social:8}],
    ['later','先继续个案跟进','Continue following up the case',['rumor'],0,0,'屋主 +4；暂不消除社区疑问','Owners +4; community questions remain.',{owners:4}],
    ['keep','保留花园，先做分散支持','Keep the garden for now',['land'],0,0,'年轻家庭 +3；照护需求仍通过其他服务处理','Young families +3; care needs still require other support.',{families:3,trust:2}],
    ['small','利用现有空间安排亲子支持','Use existing space for family support',['childcare'],12,0,'预算 12；年轻家庭 +14、处得来 +3','Budget 12; young families +14; community ties +3.',{families:14,social:3,trust:2}],
    ['refer','安排专项照护服务咨询','Arrange a care-service consultation',['carealt'],12,0,'预算 12；照护家庭 +12，不新增日间照护设施','Budget 12; caregiving households +12; no new day-care facility.',{care:12,trust:3}],
    ['support','支持她调整营业与邻里安排','Support a more restful stall routine',['stall'],10,0,'预算 10；长者 +5、处得来 +4，保留相聚时间','Budget 10; older residents +5; community ties +4.',{elders:5,social:4,trust:3}],
    ['corner','用现有居民角安排相聚','Meet at the existing residents’ corner',['stall'],0,0,'使用已建居民角，不再扣建设费或新增人手；长者 +4、处得来 +4','Use the completed corner with no new construction cost or staff; older residents +4; community ties +4.',{elders:4,social:4}],
    ['startvote','发起公开投票与意见征集','Open voting and feedback',['petition'],0,0,'初始支持率 58%；不会把居民信任直接换算成选票','Starts at 58% support; trust is not converted into votes.',{}],
    ['defer','先做小范围更新，再征集意见','Improve locally, then ask again',['petition'],0,0,'居民信任 +2；60 秒后重新提出请愿','Trust +2; the petition returns in 60 seconds.',{trust:2}],
    ['meeting','说明工程内容与施工影响','Explain the proposed works',['ballot'],8,0,'预算 8；支持率 +12 个百分点，只进行一次','Budget 8; voting support +12 percentage points, once.',{trust:3}],
    ['door','逐户听取意见并修改安排','Listen door to door',['ballot'],0,3,'居民信任 -3；支持率 +10 个百分点，只进行一次','Trust -3; voting support +10 percentage points, once.',{}],
    ['good','把反馈记下来，继续留意','Record the feedback and keep watching',['foodreturn'],0,0,'居民信任 +3；这条路线的承诺已兑现','Trust +3; the promise on this route has been kept.',{trust:3}]
  ];
  actionSpecs.forEach(([option,title,titleEn,issueKinds,budget,trustCost,desc,descEn,changes])=>data.cards.push({id:'action-'+option,title,titleEn,type:['startvote','defer','meeting','door','keep'].includes(option)?'政策':'服务',desc,descEn,budget,staff:0,duration:0,land:[],trustCost,actionOption:option,issueKinds,source:invented,effects:desc,effectsEn:descEn,effectChanges:changes,goals:goals(changes),staffMode:'none'}));
  data.cards.find(c=>c.id==='action-corner').requiresCompleted='corner';
  data.issueChannels={route:'world',noise:'world',land:'world',petition:'world',ballot:'world',housing:'mail',waiting:'mail',care:'mail',carealt:'mail',childcare:'mail',help:'mail',rumor:'mail',stall:'mail',foodreturn:'mail'};
})(typeof globalThis !== 'undefined' ? globalThis : window);
