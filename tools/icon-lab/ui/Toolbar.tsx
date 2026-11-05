import type * as React from "react";
import { Button } from "@/lib/design-system/jigsaw/components/ui/controls/button/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/lib/design-system/jigsaw/components/ui/overlays/tooltip/tooltip";
import { cn } from "@/lib/design-system/jigsaw/lib/utils";
import { Segmented } from "@/tools/shell/components/controls";
import { IconButton } from "@/tools/shell/components/icon-button";
import { useIconLab } from "../state/store";
import { I } from "./ci";
import { downloadSvg } from "./export";

/**
 * Drawing new icons from a prompt with Claude is parked, as it is in the standalone app: its
 * generator never shipped, so the Connect Claude button stays hidden. The key dialog and the key's
 * storage are kept for when it comes back.
 */
const CLAUDE_DRAWING = false;

/** Top left, after the mark and name: the Icon and Context views. */
export function ToolbarStart() {
	const pane = useIconLab((s) => s.pane);
	const setPane = useIconLab((s) => s.setPane);
	return (
		<Segmented
			size="button"
			label="Preview"
			value={pane}
			options={[
				{ value: "icon", label: "Icon" },
				{ value: "context", label: "Context" },
			]}
			onChange={setPane}
		/>
	);
}

/** A text button that stays pressed while its mode is on (Edit, Grid, Google). */
function Toggle({ on, tooltip, children, ...props }: React.ComponentProps<typeof Button> & { on?: boolean; tooltip?: string }) {
	const button = (
		<Button variant="outlined" sentiment="neutral" size="small" aria-pressed={on} className={cn(on && "bg-interaction-selected-subtle")} {...props}>
			{children}
		</Button>
	);
	if (!tooltip) return button;
	return (
		<Tooltip>
			<TooltipTrigger asChild>{button}</TooltipTrigger>
			<TooltipContent>{tooltip}</TooltipContent>
		</Tooltip>
	);
}

/** Top right: the signature style, the icon's tools, theme, Claude and Export SVG. */
export function ToolbarEnd() {
	const mode = useIconLab((s) => s.mode);
	const sig = useIconLab((s) => s.sig);
	const pane = useIconLab((s) => s.pane);
	const icon = useIconLab((s) => s.current);
	const editing = useIconLab((s) => !!s.edit);
	const showGrid = useIconLab((s) => s.showGrid);
	const showGoogle = useIconLab((s) => s.showGoogle);
	const theme = useIconLab((s) => s.theme);
	const connected = useIconLab((s) => s.connected);
	const { setSignature, set, startEditing, stopEditing, resetIcon, removeCurrent, toggleTheme, openDialog } = useIconLab.getState();
	useIconLab((s) => s.libRev);
	const pixel = mode === "pixel";

	return (
		<>
			{/* Signature options, each a sample of the set redrawn (data/signature-set.ts). */}
			<div className="flex items-center gap-xs rounded-sm border border-weak bg-surface-elevated-1 py-2xs pr-2xs pl-sm">
				<span className="mono-xxsmall text-weak">Style</span>
				<Segmented
					key={pixel ? "off" : "on"}
					label="Style"
					value={pixel ? "none" : sig}
					options={[
						{ value: "", label: "Base", disabled: pixel },
						{ value: "A", label: "A", tooltip: "A · Clue pixel", disabled: pixel },
						{ value: "B", label: "B", tooltip: "B · Cut", disabled: pixel },
					]}
					onChange={setSignature}
				/>
			</div>
			{pane === "icon" && (
				<>
					{icon.generated && <Toggle onClick={removeCurrent}>Remove</Toggle>}
					{icon.edited && <Toggle onClick={resetIcon}>Reset</Toggle>}
					{/* No Google reference for the pixel style. */}
					{!icon.pixel && (
						<Toggle on={showGoogle} tooltip="Show Google's Material Symbols drawing of this icon faintly behind ours, to check construction" onClick={() => set({ showGoogle: !showGoogle })}>
							Google
						</Toggle>
					)}
					{/* Pixels aren't edited point by point. */}
					{!(icon.illustration || icon.pixel) && (
						<Toggle on={editing} onClick={() => (editing ? stopEditing() : startEditing())}>
							{editing ? "Done" : "Edit"}
						</Toggle>
					)}
					<Toggle on={showGrid} onClick={() => set({ showGrid: !showGrid })}>
						Grid
					</Toggle>
				</>
			)}
			<IconButton variant="outlined" label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"} icon={theme === "light" ? <I.Moon /> : <I.Sun />} onClick={toggleTheme} />
			{CLAUDE_DRAWING && (
				<Toggle on={connected} onClick={() => openDialog("key")}>
					<span className={cn("mr-xs inline-block size-[6px] rounded-full border border-strong", connected && "border-brand-normal bg-brand-normal")} aria-hidden />
					{connected ? "Claude connected" : "Connect Claude"}
				</Toggle>
			)}
			<Button variant="filled" sentiment="brand" size="small" iconBefore icon={<I.Download />} onClick={downloadSvg}>
				Export SVG
			</Button>
		</>
	);
}
