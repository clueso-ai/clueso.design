import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "../../../../lib/utils";

const MIN_DURATION = 0.5;

function formatRangeDuration(seconds: number): string {
	if (seconds < 60) {
		return `${seconds.toFixed(1)}s`;
	}
	const m = Math.floor(seconds / 60);
	const s = (seconds % 60).toFixed(1);
	return `${m}:${s.padStart(4, "0")}`;
}

export interface GifRangeSelectorProps {
	/** Start time of the selected range in seconds */
	startTime: number;
	/** End time of the selected range in seconds */
	endTime: number;
	/** Total duration of the timeline in seconds */
	duration: number;
	/** Pixels per second (from zoom) */
	pixelsPerSecond: number;
	/** Left offset in pixels (gutter + frames offset) */
	leftOffset: number;
	/** Height of the track area */
	height?: number;
	/** Callback when range changes */
	onRangeChange: (startTime: number, endTime: number) => void;
	/** Whether the selector is disabled */
	disabled?: boolean;
	className?: string;
}

/**
 * GifRangeSelector - Range selector overlay for GIF timeline.
 * Design: Light gray selection area with orange left/right resize handles.
 * Supports: drag to move, resize via left/right handles.
 */
export const GifRangeSelector: React.FC<GifRangeSelectorProps> = ({
	startTime,
	endTime,
	duration,
	pixelsPerSecond,
	leftOffset,
	height = 46,
	onRangeChange,
	disabled = false,
	className,
}) => {
	const [isDragging, setIsDragging] = React.useState(false);
	const [isHovering, setIsHovering] = React.useState(false);
	const [tooltipRect, setTooltipRect] = React.useState<{
		left: number;
		top: number;
	} | null>(null);
	const rangeRef = React.useRef<HTMLDivElement>(null);
	const dragStateRef = React.useRef<{
		mode: "move" | "left" | "right";
		startX: number;
		startTime: number;
		endTime: number;
	} | null>(null);

	const left = leftOffset + startTime * pixelsPerSecond;
	const width = Math.max(0, (endTime - startTime) * pixelsPerSecond);

	const startDrag = React.useCallback(
		(mode: "move" | "left" | "right", clientX: number) => {
			const handleMouseMove = (e: MouseEvent) => {
				const state = dragStateRef.current;
				if (!state) return;

				const deltaTime = (e.clientX - state.startX) / pixelsPerSecond;

				if (state.mode === "move") {
					const rangeDuration = state.endTime - state.startTime;
					let newStart = state.startTime + deltaTime;
					let newEnd = state.endTime + deltaTime;
					if (newStart < 0) {
						newStart = 0;
						newEnd = rangeDuration;
					}
					if (newEnd > duration) {
						newEnd = duration;
						newStart = duration - rangeDuration;
					}
					onRangeChange(newStart, newEnd);
				} else if (state.mode === "left") {
					let newStart = Math.max(0, state.startTime + deltaTime);
					newStart = Math.min(newStart, state.endTime - MIN_DURATION);
					onRangeChange(newStart, state.endTime);
				} else {
					let newEnd = Math.min(duration, state.endTime + deltaTime);
					newEnd = Math.max(newEnd, state.startTime + MIN_DURATION);
					onRangeChange(state.startTime, newEnd);
				}
			};

			const handleMouseUp = () => {
				dragStateRef.current = null;
				setIsDragging(false);
				window.removeEventListener("mousemove", handleMouseMove);
				window.removeEventListener("mouseup", handleMouseUp);
			};

			dragStateRef.current = {
				mode,
				startX: clientX,
				startTime,
				endTime,
			};
			window.addEventListener("mousemove", handleMouseMove);
			window.addEventListener("mouseup", handleMouseUp);
		},
		[pixelsPerSecond, duration, onRangeChange, startTime, endTime],
	);

	const handleBodyMouseDown = (e: React.MouseEvent) => {
		if (disabled) return;
		e.stopPropagation();
		setIsDragging(true);
		startDrag("move", e.clientX);
	};

	const handleLeftHandleMouseDown = (e: React.MouseEvent) => {
		if (disabled) return;
		e.stopPropagation();
		e.preventDefault();
		setIsDragging(true);
		startDrag("left", e.clientX);
	};

	const handleRightHandleMouseDown = (e: React.MouseEvent) => {
		if (disabled) return;
		e.stopPropagation();
		e.preventDefault();
		setIsDragging(true);
		startDrag("right", e.clientX);
	};

	const rangeDuration = endTime - startTime;
	const durationLabel = formatRangeDuration(rangeDuration);
	const showTooltip = isHovering || isDragging;

	const updateTooltipPosition = React.useCallback(() => {
		const el = rangeRef.current;
		if (!el || !showTooltip) return;
		const rect = el.getBoundingClientRect();
		setTooltipRect({
			left: rect.left + rect.width / 2,
			top: rect.top - 8 - 24,
		});
	}, [showTooltip]);

	React.useLayoutEffect(() => {
		if (!showTooltip) {
			setTooltipRect(null);
			return;
		}
		updateTooltipPosition();
		let rafId: number;
		const loop = () => {
			updateTooltipPosition();
			rafId = requestAnimationFrame(loop);
		};
		rafId = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(rafId);
	}, [showTooltip, updateTooltipPosition]);

	// Hooks above, early return below (Rules of Hooks)
	if (width <= 0) return null;

	return (
		<div
			className={cn(
				"absolute top-0 bottom-0 inset-x-0 z-20 pointer-events-none",
				className,
			)}
		>
			<div
				ref={rangeRef}
				className={cn(
					"absolute top-0 flex pointer-events-auto ",
					disabled && "pointer-events-none opacity-50",
				)}
				onClick={(e) => e.stopPropagation()}
				onMouseEnter={() => setIsHovering(true)}
				onMouseLeave={() => setIsHovering(false)}
				style={{
					left: `${left}px`,
					width: `${width}px`,
					height: `${height}px`,
				}}
			>
				{/* Left handle - orange vertical line */}
				<div
					className="absolute left-0 top-0 bottom-0 w-1 shrink-0 cursor-ew-resize z-10 flex items-center justify-center -ml-0.5"
					onMouseDown={handleLeftHandleMouseDown}
					data-slot="gif-range-handle-left"
				>
					<div className="w-0.5 min-w-0.5 h-full bg-warning-normal shrink-0" />
				</div>

				{/* Main body - light gray selection area with opacity overlay, width from time range */}
				<div
					className="absolute inset-0 left-0.5 bg-black/30 cursor-grab active:cursor-grabbing"
					style={{
						width: `${Math.max(0, (endTime - startTime) * pixelsPerSecond)}px`,
					}}
					onMouseDown={handleBodyMouseDown}
					data-slot="gif-range-body"
				/>

				{/* Right handle - orange vertical line */}
				<div
					className="absolute right-0 top-0 bottom-0 w-1 shrink-0 cursor-ew-resize z-10 flex items-center justify-center -mr-0.5"
					onMouseDown={handleRightHandleMouseDown}
					data-slot="gif-range-handle-right"
				>
					<div className="w-0.5 min-w-0.5 h-full bg-warning-normal shrink-0" />
				</div>
			</div>
			{/* Tooltip - portal to body so it's not clipped by overflow */}
			{showTooltip &&
				tooltipRect &&
				createPortal(
					<div
						className="fixed flex items-center justify-center h-6 min-w-[52px] px-sm py-xs rounded-xs border border-weak pointer-events-none z-9999 tabular-nums bg-static-white -translate-x-1/2"
						style={{
							left: tooltipRect.left,
							top: tooltipRect.top,
						}}
						data-slot="gif-range-duration-tooltip"
					>
						<span className="text-static-black label-xsmall">
							{durationLabel}
						</span>
					</div>,
					document.body,
				)}
		</div>
	);
};

GifRangeSelector.displayName = "GifRangeSelector";
