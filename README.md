# 爬塔杀（pts）

「外壳仿《杀戮尖塔》、内核为原版三国杀」的爬塔单机卡牌游戏，软件工程课程小组项目。

## 定位

基于开源卡牌引擎《无名杀》（noname，GPL-3.0）fork：战斗层复用三国杀标准规则（杀/闪/桃/酒/锦囊/装备/距离/判定/濒死，标准 160 张牌堆），爬塔层自研（15 层地图、节点调度、奖励、存档）。

## 目录结构

- `resources/app/mode/pts.js` — 唯一模式入口（选将·拼音检索 / 开局 / 存档 / 结算）
- `resources/app/src/pts/` — 自研爬塔层
  - `balance.js` 全部可调数值
  - `map/gen.js` 地图生成（随机游走 + 连通校验）
  - `map/ui.js` 地图渲染（SVG/DOM）
  - `node.js` 节点调度（战斗/精英/BOSS/篝火/宝箱/商店）
  - `hud.js` 顶栏 HUD
  - `battle.js` 对局搭建（敌将抽取/布场/发牌/胜负/真卡组注入）
  - `deck.js` 牌组纯逻辑（牌串编解码/迁移/删除）
  - `reward.js` 奖励纯逻辑（改牌候选/技能过滤/加牌）
  - `reward_ui.js` 战后三选一浮层
  - `shop.js` 商店纯逻辑（货单生成/交易守卫）
  - `shop_ui.js` 商店浮层
- `tests/` — node 直跑测试（`test_deck.mjs` / `test_reward.mjs` / `test_shop.mjs` / `test_gen.mjs`）
- `resources/app/game/config.json` — 模式与数值配置
- `文档/` — 需求、规范、进度、可行性分析、SSS/SRS 等全套文档

## 技术栈

JavaScript（无名杀引擎）· Electron · pinyin-pro（选将拼音检索）

## 许可

遵循 GPL-3.0（无名杀本体许可证），非商业用途。

## 成员

- j（蒋琪煜，组长）— 项目管理
- w（吴成毅）— 技术开发
- d — 界面与设计
- c — 测试与质量
