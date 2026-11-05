import type { ColorValue, Palette } from "../brand/palette";

export type ParamValue = number | boolean | string;
export type Params = Record<string, ParamValue>;

interface ParamBase {
	key: string;
	label: string;
	/** Hide the control unless this returns true. */
	showIf?: (p: Params) => boolean;
	/** Whether Shuffle may randomise this param. Numbers take an optional narrower range. */
	shuffle?: boolean | [number, number];
	/** Stored with the layer but never shown (format markers). */
	hidden?: boolean;
}

export type ParamDef =
	| (ParamBase & { type: "float"; min: number; max: number; step?: number; default: number; unit?: string })
	| (ParamBase & { type: "int"; min: number; max: number; default: number; unit?: string })
	| (ParamBase & { type: "select"; options: { value: number; label: string }[]; default: number })
	| (ParamBase & { type: "bool"; default: boolean })
	| (ParamBase & { type: "color"; default: ColorValue })
	| (ParamBase & { type: "text"; default: string; multiline?: boolean })
	| (ParamBase & { type: "image"; default: string });

export interface ParamGroup {
	title: string;
	params: ParamDef[];
	/** Only for a layer in the stack, not for an effect on one layer (a Look's frame). */
	stackOnly?: boolean;
}

export interface TextureImage {
	source: TexImageSource;
	width: number;
	height: number;
}

export interface TextureRequest {
	/** Rebuilt and re-uploaded only when this changes. */
	key: string;
	build: () => TextureImage | null;
}

export interface TextureContext {
	/** Render target size in device px. */
	res: [number, number];
	/** Composition size in composition px. */
	comp: [number, number];
	resolveColor: (c: ColorValue) => string;
	/** Whether the scene background is dark (drives the Auto logo variant). */
	darkBg: boolean;
	/** Ask for a redraw once an async resource (image, font) has loaded. */
	invalidate: () => void;
}

/** Add-menu sections, in display order. */
export const CATEGORIES = [
	{ id: "brand", label: "Brand blocks" },
	{ id: "pattern", label: "Patterns" },
	{ id: "fill", label: "Fills" },
	{ id: "content", label: "Content" },
	{ id: "stylize", label: "Stylize" },
	{ id: "distort", label: "Distort & glitch" },
	{ id: "finish", label: "Finish" },
] as const;
export type Category = (typeof CATEGORIES)[number]["id"];

export interface LayerDef {
	type: string;
	kind: "source" | "effect";
	category: Category;
	label: string;
	icon: string;
	description: string;
	groups: ParamGroup[];
	/** GLSL defining `vec4 run()` that returns straight (non-premultiplied) RGBA. */
	frag: string;
	/** Param keys (0..1 normalised) that canvas drags move. */
	position?: [string, string];
	texture?: (params: Params, ctx: TextureContext) => TextureRequest | null;
	/** Preprocessor flags for this layer's settings; each distinct set compiles its own shader variant,
	 *  so per-layer choices (like exact vs baked logo) cost nothing per pixel. */
	defines?: (params: Params) => string[];
	/** Wide-radius readers (blur): the input gets mipmaps so far taps can read pre-averaged levels. */
	mipInput?: boolean;
	/** Named starting points, listed separately in the add menu (e.g. Title / Body / Mono text). */
	variants?: { label: string; description: string; params: Params }[];
	/** Lets one param change bring others along (picking a font applies that font's type spec). */
	onParamChange?: (key: string, value: ParamValue, params: Params) => Params;
	/** Make params self-consistent when a layer is created or loaded (e.g. derive a preset choice from colours). */
	normalize?: (params: Params) => Params;
	/**
	 * Effects only: may reach past the layer's edge when applied to a single layer (blur, glow, warps).
	 * Others are kept to the layer's own pixels there, so they never paint on the canvas around it.
	 */
	spills?: boolean;
	/** Backgrounds only: true when these settings paint every pixel, so the layer hides whatever is under it. */
	covers?: (params: Params) => boolean;
	/** Backgrounds only: the settings that make it see-through, for the "covers layers below" fix. */
	seeThrough?: Params;
}

/**
 * What a layer is, as people think about it. Backgrounds fill the canvas (or a frame), brand pieces and
 * content are objects you place, and a Look restyles everything below it (or below its frame). The stack stays free: this
 * only labels layers and decides where new ones go.
 */
export type LayerKind = "background" | "brand" | "content" | "look";

export const KIND_LABELS: Record<LayerKind, string> = { background: "Background", brand: "Brand", content: "Content", look: "Look" };

export function kindOf(def: LayerDef): LayerKind {
	if (def.kind === "effect") return "look";
	if (def.category === "brand") return "brand";
	if (def.category === "content") return "content";
	return "background";
}

export const BLEND_MODES = [
	"Normal",
	"Multiply",
	"Screen",
	"Overlay",
	"Add",
	"Difference",
	"Soft light",
	"Color dodge",
	"Lighten",
	"Darken",
] as const;

export interface Appearance {
	/** Recolour the layer with a gradient across its frame (or the canvas when it has none). */
	gradient?: { type: "linear" | "radial"; a: ColorValue; b: ColorValue; angle: number };
	/** Drop shadow from the layer's own shape. Offsets and blur in composition px. */
	shadow?: { x: number; y: number; blur: number; color: ColorValue; opacity: number };
}

export interface Layer {
	id: string;
	type: string;
	name: string;
	visible: boolean;
	opacity: number;
	blend: number;
	seed: number;
	params: Params;
	/** Palette override: this layer's colours resolve against it instead of the project palette. */
	palette?: Palette;
	paletteId?: string;
	locked?: boolean;
	/** Layer styles applied when compositing, so they work on any source: a gradient fill and a drop shadow. */
	appearance?: Appearance;
	/** The "covers layers below" warning was dismissed for this layer: the overlap is on purpose. */
	coverOk?: boolean;
	/** Effects on this layer only, top first: they restyle the layer itself, never what's below it. */
	effects?: LayerEffect[];
}

/** An effect attached to one layer (a Look that applies to that layer alone). */
export interface LayerEffect {
	id: string;
	type: string;
	visible: boolean;
	params: Params;
}

export function allParams(def: LayerDef): ParamDef[] {
	return def.groups.flatMap((g) => g.params);
}
