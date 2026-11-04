import { useState } from "react";
import { type ColorValue, colorName, type Palette, resolveColor } from "../../brand/palette";
import { CustomColorPicker } from "../../components/color";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/popover";
import { ColorBox } from "@/lib/design-system/jigsaw/components/ui/color/color-box/color-box";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/lib/design-system/jigsaw/components/ui/overlays/tooltip/tooltip";
import { Button } from "@/lib/design-system/jigsaw/components/ui/controls/button/button";
import { Field } from "../../components/field";
import { WrappedSelect } from "@/lib/design-system/jigsaw/components/ui/controls/select/select";
import { Slider as JSlider } from "@/lib/design-system/jigsaw/components/ui/controls/slider/slider";
import { ToggleSwitch } from "@/lib/design-system/jigsaw/components/ui/controls/toggle-switch/toggle-switch";
import { cn } from "@/lib/design-system/jigsaw/lib/utils";
import { useStore } from "../../state/store";
import { Row } from "@/tools/shell/components/controls";

// clueso.design: Segmented and Row moved to the tool shell (tools/shell/components/controls.tsx) so
// Icon Lab shares them. They are re-exported here unchanged.
export { Row, Segmented } from "@/tools/shell/components/controls";

// Brand Lab's control vocabulary (the props panel, export popover and sheets all use these), built
// on jigsaw components so the look follows the Clueso design system.

const decimals = (step: number) => (step >= 1 ? 0 : Math.min(4, Math.ceil(-Math.log10(step))));

export function format(v: number, step: number, unit?: string) {
	const s = v.toFixed(decimals(step));
	if (unit === "%") return `${s}%`;
	if (unit === "°") return `${s}°`;
	if (unit === "×") return `${s}×`;
	return unit ? `${s}${unit === "px" ? "" : ` ${unit}`}` : s;
}

interface SliderProps {
	label: string;
	value: number;
	min: number;
	max: number;
	step?: number;
	unit?: string;
	onChange: (v: number) => void;
	/** Display transform, e.g. 0..1 shown as 0..100%. */
	display?: { scale: number; unit: string; step: number };
}

/** Label on the left, value field and track on the right: one row per param, like jigsaw's inspector. */
export function Slider({ label, value, min, max, step = 0.01, unit, onChange, display }: SliderProps) {
	const k = display?.scale ?? 1;
	return (
		<div className="grid grid-cols-[minmax(0,88px)_1fr] items-center gap-md">
			<Tooltip>
				<TooltipTrigger asChild>
					<span className="label-xsmall truncate text-normal">{label}</span>
				</TooltipTrigger>
				<TooltipContent>{label}</TooltipContent>
			</Tooltip>
			<JSlider
				aria-label={label}
				value={value * k}
				min={min * k}
				max={max * k}
				step={display?.step ?? step}
				unit={display?.unit ?? unit}
				inputPosition="end"
				className="[&_[data-slot=input-group]]:w-[64px]"
				onValueChange={(v) => onChange(v / k)}
			/>
		</div>
	);
}

type Option<T> = { value: T; label: string };

export function Select<T extends number | string>({
	value,
	options,
	onChange,
	wide,
	label,
}: {
	value: T;
	options: Option<T>[];
	onChange: (v: string) => void;
	wide?: boolean;
	label?: string;
}) {
	return (
		<WrappedSelect
			aria-label={label}
			size="xsmall"
			className={cn(wide ? "w-full" : "w-[150px] min-w-0")}
			value={String(value)}
			options={options.map((o) => ({ value: String(o.value), label: o.label }))}
			onValueChange={onChange}
		/>
	);
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
	return (
		<span aria-label={label} className="inline-flex">
			<ToggleSwitch checked={checked} onChange={onChange} />
		</span>
	);
}

/** A number field in jigsaw's input style; commits on blur or Enter. */
export function NumberField({ value, min, max, onChange, className, label }: { value: number; min: number; max: number; onChange: (v: number) => void; className?: string; label?: string }) {
	return (
		<Field
			key={value}
			aria-label={label}
			type="number"
			defaultValue={value}
			min={min}
			max={max}
			className={cn("w-[88px]", className)}
			inputClassName="font-mono"
			onBlur={(e) => {
				const n = Math.round(Number(e.target.value));
				if (n >= min && n <= max && n !== value) onChange(n);
				else e.target.value = String(value);
			}}
			onKeyDown={(e) => {
				if (e.key === "Enter") (e.target as HTMLInputElement).blur();
			}}
		/>
	);
}

export function Swatch({ hex, className }: { hex: string; className?: string }) {
	return <ColorBox color={hex} className={className} />;
}

export function ColorField({ label, value, palette, onChange }: { label: string; value: ColorValue; palette: Palette; onChange: (v: ColorValue) => void }) {
	const [open, setOpen] = useState(false);
	const hex = resolveColor(value, palette);
	const name = colorName(value, palette);
	const setOverlay = useStore((s) => s.setOverlay);

	return (
		<Row label={label}>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<button
						type="button"
						aria-label={`${label}: ${name ?? hex}`}
						className="label-xsmall flex h-[24px] w-[150px] items-center gap-xs rounded-xs border border-weak bg-depth-inset-1 px-[5px] text-strong transition-colors hover:bg-interaction-hover-subtle"
					>
						<ColorBox color={hex} />
						<span className={cn("truncate", !name && "uppercase")}>{name ?? hex.replace("#", "")}</span>
					</button>
				</PopoverTrigger>
				<PopoverContent align="end" className="w-[240px] gap-0 overflow-hidden bg-surface p-0">
					<div className="flex flex-col gap-sm px-lg pt-lg pb-md">
						<div className="flex items-center justify-between">
							<p className="label-xsmall-strong text-normal">Palette</p>
							<Button
								variant="outlined"
								sentiment="neutral"
								size="xsmall"
								onClick={() => {
									setOpen(false);
									setOverlay("palettes");
								}}
							>
								Edit palettes
							</Button>
						</div>
						<div className="flex flex-wrap gap-sm">
							{palette.map((c) => (
								<Tooltip key={c.key}>
									<TooltipTrigger asChild>
										<button
											type="button"
											aria-label={c.name}
											aria-pressed={value === `$${c.key}`}
											className={cn(
												"size-[22px] shrink-0 rounded-2xs border-[0.5px] border-normal transition-transform hover:scale-110",
												value === `$${c.key}` && "outline-1 outline-offset-2 outline-[var(--color-fg-stroke-strong)]",
											)}
											style={{ background: c.hex }}
											onClick={() => {
												onChange(`$${c.key}`);
												setOpen(false);
											}}
										/>
									</TooltipTrigger>
									<TooltipContent>{c.name}</TooltipContent>
								</Tooltip>
							))}
						</div>
					</div>
					<div className="flex flex-col gap-sm border-t border-weak px-lg pt-md pb-lg">
						<p className="label-xsmall-strong text-normal">Custom</p>
						<CustomColorPicker color={hex.slice(0, 7)} onChange={onChange} />
						<p className="para-xxsmall text-weak">Palette colours follow the scene palette. Custom colours stay fixed.</p>
					</div>
				</PopoverContent>
			</Popover>
		</Row>
	);
}
