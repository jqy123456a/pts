# 地图路线重构（分叉/合并）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把地图边生成改为「每节点 1~2 出边 + 入边合并」，去除蜘蛛网，形成分叉/合并路径。

**Architecture:** 重写 `gen.js` `_generate` 的边生成（删游走+补边两步，合并为一步）；`balance.js` 加 `branchProb`、删 `walkCount`；测试加稀疏性断言。

**Tech Stack:** JavaScript（裸 node ESM 测试）

## Global Constraints

- 每层节点 2~4 不变；`maxSlope`/`minNodes`/`maxNodes` 语义不变。
- 保证：每节点（BOSS 层外）≥1 出边、每节点（首层外）≥1 入边、出度 ≤2、全图可达 BOSS。
- 只改 `gen.js`、`balance.js`、`tests/test_gen.mjs`。
- commit 风格：`add: <中文>`

---

### Task 1: 稀疏性测试先行 + 重写边生成

**Files:**
- Modify: `tests/test_gen.mjs`
- Modify: `resources/app/src/pts/balance.js`
- Modify: `resources/app/src/pts/map/gen.js`

**Interfaces:**
- Consumes: `BAL.map.branchProb`（新增）、`BAL.map.maxSlope`。
- Produces: `genMap(seed, bal)` 行为不变（返回 `{layers, edges}`），仅边更稀疏。

- [ ] **Step 1: 加稀疏性断言（先在旧算法上跑，应失败）**

在 `tests/test_gen.mjs` 的 `for (let l = 0; l < layers.length - 1; l++)` 块内（`NO out-edge` 检查后）追加:
```js
		const outs = layers[l + 1].filter((b) => m.edges.includes(l + "," + a.c + "," + b.c));
		if (outs.length > 2) {
			console.log("DENSE out-degree", seed, l, a.c, outs.length);
			fails++;
		}
```
（注意该循环已声明 `const outs`，若重名请改为复用现有变量，删除旧定义避免重复声明。）

- [ ] **Step 2: 运行确认失败**

```powershell
node tests\test_gen.mjs
```

Expected: `fails` > 0（旧算法存在出度 3 的节点，命中 `DENSE out-degree`）。

- [ ] **Step 3: balance.js 加 branchProb、删 walkCount**

oldString:
```js
	map: {
		layers: 15,
		minNodes: 2,
		maxNodes: 4,
		walkCount: 5,
		maxSlope: 1,
	},
```
newString:
```js
	map: {
		layers: 15,
		minNodes: 2,
		maxNodes: 4,
		maxSlope: 1,
		branchProb: 0.25,
	},
```

- [ ] **Step 4: 重写 gen.js 边生成**

删除 `_generate` 内原第 3 步「游走」+ 第 4 步「补边」+ 第 5 步「连通性校验」（即从 `// 3) 边` 注释到 `return { layers: layers, edges: Array.from(walked) };` 之前的所有边相关代码，保留 `return` 行），替换为:
```js
	// 3) 边:自顶向下,每节点 1~2 条出边(分叉),下层保底 1 入边(合并);出度 ≤2
	const walked = new Set();
	const edgeKey = (l, c1, c2) => l + "," + c1 + "," + c2;
	const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
	const outdeg = {};
	for (let l = 0; l < L - 1; l++) {
		const nextLayer = layers[l + 1];
		for (const node of layers[l]) {
			const key = l + "," + node.c;
			const cand = nextLayer.filter((n) => Math.abs(n.col - node.col) <= slope);
			if (!cand.length) {
				return null;
			}
			const a = pick(cand);
			walked.add(edgeKey(l, node.c, a.c));
			outdeg[key] = 1;
			if (cand.length >= 2 && rnd() < bal.map.branchProb) {
				let b = pick(cand);
				if (b === a) {
					b = cand[(cand.indexOf(a) + 1) % cand.length];
				}
				walked.add(edgeKey(l, node.c, b.c));
				outdeg[key] = 2;
			}
		}
		for (const n2 of nextLayer) {
			let has = false;
			for (const node of layers[l]) {
				if (walked.has(edgeKey(l, node.c, n2.c))) {
					has = true;
					break;
				}
			}
			if (has) {
				continue;
			}
			const cand = layers[l].filter((n1) => Math.abs(n1.col - n2.col) <= slope);
			if (!cand.length) {
				return null;
			}
			const low = cand.filter((n1) => (outdeg[l + "," + n1.c] || 0) < 2);
			const src = pick(low.length ? low : cand);
			walked.add(edgeKey(l, src.c, n2.c));
			outdeg[l + "," + src.c] = (outdeg[l + "," + src.c] || 0) + 1;
		}
	}
```
（保留原 `return { layers: layers, edges: Array.from(walked) };` 与函数末尾。）

- [ ] **Step 5: 运行全部测试确认通过**

```powershell
node tests\test_gen.mjs
node tests\test_branches.mjs
```

Expected: `test_gen` `fails: 0`；`test_branches` `fails: 0`。

- [ ] **Step 6: Commit**

```powershell
git add resources/app/src/pts/map/gen.js resources/app/src/pts/balance.js tests/test_gen.mjs
git commit -m "add: 地图边生成改为分叉/合并,去除蜘蛛网"
```
