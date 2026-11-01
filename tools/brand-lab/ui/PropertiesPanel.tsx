import { I } from "./ci";
import { useRef } from "react";
import type { Palette } from "../brand/palette";
import { EFFECTS, getDef, SOURCES } from "../layers/registry";
import { type Appearance, BLEND_MODES, type Layer, type ParamDef } from "../layers/types";
import { SIZE_PRESETS } from "../state/doc";
import { selectedLayer, useStore } from "../state/store";
import { ICON_NORMAL, IconButton } from "../components/icon-button";
import { Panel, Section } from "../components/panel";
import { Button } from "@/lib/design-system/jigsaw/components/ui/controls/button/button";
import { Textarea } from "@/lib/design-system/jigsaw/components/ui/controls/textarea/textarea";
import { Tag } from "@/lib/design-system/jigsaw/components/ui/primitives/tag/tag";
import { ColorField, NumberField, Row, Segmented, Select, Slider, Switch } from "./controls";
import { M, PANEL_TOP, usePanels } from "./layout";
import { LayerIcon } from "./icons";
import { PaletteStrip } from "./Palettes";
import { MenuItem, MenuLabel, Popover, PopoverContent, PopoverTrigger } from "../components/popover";
import { cn } from "@/lib/design-system/jigsaw/lib/utils";
import { useState } from "react";

/** One panel: the selected layer's settings, or the scene's when nothing is selected. */
export function PropertiesPanel({ errors }: { errors: Map<string, string> }) {
	const layer = useStore(selectedLayer);
	const count = useStore((s) => s.selectedIds.length);
	const width = usePanels((s) => s.right);

	return (
		<Panel className="max-[1099px]:hidden" style={{ top: PANEL_TOP, right: M, bottom: M, width }} aria-label="Properties">
			<div className="min-h-0 flex-1 overflow-y-auto">{layer ? <LayerProps layer={layer} count={count} error={errors.get(layer.type)} /> : <SceneProps />}</div>
		</Panel>
	);
}

function LayerProps({ layer, count, error }: { layer: Layer; count: number; error?: string }) {
	const def = getDef(layer.type)!;
	const projectPalette = useStore((s) => s.doc.scene.palette);
	const projectPaletteId = useStore((s) => s.doc.scene.paletteId);
	const palettes = useStore((s) => s.palettes);
	const setLayerPalette = useStore((s) => s.setLayerPalette);
	const palette = layer.palette ?? projectPalette;
	const hasColors = def.groups.some((g) => g.params.some((p) => p.type === "color"));
	const projectName = palettes.find((p) => p.id === projectPaletteId)?.name ?? "custom";
	const updateLayer = useStore((s) => s.updateLayer);
	const setParam = useStore((s) => s.setParam);
	const shuffleLayer = useStore((s) => s.shuffleLayer);
	const swapLayerType = useStore((s) => s.swapLayerType);
	// Layers of the same family (e.g. the distort effects) that this one can be swapped for in place.
	const siblings = def.category === "content" ? [] : [...SOURCES, ...EFFECTS].filter((d) => d.kind === def.kind && d.category === def.category);
	const canShuffle = def.groups.some((g) => g.params.some((p) => p.shuffle));

	return (
		<>
			<PropsTitle icon={<LayerIcon name={def.icon} size={16} />} title={count > 1 ? `${count} layers` : layer.name} description={def.description}>
				<Tag size="sm" sentiment={def.kind === "source" ? "accent" : "neutral"}>
					{def.kind === "source" ? "Source" : "Effect"}
				</Tag>
				{canShuffle && <IconButton size="xsmall" label="Shuffle this layer" icon={<I.Shuffle />} onClick={() => shuffleLayer(layer.id)} />}
			</PropsTitle>
			{error && <pre className="mono-xxsmall mx-xl mb-md overflow-x-auto whitespace-pre-wrap rounded-sm bg-negative-weak p-md text-negative-normal">{error}</pre>}
			<Section title="General">
				{siblings.length > 1 && (
					<Row label="Type">
						<Select
							label={`Swap ${def.kind === "effect" ? "effect" : "pattern"}`}
							value={layer.type}
							options={siblings.map((d) => ({ value: d.type, label: d.label }))}
							onChange={(type) => swapLayerType(layer.id, String(type))}
						/>
					</Row>
				)}
				<Slider
					label="Opacity"
					value={layer.opacity}
					min={0}
					max={1}
					step={0.01}
					display={{ scale: 100, unit: "%", step: 1 }}
					onChange={(v) => updateLayer(layer.id, { opacity: v }, `${layer.id}:opacity`)}
				/>
				<Row label="Blend">
					<BlendSelect layer={layer} />
				</Row>
				{hasColors && (
					<Row label="Palette">
						<Select
							label="Layer palette"
							value={layer.paletteId ?? "project"}
							options={[{ value: "project", label: `Project (${projectName})` }, ...palettes.map((p) => ({ value: p.id, label: p.name }))]}
							onChange={(id) => setLayerPalette(layer.id, id === "project" ? null : String(id))}
						/>
					</Row>
				)}
			</Section>
			{def.groups.map((g) => {
				const visible = g.params.filter((p) => !p.hidden && (!p.showIf || p.showIf(layer.params)));
				if (!visible.length) return null;
				return (
					<Section title={g.title} key={g.title}>
						{visible.map((p) => (
							<ParamControl key={p.key} def={p} value={layer.params[p.key]} palette={palette} onChange={(v) => setParam(layer.id, p.key, v)} />
						))}
					</Section>
				);
			})}
			{def.kind === "source" && <AppearanceSection layer={layer} palette={palette} />}
		</>
	);
}

/** Gradient fill and drop shadow, applied by the compositor to any source layer. */
function AppearanceSection({ layer, palette }: { layer: Layer; palette: Palette }) {
	const updateLayer = useStore((s) => s.updateLayer);
	const look = layer.appearance ?? {};
	const set = (next: Appearance, key?: string) => updateLayer(layer.id, { appearance: next }, key ? `${layer.id}:${key}` : undefined);
	const g = look.gradient;
	const sh = look.shadow;
	const fill = g ? g.type : "solid";
	return (
		<Section title="Appearance">
			<Row label="Fill">
				<Segmented
					label="Fill"
					value={fill}
					options={[
						{ value: "solid", label: "Own colours" },
						{ value: "linear", label: "Linear" },
						{ value: "radial", label: "Radial" },
					]}
					onChange={(v) => set({ ...look, gradient: v === "solid" ? undefined : { a: g?.a ?? "$light", b: g?.b ?? "$magenta", angle: g?.angle ?? -45, type: v } })}
				/>
			</Row>
			{g && (
				<>
					<ColorField label="From" value={g.a} palette={palette} onChange={(a) => set({ ...look, gradient: { ...g, a } })} />
					<ColorField label="To" value={g.b} palette={palette} onChange={(b) => set({ ...look, gradient: { ...g, b } })} />
					{g.type === "linear" && <Slider label="Angle" value={g.angle} min={-180} max={180} step={1} unit="°" onChange={(angle) => set({ ...look, gradient: { ...g, angle } }, "gangle")} />}
				</>
			)}
			<Row label="Shadow">
				<Switch label="Drop shadow" checked={!!sh} onChange={(on) => set({ ...look, shadow: on ? { x: 0, y: 24, blur: 48, color: "$ink", opacity: 0.5 } : undefined })} />
			</Row>
			{sh && (
				<>
					<Slider label="X" value={sh.x} min={-200} max={200} step={1} unit="px" onChange={(x) => set({ ...look, shadow: { ...sh, x } }, "sx")} />
					<Slider label="Y" value={sh.y} min={-200} max={200} step={1} unit="px" onChange={(y) => set({ ...look, shadow: { ...sh, y } }, "sy")} />
					<Slider label="Blur" value={sh.blur} min={0} max={300} step={1} unit="px" onChange={(blur) => set({ ...look, shadow: { ...sh, blur } }, "sb")} />
					<Slider label="Opacity" value={sh.opacity} min={0} max={1} step={0.01} display={{ scale: 100, unit: "%", step: 1 }} onChange={(opacity) => set({ ...look, shadow: { ...sh, opacity } }, "so")} />
					<ColorField label="Colour" value={sh.color} palette={palette} onChange={(color) => set({ ...look, shadow: { ...sh, color } })} />
				</>
			)}
		</Section>
	);
}

function ParamControl({ def, value, palette, onChange }: { def: ParamDef; value: unknown; palette: Palette; onChange: (v: number | boolean | string) => void }) {
	switch (def.type) {
		case "float":
			return <Slider label={def.label} value={Number(value)} min={def.min} max={def.max} step={def.step ?? 1} unit={def.unit} onChange={onChange} />;
		case "int":
			return <Slider label={def.label} value={Number(value)} min={def.min} max={def.max} step={1} unit={def.unit} onChange={onChange} />;
		case "select": {
			const short = def.options.length <= 3 && def.options.every((o) => o.label.length <= 9);
			return (
				<Row label={def.label}>
					{short ? (
						<Segmented label={def.label} value={Number(value)} options={def.options} onChange={onChange} />
					) : (
						<Select label={def.label} value={Number(value)} options={def.options} onChange={(v) => onChange(Number(v))} />
					)}
				</Row>
			);
		}
		case "bool":
			return (
				<Row label={def.label}>
					<Switch label={def.label} checked={!!value} onChange={onChange} />
				</Row>
			);
		case "color":
			return <ColorField label={def.label} value={String(value)} palette={palette} onChange={onChange} />;
		case "text":
			return (
				<label className="flex flex-col gap-sm">
					<span className="label-xsmall text-normal">{def.label}</span>
					<Textarea value={String(value)} rows={def.multiline ? 3 : 1} onChange={(e) => onChange(e.target.value)} />
				</label>
			);
		case "image":
			return <ImageField value={String(value)} onChange={onChange} />;
	}
}

export function readImageFile(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
}

function ImageField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
	const input = useRef<HTMLInputElement>(null);
	return (
		<div className="flex flex-col gap-md">
			{value && <img src={value} alt="" className="max-h-[160px] w-full rounded-sm bg-depth-inset-1 object-contain" />}
			<Button iconClassName={ICON_NORMAL} variant="outlined" sentiment="neutral" size="small" iconBefore icon={<I.ImagePlus />} onClick={() => input.current?.click()}>
				{value ? "Replace image" : "Choose image"}
			</Button>
			<input
				ref={input}
				type="file"
				accept="image/*"
				hidden
				onChange={async (e) => {
					const f = e.target.files?.[0];
					if (f) onChange(await readImageFile(f));
					e.target.value = "";
				}}
			/>
		</div>
	);
}

function SceneProps() {
	const docName = useStore((s) => s.doc.name);
	const scene = useStore((s) => s.doc.scene);
	const setScene = useStore((s) => s.setScene);
	const preset = SIZE_PRESETS.find((p) => p.w === scene.width && p.h === scene.height)?.id ?? "custom";
	const palettes = useStore((s) => s.palettes);
	const applyPalette = useStore((s) => s.applyPalette);
	const setOverlay = useStore((s) => s.setOverlay);
	const paletteId = palettes.some((p) => p.id === scene.paletteId) ? scene.paletteId! : "custom";

	return (
		<>
			<PropsTitle icon={<I.Frame width={16} height={16} />} title={docName || "Untitled"} />
			<Section title="Composition">
				<Select
					wide
					label="Size preset"
					value={preset}
					options={[...SIZE_PRESETS.map((p) => ({ value: p.id, label: p.label })), { value: "custom", label: "Custom" }]}
					onChange={(id) => {
						const p = SIZE_PRESETS.find((x) => x.id === id);
						if (p) setScene({ width: p.w, height: p.h });
					}}
				/>
				<Row label="Width">
					<NumberField label="Width" value={scene.width} min={16} max={8192} onChange={(width) => setScene({ width })} />
				</Row>
				<Row label="Height">
					<NumberField label="Height" value={scene.height} min={16} max={8192} onChange={(height) => setScene({ height })} />
				</Row>
			</Section>
			<Section title="Background">
				<Row label="Transparent">
					<Switch label="Transparent background" checked={scene.transparent} onChange={(transparent) => setScene({ transparent })} />
				</Row>
				{!scene.transparent && <ColorField label="Colour" value={scene.background} palette={scene.palette} onChange={(background) => setScene({ background })} />}
			</Section>
			<Section title="Project palette">
				<Select
					wide
					label="Palette"
					value={paletteId}
					options={[...palettes.map((p) => ({ value: p.id, label: p.name })), ...(paletteId === "custom" ? [{ value: "custom", label: "From file" }] : [])]}
					onChange={(id) => id !== "custom" && applyPalette(id)}
				/>
				<PaletteStrip colors={scene.palette} className="h-[20px]" />
				<Button variant="outlined" sentiment="neutral" size="small" className="w-full" onClick={() => setOverlay("palettes")}>
					Edit palettes
				</Button>
			</Section>
			<Section title="Timeline">
				<Slider label="Loop length" value={scene.duration} min={1} max={30} step={0.5} unit="s" onChange={(duration) => setScene({ duration }, "duration")} />
				<Row label="Frame rate">
					<Segmented label="Frame rate" value={scene.fps} options={[24, 30, 60].map((f) => ({ value: f, label: `${f}` }))} onChange={(fps) => setScene({ fps })} />
				</Row>
			</Section>
		</>
	);
}

/** The panel's header: what's being edited (a layer's type icon, or the canvas frame) and its name. */
function PropsTitle({ icon, title, description, children }: { icon: React.ReactNode; title: string; description?: string; children?: React.ReactNode }) {
	return (
		<div className="sticky top-0 z-10 flex items-start gap-md border-b border-weak bg-surface-elevated-1 px-xl py-lg">
			<span className="flex size-[24px] shrink-0 items-center justify-center rounded-xs bg-depth-inset-1 stroke-normal text-(color:--color-fg-icon-normal)">{icon}</span>
			<div className="flex min-h-[24px] min-w-0 flex-1 flex-col justify-center gap-2xs">
				<h2 className="label-small-strong truncate text-strong">{title}</h2>
				{description && <p className="para-xxsmall text-weak">{description}</p>}
			</div>
			{children && <div className="flex h-[24px] shrink-0 items-center gap-xs">{children}</div>}
		</div>
	);
}

/**
 * Blend mode picker that previews: hovering a mode shows it on the canvas (without committing or
 * adding an undo step); leaving the list restores the current mode, clicking commits.
 */
function BlendSelect({ layer }: { layer: Layer }) {
	const [open, setOpen] = useState(false);
	const setPreview = useStore((s) => s.setPreview);
	const updateLayer = useStore((s) => s.updateLayer);
	const close = (o: boolean) => {
		setOpen(o);
		if (!o) setPreview(null);
	};
	return (
		<Popover open={open} onOpenChange={close}>
			<PopoverTrigger asChild>
				<button
					type="button"
					aria-label="Blend mode"
					className="label-xsmall flex h-[24px] w-[150px] items-center justify-between rounded-xs border border-weak bg-depth-inset-1 pr-xs pl-sm text-strong transition-colors hover:bg-interaction-hover-subtle"
				>
					{BLEND_MODES[layer.blend]}
					<I.ChevronDown width={14} height={14} className="text-(color:--color-fg-icon-normal)" />
				</button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-[180px] gap-2xs p-xs" onMouseLeave={() => setPreview(null)}>
				<MenuLabel className="pb-xs">Hover to preview</MenuLabel>
				{BLEND_MODES.map((m, i) => (
					<MenuItem
						key={m}
						onMouseEnter={() => setPreview(i === layer.blend ? null : { id: layer.id, patch: { blend: i } })}
						onFocus={() => setPreview(i === layer.blend ? null : { id: layer.id, patch: { blend: i } })}
						onClick={() => {
							updateLayer(layer.id, { blend: i });
							close(false);
						}}
						trailing={<I.Check width={14} height={14} className={cn("text-brand-normal", i !== layer.blend && "invisible")} />}
					>
						{m}
					</MenuItem>
				))}
			</PopoverContent>
		</Popover>
	);
}
