/* 商店纯逻辑:货单生成与交易守卫。零引擎依赖(只读 BAL 与 reward/deck 纯模块)。
 * 货单只随「进铺入图」生成一次并持有在 state.shopInv,刷新/往返地图不重抽。 */
import { BAL } from "./balance.js";
import { transform4to1, count, removeKind } from "./deck.js";
import { recipeCandidates, skillCandidates, applyAddCard } from "./reward.js";

/* 每槽定价。价格常量全部收敛在 BAL.shop(见 balance.js shop 块)。 */
function priceOf(bal, kind, r) {
	const m = bal.shop;
	if (kind === "recipe") { return m.recipe[0] + Math.floor(r() * (m.recipe[1] - m.recipe[0] + 1)); }
	if (kind === "skill") { return m.skillCommon; }
	if (kind === "skillE") { return m.skillElite; }
	if (kind === "addCard") { return m.addCard; }
	if (kind === "heal") { return m.heal; }
	return m.bulkRemove;
}

/* 3~5 槽货单。有候选的类别才入池均匀抽;改牌物路由当前牌池的候选(买时再验一次)。 */
export function genShopInv(rng, state, bal) {
	const r = rng || Math.random;
	const b = bal || BAL;
	const slots = b.shop.slots[0] + Math.floor(r() * (b.shop.slots[1] - b.shop.slots[0] + 1));
	const items = [];
	for (let i = 0; i < slots; i++) {
		const avail = [];
		if (recipeCandidates(state.deck).length) { avail.push("recipe"); }
		if (skillCandidates(state.skills, state.heroSkills, "common").length) { avail.push("skill"); }
		if (skillCandidates(state.skills, state.heroSkills, "elite").length) { avail.push("skillE"); }
		avail.push("addCard", "heal", "bulk");
		const kind = avail[Math.floor(r() * avail.length)];
		const it = { kind: kind, price: priceOf(b, kind, r), sold: false };
		if (kind === "recipe") {
			const cs = recipeCandidates(state.deck);
			it.recipe = cs[Math.floor(r() * cs.length)];
		} else if (kind === "skill") {
			const cs = skillCandidates(state.skills, state.heroSkills, "common");
			it.skillId = cs[Math.floor(r() * cs.length)];
		} else if (kind === "skillE") {
			const cs = skillCandidates(state.skills, state.heroSkills, "elite");
			it.skillId = cs[Math.floor(r() * cs.length)];
		}
		items.push(it);
	}
	return items;
}

/* 交易守卫与落地。sel:{nature?}改牌选属性 / {kind?}同类全删选牌名。
 * 回血物件可重复购买(不置已售)。 */
export function tradeState(state, item, sel, rng) {
	if (!item) { return { ok: false, msg: "无效商品" }; }
	if (item.sold) { return { ok: false, msg: "已售出" }; }
	if (state.gold < item.price) { return { ok: false, msg: "金币不足(需 " + item.price + ")" }; }
	if (item.kind === "recipe") {
		const nature = sel && sel.nature ? sel.nature : null;
		if (!transform4to1(state.deck, item.recipe, nature)) { return { ok: false, msg: "牌池已变化,方案失效" }; }
		item.sold = true;
	} else if (item.kind === "skill") {
		const poolKey = BAL.skills.elite.includes(item.skillId) ? "elite" : "common";
		if (!skillCandidates(state.skills, state.heroSkills, poolKey).includes(item.skillId)) { return { ok: false, msg: "该技能已不可购买" }; }
		state.skills.push(item.skillId);
		item.sold = true;
	} else if (item.kind === "addCard") {
		applyAddCard(state, rng);
		item.sold = true;
	} else if (item.kind === "heal") {
		if (state.hp >= state.hpMax) { return { ok: false, msg: "体力已满" }; }
		state.hp++;
	} else if (item.kind === "bulk") {
		const kind = sel && sel.kind;
		if (!kind || count(state.deck, kind) <= 1) { return { ok: false, msg: "该牌不足 2 张,不设删" }; }
		removeKind(state.deck, kind);
		item.sold = true;
	}
	state.gold -= item.price;
	return { ok: true, msg: "已购入(" + item.price + " 金币)" };
}
