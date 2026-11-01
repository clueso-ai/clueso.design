import { motion } from "framer-motion"; // Used for active indicator spring animation
import * as React from "react";

import { cn } from "../../../../lib/utils";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "../../overlays/tooltip/tooltip";

/**
 * ToggleButton Component - Jigsaw Design System
 *
 * A segmented control component that matches the contained tabs visual spec.
 *
 * SIZES:
 * ┌─────────┬──────────┬──────────┬───────────────┐
 * │ Size    │ Height   │ Icon     │ Typography    │
 * ├─────────┼──────────┼──────────┼───────────────┤
 * │ small   │ 24px     │ 12px     │ label-xsmall  │
 * │ medium  │ 32px     │ 16px     │ label-small   │
 * └─────────┴──────────┴──────────┴───────────────┘
 *
 * Note: Uses reduced gap (2xs) with px padding on label container
 * so icon-only items appear square.
 */

// Size types - supports legacy "default" and "sm" for backwards compatibility
type ToggleButtonSize = "small" | "medium" | "default" | "sm";

// Normalized size type (after mapping legacy values)
type NormalizedSize = "small" | "medium";

// Size configuration matching contained tabs
const sizeConfig = {
	small: {
		containerHeight: "h-[24px]",
		iconSize: "size-3", // 12px
		typography: "label-xsmall",
		labelHeight: "h-[12px]",
		gap: "gap-2xs",
		padding: "p-xs",
		labelPadding: "px-2xs",
		radius: "rounded-2xs", // 2px
	},
	medium: {
		containerHeight: "h-[32px]",
		iconSize: "size-4", // 16px
		typography: "label-small",
		labelHeight: "h-[16px]",
		gap: "gap-2xs",
		padding: "px-sm py-md",
		labelPadding: "px-2xs",
		radius: "rounded-2xs", // 2px
	},
} as const;

// CSS transition for hover indicator — matches core magnetic-hover timing
const TOGGLE_HOVER_TRANSITION =
	"transform 200ms ease-out, width 200ms ease-out, height 200ms ease-out, opacity 100ms ease-out";

// Map legacy size values to new values
function normalizeSize(size: ToggleButtonSize): NormalizedSize {
	if (size === "default") return "medium";
	if (size === "sm") return "small";
	return size;
}

export interface ToggleButtonOption {
	value: string;
	label?: React.ReactNode;
	icon?: React.ReactNode;
	/** Tooltip text shown on hover */
	tooltip?: string;
	/** Whether this option is disabled (not selectable) */
	disabled?: boolean;
	/** Tooltip content shown on hover when disabled */
	disabledTooltip?: React.ReactNode;
	/** Called when a disabled option is clicked (e.g. to open upgrade modal) */
	onDisabledClick?: () => void;
}

export interface ToggleButtonProps extends Omit<
	React.HTMLAttributes<HTMLDivElement>,
	"onChange"
> {
	options: ToggleButtonOption[];
	value?: string;
	defaultValue?: string;
	onChange?: (value: string) => void;
	/** Size of the toggle button. Supports legacy "default"/"sm" for backwards compatibility. */
	size?: ToggleButtonSize;
	/** When true, the toggle button and its children will fill the container width evenly. */
	fullWidth?: boolean;
}

const ToggleButton = React.forwardRef<HTMLDivElement, ToggleButtonProps>(
	(
		{
			className,
			options,
			value: controlledValue,
			defaultValue,
			onChange,
			size = "small",
			fullWidth = false,
			...props
		},
		ref,
	) => {
		const containerRef = React.useRef<HTMLDivElement>(null);
		const [internalValue, setInternalValue] = React.useState(
			defaultValue ?? options[0]?.value ?? "",
		);

		// Normalize size for backwards compatibility
		const normalizedSize = normalizeSize(size);
		const config = sizeConfig[normalizedSize];

		// Auto-detect fullWidth from className for backwards compatibility
		const isFullWidth =
			fullWidth || (className?.includes("w-full") ?? false);

		const isControlled = controlledValue !== undefined;
		const currentValue = isControlled ? controlledValue : internalValue;

		// Active indicator state (sliding background)
		const [activeStyle, setActiveStyle] = React.useState({
			left: 0,
			width: 0,
			height: 0,
			top: 0,
			opacity: 0,
		});

		// Magnetic hover indicator — ref-driven, zero re-renders
		const hoverIndicatorRef = React.useRef<HTMLDivElement>(null);
		const isHoverVisibleRef = React.useRef(false);
		const lastHoverPosRef = React.useRef({ x: 0, y: 0 });

		// Update active indicator position
		const updateActiveIndicator = React.useCallback(() => {
			if (!containerRef.current) return;

			const activeButton = containerRef.current.querySelector(
				'[data-state="active"]',
			) as HTMLElement;

			if (activeButton) {
				const containerRect =
					containerRef.current.getBoundingClientRect();
				const buttonRect = activeButton.getBoundingClientRect();

				setActiveStyle({
					left: buttonRect.left - containerRect.left,
					width: buttonRect.width,
					height: buttonRect.height,
					top: buttonRect.top - containerRect.top,
					opacity: 1,
				});

				// Hide hover when active changes (mouse might be on it)
				if (hoverIndicatorRef.current) {
					hoverIndicatorRef.current.style.opacity = "0";
				}
				isHoverVisibleRef.current = false;
			}
		}, []);

		// Handle hover on items
		const handleItemHover = React.useCallback(
			(element: HTMLElement | null, isActive: boolean) => {
				const indicator = hoverIndicatorRef.current;
				if (!containerRef.current || !indicator) return;

				if (!element || isActive) {
					indicator.style.opacity = "0";
					indicator.style.transform = `translate3d(${lastHoverPosRef.current.x}px, ${lastHoverPosRef.current.y}px, 0) scale(0.96)`;
					isHoverVisibleRef.current = false;
					return;
				}

				const containerRect =
					containerRef.current.getBoundingClientRect();
				const elementRect = element.getBoundingClientRect();
				const x = elementRect.left - containerRect.left;
				const y = elementRect.top - containerRect.top;
				const w = elementRect.width;
				const h = elementRect.height;

				lastHoverPosRef.current = { x, y };

				if (!isHoverVisibleRef.current) {
					indicator.style.transition = "none";
					indicator.style.transform = `translate3d(${x}px, ${y}px, 0) scale(0.96)`;
					indicator.style.width = `${w}px`;
					indicator.style.height = `${h}px`;
					indicator.style.opacity = "0";
					void indicator.offsetHeight;
					indicator.style.transition = TOGGLE_HOVER_TRANSITION;
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
			[],
		);

		// Update indicator on mount, resize, and value changes
		React.useEffect(() => {
			updateActiveIndicator();
			window.addEventListener("resize", updateActiveIndicator);
			return () =>
				window.removeEventListener("resize", updateActiveIndicator);
		}, [updateActiveIndicator]);

		// Track value changes to trigger indicator update
		const prevValueRef = React.useRef(currentValue);
		React.useLayoutEffect(() => {
			if (prevValueRef.current !== currentValue) {
				prevValueRef.current = currentValue;
				updateActiveIndicator();
			}
		});

		const handleOptionClick = (optionValue: string) => {
			if (!isControlled) {
				setInternalValue(optionValue);
			}
			onChange?.(optionValue);
		};

		const activeSpringTransition = {
			type: "spring" as const,
			stiffness: 500,
			damping: 40,
		};

		return (
			<div
				ref={(node) => {
					// Handle both refs
					(
						containerRef as React.MutableRefObject<HTMLDivElement | null>
					).current = node;
					if (typeof ref === "function") {
						ref(node);
					} else if (ref) {
						ref.current = node;
					}
				}}
				className={cn(
					`relative items-center rounded-xs shadow-[inset_0_0_0_0.5px_var(--color-fg-stroke-weak)] bg-depth-inset-1 p-[2px] ${config.gap}`,
					isFullWidth ? "flex" : "inline-flex",
					className,
				)}
				onMouseLeave={() => handleItemHover(null, false)}
				{...props}
			>
				{/* Sliding active indicator */}
				{activeStyle.opacity > 0 && (
					<motion.div
						className="absolute pointer-events-none rounded-2xs bg-depth-elevation-2 shadow-[0px_0px_1px_0px_rgba(0,0,0,0.08),0px_1px_1px_0px_rgba(0,0,0,0.07),0px_3px_2px_0px_rgba(0,0,0,0.04)]"
						initial={false}
						animate={{
							x: activeStyle.left,
							width: activeStyle.width,
							height: activeStyle.height,
							y: activeStyle.top,
						}}
						transition={{
							x: activeSpringTransition,
							width: activeSpringTransition,
							height: activeSpringTransition,
							y: activeSpringTransition,
						}}
						style={{ left: 0, top: 0 }}
					/>
				)}

				{/* Magnetic hover indicator — ref-driven, zero re-renders */}
				<div
					ref={hoverIndicatorRef}
					className="absolute pointer-events-none rounded-2xs bg-interaction-hover"
					style={{
						opacity: 0,
						left: 0,
						top: 0,
						willChange: "transform, width, height, opacity",
						transition: TOGGLE_HOVER_TRANSITION,
					}}
				/>

				{/* Option buttons */}
				{options.map((option) => {
					const isActive = currentValue === option.value;
					const hasLabel = Boolean(option.label);
					const isDisabled = option.disabled;

					const button = (
						<button
							key={option.value}
							type="button"
							role="tab"
							aria-selected={isActive}
							aria-disabled={isDisabled}
							data-state={isActive ? "active" : "inactive"}
							className={cn(
								"relative z-[1] inline-flex items-center justify-center outline-none",
								isFullWidth && "flex-1",
								config.gap,
								config.typography,
								"whitespace-nowrap transition-colors",
								`[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:${config.iconSize}`,
								config.padding,
								config.radius,
								isDisabled
									? "opacity-50 cursor-not-allowed"
									: "cursor-pointer",
								// Text colors - active vs inactive
								isActive ? "text-strong" : "text-weak",
								// Icon colors
								isActive
									? "[&_svg]:stroke-normal"
									: "[&_svg]:stroke-weak",
							)}
							onClick={() => {
								if (!isDisabled) {
									handleOptionClick(option.value);
								}
							}}
							onMouseEnter={(e) =>
								!isDisabled &&
								handleItemHover(e.currentTarget, isActive)
							}
						>
							{option.icon}
							{hasLabel && (
								<span
									className={cn(
										config.labelHeight,
										config.labelPadding,
										"flex items-center",
									)}
								>
									{option.label}
								</span>
							)}
						</button>
					);

					const tooltipContent =
						isDisabled && option.disabledTooltip
							? option.disabledTooltip
							: option.tooltip;

					if (
						isDisabled &&
						(option.disabledTooltip || option.onDisabledClick)
					) {
						return (
							<Tooltip key={option.value} delayDuration={100}>
								<TooltipTrigger asChild>
									<div
										className={cn(
											"inline-flex",
											isFullWidth && "flex-1",
										)}
										style={{ pointerEvents: "auto" }}
									>
										{button}
									</div>
								</TooltipTrigger>
								<TooltipContent side="bottom" align="center">
									<span
										className="!text-strong !no-underline cursor-pointer"
										onClick={(e) => {
											// Hide tooltip immediately by hiding the content
											const content = (
												e.target as HTMLElement
											).closest(
												"[data-slot=tooltip-content]",
											);
											if (content)
												(
													content as HTMLElement
												).style.display = "none";
											option.onDisabledClick?.();
										}}
									>
										<span className="!text-brand-normal hover:!underline">
											Upgrade
										</span>
										<span className="!text-weak">
											{" "}
											to unlock
										</span>
									</span>
								</TooltipContent>
							</Tooltip>
						);
					}

					if (tooltipContent) {
						return (
							<Tooltip key={option.value}>
								<TooltipTrigger asChild>
									{button}
								</TooltipTrigger>
								<TooltipContent>
									{tooltipContent}
								</TooltipContent>
							</Tooltip>
						);
					}

					return button;
				})}
			</div>
		);
	},
);

ToggleButton.displayName = "ToggleButton";

export { ToggleButton };
export type { ToggleButtonSize };
