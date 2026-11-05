import * as React from "react";
import { cn } from "../../../../lib/utils";

/**
 * Playhead Component - Jigsaw Design System
 *
 * A vertical timeline indicator with customizable head shapes.
 * Used in video/audio timeline editors to show current playback position.
 *
 * HEAD SHAPES:
 * - numbered: Rounded rectangle with timestamp text (default)
 * - classic: Small vertical rectangle
 * - circle: Circle/dot
 * - tallPill: Tall vertical pill
 * - widePill: Wide horizontal pill
 * - square: Square shape
 *
 * STRUCTURE:
 * Playhead (absolute positioned container)
 *   ├── Head (shape varies based on headShape prop)
 *   └── Line (vertical indicator, starts immediately below head)
 */

export type PlayheadHeadShape =
	| "numbered"
	| "classic"
	| "circle"
	| "tallPill"
	| "widePill"
	| "square";

// Classic playhead SVG shape (pointer/arrow)
const ClassicPlayheadSvg = () => (
	<svg
		width="10"
		height="14"
		viewBox="0 0 10 14"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		className="fill-strong"
	>
		<path d="M0 2C0 0.895431 0.895431 0 2 0H8C9.10457 0 10 0.895431 10 2V8.03183C10 8.5515 9.79773 9.05076 9.43602 9.42389L6.43602 12.5186C5.65025 13.3292 4.34975 13.3292 3.56398 12.5186L0.563978 9.42389C0.202271 9.05076 0 8.5515 0 8.03183V2Z" />
	</svg>
);

// Head shape dimensions and styles
const headShapeStyles: Record<
	PlayheadHeadShape,
	{ className: string; width: string; height: string; usesSvg?: boolean }
> = {
	numbered: {
		className: "rounded-2xs px-sm py-sm",
		width: "auto",
		height: "auto",
	},
	classic: {
		className: "",
		width: "10px",
		height: "14px",
		usesSvg: true,
	},
	circle: {
		className: "rounded-full",
		width: "11px",
		height: "11px",
	},
	tallPill: {
		className: "rounded-full",
		width: "10px",
		height: "14px",
	},
	widePill: {
		className: "rounded-full",
		width: "14px",
		height: "10px",
	},
	square: {
		className: "rounded-2xs",
		width: "10px",
		height: "10px",
	},
};

/**
 * Gutter width needed for each playhead style.
 * This is the space needed to the left of time=0 for the playhead head
 * to reach the left edge when positioned at timestamp 0.
 * Calculated as half of head width (since playhead is center-aligned), rounded up.
 *
 * For numbered: "0s" is ~24px wide, so gutter = 12px.
 * Wider text like "1m30s" (~45px) will extend into gutter, which is acceptable.
 */
export const PLAYHEAD_GUTTER_WIDTHS: Record<PlayheadHeadShape, number> = {
	numbered: 12, // Half of "0s" text width (~24px with padding)
	classic: 5, // 10px / 2
	circle: 6, // 11px / 2, rounded up
	tallPill: 5, // 10px / 2
	widePill: 7, // 14px / 2
	square: 5, // 10px / 2
};

export interface PlayheadProps extends React.HTMLAttributes<HTMLDivElement> {
	/** Horizontal position in pixels */
	position: number;
	/** Timestamp text to display (only shown when headShape="numbered") */
	timestamp?: string;
	/** Shape of the playhead head */
	headShape?: PlayheadHeadShape;
	/** Callback when dragging starts on head or line */
	onDragStart?: (e: React.MouseEvent) => void;
	/** Custom class for the head */
	headClassName?: string;
	/** Custom class for the line */
	lineClassName?: string;
	/** Whether the playhead is interactive (draggable) */
	interactive?: boolean;
}

const Playhead = React.memo(
	React.forwardRef<HTMLDivElement, PlayheadProps>(
		(
			{
				className,
				position,
				timestamp,
				headShape = "numbered",
				onDragStart,
				headClassName,
				lineClassName,
				interactive = true,
				...props
			},
			ref,
		) => {
			const headRef = React.useRef<HTMLDivElement>(null);
			const lineRef = React.useRef<HTMLDivElement>(null);

			const handleMouseDown = (e: React.MouseEvent) => {
				if (!interactive) return;
				e.preventDefault();
				e.stopPropagation();
				onDragStart?.(e);
			};

			const shapeStyle = headShapeStyles[headShape];
			const isNumbered = headShape === "numbered";
			const isClassic = headShape === "classic";

			React.useLayoutEffect(() => {
				const headEl = headRef.current;
				const lineEl = lineRef.current;
				if (!headEl || !lineEl) return;

				if (!isNumbered) {
					lineEl.style.marginTop = "";
					return;
				}

				// Numbered head uses translate transforms; use visual bounds, not offsetTop.
				const parentEl = lineEl.parentElement;
				if (!parentEl) return;
				const headRect = headEl.getBoundingClientRect();
				const parentRect = parentEl.getBoundingClientRect();
				const lineStart = Math.max(
					0,
					headRect.bottom - parentRect.top - 1,
				);
				lineEl.style.marginTop = `${lineStart}px`;
			}, [isNumbered, headShape, timestamp]);

			return (
				<div
					ref={ref}
					className={cn(
						"absolute top-0 flex flex-col items-center h-full pointer-events-none z-[1001] -translate-x-1/2",
						className,
					)}
					style={{ left: `${position}px` }}
					data-slot="playhead"
					data-head-shape={headShape}
					{...props}
				>
					{/* Head - positioned at top of timeline header area */}
					<div
						ref={headRef}
						className={cn(
							"relative z-10 flex items-center justify-center shrink-0 cursor-default",
							!isClassic && "bg-inverted",
							interactive && "pointer-events-auto",
							isNumbered &&
								"absolute top-2xl left-1/2 -translate-x-1/2 -translate-y-1/2",
							shapeStyle.className,
							headClassName,
						)}
						style={
							!isNumbered
								? {
										width: shapeStyle.width,
										height: shapeStyle.height,
									}
								: undefined
						}
						onMouseDown={handleMouseDown}
						data-slot="playhead-head"
					>
						{isNumbered && (
							<span className="label-xxsmall text-inverted whitespace-nowrap">
								{timestamp}
							</span>
						)}
						{isClassic && <ClassicPlayheadSvg />}
					</div>

					{/* Vertical Line - starts immediately after head (no gap) */}
					<div
						ref={lineRef}
						className={cn(
							"relative z-0 w-px bg-inverted flex-1",
							lineClassName,
						)}
						data-slot="playhead-line"
					/>
				</div>
			);
		},
	),
);

Playhead.displayName = "Playhead";

export { Playhead };
