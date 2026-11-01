# 重新开始（重开本局）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 战斗中系统按钮区新增「重新开始」，二次确认后清空本局并回到选将界面。

**Architecture:** 单文件改动——在 `battle.js` 的 `ptsTidyBattleUI()` 里，与「放大/缩小」同一守卫块内用 `ui.create.system` 加按钮；确认走 `ui.create.dialog` + `textbutton`；确定后 `game.ptsClearRun()` + `game.reload()`。

**Tech Stack:** JavaScript（无名杀 v1.9.0 引擎）

## Global Constraints

- 只改 `resources/app/src/pts/battle.js` 一个文件。
- 引擎约束：`ptsTidyBattleUI` 是普通函数（非 StepCompiler 内容），可直接引用模块内 `ui`/`game`；`game.ptsClearRun` 由 pts.js 挂载、`game.reload` 为引擎原生。
- commit 风格：`add: <中文>`
- 无 node 单测（纯 GUI 交互），验证 = `node --check` + 手测清单。

---

### Task 1: 战斗内「重新开始」按钮 + 二次确认

**Files:**
- Modify: `resources/app/src/pts/battle.js`（`ptsTidyBattleUI` 内守卫块）

**Interfaces:**
- Consumes: `game.ptsClearRun`（pts.js 已挂）、`game.reload`（引擎原生）、`ui.create.system`/`ui.create.dialog`（引擎）。
- Produces: 无新导出；战斗中系统按钮区多一个「重新开始」。

- [ ] **Step 1: 编辑 `ptsTidyBattleUI` 的守卫块**

oldString（battle.js 内，精确匹配）:
```js
	if (!game.ptsZoomButtons) {
		game.ptsZoomButtons = true;
		ui.create.system("放大", function () {
			zoomBy(10);
		});
		ui.create.system("缩小", function () {
			zoomBy(-10);
		});
	}
```

newString:
```js
	if (!game.ptsZoomButtons) {
		game.ptsZoomButtons = true;
		ui.create.system("放大", function () {
			zoomBy(10);
		});
		ui.create.system("缩小", function () {
			zoomBy(-10);
		});
		ui.create.system("重新开始", function () {
			const dialog = ui.create.dialog("重新开始", "确定放弃本局并重新选将吗？");
			dialog.add([
				["确定", function () {
					dialog.close();
					game.ptsClearRun();
					game.reload();
				}],
				["取消", function () {
					dialog.close();
				}],
			], "textbutton");
		});
	}
```

- [ ] **Step 2: 语法检查**

```powershell
node --check resources/app/src/pts/battle.js
```

Expected: 无输出（语法 OK）。

- [ ] **Step 3: 手测清单（无法自动化，需在游戏内验证）**

1. 进 pts → 选将 → 首战打响后，系统按钮区出现「放大/缩小/重新开始」三键；
2. 点「重新开始」→ 弹出「确定放弃本局并重新选将吗？」+ 确定/取消；
3. 点「取消」→ 弹窗关闭，战斗继续，进度未清；
4. 点「确定」→ 整页重载，回到选将界面；用控制台 `game.ptsLoadRun()` 应为 `null`（旧进度/金币/卡组全清）；
5. 重开后新开局地图为全新 15 层。

- [ ] **Step 4: Commit**

```powershell
git add resources/app/src/pts/battle.js
git commit -m "add: 战斗中可重新开始(二次确认后重开本局)"
```
