/* 满屏节点交互层:商店/奖励/宝箱/篝火/事件共用的全屏画面骨架。纯 DOM,无 noname 依赖。
 * 样式一律逐属性赋值(style.height=...),不用 cssText 整串(引擎环境下不可靠)。
 * ⚠ panel 的 min-height 是可见性的关键,改动布局时不得删除。 */

let styleInjected = false;
function injectStyle() {
	if (styleInjected) {
		return;
	}
	styleInjected = true;
	const st = document.createElement("style");
	st.id = "pts-screen-style";
	st.innerHTML = [
		".pts-screen .card{display:flex;align-items:center;justify-content:space-between;gap:10px;background:#1a1e24;border:1px solid #3a3f46;border-radius:10px;padding:12px 16px;margin-bottom:8px;}",
		".pts-screen .card .lbl{flex:1;}",
		".pts-screen .card .acts{display:flex;gap:8px;flex-shrink:0;}",
	].join("");
	document.head.appendChild(st);
}

export function openScreen(title) {
	injectStyle();
	document.querySelectorAll(".pts-screen").forEach((e) => e.remove());

	const root = document.createElement("div");
	root.className = "pts-screen";
	root.style.position = "absolute";
	root.style.left = "0";
	root.style.top = "0";
	root.style.right = "0";
	root.style.bottom = "0";
	root.style.background = "rgba(0,0,0,.7)";
	root.style.zIndex = "2147483000";

	const panel = document.createElement("div");
	panel.style.position = "absolute";
	panel.style.left = "50%";
	panel.style.top = "50%";
	panel.style.transform = "translate(-50%,-50%)";
	panel.style.width = "680px";
	panel.style.maxWidth = "92vw";
	panel.style.minHeight = "360px";
	panel.style.maxHeight = "82vh";
	panel.style.background = "#161616";
	panel.style.border = "1px solid #555";
	panel.style.borderRadius = "12px";
	panel.style.color = "#eee";
	panel.style.overflow = "hidden";
	panel.style.boxSizing = "border-box";

	const hd = document.createElement("div");
	hd.style.height = "56px";
	hd.style.lineHeight = "56px";
	hd.style.textAlign = "center";
	hd.style.fontSize = "20px";
	hd.style.fontWeight = "bold";
	hd.style.background = "#101216";
	hd.style.borderBottom = "1px solid #444";
	hd.style.boxSizing = "border-box";
	hd.textContent = title;

	const body = document.createElement("div");
	body.style.overflowY = "auto";
	body.style.padding = "16px 20px";

	const footer = document.createElement("div");
	footer.style.display = "flex";
	footer.style.justifyContent = "center";
	footer.style.alignItems = "center";
	footer.style.gap = "12px";
	footer.style.flexWrap = "wrap";
	footer.style.padding = "14px 20px";
	footer.style.borderTop = "1px solid rgba(255,255,255,.08)";
	footer.style.background = "rgba(255,255,255,.04)";

	panel.appendChild(hd);
	panel.appendChild(body);
	panel.appendChild(footer);
	root.appendChild(panel);
	document.body.appendChild(root);

	return {
		root: root,
		body: body,
		footer: footer,
		close: function () { root.remove(); },
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
