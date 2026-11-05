"use client";

import { useReducedMotion } from "framer-motion";
import dynamic from "next/dynamic";
import { useEffect, useEffectEvent, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { LOGO_PATHS, LOGO_VIEWBOX } from "@/lib/clueso-logo";
import { onBeat } from "@/lib/beat-box";
import { pluck, tick, unlockSound } from "@/lib/logo-sound";
import { markFillDoc } from "@/lib/mark-fill";
import { type Anchor, anchorAt, anchorIndices, flatten, type Handle, parsePath, pickHandles, type Pt, type Subpath, subdivide, unflatten, writePath } from "@/lib/path-edit";
import { send, usePresence } from "@/lib/presence";
import { cursorById } from "@/lib/site-prefs";
import { useSitePrefs } from "@/lib/site-prefs-store";
import { useIsDark } from "@/lib/use-dark";
import { useFinePointer } from "@/lib/use-fine-pointer";
import type { Doc } from "@/tools/brand-lab/state/doc";
import { mulberry32 } from "@/tools/brand-lab/state/shuffle";

const HeroCanvas = dynamic(() => import("./hero-canvas").then((m) => m.HeroCanvas), { ssr: false });

// The Clueso logo as vector paths with square handles on its key points. Pull one and the letter
// bends like jelly: the points near the handle follow it, less the farther they are, and a little
// late. Past a short free stretch the pull gets harder, and a line shows how far your hand has gone.
// Let go and it wobbles back; flick it and it overshoots as far as you threw it. Each letter is a
// note of the C major scale, played as it's let go, an octave up from a top handle and down from a
// bottom one (lib/logo-sound.ts). With the beat box on, the letters dance to the beat.
//
// Select several handles with a marquee or Shift-press, and pull them together, across letters.
// Escape or a press on empty space clears the selection.
//
// Everyone on the site pulls the same logo: your pulls go out over the presence stream and theirs
// come in, drawn in their cursor colour. Two people on one handle play tug of war: it sits between
// their hands.
//
// The mark is filled with a live Brand Lab design that re-rolls every few seconds, and every hover
// switches it to the next effect. The letters are filled in the strongest text colour: white in dark
// mode, ink in light mode.
//
// Phones get the mark alone, across the whole footer: the full logo is too small there to grab
// anything. On touch, handles get a target of at least 44px whatever the size.

// Long straight edges are split up, so the l and u's stems bend like the round letters do.
const ORIGINAL: Record<string, Subpath[]> = Object.fromEntries(LOGO_PATHS.map((p) => [p.id, subdivide(parsePath(p.d))]));
const REST: Record<string, Pt[]> = Object.fromEntries(LOGO_PATHS.map((p) => [p.id, flatten(ORIGINAL[p.id])]));
/** Each part's top and bottom, in logo units. */
const BOUNDS = Object.fromEntries(
	LOGO_PATHS.map(({ id }) => {
		const ys = REST[id].map((p) => p[1]);
		return [id, { top: Math.min(...ys), bottom: Math.max(...ys) }];
	}),
);
const SHUFFLE_EVERY = 7000;
/** The mark fill's box, in logo units: the mark (0 to 100) plus room for the furthest stretch and overshoot. */
const PAD = 100;

const noop = () => () => {};
const handleKey = (id: string, h: Handle) => `${id}/${h.anchors.map((a) => a.join(":")).join("|")}`;
const letterOf = (key: string) => key.slice(0, key.indexOf("/"));
const useMounted = () => useSyncExternalStore(noop, () => true, () => false);

/** md and up. The server draws the full logo; phones switch to the mark once they load. */
const WIDE = "(min-width: 48rem)";
const subscribeWide = (fn: () => void) => {
	const mq = matchMedia(WIDE);
	mq.addEventListener("change", fn);
	return () => mq.removeEventListener("change", fn);
};
const useWide = () => useSyncExternalStore(subscribeWide, () => matchMedia(WIDE).matches, () => true);

/** Smallest touch target, in px. */
const TOUCH_TARGET = 44;

/** How far a pull spreads through a letter, in logo units. */
const REACH = 40;
/** A pull follows your hand this far, in logo units. Past it, it gets harder and never goes more than GIVE further. */
const FREE = 40;
const GIVE = 60;
/** Spring stiffness of points far from the handle and right by it. Different speeds make the wobble ripple. */
const STIFF_FAR = 140;
const STIFF_NEAR = 420;
/** Damping ratio: well under 1, so letters wobble a few times before they settle. */
const WOBBLE = 0.2;
/** Fastest a flick can throw a handle, in logo units per second. */
const MAX_FLING = 1800;
/** A release this long after the last move is a drop, not a flick. */
const STILL_MS = 80;

/** A pull on some handles, yours or another visitor's: how far they're pulled from rest, in logo units. */
interface Pull {
	keys: string[];
	offset: Pt;
	mine: boolean;
}

/** One letter's points in motion, in `flatten` order and logo units. */
interface Body {
	pos: Pt[];
	vel: Pt[];
	stiff: number[];
	/** Someone is pulling it. */
	held: boolean;
	/** The octave it plays when let go, from the handle that pulled it. */
	octave: number;
}

const restBody = (id: string): Body => ({ pos: REST[id].map((p): Pt => [p[0], p[1]]), vel: REST[id].map((): Pt => [0, 0]), stiff: REST[id].map(() => STIFF_FAR), held: false, octave: 0 });
/** How fast every letter hops on a beat, in logo units per second, and how far behind the one before it, in ms. */
const HOP = 70;
const WAVE_MS = 35;

/** Where a handle sits up its letter: 1 in the top third, -1 in the bottom third, 0 between. Top handles play an octave up. */
function octaveOf(key: string) {
	const a = anchorsOf(key)?.[0];
	if (!a) return 0;
	const { top, bottom } = BOUNDS[letterOf(key)];
	const t = (anchorAt(ORIGINAL[letterOf(key)], a)[1] - top) / (bottom - top);
	return t < 1 / 3 ? 1 : t > 2 / 3 ? -1 : 0;
}

/** Past FREE, a pull meets more and more resistance. */
function resist([x, y]: Pt): Pt {
	const d = Math.hypot(x, y);
	if (d <= FREE) return [x, y];
	const k = (FREE + GIVE * (1 - 1 / (1 + (d - FREE) / GIVE))) / d;
	return [x * k, y * k];
}

/** A handle's anchors, read back from its key. Null for anything that isn't on the logo, like a bad key from another visitor. */
function anchorsOf(key: string): Anchor[] | null {
	const subs = ORIGINAL[letterOf(key)];
	if (!subs) return null;
	const out = key
		.slice(key.indexOf("/") + 1)
		.split("|")
		.map((part) => part.split(":").map(Number) as Anchor);
	return out.every(([si, i]) => subs[si] && Number.isInteger(i) && i >= -1 && i < subs[si].segs.length) ? out : null;
}

interface Spread {
	grabbed: Set<number>;
	/** How much each point follows the pull, 1 for the held points. */
	pull: number[];
}
const spreads = new Map<string, Spread>();
/** How a pull on these handles of letter `id` spreads through it. The same handles always spread the same way, so it's kept. */
function spread(id: string, keys: string[]): Spread {
	const name = `${id}|${keys.join(",")}`;
	const kept = spreads.get(name);
	if (kept) return kept;
	const anchors = keys.flatMap((k) => anchorsOf(k) ?? []);
	const grabbed = new Set(anchors.flatMap((a) => anchorIndices(ORIGINAL[id], a)));
	const centers = anchors.map((a) => anchorAt(ORIGINAL[id], a));
	const pull = REST[id].map((p, k) => (grabbed.has(k) ? 1 : centers.length ? Math.exp(-((Math.min(...centers.map((c) => Math.hypot(p[0] - c[0], p[1] - c[1]))) / REACH) ** 2)) : 0));
	if (spreads.size > 500) spreads.clear();
	const out = { grabbed, pull };
	spreads.set(name, out);
	return out;
}

/** Drops handles that sit inside the letter's filled area, like the corners of a crossbar that overlaps the bowl. */
function visibleHandles(id: string, handles: Handle[]): Handle[] {
	const subs = ORIGINAL[id];
	const ctx = document.createElement("canvas").getContext("2d")!;
	return handles.filter((h) => {
		const [si] = h.anchors[0];
		const p = anchorAt(subs, h.anchors[0]);
		const at: [number, number] = [p[0] + h.offset[0], p[1] + h.offset[1]];
		const others = new Path2D(writePath(subs.filter((_, k) => k !== si)));
		return !ctx.isPointInPath(others, at[0], at[1], id === "mark" ? "evenodd" : "nonzero");
	});
}

export function FooterLogo() {
	const svg = useRef<SVGSVGElement>(null);
	const mounted = useMounted();
	const reduce = useReducedMotion();
	const { cursors } = usePresence();
	const { logoSound } = useSitePrefs();
	const [shapes, setShapes] = useState<Record<string, Subpath[]>>(ORIGINAL);
	const [active, setActive] = useState<string | null>(null);
	/** Selected handles, filled in brand pink. Pulling one pulls them all. */
	const [selected, setSelected] = useState<Set<string>>(() => new Set());
	/** The marquee being drawn, corner to corner. */
	const [box, setBox] = useState<[Pt, Pt] | null>(null);
	/** Your hand while it's pulled past the free stretch, and the handle it's pulling, for the line between them. */
	const [hand, setHand] = useState<{ at: Pt; key: string } | null>(null);
	const dark = useIsDark();
	const wide = useWide();
	const fine = useFinePointer();
	const paths = wide ? LOGO_PATHS : LOGO_PATHS.filter((p) => p.id === "mark");
	/** Width of what's drawn, in logo units: the whole logo, or the mark alone. */
	const width = wide ? 524 : 100;
	const [pxPerUnit, setPxPerUnit] = useState(1);
	const [effect, setEffect] = useState(0);
	const [seed, setSeed] = useState(7);
	const fill = useMemo<Doc>(() => markFillDoc(mulberry32(seed), effect, dark), [seed, effect, dark]);
	/** Your pull: the handles, how far your hand has gone from where the first one rests, and when it last moved. */
	const drag = useRef<{ keys: string[]; raw: Pt; last: Pt; t: number } | null>(null);
	const marquee = useRef<{ from: Pt; base: Set<string> } | null>(null);
	/** Letters out of shape, simulated each frame until they settle. */
	const bodies = useRef<Record<string, Body>>({});
	const frame = useRef(0);
	const remote = useRef<Pull[]>([]);
	const sound = useRef(logoSound);

	// Picked once from the original drawing, so handles keep their identity while they move.
	const handles = useMemo<Record<string, Handle[]>>(() => (mounted ? Object.fromEntries(LOGO_PATHS.map(({ id }) => [id, visibleHandles(id, pickHandles(ORIGINAL[id]))])) : {}), [mounted]);
	const byKey = useMemo(() => new Map(Object.entries(handles).flatMap(([id, hs]) => hs.map((h) => [handleKey(id, h), h] as const))), [handles]);

	// Other visitors' pulls, with the colour they're drawn in.
	const tugs = useMemo(() => cursors.flatMap((c) => (c.tug ? [{ id: c.id, tug: c.tug, color: cursorById(c.color).fill }] : [])), [cursors]);
	const heldBy = useMemo(() => new Map(tugs.flatMap((t) => t.tug.keys.map((k) => [k, t.color] as const))), [tugs]);

	useEffect(() => {
		const el = svg.current!;
		const ro = new ResizeObserver(() => setPxPerUnit(el.clientWidth / width));
		ro.observe(el);
		return () => ro.disconnect();
	}, [width]);
	/** Each handle's invisible target, in logo units. */
	const hit = fine ? 10 : Math.max(10, TOUCH_TARGET / pxPerUnit);

	// Re-roll the mark's fill. Still for reduced motion.
	useEffect(() => {
		if (reduce) return;
		const t = window.setInterval(() => setSeed((Math.random() * 2 ** 32) >>> 0), SHUFFLE_EVERY);
		return () => window.clearInterval(t);
	}, [reduce]);

	useEffect(() => {
		sound.current = logoSound;
	}, [logoSound]);

	useEffect(() => {
		if (!selected.size) return;
		const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelected(new Set());
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [selected]);

	// Clear the frame too, or the next mount thinks a loop is still running and never starts one.
	useEffect(
		() => () => {
			cancelAnimationFrame(frame.current);
			frame.current = 0;
		},
		[],
	);

	const toSvg = (e: React.PointerEvent): Pt => {
		const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.current!.getScreenCTM()!.inverse());
		return [p.x, p.y];
	};

	/** Where a handle is drawn: on the letter as it is now, or at rest. */
	const handleAt = (key: string, now = true): Pt | null => {
		const a = anchorsOf(key)?.[0];
		if (!a) return null;
		const p = anchorAt((now ? shapes : ORIGINAL)[letterOf(key)], a);
		const off = byKey.get(key)?.offset ?? [0, 0];
		return [p[0] + off[0], p[1] + off[1]];
	};

	/** Plays a letter's note as it's let go: as loud as its furthest point is stretched. */
	const letGo = (id: string, b: Body) => {
		if (!sound.current) return;
		const rest = REST[id];
		pluck(id, Math.max(...b.pos.map((p, i) => Math.hypot(p[0] - rest[i][0], p[1] - rest[i][1]))), b.octave);
	};

	// One step of every moving letter. Each point springs toward the blend of every pull on it; the
	// points you hold sit right under your pull, unless someone else holds them too. Stops once
	// nothing is pulled and everything is back at rest.
	const wake = () => {
		if (frame.current) return;
		let last = 0;
		const step = (now: number) => {
			const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
			last = now;
			const d = drag.current;
			const pulls: Pull[] = d ? [...remote.current, { keys: d.keys, offset: resist(d.raw), mine: true }] : remote.current;
			const ids = new Set([...Object.keys(bodies.current), ...pulls.flatMap((p) => p.keys.map(letterOf))]);
			const next: Record<string, Subpath[]> = {};
			for (const id of ids) {
				const rest = REST[id];
				if (!rest) continue;
				const on = pulls.flatMap((p) => {
					const keys = p.keys.filter((k) => letterOf(k) === id);
					return keys.length ? [{ mine: p.mine, offset: p.offset, s: spread(id, keys), first: keys[0] }] : [];
				});
				const b = (bodies.current[id] ??= restBody(id));
				const held = on.length > 0;
				if (held) b.octave = octaveOf(on[0].first);
				if (!held && b.held) letGo(id, b);
				b.held = held;
				let still = !held;
				for (let k = 0; k < rest.length; k++) {
					let w = 0;
					let top = 0;
					let tx = 0;
					let ty = 0;
					let pin = false;
					let shared = false;
					for (const o of on) {
						const wk = o.s.pull[k];
						w += wk;
						top = Math.max(top, wk);
						tx += wk * o.offset[0];
						ty += wk * o.offset[1];
						if (o.s.grabbed.has(k)) {
							if (o.mine) pin = true;
							else shared = true;
						}
					}
					if (held) b.stiff[k] = STIFF_FAR + (STIFF_NEAR - STIFF_FAR) * Math.min(1, top);
					const n = Math.max(1, w);
					const target: Pt = [rest[k][0] + tx / n, rest[k][1] + ty / n];
					const p = b.pos[k];
					const v = b.vel[k];
					for (const i of [0, 1]) {
						if ((pin && !shared) || (reduce && held)) {
							// Held: right under the pull, moving as fast as it does, ready to be flung.
							v[i] = v[i] * 0.5 + ((target[i] - p[i]) / dt) * 0.5;
							p[i] = target[i];
						} else {
							v[i] += (b.stiff[k] * (target[i] - p[i]) - 2 * WOBBLE * Math.sqrt(b.stiff[k]) * v[i]) * dt;
							p[i] += v[i] * dt;
						}
						if (Math.abs(p[i] - rest[k][i]) > 0.05 || Math.abs(v[i]) > 0.5) still = false;
					}
				}
				if (still || (reduce && !held)) {
					delete bodies.current[id];
					next[id] = ORIGINAL[id];
				} else next[id] = unflatten(ORIGINAL[id], b.pos.map((p): Pt => [p[0], p[1]]));
			}
			setShapes((s) => ({ ...s, ...next }));
			frame.current = Object.keys(bodies.current).length || drag.current || remote.current.length ? requestAnimationFrame(step) : 0;
		};
		frame.current = requestAnimationFrame(step);
	};

	const onTugs = useEffectEvent(() => {
		remote.current = tugs.map((t) => ({ keys: t.tug.keys.filter((k) => anchorsOf(k)), offset: [t.tug.x, t.tug.y], mine: false }));
		wake();
	});
	useEffect(() => onTugs(), [tugs]);


	// The beat box's beat: a hop runs through the letters left to right, the first beat of each bar
	// a bigger one, and every bar the mark's fill re-rolls.
	const hop = useEffectEvent((id: string, speed: number) => {
		const b = (bodies.current[id] ??= restBody(id));
		for (const v of b.vel) v[1] -= speed;
		wake();
	});
	const onDance = useEffectEvent((beat: { count: number; downbeat: boolean } | null) => {
		if (!beat || reduce) return;
		if (beat.downbeat) setSeed((Math.random() * 2 ** 32) >>> 0);
		LOGO_PATHS.forEach(({ id }, i) => window.setTimeout(() => hop(id, beat.downbeat ? HOP * 1.6 : HOP), i * WAVE_MS));
	});
	useEffect(() => onBeat((beat) => onDance(beat)), []);

	/** Tells everyone else what you're pulling. */
	const share = () => {
		const d = drag.current;
		const off = d && resist(d.raw);
		send({ tug: d && off ? { keys: d.keys, x: off[0], y: off[1], hx: d.raw[0], hy: d.raw[1] } : null });
	};

	const down = (id: string, h: Handle) => (e: React.PointerEvent<SVGGElement>) => {
		e.preventDefault();
		// Keep the press from reaching the logo, which would start a marquee.
		e.stopPropagation();
		const key = handleKey(id, h);
		// Shift adds or removes the handle. Pressing a selected handle pulls the whole selection.
		let next = selected.has(key) ? selected : new Set([key]);
		if (e.shiftKey) {
			next = new Set(selected);
			if (!next.delete(key)) next.add(key);
		}
		setSelected(next);
		if (!next.has(key)) return;
		e.currentTarget.setPointerCapture(e.pointerId);
		if (sound.current) unlockSound();
		tick(id);
		// Pull the pressed handle first, so a letter still wobbling is picked up where it is.
		const keys = [key, ...[...next].filter((k) => k !== key)];
		const b = bodies.current[id];
		const first = [...spread(id, [key]).grabbed][0];
		const raw: Pt = b ? [b.pos[first][0] - REST[id][first][0], b.pos[first][1] - REST[id][first][1]] : [0, 0];
		drag.current = { keys, raw, last: toSvg(e), t: e.timeStamp };
		setActive(id);
		share();
		wake();
	};

	/** The handles inside the marquee, among the letters on screen. */
	const inside = ([a, b]: [Pt, Pt]) => {
		const [x0, x1] = [Math.min(a[0], b[0]), Math.max(a[0], b[0])];
		const [y0, y1] = [Math.min(a[1], b[1]), Math.max(a[1], b[1])];
		return paths.flatMap(({ id }) =>
			(handles[id] ?? []).flatMap((h) => {
				const key = handleKey(id, h);
				const p = handleAt(key);
				return p && p[0] >= x0 && p[0] <= x1 && p[1] >= y0 && p[1] <= y1 ? [key] : [];
			}),
		);
	};

	// A press anywhere in the logo's frame, not on a handle, starts a marquee. Shift keeps what's
	// already selected. On touch only the logo itself, so the frame around it still scrolls the page.
	const startMarquee = (e: React.PointerEvent<HTMLDivElement>) => {
		if (e.button !== 0 || (e.pointerType === "touch" && !svg.current?.contains(e.target as Node))) return;
		e.currentTarget.setPointerCapture(e.pointerId);
		const from = toSvg(e);
		const base = e.shiftKey ? selected : new Set<string>();
		marquee.current = { from, base };
		setSelected(base);
		setBox([from, from]);
	};

	const move = (e: React.PointerEvent) => {
		const m = marquee.current;
		if (m) {
			const corners: [Pt, Pt] = [m.from, toSvg(e)];
			setBox(corners);
			setSelected(new Set([...m.base, ...inside(corners)]));
			return;
		}
		const d = drag.current;
		if (!d) return;
		const p = toSvg(e);
		d.raw = [d.raw[0] + p[0] - d.last[0], d.raw[1] + p[1] - d.last[1]];
		d.last = p;
		d.t = e.timeStamp;
		setHand(Math.hypot(d.raw[0], d.raw[1]) > FREE ? { at: p, key: d.keys[0] } : null);
		share();
	};

	// Let go: the held points keep their speed, unless the hand had stopped, and wobble back.
	const up = (e: React.PointerEvent) => {
		if (marquee.current) {
			marquee.current = null;
			setBox(null);
			return;
		}
		const d = drag.current;
		drag.current = null;
		setActive(null);
		setHand(null);
		if (!d) return;
		share();
		const stopped = e.timeStamp - d.t > STILL_MS;
		for (const id of new Set(d.keys.map(letterOf))) {
			const b = bodies.current[id];
			if (!b) continue;
			for (const k of spread(id, d.keys.filter((key) => letterOf(key) === id)).grabbed) {
				const speed = Math.hypot(b.vel[k][0], b.vel[k][1]);
				const scale = stopped ? 0 : Math.min(1, MAX_FLING / (speed || 1));
				b.vel[k] = [b.vel[k][0] * scale, b.vel[k][1] * scale];
			}
		}
		wake();
	};

	const markPath = writePath(shapes.mark);
	const shown = new Set(paths.map((p) => p.id));
	const ropeTo = hand && handleAt(hand.key);

	return (
		// The same padding all round, so the logo sits evenly in its frame.
		<div className="p-gap-l select-none" onPointerDown={startMarquee} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
			<div className="relative">
				{/* The mark's live fill, clipped to the mark's current outline. It reaches well past the mark, so it lets presses through. */}
				<div
					aria-hidden
					className="pointer-events-none absolute"
					style={{
						left: `${(-PAD / width) * 100}%`,
						top: `${-PAD}%`,
						width: `${((100 + 2 * PAD) / width) * 100}%`,
						height: `${100 + 2 * PAD}%`,
						clipPath: "url(#footer-mark-clip)",
					}}
				>
					<HeroCanvas doc={fill} />
				</div>
				<svg
					ref={svg}
					viewBox={wide ? LOGO_VIEWBOX : "0 0 100 100"}
					role="img"
					aria-label={wide ? "The Clueso logo" : "The Clueso mark"}
					className="relative w-full touch-none overflow-visible"
				>
					<defs>
						<clipPath id="footer-mark-clip" clipPathUnits="objectBoundingBox">
							<path d={markPath} fillRule="evenodd" transform={`scale(${1 / (100 + 2 * PAD)}) translate(${PAD} ${PAD})`} />
						</clipPath>
					</defs>
					{paths.map(({ id }) => (
						<g
							key={id}
							onPointerEnter={() => {
								if (drag.current || marquee.current) return;
								setActive(id);
								if (id === "mark") setEffect((n) => n + 1);
							}}
							onPointerLeave={() => !drag.current && setActive(null)}
						>
							<path
								d={id === "mark" ? markPath : writePath(shapes[id])}
								fillRule={id === "mark" ? "evenodd" : "nonzero"}
								fill={id === "mark" ? "transparent" : "var(--fg-neutral-strong)"}
								// Stroke under the fill, so contours that overlap inside a letter don't show.
								paintOrder="stroke"
								stroke="var(--border-neutral-strong)"
								strokeWidth={id === "mark" ? 1 : 2}
								vectorEffect="non-scaling-stroke"
								className="transition-[fill] duration-300 ease-out-strong"
							/>
							{handles[id]?.map((h) => {
								const key = handleKey(id, h);
								const [x, y] = handleAt(key)!;
								const on = selected.has(key);
								const theirs = heldBy.get(key);
								return (
									<g key={key} onPointerDown={down(id, h)} className="cursor-grab active:cursor-grabbing">
										{/* A bigger invisible target, so small handles are easy to grab. */}
										<rect x={x - hit / 2} y={y - hit / 2} width={hit} height={hit} fill="transparent" />
										<rect
											x={x - 1.6}
											y={y - 1.6}
											width={3.2}
											height={3.2}
											fill={on ? "var(--bg-brand-normal)" : (theirs ?? "var(--surface-page)")}
											stroke={on ? "white" : (theirs ?? (active === id ? "var(--fg-neutral-strong)" : "var(--border-neutral-strong)"))}
											strokeWidth={1}
											vectorEffect="non-scaling-stroke"
											className="pointer-events-none"
										/>
									</g>
								);
							})}
						</g>
					))}
					{/* Other visitors' hands: a line from the handle they hold to where their hand is. */}
					{tugs.map(({ id, tug, color }) => {
						const key = tug.keys[0];
						const at = shown.has(letterOf(key)) && handleAt(key);
						const rest = at && handleAt(key, false);
						if (!at || !rest) return null;
						const to: Pt = [rest[0] + tug.hx, rest[1] + tug.hy];
						return (
							<g key={id} className="pointer-events-none">
								<line x1={at[0]} y1={at[1]} x2={to[0]} y2={to[1]} stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
								<circle cx={to[0]} cy={to[1]} r={2.4} fill={color} />
							</g>
						);
					})}
					{ropeTo && hand && (
						<line
							x1={ropeTo[0]}
							y1={ropeTo[1]}
							x2={hand.at[0]}
							y2={hand.at[1]}
							stroke="var(--bg-brand-normal)"
							strokeWidth={1.5}
							vectorEffect="non-scaling-stroke"
							className="pointer-events-none"
						/>
					)}
					{box && (
						<rect
							x={Math.min(box[0][0], box[1][0])}
							y={Math.min(box[0][1], box[1][1])}
							width={Math.abs(box[1][0] - box[0][0])}
							height={Math.abs(box[1][1] - box[0][1])}
							fill="var(--bg-brand-normal)"
							fillOpacity={0.08}
							stroke="var(--bg-brand-normal)"
							strokeWidth={1}
							vectorEffect="non-scaling-stroke"
							className="pointer-events-none"
						/>
					)}
				</svg>
			</div>
		</div>
	);
}
