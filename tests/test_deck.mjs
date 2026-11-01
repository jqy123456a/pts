import { encodeCard, decodeCard, deckFromTuples, count, kindsOf, addCard, randomPoolName, transform4to1, removeKind } from "../resources/app/src/pts/deck.js";

let pass = 0, total = 0;
function t(name, cond) {
	total++;
	if (cond) { pass++; } else { console.error("FAIL: " + name); }
}

t("encodeCard 基本", encodeCard("sha", "spade", 7) === "sha|spade|7");
t("encodeCard 带 nature", encodeCard("sha", "spade", 7, "fire") === "sha|spade|7|fire");
t("decodeCard 3段", JSON.stringify(decodeCard("tao|heart|3")) === JSON.stringify(["tao", "heart", "3", null]));
t("decodeCard 4段", JSON.stringify(decodeCard("sha|spade|7|fire")) === JSON.stringify(["sha", "spade", "7", "fire"]));
const dt = deckFromTuples([["spade", 7, "sha", "fire"], ["heart", 1, "tao"], ["club", 12, "sha"]]);
t("deckFromTuples 元组→牌串", dt[0] === "sha|spade|7|fire" && dt[1] === "tao|heart|1" && dt.length === 3);
t("count", count(["sha|spade|7", "sha|club|9", "tao|heart|1"], "sha") === 2);
t("kindsOf", JSON.stringify(kindsOf(["sha|spade|7", "sha|club|9|thunder", "tao|heart|1"])).includes("sha") && kindsOf(["tao|heart|1"]).length === 1);

const rng0 = () => 0;
const d2 = [];
addCard(d2, "sha", rng0);
t("addCard rng0 → spade A", d2[0] === "sha|spade|1");
const d3 = ["sha|spade|1", "tao|heart|3", "sha|heart|14", "shan|diamond|11", "sha|club|2", "sha|diamond|8"];
const ok = transform4to1(d3, { from: "sha", toEach: ["fire", "thunder"] }, "thunder", rng0);
t("transform4to1 成功 4→1 雷杀", ok && d3.length === 3 && d3[2] === "sha|spade|1|thunder" && !d3.includes("sha|spade|1"));
const tooFew = ["sha|spade|1", "tao|heart|3"];
t("transform4to1 不足4张返回 false 且不动", transform4to1(tooFew, { from: "sha", to: "tao" }, null) === false && tooFew.length === 2);
const d4 = ["sha|spade|1", "tao|heart|3", "sha|heart|14", "shan|diamond|11", "sha|club|2", "tao|diamond|5"];
const removed = removeKind(d4, "sha");
t("removeKind 保底1张(3→2)", removed === 2 && d4.filter(s => s.split("|")[0] === "sha").length === 1);
t("removeKind 只删1张", removeKind(d4, "tao") === 1);
const dn = randomPoolName(rng0);
t("randomPoolName rng0 → 池名", ["sha", "shan", "tao", "jiu"].includes(dn));

console.log("deck tests: " + pass + "/" + total + " pass");
if (pass !== total) { process.exit(1); }
