import { I } from "./ci";
import { ICON_NORMAL, IconButton } from "../components/icon-button";
import { Button } from "@/lib/design-system/jigsaw/components/ui/controls/button/button";
import { Field } from "../components/field";
import { Tag } from "@/lib/design-system/jigsaw/components/ui/primitives/tag/tag";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/lib/design-system/jigsaw/components/ui/overlays/tooltip/tooltip";
import { ColorPickerField } from "../components/color";
import { cn } from "@/lib/design-system/jigsaw/lib/utils";
import { useCallback, useState } from "react";
import { BUILT_IN_PALETTES, CORE_KEYS, clonePalette, type PaletteDef, samePalette } from "../brand/palette";
import { newId } from "../layers/registry";
import { useStore } from "../state/store";
import { Sheet } from "./Sheet";

const CORE = new Set<string>(CORE_KEYS);

function edited(def: PaletteDef) {
	const original = BUILT_IN_PALETTES.find((p) => p.id === def.id);
	return !!original && (original.name !== def.name || !samePalette(original.colors, def.colors));
}

/** Palette manager: browse every palette, edit colours (add, rename, recolour, remove), make new ones. */
export function Palettes() {
	const palettes = useStore((s) => s.palettes);
	const inUse = useStore((s) => s.doc.scene.paletteId);
	const scenePalette = useStore((s) => s.doc.scene.palette);
	const setOverlay = useStore((s) => s.setOverlay);
	const savePalette = useStore((s) => s.savePalette);
	const applyPalette = useStore((s) => s.applyPalette);
	const [selected, setSelected] = useState(() => inUse ?? palettes[0].id);
	const close = useCallback(() => setOverlay(null), [setOverlay]);
	const def = palettes.find((p) => p.id === selected) ?? palettes[0];

	const create = (from: PaletteDef | null) => {
		const n = palettes.filter((p) => !p.builtIn).length + 1;
		const id = newId();
		savePalette({ id, name: from ? `${from.name} copy` : `My palette ${n}`, colors: clonePalette(from ? from.colors : scenePalette) });
		setSelected(id);
	};

	return (
		<Sheet
			label="Palettes"
			title="Palettes"
			onClose={close}
			controls={
				<Tooltip>
					<TooltipTrigger asChild>
						<Button iconClassName={ICON_NORMAL} variant="outlined" sentiment="neutral" size="small" iconBefore icon={<I.Plus />} onClick={() => create(null)}>
							New palette
						</Button>
					</TooltipTrigger>
					<TooltipContent>New palette from the colours in this design</TooltipContent>
				</Tooltip>
			}
		>
			<div className="grid min-h-0 flex-1 grid-cols-[260px_1fr] gap-4xl">
				<ul className="flex flex-col gap-2xs overflow-y-auto pr-xs" aria-label="Palettes">
					{palettes.map((p) => (
						<li key={p.id}>
							<button
								type="button"
								onClick={() => setSelected(p.id)}
								aria-current={p.id === def.id}
								className={cn(
									"flex w-full flex-col gap-sm rounded-sm p-md text-left transition-colors hover:bg-interaction-hover-subtle",
									p.id === def.id && "bg-interaction-selected-subtle hover:bg-interaction-selected-subtle",
								)}
							>
								<span className="flex items-center gap-xs">
									<span className="label-xsmall-strong flex-1 truncate text-strong">{p.name}</span>
									{p.id === inUse && (
										<Tag sentiment="brand" size="sm">
											In use
										</Tag>
									)}
									{!p.builtIn && <Tag size="sm">Yours</Tag>}
									{edited(p) && <Tag size="sm">Edited</Tag>}
								</span>
								<PaletteStrip colors={p.colors} className="h-[14px]" />
							</button>
						</li>
					))}
				</ul>
				<PaletteEditor key={def.id} def={def} inUse={def.id === inUse} onUse={() => applyPalette(def.id)} onDuplicate={() => create(def)} onDeleted={() => setSelected(inUse ?? palettes[0].id)} />
			</div>
		</Sheet>
	);
}

function PaletteEditor({ def, inUse, onUse, onDuplicate, onDeleted }: { def: PaletteDef; inUse: boolean; onUse: () => void; onDuplicate: () => void; onDeleted: () => void }) {
	const savePalette = useStore((s) => s.savePalette);
	const removePalette = useStore((s) => s.removePalette);
	const [confirm, setConfirm] = useState(false);
	const update = (colors: PaletteDef["colors"]) => savePalette({ ...def, colors });
	const setColor = (i: number, patch: Partial<PaletteDef["colors"][number]>) => update(def.colors.map((c, j) => (j === i ? { ...c, ...patch } : c)));

	return (
		<div className="flex min-w-0 max-w-[640px] flex-col gap-xl overflow-y-auto">
			<input
				key={def.name}
				className="title-small w-full rounded-xs bg-transparent px-xs py-2xs text-strong outline-none hover:bg-interaction-hover-subtle focus:bg-depth-inset-1"
				defaultValue={def.name}
				aria-label="Palette name"
				onBlur={(e) => {
					const name = e.target.value.trim();
					if (name && name !== def.name) savePalette({ ...def, name });
				}}
				onKeyDown={(e) => {
					if (e.key === "Enter") (e.target as HTMLInputElement).blur();
				}}
			/>
			<PaletteStrip colors={def.colors} className="h-[56px] rounded-md" />

			<ul className="flex flex-col">
				{def.colors.map((c, i) => (
					<li key={c.key} className="grid grid-cols-[1fr_128px_44px_24px] items-center gap-md border-b border-dashed border-weak py-sm last:border-b-0">
						<Field
							key={`${c.key}-name-${c.name}`}
							
							defaultValue={c.name}
							aria-label="Colour name"
							onBlur={(e) => {
								const name = e.target.value.trim();
								if (name && name !== c.name) setColor(i, { name });
							}}
							onKeyDown={(e) => {
								if (e.key === "Enter") (e.target as HTMLInputElement).blur();
							}}
						/>
						<ColorPickerField color={c.hex} onChange={(hex) => setColor(i, { hex })} />
						<span>
							{CORE.has(c.key) && (
								<Tooltip>
									<TooltipTrigger asChild>
										<Tag size="sm">Role</Tag>
									</TooltipTrigger>
									<TooltipContent>Presets and Shuffle use this role</TooltipContent>
								</Tooltip>
							)}
						</span>
						<IconButton
							size="xsmall"
							label={def.colors.length <= 2 ? "A palette needs at least two colours" : `Remove ${c.name}`}
							disabled={def.colors.length <= 2}
							icon={<I.Cross />}
							onClick={() => update(def.colors.filter((_, j) => j !== i))}
						/>
					</li>
				))}
			</ul>
			<div>
				<Button iconClassName={ICON_NORMAL}
					variant="outlined"
					sentiment="neutral"
					size="small"
					iconBefore
					icon={<I.Plus />}
					onClick={() => update([...def.colors, { key: `c${newId()}`, name: `Colour ${def.colors.length + 1}`, hex: def.colors[def.colors.length - 1]?.hex ?? "#DA5CC7" }])}
				>
					Add colour
				</Button>
			</div>
			<p className="para-xsmall text-weak">
				Colours tagged Role are the ones presets and Shuffle use. Remove one and anything using it switches to the nearest colour by lightness.
				{inUse ? " Edits show up in this design right away." : ""}
			</p>

			<div className="flex flex-wrap gap-md border-t border-weak pt-xl">
				<Button variant="filled" sentiment="brand" size="small" onClick={onUse} disabled={inUse}>
					{inUse ? "In use in this design" : "Use in this design"}
				</Button>
				<Button iconClassName={ICON_NORMAL} variant="outlined" sentiment="neutral" size="small" iconBefore icon={<I.Copy />} onClick={onDuplicate}>
					Duplicate
				</Button>
				{def.builtIn ? (
					edited(def) && (
						<Button iconClassName={ICON_NORMAL} variant="outlined" sentiment="neutral" size="small" iconBefore icon={<I.Reset />} onClick={() => removePalette(def.id)}>
							Reset to original
						</Button>
					)
				) : (
					<Button
						variant={confirm ? "filled" : "outlined"}
						sentiment="negative"
						size="small"
						iconBefore
						icon={<I.Bin />}
						onBlur={() => setConfirm(false)}
						onClick={() => {
							if (!confirm) return setConfirm(true);
							removePalette(def.id);
							onDeleted();
						}}
					>
						{confirm ? "Click again to delete" : "Delete"}
					</Button>
				)}
			</div>
		</div>
	);
}

/** A palette as a row of equal colour bars. */
export function PaletteStrip({ colors, className }: { colors: PaletteDef["colors"]; className?: string }) {
	return (
		<span className={cn("flex w-full overflow-hidden rounded-xs shadow-[inset_0_0_0_1px_var(--color-fg-stroke-weak)]", className)} aria-hidden>
			{colors.map((c) => (
				<Tooltip key={c.key}>
					<TooltipTrigger asChild>
						<span className="h-full flex-1" style={{ background: c.hex }} />
					</TooltipTrigger>
					<TooltipContent>{`${c.name} ${c.hex.toUpperCase()}`}</TooltipContent>
				</Tooltip>
			))}
		</span>
	);
}
