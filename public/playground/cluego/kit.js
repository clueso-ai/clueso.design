// Shared kit for the gamified lo-fis: synthesized sounds (no audio files),
// rubber stamps, secret key sequences and a toast. Exposed as window.Kit.
(() => {
	const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

	// ---------- Sound ----------
	let ctx, master, noiseBuf;
	let soundOn = true;
	try { soundOn = localStorage.getItem("kit:sound") !== "off"; } catch {}

	function ac() {
		if (!ctx) {
			ctx = new (window.AudioContext || window.webkitAudioContext)();
			master = ctx.createGain();
			master.gain.value = 0.55;
			master.connect(ctx.destination);
			noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
			const d = noiseBuf.getChannelData(0);
			for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
		}
		if (ctx.state === "suspended") ctx.resume();
		return ctx;
	}
	function noise(t, dur, { type = "highpass", freq = 2000, q = 1, gain = 0.4, attack = 0.001 } = {}) {
		const c = ac();
		const s = c.createBufferSource();
		s.buffer = noiseBuf;
		const f = c.createBiquadFilter();
		f.type = type; f.frequency.value = freq; f.Q.value = q;
		const g = c.createGain();
		g.gain.setValueAtTime(0, t);
		g.gain.linearRampToValueAtTime(gain, t + attack);
		g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
		s.connect(f).connect(g).connect(master);
		s.start(t, Math.random() * 0.5);
		s.stop(t + dur + 0.03);
	}
	function tone(t, freq, dur, { type = "sine", gain = 0.25, to } = {}) {
		const c = ac();
		const o = c.createOscillator();
		o.type = type;
		o.frequency.setValueAtTime(freq, t);
		if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
		const g = c.createGain();
		g.gain.setValueAtTime(gain, t);
		g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
		o.connect(g).connect(master);
		o.start(t);
		o.stop(t + dur + 0.03);
	}
	const sounds = {
		// mechanical keyboard "thock": bright click + low body + release tick
		key() {
			const t = ac().currentTime, p = 0.85 + Math.random() * 0.3;
			noise(t, 0.022, { freq: 2800 * p, gain: 0.32 });
			tone(t, 210 * p, 0.05, { type: "triangle", gain: 0.22, to: 95 });
			noise(t + 0.05, 0.016, { freq: 4800, gain: 0.08 });
		},
		stamp() {
			const t = ac().currentTime;
			tone(t, 130, 0.28, { gain: 0.75, to: 38 });
			noise(t, 0.14, { type: "lowpass", freq: 800, gain: 0.7 });
			noise(t + 0.012, 0.05, { freq: 2600, gain: 0.12 });
		},
		tick() {
			const t = ac().currentTime;
			noise(t, 0.01, { type: "bandpass", freq: 3800, q: 5, gain: 0.22 });
		},
		pencil() {
			const t = ac().currentTime;
			for (let i = 0; i < 7; i++) noise(t + i * 0.05, 0.045, { type: "bandpass", freq: 4200 + Math.random() * 2400, q: 1.6, gain: 0.07, attack: 0.01 });
		},
		paper() {
			const t = ac().currentTime;
			noise(t, 0.32, { type: "bandpass", freq: 1700, q: 0.5, gain: 0.16, attack: 0.07 });
		},
		pop() {
			const t = ac().currentTime;
			tone(t, 520, 0.09, { type: "sine", gain: 0.22, to: 180 });
		},
		ding() {
			const t = ac().currentTime;
			tone(t, 1318, 1.1, { gain: 0.14 });
			tone(t, 2636, 0.6, { gain: 0.04 });
		},
		win() {
			const t = ac().currentTime;
			[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(t + i * 0.075, f, 0.55, { type: "triangle", gain: 0.12 }));
		},
		wrong() {
			const t = ac().currentTime;
			tone(t, 150, 0.16, { type: "square", gain: 0.05, to: 105 });
		},
		whoosh() {
			const t = ac().currentTime;
			noise(t, 0.6, { type: "bandpass", freq: 900, q: 0.7, gain: 0.2, attack: 0.25 });
		},
	};
	function play(name) {
		if (!soundOn) return;
		try { sounds[name] && sounds[name](); } catch {}
	}
	// A little sing-song babble, for previewing a voice without real audio.
	function babble(pitch = 1, rate = 1) {
		if (!soundOn) return;
		try {
			const c = ac(), t0 = c.currentTime;
			const notes = [0, 3, 1, 5, 2, 4, 0, 6, 3];
			notes.forEach((n, i) => {
				const t = t0 + (i * 0.11) / rate;
				const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
				o.type = "sawtooth";
				o.frequency.setValueAtTime(170 * pitch * Math.pow(2, n / 12), t);
				o.frequency.exponentialRampToValueAtTime(150 * pitch * Math.pow(2, n / 12), t + 0.09 / rate);
				f.type = "bandpass"; f.frequency.value = 900 + (i % 3) * 500; f.Q.value = 3;
				g.gain.setValueAtTime(0, t);
				g.gain.linearRampToValueAtTime(0.16, t + 0.015);
				g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1 / rate);
				o.connect(f).connect(g).connect(master);
				o.start(t); o.stop(t + 0.12 / rate);
			});
		} catch {}
	}

	function mountSoundToggle({ dark = false } = {}) {
		const b = document.createElement("button");
		b.className = "keycap kit-sound" + (dark ? " dark" : "");
		const paint = () => {
			b.setAttribute("aria-pressed", String(soundOn));
			b.innerHTML = `<span class="dot"></span>Sound ${soundOn ? "on" : "off"}`;
		};
		paint();
		b.addEventListener("click", () => {
			soundOn = !soundOn;
			try { localStorage.setItem("kit:sound", soundOn ? "on" : "off"); } catch {}
			paint();
			play("key");
		});
		document.body.appendChild(b);
	}

	// Every keycap clicks; every typed letter in a field clicks.
	document.addEventListener("pointerdown", (e) => {
		if (e.target.closest(".keycap")) play("key");
	});
	document.addEventListener("keydown", (e) => {
		if (e.target.matches?.("input, textarea") && (e.key.length === 1 || e.key === "Backspace")) play("key");
	});

	// ---------- Stamps ----------
	let uid = 0;
	const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

	function stampSVG({ top = "", word = "", bottom = "", shape = "round" } = {}) {
		const id = "kp" + uid++;
		if (shape === "round") {
			return `<svg viewBox="0 0 120 120" role="img" aria-label="${esc(word)} stamp">
	<g filter="url(#kit-ink)">
		<g fill="none" stroke="currentColor">
			<circle cx="60" cy="60" r="56" stroke-width="3.2"/>
			<circle cx="60" cy="60" r="49.5" stroke-width="1"/>
			<circle cx="60" cy="60" r="30" stroke-width="1"/>
			<path id="${id}t" d="M 18.5 60 A 41.5 41.5 0 0 1 101.5 60" stroke="none"/>
			<path id="${id}b" d="M 15 60 A 45 45 0 0 0 105 60" stroke="none"/>
		</g>
		<g fill="currentColor" font-family="Geist Mono, monospace" font-size="8.6" letter-spacing="2.2" text-anchor="middle">
			<text><textPath href="#${id}t" startOffset="50%">${esc(top)}</textPath></text>
			<text><textPath href="#${id}b" startOffset="50%">${esc(bottom)}</textPath></text>
			<text x="20" y="63" font-size="9">★</text><text x="100" y="63" font-size="9">★</text>
		</g>
		<text x="60" y="64.5" fill="currentColor" font-family="Nohemi, sans-serif" font-weight="600" font-size="${word.length > 6 ? 10.5 : 13}" letter-spacing="0.5" text-anchor="middle">${esc(word)}</text>
	</g>
</svg>`;
		}
		// rectangular "approved" style
		return `<svg viewBox="0 0 168 92" role="img" aria-label="${esc(word)} stamp">
	<g filter="url(#kit-ink)">
		<rect x="3" y="3" width="162" height="86" rx="7" fill="none" stroke="currentColor" stroke-width="3.2"/>
		<rect x="10" y="10" width="148" height="72" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
		<g fill="currentColor" font-family="Geist Mono, monospace" font-size="8.6" letter-spacing="2.2" text-anchor="middle">
			<text x="84" y="25">${esc(top)}</text>
			<text x="84" y="74">${esc(bottom)}</text>
		</g>
		<text x="84" y="56" fill="currentColor" font-family="Nohemi, sans-serif" font-weight="600" font-size="${word.length > 9 ? 17 : 22}" letter-spacing="0.5" text-anchor="middle">${esc(word)}</text>
	</g>
</svg>`;
	}

	// Ink texture: wobbles the edges and knocks out speckles, like a real rubber stamp.
	function mountInkFilter() {
		const d = document.createElement("div");
		d.setAttribute("aria-hidden", "true");
		d.className = "kit-defs";
		d.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
		d.innerHTML = `<svg width="0" height="0"><filter id="kit-ink" x="-10%" y="-10%" width="120%" height="120%">
			<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="n1"/>
			<feDisplacementMap in="SourceGraphic" in2="n1" scale="2.2" result="wobble"/>
			<feTurbulence type="fractalNoise" baseFrequency="0.22" numOctaves="2" seed="11" result="n2"/>
			<feColorMatrix in="n2" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -3.2 0 0 0 2.35" result="mask"/>
			<feComposite in="wobble" in2="mask" operator="in"/>
		</filter></svg>`;
		document.body.appendChild(d);
	}

	// Slam a stamp into a slot. Returns the stamp element.
	function stamp(slot, svg, { rotate = Math.random() * 18 - 9, shakeEl = slot.parentElement, quiet = false } = {}) {
		slot.querySelector(".kit-stamp")?.remove();
		const el = document.createElement("div");
		el.className = "kit-stamp";
		el.style.setProperty("--r", rotate.toFixed(1) + "deg");
		el.innerHTML = svg;
		slot.appendChild(el);
		slot.classList.add("is-stamped");
		if (!quiet) {
			setTimeout(() => play("stamp"), reduced ? 0 : 150);
			if (shakeEl && !reduced) {
				setTimeout(() => {
					shakeEl.classList.remove("kit-shake");
					void shakeEl.offsetWidth;
					shakeEl.classList.add("kit-shake");
				}, 150);
			}
		}
		return el;
	}

	// ---------- Secret sequences ----------
	const seqs = [];
	function onSequence(keys, fn) {
		seqs.push({ keys: keys.map((k) => k.toLowerCase()), i: 0, fn });
	}
	document.addEventListener("keydown", (e) => {
		if (e.target.matches?.("input, textarea, [contenteditable]")) return;
		const k = (e.key || "").toLowerCase();
		for (const s of seqs) {
			if (k === s.keys[s.i]) {
				s.i++;
				if (s.i === s.keys.length) { s.i = 0; s.fn(); }
			} else s.i = k === s.keys[0] ? 1 : 0;
		}
	});
	const KONAMI = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];

	// ---------- Toast ----------
	function toast(html, ms = 2800) {
		let t = document.querySelector(".kit-toast");
		if (!t) {
			t = document.createElement("div");
			t.className = "kit-toast";
			t.setAttribute("role", "status");
			document.body.appendChild(t);
		}
		t.innerHTML = html;
		t.classList.add("is-on");
		clearTimeout(t._h);
		t._h = setTimeout(() => t.classList.remove("is-on"), ms);
	}

	// Seeded random, so mazes and shuffles are the same for everyone.
	function seeded(seed) {
		return () => {
			seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
			let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}

	const LOGO = `<svg viewBox="0 0 100 100" aria-hidden="true"><path fill="currentColor" d="M69.7071 1.70711L98.2929 30.2929C98.9229 30.9229 100 30.4767 100 29.5858V3C100 1.34315 98.6569 0 97 0H70.4142C69.5233 0 69.0771 1.07714 69.7071 1.70711Z"/><path fill="currentColor" d="M52.5858 0.585789L99.4142 47.4142C99.7893 47.7893 100 48.298 100 48.8284V65.5858C100 66.4767 98.9229 66.9229 98.2929 66.2929L33.7071 1.70711C33.0771 1.07714 33.5233 0 34.4142 0H51.1716C51.702 0 52.2107 0.210716 52.5858 0.585789Z"/><path fill="currentColor" d="M16.5858 0.585789L99.4142 83.4142C99.7893 83.7893 100 84.298 100 84.8284V97C100 98.6569 98.6569 100 97 100H70C68.8954 100 68 99.1046 68 98V94C68 84.0589 59.9411 76 50 76C40.0589 76 32 84.0589 32 94V98C32 99.1046 31.1046 100 30 100H3C1.34315 100 0 98.6569 0 97V70C0 68.8954 0.89543 68 2 68H6C15.9411 68 24 59.9411 24 50C24 40.0589 15.9411 32 6 32H2C0.895431 32 0 31.1046 0 30V3C0 1.34315 1.34315 0 3 0H15.1716C15.702 0 16.2107 0.210717 16.5858 0.585789Z"/></svg>`;

	const CURSOR = `<svg viewBox="0 0 24 32" aria-hidden="true"><path d="M2 2 L2 25 L8 19.5 L12 29 L16 27.3 L12 18 L20 18 Z" fill="#111" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/></svg>`;

	document.addEventListener("DOMContentLoaded", mountInkFilter);

	window.Kit = { play, babble, mountSoundToggle, stampSVG, stamp, onSequence, KONAMI, toast, seeded, reduced, LOGO, CURSOR };
})();
