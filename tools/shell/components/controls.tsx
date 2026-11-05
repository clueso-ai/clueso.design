import type * as React from "react";
import { ToggleButton } from "@/lib/design-system/jigsaw/components/ui/controls/toggle-button/toggle-button";
import { cn } from "@/lib/design-system/jigsaw/lib/utils";

// Controls every tool's panels use, built on jigsaw. Moved here from Brand Lab's ui/controls. An option
// can also be disabled or carry a tooltip.

type Option<T> = { value: T; label: string; disabled?: boolean; tooltip?: string };

export function Segmented<T extends string | number>({
	value,
	options,
	onChange,
	label,
	className,
	size = "small",
}: {
	value: T;
	options: Option<T>[];
	onChange: (v: T) => void;
	label?: string;
	className?: string;
	/** small = 24px (panels); button = 28px, the height of a small jigsaw button (sheet headers). */
	size?: "small" | "button";
}) {
	return (
		<ToggleButton
			aria-label={label}
			size="small"
			// jigsaw's small tabs are 20px inside a 24px group; 6px vertical padding makes the group 28px.
			className={cn(size === "button" && "[&>button]:py-[6px]", className)}
			value={String(value)}
			options={options.map((o) => ({ value: String(o.value), label: o.label, disabled: o.disabled, tooltip: o.tooltip }))}
			onChange={(v) => {
				const hit = options.find((o) => String(o.value) === v);
				if (hit) onChange(hit.value);
			}}
		/>
	);
}

export function Row({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
	return (
		<div className={cn("flex min-h-[24px] items-center justify-between gap-md", className)}>
			<span className="label-xsmall shrink-0 text-normal">{label}</span>
			{children}
		</div>
	);
}
