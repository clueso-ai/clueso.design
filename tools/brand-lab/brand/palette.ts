// Palettes are ordered lists of named colours. Layers reference colours by key (`$pink`), so
// switching palettes re-themes everything. Built-in palettes all define the same seven core roles
// (darkest to lightest), which presets and Shuffle rely on; any palette can add or drop colours.

export interface PaletteColor {
	key: string;
	name: string;
	hex: string;
}
export type Palette = PaletteColor[];

export interface PaletteDef {
	id: string;
	name: string;
	colors: Palette;
	builtIn?: boolean;
}

export const CORE_KEYS = ["ink", "plum", "magenta", "pink", "light", "blush", "paper"] as const;
export type CoreKey = (typeof CORE_KEYS)[number];

const CORE_NAMES: Record<CoreKey, string> = {
	ink: "Ink",
	plum: "Plum",
	magenta: "Magenta",
	pink: "Pink",
	light: "Light pink",
	blush: "Blush",
	paper: "Paper",
};

const core = (hex: Record<CoreKey, string>, names: Partial<Record<CoreKey, string>> = {}): Palette =>
	CORE_KEYS.map((key) => ({ key, name: names[key] ?? CORE_NAMES[key], hex: hex[key] }));

// Pink values come from the jigsaw `--pink-*` scale (oklch → sRGB), the gradient stops from the
// logo mark (#FE89EB → #C12EAF), plum from the pattern posters.
export const CLUESO_PALETTE: Palette = core({
	ink: "#171717",
	plum: "#21101E",
	magenta: "#C12EAF",
	pink: "#DA5CC7",
	light: "#FE89EB",
	blush: "#FEEAFA",
	paper: "#FFFFFF",
});

/** Role names for palettes whose accents aren't pink. */
const accentNames = (deep: string, mid: string, light: string, tint: string) => ({ plum: deep, magenta: mid, pink: `Bright ${mid.toLowerCase()}`, light, blush: tint });

export const BUILT_IN_PALETTES: PaletteDef[] = [
	{ id: "clueso", name: "Clueso", colors: CLUESO_PALETTE },
	{
		id: "night",
		name: "Clueso Night",
		colors: core({ ink: "#0B0610", plum: "#1A0B2E", magenta: "#8E3BE0", pink: "#DA5CC7", light: "#F7A8F0", blush: "#2A1638", paper: "#F4EEFF" }, { magenta: "Violet" }),
	},
	{
		id: "daylight",
		name: "Clueso Daylight",
		colors: core({ ink: "#2A1027", plum: "#F6E3F2", magenta: "#C12EAF", pink: "#E377CC", light: "#FBD6F4", blush: "#FEF5FC", paper: "#FFFFFF" }, { plum: "Mist" }),
	},
	{
		id: "ultraviolet",
		name: "Ultraviolet",
		colors: core({ ink: "#0A0614", plum: "#170E33", magenta: "#5B2EE0", pink: "#8F6BFF", light: "#C7B8FF", blush: "#F0ECFF", paper: "#FFFFFF" }, accentNames("Night", "Violet", "Lilac", "Haze")),
	},
	{
		id: "ember",
		name: "Ember",
		colors: core({ ink: "#160A08", plum: "#2B0F14", magenta: "#D6336C", pink: "#FF6B8B", light: "#FFB199", blush: "#FFF0EA", paper: "#FFFFFF" }, accentNames("Ember", "Rose", "Peach", "Cream")),
	},
	{
		id: "signal",
		name: "Signal",
		colors: core({ ink: "#0D0D0D", plum: "#1A0A0A", magenta: "#E11D2E", pink: "#FF5A4E", light: "#FFB4A8", blush: "#FFF1EE", paper: "#FFFFFF" }, accentNames("Oxblood", "Red", "Coral", "Shell")),
	},
	{
		id: "sand",
		name: "Sand",
		colors: core({ ink: "#1C1712", plum: "#2E261D", magenta: "#B3541E", pink: "#E08E45", light: "#F2C894", blush: "#FBF1E4", paper: "#FFFDF9" }, accentNames("Umber", "Rust", "Apricot", "Linen")),
	},
	{
		id: "lagoon",
		name: "Lagoon",
		colors: core({ ink: "#04121A", plum: "#0B2530", magenta: "#0E8C8C", pink: "#2EC4B6", light: "#9BF0E1", blush: "#E6FBF7", paper: "#FFFFFF" }, accentNames("Deep sea", "Teal", "Aqua", "Foam")),
	},
	{
		id: "forest",
		name: "Forest",
		colors: core({ ink: "#08110C", plum: "#10241A", magenta: "#1F7A4D", pink: "#3DBE7A", light: "#A8E6C1", blush: "#EAF8F0", paper: "#FFFFFF" }, accentNames("Pine", "Green", "Mint", "Dew")),
	},
	{
		id: "citrus",
		name: "Citrus",
		colors: core({ ink: "#12140A", plum: "#1E2410", magenta: "#7A9A01", pink: "#B8D82B", light: "#E6F77A", blush: "#F8FCE3", paper: "#FFFFFF" }, accentNames("Olive", "Lime", "Lemon", "Chalk")),
	},
	{
		id: "mono",
		name: "Mono",
		colors: core({ ink: "#0A0A0A", plum: "#171717", magenta: "#525252", pink: "#A3A3A3", light: "#D4D4D4", blush: "#EDEDED", paper: "#FFFFFF" }, accentNames("Charcoal", "Grey", "Silver", "Fog")),
	},
].map((p) => ({ ...p, builtIn: true }));

/** A colour value is either a palette reference (`$pink`) or a literal hex. */
export type ColorValue = string;

export function hexToRgb(hex: string): [number, number, number] {
	let h = hex.replace("#", "");
	if (h.length === 3) h = h.split("").map((c) => c + c).join("");
	const n = Number.parseInt(h.slice(0, 6), 16);
	if (Number.isNaN(n)) return [1, 0, 1];
	return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function luma(hex: string) {
	const [r, g, b] = hexToRgb(hex);
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** The palette colour closest in lightness to `hex`. */
export function nearestColor(palette: Palette, hex: string): PaletteColor | undefined {
	const l = luma(hex);
	let best: PaletteColor | undefined;
	for (const c of palette) if (!best || Math.abs(luma(c.hex) - l) < Math.abs(luma(best.hex) - l)) best = c;
	return best;
}

const CORE_HEX = Object.fromEntries(CLUESO_PALETTE.map((c) => [c.key, c.hex]));

export function resolveColor(value: ColorValue, palette: Palette): string {
	if (!value.startsWith("$")) return value;
	const key = value.slice(1);
	const hit = palette.find((c) => c.key === key);
	if (hit) return hit.hex;
	// A role this palette doesn't have (removed, or a custom palette): use the colour nearest in
	// lightness to the role, so contrast between layers survives.
	return nearestColor(palette, CORE_HEX[key] ?? "#808080")?.hex ?? "#808080";
}

export function colorName(value: ColorValue, palette: Palette) {
	if (!value.startsWith("$")) return null;
	return palette.find((c) => c.key === value.slice(1))?.name ?? CORE_NAMES[value.slice(1) as CoreKey] ?? value.slice(1);
}

/** Docs saved before palettes became lists stored `{ ink: "#…", … }`. */
export function toPalette(value: unknown): Palette {
	if (Array.isArray(value)) return value as Palette;
	if (value && typeof value === "object") {
		const rec = value as Record<string, string>;
		return Object.entries(rec).map(([key, hex]) => ({ key, name: CORE_NAMES[key as CoreKey] ?? key, hex }));
	}
	return CLUESO_PALETTE.map((c) => ({ ...c }));
}

export const clonePalette = (p: Palette): Palette => p.map((c) => ({ ...c }));

export const samePalette = (a: Palette, b: Palette) =>
	a.length === b.length && a.every((c, i) => c.key === b[i].key && c.hex.toLowerCase() === b[i].hex.toLowerCase() && c.name === b[i].name);
