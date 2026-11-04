import { createLayer, newId } from "../layers/registry";
import { FILE_PRESETS } from "../presets";
import type { Layer } from "../layers/types";
import { type Doc, defaultScene, type Scene } from "./doc";

export interface Preset {
	id: string;
	name: string;
	group: "Posters" | "Illustrations" | "Patterns";
	build: () => Doc;
}

const doc = (name: string, layers: Layer[], scene: Partial<Scene> = {}): Doc => ({
	version: 1,
	name,
	scene: { ...defaultScene(), ...scene },
	layers,
});

const BASE_PRESETS: Preset[] = [
	{
		id: "puzzle-field",
		group: "Patterns",
		name: "Puzzle field",
		build: () =>
			doc("Puzzle field", [
				createLayer("grain", { params: { amount: 0.05 } }),
				createLayer("puzzle", {
					seed: 4.2,
					params: { size: 190, gap: 12, breaks: 2, fill: 3, motion: 1, amount: 0.3, spread: 0.3 },
				}),
			]),
	},
	{
		id: "slash-poster",
		group: "Patterns",
		name: "Slash poster",
		build: () =>
			doc("Slash poster", [
				createLayer("slashes", { params: { period: 110, duty: 0.5, segment: 300, segDuty: 0.62, stagger: 0.5, shear: 1, colorA: "$pink" } }),
			]),
	},
	{
		id: "line-steps",
		group: "Patterns",
		name: "Line steps",
		build: () =>
			doc("Line steps", [
				createLayer("slashes", {
					params: { style: 1, line: 1.5, period: 90, duty: 0.02, segment: 640, segDuty: 0.82, stagger: 0.35, shear: -1, colorA: "$magenta" },
				}),
			]),
	},
	{
		id: "triangles",
		group: "Patterns",
		name: "Triangles",
		build: () => doc("Triangles", [createLayer("triangles", { params: { size: 170, colorA: "$pink", random: 0.2, flips: 1 } })]),
	},
	{
		id: "chevron-run",
		group: "Patterns",
		name: "Chevron run",
		build: () => doc("Chevron run", [createLayer("chevron", { params: { angle: 0, period: 190, wavelength: 560, amplitude: 260, shade: 0.28 } })]),
	},
	{
		id: "diagonal-grid",
		group: "Patterns",
		name: "Diagonal grid",
		build: () => doc("Diagonal grid", [createLayer("triangles", { params: { style: 2, line: 1.2, size: 180, colorA: "$magenta" } })]),
	},
	{
		id: "mark-halftone",
		group: "Patterns",
		name: "Mark halftone",
		build: () =>
			doc("Mark halftone", [
				createLayer("halftone", { params: { cell: 30, angle: 0, shape: 3, contrast: 1.4, mode: 0, ink: "$light", paper: "$plum", invert: true } }),
				createLayer("gradient", { seed: 12, params: { mode: 3, scale: 0.9, warp: 1.1, colorA: "$plum", colorB: "$magenta", colorC: "$paper", cycles: 1 } }),
			]),
	},
	{
		id: "dither-aurora",
		group: "Patterns",
		name: "Dither aurora",
		build: () =>
			doc(
				"Dither aurora",
				[
					createLayer("grain", { params: { amount: 0.04 } }),
					createLayer("dither", { params: { pixel: 5, tones: 2 } }),
					createLayer("gradient", { seed: 31, params: { mode: 3, colorA: "$plum", colorB: "$magenta", colorC: "$light", warp: 1.2, cycles: 1 } }),
				],
				{ width: 1920, height: 1080 },
			),
	},
	{
		id: "reeded-mark",
		group: "Patterns",
		name: "Reeded mark",
		build: () =>
			doc("Reeded mark", [
				createLayer("bloom", { params: { threshold: 0.5, radius: 70, intensity: 0.7 } }),
				createLayer("glass", { params: { width: 36, angle: 45, strength: 0.28, frost: 1, cycles: 1 } }),
				createLayer("mark", { params: { size: 440, style: 2, stroke: 6, fill: 1 } }),
				createLayer("gradient", { seed: 7, opacity: 0.55, params: { mode: 1, scale: 1.2, colorA: "$magenta", colorB: "$plum", colorC: "$ink" } }),
			]),
	},
	{
		id: "pieces-afloat",
		group: "Patterns",
		name: "Pieces afloat",
		build: () =>
			doc(
				"Pieces afloat",
				[
					createLayer("puzzle", {
						seed: 18,
						params: { size: 220, gap: 22, style: 1, stroke: 2.5, missing: 0.35, breaks: 0, fill: 1, colorA: "$pink", colorB: "$light", motion: 2, amount: 0.8, angle: 45 },
					}),
				],
				{ background: "$ink" },
			),
	},
	{
		id: "pattern-poster",
		group: "Posters",
		name: "Pattern poster",
		build: () =>
			doc(
				"Pattern poster",
				[
					createLayer("text", {
						name: "Title",
						params: { text: "Pattern", font: 0, weight: 300, size: 150, leading: 1.1, x: 0.06, y: 0.07, align: 0, color: "$ink", tracking: -0.02 },
					}),
					createLayer("mark", { name: "Logo", params: { size: 70, x: 0.9, y: 0.07, fill: 0, colorA: "$magenta" } }),
					createLayer("shape", { name: "Footer", params: { shape: 0, x: 0.5, y: 0.07, w: 0.96, h: 0.12, chamfer: 28, color: "$paper" } }),
					createLayer("slashes", { params: { period: 120, duty: 0.5, segment: 320, segDuty: 0.6, stagger: 0.5, shear: 1, colorA: "$pink" } }),
				],
				{ width: 1500, height: 2000 },
			),
	},
];


const POSTER = { width: 1500, height: 2000 };
const title = (text: string, params: Record<string, number | string | boolean> = {}) =>
	createLayer("text", {
		name: "Headline",
		params: { text, font: 0, weight: 300, size: 200, tracking: -0.02, leading: 1.1, align: 0, anchor: 0, width: 0.8, x: 0.06, y: 0.955, color: "$paper", ...params },
	});
const caption = (text: string, params: Record<string, number | string | boolean> = {}) =>
	createLayer("text", {
		name: "Caption",
		params: { text, font: 2, weight: 300, size: 30, tracking: 0, leading: 1.4, upper: true, align: 0, anchor: 2, width: 0.6, x: 0.06, y: 0.045, color: "$paper", ...params },
	});
const logo = (params: Record<string, number | string | boolean> = {}) =>
	createLayer("mark", { name: "Logo", params: { size: 90, x: 0.91, y: 0.06, fill: 1, colorA: "$magenta", colorB: "$light", motion: 0, ...params } });

// ── Posters ─────────────────────────────────────────────────────────────────
// Built from the references Ajinkya collected: one strong subject made of brand blocks, a clear type
// system (Nohemi 300 display, Geist body, Geist Mono labels), generous margins and few colours.
// Layout grid: 6% margins (90px on a 1500×2000 poster).

type P = Record<string, number | string | boolean>;
const label = (text: string, params: P = {}) =>
	createLayer("text", { name: "Label", params: { text, font: 2, weight: 400, size: 22, tracking: 0.04, leading: 1.4, upper: true, align: 0, anchor: 0, width: 0, x: 0.06, y: 0.96, color: "$paper", ...params } });

const CODE_POSTER_PRESETS: Preset[] = [
	{
		// Skale: a soft gradient field, the subject drawn in white LED pills, a wordmark in corner brackets.
		id: "poster-led",
		group: "Posters",
		name: "LED signal",
		build: () =>
			doc(
				"Every piece fits",
				[
					label("Brand Lab", { x: 0.06 }),
					label("2026", { x: 0.54, align: 2, width: 0.4 }),
					title("Every piece fits", { size: 150, align: 1, x: 0.06, width: 0.88, y: 0.16, anchor: 1 }),
					createLayer("construct", { name: "Brackets", params: { mode: 1, size: 1080, aspect: 0.2, x: 0.5, y: 0.16, labels: false, stroke: 1.5, color: "$paper" } }),
					// Screened over black + white LEDs: black takes the gradient, the LEDs stay white.
					createLayer("gradient", { name: "Glow", blend: 2, params: { mode: 1, cx: 0.5, cy: 0.12, scale: 1.7, colorA: "$light", colorB: "$pink", colorC: "$magenta", mid: 0.45 } }),
					createLayer("matrix", { name: "LED", params: { mode: 1, cell: 18, gap: 0.32, round: 1, tint: 0, ink: "$paper", under: 1, bgColor: "#000000", threshold: 0.5, contrast: 1.3, join: 0.35 } }),
					createLayer("parts", { name: "Mark", params: { layout: 0, size: 760, x: 0.5, y: 0.56, fill: 1, colorA: "$paper", motion: 1, amount: 0.4, stagger: 0.4 } }),
				],
				{ ...POSTER, background: "#000000" },
			),
	},
	{
		// Qantev, dark: a big number, a line screen glowing like a rising chart, a small logo lockup.
		id: "poster-line-stat",
		group: "Posters",
		name: "Line screen stat",
		build: () =>
			doc(
				"85% on brand",
				[
					title("85%", { size: 460, x: 0.055, width: 0.9, y: 0.955, tracking: -0.04, leading: 1 }),
					title("of every frame\nstays on brand", { size: 80, x: 0.06, width: 0.8, y: 0.74, color: "$blush" }),
					logo({ size: 54, x: 0.08, y: 0.055, fill: 1, colorA: "$paper" }),
					createLayer("bloom", { params: { threshold: 0.3, radius: 70, intensity: 0.9, tint: "$light" } }),
					createLayer("matrix", { name: "Lines", params: { mode: 4, cell: 15, gap: 0.62, tint: 2, ink: "$light", ink2: "$magenta", under: 1, bgColor: "$ink", widthByTone: false, threshold: 0.04, contrast: 1.5 } }),
					createLayer("blur", { params: { radius: 30 } }),
					createLayer("radial", { name: "Chart", params: { mode: 4, count: 7, twist: -1, soft: 0.6, scale: 1.25, cx: 0.5, cy: -0.05, hole: 0, fade: 0, fill: 0, colorA: "$light", colorB: "$ink", motion: 1 } }),
				],
				{ ...POSTER, background: "$ink" },
			),
	},
	{
		// Qantev, light: a title top-left and a sunrise arc drawn as vertical lines.
		id: "poster-sunrise",
		group: "Posters",
		name: "Sunrise lines",
		build: () =>
			doc(
				"Every frame on brand",
				[
					title("Every frame\non brand", { size: 140, x: 0.06, width: 0.88, y: 0.94, color: "$plum" }),
					logo({ size: 54, x: 0.08, y: 0.055, fill: 1, colorA: "$plum" }),
					createLayer("matrix", { name: "Lines", params: { mode: 4, cell: 16, gap: 0.5, tint: 2, ink: "$magenta", ink2: "$light", under: 1, bgColor: "$blush", widthByTone: true, invert: true, threshold: 0.12, contrast: 1.6 } }),
					createLayer("gradient", { name: "Sun", params: { mode: 1, cx: 0.5, cy: 0.02, scale: 0.62, colorA: "$plum", colorB: "$pink", colorC: "$paper", mid: 0.5 } }),
				],
				{ ...POSTER, background: "$blush" },
			),
	},
	{
		// Codex: a soft out-of-focus form, scattered code fragments, one centred white title.
		id: "poster-soft-code",
		group: "Posters",
		name: "Soft code",
		build: () =>
			doc(
				"Clueso Agents",
				[
					title("Clueso Agents", { size: 140, align: 1, x: 0.06, width: 0.88, y: 0.5, anchor: 1 }),
					label("Brand Lab / 2026", { x: 0.06, y: 0.96 }),
					createLayer("binary", { name: "Code", params: { mode: 5, scatter: 0.3, skipBg: true, threshold: 0.12, tint: 1, ink: "$paper", bg: false, under: true, dim: 0, cell: 26, flicker: 6, contrast: 1.2 } }),
					createLayer("blur", { params: { radius: 70, lift: 1 } }),
					createLayer("forms", { name: "Form", seed: 9, params: { arrange: 0, block: 4, count: 6, rings: 2, blockScale: 0.5, inner: 0.2, twist: 0, size: 1100, x: 0.5, y: 0.5, soft: 0.3, fill: 0, colorA: "$pink", colorB: "$light", colorC: "$light", motion: 1 } }),
				],
				{ ...POSTER, background: "$magenta" },
			),
	},
	{
		// Oxide RFD card: a mono kicker, a title, and terminal-bar art in a framed card.
		id: "poster-terminal",
		group: "Posters",
		name: "Terminal card",
		build: () =>
			doc(
				"Pieces / 03",
				[
					label("Pieces / 03", { x: 0.08, y: 0.94, color: "$pink" }),
					title("Eighty-one pieces,\none grammar", { size: 110, x: 0.08, width: 0.8, y: 0.9 }),
					createLayer("matrix", { name: "Bars", params: { mode: 3, cell: 22, tint: 2, ink: "$light", ink2: "$magenta", under: 1, bgColor: "$ink", contrast: 1.6, bias: 0.1, threshold: 0.1 } }),
					createLayer("forms", { name: "Orbit", seed: 6, params: { arrange: 3, block: 4, count: 10, rings: 4, blockScale: 0.42, inner: 0.15, size: 1050, x: 0.5, y: 0.36, soft: 0.5, fill: 0, colorA: "$paper", colorB: "$pink", colorC: "$plum", motion: 1 } }),
				],
				{ ...POSTER, background: "$ink" },
			),
	},
];

const PATTERN_PRESETS_EXTRA: Preset[] = [
	{
		id: "parts-grid",
		group: "Patterns",
		name: "Mark parts grid",
		build: () => doc("Mark parts grid", [createLayer("parts", { seed: 4, params: { layout: 1, size: 200, pick: 1, motion: 3, fill: 0 } })]),
	},
	{
		id: "plug-fit",
		group: "Patterns",
		name: "Plug fit",
		build: () =>
			doc("Plug fit", [
				createLayer("modules", {
					seed: 8,
					params: { size: 220, gap: 10, mSquare: false, mSemi: false, mQuarter: false, mSlash: false, mHLines: false, mCavity: false, mPlug: true, missing: 0, motion: 3, fill: 1 },
				}),
			]),
	},
	{
		id: "line-modules",
		group: "Patterns",
		name: "Lines & slashes",
		build: () =>
			doc("Lines & slashes", [
				createLayer("modules", {
					seed: 14,
					params: { size: 160, gap: 0, mSquare: false, mCavity: false, mSemi: false, mQuarter: false, mPlug: false, mVLines: true, lines: 5, weight: 7, fill: 0, motion: 2, beats: 6, missing: 0.05 },
				}),
			]),
	},
	{
		id: "bauhaus",
		group: "Patterns",
		name: "Shape tiles",
		build: () =>
			doc("Shape tiles", [
				createLayer("modules", {
					seed: 6,
					params: { size: 180, gap: 0, tiles: true, mSquare: false, mCavity: false, mSlash: false, mHLines: false, mPlug: false, mCircle: true, mTriangle: true, mPart: true, missing: 0, motion: 1, amount: 0.3 },
				}),
			]),
	},
	{
		id: "silk",
		group: "Patterns",
		name: "Silk",
		build: () => doc("Silk", [createLayer("grain", { params: { amount: 0.04 } }), createLayer("flow", { seed: 2, params: { mode: 1 } })], { width: 1920, height: 1080 }),
	},
];

const SQUARE = { width: 1080, height: 1080 };
const WIDE = { width: 1920, height: 1080 };

// Illustrations: a subject made of brand blocks, re-rendered by a visual treatment.
const CODE_ILLUSTRATION_PRESETS: Preset[] = [
	{
		id: "ill-play",
		group: "Illustrations",
		name: "Play button",
		build: () =>
			doc(
				"Play",
				[
					title("Show, don't tell", { size: 120, x: 0.08, width: 0.8, y: 0.92 }),
					createLayer("motif", { name: "Play", params: { motif: 0, breaks: 2, gap: 0.045, size: 1000, x: 0.5, y: 0.42, fill: 0, colorA: "$light", colorB: "$pink", colorC: "$magenta", motion: 1, amount: 0.4 } }),
				],
				{ ...POSTER, background: "$plum" },
			),
	},
	{
		id: "ill-cloud",
		group: "Illustrations",
		name: "Cloud pixels",
		build: () =>
			doc(
				"Cloud",
				[
					createLayer("matrix", { params: { mode: 2, cell: 18, gap: 0.2, round: 0.08, bayer: 1, ink: "$light", under: 1, bgColor: "$plum", contrast: 1.4 } }),
					createLayer("motif", { name: "Cloud", params: { motif: 1, breaks: 2, gap: 0.04, size: 860, x: 0.5, y: 0.5, fill: 1, colorA: "$paper", colorB: "$magenta" } }),
				],
				{ ...SQUARE, background: "$plum" },
			),
	},
	{
		id: "ill-pixel-rays",
		group: "Illustrations",
		name: "Pixel rays",
		build: () =>
			doc(
				"Systems that fit",
				[
					title("Systems\nthat fit", { size: 150, y: 0.2, color: "$paper" }),
					createLayer("matrix", { params: { mode: 2, cell: 22, gap: 0.2, round: 0.08, bayer: 0, ink: "$light", under: 1, bgColor: "$plum", contrast: 1.5 } }),
					createLayer("radial", { seed: 3, params: { mode: 0, count: 9, twist: 1.2, profile: 1, hole: 0.04, fade: 0.5, cx: 0.66, cy: 0.66, scale: 1.1, colorA: "$light", colorB: "$plum", motion: 1 } }),
				],
				{ ...POSTER, background: "$plum" },
			),
	},
	{
		id: "ill-swirl-logo",
		group: "Illustrations",
		name: "Swirl with logo",
		build: () =>
			doc(
				"Swirl",
				[
					createLayer("mark", { name: "Logo", params: { size: 150, x: 0.5, y: 0.5, fill: 0, colorA: "$light", colorB: "$light", colorC: "$light", motion: 0 } }),
					createLayer("matrix", { params: { mode: 2, cell: 18, gap: 0.2, round: 0.05, bayer: 1, ink: "$light", under: 1, bgColor: "$plum", contrast: 1.4 } }),
					createLayer("radial", { seed: 5, params: { mode: 1, count: 6, twist: 1.6, profile: 0, soft: 0.6, hole: 0.2, fade: 0, scale: 1.1, colorA: "$light", colorB: "$plum", motion: 1 } }),
				],
				{ ...SQUARE, background: "$plum" },
			),
	},
	{
		id: "ill-glyph-bloom",
		group: "Illustrations",
		name: "Glyph bloom",
		build: () =>
			doc(
				"Glyph bloom",
				[
					caption("clueso.io", { color: "$plum" }),
					createLayer("binary", { params: { mode: 3, chars: " .:/+*=2e", tint: 0, bg: false, under: true, skipBg: true, dim: 0, cell: 24, contrast: 1.2, glow: 0.35, flicker: 0, threshold: 0.1 } }),
					createLayer("blur", { params: { radius: 24 } }),
					createLayer("forms", { seed: 2, params: { arrange: 0, block: 4, count: 6, rings: 2, blockScale: 0.5, inner: 0.22, orient: 0, size: 1100, x: 0.5, y: 0.5, fill: 0, colorA: "$paper", colorB: "$light", colorC: "$pink", motion: 1 } }),
				],
				{ ...POSTER, background: "$plum" },
			),
	},
	{
		id: "ill-soft-code",
		group: "Illustrations",
		name: "Soft code",
		build: () =>
			doc(
				"Clueso Agents",
				[
					title("Clueso Agents", { size: 120, align: 1, x: 0.2, y: 0.5, anchor: 1, width: 0.6 }),
					createLayer("binary", { params: { mode: 5, scatter: 0.16, threshold: 0.2, tint: 1, ink: "$paper", bg: false, under: true, dim: 0, cell: 22, flicker: 6, contrast: 1.2 } }),
					createLayer("blur", { params: { radius: 80, lift: 1.25 } }),
					createLayer("forms", { seed: 9, params: { arrange: 0, block: 1, count: 5, rings: 2, blockScale: 0.9, inner: 0.3, twist: 30, size: 1000, x: 0.5, y: 0.5, soft: 0.6, fill: 0, colorA: "$paper", colorB: "$blush", colorC: "$light", motion: 1 } }),
				],
				{ ...WIDE, background: "$magenta" },
			),
	},
	{
		id: "ill-sunflower",
		group: "Illustrations",
		name: "Sunflower of marks",
		build: () =>
			doc(
				"Sunflower",
				[
					createLayer("bloom", { params: { threshold: 0.35, radius: 50, intensity: 0.7 } }),
					createLayer("forms", { seed: 4, params: { arrange: 1, block: 0, count: 10, rings: 5, blockScale: 0.17, inner: 0.1, twist: 0, orient: 0, size: 1000, fill: 0, colorA: "$light", colorB: "$pink", colorC: "$magenta", motion: 1 } }),
				],
				{ ...SQUARE, background: "$ink" },
			),
	},
	{
		id: "ill-led-mark",
		group: "Illustrations",
		name: "LED mark",
		build: () =>
			doc(
				"LED mark",
				[
					title("Every piece fits", { size: 150, align: 1, x: 0.1, width: 0.8, y: 0.14 }),
					createLayer("construct", { params: { mode: 1, size: 1060, aspect: 0.32, x: 0.5, y: 0.16, labels: false, color: "$paper" } }),
					// Screened over black-and-white LEDs: black takes the gradient, the LEDs stay white.
					createLayer("gradient", { blend: 2, params: { mode: 1, cx: 0.5, cy: 0.15, scale: 1.6, colorA: "$light", colorB: "$pink", colorC: "$magenta" } }),
					createLayer("matrix", { params: { mode: 1, cell: 16, gap: 0.3, round: 1, tint: 0, ink: "$paper", under: 1, bgColor: "#000000", threshold: 0.5, contrast: 1.3, join: 0.3 } }),
					createLayer("parts", { seed: 1, params: { layout: 0, size: 820, x: 0.5, y: 0.58, fill: 1, colorA: "$paper", motion: 1, amount: 0.5, stagger: 0.4 } }),
				],
				{ ...POSTER, background: "#000000" },
			),
	},
	{
		id: "ill-terminal",
		group: "Illustrations",
		name: "Terminal bars",
		build: () =>
			doc(
				"Terminal",
				[
					createLayer("matrix", { params: { mode: 3, cell: 20, tint: 2, ink: "$light", ink2: "$magenta", under: 1, bgColor: "$ink", contrast: 1.4, threshold: 0.12 } }),
					createLayer("forms", { seed: 6, params: { arrange: 3, block: 4, count: 10, rings: 4, blockScale: 0.4, inner: 0.15, size: 950, soft: 0.5, fill: 0, colorA: "$paper", colorB: "$pink", colorC: "$plum", motion: 1 } }),
				],
				{ ...SQUARE, background: "$ink" },
			),
	},
	{
		id: "ill-blueprint",
		group: "Illustrations",
		name: "Construction",
		build: () =>
			doc(
				"Construction",
				[
					createLayer("construct", { params: { mode: 0, size: 560, x: 0.62, y: 0.5, color: "$light", accent: "$pink", labelSize: 15 } }),
					createLayer("bloom", { params: { threshold: 0.3, radius: 40, intensity: 0.8 } }),
					createLayer("binary", { params: { mode: 4, tint: 2, ink: "$light", ink2: "$magenta", bg: true, bgColor: "$ink", cell: 18, threshold: 0.2, flicker: 8 } }),
					createLayer("mark", { params: { size: 560, x: 0.62, y: 0.5, fill: 2, colorA: "$light", colorB: "$magenta", motion: 0 } }),
				],
				{ ...WIDE, background: "$ink" },
			),
	},
	{
		id: "ill-line-screen",
		group: "Illustrations",
		name: "Line screen",
		build: () =>
			doc(
				"Line screen",
				[
					title("85%", { size: 260, y: 0.94 }),
					caption("Of every frame, on brand", { anchor: 0, y: 0.8, font: 1, size: 40, upper: false }),
					createLayer("bloom", { params: { threshold: 0.35, radius: 60, intensity: 0.8 } }),
					createLayer("matrix", { params: { mode: 4, cell: 16, gap: 0.6, tint: 2, ink: "$light", ink2: "$magenta", under: 1, bgColor: "$ink", widthByTone: false, threshold: 0.05 } }),
					createLayer("blur", { params: { radius: 40 } }),
					createLayer("flow", { seed: 7, params: { mode: 3, count: 4, blobSize: 0.16, soft: 0.8, colorA: "$ink", colorB: "$magenta", colorC: "$pink", colorD: "$light" } }),
				],
				{ ...POSTER, background: "$ink" },
			),
	},
];

/**
 * Presets saved as Brand Lab files in tools/brand-lab/presets (see its README). Each loads as a fresh
 * copy with new layer ids, so a preset opened twice never shares layers.
 */
const fromFiles = (group: Preset["group"]): Preset[] =>
	FILE_PRESETS.filter((f) => f.file.group === group).map(({ id, file }) => ({
		id,
		group,
		name: file.name,
		build: () => {
			const canvas = structuredClone(file.canvases[0]);
			return { ...canvas, name: file.name, layers: canvas.layers.map((l) => ({ ...l, id: newId() })) };
		},
	}));

export const POSTER_PRESETS: Preset[] = [...CODE_POSTER_PRESETS, ...fromFiles("Posters")];
const ILLUSTRATION_PRESETS: Preset[] = [...CODE_ILLUSTRATION_PRESETS, ...fromFiles("Illustrations")];

export const PRESETS: Preset[] = [...POSTER_PRESETS, ...ILLUSTRATION_PRESETS, ...BASE_PRESETS.filter((p) => p.group === "Patterns"), ...PATTERN_PRESETS_EXTRA];

export function presetDoc(id: string): Doc {
	return (PRESETS.find((p) => p.id === id) ?? PRESETS[0]).build();
}
