# 重新开始（重开本局）设计

> 功能：战斗中可随时「重新开始」，退出当前整局、清空进度并回到选将界面重新选角色。

## 1. 目标与范围

- 入口：战斗系统按钮区（「放大/缩小」旁）新增「重新开始」按钮。
- 行为：点击后二次确认；确认则清空当前整局（进度/金币/卡组/已获技能/货单全部作废），整页重载后回到选将界面（全新开局）。
- 非目标：不在地图界面提供该按钮（仅在战斗中可用）；不保留任何进度。

## 2. 方案选型

- **方案 A（采用）**：确认后 `game.ptsClearRun()` + `game.reload()`。重载后 directstart 重新进入 pts 模式，`start()` 读到存档为空 → 直接弹选将界面（全新）。
- 方案 B：清存档 + `game.over(false)` 走引擎认输流程——依赖引擎 `over()` 后重入模式的干净度，路径绕、不确定。
- 方案 C：清存档后手动 `clearArena()` + 直接调 `showHeroSelect()`——需手工拆战场 UI，改动多、易留残影。

选择 A：复用 `node.js` 进战斗既有的 `game.reload()` 路径，最稳、无残留风险。

## 3. 实现点

- 文件：`resources/app/src/pts/battle.js`（仅此一文件）。
- 位置：`ptsTidyBattleUI()` 内，与「放大/缩小」同一处，受既有 `if (!game.ptsZoomButtons)` 防重复挂载；按钮文案「重新开始」。
- 确认弹窗：`ui.create.dialog` 标题「重新开始」、正文「确定放弃本局并重新选将吗？」，两个按钮「确定 / 取消」（`dialog.add([["确定", fn], ["取消", () => dialog.close()]], "textbutton")`）。取消仅关窗。
- 确定动作：
  ```
  game.ptsClearRun();   // 清 pts_run 存档（pts.js 已挂 game.ptsClearRun）
  game.reload();        // 整页重载 → 重进 pts → 无存档 → 选将界面
  ```
- 依赖：`game.ptsClearRun`（pts.js 已挂载）、`game.reload`（引擎原生）。

## 4. 错误处理与风险

| 风险 | 处理 |
|---|---|
| 战斗中途误点导致清档 | 二次确认弹窗兜底；取消即无事 |
| 确认后重载时序 | `game.reload()` 为既有成熟路径，重载后 directstart 自动重进 pts |
| 按钮重复添加 | 复用 `if (!game.ptsZoomButtons)` 防重复（同一守卫，必要时改名 `ptsBattleButtons`） |

## 5. 测试

- 无 node 单测（纯 GUI 交互）；验证靠手测清单：
  1. 战斗中点「重新开始」→ 弹确认框；
  2. 取消 → 弹窗关闭、战斗继续；
  3. 确定 → 整页重载、回到选将界面；旧进度/金币/卡组/技能全部清空；
  4. 重开后地图为全新 15 层（首层战斗、9 层宝箱、15 层 BOSS 固定）。
