// A visitor's tweaks to the site from the homepage hero: title and text fonts, their weights, and
// a Clueso cursor with their name on it. The store is lib/site-prefs-store.ts. Brand Lab ignores them.

export interface FontOption {
	id: string;
	label: string;
	family: string;
	/** Variable fonts get a weight slider. Single-weight fonts use this weight. */
	weights: [number, number] | number;
	/** Styles of the same font, e.g. Geist Pixel's pixel shapes. The first is the default. */
	styles?: { id: string; label: string; family: string }[];
}

export const FONTS: FontOption[] = [
	{ id: "nohemi", label: "Nohemi", family: `"Nohemi", sans-serif`, weights: [100, 900] },
	{ id: "geist", label: "Geist", family: `"Geist", system-ui, sans-serif`, weights: [100, 900] },
	{ id: "geist-mono", label: "Geist Mono", family: `"Geist Mono", ui-monospace, monospace`, weights: [100, 900] },
	{
		id: "geist-pixel",
		label: "Geist Pixel",
		family: `"Geist Pixel", "Geist Mono", monospace`,
		weights: 500,
		styles: [
			{ id: "square", label: "Square", family: `"Geist Pixel", "Geist Mono", monospace` },
			{ id: "circle", label: "Circle", family: `"Geist Pixel Circle", "Geist Mono", monospace` },
			{ id: "grid", label: "Grid", family: `"Geist Pixel Grid", "Geist Mono", monospace` },
			{ id: "line", label: "Line", family: `"Geist Pixel Line", "Geist Mono", monospace` },
			{ id: "triangle", label: "Triangle", family: `"Geist Pixel Triangle", "Geist Mono", monospace` },
		],
	},
	{ id: "geist-serif", label: "Geist Serif", family: `"Geist Serif", Georgia, serif`, weights: 400 },
];

export const fontById = (id: string) => FONTS.find((f) => f.id === id) ?? FONTS[0];

/** The CSS family for a font and, if it has styles, the chosen style. */
export function fontFamily(id: string, style?: string) {
	const font = fontById(id);
	return font.styles?.find((s) => s.id === style)?.family ?? font.family;
}

export interface CursorColor {
	id: string;
	label: string;
	fill: string;
	/** Text on the name tag and on selected text: dark or white, whichever reads on the fill. */
	ink: string;
	/** The fill in OKLCH: lightness 0 to 1, chroma, hue in degrees. */
	oklch: [number, number, number];
}

const DARK_INK = "#171717";
const LIGHT_INK = "#FFFFFF";

/** sRGB hex to OKLCH, via OKLab. */
export function hexToOklch(hex: string): [number, number, number] {
	const lin = [1, 3, 5].map((i) => {
		const c = parseInt(hex.slice(i, i + 2), 16) / 255;
		return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	});
	const [r, g, b] = lin;
	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
	const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
	const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
	const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
	const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
	const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
	return [L, Math.hypot(A, B), ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360];
}

/** An OKLCH colour as CSS, rounded to what the eye can tell apart. */
/** OKLCH to sRGB channels from 0 to 255, clamped into gamut. For drawing colour pickers pixel by pixel. */
export function oklchToRgb([l, c, h]: [number, number, number]): [number, number, number] {
	const a = c * Math.cos((h * Math.PI) / 180);
	const b = c * Math.sin((h * Math.PI) / 180);
	const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
	const linear = [4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_, -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_, -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_];
	const channel = (x: number) => {
		const v = x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
		return Math.round(Math.min(1, Math.max(0, v)) * 255);
	};
	return [channel(linear[0]), channel(linear[1]), channel(linear[2])];
}

/** OKLCH back to sRGB hex, clamped into gamut. For places that only take hex (Brand Lab's renderer). */
export function oklchToHex(lch: [number, number, number]): string {
	return `#${oklchToRgb(lch)
		.map((v) => v.toString(16).padStart(2, "0"))
		.join("")}`;
}

export const oklchCss = ([l, c, h]: [number, number, number]) => `oklch(${l.toFixed(2)} ${c.toFixed(3)} ${Math.round(h)})`;

/** Lightness decides the ink. OKLCH lightness tracks what the eye sees, so one threshold works for every hue. */
const inkFor = (l: number) => (l > 0.72 ? DARK_INK : LIGHT_INK);

function swatch(id: string, label: string, fill: string): CursorColor {
	const oklch = hexToOklch(fill);
	return { id, label, fill, ink: inkFor(oklch[0]), oklch };
}

// Muted, clearly different hues, so every cursor on a page reads as a different person, plus two
// neutrals. The whole team uses pink, one colour for one team. Visitors start on black.
export const CURSOR_COLORS: CursorColor[] = [
	swatch("pink", "Pink", "#CD5FC0"),
	swatch("blue", "Blue", "#5FA8D3"),
	swatch("green", "Green", "#74A77B"),
	swatch("orange", "Orange", "#E0844A"),
	swatch("violet", "Violet", "#8D6CD9"),
	swatch("red", "Red", "#D85D5D"),
	swatch("teal", "Teal", "#3FA39B"),
	swatch("yellow", "Yellow", "#E5BC45"),
	swatch("ink", "Black", "#1A1A1A"),
	swatch("gray", "Gray", "#8F8F8F"),
];

const OKLCH_RE = /^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/;

/** A colour id is a palette id, an oklch() string from the picker or Shuffle, or an older saved hex. */
export function cursorById(id: string): CursorColor {
	const m = OKLCH_RE.exec(id);
	if (m) {
		const oklch: [number, number, number] = [Number(m[1]), Number(m[2]), Number(m[3])];
		return { id, label: "Custom", fill: id, ink: inkFor(oklch[0]), oklch };
	}
	if (/^#[0-9a-f]{6}$/i.test(id)) return swatch(id, "Custom", id);
	return CURSOR_COLORS.find((c) => c.id === id) ?? CURSOR_COLORS[8];
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

/**
 * Pink is the team's colour: Clueso pinks sit around hue 332 in OKLCH. Shuffle never lands
 * between these hues, so a visitor only gets pink by picking it.
 */
const TEAM_HUES: [number, number] = [308, 358];

/** A random colour in the same muted range as the palette: any hue but the team's pink, moderate chroma and lightness. */
export function shuffleColor(): string {
	const [from, to] = TEAM_HUES;
	const hue = (to + rand(0, 360 - (to - from))) % 360;
	return oklchCss([rand(0.6, 0.72), rand(0.1, 0.16), hue]);
}

export interface SitePrefs {
	titleFont: string;
	titleWeight: number;
	/** Style within the title font, for fonts that have them (Geist Pixel). */
	titleStyle: string;
	textFont: string;
	textWeight: number;
	textStyle: string;
	cursorColor: string;
	cursorName: string;
	/** Tilt of the cursor piece in degrees. 0 is upright. */
	cursorTilt: number;
	/** Use the Clueso cursor on the site. Off keeps the visitor's own cursor. */
	cluesoCursor: boolean;
	/** Type scale: body size in px, and the ratio between steps. No ratio keeps the site's own, which grows by breakpoint. */
	typeBase: number;
	typeRatio: number | null;
	/** Done the first-run steps in Customize website (or skipped them). Until then the panel walks them through. */
	onboarded: boolean;
	/** Opened Customize website at least once, by C or the button. Until then the cursor's tag says how. */
	hintDone: boolean;
	/** The footer logo plays notes when you pull its letters. */
	logoSound: boolean;
}

export const DEFAULT_PREFS: SitePrefs = {
	titleFont: "nohemi",
	titleWeight: 350,
	titleStyle: "square",
	textFont: "geist",
	textWeight: 350,
	textStyle: "square",
	cursorColor: "ink",
	cursorName: "",
	cursorTilt: 0,
	cluesoCursor: true,
	typeBase: 15,
	typeRatio: null,
	onboarded: false,
	hintDone: false,
	logoSound: true,
};

/** The weight a font actually renders at: the visitor's choice for variable fonts, the font's own otherwise. */
export function effectiveWeight(fontId: string, chosen: number) {
	const w = fontById(fontId).weights;
	return typeof w === "number" ? w : Math.min(w[1], Math.max(w[0], chosen));
}

/** The site's own ratio at the current window width. Mirrors --type-ratio in styles/tokens.css. */
export function siteTypeRatio() {
	if (typeof window === "undefined") return 1.22;
	return matchMedia("(min-width: 1200px)").matches ? 1.37 : matchMedia("(min-width: 768px)").matches ? 1.3 : 1.22;
}

/** A visitor's type scale as overrides of the scale tokens. Every type size follows from these two. */
export function typeScaleVars(base: number, ratio: number | null): Record<string, string> {
	return {
		...(base !== DEFAULT_PREFS.typeBase ? { "--type-base": `${base}px` } : {}),
		...(ratio !== null ? { "--type-ratio": String(ratio) } : {}),
	};
}

/**
 * A whole new look: fonts, weights and cursor colour. The type scale stays put. Rules that keep every result good-looking:
 * - Nothing heavier than 500. Body text no heavier than 400.
 * - Nohemi and Geist Mono are for titles only. Body text gets Geist or Geist Serif.
 */
export function shuffleSite(): Partial<SitePrefs> {
	const title = pick(FONTS);
	const text = fontById(pick(["geist", "geist-serif"]));
	const weight = (w: FontOption["weights"], lo: number, hi: number) => (typeof w === "number" ? w : Math.round(rand(Math.max(lo, w[0]), Math.min(hi, w[1])) / 100) * 100);
	return {
		titleFont: title.id,
		titleStyle: title.styles ? pick(title.styles).id : "square",
		titleWeight: weight(title.weights, 100, 500),
		textFont: text.id,
		textStyle: "square",
		textWeight: weight(text.weights, 300, 400),
		cursorColor: shuffleColor(),
	};
}

/** The colour behind selected text and its ink, from the visitor's cursor colour. */
export function selectionVars(colorId: string): Record<string, string> {
	const c = cursorById(colorId);
	return { "--selection-bg": c.fill, "--selection-fg": c.ink };
}
