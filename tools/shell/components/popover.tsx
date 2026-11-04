import * as PopoverPrimitive from "@radix-ui/react-popover";
import type * as React from "react";
import { cn } from "@/lib/design-system/jigsaw/lib/utils";

// shadcn-style popover in jigsaw's surface language (jigsaw ships menus and selects but no
// general-purpose popover).
const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;

function PopoverContent({ className, align = "start", sideOffset = 6, ...props }: React.ComponentProps<typeof PopoverPrimitive.Content>) {
	return (
		<PopoverPrimitive.Portal>
			<PopoverPrimitive.Content
				align={align}
				sideOffset={sideOffset}
				collisionPadding={8}
				className={cn(
					"z-popover flex flex-col gap-md rounded-md border border-weak bg-surface-elevated-1 p-md text-strong shadow-elevation-2 outline-none",
					"data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-150",
					className,
				)}
				{...props}
			/>
		</PopoverPrimitive.Portal>
	);
}

/** Small uppercase heading inside menus and popovers. */
function MenuLabel({ className, ...props }: React.ComponentProps<"div">) {
	return <div className={cn("label-xxsmall-strong uppercase tracking-wide text-weak px-sm pt-xs", className)} {...props} />;
}

/** A clickable row in a popover menu, matching jigsaw's dropdown items. */
function MenuItem({ className, icon, description, trailing, children, ...props }: React.ComponentProps<"button"> & { icon?: React.ReactNode; description?: React.ReactNode; trailing?: React.ReactNode }) {
	return (
		<button
			type="button"
			className={cn(
				"label-xsmall flex w-full items-center gap-xs rounded-xs px-sm text-left text-strong transition-colors outline-none hover:bg-interaction-hover-subtle focus-visible:bg-interaction-hover-subtle disabled:pointer-events-none disabled:opacity-50",
				description ? "min-h-[40px] py-sm" : "h-[28px]",
				className,
			)}
			{...props}
		>
			{icon && <span className="inline-flex size-3.5 shrink-0 items-center justify-center stroke-normal text-(color:--color-fg-icon-normal) [&_svg]:size-3.5">{icon}</span>}
			<span className="flex min-w-0 flex-1 flex-col gap-2xs">
				<span className="truncate">{children}</span>
				{description && <span className="para-xxsmall whitespace-normal text-weak">{description}</span>}
			</span>
			{trailing}
		</button>
	);
}

function MenuSeparator() {
	return <div className="-mx-md my-xs border-t border-dashed border-weak" />;
}

export { MenuItem, MenuLabel, MenuSeparator, Popover, PopoverAnchor, PopoverContent, PopoverTrigger };
