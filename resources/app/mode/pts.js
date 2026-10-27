/* 爬塔杀 —— 唯一模式入口。M2 战斗闭环。其他玩法模式已移除(backup 于 pts/backup)。
 * 引擎约束:content 函数会被 StepCompiler 按字符串重编译,闭包不可见,
 * 助手一律经 game.ptsXxx 挂载后调用。 */
import { lib, game, ui, get, ai, _status } from "noname";
import { BAL } from "../src/pts/balance.js";
import { genMap } from "../src/pts/map/gen.js";
import { renderMap, toast } from "../src/pts/map/ui.js";

export const type = "mode";

const SAVE_KEY = "pts_run";
const DIRECT_KEY = (lib.configprefix || "config_") + "directstart";
const FLOW_KEY = "pts_flow";
const FLOW_BATTLE = "battle";

/* 崩溃栈捕获(临时诊断,定位后可移除) */
window.addEventListener("unhandledrejection", function (ev) {
	console.log("[pts] unhandled:", (ev.reason && ev.reason.stack) || ev.reason);
});
window.addEventListener("error", function (ev) {
	console.log("[pts] window-error:", (ev.error && ev.error.stack) || ev.message);
});
const origConsoleError = console.error.bind(console);
console.error = function (...args) {
	for (const a of args) {
		if (a instanceof Error) {
			console.log("[pts] STACK", a && a.stack);
		}
	}
	origConsoleError(...args);
};

/* 引擎 1.11.6 发行包缺陷:get.attitude 依赖 get.rawAttitude 但全包无定义。
 * 按官方语义基线补齐:同阵营 +6,敌对 -6;1vN 单挑恒为敌(Telegraph 值仅服务 AI 决策)。 */
function patchAttitude() {
	if (typeof get.rawAttitude === "function") {
		return;
	}
	get.rawAttitude = function (from, to) {
		if (!from || !to) {
			return 0;
		}
		if (from === to) {
			return 0;
		}
		if (from.side && to.side && from.side === to.side) {
			return 6;
		}
		return -6;
	};
}

function buildDeckCount() {
	return 160;
}

function hpOf(characterId) {
	const info = lib.character[characterId];
	if (!info) {
		return 4;
	}
	let hp = info[4];
	if (Array.isArray(hp)) {
		hp = hp[0];
	}
	const num = typeof hp === "number" ? hp : parseInt(hp, 10);
	return isNaN(num) ? 4 : num;
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
	}
}
game.ptsZoomBy = zoomBy;
game.ptsTidyBattleUI = ptsTidyBattleUI;

/* ---- 存档 ---- */
function saveRun() {
	localStorage.setItem(SAVE_KEY, JSON.stringify(_status.ptsState));
}
function loadRun() {
	try {
		return JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
	} catch (e) {
		return null;
	}
}
function clearRun() {
	localStorage.removeItem(SAVE_KEY);
}
game.ptsLoadRun = loadRun;
game.ptsSaveRun = saveRun;
game.ptsClearRun = clearRun;
game.ptsToast = toast;
game.ptsFlowKey = FLOW_KEY;
game.ptsFlowBattle = FLOW_BATTLE;
game.ptsFlowSave = function () {
	localStorage.setItem(FLOW_KEY, FLOW_BATTLE);
};

/* ---- 选将屏 ---- */
function listHeroes() {
	const list = [];
	for (const id in lib.character) {
		const info = lib.character[id];
		if (!info) {
			continue;
		}
		if (info.isMinskin || info.isBoss || info.isHiddenBoss || info.isHiddenInStoneMode || info.isUnseen) {
			continue;
		}
		if (lib.config.banned && lib.config.banned.includes(id)) {
			continue;
		}
		if (typeof info[4] !== "number" && !Array.isArray(info[4])) {
			continue;
		}
		list.push(id);
	}
	list.sort(function (a, b) {
		const na = lib.translate[a] || a;
		const nb = lib.translate[b] || b;
		return na.localeCompare(nb, "zh");
	});
	return list;
}

function matchHero(query, id) {
	const name = lib.translate[id] || id;
	const q = String(query || "").trim().toLowerCase();
	if (!q) {
		return true;
	}
	if (name.toLowerCase().indexOf(q) !== -1) {
		return true;
	}
	let py;
	try {
		py = get.pinyin(name, false);
	} catch (e) {
		py = null;
	}
	if (py && py.length) {
		if (py.join("").indexOf(q) !== -1) {
			return true;
		}
		let initials = "";
		for (const s of py) {
			initials += (s && s[0]) || "";
		}
		if (initials.indexOf(q) !== -1) {
			return true;
		}
	}
	return false;
}

const GROUP_COLOR = {
	wei: "#5b8def",
	shu: "#e2604a",
	wu: "#57c063",
	qun: "#a58b5a",
	jin: "#9b6dd4",
	shen: "#e8c268",
	key: "#d4a017",
	god: "#e8c268",
};

function buildHeroCard(id) {
	const hp = hpOf(id);
	const name = lib.translate[id] || id;
	const info = lib.character[id];
	const accent = GROUP_COLOR[(info && info[1]) || ""] || "#7a8794";
	const skill = (info && info[3] && info[3][0]) || "";
	const skillName = skill ? lib.translate[skill] : "";
	const card = document.createElement("div");
	card.className = "pts-hero";
	card.dataset.hero = id;
	card.style.cssText =
		"width:168px;height:200px;background:#262b33;border:2px solid " + accent + ";border-radius:12px;" +
		"overflow:hidden;display:flex;flex-direction:column;";
	const portrait = document.createElement("div");
	portrait.style.cssText = "width:100%;height:118px;flex-shrink:0;";
	portrait.setBackground(id, "character");
	const body = document.createElement("div");
	body.style.cssText =
		"flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:0 6px;";
	body.innerHTML =
		"<div style='font-size:16px;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;'>" + name + "</div>" +
		(skillName ? "<div style='font-size:11px;color:#9ecfff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;'>" + skillName + "</div>" : "") +
		"<div style='font-size:12px;color:#ff8a8a;'>❤ " + hp + "</div>";
	card.appendChild(portrait);
	card.appendChild(body);
	card.onclick = () => {
		startRun(id, hp, name);
	};
	return card;
}

function showHeroSelect(resume) {
	clearPtsUI();
	if (!document.getElementById("pts-hero-hp-style")) {
		const st = document.createElement("style");
		st.id = "pts-hero-hp-style";
		st.innerHTML =
			".button.character > .hp > div{width:12px;height:12px;margin-left:2px;background:url('theme/style/hp/image/round1.png');background-size:100% 100%;border:none;box-shadow:none;border-radius:0;filter:none;}" +
			".button.character > .hp > div.exclude{background:url('theme/style/hp/image/round4.png');background-size:100% 100%;}" +
			".button.character > .hp > .shield{background:url('theme/style/hp/image/shield.png');background-size:100% 100%;}";
		document.head.appendChild(st);
	}
	if (resume && resume.hero) {
		const layerTxt = resume.cur ? "第" + (resume.cur.l + 1) + "层" : "塔底";
		const info = resume.pending
			? "战斗进行中 · " + (lib.translate[resume.hero] || resume.hero) + " · 体力 " + resume.hp + "/" + resume.hpMax
			: layerTxt + " · " + (lib.translate[resume.hero] || resume.hero) + " · 体力 " + resume.hp + "/" + resume.hpMax;
		ui.create.system("▶ 继续冒险", function () {
			_status.ptsState = resume;
			game.ptsFlowSave();
			game.reload();
		}, true);
	}

	lib.config.buttoncharacter_style = "old";
	const filter = function (id) {
		const info = lib.character[id];
		if (!info) {
			return true;
		}
		return typeof info[4] !== "number" && !Array.isArray(info[4]);
	};
	const dialog = ui.create.characterDialog(filter);
	dialog.open();
	dialog.style.transform = "scale(1.3)";
	dialog.style.transformOrigin = "center center";

	for (const btn of dialog.buttons) {
		btn.removeEventListener("click", ui.click.button);
		btn.addEventListener("click", function () {
			const id = btn.link;
			dialog.close();
			startRun(id, hpOf(id), lib.translate[id] || id);
		});
	}

	const input = dialog.querySelector("input");
	if (input) {
		input.placeholder = "检索武将名 / 拼音（如 曹操、caocao、cc）";
		input.addEventListener("input", function () {
			const q = String(input.value || "").trim();
			for (const btn of dialog.buttons) {
				if (!q || matchHero(q, btn.link)) {
					btn.classList.remove("nodisplay");
				} else {
					btn.classList.add("nodisplay");
				}
			}
		});
		input.addEventListener("keydown", function (e) {
			e.stopPropagation();
		});
		input.addEventListener("mousedown", function (e) {
			e.stopPropagation();
		});
	}

	console.log("[pts] hero-select (native) rendered, resume=" + !!(resume && resume.hero));
}
game.ptsShowHeroSelect = showHeroSelect;

/* ---- 开局 ---- */
function startRun(heroId, hpMax, heroName) {
	console.log("[pts] run start, hero=" + heroName + " hp=" + hpMax);
	const seed = (Date.now() & 0xffffffff) >>> 0;
	const map = genMap(seed, BAL);
	_status.ptsState = {
		seed: map.seed,
		layers: map.layers,
		edges: map.edges,
		hero: heroId,
		heroName: heroName,
		hp: hpMax,
		hpMax: hpMax,
		gold: BAL.gold.start,
		deckCount: buildDeckCount(),
		path: [],
		cur: null,
		pending: null,
		pendingEnemies: null,
		lastMsg: null,
		defeated: false,
		finished: false,
	};
	localStorage.setItem(DIRECT_KEY, "true");
	saveRun();
	renderMap(_status.ptsState, _status.ptsState.edges);
	toast("「" + heroName + "」开始爬塔!");
}
game.ptsStartRun = startRun;
game.ptsSetDirect = function () {
	localStorage.setItem(DIRECT_KEY, "true");
};

game.ptsRenderResume = function () {
	const s = _status.ptsState;
	if (s.lastMsg) {
		toast(s.lastMsg);
		s.lastMsg = null;
		saveRun();
	}
	renderMap(s, s.edges);
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
function rndInRange(r) {
	return r[0] + Math.floor(Math.random() * (r[1] - r[0] + 1));
}
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
		saveRun();
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
		state.lastMsg = "⚔ 胜利!金币 +" + g + ",剩余体力 " + game.me.hp + "/" + state.hpMax;
	} else if (pk.type === "elite") {
		g = rndInRange(BAL.gold.elite);
		state.lastMsg = "💀 精英胜利!金币 +" + g + ",剩余体力 " + game.me.hp + "/" + state.hpMax;
	} else {
		g = rndInRange(BAL.gold.elite);
		state.finished = true;
		state.lastMsg = "🏆 击败第15层BOSS —— 通关!总金币 " + (state.gold + g);
	}
	state.gold += g;
	state.hp = Math.max(1, game.me.hp);
	state.pending = null;
	state.pendingEnemies = null;
	localStorage.setItem(DIRECT_KEY, "true");
	localStorage.setItem(FLOW_KEY, FLOW_BATTLE);
	saveRun();
	game.over(true);
};

/* ---- 模式主体 ---- */
export default () => {
	patchAttitude();
	return {
		name: "pts",
		start() {
			"step 0";
			var state = game.ptsLoadRun();
			_status.ptsState = state;
			var flow = null;
			try {
				flow = localStorage.getItem(game.ptsFlowKey);
				localStorage.removeItem(game.ptsFlowKey);
			} catch (e) {}
			if (state && (state.defeated || state.finished)) {
				game.ptsClearRun();
				game.ptsToast(state.lastMsg || (state.finished ? "🏆 通关!" : "☠ 爬塔失败!"));
				game.ptsShowHeroSelect();
				event.finish();
				return;
			}
			if (state && state.hero && flow !== game.ptsFlowBattle) {
				game.ptsShowHeroSelect(state);
				event.finish();
				return;
			}
			if (!state || !state.hero) {
				game.ptsShowHeroSelect();
				event.finish();
				return;
			}
			game.ptsSetDirect();
			var pk = state.pending;
			if (!pk) {
				game.ptsRenderResume();
				event.finish();
				return;
			}
			game.ptsPrepareArena(pk);
			"step 1";
			game.ptsAssignPlayers();
			"step 2";
			game.gameDraw(game.zhu);
			game.phaseLoop(game.zhu);
			game.zhu.showGiveup();
		},
		prepare() {},
		startBefore() {},
		element: {
			player: {
				dieAfter() {
					if (_status.ptsState && _status.ptsState.pending) {
						game.ptsCheckResult();
					}
				},
			},
		},
		config: {},
		help: {},
		translation: {
			pts: "爬塔杀",
			pts_config: "爬塔杀选项",
		},
	};
};
