import { I } from "./ci";
import { ICON_NORMAL } from "../components/icon-button";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Renderer } from "../engine/renderer";
import { useStore } from "../state/store";
import { CanvasOverlay } from "./CanvasOverlay";
import { Button } from "@/lib/design-system/jigsaw/components/ui/controls/button/button";
import { ContextMenuPopover } from "@/lib/design-system/jigsaw/components/ui/overlays/context-menu/context-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/lib/design-system/jigsaw/components/ui/overlays/tooltip/tooltip";
import { cn } from "@/lib/design-system/jigsaw/lib/utils";
import type { Doc } from "../state/doc";
import { renderThumb } from "../export/thumb";
import { boardPositions } from "../state/board";
import { insets, usePanels } from "./layout";

const MAX_PREVIEW = 4096;


export function Viewport({ onFitScale, onErrors }: { onFitScale: (s: number) => void; onErrors: (e: Map<string, string>) => void }) {
	const scene = useStore((s) => s.doc.scene);
	const zoom = useStore((s) => s.zoom);
	const leftW = usePanels((s) => s.left);
	const rightW = usePanels((s) => s.right);
	const empty = useStore((s) => s.doc.layers.length === 0);
	const select = useStore((s) => s.select);
	const setZoom = useStore((s) => s.setZoom);

	const viewportRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const sizeRef = useRef<[number, number]>([1, 1]);
	const dirtyRef = useRef(true);
	const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
	const [glError, setGlError] = useState<string | null>(null);

	useLayoutEffect(() => {
		const el = viewportRef.current!;
		const ro = new ResizeObserver(() => setVp({ w: el.clientWidth, h: el.clientHeight }));
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	const canvases = useStore((s) => s.canvases);
	const active = useStore((s) => s.active);
	const ins = insets(vp.w, leftW, rightW);
	const fit = Math.max(0.02, Math.min((vp.w - ins.left - ins.right) / scene.width, (vp.h - ins.top - ins.bottom) / scene.height));
	const scale = zoom === "fit" ? fit : zoom;
	const dispW = Math.round(scene.width * scale);
	const dispH = Math.round(scene.height * scale);

	// The board: every canvas at its own position (composition px), like frames in Figma. Canvases
	// never placed sit to the right of the others. The active canvas is centred, then panned.
	const pos = boardPositions(canvases);
	const cx = ins.left + (vp.w - ins.left - ins.right) / 2;
	const cy = ins.top + (vp.h - ins.top - ins.bottom) / 2;
	const base: [number, number] = [cx - (pos[active].x * scale + dispW / 2), cy - (pos[active].y * scale + dispH / 2)];
	const canvasSelected = useStore((s) => s.canvasSelected);
	const hoverCanvas = useStore((s) => s.hoverCanvas);
	// Right-click on empty board: create a canvas there.
	const [boardMenu, setBoardMenu] = useState<{ x: number; y: number; at: { x: number; y: number } } | null>(null);
	// Smart guides while a canvas is dragged on the board (composition px).
	const [boardGuides, setBoardGuides] = useState<{ x: number[]; y: number[] } | null>(null);
	const rects = canvases.map((c, i) => ({ x: pos[i].x, y: pos[i].y, w: c.scene.width, h: c.scene.height }));

	useEffect(() => onFitScale(fit), [fit, onFitScale]);

	useEffect(() => {
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		let w = dispW * dpr;
		let h = dispH * dpr;
		const k = Math.min(1, MAX_PREVIEW / Math.max(w, h));
		w *= k;
		h *= k;
		sizeRef.current = [w, h];
		dirtyRef.current = true;
	}, [dispW, dispH]);

	// Render loop: advances the playhead while playing, otherwise redraws only when something changed.
	useEffect(() => {
		let renderer: Renderer;
		try {
			renderer = new Renderer(canvasRef.current!);
		} catch (e) {
			setGlError(e instanceof Error ? e.message : String(e));
			return;
		}
		renderer.onInvalidate = () => {
			dirtyRef.current = true;
		};
		const unsub = useStore.subscribe((s, p) => {
			if (s.doc !== p.doc || s.time !== p.time || s.preview !== p.preview) dirtyRef.current = true;
		});
		let raf = 0;
		let last = performance.now();
		let errorCount = 0;
		const loop = (now: number) => {
			const st = useStore.getState();
			const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
			last = now;
			if (st.playing && st.doc.scene.duration > 0) st.setTime((st.time + dt) % st.doc.scene.duration);
			if (dirtyRef.current) {
				dirtyRef.current = false;
				const s = useStore.getState();
				// A hover preview (e.g. a blend mode) renders without touching the document or history.
				const pv = s.preview;
				const doc = pv ? { ...s.doc, layers: s.doc.layers.map((l) => (l.id === pv.id ? { ...l, ...pv.patch } : l)) } : s.doc;
				renderer.render(doc, s.time, sizeRef.current[0], sizeRef.current[1]);
				if (renderer.errors.size !== errorCount) {
					errorCount = renderer.errors.size;
					onErrors(new Map(renderer.errors));
				}
			}
			raf = requestAnimationFrame(loop);
		};
		raf = requestAnimationFrame(loop);
		return () => {
			cancelAnimationFrame(raf);
			unsub();
			renderer.dispose();
		};
	}, [onErrors]);

	// Panning: middle-drag or two-finger scroll; Fit recentres.
	const [pan, setPan] = useState<[number, number]>([0, 0]);
	const panDrag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
	useEffect(() => {
		if (zoom === "fit") setPan([0, 0]);
	}, [zoom]);

	// Switching canvas from the board keeps the view still (the board pans so nothing jumps);
	// switching from the Canvases list centres the new canvas.
	const keepView = useRef(false);
	const at = pos[active];
	const last = useRef({ active, base, at, scale });
	useLayoutEffect(() => {
		const prev = last.current;
		if (active !== prev.active) {
			if (keepView.current) setPan(([x, y]) => [x + prev.base[0] - base[0], y + prev.base[1] - base[1]]);
			else setPan([0, 0]);
			keepView.current = false;
		} else if (scale === prev.scale && (base[0] !== prev.base[0] || base[1] !== prev.base[1])) {
			// The view is anchored on the active canvas. When that anchor shifts (the canvas moves on the
			// board, a panel is resized, the window changes), pan the other way so nothing on screen moves.
			setPan(([x, y]) => [x + prev.base[0] - base[0], y + prev.base[1] - base[1]]);
		}
		last.current = { active, base, at, scale };
	});
	// Resizing a panel in "fit" would refit the zoom and move every canvas: hold the current zoom instead
	// (zustand calls this synchronously, before the re-render with the new width).
	const scaleRef = useRef(scale);
	scaleRef.current = scale;
	useEffect(
		() =>
			usePanels.subscribe((s, p) => {
				if ((s.left !== p.left || s.right !== p.right) && useStore.getState().zoom === "fit") useStore.getState().setZoom(scaleRef.current);
			}),
		[],
	);
	/** About to change the active canvas from the board: keep the view exactly where it is. */
	const holdView = () => {
		keepView.current = true;
		if (useStore.getState().zoom === "fit") setZoom(scale);
	};
	const activateFromBoard = (i: number) => {
		if (i === useStore.getState().active) return;
		keepView.current = true;
		// Hold the zoom: "fit" would refit to the new canvas's size and the board would jump.
		if (useStore.getState().zoom === "fit") setZoom(scale);
		useStore.getState().setActiveCanvas(i);
	};

	// Pinch / ctrl+wheel zoom; plain wheel pans.
	useEffect(() => {
		const el = viewportRef.current!;
		const onWheel = (e: WheelEvent) => {
			if ((e.target as HTMLElement).closest(".panel, .popover, .sheet")) return;
			e.preventDefault();
			if (!e.ctrlKey && !e.metaKey) {
				setPan(([x, y]) => [x - e.deltaX, y - e.deltaY]);
				return;
			}
			const st = useStore.getState();
			const cur = st.zoom === "fit" ? fit : st.zoom;
			setZoom(Math.min(8, Math.max(0.05, cur * Math.exp(-e.deltaY * 0.01))));
		};
		el.addEventListener("wheel", onWheel, { passive: false });
		return () => el.removeEventListener("wheel", onWheel);
	}, [fit, setZoom]);


	return (
		<div
			ref={viewportRef}
			className="viewport"
			onPointerDownCapture={(e) => {
				if (e.button !== 1) return;
				// Middle button: pan from anywhere, even over the artboard.
				e.preventDefault();
				e.stopPropagation();
				e.currentTarget.setPointerCapture(e.pointerId);
				panDrag.current = { x: e.clientX, y: e.clientY, px: pan[0], py: pan[1] };
			}}
			onPointerMove={(e) => {
				const d = panDrag.current;
				if (d) setPan([d.px + e.clientX - d.x, d.py + e.clientY - d.y]);
			}}
			onPointerUp={() => {
				panDrag.current = null;
			}}
			onAuxClick={(e) => e.preventDefault()}
			onContextMenu={(e) => {
				const t = e.target as HTMLElement;
				if (t !== e.currentTarget && !t.classList.contains("board")) return;
				e.preventDefault();
				const r = viewportRef.current!.getBoundingClientRect();
				// Screen → board (composition px) at the click.
				const at = { x: Math.round((e.clientX - r.left - base[0] - pan[0]) / scale), y: Math.round((e.clientY - r.top - base[1] - pan[1]) / scale) };
				setBoardMenu({ x: e.clientX, y: e.clientY, at });
			}}
			onPointerDown={(e) => {
				if (e.button === 0 && (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains("board"))) {
					select(null);
					useStore.getState().setCanvasSelected(false);
				}
			}}
		>
			<div className="board absolute top-0 left-0" style={{ transform: `translate(${base[0] + pan[0]}px, ${base[1] + pan[1]}px)` }}>
				{canvases.map((c, i) => {
					const w = Math.round(c.scene.width * scale);
					const h = Math.round(c.scene.height * scale);
					const isActive = i === active;
					return (
						<div key={i} className="absolute" style={{ left: pos[i].x * scale, top: pos[i].y * scale, width: w, height: h }}>
							<BoardLabel
								index={i}
								doc={c}
								at={pos[i]}
								active={isActive}
								selected={isActive && canvasSelected}
								scale={scale}
								others={rects.filter((_, j) => j !== i)}
								onGuides={setBoardGuides}
								onHoldView={holdView}
								onActivate={() => activateFromBoard(i)}
							/>
							{!isActive && <BoardThumb doc={c} w={w} h={h} onActivate={() => activateFromBoard(i)} />}
							{hoverCanvas === i && !(isActive && canvasSelected) && <span className="pointer-events-none absolute inset-0 z-20 shadow-[0_0_0_1px_var(--color-bg-accent-normal)]" />}
						</div>
					);
				})}
				{boardGuides && <BoardGuides guides={boardGuides} rects={rects} scale={scale} />}
				{/* One persistent live canvas (the WebGL renderer is bound to this element), moved to the active canvas's spot. */}
				<div className="artboard absolute" style={{ left: pos[active].x * scale, top: pos[active].y * scale, width: dispW, height: dispH }}>
					<canvas ref={canvasRef} />
					<CanvasOverlay scale={dispW / scene.width} />
					{empty && !glError && <EmptyCanvas w={dispW} h={dispH} />}
					{canvasSelected && <span className="pointer-events-none absolute inset-0 shadow-[0_0_0_1px_var(--color-bg-accent-normal)]" />}
				</div>
			</div>
			{boardMenu && (
				<ContextMenuPopover
					key={`${boardMenu.x},${boardMenu.y}`}
					x={boardMenu.x}
					y={boardMenu.y}
					onClose={() => setBoardMenu(null)}
					className="min-w-[220px]"
					sections={[
						{
							items: [
								{
									label: "New canvas here",
									icon: <I.Plus />,
									onClick: () => {
										const st = useStore.getState();
										keepView.current = true;
										if (st.zoom === "fit") setZoom(scale);
										st.addCanvas({ version: 1, name: "", scene: { ...st.doc.scene }, layers: [], board: boardMenu.at });
										st.setCanvasSelected(true);
									},
								},
								{ label: "Add layer…", icon: <I.Layers />, shortcut: ["⌘", "K"], onClick: () => useStore.getState().setCommandOpen(true) },
							],
						},
						{ items: [{ label: "Zoom to fit", icon: <I.Fit />, shortcut: ["0"], onClick: () => setZoom("fit") }] },
					]}
				/>
			)}
			{glError && (
				<EmptyState title="WebGL2 unavailable">{glError}</EmptyState>
			)}
		</div>
	);
}

/** Shown inside an empty canvas, scaled down for small canvases; ⌘K is the quickest way in. */
function EmptyCanvas({ w, h }: { w: number; h: number }) {
	// Laid out for a 420px canvas, then scaled with it, so the prompt keeps its proportions at any zoom.
	const k = Math.min(w, h) / 480;
	if (k < 0.12) return null;
	return (
		<div className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden">
			<div className="pointer-events-auto flex w-[300px] shrink-0 flex-col items-center gap-sm rounded-lg border border-weak bg-surface-elevated-1 px-2xl py-2xl text-center" style={{ transform: `scale(${k})` }}>
				<span className="mb-xs grid size-[40px] place-items-center rounded-lg bg-depth-inset-1 stroke-normal text-(color:--color-fg-icon-normal)">
					<I.Layers width={18} height={18} />
				</span>
				<h3 className="label-small-strong text-strong">Empty canvas</h3>
				<p className="para-xsmall text-normal">Add a pattern or effect, drop an image, or shuffle.</p>
				<div className="mt-xs flex flex-wrap justify-center gap-sm">
					<Button variant="filled" sentiment="neutral" size="small" onClick={() => useStore.getState().setCommandOpen(true)}>
						Add layer <span className="ml-xs opacity-60">⌘K</span>
					</Button>
					<Button iconClassName={ICON_NORMAL} variant="outlined" sentiment="neutral" size="small" iconBefore icon={<I.Shuffle />} onClick={() => useStore.getState().shuffleAll()}>
						Shuffle
					</Button>
				</div>
			</div>
		</div>
	);
}

function EmptyState({ icon, title, children, actions }: { icon?: React.ReactNode; title: string; children: React.ReactNode; actions?: React.ReactNode }) {
	return (
		<div className="pointer-events-none absolute inset-0 grid place-items-center">
			<div className="pointer-events-auto flex max-w-[280px] flex-col items-center gap-sm text-center">
				{icon && <span className="mb-md grid size-[48px] place-items-center rounded-xl bg-depth-inset-1 text-normal">{icon}</span>}
				<h3 className="label-medium-strong text-strong">{title}</h3>
				<p className="para-small mb-md text-normal">{children}</p>
				{actions && <div className="flex gap-md">{actions}</div>}
			</div>
		</div>
	);
}

/** Still image of an inactive canvas on the board, re-rendered (debounced) when it changes or the zoom steps. */
const boardThumbs = new Map<string, string>();
const contentKeys = new WeakMap<object, string>();
let docSeq = 0;
/** Identity of what a canvas draws (layers + scene), ignoring its board position. */
export function contentKey(doc: Doc) {
	const k = (o: object) => {
		if (!contentKeys.has(o)) contentKeys.set(o, String(++docSeq));
		return contentKeys.get(o)!;
	};
	return `${k(doc.layers)}.${k(doc.scene)}`;
}


function BoardThumb({ doc, w, h, onActivate }: { doc: Doc; w: number; h: number; onActivate: () => void }) {
	const dpr = Math.min(window.devicePixelRatio || 1, 2);
	// Bucket the resolution so zooming doesn't re-render on every wheel tick.
	const side = Math.min(1600, Math.max(128, Math.ceil((Math.max(w, h) * dpr) / 192) * 192));
	const key = `${contentKey(doc)}@${side}`;
	const [src, setSrc] = useState(() => boardThumbs.get(key));
	useEffect(() => {
		const hit = boardThumbs.get(key);
		if (hit) return setSrc(hit);
		let alive = true;
		const t = window.setTimeout(async () => {
			const url = await renderThumb(doc, 1.5, side);
			boardThumbs.set(key, url);
			if (alive) setSrc(url);
		}, 250);
		return () => {
			alive = false;
			clearTimeout(t);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps -- key covers doc content
	}, [key, side]);
	return (
		<div
			data-dup
			className="artboard group/thumb cursor-default"
			style={{ width: w, height: h }}
			onPointerDown={(e) => {
				if (e.button !== 0) return;
				e.stopPropagation();
				onActivate();
			}}
		>
			{src && <img src={src} alt="" draggable={false} className="block size-full" />}
			<span className="pointer-events-none absolute inset-0 opacity-0 shadow-[inset_0_0_0_1px_var(--color-bg-accent-normal)] transition-opacity group-hover/thumb:opacity-100" />
		</div>
	);
}

/**
 * A canvas's name above its top-left corner. Click selects the canvas (its frame), double-click
 * renames, drag moves it anywhere on the board, ⌥-drag drops a duplicate where you let go.
 */
type BoardRect = { x: number; y: number; w: number; h: number };

/**
 * Snap a canvas at (x, y) to the other canvases: its left, centre and right to theirs, same for
 * top, middle and bottom. Returns the snapped spot and the guide lines it lined up on.
 */
function snapCanvas(x: number, y: number, w: number, h: number, others: BoardRect[], tol: number) {
	const best = (feats: number[], cands: number[]) => {
		let b: { d: number; at: number } | null = null;
		for (const f of feats) for (const c of cands) if (Math.abs(c - f) <= tol && (!b || Math.abs(c - f) < Math.abs(b.d))) b = { d: c - f, at: c };
		return b;
	};
	const sx = best([x, x + w / 2, x + w], others.flatMap((o) => [o.x, o.x + o.w / 2, o.x + o.w]));
	const sy = best([y, y + h / 2, y + h], others.flatMap((o) => [o.y, o.y + o.h / 2, o.y + o.h]));
	const nx = x + (sx?.d ?? 0);
	const ny = y + (sy?.d ?? 0);
	// Every feature that now coincides gets a line (e.g. left and right edges both aligned).
	const on = (v: number[], c: number[]) => [...new Set(v.filter((f) => c.some((q) => Math.abs(q - f) < 0.5)))];
	return {
		x: nx,
		y: ny,
		guides: {
			x: sx ? on([nx, nx + w / 2, nx + w], others.flatMap((o) => [o.x, o.x + o.w / 2, o.x + o.w])) : [],
			y: sy ? on([ny, ny + h / 2, ny + h], others.flatMap((o) => [o.y, o.y + o.h / 2, o.y + o.h])) : [],
		},
	};
}

/** Orange guide lines across the canvases they line up, like Figma's smart guides. */
function BoardGuides({ guides, rects, scale }: { guides: { x: number[]; y: number[] }; rects: BoardRect[]; scale: number }) {
	const pad = 24 / scale;
	const span = (axis: "x" | "y", v: number) => {
		// Only across the canvases touching this line.
		const hit = rects.filter((r) => (axis === "x" ? [r.x, r.x + r.w / 2, r.x + r.w] : [r.y, r.y + r.h / 2, r.y + r.h]).some((f) => Math.abs(f - v) < 0.5));
		const list = hit.length ? hit : rects;
		return axis === "x" ? [Math.min(...list.map((r) => r.y)) - pad, Math.max(...list.map((r) => r.y + r.h)) + pad] : [Math.min(...list.map((r) => r.x)) - pad, Math.max(...list.map((r) => r.x + r.w)) + pad];
	};
	return (
		<>
			{guides.x.map((v) => {
				const [a, b] = span("x", v);
				return <span key={`x${v}`} className="pointer-events-none absolute z-40 w-px bg-[#ff5a36]" style={{ left: v * scale - 0.5, top: a * scale, height: (b - a) * scale }} />;
			})}
			{guides.y.map((v) => {
				const [a, b] = span("y", v);
				return <span key={`y${v}`} className="pointer-events-none absolute z-40 h-px bg-[#ff5a36]" style={{ top: v * scale - 0.5, left: a * scale, width: (b - a) * scale }} />;
			})}
		</>
	);
}

function BoardLabel({
	index,
	doc,
	at,
	active,
	selected,
	scale,
	others,
	onGuides,
	onHoldView,
	onActivate,
}: {
	index: number;
	doc: Doc;
	at: { x: number; y: number };
	active: boolean;
	selected: boolean;
	scale: number;
	others: BoardRect[];
	onGuides: (g: { x: number[]; y: number[] } | null) => void;
	onHoldView: () => void;
	onActivate: () => void;
}) {
	const [renaming, setRenaming] = useState(false);
	const [ghost, setGhost] = useState<{ dx: number; dy: number } | null>(null);
	const w = doc.scene.width * scale;
	const h = doc.scene.height * scale;

	return (
		<>
			{renaming ? (
				<input
					autoFocus
					className="label-xsmall absolute bottom-[calc(100%+6px)] left-0 h-[22px] w-full min-w-0 rounded-xs border border-accent-normal bg-surface-elevated-1 px-xs text-strong outline-none"
					defaultValue={doc.name}
					onFocus={(e) => e.target.select()}
					onBlur={(e) => {
						useStore.getState().renameCanvas(index, e.target.value);
						setRenaming(false);
					}}
					onKeyDown={(e) => {
						if (e.key === "Enter") (e.target as HTMLInputElement).blur();
						if (e.key === "Escape") setRenaming(false);
					}}
				/>
			) : (
				<Tooltip>
					<TooltipTrigger asChild>
						<span
							data-dup
							className={cn(
								"label-xsmall absolute bottom-[calc(100%+6px)] left-0 max-w-full cursor-default truncate select-none",
								selected ? "text-accent-normal" : active ? "text-strong" : "text-weak hover:text-normal",
							)}
							onDoubleClick={() => setRenaming(true)}
							onPointerDown={(e) => {
								if (e.button !== 0) return;
								e.stopPropagation();
								onActivate();
								useStore.getState().setCanvasSelected(true);
								const x0 = e.clientX;
								const y0 = e.clientY;
								const start = { ...at };
								let moved = false;
								let copy = e.altKey;
								let d = { dx: 0, dy: 0 };
								const W = doc.scene.width;
								const H = doc.scene.height;
								const move = (ev: PointerEvent) => {
									d = { dx: ev.clientX - x0, dy: ev.clientY - y0 };
									if (!moved && Math.hypot(d.dx, d.dy) < 4) return;
									moved = true;
									copy = ev.altKey;
									// Snap to the other canvases (⌘ skips), then express it back as a screen offset.
									const raw = { x: start.x + d.dx / scale, y: start.y + d.dy / scale };
									if (useStore.getState().snapping && !ev.metaKey && !ev.ctrlKey) {
										const snap = snapCanvas(raw.x, raw.y, W, H, others, 6 / scale);
										d = { dx: (snap.x - start.x) * scale, dy: (snap.y - start.y) * scale };
										onGuides(snap.guides.x.length || snap.guides.y.length ? snap.guides : null);
									} else onGuides(null);
									const st = useStore.getState();
									const i = st.canvases.indexOf(doc) >= 0 ? st.canvases.indexOf(doc) : index;
									if (copy) {
										// The original stays put; a ghost shows where the copy will land.
										st.moveCanvasOnBoard(i, start);
										setGhost(d);
									} else {
										setGhost(null);
										st.moveCanvasOnBoard(index, { x: Math.round(start.x + d.dx / scale), y: Math.round(start.y + d.dy / scale) });
									}
								};
								const up = () => {
									window.removeEventListener("pointermove", move);
									window.removeEventListener("pointerup", up);
									setGhost(null);
									onGuides(null);
									if (moved && copy) {
										const st = useStore.getState();
										// The copy becomes active; hold the view so it stays where it was dropped.
										onHoldView();
										st.duplicateCanvas(index, st.canvases.length, { x: Math.round(start.x + d.dx / scale), y: Math.round(start.y + d.dy / scale) });
										st.setCanvasSelected(true);
									}
								};
								window.addEventListener("pointermove", move);
								window.addEventListener("pointerup", up);
							}}
						>
							{doc.name || "Untitled"}
						</span>
					</TooltipTrigger>
					<TooltipContent>Click to select, double-click to rename, drag to move, ⌥-drag to duplicate</TooltipContent>
				</Tooltip>
			)}
			{ghost && (
				// The copy itself, carried across the board; the original stays put underneath.
				<div className="pointer-events-none absolute top-0 left-0 z-30" style={{ width: w, height: h, transform: `translate(${ghost.dx}px, ${ghost.dy}px)` }}>
					<span className="label-xsmall absolute bottom-[calc(100%+6px)] left-0 max-w-full truncate text-accent-normal">{doc.name} copy</span>
					<BoardThumb doc={doc} w={Math.round(w)} h={Math.round(h)} onActivate={() => {}} />
					<span className="absolute inset-0 shadow-[0_0_0_1px_var(--color-bg-accent-normal),0_16px_40px_-12px_rgba(0,0,0,0.5)]" />
				</div>
			)}
		</>
	);
}
