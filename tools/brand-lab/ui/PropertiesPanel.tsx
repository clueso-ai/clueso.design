import { removeBackground } from "../ml/bgremove";
import { readImageFile } from "./image-file";
import { I } from "./ci";
import { useRef } from "react";
import { nearestColor, type Palette } from "../brand/palette";
import { EFFECTS, getDef, isFramed, SOURCES } from "../layers/registry";
import { type Appearance, BLEND_MODES, CATEGORIES, type Layer, type ParamDef } from "../layers/types";
import { parseColorMap, svgColors } from "../layers/sources/svg";
import { textBox } from "../layers/sources/text";
import { SIZE_PRESETS } from "../state/doc";
import { selectedLayer, useStore } from "../state/store";
import { ICON_NORMAL, IconButton } from "@/tools/shell/components/icon-button";
import { Section } from "@/tools/shell/components/panel";
import { RightPanel } from "@/tools/shell/panels";
import { Button } from "@/lib/design-system/jigsaw/components/ui/controls/button/button";
import { Textarea } from "@/lib/design-system/jigsaw/components/ui/controls/textarea/textarea";
import { Tag } from "@/lib/design-system/jigsaw/components/ui/primitives/tag/tag";
import { ColorField, NumberField, Row, Segmented, Select, Slider, Switch } from "./controls";
import { LayerIcon } from "./icons";
import { PaletteStrip } from "./Palettes";
import { MenuItem, MenuLabel, Popover, PopoverContent, PopoverTrigger } from "../components/popover";
import { cn } from "@/lib/design-system/jigsaw/lib/utils";
import { useState } from "react";

/** One panel: the selected layer's settings, or the scene's when nothing is selected. */
export function PropertiesPanel({ errors }: { errors: Map<string, string> }) {
	const layer = useStore(selectedLayer);
	const count = useStore((s) => s.selectedIds.length);

	return (
		<RightPanel aria-label="Properties">
			<div className="min-h-0 flex-1 overflow-y-auto">{layer ? <LayerProps layer={layer} count={count} error={errors.get(layer.type)} /> : <SceneProps />}</div>
		</RightPanel>
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
						{layer.type === "text" && g.title === "Box" && <TextSizing layer={layer} />}
						{visible.map((p) => (
							<ParamControl key={p.key} def={p} value={layer.params[p.key]} palette={palette} layerId={layer.id} onChange={(v) => setParam(layer.id, p.key, v)} />
						))}
					</Section>
				);
			})}
			{layer.type === "svg" && count === 1 && <SvgColorsSection layer={layer} palette={palette} />}
			{def.kind === "source" && count === 1 && <EffectsSection layer={layer} palette={palette} />}
			{def.kind === "effect" && count === 1 && <AppliesToSection layer={layer} />}
			{def.kind === "source" && <AppearanceSection layer={layer} palette={palette} />}
		</>
	);
}

/**
 * Figma's text resizing: Hug grows the box with the text, one line per paragraph. Wrap keeps a fixed width
 * and breaks lines inside it, starting from the width the text has now. Dragging a side handle on the
 * canvas switches to Wrap; double-clicking one goes back to Hug.
 */
function TextSizing({ layer }: { layer: Layer }) {
	const W = useStore((s) => s.doc.scene.width);
	const hug = !(Number(layer.params.width) > 0);
	return (
		<Row label="Width">
			<Segmented
				label="Text width"
				value={hug ? "hug" : "wrap"}
				options={[
					{ value: "hug", label: "Hug" },
					{ value: "wrap", label: "Wrap" },
				]}
				onChange={(v) => {
					if ((v === "hug") === hug) return;
					const box = textBox({ ...layer.params, width: 0 }, W);
					const width = v === "hug" ? 0 : Math.min(1, Math.max(0.01, Math.round(((box?.w ?? W * 0.5) / W) * 1000) / 1000));
					useStore.getState().setParam(layer.id, "width", width);
				}}
			/>
		</Row>
	);
}

/**
 * Every colour a pasted SVG uses, each swappable for a palette colour (or any colour). "Use palette"
 * maps them all to the nearest palette colour by lightness, which keeps the artwork's contrast.
 */
function SvgColorsSection({ layer, palette }: { layer: Layer; palette: Palette }) {
	const colors = svgColors(String(layer.params.markup ?? ""));
	const map = parseColorMap(layer.params);
	const set = (next: Record<string, string>) => useStore.getState().setParam(layer.id, "colors", JSON.stringify(next));
	const edited = Object.keys(map).length > 0;
	return (
		<Section
			title="Colours"
			action={
				colors.length > 0 && (
					<span className="flex items-center gap-xs">
						{edited && <IconButton size="xsmall" label="Back to the original colours" icon={<I.Reset />} onClick={() => set({})} />}
						<IconButton
							size="xsmall"
							label="Use palette: swap every colour for the nearest palette colour"
							icon={<I.Swatches />}
							onClick={() => set(Object.fromEntries(colors.map((c) => [c, `$${nearestColor(palette, toHex(c))?.key ?? ""}`]).filter(([, v]) => v !== "$")))}
						/>
					</span>
				)
			}
		>
			{colors.length === 0 ? (
				<p className="para-xxsmall text-weak">This SVG doesn&rsquo;t set any colours of its own, so it draws in black.</p>
			) : (
				colors.map((c) => <ColorField key={c} label={c.startsWith("#") ? c.toUpperCase() : c} value={map[c] ?? toHex(c)} palette={palette} onChange={(v) => set({ ...map, [c]: v })} />)
			)}
		</Section>
	);
}

/** A CSS colour (hex, rgb() or a name) as #rrggbb, read through a canvas. */
function toHex(c: string) {
	if (/^#[0-9a-f]{6}$/i.test(c)) return c.toLowerCase();
	const g = document.createElement("canvas").getContext("2d")!;
	g.fillStyle = "#000";
	g.fillStyle = c;
	return String(g.fillStyle);
}

/** Effects on this layer alone, top first. Each restyles only this layer, never what's below it. */
function EffectsSection({ layer, palette }: { layer: Layer; palette: Palette }) {
	const effects = layer.effects ?? [];
	const st = useStore.getState;
	const [closed, setClosed] = useState<Set<string>>(() => new Set());
	const toggle = (id: string) =>
		setClosed((c) => {
			const n = new Set(c);
			if (n.has(id)) n.delete(id);
			else n.add(id);
			return n;
		});
	return (
		<Section title="Effects" action={<AddEffectMenu onPick={(type) => st().addEffect(layer.id, type)} />}>
			{effects.length === 0 && <p className="para-xxsmall text-weak">Effects here change only this layer. A Look layer in the Layers panel changes everything below it.</p>}
			{effects.map((e, i) => {
				const def = getDef(e.type);
				if (!def) return null;
				const open = !closed.has(e.id);
				const params = def.groups
					.filter((g) => !g.stackOnly)
					.flatMap((g) => g.params)
					.filter((p) => !p.hidden && (!p.showIf || p.showIf(e.params)));
				return (
					<div key={e.id} className="flex flex-col rounded-sm border border-weak">
						<div className="flex h-[36px] items-center gap-xs pr-xs pl-sm">
							<button type="button" className="flex min-w-0 flex-1 items-center gap-sm text-left" aria-expanded={open} onClick={() => toggle(e.id)}>
								<I.ChevronDown width={12} height={12} className={cn("shrink-0 text-weak transition-transform", !open && "-rotate-90")} />
								<LayerIcon name={def.icon} size={14} />
								<span className={cn("label-xsmall truncate", e.visible ? "text-strong" : "text-weak")}>{def.label}</span>
							</button>
							<IconButton size="xsmall" label="Move up" icon={<I.ChevronDown className="rotate-180" />} disabled={i === 0} onClick={() => st().moveEffect(layer.id, e.id, -1)} />
							<IconButton size="xsmall" label="Move down" icon={<I.ChevronDown />} disabled={i === effects.length - 1} onClick={() => st().moveEffect(layer.id, e.id, 1)} />
							<IconButton size="xsmall" label="Apply to everything below instead" icon={<I.Layers />} onClick={() => st().liftEffect(layer.id, e.id)} />
							<IconButton size="xsmall" label={`Remove ${def.label}`} icon={<I.Bin />} onClick={() => st().removeEffect(layer.id, e.id)} />
							<IconButton
								size="xsmall"
								label={e.visible ? `Hide ${def.label}` : `Show ${def.label}`}
								icon={e.visible ? <I.Eye /> : <I.EyeSlashed />}
								onClick={() => st().updateEffect(layer.id, e.id, { visible: !e.visible })}
							/>
						</div>
						{open && params.length > 0 && (
							<div className="flex flex-col gap-md border-t border-dashed border-weak px-sm py-md">
								{params.map((p) => (
									<ParamControl
										key={p.key}
										def={p}
										value={e.params[p.key]}
										palette={palette}
										layerId={layer.id}
										onChange={(v) => st().updateEffect(layer.id, e.id, { params: { ...e.params, [p.key]: v } }, `${e.id}:${p.key}`)}
									/>
								))}
							</div>
						)}
					</div>
				);
			})}
		</Section>
	);
}

/** The effects list, grouped like the Look tab of the add menu. */
function AddEffectMenu({ onPick }: { onPick: (type: string) => void }) {
	const [open, setOpen] = useState(false);
	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<IconButton size="xsmall" label="Add effect to this layer" icon={<I.Plus />} />
			</PopoverTrigger>
			<PopoverContent align="end" className="max-h-[min(560px,calc(100vh-96px))] w-[280px] gap-2xs overflow-y-auto p-xs">
				{CATEGORIES.map((c) => {
					const defs = EFFECTS.filter((d) => d.category === c.id);
					if (!defs.length) return null;
					return (
						<div key={c.id} className="flex flex-col gap-2xs">
							<MenuLabel>{c.label}</MenuLabel>
							{defs.map((d) => (
								<MenuItem
									key={d.type}
									icon={<LayerIcon name={d.icon} size={14} />}
									description={d.description}
									onClick={() => {
										onPick(d.type);
										setOpen(false);
									}}
								>
									{d.label}
								</MenuItem>
							))}
						</div>
					);
				})}
			</PopoverContent>
		</Popover>
	);
}

/** On a Look layer: what it changes, and a one-click switch to change just one layer instead. */
function AppliesToSection({ layer }: { layer: Layer }) {
	const layers = useStore((s) => s.doc.layers);
	const i = layers.findIndex((l) => l.id === layer.id);
	const below = layers.slice(i + 1).filter((l) => l.visible);
	const target = below.find((l) => getDef(l.type)?.kind === "source");
	return (
		<Section title="Applies to">
			<p className="para-xxsmall text-weak">
				{below.length
					? `${isFramed(layer) ? "Everything below it, inside its frame" : "Everything below it"}: ${below.length} layer${below.length > 1 ? "s" : ""}.`
					: "Nothing yet. Move it above the layers it should change."}
			</p>
			{target && (
				<Button iconClassName={ICON_NORMAL} variant="outlined" sentiment="neutral" size="small" iconBefore icon={<I.Layers />} onClick={() => useStore.getState().applyLookTo(layer.id, target.id)}>
					Apply only to {target.name}
				</Button>
			)}
		</Section>
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

function ParamControl({ def, value, palette, layerId, onChange }: { def: ParamDef; value: unknown; palette: Palette; layerId: string; onChange: (v: number | boolean | string) => void }) {
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
			return <ImageField value={String(value)} onChange={onChange} onFile={(src) => useStore.getState().setImage(layerId, src)} />;
	}
}

// Cut-out → original, so "Restore original" works for the session (⌘Z also undoes a removal).
const originals = new Map<string, string>();

/** `onFile` takes a chosen file (placed inside the canvas when the layer was empty); `onChange` a cut-out or restore. */
function ImageField({ value, onChange, onFile }: { value: string; onChange: (v: string) => void; onFile: (src: string) => void }) {
	const input = useRef<HTMLInputElement>(null);
	const [busy, setBusy] = useState<string | null>(null);
	const showToast = useStore((s) => s.showToast);
	const original = originals.get(value);

	const cutOut = async () => {
		setBusy("Removing background…");
		try {
			const out = await removeBackground(value, ({ loaded, total }) => setBusy(`Downloading model ${Math.round((loaded / total) * 100)}%`));
			originals.set(out, value);
			onChange(out);
		} catch (err) {
			console.error(err);
			showToast("Couldn't remove the background");
		} finally {
			setBusy(null);
		}
	};

	return (
		<div className="flex flex-col gap-md">
			{value && <img src={value} alt="" className="checker max-h-[160px] w-full rounded-sm object-contain" />}
			<Button iconClassName={ICON_NORMAL} variant="outlined" sentiment="neutral" size="small" iconBefore icon={<I.ImagePlus />} onClick={() => input.current?.click()}>
				{value ? "Replace image" : "Choose image"}
			</Button>
			{value &&
				(original ? (
					<Button iconClassName={ICON_NORMAL} variant="outlined" sentiment="neutral" size="small" iconBefore icon={<I.Undo />} onClick={() => onChange(original)}>
						Restore original
					</Button>
				) : (
					<Button iconClassName={ICON_NORMAL} variant="outlined" sentiment="neutral" size="small" iconBefore icon={<I.Sparkles />} disabled={!!busy} onClick={cutOut}>
						{busy ?? "Remove background"}
					</Button>
				))}
			<input
				ref={input}
				type="file"
				accept="image/*,.svg"
				hidden
				onChange={async (e) => {
					const f = e.target.files?.[0];
					if (f) onFile(await readImageFile(f));
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
