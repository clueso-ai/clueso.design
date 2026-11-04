import { EFFECTS as EFFECT_DEFS } from "./effects";
import { chevron } from "./sources/chevron";
import { construct } from "./sources/construct";
import { contours } from "./sources/contours";
import { forms } from "./sources/forms";
import { radial } from "./sources/radial";
import { gradient } from "./sources/gradient";
import { image } from "./sources/image";
import { flow } from "./sources/flow";
import { mark } from "./sources/mark";
import { melt } from "./sources/melt";
import { modules } from "./sources/modules";
import { motifs } from "./sources/motifs";
import { parts } from "./sources/parts";
import { paths } from "./sources/paths";
import { pieces } from "./sources/pieces";
import { puzzle } from "./sources/puzzle";
import { shape } from "./sources/shape";
import { slashes } from "./sources/slashes";
import { svg } from "./sources/svg";
import { text } from "./sources/text";
import { triangles } from "./sources/triangles";
import { bool, float } from "./params";
import { allParams, kindOf, type Layer, type LayerDef, type Params } from "./types";

/**
 * Backgrounds fill the canvas by default and Looks restyle all of it. Turn Fill canvas (or Whole canvas)
 * off and the layer works inside a box you can move, resize, rotate and round like a shape. A framed
 * background's shader sees the box as its whole canvas; a framed Look runs as usual and only shows
 * inside it. Either way the composite clips to the box. The keys match the shape layer's, so canvas
 * handles work unchanged, except a Look's corner radius, since Blur and others have a radius of their own.
 */
function withFrame(def: LayerDef): LayerDef {
	const kind = kindOf(def);
	if (kind !== "background" && kind !== "look") return def;
	const framed = (p: Params) => p.fillCanvas === false;
	return {
		...def,
		groups: [
			...def.groups,
			{
				title: "Frame",
				stackOnly: true,
				params: [
					bool("fillCanvas", kind === "look" ? "Whole canvas" : "Fill canvas", true),
					float("w", "Width", 0.02, 1.5, 0.6, { step: 0.001, showIf: framed }),
					float("h", "Height", 0.02, 1.5, 0.6, { step: 0.001, showIf: framed }),
					float(kind === "look" ? LOOK_RADIUS : "radius", "Corner radius", 0, 400, 0, { unit: "px", showIf: framed }),
					float("rotation", "Rotation", -180, 180, 0, { unit: "°", step: 1, showIf: framed }),
					float("x", "X", 0, 1, 0.5, { step: 0.001, showIf: framed }),
					float("y", "Y", 0, 1, 0.5, { step: 0.001, showIf: framed }),
				],
			},
		],
	};
}

/** A framed Look's corner radius key ("radius" is taken by Blur and others). */
const LOOK_RADIUS = "frameRadius";

export const SOURCES: LayerDef[] = [mark, parts, melt, pieces, motifs, forms, modules, puzzle, slashes, triangles, chevron, contours, paths, radial, flow, gradient, text, construct, shape, image, svg].map(withFrame);
export const EFFECTS: LayerDef[] = EFFECT_DEFS.map(withFrame);

export const REGISTRY: Record<string, LayerDef> = Object.fromEntries([...SOURCES, ...EFFECTS].map((d) => [d.type, d]));

export function getDef(type: string): LayerDef | undefined {
	return REGISTRY[type];
}

export function defaultParams(def: LayerDef): Params {
	return Object.fromEntries(allParams(def).map((p) => [p.key, p.default]));
}

let counter = 0;
export function newId() {
	counter += 1;
	return `${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function createLayer(type: string, overrides: Partial<Omit<Layer, "params">> & { params?: Params } = {}): Layer {
	const def = REGISTRY[type];
	if (!def) throw new Error(`Unknown layer type: ${type}`);
	return {
		id: newId(),
		type,
		name: def.label,
		visible: true,
		opacity: 1,
		blend: 0,
		seed: Math.round(Math.random() * 1000) / 10,
		...overrides,
		params: def.normalize ? def.normalize({ ...defaultParams(def), ...overrides.params }) : { ...defaultParams(def), ...overrides.params },
	};
}

/** A background or Look drawn inside its own box instead of across the whole canvas. */
export function isFramed(layer: Layer) {
	const def = REGISTRY[layer.type];
	if (!def || layer.params.fillCanvas !== false) return false;
	const kind = kindOf(def);
	return kind === "background" || kind === "look";
}

/** The param a framed layer's corner radius lives in. */
export function radiusKey(layer: Layer) {
	const def = REGISTRY[layer.type];
	return def && kindOf(def) === "look" ? LOOK_RADIUS : "radius";
}

/** The param keys a canvas drag moves: a framed background or Look moves its box, not the pattern's centre. */
export function positionKeys(layer: Layer): [string, string] | undefined {
	return isFramed(layer) ? ["x", "y"] : REGISTRY[layer.type]?.position;
}
