/* 战后三选一与宝箱的奖励纯逻辑。零引擎依赖(只引用 BAL 与 deck 纯模块),
 * tests 与 UI 两端同吃。 */
import { BAL } from "./balance.js";
import { count, randomPoolName, addCard } from "./deck.js";

/* conflict: [["a","b"],…] 双向冲突(a 拿了 b 不可再拿,b 同)。 */
export function conflictsWith(left, right) {
	for (const pair of BAL.conflict) {
		if (pair.includes(left) && pair.includes(right) && left !== right) {
			return true;
		}
	}
	return false;
}

/* 改牌候选:deck 里 count(from)>=4 的配方。tier 过滤:"common"只出 common,"elite"只出 elite,缺省全出。 */
export function recipeCandidates(deck, tier) {
	const out = [];
	for (const r of BAL.recipes) {
		if (tier && r.tier !== tier) {
			continue;
		}
		if (count(deck, r.from) >= 4) {
			out.push(r);
		}
	}
	return out;
}

/* 技能候选:BAL.skills[poolKey] − heroSkills − skills − 冲突。 */
export function skillCandidates(skills, heroSkills, poolKey) {
	const have = [].concat(heroSkills || [], skills || []).filter(Boolean);
	return (BAL.skills[poolKey] || []).filter(function (id) {
		if (have.includes(id)) {
			return false;
		}
		for (const other of have) {
			if (conflictsWith(id, other)) {
				return false;
			}
		}
		return true;
	});
}

/* 三选一 proposals,依 "battle"/"elite" 路由档位。改牌无候选时 UI 端降级加牌(不在此编)。 */
export function rewardOptions(state, type) {
	const tier = type === "elite" ? "elite" : "common";
	const recipes = recipeCandidates(state.deck, tier);
	const skills = skillCandidates(state.skills, state.heroSkills, tier);
	return [
		{ key: "recipe", ok: recipes.length > 0, data: recipes, cap: BAL.groupsPerReward },
		{ key: "skill", ok: skills.length > 0, data: skills, poolKey: tier },
		{ key: "card", ok: true, data: null },
		{ key: "skip", ok: true, data: null },
	];
}

/* 随机加一张 sha/shan/tao/jiu 家族牌(战斗购买/降级奖励/商店同类)。 */
export function applyAddCard(state, rng) {
	const name = randomPoolName(rng);
	addCard(state.deck, name, rng);
	return "「" + name + "」家族随机一张";
}

export function grantSkill(state, id) {
	if (state.skills.includes(id) || (state.heroSkills || []).includes(id)) {
		return { ok: false, msg: "已有「" + id + "」", arg: id };
	}
	for (const other of [].concat(state.heroSkills || [], state.skills)) {
		if (conflictsWith(id, other)) {
			return { ok: false, msg: "「" + id + "」与「" + other + "」冲突", arg: other };
		}
	}
	state.skills.push(id);
	return { ok: true, msg: "习得「" + id + "」" };
}
