import * as React from "react";

import { cn } from "../../../../lib/utils";

/**
 * Textarea Component - Jigsaw Design System
 *
 * States:
 * - Default: bg-depth-inset-1, border-weak
 * - Hover: bg-interaction-hover, border-weak
 * - Active/Focus: bg-interaction-selected-subtle, border-brand-normal, focus shadow ring
 * - Disabled: opacity-50, cursor-not-allowed
 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
	return (
		<textarea
			data-slot="textarea"
			className={cn(
				// Base styles - Default state
				"bg-depth-inset-1 p-md rounded-xs",
				"para-xsmall leading-[1.42]",
				"text-strong whitespace-pre-wrap",
				"resize-none w-full min-h-[64px]",
				"border border-weak outline-none",
				"placeholder:text-weak",
				// Hover state
				"hover:bg-interaction-hover",
				// Focus/Active state
				"focus:bg-interaction-selected-subtle focus:border-brand-normal focus:shadow-[0px_0px_0px_1px_rgba(218,92,199,0.25)]",
				// Disabled state
				"disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-depth-inset-1",
				// Error state
				"aria-invalid:ring-negative-weak aria-invalid:border-negative-normal",
				// Transitions
				"transition-[background-color,border-color,box-shadow]",
				className,
			)}
			{...props}
		/>
	);
}

export { Textarea };
