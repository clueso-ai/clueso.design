// Transition lab: transitions between two scenes, cut from the shapes of the Clueso mark. The mark is
// 45° slashes and quarter circles, so the bars slant at 45° and the iris is a quarter circle grown
// from a corner. Everything is Canvas 2D: clipping paths, a few fills and scaled redraws. One call
// draws one frame, so the same code runs the preview, the gallery icons, the timeline and the export.

import { rgbOf } from "./css-color";

export type TransitionId = "bars" | "blocks" | "glyphs" | "zoom" | "iris";
export type EasingId = "linear" | "out" | "spring" | "snappy";
export type Direction = "left" | "right" | "up" | "down";
export type Corner = "tl" | "tr" | "bl" | "br";

export const TRANSITIONS: { id: TransitionId; name: string; short: string; uses: "direction" | "corner" | null }[] = [
	{ id: "bars", name: "Bar wipe", short: "Bars", uses: "direction" },
	{ id: "blocks", name: "Block grid", short: "Blocks", uses: "direction" },
	{ id: "glyphs", name: "Glyph dissolve", short: "Glyphs", uses: "direction" },
	{ id: "zoom", name: "Zoom punch", short: "Zoom", uses: null },
	{ id: "iris", name: "Quarter iris", short: "Iris", uses: "corner" },
];

export const EASINGS: { value: EasingId; label: string }[] = [
	{ value: "linear", label: "Linear" },
	{ value: "out", label: "Ease out" },
	{ value: "spring", label: "Spring" },
	{ value: "snappy", label: "Snappy" },
];

/** A picture or a playing video, and its natural size. */
export type Scene = { src: CanvasImageSource; w: number; h: number };

/** Colours resolved from tokens, as CSS strings the canvas understands. */
export type Tones = { ink: string; paper: string };

/** How a transition looks. `edge` is the colour at its moving edge (null for none) and `edgeDark` says whether it's dark. */
export type Look = { easing: EasingId; direction: Direction; corner: Corner; edge: string | null; edgeDark: boolean; font: string; tones: Tones };

export type Timing = { duration: number; holdBefore: number; holdAfter: number };

// ── Easing ──

/** A CSS cubic-bezier, solved by bisection so steep curves stay exact. */
function bezier(x1: number, y1: number, x2: number, y2: number) {
	const at = (a: number, b: number, t: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
	return (x: number) => {
		if (x <= 0) return 0;
		if (x >= 1) return 1;
		let lo = 0;
		let hi = 1;
		for (let i = 0; i < 22; i++) {
			const mid = (lo + hi) / 2;
			if (at(x1, x2, mid) < x) lo = mid;
			else hi = mid;
		}
		return at(y1, y2, (lo + hi) / 2);
	};
}

const EASE: Record<EasingId, (x: number) => number> = {
	linear: (x) => clamp01(x),
	// The site's own ease-out-strong.
	out: bezier(0.23, 1, 0.32, 1),
	// A damped spring that overshoots by about 15% before it settles.
	spring: (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.exp(-6 * x) * Math.cos(x * Math.PI * 3.2)),
	snappy: bezier(0.85, 0, 0.15, 1),
};

/**
 * A good moment to show a paused transition: between halfway through the time and the moment the
 * easing reaches halfway, so steep ease-outs don't land on an almost finished frame.
 */
export function midpoint(id: EasingId) {
	let lo = 0;
	let hi = 1;
	for (let i = 0; i < 20; i++) {
		const mid = (lo + hi) / 2;
		if (EASE[id](mid) < 0.5) lo = mid;
		else hi = mid;
	}
	return (0.5 + hi) / 2;
}

// ── Timeline ──

/** The loop, which is also the exported clip: hold A, A to B, hold B. */
export const loopLength = (tm: Timing) => tm.holdBefore + tm.duration + tm.holdAfter;

/** Halfway through the transition, where the timeline hands over from scene A to scene B. */
export const handover = (tm: Timing) => tm.holdBefore + tm.duration / 2;

/** How far along the transition `time` is, 0 to 1. */
export function frameAt(tm: Timing, time: number) {
	return Math.min(1, Math.max(0, (time - tm.holdBefore) / tm.duration));
}

// ── Drawing ──

type Frame = {
	ctx: CanvasRenderingContext2D;
	W: number;
	H: number;
	t: number;
	a: Scene;
	b: Scene;
	ease: (x: number) => number;
	look: Look;
};

function clamp01(x: number) {
	return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** A steady pseudo-random number in [0, 1) for a grid cell. */
function hash(a: number, b: number, c = 0) {
	let h = Math.imul(a, 374761393) + Math.imul(b, 668265263) + Math.imul(c, 1442695041);
	h = Math.imul(h ^ (h >>> 13), 1274126177);
	return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Draws `s` to cover the box, cropped to it. */
function cover(ctx: CanvasRenderingContext2D, s: Scene, x: number, y: number, w: number, h: number) {
	if (!s.w || !s.h) return;
	const k = Math.max(w / s.w, h / s.h);
	const dw = s.w * k;
	const dh = s.h * k;
	ctx.save();
	ctx.beginPath();
	ctx.rect(x, y, w, h);
	ctx.clip();
	ctx.drawImage(s.src, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
	ctx.restore();
}

const full = (f: Frame, s: Scene) => cover(f.ctx, s, 0, 0, f.W, f.H);

/** Where a cell centre sits along the direction of travel, 0 where the move starts and 1 where it ends. */
function along(dir: Direction, x: number, y: number) {
	return dir === "right" ? x : dir === "left" ? 1 - x : dir === "down" ? y : 1 - y;
}

/**
 * A frame for directional wipes. Shapes are laid out travelling along +u across a length L, with
 * breadth M, then turned to face the chosen direction. Turning (not mirroring) keeps the slashes
 * leaning the same way as the mark's.
 */
function framePoint(dir: Direction, W: number, H: number) {
	switch (dir) {
		case "left":
			return { L: W, M: H, p: (u: number, v: number): [number, number] => [W - u, H - v] };
		case "down":
			return { L: H, M: W, p: (u: number, v: number): [number, number] => [W - v, u] };
		case "up":
			return { L: H, M: W, p: (u: number, v: number): [number, number] => [v, H - u] };
		default:
			return { L: W, M: H, p: (u: number, v: number): [number, number] => [u, v] };
	}
}

function poly(path: Path2D, pts: [number, number][]) {
	path.moveTo(...pts[0]);
	for (let i = 1; i < pts.length; i++) path.lineTo(...pts[i]);
	path.closePath();
}

/** Diagonal bars, like the mark's slashes, sweep across row by row. An edge slash leads each one. */
function bars(f: Frame) {
	const { ctx, W, H, t, ease } = f;
	const { edge } = f.look;
	full(f, f.a);
	const rows = 5;
	const stagger = 0.09;
	const span = 1 - stagger * (rows - 1);
	const { L, M, p } = framePoint(f.look.direction, W, H);
	const h = M / rows;
	const bw = edge ? Math.min(W, H) * 0.08 : 0;
	const reach = L + h + bw;
	const reveal = new Path2D();
	const rim = new Path2D();
	for (let i = 0; i < rows; i++) {
		const x = ease(clamp01((t - i * stagger) / span)) * reach;
		if (x <= 0) continue;
		const y0 = i * h - 0.5;
		const y1 = (i + 1) * h + 0.5;
		// The front leans like "\": the top trails the bottom by one bar height, a 45° slash.
		poly(reveal, [p(-2, y0), p(x - bw - h, y0), p(x - bw, y1), p(-2, y1)]);
		if (edge) poly(rim, [p(x - bw - h, y0), p(x - h, y0), p(x, y1), p(x - bw, y1)]);
	}
	if (edge) {
		ctx.fillStyle = edge;
		ctx.fill(rim);
	}
	ctx.save();
	ctx.clip(reveal);
	full(f, f.b);
	ctx.restore();
}

/** A quarter circle grows from a corner, a ring of the edge colour at its rim. */
function iris(f: Frame) {
	const { ctx, W, H, t, ease } = f;
	const { edge } = f.look;
	full(f, f.a);
	const c = f.look.corner;
	const cx = c === "tr" || c === "br" ? W : 0;
	const cy = c === "bl" || c === "br" ? H : 0;
	const bw = edge ? Math.min(W, H) * 0.06 : 0;
	const outer = Math.max(0, ease(t) * (Math.hypot(W, H) + bw));
	const inner = Math.max(0, outer - bw);
	if (edge && outer > 0) {
		ctx.fillStyle = edge;
		ctx.beginPath();
		ctx.arc(cx, cy, outer, 0, Math.PI * 2);
		ctx.fill();
	}
	if (inner <= 0) return;
	ctx.save();
	ctx.beginPath();
	ctx.arc(cx, cy, inner, 0, Math.PI * 2);
	ctx.clip();
	full(f, f.b);
	ctx.restore();
}

/** The frame breaks into squares that scale in one after another, an edge-coloured square first. */
function blocks(f: Frame) {
	const { ctx, W, H, t, ease } = f;
	const { edge } = f.look;
	full(f, f.a);
	const target = Math.min(W, H) / 5;
	const cols = Math.max(1, Math.round(W / target));
	const rows = Math.max(1, Math.round(H / target));
	const cw = W / cols;
	const ch = H / rows;
	const reveal = new Path2D();
	const rim = new Path2D();
	const square = (path: Path2D, x: number, y: number, s: number) => {
		if (s <= 0.001) return;
		// Corners round off as a square starts and go square as it lands, so the grid closes up.
		const grow = s >= 0.999 ? 0.75 : 0;
		const w = cw * s + grow * 2;
		const h = ch * s + grow * 2;
		path.roundRect(x + (cw - w) / 2, y + (ch - h) / 2, w, h, Math.min(cw, ch) * 0.2 * clamp01(1 - s));
	};
	for (let j = 0; j < rows; j++) {
		for (let i = 0; i < cols; i++) {
			const delay = along(f.look.direction, (i + 0.5) / cols, (j + 0.5) / rows) * 0.45 + hash(i, j) * 0.15;
			const local = clamp01((t - delay) / 0.4);
			const x = i * cw;
			const y = j * ch;
			if (edge) {
				square(rim, x, y, ease(clamp01(local / 0.7)));
				square(reveal, x, y, ease(clamp01((local - 0.3) / 0.7)));
			} else square(reveal, x, y, ease(local));
		}
	}
	if (edge) {
		ctx.fillStyle = edge;
		ctx.fill(rim);
	}
	ctx.save();
	ctx.clip(reveal);
	full(f, f.b);
	ctx.restore();
}

const GLYPHS = "/\\+×#%&@$<>{}[]*=~^01";

/** A field of monospace glyphs fills the frame over A, then clears cell by cell to show B. */
function glyphs(f: Frame) {
	const { ctx, W, H, t, ease, look } = f;
	const { ink, paper } = look.tones;
	// The glyphs take the edge colour (paper without one) on ink, or on paper when the edge is dark.
	const ground = look.edge && look.edgeDark ? paper : ink;
	const mark = look.edge ?? paper;
	const size = Math.min(W, H) / 16;
	const cols = Math.ceil(W / size);
	const rows = Math.ceil(H / size);
	const e = ease(t);
	const reveal = new Path2D();
	const field = new Path2D();
	const lit: [number, number][] = [];
	for (let j = 0; j < rows; j++) {
		for (let i = 0; i < cols; i++) {
			const u = along(look.direction, (i + 0.5) / cols, (j + 0.5) / rows);
			// Every cell is lit by halfway and cleared by the end.
			const on = (0.6 * hash(i, j, 1) + 0.4 * u) * 0.5;
			const off = 0.5 + (0.6 * hash(i, j, 2) + 0.4 * u) * 0.5;
			if (e < on) continue;
			const x = i * size;
			const y = j * size;
			if (e >= off) reveal.rect(x - 0.5, y - 0.5, size + 1, size + 1);
			else {
				field.rect(x - 0.5, y - 0.5, size + 1, size + 1);
				lit.push([i, j]);
			}
		}
	}
	full(f, f.a);
	ctx.save();
	ctx.clip(reveal);
	full(f, f.b);
	ctx.restore();
	ctx.fillStyle = ground;
	ctx.fill(field);
	ctx.fillStyle = mark;
	ctx.font = `${Math.round(size * 0.78)}px ${look.font}`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	// The glyphs flicker as they sit, about 20 changes a second at a one-second transition.
	const tick = Math.floor(t * 20);
	for (const [i, j] of lit) ctx.fillText(GLYPHS[Math.floor(hash(i, j, tick + 3) * GLYPHS.length)], (i + 0.5) * size, (j + 0.55) * size);
}

/** A scene scaled about the centre, smeared outwards by `blur` with a few averaged redraws. */
function zoomed(f: Frame, s: Scene, scale: number, blur: number) {
	const { ctx, W, H } = f;
	const copies = blur > 0.02 ? 7 : 1;
	for (let i = 0; i < copies; i++) {
		const k = scale * (1 + (copies > 1 ? (blur * 0.22 * i) / (copies - 1) : 0));
		// Drawing copy i at 1/(i+1) keeps a running average of all the copies.
		ctx.globalAlpha = 1 / (i + 1);
		cover(ctx, s, (W - W * k) / 2, (H - H * k) / 2, W * k, H * k);
	}
	ctx.globalAlpha = 1;
}

/** A pushes in hard and blurs, then B lands from a little too close. A flash of the edge colour marks the cut. */
function zoom(f: Frame) {
	const { ctx, W, H, t, ease } = f;
	const { edge } = f.look;
	const cut = 0.5;
	if (t < cut) {
		const k = (t / cut) ** 3;
		zoomed(f, f.a, 1 + 1.4 * k, k);
	} else {
		const e = ease((t - cut) / (1 - cut));
		zoomed(f, f.b, Math.max(1, 1 + 0.5 * (1 - e)), clamp01(1 - e) * 0.8);
	}
	if (edge) {
		ctx.globalAlpha = 0.9 * clamp01(1 - Math.abs(t - cut) / 0.1);
		ctx.fillStyle = edge;
		ctx.fillRect(0, 0, W, H);
		ctx.globalAlpha = 1;
	}
}

const DRAW: Record<TransitionId, (f: Frame) => void> = { bars, blocks, glyphs, zoom, iris };

/** Draws one frame of transition `id` from scene a to scene b, `t` from 0 to 1. */
export function drawTransition(ctx: CanvasRenderingContext2D, W: number, H: number, id: TransitionId, t: number, a: Scene, b: Scene, look: Look) {
	ctx.save();
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.globalAlpha = 1;
	ctx.globalCompositeOperation = "source-over";
	ctx.fillStyle = look.tones.ink;
	ctx.fillRect(0, 0, W, H);
	if (t <= 0) cover(ctx, a, 0, 0, W, H);
	else if (t >= 1) cover(ctx, b, 0, 0, W, H);
	else DRAW[id]({ ctx, W, H, t, a, b, ease: EASE[look.easing], look });
	ctx.restore();
}

// ── Colour ──

/** Resolves any CSS colour (a token like var(--x) too) through the cascade on `probe`, and paints it to one pixel for its RGB. */
export function readColor(probe: HTMLElement, color: string) {
	const { r, g, b } = rgbOf(probe, color);
	return { css: `rgb(${r}, ${g}, ${b})`, lum: (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 };
}

/**
 * The transition's own colours. Ink is the portrait near-black, the same in both themes so an export
 * doesn't depend on the site's mode. Paper is whichever of the page and the strongest text is lighter.
 */
export function resolveTones(probe: HTMLElement): Tones {
	const page = readColor(probe, "var(--surface-page)");
	const text = readColor(probe, "var(--fg-neutral-strong)");
	return { ink: readColor(probe, "var(--surface-portrait)").css, paper: (page.lum > text.lum ? page : text).css };
}

/** A small 16:9 card of one flat colour with a square of another in the middle, to stand in for a scene. */
export function flatScene(ground: string, square: string): Scene {
	const c = document.createElement("canvas");
	c.width = 32;
	c.height = 18;
	const ctx = c.getContext("2d")!;
	ctx.fillStyle = ground;
	ctx.fillRect(0, 0, 32, 18);
	ctx.fillStyle = square;
	ctx.fillRect(12, 5, 8, 8);
	return { src: c, w: 32, h: 18 };
}
