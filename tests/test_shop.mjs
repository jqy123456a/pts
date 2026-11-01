import { genShopInv, tradeState } from "../resources/app/src/pts/shop.js";
import { BAL } from "../resources/app/src/pts/balance.js";
import { count } from "../resources/app/src/pts/deck.js";

let pass = 0, total = 0;
function t(name, cond) {
	total++;
	if (cond) { pass++; } else { console.error("FAIL: " + name); }
}
function lcg(seed) {
	let s = seed >>> 0;
	return () => (s = (1664525 * s + 1013904223) >>> 0) / 4294967296;
}
function mk(name, n, nature) {
	const S = ["spade", "heart", "club", "diamond"];
	const out = [];
	for (let i = 0; i < n; i++) {
		out.push(name + "|" + S[i % 4] + "|" + (1 + Math.floor(i / 4)) + (nature ? "|" + nature : ""));
	}
	return out;
}

const deck = [].concat(mk("sha", 6), mk("shan", 5), mk("tao", 5), mk("tiesuo", 5), mk("wuxie", 5));
const state = { gold: 1000, hp: 3, hpMax: 10, skills: [], heroSkills: [], deck: deck };
const inv = genShopInv(lcg(9), state, BAL);
t("货单 3~5 槽", inv.length >= 3 && inv.length <= 5);

const KINDS = ["recipe", "skill", "skillE", "addCard", "heal", "bulk"];
let allValid = true;
for (const it of inv) {
	allValid = allValid && it && KINDS.includes(it.kind) && typeof it.price === "number" && it.sold === false;
	if (it.kind === "recipe") {
		allValid = allValid && BAL.recipes.includes(it.recipe) && it.price >= BAL.shop.recipe[0] && it.price <= BAL.shop.recipe[1];
	}
	if (it.kind === "skill") { allValid = allValid && BAL.skills.common.includes(it.skillId) && it.price === BAL.shop.skillCommon; }
	if (it.kind === "skillE") { allValid = allValid && BAL.skills.elite.includes(it.skillId) && it.price === BAL.shop.skillElite; }
}
t("货单条目全部合法", allValid === true);

const st1 = { gold: 1000, hp: 3, hpMax: 10, skills: [], heroSkills: [], deck: [].concat(mk("sha", 6), mk("shan", 5)) };
const itR = { kind: "recipe", recipe: { from: "shan", to: "tao", tier: "common" }, price: 150, sold: false };
let tr = tradeState(st1, itR, { nature: null });
t("改牌购买落地 4→1", tr.ok === true && st1.deck.length === 8 && st1.deck[7].split("|")[0] === "tao" && st1.gold === 850 && itR.sold === true);
t("已售出拒购", tradeState(st1, itR, { nature: null }).ok === false && st1.gold === 850);

const st2 = { gold: 50, hp: 3, hpMax: 10, skills: [], heroSkills: [], deck: mk("shan", 5) };
tr = tradeState(st2, { kind: "addCard", price: 60, sold: false }, null);
t("金币不足拒购且不动", tr.ok === false && st2.gold === 50 && st2.deck.length === 5);

const st3 = { gold: 1000, hp: 3, hpMax: 10, skills: [], heroSkills: [], deck: [] };
const itA = { kind: "addCard", price: 60, sold: false };
tr = tradeState(st3, itA, null, () => 0);
t("加牌购买 rng0", tr.ok === true && st3.deck.length === 1 && st3.deck[0] === "sha|spade|1" && st3.gold === 940 && itA.sold === true);

const itH = { kind: "heal", price: 50, sold: false };
t("回血购买", tradeState(st1, itH, null).ok === true);
t("回血可重复且不置为已售", tradeState(st1, itH, null).ok === true && st1.gold === 750 && st1.hp === 5 && itH.sold === false);

const st4 = { gold: 500, hp: 3, hpMax: 10, skills: [], heroSkills: [], deck: [].concat(mk("sha", 3), mk("shan", 4)) };
const itB = { kind: "bulk", price: 120, sold: false };
tr = tradeState(st4, itB, { kind: "sha" });
t("同类全删保底一张", tr.ok === true && count(st4.deck, "sha") === 1 && st4.gold === 380 && itB.sold === true);
t("同类全删已售拒不重删", tradeState(st4, itB, { kind: "shan" }).ok === false);
const st5 = { gold: 500, hp: 3, hpMax: 10, skills: [], heroSkills: [], deck: mk("jiu", 1) };
t("同类全删仅 1 张拒绝", tradeState(st5, { kind: "bulk", price: 120, sold: false }, { kind: "jiu" }).ok === false);

const st6 = { gold: 400, hp: 3, hpMax: 10, skills: [], heroSkills: [], deck: [] };
const itS = { kind: "skill", skillId: "wushuang", price: 200, sold: false };
tr = tradeState(st6, itS, null);
t("技能购买", tr.ok === true && st6.skills.includes("wushuang") && st6.gold === 200 && itS.sold === true);
t("技能已售拒购", tradeState(st6, itS, null).ok === false);

console.log("shop tests: " + pass + "/" + total + " pass");
if (pass !== total) { process.exit(1); }
