//  islands. Every panel is a copy of a real Clueso screen, taken from the
// product films and screenshots in web/public (hero editor film, start-record film,
// tour-* captures, the documentation capture). Labels on the island say what to do;
// the panels themselves only show what the product shows.
(() => {
	const I = window.ICONS;
	const ic = (name, size, color = "currentColor", extra = "") => `<span class="ico" style="width:${size}px;height:${size}px;color:${color};${extra}">${I[name] || ""}</span>`;
	const DASH = "img/dashboard.webp";
	const wait = (ms) => new Promise((r) => setTimeout(r, ms));
	const DATE = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();

	// Shared editor bits ----------------------------------------------------------------
	const headerCluster = () => `
		<div class="ed-head">
			<img class="ed-avatar" src="img/avatar.webp" alt="">
			<span class="ed-btn sq">${ic("headphones", 20, "#dedede")}</span>
			<span class="ed-btn">${ic("translate", 20, "#dedede")}Translate</span>
			<button class="ed-share" data-share>Share</button>
		</div>`;
	const tabs = () => `<div class="ed-tabs"><span>Inspect</span><span class="on">Agent</span></div><div class="ed-rule"></div>`;
	const projbar = (name, mode = "video") => `
		<div class="ed-proj">
			${ic("logo", 24, "#5a5a5a")}${ic("chevDown", 13, "#8a8a8a", "margin-left:3px")}
			<span class="ed-name">${name}</span>
			<span class="ed-switch" data-switch><span data-mode="video" class="${mode === "video" ? "on" : ""}">Video</span><span data-mode="article" class="${mode === "article" ? "on" : ""}">Article</span></span>
		</div>`;
	const PLAN = [
		["document", "Planning the story"],
		["waveAI", "Writing & voicing the script"],
		["record", "Recording the screen"],
		["shapes", "Designing intro clip"],
		["effects", "Adding effects & transitions"],
		["shapes", "Designing the outro clip"],
		["diamond", "Applying finishing touches"],
	];

	// Timeline clips, measured off the film's finished timeline (1280-wide frame px)
	const C = {
		purple: "linear-gradient(90deg, #9147be, #8441a9)",
		teal: "linear-gradient(90deg, #02596a, #00727d)",
		orange: "linear-gradient(90deg, #9d4b24, #d7703c)",
		blue: "linear-gradient(90deg, #2651c1, #2d59c6)",
	};
	const OVERLAYS = [
		{ row: 0, x: 0, w: 112, c: "purple", i: "image", t: "Logo", end: "diamond" },
		{ row: 0, x: 606, w: 168, c: "purple", i: "image", t: "Logo", end: "diamond" },
		{ row: 1, x: 0, w: 112, c: "teal", i: "animation", t: "Icons" },
		{ row: 1, x: 231, w: 93, c: "purple", i: "text", t: "Feature Name" },
		{ row: 1, x: 419, w: 158, c: "orange", i: "callout", t: "Callout", end: "animation" },
		{ row: 1, x: 713, w: 61, c: "purple", i: "square", t: "CTA" },
		{ row: 2, x: 0, w: 112, c: "purple", i: "text", t: "Title Text", end: "animation" },
		{ row: 2, x: 163, w: 161, c: "orange", i: "zoom", t: "Zoom" },
		{ row: 2, x: 360, w: 86, c: "orange", i: "spotlight", t: "Spotlight" },
		{ row: 2, x: 606, w: 168, c: "teal", i: "animation", t: "Animation" },
	];
	const MAIN = [
		{ k: "intro", t: "Intro", w: 112 },
		{ k: "sr", t: "Screen recording", w: 490 },
		{ k: "outro", t: "Outro", w: 168 },
	];
	const clip = (o, s) => `<span class="tl-clip" style="left:${o.x * s}px;width:${o.w * s - 2}px;top:${o.row * 29 * (s / 1.2)}px;background:${C[o.c]}">${ic(o.i, 12, "rgba(255,255,255,.75)")}<b>${o.t}</b>${o.end ? ic(o.end, 11, "rgba(255,255,255,.6)", "margin-left:auto") : ""}</span>`;
	const mainClip = (m, s) => `<button class="tl-main" data-k="${m.k}" style="width:${m.w * s - 2}px"><span class="tl-mh" style="background:${C.blue}">${ic("videoSq", 12, "rgba(255,255,255,.8)")}<b>${m.t}</b></span><span class="tl-mb ${m.k === "sr" ? "thumbs" : ""}"></span></button>`;
	const transport = (code = "00:00:00f") => `
		<div class="tl-trans">
			${ic("skipB", 15, "rgba(255,255,255,.62)")}${ic("chevL", 15, "rgba(255,255,255,.62)")}
			<button class="tl-play" data-play aria-label="Play">${ic("play", 17, "#fff")}</button>
			${ic("chevR", 15, "rgba(255,255,255,.62)")}${ic("skipF", 15, "rgba(255,255,255,.62)")}
			<span class="tl-sep"></span><span class="tl-code"><span data-code>${code}</span> / 01:00:00f</span><span class="tl-sep"></span>
			${ic("scissors", 16, "rgba(255,255,255,.62)")}<span class="tl-sep"></span>${ic("plus", 16, "rgba(255,255,255,.62)")}
			<span class="tl-right">${ic("layout", 16, "rgba(255,255,255,.62)")}${ic("knobs2", 16, "rgba(255,255,255,.62)")}${ic("layout", 16, "rgba(255,255,255,.62)", "transform:scaleY(-1)")}</span>
		</div>
		<div class="tl-ruler">${[...Array(22)].map((_, i) => `<i style="left:${i * 46}px" class="${i % 4 ? "" : "big"}"></i>`).join("")}</div>`;

	const ISLANDS = [];

	/* 1 ------------------------------------------------------------ Agent Bay */
	ISLANDS.push({
		id: "agent", name: "Agent Bay", g: "Agent Bay.", rest: "Ask for a video.",
		hint: "Type the video you want into the message box and press Enter. Clueso AI plans it.",
		x: 650, y: 2600, w: 375, h: 600,
		post: { no: "01", title: "Agent Bay", short: "Agent", jp: "エージェント", value: "7", unit: "c", art: "bubble", ink: "orange", dither: "dots", cols: 50, layout: "top", icon: "wand", uv: "Ask nicely. It listens.", micro: "WRITE YOUR MESSAGE ·" },
		html: () => `<div class="ed-panel agent">
			${headerCluster()}${tabs()}
			<div class="ag-chat" data-chat><p class="ag-msg">Hi, I'm Clueso AI.<br>How can I help you?</p></div>
			<label class="ag-box">
				<textarea data-input rows="3" placeholder="Write your message" aria-label="Write your message"></textarea>
				<button class="ag-send" data-send aria-label="Send">${ic("arrowUp", 15, "#fff")}</button>
			</label>
		</div>`,
		init(el, api) {
			const input = el.querySelector("[data-input]"), send = el.querySelector("[data-send]"), chat = el.querySelector("[data-chat]");
			let busy = false;
			input.addEventListener("input", () => send.classList.toggle("ready", !!input.value.trim()));
			const title = (p) => {
				const s = p.toLowerCase();
				if (/onboard|new hire|welcome/.test(s)) return "Onboarding video";
				if (/dashboard|analytic/.test(s)) return "Analytics dashboard video";
				if (/launch|announc|release|new feature/.test(s)) return "Launch video";
				if (/how to|tutorial|guide|walkthrough/.test(s)) return "How-to video";
				if (/train|course|learn/.test(s)) return "Training video";
				return "Product video";
			};
			const scroll = () => (chat.scrollTop = chat.scrollHeight);
			async function go() {
				const text = input.value.trim();
				if (!text || busy || api.isSolved("agent")) return;
				busy = true;
				input.value = ""; send.classList.remove("ready"); send.classList.add("stop");
				send.innerHTML = '<i class="ag-stop"></i>';
				const t = title(text);
				chat.insertAdjacentHTML("beforeend", `<p class="ag-user"></p>`);
				chat.lastElementChild.textContent = text;
				api.play("pop"); scroll();
				await wait(700);
				chat.insertAdjacentHTML("beforeend", `<p class="ag-msg">Got it. I'm creating your ${t.toLowerCase()}.</p>
					<div class="ag-plan"><div class="ag-ph">${ic("logo", 20, "#7a7a7a")}<span>${t}</span>${ic("chevUp", 13, "#8a8a8a")}</div><ol data-steps></ol></div>`);
				scroll();
				const ol = chat.querySelector("[data-steps]");
				for (const [icon, label] of PLAN) {
					await wait(380);
					ol.insertAdjacentHTML("beforeend", `<li class="working">${ic(icon, 14, "#e46ccd")}<span>${label}</span></li>`);
					api.play("tick"); scroll();
					await wait(520);
					ol.lastElementChild.classList.remove("working");
				}
				await wait(400);
				chat.insertAdjacentHTML("beforeend", `<p class="ag-msg">Your video is ready. Let me know what you think of it. I am happy to update anything if required. Just say the word.</p>`);
				scroll();
				send.classList.remove("stop"); send.innerHTML = ic("arrowUp", 15, "#fff");
				api.solve("agent");
			}
			send.addEventListener("click", go);
			input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); go(); } });
		},
	});

	/* 2 ------------------------------------------------------------ Record Reef */
	ISLANDS.push({
		id: "record", name: "Record Reef", g: "Record Reef.", rest: "Every video starts here.",
		hint: "Hit Start recording, then click Profiles and Filter in the dashboard. Clueso catches every click.",
		x: 1550, y: 2150, w: 640, h: 450,
		post: { no: "02", title: "Record Reef", short: "Record", jp: "録画", value: "2", unit: "c", art: "rec", img: "img/s-record.jpg", ink: "red", dither: "dots", cols: 46, layout: "bleed", variant: "dark", icon: "record", uv: "Take 01 is the keeper.", micro: "REC 00:00 ·" },
		html: () => `<div class="rec beam-lime">
			<div class="rec-bar" data-bar><i class="rec-dot"></i><b>REC</b><span data-time>00:00</span><span class="rec-sep"></span>${ic("mic", 15, "#eee")}<span class="rec-lvl">${[...Array(26)].map((_, i) => `<i style="--h:${i > 21 ? 4 + (i % 3) * 3 : 2}px"></i>`).join("")}</span></div>
			<div class="rec-win" data-win>
				<div class="rec-shot" data-shot></div>
				<button class="rec-start" data-start>${ic("record", 20, "#fff")}Start recording</button>
			</div>
		</div>`,
		init(el, api) {
			const start = el.querySelector("[data-start]"), win = el.querySelector("[data-win]"), shot = el.querySelector("[data-shot]"), bar = el.querySelector("[data-bar]"), time = el.querySelector("[data-time]");
			const TARGETS = [{ name: "Profiles", x: 22.7, y: 28.4 }, { name: "Filter", x: 93, y: 28.4 }];
			let rec = false, step = 0, secs = 0, iv;
			const go = () => {
				if (rec || api.isSolved("record")) return;
				rec = true;
				start.classList.add("gone");
				el.querySelector(".rec").classList.add("recording");
				api.play("key");
				iv = setInterval(() => { secs++; time.textContent = "00:" + String(secs).padStart(2, "0"); }, 1000);
			};
			start.addEventListener("click", (e) => { e.stopPropagation(); go(); });
			shot.addEventListener("click", (e) => {
				if (!rec) return;
				const r = shot.getBoundingClientRect();
				const x = ((e.clientX - r.left) / r.width) * 100, y = ((e.clientY - r.top) / r.height) * 100;
				const t = TARGETS[step];
				const hit = t && Math.abs(x - t.x) < 6.5 && Math.abs(y - t.y) < 5;
				const rip = document.createElement("i");
				rip.className = "rec-click" + (hit ? " hit" : "");
				rip.style.left = x + "%"; rip.style.top = y + "%";
				shot.appendChild(rip);
				setTimeout(() => rip.remove(), 900);
				api.play(hit ? "tick" : "wrong");
				if (!hit) return;
				step++;
				if (step === TARGETS.length) {
					setTimeout(() => {
						clearInterval(iv);
						el.querySelector(".rec").classList.remove("recording");
						bar.classList.add("saved");
						api.solve("record");
					}, 600);
				}
			});
			api.onKey("record", (e) => { if (e.key.toLowerCase() === "r") go(); });
		},
	});

	/* 3 ------------------------------------------------------------ Script Isle */
	const FILL = (w) => `<span class="filler" role="button" tabindex="0">${w}</span> `;
	ISLANDS.push({
		id: "script", name: "Script Isle", g: "Script Isle.", rest: "Cut the filler words.",
		hint: "Your narration has four filler words hiding in it. Click each one to cut it, then Generate speech.",
		x: 2500, y: 2650, w: 418, h: 600,
		post: { no: "03", title: "Script Isle", short: "Script", jp: "台本", value: "4", unit: "c", art: "cut", img: "img/s-transcript.jpg", ink: "violet", dither: "atkinson", cols: 118, layout: "band", icon: "pencilAI", uv: "Four umms were harmed.", micro: "UM · UH · LIKE · YOU KNOW ·" },
		html: () => `<div class="tr">
			<div class="tr-search"><span>Search in transcript</span>${ic("knobs", 19, "#b0b0b0")}</div>
			<div class="tr-body">
				<div class="tr-row"><span class="tr-chip"><span>Intro</span><span class="tr-v">${ic("micAI", 15, "#6282d6")}Hope</span></span><span class="tr-chip sq" data-wave>${ic("waveAI", 13, "#bdbdbd")}</span><span class="tr-add">${ic("userPlus", 15, "#eee")}</span>${ic("dotsV", 16, "#cfcfcf")}</div>
				<p>Meet your new Analytics dashboard. ${FILL("Um,")}you asked where your numbers live — as of today, they live in one place.</p>
				<hr>
				<div class="tr-row"><span class="tr-chip"><span>Screen recording</span><span class="tr-v">${ic("micAI", 15, "#6282d6")}Hope</span></span><span class="tr-chip sq" data-wave>${ic("waveAI", 13, "#bdbdbd")}</span></div>
				<p>It's already in your workspace — ${FILL("uh,")}open the sidebar and Analytics is right there. Every metric that ${FILL("like,")}used to live across four screens now sits on one.</p>
				<hr>
				<div class="tr-row"><span class="tr-chip"><span>Outro</span><span class="tr-v">${ic("micAI", 15, "#6282d6")}Hope</span></span><span class="tr-chip sq" data-wave>${ic("waveAI", 13, "#bdbdbd")}</span></div>
				<p>It's live in your workspace right now — ${FILL("you know,")}nothing to install.</p>
			</div>
			<div class="tr-tools">
				<span class="tr-btn">${ic("dotsH", 16)}</span><span class="tr-btn">${ic("plus", 16)}</span>
				<span class="tr-btn wide">${ic("pencilAI", 15)}AI Rewrite<i></i>${ic("knobs", 16, "#ddd")}</span>
				<button class="tr-btn light" data-gen>${ic("waveAI", 13, "#222")}Generate speech</button>
			</div>
		</div>`,
		init(el, api) {
			let left = 4;
			el.querySelectorAll(".filler").forEach((f) => {
				const cut = () => {
					if (f.classList.contains("cut")) return;
					f.classList.add("cut");
					// cutting a sentence-opening filler capitalises the word after it
					const next = f.nextSibling;
					if (/^[A-Z]/.test(f.textContent) && next && next.nodeType === 3) next.textContent = next.textContent.replace(/^(\s*)([a-z])/, (_, a, b) => a + b.toUpperCase());
					api.play("pop");
					setTimeout(() => f.remove(), 450);
					left--;
				};
				f.addEventListener("click", cut);
				f.addEventListener("keydown", (e) => e.key === "Enter" && cut());
			});
			const gen = el.querySelector("[data-gen]");
			gen.addEventListener("click", async () => {
				if (api.isSolved("script") || gen.classList.contains("busy")) return;
				if (left > 0) { api.play("wrong"); api.toast(`Still ${left} filler word${left > 1 ? "s" : ""} in the script. Listen closely.`); el.querySelector(".tr").classList.add("hinting"); return; }
				gen.classList.add("busy");
				gen.innerHTML = `${ic("waveAI", 13, "#222")}Generating…`;
				for (const w of el.querySelectorAll("[data-wave]")) { await wait(380); w.classList.add("done"); api.play("tick"); }
				gen.classList.remove("busy");
				gen.innerHTML = `${ic("waveAI", 13, "#222")}Generate speech`;
				api.solve("script");
			});
		},
	});

	/* 4 ------------------------------------------------------------ Voice Valley */
	const VOICES = [
		{ n: "Jessica", tags: ["Energetic", "Conversational", "American", "Female"], bm: true, g: "linear-gradient(172deg,#0d6460 0%,#2f8068 42%,#b4913c 100%)" },
		{ n: "Hope", tags: ["Energetic", "Conversational", "American", "Female"], bm: true, g: "linear-gradient(172deg,#127466 0%,#7f8a48 52%,#c98a36 100%)" },
		{ n: "Casual Mark", tags: ["Energetic", "Narrative", "American", "Male"], g: "linear-gradient(172deg,#c98a33 0%,#c55a33 100%)" },
		{ n: "Jeff", tags: ["Calm", "Conversational", "American", "Male"], g: "radial-gradient(circle at 18% 18%,#1b5c63 0%,transparent 52%),linear-gradient(172deg,#8f5a3a 0%,#c3443a 100%)" },
		{ n: "Juniper", tags: ["Energetic", "Narrative", "American", "Female"], g: "linear-gradient(172deg,#c08b33 0%,#cf6a2f 100%)" },
		{ n: "Blondie", tags: ["Energetic", "Conversational", "British", "Female"], g: "linear-gradient(172deg,#c38c34 0%,#ce6b31 100%)" },
	];
	const BADGE = `<svg viewBox="0 0 24 24" class="vo-badge"><path fill="#f2c318" d="M12 1.5l2.6 1.9 3.2-.1 1 3 2.6 1.9-1 3.1 1 3.1-2.6 1.9-1 3-3.2-.1L12 22.5l-2.6-1.9-3.2.1-1-3-2.6-1.9 1-3.1-1-3.1 2.6-1.9 1-3 3.2.1z"/><path d="M7.6 12.2l3 3 5.8-6" fill="none" stroke="#2a2300" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
	ISLANDS.push({
		id: "voice", name: "Voice Valley", g: "Voice Valley.", rest: "Cast the narrator.",
		hint: "This video needs a calm, conversational, American, male voice. Play a few, then bookmark the right one.",
		x: 3450, y: 2200, w: 700, h: 410,
		post: { no: "04", title: "Voice Valley", short: "Voice", jp: "声", value: "6", unit: "c", art: "wave", ink: "teal", dither: "lines", cols: 62, layout: "ring", icon: "micAI", uv: "Jeff says hi.", micro: "CALM · CONVERSATIONAL · AMERICAN · MALE ·" },
		html: () => `<div class="vo">${VOICES.map((v, i) => `
			<div class="vo-row" data-i="${i}">
				<button class="vo-thumb" data-play style="background:${v.g}" aria-label="Play ${v.n}">${ic("play", 20, "#fff")}${BADGE}</button>
				<div class="vo-meta"><div class="vo-name">${v.n}<span class="vo-p">${ic("pause", 10, "#ddd")}</span></div><div class="vo-tags">${v.tags.map((t) => `<span>${t}</span>`).join("")}</div></div>
				<button class="vo-bm ${v.bm ? "on" : ""}" data-bm aria-label="Bookmark ${v.n}">${ic(v.bm ? "bookmarkF" : "bookmark", 16, "#eee")}</button>
			</div>`).join("")}</div>`,
		init(el, api) {
			let playing = null;
			el.querySelectorAll(".vo-row").forEach((row) => {
				const i = +row.dataset.i, v = VOICES[i], thumb = row.querySelector("[data-play]");
				thumb.addEventListener("click", () => {
					if (playing) playing.classList.remove("playing");
					playing = row;
					row.classList.add("playing");
					api.voice(v.tags.includes("Male") ? 0.72 : 1.15, v.tags.includes("Calm") ? 0.7 : 1.25);
					setTimeout(() => row.classList.remove("playing"), 1300);
				});
				row.querySelector("[data-bm]").addEventListener("click", (e) => {
					if (api.isSolved("voice")) return;
					const b = e.currentTarget;
					if (v.n === "Jeff") {
						b.classList.add("on"); b.innerHTML = ic("bookmarkF", 16, "#eee");
						api.play("pop");
						setTimeout(() => api.solve("voice"), 250);
					} else {
						row.classList.remove("nope"); void row.offsetWidth; row.classList.add("nope");
						api.play("wrong");
						const miss = ["Calm", "Conversational", "American", "Male"].filter((t) => !v.tags.includes(t));
						api.toast(`Close, but ${v.n} isn't ${miss.join(" or ").toLowerCase()}.`);
					}
				});
			});
		},
	});

	/* 5 ------------------------------------------------------------ Timeline River */
	const TS = 1.2;
	ISLANDS.push({
		id: "timeline", name: "Timeline River", g: "Timeline River.", rest: "Fix the story.",
		hint: "The main track is out of order. Click two clips to swap them until it reads Intro, Screen recording, Outro. Then press play.",
		x: 4650, y: 2750, w: 980, h: 300,
		post: { no: "05", title: "Timeline River", short: "Timeline", jp: "編集", value: "3", unit: "c", art: "reel", img: "img/dashboard.webp", ink: "ultra", dither: "bayer", cols: 112, layout: "split", icon: "scissors", uv: "Intro first. Always.", micro: "00:00:00F / 01:00:00F ·" },
		html: () => `<div class="tl">
			${transport()}
			<div class="tl-tracks" data-tracks>
				<i class="tl-head" data-head></i>
				<div class="tl-over">${OVERLAYS.map((o) => clip(o, TS)).join("")}</div>
				<div class="tl-mainrow" data-main>${[2, 0, 1].map((k) => mainClip(MAIN[k], TS)).join("")}</div>
			</div>
		</div>`,
		init(el, api) {
			const row = el.querySelector("[data-main]"), head = el.querySelector("[data-head]"), code = el.querySelector("[data-code]");
			let pick = null, playing = false;
			const order = () => [...row.children].map((c) => c.dataset.k).join(",");
			const swap = (a, b) => { const n = document.createElement("i"); row.replaceChild(n, a); row.replaceChild(a, b); row.replaceChild(b, n); };
			row.addEventListener("click", (e) => {
				const c = e.target.closest(".tl-main");
				if (!c || api.isSolved("timeline") || playing) return;
				if (!pick) { pick = c; c.classList.add("picked"); api.play("key"); return; }
				pick.classList.remove("picked");
				if (pick !== c) {
					swap(pick, c);
					[pick, c].forEach((x) => { x.classList.remove("bump"); void x.offsetWidth; x.classList.add("bump"); });
					api.play("tick");
					if (order() === "intro,sr,outro") api.toast("In order. Now press play (or Space).");
				}
				pick = null;
			});
			const play = async () => {
				if (playing || api.isSolved("timeline")) return;
				if (order() !== "intro,sr,outro") { api.play("wrong"); api.toast("The story's out of order. Intro first, Outro last."); return; }
				playing = true;
				head.classList.add("run");
				const t0 = performance.now();
				const iv = setInterval(() => {
					const p = Math.min(1, (performance.now() - t0) / 2600);
					code.textContent = `00:${String(Math.round(p * 46)).padStart(2, "0")}:${String(Math.round(p * 29) % 30).padStart(2, "0")}f`;
					if (p >= 1) { clearInterval(iv); api.solve("timeline"); }
				}, 40);
			};
			el.querySelector("[data-play]").addEventListener("click", play);
			api.onKey("timeline", (e) => { if (e.key === " ") { e.preventDefault(); play(); } });
		},
	});

	/* 6 ------------------------------------------------------------ Spotlight Peaks */
	ISLANDS.push({
		id: "spotlight", name: "Spotlight Peaks", g: "Spotlight Peaks.", rest: "Show them where to look.",
		hint: "Put the spotlight on the busiest day for followers. Click the tallest bar.",
		x: 4750, y: 1700, w: 680, h: 452,
		post: { no: "06", title: "Spotlight Peaks", short: "Spotlight", jp: "注目", value: "8", unit: "c", art: "cone", img: "img/dashboard.webp", ink: "green", dither: "squares", cols: 54, layout: "numeral", icon: "spotlight", uv: "498. The busiest day.", micro: "LOOK HERE ·" },
		html: () => `<div class="sp">
			<div class="sp-stage" data-stage><div class="sp-z" data-img><div class="sp-img"></div><div class="sp-cut" data-cut></div></div></div>
			<div class="sp-strip"><span class="sp-lane">${ic("videoSq", 12, "rgba(255,255,255,.8)")}<b>Screen recording</b></span><span class="sp-fx" data-fx>${ic("spotlight", 12, "rgba(255,255,255,.8)")}<b>Spotlight</b></span><span class="sp-fx z" data-fx2>${ic("zoom", 12, "rgba(255,255,255,.8)")}<b>Zoom</b></span></div>
		</div>`,
		init(el, api) {
			const stage = el.querySelector("[data-stage]"), img = el.querySelector("[data-img]"), cut = el.querySelector("[data-cut]");
			const T = { x0: 37.3, x1: 45, y0: 81, y1: 100 };
			stage.addEventListener("click", (e) => {
				if (api.isSolved("spotlight")) return;
				const r = stage.getBoundingClientRect();
				const x = ((e.clientX - r.left) / r.width) * 100, y = ((e.clientY - r.top) / r.height) * 100;
				if (x > T.x0 - 1.5 && x < T.x1 + 1.5 && y > T.y0 - 6) {
					cut.style.cssText = `left:${T.x0 - 0.8}%;top:${T.y0 - 3}%;width:${T.x1 - T.x0 + 1.6}%;height:${T.y1 - T.y0 + 1}%`;
					stage.classList.add("lit");
					img.style.transformOrigin = `${(T.x0 + T.x1) / 2}% 92%`;
					api.play("whoosh");
					setTimeout(() => { el.querySelector("[data-fx]").classList.add("on"); el.querySelector("[data-fx2]").classList.add("on"); api.play("pop"); }, 700);
					setTimeout(() => api.solve("spotlight"), 1200);
				} else {
					const d = document.createElement("i");
					d.className = "sp-miss"; d.style.left = x + "%"; d.style.top = y + "%";
					stage.appendChild(d); setTimeout(() => d.remove(), 700);
					api.play("wrong");
				}
			});
		},
	});

	/* 7 ------------------------------------------------------------ Translation Isles */
	const LANGS = [["عر", "Arabic"], ["বা", "Bengali"], ["中", "Chinese"], ["Čš", "Czech"], ["Da", "Danish"], ["Nl", "Dutch"], ["En", "English"], ["Fl", "Filipino"], ["Fi", "Finnish"], ["Fr", "French"], ["De", "German"], ["Eλ", "Greek"], ["ગુ", "Gujarati"], ["עב", "Hebrew"], ["हि", "Hindi"], ["Ma", "Hungarian"], ["Id", "Indonesian"], ["It", "Italian"], ["あ", "Japanese"], ["ಕ", "Kannada"], ["한", "Korean"], ["Ms", "Malay"], ["മ", "Malayalam"], ["मर", "Marathi"], ["No", "Norwegian"], ["Pl", "Polish"], ["Pt", "Portuguese"], ["ਪੰ", "Punjabi"]];
	const NEED = ["Hindi", "Japanese", "German"];
	ISLANDS.push({
		id: "translate", name: "Translation Isles", g: "Translation Isles.", rest: "One video, every language.",
		hint: "Your team asked for Hindi, Japanese and German. Find them (typing in the search works) and pick all three.",
		x: 3600, y: 1200, w: 640, h: 470,
		post: { no: "07", title: "Translation Isles", short: "Translate", jp: "翻訳", value: "5", unit: "c", art: "glyphs", ink: "pink", dither: "dots", cols: 74, layout: "grid", icon: "translate", uv: "Hola · नमस्ते · こんにちは · Hallo", micro: "150+ LANGUAGES ·" },
		html: () => `<div class="mt">
			<div class="mt-top"><div><h4>Magic translate</h4><p>Translate your video and article to any language below</p></div><span class="mt-x">${ic("close", 16, "#cfcfcf")}</span></div>
			<label class="mt-search">${ic("search", 16, "#8a8a8a")}<input data-q placeholder="Search for a language..." aria-label="Search for a language"></label>
			<div class="mt-grid" data-grid>${LANGS.map(([g, n]) => `<button class="mt-l" data-n="${n}"><span class="mt-g">${g}</span>${n}</button>`).join("")}</div>
		</div>`,
		init(el, api) {
			const q = el.querySelector("[data-q]"), got = new Set();
			q.addEventListener("input", () => {
				const v = q.value.trim().toLowerCase();
				el.querySelectorAll(".mt-l").forEach((b) => (b.hidden = v && !b.dataset.n.toLowerCase().includes(v)));
			});
			el.querySelector("[data-grid]").addEventListener("click", (e) => {
				const b = e.target.closest(".mt-l");
				if (!b || api.isSolved("translate")) return;
				const n = b.dataset.n;
				if (NEED.includes(n)) {
					if (got.has(n)) return;
					got.add(n); b.classList.add("on"); api.play("pop");
					q.value = ""; q.dispatchEvent(new Event("input"));
					if (got.size === 3) setTimeout(() => api.solve("translate"), 400);
				} else {
					b.classList.remove("nope"); void b.offsetWidth; b.classList.add("nope");
					api.play("wrong");
				}
			});
		},
	});

	/* 8 ------------------------------------------------------------ Docs Harbor */
	ISLANDS.push({
		id: "docs", name: "Docs Harbor", g: "Docs Harbor.", rest: "The guide writes itself.",
		hint: "Same project, second format. Flip the switch from Video to Article.",
		x: 2450, y: 1500, w: 680, h: 560,
		post: { no: "08", title: "Docs Harbor", short: "Docs", jp: "手順書", value: "1", unit: "c", art: "steps", ink: "ink", dither: "cross", cols: 64, layout: "label", icon: "document", uv: "Step 4: there is no step 4.", micro: "1. OPEN · 2. CLICK · 3. SAVE ·" },
		html: () => `<div class="dc">
			${projbar("Instagram dashboard tour")}
			<div class="dc-stage" data-stage>
				<div class="dc-video"><div class="dc-shot"></div><span class="dc-playbtn">${ic("play", 26, "#fff")}</span></div>
				<article class="dc-art" data-art>
					<h1 data-t1></h1>
					<blockquote data-t2></blockquote>
					<p data-t3></p>
					<p data-t4></p>
					<img src="${DASH}" alt="" data-shot>
					<p data-t5></p>
				</article>
			</div>
		</div>`,
		init(el, api) {
			const art = el.querySelector("[data-art]");
			let going = false;
			const type = async (node, text, bold) => {
				if (bold) { node.innerHTML = `<b></b>`; node = node.firstChild; }
				for (const ch of text) { node.textContent += ch; if (ch !== " " && Math.random() > 0.35) api.play("key"); await wait(Kit.reduced ? 0 : 14 + Math.random() * 18); }
			};
			el.querySelector("[data-switch]").addEventListener("click", async (e) => {
				const m = e.target.closest("[data-mode]");
				if (!m || m.dataset.mode !== "article" || going || api.isSolved("docs")) return;
				going = true;
				el.querySelectorAll("[data-mode]").forEach((s) => s.classList.toggle("on", s === m));
				el.querySelector("[data-stage]").classList.add("article");
				api.play("whoosh");
				await wait(500);
				await type(art.querySelector("[data-t1]"), "How to read your Instagram dashboard");
				await type(art.querySelector("[data-t2]"), "This article will guide you through your Instagram performance dashboard.");
				await type(art.querySelector("[data-t3]"), "By following these steps, you'll learn where your key numbers live and how to filter them.");
				const s1 = art.querySelector("[data-t4]");
				s1.innerHTML = "<b>Step 1:</b> ";
				const sp = document.createElement("span"); s1.appendChild(sp);
				await type(sp, "Open the Overview tab to see your performance summary at a glance.");
				art.querySelector("[data-shot]").classList.add("on");
				api.play("paper");
				await wait(500);
				art.scrollTo({ top: art.scrollHeight, behavior: "smooth" });
				const s2 = art.querySelector("[data-t5]");
				s2.innerHTML = "<b>Step 2:</b> ";
				const sp2 = document.createElement("span"); s2.appendChild(sp2);
				await type(sp2, "Click Filter to narrow everything down to the dates you care about.");
				art.scrollTo({ top: art.scrollHeight, behavior: "smooth" });
				api.solve("docs");
			});
		},
	});

	/* 9 ------------------------------------------------------------ Share Point (the whole editor) */
	// Built on the hero film's own 1920×1076 frame coordinates, then scaled.
	const B = (x, y, w, h) => `left:${x}px;top:${y}px;width:${w}px;height:${h}px`;
	const RAIL = ["cursor", "text", "media", "circle", "effects", "animation", "template", "transition", "captions", "comment"];
	ISLANDS.push({
		id: "share", name: "Share Point", g: "Share Point.", rest: "Light it up.",
		hint: "The whole video, built. Hit the pink Share button (top right), or press Enter.",
		x: 1250, y: 750, w: 1200, h: 672,
		post: { no: "09", title: "Share Point", short: "Share", jp: "共有", value: "9", unit: "c", art: "plane", ink: "mustard", dither: "lines", cols: 62, layout: "top", frame: "airmail", icon: "link", uv: "You made a video. Go tell someone.", micro: "PUBLISHED ·" },
		html: () => `<div class="fe"><div class="fe-art">
			<div class="fe-proj" style="${B(22, 20, 416, 44)}">${ic("logo", 27, "#5a5a5a", "position:absolute;left:10px;top:9px")}${ic("chevDown", 14, "#8a8a8a", "position:absolute;left:43px;top:16px")}<span style="position:absolute;left:69px;top:10px;font-size:17px">Analytics dashboard video</span><span class="fe-sw" style="left:290px;top:8px"><span class="on">Video</span><span>Article</span></span></div>
			<div style="${B(22, 82, 41, 411)};background:#282828;border-radius:8px;position:absolute"></div>
			<div style="${B(28, 88, 29, 29)};background:#f6f6f6;border-radius:6px;position:absolute"></div>
			${RAIL.map((n, i) => `<span class="ico" style="position:absolute;${B(30, 91 + i * 40.5, 24, 24)};color:${i === 0 ? "#1e1e1e" : "#d7d7d7"}">${I[n]}</span>`).join("")}
			<div class="fe-stage" style="${B(207, 81, 1150, 645)}">
				<div class="fe-slide">
					<div class="fe-grid"></div>
					<div class="fe-logo"><svg viewBox="0 0 60 60">${[[17, 22], [49, 20], [90, 19], [131, 20], [163, 22]].map(([d, l]) => { const r = (d * Math.PI) / 180, cx = 29.4, cy = 32, ox = Math.cos(r), oy = -Math.sin(r), px = -oy, py = ox, ex = cx + ox * l, ey = cy + oy * l; return `<polygon fill="#f7fbfb" points="${cx + px * 1.2},${cy + py * 1.2} ${ex + px * 3.6},${ey + py * 3.6} ${ex - px * 3.6},${ey - py * 3.6} ${cx - px * 1.2},${cy - py * 1.2}"/>`; }).join("")}<path d="M4.5 35.5 H27.4 L29.4 37.6 L31.4 35.5 H55 V40.6 H4.5 Z" fill="#f7fbfb"/><circle cx="29.4" cy="32" r="1.3" fill="#353c3d"/></svg></div>
					<h2>Analytics Dashboards</h2>
					<p>Your numbers used to live somewhere else.<br>Today, they live here.</p>
				</div>
			</div>
			<div class="fe-side" style="${B(1519, 22, 375, 706)}">
				<img src="img/avatar.webp" alt="" style="position:absolute;left:10px;top:11px;width:42px;height:42px;border-radius:8px;object-fit:cover">
				<span class="fe-ob" style="${B(65, 11, 43, 42)}">${ic("headphones", 22, "#dedede")}</span>
				<span class="fe-ob" style="${B(122, 11, 141, 42)};justify-content:flex-start;gap:10px;padding-left:13px">${ic("translate", 22, "#dedede")}Translate</span>
				<button class="fe-share" data-share style="${B(277, 11, 89, 42)}">Share</button>
				<span style="position:absolute;left:21px;top:80px;color:#8a8a8a">Inspect</span>
				<span style="position:absolute;${B(96, 76, 70, 30)};background:#424242;border-radius:6px;display:flex;align-items:center;justify-content:center">Agent</span>
				<i style="position:absolute;${B(0, 123, 375, 1)};background:#262626"></i>
				<div class="fe-plan" style="left:20px;top:150px;width:340px">${ic("logo", 22, "#c0399f")}<span style="color:#8a8a8a">Analytics dashboard video</span>${ic("chevDown", 14, "#8a8a8a")}</div>
				<p style="position:absolute;left:20px;top:192px;width:330px;margin:0;line-height:26px">Your video is ready. Let me know what you think of it. I am happy to update anything if required. Just say the word.</p>
				<div style="position:absolute;${B(6, 513, 363, 187)};border:1px solid #2e2e2e;border-radius:8px;background:#1a1a1a"></div>
				<span style="position:absolute;left:22px;top:528px;color:#8a8a8a">Write your message</span>
				<span style="position:absolute;${B(322, 651, 34, 34)};border-radius:6px;background:#7d3471;display:flex;align-items:center;justify-content:center">${ic("arrowUp", 18, "#f3d5ec")}</span>
			</div>
			<div class="fe-tl" style="${B(16, 756, 1888, 306)}">
				${transport("00:00:00f").replace('class="tl-trans"', 'class="tl-trans fe-trans"')}
				<div class="tl-tracks fe-tracks"><i class="tl-head" style="left:12px"></i><div class="tl-over">${OVERLAYS.map((o) => clip(o, 1.5)).join("")}</div><div class="tl-mainrow">${MAIN.map((m) => mainClip(m, 1.5)).join("")}</div></div>
			</div>
		</div></div>`,
		init(el, api) {
			const go = () => api.solve("share");
			el.querySelector(".fe-share").addEventListener("click", go);
			api.onKey("share", (e) => { if (e.key === "Enter") { e.preventDefault(); go(); } });
		},
	});

	// Secret islands -------------------------------------------------------------------
	const SECRETS = [
		{
			id: "bugs", name: "Here be bugs", g: "Here be bugs.", rest: "", hint: "", secret: true,
			x: 5100, y: 520, w: 390, h: 270,
			post: { no: "S1", title: "Here be Bugs", short: "Bugs", jp: "虫", value: "?", art: "bug", ink: "red", dither: "bayer", cols: 66, layout: "label", variant: "dark", icon: "check", sub: "Secret", uv: "It's not a bug. It's a feature.", micro: "KNOWN ISSUES (3) ·" },
			html: () => `<div class="cm">
				<div class="cm-h"><b>Comment</b>${ic("dotsV", 16, "#bbb")}<button class="cm-ok" data-ok aria-label="Resolve">${ic("check", 15, "#bbb")}</button>${ic("close", 15, "#bbb")}</div>
				<div class="cm-m"><span class="cm-av a">A</span><div><div class="cm-n">Ajinkya Gajbhiye <i>4h ago</i></div>Change the icon</div>${ic("dotsV", 15, "#bbb", "margin-left:auto")}</div>
				<div class="cm-m"><span class="cm-av s">S</span><div><div class="cm-n">Sarabjeet Randhawa <i>14m ago</i></div>done.</div></div>
				<div class="cm-r"><span class="cm-av a">A</span><span class="cm-in">Reply</span></div>
			</div>`,
			init(el, api) {
				el.querySelector("[data-ok]").addEventListener("click", (e) => {
					e.stopPropagation();
					el.querySelector(".cm").classList.add("resolved");
					api.toast("<b>Here be bugs.</b> You found the edge of the map, and closed a ticket while you were there.");
					api.solve("bugs");
				});
			},
		},
		{
			id: "bottle", name: "Adrift", g: "", rest: "", hint: "", secret: true, bare: true,
			x: 3100, y: 3200, w: 360, h: 240,
			post: { no: "S2", title: "Adrift", short: "Adrift", jp: "漂流", value: "?", art: "bottle", ink: "ultra", dither: "lines", cols: 58, layout: "ring", variant: "dark", icon: "upload", sub: "Secret", uv: "Take 14 is still out there.", micro: "UPLOAD ASSETS ·" },
			html: () => `<button class="up" data-up aria-label="A panel floating at sea"><span class="up-in">${ic("upload", 26, "#9a9a9a")}<b>Upload Assets</b><span>Drag and drop files to create your video</span></span></button>`,
			init(el, api) {
				el.querySelector("[data-up]").addEventListener("click", () => {
					api.toast("You fished an upload panel out of the sea. Someone was going to start a video with it.", 4500);
					api.solve("bottle");
				});
			},
		},
	];
	const PINK = { id: "pink", secret: true, post: { no: "S3", title: "Pink Tide", short: "Pink", jp: "桃色", value: "∞", art: "tide", ink: "pink", dither: "dots", cols: 48, layout: "numeral", icon: "logo", sub: "Secret", uv: "You found the brand colour.", micro: "PINK TIDE ·" } };

	window.ROUTE = { ISLANDS, SECRETS, PINK, DATE, ic };
})();
