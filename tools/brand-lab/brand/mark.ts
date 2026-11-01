// The Clueso mark: a puzzle piece split by two 135° visual breaks into three parts.
// Paths are lifted verbatim from clueso-full-gradient-lightbg.svg (100×100 unit box, y down).

export const MARK_PATHS = [
	"M69.7071 1.70711L98.2929 30.2929C98.9229 30.9229 100 30.4767 100 29.5858V3C100 1.34315 98.6569 0 97 0H70.4142C69.5233 0 69.0771 1.07714 69.7071 1.70711Z",
	"M52.5858 0.585789L99.4142 47.4142C99.7893 47.7893 100 48.298 100 48.8284V65.5858C100 66.4767 98.9229 66.9229 98.2929 66.2929L33.7071 1.70711C33.0771 1.07714 33.5233 0 34.4142 0H51.1716C51.702 0 52.2107 0.210716 52.5858 0.585789Z",
	"M16.5858 0.585789L99.4142 83.4142C99.7893 83.7893 100 84.298 100 84.8284V97C100 98.6569 98.6569 100 97 100H70C68.8954 100 68 99.1046 68 98V94C68 84.0589 59.9411 76 50 76C40.0589 76 32 84.0589 32 94V98C32 99.1046 31.1046 100 30 100H3C1.34315 100 0 98.6569 0 97V70C0 68.8954 0.89543 68 2 68H6C15.9411 68 24 59.9411 24 50C24 40.0589 15.9411 32 6 32H2C0.895431 32 0 31.1046 0 30V3C0 1.34315 1.34315 0 3 0H15.1716C15.702 0 16.2107 0.210717 16.5858 0.585789Z",
];

export const PART_NAMES = ["Top", "Middle", "Bottom"] as const;

type Vec = [number, number];
/** [x, y, corner radius] in SVG units (100-unit box, y down). */
type Corner = [number, number, number];

// Construction (from the logo grid). Diagonals are 135° and stop on the right edge at:
//   light mode: 32 / 48 / 68 / 84  (16-unit breaks, 20-unit slash)
//   dark mode:  32 / 50 / 68 / 86  (18-unit breaks, 18-unit slash; light shapes read heavier on dark)
// Corner radii: 3 on the outer square, 2 on the obtuse diagonal corners and cavity mouths, 1 on the
// sharp tips. Cavities: radius 18, centred 6 in from the edge, opening 36 (y 32 to 68).
const TOP: Corner[] = [
	[68, 0, 1],
	[100, 0, 3],
	[100, 32, 1],
];

const VARIANTS = {
	light: {
		top: TOP,
		middle: [
			[32, 0, 1],
			[52, 0, 2],
			[100, 48, 2],
			[100, 68, 1],
		] as Corner[],
		body: [
			[0, 0, 3],
			[16, 0, 2],
			[100, 84, 2],
			[100, 100, 3],
			[0, 100, 3],
		] as Corner[],
	},
	dark: {
		top: TOP,
		middle: [
			[32, 0, 1],
			[50, 0, 2],
			[100, 50, 2],
			[100, 68, 1],
		] as Corner[],
		body: [
			[0, 0, 3],
			[14, 0, 2],
			[100, 86, 2],
			[100, 100, 3],
			[0, 100, 3],
		] as Corner[],
	},
};

export type MarkVariant = keyof typeof VARIANTS;

const toMark = ([x, y]: Vec): Vec => [x / 100 - 0.5, 0.5 - y / 100];

/**
 * A convex polygon with a different radius at every corner, prepared for an exact SDF:
 * each edge as a half-plane (point + outward normal), each corner as an arc centre with the
 * two edge directions that bound its region.
 */
export interface RoundedPoly {
	edges: { p: Vec; n: Vec }[];
	corners: { c: Vec; r: number; din: Vec; dout: Vec }[];
}

function prepare(corners: Corner[]): RoundedPoly {
	const pts = corners.map((c) => toMark([c[0], c[1]]));
	const radii = corners.map((c) => c[2] / 100);
	const n = pts.length;
	let area = 0;
	for (let i = 0; i < n; i++) area += pts[i][0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * pts[i][1];
	const ccw = area > 0;
	const edges = pts.map((a, i) => {
		const b = pts[(i + 1) % n];
		const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
		const d: Vec = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
		// Outward normal: right of the direction for a counter-clockwise polygon.
		const out: Vec = ccw ? [d[1], -d[0]] : [-d[1], d[0]];
		return { p: a, n: out, d };
	});
	const result: RoundedPoly = { edges: edges.map(({ p, n }) => ({ p, n })), corners: [] };
	for (let i = 0; i < n; i++) {
		const a = edges[(i - 1 + n) % n]; // edge arriving at vertex i
		const b = edges[i]; // edge leaving vertex i
		const r = radii[i];
		// Arc centre: both edges moved inward by r, intersected.
		const pa: Vec = [a.p[0] - a.n[0] * r, a.p[1] - a.n[1] * r];
		const pb: Vec = [b.p[0] - b.n[0] * r, b.p[1] - b.n[1] * r];
		const det = a.d[0] * b.d[1] - a.d[1] * b.d[0];
		const t = ((pb[0] - pa[0]) * b.d[1] - (pb[1] - pa[1]) * b.d[0]) / det;
		const c: Vec = [pa[0] + a.d[0] * t, pa[1] + a.d[1] * t];
		result.corners.push({ c, r, din: a.d, dout: b.d });
	}
	return result;
}

export const MARK_PARTS: Record<MarkVariant, Record<"top" | "middle" | "body", RoundedPoly>> = {
	light: { top: prepare(VARIANTS.light.top), middle: prepare(VARIANTS.light.middle), body: prepare(VARIANTS.light.body) },
	dark: { top: prepare(VARIANTS.dark.top), middle: prepare(VARIANTS.dark.middle), body: prepare(VARIANTS.dark.body) },
};
