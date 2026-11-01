// A tiny SVG path editor model: parse absolute M/L/H/V/C/Z paths (what our logo uses) into
// subpaths of line and cubic segments, move anchors the way design tools do (an anchor carries
// its two handles), and write the path back out.

export type Pt = [number, number];
export interface Seg {
	c1?: Pt;
	c2?: Pt;
	p: Pt;
}
export interface Subpath {
	start: Pt;
	segs: Seg[];
	closed: boolean;
	/** The last segment ends on the start point, so they're one anchor. */
	linked: boolean;
}

export function parsePath(d: string): Subpath[] {
	const tokens = d.match(/[MLHVCZmlhvcz]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g) ?? [];
	const subs: Subpath[] = [];
	let i = 0;
	let cmd = "";
	let cur: Pt = [0, 0];
	const num = () => Number(tokens[i++]);
	while (i < tokens.length) {
		if (/[a-z]/i.test(tokens[i])) cmd = tokens[i++];
		const sub = subs[subs.length - 1];
		switch (cmd) {
			case "M":
				cur = [num(), num()];
				subs.push({ start: cur, segs: [], closed: false, linked: false });
				cmd = "L"; // extra pairs after M are lines
				break;
			case "L":
				cur = [num(), num()];
				sub.segs.push({ p: cur });
				break;
			case "H":
				cur = [num(), cur[1]];
				sub.segs.push({ p: cur });
				break;
			case "V":
				cur = [cur[0], num()];
				sub.segs.push({ p: cur });
				break;
			case "C": {
				const c1: Pt = [num(), num()];
				const c2: Pt = [num(), num()];
				cur = [num(), num()];
				sub.segs.push({ c1, c2, p: cur });
				break;
			}
			case "Z": {
				sub.closed = true;
				const last = sub.segs[sub.segs.length - 1];
				sub.linked = !!last && Math.hypot(last.p[0] - sub.start[0], last.p[1] - sub.start[1]) < 0.01;
				cur = sub.start;
				cmd = "";
				break;
			}
			default:
				throw new Error(`Unsupported path command ${cmd}`);
		}
	}
	return subs;
}

const f = (n: number) => Math.round(n * 100) / 100;

export function writePath(subs: Subpath[]): string {
	return subs
		.map((s) => {
			const parts = [`M${f(s.start[0])} ${f(s.start[1])}`];
			for (const seg of s.segs) parts.push(seg.c1 ? `C${f(seg.c1[0])} ${f(seg.c1[1])} ${f(seg.c2![0])} ${f(seg.c2![1])} ${f(seg.p[0])} ${f(seg.p[1])}` : `L${f(seg.p[0])} ${f(seg.p[1])}`);
			if (s.closed) parts.push("Z");
			return parts.join("");
		})
		.join("");
}

/** An anchor: subpath index and segment index (-1 is the start point). */
export type Anchor = [number, number];

export function anchors(subs: Subpath[]): { a: Anchor; p: Pt }[] {
	const out: { a: Anchor; p: Pt }[] = [];
	subs.forEach((s, si) => {
		out.push({ a: [si, -1], p: s.start });
		s.segs.forEach((seg, i) => {
			if (s.linked && i === s.segs.length - 1) return;
			out.push({ a: [si, i], p: seg.p });
		});
	});
	return out;
}

const add = (p: Pt | undefined, d: Pt): Pt | undefined => (p ? [p[0] + d[0], p[1] + d[1]] : p);

/** Moves an anchor by `d`, with its incoming and outgoing handles. Returns new subpaths. */
export function moveAnchor(subs: Subpath[], [si, i]: Anchor, d: Pt): Subpath[] {
	return subs.map((s, k) => {
		if (k !== si) return s;
		const segs = s.segs.map((seg) => ({ ...seg }));
		let start = s.start;
		const n = segs.length;
		if (i === -1) {
			start = add(start, d)!;
			if (segs[0]) segs[0].c1 = add(segs[0].c1, d);
			if (s.linked) {
				segs[n - 1].p = add(segs[n - 1].p, d)!;
				segs[n - 1].c2 = add(segs[n - 1].c2, d);
			}
		} else {
			segs[i].p = add(segs[i].p, d)!;
			segs[i].c2 = add(segs[i].c2, d);
			if (segs[i + 1]) segs[i + 1].c1 = add(segs[i + 1].c1, d);
		}
		return { ...s, start, segs };
	});
}

/** A handle the visitor can drag: one or more anchors that move together, drawn at `at`. */
export interface Handle {
	anchors: Anchor[];
	/** Where the handle draws, relative to its first anchor (a rounded corner's sharp corner). */
	offset: Pt;
}

const sub2 = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]];
const len = (v: Pt) => Math.hypot(v[0], v[1]);
const turn = (a: Pt, b: Pt) => {
	const la = len(a);
	const lb = len(b);
	if (la < 1e-6 || lb < 1e-6) return 0;
	return Math.acos(Math.max(-1, Math.min(1, (a[0] * b[0] + a[1] * b[1]) / (la * lb))));
};

/** Where two lines (point + direction) cross, or null when they're near parallel. */
function cross(p: Pt, d: Pt, q: Pt, e: Pt): Pt | null {
	const den = d[0] * e[1] - d[1] * e[0];
	if (Math.abs(den) < 1e-6 * len(d) * len(e)) return null;
	const t = ((q[0] - p[0]) * e[1] - (q[1] - p[1]) * e[0]) / den;
	return [p[0] + d[0] * t, p[1] + d[1] * t];
}

/** Per anchor: position, tangent in, tangent out, and whether a curve meets it. */
function describe(s: Subpath, si: number) {
	const list = anchors([s]).map(({ a, p }) => ({ a: [si, a[1]] as Anchor, p }));
	const n = list.length;
	return list.map(({ a, p }, k) => {
		const i = a[1];
		const prev = list[(k - 1 + n) % n].p;
		const next = list[(k + 1) % n].p;
		const inSeg = i === -1 ? (s.linked ? s.segs[s.segs.length - 1] : undefined) : s.segs[i];
		const outSeg = s.segs[i + 1];
		const tin = sub2(p, inSeg?.c2 && len(sub2(p, inSeg.c2)) > 1e-6 ? inSeg.c2 : prev);
		const tout = sub2(outSeg?.c1 && len(sub2(outSeg.c1, p)) > 1e-6 ? outSeg.c1 : next, p);
		return { a, p, prev, next, tin, tout, curved: !!(inSeg?.c1 || outSeg?.c1) };
	});
}

/**
 * The few anchors worth dragging: sharp corners, rounded corners (their two anchors become one
 * handle, drawn where the sharp corner would be), and the points where a curve turns back in x or
 * y (its top, bottom and sides).
 */
export function pickHandles(subs: Subpath[], { cornerDeg = 35, merge = 8 } = {}): Handle[] {
	const limit = (cornerDeg * Math.PI) / 180;
	const out: Handle[] = [];
	subs.forEach((s, si) => {
		const pts = describe(s, si);
		const n = pts.length;
		const flag = pts.map((q) => turn(q.tin, q.tout) > limit);
		// Rounded corners: two close anchors whose tangents turn a corner between them.
		const pair = pts.map((q, k) => {
			const r = pts[(k + 1) % n];
			return len(sub2(r.p, q.p)) < merge && turn(q.tin, r.tout) > limit;
		});
		pts.forEach((q, k) => {
			if (pair[k]) flag[k] = flag[(k + 1) % n] = true;
			const extreme = q.curved && [0, 1].some((d) => (q.p[d] >= q.prev[d] && q.p[d] >= q.next[d] && (q.p[d] > q.prev[d] || q.p[d] > q.next[d])) || (q.p[d] <= q.prev[d] && q.p[d] <= q.next[d] && (q.p[d] < q.prev[d] || q.p[d] < q.next[d])));
			if (extreme) flag[k] = true;
		});
		// Group runs of flagged anchors that sit within `merge` of each other.
		const start = flag.findIndex((f, k) => f && !(flag[(k - 1 + n) % n] && len(sub2(pts[k].p, pts[(k - 1 + n) % n].p)) < merge));
		if (start === -1) return;
		let group: number[] = [];
		const flush = () => {
			if (!group.length) return;
			const first = pts[group[0]];
			const last = pts[group[group.length - 1]];
			let at = first.p;
			if (group.length > 1) {
				const c = cross(first.p, first.tin, last.p, last.tout);
				const mid: Pt = [group.reduce((t, k) => t + pts[k].p[0], 0) / group.length, group.reduce((t, k) => t + pts[k].p[1], 0) / group.length];
				at = c && len(sub2(c, mid)) < merge ? c : mid;
			}
			out.push({ anchors: group.map((k) => pts[k].a), offset: sub2(at, first.p) });
			group = [];
		};
		for (let j = 0; j < n; j++) {
			const k = (start + j) % n;
			if (!flag[k]) {
				flush();
				continue;
			}
			if (group.length && len(sub2(pts[k].p, pts[group[group.length - 1]].p)) >= merge) flush();
			group.push(k);
		}
		flush();
	});
	return out;
}

/** Where an anchor is now. */
export function anchorAt(subs: Subpath[], [si, i]: Anchor): Pt {
	const s = subs[si];
	return i === -1 ? s.start : s.segs[i].p;
}

const mix = (a: Pt | undefined, b: Pt | undefined, t: number): Pt | undefined => (a && b ? [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] : a);

/** Blends two versions of the same path (same structure), t from 0 (a) to 1 (b). */
export function lerpPath(a: Subpath[], b: Subpath[], t: number): Subpath[] {
	return a.map((s, si) => ({
		...s,
		start: mix(s.start, b[si].start, t)!,
		segs: s.segs.map((seg, i) => ({ c1: mix(seg.c1, b[si].segs[i].c1, t), c2: mix(seg.c2, b[si].segs[i].c2, t), p: mix(seg.p, b[si].segs[i].p, t)! })),
	}));
}
