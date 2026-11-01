import { I } from "./ci";
import { MenuLabel } from "../components/popover";
import { type ContextMenuSection, ContextMenuPopover } from "@/lib/design-system/jigsaw/components/ui/overlays/context-menu/context-menu";
import { alignSelection } from "../state/align";
import { hasLayerClipboard, useStore } from "../state/store";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const M = isMac ? "⌘" : "Ctrl";
const A = isMac ? "⌥" : "Alt";

/** Right-click menu for the canvas and layer rows; acts on the current selection. */
export function ContextMenu() {
	const menu = useStore((s) => s.menu);
	const close = useStore((s) => s.closeMenu);
	const ids = useStore((s) => s.selectedIds);
	const layers = useStore((s) => s.doc.layers);

	if (!menu) return null;
	const st = useStore.getState();
	const sel = layers.filter((l) => ids.includes(l.id));
	const has = sel.length > 0;
	const allLocked = has && sel.every((l) => l.locked);
	const allHidden = has && sel.every((l) => !l.visible);

	// Nothing selected (right-click on an empty part of a canvas): actions for the canvas itself.
	const canvasSections: ContextMenuSection[] = [
		{ items: [{ type: "custom" as const, content: <MenuLabel className="pb-xs">{st.doc.name || "Canvas"}</MenuLabel> }] },
		{
			items: [
				{ label: "Add layer…", icon: <I.Layers />, shortcut: [M, "K"], onClick: () => st.setCommandOpen(true) },
				{ label: "Paste", icon: <I.Clipboard />, shortcut: [M, "V"], onClick: st.paste, disabled: !hasLayerClipboard(), disabledReason: "Copy layers first, or press ⌘V to paste text or an image" },
				{ label: "Select all layers", icon: <I.Layers />, shortcut: [M, "A"], onClick: () => st.selectMany(st.doc.layers.filter((l) => l.visible && !l.locked).map((l) => l.id)), disabled: !st.doc.layers.length },
			],
		},
		{
			items: [
				{ label: "Duplicate canvas", icon: <I.Duplicate />, onClick: () => st.duplicateCanvas(st.active) },
				{ label: "Delete canvas", icon: <I.Bin />, onClick: () => st.removeCanvas(st.active), disabled: st.canvases.length <= 1, disabledReason: "A project needs at least one canvas" },
			],
		},
		{ items: [{ label: "Zoom to fit", icon: <I.Fit />, shortcut: ["0"], onClick: () => st.setZoom("fit") }] },
	];

	const sections: ContextMenuSection[] = [
		...(has ? [{ items: [{ type: "custom" as const, content: <MenuLabel className="pb-xs">{sel.length === 1 ? sel[0].name : `${sel.length} layers`}</MenuLabel> }] }] : []),
		{
			items: [
				{ label: "Bring to front", icon: <I.BringToFront />, shortcut: ["]"], onClick: () => st.arrange("front"), disabled: !has },
				{ label: "Bring forward", icon: <I.BringForward />, shortcut: [M, "]"], onClick: () => st.arrange("forward"), disabled: !has },
				{ label: "Send backward", icon: <I.SendBackward />, shortcut: [M, "["], onClick: () => st.arrange("backward"), disabled: !has },
				{ label: "Send to back", icon: <I.SendToBack />, shortcut: ["["], onClick: () => st.arrange("back"), disabled: !has },
			],
		},
		{
			items: [
				{ label: "Align left", icon: <I.AlignLeft />, shortcut: [A, "A"], onClick: () => alignSelection("left"), disabled: !has },
				{ label: "Align horizontal centres", icon: <I.AlignHCenter />, shortcut: [A, "H"], onClick: () => alignSelection("hcenter"), disabled: !has },
				{ label: "Align right", icon: <I.AlignRight />, shortcut: [A, "D"], onClick: () => alignSelection("right"), disabled: !has },
				{ label: "Align top", icon: <I.AlignTop />, shortcut: [A, "W"], onClick: () => alignSelection("top"), disabled: !has },
				{ label: "Align vertical centres", icon: <I.AlignVCenter />, shortcut: [A, "V"], onClick: () => alignSelection("vcenter"), disabled: !has },
				{ label: "Align bottom", icon: <I.AlignBottom />, shortcut: [A, "S"], onClick: () => alignSelection("bottom"), disabled: !has },
			],
		},
		{
			items: [
				{ label: "Copy", icon: <I.Copy />, shortcut: [M, "C"], onClick: st.copySelected, disabled: !has },
				{ label: "Paste", icon: <I.Clipboard />, shortcut: [M, "V"], onClick: st.paste },
				{ label: "Duplicate", icon: <I.Duplicate />, shortcut: [M, "D"], onClick: st.duplicateSelected, disabled: !has },
			],
		},
		{
			items: [
				{ label: allHidden ? "Show" : "Hide", icon: allHidden ? <I.Eye /> : <I.EyeSlashed />, shortcut: ["⇧", M, "H"], onClick: () => st.toggleVisible(), disabled: !has },
				{ label: allLocked ? "Unlock" : "Lock", icon: allLocked ? <I.LockOpen /> : <I.Lock />, shortcut: ["⇧", M, "L"], onClick: () => st.toggleLocked(), disabled: !has },
				{ label: "Delete", icon: <I.Bin />, shortcut: ["⌫"], onClick: st.removeSelected, disabled: !has },
			],
		},
	];

	return <ContextMenuPopover key={`${menu.x},${menu.y}`} x={menu.x} y={menu.y} onClose={close} sections={has ? sections : canvasSections} className="min-w-[240px]" />;
}
