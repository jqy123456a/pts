# 节点交互满屏画面改造 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 商店/战后奖励/宝箱/篝火/事件全部从「小方框弹窗 / toast」改为满屏独立画面。

**Architecture:** 新增纯 DOM 满屏层组件 `screen.js`（`openScreen`/`screenButton`）；`shop_ui.js`/`reward_ui.js` 改用满屏；`node.js` 宝箱/篝火/事件改为满屏结算卡 +「继续」。

**Tech Stack:** JavaScript（无名杀引擎 DOM）

## Global Constraints

- 战斗行动日志不改。
- 满屏层 `z-index:9998`（地图 9990、toast 99999）；`openScreen` 先清旧 `.pts-screen`。
- 无 node 单测；验证 = `node --check` + 手测清单。
- commit 风格：`add: <中文>`

---

### Task 1: 满屏层组件 screen.js

**Files:**
- Create: `resources/app/src/pts/screen.js`

- [ ] **Step 1: 创建 screen.js（完整文件）**

```js
/* 满屏节点交互层:商店/奖励/宝箱/篝火/事件共用的全屏画面骨架。纯 DOM,无 noname 依赖。 */

export function openScreen(title) {
	document.querySelectorAll(".pts-screen").forEach((e) => e.remove());
	const root = document.createElement("div");
	root.className = "pts-screen";
	root.innerHTML = '<style>.pts-screen{position:fixed;left:0;top:0;right:0;bottom:0;z-index:9998;display:flex;flex-direction:column;background:linear-gradient(#20242a,#14161a);color:#e8e4d8;font-family:"Microsoft YaHei",xinwei,sans-serif}'
		+ '.pts-screen .hd{height:64px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:bold;background:#101216;border-bottom:1px solid #444;flex-shrink:0}'
		+ '.pts-screen .body{flex:1;overflow:auto;padding:16px 20px}'
		+ '.pts-screen .footer{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;padding:14px 20px;border-top:1px solid #444;background:#101216;flex-shrink:0}'
		+ '.pts-screen button{padding:10px 16px;font-size:15px;border:1px solid #666;background:#222;color:#eee;border-radius:8px;cursor:pointer}'
		+ '.pts-screen button:hover{background:#333}'
		+ '.pts-screen button[disabled]{opacity:.4;cursor:default}'
		+ '.pts-screen .body>button{display:block;width:100%;margin-bottom:8px}'
		+ '.pts-screen .card{display:flex;align-items:center;justify-content:space-between;gap:10px;background:#1a1e24;border:1px solid #3a3f46;border-radius:10px;padding:10px 14px;margin-bottom:8px}'
		+ '.pts-screen .card .lbl{flex:1}'
		+ '.pts-screen .card .acts{display:flex;gap:8px;flex-shrink:0}'
		+ '</style><div class="hd"></div><div class="body"></div><div class="footer"></div>';
	root.querySelector(".hd").textContent = title;
	document.body.appendChild(root);
	return {
		root: root,
		body: root.querySelector(".body"),
		footer: root.querySelector(".footer"),
		close: function () { root.remove(); },
	};
}

export function screenButton(label, onclick, disabled) {
	const b = document.createElement("button");
	b.textContent = label;
	b.onclick = onclick;
	if (disabled) { b.disabled = true; }
	return b;
}
```

- [ ] **Step 2: 语法检查** `node --check resources/app/src/pts/screen.js`

---

### Task 2: shop_ui.js / reward_ui.js 改用满屏

**Files:**
- Modify: `resources/app/src/pts/shop_ui.js`（整体重写，逻辑不变）
- Modify: `resources/app/src/pts/reward_ui.js`（整体重写，逻辑不变）

实现要点（两文件均按此模式）：
- 顶部 `import { openScreen, screenButton } from "./screen.js";`
- `showShopPanel`/`showRewardPanel` 内用 `const s = openScreen(title); const body = s.body; const footer = s.footer;`
- 局部 `btn()` 改调 `screenButton`；`hd/row` 改 `body/footer`；`ov.remove()` 改 `s.close()`。
- 商店货单/改牌逐组条目用 `.card` 卡片结构（`lbl` + `acts`）；技能/主选项用 body 直挂按钮（CSS 已做全宽堆叠）。
- 商店金币放 body 顶部右对齐；「离开」放 footer。奖励「跳过」放 footer。

- [ ] **Step 1: 重写 shop_ui.js**（完整代码见下，逻辑与现版一致）

```js
/* 商店满屏画面(FR-15)。读 state.shopInv;交易守卫走 shop.js 纯函数;由 pts.js 挂载为 game.ptsShowShop。 */
import { lib, game, _status } from "noname";
import { tradeState } from "./shop.js";
import { kindsOf, count } from "./deck.js";
import { updateHud } from "./hud.js";
import { renderMap, toast } from "./map/ui.js";
import { openScreen, screenButton } from "./screen.js";

function tName(id) { return lib.translate[id] || id; }

export function showShopPanel() {
	const state = _status.ptsState;
	if (!state || !state.shopInv) { return; }
	const s = openScreen("🛒 商店");
	const body = s.body;
	const footer = s.footer;

	function persist() {
		game.ptsSaveRun();
		updateHud(state);
		renderMap(state, state.edges);
	}
	function leave() {
		s.close();
		persist();
		toast("离开商店");
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
		body.innerHTML = "";
		const gold = document.createElement("div");
		gold.textContent = "持有金币:" + state.gold;
		gold.style.cssText = "text-align:right;color:#e8c268;margin-bottom:10px;font-size:16px;";
		body.appendChild(gold);
		for (const it of state.shopInv) {
			const card = document.createElement("div");
			card.className = "card";
			const lbl = document.createElement("div");
			lbl.className = "lbl";
			lbl.textContent = itemLabel(it);
			if (it.sold) { lbl.style.opacity = "0.4"; }
			const acts = document.createElement("div");
			acts.className = "acts";
			if (it.sold) {
				acts.appendChild(screenButton("已售罄", () => {}, true));
			} else if (it.kind === "recipe" && it.recipe.toEach) {
				acts.appendChild(screenButton("🔥火杀", () => buy(it, { nature: "fire" })));
				acts.appendChild(screenButton("⚡雷杀", () => buy(it, { nature: "thunder" })));
			} else if (it.kind === "bulk") {
				acts.appendChild(screenButton("选牌名…", () => bulkV(it)));
			} else {
				acts.appendChild(screenButton("购买", () => buy(it, null)));
			}
			card.appendChild(lbl);
			card.appendChild(acts);
			body.appendChild(card);
		}
		footer.innerHTML = "";
		footer.appendChild(screenButton("🚪 离开", leave));
	}
	function bulkV(it) {
		body.innerHTML = "";
		const tip = document.createElement("div");
		tip.textContent = "选一种要删的牌(每删留 1 张):";
		tip.style.cssText = "color:#9a958a;margin-bottom:10px;";
		body.appendChild(tip);
		for (const kind of kindsOf(state.deck)) {
			const card = document.createElement("div");
			card.className = "card";
			const lbl = document.createElement("div");
			lbl.className = "lbl";
			lbl.textContent = tName(kind) + " ×" + count(state.deck, kind);
			const acts = document.createElement("div");
			acts.className = "acts";
			acts.appendChild(screenButton("删", () => buy(it, { kind: kind })));
			card.appendChild(lbl);
			card.appendChild(acts);
			body.appendChild(card);
		}
		footer.innerHTML = "";
		footer.appendChild(screenButton("⟵ 返回", renderRow));
	}
	renderRow();
}
```

- [ ] **Step 2: 重写 reward_ui.js**

```js
/* 战后三选一满屏画面(FR-12/13)。规则判定走 reward.js/deck.js 纯函数,本文件只做 DOM 渲染与落盘。 */
import { lib, game, _status } from "noname";
import { BAL } from "./balance.js";
import { rewardOptions, applyAddCard, grantSkill } from "./reward.js";
import { transform4to1 } from "./deck.js";
import { renderMap, toast } from "./map/ui.js";
import { openScreen, screenButton } from "./screen.js";

function tName(id) { return lib.translate[id] || id; }

export function showRewardPanel() {
	const state = _status.ptsState;
	if (!state || !state.rewardPending) { return; }
	const cap = BAL.groupsPerReward;
	let groups = 0;
	const opts = () => rewardOptions(state, state.rewardPending ? state.rewardPending.type : "battle");
	const s = openScreen("战后奖励");
	const body = s.body;
	const footer = s.footer;

	function close(msg) {
		state.rewardPending = null;
		game.ptsSaveRun();
		s.close();
		renderMap(state, state.edges);
		if (msg) { toast(msg); }
	}
	function doCard() {
		close("加牌:「" + applyAddCard(state) + "」");
	}
	function main() {
		const cur = opts();
		body.innerHTML = "";
		const sub = document.createElement("div");
		sub.textContent = groups ? "(本局改牌 " + groups + "/" + cap + " 组)" : "";
		sub.style.cssText = "text-align:center;color:#9a958a;margin-bottom:10px;";
		body.appendChild(sub);
		if (cur[0].ok) { body.appendChild(screenButton("🔄 改牌方案", recipeV)); }
		else { body.appendChild(screenButton("🔄 改牌(无方案→加牌)", doCard)); }
		if (cur[1].ok) { body.appendChild(screenButton("✨ 技能", skillV)); }
		else { body.appendChild(screenButton("✨ 技能(池已拿空)", () => {}, true)); }
		body.appendChild(screenButton("🃏 加牌", doCard));
		footer.innerHTML = "";
		footer.appendChild(screenButton("⏭ 跳过", () => close("已跳过本次奖励")));
	}
	function recipeV() {
		const list = opts()[0].data;
		body.innerHTML = "";
		const h = document.createElement("div");
		h.textContent = "第 " + (groups + 1) + "/" + cap + " 组,4 张→1 张:";
		h.style.cssText = "color:#9a958a;margin-bottom:10px;";
		body.appendChild(h);
		for (const r of list) {
			const card = document.createElement("div");
			card.className = "card";
			const lbl = document.createElement("div");
			lbl.className = "lbl";
			lbl.textContent = "「" + tName(r.from) + "」x4 →";
			const acts = document.createElement("div");
			acts.className = "acts";
			if (r.toEach) {
				for (const nature of r.toEach) {
					acts.appendChild(screenButton(nature === "fire" ? "🔥火杀" : "⚡雷杀", () => apply(r, nature)));
				}
			} else {
				acts.appendChild(screenButton(tName(r.to), () => apply(r, null)));
			}
			card.appendChild(lbl);
			card.appendChild(acts);
			body.appendChild(card);
		}
		footer.innerHTML = "";
		footer.appendChild(screenButton("⟵ 返回", main));
	}
	function apply(recipe, nature) {
		if (!transform4to1(state.deck, recipe, nature)) { toast("牌池不足,方案失效"); return; }
		groups++;
		if (groups >= cap) { close("改牌完成(" + groups + "/" + cap + " 组)"); return; }
		main();
	}
	function skillV() {
		const list = opts()[1].data;
		body.innerHTML = "";
		for (const id of list) {
			body.appendChild(screenButton("✨ " + tName(id), () => {
				const res = grantSkill(state, id);
				close(res.msg);
			}));
		}
		footer.innerHTML = "";
		footer.appendChild(screenButton("⟵ 返回", main));
	}
	main();
}
```

- [ ] **Step 3: 语法检查** `node --check` 两文件

---

### Task 3: node.js 宝箱/篝火/事件改满屏结算卡

**Files:**
- Modify: `resources/app/src/pts/node.js`

- [ ] **Step 1: import 加 openScreen/screenButton**

oldString:
```js
import { genShopInv } from "./shop.js";
```
newString:
```js
import { genShopInv } from "./shop.js";
import { openScreen, screenButton } from "./screen.js";
```

- [ ] **Step 2: rest/chest/event 分支改满屏**

oldString:
```js
	const type = node.type;
	if (type === "rest") {
		state.hp = Math.min(state.hpMax, state.hp + BAL.rest.heal);
		toast("🔥 篝火:回复 " + BAL.rest.heal + " 点体力");
	} else if (type === "chest") {
		chestResolve(state);
	} else if (type === "shop") {
```
newString:
```js
	const type = node.type;
	let screenTitle = null;
	let screenMsg = null;
	if (type === "rest") {
		state.hp = Math.min(state.hpMax, state.hp + BAL.rest.heal);
		screenTitle = "🔥 篝火";
		screenMsg = "回复 " + BAL.rest.heal + " 点体力,当前 " + state.hp + "/" + state.hpMax;
	} else if (type === "chest") {
		screenTitle = "🎁 宝箱";
		screenMsg = chestResolve(state);
	} else if (type === "shop") {
```

- [ ] **Step 3: event 分支改满屏**

oldString:
```js
	} else if (type === "event") {
		toast("❓ 第" + (l + 1) + "层 事件(M3 实装)");
	} else {
```
newString:
```js
	} else if (type === "event") {
		screenTitle = "❓ 事件";
		screenMsg = "第 " + (l + 1) + " 层 事件(M3 实装)";
	} else {
```

- [ ] **Step 4: 结尾渲染满屏结算卡**

oldString:
```js
	updateHud(state);
	renderMap(state, edges);
	localStorage.setItem("pts_run", JSON.stringify(state));
	return true;
}
```
newString:
```js
	updateHud(state);
	renderMap(state, edges);
	localStorage.setItem("pts_run", JSON.stringify(state));
	if (screenTitle) {
		const s = openScreen(screenTitle);
		const div = document.createElement("div");
		div.textContent = screenMsg;
		div.style.cssText = "font-size:17px;text-align:center;padding:20px 0;";
		s.body.appendChild(div);
		s.footer.appendChild(screenButton("继续", () => s.close()));
	}
	return true;
}
```

- [ ] **Step 5: chestResolve 改为返回文案**

oldString:
```js
	toast(msg);
}
```
newString:
```js
	return msg;
}
```

- [ ] **Step 6: 语法检查 + 全量测试**

```powershell
node --check resources/app/src/pts/node.js
node --check resources/app/src/pts/screen.js
node --check resources/app/src/pts/shop_ui.js
node --check resources/app/src/pts/reward_ui.js
node tests\test_gen.mjs; node tests\test_branches.mjs
```

- [ ] **Step 7: Commit**

```powershell
git add resources/app/src/pts/screen.js resources/app/src/pts/shop_ui.js resources/app/src/pts/reward_ui.js resources/app/src/pts/node.js
git commit -m "add: 节点交互改满屏画面(商店/奖励/宝箱/篝火/事件)"
```
