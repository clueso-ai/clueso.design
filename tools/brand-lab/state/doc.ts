import { CLUESO_PALETTE, type ColorValue, clonePalette, type Palette } from "../brand/palette";
import type { Layer } from "../layers/types";

export interface Scene {
	width: number;
	height: number;
	background: ColorValue;
	transparent: boolean;
	palette: Palette;
	/** Palette the colours came from, so edits to that palette can follow into the scene. */
	paletteId?: string;
	duration: number;
	fps: number;
}

export interface Doc {
	version: 1;
	name: string;
	scene: Scene;
	/** Top of the stack first, like the layers panel. */
	layers: Layer[];
	/** Where this canvas sits on the board (composition px, top-left). Unset canvases are auto-placed. */
	board?: { x: number; y: number };
}

export const SIZE_PRESETS: { id: string; label: string; w: number; h: number }[] = [
	{ id: "square", label: "Square · 1080", w: 1080, h: 1080 },
	{ id: "landscape", label: "Landscape · 1920×1080", w: 1920, h: 1080 },
	{ id: "portrait", label: "Story · 1080×1920", w: 1080, h: 1920 },
	{ id: "poster", label: "Poster · 3:4", w: 1500, h: 2000 },
	{ id: "og", label: "OG image · 1200×630", w: 1200, h: 630 },
	{ id: "linkedin", label: "LinkedIn banner", w: 1584, h: 396 },
	{ id: "x-header", label: "X header", w: 1500, h: 500 },
	{ id: "slide", label: "Slide · 1920×1080 @2x", w: 3840, h: 2160 },
	{ id: "wallpaper", label: "Desktop wallpaper", w: 2880, h: 1800 },
];

export function defaultScene(): Scene {
	return {
		width: 1080,
		height: 1080,
		background: "$plum",
		transparent: false,
		palette: clonePalette(CLUESO_PALETTE),
		paletteId: "clueso",
		duration: 6,
		fps: 30,
	};
}
