// The shapes of Icon Lab's data modules. Paths are SVG path data in grid units (24 × 24) unless
// a comment says otherwise.

/** A badge drawn on top of a cut drawing: strokes and small fills. */
export interface Parts {
	paths?: string[];
	fills?: string[];
}

/** A rect cut [x0, y0, x1, y1], or a round one. */
export type Cut = number[] | { c: [number, number]; r: number };

/** One option of a site icon: its own drawing, or another option turned or added to. */
export interface SiteVariant {
	label: string;
	paths?: string[];
	fills?: string[];
	from?: number;
	rotate?: number;
	extra?: string[];
	cut?: Cut[];
	badge?: Parts;
}

/** An icon of the site set (site-set.ts), drawn natively on the grid. */
export interface SiteEntry {
	name: string;
	replaces?: string;
	pages?: number;
	keywords: string[];
	paths?: string[];
	fills?: string[];
	variants?: SiteVariant[];
	defaultVariant?: number;
	fromLibrary?: string;
	usedOn?: string;
	grow?: number;
	badge?: Parts;
	cut?: Cut[];
	title?: string;
}

/** A library icon redrawn on the grid (site-set.ts LIBRARY_REDRAWS). */
export interface LibraryRedraw {
	paths: string[];
	fills?: string[];
	rotate?: number;
}

/** A Sharp library icon, in Figma units (unit px per grid unit). */
export interface LibraryEntry {
	name: string;
	style: "line" | "solid";
	unit: number;
	keywords: string[];
	body: string;
}

/** A signature drawing (signature-set.ts). Without paths it uses the base drawing. */
export interface SignatureIconEntry {
	name: string;
	label?: string;
	note?: string;
	rotate?: number;
	paths?: string[];
	fills?: string[];
	pixels?: string[];
	cut?: (number[] | { d: string; w: number })[];
	badge?: Parts;
	options?: Omit<SignatureIconEntry, "name" | "options">[];
}

export interface SignatureEntry {
	key: string;
	label: string;
	idea: string;
	render?: unknown;
	icons: SignatureIconEntry[];
}

/** Google Material Symbols paths for one option: line per corner style and stroke, and solid. */
export interface CluesoOption {
	label: string;
	material: string[];
	line: { sharp: Record<string, string>; rounded: Record<string, string> };
	solid: { sharp: string; rounded: string };
	evenodd?: boolean;
}

/** Every icon on clueso.io (clueso-set.ts). `platform` is true for platform only, "shared" for both. */
export interface CluesoEntry {
	name: string;
	replaces?: string;
	pages?: number;
	example?: unknown;
	platform?: boolean | "shared";
	keywords: string[];
	options: CluesoOption[];
}

export interface ContextBox {
	x: number;
	y: number;
	w: number;
	h: number;
}

/** A capture of where an icon is used on clueso.io (context-data.ts). */
export interface ContextSpot {
	url: string;
	image: string;
	size: { w: number; h: number };
	box: ContextBox;
	more?: ContextBox[];
	color: string;
	bg: string;
	match?: string;
	score?: number;
}
