/* 地图屏:DOM 节点 + SVG 连线(《规范文档》§7);每次全量重绘 */
import { updateHud } from "../hud.js";
import { enterNode } from "../node.js";

const COL_W = 104;
const ROW_H = 88;
const NOD_W = 84;
const NOD_H = 68;
const PAD = 16;
const ICONS = {
	battle: "⚔",
	elite: "💀",
	boss: "⛧",
	chest: "🎁",
	rest: "🔥",
	event: "❓",
};
const NODE_COLOR = {
	battle: "#8a93a2",
	elite: "#b06bff",
	boss: "#ff5c5c",
	chest: "#e8c268",
	rest: "#5fd06a",
	event: "#5fb6ff",
};

export function toast(text) {
	let t = document.querySelector(".pts-toast");
	if (!t) {
		t = document.createElement("div");
		t.className = "pts-toast";
		t.style.cssText =
			"position:absolute;left:0;right:0;bottom:64px;text-align:center;font-size:20px;color:#ffe9a8;text-shadow:0 0 6px #000;z-index:99999;pointer-events:none;";
		document.body.appendChild(t);
	}
	t.innerHTML = text;
	clearTimeout(t._ptsTimer);
	t._ptsTimer = setTimeout(() => {
		t.innerHTML = "";
	}, 2200);
}

function edgeOf(edges, l, c1, c2) {
	return edges.includes(l + "," + c1 + "," + c2);
}

export function renderMap(state, edges) {
	if (!document.getElementById("pts-style")) {
		const st = document.createElement("style");
		st.id = "pts-style";
		st.innerHTML =
			"@keyframes pts-pulse{0%,100%{filter:brightness(1);}50%{filter:brightness(1.35);}}";
		document.head.appendChild(st);
	}
	const old = document.querySelector(".pts-root");
	if (old) {
		old.remove();
	}
	const L = state.layers.length;
	const W = 4 * COL_W + 2 * PAD;
	const H = L * ROW_H + 2 * PAD;
	const root = document.createElement("div");
	root.className = "pts-root";
	root.style.cssText =
		"position:absolute;left:0;top:0;right:0;bottom:0;background:linear-gradient(#20242a,#14161a);z-index:9990;font-family:'Microsoft YaHei',xinwei,sans-serif;color:#e8e4d8;";
	root.innerHTML =
		'<div class="pts-hud" style="height:64px;display:flex;align-items:center;justify-content:space-between;padding:0 40px;background:#101216;border-bottom:1px solid #444;"></div>' +
		'<div class="pts-hint" style="height:26px;line-height:26px;text-align:center;font-size:13px;color:#9a958a;">沿亮色连线,只能走向下一层;⚔战斗 💀精英 ⛧BOSS 🎁宝箱 🔥篝火 ❓事件</div>' +
		'<div class="pts-mapwrap" style="position:absolute;left:0;top:90px;right:0;bottom:0;overflow:auto;">' +
		'<div class="pts-maprect" style="position:relative;width:' + W + "px;height:" + H + 'px;margin:0 auto;"></div>' +
		"</div>";
	document.body.appendChild(root);
	updateHud(state);

	const inner = root.querySelector(".pts-maprect");
	const pos = (l, c1) => {
		const node = state.layers[l][c1];
		return {
			x: PAD + node.col * COL_W + NOD_W / 2,
			y: PAD + (L - 1 - l) * ROW_H + NOD_H / 2,
		};
	};
	// 连线三态:已走(金) / 可走(亮蓝) / 其余(灰)
	const pathEdges = new Set();
	for (let i = 1; i < state.path.length; i++) {
		pathEdges.add(state.path[i - 1].l + "," + state.path[i - 1].c + "," + state.path[i].c);
	}
	const reachableEdges = new Set();
	if (state.cur) {
		const cur = state.cur;
		const nxt = state.layers[cur.l + 1];
		if (nxt) {
			for (const node of nxt) {
				if (edgeOf(edges, cur.l, cur.c, node.c)) {
					reachableEdges.add(cur.l + "," + cur.c + "," + node.c);
				}
			}
		}
	}
	const segs = [];
	for (const e of edges) {
		const parts = e.split(",");
		const l = +parts[0];
		const c1 = +parts[1];
		const c2 = +parts[2];
		const p1 = pos(l, c1);
		const p2 = pos(l + 1, c2);
		const key = l + "," + c1 + "," + c2;
		let color = "#3a3f46";
		let width = 3;
		if (pathEdges.has(key)) {
			color = "#e8c268";
			width = 5;
		} else if (reachableEdges.has(key)) {
			color = "#7ec4ff";
			width = 4;
		}
		segs.push('<line x1="' + p1.x + '" y1="' + p1.y + '" x2="' + p2.x + '" y2="' + p2.y + '" stroke="' + color + '" stroke-width="' + width + '" stroke-linecap="round"/>');
	}
	inner.insertAdjacentHTML("afterbegin", '<svg width="' + W + '" height="' + H + '" style="position:absolute;left:0;top:0;pointer-events:none;">' + segs.join("") + "</svg>");

	// 层号标签
	for (let l = 0; l < L; l++) {
		const lbl = document.createElement("div");
		lbl.style.cssText =
			"position:absolute;left:-46px;top:" + (PAD + (L - 1 - l) * ROW_H + NOD_H / 2 - 8) + "px;font-size:12px;color:#77726a;";
		lbl.innerHTML = "层" + (l + 1);
		inner.appendChild(lbl);
	}

	// 节点
	for (let l = 0; l < L; l++) {
		for (const node of state.layers[l]) {
			const el = document.createElement("div");
			el.className = "pts-node";
			const p = pos(l, node.c);
			const nc = NODE_COLOR[node.type] || "#8a93a2";
			const isCur = state.cur && state.cur.l === l && state.cur.c === node.c;
			el.style.cssText =
				"position:absolute;width:" + NOD_W + "px;height:" + NOD_H + "px;left:" + (p.x - NOD_W / 2) +
				"px;top:" + (p.y - NOD_H / 2) +
				"px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:34px;" +
				"background:#22262d;border:3px solid " + nc + ";color:" + nc +
				";text-shadow:0 0 8px " + nc + ";cursor:pointer;user-select:none;";
			el.innerHTML = ICONS[node.type] || "?";
			if (isCur) {
				el.style.background = "#3d3520";
				el.style.borderRadius = "50%";
				el.innerHTML +=
					'<div style="position:absolute;left:50%;bottom:-22px;transform:translateX(-50%);font-size:12px;color:#e8c268;white-space:nowrap;font-weight:bold;text-shadow:0 0 4px #000;">👤 你在这里</div>';
			}
			let clickable = false;
			if (!state.cur) {
				clickable = l === 0;
			} else {
				clickable = state.cur.l + 1 === l && edgeOf(edges, state.cur.l, state.cur.c, node.c);
			}
			if (!clickable) {
				el.style.opacity = "0.35";
				el.style.pointerEvents = "none";
			} else {
				el.style.boxShadow = "0 0 14px " + nc + "66, 0 0 26px " + nc + "33";
				el.style.animation = "pts-pulse 1.6s ease-in-out infinite";
			}
			el.onclick = () => {
				console.log("[pts] node click", l, node.c, node.type);
				enterNode(state, l, node.c, node, edges);
			};
			inner.appendChild(el);
		}
	}
	// 滚动到当前层
	const wrap = root.querySelector(".pts-mapwrap");
	const curL = state.cur ? state.cur.l : 0;
	wrap.scrollTop = Math.max(0, PAD + (L - 1 - curL) * ROW_H - 200);
}
