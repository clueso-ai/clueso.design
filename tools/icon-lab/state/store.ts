import { create } from "zustand";
import { resolvedTheme } from "@/lib/theme";
import { compose, findExisting } from "../engine/compose";
import { applyEditablePaths, buildSvg, editablePaths } from "../engine/engine";
import { iconFrom, recognise, type Stroke } from "../engine/sketch";
import type { DrawOptions, Icon, Pt, Subpath } from "../engine/types";
import {
	applyOption,
	editKey,
	familyRank,
	firstLibraryIcon,
	inTab,
	loadEdits,
	loadGenerated,
	ofStyle,
	pixelIcons,
	pretty,
	saveVariant,
	signatureOf,
	snapshot,
} from "./sets";
import { EMBED, KEYS, storage, writeJSON } from "./storage";

// Icon Lab's state and actions, ported from the standalone app's app.js. Icons are mutable objects
// (see sets.ts): actions change them in place, then bump `rev` (the artboard) or `libRev` (the
// library and anything that lists icons) so React redraws.

export type Mode = "web" | "platform" | "pixel" | "generated";
export type Theme = "light" | "dark";

interface Handle {
	kind: "anchor" | "ctrl";
	pt: Pt;
	anchor?: Pt;
	linked: Pt[];
}

/** While editing the current icon's vector: its paths, the handles, the selection and the drag. */
export interface EditState {
	paths: Subpath[][];
	handles: Handle[];
	sel: Set<number>;
	drag: { origin: Pt; press: Pt; start: Map<Pt, Pt> } | null;
	box: { x0: number; y0: number; x1: number; y1: number; add: Set<number> } | null;
}

export interface TrayAction {
	label: string;
	primary?: boolean;
	/** The Keep button: it reads "Kept in Generated" and turns off once kept. */
	keep?: boolean;
	run: () => void;
}

/** The tray above the prompt: what search, compose or a drawing found, and what to do next. */
export interface Tray {
	title: string;
	question?: string;
	/** A small heading above the chips. */
	sub?: string;
	chips?: Icon[];
	small?: boolean;
	sel: number | null;
	onPick?: (icon: Icon) => void;
	note?: string;
	actions: TrayAction[];
	kept?: boolean;
}

interface State {
	style: "line" | "solid";
	mode: Mode;
	round: number;
	stroke: number;
	color: string;
	showGoogle: boolean;
	showGrid: boolean;
	/** Signature option on show: "" (base), "A" or "B". */
	sig: string;
	/** Pixel icons: pixel size in the cell (1 = touching). */
	pixelSize: number;
	/** Pixel icons: "matrix", "dots" (two weights), "line" or "solid". */
	pixelBuild: string;
	/** Pixel icons: corner radius of each pixel. */
	pixelRadius: number;
	current: Icon;
	generated: Icon[];
	/** The Generated tab shows once something is kept. */
	showGenerated: boolean;
	pane: "icon" | "context";
	/** Context: where the before / after sliders sit (0–100, % from the left). */
	ctxX: number;
	edit: EditState | null;
	status: { text: string; error?: boolean } | null;
	theme: Theme;
	connected: boolean;
	tray: Tray | null;
	dialog: null | "key" | "request" | "context";
	/** What the request dialog opens with. */
	requestName: string;
	sketch: { strokes: Stroke[]; live: Stroke | null };
	rev: number;
	libRev: number;
}

interface Actions {
	select: (icon?: Icon) => void;
	setMode: (mode: Mode) => void;
	setSignature: (key: string) => void;
	setPane: (pane: "icon" | "context") => void;
	set: (patch: Partial<Pick<State, "round" | "stroke" | "color" | "pixelSize" | "pixelBuild" | "pixelRadius" | "showGrid" | "showGoogle">>) => void;
	/** Every before / after slider moves together and keeps its place as you change icons. */
	setCtxX: (x: number) => void;
	setStatus: (text: string, error?: boolean) => void;
	setTheme: (theme: Theme, save?: boolean) => void;
	toggleTheme: () => void;
	chooseOption: (option: Icon) => void;
	startEditing: () => void;
	stopEditing: () => void;
	resetIcon: () => void;
	editDown: (p: Pt, handle: number | null, shift: boolean) => void;
	editMove: (p: Pt, alt: boolean) => void;
	editUp: () => void;
	editKey: (e: KeyboardEvent) => boolean;
	removeCurrent: () => void;
	prompt: (text: string) => void;
	pickChip: (i: number) => void;
	closeTray: () => void;
	sketchStart: (p: Pt) => void;
	sketchMove: (p: Pt) => void;
	sketchEnd: () => void;
	clearSketch: () => void;
	openDialog: (dialog: State["dialog"], requestName?: string) => void;
	saveKey: (key: string) => void;
	removeKey: () => void;
}

export type Store = State & Actions;

export const apiKey = () => storage.getItem(KEYS.key) || "";
const themeDefault = (t: Theme) => (t === "dark" ? "#f5f3e7" : "#111111");

function initialTheme(): Theme {
	// The embed starts opposite the homepage's theme, like the homepage asks, until it says otherwise.
	if (EMBED) return resolvedTheme() === "dark" ? "light" : "dark";
	const v = storage.getItem(KEYS.theme);
	return v === "light" || v === "dark" ? v : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** The current drawing options: what the panel's controls say. */
export const drawOptions = (s: State): DrawOptions => ({ stroke: s.stroke, round: s.round, color: s.color, pixelSize: s.pixelSize, pixelRadius: s.pixelRadius, pixelBuild: s.pixelBuild });
export const currentSvg = (s: State) => buildSvg(s.current, drawOptions(s));
/** The icon (with the current stroke, corners and option) at an exact pixel size. */
export const sizedSvg = (s: State, icon: Icon, size: number, color: string, extra: DrawOptions = {}) =>
	buildSvg(icon, { ...drawOptions(s), color, ...extra }).replace(/^<svg([^>]*?) width="[\d.]+" height="[\d.]+"/, `<svg$1 width="${size}" height="${size}"`);

export function visibleIcons(s: State): Icon[] {
	if (s.mode === "generated") return s.generated.filter((i) => i.style === s.style);
	if (s.mode === "pixel") return pixelIcons;
	if (s.sig) return signatureOf(s.sig).icons;
	return ofStyle(s.style)
		.filter((i) => inTab(i, s.mode))
		.sort((a, b) => familyRank(a) - familyRank(b));
}

function buildHandles(paths: Subpath[][]) {
	const handles: Handle[] = [];
	const seen = new Set<Pt>();
	paths.forEach((subs) =>
		subs.forEach((sp) => {
			const anchors = [sp.start, ...sp.segs.map((s) => s.to)];
			for (const a of anchors) {
				if (seen.has(a)) continue;
				seen.add(a);
				// Curve handles that belong to this anchor move with it.
				const linked: Pt[] = [];
				for (const s of sp.segs) {
					if (s.t !== "C") continue;
					if (s.from === a) linked.push(s.c1!);
					if (s.to === a) linked.push(s.c2!);
				}
				handles.push({ kind: "anchor", pt: a, linked });
			}
			for (const s of sp.segs) {
				if (s.t !== "C") continue;
				handles.push({ kind: "ctrl", pt: s.c1!, anchor: s.from, linked: [] });
				handles.push({ kind: "ctrl", pt: s.c2!, anchor: s.to, linked: [] });
			}
		}),
	);
	return handles;
}

// Every point the selection moves, each once: the selected handles, plus the curve handles that ride
// along with selected anchors.
function selectedPoints(edit: EditState) {
	const pts = new Set<Pt>();
	for (const i of edit.sel) {
		const h = edit.handles[i];
		pts.add(h.pt);
		h.linked.forEach((c) => pts.add(c));
	}
	return [...pts];
}

const theme0 = initialTheme();

export const useIconLab = create<Store>((set, get) => {
	const bump = (lib = false) => set((s) => ({ rev: s.rev + 1, ...(lib ? { libRev: s.libRev + 1 } : {}) }));
	const setStatus = (text: string, error = false) => set({ status: text ? { text, error } : null });

	function saveGenerated(list = get().generated) {
		if (!writeJSON(KEYS.generated, list)) setStatus("Could not save generated icons in this browser.", true);
	}

	function saveEdit(icon: Icon) {
		if (icon.generated) {
			saveGenerated();
			return;
		}
		const edits = loadEdits();
		if (icon.edited) edits[editKey(icon)] = icon.body;
		else delete edits[editKey(icon)];
		if (!writeJSON(KEYS.edits, edits)) setStatus("Could not save the edit in this browser.", true);
	}

	function select(icon?: Icon) {
		const s = get();
		const target = icon || firstLibraryIcon(s.style);
		set((st) => ({ current: target, style: target.style, status: null, rev: st.rev + 1, libRev: st.libRev + 1, ...(target !== s.current ? { edit: null } : {}) }));
	}

	function moveSelection(dx: number, dy: number, from?: Map<Pt, Pt>) {
		const { edit, current } = get();
		if (!edit) return;
		const pts = selectedPoints(edit);
		const start = from || new Map(pts.map((p): [Pt, Pt] => [p, [p[0], p[1]]]));
		for (const p of pts) {
			const s0 = start.get(p)!;
			p[0] = s0[0] + dx;
			p[1] = s0[1] + dy;
		}
		applyEditablePaths(current, edit.paths);
		bump();
	}

	function commitEdit() {
		saveEdit(get().current);
		bump(true);
	}

	function startEditing() {
		const icon = get().current;
		if (!icon.original) icon.original = snapshot(icon);
		const paths = editablePaths(icon);
		set({ edit: { paths, handles: buildHandles(paths), sel: new Set(), drag: null, box: null } });
		bump();
	}

	function stopEditing() {
		if (!get().edit) return;
		set({ edit: null });
		bump();
	}

	function trayShow(tray: Omit<Tray, "sel" | "actions"> & { sel?: number | null; actions?: TrayAction[] }) {
		set({ tray: { sel: null, actions: [], ...tray } });
	}

	// Show a set icon in its own tab (Web / Platform), like a library click.
	function showIcon(icon: Icon) {
		const s = get();
		if (!icon.composed && !icon.pixel) {
			const sig = s.sig && signatureOf(s.sig).icons.some((i) => i.name === icon.name) ? s.sig : "";
			const mode = s.mode === "pixel" || s.mode === "generated" || !inTab(icon, s.mode) ? (icon.platform === true ? "platform" : "web") : s.mode;
			set({ sig, mode });
		}
		select(icon);
	}

	/** Keep the icon on the artboard under Generated (a composed option or a drawing). */
	function keep(icon: Icon | null) {
		if (!icon) return;
		const kept: Icon = { ...icon, generated: true };
		delete kept.options;
		const generated = [...get().generated, kept];
		set((s) => ({ generated, showGenerated: true, tray: s.tray && { ...s.tray, kept: true }, libRev: s.libRev + 1 }));
		saveGenerated(generated);
	}

	let sketchTimer = 0;
	const clearSketch = () => {
		clearTimeout(sketchTimer);
		set({ sketch: { strokes: [], live: null } });
	};
	const clearAndClose = () => {
		clearSketch();
		set({ tray: null });
	};

	function byName(n: string) {
		return ofStyle("line").find((i) => i.name === n);
	}

	// ---- One prompt (round 23): find it, or offer to create it ---------------------------------
	// 1. The set already has it (every word of the prompt is covered): show it on the artboard, with
	//    other drawings that also match.
	// 2. It doesn't: say so, show the closest drawings, and ask "Create it?". Yes composes it from the
	//    set's parts (engine/compose.ts, no API); the options open here; Keep saves one under Generated.
	// 3. It can't be built from parts: offer to request it from the design team.
	// In the Pixel tab the pixel icons are searched first.
	function askFor(prompt: string) {
		if (get().mode === "pixel") {
			const q = prompt.toLowerCase();
			const hit = pixelIcons.find((i) => i.name === q || i.name.includes(q) || (i.keywords || []).some((k) => k.includes(q)));
			if (hit) {
				select(hit);
				trayShow({ title: `In the pixel set: ${pretty(hit.name)}` });
				return;
			}
		}
		const found = findExisting(prompt);
		const exact = found.exact.map(byName).filter((i): i is Icon => !!i);
		if (exact.length) {
			showIcon(exact[0]);
			trayShow({
				title: exact.length > 1 ? `In the set: ${pretty(exact[0].name)} and ${exact.length - 1} more` : `In the set: ${pretty(exact[0].name)}`,
				...(exact.length > 1 ? { chips: exact.slice(0, 6), sel: 0, onPick: showIcon } : {}),
			});
			return;
		}
		const near = found.near.map(byName).filter((i): i is Icon => !!i);
		const plan = compose(prompt);
		const buildable = plan.options.some((o) => !o.existing);
		trayShow({
			title: `“${prompt}” doesn't exist in the set yet.`,
			question: buildable ? "Do you want me to create it? It will be built from parts of the set (its shapes and badges), in the same style." : "It can’t be built from the set’s parts. You can request it from the design team.",
			...(near.length ? { sub: "Closest in the set", chips: near.slice(0, 6), small: true, onPick: showIcon } : {}),
			actions: [
				...(buildable ? [{ label: "Yes, create it", primary: true, run: () => createFrom(prompt, plan) }] : []),
				{ label: "Request it from the design team", run: () => get().openDialog("request", prompt) },
			],
		});
	}

	function createFrom(prompt: string, plan: ReturnType<typeof compose>) {
		const options = plan.options.filter((o) => !o.existing);
		const list = options.map((o) => Object.assign(o.icon, { label: o.label }));
		const pick = (icon: Icon) => {
			const done = get().generated.some((g) => g.name === icon.name && g.body === icon.body);
			set((s) => ({ tray: s.tray && { ...s.tray, kept: done } }));
			select(icon);
		};
		trayShow({
			title: `${options.length} option${options.length === 1 ? "" : "s"} for “${prompt}”`,
			chips: list,
			note: plan.note || undefined,
			onPick: pick,
			actions: [{ label: "Keep in Generated", primary: true, keep: true, run: () => (get().current.composed ? keep(get().current) : undefined) }],
		});
		if (list.length) {
			set((s) => ({ tray: s.tray && { ...s.tray, sel: 0 } }));
			pick(list[0]);
		}
	}

	// ---- Draw to find or create (round 26) ------------------------------------------
	// In the Icon tab the canvas around the artboard is a dotted grid. A short pause after the last
	// stroke and the drawing is matched against the whole set (engine/sketch.ts): close matches open in
	// the tray; if nothing is close, the drawing itself can become an icon in our style.
	function recogniseSketch() {
		const { strokes } = get().sketch;
		if (!strokes.length) return;
		const pool = ofStyle("line").filter((i) => !i.googleOnly);
		const ranked = recognise(strokes, pool);
		const best = ranked[0] ? ranked[0].score : 0;
		const close = ranked
			.filter((r) => r.score >= Math.max(0.62, best - 0.06))
			.slice(0, 6)
			.map((r) => r.icon);
		const near = ranked.slice(0, 4).map((r) => r.icon);
		const drawn = iconFrom(strokes, `drawn-${Date.now().toString(36)}`);
		const make = () => {
			trayShow({
				title: "Your drawing, in our style",
				chips: [Object.assign(drawn, { label: "From your drawing" })],
				onPick: (ic) => select(ic),
				actions: [
					{ label: "Keep in Generated", primary: true, keep: true, run: () => keep(drawn) },
					{ label: "Clear the drawing", run: clearAndClose },
				],
			});
			select(drawn);
		};
		if (close.length && best >= 0.62) {
			trayShow({
				title: close.length > 1 ? "Looks like one of these" : `Looks like ${pretty(close[0].name)}`,
				chips: close,
				sel: 0,
				onPick: showIcon,
				actions: [
					{ label: "None of these: create it from my drawing", run: make },
					{ label: "Clear the drawing", run: clearAndClose },
				],
			});
			showIcon(close[0]);
		} else {
			trayShow({
				title: "That isn’t in the set yet. Create it from your drawing?",
				sub: "Closest in the set",
				chips: near,
				small: true,
				onPick: showIcon,
				actions: [
					{ label: "Yes, create it", primary: true, run: make },
					{ label: "Clear the drawing", run: clearAndClose },
				],
			});
		}
	}

	return {
		style: "line",
		mode: "web",
		round: 0,
		stroke: 1.5,
		color: themeDefault(theme0),
		showGoogle: false,
		showGrid: true,
		sig: "",
		pixelSize: 0.8,
		pixelBuild: "matrix",
		pixelRadius: 0,
		current: firstLibraryIcon("line"),
		generated: loadGenerated(),
		showGenerated: loadGenerated().length > 0,
		pane: "icon",
		ctxX: 25,
		edit: null,
		status: null,
		theme: theme0,
		connected: Boolean(apiKey()),
		tray: null,
		dialog: null,
		requestName: "",
		sketch: { strokes: [], live: null },
		rev: 0,
		libRev: 0,

		select,
		setStatus,

		setMode: (mode) => {
			const s = get();
			const was = s.mode;
			const patch: Partial<State> = { mode };
			if (mode !== "pixel") patch.style = "line";
			if (mode === "pixel" || was === "pixel" || mode === "generated" || was === "generated" || s.sig) {
				// Web and Platform show the base set; Pixel its own icons.
				if (mode !== "pixel") patch.sig = "";
				set(patch);
				select(visibleIcons(get())[0]);
				return;
			}
			set((st) => ({ ...patch, libRev: st.libRev + 1 }));
		},

		// Signature option: show its sample icons (and select the one in view, if it's in the sample).
		setSignature: (key) => {
			const s = get();
			set({ sig: key, style: "line", ...(s.mode === "pixel" ? { mode: "web" as Mode } : {}) });
			const list = visibleIcons(get());
			select(list.find((i) => i.name === s.current.name) || list[0]);
		},

		setPane: (pane) => {
			set({ pane });
			if (pane === "context") stopEditing();
		},

		set: (patch) => set((s) => ({ ...patch, rev: s.rev + 1, libRev: s.libRev + 1 })),
		setCtxX: (x) => set({ ctxX: Math.max(0, Math.min(100, x)) }),

		// Light or dark, shared with the site. The artboard follows the theme, and so does the default
		// ink: off-white on dark, ink on light. A colour you picked yourself stays.
		setTheme: (theme, save = false) => {
			if (save) {
				try {
					storage.setItem(KEYS.theme, theme);
				} catch {
					// not saved
				}
			}
			const other = themeDefault(theme === "dark" ? "light" : "dark");
			set((s) => ({ theme, ...(s.color.toLowerCase() === other ? { color: themeDefault(theme) } : {}), rev: s.rev + 1, libRev: s.libRev + 1 }));
		},
		toggleTheme: () => get().setTheme(get().theme === "dark" ? "light" : "dark", true),

		chooseOption: (option) => {
			// Signature samples: swap the option into its sample list (not saved; it's for comparing).
			if (option.signature) {
				const list = signatureOf(option.signature).icons;
				const i = list.findIndex((x) => x.name === option.name);
				if (i >= 0) list[i] = option;
			} else {
				applyOption(option.name, option.variant);
				saveVariant(option.name, option.variant);
			}
			stopEditing();
			select(option);
		},

		startEditing,
		stopEditing,

		resetIcon: () => {
			const icon = get().current;
			if (!icon.original) return;
			Object.assign(icon, { ...icon.original, box: { ...icon.original.box }, edited: false });
			saveEdit(icon);
			const editing = Boolean(get().edit);
			stopEditing();
			if (editing) startEditing();
			setStatus(`Reset ${icon.name} to its original`);
			bump(true);
		},

		// Click a point to select it; Shift-click adds or removes; drag on empty space draws a box
		// (Shift adds to the selection). Dragging any selected point moves them all.
		editDown: (p, handle, shift) => {
			const { edit } = get();
			if (!edit) return;
			if (handle === null) {
				if (!shift) edit.sel = new Set();
				edit.box = { x0: p[0], y0: p[1], x1: p[0], y1: p[1], add: new Set(edit.sel) };
				bump();
				return;
			}
			if (shift) {
				if (edit.sel.has(handle)) edit.sel.delete(handle);
				else edit.sel.add(handle);
				bump();
				return;
			}
			if (!edit.sel.has(handle)) edit.sel = new Set([handle]);
			const h = edit.handles[handle];
			const pts = selectedPoints(edit);
			edit.drag = { origin: [h.pt[0], h.pt[1]], press: p, start: new Map(pts.map((q): [Pt, Pt] => [q, [q[0], q[1]]])) };
			bump();
		},
		editMove: (p, alt) => {
			const { edit } = get();
			if (!edit) return;
			if (edit.box) {
				const b = edit.box;
				b.x1 = p[0];
				b.y1 = p[1];
				const [xa, xb] = [Math.min(b.x0, b.x1), Math.max(b.x0, b.x1)];
				const [ya, yb] = [Math.min(b.y0, b.y1), Math.max(b.y0, b.y1)];
				edit.sel = new Set(b.add);
				edit.handles.forEach((h, i) => {
					if (h.pt[0] >= xa && h.pt[0] <= xb && h.pt[1] >= ya && h.pt[1] <= yb) edit.sel.add(i);
				});
				bump();
				return;
			}
			const d = edit.drag;
			if (!d) return;
			// The point under the pointer snaps to ¼ (Alt: free); the rest move by the same amount.
			const snap = (v: number) => (alt ? Math.round(v * 100) / 100 : Math.round(v * 4) / 4);
			const x = snap(d.origin[0] + p[0] - d.press[0]);
			const y = snap(d.origin[1] + p[1] - d.press[1]);
			moveSelection(x - d.origin[0], y - d.origin[1], d.start);
		},
		editUp: () => {
			const { edit } = get();
			if (!edit) return;
			if (edit.box) {
				edit.box = null;
				bump();
				return;
			}
			if (!edit.drag) return;
			edit.drag = null;
			commitEdit();
		},
		// Esc stops, ⌘A selects every point, arrows nudge ¼ (Shift: 1). True when the key was used.
		editKey: (e) => {
			const { edit } = get();
			if (!edit) return false;
			if (e.key === "Escape") {
				stopEditing();
				return true;
			}
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a") {
				e.preventDefault();
				edit.sel = new Set(edit.handles.map((_h, i) => i).filter((i) => edit.handles[i].kind === "anchor"));
				bump();
				return true;
			}
			if (!edit.sel.size) return false;
			const step = e.shiftKey ? 1 : 0.25;
			const d = ({ ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] } as Record<string, number[]>)[e.key];
			if (!d) return false;
			e.preventDefault();
			moveSelection(d[0], d[1]);
			commitEdit();
			return true;
		},

		removeCurrent: () => {
			const s = get();
			const icon = s.current;
			if (!icon.generated) return;
			const list = s.generated.filter((i) => i.style === icon.style);
			const next = list[list.indexOf(icon) + 1] || list[list.indexOf(icon) - 1];
			const generated = s.generated.filter((i) => i !== icon);
			set({ generated });
			saveGenerated(generated);
			select(next);
			setStatus(`Removed ${icon.name}`);
		},

		prompt: (text) => {
			if (!text.trim()) {
				setStatus("Type the icon you need.", true);
				return;
			}
			askFor(text.trim());
		},
		pickChip: (i) => {
			const tray = get().tray;
			if (!tray?.chips?.[i]) return;
			set({ tray: { ...tray, sel: i } });
			tray.onPick?.(tray.chips[i]);
		},
		closeTray: clearAndClose,

		sketchStart: (p) => {
			clearTimeout(sketchTimer);
			set((s) => ({ sketch: { ...s.sketch, live: [p] } }));
		},
		sketchMove: (p) => {
			const { live, strokes } = get().sketch;
			if (!live) return;
			const l = live[live.length - 1];
			if (Math.hypot(p[0] - l[0], p[1] - l[1]) >= 2) set({ sketch: { strokes, live: [...live, p] } });
		},
		sketchEnd: () => {
			const { live, strokes } = get().sketch;
			if (!live) return;
			set({ sketch: { strokes: [...strokes, live], live: null } });
			clearTimeout(sketchTimer);
			sketchTimer = window.setTimeout(recogniseSketch, 750);
		},
		clearSketch,

		openDialog: (dialog, requestName) => set({ dialog, ...(requestName !== undefined ? { requestName } : {}) }),

		saveKey: (key) => {
			storage.setItem(KEYS.key, key);
			set({ connected: true });
			setStatus("Claude connected. Prompts now draw new icons.");
		},
		removeKey: () => {
			storage.removeItem(KEYS.key);
			set({ connected: false });
			setStatus("Claude disconnected. Prompts search the library.");
		},
	};
});
