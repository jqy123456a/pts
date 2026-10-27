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
	console.log("[pts] battle ui tidied");
}
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

function buildHeroCard(id) {
	const hp = hpOf(id);
	const name = lib.translate[id] || id;
	const skill = (lib.character[id][3] && lib.character[id][3][0]) || "";
	const skillName = skill ? lib.translate[skill] : "";
	const card = document.createElement("div");
	card.className = "pts-hero";
	card.dataset.hero = id;
	card.style.cssText =
		"width:158px;height:186px;background:#2a2f36;border:2px solid #454b54;border-radius:12px;" +
		"display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;overflow:hidden;";
	card.innerHTML =
		'<div style="font-size:64px;line-height:1;color:#c9b98a;font-weight:bold;">' + name.charAt(0) + "</div>" +
		'<img src="' + lib.assetURL + "image/character/" + id + '.jpg" style="width:86px;height:86px;border-radius:50%;object-fit:cover;border:2px solid #555;" onerror="this.style.visibility=\'hidden\'">' +
		"<div style='font-size:18px;font-weight:bold;'>" + name + "</div>" +
		(skillName ? "<div style='font-size:12px;color:#9ecfff;'>" + skillName + "</div>" : "") +
		"<div style='font-size:13px;color:#e8c268;'>❤ " + hp + "</div>";
	card.onclick = () => {
		startRun(id, hp, name);
	};
	return card;
}

function showHeroSelect(resume) {
	if (!document.getElementById("pts-hero-style")) {
		const st = document.createElement("style");
		st.id = "pts-hero-style";
		st.innerHTML =
			".pts-hero{transition:all .18s ease;}" +
			".pts-hero:hover{border-color:#e8c268 !important;background:#333a44 !important;transform:translateY(-6px);box-shadow:0 8px 22px rgba(0,0,0,.5);cursor:pointer;}";
		document.head.appendChild(st);
	}
	clearPtsUI();
	const root = document.createElement("div");
	root.className = "pts-root";
	root.style.cssText =
		"position:absolute;left:0;top:0;right:0;bottom:0;background:linear-gradient(160deg,#20242a,#14161a 60%,#1a1420);z-index:9990;" +
		"font-family:'Microsoft YaHei',xinwei,sans-serif;color:#e8e4d8;display:flex;flex-direction:column;align-items:center;";
	root.innerHTML =
		'<div style="font-size:34px;padding:26px 0 4px;color:#e8c268;text-shadow:0 0 12px rgba(232,194,104,.35);letter-spacing:6px;">选 择 爬 塔 武 将</div>' +
		'<div style="font-size:14px;color:#9a958a;padding-bottom:14px;">初始体力 = 武将体力上限 · 战斗损血延续 · 死亡即爬塔失败</div>';

	const searchBox = document.createElement("div");
	searchBox.style.cssText = "width:620px;display:flex;align-items:center;gap:8px;padding-bottom:8px;";
	const input = document.createElement("input");
	input.placeholder = "检索武将名 / 拼音（如 曹操、caocao、cc）";
	input.style.cssText =
		"flex:1;height:34px;border:2px solid #294510;border-radius:6px;background:#1c2026;color:#e8e4d8;" +
		"text-align:center;font-size:16px;font-weight:bold;outline:none;";
	searchBox.appendChild(input);
	root.appendChild(searchBox);

	const hint = document.createElement("div");
	hint.style.cssText = "font-size:12px;color:#6f6a60;padding-bottom:10px;";
	hint.innerHTML = "支持武将名与拼音首字母检索（cc → 曹操）；清空则显示推荐武将";
	root.appendChild(hint);

	const wrap = document.createElement("div");
	wrap.style.cssText = "position:absolute;left:0;right:0;top:168px;bottom:0;overflow:auto;";
	root.appendChild(wrap);
	const grid = document.createElement("div");
	grid.style.cssText = "display:flex;flex-wrap:wrap;width:920px;margin:0 auto;justify-content:center;gap:18px;";
	wrap.appendChild(grid);

	function renderResumeCard() {
		if (!resume || !resume.hero) {
			return;
		}
		const layerTxt = resume.cur ? "第" + (resume.cur.l + 1) + "层" : "塔底";
		const info = resume.pending
			? "战斗进行中 · " + (lib.translate[resume.hero] || resume.hero) + " · 体力 " + resume.hp + "/" + resume.hpMax
			: layerTxt + " · " + (lib.translate[resume.hero] || resume.hero) + " · 体力 " + resume.hp + "/" + resume.hpMax;
		const rb = document.createElement("div");
		rb.className = "pts-hero";
		rb.style.cssText =
			"width:158px;height:186px;background:linear-gradient(160deg,#3a3421,#2a2517);border:2px solid #e8c268;border-radius:12px;" +
			"display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;overflow:hidden;";
		rb.innerHTML =
			'<div style="font-size:46px;line-height:1;color:#e8c268;">▶</div>' +
			'<div style="font-size:19px;font-weight:bold;color:#e8c268;">继续冒险</div>' +
			"<div style='font-size:12px;color:#cfc9b4;text-align:center;line-height:1.6;'>" + info + "</div>" +
			"<div style='font-size:11px;color:#777;font-style:italic;'>点击其余武将则重开新档</div>";
		rb.onclick = function () {
			console.log("[pts] resume requested");
			_status.ptsState = resume;
			game.ptsFlowSave();
			game.reload();
		};
		grid.appendChild(rb);
	}

	function renderGrid(query) {
		const q = String(query || "").trim();
		grid.innerHTML = "";
		if (!q) {
			renderResumeCard();
			for (const id of BAL.heroPool) {
				if (!lib.character[id]) {
					continue;
				}
				grid.appendChild(buildHeroCard(id));
			}
			return;
		}
		let count = 0;
		for (const id of listHeroes()) {
			if (count >= 80) {
				break;
			}
			if (!matchHero(q, id)) {
				continue;
			}
			grid.appendChild(buildHeroCard(id));
			count++;
		}
		if (!count) {
			const none = document.createElement("div");
			none.style.cssText = "width:100%;text-align:center;color:#8a8577;padding-top:40px;font-size:15px;";
			none.innerHTML = "未找到匹配武将";
			grid.appendChild(none);
		}
	}

	input.addEventListener("input", function () {
		renderGrid(input.value);
	});
	input.addEventListener("keydown", function (e) {
		e.stopPropagation();
	});
	input.addEventListener("mousedown", function (e) {
		e.stopPropagation();
	});

	renderGrid("");
	document.body.appendChild(root);
	console.log("[pts] hero-select rendered, resume=" + !!(resume && resume.hero));
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
	}, 600);
	setTimeout(function () {
		ptsTidyBattleUI();
	}, 1800);
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
