import { I } from "./ci";
import { type ReactNode, useLayoutEffect, useState } from "react";
import { IconButton } from "../components/icon-button";
import { Panel, PanelHeader } from "../components/panel";
import { MenuLabel, Popover, PopoverContent, PopoverTrigger } from "../components/popover";
import { Separator } from "@/lib/design-system/jigsaw/components/ui/primitives/separator/separator";
import { cn } from "@/lib/design-system/jigsaw/lib/utils";
import { EFFECTS, getDef, SOURCES } from "../layers/registry";
import { CATEGORIES, type Layer, type LayerDef, type Params } from "../layers/types";
import { useStore } from "../state/store";
import { releaseFieldFocus } from "./CanvasOverlay";
import { CanvasesSection } from "./CanvasesSection";
import { LayerIcon } from "./icons";
import { BAR, GAP, M, PANEL_TOP, usePanels } from "./layout";

const ROW = 36;
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
	const width = usePanels((s) => s.left);
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
		<Panel className="max-[1099px]:hidden" style={{ top: PANEL_TOP, left: M, bottom: M + BAR + GAP, width }} aria-label="Layers">
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
		</Panel>
	);
}

function LayerRow({
	layer,
	selected,
	hovered,
	lifted,
	style,
	onSelect,
	onDragStart,
}: {
	layer: Layer;
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
		<li
			className={cn(
				"group/row relative flex h-[36px] shrink-0 cursor-default items-center gap-xs rounded-sm pr-xs pl-2xs transition-colors",
				"[&:has(+li:hover)>[data-slot=separator]]:opacity-0 [&:has(+li[aria-selected=true])>[data-slot=separator]]:opacity-0",
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
			<span
				className="flex h-full w-[16px] shrink-0 cursor-grab items-center justify-center text-weak opacity-0 transition-opacity group-hover/row:opacity-100 active:cursor-grabbing"
				aria-label="Drag to reorder"
				title="Drag to reorder"
			>
				<I.Grip width={13} height={13} />
			</span>
			<LayerTile className="layer-glyph">
				<LayerIcon name={def.icon} size={14} />
			</LayerTile>
			<span className="layer-label label-xsmall min-w-0 flex-1 truncate text-strong" onDoubleClick={() => setRenaming(true)} title="Double-click to rename">
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
			{layer.palette && <span className="size-[8px] shrink-0 rounded-full shadow-[inset_0_0_0_1px_var(--color-fg-stroke-weak)]" title="Uses its own palette" style={{ background: layer.palette[2]?.hex ?? layer.palette[0]?.hex }} />}
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
	);
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

/** The add-layer menu: sources and effects side by side, grouped by category. Wraps its trigger. */
export function AddLayerMenu({ children, align = "start" }: { children: ReactNode; align?: "start" | "center" | "end" }) {
	const addLayer = useStore((s) => s.addLayer);
	const [open, setOpen] = useState(false);
	const entry = (def: LayerDef, key: string, label: string, description: string, params?: Params) => (
		<button
			key={key}
			type="button"
			className="flex w-full items-start gap-md rounded-xs px-sm py-sm text-left transition-colors hover:bg-interaction-hover-subtle focus-visible:bg-interaction-hover-subtle"
			onClick={() => {
				addLayer(def.type, params ? { params, name: label } : undefined);
				setOpen(false);
			}}
		>
			<LayerTile className="mt-2xs">
				<LayerIcon name={def.icon} size={14} />
			</LayerTile>
			<span className="flex min-w-0 flex-col gap-2xs">
				<span className="label-xsmall-strong text-strong">{label}</span>
				<span className="para-xxsmall text-weak">{description}</span>
			</span>
		</button>
	);
	// Layers with variants (Text: Title / Body / Mono) list each variant instead of the bare type.
	const item = (def: LayerDef) =>
		def.variants ? def.variants.map((v) => entry(def, `${def.type}:${v.label}`, v.label, v.description, v.params)) : entry(def, def.type, def.label, def.description);
	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>{children}</PopoverTrigger>
			<PopoverContent align={align} className="max-h-[min(720px,calc(100vh-96px))] w-[620px] gap-0 overflow-y-auto p-sm">
				<div className="grid grid-cols-2 gap-sm">
					{(["source", "effect"] as const).map((kind) => (
						<div key={kind} className="flex flex-col gap-md">
							{CATEGORIES.map((c) => {
								const defs = (kind === "source" ? SOURCES : EFFECTS).filter((d) => d.category === c.id);
								if (!defs.length) return null;
								return (
									<div key={c.id} className="flex flex-col">
										<MenuLabel className="pb-xs">{c.label}</MenuLabel>
										{defs.map(item)}
									</div>
								);
							})}
						</div>
					))}
				</div>
				<p className="para-xxsmall border-t border-dashed border-weak px-sm pt-md pb-xs text-weak">Effects change everything below them in the stack.</p>
			</PopoverContent>
		</Popover>
	);
}
