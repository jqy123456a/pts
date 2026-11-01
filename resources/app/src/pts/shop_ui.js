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
