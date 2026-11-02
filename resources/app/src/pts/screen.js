/* 满屏节点交互层:商店/奖励/宝箱/篝火/事件共用的全屏画面骨架。纯 DOM,无 noname 依赖。
 * 块级布局(header/body/footer 依次堆叠);按钮样式全内联(不依赖 <style> 注入),footer 用 Flexbox 水平居中+磨砂背景。 */

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
	root.style.cssText = "position:absolute;left:0;top:0;right:0;bottom:0;background:rgba(0,0,0,.7);z-index:2147483000;";

	const panel = document.createElement("div");
	panel.style.cssText = "position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:680px;max-width:92vw;max-height:82vh;background:#161616;border:1px solid #555;border-radius:12px;color:#eee;overflow:hidden;box-sizing:border-box;";

	const hd = document.createElement("div");
	hd.style.cssText = "height:56px;line-height:56px;text-align:center;font-size:20px;font-weight:bold;background:#101216;border-bottom:1px solid #444;";
	hd.textContent = title;

	const body = document.createElement("div");
	body.style.cssText = "overflow-y:auto;padding:16px 20px;";

	const footer = document.createElement("div");
	footer.style.cssText = "display:flex;justify-content:center;align-items:center;gap:12px;flex-wrap:wrap;padding:14px 20px;border-top:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);";

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
	b.style.cssText = "padding:10px 20px;font-size:15px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.08);color:#eee;border-radius:10px;cursor:pointer;";
	if (full) {
		b.style.cssText += "display:block;width:100%;box-sizing:border-box;margin-bottom:8px;";
	}
	if (disabled) {
		b.disabled = true;
		b.style.opacity = ".4";
		b.style.cursor = "default";
	}
	b.onclick = onclick;
	return b;
}
