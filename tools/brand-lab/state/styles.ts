import { createLayer, getDef } from "../layers/registry";
import type { Layer, Params } from "../layers/types";
import type { Doc } from "./doc";
import { type Rng, shuffleParams } from "./shuffle";

// Visual styles: treatments that re-render whatever the design's subject is (a mark, a form, a
// pattern, a photo). Applying one keeps the type and the small logo on top, swaps every effect
// below them for the style's stack, and leaves the subject itself untouched.

const fx = (type: string, params: Params): Layer => createLayer(type, { params });
/** A little variety per pick, so the same style twice isn't the same picture. */
const jitter = (rng: Rng, v: number, amount = 0.2) => Number((v * (1 + (rng() * 2 - 1) * amount)).toFixed(3));

export interface Style {
	id: string;
	name: string;
	hint: string;
	/** Scene background as a palette key, when the style wants one. */
	bg?: string;
	/** Effect layers, top of the stack first. */
	stack: (rng: Rng) => Layer[];
}

export const STYLES: Style[] = [
	{
		id: "glyph-bloom",
		name: "Glyph bloom",
		hint: "Soft focus with characters lit by the image",
		stack: (r) => [
			fx("binary", { mode: 3, chars: " .:/+*=2e", tint: 0, bg: false, under: true, dim: 0.05, cell: jitter(r, 24), contrast: 1.3, glow: 0.35, flicker: 0 }),
			fx("blur", { radius: jitter(r, 36) }),
		],
	},
	{
		id: "soft-code",
		name: "Soft code",
		hint: "A deep blur with scattered code fragments",
		stack: (r) => [
			fx("bloom", { threshold: 0.55, radius: 50, intensity: 0.5 }),
			fx("binary", { mode: 5, scatter: jitter(r, 0.16, 0.4), threshold: 0.2, tint: 1, ink: "$paper", bg: false, under: true, dim: 0, cell: jitter(r, 22), flicker: 6, contrast: 1.2 }),
			fx("blur", { radius: jitter(r, 140), lift: 1.25 }),
		],
	},
	{
		id: "pixel-checker",
		name: "Pixel checker",
		hint: "Gapped pixels, mid-tones as checkerboards",
		bg: "$plum",
		stack: (r) => [fx("matrix", { mode: 2, cell: jitter(r, 18), gap: 0.18, round: 0.08, bayer: r() < 0.7 ? 0 : 1, tint: 0, ink: "$light", under: 1, bgColor: "$plum", contrast: 1.4, threshold: 0.1 })],
	},
	{
		id: "led",
		name: "LED",
		hint: "Lit pills that join into dashes along each row",
		stack: (r) => [
			fx("matrix", { mode: 1, cell: jitter(r, 16), gap: 0.3, round: 1, tint: 0, ink: "$paper", under: 2, dim: 0.15, threshold: jitter(r, 0.3, 0.15), contrast: 1.4, join: 0.3 }),
			fx("blur", { radius: 70, lift: 1.2 }),
		],
	},
	{
		id: "terminal-bars",
		name: "Terminal bars",
		hint: "Tone as . - = and solid bars",
		bg: "$ink",
		stack: (r) => [fx("matrix", { mode: 3, cell: jitter(r, 18), tint: 2, ink: "$light", ink2: "$magenta", under: 1, bgColor: "$ink", contrast: 1.6, bias: 0.12, threshold: 0.1 })],
	},
	{
		id: "line-screen",
		name: "Line screen",
		hint: "Glowing vertical lines that follow the light",
		bg: "$ink",
		stack: (r) => [
			fx("bloom", { threshold: 0.35, radius: 60, intensity: 0.8 }),
			fx("matrix", { mode: 4, cell: jitter(r, 14), gap: 0.6, tint: 2, ink: "$light", ink2: "$magenta", under: 1, bgColor: "$ink", widthByTone: false, threshold: 0.05, contrast: 1.6, bias: 0.15 }),
			fx("blur", { radius: 30 }),
		],
	},
	{
		id: "digits",
		name: "Digits",
		hint: "Numbers on black, glowing",
		bg: "$ink",
		stack: (r) => [
			fx("bloom", { threshold: 0.3, radius: 50, intensity: 0.9 }),
			fx("binary", { mode: 4, tint: 2, ink: "$light", ink2: "$magenta", bg: true, bgColor: "$ink", cell: jitter(r, 20), threshold: 0.18, flicker: 8, glow: 0.2 }),
		],
	},
	{
		id: "flow-glyphs",
		name: "Flow glyphs",
		hint: "A character grid bent along a current",
		bg: "$ink",
		stack: (r) => [fx("binary", { mode: 1, warp: jitter(r, 0.45, 0.3), tint: 0, bg: true, bgColor: "$ink", cell: jitter(r, 14), glow: 0.4, contrast: 1.4 })],
	},
	{
		id: "haze",
		name: "Haze",
		hint: "Out of focus, glassy, grained",
		stack: (r) => [fx("grain", { amount: 0.05 }), fx("bloom", { threshold: 0.4, radius: 80, intensity: 0.6 }), fx("blur", { radius: jitter(r, 90), lift: 1.35 })],
	},
	{
		id: "mark-halftone",
		name: "Mark halftone",
		hint: "Tiny logos as the print dot",
		bg: "$plum",
		stack: (r) => [fx("halftone", { shape: 3, cell: jitter(r, 28), mode: 0, ink: "$pink", paper: "$plum", angle: 0, invert: true })],
	},
	{
		id: "dither",
		name: "Dither",
		hint: "Ordered dithering into brand tones",
		stack: (r) => [fx("dither", { pixel: jitter(r, 5), matrix: 0, tones: 1 })],
	},
	{
		id: "reeded",
		name: "Reeded glass",
		hint: "Seen through fluted glass",
		stack: (r) => [fx("glass", { width: jitter(r, 50), strength: 0.6 })],
	},
];

// Layers that are the composition rather than the subject: type, drafting, panels and a small logo.
function isOverlay(l: Layer, doc: Doc) {
	if (l.type === "text" || l.type === "construct" || l.type === "shape") return true;
	if (l.type === "mark" && l.params.layout === 0) return (l.params.size as number) < 0.3 * Math.min(doc.scene.width, doc.scene.height);
	return false;
}

/** The design with one style applied. */
export function applyStyle(doc: Doc, style: Style, rng: Rng): Doc {
	const visible = doc.layers.filter((l) => getDef(l.type));
	const overlays = visible.filter((l) => isOverlay(l, doc));
	let subject = visible.filter((l) => !isOverlay(l, doc) && getDef(l.type)!.kind === "source");
	if (!subject.length) subject = [createLayer("forms", { params: { size: Math.min(doc.scene.width, doc.scene.height) * 0.8 } })];
	return {
		...doc,
		scene: style.bg ? { ...doc.scene, background: style.bg } : doc.scene,
		layers: [...overlays, ...style.stack(rng), ...subject],
	};
}

/** n different styles in random order. */
export function styleSet(doc: Doc, n: number, rng: Rng): { style: Style; doc: Doc }[] {
	const order = STYLES.map((s) => s);
	for (let i = order.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[order[i], order[j]] = [order[j], order[i]];
	}
	return order.slice(0, n).map((style) => ({ style, doc: applyStyle(doc, style, rng) }));
}

/**
 * A new illustration in the same treatment: the subject is swapped for a fresh Form (or a Radial
 * field) made of brand blocks, while the type, logo and effects stay.
 */
export function newSubject(doc: Doc, rng: Rng): Doc {
	const { width: W, height: H } = doc.scene;
	const side = Math.min(W, H);
	let layer: Layer;
	const roll = rng();
	if (roll < 0.3) {
		// A brand motif (play button, cloud, cursor…) cut by the mark's breaks.
		layer = shuffleParams(createLayer("motif"), rng);
		layer.params = { ...layer.params, size: Math.round(side * (0.5 + rng() * 0.25)), x: 0.5, y: 0.5, rotation: 0, explode: 0, colorA: "$light", colorB: "$pink", colorC: "$magenta" };
	} else if (roll < 0.75) {
		layer = shuffleParams(createLayer("forms"), rng);
		layer.params = { ...layer.params, size: Math.round(side * (0.6 + rng() * 0.35)), x: 0.5, y: 0.5, rotation: 0, colorA: "$light", colorB: "$pink", colorC: "$magenta" };
	} else {
		layer = shuffleParams(createLayer("radial"), rng);
		layer.params = { ...layer.params, cx: 0.5, cy: 0.5, colorA: "$light", colorB: "$plum" };
	}
	const subject = (l: Layer) => !isOverlay(l, doc) && getDef(l.type)?.kind === "source";
	return { ...doc, layers: [...doc.layers.filter((l) => !subject(l)), layer] };
}
