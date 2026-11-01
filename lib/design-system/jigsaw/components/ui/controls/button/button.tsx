import ChevronDownIcon from "@icons/icons/Arrows and Directions/Chevron-down.svg?react";
import SpinnerIcon from "@icons/icons/Technical Concepts/Spinner.svg?react";
import { type VariantProps, cva } from "class-variance-authority";
import * as React from "react";
import { cn } from "../../../../lib/utils";

/**
 * Button Component - Jigsaw Design System
 *
 * Built from Figma specs with exact measurements:
 *
 * DIMENSIONS (from Figma):
 * ┌─────────┬──────────┬──────────────────┬─────────┬─────────────┬───────────────┐
 * │ Size    │ Icon     │ Padding (H)      │ Gap     │ Radius      │ Typography    │
 * ├─────────┼──────────┼──────────────────┼─────────┼─────────────┼───────────────┤
 * │ XSmall  │ 14px     │ 6px (sm)         │ 2px     │ 4px (xs)    │ label-xsmall  │
 * │ Small   │ 16px     │ 8px (md)         │ 2px     │ 4px (xs)    │ label-xsmall  │
 * │ Medium  │ 16px     │ 12px (xl)        │ 2px     │ 6px (sm)    │ label-small   │
 * │ Large   │ 20px     │ 16px (2xl)       │ 4px     │ 6px (sm)    │ label-medium  │
 * └─────────┴──────────┴──────────────────┴─────────┴─────────────┴───────────────┘
 *
 * OVERALL HEIGHTS:
 * - XSmall: 24px, Small: 28px, Medium: 32px, Large: 40px
 *
 * STRUCTURE:
 * Button (px-[h] py-[v], gap-[g])
 *   ├── Icon before container (optional)
 *   ├── Label container (h-[14/16/16/20px] px-xs py-2xs)
 *   └── Icon after container (optional)
 *
 * INNER SHADOW:
 * - Brand filled: inset 0px 0px 0.5px 1px rgba(255,255,255,0.35)
 * - Neutral filled: inset 0px 0px 0px 1px rgba(255,255,255,0.3)
 * - Negative filled: inset 0px 0px 0px 1px rgba(255,255,255,0.35)
 *
 * INTERACTIONS:
 * - Hover: 7% black overlay (light), 4% white overlay (dark)
 * - Pressed: 16% black overlay (light), 8% white overlay (dark)
 */

const buttonVariants = cva(
	// Base styles - using flexbox (gap defined per size)
	`inline-flex items-center justify-center cursor-pointer
	whitespace-nowrap transition-all duration-150 ease-out
	disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50
	focus:outline-none focus:ring-0
	focus-visible:outline-none focus-visible:ring-0
	select-none relative`,
	{
		variants: {
			size: {
				xsmall: "h-[24px] px-sm gap-2xs rounded-xs", // 24px exact height
				small: "h-[28px] px-md gap-2xs rounded-xs", // 28px exact height
				medium: "h-[32px] px-xl gap-2xs rounded-sm", // 32px exact height
				large: "h-[40px] px-2xl gap-xs rounded-sm", // 40px exact height
			},
			sentiment: {
				brand: "",
				neutral: "",
				negative: "",
			},
			variant: {
				filled: "",
				outlined: "",
				transparent: "bg-transparent",
				link: "bg-transparent underline-offset-2 !p-0",
			},
		},
		compoundVariants: [
			// ============================================
			// FILLED VARIANTS
			// Pseudo-element overlay for hover/pressed states
			// Interaction border via box-shadow on hover/active
			// ============================================
			{
				variant: "filled",
				sentiment: "brand",
				class: `text-static-white
					bg-[linear-gradient(225deg,#f770e3_0%,#dd41c6_100%)]
					shadow-[inset_0px_0px_0px_0.5px_var(--pink-60),inset_0px_0px_0px_1px_color-mix(in_oklch,var(--color-static-white)_35%,transparent)]
					overflow-hidden
					before:content-[''] before:absolute before:inset-0 before:rounded-[inherit] before:transition-[background] before:duration-150 before:ease-out before:pointer-events-none
					hover:before:bg-[var(--color-interaction-hover)] hover:shadow-[inset_0px_0px_0px_0.5px_var(--pink-60),inset_0px_0px_0px_1px_var(--color-interaction-hover)]
					active:before:bg-[var(--color-interaction-pressed)] active:shadow-[inset_0px_0px_0px_0.5px_var(--pink-60),inset_0px_0px_0px_1px_var(--color-interaction-pressed)]`,
			},
			{
				variant: "filled",
				sentiment: "neutral",
				class: `bg-inverted text-inverted
					shadow-[inset_0px_0px_0px_0.5px_var(--grey-90),inset_0px_0px_0px_1px_color-mix(in_oklch,var(--color-static-white)_30%,transparent)]
					overflow-hidden
					before:content-[''] before:absolute before:inset-0 before:rounded-[inherit] before:transition-[background] before:duration-150 before:ease-out before:pointer-events-none
					hover:before:bg-[var(--color-interaction-hover-inverted)] hover:shadow-[inset_0px_0px_0px_0.5px_var(--grey-90),inset_0px_0px_0px_1px_var(--color-interaction-hover-inverted)]
					active:before:bg-[var(--color-interaction-pressed-inverted)] active:shadow-[inset_0px_0px_0px_0.5px_var(--grey-90),inset_0px_0px_0px_1px_var(--color-interaction-pressed-inverted)]`,
			},
			{
				variant: "filled",
				sentiment: "negative",
				class: `bg-negative-normal text-static-white
					shadow-[inset_0px_0px_0px_0.5px_var(--red-60),inset_0px_0px_0px_1px_color-mix(in_oklch,var(--color-static-white)_35%,transparent)]
					overflow-hidden
					before:content-[''] before:absolute before:inset-0 before:rounded-[inherit] before:transition-[background] before:duration-150 before:ease-out before:pointer-events-none
					hover:before:bg-[var(--color-interaction-hover)] hover:shadow-[inset_0px_0px_0px_0.5px_var(--red-60),inset_0px_0px_0px_1px_var(--color-interaction-hover)]
					active:before:bg-[var(--color-interaction-pressed)] active:shadow-[inset_0px_0px_0px_0.5px_var(--red-60),inset_0px_0px_0px_1px_var(--color-interaction-pressed)]`,
			},

			// ============================================
			// OUTLINED VARIANTS
			// Uses inset box-shadow instead of border to maintain exact sizing
			// Pseudo-element overlay for consistent hover/pressed (all sentiments)
			// Subtle interaction tier (neutral surface base)
			// ============================================
			{
				variant: "outlined",
				sentiment: "brand",
				class: `text-brand-normal bg-transparent
					shadow-[inset_0_0_0_1px_var(--color-fg-stroke-brand-weak)]
					overflow-hidden
					before:content-[''] before:absolute before:inset-0 before:rounded-[inherit] before:transition-[background] before:duration-150 before:ease-out before:pointer-events-none
					[&:hover:not(:disabled)]:before:bg-(--color-interaction-hover-subtle) [&:hover:not(:disabled)]:shadow-[inset_0_0_0_1px_var(--color-fg-stroke-brand-normal)]
					[&:active:not(:disabled)]:before:bg-(--color-interaction-pressed-subtle) [&:active:not(:disabled)]:shadow-[inset_0_0_0_1px_var(--color-fg-stroke-brand-normal)]`,
			},
			{
				variant: "outlined",
				sentiment: "neutral",
				class: `text-strong bg-surface-elevated-1
					shadow-[inset_0_0_0_1px_var(--color-fg-stroke-weak)]
					overflow-hidden
					before:content-[''] before:absolute before:inset-0 before:rounded-[inherit] before:transition-[background] before:duration-150 before:ease-out before:pointer-events-none
					[&:hover:not(:disabled)]:before:bg-(--color-interaction-hover-subtle) [&:hover:not(:disabled)]:shadow-[inset_0_0_0_1px_var(--color-interaction-hover-subtle)]
					[&:active:not(:disabled)]:before:bg-(--color-interaction-pressed-subtle) [&:active:not(:disabled)]:shadow-[inset_0_0_0_1px_var(--color-fg-stroke-normal)]`,
			},
			{
				variant: "outlined",
				sentiment: "negative",
				class: `text-negative-normal bg-transparent
					shadow-[inset_0_0_0_1px_var(--color-fg-stroke-negative-weak)]
					overflow-hidden
					before:content-[''] before:absolute before:inset-0 before:rounded-[inherit] before:transition-[background] before:duration-150 before:ease-out before:pointer-events-none
					[&:hover:not(:disabled)]:before:bg-(--color-interaction-hover-subtle) [&:hover:not(:disabled)]:shadow-[inset_0_0_0_1px_var(--color-fg-stroke-negative-normal)]
					[&:active:not(:disabled)]:before:bg-(--color-interaction-pressed-subtle) [&:active:not(:disabled)]:shadow-[inset_0_0_0_1px_var(--color-fg-stroke-negative-normal)]`,
			},

			// ============================================
			// TRANSPARENT VARIANTS
			// ============================================
			{
				variant: "transparent",
				sentiment: "brand",
				class: `text-brand-normal
					[&:hover:not(:disabled)]:bg-interaction-hover
					[&:active:not(:disabled)]:bg-interaction-pressed`,
			},
			{
				variant: "transparent",
				sentiment: "neutral",
				class: `text-strong
					[&:hover:not(:disabled)]:bg-interaction-hover
					[&:active:not(:disabled)]:bg-interaction-pressed`,
			},
			{
				variant: "transparent",
				sentiment: "negative",
				class: `text-negative-normal
					[&:hover:not(:disabled)]:bg-interaction-hover
					[&:active:not(:disabled)]:bg-interaction-pressed`,
			},

			// ============================================
			// LINK VARIANTS
			// ============================================
			{
				variant: "link",
				sentiment: "brand",
				class: `text-brand-normal h-auto
					[&:hover:not(:disabled)]:underline [&:hover:not(:disabled)]:brightness-[0.93]
					[&:active:not(:disabled)]:brightness-[0.84]`,
			},
			{
				variant: "link",
				sentiment: "neutral",
				class: `text-strong h-auto
					[&:hover:not(:disabled)]:underline [&:hover:not(:disabled)]:brightness-[0.93]
					[&:active:not(:disabled)]:brightness-[0.84]`,
			},
			{
				variant: "link",
				sentiment: "negative",
				class: `text-negative-normal h-auto
					[&:hover:not(:disabled)]:underline [&:hover:not(:disabled)]:brightness-[0.93]
					[&:active:not(:disabled)]:brightness-[0.84]`,
			},
		],
		defaultVariants: {
			variant: "filled",
			sentiment: "brand",
			size: "small",
		},
	},
);

// Label container height based on size (matches icon height)
const labelContainerHeights = {
	xsmall: "h-[14px]",
	small: "h-[16px]",
	medium: "h-[16px]",
	large: "h-[20px]",
} as const;

// Icon sizes based on button size (use ! prefix to override any icon's own size class)
const iconSizes = {
	xsmall: "!size-[14px]",
	small: "!size-[16px]",
	medium: "!size-[16px]",
	large: "!size-[20px]",
} as const;

// Typography classes based on size
const labelClasses = {
	xsmall: "label-xsmall", // 11px
	small: "label-xsmall", // 11px
	medium: "label-small", // 13px
	large: "label-medium", // 15px
} as const;

// Icon-only sizing: explicit width to match the fixed height (square buttons)
// px-0! removes horizontal padding from size variant so width is purely from w-[Xpx]
const iconOnlyPadding = {
	xsmall: "size-[24px] p-0!",
	small: "size-[28px] p-0!",
	medium: "size-[32px] p-0!",
	large: "size-[40px] p-0!",
} as const;

// Available button styles (exported for Preview and other consumers)
export const buttonStyles = [
	"filled",
	"outline",
	"transparent",
	"link",
] as const;
export type ButtonStyle = (typeof buttonStyles)[number];

// Map old style names to new variant names for backward compatibility
const styleToVariantMap: Record<string, string> = {
	filled: "filled",
	outline: "outlined",
	outlined: "outlined",
	transparent: "transparent",
	link: "link",
};

export interface ButtonProps
	extends
		Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "style">,
		VariantProps<typeof buttonVariants> {
	/** Icon to display */
	icon?: React.ReactNode;
	/** Show icon before the label */
	iconBefore?: boolean;
	/** Show icon after the label */
	iconAfter?: boolean;
	/** Icon-only button (no label) */
	iconOnly?: boolean;
	/** Show loading state */
	loading?: boolean;
	/** Custom class for the icon wrapper */
	iconClassName?: string;
	/** @deprecated Use `variant` instead. Alias for backward compatibility */
	style?: ButtonStyle | "outlined";
	/** Show dropdown indicator (for backward compatibility) */
	dropdown?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{
			className,
			variant,
			style,
			size = "small",
			sentiment = "brand",
			icon,
			iconBefore = false,
			iconAfter = false,
			iconOnly = false,
			loading = false,
			disabled = false,
			dropdown = false,
			iconClassName,
			children,
			...props
		},
		ref,
	) => {
		// Resolve variant from either variant prop or style prop (backward compatibility)
		const resolvedVariant =
			variant ??
			(style
				? (styleToVariantMap[style] as
						| "filled"
						| "outlined"
						| "transparent"
						| "link")
				: "filled");

		const isDisabled = disabled || loading;
		const sizeKey = size || "small";
		const labelClass = labelClasses[sizeKey];
		const iconSizeClass = iconSizes[sizeKey];
		const labelHeightClass = labelContainerHeights[sizeKey];

		// Determine icon color class based on variant and sentiment
		// Only apply stroke classes - fill is controlled by the SVG's own fill attribute:
		// - Outline icons have fill="none" (no fill rendered)
		// - Filled icons have fill="currentColor" (inherits from parent's color property)
		const getIconColorClass = () => {
			if (resolvedVariant === "filled") {
				if (sentiment === "neutral") {
					// Neutral filled uses inverted colors (adapts to theme)
					// Light mode: dark icon on dark bg, Dark mode: dark icon on light bg
					return "stroke-inverted text-inverted";
				}
				// Brand and negative filled use static white (colored backgrounds)
				return "stroke-static-white text-static-white";
			}
			// Other variants use sentiment-based colors
			switch (sentiment) {
				case "brand":
					return "stroke-brand-normal text-brand-normal";
				case "negative":
					return "stroke-negative-normal text-negative-normal";
				default:
					return "stroke-strong text-strong";
			}
		};

		const iconStrokeClass = getIconColorClass();

		// Render the icon with proper styling
		const renderIcon = (iconElement: React.ReactNode) => {
			if (!iconElement) return null;

			// Apply size and stroke classes to icon
			if (React.isValidElement(iconElement)) {
				return React.cloneElement(iconElement as React.ReactElement<any>, {
					className: cn(
						iconSizeClass,
						"shrink-0",
						iconStrokeClass,
						iconClassName,
						(iconElement as React.ReactElement<any>).props?.className,
					),
					// Preserve the original style prop
					style: (iconElement as React.ReactElement<any>).props?.style,
				});
			}

			return (
				<span
					className={cn(
						iconSizeClass,
						"shrink-0",
						iconStrokeClass,
						iconClassName,
					)}
				>
					{iconElement}
				</span>
			);
		};

		// Loading spinner using Spinner icon from @icons
		const loadingSpinner = (
			<SpinnerIcon
				className={cn(
					iconSizeClass,
					"animate-spin shrink-0",
					iconStrokeClass,
				)}
			/>
		);

		// Icon Only Mode
		if (iconOnly) {
			const iconOnlyPaddingClass = iconOnlyPadding[sizeKey];
			return (
				<button
					ref={ref}
					type="button"
					className={cn(
						buttonVariants({
							variant: resolvedVariant,
							size,
							sentiment,
						}),
						iconOnlyPaddingClass, // Override to uniform padding for square shape
						className,
					)}
					disabled={isDisabled}
					{...props}
				>
					{/* Icon Container */}
					<div className="flex items-center shrink-0">
						{loading ? loadingSpinner : renderIcon(icon)}
					</div>
				</button>
			);
		}

		// Button with label (and optional icons)
		return (
			<button
				ref={ref}
				type="button"
				className={cn(
					buttonVariants({
						variant: resolvedVariant,
						size,
						sentiment,
					}),
					className,
				)}
				disabled={isDisabled}
				{...props}
			>
				{/* Icon before container */}
				{iconBefore && !loading && (
					<div className="flex items-center shrink-0">
						{renderIcon(icon)}
					</div>
				)}

				{/* Loading spinner in icon before position */}
				{loading && iconBefore && (
					<div className="flex items-center shrink-0">
						{loadingSpinner}
					</div>
				)}

				{/* Label container - fixed height to match icon, with internal padding */}
				{children && (
					<div
						className={cn(
							"flex items-center justify-center px-xs py-2xs shrink-0",
							labelHeightClass,
						)}
					>
						<span className={labelClass}>
							{loading && !iconBefore && !iconAfter
								? "Loading..."
								: children}
						</span>
					</div>
				)}

				{/* Icon after container */}
				{iconAfter && !loading && (
					<div className="flex items-center shrink-0">
						{renderIcon(icon)}
					</div>
				)}

				{/* Loading spinner in icon after position */}
				{loading && iconAfter && (
					<div className="flex items-center shrink-0">
						{loadingSpinner}
					</div>
				)}

				{/* Dropdown chevron (for backward compatibility) */}
				{dropdown && (
					<div className="flex items-center shrink-0">
						<ChevronDownIcon
							className={cn(
								iconSizeClass,
								"shrink-0",
								iconStrokeClass,
							)}
						/>
					</div>
				)}
			</button>
		);
	},
);

Button.displayName = "Button";

export { Button, buttonVariants };
