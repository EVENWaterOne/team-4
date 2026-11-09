(function (root) {
  'use strict';
  const dictionary = new Map();
  function add(lines) {
    lines.trim().split('\n').forEach(line => {
      const split = line.indexOf('|||');
      if (split > 0) dictionary.set(line.slice(0, split), line.slice(split + 3));
    });
  }

  // Original Chinese is always the lookup key; game state is never translated.
  add(`
陈玉英|||Mdm Chen Yuying
拉赫曼与努尔|||Rahman & Noor
拉赫曼与努尔夫人|||Rahman & Noor
拉赫曼夫妇|||Rahman & Noor
林志豪与周佳颖|||Lin Zhihao & Zhou Jiaying
库马尔与德薇|||Kumar & Devi
四位合租学生|||Student housemates
黄美兰|||Huang Meilan
张叔|||Uncle Zhang
阿丽|||Ali
林家|||The Lin family
林志豪一家|||The Lin family
德薇|||Devi
长期居住的长者|||Long-term older residents
需要换房的屋主|||Owners looking to move
年轻家庭|||Young families
照护家庭|||Caregiving households
租户|||Tenants
独居长者|||Older resident living alone
想换小屋的长期屋主|||Long-term owners looking to downsize
有两个孩子的年轻家庭|||Young family with two children
与长辈同住的照护家庭|||Family caring for an older relative
来自不同地方的学生租户|||Student tenants from different places
食阁摊主|||Hawker stallholder
居委会志愿者|||Residents' Committee volunteer
轮班护士、租户|||Shift-working nurse and tenant
旧组屋 A · 三房式|||Older Block A · 3-room flat
旧组屋 B · 四房式|||Older Block B · 4-room flat
新组屋 C · 四房式|||Newer Block C · 4-room flat
旧组屋 B · 五房式|||Older Block B · 5-room flat
旧组屋 A · 楼上四房式|||Older Block A · 4-room flat upstairs
食阁 · 炒粿条摊|||Hawker centre · char kway teow stall
旧组屋 B · 居民联络点|||Older Block B · resident contact point
旧组屋 A · 小户型|||Older Block A · small flat
在这里住了四十多年。清晨常到食阁喝咖啡，最近因膝盖不适、雨天难走而少出门。|||She has lived here for over forty years and usually has coffee at the hawker centre in the morning. Knee pain and difficult wet-weather walks have recently kept her at home.
希望继续住在熟悉的社区，也能安全地去食阁。|||She wants to stay in her familiar neighbourhood and walk safely to the hawker centre.
黄美兰每天替她留位子。|||Huang Meilan saves a seat for her every day.
张叔隔几天来探望。|||Uncle Zhang visits every few days.
楼上的学生夜间活动令她睡不好。|||The students' late-night activities upstairs disturb her sleep.
阿丽偶尔在电梯里帮她按楼层。|||Ali sometimes presses the lift button for her.
退休巴士车长与妻子住了三十多年。孩子已搬出，想换小屋，转售却一直没有进展。|||The retired bus captain and his wife have lived here for over thirty years. Their children have moved out. They want a smaller home, but the sale has made little progress.
得到清楚、可信的换房支持，而不只是继续等待。|||They want clear, reliable support with moving home, rather than simply waiting longer.
张叔帮他们联系援助，也转述邻居的担心。|||Uncle Zhang helps them find assistance and passes on neighbours' concerns.
搬来三年，家中有四岁和一岁的孩子。两人都工作，由林太白天帮忙照看。|||They moved here three years ago and have children aged four and one. Both parents work, and Grandma Lin helps care for the children during the day.
更近的儿童活动与托育空间，也不希望祖母带孩子绕远。|||They want nearby play and childcare spaces, without a long detour for Grandma Lin and the children.
林太常在游乐场边与陈玉英聊天。|||Grandma Lin often chats with Mdm Chen beside the playground.
关心花园地块会怎样使用。|||They are interested in how the garden site will be used.
两个孩子念中学，德薇八十二岁的母亲也同住。夫妻轮流请假照料，几乎没有自己的时间。|||Their two children attend secondary school, and Devi's 82-year-old mother lives with them. The couple take turns taking leave to care for her, leaving little time for themselves.
白天有可靠的照护支持，并知道哪些服务可以申请。|||They need reliable daytime care support and clear information about available services.
黄美兰认识德薇的母亲，偶尔为她留一份小菜。|||Huang Meilan knows Devi's mother and sometimes saves a small side dish for her.
在附近高校读书，晚归与偶尔聚会打乱了邻居休息。他们还不熟悉楼里的日常约定。|||They attend nearby colleges. Late returns and occasional gatherings disturb their neighbours, and they are still learning the block's everyday expectations.
保留生活空间，也希望能够与邻居说得上话。|||They want room for their own lives and a chance to get to know their neighbours.
与楼下陈玉英有噪音摩擦。|||Noise has caused friction with Mdm Chen downstairs.
可以通过食阁活动认识黄美兰和老邻居。|||Hawker-centre gatherings could introduce them to Huang Meilan and long-term neighbours.
在这里做了三十多年。她的摊位也是长者每天碰面的地方，最近开始考虑什么时候退休。|||She has run her stall here for over thirty years. It is also a daily meeting place for older residents. Lately, she has been thinking about retirement.
让熟客仍有相聚的地方，也给自己安排喘息的时间。|||She wants regular customers to keep their meeting place, while making time for herself to rest.
每天见到陈玉英，很容易察觉她是否缺席。|||She sees Mdm Chen every day and quickly notices when she is absent.
认识德薇的母亲。|||She knows Devi's mother.
愿意帮忙介绍学生与长者认识。|||She is willing to introduce the students and older neighbours to one another.
退休后参与居委会，认识许多老住户。热心串门，也会把听到的说法带给别人。|||He joined the Residents' Committee after retiring and knows many long-term residents. He enjoys visiting neighbours and passing along what he hears.
让居民知道决定怎样做出，并能表达意见。|||He wants residents to understand how decisions are made and have a chance to speak.
探望陈玉英。|||He visits Mdm Chen.
替拉赫曼夫妇牵线。|||He helps Rahman and Noor connect with support.
他的转述需要向当事人核实。|||His second-hand accounts should be checked with the people involved.
近年搬来，轮班让休息时段与别人不同。和邻居不太熟，偶尔在电梯里遇到陈玉英。|||She moved here recently. Her shifts mean she rests at different times from others. She knows few neighbours, but sometimes meets Mdm Chen in the lift.
白天也能安静休息，并找到适合轮班作息的相处方式。|||She wants quiet rest during the day and ways to get along with neighbours that fit her shifts.
与陈玉英偶尔在电梯见面。|||She sometimes meets Mdm Chen in the lift.
学生的夜间活动也可能影响她休息。|||The students' late-night activities may also disturb her rest.
职业不意味着她能无偿承担邻里照护。|||Her profession does not mean she can provide unpaid care for the neighbourhood.
食阁—车站步行段|||Hawker centre–station walkway
A 栋底层空间|||Block A void deck
社区空置房间|||Vacant community room
街角花园地块|||Corner garden site
旧组屋出口与过街处|||Older-block exit and crossing
既有建筑与规划保留区|||Existing buildings and reserved area
现有露天步行段；可加建有盖走廊，不占花园地块。|||An existing uncovered walkway. A sheltered linkway can be added here without using the garden site.
目前闲置的底层公共空间；可改成居民角。|||An unused shared space on the ground floor. It can become a residents' corner.
一间可改装的社区房间；可设乐龄活动中心。|||A community room that can be converted into an Active Ageing Centre.
唯一较大的演示地块；社区关怀公寓与儿童设施争用此处。建设会减少现有绿地。|||The only large site in this demo. Community Care Apartments and children's facilities compete for it. Construction reduces the existing greenery.
现有高差与绕行处；可增设坡道和无障碍接驳。|||An existing level change and detour. A ramp and accessible connection can be added here.
已有用途、不可建设。这里的边界只是玩法演示，未核实真实规划。|||Already in use and unavailable for construction. These boundaries demonstrate gameplay and are not verified planning information.
有盖走廊|||Covered linkway
无障碍坡道|||Accessible ramp
居家改造 · EASE|||Home modifications · EASE
居民角|||Residents' corner
乐龄活动中心|||Active Ageing Centre
社区关怀公寓试点|||Community Care Apartment pilot
托育与儿童空间|||Childcare and play space
友伴探访与照护转介|||Befriending visits and care referrals
食阁邻里交流|||Hawker-centre gathering
邻里更新 · NRP|||Neighbourhood renewal · NRP
EIP 个案申诉支持|||EIP case support
沿食阁至车站的现有步行段加盖，雨天也能继续走熟悉的路。|||Shelter the existing walk from the hawker centre to the station, so familiar journeys can continue in the rain.
改善旧组屋出口与过街接驳的高差；不替代有盖路线。|||Improve level changes at the older-block exit and crossing. This does not replace a sheltered route.
为有需要的住户改善屋内及入口安全；屋外未遮蔽路段仍需另外处理。|||Improve safety inside homes and at entrances for residents who need it. Uncovered outdoor routes still need separate attention.
把闲置底层改成可以坐下聊天的地方；持续安排一名联络人。|||Turn an unused void deck into a place to sit and talk, with one person continuously assigned to coordinate it.
安排活动、友伴与服务转介。它提供支持与连接，不等于日间照护中心。|||Provide activities, befriending and service referrals. This offers support and connections, not full-day care.
让适老住房与基本支持服务留在社区；占用整块街角花园，并需持续人手。|||Bring senior-friendly housing and basic support services into the neighbourhood. This uses the whole corner garden and needs ongoing staffing.
在街角增加儿童活动及托育支持空间；同一地块便不能再建关怀公寓。|||Add play and childcare support at the corner. The same site will no longer be available for Community Care Apartments.
建立持续探访安排，留意独居住户，并帮助家庭连接正式服务。|||Arrange ongoing visits, check on residents living alone, and help households connect with formal services.
让不同作息、不同居住年限的邻居坐下来认识彼此；人手仅在筹备期间占用。|||Bring neighbours with different routines and lengths of residence together. Staffing is needed only while preparing the gathering.
通过独立居民投票后，推进公共区域的整片更新。支持率必须达到 75%。|||Renew shared areas after a separate residents' vote. Support must reach 75% before work can proceed.
协助拉赫曼夫妇整理资料、请求个案审理；消耗 8 点居民信任，不能保证豁免或成交。|||Help Rahman and Noor prepare documents and request an individual review. Uses 8 resident-trust points; no exemption or sale is guaranteed.
住得舒服 +12；长者状态 +14。路线变直、雨天恢复外出。|||Liveability +12; older residents +14. A more direct route restores wet-weather outings.
住得舒服 +9；长者 +8，照护家庭 +4。|||Liveability +9; older residents +8; caregiving households +4.
住得舒服 +10；长者 +12，照护家庭 +8。不会解决淋雨路线。|||Liveability +10; older residents +12; caregiving households +8. This does not shelter the outdoor route.
处得来 +12；租户 +10，年轻家庭 +5。持续占用人手 1。|||Community ties +12; tenants +10; young families +5. Ongoing staffing: 1.
处得来 +10；长者 +10，照护家庭 +12。持续占用人手 2。|||Community ties +10; older residents +10; caregiving households +12. Ongoing staffing: 2.
长者 +22，照护家庭 +24；处得来 +5；年轻家庭 -7、舒适 -3（原有花园减少）。持续人手 3。|||Older residents +22; caregiving households +24; community ties +5; young families -7; liveability -3 (less garden space). Ongoing staffing: 3.
年轻家庭 +24；处得来 +5；住得舒服 +3。持续占用人手 2，花园面积减少。|||Young families +24; community ties +5; liveability +3. Ongoing staffing: 2; less garden space.
长者 +9，照护家庭 +10；处得来 +5。持续占用人手 1，不替代专业日间照护。|||Older residents +9; caregiving households +10; community ties +5. Ongoing staffing: 1. This does not replace professional day care.
处得来 +8；租户 +8，年轻家庭 +5；信任 +5。完成后归还人手，可间隔 60 秒重办。|||Community ties +8; tenants +8; young families +5; trust +5. Staff return after the event. Repeat after a 60-second interval.
住得舒服 +17，处得来 +7；各群体 +4。需 75% 投票支持，施工期间有噪音。|||Liveability +17; community ties +7; all groups +4. Requires 75% voting support. Construction causes noise.
模拟受理后，换房屋主状态 +24。后续仍需解释程序；信任 -8。|||After the simulated case is accepted for review, owners looking to move +24. The process still needs explanation; trust -8.
HDB · 邻里更新计划（NRP）|||HDB · Neighbourhood Renewal Programme (NRP)
HDB · 乐龄易（EASE）|||HDB · Enhancement for Active Seniors (EASE)
CEA · EIP 与回购援助|||CEA · EIP and buyback assistance
设计取舍 · 非特定政策复刻|||Design trade-off · not a reproduction of a specific policy
NRP 可改善公共空间、有盖走廊及无障碍设施；须有至少 75% 合资格屋主支持。预算、工期与效果数值为试玩设定。|||NRP can improve shared spaces, sheltered linkways and accessibility. At least 75% of eligible flat owners must support it. Budget, construction time and effects are demo settings.
EASE 改善住宅内及入口的长者安全与便利；不会替代屋外有盖路线。游戏中的经费与工期为试玩设定。|||EASE improves safety and mobility for seniors inside homes and at entrances. It does not replace sheltered outdoor routes. Funding and construction time here are demo settings.
乐龄活动中心提供活动、友伴及信息转介。普通 AAC 并不等于日间照护中心；游戏中照护家庭受益指获得支持与转介。数值为试玩设定。|||Active Ageing Centres provide activities, befriending and information referrals. A standard AAC is not a day-care centre. Benefits to caregiving households here mean support and referrals. Values are demo settings.
社区关怀公寓结合适老住房与服务。这里模拟在社区增加住房及服务选择，未复刻真实申请资格、费用或审批。用地、工期与数值为试玩设定。|||Community Care Apartments combine senior-friendly housing with services. This demo explores added housing and support choices, without reproducing real eligibility, fees or approvals. Sites, construction time and values are demo settings.
EIP 旨在促进族群融合；面临困难的屋主可寻求援助，HDB 按个案审理。游戏只模拟准备与受理申诉，不保证豁免或成交；楼栋状态、居民与数值均为虚构。|||EIP aims to support ethnic integration. Owners facing difficulties may seek assistance, assessed individually by HDB. The game simulates preparing and accepting a case for review; no exemption or sale is guaranteed. Block conditions, residents and values are fictional.
这张牌用于测试同一片地如何分配、不同家庭如何得到支持；不是金文泰真实地块、真实项目或获批计划。全部数值为试玩设定。|||This card explores how shared land can be allocated and different households supported. It does not describe a real Clementi site, project or approved plan. All values are demo settings.
金文泰单案例可玩原型。8 户居民及故事均为虚构；地图、地块、经费、工期、配额状态与数值均为玩法假设，不代表真实金文泰规划或住户。政策说明附官方来源。|||A playable Clementi case prototype. All eight households and stories are fictional. The map, sites, funding, construction times, quota conditions and values are gameplay assumptions, not actual Clementi plans or residents. Policy notes include official sources.
`);

  add(`
那段没有遮的路|||The uncovered stretch
楼上的年轻人|||The young neighbours upstairs
卖不出去的房子|||The flat that will not sell
从楼上的邻居到搭把手的人|||From upstairs neighbours to helping hands
张叔带来的另一种说法|||Another account from Uncle Zhang
等待之外还可以做什么|||What can happen beyond waiting?
白天的照护，谁来接手|||Who can help with daytime care?
同一片地，两种期待|||One site, two hopes
孩子的地方还能怎么安排|||What other space can children have?
没有新公寓，照护怎样继续|||Care without new apartments
早餐之后，摊位还能开多久|||After breakfast, how long can the stall stay open?
老居民提出邻里更新请愿|||Long-term residents request neighbourhood renewal
邻里更新：居民如何选择|||Neighbourhood renewal: residents decide
食阁的那个位子又有人了|||A familiar seat is occupied again
下雨时，陈玉英在去食阁的路上走走停停。她说：“家里还是熟悉的，就是雨天不敢走出去。”屋内安全与屋外通路是不同的问题。|||When it rains, Mdm Chen stops repeatedly on her walk to the hawker centre. “Home is still familiar. I just don't dare go out in the rain.” Safety at home and access outdoors are different problems.
学生偶尔晚间聚会，陈玉英睡不好；轮班的阿丽也希望有可预期的安静时段。学生说，他们还不清楚楼里的生活约定。|||The students occasionally gather at night, disturbing Mdm Chen's sleep. Shift-working Ali also needs predictable quiet hours. The students say they are still learning the block's everyday expectations.
夫妻想换小一点的房子，却在模拟 EIP 配额条件下遇到困难。他们希望有人说明下一步。这里不是金文泰任何真实楼栋的配额数据。|||The couple want a smaller flat, but face difficulties under the demo's simulated EIP quota conditions. They want someone to explain the next step. These are not quota data for any real Clementi block.
见过面之后，一位学生提出顺路代买日用品。陈玉英愿意试试，但也希望先约好时间。阿丽提醒，邻里互助需要尊重每个人的休息。|||After meeting, a student offers to pick up daily essentials on the way home. Mdm Chen is willing to try, but wants to agree on a time first. Ali reminds everyone that neighbourly help must respect people's rest.
模拟申诉已获受理，夫妻得到了下一步换房支持。张叔说：“有人不明白为什么这户得到个案帮助。”这只是转述；可以解释程序，也可以逐户了解，不能把传言当作事实。|||The simulated case has been accepted for review, giving the couple a next step in moving home. Uncle Zhang says, “Some people don't understand why this household received individual help.” This is a second-hand account. Explain the process or speak to residents; do not treat rumour as fact.
延长出售安排给了夫妻更多时间，房子的去向却还没有确定。他们希望这次有具体跟进。|||An extension has given the couple more time, but their flat's future remains uncertain. This time, they want concrete follow-up.
夫妻轮流请假照顾长辈。活动中心可以提供友伴与转介，但并不等于有人整天照护。需要在邻里支持、正式服务连接及住房选择之间安排。|||The couple take turns taking leave to care for an older relative. An activity centre can offer befriending and referrals, but not all-day care. Neighbourhood help, formal services and housing options each need consideration.
街角花园是唯一较大的可用地块。林家希望增加托育与儿童空间，照护家庭希望获得社区关怀住房。无论哪边，原来的花园都会缩小；未被满足的一方仍需要其他办法。|||The corner garden is the only large available site. The Lin family want childcare and play space; caregiving households want housing with support. Either choice reduces the garden. The other need will still require another approach.
花园地块已经安排了关怀住房。林家理解长者需要服务，但他们的日常托育压力仍然存在。能否先在现有空间内安排小规模支持？|||The garden site has been allocated to supported housing. The Lin family understand older residents' needs, but their childcare pressure remains. Could existing spaces provide some smaller-scale support?
街角地块已用于儿童空间。德薇说，母亲也愿意留在原来的家，只是需要知道可以找谁帮忙。|||The corner site has become a children's space. Devi says her mother is also happy to stay in her existing home; she just needs to know where to find help.
黄美兰还想继续见到熟客，也希望每周能多休息一天。她不想把继续经营变成对社区的责任。|||Huang Meilan wants to keep seeing her regulars, but would also like another day off each week. She does not want running the stall to become an obligation to the neighbourhood.
旧公共区域需要更新。是否推进，必须由合资格屋主投票。支持率与居民对你的信任是两件事；75% 是本计划的推进门槛。|||The older shared areas need renewal. Eligible flat owners must vote on whether it proceeds. Support for the plan and trust in you are separate; this programme requires 75% support.
投票支持率公开显示。听取担忧与解释施工安排可以帮助居民作出决定；达到 75% 后，才可以打出邻里更新牌。|||Voting support is shown publicly. Hearing concerns and explaining construction arrangements can help residents decide. The neighbourhood renewal card becomes available only after support reaches 75%.
有盖路线完工后，陈玉英重新走到了食阁。黄美兰把咖啡推过来，学生也向她打了招呼。设施改变了出门的条件，接下来是人与人怎样相处。|||With the sheltered route complete, Mdm Chen returns to the hawker centre. Huang Meilan brings her coffee, and a student greets her. The facility has changed the conditions for going out. What follows depends on how people connect.
修建有盖走廊|||Build a covered linkway
先修无障碍接驳|||Improve the accessible connection first
先处理屋内安全|||Address safety at home first
约定作息并当面调解|||Agree quiet hours through a face-to-face conversation
建设居民角|||Create a residents' corner
约一次食阁交流|||Arrange a hawker-centre gathering
协助准备个案申诉|||Help prepare an individual appeal
建议延长出售安排|||Suggest extending the sale period
安排换房咨询|||Arrange housing advice
约好时间，建立互助联系|||Agree a time and stay in touch
保留随手帮忙的方式|||Keep help informal
公开解释个案审理原则|||Explain the individual-review process publicly
与有疑问的住户分别谈谈|||Speak individually with residents who have questions
先继续个案跟进|||Continue following up the housing case
协助提交个案资料|||Help submit the case documents
补上换房与援助咨询|||Add housing and assistance advice
建立探访与照护转介|||Arrange visits and care referrals
设乐龄活动中心|||Set up an Active Ageing Centre
支持社区关怀公寓试点|||Support a Community Care Apartment pilot
把地块用于托育与儿童空间|||Allocate the site to childcare and play
把地块用于关怀住房与服务|||Allocate the site to housing with support
保留花园，先做分散支持|||Keep the garden and provide support elsewhere
利用现有空间安排亲子支持|||Use existing space for parent-and-child support
先组织家庭参与的邻里活动|||Start with a gathering for neighbourhood families
建立持续探访及正式服务转介|||Arrange ongoing visits and formal service referrals
用空置房间提供活动和转介|||Use the vacant room for activities and referrals
安排专项照护服务咨询|||Arrange specialist care-service advice
支持她调整营业与邻里安排|||Help adjust opening hours and meeting arrangements
让居民角接住部分相聚需求|||Let the residents' corner host some gatherings
发起公开投票与意见征集|||Open a vote and invite feedback
先做小范围更新，再征集意见|||Make smaller improvements, then seek views
说明工程内容与施工影响|||Explain the works and construction impacts
逐户听取意见并修改安排|||Listen door to door and adjust arrangements
启动已获同意的邻里更新|||Start the approved neighbourhood renewal
把反馈记下来，继续留意|||Record the feedback and keep in touch
预算 20 · 工期 55 秒；改善这段屋外路线|||Budget 20 · 55 seconds; improve this outdoor route
预算 14 · 40 秒；改善高差，但仍然会淋雨|||Budget 14 · 40 seconds; reduce level changes, but the route remains exposed to rain
预算 22 · 60 秒；屋外路线仍需安排|||Budget 22 · 60 seconds; outdoor access still needs attention
居民信任 -3；先建立安静时段，后续仍需相处机会|||Resident trust -3; agree quiet hours first, then create chances to connect
预算 18 · 持续人手 1；提供日常相遇空间|||Budget 18 · ongoing staff 1; provide a place for everyday encounters
预算 10 · 临时人手 1；完成后归还|||Budget 10 · temporary staff 1; staff return after completion
居民信任 -8 · 35 秒模拟受理；不保证豁免或成交|||Resident trust -8 · 35-second simulated review intake; no exemption or sale guaranteed
居民信任 -3；暂缓压力，90 秒后需要后续支持|||Resident trust -3; temporary relief, with follow-up needed after 90 seconds
预算 8；先厘清可行的住房与援助选择|||Budget 8; clarify available housing and assistance options first
处得来 +5；长者与租户各 +5|||Community ties +5; older residents and tenants +5 each
处得来 +3；租户 +3，不新增持续服务|||Community ties +3; tenants +3; no new ongoing service
预算 8；处得来 +7，居民信任 +4|||Budget 8; community ties +7; resident trust +4
居民信任 -3；处得来 +8|||Resident trust -3; community ties +8
屋主 +4；暂不消除社区疑问|||Owners +4; neighbourhood questions remain for now
居民信任 -8；35 秒后得到模拟受理反馈|||Resident trust -8; simulated review-intake feedback in 35 seconds
预算 10；屋主 +16，明确后续选择|||Budget 10; owners +16; clarify the next options
预算 9 · 持续人手 1；缓解信息与孤立压力|||Budget 9 · ongoing staff 1; ease information barriers and isolation
预算 34 · 人手 2；活动、友伴与服务转介|||Budget 34 · staff 2; activities, befriending and service referrals
预算 68 · 人手 3 · 花园地块；需较长工期|||Budget 68 · staff 3 · garden site; longer construction time
预算 46 · 持续人手 2 · 工期 80 秒|||Budget 46 · ongoing staff 2 · 80 seconds
预算 68 · 持续人手 3 · 工期 110 秒|||Budget 68 · ongoing staff 3 · 110 seconds
年轻家庭 +3；照护需求仍通过其他服务处理|||Young families +3; care needs still require other services
预算 12；年轻家庭 +14、处得来 +3|||Budget 12; young families +14; community ties +3
预算 10 · 临时人手 1；缓解交流需求，不能代替正式托育|||Budget 10 · temporary staff 1; support social contact, without replacing formal childcare
预算 9 · 持续人手 1|||Budget 9 · ongoing staff 1
预算 34 · 持续人手 2|||Budget 34 · ongoing staff 2
预算 12；照护家庭 +12，不新增日间照护设施|||Budget 12; caregiving households +12; no new day-care facility
预算 10；长者 +5、处得来 +4，保留相聚时间|||Budget 10; older residents +5; community ties +4; preserve time to meet
居民角已建则直接安排；否则建设预算 18、人手 1|||Use an existing residents' corner; otherwise budget 18 and staff 1 to build one
初始支持率 58%；不会把居民信任直接换算成选票|||Initial support 58%; resident trust is not directly converted into votes
居民信任 +2；60 秒后重新提出请愿|||Resident trust +2; the petition returns after 60 seconds
预算 8；支持率 +12 个百分点，只进行一次|||Budget 8; support +12 percentage points; available once
居民信任 -3；支持率 +10 个百分点，只进行一次|||Resident trust -3; support +10 percentage points; available once
支持率达到 75% 后：预算 58 · 工期 100 秒|||After support reaches 75%: budget 58 · 100 seconds
居民信任 +3；这条路线的承诺已兑现|||Resident trust +3; the promise for this route has been kept
`);

  add(`
你接手了这片已经有人生活的社区。先看看路上的陈玉英。|||You have taken over a neighbourhood where everyday life is already underway. Start by looking at Mdm Chen on the walkway.
没有找到这张牌。|||This card could not be found.
本局已结束，可以重新开始。|||This game has ended. You can start again.
这项安排正在进行。|||This action is already underway.
这项安排已经完成。|||This action has already been completed.
先让这次交流留下相处时间，60 秒后可再办。|||Give neighbours time to connect after this gathering. You can arrange another after 60 seconds.
可用人手不足；持续服务会占用人手。|||Not enough available staff. Ongoing services keep staff assigned.
居民信任不足以支持这次安排。|||There is not enough resident trust for this action.
需先征集至少 75% 合资格屋主支持。投票独立于居民信任。|||First secure support from at least 75% of eligible flat owners. Voting is separate from resident trust.
这里的用地类型不适合这张牌。|||This type of site does not suit this card.
这片区域已有用途或被规划锁定，不能建设。|||This area is already in use or reserved by the plan. Construction is unavailable.
这片地已经被占用，一块地只能安排一种设施。|||This site is already occupied. Each site can host only one facility.
规划锁定区域不能用于建设。|||Reserved areas are unavailable for construction.
可以安排。|||This action is available.
屋内改造已完成，但去食阁的露天路段仍然会淋雨。|||The home modifications are complete, but the uncovered walk to the hawker centre is still exposed to rain.
模拟个案已受理，屋主获得后续换房支持。这不表示真实豁免获批或房屋已成交。|||The simulated case has been accepted for review, with further housing support for the owners. This does not mean a real exemption was approved or a flat sold.
居民信任不足。|||Not enough resident trust.
本局已结束。|||This game has ended.
这件事已回应或正在安排中。|||This matter has been answered or is being addressed.
没有这个选项。|||This option is unavailable.
黄美兰调整营业安排，居民角接住了部分相聚需求。|||Huang Meilan adjusted her opening hours. The residents' corner now hosts some everyday gatherings.
居民角接住部分日常相聚，黄美兰可以安排更多休息。|||The residents' corner hosts some everyday gatherings, giving Huang Meilan more time to rest.
居民约定了安静时段；学生与轮班住户都参与了调解。|||Residents agreed on quiet hours. Both students and shift-working neighbours took part in the conversation.
延长安排暂时缓解压力，90 秒后仍需要具体跟进。|||The extension brings temporary relief, but concrete follow-up is still needed after 90 seconds.
拉赫曼夫妇获得了具体换房与援助咨询。|||Rahman and Noor received specific advice on moving home and available assistance.
学生与陈玉英约好了互相联系的方式。阿丽的休息时间也得到尊重。|||The students and Mdm Chen agreed how to stay in touch. Ali's rest hours were respected too.
居民讨论了个案审理程序；没有把传言当作楼栋的事实。|||Residents discussed the individual-review process, without treating rumour as fact about the block.
继续跟进住房个案，社区疑问暂未通过沟通消除。|||The housing case is being followed up. Neighbourhood questions still await discussion.
街角花园暂时保留；照护和托育需求需要其他支持。|||The corner garden is retained for now. Care and childcare needs require other support.
在现有空间安排了小规模亲子支持，不能视为新建托育中心。|||Small-scale parent-and-child support was arranged in existing space. This is not a new childcare centre.
照护家庭获得正式服务咨询与转介，没有新增日间照护设施。|||Caregiving households received formal-service advice and referrals. No new day-care facility was created.
黄美兰可以多休息一天，熟客也保留了固定相聚时间。|||Huang Meilan can take another day off, while regulars keep a set time to meet.
邻里更新投票开始：58%。支持率独立于居民信任。|||The neighbourhood renewal vote has opened at 58% support. Support is separate from resident trust.
先安排局部改善，60 秒后重新征集更新意见。|||Arrange local improvements first, then seek renewal feedback again after 60 seconds.
需要先发起投票。|||Start the vote first.
这一轮意见征集已经完成，请尝试另一种安排。|||This feedback activity has already been completed. Try the other approach.
已达到推进门槛。|||The approval threshold has been reached.
尚未达到 75%。|||Support has not yet reached 75%.
这个安排暂不可用。|||This action is currently unavailable.
【后续】这件事已等待约一分钟，居民开始追问。|||[Follow-up] This matter has waited about a minute. Residents are starting to ask again.
黄美兰说她好几天没来；女儿提出接她离开。|||Huang Meilan says she has not visited for several days. Her daughter suggests taking her to live elsewhere.
黄美兰留的位子空了几天。陈玉英的女儿开始讨论搬家。|||The seat Huang Meilan saves has been empty for days. Mdm Chen's daughter has begun discussing a move.
房东收到更多投诉，开始考虑结束学生的租约。|||The landlord has received more complaints and is considering ending the students' tenancy.
噪音投诉升级，租户的居住稳定受到影响。|||Noise complaints have escalated, affecting the tenants' housing stability.
拉赫曼夫妇的等待没有新进展，他们对管理者的信任降低。|||Rahman and Noor are still waiting without progress. Their trust in the neighbourhood manager has fallen.
三项目标同时稳定维持了 60 秒。本局完成。|||All three goals have remained stable together for 60 seconds. This game is complete.
至少一项目标持续低于危险线 45 秒。社区需要重新安排支持。|||At least one goal stayed below the danger line for 45 seconds. The neighbourhood needs a different support plan.
`);

  // UI phrases, including sentence fragments around live values.
  add(`
邻里来信|||Neighbourhood letters
状态稳定|||Stable
仍需支持|||Needs support
居住受到影响|||Housing affected
楼下 · 金文泰|||Downstairs · Clementi
关闭|||Close
即时|||Instant
社区行动|||Community action
社区邮局|||Neighbourhood post
暂时没有新来信|||No new letters for now
已经采取行动，等待后续。|||Action taken. Waiting for the next update.
完整阅读与现实对照 ↗|||Read in full and see the real-world context ↗
打开来信|||Open letter
收起信封 · 继续经营|||Close letter · resume neighbourhood life
打开来信 · 阅读时暂停|||Open letter · pauses while reading
继续游戏|||Resume game
暂停游戏|||Pause game
阅读时自动暂停|||Pauses automatically while reading
选址时自动暂停|||Pauses automatically while choosing a site
继续经营|||Resume neighbourhood life
暂停经营|||Pause neighbourhood life
已暂停|||Paused
住得下|||Room to stay
处得来|||Community ties
住得舒服|||Liveability
试玩预算单位，每秒缓慢恢复；不是新元报价|||Demo budget units recover gradually each second. These are not Singapore-dollar quotations.
居民对管理者的信任，与居民之间的处得来分开计算|||Residents' trust in the manager, calculated separately from relationships between neighbours.
运营服务持续占用人手，已占用 / 总人手|||Staff remain assigned to ongoing services: assigned / total.
预算|||Budget
居民信任|||Resident trust
人手占用|||Staff assigned
居民之间的联系与关系|||Connections and relationships between residents
出行、设施与居住环境|||Access, facilities and the living environment
三项目标同时达标并维持 60 秒，让社区的日常稳定下来。|||Meet all three goals together for 60 seconds to make everyday life more stable.
取消 ×|||Cancel ×
已获足够支持，可安排更新工程。|||Enough support has been secured. Renewal work can be arranged.
至少 75% 合资格屋主支持。支持率与居民信任分别计算。|||At least 75% of eligible flat owners must support the plan. Support and resident trust are calculated separately.
查看邻里更新 ↗|||View neighbourhood renewal ↗
现实对照|||Real-world context
查看官方资料|||Official information
牌上的预算、人手、工期及效果为试玩设定。|||Card budgets, staffing, construction times and effects are demo settings.
没有合适的可用位置，或暂不满足资源条件。|||No suitable site is available, or resource requirements are not currently met.
完工或服务上线后，居民状态和地图会随之改变。|||Resident conditions and the map change after construction finishes or the service begins.
无需持续占用人手|||No ongoing staff assignment
无需新用地|||No new site needed
到地图上选址|||Choose a site on the map
安排这项行动|||Arrange this action
返回牌库|||Back to cards
政策与设施 · 阅读时暂停|||Policies and facilities · pauses while reading
已安排。|||Action arranged.
暂时无法安排。|||This cannot be arranged yet.
确认后会扣除预算，并开始计算工期。|||Confirming deducts the budget and starts the construction clock.
确认安排|||Confirm action
另选一个位置|||Choose another site
用地与工期|||Land and construction time
规划锁定 · 暂不可用|||Reserved by plan · unavailable
已占用 · |||Occupied · 
施工中 · |||Under construction · 
可用空间|||Available space
可以考虑的安排|||Possible actions
这些可用空间属于游戏示意设定，未核实为金文泰真实可开发地块。|||These available spaces are gameplay assumptions, not verified developable sites in Clementi.
社区空间|||Neighbourhood space
工程已安排。|||Construction arranged.
楼栋构成 · 纯示意数据|||Block composition · illustrative data only
假设楼栋：华族家庭70%，马来族家庭22%，印度裔及其他家庭8%。不是实际配额或本地人口数据。|||Illustrative block: Chinese households 70%, Malay households 22%, Indian and other households 8%. These are not actual quota limits or local population data.
华族家庭 70% · 马来族家庭 22% · 印度裔及其他家庭 8%|||Chinese households 70% · Malay households 22% · Indian and other households 8%
比例用于演示楼栋构成，不是配额门槛，也不是金文泰人口数据。申诉受理不会直接改变住户构成；实际转售资格需按 HDB 当时的查询结果及个案审理。|||These proportions illustrate a block's composition. They are not quota limits or Clementi population data. Accepting a case for review does not directly change its residents. Actual resale eligibility depends on current HDB checks and individual assessment.
正在跟进|||Follow-up underway
需要回应|||Needs a response
事情已经有了进一步变化，留意居民的近况。|||The situation has developed. Check how the residents are doing.
查看政策与设施牌|||View policy and facility cards
先回地图观察|||Return to the map first
居民来信 · 阅读时暂停|||Resident letter · pauses while reading
已回应来信。|||Letter answered.
在意的事|||What matters to them
楼下认识的人|||People they know downstairs
与这户有关的来信|||Letters involving this household
虚构居民，不对应真实个人。人物习惯与文化细节仍需访谈或实地观察核实。|||A fictional resident, not a real individual. Habits and cultural details still need validation through interviews or observation.
居民档案 · 虚构人物|||Resident profile · fictional character
住在这里的人|||People who live here
八户居民是了解社区的窗口。每个人有自己的日常，也会受到同一个决定的不同影响。|||Eight households offer a window into the neighbourhood. Each has a daily life of their own, and the same decision affects them differently.
人物均为虚构；八户居民不代表金文泰真实人口比例。|||All characters are fictional. These eight households do not represent Clementi's actual population proportions.
邻里档案|||Neighbourhood profiles
政策与设施|||Policies and facilities
每张牌主要受一两种资源限制。建筑需要合适的位置，服务需要有人持续运作。|||Each card is mainly limited by one or two resources. Buildings need a suitable site; ongoing services need people to run them.
预算使用试玩单位；工期以经营时间秒数表示。阅读与选址时自动暂停。|||Budgets use demo units. Construction times use seconds of running game time. Reading and choosing a site pause the game automatically.
你的下一步|||Your next step
怎样让日常稳定下来|||Making everyday life more stable
五类居民中至少四类稳定|||At least four of five resident groups stable
出行与居住环境|||Access and the living environment
三个目标同时达标并保持 |||Meet all three goals together for 
 即可完成这一局。任一目标低于 ||| to complete this game. If any goal falls below 
 并持续 ||| for 
，本局会结束。没有固定的总倒计时。|||, this game ends. There is no fixed overall countdown.
「住得下」由五类居民的状态计算：长期长者、换房屋主、年轻家庭、照护家庭和租户。稳定一类计 20 分。|||Room to stay is calculated from five groups: long-term older residents, owners looking to move, young families, caregiving households and tenants. Each stable group contributes 20 points.
居民信任是居民对管理者的态度；处得来是居民彼此之间的关系；NRP 支持率则针对具体更新方案，三者分开计算。|||Resident trust reflects attitudes towards the manager. Community ties describe relationships between residents. NRP support concerns a specific renewal proposal. All three are calculated separately.
目标线、危险线和维持时长均为试玩设定。|||Target lines, danger lines and required durations are demo settings.
三个目标|||Three goals
社区记录|||Neighbourhood journal
进行中的工程|||Projects underway
社区服务|||Neighbourhood service
暂时没有施工中的项目。|||No projects are under construction right now.
已经发生的事|||What has happened
每个决定，都留下痕迹|||Every decision leaves a trace
现实对照与资料|||Real-world context and sources
政策牌引用公开制度的方向。居民、故事、地图用地、工期、预算、支持率和效果数值是游戏设定。|||Policy cards draw on the aims of publicly documented programmes. Residents, stories, map sites, times, budgets, support levels and effects are game settings.
查看官方来源 ↗|||Official source ↗
关于地图|||About the map
地图为金文泰背景下的示意街区。规划用途不等于地块已经可取得或可立即建设。|||This is an illustrative neighbourhood set in Clementi. A planned land use does not mean a site is available or ready for construction.
URA 总体规划 ↗|||URA Master Plan ↗
本试玩根据用户提供的两份 2026 年 10 月 29 日企划制作。未核实的年龄占比、转售价、真实楼栋配额及可开发地块未作为事实展示。|||This demo is based on the two plans supplied by the user, dated 29 October 2026. Unverified age proportions, resale prices, real block quotas and developable sites are not presented as facts.
资料说明|||About the sources
接手一个已有日常的社区|||Take over a neighbourhood already full of life
这里有人住了几十年，也有人刚搬来。你接手的，是他们每天经过的楼下。|||Some have lived here for decades; others have just arrived. You are taking care of the spaces they pass through every day.
旧组屋|||Older HDB blocks
已有居民与设施|||Existing residents and facilities
可改造空间有限|||Limited space for changes
八户邻居|||Eight households
从来信与相遇|||Through letters and encounters
了解各自的日常|||Discover their daily lives
三条主线|||Three main stories
出行、换房、邻里|||Access, housing and neighbours
相互牵动的选择|||Choices that affect one another
先看看陈玉英经过的那段路，再决定预算和人手该放在哪里。阅读来信、查看档案和选择卡牌时，经营时间会暂停。|||Start with the walkway Mdm Chen uses, then decide where your budget and staff should go. Time pauses while reading letters, viewing profiles and choosing cards.
时长取决于阅读与决策，可用右上角切换 1× / 2× / 3×。居民均为虚构，地图与所有数值为试玩设定。|||Play time depends on reading and decisions. Switch between 1× / 2× / 3× at the top right. Residents are fictional; the map and all values are demo settings.
走进社区 →|||Enter the neighbourhood →
继续上次的社区|||Continue your neighbourhood
了解目标|||Explore the goals
NEIGHBOURHOOD 01 · 金文泰|||NEIGHBOURHOOD 01 · CLEMENTI
楼下的日常，继续了。|||Everyday life continues downstairs.
这一轮，社区需要重新出发。|||This time, the neighbourhood needs a fresh start.
有人重新走进食阁，有人终于有了住房选择。社区的三个目标已经同时稳定了一段时间。|||Someone has returned to the hawker centre; someone else has a clearer housing path. All three neighbourhood goals have remained stable together.
有一项社区目标持续低于危险线。回看来信和资源安排，下一次可以尝试另一条路径。|||A neighbourhood goal stayed below the danger line. Review the letters and resource choices, then try a different path next time.
哪些家庭还需要支持|||Households that still need support
这轮留下的决定|||Decisions made this time
再经营一次|||Try another game
回到地图回看|||Review the map
结局描述游戏中的居民处境，不代表对现实政策效果的判断。|||This ending describes fictional residents' circumstances, not a judgement of real policy outcomes.
这一局的社区|||Your neighbourhood this time
重新接手社区？|||Start the neighbourhood again?
本次经营记录会被新的开局替代。你可以先在社区记录中回看已经做过的决定。|||A new game will replace this playthrough. You can first review your decisions in the neighbourhood journal.
重新开局|||Start again
继续这一局|||Continue this game
从楼下的小事开始|||Start with everyday life downstairs
点居民，认识他们的日常；点来信，了解发生的事。|||Select residents to learn about their daily lives. Open letters to discover what is happening.
打开牌库，查看预算、人手、用地与工期；点击现实对照了解政策。|||Open the cards to check budgets, staff, land and construction time. Read the real-world context to learn about the policies.
有用地要求的牌，需在地图上选择合适的位置。|||Cards that need land require a suitable site on the map.
安排后回到地图，等工程完工和后续来信；问题长期不处理会恶化。|||Return to the map after arranging an action. Wait for completion and follow-up letters. Unaddressed problems worsen over time.
让三个社区目标同时达标并保持一段时间。|||Meet all three neighbourhood goals together and keep them stable for a while.
居民信任与「处得来」分别计算；持续运营的服务会占用人手。用地一旦被设施占用，本局不能用于另一设施。|||Resident trust and community ties are calculated separately. Ongoing services keep staff assigned. Once a facility occupies a site, that site cannot host another facility this game.
阅读和选址时自动暂停。右上角可手动暂停或加速，进度会自动保存在本浏览器。|||Reading and choosing a site pause time automatically. Pause or speed up manually at the top right. Progress is saved automatically in this browser.
回到社区|||Back to the neighbourhood
查看通关条件|||View completion conditions
玩法说明|||How to play
已继续上次的经营。|||Your previous game has resumed.
Downstairs 金文泰：夕阳下的组屋社区经营试玩。认识八户邻居，在有限预算、人手和空间中作出决定。|||Downstairs Clementi: a neighbourhood-management demo in a sunset HDB estate. Meet eight households and make decisions with limited budgets, staff and space.
Downstairs · 金文泰|||Downstairs · Clementi
金文泰全屏互动社区|||Full-screen interactive Clementi neighbourhood
一个社区。|||One neighbourhood.
继续在这里发生的日常。|||Everyday life carries on here.
金文泰 · 单案例试玩|||Clementi · single-case demo
经营资源|||Management resources
切换经营速度|||Change game speed
显示与帮助|||Display and help
收起或展开面板|||Collapse or expand panels
收起面板，查看整个社区|||Collapse panels to view the whole neighbourhood
◫ 面板|||◫ Panels
行动牌与来信|||Action cards and letters
行动类别|||Action categories
⚒ 设施|||⚒ Facilities
▤ 政策|||▤ Policies
♧ 服务|||♧ Services
每个安排，都改变楼下的日常。|||Every action changes life downstairs.
全部牌库 |||All cards 
选牌、阅读时暂停|||Pauses while choosing cards or reading
居民来信|||Resident letters
邻里的声音|||Neighbourhood voices
点开信封|||Open the envelope
邻居与目标|||Neighbours and goals
八户虚构居民|||Eight fictional households
走近一个人，再理解一个决定。|||Know a neighbour. Understand a decision.
社区近况|||Neighbourhood today
通关条件 ↗|||Completion conditions ↗
↺ 社区记录与进行中的工程 ↗|||↺ Journal and projects underway ↗
社区示意街区|||Illustrative neighbourhood
镜头控制|||Camera controls
⌂ 社区|||⌂ Neighbourhood
向左旋转|||Rotate left
向右旋转|||Rotate right
缩小|||Zoom out
放大|||Zoom in
重置镜头|||Reset camera
◈ 用地|||◈ Land
收起或展开侧栏|||Collapse or expand side panels
拖动旋转 · 滚轮缩放 · 点击居民或地块|||Drag to rotate · Scroll to zoom · Select a resident or site
人物、地块与数值为游戏设定|||Characters, sites and values are game settings
现实对照 ↗|||Real-world context ↗
浮动面板|||Floating panels
⚒ 行动与来信|||⚒ Actions and letters
♟ 邻居与目标|||♟ Neighbours and goals
金文泰|||Clementi
设施|||Facility
政策|||Policy
服务|||Service
活动|||Activity
（虚构角色）|||(fictional character)
社区设施|||Neighbourhood facility
居民|||Resident
托育与儿童设施|||Childcare and children's facilities
结伴探访|||Befriending visits
社区活动|||Community gathering
EIP个案支援|||EIP case support
居家改造|||Home modifications
社区正在生活|||Everyday life continues
三个目标同时达标并保持|||Meet all three goals together for
即可完成这一局。任一目标低于|||to complete this game. If any goal falls below
并持续|||for
全部牌库|||All cards
切换语言|||Change language
当前指引|||Current guidance
新加坡选址地图|||Singapore case-selection map
选址地图使用 Natural Earth 的公开地理轮廓数据，地点标记为大致镇区位置。|||The selection map uses public-domain Natural Earth geographic data. Location markers indicate approximate town positions.
金文泰社区背景|||Clementi town background
政府介绍记录了金文泰的旧镇发展、市场食阁、诊所和综合商业交通设施。演示街区据此组织日常功能，具体道路、楼栋和用地为游戏示意。|||The government account describes Clementi's established town, market and food centre, polyclinic, and integrated commercial and transport facilities. These inform the demonstration; individual roads, blocks and sites are illustrative.
A栋底层空间|||Block A void deck
金文泰社区|||Clementi neighbourhood
规划示意区|||Illustrative planning area
A栋|||Block A
金文泰 · 旧组屋|||Clementi · older HDB blocks
金文泰 · 社区日常|||Clementi · everyday neighbourhood life
社区接驳|||Community shuttle
美兰的食阁摊位|||Meilan's hawker stall
玉英又来喝咖啡了|||Mdm Chen is back for coffee
邻里互助|||Neighbours helping neighbours
居家安全改善|||Safer at home
无障碍接驳|||Accessible connection
施工中|||Under construction
进入金文泰社区|||Enter the Clementi neighbourhood
周边规划示意区|||Surrounding planning area (illustrative)
旧组屋 A · 点击亮着的住户窗口|||Older Block A · select a lit household window
已有用途或规划保留 · 不能建设|||Already in use or reserved · no construction
正在施工|||Work in progress
查看设施|||View facility
此地块不适合所选安排|||This site does not suit the selected action
查看用地条件|||View site conditions
认识|||Meet 
查看居民档案|||View resident profile
可安排|||Available: 
金文泰互动社区：拖动旋转，滚轮缩放，点击地块、设施或八户居民的窗口。|||Interactive Clementi neighbourhood: drag to rotate, scroll to zoom, and select sites, facilities or the eight households' windows.
浏览器未能打开3D场景。可刷新页面，或在支持WebGL的浏览器里继续。|||The browser could not open the 3D scene. Reload the page or continue in a browser that supports WebGL.
正在发生|||Happening now
点击社区里的发光气泡，了解发生了什么。|||Select a glowing bubble in the neighbourhood to see what is happening.
去看看|||Take a look
稍后|||Later
有件新事情正在发生|||Something is happening
居民正在等你回应|||A neighbour is waiting for your reply
工程进行中|||Work in progress
回到地点地图|||Choose a neighbourhood
可沿路线改造|||Route improvements available
可用公共空间|||Available shared space
可用室内空间|||Available indoor space
大地块 · 只能择一|||Large site · choose one use
可作安全改造|||Safety improvements available
规划锁定 · 不可建|||Reserved · no construction
库马尔一家|||The Kumar family
合租学生|||Student housemates
学生|||Students
合资格屋主|||Eligible flat owners
长者|||Older residents
社区关怀公寓|||Community Care Apartments
邻里更新|||Neighbourhood renewal
照护住房 / 托育 · 用地择一|||Supported housing / childcare · choose one use
稳定|||Stable
仍有需求|||Needs support
面临困难|||Facing difficulties
，查看居民档案|||; view resident profile
，可放置所选设施|||; selected facility can be placed here
金文泰社区示意地图。可点击地块和居民，查看空间条件与住户故事。|||Illustrative Clementi neighbourhood map. Select sites and residents to explore available spaces and household stories.
旧组屋 A|||Older Block A
旧组屋 B|||Older Block B
旧组屋 C|||Older Block C
旧组屋 D|||Older Block D
旧组屋 E|||Older Block E
旧组屋 F|||Older Block F
旧组屋 G|||Older Block G
旧组屋 H|||Older Block H
新组屋|||Newer HDB blocks
美兰的摊位|||Meilan's stall
菜市场与日常商店|||Market and neighbourhood shops
金文泰站方向 · EW23|||Towards Clementi MRT · EW23
巴士转换站方向|||Towards the bus interchange
综合诊所方向|||Towards the polyclinic
邻里公园|||Neighbourhood park
既有用途 · 不能建设|||Already in use · no construction
熟悉的路又通了|||A familiar route is open again
需要关注|||Needs attention
点击认识这里的居民|||Select to meet a neighbour
金文泰互动街区：拖动旋转，滚轮缩放，点击居民、地块或地图上的来信。|||Interactive Clementi neighbourhood: drag to rotate, scroll to zoom, and select residents, sites or letters on the map.
新住户|||New neighbours
租住|||Rental homes
邻里|||Neighbours
住家|||Homes
食阁|||Hawker centre
日常商店|||Neighbourhood shops
金文泰站方向|||Towards Clementi MRT
示意方位|||Illustrative orientation
虚线地块可查看用地条件|||Select outlined sites for land-use conditions
规划保留|||Reserved by plan
社区空间与居民均为游戏示意，非真实可开发地块。|||Spaces and residents are illustrative game settings, not actual developable sites.
关怀|||Care
邻里更新支持进度 |||Neighbourhood renewal support 
邻里更新支持进度|||Neighbourhood renewal support
新消息：|||New letter: 
已回应：|||Answered: 
等待中的变化：|||While waiting: 
已安排：|||Arranged: 
完成：|||Completed: 
拟安排：|||Proposed action: 
用地：|||Site: 
工期 |||Construction: 
来自 |||From 
经营|||Running
已暂停|||Paused
 人||| staff
 岁||| years old
 秒||| seconds
秒||| seconds
 人手||| staff
`);






  // BEGIN APPROVED UPGRADE TRANSLATIONS
  add(`
约定作息并当面调解|||Agree quiet hours together
居民信任 -3；先建立安静时段，后续仍需相处机会|||Trust -3; agree quiet hours, then keep building relationships.
建议延长出售安排|||Extend the sale arrangements
居民信任 -3；暂缓压力，90 秒后需要后续支持|||Trust -3; eases immediate pressure, with follow-up in 90 seconds.
安排换房咨询|||Arrange housing advice
预算 8；先厘清可行的住房与援助选择|||Budget 8; clarify housing and assistance options.
补上换房与援助咨询|||Follow up with housing advice
预算 10；屋主 +16，明确后续选择|||Budget 10; owners +16, with a clearer next step.
约好时间，建立互助联系|||Agree a time to help
处得来 +5；长者与租户各 +5|||Community ties +5; older residents and tenants +5.
保留随手帮忙的方式|||Keep help informal
处得来 +3；租户 +3，不新增持续服务|||Community ties +3; tenants +3; no new ongoing service.
公开解释个案审理原则|||Explain individual case review
预算 8；处得来 +7，居民信任 +4|||Budget 8; community ties +7; trust +4.
与有疑问的住户分别谈谈|||Speak with concerned neighbours
居民信任 -3；处得来 +8|||Trust -3; community ties +8.
先继续个案跟进|||Continue following up the case
屋主 +4；暂不消除社区疑问|||Owners +4; community questions remain.
保留花园，先做分散支持|||Keep the garden for now
年轻家庭 +3；照护需求仍通过其他服务处理|||Young families +3; care needs still require other support.
利用现有空间安排亲子支持|||Use existing space for family support
预算 12；年轻家庭 +14、处得来 +3|||Budget 12; young families +14; community ties +3.
安排专项照护服务咨询|||Arrange a care-service consultation
预算 12；照护家庭 +12，不新增日间照护设施|||Budget 12; caregiving households +12; no new day-care facility.
支持她调整营业与邻里安排|||Support a more restful stall routine
预算 10；长者 +5、处得来 +4，保留相聚时间|||Budget 10; older residents +5; community ties +4.
用现有居民角安排相聚|||Meet at the existing residents’ corner
使用已建居民角，不再扣建设费或新增人手；长者 +4、处得来 +4|||Use the completed corner with no new construction cost or staff; older residents +4; community ties +4.
发起公开投票与意见征集|||Open voting and feedback
初始支持率 58%；不会把居民信任直接换算成选票|||Starts at 58% support; trust is not converted into votes.
先做小范围更新，再征集意见|||Improve locally, then ask again
居民信任 +2；60 秒后重新提出请愿|||Trust +2; the petition returns in 60 seconds.
说明工程内容与施工影响|||Explain the proposed works
预算 8；支持率 +12 个百分点，只进行一次|||Budget 8; voting support +12 percentage points, once.
逐户听取意见并修改安排|||Listen door to door
居民信任 -3；支持率 +10 个百分点，只进行一次|||Trust -3; voting support +10 percentage points, once.
把反馈记下来，继续留意|||Record the feedback and keep watching
居民信任 +3；这条路线的承诺已兑现|||Trust +3; the promise on this route has been kept.
A 栋门前步行段|||Block A approach
连接旧组屋与食阁的另一段露天路；可沿既有步道加盖，让陈玉英接上熟悉的食阁路线。|||An alternative uncovered section between the older blocks and hawker centre. A shelter here connects Mdm Chen to her familiar route.
陈玉英与旧组屋住户|||Mdm Chen and older-block residents
食阁西侧接驳步道|||West hawker approach
食阁西侧的绕行接驳段；沿现有路线加盖，同样改善长者前往食阁的连续通路。|||The western approach to the hawker centre. Sheltering this existing section also improves the continuous route for older neighbours.
长者与食阁访客|||Older residents and hawker visitors
B 栋底层公共空间|||Block B void deck
B 栋现有底层空间，可安排居民角；更接近拉赫曼夫妇日常活动的位置。|||An existing shared ground-floor space in Block B, suitable for a residents’ corner near Rahman and Noor.
B 栋居民与换房屋主|||Block B neighbours and owners looking to move
西侧社区空置房间|||West community room
组屋西侧可改装的现有小房间；可设活动与转介服务，保留街角花园。|||An existing small room west of the blocks, suitable for activities and referrals while leaving the corner garden available.
西侧长者与照护家庭|||Older and caregiving households on the west side
南侧过街接驳处|||Southern crossing connection
南侧道路与住宅步道之间的高差接驳；可增设坡道，不替代遮雨路线。|||A level change between the southern road and residential path. A ramp helps access but does not shelter the route.
南侧家庭与行动不便的住户|||Southern households and neighbours with mobility needs
暂时没有需要这项行动的情境。先观察社区或查看来信。|||No current situation needs this action. Observe the neighbourhood or check your mail.
花园已有工程或设施，不能再承诺保留原状。|||The garden already has works or a facility. You cannot promise to keep it unchanged.
请把设施放在描边范围内，并使用四分之一圈的朝向。|||Keep the facility within the outlined area and use a quarter-turn orientation.
需要先完成居民角，再用现有空间安排相聚。|||Complete the residents’ corner before using it for gatherings.
放置位置超出这片空间的边界。|||The placement is outside this space.
走廊与坡道需要顺着现有通路放置。|||Linkways and ramps must follow the existing path.
住在这里的人|||Your neighbours
你的行动卡|||Your action cards
打开全部牌库|||Open all cards
拿起一张，看看能改变什么|||Pick up a card. Explore what it can change.
人物与地块为游戏示意|||Illustrative characters and sites
社区观察|||Neighbourhood observations
社区记录|||Neighbourhood journal
地点地图|||Location map
暂停经营|||Pause the simulation
切换经营速度|||Change simulation speed
三个目标与互动说明|||Three goals and interactive guide
`);
  // END APPROVED UPGRADE TRANSLATIONS

  const patterns = [
    [/^DOWNSTAIRS · 第\s*(\d+)\s*\/\s*10\s*年$/,(_,n)=>'DOWNSTAIRS · Year '+n+' / 10'],

    [/^第\s*(\d+)\s*\/\s*10\s*年$/,(_,n)=>'Year '+n+' / 10'],
    [/^第\s*(\d+)\s*年(.*)$/,(_,n,tail)=>'Year '+n+translate(tail)],
    [/^开始第\s*(\d+)\s*年$/,(_,n)=>'Start year '+n],
    [/^进入第\s*(\d+)\s*年$/,(_,n)=>'Start year '+n],
    [/^(\d+)\s*项$/,(_,n)=>n+' needs'],

    [/^预算还差 (\d+)。预算会随时间恢复。$/, (_, n) => `You need ${n} more budget units. Budget recovers over time.`],
    [/^预算不足，需要 (\d+)。$/, (_, n) => `Not enough budget. This action needs ${n}.`],
    [/^请在地图上选择：(.*)。$/, (_, site) => `Choose on the map: ${translate(site)}.`],
    [/^已安排：(.*)（(\d+) 秒）$/, (_, title, n) => `Arranged: ${translate(title)} (${n} seconds)`],
    [/^(.*)已安排；完成后会看到居民与地图的变化。$/, (_, title) => `${translate(title)} arranged. Residents and the map will change on completion.`],
    [/^完成：(.*?)。(.*)$/, (_, title, effects) => `Completed: ${translate(title)}. ${translate(effects)}`],
    [/^新消息：(.*)$/, (_, title) => `New letter: ${translate(title)}`],
    [/^已回应：(.*)$/, (_, title) => `Answered: ${translate(title)}`],
    [/^等待中的变化：(.*)$/, (_, title) => `While waiting: ${translate(title)}`],
    [/^居民投票达到 (\d+)%，可以启动邻里更新。$/, (_, n) => `Resident support has reached ${n}%. Neighbourhood renewal can begin.`],
    [/^意见征集后，投票支持率为 (\d+)%[。.]$/, (_, n) => `After feedback, voting support is ${n}%.`],
    [/^投票支持率 (\d+)%[。.](.*)$/, (_, n, tail) => `Voting support ${n}%. ${translate(tail)}`],
    [/^社区三目标：住得下(\d+)，处得来(\d+)，住得舒服(\d+)$/, (_, a, b, c) => `Three neighbourhood goals: room to stay ${a}, community ties ${b}, liveability ${c}`],
    [/^(\d+) \/ 5 类居民状态稳定$/, (_, n) => `${n} / 5 resident groups stable`],
    [/^有目标低于危险线：(\d+) \/ 45 秒$/, (_, n) => `Goal below danger line: ${n} / 45 seconds`],
    [/^日常正在稳定下来 · (\d+) \/ 60 秒$/, (_, n) => `Everyday life is stabilising · ${n} / 60 seconds`],
    [/^正在安排「(.*)」 · 点击地图上的合适位置$/, (_, title) => `Arranging “${translate(title)}” · choose a suitable site on the map`],
    [/^持续占用 (\d+) 人$/, (_, n) => `Ongoing staff assignment: ${n}`],
    [/^工期 (\d+) 秒$/, (_, n) => `Construction: ${n} seconds`],
    [/^工期 即时$/, () => 'Immediate'],
    [/^预算 (\d+)$/, (_, n) => `Budget ${n}`],
    [/^达标线 (\d+)$/, (_, n) => `Target ${n}`],
    [/^(收起|打开)来自(.*)的信$/, (_, action, name) => `${action === '收起' ? 'Close' : 'Open'} letter from ${translate(name)}`],
    [/^(.*)：还需 (\d+) 秒。$/, (_, title, n) => `${translate(title)}: ${n} seconds remaining.`],
    [/^剩余 (\d+) \/ (\d+) 秒$/, (_, n, total) => `${n} / ${total} seconds remaining`],
    [/^(\d+(?: \/ \d+)?|\d+–\d+) 岁 · (.*)$/, (_, age, rest) => `Age ${age} · ${translate(rest)}`],
    [/^来自 (.*)$/, (_, person) => `From ${translate(person)}`],
    [/^经营 (\d\d:\d\d)$/, (_, time) => `Running ${time}`]
  ];
  Object.entries(root.CM_YEAR_TRANSLATIONS||{}).forEach(([zh,en])=>dictionary.set(zh,en));
  let language = 'zh';
  try { const saved = root.localStorage?.getItem('downstairs-clementi-language'); if (saved === 'en' || saved === 'zh') language = saved; } catch (_) {}
  const cache = new Map();
  const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tokenRegex = new RegExp([...dictionary.keys()].sort((a, b) => b.length - a.length).map(escapeRegex).join('|'), 'g');

  function translate(text) {
    text = String(text == null ? '' : text);
    if (!/[\u3400-\u9fff]/.test(text)) return text;
    if (cache.has(text)) return cache.get(text);
    const exact = dictionary.get(text);
    if (exact != null) return exact;
    const trimmed = text.trim();
    if (dictionary.has(trimmed)) return text.replace(trimmed, dictionary.get(trimmed));
    for (const [pattern, replacement] of patterns) {
      if (pattern.test(trimmed)) {
        const result = trimmed.replace(pattern, replacement);
        cache.set(text, result);
        return text.replace(trimmed, result);
      }
    }
    if (text.includes('\n')) {
      const result = text.split('\n').map(translate).join('\n');
      cache.set(text, result);
      return result;
    }
    const result = text.replace(tokenRegex, key => dictionary.get(key)).replace(/，/g, ', ').replace(/：/g, ': ').replace(/。/g, '.').replace(/；/g, '; ');
    cache.set(text, result);
    return result;
  }
  function t(text) { return language === 'en' ? translate(text) : String(text == null ? '' : text); }
  const originalText = new WeakMap(), originalAttributes = new WeakMap();
  function localize(rootElement) {
    if (!rootElement) return;
    const doc = rootElement.ownerDocument || (rootElement.nodeType === 9 ? rootElement : root.document);
    if (!doc?.createTreeWalker) return;
    const walker = doc.createTreeWalker(rootElement, 4);
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentElement?.closest('script,style,textarea,[data-i18n-ignore]')) continue;
      const current = node.nodeValue, saved = originalText.get(node);
      const source = saved && current === saved.rendered ? saved.source : current;
      const rendered = t(source);
      if (current !== rendered) node.nodeValue = rendered;
      originalText.set(node, { source, rendered });
    }
    const elements = [rootElement, ...(rootElement.querySelectorAll ? rootElement.querySelectorAll('[title],[placeholder],[aria-label]') : [])];
    elements.forEach(element => {
      if (!element.getAttribute || element.closest?.('[data-i18n-ignore]')) return;
      const saved = originalAttributes.get(element) || {};
      ['title', 'placeholder', 'aria-label'].forEach(attribute => {
        if (!element.hasAttribute(attribute)) return;
        const current = element.getAttribute(attribute), previous = saved[attribute];
        const source = previous && current === previous.rendered ? previous.source : current;
        const rendered = t(source);
        if (current !== rendered) element.setAttribute(attribute, rendered);
        saved[attribute] = { source, rendered };
      });
      originalAttributes.set(element, saved);
    });
    if (doc.documentElement) doc.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
  }
  function setLanguage(lang) {
    const next = lang === 'en' ? 'en' : 'zh';
    const changed = next !== language;
    language = next;
    try { root.localStorage?.setItem('downstairs-clementi-language', next); } catch (_) {}
    if (root.document?.body) localize(root.document.body);
    if (root.document) root.document.title = next === 'en' ? 'Downstairs · Clementi' : 'Downstairs · 金文泰';
    if (changed && root.dispatchEvent && root.CustomEvent) root.dispatchEvent(new root.CustomEvent('localechange', { detail: { language: next } }));
    return next;
  }
  function card(c) { return c ? Object.assign({}, c, { title: t(c.title), desc: t(c.desc), effects: t(c.effects), source: c.source ? Object.assign({}, c.source, { title: t(c.source.title), text: t(c.source.text) }) : c.source }) : c; }
  function resident(r) { return r ? Object.assign({}, r, { name: t(r.name), role: t(r.role), home: t(r.home), summary: t(r.summary), wants: Array.isArray(r.wants) ? r.wants.map(t) : t(r.wants), relations: (r.relations || []).map(value => typeof value === 'string' ? t(value) : Object.assign({}, value, { text: t(value.text) })) }) : r; }
  root.CM_I18N = Object.freeze({ getLanguage: () => language, setLanguage, t, localize, card, resident });
})(typeof window !== 'undefined' ? window : globalThis);
