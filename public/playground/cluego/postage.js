// Postage stamps, one ink each, all the same size. Every stamp has its own drawing of what
// happens at its stop (a speech bubble, a record button, a film strip…), printed with its own
// dither (halftone dots, line screen, crosshatch, square screen, Bayer, Atkinson) in its own
// layout. The thirteenth, issued to the player, is the showpiece: four inks and holographic foil.
// Hidden in every one: a tiny Clueso mark inside the artwork, microtext along an edge, and a
// line of invisible ink that only shows under the UV lamp. Exposed as window.Post.
(() => {
	const I = window.ICONS || {};
	const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

	const PAPER = "#f1ede3";
	const INKS = { red: "#e5323b", ultra: "#2b3ce0", green: "#20703d", pink: "#d93f9c", orange: "#ef5a26", ink: "#1b1a18", violet: "#5a3fd1", teal: "#0f7480", mustard: "#c08c00" };
	// every stamp is 4 × 5; this is the widest one that fits a box
	const fitW = (s, bw, bh) => Math.floor(Math.min(bw, bh * 0.8));

	const art = (s, dark) => `<canvas class="cv" data-spec="${encodeURIComponent(JSON.stringify({ ...s, inkHex: dark ? PAPER : INKS[s.ink] }))}"></canvas>`;

	function html(s, { w = 160, cancel = false, rot = 0 } = {}) {
		const dark = s.variant === "dark";
		const ink = INKS[s.ink] || INKS.ink;
		const name = `<div class="cv-name"><b>${esc(s.title)}</b><span>${esc(s.sub || "Cluego")} · ${esc(s.jp)}</span><i>${esc(s.value)}<small>${esc(s.unit || "")}</small></i></div>`;
		const icon = `<span class="cv-ico">${I[s.icon] || ""}</span>`;
		const foot = `<div class="cv-foot"><span>Cluego</span><span>No. ${esc(s.no)}</span></div>`;
		const cap = `<div class="cv-cap"><b>${esc(s.title)}</b><span>${esc(s.sub || "Cluego")} · ${esc(s.jp)} · No. ${esc(s.no)}</span></div>`;
		const a = art(s, dark);
		const L = {
			top: `<div class="cv-top">${name}${icon}</div><div class="cv-art">${a}</div>${foot}`,
			bleed: `<div class="cv-art full">${a}</div><div class="cv-plate">${name}${icon}</div>`,
			band: `<div class="cv-row"><div class="cv-band"><span class="jp-v">${esc(s.jp)}</span><i class="val">${esc(s.value)}</i></div><div class="cv-art">${a}</div></div>${cap}`,
			ring: `<div class="cv-top">${name}${icon}</div><div class="cv-art ring">${a}</div>${foot}`,
			side: `<div class="cv-side"><div class="cv-art">${a}</div><div class="cv-col">${icon}${name}${foot}</div></div>`,
			numeral: `<div class="cv-num"><i>${esc(s.value)}</i><div class="cv-art inset">${a}</div></div>${cap}${icon}`,
			grid: `<div class="cv-top">${name}${icon}</div><div class="cv-art grid">${a}<i class="gl"></i></div>${foot}`,
			split: `<div class="cv-art">${a}</div><div class="cv-slab"><div class="cv-name"><b>${esc(s.title)}</b><span>${esc(s.sub || "Cluego")} · ${esc(s.jp)}</span></div><i>${esc(s.value)}<small>${esc(s.unit || "")}</small></i></div><span class="cv-chip">${I[s.icon] || ""}</span>`,
			label: `<div class="cv-art framed">${a}</div><div class="cv-label"><div><b>${esc(s.title)}</b><span>${esc(s.sub || "Cluego")} · ${esc(s.jp)} · No. ${esc(s.no)}</span></div><i>${esc(s.value)}<small>${esc(s.unit || "")}</small></i></div>`,
			grand: `<div class="cv-art full">${a}</div><i class="g-foil"></i><div class="g-plate"><div><b>${esc(s.title)}</b><span>${esc(s.sub || "Cluego")} · ${esc(s.jp)} · ${esc(s.date || "")}</span></div><span class="cv-ico">${I.logo || ""}</span></div>`,
		}[s.layout || "top"];
		const micro = s.micro ? `<div class="pst-micro">${esc((s.micro + " ").repeat(14))}</div>` : "";
		const uv = s.uv ? `<div class="pst-uv"><span>${esc(s.uv)}</span></div>` : "";
		return `<div class="pst-wrap" style="--w:${w}px;transform:rotate(${rot}deg)">
			<div class="pst l-${s.layout || "top"} ${dark ? "dark" : ""} ${s.frame || ""}" style="--ink:${ink}"><div class="pst-in">${L}${micro}</div>${uv}</div>
			${cancel && !s.grand ? postmark(s) : ""}
		</div>`;
	}

	// Round date cancel + wavy killer bars, struck in black ink
	function postmark(s) {
		const id = "pm" + Math.random().toString(36).slice(2, 7);
		const waves = [0, 1, 2, 3, 4].map((i) => `<path d="M118 ${40 + i * 10} q9 -6 18 0 t18 0 t18 0 t18 0 t18 0 t18 0" fill="none" stroke="currentColor" stroke-width="2.2"/>`).join("");
		return `<svg class="pst-pm" viewBox="0 0 230 120" style="--pr:${(Math.random() * 30 - 18).toFixed(0)}deg" aria-hidden="true">
			<g filter="url(#st-ink)" color="#1d1b22">
				<circle cx="62" cy="60" r="46" fill="none" stroke="currentColor" stroke-width="2.4"/>
				<circle cx="62" cy="60" r="37" fill="none" stroke="currentColor" stroke-width="1"/>
				<path id="${id}t" d="M 20 60 A 42 42 0 0 1 104 60" fill="none"/><path id="${id}b" d="M 18 60 A 44 44 0 0 0 106 60" fill="none"/>
				<g font-family="Geist Mono, monospace" font-size="8" font-weight="500" letter-spacing="1.6" text-anchor="middle" fill="currentColor">
					<text><textPath href="#${id}t" startOffset="50%">CLUEGO</textPath></text>
					<text><textPath href="#${id}b" startOffset="50%">${esc(s.date || "")}</textPath></text>
				</g>
				<text x="62" y="58" font-family="Nohemi, sans-serif" font-weight="500" font-size="15" text-anchor="middle" fill="currentColor">${esc(s.no)}</text>
				<text x="62" y="72" font-family="Geist Mono, monospace" font-size="6.5" letter-spacing="1" text-anchor="middle" fill="currentColor">${esc((s.short || s.title).toUpperCase())}</text>
				${waves}
			</g>
		</svg>`;
	}

	// ---------- Artwork: a drawing per stop, in greys (dark = ink) ----------
	const imgCache = {};
	const load = (src) => imgCache[src] || (imgCache[src] = new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; }));
	const svgSrc = (name) => "data:image/svg+xml;utf8," + encodeURIComponent((I[name] || "").replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" style="color:#000" '));
	const vgrad = (g, y0, y1, a, b) => { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, a); gr.addColorStop(1, b); return gr; };
	const rrect = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
	const cover = (g, im, a = 1, W = 400, H = 400) => { if (!im) return; const k = Math.max(W / im.width, H / im.height); g.globalAlpha = a; g.drawImage(im, (W - im.width * k) / 2, (H - im.height * k) / 2, im.width * k, im.height * k); g.globalAlpha = 1; };
	const star4 = (g, x, y, r, fill) => { g.beginPath(); for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4 - Math.PI / 2, rr = i % 2 ? r * 0.28 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fillStyle = fill; g.fill(); };

	const ART = {
		async bubble(g) {
			rrect(g, 56, 70, 290, 200, 46); g.fillStyle = vgrad(g, 70, 270, "#1a1a1a", "#7a7a7a"); g.fill();
			g.beginPath(); g.moveTo(110, 262); g.lineTo(160, 262); g.lineTo(84, 336); g.closePath(); g.fill();
			g.fillStyle = "#fff"; [[96, 118, 210], [96, 156, 170], [96, 194, 120]].forEach(([x, y, w]) => { rrect(g, x, y, w, 16, 8); g.fill(); });
			rrect(g, 286, 214, 38, 38, 9); g.fillStyle = "#cfcfcf"; g.fill();
			star4(g, 330, 58, 40, "#000"); star4(g, 362, 120, 20, "#444"); star4(g, 300, 330, 28, "#666");
		},
		async rec(g, s) {
			cover(g, await load(s.img), 0.5);
			const c = g.createRadialGradient(170, 170, 10, 200, 200, 130); c.addColorStop(0, "#9a9a9a"); c.addColorStop(1, "#000");
			g.beginPath(); g.arc(200, 200, 120, 0, Math.PI * 2); g.fillStyle = c; g.fill();
			g.beginPath(); g.arc(200, 200, 56, 0, Math.PI * 2); g.fillStyle = "#e8e8e8"; g.fill();
			[150, 176].forEach((r, i) => { g.beginPath(); g.arc(200, 200, r, 0, Math.PI * 2); g.lineWidth = i ? 4 : 9; g.strokeStyle = "#000"; g.stroke(); });
			g.fillStyle = "#000"; g.font = "500 34px Nohemi, sans-serif"; g.textAlign = "center"; g.fillText("REC", 200, 382);
		},
		async cut(g, s) {
			cover(g, await load(s.img), 0.42);
			g.fillStyle = "#000"; g.font = "500 132px Nohemi, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
			g.fillText("UMM", 200, 205);
			g.save(); g.translate(200, 205); g.rotate(-0.16); g.fillStyle = "#fff"; g.fillRect(-190, -9, 380, 18); g.restore();
			const sc = await load(svgSrc("scissors"));
			if (sc) { g.save(); g.translate(318, 92); g.rotate(-0.5); g.drawImage(sc, -45, -45, 90, 90); g.restore(); }
		},
		async wave(g) {
			for (let i = 0; i < 34; i++) {
				const x = 30 + i * 10.4, h = (0.25 + 0.75 * Math.abs(Math.sin(i * 0.27))) * (0.55 + 0.45 * Math.sin(i * 0.9 + 1)) * 250;
				g.fillStyle = vgrad(g, 200 - h / 2, 200 + h / 2, "#000", "#8a8a8a");
				rrect(g, x, 200 - h / 2, 6, h, 3); g.fill();
			}
			g.beginPath(); g.arc(200, 200, 186, 0, Math.PI * 2); g.lineWidth = 6; g.strokeStyle = "#555"; g.stroke();
		},
		async reel(g, s) {
			g.fillStyle = "#000"; g.fillRect(0, 100, 400, 200);
			g.fillStyle = "#fff"; for (let x = 8; x < 400; x += 30) { rrect(g, x, 112, 16, 18, 3); g.fill(); rrect(g, x, 270, 16, 18, 3); g.fill(); }
			const shot = await load(s.img);
			["#4a4a4a", "#b5b5b5", null, "#777"].forEach((c, i) => {
				const x = 12 + i * 96;
				if (c) { g.fillStyle = vgrad(g, 142, 258, c, "#222"); g.fillRect(x, 142, 88, 116); }
				else if (shot) g.drawImage(shot, 0, 0, shot.width * 0.6, shot.height, x, 142, 88, 116);
			});
			g.fillStyle = "#fff"; g.fillRect(212, 80, 5, 240); g.beginPath(); g.moveTo(202, 80); g.lineTo(227, 80); g.lineTo(214, 98); g.fill();
		},
		async cone(g, s) {
			cover(g, await load(s.img), 1);
			g.save(); g.beginPath(); g.rect(0, 0, 400, 400); g.ellipse(232, 290, 92, 60, 0, 0, Math.PI * 2);
			g.fillStyle = "rgba(0,0,0,.7)"; g.fill("evenodd"); g.restore();
			const cg = g.createLinearGradient(0, 0, 0, 290); cg.addColorStop(0, "rgba(255,255,255,.55)"); cg.addColorStop(1, "rgba(255,255,255,.08)");
			g.beginPath(); g.moveTo(205, 0); g.lineTo(260, 0); g.lineTo(324, 290); g.lineTo(140, 290); g.closePath(); g.fillStyle = cg; g.fill();
		},
		async glyphs(g) {
			[["あ", 0, 0, "#cfcfcf"], ["हि", 200, 0, "#9c9c9c"], ["De", 0, 200, "#8a8a8a"], ["文", 200, 200, "#d6d6d6"]].forEach(([t, x, y, bg]) => {
				g.fillStyle = vgrad(g, y, y + 200, bg, "#fff"); g.fillRect(x, y, 200, 200);
				g.fillStyle = "#000"; g.font = `500 ${t === "De" ? 116 : 128}px "Hiragino Sans", "Noto Sans JP", "Noto Sans Devanagari", Nohemi, sans-serif`;
				g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(t, x + 100, y + 106);
			});
		},
		async steps(g) {
			g.fillStyle = "#fff"; g.fillRect(92, 34, 216, 332); g.lineWidth = 7; g.strokeStyle = "#000"; g.strokeRect(92, 34, 216, 332);
			g.beginPath(); g.moveTo(258, 34); g.lineTo(308, 84); g.lineTo(258, 84); g.closePath(); g.fillStyle = "#888"; g.fill();
			[118, 200, 282].forEach((y, i) => {
				g.beginPath(); g.arc(134, y, 24, 0, Math.PI * 2); g.fillStyle = "#000"; g.fill();
				g.fillStyle = "#fff"; g.font = "500 28px Nohemi, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(String(i + 1), 134, y + 1);
				g.fillStyle = "#555"; g.fillRect(172, y - 14, 112 - i * 18, 10); g.fillStyle = "#aaa"; g.fillRect(172, y + 4, 86, 8);
			});
		},
		async plane(g) {
			g.setLineDash([14, 12]); g.lineWidth = 6; g.strokeStyle = "#000";
			g.beginPath(); g.moveTo(20, 340); g.bezierCurveTo(120, 380, 200, 250, 120, 210); g.bezierCurveTo(60, 180, 90, 120, 160, 150); g.stroke(); g.setLineDash([]);
			g.beginPath(); g.moveTo(150, 190); g.lineTo(370, 70); g.lineTo(260, 250); g.closePath(); g.fillStyle = "#3a3a3a"; g.fill();
			g.beginPath(); g.moveTo(150, 190); g.lineTo(370, 70); g.lineTo(220, 190); g.closePath(); g.fillStyle = "#9a9a9a"; g.fill();
			g.beginPath(); g.moveTo(220, 190); g.lineTo(370, 70); g.lineTo(235, 280); g.closePath(); g.fillStyle = "#000"; g.fill();
			g.lineWidth = 5; [[0.3], [0.9], [1.5]].forEach(([a]) => { g.beginPath(); g.moveTo(370 + Math.cos(-a) * 14, 70 + Math.sin(-a) * 14); g.lineTo(370 + Math.cos(-a) * 44, 70 + Math.sin(-a) * 44); g.stroke(); });
		},
		async bug(g) {
			const B = ["..#.....#..", "...#...#...", "..#######..", ".##.###.##.", "###########", "#.#######.#", "#.#.....#.#", "...##.##...", "..#.....#.."];
			const px = 30, ox = 200 - (11 * px) / 2, oy = 200 - (9 * px) / 2;
			B.forEach((row, y) => [...row].forEach((c, x) => { if (c === "#") { g.fillStyle = y % 2 ? "#000" : "#333"; g.fillRect(ox + x * px, oy + y * px, px, px); } }));
		},
		async bottle(g) {
			for (let i = 0; i < 4; i++) { g.lineWidth = 7; g.strokeStyle = i % 2 ? "#555" : "#000"; g.beginPath(); for (let x = 0; x <= 400; x += 8) g.lineTo(x, 336 + i * 16 + Math.sin(x / 26 + i) * 6); g.stroke(); }
			g.save(); g.translate(200, 200); g.rotate(-0.4);
			g.fillStyle = vgrad(g, -110, 120, "#8a8a8a", "#000"); rrect(g, -62, -60, 124, 190, 40); g.fill(); g.fillRect(-24, -120, 48, 70);
			g.fillStyle = "#444"; g.fillRect(-28, -146, 56, 30);
			g.fillStyle = "#fff"; rrect(g, -30, -10, 60, 92, 6); g.fill(); g.fillStyle = "#999"; [8, 26, 44].forEach((y) => g.fillRect(-18, y, 36, 6));
			g.restore();
		},
		async tide(g) {
			for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(150, 260, 230 - i * 34, Math.PI, Math.PI * 1.85); g.lineWidth = 18; g.strokeStyle = i % 2 ? "#777" : "#000"; g.stroke(); }
			const m = await load(svgSrc("logo")); if (m) g.drawImage(m, 210, 210, 150, 150);
		},
		async shot(g, s) {
			const im = await load(s.img);
			if (!im) return;
			const [x, y, w, h] = s.crop || [0, 0, 1, 1], sw = w * im.width, sh = h * im.height, k = Math.max(400 / sw, 400 / sh);
			g.drawImage(im, x * im.width, y * im.height, sw, sh, (400 - sw * k) / 2, (400 - sh * k) / 2, sw * k, sh * k);
		},
	};

	// ---------- Dither ----------
	const BAYER = [[0, 32, 8, 40, 2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26], [12, 44, 4, 36, 14, 46, 6, 38], [60, 28, 52, 20, 62, 30, 54, 22], [3, 35, 11, 43, 1, 33, 9, 41], [51, 19, 59, 27, 49, 17, 57, 25], [15, 47, 7, 39, 13, 45, 5, 37], [63, 31, 55, 23, 61, 29, 53, 21]];
	function lum(src, cols, o) {
		const rows = Math.max(1, Math.round((cols * src.height) / src.width));
		const t = document.createElement("canvas");
		t.width = cols; t.height = rows;
		const tg = t.getContext("2d");
		tg.fillStyle = "#fff"; tg.fillRect(0, 0, cols, rows);
		tg.imageSmoothingQuality = "high";
		const [x, y, w, h] = o.crop || [0, 0, 1, 1];
		tg.drawImage(src, x * src.width, y * src.height, w * src.width, h * src.height, 0, 0, cols, rows);
		const d = tg.getImageData(0, 0, cols, rows).data, L = new Float32Array(cols * rows);
		for (let i = 0; i < L.length; i++) {
			let l = (0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]) / 255;
			if (o.invert) l = 1 - l;
			L[i] = Math.min(1, Math.max(0, (l - 0.5) * (o.contrast || 1.3) + 0.5 + (o.bias || 0)));
		}
		return { L, rows };
	}
	function dither(c, src, o) {
		const cols = o.cols || 60, { L, rows } = lum(src, cols, o), ink = o.ink;
		const g = c.getContext("2d");
		const cell = (S) => { c.width = cols * S; c.height = rows * S; g.fillStyle = ink; g.strokeStyle = ink; };
		const D = (i, j) => 1 - L[j * cols + i];
		if (o.mode === "dots") {
			cell(7);
			for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const r = D(i, j) * 7 * 0.66; if (r < 0.5) continue; g.beginPath(); g.arc(i * 7 + 3.5, j * 7 + 3.5, r, 0, Math.PI * 2); g.fill(); }
			return;
		}
		if (o.mode === "lines") {
			cell(6);
			for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const t = D(i, j) * 6; if (t < 0.4) continue; g.fillRect(i * 6, j * 6 + (6 - t) / 2, 6.4, t); }
			return;
		}
		if (o.mode === "squares") {
			cell(7);
			for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const s = Math.sqrt(D(i, j)) * 7 * 0.92; if (s < 0.6) continue; g.save(); g.translate(i * 7 + 3.5, j * 7 + 3.5); g.rotate(Math.PI / 4); g.fillRect(-s / 2, -s / 2, s, s); g.restore(); }
			return;
		}
		if (o.mode === "cross") {
			cell(6); g.lineWidth = 1.3; g.lineCap = "square";
			for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
				const v = D(i, j), x = i * 6, y = j * 6;
				if (v > 0.18) { g.beginPath(); g.moveTo(x, y + 6); g.lineTo(x + 6, y); g.stroke(); }
				if (v > 0.45) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 6, y + 6); g.stroke(); }
				if (v > 0.72) { g.beginPath(); g.moveTo(x + 3, y); g.lineTo(x + 3, y + 6); g.stroke(); }
				if (v > 0.9) g.fillRect(x, y, 6, 6);
			}
			return;
		}
		c.width = cols; c.height = rows;
		const out = g.createImageData(cols, rows), od = out.data;
		const [ir, ig, ib] = [1, 3, 5].map((k) => parseInt(ink.slice(k, k + 2), 16));
		const set = (i) => { od[i * 4] = ir; od[i * 4 + 1] = ig; od[i * 4 + 2] = ib; od[i * 4 + 3] = 255; };
		if (o.mode === "bayer") {
			for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) if (L[j * cols + i] < (BAYER[j % 8][i % 8] + 0.5) / 64) set(j * cols + i);
		} else {
			const E = Float32Array.from(L);
			for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
				const k = j * cols + i, v = E[k], n = v < 0.5 ? 0 : 1, err = (v - n) / 8;
				if (!n) set(k);
				[[1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [0, 2]].forEach(([dx, dy]) => { const xx = i + dx, yy = j + dy; if (xx >= 0 && xx < cols && yy < rows) E[yy * cols + xx] += err; });
			}
		}
		g.putImageData(out, 0, 0);
		c.classList.add("px");
	}

	// ---------- No. 13: a four-ink riso print on a sunset, with sakura and foil ----------
	const GRAND = { sky: ["#1f3dff", "#7a4dff", "#ff4fa8"], sun: "#ffe14d", pink: "#ff2f95", deep: "#1a1550", mint: "#5fe3a1" };
	function flower(g, x, y, r, rot) {
		g.save(); g.translate(x, y); g.rotate(rot);
		for (let i = 0; i < 5; i++) {
			g.rotate((Math.PI * 2) / 5);
			g.beginPath(); g.moveTo(0, 0);
			g.bezierCurveTo(-r * 0.62, -r * 0.35, -r * 0.5, -r * 0.98, -r * 0.12, -r); g.lineTo(0, -r * 0.84); g.lineTo(r * 0.12, -r);
			g.bezierCurveTo(r * 0.5, -r * 0.98, r * 0.62, -r * 0.35, 0, 0);
			g.fillStyle = i % 2 ? "#ffd6ea" : "#ffc2e2"; g.fill(); g.lineWidth = r * 0.09; g.strokeStyle = "#e0328c"; g.stroke();
		}
		g.beginPath(); g.arc(0, 0, r * 0.2, 0, Math.PI * 2); g.fillStyle = "#ff4fa8"; g.fill();
		for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + 0.6; g.beginPath(); g.arc(Math.cos(a) * r * 0.34, Math.sin(a) * r * 0.34, r * 0.05, 0, Math.PI * 2); g.fillStyle = "#c2186b"; g.fill(); }
		g.restore();
	}
	function isoSlab(g, x, y, s, z, top, left, right) {
		const P = (u, v, w) => [x + (u - v) * s * 0.866, y + (u + v) * s * 0.5 - w * s];
		const face = (pts, fill) => { g.beginPath(); pts.forEach(([u, v, w], i) => g[i ? "lineTo" : "moveTo"](...P(u, v, w))); g.closePath(); g.fillStyle = fill; g.fill(); g.lineWidth = 2.5; g.strokeStyle = GRAND.deep; g.stroke(); };
		face([[0, 1, z], [1, 1, z], [1, 1, z + 0.32], [0, 1, z + 0.32]], left);
		face([[1, 0, z], [1, 1, z], [1, 1, z + 0.32], [1, 0, z + 0.32]], right);
		face([[0, 0, z + 0.32], [1, 0, z + 0.32], [1, 1, z + 0.32], [0, 1, z + 0.32]], top);
	}
	async function drawGrand(c, s) {
		const W = 800, H = 1000;
		c.width = W; c.height = H;
		const g = c.getContext("2d");
		try { await document.fonts.load("500 200px Nohemi"); } catch {}
		const sky = g.createLinearGradient(0, 0, 0, H);
		GRAND.sky.forEach((col, i) => sky.addColorStop(i / 2, col));
		g.fillStyle = sky; g.fillRect(0, 0, W, H);
		// sunburst
		g.save(); g.translate(400, 600);
		for (let i = 0; i < 24; i++) { g.rotate(Math.PI / 12); if (i % 2) continue; g.beginPath(); g.moveTo(0, 0); g.lineTo(-90, -1000); g.lineTo(90, -1000); g.closePath(); g.fillStyle = "rgba(255,255,255,.08)"; g.fill(); }
		g.restore();
		// a mint halftone that fades out towards the bottom
		for (let y = 14, row = 0; y < H; y += 20, row++) for (let x = 10 + (row % 2) * 10; x < W; x += 20) { const r = 3.6 * (1 - y / (H * 0.75)); if (r > 0.5) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = "rgba(95,227,161,.6)"; g.fill(); } }
		// the sun, and you in it: pink plate a little off register, then deep indigo
		g.beginPath(); g.arc(400, 600, 300, 0, Math.PI * 2); g.fillStyle = GRAND.sun; g.fill();
		const im = s.img ? await load(s.img) : null;
		if (im) {
			const src = document.createElement("canvas"); src.width = 400; src.height = 500;
			const sg = src.getContext("2d"); sg.fillStyle = "#fff"; sg.fillRect(0, 0, 400, 500);
			const k = Math.max(400 / im.width, 500 / im.height); sg.drawImage(im, (400 - im.width * k) / 2, (500 - im.height * k) / 2, im.width * k, im.height * k);
			const plate = (mode, ink, cols, contrast, bias) => { const t = document.createElement("canvas"); dither(t, src, { cols, mode, ink, contrast, bias }); return t; };
			const pink = plate("lines", GRAND.pink, 64, 1.5, 0.04), deep = plate("dots", GRAND.deep, 76, 1.7, 0.14);
			g.save(); g.beginPath(); g.arc(400, 600, 296, 0, Math.PI * 2); g.clip();
			g.globalAlpha = 0.9; g.drawImage(pink, 152, 352, 512, 640); g.globalAlpha = 1;
			g.drawImage(deep, 140, 340, 512, 640);
			g.restore();
		}
		g.beginPath(); g.arc(400, 600, 300, 0, Math.PI * 2); g.lineWidth = 7; g.strokeStyle = GRAND.deep; g.stroke();
		// a sakura branch over the top right, and petals in the air
		g.lineCap = "round"; g.strokeStyle = "#3b1638";
		[[830, 120, 600, 230, 30], [700, 172, 650, 96, 14], [640, 205, 520, 250, 16], [560, 236, 520, 320, 9], [760, 148, 790, 250, 10]].forEach(([x1, y1, x2, y2, w]) => { g.lineWidth = w; g.beginPath(); g.moveTo(x1, y1); g.quadraticCurveTo((x1 + x2) / 2, (y1 + y2) / 2 - 18, x2, y2); g.stroke(); });
		[[612, 222, 46, 0.2], [700, 160, 40, 1], [540, 252, 36, 0.6], [652, 98, 30, 1.4], [778, 228, 34, 0.9], [520, 318, 26, 0.3], [748, 112, 24, 2], [585, 170, 22, 2.6]].forEach((f) => flower(g, ...f));
		[[90, 470, 0.3], [700, 470, 1.2], [90, 760, 2], [720, 820, 0.8], [250, 300, 1.7], [460, 240, 2.4]].forEach(([x, y, r]) => { g.save(); g.translate(x, y); g.rotate(r); g.beginPath(); g.moveTo(0, -16); g.quadraticCurveTo(14, -2, 0, 16); g.quadraticCurveTo(-14, -2, 0, -16); g.fillStyle = "#ffc2e2"; g.fill(); g.lineWidth = 2; g.strokeStyle = "#e0328c"; g.stroke(); g.restore(); });
		// sparkles
		[[330, 120, 30, "#fff"], [470, 80, 16, "#ffe14d"], [120, 640, 22, "#fff"], [690, 640, 18, "#ffe14d"], [560, 410, 12, "#fff"]].forEach(([x, y, r, fill]) => star4(g, x, y, r, fill));
		// No. 13, printed in white over an indigo shadow
		g.textBaseline = "alphabetic"; g.textAlign = "left";
		g.font = "500 250px Nohemi, sans-serif";
		g.fillStyle = GRAND.deep; g.fillText("13", 52, 272);
		g.fillStyle = "#fff"; g.fillText("13", 40, 260);
		g.font = "500 30px Geist Mono, monospace"; g.fillStyle = "#fff"; g.fillText("NO.", 48, 62);
		// hidden: three little layers, stacked, in the bottom right
		[["#c4b8ff", "#8f7cf0", 0], ["#9df0c5", "#33c07f", 0.45], ["#ff8fc8", "#ff4fa8", 0.9]].forEach(([l, r, z]) => isoSlab(g, 712, 742, 64, z, "#fff", l, r));
	}

	async function hydrate(root = document) {
		for (const c of root.querySelectorAll("canvas.cv:not([data-done])")) {
			c.dataset.done = "1";
			const s = JSON.parse(decodeURIComponent(c.dataset.spec));
			if (s.grand) { await drawGrand(c, s); continue; }
			const src = document.createElement("canvas");
			src.width = src.height = 400;
			const g = src.getContext("2d");
			g.fillStyle = "#fff"; g.fillRect(0, 0, 400, 400);
			await (ART[s.art] || ART.shot)(g, s);
			// the hidden mark: a small Clueso logo somewhere in every drawing
			if (s.art && s.art !== "shot") { const m = await load(svgSrc("logo")); if (m) { g.globalAlpha = 0.5; g.drawImage(m, 22, 340, 34, 34); g.globalAlpha = 1; } }
			dither(c, src, { cols: s.cols || 60, mode: s.dither || "dots", ink: s.inkHex, contrast: s.contrast || 1.3, bias: s.bias || 0, invert: s.invert });
		}
	}

	// A copy flies from one element to another (stop → envelope).
	function fly(fromEl, toEl, markup, done) {
		const a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect();
		const el = document.createElement("div");
		el.className = "pst-fly";
		el.innerHTML = markup;
		const size = 130;
		el.style.cssText = `left:${a.left + a.width / 2 - size / 2}px;top:${a.top + a.height / 2 - size * 0.625}px;width:${size}px`;
		document.body.appendChild(el);
		hydrate(el);
		const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
		const anim = el.animate([
			{ transform: "translate(0,0) scale(1) rotate(0deg)", opacity: 1 },
			{ transform: `translate(${dx * 0.45}px, ${dy * 0.45 - 140}px) scale(.85) rotate(-14deg)`, opacity: 1, offset: 0.5 },
			{ transform: `translate(${dx}px, ${dy}px) scale(.32) rotate(10deg)`, opacity: 0.3 },
		], { duration: 950, easing: "cubic-bezier(.5,0,.3,1)" });
		let fired = false;
		const end = () => { if (fired) return; fired = true; el.remove(); done && done(); };
		anim.onfinish = end;
		setTimeout(end, 1050);
	}

	// live camera → dither (for stamp No. 13)
	const live = (c, src, o) => dither(c, src, o);

	window.Post = { html, postmark, hydrate, fly, dither: live, fitW, INKS, PAPER };
})();
