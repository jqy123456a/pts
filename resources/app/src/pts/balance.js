/* 爬塔杀数值初版 —— 与《需求文档》§5/《规范文档》§4 对齐;
 * 全部可调项唯一入口,实现时不再硬编码。 */
export const BAL = {
	seed: 20261023,
	map: {
		layers: 15,
		minNodes: 2,
		maxNodes: 4,
		walkCount: 5,
		maxSlope: 1,
	},
	fixed: {
		1: "battle",
		9: "chest",
		15: "boss",
	},
	nodeProb: {
		battle: 0.50,
		event: 0.22,
		elite: 0.16,
		rest: 0.12,
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
		{ from: "sha", toEach: ["huosha", "leisha"], tier: "common" },
		{ from: "shan", to: "tao", tier: "common" },
		{ from: "tiesuo", to: "huogong", tier: "common" },
		{ from: "wuxie", to: "lebusi", tier: "common" },
		{ from: "tao", to: "wuzhong", tier: "elite" },
		{ from: "huosha", to: "leisha", tier: "elite" },
	],
	groupsPerReward: 3,
	chest: { recipeProb: 0.6, gold: [0, 50] },
	skills: {
		common: ["wushuang", "mashu", "keji", "yingzi"],
		elite: ["ganglie", "yiji", "fankui", "zhiheng"],
		boss: ["jianxiong", "paoxiao"],
	},
	heroPool: ["caocao", "liubei", "sunquan", "zhangfei", "guanyu", "zhaoyun", "zhouyu", "simayi", "zhugeliang", "diaochan"],
};
