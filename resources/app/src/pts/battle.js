/* 对局侧:敌人选取/布场/发牌/结果回收(从 mode/pts.js 拆入)+ 真卡组注入。
 * content 被引擎 StepCompiler 字符串重编译,入口必须挂 game.ptsXxx(pts.js 头注释既有约定)。
 * 本文件被 pts.js 顶部 import,其顶层副作用(mount game.pts*)先于 pts.js 顶层执行。 */
import { lib, game, ui, get, _status } from "noname";
import { BAL } from "./balance.js";
import { deckFromTuples } from "./deck.js";

function rndInRange(r) {
	return r[0] + Math.floor(Math.random() * (r[1] - r[0] + 1));
}

/* 从引擎当前牌堆定义(lib.card.list)抓元组快照 [suit, number, name, nature?]。
 * 期望约 160 张;读不到时回退 lib.cardPile.standard + extra。 */
export function pileTuples() {
	let src = lib.card.list;
	if (!src || !src.length) {
		src = [].concat(lib.cardPile.standard || [], lib.cardPile.extra || []);
	}
	const out = src.map(function (c) {
		return [c[0], c[1], c[2], c[3] || null];
	});
	if (out.length < 150) {
		console.error("[pts] pileTuples 期望约 160 张,实际 " + out.length);
	}
	return out;
}

/* 英雄自带技能(供奖励过滤;引擎 init 会代发一次,不重复挂)。 */
export function heroSkillsOf(id) {
	const info = lib.character[id];
	return info && Array.isArray(info[3]) ? info[3].slice() : [];
}

/* 旧档迁移:M4 前存档补齐 deck/skills/heroSkills/rewardPending/shopInv。 */
export function migrateState(state) {
	if (!state) {
		return state;
	}
	if (!Array.isArray(state.deck) || !state.deck.length) {
		state.deck = deckFromTuples(pileTuples());
	}
	if (!Array.isArray(state.skills)) {
		state.skills = [];
	}
	if (!Array.isArray(state.heroSkills)) {
		state.heroSkills = state.hero ? heroSkillsOf(state.hero) : [];
	}
	if (!state.rewardPending) {
		state.rewardPending = null;
	}
	if (!state.shopInv) {
		state.shopInv = null;
	}
	return state;
}

function clearPtsUI() {
	const el = document.querySelector(".pts-root");
	if (el) {
		el.remove();
	}
}

/* 战斗界面整理:行动说明文字(arenalog)藏到右侧半透明,顶部按钮组拉开间距 */
function zoomBy(delta) {
	let zoom = parseInt(lib.config.ui_zoom, 10);
	if (isNaN(zoom)) {
		zoom = 100;
	}
	zoom = Math.max(50, Math.min(300, zoom + delta));
	game.saveConfig("ui_zoom", zoom + "%");
	game.documentZoom = (game.deviceZoom || 1) * zoom / 100;
	ui.updatez();
}

function ptsTidyBattleUI() {
	const al = document.getElementById("arenalog");
	if (al) {
		al.style.left = "auto";
		al.style.right = "10px";
		al.style.top = "64px";
		al.style.width = "310px";
		al.style.opacity = "0.5";
		al.style.pointerEvents = "none";
		al.style.textAlign = "left";
	}
	const s1 = document.getElementById("system1");
	if (s1) {
		s1.style.top = "46px";
		Array.prototype.forEach.call(s1.children, function (b) {
			b.style.marginRight = "14px";
			b.style.marginBottom = "8px";
		});
	}
	const s2 = document.getElementById("system2");
	if (s2) {
		s2.style.top = "46px";
		Array.prototype.forEach.call(s2.children, function (b) {
			b.style.marginLeft = "14px";
			b.style.marginBottom = "8px";
		});
	}
	if (!game.ptsZoomButtons) {
		game.ptsZoomButtons = true;
		ui.create.system("放大", function () {
			zoomBy(10);
		});
		ui.create.system("缩小", function () {
			zoomBy(-10);
		});
		game.ptsRestartButtons = [
			ui.create.system("重开本场", function () {
				const dialog = ui.create.dialog("重开本场", "确定重新开始本场战斗吗？(恢复到进场前状态)");
				dialog.add([
					["确定", function () {
						dialog.close();
						game.ptsFlowSave();
						game.reload();
					}],
					["取消", function () {
						dialog.close();
					}],
				], "textbutton");
			}),
			ui.create.system("重开整局", function () {
				const dialog = ui.create.dialog("重开整局", "确定放弃本局并重新选将吗？");
				dialog.add([
					["确定", function () {
						dialog.close();
						game.ptsClearRun();
						game.reload();
					}],
					["取消", function () {
						dialog.close();
					}],
				], "textbutton");
			}),
		];
	}
}

game.ptsRemoveRestartButtons = function () {
	if (game.ptsRestartButtons) {
		for (let i = 0; i < game.ptsRestartButtons.length; i++) {
			if (game.ptsRestartButtons[i] && game.ptsRestartButtons[i].remove) {
				game.ptsRestartButtons[i].remove();
			}
		}
		game.ptsRestartButtons = null;
	}
};
game.ptsZoomBy = zoomBy;
game.ptsTidyBattleUI = ptsTidyBattleUI;

/* 真卡组洗入引擎牌堆:牌串 → [suit,number,name,nature] 元组 → 洗牌 → ui.create.card().init()。
 * 奖励/商店直接改 state.deck,下一场 installDeck 全量覆盖,故无回滚。 */
game.ptsInstallDeck = function (cardStrs) {
	const tups = cardStrs.map(function (cs) {
		const p = cs.split("|");
		return [p[1], Number(p[2]), p[0], p[3] || undefined];
	});
	for (let i = tups.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const tmp = tups[i];
		tups[i] = tups[j];
		tups[j] = tmp;
	}
	ui.cardPile.innerHTML = "";
	for (let i = 0; i < tups.length; i++) {
		ui.create.card(ui.cardPile).init(tups[i]);
	}
	console.log("[pts] installDeck " + tups.length + " 张");
};

/* ---- 敌将抽取 ---- */
function buildEnemyPool(exclude) {
	const pool = [];
	for (const id in lib.character) {
		if (id === exclude) {
			continue;
		}
		const info = lib.character[id];
		if (!info) {
			continue;
		}
		if (info[0] !== "male" && info[0] !== "female") {
			continue;
		}
		pool.push(id);
	}
	return pool;
}
game.ptsPickEnemies = function (type, layer, heroId) {
	const pool = buildEnemyPool(heroId);
	const act = layer >= 8 ? "act2" : "act1";
	let n;
	if (type === "battle") {
		n = act === "act1" ? (Math.random() < BAL.enemy.act1["1v1"] ? 1 : 2) : Math.random() < BAL.enemy.act2["1v2"] ? 2 : 3;
	} else if (type === "elite") {
		n = BAL.enemy.enemyCount.elite;
	} else {
		n = BAL.enemy.enemyCount.boss;
	}
	n = Math.min(n, pool.length);
	const list = [];
	while (list.length < n) {
		const e = pool[Math.floor(Math.random() * pool.length)];
		if (!list.includes(e)) {
			list.push(e);
		}
	}
	console.log("[pts] pick enemies", type, "layer" + (layer + 1), n, list.join(","));
	return list;
};

/* ---- 对局搭建 ---- */
game.ptsPrepareArena = function (pk) {
	clearPtsUI();
	game.prepareArena(1 + pk.enemies.length);
	game.delay(0.8);
	setTimeout(function () {
		ptsTidyBattleUI();
	}, 800);
};

game.ptsAssignPlayers = function () {
	const state = _status.ptsState;
	const pk = state.pending;
	game.zhu = game.me;
	game.me.getId();
	game.me.init(state.hero);
	game.me.identity = "zhu";
	game.me.setIdentity("zhu");
	game.me.maxHp = state.hpMax;
	game.me.hp = state.hp;
	game.me.update();
	game.ptsInstallDeck(state.deck);
	if (!state.heroSkills || !state.heroSkills.length) {
		state.heroSkills = heroSkillsOf(state.hero);
	}
	state.skills.forEach(function (id) {
		game.me.addSkill(id);
	});
	game.me.directgain(get.cards(4));
	for (let i = 1; i < game.players.length; i++) {
		const p = game.players[i];
		p.getId();
		p.init(pk.enemies[i - 1]);
		p.identity = "fan";
		p.setIdentity("fan");
		if (pk.type !== "battle") {
			p.maxHp++;
			p.hp = p.maxHp;
			p.update();
		}
		p.directgain(get.cards(4));
		if (p.ai) {
			p.ai.shown = 1;
		}
	}
	console.log("[pts] arena assigned, enemies=" + (game.players.length - 1));
};

/* ---- 战斗胜负(dieAfter 钩子调用) ---- */
game.ptsCheckResult = function () {
	const state = _status.ptsState;
	if (!state || !state.pending) {
		return;
	}
	if (!game.me.isAlive()) {
		state.hp = 0;
		state.defeated = true;
		state.lastMsg = "☠ 战败于第" + (state.cur.l + 1) + "层 —— 爬塔失败!";
		state.pending = null;
		state.pendingEnemies = null;
		game.ptsSaveRun();
		game.ptsRemoveRestartButtons();
		game.over(false);
		return;
	}
	const foes = game.players.filter(function (p) {
		return p !== game.me && p.isAlive();
	});
	if (foes.length) {
		return;
	}
	const pk = state.pending;
	let g;
	if (pk.type === "battle") {
		g = rndInRange(BAL.gold.battle);
		state.rewardPending = { type: "battle" };
		state.lastMsg = "⚔ 胜利!金币 +" + g + ",剩余体力 " + game.me.hp + "/" + state.hpMax;
	} else if (pk.type === "elite") {
		g = rndInRange(BAL.gold.elite);
		state.rewardPending = { type: "elite" };
		state.lastMsg = "💀 精英胜利!金币 +" + g + ",剩余体力 " + game.me.hp + "/" + state.hpMax;
	} else {
		g = rndInRange(BAL.gold.elite);
		state.finished = true;
		state.rewardPending = null;
		state.lastMsg = "🏆 击败第15层BOSS —— 通关!总金币 " + (state.gold + g);
	}
	state.gold += g;
	state.hp = Math.max(1, game.me.hp);
	state.pending = null;
	state.pendingEnemies = null;
	game.ptsSetDirect();
	game.ptsFlowSave();
	game.ptsSaveRun();
	game.ptsRemoveRestartButtons();
	game.over(true);
};

export { clearPtsUI };
