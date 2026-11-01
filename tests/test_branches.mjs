/* genMap 连通性白盒测试 —— 校验任意种子下:不抛异常 + 每个首层节点可达 BOSS。
 * 原 test_branches 依赖已删除的调试符号 DBG,现重写为无依赖的连通性断言(补充 test_gen 未覆盖的整图可达性)。 */
import { genMap } from "../resources/app/src/pts/map/gen.js";
import { BAL } from "../resources/app/src/pts/balance.js";

const N = 500;
let fails = 0;

function reachableBoss(m) {
	const L = m.layers.length;
	const reach = new Set();
	for (const node of m.layers[L - 1]) {
		reach.add((L - 1) + "," + node.c);
	}
	for (let l = L - 2; l >= 0; l--) {
		for (const node of m.layers[l]) {
			for (const n2 of m.layers[l + 1]) {
				if (m.edges.includes(l + "," + node.c + "," + n2.c) && reach.has((l + 1) + "," + n2.c)) {
					reach.add(l + "," + node.c);
					break;
				}
			}
		}
	}
	for (const node of m.layers[0]) {
		if (!reach.has("0," + node.c)) {
			return false;
		}
	}
	return true;
}

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
	if (!m || !Array.isArray(m.layers) || !Array.isArray(m.edges)) {
		console.log("BAD shape", seed);
		fails++;
		continue;
	}
	if (m.layers.length !== BAL.map.layers) {
		console.log("BAD layers", seed, m.layers.length);
		fails++;
		continue;
	}
	if (!reachableBoss(m)) {
		console.log("UNREACHABLE", seed);
		fails++;
	}
}

console.log("samples:", N, "fails:", fails);
if (fails > 0) {
	process.exit(1);
}
