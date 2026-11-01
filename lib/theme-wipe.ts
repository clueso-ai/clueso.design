// Switching light and dark: a glimm iridescent band sweeps across the page at 135°, the angle of
// the cuts in the Clueso mark, from the top right (where the toggle is) to the bottom left. The new
// theme shows behind the band; the old one stays ahead of it until the band passes.
//
// glimm only sweeps along the x or y axis, so its canvas is drawn as a square the size of the
// window's diagonal and turned 45°. Its own band position then sets the edge of the old view.
//
// To feel instant, the band is made ahead of time (prepareThemeWipe, called when the toggle is
// hovered or focused) and kept, idle and transparent, for every switch after that.

import { accentChain, createShader, playSweep, type ShaderController } from "glimm";

/** The brand pinks, light to deep. */
const PALETTE = accentChain(["#FE89EB", "#DA5CC7", "#C12EAF"]);
const SWEEP_MS = 850;
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

/** `cursorless`: the Clueso cursor is drawn where the toggle is, so keep the native one hidden during the wipe. */
export function themeWipe(apply: () => void, dark: boolean, cursorless = false) {
	const b = canWipe() ? prepareThemeWipe() : null;
	if (!b) return apply();

	const root = document.documentElement;
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

	root.classList.add("theme-wipe");
	root.classList.toggle("theme-wipe-cursorless", cursorless);
	clip(0);
	b.ctrl.setBrightness(dark ? 0.75 : 1);
	const t = document.startViewTransition(apply);
	let raf = 0;
	t.ready
		.then(() => {
			raf = requestAnimationFrame(function frame() {
				clip(b.ctrl.getProgress());
				raf = requestAnimationFrame(frame);
			});
			// Fast out of the gate, soft landing: it moves from the very first frame.
			return playSweep(b.ctrl, { direction: "rtl", palette: PALETTE, sweepMs: SWEEP_MS, outroMs: 160, easing: "easeOutCubic", bandTight: BAND_TIGHT }).done;
		})
		.catch(() => {})
		.finally(() => t.skipTransition());
	t.finished.finally(() => {
		cancelAnimationFrame(raf);
		b.ctrl.setAlpha(0);
		b.ctrl.setProgress(0);
		root.classList.remove("theme-wipe", "theme-wipe-cursorless");
		root.style.removeProperty("--theme-wipe-old");
	});
}
