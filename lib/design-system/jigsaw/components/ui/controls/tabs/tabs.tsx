import * as TabsPrimitive from "@radix-ui/react-tabs";
import { motion } from "framer-motion";
import * as React from "react";

import { cn } from "../../../../lib/utils";

/**
 * Tabs Component - Jigsaw Design System
 *
 * SIZES (contained):
 * ┌─────────┬──────────┬──────────┬───────────────┐
 * │ Size    │ Height   │ Icon     │ Typography    │
 * ├─────────┼──────────┼──────────┼───────────────┤
 * │ xsmall  │ 24px     │ 12px     │ label-xsmall  │
 * │ small   │ 28px     │ 12px     │ label-xsmall  │
 * │ medium  │ 32px     │ 16px     │ label-small   │
 * └─────────┴──────────┴──────────┴───────────────┘
 *
 * Note: Contained tabs use reduced gap (2xs) with px padding on label container
 * so icon-only tabs appear square.
 */

// Variant types
type TabsVariant = "line" | "contained";
type TabsSize = "xsmall" | "small" | "medium";

// Size configuration for Tabs
const tabsSizeConfig = {
	xsmall: {
		iconSize: "size-3", // 12px
		typography: "label-xsmall",
		labelHeight: "h-[12px]",
		// Line variant: gap-xs, no label padding
		lineGap: "gap-xs",
		linePadding: "p-xs",
		// Contained variant: gap-2xs, label has px-2xs for square icon-only tabs
		containedGap: "gap-2xs",
		containedListGap: "gap-2xs", // Gap between tabs in the list
		containedPadding: "p-xs",
		labelPadding: "px-2xs", // Only for contained variant
		radius: "rounded-2xs", // 2px
	},
	small: {
		iconSize: "size-3", // 12px
		typography: "label-xsmall",
		labelHeight: "h-[12px]",
		// Line variant
		lineGap: "gap-xs",
		linePadding: "p-xs",
		// Contained variant: p-sm gives 28px total height
		containedGap: "gap-2xs",
		containedListGap: "gap-2xs", // Gap between tabs in the list
		containedPadding: "p-sm",
		labelPadding: "px-2xs", // Only for contained variant
		radius: "rounded-2xs", // 2px
	},
	medium: {
		iconSize: "size-4", // 16px
		typography: "label-small",
		labelHeight: "h-[16px]",
		// Line variant
		lineGap: "gap-xs",
		linePadding: "px-sm py-md",
		// Contained variant
		containedGap: "gap-2xs",
		containedListGap: "gap-xs", // Gap between tabs in the list
		containedPadding: "px-sm py-md",
		labelPadding: "px-2xs",
		radius: "rounded-2xs", // 2px
	},
} as const;

// CSS transition for hover indicator — matches core magnetic-hover timing
const TABS_HOVER_TRANSITION =
	"transform 200ms ease-out, width 200ms ease-out, height 200ms ease-out, opacity 100ms ease-out";

// Context to pass variant and size from TabsList to TabsTrigger
const TabsVariantContext = React.createContext<TabsVariant>("line");
const TabsSizeContext = React.createContext<TabsSize>("xsmall");

// Context for magnetic hover effect - passes hover handler from TabsList to TabsTrigger
interface HoverContextValue {
	onTriggerHover: (element: HTMLElement | null, isActive: boolean) => void;
}
const HoverContext = React.createContext<HoverContextValue | null>(null);

function Tabs({
	className,
	...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
	return (
		<TabsPrimitive.Root
			data-slot="tabs"
			className={cn("flex flex-col", className)}
			{...props}
		/>
	);
}

interface TabsListProps extends React.ComponentProps<
	typeof TabsPrimitive.List
> {
	variant?: TabsVariant;
	/** Size of the tabs (xsmall: 24px, small: 28px, medium: 32px) @default "xsmall" */
	size?: TabsSize;
}

function TabsList({
	className,
	variant = "line",
	size = "xsmall",
	...props
}: TabsListProps) {
	const listRef = React.useRef<HTMLDivElement>(null);
	// Line variant underline indicator — null until first measurement
	const [indicatorStyle, setIndicatorStyle] = React.useState<{
		left: number;
		width: number;
	} | null>(null);

	// Contained variant active indicator (sliding background)
	const [containedActiveStyle, setContainedActiveStyle] = React.useState<{
		left: number;
		width: number;
		height: number;
		top: number;
		opacity: number;
	} | null>(null);

	// Magnetic hover indicator — ref-driven, zero re-renders
	const hoverIndicatorRef = React.useRef<HTMLDivElement>(null);
	const isHoverVisibleRef = React.useRef(false);
	const lastHoverPosRef = React.useRef({ x: 0, y: 0 });

	// Handler for when a trigger is hovered
	const handleTriggerHover = React.useCallback(
		(element: HTMLElement | null, isActive: boolean) => {
			const indicator = hoverIndicatorRef.current;
			if (!listRef.current || !indicator) return;

			if (!element) {
				indicator.style.opacity = "0";
				indicator.style.transform = `translate3d(${lastHoverPosRef.current.x}px, ${lastHoverPosRef.current.y}px, 0) scale(0.96)`;
				isHoverVisibleRef.current = false;
				return;
			}

			// For contained variant, don't show hover on active tab
			if (variant === "contained" && isActive) {
				indicator.style.opacity = "0";
				indicator.style.transform = `translate3d(${lastHoverPosRef.current.x}px, ${lastHoverPosRef.current.y}px, 0) scale(0.96)`;
				isHoverVisibleRef.current = false;
				return;
			}

			const listRect = listRef.current.getBoundingClientRect();
			const triggerRect = element.getBoundingClientRect();
			const x = triggerRect.left - listRect.left;
			const y = triggerRect.top - listRect.top;
			const w = triggerRect.width;
			const h = triggerRect.height;

			lastHoverPosRef.current = { x, y };

			if (!isHoverVisibleRef.current) {
				// Entry: position instantly, then fade in
				indicator.style.transition = "none";
				indicator.style.transform = `translate3d(${x}px, ${y}px, 0) scale(0.96)`;
				indicator.style.width = `${w}px`;
				indicator.style.height = `${h}px`;
				indicator.style.opacity = "0";
				void indicator.offsetHeight;
				indicator.style.transition = TABS_HOVER_TRANSITION;
				indicator.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1)`;
				indicator.style.opacity = "1";
			} else {
				indicator.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1)`;
				indicator.style.width = `${w}px`;
				indicator.style.height = `${h}px`;
				indicator.style.opacity = "1";
			}

			isHoverVisibleRef.current = true;
		},
		[variant],
	);

	const hoverContextValue = React.useMemo(
		() => ({ onTriggerHover: handleTriggerHover }),
		[handleTriggerHover],
	);

	React.useLayoutEffect(() => {
		const updateIndicator = () => {
			if (!listRef.current) return;

			const activeTab = listRef.current.querySelector(
				'[data-state="active"]',
			) as HTMLElement;

			if (activeTab) {
				// Use offsetLeft/offsetWidth instead of getBoundingClientRect
				// so measurements are unaffected by CSS transforms (e.g. modal
				// open animation with scale(0.95)).
				const left = activeTab.offsetLeft;
				const top = activeTab.offsetTop;

				if (variant === "line") {
					setIndicatorStyle({
						left,
						width: activeTab.offsetWidth,
					});
				} else if (variant === "contained") {
					setContainedActiveStyle({
						left,
						width: activeTab.offsetWidth,
						height: activeTab.offsetHeight,
						top,
						opacity: 1,
					});
					// Hide hover indicator when active tab changes (mouse might be on it)
					if (hoverIndicatorRef.current) {
						hoverIndicatorRef.current.style.opacity = "0";
					}
					isHoverVisibleRef.current = false;
				}
			}
		};

		updateIndicator();

		// Use MutationObserver to detect tab changes
		const mutationObserver = new MutationObserver(updateIndicator);
		if (listRef.current) {
			mutationObserver.observe(listRef.current, {
				attributes: true,
				subtree: true,
				attributeFilter: ["data-state"],
			});
		}

		// ResizeObserver on the list and each tab — handles async layout
		// changes like web font loading (widths shift after first paint),
		// container resizes, or tab content changes.
		const resizeObserver = new ResizeObserver(updateIndicator);
		if (listRef.current) {
			resizeObserver.observe(listRef.current);
			listRef.current
				.querySelectorAll('[role="tab"]')
				.forEach((el) => resizeObserver.observe(el));
		}

		// Remeasure once document fonts are ready (covers the common
		// "widths change after font swap" case on hard refresh).
		if (typeof document !== "undefined" && "fonts" in document) {
			document.fonts.ready.then(updateIndicator);
		}

		// Also update on window resize
		window.addEventListener("resize", updateIndicator);

		return () => {
			mutationObserver.disconnect();
			resizeObserver.disconnect();
			window.removeEventListener("resize", updateIndicator);
		};
	}, [variant]);

	const isLine = variant === "line";
	const isContained = variant === "contained";
	const sizeConfig = tabsSizeConfig[size];

	return (
		<TabsVariantContext.Provider value={variant}>
			<TabsSizeContext.Provider value={size}>
				<HoverContext.Provider value={hoverContextValue}>
					<TabsPrimitive.List
						ref={listRef}
						data-slot="tabs-list"
						data-variant={variant}
						data-size={size}
						className={cn(
							"relative flex items-center",
							// Line variant styles - border is 1px inset from bottom
							isLine &&
								"h-auto w-full justify-start border-b border-weak px-sm gap-md",
							// Contained variant styles
							isContained &&
								`inline-flex w-fit rounded-xs shadow-[inset_0_0_0_1px_var(--color-fg-stroke-weak)] bg-depth-inset-1 p-[2px] ${sizeConfig.containedListGap}`,
							className,
						)}
						onMouseLeave={() => handleTriggerHover(null, false)}
						{...props}
					>
						{/* Contained variant: Sliding active indicator with spring animation */}
						{isContained && containedActiveStyle && (
							<motion.div
								className="absolute pointer-events-none rounded-2xs bg-depth-elevation-2 shadow-[0px_0px_1px_0px_rgba(0,0,0,0.08),0px_1px_1px_0px_rgba(0,0,0,0.07),0px_3px_2px_0px_rgba(0,0,0,0.04)]"
								initial={false}
								animate={{
									x: containedActiveStyle.left,
									width: containedActiveStyle.width,
									height: containedActiveStyle.height,
									y: containedActiveStyle.top,
								}}
								transition={{
									x: {
										type: "spring",
										stiffness: 500,
										damping: 40,
									},
									width: {
										type: "spring",
										stiffness: 500,
										damping: 40,
									},
									height: {
										type: "spring",
										stiffness: 500,
										damping: 40,
									},
									y: {
										type: "spring",
										stiffness: 500,
										damping: 40,
									},
								}}
								style={{ left: 0, top: 0 }}
							/>
						)}

						{/* Magnetic hover indicator — ref-driven, zero re-renders */}
						<div
							ref={hoverIndicatorRef}
							className={cn(
								"absolute pointer-events-none bg-interaction-hover-subtle rounded-2xs",
							)}
							style={{
								opacity: 0,
								left: 0,
								top: 0,
								willChange: "transform, width, height, opacity",
								transition: TABS_HOVER_TRANSITION,
							}}
						/>
						{props.children}
						{/* Only show underline indicator for line variant - positioned 2px inset */}
						{isLine && indicatorStyle && (
							<span
								className="absolute bottom-[-1px] h-[1px] bg-brand-normal transition-all duration-300 ease-out"
								style={{
									left: `${indicatorStyle.left}px`,
									width: `${indicatorStyle.width}px`,
								}}
							/>
						)}
					</TabsPrimitive.List>
				</HoverContext.Provider>
			</TabsSizeContext.Provider>
		</TabsVariantContext.Provider>
	);
}

interface TabsTriggerProps extends React.ComponentProps<
	typeof TabsPrimitive.Trigger
> {
	icon?: React.ReactNode;
}

function TabsTrigger({
	className,
	icon,
	children,
	...props
}: TabsTriggerProps) {
	const variant = React.useContext(TabsVariantContext);
	const size = React.useContext(TabsSizeContext);
	const hoverContext = React.useContext(HoverContext);
	const config = tabsSizeConfig[size];
	const isContained = variant === "contained";
	const hasChildren = Boolean(children);

	// Handler for magnetic hover effect
	const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
		if (hoverContext) {
			const isActive = e.currentTarget.dataset.state === "active";
			// For line variant, we want to highlight the inner container, not the whole trigger
			const target =
				variant === "line"
					? (e.currentTarget.querySelector(
							'[data-slot="tabs-trigger-inner"]',
						) as HTMLElement)
					: e.currentTarget;
			hoverContext.onTriggerHover(target, isActive);
		}
	};

	// Contained variant - styles applied directly to trigger
	// Uses reduced gap with px padding on label for square icon-only tabs
	// Note: Active background is handled by sliding indicator in TabsList
	if (isContained) {
		return (
			<TabsPrimitive.Trigger
				data-slot="tabs-trigger"
				data-size={size}
				className={cn(
					"relative z-[1] inline-flex items-center justify-center cursor-pointer outline-none focus-visible:outline-none",
					config.containedGap,
					config.typography,
					"whitespace-nowrap transition-colors",
					"disabled:pointer-events-none disabled:opacity-50",
					`[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:${config.iconSize}`,
					"[&_img]:pointer-events-none [&_img]:shrink-0",
					config.containedPadding,
					config.radius,
					"text-weak",
					// Active text/icon colors only - background handled by sliding indicator
					"data-[state=active]:text-strong",
					"[&_svg]:stroke-weak data-[state=active]:[&_svg]:stroke-strong",
					className,
				)}
				onMouseEnter={handleMouseEnter}
				{...props}
			>
				{icon}
				{hasChildren && (
					<span
						className={cn(
							config.labelHeight,
							config.labelPadding,
							"flex items-center",
						)}
					>
						{children}
					</span>
				)}
			</TabsPrimitive.Trigger>
		);
	}

	// Line variant - has inner container with gap from bottom border
	return (
		<TabsPrimitive.Trigger
			data-slot="tabs-trigger"
			data-size={size}
			className={cn(
				"group relative cursor-pointer pb-xs outline-none focus-visible:outline-none",
				"disabled:pointer-events-none disabled:opacity-50",
				className,
			)}
			onMouseEnter={handleMouseEnter}
			{...props}
		>
			{/* Inner container */}
			<span
				className={cn(
					"inline-flex items-center justify-center",
					config.lineGap,
					config.typography,
					"whitespace-nowrap transition-colors",
					`[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:${config.iconSize}`,
					"[&_img]:pointer-events-none [&_img]:shrink-0",
					config.linePadding,
					config.radius,
					"text-weak",
					// Removed group-hover:bg-interaction-hover - magnetic hover handles this
					"group-data-[state=active]:text-strong",
					"[&_svg]:stroke-weak group-data-[state=active]:[&_svg]:stroke-strong",
				)}
				data-slot="tabs-trigger-inner"
			>
				{icon}
				{hasChildren && (
					<span
						className={cn(config.labelHeight, "flex items-center")}
					>
						{children}
					</span>
				)}
			</span>
		</TabsPrimitive.Trigger>
	);
}

function TabsContent({
	className,
	...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
	return (
		<TabsPrimitive.Content
			data-slot="tabs-content"
			className={cn("flex-1 outline-none", className)}
			{...props}
		/>
	);
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
export type { TabsVariant, TabsSize, TabsListProps, TabsTriggerProps };
