import type * as React from "react";
import { cn } from "@/lib/design-system/jigsaw/lib/utils";
import { Separator } from "@/lib/design-system/jigsaw/components/ui/primitives/separator/separator";
import { Panel } from "./components/panel";
import { usePanelWidths, useShell } from "./context";
import { BAR, GAP, M, PANEL_TOP, timelineRight } from "./geometry";

// The chrome's panels, each already in its place. Put them in ToolShell's left, right and bottom
// slots. They take any div props (aria-label, className, children). Side panels hide on narrow screens.

/** The resizable panel on the left, under the top bar. Stops above the bottom bar when there is one. */
export function LeftPanel({ className, style, ...props }: React.ComponentProps<"div">) {
	const { hasBottom } = useShell();
	const width = usePanelWidths((s) => s.left);
	return <Panel className={cn("max-[1099px]:hidden", className)} style={{ top: PANEL_TOP, left: M, bottom: hasBottom ? M + BAR + GAP : M, width, ...style }} {...props} />;
}

/** The resizable panel on the right, full height under the top bar. */
export function RightPanel({ className, style, ...props }: React.ComponentProps<"div">) {
	const width = usePanelWidths((s) => s.right);
	return <Panel className={cn("max-[1099px]:hidden", className)} style={{ top: PANEL_TOP, right: M, bottom: M, width, ...style }} {...props} />;
}

/** A bar along the bottom, like the timeline. Stops at the right panel, and spans the window when panels hide. */
export function BottomBar({ className, style, ...props }: React.ComponentProps<"div">) {
	const { hasRight } = useShell();
	const rightW = usePanelWidths((s) => s.right);
	return (
		<Panel
			className={cn("flex-row items-center gap-sm px-xs max-[1099px]:right-[12px]!", className)}
			style={{ left: M, right: hasRight ? timelineRight(rightW) : M, bottom: M, height: BAR, ...style }}
			{...props}
		/>
	);
}

/** A short vertical rule between groups in the top bar. */
export function ToolbarDivider() {
	return <Separator orientation="vertical" className="mx-2xs h-[20px]" />;
}
