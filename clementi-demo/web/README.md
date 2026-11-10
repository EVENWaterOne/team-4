# 网页版部署（带 AI 对话）

这个文件夹把 `clementi-demo/dist` 原样做成公开网页，并加一个服务器端的 DeepSeek 代理，让线上也能用 AI 对话。游戏代码本身不改。

## 发布了什么

- `build.cjs` 只复制 `dist/index.html` 实际加载的文件（以及 three.js 和 downstairs-ai 的许可说明）到 `out/`，不带旧入口、留档 HTML 和美术源文件。
- 唯一的改动在复制出来的 `year-dialogue.js` 里：main 只在 127.0.0.1/localhost 打开 AI，网页版改成任何 http(s) 网址都走同站的 `/api/*`。原文件不动；这一行在 main 里变了，构建会直接报错提醒。
- `api/` 是代理，替代 `server.cjs`（`server.cjs` 不能放到公网上）：
  - Key 只从服务器环境变量 `DEEPSEEK_API_KEY` 读，浏览器拿不到。
  - 只接受本站页面发来的请求，只转发游戏自己的两段系统提示词（中文、英文，构建时从 `year-dialogue.js` 提取到 `api/_lib/prompts.mjs`），请求大小和问题长度有上限。
  - 每个访客每分钟最多 15 次、每小时 240 次对话（按服务器实例计，是减速带；真正的花费上限是 DeepSeek 账户余额）。
  - 模型默认 `deepseek-flash`（`deepseek-chat` 已于 2026-07-24 后停用），关闭思考模式，JSON 输出，最多 1000 tokens。可用环境变量 `DEEPSEEK_MODEL` 改。
  - 不记录玩家说的话。

## 部署（Vercel）

项目设置：Root Directory 设为 `clementi-demo/web`，Framework 选 Other，开启 "Include files outside the root directory"。构建命令和输出目录写在 `vercel.json` 里。

环境变量：`DEEPSEEK_API_KEY`（必填，建议单独开一个只充少量余额的 Key）、`DEEPSEEK_MODEL`（可选）。没有 Key 时网页照样能玩，对话自动用离线版。

## 改了游戏之后

运行 `node clementi-demo/web/build.cjs`。如果系统提示词变了，它会更新 `api/_lib/prompts.mjs`，把这个文件一起提交；不提交的话线上构建会报错停下，避免页面和代理对不上。

## 本地预览

```
node clementi-demo/web/build.cjs
node clementi-demo/web/serve.mjs --mock                 # 假的 DeepSeek 回复，不需要 Key
DEEPSEEK_API_KEY=... node clementi-demo/web/serve.mjs   # 真的 DeepSeek
```

然后打开 http://localhost:4173 。
