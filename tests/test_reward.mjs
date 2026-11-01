import { recipeCandidates, skillCandidates, rewardOptions, applyAddCard, grantSkill, conflictsWith } from "../resources/app/src/pts/reward.js";
import { BAL } from "../resources/app/src/pts/balance.js";

let pass = 0, total = 0;
function t(name, cond) {
	total++;
	if (cond) { pass++; } else { console.error("FAIL: " + name); }
}

function mk(name, n) {
	const S = ["spade", "heart", "club", "diamond"];
	const out = [];
	for (let i = 0; i < n; i++) { out.push(name + "|" + S[i % 4] + "|" + (1 + Math.floor(i / 4))); }
	return out;
}
const deck = [].concat(mk("sha", 5), mk("shan", 5), mk("tiesuo", 5), mk("wuxie", 5), mk("tao", 5), mk("jiu", 5));

t("recipeCandidates 不分档全出", recipeCandidates(deck).length === BAL.recipes.length);
t("recipeCandidates 战斗只出 common", recipeCandidates(deck, "common").length === 4);
t("recipeCandidates 精英只出 elite", recipeCandidates(deck, "elite").length === 2);
t("recipeCandidates 不足4张出空", recipeCandidates(mk("sha", 3), "common").length === 0);

const st = { deck: deck, skills: ["wushuang", "keji", "yingzi"], heroSkills: ["mashu"] };
const opt = rewardOptions(st, "battle");
t("rewardOptions 4 个选项", opt.length === 4 && opt[0].key === "recipe" && opt[1].key === "skill" && opt[2].key === "card" && opt[3].key === "skip");
t("rewardOptions 改牌可行", opt[0].ok === true && opt[0].data.length === 4);
t("rewardOptions 技能已被拿空", opt[1].ok === false && opt[1].data.length === 0);

const sc = skillCandidates(["wushuang"], ["mashu"], "common");
t("skillCandidates 过滤已持有与英雄自带", !sc.includes("wushuang") && !sc.includes("mashu") && sc.includes("keji") && sc.includes("yingzi"));
const se = skillCandidates(["ganglie"], [], "elite");
t("skillCandidates 精英池", se.includes("yiji") && se.includes("zhiheng") && !se.includes("ganglie"));

BAL.conflict.push(["aaa", "bbb"]);
t("conflictsWith 命中", conflictsWith("aaa", "bbb") === true);
t("conflictsWith 未命中", conflictsWith("aaa", "ccc") === false);
t("conflictsWith 与自身不算", conflictsWith("aaa", "aaa") === false);
const g1 = { deck: [], skills: [], heroSkills: ["aaa"] };
t("grantSkill 冲突拒绝", grantSkill(g1, "bbb").ok === false);
BAL.conflict.pop();

const g2 = { deck: [], skills: [], heroSkills: ["mashu"] };
t("grantSkill 习得", grantSkill(g2, "yingzi").ok === true && g2.skills.length === 1);
t("grantSkill 英雄自带拒绝", grantSkill(g2, "mashu").ok === false);

const g3 = { deck: [], skills: [], heroSkills: [] };
const msg = applyAddCard(g3, () => 0);
t("applyAddCard rng0 落地", g3.deck[0] === "sha|spade|1" && msg.includes("sha"));

console.log("reward tests: " + pass + "/" + total + " pass");
if (pass !== total) { process.exit(1); }
