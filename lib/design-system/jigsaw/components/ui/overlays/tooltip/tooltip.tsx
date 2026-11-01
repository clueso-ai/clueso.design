import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as React from "react";

import { cn } from "../../../../lib/utils";
import { Kbd, KbdGroup } from "../../primitives/kbd/kbd";

// Figma-style delay: tooltips wait ~600ms before appearing so casual hovers
// over toolbars don't flash labels. skipDelayDuration lets a second tooltip
// in the same row appear instantly while the first is still "warm".
const DEFAULT_TOOLTIP_DELAY_MS = 600;
const DEFAULT_TOOLTIP_SKIP_DELAY_MS = 200;

function TooltipProvider({
	delayDuration = DEFAULT_TOOLTIP_DELAY_MS,
	skipDelayDuration = DEFAULT_TOOLTIP_SKIP_DELAY_MS,
	...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
	return (
		<TooltipPrimitive.Provider
			data-slot="tooltip-provider"
			delayDuration={delayDuration}
			skipDelayDuration={skipDelayDuration}
			{...props}
		/>
	);
}

function Tooltip({
	delayDuration = DEFAULT_TOOLTIP_DELAY_MS,
	...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
	return (
		<TooltipProvider>
			<TooltipPrimitive.Root
				data-slot="tooltip"
				delayDuration={delayDuration}
				{...props}
			/>
		</TooltipProvider>
	);
}

function TooltipTrigger({
	...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
	return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

interface TooltipContentProps extends React.ComponentProps<
	typeof TooltipPrimitive.Content
> {
	/** Array of keyboard shortcut keys to display (e.g., ["⌥", "⌘", "S"]) */
	shortcut?: string[];
}

function TooltipContent({
	className,
	sideOffset = 8,
	children,
	shortcut,
	...props
}: TooltipContentProps) {
	// Create unique keys for shortcuts by tracking position of duplicates
	const shortcutWithIds = shortcut?.reduce<
		Array<{ key: string; id: string }>
	>((acc, key) => {
		const count = acc.filter((item) => item.key === key).length;
		acc.push({ key, id: `${key}-pos${count}` });
		return acc;
	}, []);

	return (
		<TooltipPrimitive.Portal>
			<TooltipPrimitive.Content
				data-slot="tooltip-content"
				sideOffset={sideOffset}
				className={cn(
					// Base styles - 1px border, auto height for rich content
					"z-[2147483647] w-fit flex items-center gap-sm rounded-xs border",
					// Padding: py-xs (4px), pl-sm (6px), pr-xs (4px) when shortcuts, else px-sm
					shortcut && shortcut.length > 0
						? "h-[24px] py-xs pl-sm pr-xs"
						: "py-sm px-sm",
					// Background: surface-elevated-2
					"bg-surface-elevated-2 shadow-[0_2px_8px_rgba(0,0,0,0.12)]",
					// Animation
					"animate-in fade-in-0 zoom-in-95 origin-(--radix-tooltip-content-transform-origin)",
					"data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
					"data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
					className,
				)}
				// Use inline style for border-color to override Tailwind's default border color
				style={{ borderColor: "var(--color-fg-stroke-weak)" }}
				{...props}
			>
				{/* Container with pr-2xs */}
				<span className="label-xsmall text-strong pr-2xs">
					{children}
				</span>
				{shortcutWithIds && shortcutWithIds.length > 0 && (
					<KbdGroup>
						{shortcutWithIds.map(({ key, id }) => (
							<Kbd key={id}>{key}</Kbd>
						))}
					</KbdGroup>
				)}
			</TooltipPrimitive.Content>
		</TooltipPrimitive.Portal>
	);
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
