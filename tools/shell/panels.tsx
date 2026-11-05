import type * as React from "react";
import { cn } from "@/lib/design-system/jigsaw/lib/utils";
import { Separator } from "@/lib/design-system/jigsaw/components/ui/primitives/separator/separator";
import { Panel } from "./components/panel";
import { usePanelWidths, useShell } from "./context";
import { GAP, M, PANEL_TOP, shownWidth, timelineRight } from "./geometry";

// The chrome's panels, each already in its place. Put them in ToolShell's left, right and bottom
// slots. They take any div props (aria-label, className, children). Side panels hide on narrow screens.

/**
 * Collapsing a panel slides it out past its own edge and fades it, on the drawer curve: 220ms in,
 * 180ms out (the system responding should feel quicker than it arriving). From the toolbar button
 * only: ⌘\ is a keyboard shortcut, used often, so it's instant. Reduced motion keeps just the fade.
 */
function slide(open: boolean, animate: boolean, side: "left" | "right") {
	return cn(
		animate && "transition-[translate,opacity,visibility] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-[opacity,visibility]",
		animate && (open ? "duration-[220ms]" : "duration-[180ms]"),
		!open && "pointer-events-none opacity-0",
		!open && (side === "left" ? "-translate-x-[calc(100%+24px)]" : "translate-x-[calc(100%+24px)]"),
		!open && "motion-reduce:translate-x-0",
		// Hidden from focus and screen readers once it has slid away (visibility switches at the end).
		!open && "invisible",
	);
}

/** The resizable panel on the left, under the top bar. Stops above the bottom bar when there is one. */
export function LeftPanel({ className, style, ...props }: React.ComponentProps<"div">) {
	const { hasBottom, bottomHeight } = useShell();
	const width = usePanelWidths((s) => s.left);
	const open = usePanelWidths((s) => s.leftOpen);
	const animate = usePanelWidths((s) => s.animate);
	return <Panel className={cn("max-[1099px]:hidden", slide(open, animate, "left"), className)} style={{ top: PANEL_TOP, left: M, bottom: hasBottom ? M + bottomHeight + GAP : M, width, ...style }} {...props} />;
}

/** The resizable panel on the right, full height under the top bar. */
export function RightPanel({ className, style, ...props }: React.ComponentProps<"div">) {
	const width = usePanelWidths((s) => s.right);
	const open = usePanelWidths((s) => s.rightOpen);
	const animate = usePanelWidths((s) => s.animate);
	return <Panel className={cn("max-[1099px]:hidden", slide(open, animate, "right"), className)} style={{ top: PANEL_TOP, right: M, bottom: M, width, ...style }} {...props} />;
}

/** A bar along the bottom, like the timeline. Stops at the right panel, and spans the window when panels hide. */
export function BottomBar({ className, style, ...props }: React.ComponentProps<"div">) {
	const { hasRight, bottomHeight } = useShell();
	const rightW = usePanelWidths((s) => shownWidth(s, "right"));
	return (
		<Panel
			className={cn("flex-row items-center gap-sm px-xs max-[1099px]:right-[12px]!", className)}
			style={{ left: M, right: hasRight && rightW ? timelineRight(rightW) : M, bottom: M, height: bottomHeight, ...style }}
			{...props}
		/>
	);
}

/** A short vertical rule between groups in the top bar. */
export function ToolbarDivider() {
	return <Separator orientation="vertical" className="mx-2xs h-[20px]" />;
}
