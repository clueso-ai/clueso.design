import * as React from "react";

import { cn } from "../../../../lib/utils";

/**
 * Tag Component - Jigsaw Design System
 *
 * Compact status pill for labels like "Default", "New", "Beta", "Required".
 * Use for read-only status indicators — for interactive filters, use ChipGroup.
 *
 * ANATOMY:
 * ┌──────────┐
 * │ Default  │  small rounded pill, sentiment-driven color
 * └──────────┘
 */

type TagSentiment =
	| "neutral"
	| "brand"
	| "accent"
	| "positive"
	| "warning"
	| "negative";

type TagSize = "sm" | "md";

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
	sentiment?: TagSentiment;
	size?: TagSize;
}

const sentimentStyles: Record<TagSentiment, string> = {
	neutral: "bg-weak text-normal",
	brand: "bg-brand-weak text-brand",
	accent: "bg-accent-normal text-static-white",
	positive: "bg-positive-weak text-positive-normal",
	warning: "bg-warning-weak text-warning-normal",
	negative: "bg-negative-weak text-negative-normal",
};

const sizeStyles: Record<TagSize, string> = {
	sm: "h-[18px] px-xs label-xsmall rounded-[3px]",
	md: "h-[22px] px-sm label-xsmall-strong rounded-[4px]",
};

const Tag = React.forwardRef<HTMLSpanElement, TagProps>(
	(
		{ className, sentiment = "neutral", size = "md", children, ...props },
		ref,
	) => {
		return (
			<span
				ref={ref}
				data-slot="tag"
				className={cn(
					"inline-flex items-center justify-center shrink-0 leading-none whitespace-nowrap",
					sentimentStyles[sentiment],
					sizeStyles[size],
					className,
				)}
				{...props}
			>
				{children}
			</span>
		);
	},
);

Tag.displayName = "Tag";

export { Tag };
