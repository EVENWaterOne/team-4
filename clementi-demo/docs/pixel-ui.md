# 像素界面设计规范（Downstairs · Clementi）

界面视觉跟随期末汇报幻灯片（Figma：CDE5311 Final Presentation · Downstairs Clementi），同时参考像素街景游戏（如《Đất 3 Miền》）的做法：像素标题字、米色横线纸、深藏青底、方角、无模糊的硬阴影、蓝色小标签、虚线分隔。

所有规则都写在 `dist/pixel-*.css`，并以 `html[data-ui="pixel"]` 开头。去掉 `dist/index.html` 里 `<html>` 上的 `data-ui="pixel"` 就能回到旧界面，游戏逻辑与旧 CSS 都没有改动。

| 文件 | 负责的界面 |
| --- | --- |
| `pixel-fonts.css` | 字体（`scripts/build-pixel-fonts.py` 生成，base64 内嵌，离线单文件同样可用） |
| `pixel-theme.css` | 设计变量、按钮、标签、弹窗外框、提示条、地图文字标签、滚动条、焦点框 |
| `pixel-flow.css` | 开场页、选择社区、金文泰介绍、加载页 |
| `pixel-hud.css` | 顶栏（年份路线、三项目标、资源、工具）、七年路线、收支面板、提示条、底部入户/需求区、四步进度与下一步按钮、声音面板 |
| `pixel-room.css` | 入户弹窗：房间、光标标签、物件卡、故事书签、对话记录、聊开程度、回应按钮、输入框、敲门婉拒场景 |
| `pixel-cards.css` | 需求详情、选卡（正面、背面、悬停、选中）、本年需求列表、落实面板、年报、七年结局、紧急警报 |
| `pixel-guide.css` | 玩法说明、走访笔记、对话方式设置、新手教程气泡与聚光圈 |

## 1. 两种“纸面”

- **墨蓝页（深色幻灯片）**：`--px-ink #141c2f` 底，每 48px 一条短虚线（`--px-ruled-ink`）。用于弹窗外框和地图上的面板（面板用 `--px-navy #1e2c48`）。
- **米色横线纸（浅色幻灯片）**：`--px-paper #f2ebdd` 底，每 32px 一条横线（`--px-ruled-paper`）。用于开场三页、玩法说明的内页、笔记本和年报纸。
- **卡片**：`--px-card #fbf6ea`，2px 藏青描边，4px 硬阴影（蓝 `--px-blue-dk` 或藏青 `--px-ink`）。放在墨蓝页上时可以改用金色描边（幻灯片第 10 页的做法）。

纸面上的字一律用深色（`--px-text-ink`），墨蓝页上的字一律用浅色（`--px-text`）。不要在一个容器里混用。

## 2. 颜色

| 变量 | 色值 | 用途 |
| --- | --- | --- |
| `--px-gold` | #e9c77b | 主按钮、标题字、当前项、金色那句需求 |
| `--px-red` | #b5483a | 标题字的立体阴影、主按钮阴影、紧急、扣分 |
| `--px-blue` / `--px-blue-dk` | #2b4fc0 / #16297a | 小标签、次按钮、卡片阴影 |
| `--px-teal` | #4fb3c4 | 处得来、你说的话、住户 |
| `--px-orange` | #e8964a | 住得下 |
| `--px-green` | #8cc46b | 住得舒服、达标 |
| `--px-slate` / `--px-gray` | #5b6478 / #9aa1ae | 次要文字、禁用 |

三项目标固定：住得下=橙、处得来=青、住得舒服=绿（幻灯片第 5 页）。

## 3. 字体

| 变量 | 字体 | 用在哪里 |
| --- | --- | --- |
| `--px-font-display` | Jersey 10 → Downstairs Pixel SC | 大标题、按钮、大数字（如 57、100） |
| `--px-font-label` | Silkscreen → Downstairs Pixel SC | 小标签、栏目名、步骤名；英文全大写、字距 .12em |
| `--px-font-pixel` | Downstairs Pixel SC | 只有中文的像素小字（地图标签） |
| `--px-font-body` | Be Vietnam Pro → 系统中文黑体 | 正文、对话、说明 |

中文像素字以 12px 为一格：只用 **12 / 24 / 36 / 48px**，其它字号会发糊。正文不用像素字。

标题“立体字”：金色字配 `--px-extrude-red`（墨蓝页），红色字配 `--px-extrude-ink`（米色纸）。

## 4. 形状与阴影

- 圆角一律为 0。人物脚下的光环、圆点进度可以保留圆形。
- 描边 2px（大框 3px）。墨蓝面板：外描边 `--px-ink-2`，内侧 2px 斜面 `--px-navy-3`（`--px-panel-shadow`）。
- 阴影只用硬阴影：`4px 4px 0` 或 `8px 8px 0`，不带模糊。不用毛玻璃（`backdrop-filter`）和柔和渐变；进度条、色块都是平涂。
- 分隔线用虚线（`--px-dashed-gold` / `--px-dashed-ink`）。

## 5. 组件

- **主按钮**：金底、2px 藏青描边、红色硬阴影；悬停上移 1px，按下下移 3px、阴影收成 1px。
- **次按钮**：蓝底白字、深蓝阴影。
- **小标签**（`.px-tag`、弹窗的 `.eyebrow`）：蓝底白字，Silkscreen 12px，3px 深蓝阴影；另有金、红、青、墨四种。
- **栏目页签**：面板左上角凸出一个藏青小页签，金色 Silkscreen 字（幻灯片第 2 页 “PERSONA”）。
- **进度条**：米色轨道、2px 藏青描边、平涂填充、70 处一条藏青刻度。
- **四步进度**：像素方块按钮串，当前步为红底（幻灯片第 5 页 VISIT → DECIDE → ACT → REPORT）。
- **照片框**：白色宽边宝丽来，微微倾斜，硬阴影。

## 6. 动效

短、硬、成段：`steps()` 或 0.08–0.2 秒；按钮按下有位移。遵守 `prefers-reduced-motion`。

## 7. 检查

- `node --test tests/*.cjs` 全部通过。
- 中文与英文、1440×900、1152×760、390×844 都不出现文字溢出或横向滚动。
- 改字后重新运行 `python3 scripts/build-pixel-fonts.py`，再 `node package-offline.cjs` 生成离线单文件。
