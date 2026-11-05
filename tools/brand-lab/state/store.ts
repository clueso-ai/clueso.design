import { create } from "zustand";
import { BUILT_IN_PALETTES, clonePalette, nearestColor, type Palette, type PaletteDef, samePalette, toPalette } from "../brand/palette";
import { createLayer, getDef, newId } from "../layers/registry";
import { fitInside } from "../layers/sources/image";
import { migrateText } from "../layers/sources/text";
import { allParams, kindOf, type Layer, type LayerEffect, type LayerKind, type ParamValue, type Params } from "../layers/types";
import { placeAll } from "./board";
import type { Doc, Scene } from "./doc";
import { PRESETS } from "./presets";
import { renderThumb } from "../export/thumb";
import { getEntry, type LibraryEntry, putEntry } from "./library";
import { mulberry32, shuffleParams } from "./shuffle";
import { remapColorRefs, type VariationMode, vary } from "./variations";
import { pickImageFile, readImageFile } from "../ui/image-file";

const STORAGE_KEY = "clueso-brand-lab:doc";
// clueso.design: the homepage embeds Brand Lab at /tools/brand-lab?embed. The embed shares the
// visitor's localStorage, so it never reads or overwrites their autosaved project.
const EMBED = new URLSearchParams(location.search).has("embed");
const HISTORY_LIMIT = 100;
/** Edits to the same control within this window collapse into one undo step (slider drags). */
const COALESCE_MS = 600;

export type Theme = "light" | "dark";
export type ShuffleMode = VariationMode;
export type Overlay = "explore" | "library" | "palettes" | null;

/** A project: several named canvases (each a Doc) sharing one Library entry and one undo history. */
export interface Project {
	name: string;
	canvases: Doc[];
	active: number;
}
type Snap = { canvases: Doc[]; active: number };

interface State {
	/** The active canvas. Every editing action works on this; `canvases[active]` always equals it. */
	doc: Doc;
	projectName: string;
	canvases: Doc[];
	active: number;
	/** Primary selection (shown in Properties); `selectedIds` holds the whole multi-selection. */
	selectedId: string | null;
	selectedIds: string[];
	hoverId: string | null;
	/** What a drag does: select and move, or draw a canvas (F), rectangle (R), ellipse (O) or text box (T). */
	tool: Tool;
	/** Text layer being typed into on the canvas (double-click or Enter). */
	editingTextId: string | null;
	menu: { x: number; y: number } | null;
	past: Snap[];
	future: Snap[];
	lastEdit: { key: string; at: number } | null;

	time: number;
	playing: boolean;
	zoom: number | "fit";
	theme: Theme;
	shuffleMode: ShuffleMode;
	overlay: Overlay;
	/** Library entry the open doc came from or was saved to, and the doc as last saved. */
	saved: { id: string; canvases: Doc[] } | null;
	toast: string | null;
	/** Built-in palettes (with any local edits) followed by the user's own. */
	palettes: PaletteDef[];

	commit: (recipe: (doc: Doc) => Doc, coalesceKey?: string) => void;
	undo: () => void;
	redo: () => void;
	/** Replace the whole project with one canvas (presets, files, "New blank"). */
	loadDoc: (doc: Doc, saved?: { id: string } | null) => void;
	loadProject: (project: { name: string; canvases: Doc[]; active?: number }, saved?: { id: string } | null) => void;
	setProjectName: (name: string) => void;
	setActiveCanvas: (i: number) => void;
	addCanvas: (doc?: Doc) => void;
	/** Duplicate canvas i; the copy goes to index `to` (after the original by default) and becomes active. */
	duplicateCanvas: (i: number, to?: number, board?: { x: number; y: number }) => void;
	/** Place a canvas on the board (composition px). Drags coalesce into one undo step. */
	moveCanvasOnBoard: (i: number, board: { x: number; y: number }) => void;
	/** Canvases selected on the board as frames (indices), not their layers. Several with a marquee or Shift. */
	selectedCanvases: number[];
	/** Select the active canvas's frame, or clear the canvas selection. */
	setCanvasSelected: (on: boolean) => void;
	selectCanvases: (indices: number[]) => void;
	/** Move several canvases on the board at once, in one undo step (a group drag). */
	moveCanvasesOnBoard: (moves: Record<number, { x: number; y: number }>) => void;
	/** Delete every selected canvas, keeping at least one in the project. */
	removeSelectedCanvases: () => void;
	/** Snap moves to guides (objects, canvases) and whole pixels. A saved preference. */
	snapping: boolean;
	toggleSnapping: () => void;
	/** Canvas under the pointer in the Canvases list, outlined on the board. */
	hoverCanvas: number | null;
	setHoverCanvas: (i: number | null) => void;
	/** A temporary, un-committed change shown on the canvas only (hovering a blend mode). */
	preview: { id: string; patch: Partial<Layer> } | null;
	setPreview: (p: { id: string; patch: Partial<Layer> } | null) => void;
	/** The ⌘K command menu. */
	commandOpen: boolean;
	setCommandOpen: (open: boolean) => void;
	removeCanvas: (i: number) => void;
	renameCanvas: (i: number, name: string) => void;
	moveCanvas: (from: number, to: number) => void;
	saveToLibrary: (opts?: { asNew?: boolean; doc?: Doc; name?: string }) => Promise<LibraryEntry>;
	setOverlay: (o: Overlay) => void;
	savePalette: (def: PaletteDef) => void;
	removePalette: (id: string) => void;
	applyPalette: (id: string) => void;
	setLayerPalette: (layerId: string, paletteId: string | null) => void;
	showToast: (msg: string) => void;

	addLayer: (type: string, opts?: { params?: Params; name?: string }) => void;
	removeLayer: (id: string) => void;
	duplicateLayer: (id: string) => void;
	moveLayer: (from: number, to: number) => void;
	updateLayer: (id: string, patch: Partial<Layer>, coalesceKey?: string) => void;
	setParam: (id: string, key: string, value: ParamValue) => void;
	/** Effects on one layer only (top first). New ones go on top of that layer's list. */
	addEffect: (layerId: string, type: string) => void;
	updateEffect: (layerId: string, effectId: string, patch: Partial<Omit<LayerEffect, "id">>, coalesceKey?: string) => void;
	removeEffect: (layerId: string, effectId: string) => void;
	/** Move an effect one step up (-1) or down (+1) in its layer's list. */
	moveEffect: (layerId: string, effectId: string, dir: -1 | 1) => void;
	/** A Look layer becomes an effect on one layer (the nearest object below it, unless given). */
	applyLookTo: (lookId: string, targetId?: string) => void;
	/** An effect on a layer becomes a Look layer just above it, restyling everything below again. */
	liftEffect: (layerId: string, effectId: string) => void;
	/** Give an image layer a picture. An empty layer also gets placed inside the canvas. */
	setImage: (id: string, src: string) => Promise<void>;
	/** Swap a layer to another type in place (e.g. Slice → Glitch), keeping what carries over. */
	swapLayerType: (id: string, type: string) => void;
	setScene: (patch: Partial<Scene>, coalesceKey?: string) => void;
	select: (id: string | null, mode?: "replace" | "toggle" | "range") => void;
	selectMany: (ids: string[]) => void;
	setHover: (id: string | null) => void;
	setEditingText: (id: string | null) => void;
	setTool: (tool: Tool) => void;
	openMenu: (x: number, y: number) => void;
	closeMenu: () => void;
	arrange: (dir: "front" | "forward" | "backward" | "back") => void;
	removeSelected: () => void;
	duplicateSelected: () => void;
	copySelected: () => void;
	paste: () => void;
	toggleLocked: (ids?: string[]) => void;
	toggleVisible: (ids?: string[]) => void;
	/** Param patches for several layers in one undo step (canvas drags). */
	patchLayers: (patches: Record<string, Params>, coalesceKey?: string) => void;
	shuffleAll: (mode?: ShuffleMode) => void;
	setShuffleMode: (m: ShuffleMode) => void;
	shuffleLayer: (id: string) => void;

	setTime: (t: number) => void;
	setPlaying: (p: boolean) => void;
	setZoom: (z: number | "fit") => void;
	setTheme: (t: Theme) => void;
}

/** The autosaved project; docs saved before multiple canvases open as a one-canvas project. */
function loadInitial(): Project {
	try {
		const raw = EMBED ? null : localStorage.getItem(STORAGE_KEY); // clueso.design: see EMBED
		if (raw) {
			const data = JSON.parse(raw) as Partial<Project> & Partial<Doc>;
			if (Array.isArray(data.canvases) && data.canvases.length) {
				const canvases = data.canvases.map(sanitize);
				return { name: data.name ?? "Untitled", canvases, active: Math.min(data.active ?? 0, canvases.length - 1) };
			}
			if (data.version === 1 && Array.isArray(data.layers)) return { name: data.name ?? "Untitled", canvases: [sanitize(data as Doc)], active: 0 };
		}
	} catch {
		// fall through to the default preset
	}
	const doc = PRESETS[0].build();
	return { name: doc.name, canvases: [doc], active: 0 };
}

const initial = loadInitial();

/** A unique canvas name: "Canvas 2", "Hero copy"… */
function uniqueName(canvases: Doc[], base: string) {
	const names = new Set(canvases.map((c) => c.name));
	if (!names.has(base)) return base;
	let n = 2;
	while (names.has(`${base} ${n}`)) n++;
	return `${base} ${n}`;
}

// ── palettes ───────────────────────────────────────────────────────────
const PALETTES_KEY = "clueso-brand-lab:palettes";

function loadPalettes(): PaletteDef[] {
	let saved: { overrides?: Record<string, PaletteDef>; custom?: PaletteDef[] } = {};
	try {
		saved = JSON.parse(localStorage.getItem(PALETTES_KEY) ?? "{}");
	} catch {
		// corrupt entry: fall back to the built-ins
	}
	return [...BUILT_IN_PALETTES.map((p) => saved.overrides?.[p.id] ?? { ...p, colors: clonePalette(p.colors) }), ...(saved.custom ?? [])];
}

function persistPalettes(palettes: PaletteDef[]) {
	const overrides: Record<string, PaletteDef> = {};
	for (const p of palettes) {
		const original = BUILT_IN_PALETTES.find((b) => b.id === p.id);
		if (original && (!samePalette(original.colors, p.colors) || original.name !== p.name)) overrides[p.id] = p;
	}
	localStorage.setItem(PALETTES_KEY, JSON.stringify({ overrides, custom: palettes.filter((p) => !p.builtIn) }));
}

/** Puts a palette on the scene. References to colours it doesn't have move to the nearest in lightness. */
function withPalette(doc: Doc, def: PaletteDef): Doc {
	const palette: Palette = clonePalette(def.colors);
	const keys = new Set(palette.map((c) => c.key));
	const map = new Map<string, string>();
	for (const c of doc.scene.palette) {
		if (keys.has(c.key)) continue;
		const near = nearestColor(palette, c.hex);
		if (near) map.set(`$${c.key}`, `$${near.key}`);
	}
	const next = remapColorRefs(doc, map);
	return { ...next, scene: { ...next.scene, palette, paletteId: def.id } };
}

/** Older docs didn't record their palette; recognise a built-in by its colours. */
function matchBuiltIn(palette: Palette) {
	const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
	return BUILT_IN_PALETTES.find((p) => p.colors.every((c) => palette.some((x) => x.key === c.key && same(x.hex, c.hex))))?.id;
}

/** Drop unknown layer types and fill params added since the doc was saved. */
export function sanitize(doc: Doc): Doc {
	const palette = toPalette(doc.scene.palette);
	return {
		...doc,
		scene: { ...doc.scene, palette, paletteId: doc.scene.paletteId ?? matchBuiltIn(palette) },
		layers: doc.layers
			.filter((l) => getDef(l.type))
			.map((l) => {
				const fresh = createLayer(l.type);
				const params = l.type === "text" ? migrateText(l.params, doc.scene.width) : l.params;
				const merged = { ...fresh.params, ...params };
				const def = getDef(l.type);
				// Effects on the layer: drop any whose type no longer exists, fill in params added since.
				const effects = l.effects?.filter((e) => getDef(e.type)).map((e) => ({ ...e, params: { ...createLayer(e.type).params, ...e.params } }));
				return { ...fresh, ...l, params: def?.normalize ? def.normalize(merged) : merged, ...(effects ? { effects } : {}) };
			}),
	};
}

let toastTimer: number | undefined;
/**
 * Where a new layer goes in the stack (top first). A Look goes on top so it restyles everything, a
 * background at the bottom. Brand pieces and content go above the selected object, or just under the
 * Looks when nothing (or a Look or background) is selected. Layers can still be dragged anywhere.
 */
function insertAt(layers: Layer[], kind: LayerKind, selectedId: string | null) {
	if (kind === "look") return 0;
	if (kind === "background") return layers.length;
	const sel = layers.findIndex((l) => l.id === selectedId);
	const selKind = sel >= 0 ? kindOf(getDef(layers[sel].type)!) : null;
	if (selKind === "brand" || selKind === "content") return sel;
	let i = 0;
	while (i < layers.length && kindOf(getDef(layers[i].type)!) === "look") i++;
	return i;
}

export type Tool = "move" | "canvas" | "rect" | "ellipse" | "text";

/** Drawing tools and their keys, as Figma has them. */
export const TOOLS: { id: Exclude<Tool, "move">; label: string; key: string }[] = [
	{ id: "canvas", label: "Draw a canvas", key: "F" },
	{ id: "rect", label: "Rectangle", key: "R" },
	{ id: "ellipse", label: "Ellipse", key: "O" },
	{ id: "text", label: "Text", key: "T" },
];

/** In-app layer clipboard for ⌘C / ⌘V. */
let clipboard: Layer[] = [];
/** What ⌘C puts on the system clipboard when copying layers. */
export const LAYER_CLIP_MARK = "clueso-brand-lab:layers";
export const hasLayerClipboard = () => clipboard.length > 0;

const initialTheme = (localStorage.getItem("clueso-brand-lab:theme") as Theme | null) ?? "light";

export const useStore = create<State>((set, get) => ({
	doc: initial.canvases[initial.active],
	projectName: initial.name,
	canvases: initial.canvases,
	active: initial.active,
	selectedId: null,
	selectedIds: [],
	hoverId: null,
	tool: "move",
	editingTextId: null,
	menu: null,
	past: [],
	future: [],
	lastEdit: null,

	time: 0,
	playing: true,
	zoom: "fit",
	theme: initialTheme,
	overlay: null,
	saved: null,
	toast: null,
	palettes: loadPalettes(),
	shuffleMode: (localStorage.getItem("clueso-brand-lab:shuffle") as ShuffleMode | null) ?? "pattern",

	commit: (recipe, coalesceKey) => {
		const { doc, canvases, active, past, lastEdit } = get();
		const next = recipe(doc);
		if (next === doc) return;
		const now = performance.now();
		const coalesce = coalesceKey && lastEdit && lastEdit.key === coalesceKey && now - lastEdit.at < COALESCE_MS;
		set({
			doc: next,
			canvases: canvases.map((c, i) => (i === active ? next : c)),
			past: coalesce ? past : [...past, { canvases, active }].slice(-HISTORY_LIMIT),
			future: [],
			lastEdit: coalesceKey ? { key: coalesceKey, at: now } : null,
		});
	},
	undo: () => {
		const { past, canvases, active, future, selectedIds } = get();
		if (!past.length) return;
		const prev = past[past.length - 1];
		set({
			canvases: prev.canvases,
			active: prev.active,
			doc: prev.canvases[prev.active],
			past: past.slice(0, -1),
			future: [{ canvases, active }, ...future],
			lastEdit: null,
			selectedCanvases: get().selectedCanvases.filter((i) => i < prev.canvases.length),
			...(prev.active !== active || selectedIds.some((id) => !prev.canvases[prev.active].layers.some((l) => l.id === id)) ? { selectedId: null, selectedIds: [] } : {}),
		});
	},
	redo: () => {
		const { past, canvases, active, future } = get();
		if (!future.length) return;
		const next = future[0];
		set({
			canvases: next.canvases,
			active: next.active,
			doc: next.canvases[next.active],
			past: [...past, { canvases, active }],
			future: future.slice(1),
			lastEdit: null,
			selectedCanvases: get().selectedCanvases.filter((i) => i < next.canvases.length),
			...(next.active !== active ? { selectedId: null, selectedIds: [] } : {}),
		});
	},
	loadDoc: (doc, saved = null) => get().loadProject({ name: doc.name || "Untitled", canvases: [doc] }, saved),
	loadProject: (project, saved = null) => {
		const canvases = project.canvases.map(sanitize);
		const active = Math.min(project.active ?? 0, canvases.length - 1);
		const { past, canvases: was, active: wasActive } = get();
		set({
			projectName: project.name || "Untitled",
			canvases,
			active,
			doc: canvases[active],
			past: [...past, { canvases: was, active: wasActive }].slice(-HISTORY_LIMIT),
			future: [],
			lastEdit: null,
			selectedId: null,
			selectedIds: [],
			time: 0,
			saved: saved ? { id: saved.id, canvases } : null,
		});
	},
	setProjectName: (projectName) => set({ projectName }),
	setActiveCanvas: (i) => {
		const { canvases, active } = get();
		if (i === active || !canvases[i]) return;
		// Switching canvases isn't an edit: no undo step.
		set({ active: i, doc: canvases[i], selectedId: null, selectedIds: [], hoverId: null });
	},
	addCanvas: (doc) => {
		const { canvases, doc: current } = get();
		const base: Doc = doc ?? { version: 1, name: "", scene: { ...current.scene }, layers: [] };
		const next = { ...base, name: uniqueName(canvases, base.name || `Canvas ${canvases.length + 1}`) };
		// A canvas placed at a spot freezes the others first, so the auto-placed ones don't shuffle.
		editProject(get, set, (cs) => ({ canvases: [...(next.board ? placeAll(cs) : cs), sanitize(next)], active: cs.length }));
	},
	duplicateCanvas: (i, to = i + 1, board) => {
		const src = get().canvases[i];
		if (!src) return;
		const copy: Doc = { ...src, name: uniqueName(get().canvases, `${src.name} copy`), layers: src.layers.map((l) => ({ ...l, id: newId() })), board };
		const at = Math.max(0, Math.min(get().canvases.length, to));
		editProject(get, set, (cs) => {
			const placed = board ? placeAll(cs) : cs;
			return { canvases: [...placed.slice(0, at), copy, ...placed.slice(at)], active: at };
		});
	},
	removeCanvas: (i) => {
		if (get().canvases.length <= 1) return;
		editProject(get, set, (cs, active) => {
			const canvases = cs.filter((_, j) => j !== i);
			return { canvases, active: Math.min(active > i || active === canvases.length ? active - 1 : active, canvases.length - 1) };
		});
		set({ selectedCanvases: [] });
	},
	removeSelectedCanvases: () => {
		const { selectedCanvases, canvases } = get();
		if (!selectedCanvases.length) return;
		if (selectedCanvases.length >= canvases.length) {
			get().showToast("A project needs at least one canvas");
			return;
		}
		const gone = new Set(selectedCanvases);
		editProject(get, set, (cs, active) => {
			const kept = cs.filter((_, j) => !gone.has(j));
			// Stay on the active canvas if it survives, else the nearest one before it.
			let next = active;
			while (next > 0 && gone.has(next)) next--;
			if (gone.has(next)) next = cs.findIndex((_, j) => !gone.has(j));
			return { canvases: kept, active: kept.indexOf(cs[next]) };
		});
		set({ selectedCanvases: [] });
	},
	snapping: localStorage.getItem("clueso-brand-lab:snap") !== "off",
	toggleSnapping: () => {
		const snapping = !get().snapping;
		localStorage.setItem("clueso-brand-lab:snap", snapping ? "on" : "off");
		set({ snapping });
		get().showToast(snapping ? "Snapping on" : "Snapping off");
	},
	hoverCanvas: null,
	setHoverCanvas: (hoverCanvas) => set({ hoverCanvas }),
	preview: null,
	setPreview: (preview) => set({ preview }),
	commandOpen: false,
	setCommandOpen: (commandOpen) => set({ commandOpen }),
	selectedCanvases: [],
	setCanvasSelected: (on) => set(on ? { selectedCanvases: [get().active], selectedId: null, selectedIds: [] } : { selectedCanvases: [] }),
	selectCanvases: (indices) => {
		const n = get().canvases.length;
		const selectedCanvases = [...new Set(indices)].filter((i) => i >= 0 && i < n).sort((a, b) => a - b);
		set(selectedCanvases.length ? { selectedCanvases, selectedId: null, selectedIds: [] } : { selectedCanvases });
	},
	moveCanvasOnBoard: (i, board) => get().moveCanvasesOnBoard({ [i]: board }),
	moveCanvasesOnBoard: (moves) => {
		const { canvases, active, past, lastEdit } = get();
		const ids = Object.keys(moves).map(Number);
		if (!ids.length || ids.some((i) => !canvases[i])) return;
		const now = performance.now();
		const key = `board:${ids.join(",")}`;
		const coalesce = lastEdit && lastEdit.key === key && now - lastEdit.at < COALESCE_MS;
		const next = placeAll(canvases).map((c, j) => (moves[j] ? { ...c, board: moves[j] } : c));
		set({
			canvases: next,
			doc: next[active],
			past: coalesce ? past : [...past, { canvases, active }].slice(-HISTORY_LIMIT),
			future: [],
			lastEdit: { key, at: now },
		});
	},
	renameCanvas: (i, name) => {
		const n = name.trim();
		if (!n || get().canvases[i]?.name === n) return;
		editProject(get, set, (cs, active) => ({ canvases: cs.map((c, j) => (j === i ? { ...c, name: n } : c)), active }));
	},
	moveCanvas: (from, to) => {
		if (from === to) return;
		editProject(get, set, (cs, active) => {
			const canvases = [...cs];
			const [c] = canvases.splice(from, 1);
			canvases.splice(to, 0, c);
			return { canvases, active: canvases.indexOf(cs[active]) };
		});
		set({ selectedCanvases: [] });
	},
	saveToLibrary: async ({ asNew = false, doc: target, name } = {}) => {
		const { doc: current, saved, time, canvases, active, projectName } = get();
		const doc = target ?? current;
		const now = Date.now();
		const linked = !target && !asNew && saved;
		const entry: LibraryEntry = {
			id: linked ? saved.id : newId(),
			name: name ?? (target ? doc.name : projectName) ?? "Untitled",
			doc,
			// The whole project when saving the open design; a single variation saves just itself.
			...(target ? {} : { project: { canvases, active } }),
			thumb: await renderThumb(doc, time),
			created: now,
			updated: now,
		};
		if (linked) entry.created = (await getEntry(saved.id))?.created ?? now;
		await putEntry(entry);
		// Saving the open project links it to the entry, so ⌘S afterwards updates it in place.
		if (!target) set({ saved: { id: entry.id, canvases } });
		get().showToast(linked ? "Saved changes to Library" : "Saved to Library");
		return entry;
	},
	setOverlay: (overlay) => set({ overlay }),
	savePalette: (def) => {
		const palettes = get().palettes;
		const exists = palettes.some((p) => p.id === def.id);
		const next = exists ? palettes.map((p) => (p.id === def.id ? def : p)) : [...palettes, def];
		set({ palettes: next });
		persistPalettes(next);
		// The open design follows edits to the palette it uses.
		// The open design follows edits to palettes it uses: the project palette and layer overrides.
		const { doc } = get();
		const sceneStale = doc.scene.paletteId === def.id && !samePalette(doc.scene.palette, def.colors);
		const layersStale = doc.layers.some((l) => l.paletteId === def.id && l.palette && !samePalette(l.palette, def.colors));
		if (sceneStale || layersStale) {
			get().commit((d) => {
				const next = sceneStale ? withPalette(d, def) : d;
				return { ...next, layers: next.layers.map((l) => (l.paletteId === def.id ? { ...l, palette: clonePalette(def.colors) } : l)) };
			}, `palette:${def.id}`);
		}
	},
	removePalette: (id) => {
		const def = get().palettes.find((p) => p.id === id);
		if (!def) return;
		if (def.builtIn) {
			// Built-ins can't be deleted, only reset to the original.
			const original = BUILT_IN_PALETTES.find((p) => p.id === id)!;
			get().savePalette({ ...original, colors: clonePalette(original.colors) });
			return;
		}
		const next = get().palettes.filter((p) => p.id !== id);
		set({ palettes: next });
		persistPalettes(next);
	},
	setLayerPalette: (layerId, paletteId) => {
		const def = paletteId ? get().palettes.find((p) => p.id === paletteId) : null;
		get().commit((doc) => ({
			...doc,
			layers: doc.layers.map((l) => {
				if (l.id !== layerId) return l;
				const { palette: _p, paletteId: _id, ...rest } = l;
				return def ? { ...rest, palette: clonePalette(def.colors), paletteId: def.id } : rest;
			}),
		}));
	},
	applyPalette: (id) => {
		const def = get().palettes.find((p) => p.id === id);
		// The project palette applies to every canvas.
		if (def) editProject(get, set, (cs, active) => ({ canvases: cs.map((c) => withPalette(c, def)), active }));
	},
	showToast: (toast) => {
		set({ toast });
		clearTimeout(toastTimer);
		toastTimer = window.setTimeout(() => set({ toast: null }), 1800);
	},

	addLayer: (type, opts = {}) => {
		const def = getDef(type);
		if (!def) return;
		const layer = createLayer(type, opts);
		const { selectedId } = get();
		get().commit((doc) => {
			const layers = [...doc.layers];
			layers.splice(insertAt(doc.layers, kindOf(def), selectedId), 0, layer);
			return { ...doc, layers };
		});
		set({ selectedId: layer.id, selectedIds: [layer.id] });
		// A new, empty image layer asks for its picture straight away (still inside the click that added it).
		if (type === "image" && !layer.params.src) {
			pickImageFile().then(async (file) => {
				if (file) await get().setImage(layer.id, await readImageFile(file));
			});
		}
	},
	removeLayer: (id) => {
		const { doc, selectedId } = get();
		const idx = doc.layers.findIndex((l) => l.id === id);
		if (idx < 0) return;
		get().commit((d) => ({ ...d, layers: d.layers.filter((l) => l.id !== id) }));
		if (selectedId === id) {
			const rest = get().doc.layers;
			const next = rest[Math.min(idx, rest.length - 1)]?.id ?? null;
			set({ selectedId: next, selectedIds: next ? [next] : [] });
		} else set({ selectedIds: get().selectedIds.filter((x) => x !== id) });
	},
	duplicateLayer: (id) => {
		const src = get().doc.layers.find((l) => l.id === id);
		if (!src) return;
		const copy: Layer = { ...src, id: newId(), name: `${src.name} copy`, params: { ...src.params } };
		get().commit((doc) => {
			const layers = [...doc.layers];
			layers.splice(layers.findIndex((l) => l.id === id), 0, copy);
			return { ...doc, layers };
		});
		set({ selectedId: copy.id, selectedIds: [copy.id] });
	},
	moveLayer: (from, to) => {
		if (from === to) return;
		get().commit((doc) => {
			const layers = [...doc.layers];
			const [l] = layers.splice(from, 1);
			layers.splice(to, 0, l);
			return { ...doc, layers };
		});
	},
	updateLayer: (id, patch, coalesceKey) =>
		get().commit((doc) => ({ ...doc, layers: doc.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)) }), coalesceKey),
	setParam: (id, key, value) =>
		get().commit(
			(doc) => ({
				...doc,
				layers: doc.layers.map((l) => {
					if (l.id !== id) return l;
					const params = { ...l.params, [key]: value };
					const hook = getDef(l.type)?.onParamChange;
					return { ...l, params: hook ? hook(key, value, params) : params };
				}),
			}),
			`${id}:${key}`,
		),
	addEffect: (layerId, type) => {
		const fx = createLayer(type);
		const effect: LayerEffect = { id: fx.id, type, visible: true, params: fx.params };
		get().commit((doc) => ({ ...doc, layers: doc.layers.map((l) => (l.id === layerId ? { ...l, effects: [effect, ...(l.effects ?? [])] } : l)) }));
	},
	updateEffect: (layerId, effectId, patch, coalesceKey) =>
		get().commit(
			(doc) => ({
				...doc,
				layers: doc.layers.map((l) => (l.id === layerId ? { ...l, effects: (l.effects ?? []).map((e) => (e.id === effectId ? { ...e, ...patch } : e)) } : l)),
			}),
			coalesceKey,
		),
	removeEffect: (layerId, effectId) =>
		get().commit((doc) => ({ ...doc, layers: doc.layers.map((l) => (l.id === layerId ? { ...l, effects: (l.effects ?? []).filter((e) => e.id !== effectId) } : l)) })),
	moveEffect: (layerId, effectId, dir) =>
		get().commit((doc) => ({
			...doc,
			layers: doc.layers.map((l) => {
				if (l.id !== layerId || !l.effects) return l;
				const i = l.effects.findIndex((e) => e.id === effectId);
				const j = i + dir;
				if (i < 0 || j < 0 || j >= l.effects.length) return l;
				const effects = [...l.effects];
				[effects[i], effects[j]] = [effects[j], effects[i]];
				return { ...l, effects };
			}),
		})),
	applyLookTo: (lookId, targetId) => {
		const layers = get().doc.layers;
		const i = layers.findIndex((l) => l.id === lookId);
		const look = layers[i];
		if (!look || getDef(look.type)?.kind !== "effect") return;
		const target = targetId ? layers.find((l) => l.id === targetId) : layers.slice(i + 1).find((l) => l.visible && getDef(l.type)?.kind === "source");
		if (!target) return;
		const effect: LayerEffect = { id: look.id, type: look.type, visible: look.visible, params: look.params };
		get().commit((doc) => ({
			...doc,
			layers: doc.layers.filter((l) => l.id !== lookId).map((l) => (l.id === target.id ? { ...l, effects: [effect, ...(l.effects ?? [])] } : l)),
		}));
		set({ selectedId: target.id, selectedIds: [target.id] });
		get().showToast(`${look.name} now applies only to ${target.name}`);
	},
	liftEffect: (layerId, effectId) => {
		const layer = get().doc.layers.find((l) => l.id === layerId);
		const effect = layer?.effects?.find((e) => e.id === effectId);
		if (!layer || !effect) return;
		const look = createLayer(effect.type, { params: effect.params, visible: effect.visible });
		get().commit((doc) => {
			const layers = doc.layers.map((l) => (l.id === layerId ? { ...l, effects: (l.effects ?? []).filter((e) => e.id !== effectId) } : l));
			layers.splice(layers.findIndex((l) => l.id === layerId), 0, look);
			return { ...doc, layers };
		});
		set({ selectedId: look.id, selectedIds: [look.id] });
		get().showToast(`${look.name} now applies to everything below`);
	},
	setImage: async (id, src) => {
		const empty = !get().doc.layers.find((l) => l.id === id)?.params.src;
		// A new picture starts uncropped.
		const patch = empty ? await fitInside(src, get().doc.scene) : { src, cropL: 0, cropT: 0, cropR: 0, cropB: 0 };
		if (get().doc.layers.some((l) => l.id === id)) get().patchLayers({ [id]: patch });
	},
	swapLayerType: (id, type) => {
		const def = getDef(type);
		if (!def) return;
		get().commit((doc) => ({
			...doc,
			layers: doc.layers.map((l) => {
				if (l.id !== id) return l;
				const fresh = createLayer(type);
				const oldDef = getDef(l.type);
				// Same key and same kind of control (an angle, an amount, a colour) carries over.
				const kinds = new Map(oldDef ? allParams(oldDef).map((p) => [p.key, p.type]) : []);
				const kept = Object.fromEntries(allParams(def).filter((p) => kinds.get(p.key) === p.type && l.params[p.key] !== undefined).map((p) => [p.key, l.params[p.key]]));
				return {
					...l,
					type,
					name: l.name === oldDef?.label ? def.label : l.name,
					params: { ...fresh.params, ...kept },
				};
			}),
		}));
	},
	setScene: (patch, coalesceKey) => get().commit((doc) => ({ ...doc, scene: { ...doc.scene, ...patch } }), coalesceKey),
	select: (id, mode = "replace") => {
		if (id) set({ selectedCanvases: [] });
		const { selectedIds, selectedId, doc } = get();
		if (!id) return set({ selectedId: null, selectedIds: [] });
		let ids = [id];
		if (mode === "toggle") ids = selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id];
		if (mode === "range" && selectedId) {
			const order = doc.layers.map((l) => l.id);
			const [a, b] = [order.indexOf(selectedId), order.indexOf(id)].sort((x, y) => x - y);
			ids = [...new Set([...selectedIds, ...order.slice(a, b + 1)])];
		}
		const primary = ids.includes(id) ? id : (ids[ids.length - 1] ?? null);
		set({ selectedIds: ids, selectedId: primary });
	},
	selectMany: (ids) => set({ selectedIds: ids, selectedId: ids[ids.length - 1] ?? null }),
	setHover: (hoverId) => get().hoverId !== hoverId && set({ hoverId }),
	setEditingText: (editingTextId) => set({ editingTextId }),
	setTool: (tool) => set({ tool }),
	openMenu: (x, y) => set({ menu: { x, y } }),
	closeMenu: () => set({ menu: null }),
	arrange: (dir) => {
		const ids = new Set(get().selectedIds);
		if (!ids.size) return;
		get().commit((doc) => {
			// Layers are listed top first: "front" is index 0.
			const layers = [...doc.layers];
			const picked = layers.filter((l) => ids.has(l.id));
			const rest = layers.filter((l) => !ids.has(l.id));
			if (dir === "front") return { ...doc, layers: [...picked, ...rest] };
			if (dir === "back") return { ...doc, layers: [...rest, ...picked] };
			// One step: each selected layer swaps with its unselected neighbour.
			const step = dir === "forward" ? -1 : 1;
			const order = dir === "forward" ? layers.map((_, i) => i) : layers.map((_, i) => layers.length - 1 - i);
			for (const i of order) {
				const j = i + step;
				if (!ids.has(layers[i].id) || j < 0 || j >= layers.length || ids.has(layers[j].id)) continue;
				[layers[i], layers[j]] = [layers[j], layers[i]];
			}
			return { ...doc, layers };
		});
	},
	removeSelected: () => {
		const ids = new Set(get().selectedIds);
		if (!ids.size) return;
		get().commit((doc) => ({ ...doc, layers: doc.layers.filter((l) => !ids.has(l.id)) }));
		set({ selectedIds: [], selectedId: null });
	},
	duplicateSelected: () => {
		const ids = new Set(get().selectedIds);
		if (!ids.size) return;
		const copies: string[] = [];
		get().commit((doc) => ({
			...doc,
			layers: doc.layers.flatMap((l) => {
				if (!ids.has(l.id)) return [l];
				const copy: Layer = { ...l, id: newId(), name: `${l.name} copy`, params: { ...l.params } };
				copies.push(copy.id);
				return [copy, l];
			}),
		}));
		get().selectMany(copies);
	},
	copySelected: () => {
		const ids = new Set(get().selectedIds);
		clipboard = get().doc.layers.filter((l) => ids.has(l.id));
		if (!clipboard.length) return;
		get().showToast(`Copied ${clipboard.length} layer${clipboard.length > 1 ? "s" : ""}`);
		// Mark the system clipboard, so ⌘V knows these layers are newer than any outside text or image.
		navigator.clipboard?.writeText(LAYER_CLIP_MARK).catch(() => {});
	},
	paste: () => {
		if (!clipboard.length) return;
		const copies = clipboard.map((l) => ({ ...l, id: newId(), params: { ...l.params } }));
		const { selectedId } = get();
		get().commit((doc) => {
			const at = Math.max(0, doc.layers.findIndex((l) => l.id === selectedId));
			const layers = [...doc.layers];
			layers.splice(at, 0, ...copies);
			return { ...doc, layers };
		});
		get().selectMany(copies.map((l) => l.id));
	},
	toggleLocked: (ids = get().selectedIds) => {
		const set1 = new Set(ids);
		const lock = get().doc.layers.some((l) => set1.has(l.id) && !l.locked);
		get().commit((doc) => ({ ...doc, layers: doc.layers.map((l) => (set1.has(l.id) ? { ...l, locked: lock } : l)) }));
	},
	toggleVisible: (ids = get().selectedIds) => {
		const set1 = new Set(ids);
		const show = get().doc.layers.some((l) => set1.has(l.id) && !l.visible);
		get().commit((doc) => ({ ...doc, layers: doc.layers.map((l) => (set1.has(l.id) ? { ...l, visible: show } : l)) }));
	},
	patchLayers: (patches, coalesceKey) =>
		get().commit((doc) => ({ ...doc, layers: doc.layers.map((l) => (patches[l.id] ? { ...l, params: { ...l.params, ...patches[l.id] } } : l)) }), coalesceKey),
	shuffleAll: (mode = get().shuffleMode) => {
		const rng = mulberry32((Math.random() * 2 ** 32) >>> 0);
		// A shuffle changes what's on the canvas, never its name.
		get().commit((doc) => ({ ...vary(doc, mode, rng), name: doc.name }));
		// Whole-doc shuffles replace the layers, so the old selection would point at nothing.
		if (mode === "pattern" || mode === "poster" || mode === "everything") set({ selectedId: null, selectedIds: [] });
	},
	setShuffleMode: (shuffleMode) => {
		localStorage.setItem("clueso-brand-lab:shuffle", shuffleMode);
		set({ shuffleMode });
	},
	shuffleLayer: (id) => {
		const rng = mulberry32((Math.random() * 2 ** 32) >>> 0);
		get().commit((doc) => ({ ...doc, layers: doc.layers.map((l) => (l.id === id ? shuffleParams(l, rng) : l)) }));
	},

	setTime: (time) => set({ time }),
	setPlaying: (playing) => set({ playing }),
	setZoom: (zoom) => set({ zoom }),
	setTheme: (theme) => {
		if (!EMBED) localStorage.setItem("clueso-brand-lab:theme", theme); // clueso.design: see EMBED
		set({ theme });
	},
}));

/** A project-level edit (canvases added, removed, renamed, reordered…) as one undo step. */
function editProject(get: () => State, set: (p: Partial<State>) => void, recipe: (canvases: Doc[], active: number) => Snap) {
	const { canvases, active, past } = get();
	const next = recipe(canvases, active);
	const switched = next.active !== active;
	set({
		canvases: next.canvases,
		active: next.active,
		doc: next.canvases[next.active],
		past: [...past, { canvases, active }].slice(-HISTORY_LIMIT),
		future: [],
		lastEdit: null,
		...(switched ? { selectedId: null, selectedIds: [] } : {}),
	});
}

let saveTimer: number | undefined;
useStore.subscribe((s, prev) => {
	if (EMBED) return; // clueso.design: see EMBED
	if (s.canvases === prev.canvases && s.projectName === prev.projectName && s.active === prev.active) return;
	clearTimeout(saveTimer);
	saveTimer = window.setTimeout(() => {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: s.projectName, canvases: s.canvases, active: s.active }));
		} catch {
			// Large embedded images can exceed the quota; the session still works.
		}
	}, 400);
});

export const selectedLayer = (s: State) => s.doc.layers.find((l) => l.id === s.selectedId) ?? null;

if (process.env.NODE_ENV !== "production") (window as unknown as { __store: typeof useStore }).__store = useStore;
