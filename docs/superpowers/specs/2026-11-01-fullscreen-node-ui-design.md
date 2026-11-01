# 节点交互满屏画面改造 设计

> 功能：商店、战后奖励、宝箱、篝火、事件等所有节点交互，从「小方框弹窗 / 底部 toast」统一改为满屏独立画面。

## 1. 目标与范围

- 节点交互（商店 / 战后奖励 / 宝箱 / 篝火 / 事件）全部改为满屏遮罩式画面（盖在地图上，关闭后回地图）。
- 战斗行动日志（arenalog）**不改**。

## 2. 现状

- 商店 / 战后奖励：`.pts-shop` / `.pts-reward`，居中 `min(520px, 92%)` 小方框。
- 宝箱 / 篝火 / 事件：`toast` 底部一行提示，无专门界面。

## 3. 设计

### 3.1 共享满屏层组件（新文件 `src/pts/screen.js`，纯 DOM，无 noname 依赖）

```js
openScreen(title) -> { root, body, footer, close }
screenButton(label, onclick, disabled) -> <button>
```

- `openScreen` 创建 `.pts-screen` 覆盖层：`position:fixed; inset:0; z-index:9998`，深色渐变背景（同地图主题），三栏结构：标题栏 `.hd`（64px）+ 内容区 `.body`（flex:1 可滚动）+ 按钮区 `.footer`。
- `close()` 仅移除该层；由调用方负责状态落盘与 `renderMap`。
- 复用前先 `document.querySelectorAll(".pts-screen")` 清旧层（避免叠加）。

### 3.2 商店（shop_ui.js 改）

- 用 `openScreen("商店")`；`footer` 放「离开」；金币显示放标题栏或内容顶部。
- 货单条目改为大卡片式（占满宽度），交互逻辑（购买/售罄置灰/同类全删子面板/火杀雷杀二选一）不变。

### 3.3 战后奖励（reward_ui.js 改）

- 用 `openScreen("战后奖励")`；三个大选项卡片（改牌方案 / 技能 / 加牌）+「跳过」。
- 改牌逐组、技能列表等既有逻辑不变，仅容器换成满屏。

### 3.4 宝箱 / 篝火 / 事件（node.js 改）

- 状态结算照旧，但展示从 `toast` 改为满屏结算卡：`openScreen(title)`，`body` 放结果文案，`footer` 放「继续」按钮（点击 `close()` 回地图）。
- `chestResolve` 从「内部 toast」改为「返回文案字符串」，由 node.js 展示。

## 4. 错误处理与风险

| 风险 | 处理 |
|---|---|
| 满屏层与地图/战斗层级冲突 | `z-index:9998`（地图 9990、toast 99999），关闭即移除 |
| 覆盖层叠加 | `openScreen` 先清旧 `.pts-screen` |
| 宝箱/篝火/事件多一次点击 | 接受（用户已确认），更清晰 |

## 5. 测试

- 无 node 单测（纯 UI）；`node --check` + 手测清单：商店/奖励满屏显示与按钮可用；宝箱/篝火/事件满屏卡 + 「继续」回地图；关闭后地图正常、HUD 同步刷新。

## 6. 涉及文件

- 新建 `resources/app/src/pts/screen.js`
- 改 `resources/app/src/pts/shop_ui.js`
- 改 `resources/app/src/pts/reward_ui.js`
- 改 `resources/app/src/pts/node.js`
