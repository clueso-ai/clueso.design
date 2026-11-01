import * as React from "react";

import { cn } from "../../../../lib/utils";

/**
 * Magnetic Hover Effect
 *
 * A reusable hover effect that creates a smooth highlight
 * that "glides" between hovered items. Used in dropdowns, context menus, tabs, etc.
 *
 * Performance: The indicator is driven entirely via refs and CSS transitions —
 * no React state updates, no re-renders on hover. Only the initial mount renders.
 *
 * Usage:
 * 1. Wrap your container with MagneticHoverRoot
 * 2. Add useMagneticHover() hook to each hoverable item
 */

interface HoverStyle {
	left: number;
	width: number;
	height: number;
	top: number;
	opacity: number;
}

type EntryDirection = "left" | "right" | "top" | "bottom" | "center";

/**
 * Determine which edge of an element the mouse entered from
 */
function getEntryDirection(
	mouseX: number,
	mouseY: number,
	rect: DOMRect,
): EntryDirection {
	// Calculate distances from mouse to each edge
	const distLeft = mouseX - rect.left;
	const distRight = rect.right - mouseX;
	const distTop = mouseY - rect.top;
	const distBottom = rect.bottom - mouseY;

	// Find the minimum horizontal and vertical distances
	const minHorizontal = Math.min(distLeft, distRight);
	const minVertical = Math.min(distTop, distBottom);

	// Return the direction of the closest edge
	if (minHorizontal < minVertical) {
		return distLeft < distRight ? "left" : "right";
	}
	return distTop < distBottom ? "top" : "bottom";
}

/**
 * Map entry direction to CSS transform-origin value
 */
function getTransformOrigin(direction: EntryDirection): string {
	switch (direction) {
		case "left":
			return "left center";
		case "right":
			return "right center";
		case "top":
			return "center top";
		case "bottom":
			return "center bottom";
		default:
			return "center center";
	}
}

// CSS transition for the indicator — fast ease-out, no bounce
const INDICATOR_TRANSITION =
	"transform 200ms ease-out, width 200ms ease-out, height 200ms ease-out, opacity 100ms ease-out";

interface MagneticHoverContextValue {
	onItemHover: (element: HTMLElement | null) => void;
	containerRef: React.RefObject<HTMLElement | null>;
}

const MagneticHoverContext =
	React.createContext<MagneticHoverContextValue | null>(null);

interface MagneticHoverRootProps {
	children: React.ReactNode;
	className?: string;
	/** Additional className for the hover indicator */
	indicatorClassName?: string;
	/** Border radius class for the indicator (default: "rounded-xs") */
	radius?: string;
}

/**
 * Root container for magnetic hover effect.
 * Renders a single indicator div driven entirely via refs + CSS transitions.
 * Zero React re-renders on hover.
 */
function MagneticHoverRoot({
	children,
	className,
	indicatorClassName,
	radius = "rounded-xs",
}: MagneticHoverRootProps) {
	const containerRef = React.useRef<HTMLDivElement>(null);
	const indicatorRef = React.useRef<HTMLDivElement>(null);
	const isVisibleRef = React.useRef(false);
	// Track last position for exit animation
	const lastPosRef = React.useRef({ x: 0, y: 0 });

	const handleItemHover = React.useCallback((element: HTMLElement | null) => {
		const indicator = indicatorRef.current;
		const container = containerRef.current;
		if (!indicator || !container) return;

		if (!element) {
			// Exit: fade out + subtle scale down at last position
			indicator.style.opacity = "0";
			indicator.style.transform = `translate3d(${lastPosRef.current.x}px, ${lastPosRef.current.y}px, 0) scale(0.96)`;
			isVisibleRef.current = false;
			return;
		}

		const containerRect = container.getBoundingClientRect();
		const elementRect = element.getBoundingClientRect();
		const x = elementRect.left - containerRect.left;
		const y = elementRect.top - containerRect.top;
		const w = elementRect.width;
		const h = elementRect.height;

		lastPosRef.current = { x, y };

		if (!isVisibleRef.current) {
			// Entry: position instantly (no transition), then fade + scale in
			indicator.style.transition = "none";
			indicator.style.transform = `translate3d(${x}px, ${y}px, 0) scale(0.96)`;
			indicator.style.width = `${w}px`;
			indicator.style.height = `${h}px`;
			indicator.style.opacity = "0";
			// Force reflow so initial styles apply before transition re-enables
			void indicator.offsetHeight;
			indicator.style.transition = INDICATOR_TRANSITION;
			indicator.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1)`;
			indicator.style.opacity = "1";
		} else {
			// Glide: CSS transition handles smooth movement
			indicator.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1)`;
			indicator.style.width = `${w}px`;
			indicator.style.height = `${h}px`;
			indicator.style.opacity = "1";
		}

		isVisibleRef.current = true;
	}, []);

	const contextValue = React.useMemo(
		() => ({
			onItemHover: handleItemHover,
			containerRef: containerRef as React.RefObject<HTMLElement | null>,
		}),
		[handleItemHover],
	);

	return (
		<MagneticHoverContext.Provider value={contextValue}>
			<div
				ref={containerRef}
				className={cn("relative", className)}
				onMouseLeave={() => handleItemHover(null)}
			>
				{/* Magnetic hover indicator — ref-driven, zero re-renders */}
				<div
					ref={indicatorRef}
					className={cn(
						"absolute pointer-events-none bg-interaction-hover",
						radius,
						indicatorClassName,
					)}
					style={{
						opacity: 0,
						left: 0,
						top: 0,
						willChange: "transform, width, height, opacity",
						transition: INDICATOR_TRANSITION,
					}}
				/>
				{children}
			</div>
		</MagneticHoverContext.Provider>
	);
}

/**
 * Hook to make an element participate in the magnetic hover effect.
 * Returns props to spread on the hoverable element.
 *
 * @param options.isActive - When true, hovering this item dismisses the indicator instead of highlighting it.
 */
function useMagneticHover<T extends HTMLElement = HTMLElement>(options?: {
	isActive?: boolean;
}) {
	const context = React.useContext(MagneticHoverContext);
	const ref = React.useRef<T>(null);
	const isActive = options?.isActive ?? false;

	const handleMouseEnter = React.useCallback(
		(e: React.MouseEvent<T>) => {
			if (isActive) {
				// Active items dismiss the indicator so it doesn't linger on the previous item
				context?.onItemHover(null);
			} else {
				context?.onItemHover(e.currentTarget);
			}
		},
		[context, isActive],
	);

	return {
		onMouseEnter: handleMouseEnter,
		ref,
		isHovered: false as boolean,
	};
}

/**
 * Get the magnetic hover context directly (for advanced use cases)
 */
function useMagneticHoverContext() {
	return React.useContext(MagneticHoverContext);
}

/**
 * Wrapper that clears the magnetic hover indicator when the mouse enters.
 * Use this around non-participating content inside a MagneticHoverRoot
 * (e.g. user info, theme toggles) to prevent the hover from getting stuck.
 */
function MagneticHoverClearZone({
	children,
	className,
	...props
}: React.ComponentProps<"div">) {
	const context = React.useContext(MagneticHoverContext);
	return (
		<div
			className={className}
			onMouseEnter={() => context?.onItemHover(null)}
			{...props}
		>
			{children}
		</div>
	);
}

export {
	MagneticHoverRoot,
	MagneticHoverClearZone,
	useMagneticHover,
	useMagneticHoverContext,
	MagneticHoverContext,
	getEntryDirection,
	getTransformOrigin,
};
export type { MagneticHoverContextValue, HoverStyle, EntryDirection };
