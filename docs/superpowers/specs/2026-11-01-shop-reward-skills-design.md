# 爬塔杀 商店/奖励/技能实装设计文档

- 日期:2026-11-01
- 状态:已与用户逐节讨论通过(方案A·真卡组驱动)
- 范围:FR-11 奖励三选一、FR-12 改牌、FR-13 技能、FR-15 商店、FR-16 宝箱、地图补 🛒 商店节点;**不含** FR-18 事件(维持占位)、FR-21 结算页(M5)
- 约束:只修改 `爬塔杀/pts/` 下文件;数值全部集中在 `src/pts/balance.js`;各文件 ≤500 行;存档 key 用 `pts_`/`pts_run` 前缀;GPL-3.0

## 0. 背景与现状缺口

| 现状 | 缺口 |
|---|---|
| `ptsState.deckCount:160` 是纯数字 | 改牌(4旧换1)/加牌/删牌/战斗牌组洗入(FR-10)都需要真实牌组数组 |
| `BAL.nodeProb` 四类和恰 1.0(无 shop) | 规范 §7 的 🛒 节点无法在地图生成 |
| `BAL.recipes/skills/shop/chest` 已有表 | 无任何消费逻辑;宝箱只给金币 |
| `ptsCheckResult` 胜后直接 `game.over(true)` | 无战后奖励三选一入口 |

## 1. 数据模型与存档扩展(向下兼容)

`_status.ptsState` 新增/改造字段:

```js
deck:  ["sha|spade|7|fire", "shan|heart|2", ...]   // 引擎牌 id 串数组(规范§5口径"以引擎牌 id 记录"),
                                                    // 四段式 name|suit|number|nature(nature 可省略);
                                                    // 火杀/雷杀在引擎中并非独立牌名,而是 sha 带
                                                    // fire/thunder 属性,standard+extra 160 张快照
skills: [],                                    // 已获技能 id 数组
rewardPending: { type: "battle"|"elite" } | null,   // 胜后待领奖励(BOSS 胜=通关,不发奖励)
shopInv: null | [商品对象数组],                 // 商店到场货单(进入节点时生成,防重入重摇)
```

- `deckCount` 改为派生值 `state.deck.length`(HUD 读它)。
- **迁移**:载入旧存档(无 `deck` 字段)→ 用引擎 standard+extra 全量快照补建 deck 与 skills/rewardPending/shopInv 缺省值后立即落盘。
- 牌串格式仅用于存档;运行时按需 `parseCard(str)` 还原为 `{n, s, v, nature?}`。

## 2. 卡组引擎 `src/pts/deck.js`(纯逻辑,零引擎依赖,可 node 直测)

对外接口(函数签名按规范文档 §6):

```js
deckFromTuples(tuples)                        // [[suit,number,name,nature?],…] → 160 张牌串数组;
                                              // 引擎侧由 battle.js pileTuples() 收集后传入,保持零依赖
count(deck, name)                             // 同名牌数(改牌候选依据,FR-12)
transform4to1(deck, recipe, pickName)         // 删 4 张 from 名牌 + 加 1 张 to 牌;
                                              // toEach 配方(sha→火杀/雷杀)由 pickName 二选一(nature)
addCard(deck, name)                           // 加 1 张(随机花色/点数)
removeKind(deck, name)                        // 同类牌全删(商店"删牌")
```

- 全文件无 noname import(开局侧由 battle.js 收集引擎 list 元组传入 deckFromTuples),tests 可 node 直跑。
- 花色/点数规则:`addCard` 用均匀随机;`transform4to1` 的 to 牌沿用引擎默认模板(实现时取 `lib.card[to]` 的默认花色点数,如无则随机合法组合);to 牌为火杀/雷杀时不新建牌名,产出的仍是 `sha` 牌串,nature(fire/thunder)写入第 4 段。

## 3. 地图接入 🛒 商店节点

- `balance.js`:`nodeProb: { battle: .44, event: .20, elite: .14, rest: .10, shop: .12 }` —— 和恰 1.0;`fixed {1:battle, 9:chest, 15:boss}` 不动。
- `map/gen.js` `_weightedType`:按新表加权;精英仍限 ≥`eliteMinLayer` 且每层 ≤1。
- `map/ui.js`:`ICONS.shop = "🛒"`,`NODE_COLOR.shop = "#f0a860"`(琥珀);提示栏补 "🛒商店"。
- `node.js` `enterNode` 新分支:`shop` → 生成 `shopInv`(若为空)→ 打开商店浮层(不退出地图屏,浮层覆盖);商店内改动实时存档(HUD 同步刷新)。event 分支维持 "M3 实装" 占位。

## 4. 奖励系统 `src/pts/reward.js`(FR-11/12/13)

### 4.1 时序

胜利 → 金币入账 → `state.rewardPending={type}` 落盘 → `game.over(true)` → 引擎重载回地图 → `ptsRenderResume` 后若 `rewardPending` 非空 → 弹出**三选一浮层**(覆盖地图)→ 选择/跳过后清 `rewardPending` 并存档。
中途退出重入:浮层依 `rewardPending` 原样恢复。

### 4.2 三选一构成(选一,可跳过)

| 选项 | 内容 | 候选规则 |
|---|---|---|
| 改牌方案 | 逐组应用 4旧换1,本次奖励**最多 groupsPerReward=3 组** | `count(deck, from) ≥ 4` 才入候选(FR-12);`toEach` 配方弹二选一;候选为 0 → 该选项自动**降级为加牌** |
| 技能 | 获得 1 个技能(整局,addSkill 挂载) | 按 pending.type 走池(battle→common / elite→elite);排除已持、英雄自带 4 技、`BAL.conflict` 互斥组;池空 → 置灰 |
| 加牌 | 获得 1 张随机基本/锦囊牌(花色点数随机) | 恒可用,是保底选项 |
| 跳过 | 放弃本次奖励 | 恒可用 |

`genReward(node) → [options]` 返回候选标记;`applyReward(opt)` 落地并返回文案(兼作单元测试入口)。

**BOSS 定案**:BOSS 胜利 = 通关直接结算(FR-09),不发三选一;`BAL.skills.boss`(奸雄/咆哮)留作扩展位(若日后启用,注意曹操自带奸雄/张飞自带咆哮会被"英雄自带"过滤)。

**技能适配注记**:`yiji(遗计)` 受伤后要把牌**分发**给其他玩家——1vN 中"其他玩家"全为敌方,实现时验证引擎是否允许放弃分发;若必选目标(喂敌)则从 elite 池替换单一技能(只动 BAL,不动代码)。

### 4.3 技能挂载(跨战斗持久)

- `pts.js game.ptsAssignPlayers`:`game.me.init(hero)` 后 `state.skills.forEach(id => game.me.addSkill(id))`(数组先去重;英雄自带技能天然共存,同 id 不重复挂)。
- `BAL.conflict: []`(互斥组机制就绪,默认空数组;格式 `[["skillA","skillB"],…]`,裁决在 reward 重选/商店购买候选过滤处)。

## 5. 商店 `src/pts/shop.js`(FR-15 全量)

```js
genShopInv(rng, state, bal) → items[]          // 纯逻辑:3~5 槽货单(shop.js)
tradeState(state, item, sel, rng?) → {ok,msg}  // 纯逻辑:交易守卫与落地(shop.js)
showShopPanel()                                // 浮层 UI(shop_ui.js),读/写 state.shopInv
```

- 进入节点时生成货单:`slots = rndInt(BAL.shop.slots[0], BAL.shop.slots[1])` = 3~5 个槽,从目录抽样(允许重复品类但槽间去重):改牌方案(随机配方,价格 rndInt(150,250),不满足 4 同名时标灰)/ 普通技能 200 / 精英技能 350 / 加牌 60 / 回血+1HP = 50(可连点叠购,受 hpMax 与金币限制)/ 同类牌全删 120(点选后弹出玩家当前持有的牌种列表全删一种)。
- 技能购买同样过已持/英雄自带/互斥过滤;技能商品从对应池随机定格在 `shopInv`。
- 金币不足置灰;`trade` 即扣即生效即存档;"离开"按钮回地图屏。
- 货单持久:`shopInv` 随存档保存,重入不掉货。

## 6. 战斗卡组接入(pts.js 改动点)

1. `startRun()`:`deck = initDeck()`,`skills=[], rewardPending=null, shopInv=null`。
2. `ptsPrepareArena`(在 `ui.create.cardsAsync/finishCards` 之后)调用 `game.ptsInstallDeck(state.deck)`:清空 `ui.cardPile` 现有牌堆,按 deck 串逐张 `game.createCard(name, suit, number, nature)` 重建(顺序洗乱)。API 已在原版引擎核实:`noname\game\index.js:6034`,第 4 参即 nature(火杀/雷杀)。
3. `ptsAssignPlayers` 先 `installPile` 后 `directgain(get.cards(4))` —— 起手 4 张即来自你的卡组。
4. 卡组语义:**"当前卡组"只经奖励/商店变化**(规范§"整局中卡组只以奖励方式变化");战斗中摸/弃的牌属于本场牌堆,本场结束不回流,下场仍以满卡组开。
5. 宝箱(FR-16):`node.js` chest 分支改为金币 rndInt(0,50) + `recipeProb=0.6` → 自动应用一次**精英级**改牌(若有 ≥4 张同名的 from 候选);候选不足 → 该次改为金币补偿 rndInt(BAL.gold.battle,75~125)。0.4 → 自动获得一个普通池技能(同理过滤;池空→金币补偿)。

## 7. balance.js 增改定案

```js
nodeProb: { battle: .44, event: .20, elite: .14, rest: .10, shop: .12 },
conflict: [],
// shop/skills/chest/gold/rest 沿用现值
```

**recipes 表修正**(引擎实名核对结果,原表 3 条无效 id):

| 原条目 | 问题 | 修正后 |
|---|---|---|
| `{from:"sha", toEach:["huosha","leisha"], tier:"common"}` | 引擎无 huosha/leisha 牌名(火/雷杀=sha+属性) | `{from:"sha", toEach:["fire","thunder"], tier:"common"}(产出 sha+nature)` |
| `{from:"wuxie", to:"lebusi", tier:"common"}` | 引擎牌名是 **lebu** | `{from:"wuxie", to:"lebu", tier:"common"}` |
| `{from:"huosha", to:"leisha", tier:"elite"}` | 无效 id 且火杀仅 5 张永远 <4 | *(删除)* 替换为 `{from:"shan", to:"wuxie", tier:"elite"}`(闪 24 张) |

修正后 6 条配方 from 池全部 ≥4 张:sha 30 / shan 24 / tao 12 / tiesuo 6 / wuxie 7 / (elite 用 shan+tao)。规范文档数值若与引擎实名冲突,以引擎为准并在进度文档登记偏差。
文档口径差异备注:规范要求 `balance.json`,现实现为 `balance.js`(BAL 导出对象)——验收"改数值可见"效果一致,保持 js 方案并在进度文档登记该偏差。

## 8. 错误处理与风险

| 风险点 | 处理 |
|---|---|
| ~~`game.createCard` 缺失~~ | **已核实**:`noname\game\index.js:6034` `createCard(name, suit, number, nature)`,4 参支撑火/雷杀属性;无风险 |
| 开局菜单阶段 `lib.cardPile` 是否已 loadCard | 实现验证;未就绪则 deck 懒初始化(首次进入地图/首战前补建) |
| 商店把牌删空 → 牌堆过少 | `get.cards` 空堆会 `washCard` 洗弃牌堆,不会平局;卡组最少保留 ≥1 行校验(全删时至少剩 1 张) |
| 奖励槽全无候选 | 改牌降级加牌;技能置灰;加牌/跳过恒可用,浮层永不卡死 |
| 旧存档迁移失败 | try/catch 回退到全量 160 张重开 |
| 遗计(yiji)分发必选 | 实现验证引擎问询分支;若不给"放弃"选项则从 elite 池替换该技能(仅改 BAL) |

## 9. 测试(doc02 §8 对齐)

- 新增 `tests/test_deck.mjs`(node 直跑):4换1(余牌不动)/不足4张不出候选/addCard/removeKind/互斥组裁决/gold 收支纯函数。
- 手测清单:① 商店五类商品全交易;② 战后三选一(含改牌降级、技能置灰、跳过);③ 宝箱 60/40 两路发放;④ 购入技能后下一场战斗技能生效;⑤ 第 9 层宝箱+中途存档重入恢复货单与奖励浮层;⑥ `nodeProb.shop` 调 0/0.5 后地图生成可见变化(验收场景⑤)。

## 10. 验收对照(MVP 五场景)

场景②完整通关:奖励/商店线贯通即支撑"15 层全节点"闭环;场景③存档恢复:`rewardPending/shopInv/deck/skills` 全部入快照;场景④改 balance 数值:商店/奖励/宝箱全部读 BAL;FR-19 HUD 卡组张数改读 `deck.length`。

## 11. 涉及文件清单

| 文件 | 动作 | 预估行数 |
|---|---|---|
| `resources/app/src/pts/deck.js` | 新建 | ~140 |
| `resources/app/src/pts/reward.js` | 新建(纯) | ~110 |
| `resources/app/src/pts/reward_ui.js` | 新建(浮层) | ~180 |
| `resources/app/src/pts/shop.js` | 新建(纯) | ~120 |
| `resources/app/src/pts/shop_ui.js` | 新建(浮层) | ~170 |
| `resources/app/src/pts/battle.js` | 新建(从 pts.js 拆对局搭建) | ~250 |
| `resources/app/src/pts/node.js` | 改(chest/shop 分发) | 改 ~40 |
| `resources/app/src/pts/map/ui.js` | 改(图标/提示) | 改 ~10 |
| `resources/app/src/pts/balance.js` | 改(nodeProb/conflict/recipes) | 改 ~15 |
| `resources/app/mode/pts.js` | 改(startRun/迁移/挂载,对局搭建移战 battle.js) | 559→~400 |
| `tests/test_deck.mjs` | 新建 | ~60 |
| `tests/test_reward.mjs` | 新建 | ~60 |
| `tests/test_shop.mjs` | 新建 | ~70 |
