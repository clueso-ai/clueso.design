"use client";

import { useState } from "react";
import { OklchArea } from "@/components/site/oklch-area";
import { rgbOf } from "@/lib/css-color";
import { hexToOklch, oklchCss } from "@/lib/site-prefs";

// Colours for a playground experiment: a few presets made from the site's tokens, and Custom for
// anyone who wants their own. Custom starts from the preset you were on, then each colour role
// (say Ground and Ink) gets its own OKLCH picker. Presets are swatches of their colours.
// Pages read the result with `colorsOf`, as CSS colours, the same way for presets and custom.

export interface ColorRole {
	id: string;
	label: string;
}
export interface ColorPreset {
	id: string;
	label: string;
	/** A CSS colour per role, usually a token like var(--bg-brand-normal). */
	colors: Record<string, string>;
}
export type ColorValue = { preset: string } | { custom: Record<string, string> };

/** The CSS colour of every role for a choice. */
export function colorsOf(value: ColorValue, presets: ColorPreset[]): Record<string, string> {
	return "custom" in value ? value.custom : (presets.find((p) => p.id === value.preset) ?? presets[0]).colors;
}

/** The name of a choice, for a ControlGroup's summary: the preset's, or Custom. */
export const colorLabel = (value: ColorValue, presets: ColorPreset[]) => ("custom" in value ? "Custom" : (presets.find((p) => p.id === value.preset)?.label ?? ""));

/** A CSS colour (token or not) as OKLCH: read straight from an oklch() value, otherwise through rgbOf. */
function toOklch(css: string, probe: HTMLElement): [number, number, number] {
	const direct = /^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/.exec(css);
	if (direct) return [Number(direct[1]), Number(direct[2]), Number(direct[3])];
	const { r, g, b } = rgbOf(probe, css);
	return hexToOklch(`#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`);
}

export function ColorChoice({ label, roles, presets, value, onChange, disabled = false }: { label: string; roles: ColorRole[]; presets: ColorPreset[]; value: ColorValue; onChange: (value: ColorValue) => void; disabled?: boolean }) {
	// A hidden element the browser resolves colours on.
	const [probe, setProbe] = useState<HTMLSpanElement | null>(null);
	const [editing, setEditing] = useState(roles[0]?.id);
	const custom = "custom" in value;
	const current = colorsOf(value, presets);

	const startCustom = () => {
		if (custom || !probe) return;
		const from = colorsOf(value, presets);
		// A role that's off (transparent, like an edge of None) starts from brand pink, not black.
		const start = (css: string) => (rgbOf(probe, css).a === 0 ? "var(--bg-brand-normal)" : css);
		onChange({ custom: Object.fromEntries(roles.map((r) => [r.id, oklchCss(toOklch(start(from[r.id]), probe))])) });
	};

	const chips = (colors: Record<string, string>) => (
		<span aria-hidden className="flex shrink-0 overflow-hidden rounded-tiny border border-neutral-weak">
			{roles.map((r) => (
				<span key={r.id} className="size-3.5" style={{ background: colors[r.id] }} />
			))}
		</span>
	);

	return (
		<fieldset disabled={disabled} className={`flex min-w-0 flex-col gap-gap-s ${disabled ? "opacity-60" : ""}`}>
			<span ref={setProbe} aria-hidden className="hidden" />
			<div role="radiogroup" aria-label={label} className={`grid ${roles.length > 3 ? "grid-cols-1" : "grid-cols-2"} gap-gap-3xs rounded-medium border border-neutral-weak p-gap-3xs`}>
				{[...presets.map((p) => ({ id: p.id, label: p.label, colors: p.colors })), { id: "custom", label: "Custom", colors: current }].map((o) => {
					const on = o.id === "custom" ? custom : !custom && "preset" in value && value.preset === o.id;
					return (
						<button
							key={o.id}
							type="button"
							role="radio"
							aria-checked={on}
							onClick={() => (o.id === "custom" ? startCustom() : onChange({ preset: o.id }))}
							className={`focus-ring type-text-s flex min-h-7 min-w-0 items-center gap-gap-xs rounded-small border px-gap-xs py-gap-3xs text-left transition-[background-color,color,box-shadow] duration-200 ease-out-strong ${on ? "border-neutral-weak bg-raised-2 text-neutral-strong shadow-raised" : "border-transparent text-neutral-weak hover:text-neutral-strong"}`}
						>
							{chips(o.colors)}
							<span className="min-w-0">{o.label}</span>
						</button>
					);
				})}
			</div>
			{custom && (
				<div className="flex flex-col gap-gap-s rounded-medium border border-neutral-weak p-gap-s">
					<div role="tablist" aria-label="Colour to edit" className="flex flex-wrap gap-gap-3xs">
						{roles.map((r) => (
							<button
								key={r.id}
								type="button"
								role="tab"
								aria-selected={editing === r.id}
								onClick={() => setEditing(r.id)}
								className={`focus-ring type-text-s flex h-7 items-center gap-gap-xs rounded-small border px-gap-xs ${editing === r.id ? "border-neutral-normal text-neutral-strong" : "border-transparent text-neutral-weak hover:text-neutral-strong"}`}
							>
								<span aria-hidden className="size-3.5 rounded-tiny border border-neutral-weak" style={{ background: value.custom[r.id] }} />
								{r.label}
							</button>
						))}
					</div>
					{editing && probe && (
						<OklchArea value={toOklch(value.custom[editing], probe)} onChange={(lch) => onChange({ custom: { ...value.custom, [editing]: oklchCss(lch) } })} />
					)}
				</div>
			)}
		</fieldset>
	);
}
