// Switching light and dark: a glimm iridescent band sweeps across the page at 135°, the angle of
// the cuts in the Clueso mark, from the top right (where the toggle is) to the bottom left. The new
// theme shows behind the band; the old one stays ahead of it until the band passes.
//
// glimm only sweeps along the x or y axis, so its canvas is drawn as a square the size of the
// window's diagonal and turned 45°. Its own band position then sets the edge of the old view.
//
// To feel instant, the band is made ahead of time (prepareThemeWipe, called when the toggle is
// hovered or focused) and kept, idle and transparent, for every switch after that.

import { accentChain, createShader, type ShaderController } from "glimm";
import { applySiteTheme, type SiteTheme } from "./theme";

/** The brand pinks, light to deep. */
const PALETTE = accentChain(["#FE89EB", "#DA5CC7", "#C12EAF"]);
const SWEEP_MS = 850;
const OUTRO_MS = 160;
const BAND_TIGHT = 70;
/** glimm's band travels from 1.2 to -0.2 across its canvas (direction "rtl"). */
const START = 1.2;
const END = -0.2;

let band: { canvas: HTMLCanvasElement; ctrl: ShaderController } | null = null;

const canWipe = () => !!document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Size the band's canvas to the window's diagonal, centred and turned 45°. */
function place(canvas: HTMLCanvasElement) {
	const side = Math.hypot(innerWidth, innerHeight);
	Object.assign(canvas.style, {
		left: `${(innerWidth - side) / 2}px`,
		top: `${(innerHeight - side) / 2}px`,
		width: `${side}px`,
		height: `${side}px`,
	});
}

/** Builds the band's WebGL canvas once. Cheap to call again. */
export function prepareThemeWipe() {
	if (band || !canWipe()) return band;
	// A band left by an earlier copy of this module (hot reload) would share the view-transition-name,
	// and the browser refuses to run a transition with duplicate names. Only one band at a time.
	document.querySelectorAll("[data-theme-band]").forEach((c) => c.remove());
	const canvas = document.createElement("canvas");
	canvas.setAttribute("aria-hidden", "true");
	canvas.dataset.themeBand = "";
	Object.assign(canvas.style, { position: "fixed", rotate: "-45deg", pointerEvents: "none", zIndex: "2147483647" });
	place(canvas);
	document.body.append(canvas);
	const ctrl = createShader({ canvas, palette: PALETTE, direction: "rtl", bandTight: BAND_TIGHT });
	if (!ctrl) {
		canvas.remove();
		return null;
	}
	window.addEventListener("resize", () => place(canvas), { passive: true });
	band = { canvas, ctrl };
	return band;
}

// Interruptible: switching again mid wipe turns the band around from where it is. The page under
// it never changes, so the band only has to say which view is showing. Back at the start the old
// view covers everything, so the old theme goes back on and the transition ends without a jump.

/** The wipe in progress. `turn(1)` heads for the new theme, `turn(0)` back to the old one. */
let wipe: { to: SiteTheme; turn: (aim: 0 | 1) => void } | null = null;

const easeOutCubic = (x: number) => 1 - (1 - x) ** 3;

/** `cursorless`: the Clueso cursor is drawn where the toggle is, so keep the native one hidden during the wipe. */
export function themeWipe(theme: SiteTheme, cursorless = false) {
	if (wipe) return wipe.turn(theme === wipe.to ? 1 : 0);

	const root = document.documentElement;
	const from: SiteTheme = root.classList.contains("dark") ? "dark" : "light";
	if (from === theme) return;
	const b = canWipe() ? prepareThemeWipe() : null;
	if (!b) return applySiteTheme(theme);

	const w = innerWidth;
	const h = innerHeight;
	const side = Math.hypot(w, h);
	// Old view ahead of the band: the half-plane on the far side of its centre line.
	const u = [Math.SQRT1_2, -Math.SQRT1_2]; // travel axis on screen (canvas +x, turned 45°)
	const v = [Math.SQRT1_2, Math.SQRT1_2]; // along the band
	const clip = (p: number) => {
		const pos = START + p * (END - START);
		const k = (pos - 0.5) * side;
		const c = [w / 2 + u[0] * k, h / 2 + u[1] * k];
		const L = side * 2;
		const pt = (a: number, d: number) => `${c[0] + v[0] * a - u[0] * d}px ${c[1] + v[1] * a - u[1] * d}px`;
		root.style.setProperty("--theme-wipe-old", `polygon(${pt(L, 0)}, ${pt(-L, 0)}, ${pt(-L, L)}, ${pt(L, L)})`);
	};

	// The band runs one leg at a time: from p0 towards aim, starting at t0. A turn starts a new leg from where it is.
	let aim: 0 | 1 = 1;
	let p = 0;
	let p0 = 0;
	let t0 = 0;
	let raf = 0;

	const frame = (now: number) => {
		// Each leg takes its share of the full sweep, so turning back near the start is quick.
		const ms = Math.max(80, SWEEP_MS * Math.abs(aim - p0));
		const raw = Math.min(1, (now - t0) / ms);
		p = p0 + (aim - p0) * easeOutCubic(raw);
		b.ctrl.setProgress(p);
		clip(p);
		if (raw < 1) {
			raf = requestAnimationFrame(frame);
		} else if (aim === 0) {
			// Back where it started: the old view covers the page, so the old theme goes back on unseen,
			// before the transition ends and shows the live page again.
			applySiteTheme(from);
			transition.skipTransition();
		} else {
			// Arrived. The band fades out on the spot, unless a switch turns it round first.
			const fade = (t: number) => {
				const x = Math.min(1, (t - now) / OUTRO_MS);
				b.ctrl.setAlpha(1 - x);
				if (x < 1) raf = requestAnimationFrame(fade);
				else transition.skipTransition();
			};
			raf = requestAnimationFrame(fade);
		}
	};
	const leg = () => {
		cancelAnimationFrame(raf);
		b.ctrl.setAlpha(1);
		p0 = p;
		t0 = performance.now();
		raf = requestAnimationFrame(frame);
	};

	root.classList.add("theme-wipe");
	root.classList.toggle("theme-wipe-cursorless", cursorless);
	clip(0);
	b.ctrl.setBrightness(theme === "dark" ? 0.75 : 1);
	const transition = document.startViewTransition(() => applySiteTheme(theme));
	let started = false;
	const current = {
		to: theme,
		turn(next: 0 | 1) {
			if (next === aim) return;
			aim = next;
			if (started) leg();
		},
	};
	wipe = current;

	transition.ready
		.then(() => {
			started = true;
			leg();
		})
		.catch(() => transition.skipTransition());
	transition.finished.finally(() => {
		cancelAnimationFrame(raf);
		// Whichever way the band was heading is the theme that stays, even if the wipe was cut short.
		applySiteTheme(aim ? theme : from);
		b.ctrl.setAlpha(0);
		b.ctrl.setProgress(0);
		root.classList.remove("theme-wipe", "theme-wipe-cursorless");
		root.style.removeProperty("--theme-wipe-old");
		if (wipe === current) wipe = null;
	});
}
