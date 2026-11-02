import EyeDropIcon from "@icons/icons/Editing Design/Eye-dropper.svg?react";
import { IconButton } from "./icon-button";
import { useRef, useState } from "react";
import { HueSlider, SaturationPanel } from "@/lib/design-system/jigsaw/components/ui/color/gradient-color-picker/color-primitives";
import { hexToHsv, hsvToHex } from "@/lib/design-system/jigsaw/components/ui/color/gradient-color-picker/color-utils";
import { ColorSwatch } from "@/lib/design-system/jigsaw/components/ui/color/gradient-color-picker/color-swatch";
import { Field } from "./field";
import { Popover, PopoverAnchor, PopoverContent } from "./popover";

const HEX = /^#[0-9a-f]{6}$/i;

/** Screen colour picker where the browser supports it (Chromium). */
export const canPickFromScreen = typeof window !== "undefined" && "EyeDropper" in window;

export function pickFromScreen(onPicked: (hex: string) => void) {
	const Ctor = (window as unknown as { EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper;
	if (!Ctor) return;
	new Ctor().open().then(
		(r) => onPicked(r.sRGBHex.toUpperCase()),
		() => {},
	);
}

/**
 * jigsaw's solid-colour picker body (saturation panel, hue slider, eyedropper, hex field), for use
 * inside our own popovers next to palette swatches. Same primitives as jigsaw's GradientColorPicker.
 */
export function CustomColorPicker({ color, onChange }: { color: string; onChange: (hex: string) => void }) {
	const hsv = hexToHsv(color);
	// Hue is undefined for greys; keep the last one so dragging towards white doesn't snap to red.
	const hue = useRef(hsv.h);
	if (hsv.s > 0) hue.current = hsv.h;
	const [draft, setDraft] = useState(color.toUpperCase());
	const [prev, setPrev] = useState(color);
	if (prev !== color) {
		setPrev(color);
		setDraft(color.toUpperCase());
	}

	return (
		<div className="flex flex-col gap-sm">
			<SaturationPanel hue={hue.current} saturation={hsv.s} value={hsv.v} onChange={(s, v) => onChange(hsvToHex({ h: hue.current, s, v }).toUpperCase())} />
			<div className="flex items-center gap-sm">
				{canPickFromScreen && (
					<IconButton variant="outlined" label="Pick colour from screen" icon={<EyeDropIcon className="size-3.5" />} onClick={() => pickFromScreen(onChange)} />
				)}
				<div className="min-w-0 flex-1 py-sm">
					<HueSlider
						hue={hue.current}
						onChange={(h) => {
							hue.current = h;
							onChange(hsvToHex({ h, s: hsv.s, v: hsv.v }).toUpperCase());
						}}
					/>
				</div>
			</div>
			<Field
				aria-label="Hex"
				inputClassName="font-mono uppercase"
				value={draft}
				spellCheck={false}
				onChange={(e) => {
					let v = e.target.value.trim();
					if (v && !v.startsWith("#")) v = `#${v}`;
					setDraft(v.toUpperCase());
					if (HEX.test(v)) onChange(v.toUpperCase());
				}}
				onBlur={() => setDraft(color.toUpperCase())}
			/>
		</div>
	);
}

/**
 * A colour field: jigsaw's swatch trigger (swatch + hex) opening the jigsaw picker body in a Radix
 * popover. jigsaw's own GradientColorPicker portals a fixed panel below modal z-index and outside
 * Radix's focus scope, so inside sheets it can't be used as-is.
 */
export function ColorPickerField({ color, onChange, className }: { color: string; onChange: (hex: string) => void; className?: string }) {
	const [open, setOpen] = useState(false);
	const anchor = useRef<HTMLDivElement>(null);
	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverAnchor asChild>
				<div className={className}>
					<ColorSwatch
						type="fill"
						color={color}
						isGradientMode={false}
						gradientPreviewStyle={{}}
						withHexCode
						withOpacity={false}
						showOpacityLabel={false}
						opacity={100}
						onClick={() => setOpen((o) => !o)}
						triggerRef={anchor}
					/>
				</div>
			</PopoverAnchor>
			<PopoverContent
				align="end"
				className="w-[240px] bg-surface p-lg"
				onInteractOutside={(e) => {
					if (anchor.current?.contains(e.target as Node)) e.preventDefault();
				}}
			>
				<CustomColorPicker color={color} onChange={onChange} />
			</PopoverContent>
		</Popover>
	);
}
