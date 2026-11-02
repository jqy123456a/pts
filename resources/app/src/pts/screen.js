/* 满屏节点交互层:商店/奖励/宝箱/篝火/事件共用的全屏画面骨架。纯 DOM,无 noname 依赖。
 * 关键定位/背景用内联样式(与 map/ui.js 同法),避免 position:fixed 在缩放变换下失效。 */

let styleInjected = false;
function injectStyle() {
	if (styleInjected) {
		return;
	}
	styleInjected = true;
	const st = document.createElement("style");
	st.id = "pts-screen-style";
	st.innerHTML = [
		".pts-screen button{padding:12px 18px;font-size:15px;border:1px solid #666;background:#222;color:#eee;border-radius:8px;cursor:pointer;}",
		".pts-screen button:hover{background:#333;}",
		".pts-screen button[disabled]{opacity:.4;cursor:default;}",
		".pts-screen .body>button{display:block;width:100%;box-sizing:border-box;margin-bottom:8px;}",
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
	root.style.cssText = "position:absolute;left:0;top:0;right:0;bottom:0;background:rgba(0,0,0,.7);z-index:2147483000;";

	const panel = document.createElement("div");
	panel.style.cssText = "position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:680px;max-width:92vw;max-height:82vh;display:flex;flex-direction:column;background:#161616;border:1px solid #555;border-radius:12px;color:#eee;font-family:'Microsoft YaHei',sans-serif;overflow:hidden;box-sizing:border-box;";

	const hd = document.createElement("div");
	hd.style.cssText = "height:56px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:bold;background:#101216;border-bottom:1px solid #444;flex-shrink:0;";
	hd.textContent = title;

	const body = document.createElement("div");
	body.style.cssText = "flex:1 1 auto;min-height:0;overflow-y:auto;padding:16px 20px;";

	const footer = document.createElement("div");
	footer.style.cssText = "display:flex;flex-wrap:wrap;gap:10px;justify-content:center;padding:12px 20px;border-top:1px solid #444;background:#101216;flex-shrink:0;";

	panel.appendChild(hd);
	panel.appendChild(body);
	panel.appendChild(footer);
	root.appendChild(panel);
	document.body.appendChild(root);

	console.log("[pts:reward] openScreen 面板已建:", title);
	return {
		root: root,
		body: body,
		footer: footer,
		close: function () { root.remove(); },
	};
}

export function screenButton(label, onclick, disabled) {
	const b = document.createElement("button");
	b.textContent = label;
	if (disabled) {
		b.disabled = true;
	}
	b.onclick = onclick;
	return b;
}
