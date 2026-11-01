import { EFFECTS } from "./effects";
import { chevron } from "./sources/chevron";
import { construct } from "./sources/construct";
import { forms } from "./sources/forms";
import { radial } from "./sources/radial";
import { gradient } from "./sources/gradient";
import { image } from "./sources/image";
import { flow } from "./sources/flow";
import { mark } from "./sources/mark";
import { modules } from "./sources/modules";
import { motifs } from "./sources/motifs";
import { parts } from "./sources/parts";
import { pieces } from "./sources/pieces";
import { puzzle } from "./sources/puzzle";
import { shape } from "./sources/shape";
import { slashes } from "./sources/slashes";
import { text } from "./sources/text";
import { triangles } from "./sources/triangles";
import { allParams, type Layer, type LayerDef, type Params } from "./types";

export const SOURCES: LayerDef[] = [mark, parts, pieces, motifs, forms, modules, puzzle, slashes, triangles, chevron, radial, flow, gradient, text, construct, shape, image];
export { EFFECTS };

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
