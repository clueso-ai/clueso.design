// The footer mark's fill: a live Brand Lab design with motion. Digital rain, rotating rays, a
// spiral and rings flowing outward, a blurred aurora, glyphs over a swirl, each finished with
// bloom. Hovering the mark moves to the next one; the current one re-rolls its settings every few
// seconds. Colours follow the site theme.

import { createLayer } from "@/tools/brand-lab/layers/registry";
import { type Doc, defaultScene } from "@/tools/brand-lab/state/doc";
import { pick, type Rng } from "@/tools/brand-lab/state/shuffle";

export const MARK_EFFECTS = ["Rain", "Rays", "Spiral", "Rings", "Aurora", "Glyph swirl"] as const;

/** Brand colours per theme: a deep ground with light ink on dark pages, the reverse on light ones. */
interface Look {
	ground: string;
	inks: [string, string][];
	light: [string, string, string];
}
const LOOKS: Record<"dark" | "light", Look> = {
	dark: { ground: "$plum", inks: [["$light", "$magenta"], ["$paper", "$pink"], ["$blush", "$magenta"]], light: ["$paper", "$pink", "$plum"] },
	// Light mode: a saturated brand-pink mark with pale inks, so it stays bold on a light page.
	light: { ground: "$magenta", inks: [["$paper", "$blush"], ["$blush", "$light"], ["$light", "$paper"]], light: ["$pink", "$magenta", "$plum"] },
};

export function markFillDoc(rng: Rng, effect: number, dark: boolean): Doc {
	const look = dark ? LOOKS.dark : LOOKS.light;
	const [ink, ink2] = pick(rng, look.inks);
	const name = MARK_EFFECTS[effect % MARK_EFFECTS.length];
	const r = (min: number, max: number) => min + rng() * (max - min);
	// A light that drifts across the mark: the source for most effects below.
	const light = () =>
		createLayer("gradient", {
			name: "Light",
			params: { mode: 1, cx: r(0.2, 0.8), cy: r(0.2, 0.8), scale: r(0.7, 1.4), colorA: look.light[0], colorB: look.light[1], colorC: look.light[2] },
		});
	const radial = (mode: number, motion: number) =>
		createLayer("radial", {
			name: "Radial",
			params: { mode, motion, cycles: 1, count: Math.round(r(6, 14)), twist: r(-2.5, 2.5), profile: 0, soft: r(0.2, 0.5), scale: r(0.8, 1.3), fade: r(0.1, 0.4), cx: r(0.3, 0.7), cy: r(0.3, 0.7), fill: 0, colorA: ink, colorB: look.ground },
		});
	const bloom = (intensity: number) => createLayer("bloom", { name: "Bloom", params: { threshold: r(0.35, 0.55), radius: r(30, 90), intensity, tint: ink } });
	const glyphs = (rain: boolean) =>
		createLayer("binary", {
			name: rain ? "Digital rain" : "Glyphs",
			params: { mode: pick(rng, [0, 4, 5]), cell: Math.round(r(9, 14)), tint: 2, ink, ink2, bg: true, bgColor: look.ground, glow: r(0.3, 0.6), scatter: 1, rain, trail: r(0.35, 0.65), rest: r(0.15, 0.35), cycles: 1 },
		});

	// Layers run top first: each effect works on everything below it.
	const layers = {
		Rain: () => [bloom(0.7), glyphs(true), light()],
		Rays: () => [bloom(1.1), radial(0, 1)],
		Spiral: () => [bloom(0.9), createLayer("blur", { name: "Blur", params: { mode: 0, radius: r(4, 10) } }), radial(3, 2)],
		Rings: () => [bloom(0.9), createLayer("matrix", { name: "LED", params: { mode: 1, tint: 2, ink, ink2, under: 1, bgColor: look.ground, cell: Math.round(r(9, 13)) } }), radial(2, 2)],
		Aurora: () => [bloom(1.4), createLayer("blur", { name: "Blur", params: { mode: 0, radius: r(24, 48) } }), radial(1, 1)],
		"Glyph swirl": () => [bloom(0.8), glyphs(false), radial(1, 1)],
	}[name]();

	return {
		version: 1,
		name: "Footer mark",
		scene: { ...defaultScene(), width: 560, height: 560, background: look.ground, duration: 6 },
		layers,
	};
}
