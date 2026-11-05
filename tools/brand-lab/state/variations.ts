import { luma } from "../brand/palette";
import { getDef } from "../layers/registry";
import { allParams, type Layer } from "../layers/types";
import type { Doc } from "./doc";
import { generateDoc, generatePoster, PAIRINGS, pick, type Rng, shuffleParams } from "./shuffle";
import { applyStyle, newSubject, STYLES } from "./styles";

export type VariationMode = "everything" | "pattern" | "poster" | "colors" | "settings" | "arrangement" | "styles" | "subject";

export const VARIATION_MODES: { value: VariationMode; label: string; hint: string; key?: string }[] = [
	{ value: "everything", label: "Everything", hint: "New illustration, style, colours and motion at once. Your text and images stay" },
	{ value: "styles", label: "Styles", hint: "The same subject in different visual styles" },
	{ value: "subject", label: "Illustration", hint: "New illustrations from brand blocks, in the current style" },
	{ value: "colors", label: "Colours", hint: "Same design, new colour roles", key: "C" },
	{ value: "settings", label: "Settings", hint: "Same layers and colours, new sizes, styles and motion" },
	{ value: "arrangement", label: "Arrangement", hint: "Same settings, new random seeds" },
	{ value: "pattern", label: "Pattern", hint: "A whole new pattern" },
	{ value: "poster", label: "Poster", hint: "A whole new poster with type" },
];

export function vary(doc: Doc, mode: VariationMode, rng: Rng): Doc {
	// Every kind of shuffle in one go, in the order a designer would: what's drawn, how it's drawn,
	// its colours, then fresh seeds. Content (text, images, shapes) and the canvas stay as they are.
	if (mode === "everything") {
		let next = newSubject(doc, rng);
		next = applyStyle(next, pick(rng, STYLES), rng);
		next = shuffleColors(next, rng);
		return { ...next, layers: next.layers.map((l) => ({ ...l, seed: Math.round(rng() * 10000) / 10 })) };
	}
	if (mode === "pattern") return { ...generateDoc(doc, rng), name: doc.name };
	if (mode === "poster") return generatePoster(doc, rng);
	if (mode === "colors") return shuffleColors(doc, rng);
	if (mode === "styles") return applyStyle(doc, pick(rng, STYLES), rng);
	if (mode === "subject") return newSubject(doc, rng);
	if (mode === "settings") return { ...doc, layers: doc.layers.map((l) => varySettings(l, rng)) };
	return { ...doc, layers: doc.layers.map((l) => ({ ...l, seed: Math.round(rng() * 10000) / 10 })) };
}

// Content and single placed objects (a logo, a supergraphic mark) are the composition: keep them.
const FIXED_TYPES = new Set(["text", "shape", "image"]);
const ALWAYS_KEEP = ["layout", "x", "y"];
const SINGLE_KEEP = ["size", "rotation"];

/** New styles, densities and motion for a layer, without changing what it is or where it sits. */
function varySettings(layer: Layer, rng: Rng): Layer {
	if (FIXED_TYPES.has(layer.type)) return layer;
	const single = (layer.type === "mark" || layer.type === "parts") && layer.params.layout === 0;
	if (layer.type === "mark" && single) return layer;
	const next = shuffleParams(layer, rng);
	const keep = single ? [...ALWAYS_KEEP, ...SINGLE_KEEP] : ALWAYS_KEEP;
	for (const k of keep) if (k in layer.params) next.params[k] = layer.params[k];
	return { ...next, seed: layer.seed };
}

/** k distinct items from a sorted list, still in order. */
function subset<T>(items: T[], k: number, rng: Rng): T[] {
	const idx = items.map((_, i) => i);
	for (let i = idx.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[idx[i], idx[j]] = [idx[j], idx[i]];
	}
	return idx
		.slice(0, k)
		.sort((a, b) => a - b)
		.map((i) => items[i]);
}

/**
 * Re-colours a design without touching anything else. Every palette colour in use is remapped by
 * lightness rank onto a brand pairing (or the full palette when more than four are in use), kept in
 * order or flipped as a whole, so text, panels and patterns keep their contrast against each other.
 */
export function shuffleColors(doc: Doc, rng: Rng): Doc {
	const pal = doc.scene.palette;
	const hexOf = new Map(pal.map((c) => [c.key, c.hex]));
	const lum = (k: string) => luma(hexOf.get(k) ?? "#808080");
	const isKey = (v: unknown): v is string => typeof v === "string" && v.startsWith("$") && hexOf.has(v.slice(1));
	const used = new Set<string>();
	const visit = (v: unknown) => isKey(v) && used.add(v.slice(1));
	visit(doc.scene.background);
	for (const l of doc.layers) for (const p of allParams(getDef(l.type)!)) if (p.type === "color") visit(l.params[p.key]);
	if (!used.size) return doc;

	const from = [...used].sort((a, b) => lum(a) - lum(b));
	const range = (keys: string[]) => lum(keys[keys.length - 1]) - lum(keys[0]);
	// Keep at least as much light/dark separation as the original (capped), so type stays readable.
	const minRange = Math.min(range(from), 0.45);
	const sorted = pal.map((c) => c.key).sort((a, b) => lum(a) - lum(b));
	if (sorted.length < from.length) return doc;
	let to: string[] = from;
	for (let tries = 0; tries < 30; tries++) {
		// Sometimes a curated brand pairing (when the palette has those roles), otherwise any ordered pick.
		const pairing = [...new Set(Object.values(pick(rng, PAIRINGS)).map((v) => v.slice(1)))].filter((k) => hexOf.has(k)).sort((a, b) => lum(a) - lum(b));
		const pool = from.length <= pairing.length && rng() < 0.4 ? pairing : sorted;
		const cand = subset(pool, from.length, rng);
		if (rng() < 0.5) cand.reverse();
		const same = cand.every((k, i) => k === from[i]);
		if (!same && (from.length < 2 || range([...cand].sort((a, b) => lum(a) - lum(b))) >= minRange)) {
			to = cand;
			break;
		}
	}
	return remapColorRefs(doc, new Map(from.map((k, i) => [`$${k}`, `$${to[i]}`])));
}

/** Replaces palette references (`$a` → `$b`) in the background and every colour param. */
export function remapColorRefs(doc: Doc, map: Map<string, string>): Doc {
	if (!map.size) return doc;
	const swap = <T,>(v: T): T => (typeof v === "string" && map.has(v) ? (map.get(v) as T) : v);
	return {
		...doc,
		scene: { ...doc.scene, background: swap(doc.scene.background) },
		layers: doc.layers.map((l) => {
			const def = getDef(l.type)!;
			const params = { ...l.params };
			for (const p of allParams(def)) if (p.type === "color") params[p.key] = swap(params[p.key]);
			return { ...l, params };
		}),
	};
}
