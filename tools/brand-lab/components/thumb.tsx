import type * as React from "react";
import { cn } from "@/lib/design-system/jigsaw/lib/utils";

// Thumbnail cards for the Library and Variations sheets.

function ThumbGrid({ cols, className, style, ...props }: React.ComponentProps<"div"> & { cols?: number }) {
	return (
		<div
			className={cn("grid items-start gap-2xl", !cols && "grid-cols-[repeat(auto-fill,minmax(190px,1fr))]", className)}
			style={cols ? { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, ...style } : style}
			{...props}
		/>
	);
}

function ThumbCard({ className, ...props }: React.ComponentProps<"div">) {
	return <div className={cn("group/thumb relative flex min-w-0 flex-col gap-sm", className)} {...props} />;
}

function Thumb({ src, ratio, current, className, children, ...props }: React.ComponentProps<"button"> & { src?: string; ratio: string; current?: boolean }) {
	return (
		<button
			type="button"
			className={cn(
				"relative block w-full overflow-hidden rounded-md bg-depth-inset-1 shadow-[inset_0_0_0_1px_var(--color-fg-stroke-weak)] transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-px hover:shadow-[inset_0_0_0_1px_var(--color-fg-stroke-normal),0_8px_20px_-10px_rgba(0,0,0,0.3)]",
				current && "shadow-[inset_0_0_0_2px_var(--color-fg-stroke-brand-normal)] hover:shadow-[inset_0_0_0_2px_var(--color-fg-stroke-brand-normal)]",
				className,
			)}
			style={{ aspectRatio: ratio }}
			{...props}
		>
			{src ? <img src={src} alt="" className="block size-full object-cover" /> : <span className="jigsaw-skeleton-shimmer absolute inset-0 bg-depth-inset-1" />}
			{children}
		</button>
	);
}

function ThumbBadge({ className, position = "top", ...props }: React.ComponentProps<"span"> & { position?: "top" | "bottom" }) {
	return (
		<span
			className={cn("label-xxsmall-strong absolute left-md rounded-xs bg-black/60 px-sm py-2xs text-static-white backdrop-blur-sm", position === "top" ? "top-md" : "bottom-md", className)}
			{...props}
		/>
	);
}

function ThumbMeta({ name, sub, children }: { name?: React.ReactNode; sub?: React.ReactNode; children?: React.ReactNode }) {
	return (
		<div className="flex min-w-0 flex-col gap-2xs px-2xs">
			{children ?? <span className="label-xsmall-strong truncate text-strong">{name}</span>}
			{sub && <span className="mono-xxsmall truncate text-weak">{sub}</span>}
		</div>
	);
}

/** Card actions that float over the thumbnail's top-right corner on hover. */
function ThumbActions({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"absolute top-sm right-sm flex gap-2xs rounded-sm border border-weak bg-surface-elevated-1 p-2xs opacity-0 shadow-elevation-1 transition-opacity duration-150 group-hover/thumb:opacity-100 has-[[aria-pressed=true]]:opacity-100",
				className,
			)}
			{...props}
		/>
	);
}

export { Thumb, ThumbActions, ThumbBadge, ThumbCard, ThumbGrid, ThumbMeta };
