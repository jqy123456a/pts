/* 节点调度:行走校验 + 按类型分发。
 * M2:battle/elite/boss 存档后 reload 开真实对局;rest/chest/event 原地数值结算。 */
import { game, lib, _status } from "noname";
import { updateHud } from "./hud.js";
import { toast, renderMap } from "./map/ui.js";
import { BAL } from "./balance.js";
import { recipeCandidates, skillCandidates } from "./reward.js";
import { transform4to1 } from "./deck.js";
import { genShopInv } from "./shop.js";

const rndInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

function persist() {
	localStorage.setItem("pts_run", JSON.stringify(_status.ptsState));
	localStorage.setItem((lib.configprefix || "config_") + "directstart", "true");
	localStorage.setItem("pts_flow", "battle");
}

export function enterNode(state, l, c, node, edges) {
	console.log("[pts] enterNode", l, c, node.type);
	if (!canWalk(state, l, c, edges)) {
		toast("⚠ 无法到达该节点");
		return false;
	}
	state.cur = { l: l, c: c };
	state.path.push({ l: l, c: c });
	const type = node.type;
	if (type === "rest") {
		state.hp = Math.min(state.hpMax, state.hp + BAL.rest.heal);
		toast("🔥 篝火:回复 " + BAL.rest.heal + " 点体力");
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
		toast("❓ 第" + (l + 1) + "层 事件(M3 实装)");
	} else {
		state.pending = { l: l, c: c, type: type, enemies: game.ptsPickEnemies(type, l, state.hero) };
		persist();
		renderMap(state, edges);
		const mapRoot = document.querySelector(".pts-root");
		if (mapRoot) {
			mapRoot.style.pointerEvents = "none";
		}
		toast(type === "boss" ? "⛧ 进入 BOSS 战!" : type === "elite" ? "💀 进入精英战!" : "⚔ 进入战斗!");
		setTimeout(function () {
			game.reload();
		}, 700);
		return true;
	}
	updateHud(state);
	renderMap(state, edges);
	localStorage.setItem("pts_run", JSON.stringify(state));
	return true;
}

function canWalk(state, l, c, edges) {
	if (l > BAL.map.layers - 1) {
		return false;
	}
	if (!state.cur) {
		return l === 0;
	}
	const prev = state.cur;
	if (prev.l + 1 !== l) {
		return false;
	}
	return edges.includes(prev.l + "," + prev.c + "," + c);
}

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
			} else {
				msg += comp();
			}
		} else {
			msg += comp();
		}
	} else {
		const pool = skillCandidates(state.skills, state.heroSkills, "common");
		if (pool.length) {
			const id = pool[Math.floor(Math.random() * pool.length)];
			state.skills.push(id);
			msg += ";获得技能「" + (lib.translate[id] || id) + "」";
		} else {
			msg += comp();
		}
	}
	toast(msg);
}
