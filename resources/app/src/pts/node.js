/* 节点调度:行走校验 + 按类型分发。
 * M2:battle/elite/boss 存档后 reload 开真实对局;rest/chest/event 原地数值结算。 */
import { game, lib, _status } from "noname";
import { updateHud } from "./hud.js";
import { toast, renderMap } from "./map/ui.js";
import { BAL } from "./balance.js";

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
		const g = rndInt(BAL.gold.chest[0], BAL.gold.chest[1]);
		state.gold += g;
		toast("🎁 宝箱:金币 +" + g);
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
