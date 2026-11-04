import { I } from "./ci";
import { type ReactNode, useEffect, useLayoutEffect, useState } from "react";
import { IconButton } from "@/tools/shell/components/icon-button";
import { PanelHeader } from "@/tools/shell/components/panel";
import { LeftPanel } from "@/tools/shell/panels";
import { MenuLabel, Popover, PopoverContent, PopoverTrigger } from "../components/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/lib/design-system/jigsaw/components/ui/overlays/tooltip/tooltip";
import { Separator } from "@/lib/design-system/jigsaw/components/ui/primitives/separator/separator";
import { cn } from "@/lib/design-system/jigsaw/lib/utils";
import { createLayer, EFFECTS, getDef, isFramed, SOURCES } from "../layers/registry";
import { CATEGORIES, KIND_LABELS, kindOf, type Layer, type LayerDef, type LayerKind, type Params } from "../layers/types";
import { renderThumb } from "../export/thumb";
import type { Doc } from "../state/doc";
import { useStore } from "../state/store";
import { releaseFieldFocus } from "./CanvasOverlay";
import { CanvasesSection } from "./CanvasesSection";
import { LayerIcon } from "./icons";

const ROW = 44;
const PAD = 6;

/** Rows live-reorder while dragging (Framer-style); the stack only changes on drop. */
interface Drag {
	from: number;
	to: number;
	dy: number;
}

export function LayersPanel() {
	const layers = useStore((s) => s.doc.layers);
	const selectedIds = useStore((s) => s.selectedIds);
	const hoverId = useStore((s) => s.hoverId);
	const select = useStore((s) => s.select);
	const moveLayer = useStore((s) => s.moveLayer);
	const { width: W, height: H } = useStore((s) => s.doc.scene);
	const [drag, setDrag] = useState<Drag | null>(null);
	// After a drop the dropped row eases from where the pointer left it into its slot.
	const [settle, setSettle] = useState<{ id: string; offset: number } | null>(null);

	useLayoutEffect(() => {
		if (!settle) return;
		const raf = requestAnimationFrame(() => requestAnimationFrame(() => setSettle(null)));
		return () => cancelAnimationFrame(raf);
	}, [settle]);

	const startDrag = (e: React.PointerEvent, from: number) => {
		const startY = e.clientY;
		const n = layers.length;
		let active = false;
		let last: Drag = { from, to: from, dy: 0 };
		const move = (ev: PointerEvent) => {
			const dy = ev.clientY - startY;
			if (!active && Math.abs(dy) < 4) return;
			active = true;
			document.body.style.cursor = "grabbing";
			// Clamp so the row can't be dragged past either end of the list.
			const clamped = Math.max(-from * ROW, Math.min((n - 1 - from) * ROW, dy));
			last = { from, to: Math.max(0, Math.min(n - 1, Math.round(from + clamped / ROW))), dy: clamped };
			setDrag(last);
		};
		const up = () => {
			window.removeEventListener("pointermove", move);
			window.removeEventListener("pointerup", up);
			window.removeEventListener("pointercancel", up);
			document.body.style.cursor = "";
			if (!active) return;
			const { from: f, to, dy } = last;
			setSettle({ id: layers[f].id, offset: dy - (to - f) * ROW });
			setDrag(null);
			moveLayer(f, to);
		};
		window.addEventListener("pointermove", move);
		window.addEventListener("pointerup", up);
		window.addEventListener("pointercancel", up);
	};

	/** Where row i sits while dragging: the dragged row follows the pointer, rows it passes make room. */
	const offsetOf = (i: number) => {
		if (!drag) return 0;
		const { from, to, dy } = drag;
		if (i === from) return dy;
		if (from < to && i > from && i <= to) return -ROW;
		if (from > to && i >= to && i < from) return ROW;
		return 0;
	};

	return (
		<LeftPanel aria-label="Layers">
			<CanvasesSection />
			<PanelHeader title="Layers">
				<AddLayerMenu>
					<IconButton label="Add layer" icon={<I.Plus />} />
				</AddLayerMenu>
			</PanelHeader>
			{layers.length === 0 ? (
				<p className="para-xsmall px-xl py-2xl text-weak">No layers yet. Add a pattern source, then stack effects on top.</p>
			) : (
				<ul className="relative flex min-h-0 flex-1 flex-col overflow-y-auto p-sm">
					{layers.map((layer, i) => {
						const lifted = drag?.from === i;
						const settling = settle?.id === layer.id;
						return (
							<LayerRow
								key={layer.id}
								layer={layer}
								index={i}
								detail={layerDetail(layers, i, W, H)}
								covered={coverCount(layers, i)}
								dragging={!!drag}
								selected={selectedIds.includes(layer.id)}
								hovered={!drag && hoverId === layer.id}
								lifted={lifted}
								style={{
									transform: `translateY(${settling ? settle.offset : offsetOf(i)}px)`,
									// The lifted row tracks the pointer exactly; the rest glide. No transition on the
									// frame after a drop, so re-ordered rows don't animate back from their old offsets.
									transition: lifted || settle ? "none" : "transform 180ms cubic-bezier(0.2, 0, 0, 1)",
								}}
								onSelect={(e) => select(layer.id, e.shiftKey ? "range" : e.metaKey || e.ctrlKey ? "toggle" : "replace")}
								onDragStart={(e) => startDrag(e, i)}
							/>
						);
					})}
					{drag && drag.to !== drag.from && (
						<div
							className="pointer-events-none absolute right-md left-md z-20 h-[2px] rounded-full bg-accent-normal"
							style={{ top: PAD + (drag.to > drag.from ? drag.to + 1 : drag.to) * ROW - 1 }}
						/>
					)}
				</ul>
			)}
			{layers.length > 0 && (
				<p className="para-xxsmall mx-xl border-t border-dashed border-weak pt-md pb-xl text-weak">Drag to reorder. Higher layers draw on top, and a Look changes everything below it.</p>
			)}
		</LeftPanel>
	);
}

function LayerRow({
	layer,
	index,
	detail,
	covered,
	dragging,
	selected,
	hovered,
	lifted,
	style,
	onSelect,
	onDragStart,
}: {
	layer: Layer;
	index: number;
	/** The second line: the layer's kind and what it does here ("Look · Applies to 4 layers below"). */
	detail: string;
	/** How many layers this background hides, when that hasn't been marked as on purpose. */
	covered: number;
	dragging: boolean;
	selected: boolean;
	hovered: boolean;
	lifted: boolean;
	style: React.CSSProperties;
	onSelect: (e: React.PointerEvent) => void;
	onDragStart: (e: React.PointerEvent) => void;
}) {
	const def = getDef(layer.type)!;
	const updateLayer = useStore((s) => s.updateLayer);
	const toggleLocked = useStore((s) => s.toggleLocked);
	const removeLayer = useStore((s) => s.removeLayer);
	const setHover = useStore((s) => s.setHover);
	const [renaming, setRenaming] = useState(false);

	return (
		<>
			<li
				className={cn(
					"group/row relative flex h-[44px] shrink-0 cursor-default items-center gap-xs rounded-sm pr-xs pl-2xs transition-colors",
					"[&:has(+li:hover)>[data-slot=separator]]:opacity-0 [&:has(+li[aria-selected=true])>[data-slot=separator]]:opacity-0",
					covered > 0 && selected && !dragging && "rounded-b-none",
					selected ? "bg-interaction-selected-subtle" : hovered ? "bg-interaction-hover-subtle" : "hover:bg-interaction-hover-subtle",
					!layer.visible && "[&_.layer-label]:text-weak [&_.layer-glyph]:opacity-50",
					lifted && "z-10 cursor-grabbing bg-surface-elevated-2 shadow-[inset_0_0_0_1px_var(--color-fg-stroke-accent-normal)]",
				)}
				style={style}
				onPointerDown={(e) => {
					if (e.button !== 0) return;
					if ((e.target as HTMLElement).closest("input")) return;
					releaseFieldFocus();
					onSelect(e);
					onDragStart(e);
				}}
				onPointerEnter={() => setHover(layer.id)}
				onPointerLeave={() => setHover(null)}
				onContextMenu={(e) => {
					e.preventDefault();
					const st = useStore.getState();
					if (!st.selectedIds.includes(layer.id)) st.select(layer.id);
					st.openMenu(e.clientX, e.clientY);
				}}
				aria-selected={selected}
			>
				<Separator className="pointer-events-none absolute inset-x-sm -bottom-px w-auto transition-opacity group-last/row:hidden group-hover/row:opacity-0 group-aria-selected/row:opacity-0" />
				<Tooltip>
					<TooltipTrigger asChild>
						<span
							className="flex h-full w-[16px] shrink-0 cursor-grab items-center justify-center text-weak opacity-0 transition-opacity group-hover/row:opacity-100 active:cursor-grabbing"
							aria-label="Drag to reorder"
						>
							<I.Grip width={13} height={13} />
						</span>
					</TooltipTrigger>
					<TooltipContent>Drag to reorder</TooltipContent>
				</Tooltip>
				<LayerTile className="layer-glyph">
					<LayerIcon name={def.icon} size={14} />
				</LayerTile>
				<div className="flex min-w-0 flex-1 flex-col gap-xs">
					<Tooltip>
						<TooltipTrigger asChild>
							<span className="layer-label label-xsmall min-w-0 truncate text-strong" onDoubleClick={() => setRenaming(true)}>
								{renaming ? (
									<input
										autoFocus
										className="label-xsmall h-[24px] w-full rounded-xs border border-brand-normal bg-depth-inset-1 px-xs text-strong outline-none"
										defaultValue={layer.name}
										onBlur={(e) => {
											const name = e.target.value.trim();
											if (name && name !== layer.name) updateLayer(layer.id, { name });
											setRenaming(false);
										}}
										onKeyDown={(e) => {
											if (e.key === "Enter") (e.target as HTMLInputElement).blur();
											if (e.key === "Escape") setRenaming(false);
										}}
									/>
								) : (
									layer.name
								)}
							</span>
						</TooltipTrigger>
						<TooltipContent>Double-click to rename</TooltipContent>
					</Tooltip>
					<span className="para-xxsmall truncate text-weak">{detail}</span>
				</div>
				{layer.palette && (
					<Tooltip>
						<TooltipTrigger asChild>
							<span role="img" className="size-[8px] shrink-0 rounded-full shadow-[inset_0_0_0_1px_var(--color-fg-stroke-weak)]" aria-label="Uses its own palette" style={{ background: layer.palette[2]?.hex ?? layer.palette[0]?.hex }} />
						</TooltipTrigger>
						<TooltipContent>Uses its own palette</TooltipContent>
					</Tooltip>
				)}
				<span className="flex items-center" onPointerDown={(e) => e.stopPropagation()}>
					<IconButton size="xsmall" className="hidden group-hover/row:inline-flex" label={`Delete ${layer.name}`} shortcut={["⌫"]} icon={<I.Bin />} onClick={() => removeLayer(layer.id)} />
					<IconButton
						size="xsmall"
						className={cn(!layer.locked && "hidden group-hover/row:inline-flex")}
						label={layer.locked ? "Unlock layer" : "Lock layer"}
						shortcut={["⇧", "⌘", "L"]}
						active={!!layer.locked}
						icon={layer.locked ? <I.Lock /> : <I.LockOpen />}
						onClick={() => toggleLocked([layer.id])}
					/>
					<IconButton
						size="xsmall"
						className={cn(layer.visible && "text-weak")}
						label={layer.visible ? "Hide layer" : "Show layer"}
						icon={layer.visible ? <I.Eye /> : <I.EyeSlashed />}
						onClick={(e) => {
							e.stopPropagation();
							updateLayer(layer.id, { visible: !layer.visible });
						}}
					/>
				</span>
			</li>
			{covered > 0 && selected && !dragging && <CoverWarning layer={layer} def={def} index={index} count={covered} />}
		</>
	);
}

/**
 * Under a selected background that paints over other layers: what that means and one-click ways out.
 * Dismissing it (or "Keep it") marks the overlap as on purpose for this layer, so it doesn't come back.
 */
function CoverWarning({ layer, def, index, count }: { layer: Layer; def: LayerDef; index: number; count: number }) {
	const st = useStore.getState();
	const keep = () => st.updateLayer(layer.id, { coverOk: true });
	const action = (label: string, run: () => void) => (
		<button type="button" className="label-xxsmall flex h-[22px] items-center rounded-xs border border-normal px-sm text-strong transition-colors hover:bg-interaction-hover-subtle" onClick={run}>
			{label}
		</button>
	);
	return (
		// Part of the selected row: the same highlight runs behind the card, as one block.
		<li className="shrink-0 rounded-b-sm bg-interaction-selected-subtle px-sm pb-sm" role="note">
			<div className="flex flex-col gap-md rounded-xs bg-surface-elevated-1 p-md shadow-[0_0_0_1px_var(--color-fg-stroke-weak)]">
				<div className="flex items-start gap-sm">
					<span className="para-xxsmall flex-1 text-strong">
						Covers {count} layer{count > 1 ? "s" : ""} below. Make it see-through to use it as an overlay.
					</span>
					<IconButton size="xsmall" label="Dismiss" icon={<I.Cross />} onClick={keep} />
				</div>
				<div className="flex flex-wrap gap-xs">
					{def.seeThrough && action("Make transparent", () => st.patchLayers({ [layer.id]: def.seeThrough! }))}
					{action("Blend: Multiply", () => st.updateLayer(layer.id, { blend: 1 }))}
					{action("Move back", () => st.moveLayer(index, st.doc.layers.length - 1))}
					<button type="button" className="label-xxsmall flex h-[22px] items-center px-sm text-weak transition-colors hover:text-normal" onClick={keep}>
						Keep it, it&rsquo;s on purpose
					</button>
				</div>
			</div>
		</li>
	);
}

/** The row's second line: its kind, then what it does in this stack. */
function layerDetail(layers: Layer[], i: number, W: number, H: number) {
	const layer = layers[i];
	const def = getDef(layer.type);
	if (!def) return "";
	const kind = kindOf(def);
	const below = layers.slice(i + 1).filter((l) => l.visible).length;
	let what: string = def.label;
	const framed = `Framed ${Math.round(Number(layer.params.w) * W)} × ${Math.round(Number(layer.params.h) * H)}`;
	if (kind === "look") what = !below ? "Nothing below to change" : isFramed(layer) ? framed : `Applies to ${below} layer${below > 1 ? "s" : ""} below`;
	else if (kind === "background") {
		const covered = coverCount(layers, i);
		what = isFramed(layer)
			? framed
			: covered
				? `Covers ${covered} layer${covered > 1 ? "s" : ""} below`
				: "Fills the canvas";
	}
	const fx = (layer.effects ?? []).length;
	return `${KIND_LABELS[kind]} · ${what}${fx ? ` · ${fx} effect${fx > 1 ? "s" : ""}` : ""}`;
}

/**
 * How many visible layers a full-canvas background hides: it must paint every pixel (its def says when),
 * at full opacity in Normal blend, and not be marked as on purpose. 0 when it hides nothing.
 */
function coverCount(layers: Layer[], i: number) {
	const layer = layers[i];
	const def = getDef(layer.type);
	if (!def || kindOf(def) !== "background" || isFramed(layer) || !layer.visible || layer.coverOk) return 0;
	if (layer.opacity < 1 || layer.blend !== 0 || !def.covers?.(layer.params)) return 0;
	return layers.slice(i + 1).filter((l) => l.visible && getDef(l.type)?.kind === "source").length;
}

/** Neutral square tile behind a layer icon. */
function LayerTile({ className, children }: { className?: string; children: ReactNode }) {
	return (
		<span
			className={cn(
				"flex size-[22px] shrink-0 items-center justify-center rounded-xs bg-depth-inset-1 stroke-normal text-(color:--color-fg-icon-normal)",
				className,
			)}
		>
			{children}
		</span>
	);
}

/** One thing the add menu can place: a layer type, optionally with starting params and a name. */
interface Tile {
	key: string;
	type: string;
	label: string;
	/** One line on what it is, or the rule it keeps. */
	note: string;
	params?: Params;
}

const tile = (def: LayerDef, params?: Params, label = def.label, note = def.description, key = def.type): Tile => ({ key, type: def.type, label, note, params });
const byType = (type: string) => getDef(type)!;

/** The four doors, in the order of the model: what's the brand, what's behind, what's on top, how it looks. */
const DOORS: { id: LayerKind; label: string; note: string; icon: ReactNode; sections: () => { title: string; tiles: Tile[] }[] }[] = [
	{
		id: "brand",
		label: "Brand",
		note: "Mark, parts, brand patterns",
		icon: <I.Clueso />,
		sections: () => [
			{
				title: "The mark and its parts",
				tiles: [
					tile(byType("mark"), undefined, "Clueso mark", "The whole mark. Square, never stretched"),
					tile(byType("parts"), { layout: 0, top: true, middle: false, bottom: false }, "Upper part", "The corner. Keeps its 45° cut", "parts:upper"),
					tile(byType("parts"), { layout: 0, top: false, middle: true, bottom: false }, "Middle part", "The band. Always on the diagonal", "parts:middle"),
					tile(byType("parts"), { layout: 0, top: false, middle: false, bottom: true }, "Lower part", "The body, with the puzzle cavity", "parts:lower"),
				],
			},
			{ title: "Built from the mark", tiles: SOURCES.filter((d) => kindOf(d) === "brand" && d.type !== "mark" && d.type !== "parts").map((d) => tile(d)) },
		],
	},
	{
		id: "background",
		label: "Background",
		note: "Patterns and fills",
		icon: <I.Grid />,
		sections: () => [{ title: "Fills the canvas, or a frame you draw", tiles: SOURCES.filter((d) => kindOf(d) === "background").map((d) => tile(d)) }],
	},
	{
		id: "content",
		label: "Content",
		note: "Text, images, shapes",
		icon: <I.Shapes />,
		sections: () => [
			{
				title: "Content",
				tiles: SOURCES.filter((d) => kindOf(d) === "content").flatMap((d) => (d.variants ? d.variants.map((v) => tile(d, v.params, v.label, v.description, `${d.type}:${v.label}`)) : [tile(d)])),
			},
		],
	},
	{
		id: "look",
		label: "Look",
		note: "Effects over everything",
		icon: <I.Sparkles />,
		sections: () =>
			CATEGORIES.map((c) => ({ title: c.label, tiles: EFFECTS.filter((d) => d.category === c.id).map((d) => tile(d)) })).filter((sec) => sec.tiles.length),
	},
];

/** The menu reopens on the door you used last (for the session). */
const lastDoor: { id: LayerKind } = { id: "brand" };
function rememberDoor(d: LayerKind) {
	lastDoor.id = d;
}
const tileThumbs = new Map<string, string>();

/**
 * A real render of the tile on the current canvas's background and palette. A Look is shown over the
 * mark and a gradient, so there's something for it to change.
 */
function TileThumb({ t }: { t: Tile }) {
	const scene = useStore((s) => s.doc.scene);
	const key = `${t.key}|${scene.paletteId ?? ""}|${JSON.stringify(scene.background)}`;
	const [src, setSrc] = useState(() => tileThumbs.get(key));
	const def = getDef(t.type)!;
	useEffect(() => {
		if (tileThumbs.has(key) || t.type === "image") return;
		let alive = true;
		const look = kindOf(def) === "look";
		const layers = [createLayer(t.type, { params: t.params }), ...(look ? [createLayer("mark"), createLayer("gradient")] : [])];
		const doc: Doc = { version: 1, name: "", scene: { ...scene, width: 1080, height: 1080, transparent: false }, layers };
		renderThumb(doc, 1.5, 160).then((url) => {
			tileThumbs.set(key, url);
			if (alive) setSrc(url);
		}, () => {});
		return () => {
			alive = false;
		};
	}, [key, t, def, scene]);
	if (t.type === "image") {
		return (
			<span className="flex aspect-square w-full items-center justify-center rounded-xs border border-weak bg-depth-inset-1 text-weak">
				<I.ImagePlus width={20} height={20} />
			</span>
		);
	}
	return src ? <img src={src} alt="" className="aspect-square w-full rounded-xs border border-weak object-cover" /> : <span className="aspect-square w-full rounded-xs border border-weak bg-depth-inset-1" />;
}

/**
 * The add-layer menu: four doors (Brand, Background, Content, Look), each a grid of tiles with a real
 * preview and one line on what it is. Wraps its trigger.
 */
export function AddLayerMenu({ children, align = "start" }: { children: ReactNode; align?: "start" | "center" | "end" }) {
	const addLayer = useStore((s) => s.addLayer);
	const [open, setOpen] = useState(false);
	const [door, setDoor] = useState<LayerKind>(lastDoor.id);
	const pick = (d: LayerKind) => {
		rememberDoor(d);
		setDoor(d);
	};
	const current = DOORS.find((d) => d.id === door)!;
	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>{children}</PopoverTrigger>
			<PopoverContent align={align} className="max-h-[min(720px,calc(100vh-96px))] w-[620px] gap-0 overflow-y-auto p-0">
				<div role="tablist" aria-label="Add" className="grid shrink-0 grid-cols-4 gap-xs border-b border-weak p-sm">
					{DOORS.map((d) => (
						<button
							key={d.id}
							type="button"
							role="tab"
							aria-selected={d.id === door}
							className={cn(
								"flex flex-col gap-sm rounded-sm px-lg py-lg text-left transition-colors",
								d.id === door ? "bg-interaction-selected-subtle text-strong" : "text-normal hover:bg-interaction-hover-subtle",
							)}
							onClick={() => pick(d.id)}
						>
							<span className="flex items-center gap-sm [&_svg]:size-[14px]">
								{d.icon}
								<span className="label-xsmall-strong">{d.label}</span>
							</span>
							<span className="para-xxsmall text-weak">{d.note}</span>
						</button>
					))}
				</div>
				<div className="flex flex-col gap-2xl p-xl" role="tabpanel" aria-label={current.label}>
					{current.sections().map((sec) => (
						<div key={sec.title} className="flex flex-col gap-md">
							<MenuLabel className="px-0 pt-0">{sec.title}</MenuLabel>
							<div className="grid grid-cols-4 gap-md">
								{sec.tiles.map((t) => (
									<button
										key={t.key}
										type="button"
										className="flex flex-col gap-sm rounded-sm p-xs text-left transition-colors hover:bg-interaction-hover-subtle focus-visible:bg-interaction-hover-subtle"
										onClick={() => {
											addLayer(t.type, t.params ? { params: t.params, name: t.label } : { name: t.label });
											setOpen(false);
										}}
									>
										<TileThumb t={t} />
										<span className="label-xsmall-strong text-strong">{t.label}</span>
										<span className="para-xxsmall text-weak">{t.note}</span>
									</button>
								))}
							</div>
						</div>
					))}
				</div>
				<p className="para-xxsmall mx-xl border-t border-dashed border-weak pt-md pb-lg text-weak">
					{door === "brand"
						? "Brand pieces keep the mark’s angles and use the canvas palette. Resize and rotate them freely."
						: door === "look"
							? "A Look goes on top and changes everything below it. Drag it lower to leave layers above it untouched."
							: door === "background"
								? "Backgrounds go to the bottom. Turn off Fill canvas to draw one inside a frame."
								: "New content goes above what you have selected."}
				</p>
			</PopoverContent>
		</Popover>
	);
}
