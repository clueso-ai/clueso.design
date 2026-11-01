import * as React from "react";
import { cn } from "../../../../lib/utils";

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
	return (
		<kbd
			data-slot="kbd"
			className={cn(
				"label-xsmall text-normal",
				"bg-depth-inset-1 border-weak border-[0.5px]",
				"pointer-events-none inline-flex h-[15px] w-fit min-w-[15px] items-center justify-center rounded-2xs px-xs select-none",
				"[&_svg:not([class*='size-'])]:size-3",
				className,
			)}
			{...props}
		/>
	);
}

function KbdGroup({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="kbd-group"
			className={cn("inline-flex items-center gap-2xs", className)}
			{...props}
		/>
	);
}

export { Kbd, KbdGroup };
