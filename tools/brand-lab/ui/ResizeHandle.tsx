import { useRef, useState } from "react";
import { cn } from "@/lib/design-system/jigsaw/lib/utils";
import { BAR, GAP, M, PANEL_TOP, usePanels } from "./layout";

/**
 * Drag handle on a side panel's inner edge: a hairline hit area with a pill that shows on hover,
 * like the Clueso editor. Drag to resize, double-click to reset. Widths persist.
 */
export function ResizeHandle({ side }: { side: "left" | "right" }) {
	const width = usePanels((s) => s[side]);
	const setWidth = usePanels((s) => s.setWidth);
	const reset = usePanels((s) => s.reset);
	const start = useRef<{ x: number; w: number } | null>(null);
	const [active, setActive] = useState(false);
	// Centre on the panel border's midline (the 1px border sits half a pixel inside the panel edge).
	// With a 10px hit area and a 5px pill, the pill lands on whole pixels.
	const edge = M + width - 5.5;

	return (
		<div
			role="separator"
			aria-orientation="vertical"
			aria-label={side === "left" ? "Resize layers panel" : "Resize properties panel"}
			aria-valuenow={width}
			title="Drag to resize, double-click to reset"
			className="group/resize absolute z-10 flex w-[10px] cursor-ew-resize items-center justify-center max-[1099px]:hidden"
			style={{ top: PANEL_TOP, bottom: side === "left" ? M + BAR + GAP : M, ...(side === "left" ? { left: edge } : { right: edge }) }}
			onPointerDown={(e) => {
				if (e.button !== 0) return;
				e.currentTarget.setPointerCapture(e.pointerId);
				start.current = { x: e.clientX, w: width };
				setActive(true);
			}}
			onPointerMove={(e) => {
				if (!start.current) return;
				const dx = e.clientX - start.current.x;
				setWidth(side, start.current.w + (side === "left" ? dx : -dx));
			}}
			onPointerUp={() => {
				start.current = null;
				setActive(false);
			}}
			onDoubleClick={() => reset(side)}
		>
			<span
				className={cn(
					"h-[40px] w-[5px] rounded-full bg-strong opacity-0 transition-[opacity,height] duration-150 group-hover/resize:opacity-100",
					active && "h-[56px] bg-accent-normal opacity-100",
				)}
			/>
		</div>
	);
}
