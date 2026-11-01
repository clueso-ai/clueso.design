// Screenland stamps: each island gets its own rubber stamp, built from the product's
// own icons, with a hand-inked finish (wobbly edges, missing speckles, uneven pressure,
// a faint second strike) and fine security-print rings. Exposed as window.Stamps.
(() => {
	const I = window.ICONS || {};
	const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
	let uid = 0;

	// Ink on paper (passport, print) and the same ink lit up on a dark product panel.
	const INK = { pink: "#cf3f9c", red: "#c9343f", violet: "#5d3fc4", teal: "#0b7c7a", azure: "#2558c4", amber: "#bb5f17", green: "#277f4a", plum: "#7e2a72", ink: "#26222c" };
	const GLOW = { pink: "#ff92e2", red: "#ff8790", violet: "#b9a2ff", teal: "#6fe6db", azure: "#93b6ff", amber: "#ffb873", green: "#86e8ab", plum: "#f2a0e3", ink: "#ece8f4" };

	const icon = (name, x, y, s) => (I[name] ? I[name].replace("<svg ", `<svg x="${x}" y="${y}" width="${s}" height="${s}" `) : "");
	const f = (n) => n.toFixed(2);

	function rose(cx, cy, R, amp, n, lines, sw = 0.35) {
		let d = "";
		for (let l = 0; l < lines; l++) {
			const ph = (l * Math.PI * 2) / (lines * n);
			for (let i = 0; i <= 240; i++) {
				const t = (i / 240) * Math.PI * 2;
				const r = R + amp * Math.sin(n * t + ph);
				d += (i ? "L" : "M") + f(cx + r * Math.cos(t)) + " " + f(cy + r * Math.sin(t));
			}
			d += "Z";
		}
		return `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${sw}"/>`;
	}
	function scallop(cx, cy, R, amp, n) {
		let d = "";
		for (let i = 0; i <= 360; i++) {
			const t = (i / 360) * Math.PI * 2;
			const r = R + amp * Math.cos(n * t);
			d += (i ? "L" : "M") + f(cx + r * Math.cos(t)) + " " + f(cy + r * Math.sin(t));
		}
		return d + "Z";
	}
	function poly(cx, cy, r, sides, rot = 0) {
		return [...Array(sides)].map((_, i) => {
			const a = rot + (i * Math.PI * 2) / sides;
			return f(cx + r * Math.cos(a)) + "," + f(cy + r * Math.sin(a));
		}).join(" ");
	}
	// text running round a circle: top reads left→right over the top, bottom left→right under it
	function ringText(id, cx, cy, rTop, rBot, top, bottom, size = 9, spacing = 2.4) {
		return `<path id="${id}t" d="M ${cx - rTop} ${cy} A ${rTop} ${rTop} 0 0 1 ${cx + rTop} ${cy}" fill="none"/>
			<path id="${id}b" d="M ${cx - rBot} ${cy} A ${rBot} ${rBot} 0 0 0 ${cx + rBot} ${cy}" fill="none"/>
			<g font-family="Geist Mono, monospace" font-size="${size}" font-weight="600" letter-spacing="${spacing}" text-anchor="middle" fill="currentColor">
				<text><textPath href="#${id}t" startOffset="50%">${esc(top)}</textPath></text>
				<text><textPath href="#${id}b" startOffset="50%">${esc(bottom)}</textPath></text>
			</g>`;
	}
	function micro(id, cx, cy, r, size = 3.6) {
		const s = "SCREENLAND · CLUESO · ".repeat(14);
		return `<path id="${id}m" d="M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy}" fill="none"/>
			<text font-family="Geist Mono, monospace" font-size="${size}" letter-spacing=".6" fill="currentColor"><textPath href="#${id}m">${s}</textPath></text>`;
	}
	const word = (x, y, w, size) => `<text x="${x}" y="${y}" font-family="Nohemi, sans-serif" font-weight="600" font-size="${size}" letter-spacing=".4" text-anchor="middle" fill="currentColor">${esc(w)}</text>`;
	const mono = (x, y, t, size = 7.5, anchor = "middle", ls = 1.6) => `<text x="${x}" y="${y}" font-family="Geist Mono, monospace" font-size="${size}" font-weight="500" letter-spacing="${ls}" text-anchor="${anchor}" fill="currentColor">${esc(t)}</text>`;
	const fit = (w, base, max) => Math.min(base, (max / Math.max(w.length, 1)) * 1.55);

	// ---------- the shapes ----------
	const SHAPES = {
		round(s, id) {
			return { vb: "0 0 160 160", body: `
				<circle cx="80" cy="80" r="76" fill="none" stroke="currentColor" stroke-width="4"/>
				<circle cx="80" cy="80" r="70" fill="none" stroke="currentColor" stroke-width="1"/>
				${ringText(id, 80, 80, 59, 66, s.top, s.bottom)}
				<text x="17" y="83" font-size="9" fill="currentColor" text-anchor="middle">★</text><text x="143" y="83" font-size="9" fill="currentColor" text-anchor="middle">★</text>
				<circle cx="80" cy="80" r="51" fill="none" stroke="currentColor" stroke-width="1.2"/>
				${rose(80, 80, 45, 2.4, 22, 3)}
				${icon(s.icon, 67, 46, 26)}
				${word(80, 96, s.word, fit(s.word, 17, 92))}
				${mono(80, 109, s.serial, 6.5)}` };
		},
		seal(s, id) {
			return { vb: "0 0 170 170", body: `
				<path d="${scallop(85, 85, 79, 3.2, 30)}" fill="none" stroke="currentColor" stroke-width="3.2"/>
				<circle cx="85" cy="85" r="71" fill="none" stroke="currentColor" stroke-width="1"/>
				${micro(id, 85, 85, 67.5)}
				<circle cx="85" cy="85" r="63" fill="none" stroke="currentColor" stroke-width="1"/>
				${ringText(id, 85, 85, 52, 59, s.top, s.bottom, 8.6)}
				<circle cx="85" cy="85" r="44" fill="none" stroke="currentColor" stroke-width="2"/>
				${rose(85, 85, 39, 2, 16, 4, 0.3)}
				${icon(s.icon, 72, 52, 26)}
				${word(85, 100, s.word, fit(s.word, 15, 78))}
				${mono(85, 112, s.serial, 6)}` };
		},
		rect(s, id) {
			const notch = (x, y, w, h, c) => `M${x + c} ${y} H${x + w - c} L${x + w} ${y + c} V${y + h - c} L${x + w - c} ${y + h} H${x + c} L${x} ${y + h - c} V${y + c} Z`;
			return { vb: "0 0 220 128", body: `
				<rect x="3" y="3" width="214" height="122" rx="10" fill="none" stroke="currentColor" stroke-width="4"/>
				<path d="${notch(11, 11, 198, 106, 9)}" fill="none" stroke="currentColor" stroke-width="1.1"/>
				${mono(110, 31, s.top, 9, "middle", 2.8)}
				<path d="M24 39 H196" stroke="currentColor" stroke-width=".8" stroke-dasharray="1.5 2.5"/>
				${icon(s.icon, 22, 50, 28)}
				${word(124, 73, s.word, fit(s.word, 27, 150))}
				<path d="M24 86 H196" stroke="currentColor" stroke-width=".8" stroke-dasharray="1.5 2.5"/>
				${mono(28, 104, s.bottom, 8, "start", 1.8)}${mono(192, 104, s.serial, 8, "end", 1.8)}` };
		},
		oval(s, id) {
			return { vb: "0 0 220 140", body: `
				<ellipse cx="110" cy="70" rx="105" ry="65" fill="none" stroke="currentColor" stroke-width="4"/>
				<ellipse cx="110" cy="70" rx="97" ry="57" fill="none" stroke="currentColor" stroke-width="1"/>
				<path id="${id}o" d="M 26 70 A 84 46 0 0 1 194 70" fill="none"/>
				<text font-family="Geist Mono, monospace" font-size="9" font-weight="600" letter-spacing="2.6" text-anchor="middle" fill="currentColor"><textPath href="#${id}o" startOffset="50%">${esc(s.top)}</textPath></text>
				<path d="M30 58 H190 M30 92 H190" stroke="currentColor" stroke-width="1.4"/>
				${icon(s.icon, 34, 63, 24)}
				${word(118, 83, s.word, fit(s.word, 22, 120))}
				${mono(110, 108, s.bottom, 8)}${mono(110, 119, s.serial, 6.2)}` };
		},
		hex(s, id) {
			return { vb: "0 0 160 170", body: `
				<polygon points="${poly(80, 85, 78, 6, -Math.PI / 2)}" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>
				<polygon points="${poly(80, 85, 70, 6, -Math.PI / 2)}" fill="none" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/>
				${mono(80, 46, s.top, 7.6, "middle", 1.8)}
				${icon(s.icon, 67, 53, 26)}
				<path d="M28 88 H132 M28 112 H132" stroke="currentColor" stroke-width="1.2"/>
				${word(80, 106, s.word, fit(s.word, 17, 100))}
				${mono(80, 126, s.bottom, 7)}${mono(80, 137, s.serial, 6)}` };
		},
		octagon(s, id) {
			return { vb: "0 0 160 160", body: `
				<polygon points="${poly(80, 80, 77, 8, Math.PI / 8)}" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>
				<polygon points="${poly(80, 80, 69, 8, Math.PI / 8)}" fill="none" stroke="currentColor" stroke-width="1" stroke-linejoin="round" stroke-dasharray="3 2"/>
				${mono(80, 38, s.top, 7.4, "middle", 1.6)}
				${rose(80, 66, 18, 1.6, 12, 3, 0.3)}
				${icon(s.icon, 69, 55, 22)}
				${word(80, 104, s.word, fit(s.word, 18, 104))}
				${mono(80, 119, s.bottom, 7)}${mono(80, 130, s.serial, 6)}` };
		},
		triangle(s, id) {
			return { vb: "0 0 190 168", body: `
				<polygon points="95,6 186,162 4,162" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>
				<polygon points="95,22 172,154 18,154" fill="none" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/>
				${icon(s.icon, 83, 52, 24)}
				${word(95, 106, s.word, fit(s.word, 18, 96))}
				${mono(95, 124, s.top, 7, "middle", 1.4)}
				${mono(95, 142, s.serial, 6)}` };
		},
		// a printed postage stamp (full colour), with a black postmark struck across it
		postage(s, id) {
			const holes = [];
			for (let x = 6; x <= 134; x += 8) holes.push(`<circle cx="${x}" cy="0" r="3.6"/><circle cx="${x}" cy="170" r="3.6"/>`);
			for (let y = 6; y <= 166; y += 8) holes.push(`<circle cx="0" cy="${y}" r="3.6"/><circle cx="140" cy="${y}" r="3.6"/>`);
			return { vb: "-4 -4 148 178", printed: true, body: `
				<mask id="${id}p"><rect x="-4" y="-4" width="148" height="178" fill="#fff"/><g fill="#000">${holes.join("")}</g></mask>
				<g mask="url(#${id}p)">
					<rect x="0" y="0" width="140" height="170" fill="#fbf8f1"/>
					<rect x="9" y="9" width="122" height="152" fill="currentColor"/>
					<g opacity=".22">${rose(70, 70, 34, 6, 9, 5, 0.6).replace('stroke="currentColor"', 'stroke="#fff"')}</g>
					<g color="#fff">${icon(s.icon, 50, 46, 40)}</g>
					<text x="17" y="27" font-family="Nohemi, sans-serif" font-weight="600" font-size="15" fill="#fff">${esc(s.value || "1")}</text>
					<text x="17" y="37" font-family="Geist Mono, monospace" font-size="6" letter-spacing="1.2" fill="#fff" opacity=".85">CLICK</text>
					<text x="70" y="124" font-family="Nohemi, sans-serif" font-weight="600" font-size="${fit(s.word, 14, 96)}" text-anchor="middle" fill="#fff">${esc(s.word)}</text>
					<text x="70" y="148" font-family="Geist Mono, monospace" font-size="6.4" letter-spacing="1.8" text-anchor="middle" fill="#fff" opacity=".9">${esc(s.top)}</text>
				</g>
				<g color="#1d1b22" opacity=".82" filter="url(#st-ink)">
					<circle cx="112" cy="40" r="25" fill="none" stroke="currentColor" stroke-width="1.6"/>
					<circle cx="112" cy="40" r="20" fill="none" stroke="currentColor" stroke-width=".7"/>
					${mono(112, 38, s.bottom.split(" ").slice(0, 2).join(" "), 5.6, "middle", .8)}${mono(112, 46, s.serial, 4.6, "middle", .6)}
					<path d="M-2 76 q12 -6 24 0 t24 0 t24 0 t24 0 t24 0 t24 0 M-2 86 q12 -6 24 0 t24 0 t24 0 t24 0 t24 0 t24 0 M-2 96 q12 -6 24 0 t24 0 t24 0 t24 0 t24 0 t24 0" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".8"/>
				</g>` };
		},
	};

	// Wrap a shape in ink: wobble + speckle filter, uneven pressure, and a faint double strike.
	function svg(spec, { glow = false } = {}) {
		const id = "st" + uid++;
		const shape = SHAPES[spec.shape](spec, id);
		const color = (glow && !shape.printed ? GLOW : INK)[spec.ink] || INK.ink;
		if (shape.printed) {
			return `<svg viewBox="${shape.vb}" style="color:${color}" role="img" aria-label="${esc(spec.word)} stamp" class="st-svg">${shape.body}</svg>`;
		}
		const ang = Math.round(Math.random() * 360);
		return `<svg viewBox="${shape.vb}" style="color:${color}" role="img" aria-label="${esc(spec.word)} stamp" class="st-svg">
			<defs>
				<linearGradient id="${id}g" gradientTransform="rotate(${ang} .5 .5)"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity=".7"/></linearGradient>
				<mask id="${id}k" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#${id}g)"/></mask>
			</defs>
			<g filter="url(#${glow ? "st-ink-soft" : "st-ink"})" ${glow ? "" : `mask="url(#${id}k)"`}>
				<g opacity=".1" transform="translate(1.1 -.8)">${shape.body}</g>
				${shape.body}
			</g>
		</svg>`;
	}

	// Filters shared by every stamp on the page
	function mountDefs() {
		const d = document.createElement("div");
		d.className = "kit-defs";
		d.setAttribute("aria-hidden", "true");
		d.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
		d.innerHTML = `<svg width="0" height="0"><filter id="st-ink" x="-8%" y="-8%" width="116%" height="116%">
			<feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="7" result="n1"/>
			<feDisplacementMap in="SourceGraphic" in2="n1" scale="1.8" result="wob"/>
			<feTurbulence type="fractalNoise" baseFrequency="0.26" numOctaves="3" seed="3" result="n2"/>
			<feColorMatrix in="n2" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -2.6 0 0 0 2.4" result="holes"/>
			<feComposite in="wob" in2="holes" operator="in"/>
		</filter><filter id="st-ink-soft" x="-8%" y="-8%" width="116%" height="116%">
			<feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="7" result="n1"/>
			<feDisplacementMap in="SourceGraphic" in2="n1" scale="1.4" result="wob"/>
			<feTurbulence type="fractalNoise" baseFrequency="0.3" numOctaves="3" seed="5" result="n2"/>
			<feColorMatrix in="n2" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -1.6 0 0 0 2.2" result="holes"/>
			<feComposite in="wob" in2="holes" operator="in"/>
		</filter></svg>`;
		document.body.appendChild(d);
	}
	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountDefs);
	else mountDefs();

	// Press a stamp into a box: it drops, lands, and leaves a few drops of ink.
	function press(box, spec, { glow = false, rotate = Math.random() * 22 - 11, splat = true } = {}) {
		box.querySelector(".st")?.remove();
		const el = document.createElement("div");
		el.className = "st";
		el.style.setProperty("--r", rotate.toFixed(1) + "deg");
		el.innerHTML = svg(spec, { glow });
		if (splat && !spec.printed && spec.shape !== "postage") {
			const color = (glow ? GLOW : INK)[spec.ink];
			for (let i = 0; i < 6; i++) {
				const a = Math.random() * Math.PI * 2, r = 44 + Math.random() * 16;
				const s = 1.5 + Math.random() * 3.5;
				const dot = document.createElement("i");
				dot.className = "st-drop";
				dot.style.cssText = `left:${50 + Math.cos(a) * r}%;top:${50 + Math.sin(a) * r}%;width:${s}px;height:${s}px;background:${color}`;
				el.appendChild(dot);
			}
		}
		box.appendChild(el);
		box.classList.add("is-stamped");
		return el;
	}

	// A small copy flies from one element to another (island → passport).
	function fly(fromEl, toEl, spec, done) {
		const a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect();
		const el = document.createElement("div");
		el.className = "st-fly";
		el.innerHTML = svg(spec);
		const size = Math.min(a.width, 140);
		el.style.cssText = `left:${a.left + a.width / 2 - size / 2}px;top:${a.top + a.height / 2 - size / 2}px;width:${size}px;height:${size}px`;
		document.body.appendChild(el);
		const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
		const anim = el.animate([
			{ transform: "translate(0,0) scale(1) rotate(0deg)", opacity: 1 },
			{ transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 120}px) scale(.8) rotate(-12deg)`, opacity: 1, offset: 0.5 },
			{ transform: `translate(${dx}px, ${dy}px) scale(${Math.max(0.2, b.width / size)}) rotate(8deg)`, opacity: 0.2 },
		], { duration: 900, easing: "cubic-bezier(.5,0,.3,1)" });
		let fired = false;
		const end = () => { if (fired) return; fired = true; el.remove(); done && done(); };
		anim.onfinish = end;
		setTimeout(end, 1000); // still lands if the tab stops drawing frames
	}

	// Faint engraved pattern for passport pages
	function guillocheBg(color = "#7e2a72") {
		const body = [rose(200, 200, 150, 22, 9, 6, 0.5), rose(200, 200, 110, 14, 13, 5, 0.4), rose(200, 200, 70, 9, 7, 5, 0.4)].join("");
		return `url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400' width='400' height='400' style='color:${color}'>${body}</svg>`)}")`;
	}

	window.Stamps = { svg, press, fly, guillocheBg, INK, GLOW };
})();
