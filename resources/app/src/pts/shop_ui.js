/* 商店弹窗(FR-15)。读 state.shopInv;交易守卫走 shop.js 纯函数;由 pts.js 挂载为 game.ptsShowShop。
 * 排版与战后奖励统一:居中标题 + 整行按钮堆叠(引擎 dialog 体系)。 */
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
	function baseLabel(it) {
		if (it.kind === "skill") { return "✨ 技能「" + tName(it.skillId) + "」"; }
		if (it.kind === "skillE") { return "🌟 精英技「" + tName(it.skillId) + "」"; }
		if (it.kind === "addCard") { return "🃏 随机加牌"; }
		if (it.kind === "heal") { return "❤ 回 1 点体力"; }
		return "🗑 同类牌全删";
	}
	function heading(text) {
		const h = document.createElement("div");
		h.textContent = text;
		h.style.cssText = "text-align:center;color:#9a958a;margin-bottom:10px;";
		body.appendChild(h);
	}
	function buy(it, sel) {
		const res = tradeState(state, it, sel);
		toast(res.msg);
		if (res.ok) { persist(); }
		renderRow();
	}
	function renderRow() {
		body.innerHTML = "";
		heading("持有金币:" + state.gold);
		for (const it of state.shopInv) {
			if (it.sold) {
				body.appendChild(screenButton(baseLabel(it) + "(已售罄)", () => {}, true, true));
				continue;
			}
			const poor = state.gold < it.price;
			if (it.kind === "recipe" && it.recipe.toEach) {
				const from = "🔄 改牌「" + tName(it.recipe.from) + "」x4 → ";
				body.appendChild(screenButton(from + "🔥火杀(" + it.price + "金)", () => buy(it, { nature: "fire" }), poor, true));
				body.appendChild(screenButton(from + "⚡雷杀(" + it.price + "金)", () => buy(it, { nature: "thunder" }), poor, true));
			} else if (it.kind === "bulk") {
				body.appendChild(screenButton("🗑 同类牌全删(" + it.price + "金)", () => bulkV(it), poor, true));
			} else {
				body.appendChild(screenButton(baseLabel(it) + "(" + it.price + "金)", () => buy(it, null), poor, true));
			}
		}
		footer.innerHTML = "";
		footer.appendChild(screenButton("🚪 离开", leave));
	}
	function bulkV(it) {
		body.innerHTML = "";
		heading("同类牌全删(每删留 1 张) — " + it.price + "金");
		for (const kind of kindsOf(state.deck)) {
			body.appendChild(screenButton("「" + tName(kind) + "」×" + count(state.deck, kind), () => buy(it, { kind: kind }), false, true));
		}
		footer.innerHTML = "";
		footer.appendChild(screenButton("⟵ 返回", renderRow));
	}
	renderRow();
}
