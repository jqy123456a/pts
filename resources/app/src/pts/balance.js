/* 爬塔杀数值初版 —— 与《需求文档》§5/《规范文档》§4 对齐;
 * 全部可调项唯一入口,实现时不再硬编码。 */
export const BAL = {
	seed: 20261023,
	map: {
		layers: 15,
		minNodes: 2,
		maxNodes: 4,
		maxSlope: 1,
		branchProb: 0.25,
	},
	fixed: {
		1: "battle",
		9: "chest",
		15: "boss",
	},
	nodeProb: {
		battle: 0.44,
		event: 0.20,
		elite: 0.14,
		rest: 0.10,
		shop: 0.12,
	},
	eliteMinLayer: 4,
	enemy: {
		act1: { "1v1": 0.667, "1v2": 0.333 },
		act2: { "1v2": 0.667, "1v3": 0.333 },
		enemyCount: { battle1: 1, battle2: 2, elite: 2, boss: 2 },
	},
	gold: {
		start: 99,
		battle: [75, 125],
		elite: [150, 225],
		chest: [0, 50],
	},
	rest: { heal: 3 },
	shop: {
		slots: [3, 5],
		recipe: [150, 250],
		skillCommon: 200,
		skillElite: 350,
		addCard: 60,
		heal: 50,
		bulkRemove: 120,
	},
	recipes: [
		{ from: "sha", toEach: ["fire", "thunder"], tier: "common" },
		{ from: "shan", to: "tao", tier: "common" },
		{ from: "tiesuo", to: "huogong", tier: "common" },
		{ from: "wuxie", to: "lebu", tier: "common" },
		{ from: "tao", to: "wuzhong", tier: "elite" },
		{ from: "shan", to: "wuxie", tier: "elite" },
	],
	groupsPerReward: 3,
	chest: { recipeProb: 0.6, gold: [0, 50] },
	skills: {
		common: ["wushuang", "mashu", "keji", "yingzi"],
		elite: ["ganglie", "yiji", "fankui", "zhiheng"],
		boss: ["jianxiong", "paoxiao"],
	},
	conflict: [],
	heroPool: ["caocao", "liubei", "sunquan", "zhangfei", "guanyu", "zhaoyun", "zhouyu", "simayi", "zhugeliang", "diaochan"],
};
