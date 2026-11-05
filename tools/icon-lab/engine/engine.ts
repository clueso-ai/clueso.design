// Icon engine: icons from the sets → SVG markup. Ported from the standalone app's icon-engine.js;
// the drawing output is unchanged.
//
// Every library icon is a Figma export from the Sharp set (data/library.ts), placed on the 24 grid
// at its original size and position, so its construction lines sit on whole grid units as
// Streamline drew them. Icons whose outer edge (at a 1.5 stroke) crosses the 1-unit safe area are
// scaled down to fit and snapped back onto the half-unit grid. Generated icons go through the same
// steps. Controls: stroke (line icons only, default 1.5), corner roundness (0 or 0.5), colour, and
// export size.

import { CLUESO_SET } from "../data/clueso-set.ts";
import { ICON_LIBRARY } from "../data/library.ts";
import { PIXEL_DOTS } from "../data/pixel-dots.ts";
import { PIXEL_LINE } from "../data/pixel-line.ts";
import { PIXEL_MATRIX } from "../data/pixel-matrix.ts";
import { PIXEL_SET } from "../data/pixel-set.ts";
import { SIGNATURE_SET } from "../data/signature-set.ts";
import { LIBRARY_REDRAWS, LIBRARY_TWEAKS, SITE_SET } from "../data/site-set.ts";
import type { CluesoEntry, CluesoOption, Cut, Parts, SignatureEntry, SignatureIconEntry, SiteEntry, SiteVariant } from "../data/types.ts";
import type { Box, Cell, DrawOptions, Icon, Pt, Seg, Subpath } from "./types.ts";

export const GRID = 24;
// The grid, after the standard (Material) system-icon grid, kept sharp: 24 × 24 with 2 units of
// padding, so a 20 × 20 live area (2–22). Keylines are measured on the OUTER edge of the drawing:
// square 18 (3–21), circle 20 (2–22), portrait 16 × 20, landscape 20 × 16. Outer edges of strokes
// sit on whole grid units (so a 1.5 stroke's centre line sits at .75 / .25). No corner radius.
export const KEYLINES = { padding: 2, circle: 20, square: 18, portrait: [16, 20] as [number, number], landscape: [20, 16] as [number, number], radius: 0, centreCircle: 10 };
// Keyline box [width, height] per shape class (outer edge).
export const KEYLINE_BOX: Record<string, [number, number]> = {
	circle: [KEYLINES.circle, KEYLINES.circle],
	square: [KEYLINES.square, KEYLINES.square],
	portrait: KEYLINES.portrait,
	landscape: KEYLINES.landscape,
};
// Outer boxes are measured at the default stroke.
export const FIT_STROKE = 1.5;
export const DEFAULTS = { stroke: 1.5, round: 0, color: "#F5F3E7" };
const STOP = new Set(["icon", "a", "an", "the", "for", "of", "and", "with", "i", "need", "want", "make", "me"]);

function fmt(n: number) {
	return Number(n.toFixed(4)).toString();
}

// Trailing "s" → singular, so "envelopes" matches "envelope".
function normalise(word: string) {
	if (word.length > 3 && word.endsWith("s")) return word.slice(0, -1);
	return word;
}

// Score each icon by how many prompt words hit its keywords. Name hits count double.
export function matchIcon(prompt: string, style: "line" | "solid" = "line") {
	const words = (String(prompt || "").toLowerCase().match(/[a-z]+/g) || []).filter((w) => !STOP.has(w)).flatMap((w) => [w, normalise(w)]);
	if (!words.length) return null;
	let best: Icon | null = null;
	let bestScore = 0;
	// The Clueso set (icons on clueso.io) in the current style.
	for (const icon of cluesoSet[style] || []) {
		let score = 0;
		for (const w of words) {
			if (w === icon.name) score += 2;
			else if (icon.keywords.includes(w)) score += 1;
		}
		if (score > bestScore) {
			best = icon;
			bestScore = score;
		}
	}
	return best;
}

// ---- Paths -----------------------------------------------------------------
// parsePath reads any SVG path (absolute or relative M L H V C S Q T A Z) into subpaths of absolute
// segments: L (line), C (cubic) and A (arc). Q/T become C, S is expanded. With strict, anything
// unreadable throws, so generated paths are either fully understood or rejected.

const TOKEN = /[MLHVCSQTAZ]|[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;
const ARGS: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };

export function parsePath(d: string, strict = false): Subpath[] {
	const tokens = String(d).match(TOKEN) || [];
	if (strict) {
		const rest = String(d).replace(TOKEN, "").replace(/[\s,]/g, "");
		if (rest) throw new Error(`unreadable path data: "${rest.slice(0, 20)}"`);
	}
	const subpaths: Subpath[] = [];
	let sp: Subpath | null = null;
	let cur: Pt = [0, 0];
	let lastCtrl: Pt | null = null; // reflection point for S / T
	let lastQ: Pt | null = null;
	let cmd: string | null = null;
	let i = 0;
	const num = () => {
		const n = Number(tokens[i++]);
		if (!Number.isFinite(n)) throw new Error("bad number in path");
		return n;
	};
	const ensure = (): Subpath => {
		if (!sp) {
			if (strict) throw new Error("path must start with M");
			sp = { start: cur, segs: [], closed: false };
			subpaths.push(sp);
		}
		return sp;
	};
	while (i < tokens.length) {
		if (/^[a-z]$/i.test(tokens[i])) cmd = tokens[i++];
		else if (cmd === null) throw new Error("path must start with a command");
		const c = cmd as string;
		const up = c.toUpperCase();
		const rel = c !== up && up !== "Z";
		if (ARGS[up] === undefined) throw new Error(`unsupported command ${c}`);
		if (up !== "Z" && tokens.length - i < ARGS[up]) throw new Error(`missing numbers after ${c}`);
		const pt = (x: number, y: number): Pt => (rel ? [cur[0] + x, cur[1] + y] : [x, y]);
		let ctrl: Pt | null = null;
		let q: Pt | null = null;
		if (up === "M") {
			cur = pt(num(), num());
			sp = { start: cur, segs: [], closed: false };
			subpaths.push(sp);
			cmd = rel ? "l" : "L"; // extra pairs after M are lines
		} else if (up === "Z") {
			const s = ensure();
			if (dist(cur, s.start) > 1e-6) s.segs.push({ t: "L", from: cur, to: s.start });
			s.closed = true;
			cur = s.start;
			sp = null; // a following command without M starts from the same point
			cmd = null;
		} else {
			const s = ensure();
			const from = cur;
			if (up === "L" || up === "T") {
				const to = pt(num(), num());
				if (up === "T") {
					const cc: Pt = lastQ ? [2 * from[0] - lastQ[0], 2 * from[1] - lastQ[1]] : from;
					q = cc;
					s.segs.push(quadToCubic(from, cc, to));
				} else {
					s.segs.push({ t: "L", from, to });
				}
				cur = to;
			} else if (up === "H") {
				const x = num();
				const to: Pt = [rel ? cur[0] + x : x, cur[1]];
				s.segs.push({ t: "L", from, to });
				cur = to;
			} else if (up === "V") {
				const y = num();
				const to: Pt = [cur[0], rel ? cur[1] + y : y];
				s.segs.push({ t: "L", from, to });
				cur = to;
			} else if (up === "C" || up === "S") {
				const c1: Pt = up === "C" ? pt(num(), num()) : lastCtrl ? [2 * from[0] - lastCtrl[0], 2 * from[1] - lastCtrl[1]] : from;
				const c2 = pt(num(), num());
				const to = pt(num(), num());
				s.segs.push({ t: "C", from, c1, c2, to });
				ctrl = c2;
				cur = to;
			} else if (up === "Q") {
				const cc = pt(num(), num());
				const to = pt(num(), num());
				s.segs.push(quadToCubic(from, cc, to));
				q = cc;
				cur = to;
			} else if (up === "A") {
				const rx = Math.abs(num());
				const ry = Math.abs(num());
				const rot = num();
				const large = num() ? 1 : 0;
				const sweep = num() ? 1 : 0;
				const to = pt(num(), num());
				s.segs.push({ t: "A", from, rx, ry, rot, large, sweep, to });
				cur = to;
			}
		}
		lastCtrl = ctrl;
		lastQ = q;
	}
	return subpaths;
}

function quadToCubic(from: Pt, c: Pt, to: Pt): Seg {
	return {
		t: "C",
		from,
		c1: [from[0] + (2 / 3) * (c[0] - from[0]), from[1] + (2 / 3) * (c[1] - from[1])],
		c2: [to[0] + (2 / 3) * (c[0] - to[0]), to[1] + (2 / 3) * (c[1] - to[1])],
		to,
	};
}

function dist(a: Pt, b: Pt) {
	return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

// Exact bounding box of parsed subpaths: lines, cubic curves (their real extremes, not the control
// points) and arcs.
export function pathBounds(subpaths: Subpath[]) {
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	const add = ([x, y]: Pt) => {
		minX = Math.min(minX, x);
		maxX = Math.max(maxX, x);
		minY = Math.min(minY, y);
		maxY = Math.max(maxY, y);
	};
	for (const sp of subpaths) {
		add(sp.start);
		for (const s of sp.segs) {
			add(s.to);
			if (s.t === "C") cubicExtremes(s).forEach(add);
			if (s.t === "A") arcPoints(s, 32).forEach(add);
		}
	}
	return { minX, minY, maxX, maxY };
}

function cubicAt(s: Seg, t: number): Pt {
	const u = 1 - t;
	const f = (i: 0 | 1) => u * u * u * s.from[i] + 3 * u * u * t * s.c1![i] + 3 * u * t * t * s.c2![i] + t * t * t * s.to[i];
	return [f(0), f(1)];
}

// Points where a cubic curve turns in x or y (roots of its derivative in 0..1).
function cubicExtremes(s: Seg) {
	const pts: Pt[] = [];
	for (const i of [0, 1] as const) {
		const p0 = s.from[i];
		const p1 = s.c1![i];
		const p2 = s.c2![i];
		const p3 = s.to[i];
		const a = -p0 + 3 * p1 - 3 * p2 + p3;
		const b = 2 * (p0 - 2 * p1 + p2);
		const c = p1 - p0;
		const roots: number[] = [];
		if (Math.abs(a) < 1e-12) {
			if (Math.abs(b) > 1e-12) roots.push(-c / b);
		} else {
			const disc = b * b - 4 * a * c;
			if (disc >= 0) {
				const sq = Math.sqrt(disc);
				roots.push((-b + sq) / (2 * a), (-b - sq) / (2 * a));
			}
		}
		roots.filter((t) => t > 0 && t < 1).forEach((t) => pts.push(cubicAt(s, t)));
	}
	return pts;
}

// Sample points along an SVG arc (endpoint form converted to centre form, per the SVG spec).
function arcPoints(s: Seg, n: number): Pt[] {
	const [x1, y1] = s.from;
	const [x2, y2] = s.to;
	let rx = s.rx!;
	let ry = s.ry!;
	if (rx < 1e-9 || ry < 1e-9) return [s.from, s.to];
	const phi = (s.rot! * Math.PI) / 180;
	const cos = Math.cos(phi);
	const sin = Math.sin(phi);
	const dx = (x1 - x2) / 2;
	const dy = (y1 - y2) / 2;
	const x1p = cos * dx + sin * dy;
	const y1p = -sin * dx + cos * dy;
	const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
	if (lambda > 1) {
		rx *= Math.sqrt(lambda);
		ry *= Math.sqrt(lambda);
	}
	const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
	const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
	let k = Math.sqrt(Math.max(0, num / den));
	if (s.large === s.sweep) k = -k;
	const cxp = (k * rx * y1p) / ry;
	const cyp = (-k * ry * x1p) / rx;
	const cx = cos * cxp - sin * cyp + (x1 + x2) / 2;
	const cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
	const ang = (ux: number, uy: number, vx: number, vy: number) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
	const t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
	let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
	if (!s.sweep && dt > 0) dt -= 2 * Math.PI;
	if (s.sweep && dt < 0) dt += 2 * Math.PI;
	const pts: Pt[] = [];
	for (let i = 0; i <= n; i++) {
		const t = t1 + (dt * i) / n;
		const x = rx * Math.cos(t);
		const y = ry * Math.sin(t);
		pts.push([cos * x - sin * y + cx, sin * x + cos * y + cy]);
	}
	return pts;
}

// ---- Placement ---------------------------------------------------------------
// Shape class (for reference): wide → landscape, tall → portrait, otherwise circle when most of the
// drawing is curves, else square.

function segLength(s: Seg) {
	if (s.t === "L") return dist(s.from, s.to);
	if (s.t === "C") {
		const chord = dist(s.from, s.to);
		const poly = dist(s.from, s.c1!) + dist(s.c1!, s.c2!) + dist(s.c2!, s.to);
		return (chord + poly) / 2;
	}
	const pts = arcPoints(s, 16);
	return pts.slice(1).reduce((sum, p, i) => sum + dist(pts[i], p), 0);
}

function shapeClass(subpaths: Subpath[], w: number, h: number) {
	const ratio = w / h;
	if (ratio >= 1.15) return "landscape";
	if (ratio <= 1 / 1.15) return "portrait";
	let curved = 0;
	let total = 0;
	for (const sp of subpaths) {
		for (const s of sp.segs) {
			const len = segLength(s);
			total += len;
			if (s.t !== "L") curved += len;
		}
	}
	return total && curved / total > 0.5 ? "circle" : "square";
}

function iconSubpaths(icon: Icon) {
	return [...icon.body.matchAll(/ d="([^"]*)"/g)].flatMap((m) => parsePath(m[1]));
}

// A few Figma exports start a fraction of a unit off their frame's grid. Find the fractional shift
// that puts the most straight-line ends on whole or half units, and use it only when it is clearly
// better than no shift.
function gridOffset(values: number[]) {
	const onGrid = (v: number) => {
		const f = Math.abs(v * 2 - Math.round(v * 2));
		return f < 0.04;
	};
	const score = (t: number) => values.filter((v) => onGrid(v + t)).length;
	const base = score(0);
	let best = 0;
	let bestScore = base;
	for (const v of values) {
		const t = Math.round(-v * 2) / 2 - v; // shift that lands v on the nearest half unit
		if (Math.abs(t) < 0.02) continue;
		const sc = score(t);
		if (sc > bestScore) {
			best = t;
			bestScore = sc;
		}
	}
	return bestScore >= base * 1.5 && bestScore - base >= 3 ? best : 0;
}

// Whole-unit translation that centres the span lo..hi on the grid, preferring the step that keeps it
// on the artboard. Whole units keep the drawing's own grid lined up with the 24 grid.
function placeOnGrid(lo: number, hi: number, offset: number) {
	const ideal = 12 - (lo + hi) / 2;
	const overflow = (t: number) => Math.max(0, -(lo + t)) + Math.max(0, hi + t - GRID);
	// Steps with the correction first; plain whole-unit steps only if the corrected ones would push a
	// full-width icon off the artboard.
	const withOffset = [Math.floor(ideal - offset), Math.ceil(ideal - offset)].map((k) => k + offset);
	const plain = [Math.floor(ideal), Math.ceil(ideal)];
	const pick = (steps: number[]) => [...steps].sort((a, b) => overflow(a) - overflow(b) || Math.abs(a - ideal) - Math.abs(b - ideal))[0];
	const corrected = pick(withOffset);
	const fallback = pick(plain);
	return overflow(corrected) > overflow(fallback) + 1e-9 ? fallback : corrected;
}

// Sets scale, tx, ty, the shape class and the outer box on the icon. Library icons keep their
// original Sharp size: 1 Figma unit = 1 grid unit (icon.unit px each). Figma exports almost always
// start on a whole unit of their frame, so their coordinates are already on the grid; they are moved
// in whole-unit steps to centre them (plus a small correction for the few that don't). The originals
// are optically sized: round icons run their centre lines from 1 to 23, square ones from 2 to 22,
// and some solids touch the artboard edge. Generated icons are drawn in grid units already, so they
// keep their size too, unless they spill past the 24 × 24 artboard.
function placeIcon(icon: Icon) {
	const subpaths = iconSubpaths(icon);
	const b = pathBounds(subpaths);
	const w = Math.max(b.maxX - b.minX, 1e-6);
	const h = Math.max(b.maxY - b.minY, 1e-6);
	const inset = icon.style === "line" ? FIT_STROKE : 0; // the stroke sits half outside the centre line
	let scale = icon.unit ? 1 / icon.unit : 1;
	// A generated drawing that runs off the artboard is shrunk into the safe area.
	const spill = Math.max(scale * w, scale * h) + inset;
	if (!icon.unit && spill > GRID) scale = (GRID - 2 * KEYLINES.padding - inset) / Math.max(w, h);
	const xs: number[] = [];
	const ys: number[] = [];
	for (const sp of subpaths) {
		for (const seg of sp.segs) {
			if (seg.t !== "L") continue;
			for (const p of [seg.from, seg.to]) {
				xs.push(p[0] * scale);
				ys.push(p[1] * scale);
			}
		}
	}
	// Native icons are already placed on the grid by hand; don't move them.
	const tx = icon.native ? 0 : placeOnGrid(b.minX * scale - inset / 2, b.maxX * scale + inset / 2, gridOffset(xs));
	const ty = icon.native ? 0 : placeOnGrid(b.minY * scale - inset / 2, b.maxY * scale + inset / 2, gridOffset(ys));
	const box = {
		x0: tx + b.minX * scale - inset / 2,
		y0: ty + b.minY * scale - inset / 2,
		x1: tx + b.maxX * scale + inset / 2,
		y1: ty + b.maxY * scale + inset / 2,
	};
	Object.assign(icon, { shape: shapeClass(subpaths, w, h), scale, tx, ty, box, refit: false });
	// Icons drawn natively on this grid (the site set) are placed as drawn.
	if (icon.native && insideSafeArea(box)) return icon;
	return refitToGrid(icon, subpaths, inset);
}

const insideSafeArea = (box: Box) => {
	const lo = KEYLINES.padding - 0.01;
	const hi = GRID - KEYLINES.padding + 0.01;
	return box.x0 >= lo && box.y0 >= lo && box.x1 <= hi && box.y1 <= hi;
};

// Fits an icon to the grid as a whole: one uniform scale and one translation, so every joint, angle
// and curve stays exactly as drawn (moving points one by one bends diagonals and opens gaps where
// shapes meet). It shrinks (never grows, except rotated options) to its shape's keyline inside the
// 2-unit padding, then searches scales just below that and positions for the fit that puts the most
// horizontal and vertical stroke edges on whole grid units: a stroke's OUTER edge (centre line ±
// 0.75 at the 1.5 stroke, outward from the icon's centre), or a solid's edge itself.
function refitToGrid(icon: Icon, subpaths: Subpath[], inset: number) {
	const toGrid = ([x, y]: Pt): Pt => [x * icon.scale + icon.tx, y * icon.scale + icon.ty];
	const b = pathBounds(subpaths);
	const [gx0, gy0] = toGrid([b.minX, b.minY]);
	const [gx1, gy1] = toGrid([b.maxX, b.maxY]);
	const W = Math.max(gx1 - gx0, 1e-6);
	const H = Math.max(gy1 - gy0, 1e-6);
	const cx = (gx0 + gx1) / 2;
	const cy = (gy0 + gy1) / 2;
	const pad = KEYLINES.padding;
	const live = GRID - 2 * pad;
	const [kw, kh] = KEYLINE_BOX[icon.shape ?? ""] || [live, live];
	// Rotated (diagonal) options fill the live area less one unit (pointed tips reach past the
	// stroke) and may grow to it; everything else only shrinks.
	const fMax = icon.fitTo === "live" ? (live - inset - 1) / Math.max(W, H) : Math.min(1, (live - inset) / Math.max(W, H), (kw - inset) / W, (kh - inset) / H);

	// Axis-aligned edges to line up, relative to the icon's centre (grid units).
	type Edge = { rel: number; half: number; len: number };
	const xs: Edge[] = [];
	const ys: Edge[] = [];
	for (const m of icon.body.matchAll(/<path\b[^>]*>/g)) {
		const stroked = icon.style === "line" && /stroke=/.test(m[0]);
		const half = stroked ? inset / 2 : 0;
		const d = (m[0].match(/ d="([^"]*)"/) || [])[1];
		if (!d) continue;
		for (const sp of parsePath(d)) {
			for (const seg of sp.segs) {
				if (seg.t !== "L") continue;
				const [ax, ay] = toGrid(seg.from);
				const [bx, by] = toGrid(seg.to);
				if (Math.abs(ax - bx) < 1e-6 && Math.abs(ay - by) > 1e-6) xs.push({ rel: ax - cx, half, len: Math.abs(ay - by) });
				if (Math.abs(ay - by) < 1e-6 && Math.abs(ax - bx) > 1e-6) ys.push({ rel: ay - cy, half, len: Math.abs(ax - bx) });
			}
		}
	}
	const frac = (v: number) => v - Math.floor(v);
	const edge = (e: Edge, f: number) => 12 + f * e.rel + (e.rel < -1e-6 ? -e.half : e.rel > 1e-6 ? e.half : 0);
	// Best fractional shift for one axis at scale f, weighted by edge length.
	const bestShift = (edges: Edge[], f: number) => {
		let best = { t: 0, score: 0 };
		for (const e of edges) {
			const t = frac(-edge(e, f));
			let score = 0;
			for (const o of edges) {
				const r = frac(edge(o, f) + t);
				if (r < 0.015 || r > 0.985) score += o.len;
			}
			if (score > best.score + 1e-9) best = { t, score };
		}
		return best;
	};
	// The whole-unit step that keeps the drawing inside the padding, closest to centred.
	const place = (t: number, lo: number, hi: number) => {
		const options = [t, t - 1, t + 1].filter((d) => lo + d >= pad - 1e-6 && hi + d <= GRID - pad + 1e-6);
		return options.length ? options.sort((a, b2) => Math.abs(a) - Math.abs(b2))[0] : null;
	};

	let best: { f: number; dx: number; dy: number; score?: number } | null = null;
	const searching = !icon.noSnap && (xs.length || ys.length);
	const steps = searching ? 100 : 0;
	for (let i = 0; i <= steps; i++) {
		const f = fMax * (1 - i * 0.001);
		const sx = searching ? bestShift(xs, f) : { t: 0, score: 0 };
		const sy = searching ? bestShift(ys, f) : { t: 0, score: 0 };
		const x0 = 12 - (f * W) / 2 - inset / 2;
		const y0 = 12 - (f * H) / 2 - inset / 2;
		const dx = place(sx.t, x0, x0 + f * W + inset);
		const dy = place(sy.t, y0, y0 + f * H + inset);
		if (dx === null || dy === null) continue;
		// Prefer more aligned edge length; among equals, the larger size.
		const score = sx.score + sy.score - i * 4e-4;
		if (!best || score > best.score!) best = { f, dx, dy, score };
	}
	if (!best) best = { f: fMax, dx: 0, dy: 0 };

	const { f, dx, dy } = best;
	Object.assign(icon, {
		scale: icon.scale * f,
		tx: 12 + f * (icon.tx - cx) + dx,
		ty: 12 + f * (icon.ty - cy) + dy,
		refit: true,
		box: {
			x0: 12 - (f * W) / 2 + dx - inset / 2,
			y0: 12 - (f * H) / 2 + dy - inset / 2,
			x1: 12 + (f * W) / 2 + dx + inset / 2,
			y1: 12 + (f * H) / 2 + dy + inset / 2,
		},
	});
	return icon;
}

// ---- Optical alignment --------------------------------------------------------
// Technical centring (bounding box on the grid) isn't always visual centring: a play triangle or a
// leaf carries its weight off-centre. The visual centre is measured from the centre of the ink (area
// for solids and closed outlines, stroke length for open lines). Clearly unbalanced icons are nudged
// a third of the way toward it, in quarter units, never past the padding.

// Flatten subpaths to polylines in grid units.
function flatten(subpaths: Subpath[], T: (p: Pt) => Pt) {
	return subpaths.map((sp) => {
		const pts = [T(sp.start)];
		for (const s of sp.segs) {
			if (s.t === "C") for (let i = 1; i <= 12; i++) pts.push(T(cubicAt(s, i / 12)));
			else if (s.t === "A")
				arcPoints(s, 16)
					.slice(1)
					.forEach((p) => pts.push(T(p)));
			else pts.push(T(s.to));
		}
		return { pts, closed: sp.closed };
	});
}

function insideEvenOdd(polys: { pts: Pt[] }[], x: number, y: number) {
	let inside = false;
	for (const { pts } of polys) {
		for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
			const [xi, yi] = pts[i];
			const [xj, yj] = pts[j];
			if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
		}
	}
	return inside;
}

// Centre of the ink: area of filled or closed shapes, length of open strokes.
export function inkCentre(icon: Icon): Pt {
	const T = ([x, y]: Pt): Pt => [x * icon.scale + icon.tx, y * icon.scale + icon.ty];
	const polys = flatten(iconSubpaths(icon), T);
	let sx = 0;
	let sy = 0;
	let sw = 0;
	// Solids are weighed by area; line icons by stroke only (the space inside an outline isn't ink).
	const closed = icon.style === "solid" ? polys.filter((p) => p.closed && p.pts.length > 2) : [];
	if (closed.length) {
		const { x0, y0, x1, y1 } = icon.box;
		const step = 0.25;
		for (let y = y0 + step / 2; y < y1; y += step) {
			for (let x = x0 + step / 2; x < x1; x += step) {
				if (insideEvenOdd(closed, x, y)) {
					sx += x;
					sy += y;
					sw++;
				}
			}
		}
	}
	// Open strokes (and the outlines themselves, lightly) by length.
	for (const { pts, closed: isClosed } of polys) {
		const weight = icon.style === "solid" ? (isClosed ? 0.5 : 4) : 1; // solids: outlines count lightly vs 16 area samples per unit²
		for (let i = 1; i < pts.length; i++) {
			const len = dist(pts[i - 1], pts[i]);
			sx += ((pts[i - 1][0] + pts[i][0]) / 2) * len * weight;
			sy += ((pts[i - 1][1] + pts[i][1]) / 2) * len * weight;
			sw += len * weight;
		}
	}
	return sw ? [sx / sw, sy / sw] : [12, 12];
}

// How much of the gap between box centre and ink centre to correct, and the smallest nudge worth
// making. Balanced icons keep their exact grid alignment.
export const OPTICAL = { strength: 0.35, minShift: 0.5, maxShift: 1 };

function opticalAlign(icon: Icon) {
	const { x0, y0, x1, y1 } = icon.box;
	// Directional icons stay box-centred, as in standard icon sets. Hand-drawn icons (native) carry
	// their optical placement in the drawing (e.g. the play triangle sits right of centre, as in
	// Material's play icon), so they aren't nudged again.
	if (/arrow|chevron/.test(icon.name) || icon.native) {
		icon.optical = { dx: 0, dy: 0 };
		return icon;
	}
	const [ix, iy] = inkCentre(icon);
	const pad = KEYLINES.padding;
	// Quarter units, rounded toward zero so a nudge never crosses the padding.
	const q = (v: number) => (Math.sign(v) * Math.floor(Math.abs(v) * 4)) / 4;
	const shift = (box0: number, box1: number, ink: number) => {
		const off = (box0 + box1) / 2 - 12; // already off centre from grid alignment
		let d = -OPTICAL.strength * (ink - (box0 + box1) / 2);
		// The icon never ends up more than maxShift from centre in total.
		d = Math.max(-OPTICAL.maxShift - off, Math.min(OPTICAL.maxShift - off, d));
		d = Math.max(pad - box0, Math.min(GRID - pad - box1, d));
		d = q(d);
		return Math.abs(d) >= OPTICAL.minShift ? d : 0;
	};
	const dx = shift(x0, x1, ix);
	const dy = shift(y0, y1, iy);
	icon.tx += dx;
	icon.ty += dy;
	icon.box = { x0: x0 + dx, y0: y0 + dy, x1: x1 + dx, y1: y1 + dy };
	icon.optical = { dx, dy };
	return icon;
}

export function fitIcon(icon: Icon) {
	return opticalAlign(placeIcon(icon));
}

// ---- Editing ----------------------------------------------------------------
// The icon's paths in grid units, one entry per <path>, as parsed subpaths. Shared points stay
// shared (a segment's start is the previous segment's end), so moving one point moves every segment
// that uses it.
export function editablePaths(icon: Icon): Subpath[][] {
	const memo = new Map<Pt, Pt>();
	const T = (p: Pt) => {
		if (!memo.has(p)) memo.set(p, [p[0] * icon.scale + icon.tx, p[1] * icon.scale + icon.ty]);
		return memo.get(p)!;
	};
	return [...icon.body.matchAll(/ d="([^"]*)"/g)].map((m) =>
		parsePath(m[1]).map((sp) => ({
			start: T(sp.start),
			closed: sp.closed,
			segs: sp.segs.map((s) => ({
				...s,
				from: T(s.from),
				to: T(s.to),
				...(s.t === "C" ? { c1: [...T(s.c1!)] as Pt, c2: [...T(s.c2!)] as Pt } : {}),
				...(s.t === "A" ? { rx: s.rx! * icon.scale, ry: s.ry! * icon.scale } : {}),
			})),
		})),
	);
}

// Write edited paths back into the icon (grid units) and update its box.
export function applyEditablePaths(icon: Icon, paths: Subpath[][]) {
	let i = 0;
	icon.body = icon.body.replace(/ d="([^"]*)"/g, () => ` d="${emitPath(paths[i++])}"`);
	const inset = icon.style === "line" && !icon.material ? FIT_STROKE : 0;
	const b = pathBounds(paths.flat());
	Object.assign(icon, {
		scale: 1,
		tx: 0,
		ty: 0,
		edited: true,
		box: { x0: b.minX - inset / 2, y0: b.minY - inset / 2, x1: b.maxX + inset / 2, y1: b.maxY + inset / 2 },
	});
	return icon;
}

// Rotate path data about the centre of the grid (degrees, clockwise on screen).
// Round 23: scale a drawing about the centre (optical size: an icon that reads smaller than the one
// it replaces). Arcs scale with it; the stroke stays 1.5.
export function scalePath(d: string, k: number) {
	if (!k || k === 1) return d;
	const P = (p: Pt): Pt => [12 + (p[0] - 12) * k, 12 + (p[1] - 12) * k];
	return emitPath(
		parsePath(d, true).map((sp) => ({
			start: P(sp.start),
			closed: sp.closed,
			segs: sp.segs.map((seg) => ({ ...seg, from: P(seg.from), to: P(seg.to), ...(seg.t === "C" ? { c1: P(seg.c1!), c2: P(seg.c2!) } : {}), ...(seg.t === "A" ? { rx: seg.rx! * k, ry: seg.ry! * k } : {}) })),
		})),
	);
}

export function rotatePath(d: string, deg: number) {
	const a = (deg * Math.PI) / 180;
	const cos = Math.cos(a);
	const sin = Math.sin(a);
	const memo = new Map<Pt, Pt>();
	const R = (p: Pt) => {
		if (!memo.has(p)) {
			const x = p[0] - 12;
			const y = p[1] - 12;
			memo.set(p, [12 + x * cos - y * sin, 12 + x * sin + y * cos]);
		}
		return memo.get(p)!;
	};
	return emitPath(
		parsePath(d, true).map((sp) => ({
			start: R(sp.start),
			closed: sp.closed,
			segs: sp.segs.map((seg) => ({
				...seg,
				from: R(seg.from),
				to: R(seg.to),
				...(seg.t === "C" ? { c1: R(seg.c1!), c2: R(seg.c2!) } : {}),
				...(seg.t === "A" ? { rot: seg.rot! + deg } : {}),
			})),
		})),
	);
}

function lineBody({ paths = [], fills = [] }: Parts) {
	// Strokes, plus optional small filled details (e.g. a spark too small to outline).
	return [
		...paths.map((d) => `<path d="${emitPath(parsePath(d, true))}" stroke="{{COLOR}}" stroke-width="{{SW}}" fill="none"/>`),
		...fills.map((d) => `<path d="${emitPath(parsePath(d, true))}" fill="{{COLOR}}"/>`),
	].join(" ");
}

// ---- Corner rounding -------------------------------------------------------
// Every corner where two straight segments meet gets an arc of radius r, like a Figma corner radius
// on the vector. Corners next to a curve or arc stay as drawn.

// The arc that replaces the corner between straight segments a and b, or null.
function cornerArc(a: Seg, b: Seg, r: number) {
	if (r <= 0 || a.t !== "L" || b.t !== "L") return null;
	const la = dist(a.from, a.to);
	const lb = dist(b.from, b.to);
	if (la < 1e-6 || lb < 1e-6) return null;
	const v = a.to;
	const u = [(a.from[0] - v[0]) / la, (a.from[1] - v[1]) / la]; // back along a
	const w = [(b.to[0] - v[0]) / lb, (b.to[1] - v[1]) / lb]; // forward along b
	const angle = Math.acos(Math.max(-1, Math.min(1, u[0] * w[0] + u[1] * w[1])));
	if (angle > Math.PI - 1e-3 || angle < 1e-3) return null; // straight through, or a spike
	const tan = Math.tan(angle / 2);
	const t = Math.min(r / tan, la / 2, lb / 2);
	const radius = t * tan;
	const cross = (v[0] - a.from[0]) * w[1] - (v[1] - a.from[1]) * w[0];
	return {
		p1: [v[0] + u[0] * t, v[1] + u[1] * t] as Pt,
		p2: [v[0] + w[0] * t, v[1] + w[1] * t] as Pt,
		radius,
		sweep: cross > 0 ? 1 : 0,
	};
}

// Write parsed subpaths back out as absolute path data, rounding corners by r.
export function emitPath(subpaths: Subpath[], r = 0) {
	const p = (pt: Pt) => `${fmt(pt[0])} ${fmt(pt[1])}`;
	return subpaths
		.map((sp) => {
			const { segs, closed } = sp;
			const n = segs.length;
			if (!n) return `M${p(sp.start)}`;
			const arcs = segs.map((s, i) => (i < n - 1 || closed ? cornerArc(s, segs[(i + 1) % n], r) : null));
			const startArc = closed ? arcs[n - 1] : null;
			let out = `M${p(startArc ? startArc.p2 : sp.start)}`;
			segs.forEach((s, i) => {
				const arc = arcs[i];
				const end = arc ? arc.p1 : s.to;
				if (s.t === "C") out += `C${p(s.c1!)} ${p(s.c2!)} ${p(end)}`;
				else if (s.t === "A") out += `A${fmt(s.rx!)} ${fmt(s.ry!)} ${fmt(s.rot!)} ${s.large} ${s.sweep} ${p(end)}`;
				else out += `L${p(end)}`;
				if (arc) out += `A${fmt(arc.radius)} ${fmt(arc.radius)} 0 0 ${arc.sweep} ${p(arc.p2)}`;
			});
			return closed ? `${out}Z` : out;
		})
		.join("");
}

export function roundPath(d: string, r: number) {
	return emitPath(parsePath(d), r);
}

// ---- Library ------------------------------------------------------------------
// Library icons redrawn on the grid (LIBRARY_REDRAWS) replace the Figma geometry before fitting;
// they're placed as drawn, like the site set.
const libraryData = ICON_LIBRARY as unknown as Icon[];
for (const icon of libraryData) {
	const r = LIBRARY_REDRAWS[icon.name];
	if (!r) continue;
	const turn = (d: string) => (r.rotate ? rotatePath(d, r.rotate) : d);
	icon.body = [
		...r.paths.map((d) => `<path d="${emitPath(parsePath(turn(d), true))}" stroke="{{COLOR}}" stroke-width="{{SW}}" fill="none"/>`),
		...(r.fills || []).map((d) => `<path d="${emitPath(parsePath(turn(d), true))}" fill="{{COLOR}}"/>`),
	].join(" ");
	// Rotated redraws fill the live area like rotated options and keep their 45° lines.
	Object.assign(icon, { unit: 1, redrawn: true }, r.rotate ? { fitTo: "live", noSnap: true } : { native: true });
}

// Small fixes to library icons before fitting (LIBRARY_TWEAKS), in the icon's own units so they
// move with it. `fillOutline`: a closed straight shape too small to hold a 1.5 outline becomes a
// filled shape the size of its stroke's outer edge (the outline grown by half a stroke, with sharp
// corners).
function growPolygon(pts: Pt[], d: number): Pt[] {
	let area = 0;
	for (let i = 0; i < pts.length; i++) {
		const [x1, y1] = pts[i];
		const [x2, y2] = pts[(i + 1) % pts.length];
		area += x1 * y2 - x2 * y1;
	}
	const s = area > 0 ? 1 : -1; // outward normal side for this winding (y down)
	const lines = pts.map((p, i): [Pt, Pt] => {
		const q = pts[(i + 1) % pts.length];
		const len = dist(p, q) || 1;
		const n = [(s * (q[1] - p[1])) / len, (-s * (q[0] - p[0])) / len];
		return [
			[p[0] + n[0] * d, p[1] + n[1] * d],
			[q[0] + n[0] * d, q[1] + n[1] * d],
		];
	});
	return lines.map((l, i) => {
		const m = lines[(i - 1 + lines.length) % lines.length];
		const [[x1, y1], [x2, y2]] = m;
		const [[x3, y3], [x4, y4]] = l;
		const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
		if (Math.abs(den) < 1e-9) return l[0];
		const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
		return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)];
	});
}
for (const icon of libraryData) {
	const t = LIBRARY_TWEAKS[icon.name];
	if (!t) continue;
	const els = icon.body.match(/<path\b[^>]*\/>/g) || [];
	for (const index of t.fillOutline || []) {
		const d = (els[index] || "").match(/ d="([^"]*)"/);
		if (!d) continue;
		const sp = parsePath(d[1])[0];
		const pts = [sp.start, ...sp.segs.map((seg) => seg.to)];
		if (dist(pts[0], pts[pts.length - 1]) < 1e-6) pts.pop();
		const grown = growPolygon(pts, (FIT_STROKE / 2) * (icon.unit || 1));
		els[index] = `<path d="M${grown.map(([x, y]) => `${fmt(x)} ${fmt(y)}`).join("L")}Z" fill="{{COLOR}}"/>`;
	}
	icon.body = els.join(" ");
	icon.tweaked = true;
}

export const library: Icon[] = libraryData.map(fitIcon);

// A fitted library icon as grid-unit path strings, split into strokes and fills.
function libraryGridPaths(name: string) {
	const src = library.find((i) => i.name === name)!;
	const els = [...src.body.matchAll(/<path\b[^>]*>/g)].map((m) => m[0]);
	const grid = editablePaths(src).map((subs) => emitPath(subs));
	return {
		paths: grid.filter((_d, i) => /stroke="/.test(els[i])),
		fills: grid.filter((_d, i) => !/stroke="/.test(els[i])),
	};
}

// ---- Site set ------------------------------------------------------------------
// The most-used clueso.io icons redrawn in this style (data/site-set.ts). Drawn natively on the grid
// in grid units, so they're placed exactly as drawn. An entry can offer options (variants): its own
// drawing, or another option rotated (e.g. 45° for a diagonal), optionally with extra strokes.
// Rotated options fill the live area and aren't snapped, so 45° lines stay true.
const siteData = SITE_SET;

function siteOption(s: SiteEntry, v: SiteVariant, index: number): Icon {
	const meta = {
		name: s.name,
		keywords: s.keywords,
		replaces: s.replaces,
		pages: s.pages,
		usedOn: s.usedOn,
		site: true,
		variant: v.label,
		variantIndex: index,
	};
	const baseOf = (opt: SiteVariant): { paths: string[]; fills: string[] } =>
		opt.paths ? { paths: opt.paths, fills: opt.fills || [] } : opt.from !== undefined ? baseOf(s.variants![opt.from]) : s.fromLibrary ? libraryGridPaths(s.fromLibrary) : { paths: s.paths!, fills: s.fills || [] };
	// An unrotated library-based option is the library icon itself.
	if (s.fromLibrary && !v.paths && v.from === undefined && !v.rotate && !v.extra) {
		const src = library.find((i) => i.name === s.fromLibrary)!;
		return { ...src, ...meta, box: { ...src.box }, keywords: [...new Set([...s.keywords, ...src.keywords])] };
	}
	// Round 23: a badge that sits in a clean cut of the drawing (her Sharp references). The entry (or
	// option) gives `badge` { paths, fills } and `cut` rects [x0, y0, x1, y1]; the drawing is masked
	// there and the badge drawn on top, uncut.
	const cutOf = v.cut || (!v.paths && v.from === undefined ? s.cut : null);
	if (cutOf && !v.rotate) {
		const b = baseOf(v);
		const badge = v.badge || s.badge || {};
		return lineIcon({ name: s.name, title: undefined, keywords: s.keywords, paths: b.paths, fills: b.fills, badge, cut: cutOf, meta });
	}
	let base = baseOf(v);
	base = { paths: [...base.paths, ...(v.extra || [])], fills: base.fills };
	const grow = s.grow;
	if (grow) base = { paths: base.paths.map((d) => scalePath(d, grow)), fills: base.fills.map((d) => scalePath(d, grow)) };
	if (v.rotate) base = { paths: base.paths.map((d) => rotatePath(d, v.rotate!)), fills: base.fills.map((d) => rotatePath(d, v.rotate!)) };
	const icon = { ...meta, style: "line", unit: 1, body: lineBody(base) } as Icon;
	if (v.rotate) Object.assign(icon, { fitTo: "live", noSnap: true });
	else icon.native = true;
	return fitIcon(icon);
}

interface LineIconInput {
	name: string;
	keywords?: string[];
	paths?: string[];
	fills?: string[];
	title?: string;
	badge?: Parts | null;
	cut?: Cut[] | null;
	meta?: Partial<Icon>;
}

// A composed icon (compose.ts): base parts + a badge, drawn on the grid like a site icon.
export function lineIcon({ name, keywords = [], paths = [], fills = [], title, badge = null, cut = null, meta = {} }: LineIconInput): Icon {
	if (!cut) return fitIcon({ ...meta, name, title, keywords, style: "line", unit: 1, body: lineBody({ paths, fills }), native: true } as Icon);
	// Round 23: the drawing is cut cleanly where its badge sits; the badge is uncut.
	const id = `cut-${name}-${Math.abs([...JSON.stringify(cut) + (badge && JSON.stringify(badge))].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)).toString(36)}`;
	const icon = fitIcon({ ...meta, name, title, keywords, style: "line", unit: 1, native: true, body: `<g mask="url(#${id})">${lineBody({ paths, fills })}</g>${lineBody(badge || {})}` } as Icon);
	// A cut is a rect [x0, y0, x1, y1], or a circle { c: [x, y], r } (a round cut, for round drawings).
	const hole = (c: Cut) => (Array.isArray(c) ? `<rect x="${c[0]}" y="${c[1]}" width="${c[2] - c[0]}" height="${c[3] - c[1]}" fill="#000"/>` : `<circle cx="${c.c[0]}" cy="${c.c[1]}" r="${c.r}" fill="#000"/>`);
	icon.defs = `<mask id="${id}" maskUnits="userSpaceOnUse" x="-4" y="-4" width="32" height="32"><rect x="-4" y="-4" width="32" height="32" fill="#fff"/>${cut.map(hole).join("")}</mask>`;
	return icon;
}

export const siteSet: Icon[] = siteData.map((s) => {
	const variants = s.variants && s.variants.length ? s.variants : [{ label: "Default" }];
	const options = variants.map((v, i) => siteOption(s, v, i));
	options.forEach((o) => {
		o.options = options;
	});
	return options[s.defaultVariant || 0];
});

// ---- Signature options ---------------------------------------------------------------
// Rounds 13–14 (data/signature-set.ts): samples of the set redrawn with one signature idea each.
// Built like site icons; an entry without paths uses the base drawing (plus its extra fills).
// `rotate` tilts the drawing; `pixels` are added after the tilt so they stay square to the grid; the
// tilted icon is fitted to the live area, not snapped. `options` are alternative drawings (the first
// is the default).
const signatureData: SignatureEntry[] = SIGNATURE_SET;
function signatureIcon(sig: SignatureEntry, e: SignatureIconEntry, label: string, index: number): Icon {
	const base: SiteEntry = siteData.find((x) => x.name === e.name) || { name: e.name, keywords: [] };
	const paths = e.paths || base.paths;
	const fills = e.paths ? e.fills || [] : [...(base.fills || []), ...(e.fills || [])];
	const pixels = e.pixels || [];
	let icon: Icon;
	// Round 23 (personality, after her Sharp references): `cut` erases part of the drawing, cleanly,
	// where a badge sits (a frame's corner cut away for its plus; a cloud's edge broken by its check).
	// Cuts are rects [x0, y0, x1, y1] or strokes { d, w }; `badge` is drawn on top, uncut.
	if (e.cut) {
		const R = (d: string) => (e.rotate ? rotatePath(d, e.rotate) : d);
		const drawn = lineBody({ paths: paths!.map(R), fills: fills.map(R) });
		const badge = lineBody({ paths: ((e.badge || {}).paths || []).map(R), fills: [...((e.badge || {}).fills || []), ...pixels].map(R) });
		const id = `cut-${sig.key}-${e.name}`;
		const holes = e.cut
			.map((c) =>
				Array.isArray(c)
					? `<rect x="${c[0]}" y="${c[1]}" width="${c[2] - c[0]}" height="${c[3] - c[1]}" fill="#000"/>`
					: `<path d="${R(c.d)}" fill="none" stroke="#000" stroke-width="${c.w}" stroke-linecap="square" stroke-linejoin="miter"/>`,
			)
			.join("");
		icon = fitIcon({
			name: e.name,
			keywords: base.keywords || [],
			site: true,
			variant: label,
			variantIndex: index,
			style: "line",
			unit: 1,
			body: `<g mask="url(#${id})">${drawn}</g>${badge}`,
			native: true,
		} as Icon);
		icon.defs = `<mask id="${id}" maskUnits="userSpaceOnUse" x="-4" y="-4" width="32" height="32"><rect x="-4" y="-4" width="32" height="32" fill="#fff"/>${holes}</mask>`;
	} else if (e.rotate) {
		const body = lineBody({ paths: paths!.map((d) => rotatePath(d, e.rotate!)), fills: [...fills.map((d) => rotatePath(d, e.rotate!)), ...pixels] });
		icon = fitIcon({
			name: e.name,
			keywords: base.keywords,
			replaces: base.replaces,
			pages: base.pages,
			site: true,
			variant: label,
			variantIndex: index,
			style: "line",
			unit: 1,
			body,
			fitTo: "live",
			noSnap: true,
		} as Icon);
	} else {
		icon = siteOption({ ...base, variants: undefined }, { label, paths, fills: [...fills, ...pixels] }, index);
	}
	return Object.assign(icon, { signature: sig.key, note: e.note || "", ...(sig.render ? { render: sig.render } : {}) });
}
export const signatureSets = signatureData.map((sig) => ({
	key: sig.key,
	label: sig.label,
	idea: sig.idea,
	render: sig.render,
	icons: sig.icons.map((e) => {
		if (!e.options) return signatureIcon(sig, e, sig.label, 0);
		const options = e.options.map((o, i) => signatureIcon(sig, { ...e, ...o, note: o.note || e.note }, o.label!, i));
		options.forEach((o) => {
			o.options = options;
		});
		return options[0];
	}),
}));
export type SignatureSet = (typeof signatureSets)[number];

// ---- Pixel direction ------------------------------------------------------------------
// Website only (data/pixel-set.ts): 20 × 20 pixels, one per grid unit, over the live area. Pixels
// are 0.8 unit (a 0.2 gutter), centred in their cell; one tone since round 19.
const pixelData = PIXEL_SET;
const PIXEL = { cell: 1, full: 0.8, small: 0.45 };
// Round 21: the default pixel construction comes from the base LINE set (data/pixel-line.ts); the
// hand-drawn solid set (data/pixel-set.ts) is the Solid construction.
const lineData = PIXEL_LINE;
const unpack = (s: string): Cell[] => (s.match(/../g) || []).map((t) => ({ x: parseInt(t[0], 20), y: parseInt(t[1], 20), tone: "full" }));
const solidByName: Record<string, Cell[]> = Object.fromEntries(pixelData.map((p) => [p.name, p.cells]));
// Round 23: "two weights" (data/pixel-dots.ts): big pixels for the lines, small ones inside the shapes.
const dotsByName: Record<string, Cell[]> = Object.fromEntries(PIXEL_DOTS.map((p) => [p.name, [...unpack(p.line), ...unpack(p.fill).map((c) => ({ ...c, tone: "small" }))]]));
// Round 25: "dot matrix" (data/pixel-matrix.ts): round dots of one size on a 14 × 14 grid, silhouettes
// with their details knocked out.
const matrixData = PIXEL_MATRIX;
const MATRIX_N = matrixData ? matrixData.n : 14;
const matrixByName: Record<string, Cell[]> = matrixData
	? Object.fromEntries(matrixData.icons.map((p) => [p.name, (p.cells.match(/../g) || []).map((t) => ({ x: parseInt(t[0], MATRIX_N), y: parseInt(t[1], MATRIX_N) }))]))
	: {};
const pixelIcon = (name: string, cells: Cell[], solid: Cell[] | undefined): Icon => ({
	pixelCells: cells,
	pixelCellsSolid: solid || null,
	pixelCellsDots: dotsByName[name] || null,
	pixelCellsMatrix: matrixByName[name] || null,
	name,
	id: `pixel:${name}`,
	pixel: true,
	style: "solid",
	keywords: [name, "pixel"],
	unit: 1,
	scale: 1,
	tx: 0,
	ty: 0,
	native: true,
	optical: { dx: 0, dy: 0 },
	body: "",
	box: { x0: 2, y0: 2, x1: 22, y1: 22 },
});
export const pixelSet: Icon[] = [
	...lineData.map((p) => pixelIcon(p.name, unpack(p.cells), solidByName[p.name])),
	...pixelData.filter((p) => !lineData.some((l) => l.name === p.name)).map((p) => pixelIcon(p.name, p.cells, p.cells)),
];

// ---- Clueso set ---------------------------------------------------------------
// Every icon on clueso.io, built from Google Material Symbols (data/clueso-set.ts). Line icons come in
// four weights (strokes 1 / 1.5 / 2 / 2.25 = Material weights 200 / 300 / 400 / 500), Sharp or
// Rounded; solid icons are Material's filled versions. All drawn on the 24 grid with 2 units of
// padding, and placed exactly as Google draws them (no fitting, no nudging).
export const STROKES = [1, 1.5, 2, 2.25];
export const nearestStroke = (v: number) => STROKES.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));

// The Material path for an icon at the given stroke and corners.
function materialPath(icon: Icon, stroke: number, round: number) {
	const family = round > 0 ? "rounded" : "sharp";
	return icon.style === "solid" ? icon.material!.solid[family] : icon.material!.line[family][String(nearestStroke(stroke))];
}

function cluesoIcon(entry: CluesoEntry, option: CluesoOption, index: number, style: "line" | "solid"): Icon {
	const icon = {
		name: entry.name,
		keywords: entry.keywords,
		replaces: entry.replaces,
		pages: entry.pages,
		example: entry.example,
		platform: entry.platform || false,
		site: true,
		clueso: true,
		style,
		variant: option.label,
		variantIndex: index,
		materialName: option.material,
		material: { line: option.line, solid: option.solid, evenodd: Boolean(option.evenodd) },
		unit: 1,
		scale: 1,
		tx: 0,
		ty: 0,
		native: true,
		optical: { dx: 0, dy: 0 },
	} as Icon;
	// The team build ships only the names and details, not Google's drawings.
	if (!option.line) {
		icon.body = "";
		icon.box = { x0: 2, y0: 2, x1: 22, y1: 22 };
		return icon;
	}
	icon.body = `<path d="${materialPath(icon, 1.5, 0)}"${icon.material!.evenodd ? ' fill-rule="evenodd"' : ""} fill="{{COLOR}}"/>`;
	const b = pathBounds(parsePath(materialPath(icon, 1.5, 0)));
	icon.box = { x0: b.minX, y0: b.minY, x1: b.maxX, y1: b.maxY };
	return icon;
}

// One list per style; each icon carries all its options (the first is the default).
export const cluesoSet: Record<"line" | "solid", Icon[]> = { line: [], solid: [] };
for (const style of ["line", "solid"] as const) {
	cluesoSet[style] = CLUESO_SET.map((entry) => {
		const options = entry.options.map((o, i) => cluesoIcon(entry, o, i, style));
		options.forEach((o) => {
			o.options = options;
		});
		return options[0];
	});
}

// ---- SVG ----------------------------------------------------------------------
// Build an icon's SVG. The stroke value is in 24-grid units, so the inner stroke-width is divided by
// the icon's fit scale.
export function buildSvg(icon: Icon, options: DrawOptions = {}) {
	const opts = { ...DEFAULTS, ...options };
	// Clueso set: Google's own drawing for this weight and corner style (unless edited).
	if (icon.material) {
		const d = icon.edited ? null : materialPath(icon, opts.stroke, opts.round);
		const body = (d ? `<path d="${d}"${icon.material.evenodd ? ' fill-rule="evenodd"' : ""} fill="{{COLOR}}"/>` : icon.body).replace(/\{\{COLOR\}\}/g, opts.color);
		return [`<svg xmlns="http://www.w3.org/2000/svg" width="${GRID}" height="${GRID}" viewBox="0 0 ${GRID} ${GRID}" fill="none">`, `  ${body}`, "</svg>"].join("\n");
	}
	// Pixel icons are drawn from their cells with the chosen pixel size and corner (round 21).
	if (icon.pixelCells) {
		const build = opts.pixelBuild || "matrix";
		if (build === "matrix" && icon.pixelCellsMatrix) {
			// Round dots, one size: the dot's diameter is the pixel size (0.8 by default) × 0.9 of the pitch.
			const u = 20 / MATRIX_N;
			const r = (u * (opts.pixelSize || PIXEL.full) * 0.9) / 2;
			const d = icon.pixelCellsMatrix
				.map(({ x, y }) => {
					const cx = 2 + (x + 0.5) * u;
					const cy = 2 + (y + 0.5) * u;
					return `M${fmt(cx - r)} ${fmt(cy)}A${fmt(r)} ${fmt(r)} 0 1 0 ${fmt(cx + r)} ${fmt(cy)}A${fmt(r)} ${fmt(r)} 0 1 0 ${fmt(cx - r)} ${fmt(cy)}Z`;
				})
				.join("");
			return `<svg xmlns="http://www.w3.org/2000/svg" width="${GRID}" height="${GRID}" viewBox="0 0 ${GRID} ${GRID}">\n  <path d="${d}" fill="${opts.color}"/>\n</svg>`;
		}
		const cells = build === "solid" && icon.pixelCellsSolid ? icon.pixelCellsSolid : build === "dots" && icon.pixelCellsDots ? icon.pixelCellsDots : icon.pixelCells;
		const S = opts.pixelSize || PIXEL.full;
		const d = cells
			.map(({ x, y, tone }) => {
				const s = tone === "small" ? S * 0.55 : S; // round 23: inner dots about half the line pixels
				const r = Math.min(opts.pixelRadius || 0, s / 2);
				const o = (1 - s) / 2;
				const x0 = 2 + x + o;
				const y0 = 2 + y + o;
				return r
					? `M${fmt(x0 + r)} ${fmt(y0)}H${fmt(x0 + s - r)}A${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(x0 + s)} ${fmt(y0 + r)}V${fmt(y0 + s - r)}A${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(x0 + s - r)} ${fmt(y0 + s)}H${fmt(x0 + r)}A${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(x0)} ${fmt(y0 + s - r)}V${fmt(y0 + r)}A${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(x0 + r)} ${fmt(y0)}Z`
					: `M${fmt(x0)} ${fmt(y0)}H${fmt(x0 + s)}V${fmt(y0 + s)}H${fmt(x0)}Z`;
			})
			.join("");
		return `<svg xmlns="http://www.w3.org/2000/svg" width="${GRID}" height="${GRID}" viewBox="0 0 ${GRID} ${GRID}">\n  <path d="${d}" fill="${opts.color}"/>\n</svg>`;
	}
	const sw = fmt(opts.stroke / icon.scale);
	let body = icon.body
		.replace(/\{\{COLOR\}\}/g, opts.color)
		.replace(/\{\{ACCENT\}\}/g, opts.accent || "#FE89EB")
		.replace(/\{\{ACCENT2\}\}/g, opts.accent2 || "#C12EAF")
		.replace(/\{\{SW\}\}/g, sw);
	// Roundness is in 24-grid units, so the radius is divided by the fit scale too. Rounded icons
	// also get round line ends, so terminals match the corners.
	if (opts.round > 0 && !icon.pixel) {
		const r = opts.round / icon.scale;
		body = body.replace(/ d="([^"]*)"/g, (_m, d) => ` d="${roundPath(d, r)}"`);
	}
	const fill = icon.style === "solid" ? "" : ' fill="none"';
	const caps = opts.round > 0 && icon.style === "line" ? ' stroke-linecap="round"' : "";
	const G = icon.grid || GRID;
	return [`<svg xmlns="http://www.w3.org/2000/svg" width="${G}" height="${G}" viewBox="0 0 ${G} ${G}"${fill}${caps}>`, `  <g transform="translate(${fmt(icon.tx)} ${fmt(icon.ty)}) scale(${fmt(icon.scale)})">`, `    ${icon.defs || ""}${body}`, "  </g>", "</svg>"].join("\n");
}
