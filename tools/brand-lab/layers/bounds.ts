import { MARK_PARTS } from "../brand/mark";
import type { Doc } from "../state/doc";
import { CROP, imageSize } from "./sources/image";
import { textBox } from "./sources/text";
import type { Layer, Params } from "./types";

// Canvas geometry for selection: every placed object reports a frame in composition px (y down).
// A frame is a rect in the object's own unrotated space, relative to its pivot (the point its x/y
// params set), turned by `rot` degrees counter-clockwise on screen. Layers without a frame
// (full-bleed patterns, gradients, effects) are "fill" layers.

export interface Frame {
	px: number;
	py: number;
	left: number;
	top: number;
	w: number;
	h: number;
	rot: number;
}

export interface Rect {
	l: number;
	t: number;
	r: number;
	b: number;
}

type Pt = [number, number];

const num = (p: Params, k: string, d = 0) => (typeof p[k] === "number" ? (p[k] as number) : d);

export function layerFrame(layer: Layer, doc: Doc): Frame | null {
	const { width: W, height: H } = doc.scene;
	const p = layer.params;
	const px = num(p, "x", 0.5) * W;
	const py = (1 - num(p, "y", 0.5)) * H;
	const centred = (w: number, h: number, rot = 0): Frame => ({ px, py, left: -w / 2, top: -h / 2, w, h, rot });

	switch (layer.type) {
		case "text": {
			const box = textBox(p, W);
			return box ? { px, py, left: 0, top: box.top, w: box.w, h: box.h, rot: num(p, "rotation") } : null;
		}
		case "shape": {
			if (p.shape === 2) return centred(num(p, "w") * W, num(p, "w") * W, num(p, "rotation"));
			return centred(num(p, "w") * W, num(p, "h") * H, num(p, "rotation"));
		}
		case "mark":
			return p.layout === 0 ? centred(num(p, "size"), num(p, "size"), num(p, "rotation")) : null;
		case "parts": {
			if (p.layout !== 0) return null;
			// Exploding pushes the top and bottom parts out along the diagonal.
			const s = num(p, "size") * (1 + 0.452 * num(p, "explode"));
			return centred(s, s, num(p, "rotation"));
		}
		case "pieces": {
			if (p.layout !== 0) return null;
			// Extrusions reach 0.24 beyond their edge; flat and cavity edges sit on the square.
			const size = num(p, "size");
			const out = (k: string) => (p[k] === 2 ? 0.24 : 0);
			const left = -(0.5 + out("left")) * size;
			const top = -(0.5 + out("top")) * size;
			return { px, py, left, top, w: (1 + out("left") + out("right")) * size, h: (1 + out("top") + out("bottom")) * size, rot: num(p, "rotation") };
		}
		case "motif":
		case "forms":
			return centred(num(p, "size"), num(p, "size"), num(p, "rotation"));
		case "construct":
			if (p.mode === 3) return null;
			return centred(num(p, "size"), num(p, "size") * (p.mode === 0 ? 1 : num(p, "aspect", 1)));
		case "image": {
			const g = imageGeom(p, W, H);
			if (!g) return null;
			const [l, t, r, b] = g.crop;
			return centred(g.full[0] * (1 - l - r), g.full[1] * (1 - t - b), num(p, "rotation"));
		}
		default:
			return null;
	}
}

/** An image's uncropped size on the canvas (composition px) and its crop (left, top, right, bottom shares). */
export function imageGeom(p: Params, W: number, H: number) {
	const size = imageSize(String(p.src ?? ""));
	if (!size) return null;
	const fit = p.fit === 0 ? Math.max(W / size[0], H / size[1]) : Math.min(W / size[0], H / size[1]);
	const k = fit * num(p, "scale", 1);
	return { full: [size[0] * k, size[1] * k] as Pt, crop: CROP.map((key) => num(p, key)) as [number, number, number, number] };
}

/** Local frame point → composition px. Positive rot turns counter-clockwise on screen (y down). */
export function toWorld(f: Frame, [lx, ly]: Pt): Pt {
	const a = (f.rot * Math.PI) / 180;
	const c = Math.cos(a);
	const s = Math.sin(a);
	return [f.px + lx * c + ly * s, f.py - lx * s + ly * c];
}

export function toLocal(f: Frame, [x, y]: Pt): Pt {
	const a = (f.rot * Math.PI) / 180;
	const c = Math.cos(a);
	const s = Math.sin(a);
	const dx = x - f.px;
	const dy = y - f.py;
	return [dx * c - dy * s, dx * s + dy * c];
}

export function corners(f: Frame): Pt[] {
	return [
		[f.left, f.top],
		[f.left + f.w, f.top],
		[f.left + f.w, f.top + f.h],
		[f.left, f.top + f.h],
	].map((pt) => toWorld(f, pt as Pt));
}

export function aabb(f: Frame): Rect {
	const c = corners(f);
	const xs = c.map((p) => p[0]);
	const ys = c.map((p) => p[1]);
	return { l: Math.min(...xs), t: Math.min(...ys), r: Math.max(...xs), b: Math.max(...ys) };
}

export function union(rects: Rect[]): Rect | null {
	if (!rects.length) return null;
	return rects.reduce((a, r) => ({ l: Math.min(a.l, r.l), t: Math.min(a.t, r.t), r: Math.max(a.r, r.r), b: Math.max(a.b, r.b) }));
}

export function contains(f: Frame, pt: Pt) {
	const [x, y] = toLocal(f, pt);
	return x >= f.left && x <= f.left + f.w && y >= f.top && y <= f.top + f.h;
}

const insidePoly = (poly: (typeof MARK_PARTS)["light"]["top"], q: Pt) => poly.edges.every((e) => (q[0] - e.p[0]) * e.n[0] + (q[1] - e.p[1]) * e.n[1] <= 0);
const inCavity = (q: Pt) => {
	const cap = (cx: number, cy: number, horizontal: boolean) =>
		horizontal ? (q[0] < cx ? Math.abs(q[1] - cy) < 0.18 : Math.hypot(q[0] - cx, q[1] - cy) < 0.18) : q[1] < cy ? Math.abs(q[0] - cx) < 0.18 : Math.hypot(q[0] - cx, q[1] - cy) < 0.18;
	return cap(-0.44, 0, true) || cap(0, -0.44, false);
};

/** Is q (mark units, y up) on one of the visible logo parts? */
function onMark(q: Pt, parts: [boolean, boolean, boolean], explode: number) {
	const polys = [MARK_PARTS.light.top, MARK_PARTS.light.middle, MARK_PARTS.light.body];
	return polys.some((poly, i) => {
		if (!parts[i]) return false;
		const o = (1 - i) * 0.32 * explode * Math.SQRT1_2;
		const p: Pt = [q[0] - o, q[1] - o];
		return insidePoly(poly, p) && !(i === 2 && inCavity(p));
	});
}

/**
 * Shape-accurate hit test: the logo and its parts only count where the pieces are, so a big cropped
 * supergraphic doesn't swallow clicks in its empty corners (and marquees can start there).
 */
export function hits(layer: Layer, f: Frame, pt: Pt) {
	if (!contains(f, pt)) return false;
	const p = layer.params;
	if (layer.type !== "mark" && layer.type !== "parts") return true;
	const [x, y] = toLocal(f, pt);
	const size = num(p, "size");
	const q: Pt = [x / size, -y / size];
	if (layer.type === "mark") return onMark(q, [true, true, true], 0);
	return onMark(q, [p.top !== false, p.middle !== false, p.bottom !== false], num(p, "explode"));
}

export const intersects = (a: Rect, b: Rect) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;

/** Params that move a layer's pivot by (dx, dy) composition px. */
export function moveParams(start: Params, doc: Doc, dx: number, dy: number): Params {
	return {
		x: Math.round((num(start, "x", 0.5) + dx / doc.scene.width) * 10000) / 10000,
		y: Math.round((num(start, "y", 0.5) - dy / doc.scene.height) * 10000) / 10000,
	};
}

export type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export const HANDLES: { id: Handle; u: number; v: number }[] = [
	{ id: "nw", u: 0, v: 0 },
	{ id: "n", u: 0.5, v: 0 },
	{ id: "ne", u: 1, v: 0 },
	{ id: "e", u: 1, v: 0.5 },
	{ id: "se", u: 1, v: 1 },
	{ id: "s", u: 0.5, v: 1 },
	{ id: "sw", u: 0, v: 1 },
	{ id: "w", u: 0, v: 0.5 },
];

/** Which handles a layer offers: free rectangles get all eight, text gets sides for wrap width. */
export function handlesFor(layer: Layer): Handle[] {
	if (layer.type === "shape" && layer.params.shape !== 2) return HANDLES.map((h) => h.id);
	if (layer.type === "text") return ["nw", "ne", "se", "sw", "e", "w"];
	return ["nw", "ne", "se", "sw"];
}

/**
 * Resize from a handle: `local` is the pointer in the frame's local space. The opposite corner or
 * edge stays put. Rectangles resize freely (Shift keeps proportions); everything else scales
 * uniformly, and text side handles change only the wrap width.
 */
/** Figma rules: Shift keeps proportions (free shapes), ⌥ scales from the centre; both combine. */
export function resizeParams(layer: Layer, start: Params, f: Frame, handle: Handle, local: Pt, doc: Doc, keepRatio: boolean, fromCenter = false): Params {
	const { width: W, height: H } = doc.scene;
	const h = HANDLES.find((x) => x.id === handle)!;
	// Fixed point: the opposite handle.
	const fx = f.left + (1 - h.u) * f.w;
	const fy = f.top + (1 - h.v) * f.h;
	const dirX = h.u === 0.5 ? 0 : h.u === 1 ? 1 : -1;
	const dirY = h.v === 0.5 ? 0 : h.v === 1 ? 1 : -1;
	// From the centre, the dragged edge's distance to the centre is half the new size.
	const cx = f.left + f.w / 2;
	const cy = f.top + f.h / 2;
	let w = dirX ? Math.max(4, fromCenter ? 2 * (local[0] - cx) * dirX : (local[0] - fx) * dirX) : f.w;
	let hh = dirY ? Math.max(4, fromCenter ? 2 * (local[1] - cy) * dirY : (local[1] - fy) * dirY) : f.h;

	const textSide = layer.type === "text" && !dirY;
	const free = (layer.type === "shape" && layer.params.shape !== 2 && !keepRatio) || textSide;
	if (!free) {
		const k = dirX && dirY ? Math.max(w / f.w, hh / f.h) : dirX ? w / f.w : hh / f.h;
		w = f.w * k;
		hh = f.h * k;
	}
	// New rect in local space, anchored at the fixed point; centred on the axis a side handle doesn't move.
	const left = fromCenter || !dirX ? cx - w / 2 : dirX === 1 ? fx : fx - w;
	const top = fromCenter || !dirY ? cy - hh / 2 : dirY === 1 ? fy : fy - hh;
	const k = w / f.w;

	const at = (lx: number, ly: number) => {
		const [x, y] = toWorld(f, [lx, ly]);
		return { x: Math.round((x / W) * 10000) / 10000, y: Math.round((1 - y / H) * 10000) / 10000 };
	};
	const round = (v: number, step = 0.1) => Math.round(v / step) * step;

	switch (layer.type) {
		case "text": {
			const anchor = [0, 0.5, 1][num(start, "anchor", 1)];
			if (textSide) return { width: Math.round((w / W) * 1000) / 1000, ...at(left, f.top + anchor * f.h) };
			const out: Params = { size: round(num(start, "size") * k), ...at(left, top + anchor * hh) };
			if (num(start, "width") > 0) out.width = Math.round(num(start, "width") * k * 1000) / 1000;
			return out;
		}
		case "shape":
			if (layer.params.shape === 2) return { w: Math.round((w / W) * 1000) / 1000, ...at(left + w / 2, top + hh / 2) };
			return { w: Math.round((w / W) * 1000) / 1000, h: Math.round((hh / H) * 1000) / 1000, ...at(left + w / 2, top + hh / 2) };
		case "image":
			return { scale: Math.round(num(start, "scale", 1) * k * 1000) / 1000, ...at(left + w / 2, top + hh / 2) };
		default:
			return { size: round(num(start, "size") * k, 1), ...at(left + w / 2, top + hh / 2) };
	}
}

/** The smallest a crop can get, in composition px. */
const MIN_CROP = 8;

/**
 * ⌘-drag a handle or edge of an image: move that side of the crop instead of scaling. Sides stop at
 * the image's own edges, so dragging back out uncrops. The rest of the picture stays where it is.
 */
export function cropParams(start: Params, f: Frame, handle: Handle, local: Pt, doc: Doc): Params | null {
	const { width: W, height: H } = doc.scene;
	const g = imageGeom(start, W, H);
	if (!g) return null;
	const [fw, fh] = g.full;
	const [cl, ct] = g.crop;
	// The uncropped image's edges, in the frame's local space.
	const L = f.left - cl * fw;
	const T = f.top - ct * fh;
	const R = L + fw;
	const B = T + fh;
	let l = f.left;
	let t = f.top;
	let r = f.left + f.w;
	let b = f.top + f.h;
	const h = HANDLES.find((x) => x.id === handle)!;
	if (h.u === 0) l = Math.min(Math.max(local[0], L), r - MIN_CROP);
	if (h.u === 1) r = Math.max(Math.min(local[0], R), l + MIN_CROP);
	if (h.v === 0) t = Math.min(Math.max(local[1], T), b - MIN_CROP);
	if (h.v === 1) b = Math.max(Math.min(local[1], B), t + MIN_CROP);
	const [x, y] = toWorld(f, [(l + r) / 2, (t + b) / 2]);
	const share = (v: number) => Math.round(Math.max(0, v) * 10000) / 10000;
	return {
		cropL: share((l - L) / fw),
		cropT: share((t - T) / fh),
		cropR: share((R - r) / fw),
		cropB: share((B - b) / fh),
		x: Math.round((x / W) * 10000) / 10000,
		y: Math.round((1 - y / H) * 10000) / 10000,
	};
}

/** Layers whose corners round, and the most their radius can be (composition px). */
export function radiusLimit(layer: Layer, f: Frame) {
	const rounds = (layer.type === "shape" && (layer.params.shape ?? 0) === 0) || layer.type === "image";
	return rounds ? Math.min(f.w, f.h) / 2 : null;
}
