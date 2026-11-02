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
	console.log("[pts:reward] showRewardPanel 进入, state=", !!state, "rewardPending=", state && state.rewardPending);
	if (!state || !state.rewardPending) { return; }
	state.deck = state.deck || [];
	state.skills = state.skills || [];
	state.heroSkills = state.heroSkills || [];
	const cap = BAL.groupsPerReward;
	let groups = 0;
	const opts = () => {
		try {
			return rewardOptions(state, state.rewardPending ? state.rewardPending.type : "battle");
		} catch (e) {
			console.error("[pts] rewardOptions error", e);
			return [
				{ key: "recipe", ok: false, data: [], cap: cap },
				{ key: "skill", ok: false, data: [], poolKey: "common" },
				{ key: "card", ok: true, data: null },
				{ key: "skip", ok: true, data: null },
			];
		}
	};
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
		if (cur[0].ok) { body.appendChild(screenButton("🔄 改牌方案", recipeV, false, true)); }
		else { body.appendChild(screenButton("🔄 改牌(无方案→加牌)", doCard, false, true)); }
		if (cur[1].ok) { body.appendChild(screenButton("✨ 技能", skillV, false, true)); }
		else { body.appendChild(screenButton("✨ 技能(池已拿空)", () => {}, true, true)); }
		body.appendChild(screenButton("🃏 加牌", doCard, false, true));
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
			}, false, true));
		}
		footer.innerHTML = "";
		footer.appendChild(screenButton("⟵ 返回", main));
	}
	main();
}
