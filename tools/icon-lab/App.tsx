import { useEffect } from "react";
import { applySiteTheme } from "@/lib/theme";
import { EMBED_READY, EMBED_THEME } from "@/lib/tool-embed";
import { ToolShell } from "@/tools/shell/ToolShell";
import { EMBED, KEYS, storage } from "./state/storage";
import { useIconLab } from "./state/store";
import { BottomStrip } from "./ui/BottomStrip";
import { BOTTOM, Canvas } from "./ui/Canvas";
import { ContextDialog } from "./ui/ContextDialog";
import { KeyDialog, RequestDialog } from "./ui/Dialogs";
import { LibraryPanel } from "./ui/LibraryPanel";
import { PropertiesPanel } from "./ui/PropertiesPanel";
import { ToolbarEnd, ToolbarStart } from "./ui/Toolbar";

// Icon Lab (tool #002), on the tool shell like Brand Lab: the library on the left, the selected
// icon's properties on the right, the icon on its artboard in the middle, and the size ramp and the
// prompt along the bottom. Ported from Sneha's standalone app; this repo is now its home.

/** Keys that belong to a focused field. */
function isTyping(e: KeyboardEvent) {
	const t = e.target as HTMLElement | null;
	return !!t?.closest?.("input, select, textarea, [contenteditable]");
}

export function App() {
	const theme = useIconLab((s) => s.theme);
	const dialog = useIconLab((s) => s.dialog);

	// The tool drives the page theme while it is open (the mount hands it back to the site).
	useEffect(() => applySiteTheme(theme), [theme]);

	// Until a theme is picked, follow the system, like the site.
	useEffect(() => {
		if (EMBED) return;
		const media = matchMedia("(prefers-color-scheme: dark)");
		const change = () => {
			const v = storage.getItem(KEYS.theme);
			if (v !== "light" && v !== "dark") useIconLab.getState().setTheme(media.matches ? "dark" : "light");
		};
		media.addEventListener("change", change);
		return () => media.removeEventListener("change", change);
	}, []);

	// The homepage embed takes its theme from the homepage: the opposite of its own.
	useEffect(() => {
		if (!EMBED) return;
		const message = (e: MessageEvent) => {
			if (e.origin === location.origin && e.data?.type === EMBED_THEME) useIconLab.getState().setTheme(e.data.theme === "dark" ? "dark" : "light");
		};
		window.addEventListener("message", message);
		window.parent.postMessage({ type: EMBED_READY }, location.origin);
		return () => window.removeEventListener("message", message);
	}, []);

	// Editing: Esc stops, ⌘A selects every point, arrows nudge. Esc also clears a drawing on the grid.
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			const s = useIconLab.getState();
			if (e.key === "Escape" && s.sketch.strokes.length) s.closeTray();
			if (s.dialog || isTyping(e)) return;
			s.editKey(e);
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, []);

	return (
		<ToolShell
			id="icon-lab"
			name="Icon Lab"
			theme={theme}
			toolbarStart={<ToolbarStart />}
			toolbarEnd={<ToolbarEnd />}
			toolbarLabels={{ start: "View", end: "Icon tools and export" }}
			left={<LibraryPanel />}
			right={<PropertiesPanel />}
			bottom={<BottomStrip />}
			bottomHeight={BOTTOM}
			resizeLabels={{ left: "Resize library panel", right: "Resize properties panel" }}
			overlays={
				<>
					{dialog === "key" && <KeyDialog />}
					{dialog === "request" && <RequestDialog />}
					{dialog === "context" && <ContextDialog />}
				</>
			}
		>
			<Canvas />
		</ToolShell>
	);
}
