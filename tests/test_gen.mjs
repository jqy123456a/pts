/* genMap 独立白盒测试 —— node 直接运行(node test_gen.mjs 时用 --experimental?无需) */
import { genMap } from "../resources/app/src/pts/map/gen.js";
import { BAL } from "../resources/app/src/pts/balance.js";

const N = 1000;
let fails = 0;
const typeStats = {};
for (let i = 0; i < N; i++) {
	const seed = (Math.random() * 0xffffffff) >>> 0;
	let m;
	try {
		m = genMap(seed, BAL);
	} catch (e) {
		console.log("THROW", seed, e.message);
		fails++;
		continue;
	}
	const layers = m.layers;
	if (layers.length !== BAL.map.layers) {
		console.log("BAD layers len", seed);
		fails++;
		continue;
	}
	for (let l = 0; l < layers.length; l++) {
		const n = layers[l].length;
		if (n < BAL.map.minNodes || n > BAL.map.maxNodes) {
			console.log("BAD node count", seed, l, n);
			fails++;
		}
		for (const node of layers[l]) {
			typeStats[node.type || "?"] = (typeStats[node.type || "?"] || 0) + 1;
			if (!node.type) {
				console.log("NO type", seed, l, node.c);
				fails++;
			}
		}
	}
	const firstTypes = layers[0].map((n) => n.type);
	if (firstTypes.some((t) => t !== "battle")) {
		console.log("BAD layer1", seed, firstTypes);
		fails++;
	}
	const ninth = layers[8].map((n) => n.type);
	if (ninth.some((t) => t !== "chest")) {
		console.log("BAD layer9", seed);
		fails++;
	}
	const boss = layers[14].map((n) => n.type);
	if (boss.some((t) => t !== "boss")) {
		console.log("BAD layer15", seed);
		fails++;
	}
	let elites = 0;
	for (let l = 0; l < 3; l++) {
		elites += layers[l].filter((n) => n.type === "elite").length;
	}
	if (elites > 0) {
		console.log("BAD early elite", seed);
		fails++;
	}
	for (let l = 0; l < layers.length; l++) {
		if (layers[l].filter((n) => n.type === "elite").length > 1) {
			console.log("BAD multi elite", seed, l);
			fails++;
		}
	}
	for (let l = 0; l < layers.length - 1; l++) {
		for (const a of layers[l]) {
			const outs = layers[l + 1].filter((b) => m.edges.includes(l + "," + a.c + "," + b.c));
			if (outs.every((b) => Math.abs(b.col - a.col) > BAL.map.maxSlope)) {
				console.log("BAD slope", seed, l, a.c);
				fails++;
			}
			if (!outs.length) {
				console.log("NO out-edge", seed, l, a.c);
				fails++;
			}
		}
	}
}
console.log("samples:", N, "fails:", fails);
console.log("type distribution:", typeStats);
