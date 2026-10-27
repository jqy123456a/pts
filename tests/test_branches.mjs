import { genMap, DBG } from "../resources/app/src/pts/map/gen.js";
import { BAL } from "../resources/app/src/pts/balance.js";
const counts = { b112: 0, b132: 0, b150: 0, b175: 0, ok: 0 };
for (let i = 0; i < 1000; i++) {
	const seed = (Math.random() * 0xffffffff) >>> 0;
	try {
		genMap(seed, BAL);
		counts.ok++;
	} catch (e) {
		const b = e.message.match(/failed after retries/);
		const prev = DBG.branch;
		counts[prev] = (counts[prev] || 0) + 1;
	}
}
console.log(counts);
