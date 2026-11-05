import ChevronLeftCapIcon from "@icons/icons/Arrows and Directions/Chevron-left-cap.svg?react";
import ChevronLeftIcon from "@icons/icons/Arrows and Directions/Chevron-left.svg?react";
import ChevronRightCapIcon from "@icons/icons/Arrows and Directions/Chevron-right-cap.svg?react";
import ChevronRightIcon from "@icons/icons/Arrows and Directions/Chevron-right.svg?react";
import ImageIcon from "@icons/icons/Media/Image.svg?react";
import PauseIcon from "@icons/icons/Media/Pause.svg?react";
import PlayFilledIcon from "@icons/icons/Media/Play-filled.svg?react";
import VideoSquareFilledIcon from "@icons/icons/Media/Video---square-filled.svg?react";
import WaveformIcon from "@icons/icons/Media/Waveform.svg?react";
import ZoomInIcon from "@icons/icons/Media/Zoom-in.svg?react";
import * as React from "react";
import { flushSync } from "react-dom";
import { cn } from "../../../../lib/utils";
import { Button } from "../../../ui/controls/button/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "../../../ui/overlays/tooltip/tooltip";
import {
	Clip,
	type ClipCategory,
	type ClipSubType,
	categorySubTypes,
	subTypeToCategory,
} from "../clip/clip";
import { PLAYHEAD_GUTTER_WIDTHS, Playhead } from "../playhead/playhead";
import { GifRangeSelector } from "./gif-range-selector";
import { GifTimelineScrollbar } from "./gif-timeline-scrollbar";

/**
 * GifTimeline - Timeline component for GIF editing.
 * Matches video timeline UI: transport controls, timestamp header,
 * playhead, ClipBlock-style frames, scrollbar with zoom.
 */

export interface GifTimelineFrame {
	timestamp: number;
	src: string;
}

export interface GifTimelineProps {
	duration: number;
	currentTime: number;
	paused: boolean;
	frames: GifTimelineFrame[];
	frameWidth?: number;

	onSeek: (time: number) => void;
	onPlayPause: () => void;
	onStepForward: () => void;
	onStepBackward: () => void;
	onGoToStart: () => void;
	onGoToEnd: () => void;

	className?: string;
	disabled?: boolean;

	zoomSliderValue?: number;
	onZoomChange?: (value: number) => void;

	/** Range selector: start time of selected range (for GIF export) */
	rangeStartTime?: number;
	/** Range selector: end time of selected range */
	rangeEndTime?: number;
	/** Callback when range selector is moved or resized */
	onRangeChange?: (startTime: number, endTime: number) => void;

	/** Initial time to scroll to and show when timeline opens (e.g. start of GIF selection) */
	initTime?: number;

	/** Label of the single clip when `clips` isn't given (default "GIF") */
	clipName?: string;
	/** Several clips side by side, each across its own time range with its own label and frames.
	 * When given, replaces the single clip built from `frames`. */
	clips?: GifTimelineClip[];
	/** Highest zoom value (pinch, scrollbar handles). Default 100; raise it to fit short clips. */
	maxZoom?: number;
}

/** One clip on the timeline (see GifTimelineProps.clips). */
export interface GifTimelineClip {
	id: string;
	name: string;
	/** Start and end time in seconds */
	start: number;
	end: number;
	frames: GifTimelineFrame[];
	/** Colour (default from subType, or "visuals") */
	category?: ClipCategory;
	/** Icon and kind (default the category's first subType, "video" for visuals) */
	subType?: ClipSubType;
	/** Width of each frame in pixels (default: the timeline's frameWidth, then 16:9) */
	frameWidth?: number;
}

export const GIF_TIMELINE_MAX_ZOOM = 100;

/** Pixels per second from zoom slider (0-100, or up to maxZoom) */
export const getTimeStampGap = (alpha: number): number =>
	0.0077 * alpha * alpha + 0.2583 * alpha + 10.7451;

/** Zoom slider value for a number of pixels per second: the inverse of getTimeStampGap, clamped to 0..maxZoom */
export const getZoomFromTimeStampGap = (
	gap: number,
	maxZoom: number = GIF_TIMELINE_MAX_ZOOM,
): number => {
	const a = 0.0077;
	const b = 0.2583;
	const c = 10.7451 - gap;
	const discriminant = b * b - 4 * a * c;
	if (discriminant < 0) return 0;
	const alpha = (-b + Math.sqrt(discriminant)) / (2 * a);
	return Math.max(0, Math.min(maxZoom, alpha));
};

const clipIcons: Partial<Record<ClipSubType, React.ReactElement>> = {
	video: <VideoSquareFilledIcon />,
	avatar: <VideoSquareFilledIcon />,
	image: <ImageIcon />,
	audio: <WaveformIcon />,
	zoom: <ZoomInIcon />,
};

function resolveClipKind(clip: Pick<GifTimelineClip, "category" | "subType">): {
	category: ClipCategory;
	subType: ClipSubType;
} {
	if (clip.subType)
		return {
			category: clip.category ?? subTypeToCategory[clip.subType],
			subType: clip.subType,
		};
	const category = clip.category ?? "visuals";
	return { category, subType: categorySubTypes[category][0] };
}

function formatTotalTimeDisplay(timeInSeconds: number): string {
	const h = Math.floor(timeInSeconds / 3600);
	const m = Math.floor((timeInSeconds % 3600) / 60);
	const s = Math.floor(timeInSeconds % 60);
	return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}s`;
}

function getHighlightedTimeDisplay(timeInSeconds: number) {
	const h = Math.floor(timeInSeconds / 3600);
	const m = Math.floor((timeInSeconds % 3600) / 60);
	const s = Math.floor(timeInSeconds % 60);
	const full = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
	let start = 0;
	if (h > 0) start = 0;
	else if (m > 0) {
		start = 3;
		if (m < 10) start = 4;
	} else {
		start = 6;
		if (s < 10) start = 7;
	}
	return {
		dimPart: full.slice(0, start),
		highlightedPart: full.slice(start),
	};
}

/** Format time based on zoom (matches video editor timeUtils) */
function formatTimestamp(seconds: number, gap?: number, fps = 30): string {
	if (seconds === 0) return "0s";
	if (gap === undefined) return `${Math.floor(seconds)}s`;
	if (gap < 20) {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		if (secs > 0 && mins === 0) return `${secs}s`;
		if (secs > 0) return `${mins}m${secs}s`;
		return `${mins}m`;
	}
	if (gap < 60) return `${Math.floor(seconds)}s`;
	if (gap < 150) return `${Math.floor(seconds)}s`;
	if (gap < 300) {
		if (seconds % 1 === 0) return `${Math.floor(seconds)}s`;
		return `${seconds.toFixed(1)}s`;
	}
	return `${Math.round(seconds * fps)}f`;
}

interface TimeStamp {
	time: number;
	x: number;
	showLabel: boolean;
	isIntermediate: boolean;
}

/** Timestamp markers - matches video editor TimelineContainer (fixed-gap mode) */
function calculateTimestampMarkers(
	duration: number,
	pixelsPerSecond: number,
): TimeStamp[] {
	const timeStamps: TimeStamp[] = [];
	const g = pixelsPerSecond;
	const minLabelSpacing = 40;
	let timeStep = 1;
	let intermediateStep = 0.2;
	let numIntermediateTicks = 4;

	if (g < 10) {
		timeStep = 60;
		intermediateStep = 10;
		numIntermediateTicks = 5;
	} else if (g < 20) {
		timeStep = 60;
		intermediateStep = 5;
		numIntermediateTicks = 11;
	} else if (g < 40) {
		timeStep = 10;
		intermediateStep = 2;
		numIntermediateTicks = 4;
	} else if (g < 60) {
		timeStep = 5;
		intermediateStep = 1;
		numIntermediateTicks = 4;
	} else if (g < 150) {
		timeStep = 1;
		intermediateStep = 0.2;
		numIntermediateTicks = 4;
	} else if (g < 300) {
		timeStep = 1;
		intermediateStep = 0.1;
		numIntermediateTicks = 9;
	} else {
		timeStep = 1;
		intermediateStep = 1 / 30;
		numIntermediateTicks = 29;
	}

	const labelInterval = Math.max(
		1,
		Math.ceil(minLabelSpacing / (g * timeStep)),
	);
	const alignedStart = 0;

	for (let i = alignedStart; i <= Math.ceil(duration); i += timeStep) {
		const x = g * i;
		const lastLabeled = (() => {
			for (let j = timeStamps.length - 1; j >= 0; j--) {
				if (timeStamps[j].showLabel) return timeStamps[j];
			}
			return null;
		})();
		const hasEnoughSpace =
			!lastLabeled || x - lastLabeled.x >= minLabelSpacing;
		const stepIndex = Math.round(i / timeStep);
		const shouldShowLabel =
			i === alignedStart ||
			i >= Math.floor(duration) ||
			(hasEnoughSpace &&
				(stepIndex % labelInterval === 0 ||
					!!(
						lastLabeled &&
						x - lastLabeled.x >= minLabelSpacing * 1.5
					)));

		const entry: TimeStamp = {
			time: i,
			x,
			showLabel: shouldShowLabel,
			isIntermediate: false,
		};

		timeStamps.push(entry);

		const pixelsBetweenTicks = g * intermediateStep;
		if (pixelsBetweenTicks >= 8 && i < Math.ceil(duration)) {
			for (let j = 1; j <= numIntermediateTicks; j++) {
				const intermediateTime = i + j * intermediateStep;
				if (intermediateTime >= i + timeStep) break;
				timeStamps.push({
					time: intermediateTime,
					x: g * intermediateTime,
					showLabel: false,
					isIntermediate: true,
				});
			}
		}
	}

	return timeStamps;
}

export interface GifTimelineTransportProps {
	currentTime: number;
	duration: number;
	paused: boolean;
	onPlayPause: () => void;
	onStepForward: () => void;
	onStepBackward: () => void;
	onGoToStart: () => void;
	onGoToEnd: () => void;
	disabled?: boolean;
	className?: string;
}

/**
 * The shortcuts the transport tooltips promise, while focus is inside the timeline or its
 * transport (never global): ← / → step, Space plays or pauses. A focused button keeps its own
 * Space (and Enter), so Space on "Next frame" steps and Space on "Play" plays.
 */
function handleTransportKeyDown(
	e: React.KeyboardEvent,
	{
		disabled,
		onPlayPause,
		onStepForward,
		onStepBackward,
	}: Pick<
		GifTimelineTransportProps,
		"disabled" | "onPlayPause" | "onStepForward" | "onStepBackward"
	>,
) {
	if (disabled || e.defaultPrevented) return;
	if (e.metaKey || e.ctrlKey || e.altKey) return;
	const target = e.target as HTMLElement;
	if (target.closest("input, textarea, select, [contenteditable=true]"))
		return;
	let action: (() => void) | null = null;
	if (e.key === "ArrowLeft") action = onStepBackward;
	else if (e.key === "ArrowRight") action = onStepForward;
	else if (e.key === " " && !target.closest("button"))
		action = e.repeat ? () => {} : onPlayPause;
	if (!action) return;
	e.preventDefault();
	e.stopPropagation();
	action();
}

const transportButtonFocus =
	"focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-interaction-focused";

/** The timeline's transport bar on its own: start, previous frame, play/pause, next frame, end, time / duration. */
function GifTimelineTransport({
	currentTime,
	duration,
	paused,
	onPlayPause,
	onStepForward,
	onStepBackward,
	onGoToStart,
	onGoToEnd,
	disabled = false,
	className,
}: GifTimelineTransportProps) {
	const totalTimeDisplay = formatTotalTimeDisplay(duration);
	const { dimPart, highlightedPart } = getHighlightedTimeDisplay(currentTime);

	const playPauseIcon = paused ? (
		<PlayFilledIcon className="size-6 fill-normal" />
	) : (
		<PauseIcon className="size-6 stroke-normal" />
	);

	return (
		// biome-ignore lint/a11y/useSemanticElements: a labelled group of transport buttons
		<div
			role="group"
			aria-label="Playback"
			aria-keyshortcuts="Space ArrowLeft ArrowRight"
			className={cn(
				"flex items-center justify-between font-sans box-border p-xs w-full",
				disabled && "opacity-50 pointer-events-none",
				className,
			)}
			data-slot="gif-timeline-transport"
			onKeyDown={(e) =>
				handleTransportKeyDown(e, {
					disabled,
					onPlayPause,
					onStepForward,
					onStepBackward,
				})
			}
		>
			<div className="flex items-center gap-md">
				<div className="flex items-center">
					<Tooltip>
						<TooltipContent
							side="bottom"
							sideOffset={8}
							align="start"
						>
							Go to start
						</TooltipContent>
						<TooltipTrigger asChild>
							<Button
								variant="transparent"
								sentiment="neutral"
								size="small"
								iconOnly
								aria-label="Go to start"
								className={transportButtonFocus}
								icon={
									<ChevronLeftCapIcon className="size-6 stroke-normal" />
								}
								onClick={onGoToStart}
								disabled={disabled}
							/>
						</TooltipTrigger>
					</Tooltip>
					<Tooltip>
						<TooltipContent
							side="bottom"
							shortcut={["←"]}
							sideOffset={8}
							align="start"
						>
							Previous frame
						</TooltipContent>
						<TooltipTrigger asChild>
							<Button
								variant="transparent"
								sentiment="neutral"
								size="small"
								iconOnly
								aria-label="Previous frame"
								aria-keyshortcuts="ArrowLeft"
								className={transportButtonFocus}
								icon={
									<ChevronLeftIcon className="size-6 stroke-normal" />
								}
								onClick={onStepBackward}
								disabled={disabled}
							/>
						</TooltipTrigger>
					</Tooltip>
					<Tooltip>
						<TooltipContent
							side="bottom"
							shortcut={["␣"]}
							sideOffset={8}
						>
							{paused ? "Play" : "Pause"}
						</TooltipContent>
						<TooltipTrigger asChild>
							<Button
								variant="transparent"
								sentiment="neutral"
								size="small"
								iconOnly
								aria-label={paused ? "Play" : "Pause"}
								aria-keyshortcuts="Space"
								className={transportButtonFocus}
								icon={playPauseIcon}
								onClick={onPlayPause}
								disabled={disabled}
							/>
						</TooltipTrigger>
					</Tooltip>
					<Tooltip>
						<TooltipContent
							side="bottom"
							shortcut={["→"]}
							sideOffset={8}
						>
							Next frame
						</TooltipContent>
						<TooltipTrigger asChild>
							<Button
								variant="transparent"
								sentiment="neutral"
								size="small"
								iconOnly
								aria-label="Next frame"
								aria-keyshortcuts="ArrowRight"
								className={transportButtonFocus}
								icon={
									<ChevronRightIcon className="size-6 stroke-normal" />
								}
								onClick={onStepForward}
								disabled={disabled}
							/>
						</TooltipTrigger>
					</Tooltip>
					<Tooltip>
						<TooltipContent side="bottom" sideOffset={8}>
							Go to end
						</TooltipContent>
						<TooltipTrigger asChild>
							<Button
								variant="transparent"
								sentiment="neutral"
								size="small"
								iconOnly
								aria-label="Go to end"
								className={transportButtonFocus}
								icon={
									<ChevronRightCapIcon className="size-6 stroke-normal" />
								}
								onClick={onGoToEnd}
								disabled={disabled}
							/>
						</TooltipTrigger>
					</Tooltip>
				</div>

				<div className="w-px h-4 bg-weak" />

				<div className="flex items-center gap-sm label-xsmall tabular-nums">
					<span>
						<span className="text-weak">{dimPart}</span>
						<span className="text-strong">{highlightedPart}</span>
					</span>
					<span className="text-weak">/</span>
					<span className="text-weak">{totalTimeDisplay}</span>
				</div>
			</div>
		</div>
	);
}

const SECTION_HEIGHT = 46;
const CLIP_HEADER_HEIGHT = 26;
/** Left padding before first frame (Clip extended uses p-2xs) - for playhead alignment */
const FRAMES_LEFT_OFFSET = 2; // Clip extended uses p-2xs

const GifTimeline = React.forwardRef<HTMLDivElement, GifTimelineProps>(
	(
		{
			duration,
			currentTime,
			paused,
			frames,
			frameWidth,
			onSeek,
			onPlayPause,
			onStepForward,
			onStepBackward,
			onGoToStart,
			onGoToEnd,
			className,
			disabled = false,
			zoomSliderValue = 50,
			onZoomChange,
			rangeStartTime,
			rangeEndTime,
			onRangeChange,
			initTime,
			clipName = "GIF",
			clips,
			maxZoom = GIF_TIMELINE_MAX_ZOOM,
		},
		ref,
	) => {
		const [timelineZoom, setTimelineZoom] = React.useState(zoomSliderValue);
		const [, setIsZooming] = React.useState(false);
		const effectiveZoom = onZoomChange ? zoomSliderValue : timelineZoom;
		const setZoom = onZoomChange ?? setTimelineZoom;
		const zoomTimeoutRef = React.useRef<ReturnType<
			typeof setTimeout
		> | null>(null);

		const gutterWidth = PLAYHEAD_GUTTER_WIDTHS.numbered;
		const pixelsPerSecond = getTimeStampGap(effectiveZoom);
		const timelineWidth = duration * pixelsPerSecond;

		const trackRef = React.useRef<HTMLDivElement>(null);
		const scrollRef = React.useRef<HTMLDivElement>(null);
		const contentRef = React.useRef<HTMLDivElement>(null);
		const playheadRef = React.useRef<HTMLDivElement>(null);

		const [isDraggingPlayhead, setIsDraggingPlayhead] =
			React.useState(false);
		const [playheadPosition, setPlayheadPosition] = React.useState(0);

		const timeStamps = React.useMemo(
			() => calculateTimestampMarkers(duration, pixelsPerSecond),
			[duration, pixelsPerSecond],
		);

		const timeToPosition = React.useCallback(
			(t: number) => t * pixelsPerSecond,
			[pixelsPerSecond],
		);
		const positionToTime = React.useCallback(
			(x: number) => x / pixelsPerSecond,
			[pixelsPerSecond],
		);

		React.useEffect(() => {
			const pos =
				gutterWidth +
				FRAMES_LEFT_OFFSET +
				timeToPosition(Math.max(0, Math.min(currentTime, duration)));
			setPlayheadPosition(pos);
		}, [currentTime, duration, timeToPosition, gutterWidth]);

		// Scroll to initTime when timeline opens (once, retry until layout ready)
		const hasScrolledToInitRef = React.useRef(false);
		React.useEffect(() => {
			if (
				initTime == null ||
				initTime < 0 ||
				duration <= 0 ||
				hasScrolledToInitRef.current
			)
				return;
			const tryScroll = () => {
				const scrollContainer = scrollRef.current;
				const content = contentRef.current;
				if (!scrollContainer || !content) return false;
				const viewportWidth = scrollContainer.clientWidth;
				const scrollWidth = content.scrollWidth;
				if (viewportWidth <= 0 || scrollWidth <= 0) return false;
				hasScrolledToInitRef.current = true;
				const timePx =
					gutterWidth +
					FRAMES_LEFT_OFFSET +
					Math.min(initTime, duration) * pixelsPerSecond;
				const padding = 24;
				const maxScroll = Math.max(0, scrollWidth - viewportWidth);
				const targetScroll = Math.max(
					0,
					Math.min(maxScroll, timePx - padding),
				);
				scrollContainer.scrollLeft = targetScroll;
				return true;
			};
			const id = setTimeout(() => {
				if (!tryScroll()) {
					setTimeout(tryScroll, 300);
				}
			}, 400);
			return () => clearTimeout(id);
		}, [initTime, duration, pixelsPerSecond, gutterWidth]);

		const getTimeFromMouseEvent = React.useCallback(
			(e: MouseEvent | React.MouseEvent) => {
				if (!contentRef.current || !scrollRef.current) return 0;
				const rect = contentRef.current.getBoundingClientRect();
				// rect.left already accounts for scroll (content moves when scrolled)
				const positionInContent = (e as MouseEvent).clientX - rect.left;
				const timelineX =
					positionInContent - gutterWidth - FRAMES_LEFT_OFFSET;
				const clamped = Math.max(0, Math.min(timelineX, timelineWidth));
				return positionToTime(clamped);
			},
			[positionToTime, gutterWidth, timelineWidth],
		);

		const startPlayheadDrag = React.useCallback(
			(e: React.MouseEvent) => {
				if (disabled) return;
				e.preventDefault();
				e.stopPropagation();
				const time = getTimeFromMouseEvent(e);
				const clamped = Math.max(0, Math.min(time, duration));
				onSeek(clamped);
				setIsDraggingPlayhead(true);
			},
			[disabled, getTimeFromMouseEvent, duration, onSeek],
		);

		React.useEffect(() => {
			if (!isDraggingPlayhead) return;
			const handleMove = (e: MouseEvent) => {
				const time = getTimeFromMouseEvent(e);
				const clamped = Math.max(0, Math.min(time, duration));
				onSeek(clamped);
			};
			const handleUp = () => setIsDraggingPlayhead(false);
			window.addEventListener("mousemove", handleMove);
			window.addEventListener("mouseup", handleUp);
			return () => {
				window.removeEventListener("mousemove", handleMove);
				window.removeEventListener("mouseup", handleUp);
			};
		}, [isDraggingPlayhead, duration, onSeek, getTimeFromMouseEvent]);

		const handleTrackClick = (e: React.MouseEvent) => {
			if (disabled) return;
			const time = getTimeFromMouseEvent(e as unknown as MouseEvent);
			const clamped = Math.max(0, Math.min(time, duration));
			onSeek(clamped);
		};

		// Pinch-to-zoom on trackpad (Ctrl+wheel)
		React.useEffect(() => {
			const scrollContainer = scrollRef.current;
			if (!scrollContainer) return;

			const handlePinchZoom = (event: WheelEvent) => {
				const isPinchGesture =
					event.ctrlKey && Math.abs(event.deltaY) > 0;
				if (!isPinchGesture) return;

				const rect = scrollContainer.getBoundingClientRect();
				const isWithinContainer =
					event.clientX >= rect.left &&
					event.clientX <= rect.right &&
					event.clientY >= rect.top &&
					event.clientY <= rect.bottom;
				if (!isWithinContainer) return;

				event.preventDefault();
				event.stopPropagation();
				event.stopImmediatePropagation();

				const zoomSensitivity = 0.5;
				const zoomDelta = -event.deltaY * zoomSensitivity;
				const newZoomValue = Math.max(
					0,
					Math.min(maxZoom, effectiveZoom + zoomDelta),
				);

				// Zoom anchored at playhead
				const contentContainer = contentRef.current;
				const playheadElement = playheadRef.current;
				let playheadScreenPos = scrollContainer.clientWidth / 2;
				let playheadAbsolutePos =
					scrollContainer.scrollLeft + playheadScreenPos;
				if (playheadElement) {
					const playheadRect =
						playheadElement.getBoundingClientRect();
					const scrollerRect =
						scrollContainer.getBoundingClientRect();
					playheadScreenPos = playheadRect.left - scrollerRect.left;
					playheadAbsolutePos =
						scrollContainer.scrollLeft + playheadScreenPos;
				}
				const oldWidth = contentContainer?.scrollWidth || 1;

				flushSync(() => {
					setIsZooming(true);
					setZoom(newZoomValue);
				});

				if (contentContainer) {
					const newWidth = contentContainer.scrollWidth;
					const zoomRatio = newWidth / oldWidth;
					const newPlayheadAbsolutePos =
						playheadAbsolutePos * zoomRatio;
					const newScrollLeft =
						newPlayheadAbsolutePos - playheadScreenPos;
					scrollContainer.scrollLeft = Math.max(0, newScrollLeft);
				}

				if (zoomTimeoutRef.current)
					clearTimeout(zoomTimeoutRef.current);
				zoomTimeoutRef.current = setTimeout(() => {
					setIsZooming(false);
					zoomTimeoutRef.current = null;
				}, 150);
			};

			scrollContainer.addEventListener("wheel", handlePinchZoom, {
				passive: false,
				capture: true,
			});
			return () => {
				scrollContainer.removeEventListener("wheel", handlePinchZoom, {
					capture: true,
				});
				if (zoomTimeoutRef.current) {
					clearTimeout(zoomTimeoutRef.current);
					zoomTimeoutRef.current = null;
				}
			};
		}, [effectiveZoom, setZoom, maxZoom]);

		const clipBlocks: GifTimelineClip[] = clips ?? [
			{ id: "gif", name: clipName, start: 0, end: duration, frames },
		];

		const transportHandlers = {
			disabled,
			onPlayPause,
			onStepForward,
			onStepBackward,
		};

		return (
			<div
				ref={ref}
				className={cn(
					"flex flex-col bg-surface select-none rounded-t-sm group",
					className,
				)}
				data-slot="gif-timeline"
				onKeyDown={(e) => handleTransportKeyDown(e, transportHandlers)}
			>
				{/* Transport controls bar */}
				<GifTimelineTransport
					currentTime={currentTime}
					duration={duration}
					paused={paused}
					onPlayPause={onPlayPause}
					onStepForward={onStepForward}
					onStepBackward={onStepBackward}
					onGoToStart={onGoToStart}
					onGoToEnd={onGoToEnd}
					disabled={disabled}
				/>

				<div className="w-full h-px shrink-0 bg-fg-stroke-weak" />

				{/* Timeline scroller + scrollbar wrapper */}
				<div className="flex-1 min-h-0 flex flex-col relative pb-4">
					{/* Focusable so ← / → and Space work on the track (see handleTransportKeyDown) */}
					{/* biome-ignore lint/a11y/useSemanticElements: a labelled, scrollable track */}
					<div
						ref={scrollRef}
						role="group"
						aria-label="Timeline"
						aria-keyshortcuts="Space ArrowLeft ArrowRight"
						tabIndex={disabled ? -1 : 0}
						className="flex-1 min-h-0 overflow-x-scroll overflow-y-hidden scrollbar-hide mx-xs focus-visible:outline-2 focus-visible:outline-solid focus-visible:-outline-offset-2 focus-visible:outline-interaction-focused"
					>
						<div
							ref={contentRef}
							className="relative flex flex-col box-border"
							style={{
								width: `${timelineWidth + gutterWidth}px`,
								paddingLeft: `${gutterWidth}px`,
							}}
							onMouseDown={startPlayheadDrag}
						>
							<div
								className="absolute left-0 top-0 h-[32px] bg-surface pointer-events-none z-0"
								style={{ width: `${gutterWidth}px` }}
							/>
							<div
								className="z-0 absolute left-0 top-[32px] bottom-0 bg-[repeating-linear-gradient(135deg,var(--color-fg-stroke-default),var(--color-fg-stroke-strong)_0.25px,var(--color-depth-inset-1)_1px,var(--color-depth-inset-1)_8px)] pointer-events-none"
								style={{ width: `${gutterWidth}px` }}
							/>

							<Playhead
								ref={playheadRef}
								position={playheadPosition}
								timestamp={formatTimestamp(
									currentTime,
									pixelsPerSecond,
								)}
								headShape="numbered"
								headClassName="mt-md py-sm"
								onDragStart={startPlayheadDrag}
							/>

							<div className="TimestampHeader bg-surface relative w-full mb-md">
								<div className="h-md" />
								<div className="select-none relative w-full h-2xl flex flex-row items-center gap-0 overflow-hidden">
									{timeStamps
										.filter((ts) => ts.showLabel)
										.map((ts) => (
											<div
												key={ts.time}
												className="absolute flex flex-row items-center gap-xs pointer-events-none h-full"
												style={{
													left: `${gutterWidth + ts.x}px`,
												}}
											>
												<div className="w-px shrink-0 h-2xl bg-fg-stroke-weak" />
												<span className="label-xxsmall text-weak whitespace-nowrap">
													{formatTimestamp(
														ts.time,
														pixelsPerSecond,
													)}
												</span>
											</div>
										))}
									{timeStamps
										.filter((ts) => ts.isIntermediate)
										.map((ts) => (
											<div
												key={`i-${ts.time}`}
												className="absolute flex flex-row items-center gap-xs pointer-events-none h-full"
												style={{
													left: `${gutterWidth + ts.x}px`,
												}}
											>
												<div className="w-px shrink-0 h-md bg-fg-stroke-weak" />
											</div>
										))}
								</div>
							</div>

							{/* Track - ClipBlock-style frames */}
							<div
								ref={trackRef}
								className={cn(
									"relative flex flex-col z-10 bg-surface-inset-2 min-h-0 overflow-hidden rounded-xs pt-sm pb-2xs",
									disabled
										? "cursor-default"
										: "cursor-pointer",
								)}
								style={{
									minHeight: `${CLIP_HEADER_HEIGHT + SECTION_HEIGHT + 8}px`,
								}}
								onClick={handleTrackClick}
							>
								{/* Clip blocks - Clip extended variant, one per clip across its time range */}
								{clipBlocks.map((clip, i) => {
									const kind = resolveClipKind(clip);
									const start = Math.max(0, Math.min(clip.start, duration));
									const end = Math.max(start, Math.min(clip.end, duration));
									const clipFrameWidth = clip.frameWidth ?? frameWidth;
									return (
										<div
											key={clip.id}
											className="absolute top-0 bottom-0 overflow-hidden rounded-xs"
											style={{
												left: `${start * pixelsPerSecond}px`,
												width: `${(end - start) * pixelsPerSecond}px`,
											}}
										>
											<Clip
												name={clip.name}
												icon={clipIcons[kind.subType]}
												category={kind.category}
												subType={kind.subType}
												extended
												thumbnails={clip.frames.map((f) => f.src)}
												thumbnailHeight={SECTION_HEIGHT}
												thumbnailWidth={
													clipFrameWidth && clipFrameWidth > 0
														? clipFrameWidth
														: undefined
												}
												thumbnailMode={
													clip.frames.length === 0 &&
													kind.category === "audio"
														? "audio"
														: clip.frames.length === 0 &&
																(kind.category === "graphics" ||
																	kind.category === "effects")
															? "empty"
															: "frames"
												}
												data-clip-id={clip.id}
											/>
											{/* Seam between adjacent clips */}
											{i > 0 && (
												<div className="absolute left-0 top-0 bottom-0 w-px bg-surface-inset-2 pointer-events-none" />
											)}
										</div>
									);
								})}
								{/* Range selector overlay - draggable and resizable */}
								{onRangeChange &&
									rangeStartTime != null &&
									rangeEndTime != null && (
										<GifRangeSelector
											startTime={rangeStartTime}
											endTime={rangeEndTime}
											duration={duration}
											pixelsPerSecond={pixelsPerSecond}
											leftOffset={FRAMES_LEFT_OFFSET}
											height={
												CLIP_HEADER_HEIGHT +
												SECTION_HEIGHT
											}
											onRangeChange={onRangeChange}
											disabled={disabled}
										/>
									)}
							</div>
						</div>
					</div>

					<GifTimelineScrollbar
						scrollContainerRef={scrollRef}
						contentContainerRef={contentRef}
						timelineSliderValue={effectiveZoom}
						setTimelineSliderValue={setZoom}
						playheadRef={playheadRef}
						setIsZooming={setIsZooming}
						maxZoom={maxZoom}
					/>
				</div>
			</div>
		);
	},
);

GifTimeline.displayName = "GifTimeline";

export { GifTimeline, GifTimelineTransport };
