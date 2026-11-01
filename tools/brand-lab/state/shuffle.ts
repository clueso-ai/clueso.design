import { createLayer, getDef } from "../layers/registry";
import { allParams, type Layer, type ParamValue, type Params } from "../layers/types";
import type { Doc } from "./doc";
import { POSTER_PRESETS } from "./presets";

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export const pick = <T>(rng: Rng, items: readonly T[]): T => items[Math.floor(rng() * items.length)];

/** Randomise every param flagged `shuffle`, plus the layer seed. Colours are left alone. */
export function shuffleParams(layer: Layer, rng: Rng): Layer {
	const def = getDef(layer.type);
	if (!def) return layer;
	const params: Params = { ...layer.params };
	for (const p of allParams(def)) {
		if (!p.shuffle) continue;
		if (p.type === "float" || p.type === "int") {
			const [lo, hi] = Array.isArray(p.shuffle) ? p.shuffle : [p.min, p.max];
			let v = lo + rng() * (hi - lo);
			if (p.type === "int") v = Math.round(v);
			else if (p.type === "float" && p.step) v = Math.round(v / p.step) * p.step;
			params[p.key] = Number(v.toFixed(4));
		} else if (p.type === "select") {
			const [lo, hi] = Array.isArray(p.shuffle) ? p.shuffle : [-Infinity, Infinity];
			params[p.key] = pick(rng, p.options.filter((o) => o.value >= lo && o.value <= hi)).value;
		}
		else if (p.type === "bool") params[p.key] = rng() < 0.5;
	}
	return { ...layer, seed: Math.round(rng() * 10000) / 10, params };
}

// Colour roles: every generated layer pulls from one pairing so results stay on-brand.
export interface Pairing {
	bg: string;
	a: string;
	b: string;
	c: string;
}

export const PAIRINGS: Pairing[] = [
	{ bg: "$plum", a: "$pink", b: "$light", c: "$magenta" },
	{ bg: "$plum", a: "$magenta", b: "$light", c: "$pink" },
	{ bg: "$ink", a: "$magenta", b: "$light", c: "$pink" },
	{ bg: "$pink", a: "$paper", b: "$blush", c: "$plum" },
	{ bg: "$paper", a: "$magenta", b: "$pink", c: "$light" },
	{ bg: "$blush", a: "$magenta", b: "$pink", c: "$plum" },
	{ bg: "$magenta", a: "$light", b: "$paper", c: "$plum" },
];

function applyPairing(layer: Layer, c: Pairing): Layer {
	const map: Record<string, string> = {
		colorA: c.a,
		colorB: c.b,
		colorC: c.c,
		color: c.a,
		ink: c.a,
		paper: c.bg,
		c0: c.bg,
		c1: c.c,
		c2: c.a,
		c3: c.b,
		tint: c.b,
	};
	const params: Params = { ...layer.params };
	for (const key of Object.keys(params)) if (map[key] && typeof params[key] === "string" && String(params[key]).startsWith("$")) params[key] = map[key];
	return { ...layer, params };
}

interface Spec {
	type: string;
	params?: Record<string, ParamValue | undefined>;
	blend?: number;
	opacity?: number;
}
type Recipe = (rng: Rng, c: Pairing) => Spec[];

const generator = (rng: Rng): Spec =>
	pick(rng, [
		{ type: "parts", params: { layout: pick(rng, [1, 2]) } },
		{ type: "parts", params: { layout: 0, size: 760, explode: 0 } },
		{ type: "parts", params: { layout: 3, motion: 4, size: 640, step: 0, scaleStep: 0.8, style: 1, stroke: 3, fill: 3 } },
		{ type: "modules" },
		{ type: "pieces", params: { layout: 2 } },
		{ type: "modules", params: { tiles: true, gap: 0 } },
		{ type: "puzzle" },
		{ type: "puzzle" },
		{ type: "slashes" },
		{ type: "slashes" },
		{ type: "triangles" },
		{ type: "chevron" },
		{ type: "mark" },
	]);
/** Solid-fill generators: the ones effects (glass, slice, overlays) read well on. */
const boldGenerator = (rng: Rng): Spec =>
	pick(rng, [
		{ type: "puzzle", params: { style: 0 } },
		{ type: "parts", params: { layout: pick(rng, [0, 1, 2]), style: 0, size: 260 } },
		{ type: "modules", params: { style: 0 } },
		{ type: "slashes", params: { style: 0 } },
		{ type: "chevron" },
		{ type: "triangles", params: { style: 0 } },
	]);
/** Full-range luminance source for halftone/dither, independent of the pairing. */
const lumaGradient = (rng: Rng): Spec => ({
	type: "gradient",
	params: { mode: pick(rng, [0, 3, 3]), bands: 0, cycles: 1, colorA: "$ink", colorB: "$pink", colorC: "$paper" },
});

// Top of stack first. Params given here survive the shuffle. Pure generators carry the most weight:
// they are the brand system; effects are seasoning.
const RECIPES: { weight: number; build: Recipe; dark?: boolean }[] = [
	{ weight: 6, build: (rng) => [generator(rng)] },
	{ weight: 2, build: (rng) => [{ type: "grain", params: { amount: 0.03 + rng() * 0.05 } }, generator(rng)] },
	{
		weight: 2,
		build: (rng) => [{ type: "halftone", params: { shape: pick(rng, [0, 3, 3, 4]), mode: 0, contrast: 1.3 } }, lumaGradient(rng)],
	},
	{
		weight: 1.5,
		build: (rng, c) => [
			{ type: "grain", params: { amount: 0.05 } },
			{ type: "dither", params: { tones: 2, contrast: 1.15, bias: 0, pixel: 4 + Math.round(rng() * 3) } },
			{ type: "gradient", params: { mode: 3, bands: 0, cycles: 1, colorA: c.bg, colorB: c.c, colorC: c.b } },
		],
	},
	{
		weight: 1.5,
		dark: true,
		build: (rng, c) => [
			{ type: "bloom", params: { threshold: 0.6, intensity: 0.6 } },
			{ type: "mark", params: { layout: 0, style: pick(rng, [0, 2]), stroke: 6, size: 400, x: 0.5, y: 0.5, motion: pick(rng, [0, 2]) } },
			{ type: "gradient", params: { mode: 1, scale: 1.3, colorA: c.c, colorB: c.bg, colorC: c.bg, bands: 0, cycles: 0 }, opacity: 0.7 },
		],
	},
	{ weight: 1, build: (rng) => [{ type: "glass", params: { strength: 0.2 + rng() * 0.3 } }, boldGenerator(rng)] },
	{
		weight: 1,
		build: (rng, c) => [
			{ type: "gradient", blend: pick(rng, [3, 6]), opacity: 0.7, params: { mode: pick(rng, [0, 3]), bands: 0, colorA: c.b, colorB: c.a, colorC: c.c } },
			boldGenerator(rng),
		],
	},
	{ weight: 0.75, build: (rng) => [{ type: "slice" }, boldGenerator(rng)] },
	{ weight: 1.5, build: (rng, c) => [{ type: "grain", params: { amount: 0.05 } }, flowSpec(rng, c)] },
	{ weight: 1.25, build: (rng) => [{ type: "glitch" }, boldGenerator(rng)] },
	{
		weight: 1,
		dark: true,
		build: (rng, c) => [{ type: "binary", params: { bg: true, bgColor: c.bg, tint: 2, ink: c.b, ink2: c.c } }, flowSpec(rng, c)],
	},
	{
		weight: 1,
		build: (rng, c) => [
			{ type: "dither", params: { matrix: pick(rng, [0, 4, 6]), tones: pick(rng, [0, 1]), pixel: 3 + Math.round(rng() * 3), screen: 6 } },
			flowSpec(rng, c),
		],
	},
];

function flowSpec(rng: Rng, c: Pairing): Spec {
	return {
		type: "flow",
		params: { mode: pick(rng, [0, 0, 1, 2, 3]), contours: pick(rng, [0, 0, 1]), colorA: c.bg, colorB: c.c, colorC: c.a, colorD: c.b, lineColor: c.b },
	};
}

function buildLayers(specs: Spec[], pairing: Pairing, rng: Rng): Layer[] {
	return specs.map((spec) => {
		let l = createLayer(spec.type, { blend: spec.blend ?? 0, opacity: spec.opacity ?? 1 });
		l = shuffleParams(applyPairing(l, pairing), rng);
		const fixed = Object.entries(spec.params ?? {}).filter((e): e is [string, ParamValue] => e[1] !== undefined);
		return { ...l, params: { ...l.params, ...Object.fromEntries(fixed) } };
	});
}


export function generateDoc(base: Doc, rng: Rng): Doc {
	const total = RECIPES.reduce((s, r) => s + r.weight, 0);
	let roll = rng() * total;
	const recipe = RECIPES.find((r) => (roll -= r.weight) < 0) ?? RECIPES[0];
	const pairing = pick(rng, recipe.dark ? PAIRINGS.filter((p) => p.bg === "$plum" || p.bg === "$ink") : PAIRINGS);
	const layers = buildLayers(recipe.build(rng, pairing), pairing, rng);

	return {
		...base,
		// The palette stays whatever the scene uses: shuffles recolour within it.
		scene: { ...base.scene, background: pairing.bg, transparent: false },
		layers,
	};
}

// ── Posters ──────────────────────────────────────────────────────────────────────────────────
// A poster is a pattern plus typography: a Nohemi headline, a Geist Mono caption and the logo,
// laid out so the type always has room (a quiet corner, a solid panel, or highlight boxes).

const HEADLINES = [
	"Every piece fits",
	"Make it click",
	"Show, don't tell",
	"Pattern language",
	"Built to explain",
	"Fits together",
	"Explain anything",
	"Signal over noise",
	"Made to fit",
	"Clueso",
];


/**
 * A new poster, built from the curated poster layouts (one subject, one headline, generous space)
 * rather than assembled freely, so every option is composed. The canvas keeps its size, name and
 * palette; the subject gets a new seed and often new settings, sometimes a new headline and colours.
 */
export function generatePoster(base: Doc, rng: Rng): Doc {
	const preset = pick(rng, POSTER_PRESETS);
	const doc = preset.build();
	const keep = new Set(["x", "y", "cx", "cy", "size", "scale", "rotation", "layout", "w", "h"]);
	const layers = doc.layers.map((l) => {
		// Swap the headline sometimes (never a statistic like "85%").
		if (l.name === "Headline" && rng() < 0.5 && /[a-z]/i.test(String(l.params.text)) && !String(l.params.text).includes("\n")) {
			return { ...l, params: { ...l.params, text: pick(rng, HEADLINES) } };
		}
		const subject = ["forms", "radial", "parts", "flow", "mark"].includes(l.type) && l.name !== "Logo";
		if (!subject) return l;
		if (rng() < 0.6) {
			const next = shuffleParams(l, rng);
			for (const k of Object.keys(l.params)) if (keep.has(k) || allParams(getDef(l.type)!).some((p) => p.key === k && p.type === "color")) next.params[k] = l.params[k];
			return next;
		}
		return { ...l, seed: Math.round(rng() * 10000) / 10 };
	});
	const scene = { ...doc.scene, width: base.scene.width, height: base.scene.height, palette: base.scene.palette, paletteId: base.scene.paletteId };
	// Layouts are drawn for 1500×2000; scale every px-sized setting (type, art, cells, blur) to fit
	// the canvas. Positions are fractions, so they carry over as they are.
	const k = Math.min(base.scene.width / doc.scene.width, base.scene.height / doc.scene.height);
	const scaled = layers.map((l) => {
		const def = getDef(l.type);
		if (!def || Math.abs(k - 1) < 0.01) return l;
		const params = { ...l.params };
		for (const p of allParams(def)) if (p.type === "float" && p.unit === "px" && typeof params[p.key] === "number") params[p.key] = Math.round((params[p.key] as number) * k * 10) / 10;
		return { ...l, params };
	});
	return { ...base, scene, layers: scaled };
}
