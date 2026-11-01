// Cluego. Three islands floating in a neon sky, each a little city with sakura trees and
// three real Clueso screens hovering above it. Solve the screens, read your stamps, open the
// post box, fly to the next island. The player only ever sees one island at a time: at the
// end the clouds part, the three islands turn out to be layers of one thing, every building
// breaks apart, the layers line up, and CLUESO drops in, block by block.
(() => {
	const $ = (s, el = document) => el.querySelector(s);
	const $$ = (s, el = document) => [...el.querySelectorAll(s)];
	const { play, toast, reduced } = Kit;
	const FAST = reduced || /[?&]fast/.test(location.search);
	const TOUCH = matchMedia("(hover: none), (pointer: coarse)").matches;
	const PHONE = () => innerWidth <= 760;
	if (TOUCH) document.body.classList.add("touch");
	// hosted inside a frame (a shared link): no print dialog and no live camera there
	const FRAMED = (() => { try { return window.top !== window.self; } catch { return true; } })();
	if (FRAMED) document.body.classList.add("framed");
	const tap = (t) => (TOUCH ? t.replace(/\bClick\b/g, "Tap").replace(/\bclick\b/g, "tap") : t);
	const OPEN_STAMPS = TOUCH ? "tap the envelope" : "press P";
	const { ISLANDS, SECRETS, PINK, DATE, ic } = window.ROUTE;
	const BY = Object.fromEntries([...ISLANDS, ...SECRETS, PINK].map((i) => [i.id, i]));
	Kit.mountSoundToggle({ dark: true });
	$("#hudLogo").innerHTML = ic("logo", 16);

	// ---------- Isometric drawing ----------
	const T = 56, CO = Math.cos(Math.PI / 6);
	const iso = (x, y, z = 0) => [(x - y) * T * CO, (x + y) * T * 0.5 - z * T];
	const pt = (x, y, z) => iso(x, y, z).map((v) => v.toFixed(1)).join(",");
	const LINE = "#4a3fc8";
	const poly = (pts, fill, extra = "") => `<polygon points="${pts.join(" ")}" fill="${fill}" stroke="${LINE}" stroke-width="1.6" stroke-linejoin="round" ${extra}/>`;
	function box(x, y, z, w, d, h, c, opts = {}) {
		const top = [pt(x, y, z + h), pt(x + w, y, z + h), pt(x + w, y + d, z + h), pt(x, y + d, z + h)];
		const right = [pt(x + w, y, z), pt(x + w, y + d, z), pt(x + w, y + d, z + h), pt(x + w, y, z + h)];
		const left = [pt(x, y + d, z), pt(x + w, y + d, z), pt(x + w, y + d, z + h), pt(x, y + d, z + h)];
		let s = poly(left, c.left) + poly(right, c.right) + poly(top, c.top);
		if (opts.windows) {
			const win = (f) => poly(f, "rgba(255,255,255,.62)", 'stroke-width="1.2"');
			const rows = Math.max(1, Math.floor(h / 1.1));
			for (let r = 0; r < rows; r++) {
				const v0 = (r + 0.32) / rows, v1 = (r + 0.68) / rows;
				const Lf = (u, v) => pt(x + u * w, y + d, z + v * h), Rf = (u, v) => pt(x + w, y + u * d, z + v * h);
				s += win([Lf(0.28, v0), Lf(0.72, v0), Lf(0.72, v1), Lf(0.28, v1)]) + win([Rf(0.28, v0), Rf(0.72, v0), Rf(0.72, v1), Rf(0.28, v1)]);
			}
		}
		if (opts.door) { const Lf = (u, v) => pt(x + u * w, y + d, z + v * h); s += poly([Lf(0.3, 0), Lf(0.7, 0), Lf(0.7, 0.42), Lf(0.3, 0.42)], opts.door); }
		return s;
	}
	function prism(pts2, z, h, c) {
		let s = "";
		for (let i = 0; i < pts2.length; i++) {
			const [ax, ay] = pts2[i], [bx, by] = pts2[(i + 1) % pts2.length];
			const nx = by - ay, ny = -(bx - ax);
			if (nx + ny <= 0) continue;
			s += poly([pt(ax, ay, z), pt(bx, by, z), pt(bx, by, z + h), pt(ax, ay, z + h)], nx > ny ? c.right : c.left);
		}
		return s + poly(pts2.map(([a, b]) => pt(a, b, z + h)), c.top);
	}
	const hex = (cx, cy, r) => [...Array(6)].map((_, i) => [cx + r * Math.cos((i * Math.PI) / 3), cy + r * Math.sin((i * Math.PI) / 3)]);
	function lollipop(x, y) {
		const [sx, sy] = iso(x, y, 1.3);
		return box(x - 0.12, y - 0.12, 0, 0.24, 0.24, 1.1, { top: "#ffc2e2", left: "#d6a2ff", right: "#a98cf0" })
			+ `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${(T * 0.58).toFixed(1)}" fill="#5fe3a1" stroke="${LINE}" stroke-width="1.6"/><circle cx="${(sx - T * 0.17).toFixed(1)}" cy="${(sy - T * 0.18).toFixed(1)}" r="${(T * 0.2).toFixed(1)}" fill="#b9f5d6"/>`;
	}
	// sakura: a dark trunk and a cloud of blossom
	function sakura(x, y, s = 1) {
		const trunk = box(x - 0.13, y - 0.13, 0, 0.26, 0.26, 1.35 * s, { top: "#9c5679", left: "#7a3d5c", right: "#5e2a45" });
		const [cx, cy] = iso(x, y, 1.85 * s), R = T * 0.56 * s;
		const B = [[0, 0, 1], [-0.78, 0.18, 0.74], [0.8, 0.2, 0.74], [-0.38, -0.58, 0.7], [0.42, -0.52, 0.68], [0, 0.5, 0.72]];
		const circ = (fill, k = 1, extra = "") => B.map(([dx, dy, r]) => `<circle cx="${(cx + dx * R).toFixed(1)}" cy="${(cy + dy * R).toFixed(1)}" r="${(r * R * k).toFixed(1)}" fill="${fill}" ${extra}/>`).join("");
		const hi = [[-0.3, -0.35, 0.34], [0.45, -0.2, 0.26], [-0.6, 0.3, 0.22], [0.2, 0.35, 0.2]].map(([dx, dy, r]) => `<circle cx="${(cx + dx * R).toFixed(1)}" cy="${(cy + dy * R).toFixed(1)}" r="${(r * R).toFixed(1)}" fill="#ffe1ee"/>`).join("");
		const dots = [[0.5, 0.15], [-0.15, 0.6], [-0.65, -0.1], [0.15, -0.65]].map(([dx, dy]) => `<circle cx="${(cx + dx * R).toFixed(1)}" cy="${(cy + dy * R).toFixed(1)}" r="${(R * 0.08).toFixed(1)}" fill="#e0328c"/>`).join("");
		const [gx, gy] = iso(x, y, 0);
		const fallen = [[-26, 8], [18, 12], [6, -6], [-10, 16], [30, 2]].map(([dx, dy]) => `<ellipse cx="${gx + dx * s}" cy="${gy + dy * s}" rx="${4 * s}" ry="${2.4 * s}" fill="#ff9fc6"/>`).join("");
		return fallen + trunk + circ(LINE, 1, `stroke="${LINE}" stroke-width="3.4"`) + circ("#ffb3d3") + hi + dots;
	}

	// ---------- CLUESO, in blocks (5 × 7 cells, each cell 2 × 2 units); hidden until the end ----------
	const GLYPH = {
		C: [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
		L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
		U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
		E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
		S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
		O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
	};
	const LCOL = {
		C: { top: "#ffffff", left: "#ffc2e2", right: "#ff8fc8" },
		L: { top: "#ffd6ec", left: "#ff6db8", right: "#e0328c" },
		U: { top: "#eafff2", left: "#9df0c5", right: "#4fd394" },
		E: { top: "#ffffff", left: "#d5ccff", right: "#a998ff" },
		S: { top: "#ffd6ec", left: "#ff6db8", right: "#e0328c" },
		O: { top: "#f4ffd2", left: "#d6f56a", right: "#a9d33c" },
	};
	function letterItems(ch, ox, oy, order) {
		const items = [];
		GLYPH[ch].forEach((row, cy) => [...row].forEach((v, cx) => {
			if (v !== "#") return;
			const x = ox + cx * 2, y = oy + cy * 2, h = 2.4 + ((cx * 7 + cy * 3) % 3) * 0.3;
			items.push({ k: x + y + 2, svg: `<g class="lb" style="--d:${order * 320 + (cy * 5 + cx) * 16}ms">${box(x, y, 0, 2, 2, h, LCOL[ch], { windows: (cx + cy) % 2 === 0 })}</g>` });
		}));
		return items;
	}

	// ---------- The three islands (secretly, three layers) ----------
	const SW = 26, SD = 20, GAP = 1900, HOVER = 46, S = 0.5;
	const TODO = {
		agent: "Type the video you want into the message box, then hit the send arrow.",
		record: "Hit Start recording, then click Profiles, then Filter in the dashboard.",
		script: "Click the four filler words (um, uh, like, you know) to cut them. Then Generate speech.",
		voice: "Bookmark the voice that is calm, conversational, American and male. Press play to listen.",
		timeline: "Click two clips to swap them until it reads Intro, Screen recording, Outro. Then press play.",
		spotlight: "Click the tallest bar in the chart to put the spotlight on it.",
		translate: "Pick Hindi, Japanese and German from the list. Typing in the search box helps.",
		docs: "Flip the switch at the top from Video to Article.",
		share: "Hit the pink Share button, top right of the editor.",
	};
	const LAYERS = [
		{ name: "The draft", letters: "CL", stations: [["agent", 3, 10, 3.3], ["record", 8.5, 10.5, 0], ["script", 20, 16, 3.3]], lock: ["script", "agent", "record"], secret: "bottle", clue: tap("A panel drifted off this island into the clouds. Find it and click it.") },
		{ name: "The edit", letters: "UE", stations: [["voice", 3, 9, 3.3], ["timeline", 7, 12.5, 0], ["spotlight", 20, 10, 3.3]], lock: ["spotlight", "voice", "timeline"], secret: "bugs", clue: "Something is wriggling under this island. Drag the view down to look underneath." },
		{ name: "The release", letters: "SO", stations: [["translate", 8, 4, 3.3], ["docs", 12.5, 18.5, 0], ["share", 20, 12, 0]], lock: ["docs", "share", "translate"], secret: "pink", clue: "This clue unlocks when you finish the whole trip." },
	];
	Object.keys(TODO).forEach((k) => (TODO[k] = tap(TODO[k])));
	const PINK_CLUE = "Type our name. It's on every stamp.";
	const LIFT = { x: 23.2, y: 17.6 };
	const STONES = [[-3.2, 6, 0.6], [-2.6, 15, -0.4], [29, 4, 0.2], [28.4, 13, -0.8], [10, -3, -0.2], [20, 23.5, -1]];
	const STRATA = [{ top: "#ffffff", left: "#b9a8ff", right: "#8f7cf0" }, { top: "#ffffff", left: "#5fe3a1", right: "#33c07f" }, { top: "#fbfaff", left: "#ff8fc8", right: "#ff4fa8" }];
	const SCHEMES = [
		{ top: "#ffffff", left: "#d9d0ff", right: "#a998ff" }, { top: "#ffb8dd", left: "#ff8fc8", right: "#ff5fb0" },
		{ top: "#ff9fd0", left: "#ff5fb0", right: "#e0328c" }, { top: "#b9f5d6", left: "#7eeab3", right: "#3fcf8c" },
		{ top: "#e9fa9e", left: "#d0f05c", right: "#a2cf32" }, { top: "#d9d0ff", left: "#b4a5ff", right: "#8f7cf0" },
	];

	// a random little city: buildings, rooftops, sakura and a few round trees
	function cityItems(L, li) {
		const rnd = Kit.seeded(1000 + li * 77);
		const occ = new Set(), K = (x, y) => x + "," + y;
		const cells = (x0, y0, w, d, pad = 0) => { const out = []; for (let x = Math.floor(x0 - pad); x < Math.ceil(x0 + w + pad); x++) for (let y = Math.floor(y0 - pad); y < Math.ceil(y0 + d + pad); y++) out.push([x, y]); return out; };
		const free = (x0, y0, w, d, pad = 0.4) => x0 >= 0.4 && y0 >= 0.4 && x0 + w <= SW - 0.4 && y0 + d <= SD - 0.4 && cells(x0, y0, w, d, pad).every(([x, y]) => !occ.has(K(x, y)));
		const take = (x0, y0, w, d, pad = 0) => cells(x0, y0, w, d, pad).forEach(([x, y]) => occ.add(K(x, y)));
		const items = [], add = (x, y, w, d, svg) => items.push({ k: x + w / 2 + y + d / 2, svg: `<g class="bx">${svg}</g>` });
		L.stations.forEach(([id, x, y, z]) => {
			if (z > 0) { add(x - 1.4, y - 1.4, 2.8, 2.8, box(x - 1.4, y - 1.4, 0, 2.8, 2.8, z, { top: "#ffffff", left: "#e4ddff", right: "#b4a5ff" }, { windows: true })); take(x - 1.4, y - 1.4, 2.8, 2.8, 0.7); }
			else { const r = Math.min(5, Math.max(2.6, (BY[id].w * S) / 110)); take(x - r, y - r, r * 2, r * 2); }
		});
		take(LIFT.x - 0.4, LIFT.y - 0.4, 3, 3);
		add(LIFT.x, LIFT.y, 2.2, 2.2, box(LIFT.x, LIFT.y, 0, 2.2, 2.2, 4.4, li === 2 ? { top: "#f4ffd2", left: "#d6f56a", right: "#a9d33c" } : { top: "#ffd6ec", left: "#ff6db8", right: "#e0328c" }, { door: "#fff" }));
		for (let n = 0, placed = 0; n < 220 && placed < 22; n++) {
			const w = [1, 2, 2, 3][Math.floor(rnd() * 4)], d = [1, 2, 2, 3][Math.floor(rnd() * 4)];
			const x = Math.round(rnd() * (SW - w)), y = Math.round(rnd() * (SD - d));
			if (!free(x, y, w, d)) continue;
			const h = [1.2, 1.8, 2.4, 2.4, 3, 3.8, 4.8][Math.floor(rnd() * 7)], c = SCHEMES[Math.floor(rnd() * SCHEMES.length)];
			let svg = box(x, y, 0, w, d, h, c, { windows: h > 1.5 });
			if (rnd() < 0.35 && w > 1 && d > 1) svg += box(x + 0.4, y + 0.4, h, w - 0.8, d - 0.8, 0.5 + rnd() * 0.8, SCHEMES[(SCHEMES.indexOf(c) + 2) % SCHEMES.length]);
			else if (rnd() < 0.2) svg += box(x + w / 2 - 0.08, y + d / 2 - 0.08, h, 0.16, 0.16, 1.2, { top: "#fff", left: "#ff5fb0", right: "#e0328c" });
			add(x, y, w, d, svg); take(x, y, w, d); placed++;
		}
		for (let n = 0, placed = 0; n < 200 && placed < 11; n++) {
			const x = 0.8 + rnd() * (SW - 1.6), y = 0.8 + rnd() * (SD - 1.6);
			if (!free(x - 0.6, y - 0.6, 1.2, 1.2, 0.2)) continue;
			const s = 0.85 + rnd() * 0.4;
			items.push({ k: x + y + 0.4, svg: `<g class="bx tree">${placed % 4 === 3 ? lollipop(x, y) : sakura(x, y, s)}</g>` });
			take(x - 0.6, y - 0.6, 1.2, 1.2); placed++;
		}
		return items.sort((p, q) => p.k - q.k);
	}

	function layerSVG(L, li) {
		let rock = "";
		[[22, 16, 3.2], [16, 18, 2.4], [24, 8, 2.6], [8, 19, 2.8], [24.5, 18.5, 4.2]].forEach(([x, y, h], i) => {
			rock += box(x - 1.6, y - 1.6, -3 - h, 3.2, 3.2, h, i % 2 ? { top: "#fff", left: "#8f7cf0", right: "#6c58dc" } : { top: "#fff", left: "#ff8fc8", right: "#e0328c" });
		});
		let slab = "";
		STRATA.forEach((c, i) => (slab += box(0, 0, -3 + i, SW, SD, 1, c)));
		let tiles = "";
		for (let x = 2; x < SW; x += 2) tiles += `<path d="M${pt(x, 0, 0)} L${pt(x, SD, 0)}" stroke="#e4ddff" stroke-width="1.4"/>`;
		for (let y = 2; y < SD; y += 2) tiles += `<path d="M${pt(0, y, 0)} L${pt(SW, y, 0)}" stroke="#e4ddff" stroke-width="1.4"/>`;
		const tileC = ["#ffe1f1", "#dcfbe9", "#ece8ff", "#f4ffd2"];
		[[0, 0], [12, 0], [24, 2], [0, 18], [12, 18], [24, 18], [12, 8], [12, 12], [0, 2], [24, 10]].forEach(([x, y], i) => {
			tiles += poly([pt(x, y, 0), pt(x + 2, y, 0), pt(x + 2, y + 2, 0), pt(x, y + 2, 0)], tileC[i % 4], 'stroke-width="1"');
		});
		const shadows = L.stations.map(([id, x, y, z]) => {
			const [sx, sy] = iso(x, y, z), isl = BY[id], rx = (isl.w * S) / 2.6;
			return `<g class="bx"><ellipse cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${(rx * 0.32).toFixed(1)}" fill="rgba(60,30,180,.16)"/>${z > 0 ? "" : `<path d="M${sx} ${sy} v${-HOVER}" stroke="#fff" stroke-width="2" stroke-dasharray="4 5"/>`}</g>`;
		}).join("");
		let stones = "";
		STONES.forEach(([x, y, z], i) => (stones += `<g class="bx">${prism(hex(x, y, 1.15), z, 0.6, i % 2 ? { top: "#f4ffd2", left: "#c4b8ff", right: "#8f7cf0" } : { top: "#eafff2", left: "#ffc2e2", right: "#ff8fc8" })}</g>`));
		const [a, b] = L.letters, letters = [...letterItems(a, 2, 3, li * 2), ...letterItems(b, 15, 3, li * 2 + 1)].sort((p, q) => p.k - q.k);
		return `<g class="rock">${rock}</g>${slab}${tiles}${shadows}${stones}${cityItems(L, li).map((i) => i.svg).join("")}<g class="letters">${letters.map((i) => i.svg).join("")}</g>`;
	}

	// ---------- Clouds and drifting petals ----------
	function cloudSVG(w) {
		const h = w * 0.42, r = [[0.18, 0.62, 0.2], [0.36, 0.42, 0.26], [0.58, 0.36, 0.3], [0.78, 0.55, 0.22], [0.5, 0.7, 0.3]];
		const blobs = (dy, fill) => r.map(([x, y, rr]) => `<circle cx="${x * w}" cy="${y * h + dy}" r="${rr * w}" fill="${fill}"/>`).join("");
		return `<svg width="${w}" height="${h + 30}" viewBox="0 0 ${w} ${h + 30}" overflow="visible"><g stroke="${LINE}" stroke-width="2">${blobs(12, "#d8d0ff")}</g>${blobs(12, "#d8d0ff")}<g>${blobs(0, "#fff")}</g></svg>`;
	}
	const CLOUDS_BACK = [[-1500, -500, 520], [1150, 330, 700], [-1700, 1400, 700], [1600, 2100, 560], [-1400, 3300, 640], [1500, 4200, 720], [-200, 5600, 800]];
	const CLOUDS_FRONT = [[-1250, 1250, 460], [1150, 3150, 520], [-900, 5200, 600]];
	$("#cloudsBack").innerHTML = CLOUDS_BACK.map(([x, y, w], i) => `<div class="cloud" style="left:${x}px;top:${y}px;--d:${50 + i * 9}s;--dx:${120 + i * 30}px">${cloudSVG(w)}</div>`).join("");
	$("#cloudsFront").innerHTML = CLOUDS_FRONT.map(([x, y, w], i) => `<div class="cloud" style="left:${x}px;top:${y}px;opacity:.95;--d:${40 + i * 7}s;--dx:${-140 - i * 30}px">${cloudSVG(w)}</div>`).join("");
	const petals = $("#petals");
	petals.innerHTML = [...Array(26)].map((_, i) => `<i style="left:${(i * 37) % 100}%;--d:${9 + (i % 7) * 1.4}s;--delay:${-(i * 1.7) % 14}s;--sw:${20 + (i % 5) * 14}px;--s:${0.6 + (i % 4) * 0.22}"></i>`).join("");

	// ---------- Build the world ----------
	const world = $("#world");
	const solved = new Set();
	const keyHandlers = {};
	const api = { play, toast, isSolved: (id) => solved.has(id), onKey: (id, fn) => (keyHandlers[id] = fn), voice: (p, r) => Kit.babble(p, r), solve: (id) => solve(id) };
	const layerEls = [];
	const anchors = {};
	LAYERS.forEach((L, li) => {
		const el = document.createElement("div");
		el.className = "lyr" + (li ? " away" : "");
		el.style.transform = `translate(0px, ${li * GAP}px)`;
		el.innerHTML = `<svg width="2900" height="2200" viewBox="-1350 -650 2900 2200" style="left:-1350px;top:-650px">${layerSVG(L, li)}</svg>
			<div class="lyr-name" style="left:-1330px;top:${iso(0, 20)[1] - 520}px"><span>Island ${String(li + 1).padStart(2, "0")}</span><b>${L.name}</b></div>`;
		world.appendChild(el);
		layerEls.push(el);
		L.stations.forEach(([id, x, y, z], si) => {
			const isl = BY[id], [sx, sy] = iso(x, y, z);
			const w = isl.w * S, h = isl.h * S, left = sx - w / 2, top = sy - h - HOVER;
			const scr = document.createElement("div");
			scr.className = "scr"; scr.id = "isl-" + id; scr.dataset.id = id;
			scr.style.cssText = `left:${left}px;top:${top}px;width:${isl.w}px;height:${isl.h}px;transform:scale(${S});transform-origin:0 0`;
			scr.innerHTML = `<div class="float"><div class="frame"></div><div class="isl-panel">${isl.html()}</div><div class="isl-post"></div></div>`;
			el.appendChild(scr);
			isl.init(scr, api);
			el.insertAdjacentHTML("beforeend", `<div class="mk" data-id="${id}" style="left:${sx}px;top:${top - 22}px"><b>${String(li * 3 + si + 1).padStart(2, "0")}</b><span>${isl.name}</span></div>`);
			anchors[id] = { li, x: left, y: top, w, h };
		});
		const [lx, ly] = iso(LIFT.x + 1.1, LIFT.y + 1.1, 0);
		const card = document.createElement("div");
		card.className = "lift-card sealed"; card.id = "lift-" + li;
		card.style.cssText = `left:${lx + 430}px;top:${ly - 330}px`;
		card.innerHTML = `<h4>${li < 2 ? "Post box · to the next island" : "The last post box"}</h4><p data-msg>Sealed until all three screens on this island are done.</p>
			<div class="order">${L.lock.map((id) => `<div data-for="${id}"><span class="ico" style="width:22px;height:22px">${ICONS[BY[id].post.icon] || ""}</span><i></i></div>`).join("")}</div>
			<div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d) => `<button class="keycap" data-d="${d}">${d}</button>`).join("")}</div>
			<div class="state" data-state>0 of 3 screens done</div>`;
		el.appendChild(card);
		anchors["lift-" + li] = { li, x: lx + 430, y: ly - 330, w: 360, h: 380 };
	});
	const bottle = BY.bottle, bugs = BY.bugs;
	world.insertAdjacentHTML("beforeend", `<div class="bottle-wrap" id="isl-bottle" style="left:1330px;top:420px;width:360px;height:240px">${bottle.html()}<div class="isl-post"></div></div>
		<div class="bugs-wrap" id="isl-bugs" style="left:-560px;top:${GAP + 1700}px"><div class="cap"><b>Here be bugs.</b>Under island 2</div>${bugs.html()}<div class="isl-post"></div></div>`);
	bottle.init($("#isl-bottle"), api);
	bugs.init($("#isl-bugs"), api);
	anchors.bottle = { li: 0, x: 1330, y: 420, w: 223, h: 149, abs: true };
	anchors.bugs = { li: 1, x: -560, y: GAP + 1700, w: 390, h: 270, abs: true };

	// ---------- Camera ----------
	const stage = $("#stage"), cloudsB = $("#cloudsBack"), cloudsF = $("#cloudsFront"), dots = $("#dots");
	let vw = innerWidth, vh = innerHeight;
	const cam = { cx: 100, cy: 2600, z: 0.2 }, tgt = { ...cam };
	let layerAt = 0, focusId = null, unlocked = 1, finaleOn = false, mapOn = false;
	const layerRect = (li) => ({ x: -1150, y: li * GAP - 420, w: 2650, h: 1950 });
	const allRect = () => ({ x: -1500, y: -700, w: 3300, h: 2 * GAP + 2700 });
	// one island plus the sky around it, where its secret hides
	const islandRect = (li) => ({ x: -2000, y: li * GAP - 900, w: 4200, h: 3000 });
	// the three islands side by side, once they line up
	const ROW = (i) => ({ x: i * SW * T * CO, y: i * SW * T * 0.5 });
	const rowRect = () => ({ x: -1100, y: -300, w: 2 * SW * T * CO + 2500, h: 2 * SW * T * 0.5 + 1900 });
	// fit a world rect into the part of the screen the HUD leaves free (margins in px)
	function fitIn(r, m, max = 2.2) {
		const fw = Math.max(80, vw - m.l - m.r), fh = Math.max(80, vh - m.t - m.b);
		const z = Math.min(max, fw / r.w, fh / r.h);
		return { z, cx: r.x + r.w / 2 - (m.l + fw / 2 - vw / 2) / z, cy: r.y + r.h / 2 - (m.t + fh / 2 - vh / 2) / z };
	}
	const missionOpen = () => !$("#mission").classList.contains("min");
	const roomy = () => (PHONE() ? { l: 8, r: 8, t: 112, b: 170 } : { l: 40, r: 40 + (missionOpen() ? 350 : 0), t: 70, b: 110 });
	const tight = () => (PHONE() ? { l: 8, r: 8, t: 60, b: 170 } : { l: 70, r: 70, t: 70, b: 150 });
	// the finished word on the right and the words about it on the left (on a phone: word on top)
	const finaleCam = () => fitIn(rowRect(), PHONE() ? { l: 8, r: 8, t: 54, b: Math.min(vh * 0.62, $("#finale > div").offsetHeight + 36) } : { l: Math.min(620, vw * 0.42), r: 24, t: 40, b: 40 });
	const setTgt = (t) => Object.assign(tgt, t);
	function frame() {
		const k = FAST || pinch ? 1 : drag?.moved ? 0.35 : 0.1;
		cam.cx += (tgt.cx - cam.cx) * k;
		cam.cy += (tgt.cy - cam.cy) * k;
		cam.z = Math.exp(Math.log(cam.z) + (Math.log(tgt.z) - Math.log(cam.z)) * k);
		const z = cam.z;
		world.style.transform = `translate(${vw / 2 - cam.cx * z}px, ${vh / 2 - cam.cy * z}px) scale(${z})`;
		const zb = z * 0.82, zf = z * 1.18, zd = z * 0.4;
		cloudsB.style.transform = `translate(${vw / 2 - cam.cx * zb}px, ${vh / 2 - cam.cy * zb}px) scale(${zb})`;
		cloudsF.style.transform = `translate(${vw / 2 - cam.cx * zf}px, ${vh / 2 - cam.cy * zf}px) scale(${zf})`;
		dots.style.backgroundSize = `${Math.max(8, 30 * zd)}px ${Math.max(8, 30 * zd)}px`;
		dots.style.backgroundPosition = `${vw / 2 - cam.cx * zd}px ${vh / 2 - cam.cy * zd}px`;
		requestAnimationFrame(frame);
	}
	addEventListener("resize", () => {
		// a phone keyboard opening is not a reason to move the camera
		if (TOUCH && document.activeElement?.matches("input, textarea")) return;
		vw = innerWidth; vh = innerHeight;
		if (focusId) focus(focusId, true); else if (finaleOn) setTgt(finaleCam()); else if (mapOn) toggleMap(true, true); else goLayer(layerAt, true);
	});
	// a phone keyboard covers the bottom half: keep the box you're typing in above it
	document.addEventListener("focusin", (e) => {
		if (!TOUCH || !focusId || !e.target.matches("input, textarea") || !e.target.closest(".scr")) return;
		setTimeout(() => {
			const r = worldRect(e.target), top = (window.visualViewport?.height || vh) * 0.3;
			setTgt({ cx: r.x + r.w / 2, cy: r.y + r.h / 2 + (vh / 2 - top) / tgt.z });
		}, 350);
	});

	// ---------- Instructions: the to-do card and the "what to do here" bar ----------
	const BACK = TOUCH ? "" : "<em>Esc · back</em>";
	const how = (title, text) => { $("#tip").innerHTML = title ? `<b>${title}</b><span>${text}</span>${BACK}` : `<span>${text}</span>`; };
	function paintMission() {
		const L = LAYERS[layerAt], doneN = L.stations.filter(([id]) => solved.has(id)).length;
		const secretFound = solved.has(L.secret), secretClue = L.secret === "pink" && document.body.classList.contains("complete") ? `${PINK_CLUE} Type it anywhere on the page, or in the box on the ending screen.` : L.clue;
		const min = !missionOpen();
		$("#mission").innerHTML = `<button class="ms-min" data-min aria-label="${min ? "Show" : "Hide"} the to-do list">${min ? "+" : "–"}</button>
			<div class="ms-head" data-min><span>Island ${layerAt + 1} of 3 · to do</span><b>${L.name}</b><em class="ms-sum">${doneN} of 3 screens done${liftOpen[layerAt] ? " · post box open" : ""} · ${TOUCH ? "tap" : "click"} for what to do</em></div>
			<ol class="ms-list">
				${L.stations.map(([id], si) => `<li class="${solved.has(id) ? "done" : ""}" data-go="${id}"><i>${String(layerAt * 3 + si + 1).padStart(2, "0")}</i><div><b>${BY[id].name}</b><span>${TODO[id]}</span></div></li>`).join("")}
				<li class="${liftOpen[layerAt] ? "done" : ""} lift" data-go="lift-${layerAt}"><i>✉</i><div><b>${layerAt < 2 ? "Open the post box" : "Open the last post box"}</b><span>${doneN < 3 ? `Do all three screens first (${doneN} of 3 done). ` : ""}Each screen gives you a stamp with a number on it. Open your stamps (${OPEN_STAMPS}), then type the numbers in the order of the icons on the post box.</span></div></li>
				<li class="secret ${secretFound ? "done" : ""}"><i>★</i><div><b>Secret stamp ${secretFound ? "· found" : ""}</b><span>${secretClue}</span></div></li>
			</ol>`;
	}
	document.addEventListener("click", (e) => {
		if (e.target.closest("[data-min]")) { $("#mission").classList.toggle("min"); paintMission(); if (!PHONE() && !focusId && !mapOn && !finaleOn) goLayer(layerAt, true); return; }
		const go = e.target.closest("[data-go]");
		if (go && !finaleOn) focus(go.dataset.go);
	});

	// on a phone, wide screens zoom to the part you need first
	const HOT = { agent: "[data-input]", record: "[data-start]", script: ".filler", voice: "[data-bm]", timeline: "[data-main]", spotlight: "[data-stage]", translate: "[data-n]", docs: "[data-mode]", share: ".fe-share" };
	function worldRect(el) {
		const m = new DOMMatrix(getComputedStyle(world).transform), r = el.getBoundingClientRect();
		return { x: (r.left - m.e) / m.a, y: (r.top - m.f) / m.a, w: r.width / m.a, h: r.height / m.a };
	}
	function focus(id, quiet) {
		const a = anchors[id];
		if (!a || a.li !== layerAt || finaleOn) return;
		focusId = id;
		$$(".scr, .lift-card").forEach((s) => s.classList.toggle("focused", s.id === "isl-" + id || s.id === id));
		document.body.classList.add("focusing");
		if (PHONE() && missionOpen()) { $("#mission").classList.add("min"); paintMission(); }
		const off = a.abs ? 0 : a.li * GAP, r = { x: a.x, y: a.y + off, w: a.w, h: a.h }, m = tight();
		let f = fitIn(r, m, id.startsWith("lift") ? 1.6 : 2.4), small = false;
		const hot = TOUCH && HOT[id] && $(HOT[id], $("#isl-" + id));
		if (hot && f.z * S < 0.5) {
			const hr = worldRect(hot), z = 0.56 / S, half = (vw - m.l - m.r) / 2 / z;
			const cx = Math.min(Math.max(hr.x + hr.w / 2, r.x + half), r.x + r.w - half);
			f = { z, cx, cy: hr.y + hr.h / 2 - (m.t - m.b) / 2 / z };
			small = true;
		}
		setTgt(f);
		if (id.startsWith("lift")) how("The post box", `Open your stamps (${OPEN_STAMPS}). Find the stamp for each icon on the post box and type its number, left to right.`);
		else if (BY[id]) how(BY[id].name, (TODO[id] || tap("Click it to collect a secret stamp.")) + (small ? " Pinch or drag to see the rest of the screen, or turn your phone sideways." : ""));
		if (!quiet) play("whoosh");
	}
	function unfocus() {
		focusId = null;
		$$(".scr, .lift-card").forEach((s) => s.classList.remove("focused"));
		document.body.classList.remove("focusing");
		goLayer(layerAt, true);
	}
	// only the island you're on exists, as far as the player knows
	function showIsland(li) {
		layerEls.forEach((el, i) => el.classList.toggle("away", i !== li));
		document.body.dataset.at = li;
	}
	// a bank of cloud sweeps across the screen and the world changes behind it
	function wipe(mid, label = "") {
		const w = $("#wipe");
		$("#wipeLabel").textContent = label;
		w.classList.add("on");
		play("whoosh");
		setTimeout(() => { mid(); Object.assign(cam, tgt); setTimeout(() => w.classList.remove("on"), FAST ? 0 : 450); }, FAST ? 0 : 850);
	}
	function goLayer(li, quiet) {
		if (li >= unlocked) return;
		const moving = li !== layerAt && !quiet;
		const go = () => {
			layerAt = li; focusId = null; mapOn = false;
			$$(".scr, .lift-card").forEach((s) => s.classList.remove("focused"));
			document.body.classList.remove("focusing");
			if (!finaleOn) showIsland(li);
			if (moving && PHONE()) $("#mission").classList.remove("min");
			setTgt(fitIn(layerRect(li), roomy()));
			paintHUD(); paintMission();
			how("", TOUCH ? "Drag to look around · pinch to zoom · tap a screen to open it · your to-do list is at the top" : "Drag to look around · scroll to zoom · click a screen to open it · the card on the right says what to do");
		};
		if (moving) wipe(go, `Island ${li + 1} · ${LAYERS[li].name}`);
		else { go(); if (!quiet) play("pop"); }
	}
	function paintHUD() {
		$("#leg").textContent = finaleOn ? "Clueso" : `Island ${layerAt + 1} · ${LAYERS[layerAt].name}`;
		$("#stack").innerHTML = LAYERS.map((L, i) => `<button class="${i === layerAt && !finaleOn ? "on" : ""} ${liftOpen[i] ? "done" : ""}" data-l="${i}" ${i >= unlocked ? "disabled" : ""} aria-label="Island ${i + 1}">${i + 1}</button>`).join("");
	}
	$("#stack").addEventListener("click", (e) => { const b = e.target.closest("[data-l]"); if (b && !finaleOn) goLayer(+b.dataset.l); });

	// drag to pan, wheel or pinch to zoom, click to focus
	let drag = null, pinch = null;
	const pts = new Map();
	stage.addEventListener("pointerdown", (e) => {
		// on a phone the to-do card folds away as soon as you reach for the island
		if (PHONE() && missionOpen()) { $("#mission").classList.add("min"); paintMission(); }
		pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
		if (pts.size === 2) {
			const [p, q] = [...pts.values()];
			pinch = { d: Math.hypot(p.x - q.x, p.y - q.y) || 1, z: tgt.z, mx: (p.x + q.x) / 2, my: (p.y + q.y) / 2, cx: tgt.cx, cy: tgt.cy };
			drag = null;
			stage.classList.add("dragging");
			return;
		}
		if (e.target.closest("button, input, textarea, .bugs-wrap, .bottle-wrap")) return;
		if (e.pointerType !== "touch" && e.target.closest(".scr.focused, .lift-card.focused")) return;
		drag = { x: e.clientX, y: e.clientY, cx: tgt.cx, cy: tgt.cy, moved: false };
	});
	addEventListener("pointermove", (e) => {
		if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
		if (pinch && pts.size >= 2) {
			const [p, q] = [...pts.values()], d = Math.hypot(p.x - q.x, p.y - q.y);
			const nz = Math.min(3, Math.max(0.1, (pinch.z * d) / pinch.d)), mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
			const wx = (pinch.mx - vw / 2) / pinch.z + pinch.cx, wy = (pinch.my - vh / 2) / pinch.z + pinch.cy;
			setTgt({ z: nz, cx: wx - (mx - vw / 2) / nz, cy: wy - (my - vh / 2) / nz });
			return;
		}
		if (!drag) return;
		const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
		if (!drag.moved && Math.hypot(dx, dy) < 6) return;
		drag.moved = true;
		stage.classList.add("dragging");
		tgt.cx = drag.cx - dx / cam.z; tgt.cy = drag.cy - dy / cam.z;
	});
	const release = (e) => { pts.delete(e.pointerId); if (pinch && pts.size < 2) { pinch = null; stage.classList.remove("dragging"); } };
	addEventListener("pointerup", (e) => {
		release(e);
		if (!drag) return;
		const was = drag; drag = null;
		stage.classList.remove("dragging");
		if (was.moved || finaleOn) return;
		const scr = e.target.closest(".scr:not(.focused)"), mk = e.target.closest(".mk"), lift = e.target.closest(".lift-card:not(.focused)");
		if (scr) focus(scr.dataset.id); else if (mk) focus(mk.dataset.id); else if (lift) focus(lift.id);
	});
	addEventListener("pointercancel", (e) => { release(e); drag = null; stage.classList.remove("dragging"); });
	stage.addEventListener("wheel", (e) => {
		e.preventDefault();
		const nz = Math.min(2.6, Math.max(0.1, tgt.z * Math.exp(-e.deltaY * 0.0014)));
		const wx = (e.clientX - vw / 2) / tgt.z + tgt.cx, wy = (e.clientY - vh / 2) / tgt.z + tgt.cy;
		tgt.cx = wx - (e.clientX - vw / 2) / nz; tgt.cy = wy - (e.clientY - vh / 2) / nz; tgt.z = nz;
	}, { passive: false });
	$("#backBtn").addEventListener("click", unfocus);
	$("#mapBtn").addEventListener("click", () => toggleMap());
	function toggleMap(on = !mapOn, quiet) {
		mapOn = on;
		if (on) {
			setTgt(finaleOn ? fitIn(rowRect(), { l: 20, r: 20, t: 20, b: 20 }) : fitIn(islandRect(layerAt), roomy()));
			if (!finaleOn) how("", `All of island ${layerAt + 1} and the sky around it · ${TOUCH ? "tap" : "press"} Map again to come back`);
		} else if (finaleOn) setTgt(finaleCam()); else goLayer(layerAt, true);
		if (!quiet) play(on ? "whoosh" : "pop");
	}

	// ---------- Stamps, the envelope, the album ----------
	const SECRET_IDS = ["bottle", "bugs", "pink"];
	const MAIN = ISLANDS.map((i) => i.id);
	const ORDER = [...MAIN, ...SECRET_IDS, "you"];
	const FIG = { agent: "the agent panel", record: "the recorder", script: "the transcript panel", voice: "the voice list", timeline: "the timeline", spotlight: "spotlight + zoom", translate: "Magic translate", docs: "video → article", share: "the editor, all done", bugs: "a comment thread", bottle: "the upload panel", pink: "the Clueso mark", you: "your camera" };
	const MEANING = { "エージェント": "agent", "録画": "recording", "台本": "script", "声": "voice", "編集": "editing", "注目": "attention", "翻訳": "translation", "手順書": "how-to guide", "共有": "sharing", "虫": "bug", "漂流": "adrift", "桃色": "peach pink", "あなた": "you" };
	const DITHER = { dots: "halftone dots", bayer: "ordered (Bayer) dither", atkinson: "Atkinson dither", lines: "line screen", cross: "crosshatch", squares: "square screen" };
	let YOU = null;
	const spec = (id) => (id === "you" ? YOU : { ...BY[id].post, date: DATE });
	const slotHTML = (id) => `<div class="slot" data-k="${id}" data-no="${id === "you" ? "13" : BY[id].post.no}" data-name="${id === "you" ? "you" : BY[id].secret ? "secret" : BY[id].name}"></div>`;
	const bookHTML = () => `<div class="book">
		<header><h2>Collection <span>· Cluego</span></h2><label class="who">Collector <input class="col-name" maxlength="26" placeholder="Sign here"></label></header>
		<div class="strip"><span class="strip-label">Island 1 · the draft</span>${MAIN.slice(0, 3).map(slotHTML).join("")}${slotHTML("bottle")}</div>
		<div class="strip"><span class="strip-label">Island 2 · the edit</span>${MAIN.slice(3, 6).map(slotHTML).join("")}${slotHTML("bugs")}</div>
		<div class="strip"><span class="strip-label">Island 3 · the release</span>${MAIN.slice(6, 9).map(slotHTML).join("")}${slotHTML("pink")}</div>
		<div class="strip thirteen"><span class="strip-label">No. 13 · issued to the collector</span>${slotHTML("you")}</div>
	</div>`;
	$("#modalBook").innerHTML = bookHTML();
	function scaleBook() {
		const km = PHONE() ? 1 : Math.min(1, (innerWidth - 32) / 860, (innerHeight - 40) / Math.max(400, $("#colWrap").offsetHeight));
		$("#colWrap").style.transform = `scale(${km})`;
	}
	const rots = {};
	function fillSlots(id, root = document) {
		rots[id] ??= Math.random() * 6 - 3;
		const s = spec(id);
		$$(`.slot[data-k="${id}"]`, root).forEach((el) => {
			el.classList.add("has");
			el.innerHTML = Post.html(s, { w: Post.fitW(s, 132, 164), cancel: true, rot: rots[id] });
			el.firstElementChild.classList.add("struck");
		});
		Post.hydrate(root);
	}
	document.addEventListener("input", (e) => {
		if (!e.target.matches(".col-name")) return;
		$$(".col-name").forEach((i) => i !== e.target && (i.value = e.target.value));
		$("#envTo").textContent = "To: " + (e.target.value.trim() || "you");
	});
	const openModal = (id, on = true) => {
		const m = $("#" + id);
		m.classList.toggle("open", on); m.setAttribute("aria-hidden", String(!on));
		play(on ? "paper" : "pop");
	};
	const openCol = (on = true) => { scaleBook(); openModal("colModal", on); };
	$("#env").addEventListener("click", () => openCol(true));
	$$("[data-close]").forEach((b) => b.addEventListener("click", () => { openModal("colModal", false); openModal("svModal", false); }));
	$$(".modal").forEach((m) => m.addEventListener("click", (e) => { if (e.target === m || e.target.classList.contains("col-wrap")) openModal(m.id, false); }));

	// the stamp viewer, with a UV lamp for the hidden ink
	let svAt = 0;
	const owned = () => ORDER.filter((id) => (id === "you" ? !!YOU : solved.has(id)));
	function openStamp(id) { svAt = Math.max(0, owned().indexOf(id)); paintViewer(); openModal("svModal", true); }
	function paintViewer() {
		const list = owned();
		if (!list.length) return;
		const id = list[((svAt % list.length) + list.length) % list.length], s = spec(id), isl = BY[id];
		$("#svStamp").innerHTML = Post.html(s, { w: Post.fitW(s, Math.min(460, innerWidth - (PHONE() ? 56 : 80)), innerHeight - (PHONE() ? 260 : 180)), cancel: true });
		$("#svStamp .pst-wrap").classList.add("struck");
		Post.hydrate($("#svStamp"));
		const li = LAYERS.findIndex((L) => L.stations.some(([sid]) => sid === id) || L.secret === id);
		const where = id === "you" ? "Issued at the very end" : isl?.secret ? `A secret, island ${li + 1}` : `Island ${li + 1} · ${isl.name}`;
		$("#svInfo").innerHTML = `<div class="no">Cluego · No. ${s.no} · ${list.indexOf(id) + 1} of ${list.length} collected</div>
			<h2>${s.title}</h2><div class="jp">${s.jp} · “${MEANING[s.jp] || ""}”</div>
			<dl><dt>Issued at</dt><dd>${where}</dd><dt>Printed from</dt><dd>${FIG[id] || ""}${id === "you" ? "" : ", a real Clueso screen"}</dd><dt>Print</dt><dd>${s.grand ? "Four inks, halftone and line screen, holographic foil" : `One ink, ${DITHER[s.dither || "dots"]}`}</dd><dt>Value</dt><dd>${s.value}${s.unit || ""}${MAIN.includes(id) ? " · you'll need this for a post box" : ""}</dd><dt>Postmarked</dt><dd>${DATE}</dd></dl>
			${s.uv ? `<div class="uv-tip">◐ ${TOUCH ? "Drag your finger over the stamp" : "Hover the stamp"}. There's hidden ink under the UV lamp.</div>` : ""}`;
		play("paper");
	}
	$("#svPrev").addEventListener("click", () => { svAt--; paintViewer(); });
	$("#svNext").addEventListener("click", () => { svAt++; paintViewer(); });
	$("#svStamp").addEventListener("pointermove", (e) => {
		const w = $("#svStamp .pst-wrap"), uv = $("#svStamp .pst-uv"); if (!w) return;
		const r = w.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
		w.style.transform = `rotateY(${x * 14}deg) rotateX(${-y * 14}deg)`;
		if (uv) { const u = uv.getBoundingClientRect(); uv.style.setProperty("--mx", `${e.clientX - u.left}px`); uv.style.setProperty("--my", `${e.clientY - u.top}px`); }
		$("#svStamp").classList.add("uv-on");
	});
	$("#svStamp").addEventListener("pointerleave", () => { const w = $("#svStamp .pst-wrap"); if (w) w.style.transform = ""; $("#svStamp").classList.remove("uv-on"); });
	document.addEventListener("click", (e) => {
		const s = e.target.closest(".slot.has, .isl-post .pst-wrap");
		if (!s) return;
		const id = s.closest(".slot")?.dataset.k || s.closest("[id^='isl-']")?.id.replace("isl-", "");
		if (id) { e.stopPropagation(); openStamp(id); }
	}, true);

	// ---------- Solving ----------
	const liftOpen = [false, false, false];
	function solve(id) {
		if (solved.has(id)) return;
		solved.add(id);
		const s = spec(id);
		const n = MAIN.filter((k) => solved.has(k)).length;
		fillSlots(id);
		$("#count").textContent = `${n} / 9`;
		$(`.mk[data-id="${id}"]`)?.classList.add("done");
		const corner = $("#envCorner");
		const land = () => {
			corner.innerHTML = Post.html(s, { w: Post.fitW(s, 52, 64), rot: 4 });
			Post.hydrate(corner);
			const env = $("#env");
			env.classList.remove("bump"); void env.offsetWidth; env.classList.add("bump");
			play("pop");
		};
		const host = $("#isl-" + id);
		if (host) {
			host.classList.add("done");
			const box2 = $(".isl-post", host);
			box2.innerHTML = Post.html(s, { w: Post.fitW(s, 170, 210), cancel: true, rot: Math.random() * 14 - 7 });
			const w = box2.firstElementChild;
			w.classList.add("pasted");
			Post.hydrate(box2);
			play("paper");
			requestAnimationFrame(() => w.classList.add("struck"));
			setTimeout(() => play("stamp"), reduced ? 0 : 560);
			if (MAIN.includes(id)) setTimeout(() => play("win"), 900);
			setTimeout(() => { play("whoosh"); Post.fly(box2, $("#env"), Post.html(s, { w: Post.fitW(s, 130, 150) }), land); }, reduced ? 50 : 1500);
		} else land();
		if (SECRET_IDS.includes(id)) setTimeout(() => toast(`<b>Secret stamp found.</b> ${SECRET_IDS.filter((k) => solved.has(k)).length} of 3.`, 3200), 1400);
		LAYERS.forEach((L, li) => {
			const done = L.stations.filter(([sid]) => solved.has(sid)).length;
			const card = $("#lift-" + li);
			card.querySelector("[data-state]").textContent = liftOpen[li] ? "Open" : `${done} of 3 screens done`;
			L.lock.forEach((sid) => { if (solved.has(sid)) card.querySelector(`[data-for="${sid}"]`).style.boxShadow = "inset 0 0 0 1.5px #5fe3a1"; });
			if (done === 3 && card.classList.contains("sealed")) {
				card.classList.remove("sealed");
				card.querySelector("[data-msg]").textContent = `Open your stamps (${OPEN_STAMPS}). Type the number on each stamp, in the order of these icons.`;
				setTimeout(() => { if (!liftOpen[li] && !finaleOn) toast(`<b>Island ${li + 1} done.</b> The post box is waiting. Its code is on your stamps.`, 4200); }, 2200);
			}
		});
		paintMission();
		paintSecrets();
		if (ORDER.slice(0, 12).every((k) => solved.has(k)) && !document.body.classList.contains("all12")) {
			document.body.classList.add("all12");
			setTimeout(unlock13, finaleOn ? 3000 : 5000);
		}
	}

	// ---------- Lift locks ----------
	const entry = ["", "", ""], tries = [0, 0, 0];
	function press(li, d) {
		const card = $("#lift-" + li);
		if (card.classList.contains("sealed") || liftOpen[li]) { if (card.classList.contains("sealed")) toast("Do all three screens on this island first."); return; }
		const slots = card.querySelectorAll(".order i");
		const at = entry[li].length;
		if (at >= 3) return;
		entry[li] += d;
		slots[at].textContent = d; slots[at].classList.add("on");
		play("key");
		if (entry[li].length < 3) return;
		const code = LAYERS[li].lock.map((id) => BY[id].post.value).join("");
		if (entry[li] === code) {
			liftOpen[li] = true;
			card.classList.add("open");
			card.querySelector("[data-state]").textContent = "Open";
			play("ding");
			setTimeout(() => descend(li), 700);
		} else {
			tries[li]++;
			card.classList.remove("no"); void card.offsetWidth; card.classList.add("no");
			play("wrong");
			setTimeout(() => { entry[li] = ""; slots.forEach((s) => { s.textContent = ""; s.classList.remove("on"); }); }, 500);
			if (tries[li] === 2) toast(`Hint: open your stamps (${OPEN_STAMPS}). The big number on each stamp is its value. Match the icons, left to right.`, 5500);
		}
	}
	document.addEventListener("click", (e) => {
		const k = e.target.closest(".lift-card [data-d]");
		if (k) press(+k.closest(".lift-card").id.split("-")[1], k.dataset.d);
	});
	function descend(li) {
		if (li === 2) return startFinale();
		unlocked = Math.max(unlocked, li + 2);
		focusId = null;
		document.body.classList.remove("focusing");
		$$(".scr, .lift-card").forEach((s) => s.classList.remove("focused"));
		toast("<b>Posted.</b> Off to the next island…", 1600);
		setTimeout(() => {
			goLayer(li + 1);
			setTimeout(() => toast(`<b>Island ${li + 2}: ${LAYERS[li + 1].name}.</b> Three more screens. ${PHONE() ? "Your to-do list is at the top." : "The card on the right says what to do."}`, 3600), FAST ? 0 : 1300);
		}, FAST ? 0 : 500);
	}

	// ---------- Finale: the clouds part, the islands turn out to be layers, CLUESO drops in ----------
	let breakAnims = [];
	const UI_SEL = ".scr, .mk, .lift-card, .lyr-name, .bottle-wrap, .bugs-wrap";
	const later = (ms, fn) => setTimeout(fn, FAST ? Math.min(ms, 60) : ms);
	function burstPetals() {
		const host = $("#petalBurst");
		host.innerHTML = "";
		for (let i = 0; i < 90; i++) {
			const p = document.createElement("i");
			host.appendChild(p);
			const a = Math.random() * Math.PI * 2, d = 200 + Math.random() * Math.max(vw, vh) * 0.7;
			p.animate([
				{ transform: "translate(0,0) rotate(0deg) scale(.4)", opacity: 1 },
				{ transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d * 0.7 + 260}px) rotate(${Math.random() * 720}deg) scale(1)`, opacity: 0 },
			], { duration: 2200 + Math.random() * 1600, easing: "cubic-bezier(.2,.7,.4,1)", fill: "forwards" });
		}
	}
	function startFinale() {
		finaleOn = true; focusId = null; mapOn = false;
		document.body.classList.remove("focusing");
		$$(".scr, .lift-card").forEach((s) => s.classList.remove("focused"));
		// 1. the clouds part on all three islands at once, one above the other: layers, all along
		wipe(() => {
			document.body.classList.add("finale");
			$$(UI_SEL).forEach((el) => { el.style.transition = "none"; el.style.opacity = "0"; el.style.pointerEvents = "none"; });
			layerEls.forEach((el) => { el.classList.remove("away"); el.style.transition = "none"; el.style.zIndex = ""; });
			setTgt(fitIn(allRect(), { l: 30, r: 30, t: 30, b: 30 }));
			$("#reveal").classList.add("on");
			paintHUD();
		});
		// 2. every building, tree and stone breaks loose and falls away
		later(3000, () => {
			$("#reveal").classList.remove("on");
			breakAnims = $$(".lyr .bx").map((g) => {
				const dx = (Math.random() - 0.5) * 900, up = 200 + Math.random() * 500, r = (Math.random() - 0.5) * 540;
				return g.animate([
					{ transform: "translate(0px,0px) rotate(0deg)", opacity: 1 },
					{ transform: `translate(${dx * 0.4}px, ${-up}px) rotate(${r * 0.3}deg)`, opacity: 1, offset: 0.35 },
					{ transform: `translate(${dx}px, ${1400 + Math.random() * 900}px) rotate(${r}deg)`, opacity: 0 },
				], { duration: 1500 + Math.random() * 900, delay: Math.random() * 600, easing: "cubic-bezier(.3,.1,.6,1)", fill: "forwards" });
			});
			burstPetals();
			[0, 160, 320, 520, 760].forEach((t, i) => setTimeout(() => play(i % 2 ? "stamp" : "whoosh"), t));
		});
		// 3. the three layers glide into one line
		later(4800, () => {
			layerEls.forEach((el, i) => { el.style.zIndex = i + 1; el.style.transition = "transform 2s cubic-bezier(.7,0,.2,1)"; el.style.transform = `translate(${ROW(i).x}px, ${ROW(i).y}px)`; });
			setTgt(finaleCam());
			play("whoosh");
			later(1900, () => play("stamp"));
		});
		// 4. CLUESO drops in, block by block
		later(7000, () => {
			document.body.classList.add("spell");
			for (let i = 0; i < 6; i++) later(300 + i * 320, () => play(i % 2 ? "stamp" : "key"));
		});
		later(9400, () => {
			document.body.classList.add("complete");
			$("#finale").classList.add("on");
			play("win");
			paintHUD(); paintSecrets();
			setTgt(finaleCam());
			if (!solved.has("pink") && !PHONE()) toast(`<b>One more secret stamp.</b> ${PINK_CLUE}`, 6000);
		});
	}
	function undoFinale() {
		const back = LAYERS.findIndex((L) => !solved.has(L.secret) && L.secret !== "pink");
		wipe(() => {
			breakAnims.forEach((a) => a.cancel()); breakAnims = [];
			finaleOn = false;
			document.body.classList.remove("finale", "spell");
			$("#finale").classList.remove("on");
			$("#reveal").classList.remove("on");
			$$(UI_SEL).forEach((el) => { el.style.opacity = ""; el.style.pointerEvents = ""; el.style.transition = ""; });
			layerEls.forEach((el, i) => { el.style.transition = "none"; el.style.transform = `translate(0px, ${i * GAP}px)`; el.style.zIndex = ""; });
			unlocked = 3;
			layerAt = -1;
			goLayer(back >= 0 ? back : 0, true);
		}, "Back to the islands");
	}
	function paintSecrets() {
		const box3 = $("#secrets");
		if (!box3) return;
		const n = SECRET_IDS.filter((k) => solved.has(k)).length;
		box3.innerHTML = `<b>Secret stamps · ${n} of 3</b>` + LAYERS.map((L, i) => {
			const ok = solved.has(L.secret), clue = L.secret === "pink" ? PINK_CLUE : `Island ${i + 1}: ${L.clue}`;
			return `<span class="${ok ? "ok" : ""}">${ok ? "★" : "☆"} ${ok ? BY[L.secret].post.title : clue}</span>`;
		}).join("")
			+ (solved.has("pink") ? "" : `<input class="pink-in" placeholder="Type it here" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Type the secret word">`)
			+ (solved.has("bottle") && solved.has("bugs") ? "" : `<button class="btn" id="goLook">Go back and look</button>`);
		$("#goLook")?.addEventListener("click", undoFinale);
	}
	$("#finaleAlbum").addEventListener("click", () => openCol(true));
	$("#endBtn").addEventListener("click", () => { if (!finaleOn) startFinale(); });

	// ---------- Stamp No. 13: you ----------
	let stream = null, liveRAF = 0;
	const u13 = $("#u13"), u13cv = $("#u13cv"), frameCv = document.createElement("canvas");
	function unlock13() {
		openModal("colModal", false); openModal("svModal", false);
		u13.classList.add("open"); u13.setAttribute("aria-hidden", "false");
		play("whoosh");
		const burst = $("#u13Burst");
		burst.innerHTML = "";
		const ringR = Math.min(innerWidth, innerHeight) * 0.46;
		ORDER.slice(0, 12).forEach((id, i) => {
			const s = spec(id), wrap = document.createElement("div");
			wrap.innerHTML = Post.html(s, { w: Post.fitW(s, 120, 140), cancel: true });
			const el = wrap.firstElementChild; el.classList.add("struck");
			burst.appendChild(el);
			const a = (i / 12) * Math.PI * 2, x = Math.cos(a) * ringR, y = Math.sin(a) * ringR * 0.82;
			const fx = (Math.random() - 0.5) * innerWidth * 1.2, fy = (Math.random() - 0.5) * innerHeight * 1.2;
			el.animate([
				{ transform: "translate(-50%,-50%) scale(.2)", opacity: 0 },
				{ transform: `translate(-50%,-50%) translate(${fx}px,${fy}px) scale(1.2) rotate(${Math.random() * 720 - 360}deg)`, opacity: 1, offset: 0.45 },
				{ transform: `translate(-50%,-50%) translate(${x}px,${y}px) scale(.9) rotate(${(a * 180) / Math.PI + 90}deg)`, opacity: 0.32 },
			], { duration: 2200, delay: i * 70, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" });
			setTimeout(() => play(i % 3 ? "tick" : "stamp"), 300 + i * 70);
		});
		Post.hydrate(burst);
		burst.animate([{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }], { duration: 90000, iterations: Infinity, delay: 2400 });
		setTimeout(() => { u13.classList.add("stage2"); play("win"); drawPlaceholder(); }, 2300);
	}
	function drawPlaceholder() {
		const g = u13cv.getContext("2d");
		g.fillStyle = Post.PAPER; g.fillRect(0, 0, u13cv.width, u13cv.height);
		g.fillStyle = "#d93f9c"; g.font = "400 120px Nohemi, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
		g.fillText("13", u13cv.width / 2, u13cv.height / 2);
	}
	async function startCam() {
		try { stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 800, facingMode: "user" }, audio: false }); }
		catch { return photoPicker("No camera here. Pick a photo instead, or use your initials."); }
		const v = document.createElement("video");
		v.muted = true; v.playsInline = true; v.srcObject = stream;
		await v.play();
		$("#u13Actions").innerHTML = `<button class="btn pink" id="u13Snap">● Record my stamp</button><button class="keycap dark" id="u13Skip2">Not now</button>`;
		$("#u13Snap").addEventListener("click", () => snap(v));
		$("#u13Skip2").addEventListener("click", closeU13);
		const live = () => { grabFrame(v); Post.dither(u13cv, frameCv, { cols: 58, mode: "dots", ink: "#d93f9c", contrast: 1.6, bias: 0.06 }); liveRAF = requestAnimationFrame(live); };
		live();
	}
	function grabFrame(v) {
		const w = v.videoWidth, h = v.videoHeight, tw = 400, th = 500;
		frameCv.width = tw; frameCv.height = th;
		const g = frameCv.getContext("2d"), k = Math.max(tw / w, th / h);
		g.save(); g.translate(tw, 0); g.scale(-1, 1);
		g.drawImage(v, (tw - w * k) / 2, (th - h * k) / 2, w * k, h * k);
		g.restore();
	}
	async function snap(v) {
		$("#u13Snap").disabled = true;
		for (const n of [3, 2, 1]) { $("#u13Count").textContent = n; play("key"); await new Promise((r) => setTimeout(r, 650)); }
		$("#u13Count").textContent = "";
		grabFrame(v);
		const flash = $("#u13Flash"); flash.classList.remove("go"); void flash.offsetWidth; flash.classList.add("go");
		play("stamp");
		cancelAnimationFrame(liveRAF);
		stream?.getTracks().forEach((t) => t.stop());
		issue13(frameCv.toDataURL("image/jpeg", 0.9));
	}
	// a photo from the device, for when the live camera isn't allowed
	function photoPicker(msg) {
		$("#u13Actions").innerHTML = `<label class="btn pink" for="u13File">● ${TOUCH ? "Take or pick a photo" : "Choose a photo"}</label><input type="file" id="u13File" accept="image/*" hidden><button class="btn" id="u13Ini2">Use my initials instead</button><button class="keycap dark" id="u13Skip3">Not now</button>`;
		$("#u13File").addEventListener("change", (e) => e.target.files[0] && usePhoto(e.target.files[0]));
		$("#u13Ini2").addEventListener("click", makeInitials);
		$("#u13Skip3").addEventListener("click", closeU13);
		if (msg) toast(msg);
	}
	function usePhoto(file) {
		const img = new Image(), url = URL.createObjectURL(file);
		img.onload = () => {
			frameCv.width = 400; frameCv.height = 500;
			const g = frameCv.getContext("2d"), k = Math.max(400 / img.width, 500 / img.height);
			g.drawImage(img, (400 - img.width * k) / 2, (500 - img.height * k) / 2, img.width * k, img.height * k);
			URL.revokeObjectURL(url);
			play("stamp");
			issue13(frameCv.toDataURL("image/jpeg", 0.9));
		};
		img.onerror = () => { URL.revokeObjectURL(url); toast("That file didn't open as a photo. Try another, or use your initials."); };
		img.src = url;
	}
	const collector = () => ($(".col-name")?.value || "").trim();
	function makeInitials() {
		const ini = (collector() || "You").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
		frameCv.width = 400; frameCv.height = 500;
		const g = frameCv.getContext("2d");
		g.fillStyle = "#fff"; g.fillRect(0, 0, 400, 500);
		g.fillStyle = "#000"; g.font = "400 260px Nohemi, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
		g.fillText(ini, 200, 260);
		play("stamp");
		issue13(frameCv.toDataURL("image/png"));
	}
	function issue13(dataURL) {
		const name = collector();
		YOU = { no: "13", title: name || "The Collector", short: "You", jp: "あなた", value: "13", unit: "", img: dataURL, grand: true, layout: "grand", icon: "logo", sub: "Issued to", uv: "Collector No. 13. Thanks for the trip.", micro: "ISSUED TO THE COLLECTOR · ALL TWELVE STAMPS · CLUEGO ·", date: DATE };
		u13.classList.add("issued");
		confetti();
		document.body.classList.add("unlocked");
		fillSlots("you");
		const camEl = $(".u13-cam .live");
		camEl.innerHTML = Post.html(YOU, { w: camEl.clientWidth, cancel: true });
		camEl.style.padding = "0"; camEl.style.background = "none";
		camEl.firstElementChild.classList.add("pasted", "struck");
		Post.hydrate(camEl);
		setTimeout(() => play("stamp"), 560);
		setTimeout(() => play("win"), 900);
		$("#u13Title").textContent = name ? `Welcome to Cluego, ${name}.` : "Welcome to Cluego.";
		$("#u13Copy").textContent = FRAMED ? "Stamp No. 13 is in your album. Thanks for taking the trip." : "Stamp No. 13 is in your album. It prints with your map, too. Thanks for taking the trip.";
		$("#u13Actions").innerHTML = `<button class="btn pink" id="u13Album">Open my stamps</button><button class="btn" data-print>Print my map</button><button class="keycap dark" data-again-always>↺ Play again</button>`;
		$("#u13Album").addEventListener("click", () => { closeU13(); openCol(true); });
	}
	// petals and paper confetti over the reveal
	function confetti() {
		const host = $("#u13Burst"), cols = ["#ffc2e2", "#ff4fa8", "#ffe14d", "#5fe3a1", "#c4b8ff", "#fff"];
		for (let i = 0; i < 70; i++) {
			const p = document.createElement("i");
			p.className = "u13-bit";
			p.style.background = cols[i % cols.length];
			host.appendChild(p);
			const a = Math.random() * Math.PI * 2, d = 160 + Math.random() * Math.max(innerWidth, innerHeight) * 0.6;
			p.animate([
				{ transform: "translate(-50%,-50%) rotate(0deg) scale(.3)", opacity: 1 },
				{ transform: `translate(-50%,-50%) translate(${Math.cos(a) * d}px, ${Math.sin(a) * d + 220}px) rotate(${Math.random() * 900}deg) scale(1)`, opacity: 0 },
			], { duration: 2400 + Math.random() * 1800, easing: "cubic-bezier(.15,.7,.4,1)", fill: "forwards" });
		}
	}
	function closeU13() {
		cancelAnimationFrame(liveRAF);
		stream?.getTracks().forEach((t) => t.stop());
		u13.classList.remove("open", "stage2"); u13.setAttribute("aria-hidden", "true");
	}
	$("#u13Cam").addEventListener("click", startCam);
	$("#u13Initials").addEventListener("click", makeInitials);
	$("#u13Skip").addEventListener("click", closeU13);
	if (FRAMED) {
		photoPicker();
		$("#u13Copy").textContent = "Every video in this world started with someone pressing record. Your turn: one photo, no retakes. Cluego will turn it into the last stamp in your album.";
	}

	// ---------- Play again ----------
	document.addEventListener("click", (e) => { if (e.target.closest("[data-again], [data-again-always]")) { play("whoosh"); setTimeout(() => location.reload(), 150); } });

	// ---------- Keys ----------
	addEventListener("keydown", (e) => {
		const typing = e.target.matches?.("input, textarea");
		const k = e.key.toLowerCase();
		if (k === "escape") {
			if ($("#svModal").classList.contains("open")) openModal("svModal", false);
			else if ($("#colModal").classList.contains("open")) openModal("colModal", false);
			else if (u13.classList.contains("open")) closeU13();
			else if (mapOn) toggleMap(false);
			else if (focusId) unfocus();
			return;
		}
		if ($("#svModal").classList.contains("open") && (k === "arrowleft" || k === "arrowright")) { svAt += k === "arrowleft" ? -1 : 1; paintViewer(); return; }
		if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
		if (focusId?.startsWith("lift") && /^[0-9]$/.test(k)) { press(+focusId.split("-")[1], k); return; }
		if (k === "m") { toggleMap(); play("key"); return; }
		if (k === "p") { openCol(!$("#colModal").classList.contains("open")); return; }
		if (focusId && keyHandlers[focusId]) keyHandlers[focusId](e);
	});
	// the last secret: type "clueso" anywhere (or, on a phone, into the box on the ending screen)
	function pinkTide() {
		document.body.classList.toggle("pink-tide");
		play("ding");
		if (solved.has("pink")) return;
		toast("<b>Pink tide.</b> The whole sky just went on brand. That's a secret stamp.");
		solve("pink");
		document.body.classList.add("got-pink");
	}
	// the name on every stamp is Cluego; the company name counts too
	Kit.onSequence([..."clueso"], pinkTide);
	Kit.onSequence([..."cluego"], pinkTide);
	document.addEventListener("input", (e) => { if (e.target.matches(".pink-in") && /clue(so|go)/i.test(e.target.value) && !solved.has("pink")) { e.target.blur(); pinkTide(); } });

	// ---------- Print: the finished block, then the album ----------
	function buildPrint() {
		const sheet = $("#printSheet");
		const pw = 1062, ph = 733;
		const r = rowRect(), k = Math.min(pw / r.w, ph / r.h) * 0.94;
		const clone = world.cloneNode(true);
		clone.removeAttribute("id");
		clone.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
		clone.querySelectorAll(".scr, .mk, .lift-card, .lyr-name, .bottle-wrap, .bugs-wrap, .bx").forEach((n) => n.remove());
		clone.querySelectorAll(".lyr").forEach((el, i) => { el.classList.remove("away"); el.style.transition = "none"; el.style.zIndex = i + 1; el.style.transform = `translate(${ROW(i).x}px, ${ROW(i).y}px)`; });
		clone.classList.add("spelled");
		clone.style.cssText = `position:absolute;left:${pw / 2 - (r.x + r.w / 2) * k}px;top:${ph / 2 - (r.y + r.h / 2) * k}px;transform:scale(${k});transform-origin:0 0`;
		sheet.innerHTML = `<div class="print-poster"></div><div class="print-book">${bookHTML()}</div>`;
		sheet.firstElementChild.appendChild(clone);
		sheet.firstElementChild.insertAdjacentHTML("beforeend", `<div style="position:absolute;left:28px;bottom:24px;color:#fff;font:400 13px/1.4 var(--mono);letter-spacing:.12em;text-transform:uppercase">Cluego · No. 001 · ${DATE}${collector() ? " · " + collector() : ""}</div>`);
		sheet.querySelectorAll(".col-name").forEach((i) => i.setAttribute("value", collector()));
		[...solved, ...(YOU ? ["you"] : [])].forEach((id) => fillSlots(id, sheet));
	}
	addEventListener("beforeprint", buildPrint);
	document.addEventListener("click", (e) => { if (e.target.closest("[data-print]")) { buildPrint(); play("ding"); setTimeout(() => print(), 500); } });

	// ---------- Start ----------
	$("#startBtn").addEventListener("click", () => { $("#intro").classList.remove("on"); document.body.classList.remove("at-intro"); play("whoosh"); goLayer(0); });
	showIsland(0);
	setTgt(fitIn(islandRect(0), { l: 0, r: 0, t: 0, b: 0 }));
	Object.assign(cam, tgt);
	paintHUD();
	paintMission();
	requestAnimationFrame(frame);
})();
