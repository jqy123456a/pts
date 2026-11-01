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

	// 3) 边:自顶向下;先给下层每节点分配 1 入边(合并,按出度最小均衡选源),
	//    再保底每节点 1 出边,再按 branchProb 分叉;全程出度 ≤2
	const walked = new Set();
	const edgeKey = (l, c1, c2) => l + "," + c1 + "," + c2;
	const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
	for (let l = 0; l < L - 1; l++) {
		const nextLayer = layers[l + 1];
		const outdeg = {};
		// 入边分配:每下层节点选「出度最小」的上层候选(均衡,避免单节点出度过高)
		for (const n2 of nextLayer) {
			const cand = layers[l].filter((n1) => Math.abs(n1.col - n2.col) <= slope);
			if (!cand.length) {
				return null;
			}
			let best = cand[0];
			for (const n1 of cand) {
				if ((outdeg[n1.c] || 0) < (outdeg[best.c] || 0)) {
					best = n1;
				}
			}
			walked.add(edgeKey(l, best.c, n2.c));
			outdeg[best.c] = (outdeg[best.c] || 0) + 1;
		}
		// 出边保底 + 分叉
		for (const node of layers[l]) {
			const cand = nextLayer.filter((n2) => Math.abs(n2.col - node.col) <= slope);
			if (!cand.length) {
				return null;
			}
			if ((outdeg[node.c] || 0) === 0) {
				const n2 = pick(cand);
				walked.add(edgeKey(l, node.c, n2.c));
				outdeg[node.c] = 1;
			}
			if ((outdeg[node.c] || 0) < 2 && cand.length >= 2 && rnd() < bal.map.branchProb) {
				const free = cand.filter((n2) => !walked.has(edgeKey(l, node.c, n2.c)));
				if (free.length) {
					const n2 = pick(free);
					walked.add(edgeKey(l, node.c, n2.c));
					outdeg[node.c] = (outdeg[node.c] || 0) + 1;
				}
			}
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