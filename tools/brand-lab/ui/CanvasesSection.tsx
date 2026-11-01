import { useEffect, useState } from "react";
import { IconButton } from "../components/icon-button";
import { renderThumb } from "../export/thumb";
import { ContextMenuPopover } from "@/lib/design-system/jigsaw/components/ui/overlays/context-menu/context-menu";
import { Separator } from "@/lib/design-system/jigsaw/components/ui/primitives/separator/separator";
import { cn } from "@/lib/design-system/jigsaw/lib/utils";
import type { Doc } from "../state/doc";
import { useStore } from "../state/store";
import { I } from "./ci";

// Canvases in the project, above the layer list. Only the active canvas renders live (in the
// viewport); the others show a still thumbnail, so adding canvases costs nothing per frame.

const thumbs = new WeakMap<Doc, string>();

/** A small still of a canvas, re-rendered (debounced) when that canvas changes. */
function useThumb(doc: Doc) {
	const [src, setSrc] = useState(() => thumbs.get(doc));
	useEffect(() => {
		const hit = thumbs.get(doc);
		if (hit) return setSrc(hit);
		let alive = true;
		const t = window.setTimeout(async () => {
			const url = await renderThumb(doc, 1.5, 96);
			thumbs.set(doc, url);
			if (alive) setSrc(url);
		}, 500);
		return () => {
			alive = false;
			clearTimeout(t);
		};
	}, [doc]);
	return src;
}

export function CanvasesSection() {
	const canvases = useStore((s) => s.canvases);
	const active = useStore((s) => s.active);
	const addCanvas = useStore((s) => s.addCanvas);
	const [menu, setMenu] = useState<{ x: number; y: number; i: number } | null>(null);
	const [renaming, setRenaming] = useState<number | null>(null);
	const st = useStore.getState();

	return (
		<div className="flex shrink-0 flex-col">
			<div className="flex h-[40px] items-center gap-xs pr-sm pl-xl">
				<h2 className="label-small-strong flex-1 text-strong">Canvases</h2>
				<IconButton label="New canvas" icon={<I.Plus />} onClick={() => addCanvas()} />
			</div>
			<ul className="flex max-h-[204px] flex-col gap-2xs overflow-y-auto px-sm pb-sm">
				{canvases.map((c, i) => (
					<CanvasRow
						key={i}
						doc={c}
						active={i === active}
						renaming={renaming === i}
						onSelect={() => st.setActiveCanvas(i)}
						onRename={(name) => {
							if (name !== null) st.renameCanvas(i, name);
							setRenaming(null);
						}}
						onStartRename={() => setRenaming(i)}
						onMenu={(x, y) => setMenu({ x, y, i })}
						canDelete={canvases.length > 1}
					/>
				))}
			</ul>
			<Separator />
			{menu && (
				<ContextMenuPopover
					key={`${menu.x},${menu.y}`}
					x={menu.x}
					y={menu.y}
					onClose={() => setMenu(null)}
					className="min-w-[200px]"
					sections={[
						{
							items: [
								{ label: "Rename", icon: <I.FontSize />, onClick: () => setRenaming(menu.i) },
								{ label: "Duplicate", icon: <I.Duplicate />, onClick: () => st.duplicateCanvas(menu.i) },
							],
						},
						{
							items: [
								{ label: "Move up", icon: <I.BringForward />, onClick: () => st.moveCanvas(menu.i, menu.i - 1), disabled: menu.i === 0 },
								{ label: "Move down", icon: <I.SendBackward />, onClick: () => st.moveCanvas(menu.i, menu.i + 1), disabled: menu.i === canvases.length - 1 },
							],
						},
						{ items: [{ label: "Delete", icon: <I.Bin />, onClick: () => st.removeCanvas(menu.i), disabled: canvases.length <= 1, disabledReason: "A project needs at least one canvas" }] },
					]}
				/>
			)}
		</div>
	);
}

function CanvasRow({
	doc,
	active,
	renaming,
	canDelete,
	onSelect,
	onRename,
	onStartRename,
	onMenu,
}: {
	doc: Doc;
	active: boolean;
	renaming: boolean;
	canDelete: boolean;
	onSelect: () => void;
	onRename: (name: string | null) => void;
	onStartRename: () => void;
	onMenu: (x: number, y: number) => void;
}) {
	const src = useThumb(doc);
	const { width: w, height: h } = doc.scene;
	const k = 24 / Math.max(w, h);
	return (
		<li
			className={cn(
				"group/canvas relative flex h-[36px] shrink-0 cursor-default items-center gap-sm rounded-sm pr-md pl-sm transition-colors",
				active ? "bg-interaction-selected-subtle" : "hover:bg-interaction-hover-subtle",
			)}
			onPointerDown={(e) => {
				if (e.button === 0 && !(e.target as HTMLElement).closest("input,button")) onSelect();
			}}
			onDoubleClick={onStartRename}
			onPointerEnter={() => useStore.getState().setHoverCanvas(useStore.getState().canvases.indexOf(doc))}
			onPointerLeave={() => useStore.getState().setHoverCanvas(null)}
			onContextMenu={(e) => {
				e.preventDefault();
				onMenu(e.clientX, e.clientY);
			}}
			aria-current={active}
		>
			<span className="flex size-[24px] shrink-0 items-center justify-center">
				<span className="overflow-hidden rounded-2xs bg-depth-inset-2 shadow-[inset_0_0_0_0.5px_var(--color-fg-stroke-normal)]" style={{ width: Math.max(8, w * k), height: Math.max(8, h * k) }}>
					{src && <img src={src} alt="" className="block size-full object-cover" />}
				</span>
			</span>
			{renaming ? (
				<input
					autoFocus
					className="label-xsmall h-[24px] min-w-0 flex-1 rounded-xs border border-brand-normal bg-depth-inset-1 px-xs text-strong outline-none"
					defaultValue={doc.name}
					onFocus={(e) => e.target.select()}
					onBlur={(e) => onRename(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") (e.target as HTMLInputElement).blur();
						if (e.key === "Escape") onRename(null);
					}}
				/>
			) : (
				<span className="label-xsmall min-w-0 flex-1 truncate text-strong" title="Double-click to rename">
					{doc.name || "Untitled"}
				</span>
			)}
			{!renaming && (
				<>
					<span className="mono-xxsmall shrink-0 text-weak group-hover/canvas:hidden">
						{w}×{h}
					</span>
					<span className="hidden items-center group-hover/canvas:flex">
						<IconButton size="xsmall" label="Duplicate canvas" icon={<I.Duplicate />} onClick={() => useStore.getState().duplicateCanvas(useStore.getState().canvases.indexOf(doc))} />
						{canDelete && <IconButton size="xsmall" label="Delete canvas" icon={<I.Bin />} onClick={() => useStore.getState().removeCanvas(useStore.getState().canvases.indexOf(doc))} />}
					</span>
				</>
			)}
		</li>
	);
}
