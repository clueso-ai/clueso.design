import * as React from "react";
import { Button, type ButtonProps } from "@/lib/design-system/jigsaw/components/ui/controls/button/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/lib/design-system/jigsaw/components/ui/overlays/tooltip/tooltip";
import { cn } from "@/lib/design-system/jigsaw/lib/utils";

/** jigsaw's icon-normal colour for neutral icons (stroke icons and filled ones). */
export const ICON_NORMAL = "stroke-normal text-(color:--color-fg-icon-normal)";

interface IconButtonProps extends Omit<ButtonProps, "icon" | "iconOnly" | "children"> {
	/** Accessible name, also the tooltip text. */
	label: string;
	icon: React.ReactNode;
	/** Keys shown in the tooltip, e.g. ["⌘", "Z"]. */
	shortcut?: string[];
	/** Pressed/toggled-on look. */
	active?: boolean;
}

/** jigsaw's transparent icon button with a tooltip; the toolbar and panel rows use it everywhere. */
const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(({ label, icon, shortcut, active, className, iconClassName, size = "small", variant = "transparent", sentiment = "neutral", ...props }, ref) => (
	<Tooltip>
		<TooltipTrigger asChild>
			<Button
				ref={ref}
				aria-label={label}
				aria-pressed={active}
				iconOnly
				icon={icon}
				size={size}
				variant={variant}
				sentiment={sentiment}
				iconClassName={iconClassName ?? (sentiment === "neutral" ? ICON_NORMAL : undefined)}
				className={cn(active && "bg-interaction-selected-subtle", className)}
				{...props}
			/>
		</TooltipTrigger>
		<TooltipContent shortcut={shortcut}>{label}</TooltipContent>
	</Tooltip>
));
IconButton.displayName = "IconButton";

export { IconButton };
