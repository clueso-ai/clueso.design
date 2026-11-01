"use client";

import { animate, useReducedMotion } from "framer-motion";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { LOGO_PATHS, LOGO_VIEWBOX } from "@/lib/clueso-logo";
import { markFillDoc } from "@/lib/mark-fill";
import { useIsDark } from "@/lib/use-dark";
import { useFinePointer } from "@/lib/use-fine-pointer";
import { anchorAt, type Handle, lerpPath, moveAnchor, parsePath, pickHandles, type Subpath, writePath } from "@/lib/path-edit";
import type { Doc } from "@/tools/brand-lab/state/doc";
import { mulberry32 } from "@/tools/brand-lab/state/shuffle";

const HeroCanvas = dynamic(() => import("./hero-canvas").then((m) => m.HeroCanvas), { ssr: false });

// The Clueso logo as vector paths with square handles on its key points. Pull one and the letter
// stretches; let go and it springs back. The mark is filled with a live Brand Lab design that
// re-rolls every few seconds, and every hover switches it to the next effect. The letters are
// filled in the strongest text colour: white in dark mode, ink in light mode.
//
// Phones get the mark alone, across the whole footer: the full logo is too small there to grab
// anything. On touch, handles get a target of at least 44px whatever the size.

const ORIGINAL: Record<string, Subpath[]> = Object.fromEntries(LOGO_PATHS.map((p) => [p.id, parsePath(p.d)]));
const SHUFFLE_EVERY = 7000;
/** The mark fill's box, in logo units: the mark (0 to 100) plus room to be stretched. */
const PAD = 30;

const noop = () => () => {};
const handleKey = (id: string, h: Handle) => `${id}/${h.anchors.map((a) => a.join(":")).join("|")}`;
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
	const [shapes, setShapes] = useState<Record<string, Subpath[]>>(ORIGINAL);
	const [active, setActive] = useState<string | null>(null);
	/** The handle last pressed, shown filled in brand pink until you press somewhere else. */
	const [selected, setSelected] = useState<string | null>(null);
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
	const drag = useRef<{ id: string; h: Handle; last: [number, number] } | null>(null);
	const springs = useRef<Record<string, { stop: () => void }>>({});

	// Picked once from the original drawing, so handles keep their identity while they move.
	const handles = useMemo(() => (mounted ? Object.fromEntries(LOGO_PATHS.map(({ id }) => [id, visibleHandles(id, pickHandles(ORIGINAL[id]))])) : {}), [mounted]);

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

	const toSvg = (e: React.PointerEvent): [number, number] => {
		const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.current!.getScreenCTM()!.inverse());
		return [p.x, p.y];
	};

	const down = (id: string, h: Handle) => (e: React.PointerEvent<SVGGElement>) => {
		e.preventDefault();
		// Keep the press from reaching the logo, which would clear the selection.
		e.stopPropagation();
		e.currentTarget.setPointerCapture(e.pointerId);
		springs.current[id]?.stop();
		drag.current = { id, h, last: toSvg(e) };
		setActive(id);
		setSelected(handleKey(id, h));
	};
	const move = (e: React.PointerEvent) => {
		const d = drag.current;
		if (!d) return;
		const p = toSvg(e);
		const delta: [number, number] = [p[0] - d.last[0], p[1] - d.last[1]];
		d.last = p;
		setShapes((s) => ({ ...s, [d.id]: d.h.anchors.reduce((subs, a) => moveAnchor(subs, a, delta), s[d.id]) }));
	};
	// Let go: the letter springs back to its true shape.
	const up = () => {
		const d = drag.current;
		drag.current = null;
		setActive(null);
		if (!d) return;
		const from = shapes[d.id];
		if (reduce) return setShapes((s) => ({ ...s, [d.id]: ORIGINAL[d.id] }));
		springs.current[d.id] = animate(0, 1, {
			type: "spring",
			stiffness: 260,
			damping: 14,
			onUpdate: (t) => setShapes((s) => ({ ...s, [d.id]: lerpPath(from, ORIGINAL[d.id], t) })),
		});
	};

	const markPath = writePath(shapes.mark);

	return (
		<div className="relative">
			{/* The mark's live fill, clipped to the mark's current outline. */}
			<div
				aria-hidden
				className="absolute"
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
				className="relative w-full touch-none overflow-visible select-none"
				onPointerMove={move}
				onPointerDown={() => setSelected(null)}
				onPointerUp={up}
				onPointerCancel={up}
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
							if (drag.current) return;
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
							const p = anchorAt(shapes[id], h.anchors[0]);
							const x = p[0] + h.offset[0];
							const y = p[1] + h.offset[1];
							const on = selected === handleKey(id, h);
							return (
								<g key={handleKey(id, h)} onPointerDown={down(id, h)} className="cursor-grab active:cursor-grabbing">
									{/* A bigger invisible target, so small handles are easy to grab. */}
									<rect x={x - hit / 2} y={y - hit / 2} width={hit} height={hit} fill="transparent" />
									<rect
										x={x - 1.6}
										y={y - 1.6}
										width={3.2}
										height={3.2}
										fill={on ? "var(--bg-brand-normal)" : "var(--surface-page)"}
										stroke={on ? "white" : active === id ? "var(--fg-neutral-strong)" : "var(--border-neutral-strong)"}
										strokeWidth={1}
										vectorEffect="non-scaling-stroke"
										className="pointer-events-none"
									/>
								</g>
							);
						})}
					</g>
				))}
			</svg>
		</div>
	);
}
