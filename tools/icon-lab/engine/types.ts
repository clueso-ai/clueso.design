// Icon Lab's icon model. Icons are plain mutable objects, as in the standalone app: the engine fits
// them in place, editing rewrites their body, and an icon with options shares one options list.

export type Pt = [number, number];

/** A parsed path segment, in absolute coordinates: a line, a cubic curve or an arc. */
export interface Seg {
	t: "L" | "C" | "A";
	from: Pt;
	to: Pt;
	c1?: Pt;
	c2?: Pt;
	rx?: number;
	ry?: number;
	rot?: number;
	large?: number;
	sweep?: number;
}

export interface Subpath {
	start: Pt;
	segs: Seg[];
	closed: boolean;
}

export interface Box {
	x0: number;
	y0: number;
	x1: number;
	y1: number;
}

export interface Cell {
	x: number;
	y: number;
	tone?: string;
}

/** What Reset brings back. */
export interface Snapshot {
	body: string;
	scale: number;
	tx: number;
	ty: number;
	box: Box;
	optical?: { dx: number; dy: number };
}

export interface Icon {
	name: string;
	title?: string;
	style: "line" | "solid";
	keywords: string[];
	/** SVG elements with {{COLOR}}, {{SW}} (and {{ACCENT}}) slots. */
	body: string;
	defs?: string;
	unit?: number;
	scale: number;
	tx: number;
	ty: number;
	box: Box;
	shape?: string;
	refit?: boolean;
	native?: boolean;
	fitTo?: "live";
	noSnap?: boolean;
	optical?: { dx: number; dy: number };
	redrawn?: boolean;
	tweaked?: boolean;
	/** Its own key for saved edits (signature and pixel icons). */
	id?: string;
	// Options
	options?: Icon[];
	variant?: string;
	variantIndex?: number;
	// Where it's used
	site?: boolean;
	replaces?: string;
	pages?: number;
	example?: unknown;
	usedOn?: string;
	platform?: boolean | "shared";
	/** Google's Material Symbols drawing of the same icon, the construction reference. */
	google?: Icon;
	/** Not drawn in our style yet: Google's drawing stands in. */
	googleOnly?: boolean;
	// Clueso set (Google Material Symbols)
	clueso?: boolean;
	materialName?: string[];
	material?: { line: { sharp: Record<string, string>; rounded: Record<string, string> }; solid: { sharp: string; rounded: string }; evenodd: boolean };
	// Signature samples
	signature?: string;
	note?: string;
	render?: unknown;
	// Pixel direction
	pixel?: boolean;
	pixelCells?: Cell[];
	pixelCellsSolid?: Cell[] | null;
	pixelCellsDots?: Cell[] | null;
	pixelCellsMatrix?: Cell[] | null;
	grid?: number;
	illustration?: boolean;
	// Made in the tool
	edited?: boolean;
	original?: Snapshot;
	generated?: boolean;
	prompt?: string;
	composed?: { base?: string; badge?: string; spot?: string; drawn?: boolean };
	/** A short name for an option in the prompt tray. */
	label?: string;
}

/** Drawing options for buildSvg. */
export interface DrawOptions {
	stroke?: number;
	round?: number;
	color?: string;
	accent?: string;
	accent2?: string;
	pixelSize?: number;
	pixelRadius?: number;
	pixelBuild?: string;
}
