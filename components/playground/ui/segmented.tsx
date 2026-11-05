"use client";

import { type ReactNode, useRef } from "react";

// A one-of-many picker for the playground, as a row of segments. Plain segments for short labels
// (Pink · Ink · None), or `tiles` with an icon over each label for richer choices like presets, in
// rows of four so they never get cut off. Arrow keys move the choice, as in any radio group.

export interface SegmentedOption<T extends string> {
	value: T;
	label: string;
	icon?: ReactNode;
}

export function Segmented<T extends string>({ label, options, value, onChange, tiles = false, disabled = false }: { label: string; options: SegmentedOption<T>[]; value: T; onChange: (value: T) => void; tiles?: boolean; disabled?: boolean }) {
	const group = useRef<HTMLDivElement>(null);

	const onKeyDown = (e: React.KeyboardEvent) => {
		const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
		if (!step) return;
		e.preventDefault();
		const i = options.findIndex((o) => o.value === value);
		const next = options[(i + step + options.length) % options.length];
		onChange(next.value);
		group.current?.querySelector<HTMLButtonElement>(`[data-value="${next.value}"]`)?.focus();
	};

	return (
		<div
			ref={group}
			role="radiogroup"
			aria-label={label}
			aria-disabled={disabled || undefined}
			onKeyDown={onKeyDown}
			className={`gap-gap-3xs rounded-medium border border-neutral-weak p-gap-3xs ${tiles ? "grid grid-cols-4" : "flex"} ${disabled ? "opacity-60" : ""}`}
		>
			{options.map((o) => {
				const on = o.value === value;
				return (
					<button
						key={o.value}
						type="button"
						role="radio"
						aria-checked={on}
						tabIndex={on ? 0 : -1}
						disabled={disabled}
						data-value={o.value}
						onClick={() => onChange(o.value)}
						className={`focus-ring type-text-s flex flex-1 items-center justify-center rounded-small transition-[background-color,color,box-shadow] duration-200 ease-out-strong ${tiles ? "min-w-0 flex-col gap-gap-2xs px-gap-2xs py-gap-xs" : "h-7 gap-gap-2xs px-gap-xs"} ${on ? "border border-neutral-weak bg-raised-2 text-neutral-strong shadow-raised" : "border border-transparent text-neutral-weak hover:text-neutral-strong"}`}
					>
						{(o.icon || (tiles && options.some((x) => x.icon))) && <span aria-hidden={!o.icon} className={`flex [&>svg]:size-full ${tiles ? "size-5" : "size-3.5"} ${on ? "text-brand-normal" : ""}`}>{o.icon}</span>}
						<span className={tiles ? "type-text-xs max-w-full truncate" : "whitespace-nowrap"}>{o.label}</span>
					</button>
				);
			})}
		</div>
	);
}

/** The label of the option picked, for a ControlGroup's summary. */
export const labelOf = <T extends string>(options: SegmentedOption<T>[], value: T) => options.find((o) => o.value === value)?.label ?? "";
