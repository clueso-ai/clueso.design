import { bool, color, cycles, eq, float, int, neq, select } from "../params";
import type { LayerDef } from "../types";

/** Shape vocabulary, in shader order. Each one has an on/off toggle; cells pick among the enabled ones. */
export const MODULES = [
	{ key: "mSquare", label: "Square" },
	{ key: "mCavity", label: "Cavity" },
	{ key: "mSemi", label: "Semicircle" },
	{ key: "mQuarter", label: "Quarter circle" },
	{ key: "mCircle", label: "Circle" },
	{ key: "mSlash", label: "135° slashes" },
	{ key: "mHLines", label: "Horizontal lines" },
	{ key: "mVLines", label: "Vertical lines" },
	{ key: "mTriangle", label: "Corner triangle" },
	{ key: "mPart", label: "Mark part" },
	{ key: "mPlug", label: "Cavity + plug" },
] as const;

const ON_BY_DEFAULT = new Set(["mSquare", "mCavity", "mSemi", "mQuarter", "mSlash", "mHLines", "mPlug"]);

// A tile system from the brand's shape language: squares, the mark's circular cavities and their
// semicircle plugs, quarter circles, 135° slashes and straight line fills. Cells turn in quarter
// steps, and plugs slide in and out of their cavities like puzzle pieces.
export const modules: LayerDef = {
	type: "modules",
	kind: "source",
	category: "brand",
	label: "Modules",
	icon: "LayoutGrid",
	description: "Squares, cavities, semicircles, slashes and lines on a grid",
	groups: [
		{
			title: "Grid",
			params: [
				float("size", "Cell size", 16, 1200, 180, { unit: "px", shuffle: [90, 260] }),
				float("gap", "Gap", 0, 80, 8, { unit: "px", shuffle: [0, 16] }),
				float("angle", "Rotation", -180, 180, 0, { unit: "°", step: 1, shuffle: false }),
				float("missing", "Empty cells", 0, 1, 0.1, { step: 0.01, shuffle: [0, 0.3] }),
				bool("turns", "Random turns", true, { shuffle: true }),
				bool("tiles", "Tile backgrounds", false, { shuffle: true }),
			],
		},
		{
			title: "Shapes",
			params: MODULES.map((m) => bool(m.key, m.label, ON_BY_DEFAULT.has(m.key), { shuffle: true })),
		},
		{
			title: "Detail",
			params: [
				int("lines", "Lines per cell", 1, 16, 4, { shuffle: [2, 6] }),
				float("weight", "Line weight", 0.5, 60, 10, { unit: "px", shuffle: [4, 16] }),
				float("radius", "Cavity radius", 0.08, 0.45, 0.18, { step: 0.005, shuffle: [0.18, 0.3] }),
			],
		},
		{
			title: "Style",
			params: [
				select("style", "Style", ["Fill", "Outline"], 0, { shuffle: [0, 0] }),
				float("stroke", "Stroke", 0.5, 24, 2, { unit: "px", showIf: eq("style", 1) }),
				select("fill", "Colour", ["Solid", "Two-tone", "Three-tone", "By shape"], 2, { shuffle: true }),
				color("colorA", "Primary", "$pink"),
				color("colorB", "Secondary", "$light", { showIf: neq("fill", 0) }),
				color("colorC", "Tertiary", "$magenta", { showIf: eq("fill", 2, 3) }),
				color("tileColor", "Tile", "$plum", { showIf: (p) => !!p.tiles }),
			],
		},
		{
			title: "Motion",
			params: [
				select("motion", "Motion", ["None", "Turn", "Re-roll", "Plug fit", "Flip", "Snap build"], 4, { shuffle: true }),
				select("axis", "Flip axis", ["Vertical", "Horizontal", "135° diagonal"], 2, { showIf: eq("motion", 4), shuffle: true }),
				float("amount", "Amount", 0, 1, 0.6, { step: 0.01, showIf: eq("motion", 1, 3) }),
				float("spread", "Stagger", 0, 2, 0.4, { step: 0.01, showIf: neq("motion", 0) }),
				int("beats", "Changes / loop", 1, 24, 4, { showIf: eq("motion", 2, 4), shuffle: [2, 6] }),
				cycles(1, { showIf: eq("motion", 1, 3, 5) }),
			],
		},
	],
	frag: /* glsl */ `
// Enabled shapes as a bit mask, built once per pixel rather than per neighbour cell.
int enabledMask() {
  int mask = 0;
  ${MODULES.map((m, i) => `if (u_${m.key} == 1) mask |= ${1 << i};`).join("\n  ")}
  return mask == 0 ? 1 : mask;
}

int pickModule(float h, int mask, int n) {
  int k = min(int(floor(h * float(n))), n - 1);
  for (int m = 0; m < ${MODULES.length}; m++) {
    if ((mask & (1 << m)) == 0) continue;
    if (k == 0) return m;
    k--;
  }
  return 0;
}

// Line fills ignore random turns: slashes stay at 135°, horizontals stay horizontal.
bool isLines(int m) { return m == 5 || m == 6 || m == 7; }

float lineSD(float k, float period) { return abs(mod(k, period) - period * 0.5); }

// Distances in px. p is cell-local in [-0.5, 0.5]^2 (after turns); plug gets the plug piece or 1e9.
float moduleSD(int m, vec2 p, float h, float slide, out float plug) {
  plug = 1e9;
  float S = u_size;
  float box = sdBox(p, vec2(0.5)) * S + u_gap * 0.5;
  float n = float(u_lines);
  float w = u_weight * 0.5;
  float r = u_radius;
  if (m == 0) return box;
  if (m == 1 || m == 10) {
    float d = roundMax(sdBox(p, vec2(0.5)), -cavitySD(p, vec2(0.0, -1.0), r), 0.02) * S + u_gap * 0.5;
    if (m == 10) {
      vec2 pp = p - vec2(0.0, -1.0) * slide;
      plug = max(cavitySD(pp, vec2(0.0, -1.0), r), sdBox(pp, vec2(0.5))) * S + u_gap * 0.5;
    }
    return d;
  }
  if (m == 2) return max(length(p - vec2(0.0, -0.5)) - 0.5, sdBox(p, vec2(0.5))) * S + u_gap * 0.5;
  if (m == 3) return max(length(p + 0.5) - 1.0, sdBox(p, vec2(0.5))) * S + u_gap * 0.5;
  if (m == 4) return (length(p) - 0.5) * S + u_gap * 0.5;
  if (m == 5) {
    float s = 1.41421356 / n;
    return max(lineSD((p.x + p.y) * 0.70710678 + 0.70710678, s) * S - w, box);
  }
  if (m == 6) return max(lineSD(p.y + 0.5, 1.0 / n) * S - w, box);
  if (m == 7) return max(lineSD(p.x + 0.5, 1.0 / n) * S - w, box);
  if (m == 8) return max(-(p.x + p.y) * 0.70710678, sdBox(p, vec2(0.5))) * S + u_gap * 0.5;
  return partSDFast(p, int(floor(h * 3.0))) * S + u_gap * 0.5;
}

vec3 tone(int k) { k = k - (k / 3) * 3; return k == 0 ? u_colorA : (k == 1 ? u_colorB : u_colorC); }

float cov(float d) { return u_style == 1 ? fillAA(abs(d) - u_stroke * 0.5) : fillAA(d); }

void over(inout vec4 acc, vec3 c, float a) {
  acc.rgb += c * a * (1.0 - acc.a);
  acc.a += a * (1.0 - acc.a);
}

vec4 run() {
  vec2 q = rot(-radians(u_angle)) * P() / u_size;
  vec2 c0 = floor(q + 0.5);
  float ph = u_phase * float(u_cycles);
  vec4 acc = vec4(0.0);
  int mask = enabledMask();
  int count = 0;
  for (int m = 0; m < ${MODULES.length}; m++) if ((mask & (1 << m)) != 0) count++;
  // Shapes stay inside their cell (turns shrink to fit, flips squash in place); only sliding plugs
  // and snapping tiles cross into a neighbour.
  int reach = (u_motion == 3 || u_motion == 5) ? 1 : 0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      if (abs(i) > reach || abs(j) > reach) continue;
      vec2 c = c0 + vec2(float(i), float(j));
      float delay = (c.x + c.y) * u_spread * 0.1;
      float hBase = hash12(c * 1.37 + u_seed);
      // Re-roll: every beat (staggered per cell) the cell picks again; the beat index wraps with the loop.
      float beat = 0.0, grow = 1.0, flipS = 0.0;
      if (u_motion == 4) beat = flipState(u_phase * float(u_beats) + (c.x - c.y) * u_spread * 0.12, float(u_beats), flipS);
      if (u_motion == 2) {
        float b = u_phase * float(u_beats) + fract(hBase * 7.3) * u_spread * 0.5;
        beat = mod(floor(b), float(u_beats));
        grow = smoothstep(0.0, 0.18, fract(b));
      }
      vec2 key = c + beat * 31.7;
      if (hash12(key * 3.17 + u_seed * 1.3) < u_missing) continue;
      float h = hash12(key + u_seed * 13.7);
      int m = pickModule(hash12(key * 5.31 + u_seed), mask, count);
      float wave = 0.5 + 0.5 * sin(TAU * (ph - delay));
      float ang = (u_turns == 1 && !isLines(m)) ? floor(hash12(key * 7.7 + u_seed) * 4.0) * PI * 0.5 : 0.0;
      float sc = grow;
      float slide = 0.0, shade = 1.0, alpha = 1.0, back;
      vec2 local = q - c;
      if (u_motion == 1) {
        float turn = smoothstep(0.15, 0.85, wave) * PI * (isLines(m) ? 1.0 : 0.5) * floor(1.0 + u_amount * 1.99);
        ang += turn;
        sc *= turnFit(turn);
      }
      if (u_motion == 3) slide = pow(1.0 - wave, 2.0) * u_amount * 0.9;
      if (u_motion == 4) local = flipCoords(local, flipS, u_axis, back, shade);
      if (u_motion == 5) local -= snapBuild((c + 0.0) * u_size, fract(ph), u_spread * 0.5, alpha);
      if (sc <= 0.001 || alpha <= 0.0) continue;
      vec2 p = rot(-ang) * local / sc;
      float plug;
      float d = moduleSD(m, p, h, slide, plug) * sc;
      plug *= sc;
      int t = u_fill == 0 ? 0 : (u_fill == 1 ? int(h * 2.0) : (u_fill == 2 ? int(h * 3.0) : m));
      // The plug always contrasts with its cavity piece.
      int pt = u_fill == 0 ? 1 : (u_fill == 1 ? 1 - t : t + 1);
      if (m == 10) over(acc, tone(pt) * shade, cov(plug) * alpha);
      over(acc, tone(t) * shade, cov(d) * alpha);
    }
  }
  if (u_tiles == 1) over(acc, u_tileColor, fillAA(sdBox(q - c0, vec2(0.5)) * u_size + u_gap * 0.5));
  return vec4(acc.a > 0.0 ? acc.rgb / acc.a : vec3(0.0), acc.a);
}`,
};
