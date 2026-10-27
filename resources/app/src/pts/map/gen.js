/* 爬塔杀地图生成 —— 游走路径法(《规范文档》§5.2);
 * 产出: {layers, edges};layers[l] = [{c,col,type}],edges = ["l,c1,c2"] 字符串数组。 */

function mulberry32(a) {
	return function () {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}


export function genMap(rawSeed, bal) {

	let seed = rawSeed >>> 0;
	for (let attempt = 0; attempt < 16; attempt++) {
		const result = _generate(seed, bal);
		if (result) {
			result.seed = seed;
			return result;
		}
		seed = (seed + 0x9e3779b9) >>> 0;
	}
	throw new Error("pts map gen: failed after retries, seed=" + seed);
}

function _generate(seed, bal) {
	const rnd = mulberry32(seed);
	const L = bal.map.layers;
	const minN = bal.map.minNodes;
	const maxN = bal.map.maxNodes;
	const slope = bal.map.maxSlope;

	// 1) 每层节点:居中列位(设计文档:蛇形居中、端点少;base 由 n 确定,任两层斜接必通)
	const layers = [];
	for (let l = 0; l < L; l++) {
		const n = minN + Math.floor(rnd() * (maxN - minN + 1));
		const base = Math.floor((4 - n) / 2);
		const cols = [];
		for (let i = 0; i < n; i++) {
			cols.push(base + i);
		}
		const nodes = cols.map((col) => ({ c: -1, col: col, type: null }));
		for (let i = 0; i < n; i++) {
			nodes[i].c = i;
		}
		layers.push(nodes);
	}

	// 2) 节点类型:固定层 + 其余加权(精英≥bal.eliteMinLayer,同层至多1)
	for (let l = 0; l < L; l++) {
		const idx = l + 1;
		for (const node of layers[l]) {
			node.type = bal.fixed[idx] || null;
		}
	}
	let eliteUsed = null;
	for (let l = 0; l < L; l++) {
		const idx = l + 1;
		if (bal.fixed[idx]) {
			continue;
		}
		eliteUsed = false;
		for (const node of layers[l]) {
			if (node.type) {
				continue;
			}
			const r = rnd();
			let acc = 0;
			let chosen = null;
			for (const k in bal.nodeProb) {
				acc += bal.nodeProb[k];
				if (r < acc) {
					chosen = k;
					break;
				}
			}
			if (!chosen) {
				chosen = "battle";
			}
			if (chosen === "elite" && (idx < bal.eliteMinLayer || eliteUsed)) {
				chosen = "battle";
			}
			if (chosen === "elite") {
				eliteUsed = true;
			}
			node.type = chosen;
		}
	}

	// 3) 边:5 条游走路径
	const walked = new Set();
	const edgeKey = (l, c1, c2) => l + "," + c1 + "," + c2;
	for (let w = 0; w < bal.map.walkCount; w++) {
		let cur = layers[0][Math.floor(rnd() * layers[0].length)];
		for (let l = 1; l < L; l++) {
			const cand = layers[l].filter((n) => Math.abs(n.col - cur.col) <= slope);
			const next = cand[Math.floor(rnd() * cand.length)];
			if (!next) {
				return null;
			}
			walked.add(edgeKey(l - 1, cur.c, next.c));
			cur = next;
		}
	}

	// 4) 补边:每节点至少一出(BOSS 层除外)、至少一入(首层除外)
	for (let l = 0; l < L - 1; l++) {
		for (const node of layers[l]) {
			let has = false;
			for (const n2 of layers[l + 1]) {
				if (walked.has(edgeKey(l, node.c, n2.c))) {
					has = true;
					break;
				}
			}
			if (!has) {
				const cand = layers[l + 1].filter((n2) => Math.abs(n2.col - node.col) <= slope);
				if (!cand.length) {
					return null;
				}
				walked.add(edgeKey(l, node.c, cand[Math.floor(rnd() * cand.length)].c));
			}
		}
	}
	for (let l = 1; l < L; l++) {
		for (const node of layers[l]) {
			let has = false;
			for (const n1 of layers[l - 1]) {
				if (walked.has(edgeKey(l - 1, n1.c, node.c))) {
					has = true;
					break;
				}
			}
			if (!has) {
				const cand = layers[l - 1].filter((n1) => Math.abs(n1.col - node.col) <= slope);
				if (!cand.length) {
					return null;
				}
				walked.add(edgeKey(l - 1, cand[Math.floor(rnd() * cand.length)].c, node.c));
			}
		}
	}

	// 5) 连通性校验:每个首层节点须可到 BOSS
	const reach = new Set();
	const stack = [];
	for (const node of layers[L - 1]) {
		reach.add((L - 1) + "," + node.c);
	}
	for (let l = L - 2; l >= 0; l--) {
		for (const node of layers[l]) {
			for (const n2 of layers[l + 1]) {
				if (walked.has(edgeKey(l, node.c, n2.c)) && reach.has((l + 1) + "," + n2.c)) {
					reach.add(l + "," + node.c);
					break;
				}
			}
		}
	}
	for (const node of layers[0]) {
		if (!reach.has("0," + node.c)) {
			return null;
		}
	}

	return { layers: layers, edges: Array.from(walked) };
}

function _centeredCols(n, width, rnd) {
	const gap = width - n;
	const base = Math.floor(rnd() * (gap + 1));
	const cols = [];
	for (let i = 0; i < n; i++) {
		cols.push(base + i);
	}
	return cols;
}