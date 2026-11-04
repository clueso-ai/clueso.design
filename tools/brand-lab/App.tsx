import { useCallback, useEffect, useState } from "react";
import { readJSON } from "./export";
import { createLayer, getDef } from "./layers/registry";
import type { Params } from "./layers/types";
import { ALIGN_KEYS, alignSelection } from "./state/align";
import { hasLayerClipboard, LAYER_CLIP_MARK, useStore } from "./state/store";
import { fitInside } from "./layers/sources/image";
import { TYPE_STYLES } from "./layers/sources/text";
import { CommandMenu } from "./ui/CommandMenu";
import { ContextMenu } from "./ui/ContextMenu";
import { Explore } from "./ui/Explore";
import { LayersPanel } from "./ui/LayersPanel";
import { Library } from "./ui/Library";
import { Palettes } from "./ui/Palettes";
import { PropertiesPanel } from "./ui/PropertiesPanel";
import { readImageFile } from "./ui/image-file";
import { isSvgCode, svgToPng } from "./ui/svg";
import { Timeline } from "./ui/Timeline";
import { ToolbarEnd, ToolbarStart, ZoomChip } from "./ui/Toolbar";
import { Viewport } from "./ui/Viewport";
import { ToolShell } from "@/tools/shell/ToolShell";

/** Arrow keys move the selection by 1 composition px (10 with Shift), as one undo step per burst. */
function nudge(key: string, step: number) {
	const s = useStore.getState();
	const { width: W, height: H } = s.doc.scene;
	const dx = key === "arrowleft" ? -step : key === "arrowright" ? step : 0;
	const dy = key === "arrowup" ? -step : key === "arrowdown" ? step : 0;
	const patches: Record<string, Params> = {};
	for (const l of s.doc.layers) {
		const pos = getDef(l.type)?.position;
		if (!s.selectedIds.includes(l.id) || l.locked || !pos) continue;
		patches[l.id] = {
			[pos[0]]: Math.round((Number(l.params[pos[0]]) + dx / W) * 10000) / 10000,
			[pos[1]]: Math.round((Number(l.params[pos[1]]) - dy / H) * 10000) / 10000,
		};
	}
	s.patchLayers(patches, "nudge");
}

/**
 * Keys that belong to a focused field. Text fields own every key; a dropdown only owns the keys it
 * uses (arrows, Space, Enter), so Delete still removes the selected layer after picking a Blend.
 */
function isTyping(e: KeyboardEvent) {
	const t = e.target as HTMLElement;
	if (t.isContentEditable || t.tagName === "TEXTAREA") return true;
	if (t.tagName === "INPUT") return !["checkbox", "radio", "range", "button", "color"].includes((t as HTMLInputElement).type);
	if (t.tagName === "SELECT") return e.key.startsWith("Arrow") || e.key === " " || e.key === "Enter";
	return false;
}

export function App() {
	const theme = useStore((s) => s.theme);
	const overlay = useStore((s) => s.overlay);
	const toast = useStore((s) => s.toast);
	const [fitScale, setFitScale] = useState(1);
	const [errors, setErrors] = useState<Map<string, string>>(new Map());
	const [dragging, setDragging] = useState(false);
	const onErrors = useCallback((e: Map<string, string>) => setErrors(e), []);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			const s = useStore.getState();
			const mod = e.metaKey || e.ctrlKey;
			const k = e.key.toLowerCase();
			// ⌘K works from anywhere, even a focused field.
			if (mod && k === "k") {
				e.preventDefault();
				s.setCommandOpen(!s.commandOpen);
				return;
			}
			if (isTyping(e)) return;
			if (mod && k === "s") {
				e.preventDefault();
				s.saveToLibrary({ asNew: e.shiftKey });
				return;
			}
			// Open sheets own the keyboard (Esc, R, number keys).
			if (s.overlay || s.commandOpen) return;
			const sel = s.selectedIds;
			const code = e.code;
			if (mod && k === "z") s[e.shiftKey ? "redo" : "undo"]();
			else if (mod && k === "y") s.redo();
			else if (mod && e.shiftKey && code === "Quote") s.toggleSnapping();
			else if (mod && k === "d") s.duplicateSelected();
			else if (mod && k === "c" && sel.length) s.copySelected();
			else if (mod && k === "a") s.selectMany(s.doc.layers.filter((l) => l.visible && !l.locked).map((l) => l.id));
			// Figma order shortcuts: ] / [ to front / back, ⌘] / ⌘[ one step (⌥⌘ still goes all the way).
			else if (mod && code === "BracketRight") s.arrange(e.altKey ? "front" : "forward");
			else if (mod && code === "BracketLeft") s.arrange(e.altKey ? "back" : "backward");
			else if (mod && e.shiftKey && k === "l") s.toggleLocked();
			else if (mod && e.shiftKey && k === "h") s.toggleVisible();
			else if (mod) return;
			else if (e.altKey && ALIGN_KEYS[code] && sel.length) alignSelection(ALIGN_KEYS[code]);
			else if (code === "BracketRight" && !e.altKey && sel.length) s.arrange("front");
			else if (code === "BracketLeft" && !e.altKey && sel.length) s.arrange("back");
			else if (k === " ") s.setPlaying(!s.playing);
			else if ((k === "backspace" || k === "delete") && sel.length) s.removeSelected();
			// A selected canvas frame (no layers selected) deletes the canvas, like a Figma frame.
			else if ((k === "backspace" || k === "delete") && s.canvasSelected && s.canvases.length > 1) s.removeCanvas(s.active);
			else if (k.startsWith("arrow") && sel.length) nudge(k, e.shiftKey ? 10 : 1);
			else if (k === "s" && e.shiftKey && s.selectedId) s.shuffleLayer(s.selectedId);
			else if (k === "s") s.shuffleAll();
			else if (k === "c") s.shuffleAll("colors");
			else if (k === "e") s.setOverlay("explore");
			else if (k === "l") s.setOverlay("library");
			else if (k === "0") s.setZoom("fit");
			// Enter types into the selected text, like a double-click (a focused button keeps its Enter).
			else if (k === "enter" && (e.target as HTMLElement).tagName !== "BUTTON" && sel.length === 1 && s.doc.layers.find((l) => l.id === sel[0])?.type === "text") s.setEditingText(sel[0]);
			else if (k === "escape") {
				s.select(null);
				s.setCanvasSelected(false);
			}
			else return;
			e.preventDefault();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	// ⌘V: layers copied here, an image (screenshot, copied file) or plain text from anywhere else.
	// Handled on the paste event (not keydown) because only it can read the system clipboard.
	useEffect(() => {
		const onPaste = async (e: ClipboardEvent) => {
			const t = e.target as HTMLElement | null;
			if (t && (t.isContentEditable || t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
			const s = useStore.getState();
			if (s.overlay || s.commandOpen) return;
			const data = e.clipboardData;
			if (!data) return;
			e.preventDefault();
			const text = data.getData("text/plain");
			const image = [...data.files].find((f) => f.type.startsWith("image/"));
			if (text === LAYER_CLIP_MARK || (!image && !text.trim() && hasLayerClipboard())) {
				s.paste();
				return;
			}
			if (image) {
				const src = await readImageFile(image);
				s.addLayer("image", { params: await fitInside(src, s.doc.scene), name: image.name && image.name !== "image.png" ? image.name.replace(/\.[^.]+$/, "") : "Pasted image" });
				s.showToast("Pasted image");
				return;
			}
			const clean = text.replace(/\r\n?/g, "\n").trim();
			if (!clean) return;
			// SVG code (Figma "Copy as SVG", icon sites, a code editor) draws as an image, not text.
			if (isSvgCode(clean)) {
				try {
					const { src, title } = await svgToPng(clean);
					s.addLayer("image", { name: title ?? "Pasted SVG", params: await fitInside(src, s.doc.scene, 0.6) });
					s.showToast("Pasted SVG");
				} catch {
					s.showToast("That SVG couldn't be read");
				}
				return;
			}
			// A short single line reads as a headline; anything longer as body copy.
			const style = clean.length <= 48 && !clean.includes("\n") ? TYPE_STYLES[0] : TYPE_STYLES[1];
			const name = clean.split("\n")[0].slice(0, 32);
			s.addLayer("text", { name, params: { ...style.params, text: clean, x: 0.25, y: 0.5, anchor: 1, align: 0 } });
			s.showToast("Pasted text");
		};
		window.addEventListener("paste", onPaste);
		return () => window.removeEventListener("paste", onPaste);
	}, []);

	// Drop an image to add it as a layer, or a .json to open it.
	useEffect(() => {
		let depth = 0;
		const hasFiles = (e: DragEvent) => !!e.dataTransfer?.types.includes("Files");
		const enter = (e: DragEvent) => {
			if (!hasFiles(e)) return;
			depth++;
			setDragging(true);
		};
		const leave = () => {
			depth = Math.max(0, depth - 1);
			if (!depth) setDragging(false);
		};
		const over = (e: DragEvent) => {
			if (hasFiles(e)) e.preventDefault();
		};
		const drop = async (e: DragEvent) => {
			if (!hasFiles(e)) return;
			e.preventDefault();
			depth = 0;
			setDragging(false);
			const file = e.dataTransfer!.files[0];
			if (!file) return;
			const s = useStore.getState();
			if (file.type.startsWith("image/") || file.name.toLowerCase().endsWith(".svg")) {
				const src = await readImageFile(file);
				const layer = createLayer("image", { name: file.name.replace(/\.[^.]+$/, ""), params: await fitInside(src, s.doc.scene) });
				s.commit((doc) => ({ ...doc, layers: [...doc.layers, layer] }));
				s.select(layer.id);
			} else if (file.name.endsWith(".json")) {
				try {
					s.loadProject(await readJSON(file));
				} catch {
					// not a Brand Lab file; ignore
				}
			}
		};
		window.addEventListener("dragenter", enter);
		window.addEventListener("dragleave", leave);
		window.addEventListener("dragover", over);
		window.addEventListener("drop", drop);
		return () => {
			window.removeEventListener("dragenter", enter);
			window.removeEventListener("dragleave", leave);
			window.removeEventListener("dragover", over);
			window.removeEventListener("drop", drop);
		};
	}, []);

	// clueso.design: the frame (top bar, panels, resize handles, cursor, toast, theme) comes from the
	// tool shell. The root keeps its brand-lab-root class and the panel widths their old key.
	return (
		<ToolShell
			id="brand-lab"
			name="Brand Lab"
			theme={theme}
			toolbarStart={<ToolbarStart />}
			toolbarEnd={<ToolbarEnd />}
			toolbarLabels={{ start: "Project", end: "Create and export" }}
			left={<LayersPanel />}
			right={<PropertiesPanel errors={errors} />}
			bottom={
				<>
					<ZoomChip fitScale={fitScale} />
					<Timeline />
				</>
			}
			resizeLabels={{ left: "Resize layers panel", right: "Resize properties panel" }}
			toast={toast}
			overlays={
				<>
					{overlay === "explore" && <Explore />}
					{overlay === "library" && <Library />}
					{overlay === "palettes" && <Palettes />}
					<ContextMenu />
					<CommandMenu />
					{dragging && (
						<div className="label-small-strong pointer-events-none absolute inset-xl z-overlay grid place-items-center rounded-xl border-2 border-dashed border-brand-normal bg-brand-weak/60 text-strong">
							Drop an image to add it as a layer, or a .json to open it
						</div>
					)}
				</>
			}
		>
			<Viewport onFitScale={setFitScale} onErrors={onErrors} />
		</ToolShell>
	);
}
