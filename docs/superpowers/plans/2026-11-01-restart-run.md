# 重新开始（重开本场 / 重开整局）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 战斗系统按钮区新增「重开本场」「重开整局」两个按钮，各自二次确认后重打本场 / 清档回选将。

**Architecture:** 单文件改动——`battle.js` 的 `ptsTidyBattleUI()` 守卫块内加两个 `ui.create.system` 按钮；确认走 `ui.create.dialog` + `textbutton`；重开本场 `game.ptsFlowSave()+game.reload()`，重开整局 `game.ptsClearRun()+game.reload()`。

**Tech Stack:** JavaScript（无名杀 v1.9.0 引擎）

## Global Constraints

- 只改 `resources/app/src/pts/battle.js`。
- `ptsTidyBattleUI` 是普通函数（非 StepCompiler 内容），可直接用模块内 `ui`/`game`；`game.ptsFlowSave`/`game.ptsClearRun` 由 pts.js 挂载、`game.reload` 引擎原生。
- commit 风格：`add: <中文>`
- 无 node 单测（GUI 交互），验证 = `node --check` + 手测清单。

---

### Task 1: 战斗内「重开本场」+「重开整局」按钮

**Files:**
- Modify: `resources/app/src/pts/battle.js`（`ptsTidyBattleUI` 守卫块）

**Interfaces:**
- Consumes: `game.ptsFlowSave`、`game.ptsClearRun`（pts.js 已挂）、`game.reload`（引擎）、`ui.create.system`/`ui.create.dialog`（引擎）。
- Produces: 无新导出；系统按钮区多两键（「重开本场」「重开整局」）。

- [ ] **Step 1: 编辑 `ptsTidyBattleUI` 的守卫块**

oldString（battle.js 内，精确匹配，含上一版已加的「重新开始」按钮）:
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
		ui.create.system("重开本场", function () {
			const dialog = ui.create.dialog("重开本场", "确定重新开始本场战斗吗？(恢复到进场前状态)");
			dialog.add([
				["确定", function () {
					dialog.close();
					game.ptsFlowSave();
					game.reload();
				}],
				["取消", function () {
					dialog.close();
				}],
			], "textbutton");
		});
		ui.create.system("重开整局", function () {
			const dialog = ui.create.dialog("重开整局", "确定放弃本局并重新选将吗？");
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

- [ ] **Step 3: 手测清单**

1. 战斗中出现「放大/缩小/重开本场/重开整局」四键；
2. 「重开本场」→ 确认 → 重载后仍打同一敌人，体力/金币/卡组与进场前一致；取消则继续；
3. 「重开整局」→ 确认 → 回到选将界面，`game.ptsLoadRun()` 为 null；
4. 重开后地图全新 15 层。

- [ ] **Step 4: Commit**

```powershell
git add resources/app/src/pts/battle.js
git commit -m "add: 战斗内重开本场/重开整局两按钮"
```
