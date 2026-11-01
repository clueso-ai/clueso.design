import { type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { aabb, corners, hits, type Frame, HANDLES, type Handle, handlesFor, intersects, layerFrame, type Rect, resizeParams, toLocal, toWorld, union } from "../layers/bounds";
import { getDef } from "../layers/registry";
import type { Layer, Params } from "../layers/types";
import { useStore } from "../state/store";

type Pt = [number, number];

type Drag =
	| { kind: "move"; origin: Pt; ids: string[]; starts: Record<string, Params>; box: Rect | null; others: Rect[]; moved: boolean }
	| { kind: "resize"; id: string; handle: Handle; frame: Frame; start: Params }
	| { kind: "marquee"; origin: Pt; moved: boolean; additive: boolean; base: string[] }
	| { kind: "rotate"; id: string; centre: Pt; pivot: Pt; startAngle: number; startRot: number; keys: [string, string] };

const SNAP_PX = 6;

/**
 * The canvas and layer rows aren't focusable, so clicking them can leave a panel field focused
 * (always, in some embedded browsers), which then swallows Delete and the other shortcuts.
 */
export function releaseFieldFocus() {
	const el = document.activeElement as HTMLElement | null;
	if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) el.blur();
}

/**
 * Figma-style editing on the artboard: hover outlines, click and Shift-click selection, marquee,
 * move with smart guides, resize handles, ⌥ distance measuring and a right-click menu. Coordinates
 * are composition px (y down); the SVG's viewBox maps them onto the artboard at any zoom.
 */
export function CanvasOverlay({ scale }: { scale: number }) {
	const doc = useStore((s) => s.doc);
	const selectedIds = useStore((s) => s.selectedIds);
	const hoverId = useStore((s) => s.hoverId);
	const { width: W, height: H } = doc.scene;
	const svg = useRef<SVGSVGElement>(null);
	const drag = useRef<Drag | null>(null);
	const [marquee, setMarquee] = useState<Rect | null>(null);
	const [guides, setGuides] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] });
	const [alt, setAlt] = useState(false);
	const [dragging, setDragging] = useState(false);
	const [rotation, setRotation] = useState<number | null>(null);

	const frames = useMemo(() => {
		const m = new Map<string, Frame>();
		for (const l of doc.layers) {
			if (!l.visible) continue;
			const f = layerFrame(l, doc);
			if (f) m.set(l.id, f);
		}
		return m;
	}, [doc]);

	useEffect(() => {
		const down = (e: KeyboardEvent) => e.key === "Alt" && setAlt(true);
		const up = (e: KeyboardEvent) => e.key === "Alt" && setAlt(false);
		const blur = () => setAlt(false);
		window.addEventListener("keydown", down);
		window.addEventListener("keyup", up);
		window.addEventListener("blur", blur);
		return () => {
			window.removeEventListener("keydown", down);
			window.removeEventListener("keyup", up);
			window.removeEventListener("blur", blur);
		};
	}, []);

	const px = (n: number) => n / scale; // screen px → composition px
	const toComp = (e: { clientX: number; clientY: number }): Pt => {
		const r = svg.current!.getBoundingClientRect();
		return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H];
	};

	/** Topmost visible, unlocked object under the point. Fill layers never win a click. */
	const hitTest = (pt: Pt) => doc.layers.find((l) => !l.locked && frames.has(l.id) && hits(l, frames.get(l.id)!, pt)) ?? null;
	const topFill = () => doc.layers.find((l) => l.visible && !l.locked && !frames.has(l.id) && getDef(l.type)?.kind === "source") ?? null;

	const startMove = (origin: Pt, ids: string[]) => {
		const st = useStore.getState();
		const movable = st.doc.layers.filter((l) => ids.includes(l.id) && !l.locked && getDef(l.type)?.position);
		const box = union(movable.filter((l) => frames.has(l.id)).map((l) => aabb(frames.get(l.id)!)));
		const others = [...frames.entries()].filter(([id]) => !ids.includes(id)).map(([, f]) => aabb(f));
		drag.current = {
			kind: "move",
			origin,
			ids: movable.map((l) => l.id),
			starts: Object.fromEntries(movable.map((l) => [l.id, { ...l.params }])),
			box,
			others,
			moved: false,
		};
	};

	const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
		if (e.button !== 0) return;
		releaseFieldFocus();
		svg.current!.setPointerCapture(e.pointerId);
		const st = useStore.getState();
		const pt = toComp(e);
		const hit = hitTest(pt);
		if (hit) {
			let ids = st.selectedIds;
			if (e.shiftKey) {
				st.select(hit.id, "toggle");
				ids = useStore.getState().selectedIds;
			} else if (!ids.includes(hit.id)) {
				st.select(hit.id);
				ids = [hit.id];
			}
			// ⌥-drag drops a copy: duplicate the selection in place, then move the copies.
			if (e.altKey) {
				st.duplicateSelected();
				ids = useStore.getState().selectedIds;
			}
			startMove(pt, ids);
		} else {
			drag.current = { kind: "marquee", origin: pt, moved: false, additive: e.shiftKey, base: st.selectedIds };
		}
		setDragging(true);
	};

	const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
		const pt = toComp(e);
		const d = drag.current;
		const st = useStore.getState();
		if (!d) {
			st.setHover(hitTest(pt)?.id ?? null);
			return;
		}
		if (d.kind === "marquee") {
			const r = { l: Math.min(d.origin[0], pt[0]), t: Math.min(d.origin[1], pt[1]), r: Math.max(d.origin[0], pt[0]), b: Math.max(d.origin[1], pt[1]) };
			if (!d.moved && Math.hypot(pt[0] - d.origin[0], pt[1] - d.origin[1]) < px(3)) return;
			d.moved = true;
			setMarquee(r);
			const hits = st.doc.layers.filter((l) => !l.locked && frames.has(l.id) && intersects(aabb(frames.get(l.id)!), r)).map((l) => l.id);
			st.selectMany(d.additive ? [...new Set([...d.base, ...hits])] : hits);
			return;
		}
		if (d.kind === "rotate") {
			// Screen y points down, so a counter-clockwise turn is a decreasing atan2 angle.
			let delta = -((Math.atan2(pt[1] - d.centre[1], pt[0] - d.centre[0]) * 180) / Math.PI - d.startAngle);
			let next = d.startRot + delta;
			if (e.shiftKey) next = Math.round(next / 15) * 15;
			next = ((((next + 180) % 360) + 360) % 360) - 180;
			delta = next - d.startRot;
			// Turn around the frame's centre: the pivot (x/y) orbits it.
			const a = (delta * Math.PI) / 180;
			const vx = d.pivot[0] - d.centre[0];
			const vy = d.pivot[1] - d.centre[1];
			const px2 = d.centre[0] + vx * Math.cos(a) + vy * Math.sin(a);
			const py2 = d.centre[1] - vx * Math.sin(a) + vy * Math.cos(a);
			st.patchLayers(
				{ [d.id]: { rotation: Math.round(next * 10) / 10, [d.keys[0]]: Math.round((px2 / W) * 10000) / 10000, [d.keys[1]]: Math.round((1 - py2 / H) * 10000) / 10000 } },
				`rotate:${d.id}`,
			);
			setRotation(Math.round(next));
			return;
		}
		if (d.kind === "resize") {
			const layer = st.doc.layers.find((l) => l.id === d.id);
			if (!layer) return;
			const patch = resizeParams(layer, d.start, d.frame, d.handle, toLocal(d.frame, pt), st.doc, e.shiftKey, e.altKey);
			st.patchLayers({ [d.id]: patch }, `resize:${d.id}`);
			return;
		}
		let dx = pt[0] - d.origin[0];
		let dy = pt[1] - d.origin[1];
		if (!d.moved && Math.hypot(dx, dy) < px(3)) return;
		d.moved = true;
		if (e.shiftKey) {
			if (Math.abs(dx) > Math.abs(dy)) dy = 0;
			else dx = 0;
		}
		// Smart guides: snap the selection's edges and centre to the canvas and other objects (⌘ to skip).
		const gx: number[] = [];
		const gy: number[] = [];
		const snapping = st.snapping && !e.metaKey && !e.ctrlKey;
		// Pixel snapping: moves land on whole composition px (guides below may then refine).
		if (snapping) {
			dx = Math.round(dx);
			dy = Math.round(dy);
		}
		if (d.box && snapping) {
			const tol = px(SNAP_PX);
			const xs = [0, W / 2, W, ...d.others.flatMap((o) => [o.l, (o.l + o.r) / 2, o.r])];
			const ys = [0, H / 2, H, ...d.others.flatMap((o) => [o.t, (o.t + o.b) / 2, o.b])];
			const snap = (feats: number[], cands: number[]) => {
				let best: { delta: number; at: number } | null = null;
				for (const f of feats) for (const c of cands) if (Math.abs(c - f) <= tol && (!best || Math.abs(c - f) < Math.abs(best.delta))) best = { delta: c - f, at: c };
				return best;
			};
			const b = d.box;
			const sx = snap([b.l + dx, (b.l + b.r) / 2 + dx, b.r + dx], xs);
			const sy = snap([b.t + dy, (b.t + b.b) / 2 + dy, b.b + dy], ys);
			if (sx && !(e.shiftKey && dx === 0)) {
				dx += sx.delta;
				gx.push(sx.at);
			}
			if (sy && !(e.shiftKey && dy === 0)) {
				dy += sy.delta;
				gy.push(sy.at);
			}
		}
		setGuides({ x: gx, y: gy });
		const patches: Record<string, Params> = {};
		for (const id of d.ids) {
			const def = getDef(st.doc.layers.find((l) => l.id === id)!.type)!;
			const [kx, ky] = def.position!;
			const start = d.starts[id];
			patches[id] = {
				[kx]: Math.round((Number(start[kx]) + dx / W) * 10000) / 10000,
				[ky]: Math.round((Number(start[ky]) - dy / H) * 10000) / 10000,
			};
		}
		st.patchLayers(patches, `move:${d.ids.join(",")}`);
	};

	const onPointerUp = () => {
		const d = drag.current;
		drag.current = null;
		setRotation(null);
		setDragging(false);
		setMarquee(null);
		setGuides({ x: [], y: [] });
		if (d?.kind === "marquee" && !d.moved && !d.additive) {
			// A plain click on empty space selects the pattern underneath, like clicking a frame's fill.
			const fill = topFill();
			useStore.getState().select(fill?.id ?? null);
		}
	};

	const onHandleDown = (e: ReactPointerEvent, layer: Layer, handle: Handle) => {
		e.stopPropagation();
		if (e.button !== 0) return;
		svg.current!.setPointerCapture(e.pointerId);
		drag.current = { kind: "resize", id: layer.id, handle, frame: frames.get(layer.id)!, start: { ...layer.params } };
		setDragging(true);
	};

	const onRotateDown = (e: ReactPointerEvent, layer: Layer, f: Frame) => {
		e.stopPropagation();
		if (e.button !== 0) return;
		svg.current!.setPointerCapture(e.pointerId);
		const centre = toWorld(f, [f.left + f.w / 2, f.top + f.h / 2]);
		const pt = toComp(e);
		drag.current = {
			kind: "rotate",
			id: layer.id,
			centre,
			pivot: [f.px, f.py],
			startAngle: (Math.atan2(pt[1] - centre[1], pt[0] - centre[0]) * 180) / Math.PI,
			startRot: Number(layer.params.rotation ?? 0),
			keys: getDef(layer.type)!.position!,
		};
		setDragging(true);
	};

	const selected = doc.layers.filter((l) => selectedIds.includes(l.id));
	const single = selected.length === 1 ? selected[0] : null;
	const singleFrame = single ? frames.get(single.id) : undefined;
	const selBox = union(selected.filter((l) => frames.has(l.id)).map((l) => aabb(frames.get(l.id)!)));
	const fillSelected = selected.some((l) => !frames.has(l.id));
	const hover = hoverId && !selectedIds.includes(hoverId) ? frames.get(hoverId) : undefined;

	const poly = (f: Frame) =>
		corners(f)
			.map((p) => p.join(","))
			.join(" ");

	return (
		<svg
			ref={svg}
			data-dup
			className={`canvas-overlay${dragging ? " dragging" : ""}`}
			viewBox={`0 0 ${W} ${H}`}
			preserveAspectRatio="none"
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
			onPointerCancel={onPointerUp}
			onPointerLeave={() => !drag.current && useStore.getState().setHover(null)}
			onDoubleClick={(e) => {
				const hit = hitTest(toComp(e));
				if (hit?.type === "text") document.querySelector<HTMLTextAreaElement>(".props-panel textarea")?.focus();
			}}
			onContextMenu={(e) => {
				e.preventDefault();
				const st = useStore.getState();
				// On an object: that object's menu. On empty canvas: the canvas menu (nothing selected), even
				// over a full-bleed background layer; those are right-clickable in the Layers panel.
				const hit = hitTest(toComp(e));
				if (!hit) st.select(null);
				else if (!st.selectedIds.includes(hit.id)) st.select(hit.id);
				st.openMenu(e.clientX, e.clientY);
			}}
		>
			{fillSelected && <rect className="sel-fill" x={0} y={0} width={W} height={H} />}
			{hover && <polygon className="hover-outline" points={poly(hover)} />}
			{/* Hovering a full-bleed layer (pattern, fill, effect) in the Layers panel: it covers the whole canvas. */}
			{hoverId && !hover && !selectedIds.includes(hoverId) && doc.layers.some((l) => l.id === hoverId) && <rect className="hover-fill" x={0} y={0} width={W} height={H} />}
			{selected.map((l) => frames.has(l.id) && <polygon key={l.id} className="sel-outline" points={poly(frames.get(l.id)!)} />)}
			{selected.length > 1 && selBox && <rect className="sel-group" x={selBox.l} y={selBox.t} width={selBox.r - selBox.l} height={selBox.b - selBox.t} />}

			{single && singleFrame && !single.locked && (!dragging || rotation !== null) && "rotation" in single.params && (
				<RotateHandle f={singleFrame} px={px} onDown={(e) => onRotateDown(e, single, singleFrame)} />
			)}
			{rotation !== null && singleFrame && <Pill x={toWorld(singleFrame, [singleFrame.left + singleFrame.w / 2, singleFrame.top])[0]} y={toWorld(singleFrame, [singleFrame.left + singleFrame.w / 2, singleFrame.top])[1] - px(52)} text={`${rotation}°`} px={px} />}
			{single && singleFrame && !single.locked && !dragging && (
				<g>
					{handlesFor(single).map((id) => {
						const h = HANDLES.find((x) => x.id === id)!;
						const [x, y] = toWorld(singleFrame, [singleFrame.left + h.u * singleFrame.w, singleFrame.top + h.v * singleFrame.h]);
						const s = px(8);
						return (
							<rect
								key={id}
								className={`handle h-${id}`}
								x={x - s / 2}
								y={y - s / 2}
								width={s}
								height={s}
								style={{ cursor: cursorFor(id, singleFrame.rot) }}
								onPointerDown={(e) => onHandleDown(e, single, id)}
							/>
						);
					})}
				</g>
			)}

			{selBox && !alt && <SizeLabel box={selBox} px={px} />}

			{guides.x.map((x) => (
				<line key={`gx${x}`} className="guide" x1={x} x2={x} y1={0} y2={H} />
			))}
			{guides.y.map((y) => (
				<line key={`gy${y}`} className="guide" x1={0} x2={W} y1={y} y2={y} />
			))}

			{marquee && <rect className="marquee" x={marquee.l} y={marquee.t} width={marquee.r - marquee.l} height={marquee.b - marquee.t} />}

			{alt && selBox && !dragging && <Measure from={selBox} to={hoverId && !selectedIds.includes(hoverId) && frames.has(hoverId) ? aabb(frames.get(hoverId)!) : null} W={W} H={H} px={px} />}
		</svg>
	);
}

/** Round knob above the top edge, joined by a short stem, that turns the object. */
function RotateHandle({ f, px, onDown }: { f: Frame; px: (n: number) => number; onDown: (e: ReactPointerEvent) => void }) {
	const top = toWorld(f, [f.left + f.w / 2, f.top]);
	const knob = toWorld(f, [f.left + f.w / 2, f.top - px(26)]);
	return (
		<g className="rotate-handle">
			<line x1={top[0]} y1={top[1]} x2={knob[0]} y2={knob[1]} />
			<circle cx={knob[0]} cy={knob[1]} r={px(6)} onPointerDown={onDown} />
		</g>
	);
}

const CURSORS = ["ew-resize", "nwse-resize", "ns-resize", "nesw-resize"];

function cursorFor(h: Handle, rot: number) {
	const base = { e: 0, w: 0, se: 1, nw: 1, n: 2, s: 2, ne: 3, sw: 3 }[h];
	const steps = Math.round(-rot / 45);
	return CURSORS[(((base + steps) % 4) + 4) % 4];
}

function SizeLabel({ box, px }: { box: Rect; px: (n: number) => number }) {
	const text = `${Math.round(box.r - box.l)} × ${Math.round(box.b - box.t)}`;
	return <Pill x={(box.l + box.r) / 2} y={box.b + px(16)} text={text} px={px} className="size-pill" />;
}

function Pill({ x, y, text, px, className = "" }: { x: number; y: number; text: string; px: (n: number) => number; className?: string }) {
	const w = px(text.length * 6.6 + 12);
	const h = px(18);
	return (
		<g className={`pill ${className}`}>
			<rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={px(4)} />
			<text x={x} y={y} fontSize={px(11)} dominantBaseline="central" textAnchor="middle">
				{text}
			</text>
		</g>
	);
}

/**
 * ⌥ measuring, as in Figma: from the selection to the hovered object, or to the artboard edges
 * when nothing else is hovered (or the hovered object contains the selection).
 */
function Measure({ from: a, to, W, H, px }: { from: Rect; to: Rect | null; W: number; H: number; px: (n: number) => number }) {
	const b = to ?? { l: 0, t: 0, r: W, b: H };
	const inside = b.l <= a.l && b.r >= a.r && b.t <= a.t && b.b >= a.b;
	const lines: { x1: number; y1: number; x2: number; y2: number; label: number }[] = [];
	const cy = (Math.max(a.t, b.t) + Math.min(a.b, b.b)) / 2;
	const cx = (Math.max(a.l, b.l) + Math.min(a.r, b.r)) / 2;
	const midY = cy > Math.max(a.t, b.t) && cy < Math.min(a.b, b.b) ? cy : (a.t + a.b) / 2;
	const midX = cx > Math.max(a.l, b.l) && cx < Math.min(a.r, b.r) ? cx : (a.l + a.r) / 2;
	if (inside) {
		const y = (a.t + a.b) / 2;
		const x = (a.l + a.r) / 2;
		if (a.l > b.l) lines.push({ x1: b.l, y1: y, x2: a.l, y2: y, label: a.l - b.l });
		if (b.r > a.r) lines.push({ x1: a.r, y1: y, x2: b.r, y2: y, label: b.r - a.r });
		if (a.t > b.t) lines.push({ x1: x, y1: b.t, x2: x, y2: a.t, label: a.t - b.t });
		if (b.b > a.b) lines.push({ x1: x, y1: a.b, x2: x, y2: b.b, label: b.b - a.b });
	} else {
		if (a.r <= b.l) lines.push({ x1: a.r, y1: midY, x2: b.l, y2: midY, label: b.l - a.r });
		else if (b.r <= a.l) lines.push({ x1: b.r, y1: midY, x2: a.l, y2: midY, label: a.l - b.r });
		if (a.b <= b.t) lines.push({ x1: midX, y1: a.b, x2: midX, y2: b.t, label: b.t - a.b });
		else if (b.b <= a.t) lines.push({ x1: midX, y1: b.b, x2: midX, y2: a.t, label: a.t - b.b });
		// Overlapping: distances between matching edges.
		if (!lines.length) {
			if (a.l !== b.l) lines.push({ x1: Math.min(a.l, b.l), y1: midY, x2: Math.max(a.l, b.l), y2: midY, label: Math.abs(a.l - b.l) });
			if (a.t !== b.t) lines.push({ x1: midX, y1: Math.min(a.t, b.t), x2: midX, y2: Math.max(a.t, b.t), label: Math.abs(a.t - b.t) });
		}
	}
	return (
		<g className="measure">
			{to && <rect className="measure-target" x={b.l} y={b.t} width={b.r - b.l} height={b.b - b.t} />}
			{lines.map((l, i) => (
				<g key={i}>
					<line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
					<Pill x={(l.x1 + l.x2) / 2} y={(l.y1 + l.y2) / 2} text={String(Math.round(l.label))} px={px} className="measure-pill" />
				</g>
			))}
		</g>
	);
}
