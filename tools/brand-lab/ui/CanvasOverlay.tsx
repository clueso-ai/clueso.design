import { type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { aabb, corners, cropParams, hits, type Frame, HANDLES, type Handle, handlesFor, imageGeom, intersects, layerFrame, radiusLimit, type Rect, resizeParams, toLocal, toWorld, union } from "../layers/bounds";
import { getDef } from "../layers/registry";
import { FONTS } from "../layers/sources/text";
import { allParams, type Layer, type Params } from "../layers/types";
import { useStore } from "../state/store";

type Pt = [number, number];

type Drag =
	| { kind: "move"; origin: Pt; ids: string[]; starts: Record<string, Params>; box: Rect | null; others: Rect[]; moved: boolean }
	| { kind: "resize"; id: string; handle: Handle; frame: Frame; start: Params }
	| { kind: "crop"; id: string; handle: Handle; frame: Frame; start: Params }
	| { kind: "radius"; id: string; corner: Pt; frame: Frame; max: number }
	| { kind: "marquee"; origin: Pt; moved: boolean; additive: boolean; base: string[] }
	| { kind: "rotate"; id: string; centre: Pt; pivot: Pt; startAngle: number; startRot: number; keys: [string, string] };

const SNAP_PX = 6;
/**
 * The overlay reaches this far past the artboard (screen px), so objects that hang off the canvas
 * keep their outline, handles and hover there. Only object frames, handles and the artboard itself
 * take the pointer; the rest passes through to the board and the canvases around it.
 */
const REACH = 2400;

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
	const editingTextId = useStore((s) => s.editingTextId);
	const { width: W, height: H } = doc.scene;
	const svg = useRef<SVGSVGElement>(null);
	const drag = useRef<Drag | null>(null);
	const [marquee, setMarquee] = useState<Rect | null>(null);
	const [guides, setGuides] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] });
	const [alt, setAlt] = useState(false);
	const [dragging, setDragging] = useState(false);
	const [rotation, setRotation] = useState<number | null>(null);
	const [cropping, setCropping] = useState(false);
	const [radiusPill, setRadiusPill] = useState<{ value: number; at: Pt } | null>(null);

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
		// Measured on the artboard: the SVG itself reaches past it.
		const r = svg.current!.parentElement!.getBoundingClientRect();
		return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H];
	};
	const onCanvas = ([x, y]: Pt) => x >= 0 && y >= 0 && x <= W && y <= H;

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
		if (d.kind === "crop") {
			const patch = cropParams(d.start, d.frame, d.handle, toLocal(d.frame, pt), st.doc);
			if (patch) st.patchLayers({ [d.id]: patch }, `crop:${d.id}`);
			return;
		}
		if (d.kind === "radius") {
			// Figma's corner dots: the radius is how far the dot has come in along the corner's diagonal.
			const f = d.frame;
			const [cu, cv] = d.corner;
			const [lx, ly] = toLocal(f, pt);
			const inward = ((lx - (f.left + cu * f.w)) * (cu ? -1 : 1) + (ly - (f.top + cv * f.h)) * (cv ? -1 : 1)) / 2;
			const radius = Math.round(Math.min(d.max, Math.max(0, inward)));
			st.patchLayers({ [d.id]: { radius } }, `radius:${d.id}`);
			setRadiusPill({ value: radius, at: pt });
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
		setCropping(false);
		setRadiusPill(null);
		setDragging(false);
		setMarquee(null);
		setGuides({ x: [], y: [] });
		if (d?.kind === "marquee" && !d.moved && !d.additive) {
			// A plain click on empty space selects the pattern underneath, like clicking a frame's fill.
			// Off the canvas there's nothing underneath.
			const fill = onCanvas(d.origin) ? topFill() : null;
			useStore.getState().select(fill?.id ?? null);
		}
	};

	const onHandleDown = (e: ReactPointerEvent, layer: Layer, handle: Handle) => {
		e.stopPropagation();
		if (e.button !== 0) return;
		svg.current!.setPointerCapture(e.pointerId);
		const frame = frames.get(layer.id)!;
		// ⌘-drag on an image crops it instead of scaling.
		const crop = (e.metaKey || e.ctrlKey) && layer.type === "image";
		drag.current = { kind: crop ? "crop" : "resize", id: layer.id, handle, frame, start: { ...layer.params } };
		setCropping(crop);
		setDragging(true);
	};

	const onRadiusDown = (e: ReactPointerEvent, layer: Layer, corner: Pt, max: number) => {
		e.stopPropagation();
		if (e.button !== 0) return;
		svg.current!.setPointerCapture(e.pointerId);
		drag.current = { kind: "radius", id: layer.id, corner, frame: frames.get(layer.id)!, max };
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

	const m = px(REACH);
	const poly = (f: Frame) =>
		corners(f)
			.map((p) => p.join(","))
			.join(" ");

	const editing = editingTextId ? doc.layers.find((l) => l.id === editingTextId && l.type === "text") : undefined;
	const editingFrame = editing ? frames.get(editing.id) : undefined;
	// Undo, a canvas switch or a delete took the layer away mid-edit.
	useEffect(() => {
		if (editingTextId && !editing) useStore.getState().setEditingText(null);
	}, [editingTextId, editing]);

	return (
		<>
		<svg
			ref={svg}
			data-dup
			className={`canvas-overlay${dragging ? " dragging" : ""}`}
			style={{ inset: -REACH, width: `calc(100% + ${REACH * 2}px)`, height: `calc(100% + ${REACH * 2}px)` }}
			viewBox={`${-m} ${-m} ${W + m * 2} ${H + m * 2}`}
			preserveAspectRatio="none"
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
			onPointerCancel={onPointerUp}
			onPointerLeave={() => !drag.current && useStore.getState().setHover(null)}
			onDoubleClick={(e) => {
				const hit = hitTest(toComp(e));
				if (hit?.type !== "text") return;
				const st = useStore.getState();
				st.select(hit.id);
				st.setEditingText(hit.id);
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
			{/* Pointer targets: the artboard, then every object's frame, which may reach past it. */}
			<rect className="hit" x={0} y={0} width={W} height={H} />
			{doc.layers.map((l) => !l.locked && frames.has(l.id) && <polygon key={l.id} className="hit" points={poly(frames.get(l.id)!)} />)}
			{fillSelected && <rect className="sel-fill" x={0} y={0} width={W} height={H} />}
			{hover && <polygon className="hover-outline" points={poly(hover)} />}
			{/* Hovering a full-bleed layer (pattern, fill, effect) in the Layers panel: it covers the whole canvas. */}
			{hoverId && !hover && !selectedIds.includes(hoverId) && doc.layers.some((l) => l.id === hoverId) && <rect className="hover-fill" x={0} y={0} width={W} height={H} />}
			{selected.map((l) => frames.has(l.id) && <polygon key={l.id} className="sel-outline" points={poly(frames.get(l.id)!)} />)}
			{selected.length > 1 && selBox && <rect className="sel-group" x={selBox.l} y={selBox.t} width={selBox.r - selBox.l} height={selBox.b - selBox.t} />}

			{/* Just outside each corner: hover there to turn the object, as in Figma. */}
			{single && singleFrame && !single.locked && !dragging && rotatable(single) && <RotateZones f={singleFrame} px={px} onDown={(e) => onRotateDown(e, single, singleFrame)} />}
			{/* While turning, the rotate cursor holds wherever the pointer goes. */}
			{rotation !== null && singleFrame && <rect className="hit" x={-m} y={-m} width={W + m * 2} height={H + m * 2} style={{ cursor: rotateCursor(0) }} />}
			{cropping && single && singleFrame && <CropOutline layer={single} f={singleFrame} W={W} H={H} />}
			{rotation !== null && singleFrame && <Pill x={toWorld(singleFrame, [singleFrame.left + singleFrame.w / 2, singleFrame.top])[0]} y={toWorld(singleFrame, [singleFrame.left + singleFrame.w / 2, singleFrame.top])[1] - px(52)} text={`${rotation}°`} px={px} />}
			{single && singleFrame && !single.locked && !dragging && !editing && (
				<g>
					{/* The whole edge resizes, not just its middle handle. */}
					{edgesFor(single).map((id) => {
						const [a, b] = EDGES[id];
						const p1 = toWorld(singleFrame, [singleFrame.left + a[0] * singleFrame.w, singleFrame.top + a[1] * singleFrame.h]);
						const p2 = toWorld(singleFrame, [singleFrame.left + b[0] * singleFrame.w, singleFrame.top + b[1] * singleFrame.h]);
						return (
							<line
								key={id}
								className="edge"
								x1={p1[0]}
								y1={p1[1]}
								x2={p2[0]}
								y2={p2[1]}
								style={{ cursor: cursorFor(id, singleFrame.rot) }}
								onPointerDown={(e) => onHandleDown(e, single, id)}
							/>
						);
					})}
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

			{single && singleFrame && !single.locked && !dragging && !editing && <RadiusDots layer={single} f={singleFrame} px={px} scale={scale} onDown={(e, corner, max) => onRadiusDown(e, single, corner, max)} />}
			{radiusPill && <Pill x={radiusPill.at[0]} y={radiusPill.at[1] + px(24)} text={`Radius ${radiusPill.value}`} px={px} />}

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
		{editing && editingFrame && <TextEditor key={editing.id} layer={editing} frame={editingFrame} W={W} H={H} scale={scale} />}
		</>
	);
}

/**
 * Typing straight onto the canvas. A textarea sits exactly over the text box with the layer's own
 * type settings, its glyphs transparent: every keystroke updates the layer, so what shows is the
 * real render (wrap, outline, highlight) and the textarea only adds the caret and selection.
 * Esc, ⌘Enter or clicking away finishes; a box left empty is removed, as in Figma.
 */
function TextEditor({ layer, frame: f, W, H, scale }: { layer: Layer; frame: Frame; W: number; H: number; scale: number }) {
	const ref = useRef<HTMLTextAreaElement>(null);
	const p = layer.params;
	const size = Number(p.size);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		el.focus();
		el.select();
	}, []);

	const finish = () => {
		const st = useStore.getState();
		if (st.editingTextId !== layer.id) return;
		st.setEditingText(null);
		const current = st.doc.layers.find((l) => l.id === layer.id);
		if (current && !String(current.params.text ?? "").trim()) st.removeLayer(layer.id);
	};

	// An unwrapped box is only as wide as its longest line, so give the caret room to type into,
	// on the side the text grows towards.
	const wraps = Number(p.width) > 0;
	const align = Number(p.align) || 0;
	const slack = wraps ? 0 : size;
	const left = f.left - slack * [0, 0.5, 1][align];
	return (
		<div className="pointer-events-none absolute top-0 left-0 origin-top-left" style={{ width: W, height: H, transform: `scale(${scale})` }}>
			<textarea
				ref={ref}
				className="text-editor"
				aria-label="Text"
				spellCheck={false}
				value={String(p.text ?? "")}
				onChange={(e) => useStore.getState().setParam(layer.id, "text", e.target.value)}
				onBlur={finish}
				onPointerDown={(e) => e.stopPropagation()}
				onKeyDown={(e) => {
					if (e.key === "Escape" || (e.key === "Enter" && (e.metaKey || e.ctrlKey))) {
						e.preventDefault();
						ref.current?.blur();
					}
				}}
				style={{
					left: f.px + left,
					top: f.py + f.top,
					width: f.w + slack,
					height: f.h,
					transformOrigin: `${-left}px ${-f.top}px`,
					transform: `rotate(${-f.rot}deg)`,
					fontFamily: `"${FONTS[Number(p.font)] ?? "Geist"}"`,
					fontWeight: Math.round(Number(p.weight)),
					fontSize: size,
					lineHeight: `${size * Number(p.leading)}px`,
					letterSpacing: `${Number(p.tracking) * size}px`,
					textAlign: (["left", "center", "right"] as const)[align] ?? "left",
					textTransform: p.upper ? "uppercase" : "none",
					whiteSpace: wraps ? "pre-wrap" : "pre",
				}}
			/>
		</div>
	);
}

/** Each edge's ends, in the frame's unit square. */
const EDGES = {
	n: [[0, 0], [1, 0]],
	e: [[1, 0], [1, 1]],
	s: [[0, 1], [1, 1]],
	w: [[0, 0], [0, 1]],
} as const satisfies Record<string, readonly [readonly [number, number], readonly [number, number]]>;

/** Text edges set the wrap width, so only its sides drag; everything else takes all four. */
function edgesFor(layer: Layer): (keyof typeof EDGES)[] {
	return layer.type === "text" ? ["e", "w"] : ["n", "e", "s", "w"];
}

/** Layers with a Rotation setting. */
function rotatable(layer: Layer) {
	const def = getDef(layer.type);
	return !!def && allParams(def).some((p) => p.key === "rotation");
}

const UNIT_CORNERS: Pt[] = [
	[0, 0],
	[1, 0],
	[1, 1],
	[0, 1],
];

/** Invisible pads just past each corner that turn the object, each showing a rotate cursor that faces out. */
function RotateZones({ f, px, onDown }: { f: Frame; px: (n: number) => number; onDown: (e: ReactPointerEvent) => void }) {
	const reach = px(10);
	return (
		<g>
			{UNIT_CORNERS.map(([u, v]) => {
				const corner = toWorld(f, [f.left + u * f.w, f.top + v * f.h]);
				const out = toWorld(f, [f.left + u * f.w + (u ? reach : -reach), f.top + v * f.h + (v ? reach : -reach)]);
				const angle = (Math.atan2(out[1] - corner[1], out[0] - corner[0]) * 180) / Math.PI;
				return <circle key={`${u}${v}`} className="rotate-zone" cx={out[0]} cy={out[1]} r={px(11)} style={{ cursor: rotateCursor(angle) }} onPointerDown={onDown} />;
			})}
		</g>
	);
}

const rotateCursors = new Map<number, string>();

/** Figma's curved double arrow, its bulge facing `angle` degrees (screen, y down). */
function rotateCursor(angle: number) {
	const a = Math.round(angle / 5) * 5;
	let cursor = rotateCursors.get(a);
	if (!cursor) {
		const d = "M9 5A8 8 0 0 1 9 19M10.8 8.6L9 5L13 4.6M10.8 15.4L9 19L13 19.4";
		const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g transform="rotate(${a} 12 12)" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="${d}" stroke="white" stroke-width="3.5"/><path d="${d}" stroke="black" stroke-width="1.5"/></g></svg>`;
		cursor = `url("data:image/svg+xml,${encodeURIComponent(svg)}") 12 12, crosshair`;
		rotateCursors.set(a, cursor);
	}
	return cursor;
}

/**
 * Figma's corner radius dots, inside each corner of a rectangle or image. They sit at the radius
 * (or a little in, while it's small) and hide when the object is too small on screen to fit them.
 */
function RadiusDots({ layer, f, px, scale, onDown }: { layer: Layer; f: Frame; px: (n: number) => number; scale: number; onDown: (e: ReactPointerEvent, corner: Pt, max: number) => void }) {
	const max = radiusLimit(layer, f);
	if (max === null || Math.min(f.w, f.h) * scale < 64) return null;
	const inset = Math.min(max, Math.max(Number(layer.params.radius ?? 0), px(12)));
	return (
		<g>
			{UNIT_CORNERS.map(([u, v]) => {
				const [x, y] = toWorld(f, [f.left + u * f.w + (u ? -inset : inset), f.top + v * f.h + (v ? -inset : inset)]);
				return <circle key={`${u}${v}`} className="radius-dot" cx={x} cy={y} r={px(4)} onPointerDown={(e) => onDown(e, [u, v], max)} />;
			})}
		</g>
	);
}

/** While cropping, the whole picture's outline, so you can see how much is left to uncover. */
function CropOutline({ layer, f, W, H }: { layer: Layer; f: Frame; W: number; H: number }) {
	const g = imageGeom(layer.params, W, H);
	if (!g) return null;
	const full: Frame = { ...f, left: f.left - g.crop[0] * g.full[0], top: f.top - g.crop[1] * g.full[1], w: g.full[0], h: g.full[1] };
	return (
		<polygon
			className="crop-outline"
			points={corners(full)
				.map((p) => p.join(","))
				.join(" ")}
		/>
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
