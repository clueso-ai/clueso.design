import { bool, color, cycles, eq, float, int, neq, select } from "../params";
import type { LayerDef, Params, ParamValue } from "../types";

// The Puzzle Piece System: a square whose four edges are each flat, a cavity or an extrusion,
// 3^4 = 81 pieces grouped by how many cavities and extrusions they have. Cavities are the mark's
// (radius 18, centred 6 inside the edge); extrusions are the same circle mirrored outward, so any
// extrusion fits any cavity. The Clueso mark is the Kite (cavities left and bottom) plus two breaks.

/** Edge values, and the order edges are packed into a piece index: T + 3R + 9B + 27L. */
const EDGE = ["Flat", "Cavity", "Extrusion"];
const EDGE_KEYS = ["top", "right", "bottom", "left"] as const;

const pieceIndex = (e: number[]) => e[0] + 3 * e[1] + 9 * e[2] + 27 * e[3];
const edgesOf = (idx: number) => [0, 1, 2, 3].map((i) => Math.floor(idx / 3 ** i) % 3);
const count = (idx: number, v: number) => edgesOf(idx).filter((e) => e === v).length;

/** Names from the piece study, edges listed top, right, bottom, left. */
export const NAMED_PIECES: { label: string; edges: [number, number, number, number] }[] = [
	{ label: "Square", edges: [0, 0, 0, 0] },
	{ label: "Clipboard / Lock", edges: [2, 0, 0, 0] },
	{ label: "Ears", edges: [0, 2, 0, 2] },
	{ label: "Face with a chin", edges: [0, 2, 2, 2] },
	{ label: "Flower", edges: [2, 2, 2, 2] },
	{ label: "Alphabet U / T-shirt", edges: [1, 0, 0, 0] },
	{ label: "Alphabet C / Magnet", edges: [0, 1, 0, 0] },
	{ label: "Alphabet N", edges: [0, 0, 1, 0] },
	{ label: "Alphabet D", edges: [0, 0, 0, 1] },
	{ label: "Arrows / Anchor", edges: [1, 1, 0, 0] },
	{ label: "Alphabet H", edges: [1, 0, 1, 0] },
	{ label: "Ticket / Hourglass", edges: [0, 1, 0, 1] },
	{ label: "Kite / Diagonal arrow (the mark)", edges: [0, 0, 1, 1] },
	{ label: "Cursor", edges: [0, 1, 1, 0] },
	{ label: "A fallen person kicking", edges: [1, 1, 0, 2] },
	{ label: "Scarecrow", edges: [2, 1, 0, 1] },
	{ label: "Alphabet K", edges: [1, 1, 1, 0] },
	{ label: "Women's torso / Rook", edges: [1, 1, 0, 1] },
	{ label: "Castle", edges: [0, 1, 1, 1] },
	{ label: "Person standing", edges: [2, 1, 1, 1] },
	{ label: "Anchor / X", edges: [1, 1, 1, 1] },
];

// Catalogue rows in the order of the study: by cavities, then extrusions. 15 classes, at most 12 each.
const CLASSES: [number, number][] = [];
for (let c = 0; c <= 4; c++) for (let e = 0; e <= 4 - c; e++) CLASSES.push([c, e]);
const COLS = 12;
const CATALOGUE: number[] = CLASSES.flatMap(([c, e]) => {
	const row = Array.from({ length: 81 }, (_, i) => i).filter((i) => count(i, 1) === c && count(i, 2) === e);
	return [...row, ...Array(COLS - row.length).fill(-1)];
});

const CLASS_LEN = CLASSES.map(([c, e]) => Array.from({ length: 81 }, (_, i) => i).filter((i) => count(i, 1) === c && count(i, 2) === e).length);

const LOGO_INDEX = pieceIndex([0, 0, 1, 1]);
const COUNT_OPTS = ["Any", "0", "1", "2", "3", "4"];

export const pieces: LayerDef = {
	type: "pieces",
	kind: "source",
	category: "brand",
	label: "Pieces",
	icon: "Puzzle",
	description: "The 81-piece system: flat, cavity or extrusion on every edge",
	groups: [
		{
			title: "Piece",
			params: [
				select("layout", "Layout", ["Single", "Catalogue", "Grid"], 0, { shuffle: [2, 2] }),
				select("piece", "Named", ["Custom", ...NAMED_PIECES.map((n) => n.label)], 13, { showIf: eq("layout", 0) }),
				...EDGE_KEYS.map((k, i) => select(k, ["Top", "Right", "Bottom", "Left"][i], EDGE, NAMED_PIECES[12].edges[i], { showIf: eq("layout", 0) })),
				select("cav", "Cavities", COUNT_OPTS, 0, { showIf: neq("layout", 0), shuffle: [0, 3] }),
				select("ext", "Extrusions", COUNT_OPTS, 0, { showIf: neq("layout", 0), shuffle: [0, 3] }),
				bool("noSquare", "Skip the plain square", true, { showIf: neq("layout", 0) }),
				select("breaks", "Breaks", ["None", "Logo breaks"], 0, { shuffle: true }),
				select("logo", "Logo", ["Auto", "Dark mode", "Light mode"], 0, { showIf: eq("breaks", 1) }),
			],
		},
		{
			title: "Layout",
			params: [
				float("size", "Size", 8, 3000, 320, { unit: "px", shuffle: [80, 200] }),
				float("spacing", "Spacing", 0.8, 4, 1.7, { step: 0.01, showIf: neq("layout", 0), shuffle: [1.5, 2.2] }),
				bool("turns", "Random turns", false, { showIf: eq("layout", 2), shuffle: true }),
				float("missing", "Empty cells", 0, 1, 0, { step: 0.01, showIf: eq("layout", 2), shuffle: [0, 0.3] }),
				float("rotation", "Rotation", -180, 180, 0, { unit: "°", step: 1 }),
				float("x", "X", 0, 1, 0.5, { step: 0.001 }),
				float("y", "Y", 0, 1, 0.5, { step: 0.001 }),
			],
		},
		{
			title: "Style",
			params: [
				select("style", "Style", ["Fill", "Outline"], 0, { shuffle: [0, 1] }),
				float("stroke", "Stroke", 0.5, 24, 2, { unit: "px", showIf: eq("style", 1) }),
				select("fill", "Colour", ["Solid", "Two-tone", "Three-tone", "By cavities", "Mark gradient"], 0, { shuffle: true }),
				color("colorA", "Primary", "$paper"),
				color("colorB", "Secondary", "$pink", { showIf: neq("fill", 0) }),
				color("colorC", "Tertiary", "$magenta", { showIf: eq("fill", 2, 3) }),
			],
		},
		{
			title: "Motion",
			params: [
				select("motion", "Motion", ["None", "Cycle pieces", "Turn", "Flip", "Snap build"], 0, { shuffle: true }),
				select("axis", "Flip axis", ["Vertical", "Horizontal", "135° diagonal"], 2, { showIf: eq("motion", 3), shuffle: true }),
				int("beats", "Changes / loop", 1, 48, 6, { showIf: eq("motion", 1, 3) }),
				float("spread", "Stagger", 0, 2, 0.4, { step: 0.01, showIf: neq("motion", 0) }),
				cycles(1, { showIf: eq("motion", 2, 4) }),
			],
		},
	],
	position: ["x", "y"],
	// Repeated marks read the baked logo; a single big one stays exact.
	defines: (p) => (p.layout === 0 ? [] : ["FAST_MARK"]),
	// Picking a named piece sets its edges; editing an edge shows the matching name (or Custom).
	onParamChange: (key, value, params) => {
		if (key === "piece") {
			const named = NAMED_PIECES[(value as number) - 1];
			return named ? { ...params, ...Object.fromEntries(EDGE_KEYS.map((k, i) => [k, named.edges[i]])) } : params;
		}
		if ((EDGE_KEYS as readonly string[]).includes(key)) {
			const edges = EDGE_KEYS.map((k) => Number(params[k]));
			const match = NAMED_PIECES.findIndex((n) => n.edges.every((e, i) => e === edges[i]));
			return { ...params, piece: match + 1 } as Params;
		}
		return params as Record<string, ParamValue>;
	},
	frag: /* glsl */ `
const int CAT[${CATALOGUE.length}] = int[${CATALOGUE.length}](${CATALOGUE.join(", ")});
const ivec2 CLS[${CLASSES.length}] = ivec2[${CLASSES.length}](${CLASSES.map(([c, e]) => `ivec2(${c}, ${e})`).join(", ")});
const int CLEN[${CLASSES.length}] = int[${CLASSES.length}](${CLASS_LEN.join(", ")});

int edgeOf(int idx, int e) { int d = e == 0 ? idx : (e == 1 ? idx / 3 : (e == 2 ? idx / 9 : idx / 27)); return d - (d / 3) * 3; }
int countOf(int idx, int v) { int n = 0; for (int e = 0; e < 4; e++) if (edgeOf(idx, e) == v) n++; return n; }
bool classOk(int c, int e) { return (u_cav == 0 || c == u_cav - 1) && (u_ext == 0 || e == u_ext - 1); }
bool passes(int idx) { return classOk(countOf(idx, 1), countOf(idx, 2)) && !(u_noSquare == 1 && idx == 0); }

float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }

// One 135° break as a slab between two diagonal lines (k = x + y in mark units).
float gapSD(float k, float a, float b) { return (abs(k - (a + b) * 0.5) - (b - a) * 0.5) * 0.70710678; }

float pieceSD(vec2 p, int idx) {
  // The mark itself: exact construction (variant, radii) when the Kite gets its breaks.
  #ifdef FAST_MARK
  if (u_breaks == 1 && idx == ${LOGO_INDEX}) return markSDFast(p);
#else
  if (u_breaks == 1 && idx == ${LOGO_INDEX}) return markSD(p);
#endif
  const vec2 N[4] = vec2[4](vec2(0.0, 1.0), vec2(1.0, 0.0), vec2(0.0, -1.0), vec2(-1.0, 0.0));
  // Decode the four edges once (they were decoded again in every loop).
  ivec4 e = ivec4(edgeOf(idx, 0), edgeOf(idx, 1), edgeOf(idx, 2), edgeOf(idx, 3));
  float d = sdBox(p, vec2(0.47)) - 0.03;
  for (int i = 0; i < 4; i++) if (e[i] == 1) d = roundMax(d, -cavitySD(p, N[i], 0.18), 0.02);
  // Breaks go in the top-right corner only when neither of its edges carries an extrusion.
  if (u_breaks == 1 && e.x != 2 && e.y != 2) {
    float k = p.x + p.y;
    bool dark = u_markDark > 0.5;
    d = max(d, -gapSD(k, dark ? 0.14 : 0.16, 0.32));
    d = max(d, -gapSD(k, dark ? 0.50 : 0.52, 0.68));
  }
  for (int i = 0; i < 4; i++) if (e[i] == 2) d = smin(d, sdSegment(p, N[i] * 0.44, N[i] * 0.56) - 0.18, 0.02);
  return d;
}

// The filter keeps whole classes, so the passing pieces are runs of catalogue rows: count them once
// per pixel, then index straight into the table (the plain square is row 0's only piece).
int rowLen(int r) { return (r == 0 && u_noSquare == 1) ? 0 : CLEN[r]; }
int passingCount() {
  int n = 0;
  for (int r = 0; r < ${CLASSES.length}; r++) if (classOk(CLS[r].x, CLS[r].y)) n += rowLen(r);
  return n;
}
int nthPassing(int k, int n) {
  if (n == 0) return 0;
  k = k - (k / n) * n;
  for (int r = 0; r < ${CLASSES.length}; r++) {
    if (!classOk(CLS[r].x, CLS[r].y)) continue;
    int len = rowLen(r);
    if (k < len) return CAT[r * ${COLS} + k];
    k -= len;
  }
  return 0;
}

vec3 tone(int t) { t = t - (t / 3) * 3; return t == 0 ? u_colorA : (t == 1 ? u_colorB : u_colorC); }
vec3 pieceColor(int idx, float h, vec2 p) {
  if (u_fill == 1) return h < 0.5 ? u_colorA : u_colorB;
  if (u_fill == 2) return tone(int(h * 3.0));
  if (u_fill == 3) return tone(countOf(idx, 1));
  if (u_fill == 4) return mix(u_colorB, u_colorA, markGradT(p));
  return u_colorA;
}

// Every piece (any turn) fits in a circle of radius 0.74 around its centre, plus stroke and
// antialiasing. Neighbours whose circle misses the pixel are skipped before any hashing or SDF work.
bool outOfReach(vec2 q) { return dot(q, q) > pow(0.75 + (u_stroke + 2.0) / u_size, 2.0); }

float cov(float d) { return u_style == 1 ? fillAA(abs(d) - u_stroke * 0.5) : fillAA(d); }
void over(inout vec4 acc, vec3 c, float a) { acc.rgb += c * a * (1.0 - acc.a); acc.a += a * (1.0 - acc.a); }

vec4 run() {
  vec2 p = rot(-radians(u_rotation)) * (P() - (vec2(u_x, u_y) - 0.5) * u_comp);
  float ph = u_phase * float(u_cycles);
  vec4 acc = vec4(0.0);

  if (u_layout == 0) {
    int idx = u_top + 3 * u_right + 9 * u_bottom + 27 * u_left;
    if (u_motion == 1) idx = nthPassing(int(floor(u_phase * float(u_beats))), passingCount());
    float ang = u_motion == 2 ? smoothstep(0.2, 0.8, fract(ph)) * PI * 0.5 : 0.0;
    float shade = 1.0, alpha = 1.0, back, s;
    vec2 local = p / u_size;
    if (u_motion == 3) {
      // Flip through the filtered set: the back face is the next piece.
      float st = flipState(u_phase * float(u_beats), float(u_beats), s);
      idx = nthPassing(int(st), passingCount());
      local = flipCoords(local, s, u_axis, back, shade);
    }
    if (u_motion == 4) local -= snapBuild(vec2(0.0), fract(ph), 0.0, alpha);
    vec2 q = rot(-ang) * local;
    float d = pieceSD(q, idx) * u_size;
    return vec4(pieceColor(idx, 0.0, q) * shade, cov(d) * alpha);
  }

  float cell = u_size * u_spacing;
  vec2 g = p / cell;

  if (u_layout == 1) {
    // Catalogue: one row per class that passes the filter, centred on the layer position.
    // Rows are left-aligned like the study; the block is as wide as its longest visible row.
    int rows = 0, cols = 1;
    for (int r = 0; r < ${CLASSES.length}; r++) if (classOk(CLS[r].x, CLS[r].y)) { rows++; cols = max(cols, CLEN[r]); }
    vec2 origin = vec2(-float(cols) * 0.5 + 0.5, float(rows) * 0.5 - 0.5);
    vec2 c0 = floor(g - origin + vec2(0.5, 0.5));
    // Extrusions reach 0.74 piece-widths from the centre; at that spacing or more, cells never overlap.
    int reach = u_spacing >= 1.48 ? 0 : 1;
    for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
      if (abs(i) > reach || abs(j) > reach) continue;
      vec2 c = c0 + vec2(float(i), float(j));
      if (outOfReach((g - origin - c) * u_spacing)) continue;
      int col = int(c.x);
      int rowFromTop = int(-c.y);
      if (col < 0 || col >= ${COLS} || rowFromTop < 0 || rowFromTop >= rows) continue;
      int seen = -1, row = -1;
      for (int r = 0; r < ${CLASSES.length}; r++) { if (classOk(CLS[r].x, CLS[r].y)) { seen++; if (seen == rowFromTop) { row = r; break; } } }
      if (row < 0) continue;
      int idx = CAT[row * ${COLS} + col];
      if (idx < 0 || (u_noSquare == 1 && idx == 0)) continue;
      vec2 q = (g - origin - vec2(float(col), -float(rowFromTop))) * u_spacing;
      float h = hash12(vec2(float(idx), u_seed));
      over(acc, pieceColor(idx, h, q), cov(pieceSD(q, idx) * u_size));
    }
    return vec4(acc.a > 0.0 ? acc.rgb / acc.a : vec3(0.0), acc.a);
  }

  // Grid: every cell draws a random piece from the filter; extrusions can reach into neighbours.
  vec2 c0 = floor(g + 0.5);
  // Snapping pieces slide in from the next cell, so they need neighbours whatever the spacing.
  int reach = (u_spacing >= 1.48 && u_motion != 4) ? 0 : 1;
  int total = passingCount();
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    if (abs(i) > reach || abs(j) > reach) continue;
    vec2 c = c0 + vec2(float(i), float(j));
    if (u_motion != 4 && outOfReach((g - c) * u_spacing)) continue;
    float beat = 0.0, flipS = 0.0, shade = 1.0, alpha = 1.0, back;
    if (u_motion == 3) beat = flipState(u_phase * float(u_beats) + (c.x - c.y) * u_spread * 0.12, float(u_beats), flipS);
    if (u_motion == 1) beat = mod(floor(u_phase * float(u_beats) + hash12(c * 0.37 + u_seed) * u_spread * 0.5), float(u_beats));
    vec2 key = c + beat * 17.3;
    if (hash12(key * 3.17 + u_seed) < u_missing) continue;
    int idx = nthPassing(int(floor(hash12(key * 5.31 + u_seed) * 81.0)), total);
    float h = hash12(key + u_seed * 7.7);
    float ang = u_turns == 1 ? floor(hash12(key * 9.1 + u_seed) * 4.0) * PI * 0.5 : 0.0;
    float wave = 0.5 + 0.5 * sin(TAU * (ph - (c.x + c.y) * u_spread * 0.1));
    float sc = 1.0;
    if (u_motion == 2) {
      float turn = smoothstep(0.2, 0.8, wave) * PI * 0.5;
      ang += turn;
      sc = turnFit(turn);
    }
    vec2 local = (g - c) * u_spacing;
    if (u_motion == 3) local = flipCoords(local, flipS, u_axis, back, shade);
    if (u_motion == 4) local -= snapBuild(c * cell, fract(ph), u_spread * 0.5, alpha) * u_spacing;
    if (alpha <= 0.0) continue;
    vec2 q = rot(-ang) * local / sc;
    over(acc, pieceColor(idx, h, q) * shade, cov(pieceSD(q, idx) * u_size * sc) * alpha);
  }
  return vec4(acc.a > 0.0 ? acc.rgb / acc.a : vec3(0.0), acc.a);
}`,
};
