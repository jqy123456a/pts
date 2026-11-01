/* 战后三选一浮层(FR-12/13)。规则判定全部走 reward.js/deck.js 纯函数,
 * 本文件只做 DOM 渲染与状态落盘。由 pts.js 挂载为 game.ptsShowReward。 */
import { lib, game, _status } from "noname";
import { BAL } from "./balance.js";
import { rewardOptions, applyAddCard, grantSkill } from "./reward.js";
import { transform4to1 } from "./deck.js";
import { renderMap, toast } from "./map/ui.js";

function tName(id) { return lib.translate[id] || id; }

export function showRewardPanel() {
	const state = _status.ptsState;
	if (!state || !state.rewardPending) { return; }
	document.querySelectorAll(".pts-reward").forEach(e => e.remove());

	const cap = BAL.groupsPerReward;
	let groups = 0;
	const opts = () => rewardOptions(state, state.rewardPending ? state.rewardPending.type : "battle");

	const ov = document.createElement("div");
	ov.className = "pts-reward";
	ov.innerHTML = '<style>.pts-reward{position:fixed;left:0;top:0;right:0;bottom:0;background:rgba(0,0,0,.6);z-index:9998}'
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
		ov.remove();
		renderMap(state, state.edges);
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
