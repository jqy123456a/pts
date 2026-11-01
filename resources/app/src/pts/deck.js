/* 牌组纯逻辑:牌串编解码/数量/抽取/连体迁移/定向删除。零引擎依赖。

   牌串格式(持久层约定):
     "name|suit|number"                普通牌
     "name|suit|number|nature"         带属性牌(火杀/雷杀)
   元组格式(引擎侧定义快照):[suit, number, name, nature?] */
const SUITS = ["spade", "heart", "club", "diamond"];
const POOL = ["sha", "shan", "tao", "jiu"];

function encodeCard(name, suit, number, nature) {
	let s = name + "|" + suit + "|" + number;
	if (nature) { s += "|" + nature; }
	return s;
}

function decodeCard(cardStr) {
	const parts = cardStr.split("|");
	return [parts[0], parts[1], parts[2], parts[3] || null];
}

/* 元组 → 牌串数组 */
function deckFromTuples(tuples) {
	return tuples.map(t => encodeCard(t[2], t[0], t[1], t[3] || null));
}

function count(deck, name) {
	let n = 0;
	for (const s of deck) { if (s.split("|")[0] === name) { n++; } }
	return n;
}

/* 牌串数组 → 去重牌名列表 */
function kindsOf(deck) {
	return Array.from(new Set(deck.map(s => s.split("|")[0])));
}

/* 随机新牌:随机花色 + 随机点数(1~13,忽略引擎 14~15 副点;补牌场景够用) */
function addCard(deck, name, rng) {
	const r = rng || Math.random;
	const suit = SUITS[Math.floor(r() * 4)];
	const number = 1 + Math.floor(r() * 13);
	deck.push(encodeCard(name, suit, number, null));
}

function randomPoolName(rng) {
	const r = rng || Math.random;
	return POOL[Math.floor(r() * POOL.length)];
}

/* 连体迁移:4 张 from → 1 张(火/雷杀落到第4段 nature)。
   recipe: {from:"sha", toEach:["fire","thunder"], ...} 或 {from:"shan", to:"tao", ...}
   pickNature: 改牌方案逐组 UI/宝箱自动时已二选一传入;为 null 且属 sha 配方则 toEach 随机。
   数量不足 → false,deck 原样(先计数后删除,保证原子性)。 */
function transform4to1(deck, recipe, pickNature, rng) {
	const r = rng || Math.random;
	const idxs = [];
	for (let i = 0; i < deck.length; i++) {
		const p = deck[i].split("|");
		if (p[0] === recipe.from && !(recipe.from === "sha" && p[3])) { idxs.push(i); }
	}
	if (idxs.length < 4) { return false; }
	for (let k = 3; k >= 0; k--) { deck.splice(idxs[k], 1); }
	const target = recipe.toEach ? "sha" : recipe.to;
	const nature = recipe.toEach ? (pickNature || recipe.toEach[Math.floor(r() * recipe.toEach.length)]) : null;
	deck.push(encodeCard(target, SUITS[Math.floor(r() * 4)], 1 + Math.floor(r() * 13), nature));
	return true;
}

/* 整牌种删除:同类全删但保底 1 张(避免"没牌可打");如 count = 总数,只删 count-1。返回删除数。 */
function removeKind(deck, name) {
	const total = count(deck, name);
	if (!total) { return 0; }
	let removed = 0;
	for (let i = deck.length - 1; i >= 0 && removed < total - 1; i--) {
		if (deck[i].split("|")[0] === name) { deck.splice(i, 1); removed++; }
	}
	return removed;
}

export { encodeCard, decodeCard, deckFromTuples, count, kindsOf, addCard, randomPoolName, transform4to1, removeKind };
