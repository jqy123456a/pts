/* 商店浮层(FR-15)。读 state.shopInv;交易守卫走 shop.js 纯函数;由 pts.js 挂载为 game.ptsShowShop。 */
import { lib, game, _status } from "noname";
import { tradeState } from "./shop.js";
import { kindsOf, count } from "./deck.js";
import { updateHud } from "./hud.js";
import { renderMap, toast } from "./map/ui.js";

function tName(id) { return lib.translate[id] || id; }

export function showShopPanel() {
	const state = _status.ptsState;
	if (!state || !state.shopInv) { return; }
	document.querySelectorAll(".pts-shop").forEach(e => e.remove());

	const ov = document.createElement("div");
	ov.className = "pts-shop";
	ov.innerHTML = '<style>.pts-shop{position:fixed;left:0;top:0;right:0;bottom:0;background:rgba(0,0,0,.6);z-index:9998}'
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
