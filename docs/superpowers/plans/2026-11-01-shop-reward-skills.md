# 爬塔杀 商店/奖励/技能实装 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实装战后奖励三选一(改牌/技能/加牌)、商店节点与技能系统,卡组升级为真实牌组数组并逐战斗洗入牌堆(FR-11/12/13/15/16 + FR-10)。

**Architecture:** 数据层做纯逻辑模块(`deck.js`/`reward.js`/`shop.js`,零引擎依赖、node 直测),UI 薄层(`reward_ui.js`/`shop_ui.js`),引擎侧对局搭建从 `pts.js` 拆出为 `battle.js` 并自挂 `game.ptsXxx`,分发集中在 `node.js`;数值一律读 BAL。

**Tech Stack:** JavaScript(无名杀 v1.9.0 引擎)· Electron · 原生 DOM 无框架 · Node ESM 裸测试脚本

**Spec:** `docs/superpowers/specs/2026-11-01-shop-reward-skills-design.md`(已批准)

## Global Constraints

- 只修改 `C:\Users\31257\Desktop\homework\爬塔杀\pts\` 下文件;`backup\`、引擎目录(无名杀-win32-x64)、`文档\` 一律不碰
- 全部可调数值走 `resources/app/src/pts/balance.js`(BAL),不硬编码
- 每文件 ≤500 行(规范文档 §3);存档 key:`pts_run` / `pts_flow` / `(lib.configprefix+"directstart")`
- 引擎约束:模式 content 被 StepCompiler 字符串重编译,**闭包不可见**——跨模块助手必须挂 `game.ptsXxx` 后调用(mode/pts.js 头注释既有约定)
- commit 风格遵本项目历史:`add: <中文说明>`
- 测试为裸 node ESM 脚本(无框架),run:`node tests\<name>.mjs`,输出 `pass/total`,失败 exit 1
- 引擎事实(已核实,勿再质疑):火杀/雷杀=`["suit",num,"sha","fire"/"thunder"]`(非独立牌名,`card\extra.js` list 核实);乐不思蜀牌名=`lebu`;`game.createCard(name,suit,number,nature)` 存在于 `noname\game\index.js:6034`

---

### Task 1: 基线验证 + BAL 配置更新 + spec 行文同步

**Files:**
- Modify: `resources/app/src/pts/balance.js`
- Modify: `docs/superpowers/specs/2026-11-01-shop-reward-skills-design.md`

**Interfaces:**
- Produces: `BAL.nodeProb` 含 `shop:0.12`;`BAL.recipes` 6 条全部引擎合法(from 池 ≥4 张);`BAL.conflict: []`;spec 与最终文件结构一致

- [ ] **Step 1: 跑现有基线测试(改动前先确认全绿)**

```powershell
node --version
node tests\test_gen.mjs
```

Expected: `node` 版本 ≥20(若报 ESM 识别错误且 node <22.7,追加 `--experimental-detect-module` 重试并记录);test_gen 输出 `samples=1000 fails=0` 加一行节点类型分布。若基线失败,停下报告,不做本任务。

- [ ] **Step 2: balance.js — nodeProb 加 shop、增 conflict、修 recipes(3 处精确编辑)**

2a. oldString:
```js
	nodeProb: {
		battle: 0.50,
		event: 0.22,
		elite: 0.16,
		rest: 0.12,
	},
```
newString:
```js
	nodeProb: {
		battle: 0.44,
		event: 0.20,
		elite: 0.14,
		rest: 0.10,
		shop: 0.12,
	},
```

2b. oldString(整块 recipes,包含 `groupsPerReward`/`chest` 两行之间不动):
```js
	recipes: [
		{ from: "sha", toEach: ["huosha", "leisha"], tier: "common" },
		{ from: "shan", to: "tao", tier: "common" },
		{ from: "tiesuo", to: "huogong", tier: "common" },
		{ from: "wuxie", to: "lebusi", tier: "common" },
		{ from: "tao", to: "wuzhong", tier: "elite" },
		{ from: "huosha", to: "leisha", tier: "elite" },
	],
```
newString:
```js
	recipes: [
		{ from: "sha", toEach: ["fire", "thunder"], tier: "common" },
		{ from: "shan", to: "tao", tier: "common" },
		{ from: "tiesuo", to: "huogong", tier: "common" },
		{ from: "wuxie", to: "lebu", tier: "common" },
		{ from: "tao", to: "wuzhong", tier: "elite" },
		{ from: "shan", to: "wuxie", tier: "elite" },
	],
```
(语义:sha 配方 toEach 是 nature,tier 里的"火杀/雷杀"=sha+fire/thunder;shan→wuxie 精英顶替原 huosha→leisha 死条目。)

2c. oldString(文件末行 heroPool 前):
```js
	skills: {
		common: ["wushuang", "mashu", "keji", "yingzi"],
		elite: ["ganglie", "yiji", "fankui", "zhiheng"],
		boss: ["jianxiong", "paoxiao"],
	},
```
newString:
```js
	skills: {
		common: ["wushuang", "mashu", "keji", "yingzi"],
		elite: ["ganglie", "yiji", "fankui", "zhiheng"],
		boss: ["jianxiong", "paoxiao"],
	},
	conflict: [],
```

- [ ] **Step 3: spec 同步(4 处精确编辑)**

3a. §2 接口块 oldString:
```
initDeck()                                    // 从 lib.cardPile[standard]+[extra] 抓 160 张定义快照;
                                              // 供 pts.js 在有引擎环境下调用并落盘
```
newString:
```
deckFromTuples(tuples)                        // [[suit,number,name,nature?],…] → 160 张牌串数组;
                                              // 引擎侧由 battle.js pileTuples() 收集后传入,保持零依赖
```

3b. §2 补充行 oldString:
```
- 纯函数直接操作 deck 数组并返回变更;不 import noname(`initDeck` 除外——它单独导出供挂载侧调用,tests 只测纯函数)。
```
newString:
```
- 全文件无 noname import(开局侧由 battle.js 收集引擎 list 元组传入 deckFromTuples),tests 可 node 直跑。
```

3c. §5 接口块 oldString:
```
```js
openShell()   // 渲染 .pts-shop 浮层(复用地图浮层样式);读 state.shopInv
trade(item)   // 扣款 → 效果落地 → 存档 → HUD/toast 刷新
```
```
newString:
```
```js
genShopInv(rng, state, bal) → items[]          // 纯逻辑:3~5 槽货单(shop.js)
tradeState(state, item, sel, rng?) → {ok,msg}  // 纯逻辑:交易守卫与落地(shop.js)
showShopPanel()                                // 浮层 UI(shop_ui.js),读/写 state.shopInv
```
```

3d. §11 文件表整体替换(match 表头起至表尾)为:

| 文件 | 动作 | 预估行数 |
|---|---|---|
| `resources/app/src/pts/deck.js` | 新建 | ~140 |
| `resources/app/src/pts/reward.js` | 新建(纯) | ~110 |
| `resources/app/src/pts/reward_ui.js` | 新建(浮层) | ~180 |
| `resources/app/src/pts/shop.js` | 新建(纯) | ~120 |
| `resources/app/src/pts/shop_ui.js` | 新建(浮层) | ~170 |
| `resources/app/src/pts/battle.js` | 新建(从 pts.js 拆对局搭建) | ~250 |
| `resources/app/src/pts/node.js` | 改(chest/shop 分发) | 改 ~40 |
| `resources/app/src/pts/map/ui.js` | 改(图标/提示/clearPtsUI 导出) | 改 ~10 |
| `resources/app/src/pts/balance.js` | 改(nodeProb/conflict/recipes) | 改 ~15 |
| `resources/app/mode/pts.js` | 改(startRun/迁移/挂载,对局搭建移战 battle.js) | 559→~400 |
| `tests/test_deck.mjs` | 新建 | ~60 |
| `tests/test_reward.mjs` | 新建 | ~60 |
| `tests/test_shop.mjs` | 新建 | ~70 |

- [ ] **Step 4: Commit**

```powershell
git add resources/app/src/pts/balance.js docs
git commit -m "add: BAL商店节点概率与配方实名修正,spec同步文件结构"
```

---

### Task 2: deck.js 纯逻辑(牌串/牌组工具)+ tests/test_deck.mjs

**Files:**
- Create: `resources/app/src/pts/deck.js`
- Create: `tests/test_deck.mjs`

**Interfaces:**
- Produces: 模块 API(下 Step 2 给全量代码)
- Consumes: `BAL.recipes`(transform4to1 读它的结构,但只收参传对象,本文件不 import balance)

- [ ] **Step 1: 写失败测试——先写 tests/test_deck.mjs(断言牌串编解码、加牌、改牌、删除、抽取)**

```js
import { encodeCard, decodeCard, deckFromTuples, count, kindsOf, addCard, randomPoolName, transform4to1, removeKind } from "../resources/app/src/pts/deck.js";

let pass = 0, total = 0;
function t(name, cond) {
	total++;
	if (cond) { pass++; } else { console.error("FAIL: " + name); }
}

t("encodeCard 基本", encodeCard("sha", "spade", 7) === "sha|spade|7");
t("encodeCard 带 nature", encodeCard("sha", "spade", 7, "fire") === "sha|spade|7|fire");
t("decodeCard 3段", JSON.stringify(decodeCard("tao|heart|3")) === JSON.stringify(["tao", "heart", "3", null]));
t("decodeCard 4段", JSON.stringify(decodeCard("sha|spade|7|fire")) === JSON.stringify(["sha", "spade", "7", "fire"]));
const dt = deckFromTuples([["spade", 7, "sha", "fire"], ["heart", 1, "tao"], ["club", 12, "sha"]]);
t("deckFromTuples 元组→牌串", dt[0] === "sha|spade|7|fire" && dt[1] === "tao|heart|1" && dt.length === 3);
t("count", count(["sha|spade|7", "sha|club|9", "tao|heart|1"], "sha") === 2);
t("kindsOf", JSON.stringify(kindsOf(["sha|spade|7", "sha|club|9|thunder", "tao|heart|1"])).includes("sha") && kindsOf(["tao|heart|1"]).length === 1);

const rng0 = () => 0;
const d2 = [];
addCard(d2, "sha", rng0);
t("addCard rng0 → spade A", d2[0] === "sha|spade|1");
const d3 = ["sha|spade|1", "tao|heart|3", "sha|heart|14", "shan|diamond|11", "sha|club|2", "sha|diamond|8"];
const ok = transform4to1(d3, { from: "sha", toEach: ["fire", "thunder"] }, "thunder", rng0);
t("transform4to1 成功 4→1 雷杀", ok && d3.length === 3 && d3[2] === "sha|spade|1|thunder" && !d3.includes("sha|spade|1"));
const tooFew = ["sha|spade|1", "tao|heart|3"];
t("transform4to1 不足4张返回 false 且不动", transform4to1(tooFew, { from: "sha", to: "tao" }, null) === false && tooFew.length === 2);
const d4 = ["sha|spade|1", "tao|heart|3", "sha|heart|14", "shan|diamond|11", "sha|club|2", "tao|diamond|5"];
const removed = removeKind(d4, "sha");
t("removeKind 保底1张(3→2)", removed === 2 && d4.filter(s => s.split("|")[0] === "sha").length === 1);
t("removeKind 只删1张", removeKind(d4, "tao") === 1);
const dn = randomPoolName(rng0);
t("randomPoolName rng0 → 池名", ["sha", "shan", "tao", "jiu"].includes(dn));

console.log("deck tests: " + pass + "/" + total + " pass");
if (pass !== total) { process.exit(1); }
```

- [ ] **Step 2: 运行确认失败**

```powershell
node tests\test_deck.mjs
```

Expected: FAIL Canary—`Cannot find module .../deck.js`(import 未实现即崩,13 断言 0 过)。若出现其它报错(如语法),修复 import 路径拼写后再看。

- [ ] **Step 3: 实现 deck.js(完整文件,全量代码如下)**

```js
/* 牌组纯逻辑:牌串编解码/数量/抽取/连体迁移/定向删除。零引擎依赖。

   牌串格式(持久层约定):
     "name|suit|number"                普通牌
     "name|suit|number|nature"         带属性牌(火杀/雷杀)
   元组格式(引擎侧定义快照):[suit, number, name, nature?] */
const SUITS = ["spade", "heart", "club", "diamond"];
const POOL = ["sha", "shan", "tao", "jiu"];

function encodeCard(name, suit, number, nature) {
	let s = name + "|" + suit + "|" + number;
	if (nature) { s += "|" + nature; }
	return s;
}

function decodeCard(cardStr) {
	const parts = cardStr.split("|");
	return [parts[0], parts[1], parts[2], parts[3] || null];
}

/* 元组 → 牌串数组 */
function deckFromTuples(tuples) {
	return tuples.map(t => encodeCard(t[2], t[0], t[1], t[3] || null));
}

function count(deck, name) {
	let n = 0;
	for (const s of deck) { if (s.split("|")[0] === name) { n++; } }
	return n;
}

/* 牌串数组 → 去重牌名列表 */
function kindsOf(deck) {
	return Array.from(new Set(deck.map(s => s.split("|")[0])));
}

/* 随机新牌:随机花色 + 随机点数(1~13,忽略引擎 14~15 副点;补牌场景够用) */
function addCard(deck, name, rng) {
	const r = rng || Math.random;
	const suit = SUITS[Math.floor(r() * 4)];
	const number = 1 + Math.floor(r() * 13);
	deck.push(encodeCard(name, suit, number, null));
}

function randomPoolName(rng) {
	const r = rng || Math.random;
	return POOL[Math.floor(r() * POOL.length)];
}

/* 连体迁移:4 张 from → 1 张(火/雷杀落到第4段 nature)。
   recipe: {from:"sha", toEach:["fire","thunder"], ...} 或 {from:"shan", to:"tao", ...}
   pickNature: 改牌方案逐组 UI/宝箱自动时已二选一传入;为 null 且属 sha 配方则 toEach 随机。
   数量不足 → false,deck 原样(先计数后删除,保证原子性)。 */
function transform4to1(deck, recipe, pickNature, rng) {
	const r = rng || Math.random;
	const idxs = [];
	for (let i = 0; i < deck.length; i++) {
		const p = deck[i].split("|");
		if (p[0] === recipe.from && !(recipe.from === "sha" && p[3])) { idxs.push(i); }
	}
	if (idxs.length < 4) { return false; }
	for (let k = 3; k >= 0; k--) { deck.splice(idxs[k], 1); }
	const target = recipe.toEach ? "sha" : recipe.to;
	const nature = recipe.toEach ? (pickNature || recipe.toEach[Math.floor(r() * recipe.toEach.length)]) : null;
	deck.push(encodeCard(target, SUITS[Math.floor(r() * 4)], 1 + Math.floor(r() * 13), nature));
	return true;
}

/* 整牌种删除:同类全删但保底 1 张(避免"没牌可打");如 count = 总数,只删 count-1。返回删除数。 */
function removeKind(deck, name) {
	const total = count(deck, name);
	if (!total) { return 0; }
	let removed = 0;
	for (let i = deck.length - 1; i >= 0 && removed < total - 1; i--) {
		if (deck[i].split("|")[0] === name) { deck.splice(i, 1); removed++; }
	}
	return removed;
}

export { encodeCard, decodeCard, deckFromTuples, count, kindsOf, addCard, randomPoolName, transform4to1, removeKind };
```

- [ ] **Step 4: 运行确认通过**

```powershell
node tests\test_deck.mjs
```

Expected: `deck tests: 13/13 pass`。若个别断言失败,优先怀疑测试期望本身或 rng 确定性,禁止改动实现迁就断言。

- [ ] **Step 5: Commit**

```powershell
git add resources/app/src/pts/deck.js tests/test_deck.mjs
git commit -m "add: deck纯逻辑模块(牌串/牌组/迁移)+直测"
```

---

### Task 3: battle.js 对局侧拆分 + pts.js 真卡组接线 + HUD 派生

**Files:**
- Create: `resources/app/src/pts/battle.js`
- Modify: `resources/app/mode/pts.js`(559→约 420 行)
- Modify: `resources/app/src/pts/hud.js`(1 行)

**Interfaces:**
- Produces: `game.ptsInstallDeck(deckSyns)` 全局;`battle.js` 导出 `pileTuples()/heroSkillsOf()/migrateState()`;`pts.js` 新增 stub `game.ptsShowReward`(Task 5 替换)/`game.ptsShowShop`(Task 7 替换)。
- Consumes: `deckFromTuples`(deck.js)、`BAL`(balance.js,battle.js 现有内容函数原本就读 BAL)。
- 迁移对象(pts.js 剪切,不改逻辑):`game.ptsPickEnemies` / `game.ptsPrepareArena` / `game.ptsAssignPlayers` / `game.ptsCheckResult` 四个全局 content 挂载,以及它们引用的内部助手 `rndInRange` / `buildDeckCount` / `hpOf` 与常量 `DIRECT_KEY` / `FLOW_KEY` / `FLOW_BATTLE`(若 pts.js 其它处仍用这几个常量则保留,否则一并移走)。

**测试说明(诚实标注):** 本任务全部为引擎副作用移动,无 node 断言步——验证手段是 `node --check` 全量 + 引擎手测清单(Step 5)。deck.js 纯逻辑回归由 `node tests\test_deck.mjs` 守住。

- [ ] **Step 1: 先读,后剪。通读 pts.js,确认四个 game.pts* 对局函数与其依赖的具体名字(以现状为准,勿凭记忆)**

```powershell
Select-String -Path resources\app\mode\pts.js -Pattern "ptsPickEnemies|ptsPrepareArena|ptsAssignPlayers|ptsCheckResult|rndInRange|buildDeckCount|hpOf|DIRECT_KEY|FLOW_KEY|FLOW_BATTLE" | ForEach-Object { "$($_.LineNumber): $($_.Line.Trim())" }
```

记录输出(行号清单写进 commit message 备注不用,写进本任务完成记录)。若发现四函数之外的第四助手,同样移入 battle.js。

- [ ] **Step 2: 新建 battle.js——先写纯收集部分(全量代码),再剪贴四个 content 函数**

```js
/* 对局侧:敌人选取/布场/发牌/结果回收(从 mode/pts.js 拆入)+ 真卡组注入。
   content 被引擎 StepCompiler 字符串重编译,入口必须挂 game.ptsXxx(pts.js 头注释既有约定)。 */
import { lib, game, ui, _status } from "noname";
import { BAL } from "./balance.js";
import { deckFromTuples } from "./deck.js";

/* 从引擎牌堆定义抓元组快照(标准 108 + 额外 52,期望 160 张)。
   返回 [suit, number, name, nature?] 列表,供 deckFromTuples 转牌串。 */
export function pileTuples() {
	const grab = name => {
		let src = lib.cardPile[name] && lib.cardPile[name].length ? lib.cardPile[name] : (lib.card[name] && lib.card[name].list);
		return src ? src.map(c => c.slice()) : [];
	};
	const out = grab("standard").concat(grab("extra"));
	if (out.length < 150) { console.error("[pts] pileTuples 期望 160 张,实际 " + out.length); }
	return out;
}

/* 英雄自带技能(供奖励过滤;引擎代发过一次,不再重复加) */
export function heroSkillsOf(id) {
	const info = lib.character[id];
	return info ? (info[3] || []).slice() : [];
}

/* 旧档迁移:pts.js 首案 M4 前存档补齐 deck/skills/heroSkills/rewardPending/shopInv */
export function migrateState(state) {
	if (!Array.isArray(state.deck) || !state.deck.length) {
		state.deck = deckFromTuples(pileTuples());
	}
	if (!Array.isArray(state.skills)) { state.skills = []; }
	if (!Array.isArray(state.heroSkills)) { state.heroSkills = []; }
	if (!state.rewardPending) { state.rewardPending = null; }
	if (!state.shopInv) { state.shopInv = null; }
	return state;
}

/* 真卡组洗入引擎牌堆:建卡 → 清 ui.cardPile → 装入 → 洗牌。结算后由 ptsCheckResult 端(N/A)或下一场进图前不需要回滚,
   奖励/商店函数直接改 state.deck,下一场 installDeck 全量覆盖。 */
game.ptsInstallDeck = function (cardStrs) {
	const cards = cardStrs.map(cs => {
		const p = cs.split("|");
		return game.createCard(p[0], p[1], Number(p[2]), p[3] || undefined);
	});
	ui.cardPile.length = 0;
	for (const c of cards) { ui.cardPile.push(c); }
	game.shuffle(ui.cardPile);
	console.log("[pts] installDeck " + cards.length + " 张");
};
```

然后从 pts.js 剪切四个 content 挂载 + 3 个助手(注明"从 pts.js 原文迁移"注释行放在每个体内首行),剪切前如 Step 1 所记录;pts.js 中原位置清空(连同一处空行)。

- [ ] **Step 3: pts.js 接线(6 处编辑,保持未动区零重排)**

3a. 头 import 区加:
```js
import { migrateState } from "./src/pts/battle.js";
import { deckFromTuples } from "./src/pts/deck.js";
```
文件尾(board vs mount 期)挂 stub:
```js
game.ptsShowReward = function () {}; // Task 5 替换
game.ptsShowShop = function () {};   // Task 7 替换
```
3b. `startRun` state 面板新增字段(保持原有键不动,只增改):
```js
	l: 1, c: 0, hpMax: 0, hp: 0, gold: 0, level: 1,
	cur: null, path: [], edges: null, nodes: null, rewards: [],
	hero: null, deck: [], skills: [], heroSkills: [], rewardPending: null, shopInv: null, deckCount: 160,
```
(deckCount 仅作 HUD 兜底;Task 3 之后 Hud 读 deck.length)
3c. 选将完毕处(ptsRelocate `chooseCharacter` 路径里 `me.init` 生效点附近),新增 3 行:
```js
state.hero = me.name1;
state.heroSkills = heroSkillsOf(me.name1);
state.deck = deckFromTuples(pileTuples());
```
即 import 里补 `pileTuples, heroSkillsOf`(与 migrateState 同一 import 语句拆合并)。
3d. `ptsAssignPlayers`(刚搬入 battle.js,判断逻辑别改动),进 `me.init(...)` 后、`me.directgain(get.cards(4))` 前,插:
```js
		game.ptsState.hero = me.name1;
		if (!game.ptsState.heroSkills.length) { game.ptsState.heroSkills = heroSkillsOf(me.name1); }
		game.ptsInstallDeck(game.ptsState.deck);
```
函数结尾(directgain 之后)加:
```js
		game.ptsState.skills.forEach(id => me.addSkill(id));
```
注意原代码里对 `deckCount`/`buildDeckCount` 的所有引用:`buildDeckCount` 惟一调用点若为 ptsPickEnemies 估算伤害牌数,改为 `game.ptsState.deck.length`;若确无引用,battle.js 里删除该函数并同步从 pts.js 移除(以 grep 结果为准)。
3e. `loadRun` 解析完成后(赋值 game.ptsState 之后)插:`migrateState(game.ptsState);`
3f. `game.ptsRenderResume`( resumes to map 分支,现 renderMap 之前)插:
```js
		if (game.ptsState.rewardPending) { game.ptsShowReward(); }
```

- [ ] **Step 4: hud.js 从真卡组派生(1 行)**

oldString:
```js
	items.push("卡组:" + state.deckCount);
```
newString:
```js
	items.push("卡组:" + (state.deck && state.deck.length ? state.deck.length : state.deckCount));
```

- [ ] **Step 5: 验证(--check + 回归 + 手测清单)**

```powershell
node --check resources/app/src/pts/battle.js; node --check resources/app/mode/pts.js; node --check resources/app/src/pts/hud.js
node tests\test_deck.mjs
Select-String -Path resources\app\mode\pts.js -Pattern "ptsPickEnemies|ptsPrepareArena|ptsAssignPlayers|ptsCheckResult" | Measure-Object | ForEach-Object { "残留在pts.js: $($_.Count) 个" }
```

Expected: --check 全部无输出;deck tests `13/13 pass`;残留 0(四函数全部只存在于 battle.js)。

引擎手测(打开无名杀.exe → pts 模式 → 新开局):
1. 战斗打响前 console:`game.ptsState.deck.length === 160` 为 true;`game.ptsState.heroSkills.length > 0`;
2. 首战获胜 reload 后:console `game.ptsState.gold` 增加、`game.ptsState.rewardPending` 非 null;地图正常渲染且无浮层(stub 空函数);
3. console 跑 `game.ptsInstallDeck(game.ptsState.deck); ui.cardPile.length` 得 160;
4. 旧存档(如有)载入无报错且 deck.length=160(migrateState 生效)。

任何一步失败:回滚该步、修击原点灭(in pts.js 保留的路径),不绕过。

- [ ] **Step 6: Commit**

```powershell
git add resources/app/src/pts/battle.js resources/app/mode/pts.js resources/app/src/pts/hud.js
git commit -m "add: 拆出battle.js并接入真卡组与技能/奖励/商店字段"
```

---

### Task 4: reward.js 奖励纯逻辑 + tests/test_reward.mjs

**Files:**
- Create: `resources/app/src/pts/reward.js`
- Create: `tests/test_reward.mjs`

**Interfaces:**
- Produces: `recipeCandidates(deck, tier?)` / `skillCandidates(skills, heroSkills, poolKey)` / `conflictsWith(a, b)` / `rewardOptions(state, type)` / `applyAddCard(state, rng?)` / `grantSkill(state, id)`
- Consumes: `BAL`(balance)、`count/kindsOf/randomPoolName/addCard`(deck)——三件均无引擎引用,tests 可 node 直跑。

- [ ] **Step 1: 写失败测试**

```js
import { recipeCandidates, skillCandidates, rewardOptions, applyAddCard, grantSkill, conflictsWith } from "../resources/app/src/pts/reward.js";
import { BAL } from "../resources/app/src/pts/balance.js";

let pass = 0, total = 0;
function t(name, cond) {
	total++;
	if (cond) { pass++; } else { console.error("FAIL: " + name); }
}

function mk(name, n) {
	const S = ["spade", "heart", "club", "diamond"];
	const out = [];
	for (let i = 0; i < n; i++) { out.push(name + "|" + S[i % 4] + "|" + (1 + Math.floor(i / 4))); }
	return out;
}
const deck = [].concat(mk("sha", 5), mk("shan", 5), mk("tiesuo", 5), mk("wuxie", 5), mk("tao", 5), mk("jiu", 5));

t("recipeCandidates 不分档全出", recipeCandidates(deck).length === BAL.recipes.length);
t("recipeCandidates 战斗只出 common", recipeCandidates(deck, "common").length === 4);
t("recipeCandidates 精英只出 elite", recipeCandidates(deck, "elite").length === 2);
t("recipeCandidates 不足4张出空", recipeCandidates(mk("sha", 3), "common").length === 0);

const st = { deck: deck, skills: ["wushuang"], heroSkills: ["mashu"] };
const opt = rewardOptions(st, "battle");
t("rewardOptions 4 个选项", opt.length === 4 && opt[0].key === "recipe" && opt[1].key === "skill" && opt[2].key === "card" && opt[3].key === "skip");
t("rewardOptions 改牌可行", opt[0].ok === true && opt[0].data.length === 4);
t("rewardOptions 技能已被拿空", opt[1].ok === false && opt[1].data.length === 0);

const sc = skillCandidates(["wushuang"], ["mashu"], "common");
t("skillCandidates 过滤已持有与英雄自带", !sc.includes("wushuang") && !sc.includes("mashu") && sc.includes("keji") && sc.includes("yingzi"));
const se = skillCandidates(["ganglie"], [], "elite");
t("skillCandidates 精英池", se.includes("yiji") && se.includes("zhiheng") && !se.includes("ganglie"));

BAL.conflict.push(["aaa", "bbb"]);
t("conflictsWith 命中", conflictsWith("aaa", "bbb") === true);
t("conflictsWith 未命中", conflictsWith("aaa", "ccc") === false);
t("skillCandidates 冲突过滤", !skillCandidates(["aaa"], [], "common").includes("bbb") === true);
const g1 = { deck: [], skills: [], heroSkills: ["mashu"] };
t("grantSkill 习得", grantSkill(g1, "yingzi").ok === true && g1.skills.length === 1);
t("grantSkill 英雄自带拒绝", grantSkill(g1, "mashu").ok === false);
t("grantSkill 冲突拒绝", grantSkill(g1, "bbb").ok === false);
BAL.conflict.pop();

const g2 = { deck: [], skills: [], heroSkills: [] };
const msg = applyAddCard(g2, () => 0);
t("applyAddCard rng0 落地", g2.deck[0] === "sha|spade|1" && msg.includes("sha"));

console.log("reward tests: " + pass + "/" + total + " pass");
if (pass !== total) { process.exit(1); }
```

- [ ] **Step 2: 运行确认失败**

```powershell
node tests\test_reward.mjs
```

Expected: `Cannot find module .../reward.js`(0 过)。

- [ ] **Step 3: 实现 reward.js(完整文件)**

```js
/* 战后三选一与宝箱的奖励纯逻辑。零引擎依赖(只引用 BAL 与 deck 纯模块),
   tests 与 UI 两端同吃。 */
import { BAL } from "./balance.js";
import { count, randomPoolName, addCard } from "./deck.js";

/* conflict: [["a","b"],…] 双向冲突(a 拿了 b 不可再拿,b 同)。 */
export function conflictsWith(left, right) {
	for (const pair of BAL.conflict) {
		if ((pair.includes(left) && pair.includes(right)) && left !== right) { return true; }
	}
	return false;
}

/* 改牌候选:deck 里 count(from)>=4 的配方。tier 过滤:"common"只出 common,"elite"只出 elite,缺省全出。 */
export function recipeCandidates(deck, tier) {
	const out = [];
	for (const r of BAL.recipes) {
		if (tier && r.tier !== tier) { continue; }
		if (count(deck, r.from) >= 4) { out.push(r); }
	}
	return out;
}

/* 技能候选:BAL.skills[poolKey] − heroSkills − skills − 冲突。 */
export function skillCandidates(skills, heroSkills, poolKey) {
	const have = ([].concat(heroSkills || [], skills || [])).filter(Boolean);
	return (BAL.skills[poolKey] || []).filter(id => {
		if (have.includes(id)) { return false; }
		for (const other of have) { if (conflictsWith(id, other)) { return false; } }
		return true;
	});
}

/* 三选一 proposals,依 "battle"/"elite" 路由档位。改牌无候选时 UI 端降级加牌(不在此编)。 */
export function rewardOptions(state, type) {
	const tier = type === "elite" ? "elite" : "common";
	const recipes = recipeCandidates(state.deck, tier);
	const skills = skillCandidates(state.skills, state.heroSkills, tier);
	return [
		{ key: "recipe", ok: recipes.length > 0, data: recipes, cap: BAL.groupsPerReward },
		{ key: "skill", ok: skills.length > 0, data: skills, poolKey: tier },
		{ key: "card", ok: true, data: null },
		{ key: "skip", ok: true, data: null },
	];
}

/* 随机加一张 sha/shan/tao/jiu 家族牌(战斗购买/降级奖励/商店同类)。 */
export function applyAddCard(state, rng) {
	const name = randomPoolName(rng);
	addCard(state.deck, name, rng);
	return "「" + name + "」家族随机一张";
}

export function grantSkill(state, id) {
	if (state.skills.includes(id) || (state.heroSkills || []).includes(id)) { return { ok: false, msg: "已有「" + id + "」", arg: id }; }
	for (const other of [].concat(state.heroSkills || [], state.skills)) {
		if (conflictsWith(id, other)) { return { ok: false, msg: "「" + id + "」与「" + other + "」冲突", arg: other }; }
	}
	state.skills.push(id);
	return { ok: true, msg: "习得「" + id + "」" };
}
```

- [ ] **Step 4: 运行确认通过**

```powershell
node tests\test_reward.mjs
```

Expected: `reward tests: 16/16 pass`。

- [ ] **Step 5: Commit**

```powershell
git add resources/app/src/pts/reward.js tests/test_reward.mjs
git commit -m "add: 奖励三选一纯逻辑(改牌候选/技能过滤/加牌)"
```

---

### Task 5: reward_ui.js 三选一浮层 + pts.js 挂载

**Files:**
- Create: `resources/app/src/pts/reward_ui.js`
- Modify: `resources/app/mode/pts.js`(2 处:import + 替换 stub)

**Interfaces:**
- Consumes: `rewardOptions/applyAddCard/grantSkill`(reward.js)、`transform4to1`(deck.js)、`updateHud`(hud.js)、`renderMap/toast`(map/ui.js)、`game.ptsState/ptsSaveRun`。
- Produces: 替换 `game.ptsShowReward = showRewardPanel`(Task 3 的 stub)。

- [ ] **Step 1: 实现 reward_ui.js(完整文件,无先测步——浮层是纯 DOM+纯函组合,规则已被 Task 4 测试覆盖;验证走 Step 2)**

```js
/* 战后三选一浮层(FR-12/13)。规则判定全部走 reward.js/deck.js 纯函数,
   本文件只做 DOM 渲染与状态落盘。由 pts.js 挂载为 game.ptsShowReward。 */
import { lib, game } from "noname";
import { BAL } from "./balance.js";
import { rewardOptions, applyAddCard, grantSkill } from "./reward.js";
import { transform4to1 } from "./deck.js";
import { updateHud } from "./hud.js";
import { renderMap, toast } from "./map/ui.js";

function tName(id) { return lib.translate[id] || id; }

export function showRewardPanel() {
	const state = game.ptsState;
	if (!state || !state.rewardPending) { return; }
	document.querySelectorAll(".pts-reward").forEach(e => e.remove());

	const cap = BAL.groupsPerReward;
	let groups = 0;
	const opts = () => rewardOptions(state, state.rewardPending ? state.rewardPending.type : "battle");

	const ov = document.createElement("div");
	ov.className = "pts-reward";
	ov.innerHTML = '<style>.pts-reward{position:fixed;left:0;top:0;right:0;bottom:0;background:rgba(0,0,0,.6);z-index:998}'
		+ '.pts-reward .box{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(520px,92%);background:#161616;border:1px solid #555;border-radius:10px;padding:12px;color:#eee}'
		+ '.pts-reward .hd{margin:0 0 10px;font-size:15px}'
		+ '.pts-reward .row{display:flex;flex-direction:column;gap:6px}'
		+ '.pts-reward .rl{display:flex;align-items:center;justify-content:space-between;gap:8px}'
		+ '.pts-reward button{padding:6px 10px;border:1px solid #666;background:#222;color:#eee;border-radius:6px;cursor:pointer}'
		+ '.pts-reward button:hover{background:#333}'
		+ '.pts-reward button[disabled]{opacity:.4;cursor:default}'
		+ '</style><div class="box"><div class="hd"></div><div class="row"></div></div>';
	document.body.appendChild(ov);
	const hd = ov.querySelector(".hd");
	const row = ov.querySelector(".row");

	function close(msg) {
		state.rewardPending = null;
		game.ptsSaveRun();
		updateHud(state);
		renderMap(state, state.edges);
		ov.remove();
		if (msg) { toast(msg); }
	}
	function doCard() {
		close("加牌:「" + applyAddCard(state) + "」");
	}
	function btn(label, fn, disabled) {
		const b = document.createElement("button");
		b.textContent = label;
		b.onclick = fn;
		if (disabled) { b.disabled = true; }
		return b;
	}
	function main() {
		const cur = opts();
		hd.textContent = "战后奖励" + (groups ? "(改牌 " + groups + "/" + cap + " 组)" : "");
		row.innerHTML = "";
		if (cur[0].ok) { row.appendChild(btn("🔄 改牌方案", recipeV)); }
		else { row.appendChild(btn("🔄 改牌(无方案→加牌)", doCard)); }
		if (cur[1].ok) { row.appendChild(btn("✨ 技能", skillV)); }
		else { row.appendChild(btn("✨ 技能(池已拿空)", () => {}, true)); }
		row.appendChild(btn("🃏 加牌", doCard));
		row.appendChild(btn("⏭ 跳过", () => close("已跳过本次奖励")));
	}
	function recipeV() {
		const list = opts()[0].data;
		hd.textContent = "改牌方案(第 " + (groups + 1) + "/" + cap + " 组,4 张→1 张)";
		row.innerHTML = "";
		for (const r of list) {
			const line = document.createElement("div");
			line.className = "rl";
			const left = document.createElement("span");
			left.textContent = "「" + tName(r.from) + "」x4 →";
			const right = document.createElement("span");
			if (r.toEach) {
				for (const nature of r.toEach) {
					right.appendChild(btn(nature === "fire" ? "🔥火杀" : "⚡雷杀", () => apply(r, nature)));
				}
			} else {
				right.appendChild(btn(tName(r.to), () => apply(r, null)));
			}
			line.appendChild(left);
			line.appendChild(right);
			row.appendChild(line);
		}
		row.appendChild(btn("⟵ 返回", main));
	}
	function apply(recipe, nature) {
		if (!transform4to1(state.deck, recipe, nature)) { toast("牌池不足,方案失效"); return; }
		groups++;
		if (groups >= cap) { close("改牌完成(" + groups + "/" + cap + " 组)"); return; }
		main();
	}
	function skillV() {
		const list = opts()[1].data;
		hd.textContent = "选择一个技能";
		row.innerHTML = "";
		for (const id of list) {
			row.appendChild(btn("✨ " + tName(id), () => {
				const res = grantSkill(state, id);
				close(res.msg);
			}));
		}
		row.appendChild(btn("⟵ 返回", main));
	}
	main();
}
```

- [ ] **Step 2: pts.js 两处替换**

2a. import 区(Task 3 加过的 import 旁)追加:
```js
import { showRewardPanel } from "./src/pts/reward_ui.js";
```
2b. oldString:
```js
game.ptsShowReward = function () {}; // Task 5 替换
```
newString:
```js
game.ptsShowReward = showRewardPanel;
```

- [ ] **Step 3: 验证**

```powershell
node --check resources/app/src/pts/reward_ui.js; node --check resources/app/mode/pts.js
node tests\test_reward.mjs
```
Expected: 无语法输出;`reward tests: 16/16 pass`。

引擎手测:
1. 赢一场普通战斗 → reload 后地图上方弹出「战后奖励」浮层,四选项齐全;
2. 选「改牌方案」→ 列表逐组换,第 3 组后自动关闭(上限 3);期间牌组数 160 不变(4→1 张换张);
3. 选「技能」→ 有 4 个普通技能可选,选后关闭;再赢一场,技能池应少一个且该技能按钮不再出现;
4. 「加牌」「跳过」「无方案降级加牌」各验证一次,浮层关闭、HUD 卡组数变化;
5. 关游戏重开(有存档)→ 奖励浮层若未曾选择,应重新弹出(rewardPending 持久化生效)。

- [ ] **Step 4: Commit**

```powershell
git add resources/app/src/pts/reward_ui.js resources/app/mode/pts.js
git commit -m "add: 战后三选一浮层与挂载"
```

---

### Task 6: shop.js 商店纯逻辑 + BAL.market 定价表 + tests/test_shop.mjs

**Files:**
- Modify: `resources/app/src/pts/balance.js`(增 `market` 块)
- Modify: `docs/superpowers/specs/2026-11-01-shop-reward-skills-design.md`(§6 价格表注明落在 `BAL.market`)
- Create: `resources/app/src/pts/shop.js`
- Create: `tests/test_shop.mjs`

**Interfaces:**
- Produces: `genShopInv(rng, state, bal)` → 货单数组(item:{kind,price,sold,…});`tradeState(state, item, sel, rng?)` → {ok,msg}
- Consumes: `BAL.rewardlibrary`…(仅 market/recs/skills/deck/reward 六个纯模块成员)。

- [ ] **Step 0: balance.js 增 market 定价(可调数值必须进 BAL)**

nodeProb 块后插入:
```js
	market: {
		recipePrice: [150, 250],
		skillPrice: 200,
		skillEPrice: 350,
		addCardPrice: 60,
		healPrice: 50,
		bulkPrice: 120,
	},
```
spec §6 表尾补一行:`> 实现注:以上定价常量收敛于 BAL.market,shop.js 只读它。`

- [ ] **Step 1: 写失败测试**

```js
import { genShopInv, tradeState } from "../resources/app/src/pts/shop.js";
import { BAL } from "../resources/app/src/pts/balance.js";
import { count } from "../resources/app/src/pts/deck.js";

let pass = 0, total = 0;
function t(name, cond) {
	total++;
	if (cond) { pass++; } else { console.error("FAIL: " + name); }
}
function lcg(seed) {
	let s = seed >>> 0;
	return () => (s = (1664525 * s + 1013904223) >>> 0) / 4294967296;
}
function mk(name, n, nature) {
	const S = ["spade", "heart", "club", "diamond"];
	const out = [];
	for (let i = 0; i < n; i++) {
		out.push(name + "|" + S[i % 4] + "|" + (1 + Math.floor(i / 4)) + (nature ? "|" + nature : ""));
	}
	return out;
}

const deck = [].concat(mk("sha", 6), mk("shan", 5), mk("tao", 5), mk("tiesuo", 5), mk("wuxie", 5));
const state = { gold: 1000, hp: 3, hpMax: 10, skills: [], heroSkills: [], deck: deck };
const inv = genShopInv(lcg(9), state, BAL);
t("货单 3~5 槽", inv.length >= 3 && inv.length <= 5);

const shape = it => it && ["recipe", "skill", "skillE", "addCard", "heal", "bulk"].includes(it.kind) && typeof it.price === "number" && it.sold === false;
let allValid = true;
for (const it of inv) {
	allValid = allValid && shape(it);
	if (it.kind === "recipe") {
		allValid = allValid && BAL.recipes.includes(it.recipe) && it.price >= BAL.market.recipePrice[0] && it.price <= BAL.market.recipePrice[1];
	}
	if (it.kind === "skill") { allValid = allValid && BAL.skills.common.includes(it.skillId); }
	if (it.kind === "skillE") { allValid = allValid && BAL.skills.elite.includes(it.skillId); }
}
t("货单条目全部合法", allValid === true);

const st1 = { gold: 1000, hp: 3, hpMax: 10, skills: [], heroSkills: [], deck: [].concat(mk("sha", 6), mk("shan", 5)) };
const itR = { kind: "recipe", recipe: { from: "shan", to: "tao", tier: "common" }, price: 150, sold: false };
let tr = tradeState(st1, itR, { nature: null });
t("改牌购买落地 4→1", tr.ok === true && st1.deck.length === 11 && st1.deck[10].split("|")[0] === "tao" && st1.gold === 850 && itR.sold === true);
t("已售出拒购", tradeState(st1, itR, { nature: null }).ok === false && st1.gold === 850);

const st2 = { gold: 50, hp: 3, hpMax: 10, skills: [], heroSkills: [], deck: mk("shan", 5) };
tr = tradeState(st2, { kind: "addCard", price: 60, sold: false }, null);
t("金币不足拒购且不动", tr.ok === false && st2.gold === 50 && st2.deck.length === 5);

const st3 = { gold: 1000, hp: 3, hpMax: 10, skills: [], heroSkills: [], deck: [] };
const itA = { kind: "addCard", price: 60, sold: false };
tr = tradeState(st3, itA, null, () => 0);
t("加牌购买 rng0", tr.ok === true && st3.deck.length === 1 && st3.deck[0] === "sha|spade|1" && st3.gold === 940 && itA.sold === true);

const itH = { kind: "heal", price: 50, sold: false };
t("回血购买", tradeState(st1, itH, null).ok === true);
t("回血可重复且不置为已售", tradeState(st1, itH, null).ok === true && st1.gold === 750 && st1.hp === 5 && itH.sold === false);

const st4 = { gold: 500, hp: 3, hpMax: 10, skills: [], heroSkills: [], deck: [].concat(mk("sha", 3), mk("shan", 4)) };
const itB = { kind: "bulk", price: 120, sold: false };
tr = tradeState(st4, itB, { kind: "sha" });
t("同类全删保底一张", tr.ok === true && count(st4.deck, "sha") === 1 && st4.gold === 380 && itB.sold === true);
t("同类全删已售拒不重删", tradeState(st4, itB, { kind: "shan" }).ok === false);
const st5 = { gold: 500, hp: 3, hpMax: 10, skills: [], heroSkills: [], deck: mk("jiu", 1) };
t("同类全删仅 1 张拒绝", tradeState(st5, { kind: "bulk", price: 120, sold: false }, { kind: "jiu" }).ok === false);

const st6 = { gold: 400, hp: 3, hpMax: 10, skills: [], heroSkills: [], deck: [] };
const itS = { kind: "skill", skillId: "wushuang", price: 200, sold: false };
tr = tradeState(st6, itS, null);
t("技能购买", tr.ok === true && st6.skills.includes("wushuang") && st6.gold === 200 && itS.sold === true);
t("技能已售拒购", tradeState(st6, itS, null).ok === false);

console.log("shop tests: " + pass + "/" + total + " pass");
if (pass !== total) { process.exit(1); }
```

- [ ] **Step 2: 运行确认失败**

```powershell
node tests\test_shop.mjs
```
Expected: `Cannot find module .../shop.js`(0 过)。

- [ ] **Step 3: 实现 shop.js(完整文件)**

```js
/* 商店纯逻辑:货单生成与交易守卫。零引擎依赖(只读 BAL 与 reward/deck 纯模块)。
   货单只随「进图入铺」生成一次并持有在 state.shopInv,刷新/往返地图不重抽。 */
import { BAL } from "./balance.js";
import { transform4to1, count, removeKind } from "./deck.js";
import { recipeCandidates, skillCandidates, applyAddCard } from "./reward.js";

/* 每槽定价。价格常量全部收敛在 BAL.market(见 balance.js market 块)。 */
function priceOf(bal, kind, r) {
	const m = bal.market;
	if (kind === "recipe") { return m.recipePrice[0] + Math.floor(r() * (m.recipePrice[1] - m.recipePrice[0] + 1)); }
	if (kind === "skill") { return m.skillPrice; }
	if (kind === "skillE") { return m.skillEPrice; }
	if (kind === "addCard") { return m.addCardPrice; }
	if (kind === "heal") { return m.healPrice; }
	return m.bulkPrice;
}

/* 3~5 槽货单。有候选的类别才入池均匀抽;改牌物路由当前牌池的候选(买时再验一次)。 */
export function genShopInv(rng, state, bal) {
	const r = rng || Math.random;
	const b = bal || BAL;
	const slots = 3 + Math.floor(r() * 3);
	const items = [];
	for (let i = 0; i < slots; i++) {
		const avail = [];
		if (recipeCandidates(state.deck).length) { avail.push("recipe"); }
		if (skillCandidates(state.skills, state.heroSkills, "common").length) { avail.push("skill"); }
		if (skillCandidates(state.skills, state.heroSkills, "elite").length) { avail.push("skillE"); }
		avail.push("addCard", "heal", "bulk");
		const kind = avail[Math.floor(r() * avail.length)];
		const it = { kind: kind, price: priceOf(b, kind, r), sold: false };
		if (kind === "recipe") {
			const cs = recipeCandidates(state.deck);
			it.recipe = cs[Math.floor(r() * cs.length)];
		} else if (kind === "skill") {
			const cs = skillCandidates(state.skills, state.heroSkills, "common");
			it.skillId = cs[Math.floor(r() * cs.length)];
		} else if (kind === "skillE") {
			const cs = skillCandidates(state.skills, state.heroSkills, "elite");
			it.skillId = cs[Math.floor(r() * cs.length)];
		}
		items.push(it);
	}
	return items;
}

/* 交易守卫与落地。sel:{nature?}改牌选属性 / {kind?}同类全删选牌名。
   回血物件可重复购买(不置已售);同类全删物件同理会一次全删。 */
export function tradeState(state, item, sel, rng) {
	if (!item) { return { ok: false, msg: "无效商品" }; }
	if (item.sold) { return { ok: false, msg: "已售出" }; }
	if (state.gold < item.price) { return { ok: false, msg: "金币不足(需 " + item.price + ")" }; }
	if (item.kind === "recipe") {
		const nature = sel && sel.nature ? sel.nature : null;
		if (!transform4to1(state.deck, item.recipe, nature)) { return { ok: false, msg: "牌池已变化,方案失效" }; }
		item.sold = true;
	} else if (item.kind === "skill") {
		const poolKey = BAL.skills.elite.includes(item.skillId) ? "elite" : "common";
		if (!skillCandidates(state.skills, state.heroSkills, poolKey).includes(item.skillId)) { return { ok: false, msg: "该技能已不可购买" }; }
		state.skills.push(item.skillId);
		item.sold = true;
	} else if (item.kind === "addCard") {
		applyAddCard(state, rng);
		item.sold = true;
	} else if (item.kind === "heal") {
		if (state.hp >= state.hpMax) { return { ok: false, msg: "体力已满" }; }
		state.hp++;
	} else if (item.kind === "bulk") {
		const kind = sel && sel.kind;
		if (!kind || count(state.deck, kind) <= 1) { return { ok: false, msg: "该牌不足 2 张,不设删" }; }
		removeKind(state.deck, kind);
		item.sold = true;
	}
	state.gold -= item.price;
	return { ok: true, msg: "已购入(" + item.price + " 金币)" };
}
```

- [ ] **Step 4: 运行确认通过**

```powershell
node tests\test_shop.mjs
node tests\test_reward.mjs; node tests\test_deck.mjs
```
Expected: `shop tests: 13/13 pass`;reward/deck 依旧全绿(纯层无回归)。

- [ ] **Step 5: Commit**

```powershell
git add resources/app/src/pts/balance.js resources/app/src/pts/shop.js tests/test_shop.mjs docs
git commit -m "add: 商店纯逻辑与BAL定价表"
```

---

### Task 7: shop_ui.js 浮层 + node.js 宝箱/商店分发 + 地图图标收尾

**Files:**
- Modify: `resources/app/src/pts/balance.js`(增 `chest` 概率块)
- Modify: `resources/app/src/pts/node.js`(chest 分支重写 + shop 分支 + chestResolve 助手 + imports)
- Create: `resources/app/src/pts/shop_ui.js`
- Modify: `resources/app/src/pts/map/ui.js`(ICONS/NODE_COLOR/提示栏)
- Modify: `resources/app/mode/pts.js`(import + 替换 ptsShowShop stub)

**Interfaces:**
- Consumes: `genShopInv/tradeState`(shop.js)、`kindsOf/count`(deck.js)、`recipeCandidates/skillCandidates`(reward.js)、`game.ptsState/ptsSaveRun`、`renderMap/toast/updateHud`。
- Produces: 替换 `game.ptsShowShop = showShopPanel`;宝箱 FR-16 完整落地。

- [ ] **Step 0: balance.js 定制 chest 概率(nodeProb 块后、market 块旁)**

oldString(nodeProb 块结束后):
```js
		rest: 0.10,
		shop: 0.12,
	},
```
newString:
```js
		rest: 0.10,
		shop: 0.12,
	},
	chest: {
		recipeProb: 0.6,
		skillProb: 0.4,
	},
```

- [ ] **Step 1: node.js 三处编辑**

1a. import 区 oldString:
```js
import { game, lib, _status } from "noname";
import { updateHud } from "./hud.js";
import { toast, renderMap } from "./map/ui.js";
import { BAL } from "./balance.js";
```
newString:
```js
import { game, lib, _status } from "noname";
import { updateHud } from "./hud.js";
import { toast, renderMap } from "./map/ui.js";
import { BAL } from "./balance.js";
import { recipeCandidates, skillCandidates } from "./reward.js";
import { transform4to1 } from "./deck.js";
import { genShopInv } from "./shop.js";
```

1b. chest→shop 分支重写。oldString:
```js
	} else if (type === "chest") {
		const g = rndInt(BAL.gold.chest[0], BAL.gold.chest[1]);
		state.gold += g;
		toast("🎁 宝箱:金币 +" + g);
	} else if (type === "event") {
```
newString:
```js
	} else if (type === "chest") {
		chestResolve(state);
	} else if (type === "shop") {
		if (!state.shopInv) {
			state.shopInv = genShopInv(Math.random, state, BAL);
		}
		updateHud(state);
		renderMap(state, edges);
		localStorage.setItem("pts_run", JSON.stringify(state));
		game.ptsShowShop();
		return true;
	} else if (type === "event") {
```

1c. 文件末尾(canWalk 函数后)追加:
```js
/* ---------- 宝箱 FR-16:金币必得;60% 精英档改牌一次(候选不足→金币补偿);40% 普通技一次(池空→补偿) ---------- */
function chestResolve(state) {
	const g = rndInt(BAL.gold.chest[0], BAL.gold.chest[1]);
	state.gold += g;
	let msg = "🎁 宝箱:金币 +" + g;
	const comp = () => {
		const g2 = rndInt(BAL.gold.battle[0], BAL.gold.battle[1]);
		state.gold += g2;
		return ";补偿金币 +" + g2;
	};
	if (Math.random() < BAL.chest.recipeProb) {
		const cs = recipeCandidates(state.deck, "elite");
		if (cs.length) {
			const r = cs[Math.floor(Math.random() * cs.length)];
			const nature = r.toEach ? r.toEach[Math.floor(Math.random() * r.toEach.length)] : null;
			if (transform4to1(state.deck, r, nature)) {
				msg += ";改牌「" + r.from + "」4→1" + (r.toEach ? (nature === "fire" ? "(火杀)" : "(雷杀)") : "→「" + r.to + "」");
			} else { msg += comp(); }
		} else { msg += comp(); }
	} else {
		const pool = skillCandidates(state.skills, state.heroSkills, "common");
		if (pool.length) {
			const id = pool[Math.floor(Math.random() * pool.length)];
			state.skills.push(id);
			msg += ";获得技能「" + (lib.translate[id] || id) + "」";
		} else { msg += comp(); }
	}
	toast(msg);
}
```

- [ ] **Step 2: 创建 shop_ui.js(完整文件)**

```js
/* 商店浮层(FR-15)。读 state.shopInv;交易守卫走 shop.js 纯函数;由 pts.js 挂载为 game.ptsShowShop。 */
import { lib, game } from "noname";
import { tradeState } from "./shop.js";
import { kindsOf, count } from "./deck.js";
import { updateHud } from "./hud.js";
import { renderMap, toast } from "./map/ui.js";

function tName(id) { return lib.translate[id] || id; }

export function showShopPanel() {
	const state = game.ptsState;
	if (!state || !state.shopInv) { return; }
	document.querySelectorAll(".pts-shop").forEach(e => e.remove());

	const ov = document.createElement("div");
	ov.className = "pts-shop";
	ov.innerHTML = '<style>.pts-shop{position:fixed;left:0;top:0;right:0;bottom:0;background:rgba(0,0,0,.6);z-index:998}'
		+ '.pts-shop .box{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(520px,92%);background:#161616;border:1px solid #555;border-radius:10px;padding:12px;color:#eee}'
		+ '.pts-shop .hd{margin:0 0 10px;font-size:15px}'
		+ '.pts-shop .row{display:flex;flex-direction:column;gap:6px}'
		+ '.pts-shop .rl{display:flex;align-items:center;justify-content:space-between;gap:8px}'
		+ '.pts-shop button{padding:6px 10px;border:1px solid #666;background:#222;color:#eee;border-radius:6px;cursor:pointer}'
		+ '.pts-shop button:hover{background:#333}'
		+ '.pts-shop button[disabled]{opacity:.4;cursor:default}'
		+ '</style><div class="box"><div class="hd"></div><div class="row"></div></div>';
	document.body.appendChild(ov);
	const hd = ov.querySelector(".hd");
	const row = ov.querySelector(".row");

	function persist() {
		game.ptsSaveRun();
		updateHud(state);
		renderMap(state, state.edges);
	}
	function leave() {
		ov.remove();
		persist();
		toast("离开商店");
	}
	function btn(label, fn, disabled) {
		const b = document.createElement("button");
		b.textContent = label;
		b.onclick = fn;
		if (disabled) { b.disabled = true; }
		return b;
	}
	function itemLabel(it) {
		if (it.kind === "recipe") {
			return "🔄 改牌「" + tName(it.recipe.from) + "」x4 →" + (it.recipe.toEach ? "🔥火杀/⚡雷杀" : "「" + tName(it.recipe.to) + "」") + "(" + it.price + "金)";
		}
		if (it.kind === "skill") { return "✨ 技能「" + tName(it.skillId) + "」(" + it.price + "金)"; }
		if (it.kind === "skillE") { return "🌟 精英技「" + tName(it.skillId) + "」(" + it.price + "金)"; }
		if (it.kind === "addCard") { return "🃏 随机加牌(" + it.price + "金)"; }
		if (it.kind === "heal") { return "❤ 回 1 点体力(" + it.price + "金)"; }
		return "🗑 同类牌全删(" + it.price + "金)";
	}
	function buy(it, sel) {
		const res = tradeState(state, it, sel);
		toast(res.msg);
		if (res.ok) { persist(); }
		renderRow();
	}
	function renderRow() {
		hd.textContent = "商店(持有金币:" + state.gold + ")";
		row.innerHTML = "";
		for (const it of state.shopInv) {
			const line = document.createElement("div");
			line.className = "rl";
			const left = document.createElement("span");
			left.textContent = itemLabel(it);
			if (it.sold) { left.style.opacity = "0.4"; }
			const right = document.createElement("span");
			if (it.sold) {
				right.appendChild(btn("已售罄", () => {}, true));
			} else if (it.kind === "recipe" && it.recipe.toEach) {
				right.appendChild(btn("🔥火杀", () => buy(it, { nature: "fire" })));
				right.appendChild(btn("⚡雷杀", () => buy(it, { nature: "thunder" })));
			} else if (it.kind === "bulk") {
				right.appendChild(btn("选牌名…", () => bulkV(it)));
			} else {
				right.appendChild(btn("购买", () => buy(it, null)));
			}
			line.appendChild(left);
			line.appendChild(right);
			row.appendChild(line);
		}
		row.appendChild(btn("🚪 离开", leave));
	}
	function bulkV(it) {
		row.innerHTML = "";
		const tip = document.createElement("div");
		tip.textContent = "选一种要删的牌(每删留 1 张):";
		row.appendChild(tip);
		for (const kind of kindsOf(state.deck)) {
			row.appendChild(btn(tName(kind) + " ×" + count(state.deck, kind), () => buy(it, { kind: kind })));
		}
		row.appendChild(btn("⟵ 返回", renderRow));
	}
	renderRow();
}
```

- [ ] **Step 3: map/ui.js 三处编辑**

3a. ICONS oldString:
```js
const ICONS = {
	battle: "⚔",
	elite: "💀",
	boss: "⛧",
	chest: "🎁",
	rest: "🔥",
	event: "❓",
};
```
newString:
```js
const ICONS = {
	battle: "⚔",
	elite: "💀",
	boss: "⛧",
	chest: "🎁",
	rest: "🔥",
	event: "❓",
	shop: "🛒",
};
```
3b. NODE_COLOR oldString:
```js
const NODE_COLOR = {
	battle: "#8a93a2",
	elite: "#b06bff",
	boss: "#ff5c5c",
	chest: "#e8c268",
	rest: "#5fd06a",
	event: "#5fb6ff",
};
```
newString:
```js
const NODE_COLOR = {
	battle: "#8a93a2",
	elite: "#b06bff",
	boss: "#ff5c5c",
	chest: "#e8c268",
	rest: "#5fd06a",
	event: "#5fb6ff",
	shop: "#4bd0e5",
};
```
3c. 提示栏 oldString:
```
沿亮色连线,只能走向下一层;⚔战斗 💀精英 ⛧BOSS 🎁宝箱 🔥篝火 ❓事件
```
newString:
```
沿亮色连线,只能走向下一层;⚔战斗 💀精英 ⛧BOSS 🎁宝箱 🔥篝火 🛒商店 ❓事件
```

- [ ] **Step 4: pts.js 两处**

4a. import 追加:
```js
import { showShopPanel } from "./src/pts/shop_ui.js";
```
4b. oldString:
```js
game.ptsShowShop = function () {};   // Task 7 替换
```
newString:
```js
game.ptsShowShop = showShopPanel;
```
(stub 实际文本以 pts.js 现状为准——若 Task 3 写入的注释形态不同,以 grep 定位后整行替换,保持游戏语义一致。)

- [ ] **Step 5: 验证**

```powershell
node --check resources/app/src/pts/balance.js; node --check resources/app/src/pts/node.js; node --check resources/app/src/pts/shop_ui.js; node --check resources/app/src/pts/map/ui.js; node --check resources/app/mode/pts.js
node tests\test_shop.mjs; node tests\test_reward.mjs; node tests\test_deck.mjs
```
Expected: 全部无语法输出;三测试全绿。

引擎手测:
1. 走图能看到 🛒 商店节点(青色)且进入后浮层;货单 3~5 槽与类别一致;
2. 买改牌(火杀/雷杀按钮)→ toast + 金币减少 + 牌组内容变化(再进战斗能摸到火杀);
3. 金币不足条目:「购买」置灰不可点;
4. 同类全删:子列表可选牌名,按 count 删除(保底 1),售出后置灰;
5. 回血可重复购买、不置灰;技能购买后 HUD/奖励面板不再出现同一技能;
6. 「离开」回地图;再点其它节点正常;关闭游戏重开,若仍未离开商店,浮层按存档重显(sold 状态保持);
7. 宝箱节点:碰两次,一次应看到「改牌」或「技能」,一次金币/补偿路径(概率性,多试几次);牌名栏(confirm)到 deck 反映一致。

- [ ] **Step 6: Commit**

```powershell
git add resources/app/src/pts/balance.js resources/app/src/pts/node.js resources/app/src/pts/shop_ui.js resources/app/src/pts/map/ui.js resources/app/mode/pts.js
git commit -m "add: 商店浮层与宝箱完整实装"

---
