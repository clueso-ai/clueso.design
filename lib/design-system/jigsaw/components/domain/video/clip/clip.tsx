import AnimationIcon from "@icons/icons/Editing Design/Animation.svg?react";
import DiamondIcon from "@icons/icons/Shapes/Diamond.svg?react";
import * as React from "react";
import { cn } from "../../../../lib/utils";

/**
 * Clip Category Types
 * Categories determine the color of the clip
 */
export type ClipCategory = "visuals" | "audio" | "graphics" | "effects";

/**
 * Clip SubType Types
 * SubTypes provide more specific classification within each category
 */
export type ClipSubType =
	| "video"
	| "image"
	| "avatar" // visuals
	| "audio" // audio
	| "text"
	| "rectangle"
	| "arrow" // graphics
	| "blur"
	| "spotlight"
	| "callout"
	| "zoom"; // effects

/**
 * Background style objects for each clip category.
 * Categories determine the gradient color of the clip.
 */
const categoryBackgrounds: Record<ClipCategory, { background: string }> = {
	visuals: {
		background:
			"linear-gradient(270deg, var(--color-clip-visuals-overlay-start, oklch(52% 0.16 255)) 0%, var(--color-clip-visuals-overlay-end, oklch(48% 0.18 255)) 100%), linear-gradient(270deg, var(--color-clip-visuals-start, oklch(45% 0.18 255)) 0%, var(--color-clip-visuals-end, oklch(35% 0.15 255)) 100%)",
	},
	audio: {
		background:
			"linear-gradient(270deg, var(--color-clip-audio-start, oklch(50% 0.12 160)) 0%, var(--color-clip-audio-end, oklch(48% 0.14 160)) 100%)",
	},
	graphics: {
		background:
			"linear-gradient(270deg, var(--color-clip-graphics-start, oklch(55% 0.18 300)) 0%, var(--color-clip-graphics-end, oklch(45% 0.20 300)) 100%)",
	},
	effects: {
		background:
			"linear-gradient(270deg, var(--color-clip-effects-start, oklch(60% 0.16 45)) 0%, var(--color-clip-effects-end, oklch(50% 0.18 45)) 100%)",
	},
};

/**
 * Maps subTypes to their parent category for convenience
 */
export const subTypeToCategory: Record<ClipSubType, ClipCategory> = {
	video: "visuals",
	image: "visuals",
	avatar: "visuals",
	audio: "audio",
	text: "graphics",
	rectangle: "graphics",
	arrow: "graphics",
	blur: "effects",
	spotlight: "effects",
	callout: "effects",
	zoom: "effects",
};

/**
 * Maps categories to their valid subTypes
 */
export const categorySubTypes: Record<ClipCategory, ClipSubType[]> = {
	visuals: ["video", "image", "avatar"],
	audio: ["audio"],
	graphics: ["text", "rectangle", "arrow"],
	effects: ["blur", "spotlight", "callout", "zoom"],
};

interface ClipProps extends React.HTMLAttributes<HTMLDivElement> {
	/** The name/label of the clip */
	name: string;
	/** Icon to display - can be a React element (e.g., <VideoIcon />) */
	icon?: React.ReactElement;

	/** Category of clip - determines the color (visuals=blue, audio=green, graphics=purple, effects=orange) */
	category?: ClipCategory;
	/** SubType of clip - more specific type within the category */
	subType?: ClipSubType;

	/** Whether the clip is selected */
	selected?: boolean;
	/** Whether to show extended view with thumbnails */
	extended?: boolean;
	/** Array of thumbnail image URLs to display when extended */
	thumbnails?: string[];
	/** Height of thumbnail container in pixels (default: 60, min: 40, max: 120) */
	thumbnailHeight?: number;
	/** Width of each thumbnail in pixels - when provided, overrides 16:9 calculation (for timeline alignment) */
	thumbnailWidth?: number;
	/** Thumbnail display mode based on clip type */
	thumbnailMode?: "frames" | "image" | "audio" | "empty";
	/** Waveform data for audio visualization (array of amplitude values 0-1) */
	waveformData?: number[];

	/** Whether to show status indicators section */
	showStatusIndicators?: boolean;
	/** Show keyframes indicator (diamond icon at 60% opacity) */
	keyframes?: boolean;
	/** Show animation preset indicator */
	animation?: boolean;

	/** Callback when clip is clicked */
	onClipClick?: () => void;
	/** Callback when left resize handle is dragged */
	onLeftResize?: (e: React.MouseEvent) => void;
	/** Callback when right resize handle is dragged */
	onRightResize?: (e: React.MouseEvent) => void;
	/** Which side is currently being dragged (for yellow glow) */
	draggingSide?: "left" | "right" | null;
}

// Simple waveform component for audio visualization
function Waveform({
	data,
	height,
	className,
}: {
	data: number[];
	height: number;
	className?: string;
}) {
	// Use provided data - bars should be stable and not regenerated
	const bars = data;

	if (bars.length === 0) return null;

	return (
		<div
			className={cn("flex items-end gap-[1px] w-full", className)}
			style={{ height }}
		>
			{bars.map((amplitude, i) => (
				<div
					key={`bar-${i}-${amplitude.toFixed(3)}`}
					className="bg-white/40 rounded-t-[0.5px]"
					style={{
						height: `${amplitude * 100}%`,
						width: "1px",
						minWidth: "1px",
					}}
				/>
			))}
		</div>
	);
}

function Clip({
	name,
	icon,
	category = "visuals",
	subType = "video",
	selected = false,
	extended = false,
	thumbnails = [],
	thumbnailHeight = 60,
	thumbnailWidth: thumbnailWidthProp,
	thumbnailMode = "frames",
	waveformData = [],
	showStatusIndicators = false,
	keyframes = false,
	animation = false,
	className,
	onClipClick,
	onLeftResize,
	onRightResize,
	draggingSide = null,
	...props
}: ClipProps) {
	// Clamp thumbnail height between min and max
	const clampedThumbnailHeight = Math.max(40, Math.min(120, thumbnailHeight));

	// Use provided thumbnailWidth or calculate from 16:9
	const thumbnailWidth =
		thumbnailWidthProp ?? Math.round(clampedThumbnailHeight * (16 / 9));
	// Selection state styles
	const selectionStyles = selected
		? {
				outline: "1.5px solid var(--yellow-40, #F59E0B)",
				outlineOffset: "-1.5px",
				boxShadow: "0 0 3px 0 var(--yellow-30, #FBBF24)",
			}
		: {};

	// Check if any status indicators should be shown
	const hasStatusIndicators =
		showStatusIndicators && (keyframes || animation);

	return (
		<div
			className={cn(
				"relative flex flex-col justify-center items-start overflow-hidden box-border select-none",
				"transition-all duration-200",
				// Hover state - subtle brightness increase
				"hover:brightness-110",
				extended ? "h-auto" : "h-[26px]",
				className,
			)}
			style={{
				...categoryBackgrounds[category],
				...selectionStyles,
			}}
			data-slot="clip"
			data-category={category}
			data-subtype={subType}
			data-extended={extended}
			data-selected={selected}
			{...props}
		>
			{/* Main Clip Content */}
			<div
				className="relative w-full shrink-0 flex-1 flex items-center justify-center transition-colors cursor-pointer"
				onClick={onClipClick}
			>
				<div className="flex flex-col items-start overflow-clip rounded-[inherit] w-full">
					{/* Clip Header */}
					<div className="w-full px-sm py-xs overflow-hidden flex items-center justify-between shrink-0 h-[26px]">
						{/* Left side: Icon + Name */}
						<div className="flex gap-xs items-center min-w-0 flex-1 overflow-hidden">
							{/* Icon - opacity-50 for 0.5 alpha on all icon types */}
							{icon && (
								<div className="shrink-0 size-4 opacity-50 [&>svg]:size-4 flex items-center justify-center text-static-white">
									{icon}
								</div>
							)}

							{/* Clip Name */}
							<span className="text-static-white label-xsmall truncate min-w-0">
								{name}
							</span>
						</div>

						{/* Right side: Status Indicators */}
						{hasStatusIndicators && (
							<div
								className="flex gap-xs items-center shrink-0 ml-lg"
								data-slot="clip-status-indicators"
							>
								{/* Keyframes indicator - Diamond icon at 60% opacity */}
								{keyframes && (
									<div
										className="size-3 flex items-center justify-center opacity-60 text-static-white [&>svg]:size-3"
										data-slot="clip-keyframes-indicator"
										title="Has keyframes"
									>
										<DiamondIcon />
									</div>
								)}

								{/* Animation indicator */}
								{animation && (
									<div
										className="size-3 flex items-center justify-center opacity-50 text-static-white [&>svg]:size-3"
										data-slot="clip-animation-indicator"
										title="Has animation preset"
									>
										<AnimationIcon />
									</div>
								)}
							</div>
						)}
					</div>

					{/* Thumbnail Container - Only show when extended */}
					{extended && (
						<div
							className="box-border flex flex-col items-start p-2xs w-full"
							data-slot="clip-thumbnails"
						>
							<div
								className="relative flex flex-col overflow-clip rounded-2xs w-full"
								style={{
									height: `${clampedThumbnailHeight}px`,
								}}
							>
								{/* Frames mode (video) - thumbnails above, waveform below */}
								{thumbnailMode === "frames" &&
									thumbnails.length > 0 && (
										<>
											{/* Video frames - takes remaining space */}
											<div
												className="flex gap-px items-start flex-1 min-h-0"
												style={{
													height:
														waveformData.length > 0
															? `${clampedThumbnailHeight - 24}px`
															: "100%",
												}}
											>
												{thumbnails.map((thumbnail, i) => (
													<div
														// biome-ignore lint/suspicious/noArrayIndexKey: frames can repeat the same src
														key={i}
														className="h-full relative shrink-0"
														style={{
															width: thumbnailWidth,
														}}
														data-slot="clip-thumbnail"
													>
														<img
															alt=""
															className="absolute object-center object-cover pointer-events-none size-full"
															src={thumbnail}
														/>
													</div>
												))}
											</div>
											{/* Waveform below frames with black 30% bg - pt-xs for top spacing */}
											{waveformData.length > 0 && (
												<div
													className="w-full flex items-end shrink-0 pt-xs"
													style={{
														backgroundColor:
															"rgba(0, 0, 0, 0.3)",
														height: "28px",
													}}
												>
													<Waveform
														data={waveformData}
														height={24}
														className="opacity-60"
													/>
												</div>
											)}
										</>
									)}

								{/* Image mode - same frame repeated using CSS background */}
								{thumbnailMode === "image" &&
									thumbnails.length > 0 && (
										<div
											className="w-full h-full"
											style={{
												backgroundImage: `url(${thumbnails[0]})`,
												backgroundSize: `${thumbnailWidth}px 100%`,
												backgroundRepeat: "repeat-x",
												backgroundPosition:
													"left center",
											}}
										/>
									)}

								{/* Audio mode - waveform only with black 30% background, pt-xs for top spacing */}
								{thumbnailMode === "audio" && (
									<div
										className="w-full h-full flex items-end pt-xs rounded-2xs"
										style={{
											backgroundColor:
												"rgba(0, 0, 0, 0.3)",
										}}
									>
										<Waveform
											data={waveformData}
											height={clampedThumbnailHeight - 4}
											className="opacity-60"
										/>
									</div>
								)}

								{/* Empty mode (graphics/effects) - consistent height, no content */}
								{thumbnailMode === "empty" && (
									<div className="h-full w-full" />
								)}

								{/* Fallback for frames/image with no thumbnails */}
								{(thumbnailMode === "frames" ||
									thumbnailMode === "image") &&
									thumbnails.length === 0 && (
										<div className="h-full w-full bg-black/20 rounded-2xs" />
									)}
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Left Resize Handle with custom cursor */}
			{onLeftResize && (
				<>
					<div
						className="absolute left-0 top-0 bottom-0 w-3 z-10 cursor-ew-resize"
						onMouseDown={(e) => {
							e.stopPropagation();
							e.preventDefault();
							onLeftResize(e);
						}}
						data-slot="clip-resize-left"
					/>
					{/* Yellow glow on left edge while dragging */}
					{draggingSide === "left" && (
						<div
							className="absolute left-0 top-0 bottom-0 w-[1.5px] z-20 pointer-events-none"
							style={{
								backgroundColor: "var(--yellow-40, #F59E0B)",
								boxShadow:
									"0 0 3px 0 var(--yellow-30, #FBBF24)",
							}}
						/>
					)}
				</>
			)}

			{/* Right Resize Handle with custom cursor */}
			{onRightResize && (
				<>
					<div
						className="absolute right-0 top-0 bottom-0 w-3 z-10 cursor-ew-resize"
						onMouseDown={(e) => {
							e.stopPropagation();
							e.preventDefault();
							onRightResize(e);
						}}
						data-slot="clip-resize-right"
					/>
					{/* Yellow glow on right edge while dragging */}
					{draggingSide === "right" && (
						<div
							className="absolute right-0 top-0 bottom-0 w-[1.5px] z-20 pointer-events-none"
							style={{
								backgroundColor: "var(--yellow-40, #F59E0B)",
								boxShadow:
									"0 0 3px 0 var(--yellow-30, #FBBF24)",
							}}
						/>
					)}
				</>
			)}
		</div>
	);
}

Clip.displayName = "Clip";

export { Clip };
export type { ClipProps };
