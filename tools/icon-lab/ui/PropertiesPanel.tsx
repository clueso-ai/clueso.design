import { useState } from "react";
import { Button } from "@/lib/design-system/jigsaw/components/ui/controls/button/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/lib/design-system/jigsaw/components/ui/overlays/tooltip/tooltip";
import { cn } from "@/lib/design-system/jigsaw/lib/utils";
import { Row, Segmented } from "@/tools/shell/components/controls";
import { ICON_NORMAL } from "@/tools/shell/components/icon-button";
import { Section } from "@/tools/shell/components/panel";
import { MenuItem, Popover, PopoverContent, PopoverTrigger } from "@/tools/shell/components/popover";
import { RightPanel } from "@/tools/shell/panels";
import { buildSvg } from "../engine/engine";
import type { Icon } from "../engine/types";
import { hasOptions, pretty } from "../state/sets";
import { currentSvg, drawOptions, useIconLab } from "../state/store";
import { I } from "./ci";
import { Stack, Svg } from "./controls";
import { copyCode, downloadPng } from "./export";

const SWATCHES = [
	{ color: "#f5f3e7", name: "Off-white" },
	{ color: "#111111", name: "Ink" },
	{ color: "#fe89eb", name: "Clueso pink" },
	{ color: "#c12eaf", name: "Clueso magenta" },
	{ color: "#8a8a8a", name: "Grey" },
];

/** The selected icon: its details, options, pixels, appearance and export. */
export function PropertiesPanel() {
	const icon = useIconLab((s) => s.current);
	useIconLab((s) => s.rev);
	const state = useIconLab.getState();

	return (
		<RightPanel aria-label="Properties">
			<div className="min-h-0 flex-1 overflow-y-auto">
				<div className="sticky top-0 z-10 flex items-center gap-md border-b border-weak bg-surface-elevated-1 px-xl py-lg">
					<Svg markup={buildSvg(icon, { ...drawOptions(state), color: "currentColor" })} className="size-[24px] items-center justify-center rounded-xs bg-depth-inset-1 text-strong [&>svg]:size-[16px]" />
					<h2 className="label-small-strong min-w-0 flex-1 truncate text-strong">{icon.title || pretty(icon.name)}</h2>
				</div>
				<Details icon={icon} />
				{hasOptions(icon) && <Options icon={icon} />}
				{icon.pixel && <Pixels icon={icon} />}
				<Appearance icon={icon} />
				<Export />
			</div>
		</RightPanel>
	);
}

function opticalNote(icon: Icon) {
	const o = icon.optical || { dx: 0, dy: 0 };
	if (icon.edited || (!o.dx && !o.dy)) return "";
	const part = (v: number, neg: string, pos: string) => (v ? `${Math.abs(v)} ${v < 0 ? neg : pos}` : "");
	return `nudged ${[part(o.dx, "left", "right"), part(o.dy, "up", "down")].filter(Boolean).join(", ")} for visual balance`;
}

/** The icon's details and the latest status note. Hidden when there's nothing to say. */
function Details({ icon }: { icon: Icon }) {
	const status = useIconLab((s) => s.status);
	const rows: [string, string][] = [];
	if (hasOptions(icon)) rows.push(["Option", icon.variant ?? ""]);
	if (icon.generated && icon.prompt) rows.push(["Prompt", `“${icon.prompt}”`]);
	if (icon.edited) rows.push(["Edited", "Yes (Reset brings back the original)"]);
	const nudge = opticalNote(icon);
	if (nudge) rows.push(["Placement", nudge]);
	if (!rows.length && !status) return null;
	return (
		<Section>
			{rows.length > 0 && (
				<dl className="grid grid-cols-[auto_1fr] gap-x-lg gap-y-xs">
					{rows.map(([k, v]) => (
						<div key={k} className="contents">
							<dt className="mono-xxsmall pt-[1px] text-weak">{k}</dt>
							<dd className="para-xsmall break-words text-strong">{v}</dd>
						</div>
					))}
				</dl>
			)}
			{status && (
				<p role="status" aria-live="polite" className={cn("mono-xxsmall", status.error ? "text-negative-normal" : "text-weak")}>
					{status.text}
				</p>
			)}
		</Section>
	);
}

/** Some icons come in options (upright / diagonal / sharp). The chosen one replaces the icon everywhere. */
function Options({ icon }: { icon: Icon }) {
	const chooseOption = useIconLab((s) => s.chooseOption);
	const options = icon.options!;
	return (
		<Section title="Options">
			<Segmented
				label="Icon options"
				className="flex-wrap self-start"
				value={String(options.indexOf(icon))}
				options={options.map((o, i) => ({ value: String(i), label: o.variant ?? "" }))}
				onChange={(i) => chooseOption(options[Number(i)])}
			/>
		</Section>
	);
}

/** Pixel icons: what a pixel drawing can actually change. */
function Pixels({ icon }: { icon: Icon }) {
	const pixelBuild = useIconLab((s) => s.pixelBuild);
	const pixelSize = useIconLab((s) => s.pixelSize);
	const pixelRadius = useIconLab((s) => s.pixelRadius);
	const set = useIconLab((s) => s.set);
	return (
		<Section title="Pixels">
			<Stack label="Construction">
				<Segmented
					label="Construction"
					className="self-start"
					value={pixelBuild}
					options={[
						{ value: "matrix", label: "Dot matrix", tooltip: "Dot matrix: round dots of one size, solid shapes with their details knocked out" },
						{ value: "dots", label: "Two weights", tooltip: "Two weights: one-pixel lines in big pixels, the inside of each shape in small pixels" },
						{ value: "line", label: "Line", tooltip: "Drawn from the base line set, 2-pixel lines" },
						{ value: "solid", label: "Solid", tooltip: "The hand-drawn solid pixel icons (where there is one)", disabled: !icon.pixelCellsSolid },
					]}
					onChange={(v) => set({ pixelBuild: v })}
				/>
			</Stack>
			<Row label="Pixel size">
				<Segmented
					label="Pixel size"
					value={pixelSize}
					options={[
						{ value: 1, label: "Full", tooltip: "Pixels touch, no gaps" },
						{ value: 0.9, label: "0.9" },
						{ value: 0.8, label: "0.8" },
						{ value: 0.66, label: "Airy", tooltip: "Small pixels, wide gaps" },
					]}
					onChange={(v) => set({ pixelSize: v })}
				/>
			</Row>
			{/* Dot-matrix dots are round, so pixel corners don't apply. */}
			{pixelBuild !== "matrix" && (
				<Row label="Pixel corners">
					<Segmented
						label="Pixel corners"
						value={pixelRadius}
						options={[
							{ value: 0, label: "Square" },
							{ value: 0.18, label: "Soft", tooltip: "A small radius on each pixel" },
						]}
						onChange={(v) => set({ pixelRadius: v })}
					/>
				</Row>
			)}
		</Section>
	);
}

function Appearance({ icon }: { icon: Icon }) {
	const stroke = useIconLab((s) => s.stroke);
	const round = useIconLab((s) => s.round);
	const color = useIconLab((s) => s.color);
	const set = useIconLab((s) => s.set);
	// Stroke only applies to line icons. Solid icons are filled shapes. Pixel icons have their own section.
	const isLine = icon.style === "line";
	const picked = SWATCHES.some((sw) => sw.color === color.toLowerCase());
	return (
		<Section title="Appearance">
			{!icon.pixel && (
				<Row label="Stroke" className={cn(!isLine && "opacity-50")}>
					<Segmented label="Stroke" value={stroke} options={[1, 1.5, 2, 2.25].map((v) => ({ value: v, label: String(v), disabled: !isLine }))} onChange={(v) => set({ stroke: v })} />
				</Row>
			)}
			{!icon.pixel && (
				<Row label="Corners">
					<Segmented
						label="Corners"
						value={round}
						options={[
							{ value: 0, label: "Sharp" },
							{ value: 0.5, label: "Rounded" },
						]}
						onChange={(v) => set({ round: v })}
					/>
				</Row>
			)}
			<Row label="Colour">
				<span role="group" aria-label="Colour" className="flex items-center gap-sm">
					{SWATCHES.map((sw) => (
						<Tooltip key={sw.color}>
							<TooltipTrigger asChild>
								<button
									type="button"
									aria-label={sw.name}
									aria-pressed={color.toLowerCase() === sw.color}
									className={cn(
										"size-[18px] rounded-full border border-normal transition-transform hover:scale-110",
										color.toLowerCase() === sw.color && "outline-1 outline-offset-2 outline-[var(--color-fg-stroke-strong)]",
									)}
									style={{ background: sw.color }}
									onClick={() => set({ color: sw.color })}
								/>
							</TooltipTrigger>
							<TooltipContent>{sw.name}</TooltipContent>
						</Tooltip>
					))}
					<Tooltip>
						<TooltipTrigger asChild>
							<label className={cn("il-custom-swatch relative size-[18px] overflow-hidden rounded-full border border-normal", !picked && "outline-1 outline-offset-2 outline-[var(--color-fg-stroke-strong)]")}>
								<input type="color" aria-label="Custom colour" value={color} onChange={(e) => set({ color: e.target.value })} className="absolute inset-0 size-full cursor-pointer opacity-0" />
							</label>
						</TooltipTrigger>
						<TooltipContent>Custom colour</TooltipContent>
					</Tooltip>
				</span>
			</Row>
		</Section>
	);
}

function Export() {
	const [open, setOpen] = useState(false);
	const [code, setCode] = useState(false);
	useIconLab((s) => s.rev);
	const svg = currentSvg(useIconLab.getState());
	return (
		<Section title="Export">
			<div className="grid grid-cols-2 gap-sm">
				<Popover open={open} onOpenChange={setOpen}>
					<PopoverTrigger asChild>
						<Button variant="outlined" sentiment="neutral" size="small" iconClassName={ICON_NORMAL} iconAfter icon={<I.ChevronDown />}>
							Download PNG
						</Button>
					</PopoverTrigger>
					<PopoverContent align="start" className="w-[160px] gap-2xs p-xs">
						{[256, 512, 1024].map((size) => (
							<MenuItem
								key={size}
								className="font-mono"
								onClick={() => {
									setOpen(false);
									downloadPng(size);
								}}
							>
								{size} px
							</MenuItem>
						))}
					</PopoverContent>
				</Popover>
				<Button variant="outlined" sentiment="neutral" size="small" iconClassName={ICON_NORMAL} iconBefore icon={<I.Copy />} onClick={copyCode}>
					Copy SVG code
				</Button>
			</div>
			{/* A disclosure, as in Figma: the chevron turns down when the code is open. */}
			<button type="button" aria-expanded={code} onClick={() => setCode(!code)} className="label-xsmall flex items-center gap-xs self-start text-weak transition-colors hover:text-strong">
				<I.ChevronRight width={12} height={12} className={cn("transition-[rotate] duration-150", code && "rotate-90")} />
				Show code
			</button>
			{code && (
				<pre aria-label="SVG code" className="mono-xxsmall max-h-[260px] min-h-[120px] overflow-auto rounded-sm border border-weak bg-depth-inset-1 p-md break-all whitespace-pre-wrap text-weak select-text">
					{svg}
				</pre>
			)}
		</Section>
	);
}
