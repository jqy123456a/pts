/* 满屏节点交互层:商店/奖励/宝箱/篝火/事件共用弹窗。
 * 改用引擎自带 dialog 体系(ui.create.dialog)——与选将/结算同一套 UI,
 * 天然跟随界面缩放移动位置、自动居中、内容常规文档流绝不重叠。
 * ⚠ 行/卡片样式一律内联,类名不得使用引擎保留名(如 card/lbl/acts)。
 * 打开时隐藏地图层,关闭时恢复。 */

import { ui } from "noname";

export function openScreen(title) {
	const dialog = ui.create.dialog(title);
	console.log("[pts:reward] openScreen v7 (engine dialog)");

	const body = document.createElement("div");
	body.dataset.ptsVer = "v7";
	body.style.width = "100%";
	body.style.boxSizing = "border-box";

	const footer = document.createElement("div");
	footer.style.width = "100%";
	footer.style.boxSizing = "border-box";
	footer.style.display = "flex";
	footer.style.justifyContent = "center";
	footer.style.alignItems = "center";
	footer.style.gap = "12px";
	footer.style.flexWrap = "wrap";
	footer.style.padding = "14px 0 0 0";

	dialog.add([
		function (d) {
			const mapEl = document.querySelector(".pts-root");
			if (mapEl) {
				mapEl.style.display = "none";
			}
			d.content.appendChild(body);
			d.content.appendChild(footer);
		},
		"handle",
	]);

	return {
		body: body,
		footer: footer,
		close: function () {
			const mapEl = document.querySelector(".pts-root");
			if (mapEl) {
				mapEl.style.display = "";
			}
			dialog.close();
		},
	};
}

export function screenButton(label, onclick, disabled, full) {
	const b = document.createElement("button");
	b.textContent = label;
	b.style.padding = "10px 20px";
	b.style.fontSize = "15px";
	b.style.border = "1px solid rgba(255,255,255,.22)";
	b.style.background = "rgba(255,255,255,.08)";
	b.style.color = "#eee";
	b.style.borderRadius = "10px";
	b.style.cursor = "pointer";
	if (full) {
		b.style.display = "block";
		b.style.width = "100%";
		b.style.boxSizing = "border-box";
		b.style.marginBottom = "8px";
	}
	if (disabled) {
		b.disabled = true;
		b.style.opacity = ".4";
		b.style.cursor = "default";
	}
	b.onclick = onclick;
	return b;
}
