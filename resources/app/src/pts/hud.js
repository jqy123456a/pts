/* 顶栏:爬塔 HP / 金币 / 卡组张数 —— 卡片式大数字块 */
import { lib } from "noname";

export function updateHud(state) {
	const hud = document.querySelector(".pts-hud");
	if (!hud) {
		return;
	}
	const card = (ico, val, color, sub) => {
		return (
			'<div style="display:flex;align-items:center;gap:8px;background:#1a1e24;border:1px solid #3a3f46;border-radius:10px;padding:6px 14px;">' +
			'<div style="font-size:22px;filter:drop-shadow(0 0 4px ' +
			color +
			");\">" +
			ico +
			"</div>" +
			'<div><div style="font-size:19px;font-weight:bold;color:' +
			color +
			';line-height:1.05;">' +
			val +
			"</div>" +
			'<div style="font-size:11px;color:#9a958a;">' +
			sub +
			"</div></div></div>"
		);
	};
	const hpLow = state.hp <= 2;
	const hero =
		'<div style="display:flex;align-items:center;gap:8px;background:#1a1e24;border:1px solid #e8c268;border-radius:10px;padding:6px 14px;">' +
		'<img src="' +
		lib.assetURL +
		"image/character/" +
		state.hero +
		'.jpg" style="width:34px;height:34px;border-radius:50%;object-fit:cover;" onerror="this.style.visibility=\'hidden\'">' +
		'<div><div style="font-size:17px;font-weight:bold;color:#e8e4d8;">' +
		(state.heroName || state.hero) +
		"</div></div></div>";
	hud.innerHTML =
		hero +
		card("❤", state.hp + "/" + state.hpMax, hpLow ? "#ff6b6b" : "#ff8a8a", hpLow ? "体力告急!" : "体力") +
		card("💰", state.gold, "#e8c268", "金币") +
		card("🂠", state.deckCount, "#7ec4ff", "卡组");
}
