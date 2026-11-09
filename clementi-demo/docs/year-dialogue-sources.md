# 年度居民对白来源

本轮沿用 Clementi 的八户人物，扩写了 24 句可轮换的生活对白、八个短场景，以及 32 条与本户已观察物件对应的简短回应。静态对白不是额外任务，不改变资源、政策或年度结果。年度重点户首先说本年 `year-engine.js` 的具体需要，再补一句本户生活口吻；其他住户只交流自己的近况。

| Clementi 角色 | 内容依据 | 改写范围 |
| --- | --- | --- |
| 陈玉英 | `dist/resident-talk.js:157`、`dist/data.js:12`、`dist/home-exploration.js:17` | 熟悉的家、食阁、咖啡、雨天出门与熟人联系 |
| 拉赫曼与努尔 | `dist/resident-talk.js:158`、`dist/data.js:13`、`dist/home-exploration.js:22` | 换小屋、手边资料、想弄清下一步；不保证成交 |
| 林家 | `dist/resident-talk.js:159`、`dist/data.js:14`、`dist/home-exploration.js:27` | 双职工日程、孩子附近的活动与安全路线；不把孩子固定写成婴儿 |
| 库马尔与德薇 | `dist/resident-talk.js:160`、`dist/data.js:15`、`dist/home-exploration.js:32` | 轮流照料母亲、服务资料和正式照护联系；友伴不能替代专业照护 |
| 合租学生 | `dist/resident-talk.js:161`、`dist/data.js:16`、`dist/home-exploration.js:37` | 上课、作业、共同生活空间、向邻居说明作息 |
| 黄美兰 | `dist/resident-talk.js:162`、`dist/data.js:17`、`dist/home-exploration.js:42` | 摊台与熟客、自己选择休息、不让聚点依赖她一直开摊 |
| 张叔 | `dist/resident-talk.js:163`、`dist/data.js:18`、`dist/home-exploration.js:47` | 请人坐下、解释决定、让本人表达及核实转述 |
| 阿丽 | `dist/resident-talk.js:164`、`dist/data.js:19`、`dist/home-exploration.js:52` | 排班、白天休息、适合自己时间的邻里联系；护士身份不代表免费照护义务 |

行号对应本轮修改前的源角色资料，场景扩写只使用对应户的物件与生活事实。程序中的 `VOICES` 按 residentId 明确隔离；模型只接收当前户的口吻示例、当年需要、实际看过的物件名和本户最近对话，不接收其他户的对白库。

## 从 downstairs-ai 迁移的内容

工作区另一个仓库的 `downstairs-ai/prototype-v0.2/js/mock.js:8–64` 提供了短句轮换、生活口吻和克制动作旁白的结构；`prompts.js:495`、`:532` 提供当前年份与本人所知的视角限制。室内网格走动、接近人物再交谈、点物件观察继续保留。

没有直接搬用其同名人物的台词或经历：`world.js:68–80` 的陈好并非陈玉英；`:103–108` 的林家并非 Clementi 林家；`:181–187` 的 Rahman 并非拉赫曼与努尔这一户；`:323–346` 的 Kumar 是另一位人物，不能把宿舍、水管、Lakshmi 或 Priya 等内容交给照护夫妻。

## 年份与记录

`dist/year-engine.js` 的当年故事优先于静态角色口吻及保留的房间摆设。林家第 2 年孩子五岁与两岁、第 6 年九岁与六岁、第 10 年十三岁与十岁；旧推车不能让后期对白倒退为婴儿期。

林家的推车、活动角、日程与积木说明按当年生活阶段展示，保存的物件 ID 不保存过时年龄。物件追问优先回应已实际看过的本户物件，避免每次都复读整段年度需要；未观察或属于别户的物件不会凭玩家提问自动成为发现。

一次有效对白仍由引擎记录交流，主界面立即刷新需求板，房间保持打开。只有玩家点击“返回社区”才退出。聊天不改变资金、人力、资产、政策或回合；自由近况不新增年度政策。

## 六户住家版（新增）

黄美兰与张叔不再是可探访住家，他们的 `VOICES` 与房间不再进入年度游戏；其他住户的故事里仍会提到他们（如黄美兰替陈玉英留位子、送阿丽辣椒苗）。年度游戏的房间与物件改由 `dist/year-content.js` 提供，每户10个物件，各有观察文字与第一人称故事；旧的 `OBJECT_VOICES` 物件回应由这些故事取代。`home-exploration.js` 原样保留给旧版入口。

新增的五项年度需求（`retired-days`、`not-on-call`、`hawker-seat`、`works-and-mother`、`old-friends-corner`）沿用各户已有设定：拉赫曼是退休巴士车长、阿丽是轮班护士且职业不意味着免费照护邻居、陈玉英每天到食阁见熟人、库马尔与德薇照护母亲。每项需求的第一人称金色句子见 `voiceNeed`。物件故事使用的新加坡背景（甘榜搬迁、丽的呼声与李大傻讲古、电梯翻新、预购组屋、建国一代配套、底层婚礼、转售的族群比例限制、Vasantham频道、乌鲁班丹公园连道、西海岸公园）是一般历史与制度背景，不对应真实住户。
