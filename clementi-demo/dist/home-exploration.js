/* One household at a time: small, walkable Clementi interiors.
 * Inspired by downstairs-ai's grid exploration; all rooms and observations here
 * use the Clementi cast. Objects are illustrative, not private-letter evidence. */
(function (root) {
  'use strict';
  const doc = root.document, TILE = 40, WIDTH = 11, HEIGHT = 8;
  const DIRECTIONS=[[0,-1],[1,0],[0,1],[-1,0]];
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const copy = value => JSON.parse(JSON.stringify(value));
  const pair = (zh, en) => ({zh,en});
  let active = null, serial = 0, listening = false;
  const language = () => (active?.hooks.getLanguage?.() || root.CM_I18N?.getLanguage?.()) === 'en' ? 'en' : 'zh';
  const text = value => typeof value === 'object' && value ? value[language()] || value.zh || '' : String(value || '');
  const w = (zh,en) => language() === 'en' ? en : zh;
  const prop = (kind,x,y,name,description,width=1,height=1) => ({kind,x,y,name,description,width,height});
  const rooms = {
    chen: { title:pair('陈玉英的家','Mdm Chen’s home'), description:pair('熟悉的客厅里，出门用的东西都放在顺手的地方。','A familiar living room, with everyday things close at hand.'), props:[
      prop('bed',1,1,pair('休息用的床','Resting bed'),pair('床铺收拾得很整齐，熟悉的摆设让她住得安心。','The bed is neatly made. Familiar things help her feel at home.'),2,2),
      prop('kettle',7,2,pair('咖啡杯','Coffee cup'),pair('杯子放在桌边，让人想起她清早到食阁见熟人的习惯。','A cup by the table recalls her routine of meeting familiar faces at the hawker centre.')),
      prop('umbrella',1,5,pair('门边的雨伞','Umbrella by the door'),pair('雨伞靠在门边。想去食阁见熟人时，她还得先看看外面的天气。','An umbrella rests by the door. Before going to meet familiar faces at the hawker centre, she still has to check the weather.')),
      prop('photo',8,5,pair('生活照片','Everyday photograph'),pair('一张普通的生活照留在屋里。这里是她已经住了多年的社区。','An everyday photograph belongs to a home in a neighbourhood she has known for many years.')) ]},
    rahman: { title:pair('拉赫曼与努尔的家','Rahman and Noor’s home'), description:pair('两人仍在这个住了多年的家里安排日常，也想着下一步。','Everyday life continues in their long-time home as they consider what comes next.'), props:[
      prop('sofa',1,1,pair('双人沙发','Shared sofa'),pair('沙发边留着两个人常坐的位置。他们一边过日子，一边想着怎样换到小一点的家。','The sofa has two familiar places to sit. Everyday life continues as they think about moving to a smaller home.'),2,2),
      prop('folders',6,2,pair('资料夹','Document folder'),pair('桌上准备着资料夹，他们希望把下一步要做的事情整理明白。','Folders are ready on the table. They want to put the next steps in order and understand what to do.'),2),
      prop('boxes',1,5,pair('收纳箱','Storage boxes'),pair('收纳箱靠墙放着，过道仍然留空；他们需要的是清楚的换房支持。','Boxes sit against the wall, leaving the route clear. They are looking for a clear path to housing support.'),2),
      prop('kettle',8,5,pair('两只茶杯','Two tea cups'),pair('两只杯子放在一起，日常并没有因为等待而停止。','Two cups sit together. Everyday life continues while they wait.')) ]},
    lin: { title:pair('林家的家','The Lin family’s home'), description:pair('客厅兼顾孩子玩耍与大人照看的日常。','The living room makes room for play and the daily work of looking after children.'), props:[
      prop('toys',1,1,pair('孩子的游戏垫','Children’s play mat'),pair('游戏垫把一角留给孩子。林家希望附近有更多儿童与托育支持。','A play mat leaves one corner for the children. The family wants nearby space and childcare support.'),2,2),
      prop('calendar',6,2,pair('家庭日程','Family timetable'),pair('日程表提醒着工作、接送与家人帮忙照看的安排。','A timetable keeps track of work, trips and help from family.'),2),
      prop('toys',2,5,pair('积木盒','Building blocks'),pair('积木已经收回盒边，垫子上还留着一块没拼完的小房子。','Blocks are gathered by their box. A little unfinished house still sits on the play mat.')),
      prop('stroller',8,5,pair('婴儿推车','Child’s pushchair'),pair('推车停在门边。出行是否方便，也是祖母带孩子时的日常考虑。','A pushchair waits near the door. Easy routes matter when the grandmother takes the children out.')) ]},
    kumar: { title:pair('库马尔与德薇的家','Kumar and Devi’s home'), description:pair('一家人的生活，围绕工作、上学与照护长辈展开。','Work, school and caring for an older family member shape the household’s day.'), props:[
      prop('bed',1,1,pair('长辈休息的地方','A place for the older relative to rest'),pair('这里留着长辈休息的位置。这个家庭需要可靠的日间照护支持。','A place is kept for the older relative to rest. The household needs reliable daytime care support.'),2,2),
      prop('calendar',6,2,pair('照护日程','Care timetable'),pair('日程表上挤着工作、孩子上学与照护安排。夫妻俩轮流请假，好让母亲身边有人。','The timetable is crowded with work, school and care. The couple take turns off work so someone can stay with Mum.'),2),
      prop('folders',1,5,pair('服务资料册','Service information folder'),pair('服务资料册摊在手边，几页常用的信息被折了角。他们想弄清楚可以向谁求助。','Service information lies close at hand, with a few useful pages folded at the corners. They want to work out whom they can ask for help.')),
      prop('kettle',8,5,pair('一家人的水杯','Household cups'),pair('杯子放在常用的位置，是照护之外仍需继续的普通家务。','Cups are kept in a familiar place: ordinary household work continues alongside care.')) ]},
    students: { title:pair('合租学生的家','The student housemates’ home'), description:pair('学习、合租和逐渐认识邻居，发生在同一间家里。','Study, shared living and getting to know neighbours meet in one home.'), props:[
      prop('bed',1,1,pair('合租房里的床位','Shared-flat sleeping area'),pair('床位旁收着各自的小东西，几位同学在这里分出自己的生活角落。','Small personal things sit beside the beds. The housemates have each made a little corner of their own.'),2,2),
      prop('desk',6,2,pair('学习书桌','Study desk'),pair('课本摊在桌上。学生的生活不只有聚会，也有上课与做作业。','Books are spread on a desk. The students’ days include classes and study as well as social time.'),2),
      prop('headphones',1,5,pair('耳机','Headphones'),pair('耳机随手放在桌边。屋里安静下来时，只听见翻书的声音。','Headphones lie beside the desk. When the room settles down, the sound of turning pages is all that remains.')),
      prop('shoes',8,5,pair('门边的鞋','Shoes by the door'),pair('几双鞋排在门边，这间屋子由几位同学共同生活。','Several pairs of shoes mark a home shared by classmates.')) ]},
    huang: { title:pair('黄美兰的食阁摊位','Huang Meilan’s hawker stall'), description:pair('熟悉的摊台与炉灶，陪她忙过许多个清晨。','A familiar counter and stove have kept her company through many busy mornings.'), props:[
      prop('counter',1,1,pair('熟悉的摊台','Familiar stall counter'),pair('摊台是三十多年日常的一部分，熟客常在这里碰面。','The counter is part of more than thirty years of everyday life, where regulars meet.'),3),
      prop('stove',7,1,pair('炉灶','Cooking stove'),pair('炉灶还在原处。她希望熟客有相聚的地方，也想给自己留出休息。','The stove remains in its place. She wants regulars to keep meeting while making time for her own rest.'),2),
      prop('chair',1,5,pair('食阁座位','Hawker-centre seat'),pair('一张常坐的椅子摆在摊前，熟客来了，便能坐下聊几句。','A well-used chair sits in front of the stall, ready for a regular to sit down and chat.')),
      prop('calendar',8,5,pair('营业安排','Stall timetable'),pair('营业时间旁留着一小块空白，她想给自己多留一些休息的时间。','A little space is left beside the opening hours. She wants to make more room for rest.')) ]},
    zhang: { title:pair('张叔的居民联络点','Uncle Zhang’s resident contact point'), description:pair('一张桌、几份资料，是他与居民交流的地方。','A table and a few papers make a place to speak with residents.'), props:[
      prop('board',1,1,pair('社区告示栏','Community noticeboard'),pair('告示按办事步骤排好，来访的人可以站在这里慢慢看。','Notices are arranged by the steps to follow, so visitors can stop and read them at their own pace.'),3),
      prop('desk',6,2,pair('联络桌','Contact desk'),pair('桌边留着几张空椅子，方便居民坐下来，把各自的想法说清楚。','Empty chairs wait beside the table, leaving room for residents to sit down and explain their views.'),2),
      prop('chair',1,5,pair('来访座位','Visitor’s seat'),pair('来访的座位靠着桌边。张叔习惯先请人坐下，再慢慢听对方说。','A visitor’s chair stands by the table. Uncle Zhang likes to ask people to sit before hearing them out.')),
      prop('folders',8,5,pair('公开资料','Public information'),pair('常用资料在一旁放好，方便来访者把办事步骤问清楚。','Frequently used information is kept nearby, ready for visitors who want to ask about the steps to follow.')) ]},
    ali: { title:pair('阿丽的家','Ali’s home'), description:pair('一个需要安静，也需要与邻里保持联系的小家。','A small home that needs quiet as well as a connection to the neighbourhood.'), props:[
      prop('bed',1,1,pair('休息用的床','Bed for rest'),pair('轮班后的休息不一定在晚上。阿丽也需要白天安静的时段。','Rest after a shift does not always happen at night. Ali also needs quiet during the day.'),2,2),
      prop('curtains',6,1,pair('遮光窗帘','Shaded curtains'),pair('窗帘把一角遮暗，方便不同排班之后休息。','Curtains shade one corner for rest after changing shifts.'),2),
      prop('clock',1,5,pair('小闹钟','Small alarm clock'),pair('闹钟指着下一次起床的时间。她的白天和黑夜，常常跟着排班交换。','The alarm is set for the next time she needs to get up. Her days and nights often trade places with her shifts.')),
      prop('calendar',8,5,pair('排班日历','Shift calendar'),pair('排班表上写满了不同的时段，空下来的格子才轮到她休息、见见邻居。','Different shifts fill the calendar. The empty spaces are her time to rest or see a neighbour.')) ]}
  };
  const roomData = new Map(), checkedRecords = new WeakMap();
  for (const [id,room] of Object.entries(rooms)) {
    room.props.forEach((item,index)=>{item.id=id+'-'+item.kind+'-'+index;});
    const walkable = new Uint8Array(WIDTH*HEIGHT);
    for(let y=1;y<HEIGHT-1;y++)for(let x=1;x<WIDTH-1;x++) {
      if(x===7&&y===3)continue;
      if(!room.props.some(p=>x>=p.x&&x<p.x+p.width&&y>=p.y&&y<p.y+p.height))walkable[y*WIDTH+x]=1;
    }
    walkable[7*WIDTH+5]=1;
    roomData.set(id,{walkable,propIds:new Set(room.props.map(item=>item.id))});
  }
  function config(id) { if (!rooms[id]) throw new Error('Unknown Clementi home.'); return rooms[id]; }
  function propText(state,id,item,lang='zh') {
    let name=item.name,description=item.description;
    // The retained furniture is not an age clock. Annual family life takes precedence.
    if(id==='lin'&&/^years(?:-|$)/.test(state?.mode||'')){
      const year=Math.max(1,Math.min(10,Number(state.year)||1));
      if(item.kind==='stroller'&&year>=3){name=pair('旧推车','Old pushchair');description=year>=6?pair('这辆旧推车留下了孩子小时候的回忆。现在两个孩子已经'+(year+3)+'岁和'+year+'岁，家里更关心上学、课余活动和出行的安全。','The old pushchair holds memories of the children’s early years. They are now '+(year+3)+' and '+year+'; school, after-school activities and safe routes shape family life.'):pair('推车已经收起来了。家里的出行安排，正随着孩子长大而改变。','The pushchair has been put away. Family travel arrangements are changing as the children grow.');}
      if(item.kind==='toys'&&item.width>1&&year>=3){name=pair('孩子的活动角','Children’s activity corner');description=year>=6?pair('这里收着孩子的游戏和课余用品。孩子长大后，需要适合学习、运动和交往的去处。','Games and after-school things are kept here. As the children grow, they need suitable places to learn, play and meet others.'):pair('游戏垫上放着常玩的积木，孩子的活动需要也在慢慢变化。','Favourite building blocks sit on the mat; the children’s activities are gradually changing.');}
      if(item.kind==='calendar'&&year>=6)description=pair('日程表上排着工作、上学和课余活动。家里的时间安排，需要跟上孩子成长。','Work, school and after-school activities fill the timetable. Family arrangements need to keep up as the children grow.');
      if(item.kind==='toys'&&item.width===1&&year>=6)description=pair('积木盒里留着以前搭的小房子。这个家里，孩子的活动也在随年龄改变。','A little house built earlier remains in the block box. The children’s activities are changing with their age.');
    }
    const pick=value=>value[lang==='en'?'en':'zh'];return {name:pick(name),description:pick(description)};
  }
  function layout(id) { const room=config(id); return copy({width:WIDTH,height:HEIGHT,door:[5,7],entry:[5,6],resident:[7,3],person:[7,3],props:room.props}); }
  const same=(a,b)=>a[0]===b[0]&&a[1]===b[1];
  const distance=(a,b)=>Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1]);
  function free(id,x,y) {
    config(id); if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||x>=WIDTH||y<0||y>=HEIGHT)return false;
    return roomData.get(id).walkable[y*WIDTH+x]===1;
  }
  function record(state,id) {
    config(id);if(!state.homeExplorations||typeof state.homeExplorations!=='object'||Array.isArray(state.homeExplorations))state.homeExplorations={};
    let saved=state.homeExplorations[id];if(!saved||typeof saved!=='object'||Array.isArray(saved))saved=state.homeExplorations[id]={position:[5,6],seen:[]};
    if(!Array.isArray(saved.position)||!free(id,saved.position[0],saved.position[1]))saved.position=[5,6];
    const seen=Array.isArray(saved.seen)?saved.seen:[],key=seen.join('\u0000'),checked=checkedRecords.get(saved);
    if(!checked||checked.id!==id||checked.array!==saved.seen||checked.key!==key) {
      const valid=roomData.get(id).propIds;
      saved.seen=[...new Set(seen.filter(value=>valid.has(value)))];
      checkedRecords.set(saved,{id,array:saved.seen,key:saved.seen.join('\u0000')});
    }
    return saved;
  }
  function path(id,from,to,adjacent=false) {
    config(id);if(!Array.isArray(from)||!Array.isArray(to)||!free(id,...from))return null;
    const goals=new Set(),key=(x,y)=>x+','+y;
    if(!adjacent&&free(id,to[0],to[1]))goals.add(key(...to));
    if(adjacent||!goals.size)for(const [dx,dy] of DIRECTIONS)if(free(id,to[0]+dx,to[1]+dy))goals.add(key(to[0]+dx,to[1]+dy));
    if(goals.has(key(...from)))return [];
    const queue=[from],previous=new Map([[key(...from),null]]);
    for(let head=0;head<queue.length;head++){const at=queue[head];for(const [dx,dy] of DIRECTIONS){const next=[at[0]+dx,at[1]+dy],k=key(...next);if(previous.has(k)||!free(id,...next))continue;if(same(next,[5,7])&&!goals.has(k))continue;previous.set(k,at);if(goals.has(k)){const out=[];for(let node=next;node&&!same(node,from);node=previous.get(key(...node)))out.unshift(node);return out;}queue.push(next);}}
    return null;
  }
  function move(state,id,dx,dy) {
    if(!DIRECTIONS.some(d=>d[0]===dx&&d[1]===dy))return {ok:false};
    const saved=record(state,id),next=[saved.position[0]+dx,saved.position[1]+dy];if(!free(id,...next))return {ok:false,position:copy(saved.position)};
    saved.position=next;return {ok:true,position:copy(next),exit:same(next,[5,7])};
  }
  function evidence(state,id,lang='zh') {
    const room=config(id),seen=state?.homeExplorations?.[id]?.seen||[];
    return {householdId:id,observations:room.props.filter(p=>Array.isArray(seen)&&seen.includes(p.id)).map(p=>({id:p.id,...propText(state,id,p,lang)}))};
  }
  const rect=(x,y,width,height,fill)=>`<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}"/>`;
  function furniture(p) {
    const W=p.width*TILE,H=p.height*TILE;
    let art=rect(4,9,W-8,H-13,'#3f4149')+rect(4,5,W-8,H-13,'#aa8262')+rect(7,8,W-14,H-19,'#d5b88b');
    switch(p.kind){
      case'bed':art=rect(4,5,W-8,H-9,'#715c55')+rect(7,7,W-14,H-15,'#e8dcc2')+rect(9,10,W-18,15,'#fcf0d2')+rect(8,30,W-16,H-38,'#789b99')+rect(12,34,7,H-46,'#94b5a8');break;
      case'sofa':art=rect(4,8,W-8,H-13,'#4b6a73')+rect(9,10,W-18,18,'#82a8a3')+rect(10,32,W-20,H-44,'#6d918d')+rect(3,24,8,H-28,'#476672')+rect(W-11,24,8,H-28,'#476672');break;
      case'kettle':art+=rect(11,13,14,13,'#f0e2bd')+rect(24,16,6,7,'#715f4d')+rect(14,10,9,3,'#d9c69e')+rect(11,26,20,3,'#715f4d');break;
      case'umbrella':art=rect(18,10,4,23,'#695d57')+rect(11,7,18,6,'#d7b56d')+rect(7,13,26,6,'#c4a368')+rect(20,29,8,4,'#695d57');break;
      case'toys':art=rect(5,10,W-10,H-15,'#ab8567')+rect(10,14,12,11,'#5f9697')+rect(26,15,9,12,'#cd8a66')+rect(14,27,13,8,'#e9c06b');if(W>40)art+=rect(44,18,15,18,'#d4af6e')+rect(61,15,10,12,'#8ca99c');break;
      case'photo':art=rect(7,7,27,27,'#705d50')+rect(10,10,21,21,'#f0ddb3')+rect(14,15,6,6,'#ab8d77')+rect(22,17,5,5,'#516d77')+rect(13,23,16,5,'#799c93');break;
      case'calendar':case'board':art=rect(5,5,W-10,H-10,'#8a6a50')+rect(8,8,W-16,H-16,'#e9dfc5')+rect(10,10,W-20,5,'#b77e68');for(let i=0;i<3;i++)art+=rect(12+i*9,21,5,4,'#879b9e');break;
      case'curtains':art=rect(4,5,W-8,27,'#d2bc8e')+rect(9,10,W-18,19,'#8ca8ad')+rect(6,6,14,29,'#6f8c8b')+rect(W-20,6,14,29,'#6f8c8b');break;
      case'headphones':art=rect(9,9,22,5,'#334d62')+rect(7,12,6,16,'#31495d')+rect(27,12,6,16,'#31495d')+rect(13,15,14,10,'#d6bd93');break;
      case'clock':art=rect(7,7,26,27,'#627c86')+rect(10,10,20,20,'#eadfbe')+rect(19,13,3,10,'#3d5264')+rect(20,20,7,3,'#3d5264');break;
      case'stove':art=rect(5,5,W-10,H-10,'#82908e')+rect(8,8,W-16,H-16,'#324c5c')+rect(13,12,11,10,'#aab8ad')+rect(W-25,12,11,10,'#aab8ad');break;
      case'counter':art=rect(3,7,W-6,25,'#8b6853')+rect(3,4,W-6,10,'#dfc28c')+rect(8,16,W-16,13,'#b68d69');break;
      case'chair':art=rect(10,5,21,10,'#a2765c')+rect(8,18,25,10,'#d2ac79')+rect(10,29,5,7,'#715c50')+rect(27,29,5,7,'#715c50');break;
      case'shoes':art=rect(6,19,13,10,'#88705c')+rect(22,15,12,11,'#566d76')+rect(6,28,14,3,'#dcc297')+rect(22,25,13,3,'#dcc297');break;
      case'stroller':art=rect(9,8,22,6,'#6c9494')+rect(12,16,16,13,'#8cac9f')+rect(8,29,5,5,'#394d5d')+rect(28,29,5,5,'#394d5d')+rect(29,7,4,21,'#536674');break;
      case'boxes':art=rect(5,10,W-10,23,'#b58f63')+rect(8,7,W-16,7,'#dbc08c')+rect(W/2-2,9,4,24,'#e4ce9d');break;
      default:art+=rect(12,11,W-24,15,'#efe3c8')+rect(15,14,Math.max(8,W-33),2,'#79949a')+rect(15,20,Math.max(6,W-40),2,'#b29470');
    }
    return art;
  }
  function player() {return rect(13,-1,14,5,'#253a4a')+rect(12,4,16,13,'#d6a681')+rect(10,18,20,16,'#d8bf80')+rect(7,20,5,12,'#b58c6e')+rect(28,20,5,12,'#b58c6e')+rect(12,34,6,6,'#344b60')+rect(23,34,6,6,'#344b60')+rect(15,8,3,2,'#263744')+rect(23,8,3,2,'#263744');}
  function residentArt(id) {
    const portrait=root.CM_ART?.portrait?.(id);
    if(portrait)return portrait.replace(/<svg\b[^>]*>/,'<svg x="3" y="-17" width="34" height="52" viewBox="0 0 72 72" aria-hidden="true" shape-rendering="crispEdges">');
    return rect(12,0,16,7,'#3a4653')+rect(12,7,16,12,'#d5ae89')+rect(9,20,22,18,'#72918a');
  }
  function mapMarkup(id,yearMode=false) {
    const room=config(id);let tiles='';
    for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++){
      const door=x===5&&y===7,wall=x===0||x===10||y===0||y===7;
      if(wall&&!door)tiles+=rect(x*TILE,y*TILE,TILE,TILE,'#354d5d')+rect(x*TILE,y*TILE,TILE,5,'#748a8b');
      else tiles+=`<g data-home-tile="${x},${y}" role="button" tabindex="-1" aria-label="${esc(door?w('出门','Leave the home'):w('走到地板','Walk to floor tile')+' '+x+','+y)}">${rect(x*TILE,y*TILE,TILE,TILE,door?'#ba9c67':(x+y)%2?'#c9b394':'#d2bea0')}${rect(x*TILE,y*TILE,TILE,1,'#b29f86')}${door?`<path d="M${x*TILE+20} ${y*TILE+11}v17m-6-6 6 6 6-6" stroke="#3d5060" stroke-width="3" fill="none"/>`:''}</g>`;
    }
    const props=room.props.map(p=>`<g class="cm-home-prop" data-home-prop="${esc(p.id)}" role="button" tabindex="0" aria-label="${esc(w('观察：','Inspect: ')+text(p.name))}" transform="translate(${p.x*TILE} ${p.y*TILE})">${furniture(p)}<rect class="cm-home-object-ring" x="2" y="2" width="${p.width*TILE-4}" height="${p.height*TILE-4}" rx="2"/><title>${esc(text(p.name))}</title></g>`).join('');
    const personName=root.CM_COMMUNITY?.personas?.[id]?.name||root.CM_DATA?.residents.find(r=>r.id===id)?.name||'';
    return `<svg id="cm-home-map" viewBox="0 0 ${WIDTH*TILE} ${HEIGHT*TILE}" role="group" aria-label="${esc(yearMode?w('居民的房间','Resident’s room'):w('一户室内探索，方向键或WASD走动，点击物件或住户','Explore one interior: arrow keys or WASD to walk; select an object or resident'))}" shape-rendering="crispEdges">${tiles}${props}<g class="cm-home-resident" data-home-person="${esc(id)}" role="button" tabindex="0" aria-label="${esc(w('走近并交谈：','Approach and talk: ')+text(personName))}" transform="translate(280 120)"><rect class="cm-home-person-halo" x="0" y="-3" width="40" height="43" rx="2"/>${residentArt(id)}<title>${esc(w('点击，与住户交谈','Select to talk with the resident'))}</title></g><g id="cm-home-player" class="cm-home-player" style="transform:translate(200px,240px)" aria-label="${esc(w('你，社区工作者','You, the community worker'))}">${player()}</g></svg>`;
  }
  function panel(id,options={}) {
    const room=config(id);
    const yearMode=options.yearMode===true;
    if(yearMode)return `<section id="cm-home-panel" class="cm-home-panel" data-home-resident="${esc(id)}" data-home-mode="years" data-i18n-ignore><div class="cm-home-heading"><h3>${esc(text(room.title))}</h3><span class="cm-home-quiet">${esc(w('探访中','Visiting'))}</span></div><div class="cm-home-board">${mapMarkup(id,true)}</div><div class="cm-home-nav"><div class="cm-home-pad" aria-label="${esc(w('室内移动','Move inside'))}"><button type="button" data-home-step="0,-1" aria-label="${esc(w('向上','Move up'))}">↑</button><button type="button" data-home-step="-1,0" aria-label="${esc(w('向左','Move left'))}">←</button><button type="button" data-home-step="0,1" aria-label="${esc(w('向下','Move down'))}">↓</button><button type="button" data-home-step="1,0" aria-label="${esc(w('向右','Move right'))}">→</button></div><p id="cm-home-move-status" role="status">${esc(w('在家中','At home'))}</p><button type="button" class="cm-home-exit" data-home-exit>${esc(w('返回社区','Back to community'))} ↗</button></div><div id="cm-home-observation" class="cm-home-observation" role="status" aria-live="polite" hidden></div></section>`;
    return `<section id="cm-home-panel" class="cm-home-panel" data-home-resident="${esc(id)}" data-i18n-ignore><div class="cm-home-heading"><div><span class="cm-home-kicker">${esc(w('室内走访 · 一次一户','INTERIOR VISIT · ONE HOUSEHOLD'))}</span><h3>${esc(text(room.title))}</h3></div><span class="cm-home-quiet">Ⅱ ${esc(w('社区暂停','Time paused'))}</span></div><p class="cm-home-intro">${esc(text(room.description))}</p><div class="cm-home-board">${mapMarkup(id)}</div><div class="cm-home-nav"><div class="cm-home-pad" aria-label="${esc(w('室内移动','Move inside'))}"><button type="button" data-home-step="0,-1" aria-label="${esc(w('向上','Move up'))}">↑</button><button type="button" data-home-step="-1,0" aria-label="${esc(w('向左','Move left'))}">←</button><button type="button" data-home-step="0,1" aria-label="${esc(w('向下','Move down'))}">↓</button><button type="button" data-home-step="1,0" aria-label="${esc(w('向右','Move right'))}">→</button></div><div><p id="cm-home-move-status">${esc(w('方向键 / WASD 或点击地板走动。点击物件查看，点击住户交谈。','Walk with arrows / WASD or select the floor. Select an object to inspect it, or the resident to talk.'))}</p><button type="button" class="cm-home-exit" data-home-exit>${esc(w('出门，回到社区','Leave for the neighbourhood'))} ↗</button></div></div><div id="cm-home-observation" class="cm-home-observation" role="status" aria-live="polite"><span>${esc(w('在屋里看看','Take a look around'))}</span><p>${esc(w('观察到的物件会记在本户笔记里，再带着问题走近住户。','Objects you inspect stay in this household’s notes. Take your questions to the resident.'))}</p></div><p class="cm-home-disclaimer">${esc(w('室内摆设为游戏示意，探索时社区时间暂停。','Interiors are illustrative. Neighbourhood time stays paused while you explore.'))}</p></section>`;
  }
  function valid() {return !!active&&active.hooks.getState()===active.state&&doc?.getElementById('cm-home-panel')?.dataset.homeResident===active.id&&doc.getElementById('modal')?.open!==false;}
  function isActive(id) {return valid()&&(!id||active.id===id);}
  function canTalk(id) {return isActive(id)&&active.talking&&distance(record(active.state,id).position,[7,3])===1;}
  function paint() {
    if(!valid())return;const saved=record(active.state,active.id),sprite=active.nodes.sprite,transform=`translate(${saved.position[0]*TILE}px,${saved.position[1]*TILE}px)`;
    if(sprite&&sprite.style.transform!==transform)sprite.style.transform=transform;
    const seenKey=saved.seen.join('\u0000');
    if(active.seenKey!==seenKey){for(const node of active.nodes.props)node.classList.toggle('is-seen',saved.seen.includes(node.dataset.homeProp));active.seenKey=seenKey;}
    const near=distance(saved.position,[7,3])===1,status=active.nodes.status,message=active.yearMode?(near?w('在你身旁','Beside you'):w('在家中','At home')):active.talking&&near?w('已经走近住户，可以开始交谈。','You are close enough. Continue the conversation beside the room.'):near?w('已经走近住户。点击人物，开始交谈。','You are nearby. Select the resident to start talking.'):w('方向键 / WASD 或点击地板走动。点击物件查看，点击住户交谈。','Walk with arrows / WASD or select the floor. Select objects to inspect, or the resident to talk.');
    if(status&&status.textContent!==message)status.textContent=message;
  }
  function flush(visit=active) {
    if(!visit?.dirty)return;
    visit.dirty=false;
    // A newly created game must never receive an old home's pending save.
    if(visit.hooks.getState()===visit.state)visit.hooks.save?.();
  }
  function unmount() {serial++;if(active?.timer)root.clearTimeout(active.timer);flush();active=null;if(listening){doc.removeEventListener?.('click',clicked);doc.removeEventListener?.('keydown',keyed);listening=false;}}
  function afterMove(persist=true) {
    if(!valid())return;const current=active,saved=record(current.state,current.id);if(distance(saved.position,[7,3])!==1)current.talking=false;
    current.dirty=true;paint();current.hooks.onMove?.(current.id);if(persist)flush(current);
    if(same(saved.position,[5,7])){const hooks=current.hooks;unmount();hooks.onExit?.();}
  }
  function walk(points,done) {
    if(!valid())return;const visit=active,token=visit.serial;if(visit.timer)root.clearTimeout(visit.timer);visit.timer=null;flush(visit);
    if(points===null){const status=doc.getElementById('cm-home-move-status');if(status)status.textContent=w('这里走不过去，请换一条路。','That route is blocked. Try another way.');return;}
    let step=0;
    function advance(){if(!valid()||active!==visit||visit.serial!==token)return;if(step>=points.length){visit.timer=null;try{done?.();}finally{flush(visit);}return;}const next=points[step++],saved=record(visit.state,visit.id);if(!free(visit.id,...next)){flush(visit);return;}saved.position=next;afterMove(false);if(valid()&&active===visit)visit.timer=root.setTimeout(advance,120);}
    advance();
  }
  function inspect(propId) {
    if(!valid())return;const current=active,item=config(current.id).props.find(p=>p.id===propId);if(!item)return;
    // A wide furnishing can be approached from any free edge.
    const options=[];for(let y=item.y;y<item.y+item.height;y++)for(let x=item.x;x<item.x+item.width;x++){const route=path(current.id,record(current.state,current.id).position,[x,y],true);if(route)options.push(route);}options.sort((a,b)=>a.length-b.length);
    walk(options[0]||null,()=>{if(!valid()||active!==current)return;const saved=record(current.state,current.id);if(!saved.seen.includes(item.id)){saved.seen.push(item.id);current.dirty=true;}const info=propText(current.state,current.id,item,language()),observation={id:item.id,...info,question:w('我留意到','I noticed ')+info.name+w('，这与你希望改善的日常有什么关系？','. How does this relate to what you would like to improve?')};const box=active.nodes.observation;if(box){box.hidden=false;box.innerHTML='<span>'+esc(observation.name)+'</span><p>'+esc(observation.description)+'</p>';}paint();current.hooks.onObserve?.(current.id,observation);});
  }
  function approach() {
    if(!valid())return;const current=active;walk(path(current.id,record(current.state,current.id).position,[7,3],true),()=>{if(!valid()||active!==current)return;current.talking=true;paint();current.hooks.onMove?.(current.id);current.hooks.onTalk?.(current.id);});
  }
  function clicked(event) {
    if(!valid())return;const target=event.target.closest?.('[data-home-step],[data-home-tile],[data-home-prop],[data-home-person],[data-home-exit]');if(!target||!doc.getElementById('cm-home-panel').contains(target))return;
    if(target.hasAttribute('data-home-exit')){const hooks=active.hooks;unmount();hooks.onExit?.();return;}
    if(target.dataset.homeProp){inspect(target.dataset.homeProp);return;}if(target.dataset.homePerson){approach();return;}
    if(target.dataset.homeStep){if(active.timer)root.clearTimeout(active.timer);active.timer=null;const [dx,dy]=target.dataset.homeStep.split(',').map(Number);if(move(active.state,active.id,dx,dy).ok)afterMove();else flush();return;}
    if(target.dataset.homeTile){const destination=target.dataset.homeTile.split(',').map(Number);if(free(active.id,...destination))walk(path(active.id,record(active.state,active.id).position,destination));}
  }
  function keyed(event) {
    if(!valid()||event.altKey||event.ctrlKey||event.metaKey||event.target.closest?.('input,textarea,select,[contenteditable="true"],[contenteditable=""]'))return;
    if(event.key==='Enter'||event.key===' '){const target=event.target.closest?.('[data-home-prop],[data-home-person]');if(target){event.preventDefault();clicked({target});}return;}
    const dir={ArrowUp:[0,-1],w:[0,-1],W:[0,-1],ArrowRight:[1,0],d:[1,0],D:[1,0],ArrowDown:[0,1],s:[0,1],S:[0,1],ArrowLeft:[-1,0],a:[-1,0],A:[-1,0]}[event.key];if(!dir)return;event.preventDefault();if(active.timer)root.clearTimeout(active.timer);active.timer=null;if(move(active.state,active.id,...dir).ok)afterMove();else flush();
  }
  function mount(id,hooks) {
    config(id);unmount();const panel=doc?.getElementById('cm-home-panel');if(!panel||panel.dataset.homeResident!==id)return;
    const state=hooks.getState();active={id,state,hooks,yearMode:hooks.yearMode===true||panel.dataset.homeMode==='years'||/^years(?:-|$)/.test(state.mode||''),serial:++serial,talking:false,timer:null,dirty:false,nodes:{sprite:doc.getElementById('cm-home-player'),status:doc.getElementById('cm-home-move-status'),observation:doc.getElementById('cm-home-observation'),props:[...panel.querySelectorAll?.('[data-home-prop]')||[]]}};const saved=record(active.state,id);if(same(saved.position,[5,7]))saved.position=[5,6];
    for(const node of active.nodes.props){const item=config(id).props.find(p=>p.id===node.dataset.homeProp);if(!item)continue;const info=propText(state,id,item,language()),title=node.querySelector?.('title');if(title)title.textContent=info.name;node.setAttribute?.('aria-label',w('观察：','Inspect: ')+info.name);}
    paint();hooks.save?.();
    if(!listening){doc.addEventListener('click',clicked);doc.addEventListener('keydown',keyed);listening=true;}
  }
  root.CM_HOME={panel,mount,unmount,isActive,canTalk,evidence,layout,path,move};
})(typeof window!=='undefined'?window:globalThis);
