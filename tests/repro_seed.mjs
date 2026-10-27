import { genMap } from "../resources/app/src/pts/map/gen.js";
import { BAL } from "../resources/app/src/pts/balance.js";
for (let i = 0; i < 200; i++) {
	const seed = (Math.random() * 0xffffffff) >>> 0;
	try {
		genMap(seed, BAL);
	} catch (e) {
		break;
	}
}
