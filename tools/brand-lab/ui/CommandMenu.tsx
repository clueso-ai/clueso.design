import * as DialogPrimitive from "@radix-ui/react-dialog";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Kbd } from "@/lib/design-system/jigsaw/components/ui/primitives/kbd/kbd";
import { cn } from "@/lib/design-system/jigsaw/lib/utils";
import { EFFECTS, SOURCES } from "../layers/registry";
import { CATEGORIES, type Params } from "../layers/types";
import { useStore } from "../state/store";
import { I } from "./ci";
import { LayerIcon } from "./icons";

// ⌘K: search every layer type (and its variants) and add it to the active canvas without leaving
// the keyboard, plus a few canvas-level commands. Arrow keys move, Enter runs, Esc closes.

interface Item {
	id: string;
	group: string;
	label: string;
	description: string;
	icon: ReactNode;
	keywords: string;
	shortcut?: string[];
	run: () => void;
}

function layerItems(): Item[] {
	const items: Item[] = [];
	for (const kind of ["source", "effect"] as const) {
		for (const c of CATEGORIES) {
			for (const def of (kind === "source" ? SOURCES : EFFECTS).filter((d) => d.category === c.id)) {
				const add = (label: string, description: string, params?: Params) =>
					items.push({
						id: `${def.type}:${label}`,
						group: c.label,
						label,
						description,
						icon: <LayerIcon name={def.icon} size={16} />,
						keywords: `${label} ${def.label} ${def.description} ${c.label} ${kind}`.toLowerCase(),
						run: () => useStore.getState().addLayer(def.type, params ? { params, name: label } : undefined),
					});
				if (def.variants) for (const v of def.variants) add(v.label, v.description, v.params);
				else add(def.label, def.description);
			}
		}
	}
	return items;
}

function commandItems(): Item[] {
	const st = () => useStore.getState();
	const cmd = (id: string, label: string, description: string, icon: ReactNode, run: () => void, shortcut?: string[]): Item => ({ id, group: "Commands", label, description, icon, keywords: `${label} ${description}`.toLowerCase(), run, shortcut });
	return [
		cmd("new-canvas", "New canvas", "Add a canvas to this project", <I.Plus />, () => st().addCanvas()),
		cmd("dup-canvas", "Duplicate canvas", "Copy the canvas you're on", <I.Duplicate />, () => st().duplicateCanvas(st().active)),
		cmd("shuffle", "Shuffle", "Shuffle in the current mode", <I.Shuffle />, () => st().shuffleAll(), ["S"]),
		cmd("variations", "Variations and styles", "Compare variations of this canvas", <I.Grid />, () => st().setOverlay("explore"), ["E"]),
		cmd("library", "Library", "Saved projects and presets", <I.Library />, () => st().setOverlay("library"), ["L"]),
		cmd("snapping", "Toggle snapping", "Snap to guides, canvases and whole pixels", <I.AlignHCenter />, () => st().toggleSnapping(), ["⇧⌘'"]),
	];
}

/** Loose match: every word of the query appears somewhere; earlier and label matches rank higher. */
function score(item: Item, q: string) {
	const words = q.toLowerCase().split(/\s+/).filter(Boolean);
	if (!words.length) return 1;
	let s = 0;
	for (const w of words) {
		const i = item.keywords.indexOf(w);
		if (i < 0) return 0;
		s += item.label.toLowerCase().startsWith(w) ? 4 : item.label.toLowerCase().includes(w) ? 3 : 1;
	}
	return s;
}

export function CommandMenu() {
	const open = useStore((s) => s.commandOpen);
	const setOpen = useStore((s) => s.setCommandOpen);
	const [q, setQ] = useState("");
	const [cursor, setCursor] = useState(0);
	const list = useRef<HTMLDivElement>(null);
	const all = useMemo(() => [...layerItems(), ...commandItems()], []);

	const results = useMemo(() => {
		const scored = all.map((it) => ({ it, s: score(it, q) })).filter((x) => x.s > 0);
		// Searching ranks by relevance; browsing keeps the menu's category order.
		if (q.trim()) scored.sort((a, b) => b.s - a.s);
		return scored.map((x) => x.it);
	}, [all, q]);

	useEffect(() => {
		if (!open) {
			setQ("");
			setCursor(0);
		}
	}, [open]);
	useEffect(() => setCursor(0), [q]);
	useEffect(() => {
		list.current?.querySelector(`[data-index="${cursor}"]`)?.scrollIntoView({ block: "nearest" });
	}, [cursor]);

	const run = (it: Item | undefined) => {
		if (!it) return;
		setOpen(false);
		it.run();
	};

	// Group headers only while browsing; a search shows one ranked list.
	let lastGroup = "";

	return (
		<DialogPrimitive.Root open={open} onOpenChange={setOpen}>
			<DialogPrimitive.Portal>
				<DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-overlay bg-black/20" />
				<DialogPrimitive.Content
					aria-describedby={undefined}
					className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-[0.98] data-[state=open]:zoom-in-[0.98] fixed top-[16vh] left-1/2 z-modal flex max-h-[min(560px,70vh)] w-[min(600px,calc(100vw-32px))] -translate-x-1/2 flex-col overflow-hidden rounded-xl border border-weak bg-surface-elevated-1 text-strong shadow-[0px_24px_48px_-12px_rgba(0,0,0,0.35)] duration-150"
				>
					<DialogPrimitive.Title className="sr-only">Add a layer</DialogPrimitive.Title>
					<div className="flex h-[52px] shrink-0 items-center gap-md border-b border-weak px-xl">
						<I.Search width={18} height={18} className="shrink-0 text-(color:--color-fg-icon-normal)" />
						<input
							autoFocus
							value={q}
							onChange={(e) => setQ(e.target.value)}
							placeholder="Add a layer or run a command…"
							className="label-medium min-w-0 flex-1 bg-transparent text-strong outline-none placeholder:text-weak"
							onKeyDown={(e) => {
								if (e.key === "ArrowDown") setCursor((c) => Math.min(results.length - 1, c + 1));
								else if (e.key === "ArrowUp") setCursor((c) => Math.max(0, c - 1));
								else if (e.key === "Enter") run(results[cursor]);
								else return;
								e.preventDefault();
							}}
						/>
						<Kbd>Esc</Kbd>
					</div>
					<div ref={list} className="min-h-0 flex-1 overflow-y-auto p-xs" role="listbox">
						{results.length === 0 && <p className="para-small px-md py-2xl text-center text-weak">No layer or command matches “{q}”.</p>}
						{results.map((it, i) => {
							const header = !q.trim() && it.group !== lastGroup ? it.group : null;
							lastGroup = it.group;
							return (
								<div key={it.id}>
									{header && <div className="label-xxsmall-strong px-md pt-md pb-xs tracking-wide text-weak uppercase">{header}</div>}
									<button
										type="button"
										role="option"
										aria-selected={i === cursor}
										data-index={i}
										className={cn("flex w-full items-center gap-md rounded-sm px-md py-sm text-left", i === cursor && "bg-interaction-selected-subtle")}
										onMouseMove={() => setCursor(i)}
										onClick={() => run(it)}
									>
										<span className="grid size-[28px] shrink-0 place-items-center rounded-xs bg-depth-inset-1 stroke-normal text-(color:--color-fg-icon-normal) [&_svg]:size-[16px]">{it.icon}</span>
										<span className="flex min-w-0 flex-1 flex-col">
											<span className="label-small text-strong">{it.label}</span>
											<span className="para-xxsmall truncate text-weak">{it.description}</span>
										</span>
										{q.trim() && <span className="label-xxsmall shrink-0 text-weak">{it.group}</span>}
										{it.shortcut && <Kbd>{it.shortcut.join("")}</Kbd>}
									</button>
								</div>
							);
						})}
					</div>
					<div className="flex h-[36px] shrink-0 items-center gap-lg border-t border-weak px-xl para-xxsmall text-weak">
						<span className="flex items-center gap-xs">
							<Kbd>↑</Kbd>
							<Kbd>↓</Kbd> to move
						</span>
						<span className="flex items-center gap-xs">
							<Kbd>↵</Kbd> to add
						</span>
						<span className="ml-auto">Adds to the canvas you're on</span>
					</div>
				</DialogPrimitive.Content>
			</DialogPrimitive.Portal>
		</DialogPrimitive.Root>
	);
}
