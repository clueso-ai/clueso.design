import { bool, color, cycles, eq, float, int, neq, select } from "../params";
import type { LayerDef } from "../types";

// The mark's three parts (top triangle, middle slash, bottom body) as building blocks:
// pull the mark apart along its 135° breaks, tile single parts, or echo them into tunnels.
export const parts: LayerDef = {
	type: "parts",
	kind: "source",
	category: "brand",
	label: "Mark Parts",
	icon: "Split",
	description: "The logo's top, middle and bottom as building blocks",
	groups: [
		{
			title: "Parts",
			params: [
				select("layout", "Layout", ["Mark", "Grid", "Brick", "Echo"], 0, { shuffle: true }),
				bool("top", "Top", true),
				bool("middle", "Middle", true),
				bool("bottom", "Bottom", true),
				select("pick", "Each cell", ["Whole mark", "One random part", "Cycle parts"], 1, { showIf: eq("layout", 1, 2), shuffle: true }),
				float("explode", "Explode", 0, 2, 0, { step: 0.01, shuffle: false }),
			],
		},
		{
			title: "Layout",
			params: [
				float("size", "Size", 8, 4000, 520, { unit: "px", shuffle: [90, 280] }),
				float("rotation", "Rotation", -180, 180, 0, { unit: "°", step: 1, shuffle: false }),
				float("spacing", "Spacing", 0.5, 4, 1, { step: 0.01, showIf: eq("layout", 1, 2), shuffle: [1, 1.6] }),
				bool("turns", "Random turns", true, { showIf: eq("layout", 1, 2), shuffle: true }),
				float("missing", "Missing", 0, 1, 0, { step: 0.01, showIf: eq("layout", 1, 2), shuffle: [0, 0.35] }),
				int("count", "Copies", 1, 24, 8, { showIf: eq("layout", 3), shuffle: [4, 14] }),
				float("step", "Step", -400, 400, 60, { unit: "px", showIf: eq("layout", 3), shuffle: [20, 120] }),
				float("dir", "Direction", -180, 180, -45, { unit: "°", step: 1, showIf: eq("layout", 3) }),
				float("scaleStep", "Scale per copy", 0.5, 1.5, 1, { step: 0.005, showIf: eq("layout", 3), shuffle: [0.82, 1] }),
				float("turnStep", "Turn per copy", -45, 45, 0, { unit: "°", step: 0.5, showIf: eq("layout", 3) }),
				float("x", "X", 0, 1, 0.5, { step: 0.001 }),
				float("y", "Y", 0, 1, 0.5, { step: 0.001 }),
			],
		},
		{
			title: "Style",
			params: [
				select("logo", "Logo", ["Auto", "Dark mode", "Light mode"], 0),
				select("style", "Style", ["Fill", "Outline"], 0, { shuffle: [0, 1] }),
				float("stroke", "Stroke", 0.5, 40, 3, { unit: "px", showIf: eq("style", 1) }),
				select("fill", "Colour", ["Per part", "Solid", "Mark gradient", "Alternate"], 0, { shuffle: true }),
				color("colorA", "Top / primary", "$light"),
				color("colorB", "Middle", "$pink", { showIf: neq("fill", 1) }),
				color("colorC", "Bottom", "$magenta", { showIf: eq("fill", 0, 3) }),
			],
		},
		{
			title: "Motion",
			params: [
				select("motion", "Motion", ["None", "Assemble", "Flip", "Turn", "Tunnel"], 0, { shuffle: true }),
				select("axis", "Flip axis", ["Vertical", "Horizontal", "135° diagonal"], 2, { showIf: eq("motion", 2), shuffle: true }),
				float("amount", "Amount", 0, 2, 0.8, { step: 0.01, showIf: neq("motion", 0, 4) }),
				float("stagger", "Stagger", 0, 1, 0.25, { step: 0.01, showIf: neq("motion", 0, 4) }),
				cycles(1, { showIf: neq("motion", 0) }),
			],
		},
	],
	position: ["x", "y"],
	// Repeated marks read the baked logo; a single big one stays exact.
	defines: (p) => (p.layout === 0 ? [] : ["FAST_MARK"]),
	frag: /* glsl */ `
const vec2 DIAG = vec2(0.70710678, 0.70710678);

bool partOn(int i) { return i == 0 ? u_top == 1 : (i == 1 ? u_middle == 1 : u_bottom == 1); }

// Explode pushes the top out along the 135° diagonal and the bottom back, keeping the middle put.
float partOffset(int i) { return (1.0 - float(i)) * 0.32; }

// 0 = assembled, 1 = fully apart. Loops start and end assembled (the brand setup) and come apart
// only through the middle of the cycle.
float assembleT(float t) {
  t = fract(t);
  return smoothstep(0.15, 0.45, t) * (1.0 - smoothstep(0.55, 0.85, t));
}

// Signed distance (mark units) to the visible parts of one mark; writes which part is nearest.
float markParts(vec2 q, float explode, int only, float delay, out int which, out vec2 local) {
  float best = 1e9;
  which = 0;
  local = q;
  float ph = u_phase * float(u_cycles);
  for (int i = 0; i < 3; i++) {
    if (!partOn(i) || (only >= 0 && only != i)) continue;
    float e = explode;
    float d0 = delay + float(i) * u_stagger * 0.15;
    if (u_motion == 1) e += assembleT(ph - d0) * u_amount;
    vec2 lq = q - DIAG * partOffset(i) * e;
    #ifdef FAST_MARK
    float d = partSDFast(lq, i);
#else
    float d = partSD(lq, i);
#endif
    if (d < best) { best = d; which = i; local = lq; }
  }
  return best;
}

vec3 partColor(int which, vec2 local, int idx) {
  if (u_fill == 1) return u_colorA;
  if (u_fill == 2) return mix(u_colorB, u_colorA, markGradT(local));
  int k = u_fill == 0 ? which : idx;
  k = k - (k / 3) * 3;
  return k == 0 ? u_colorA : (k == 1 ? u_colorB : u_colorC);
}

// The back of a flipped mark: colours move one step along (solid swaps to the second colour).
vec3 flipColor(int which, vec2 local, int idx, float flip) {
  if (flip < 0.5) return partColor(which, local, idx);
  if (u_fill == 1) return u_colorB;
  if (u_fill == 2) return mix(u_colorA, u_colorB, markGradT(local));
  int w = which + 1;
  return partColor(w - (w / 3) * 3, local, idx + 1);
}

float coverage(float dpx) { return u_style == 1 ? fillAA(abs(dpx) - u_stroke * 0.5) : fillAA(dpx); }

vec4 run() {
  vec2 p = rot(-radians(u_rotation)) * (P() - (vec2(u_x, u_y) - 0.5) * u_comp);
  float ph = u_phase * float(u_cycles);
  int which;
  vec2 local;

  if (u_layout == 0) {
    vec2 q = p / u_size;
    float shade = 1.0, back = 0.0, s = 0.0, flip = 0.0;
    if (u_motion == 2) {
      flip = mod(flipState(ph * 2.0, max(float(u_cycles) * 2.0, 1.0), s), 2.0);
      q = flipCoords(q, s, u_axis, back, shade);
    }
    float d = markParts(q, u_explode, -1, 0.0, which, local) * u_size;
    return vec4(flipColor(which, local, which, flip) * shade, coverage(d));
  }

  if (u_layout == 3) {
    // Echo: copies stepped along a direction, scaled and turned; the front copy is drawn on top.
    // Tunnel moves every copy one step forward per cycle: the front one grows and fades out while a
    // new one fades in at the back, so the loop is seamless.
    vec2 dir = vec2(cos(radians(u_dir)), sin(radians(u_dir)));
    float shift = u_motion == 4 ? fract(ph) : 0.0;
    vec4 acc = vec4(0.0);
    for (int i = 0; i < 25; i++) {
      if (i > u_count) break;
      float k = float(i) - shift;
      float fade = clamp(min(1.0 + k, float(u_count) - k), 0.0, 1.0);
      if (fade <= 0.0) continue;
      float sc = pow(u_scaleStep, k);
      vec2 q = rot(radians(u_turnStep) * k) * (p - dir * u_step * k) / (u_size * sc);
      float d = markParts(q, u_explode, -1, k * 0.1, which, local) * u_size * sc;
      float cov = coverage(d) * fade;
      vec3 col = partColor(which, local, u_fill == 3 ? i : which);
      if (u_fill == 3 && u_motion == 4) col = mix(u_colorA, u_colorC, clamp(k / max(float(u_count) - 1.0, 1.0), 0.0, 1.0));
      acc.rgb = acc.rgb + col * cov * (1.0 - acc.a);
      acc.a = acc.a + cov * (1.0 - acc.a);
    }
    return vec4(acc.a > 0.0 ? acc.rgb / acc.a : vec3(0.0), acc.a);
  }

  // Grid / brick of marks or single parts.
  float cell = u_size * u_spacing;
  vec2 g = p / cell;
  vec4 acc = vec4(0.0);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      float row = floor(g.y + 0.5) + float(j);
      float off = u_layout == 2 ? mod(row, 2.0) * 0.5 : 0.0;
      vec2 c = vec2(floor(g.x - off + 0.5) + float(i), row);
      // Skip neighbours that can't reach this pixel: the mark's half-diagonal plus how far
      // explode and motion can push its parts, plus stroke and antialiasing.
      float reachR = 0.71 + 0.32 * (u_explode + u_amount) + (u_stroke + 2.0) / u_size;
      vec2 dq = (p - (c + vec2(off, 0.0)) * cell) / u_size;
      if (dot(dq, dq) > reachR * reachR) continue;
      if (hash12(c * 3.3 + u_seed) < u_missing) continue;
      float h = hash12(c * 1.91 + u_seed);
      int only = -1;
      if (u_pick == 1) only = int(floor(h * 3.0));
      if (u_pick == 2) { int s = int(mod(c.x + c.y * 2.0, 3.0)); only = s; }
      if (only >= 0 && !partOn(only)) {
        // fall back to the next enabled part so disabling one never leaves holes in the rhythm
        for (int t = 1; t < 3; t++) { int o = only + t; o = o - (o / 3) * 3; if (partOn(o)) { only = o; break; } }
      }
      float ang = u_turns == 1 ? floor(hash12(c * 7.7 + u_seed) * 4.0) * PI * 0.5 : 0.0;
      float delay = (c.x + c.y) * u_stagger * 0.12;
      float sc = 1.0, shade = 1.0, back = 0.0, s = 0.0, flip = 0.0;
      if (u_motion == 3) {
        float turn = smoothstep(0.2, 0.8, 0.5 - 0.5 * cos(TAU * (ph - delay))) * PI * 0.5 * floor(1.0 + u_amount * 1.99);
        ang += turn;
        sc = turnFit(turn);
      }
      vec2 cellLocal = (p - (c + vec2(off, 0.0)) * cell) / u_size;
      if (u_motion == 2) {
        // Staggered along the 135° diagonal; the back face is the next part (or the next colour).
        flip = mod(flipState(ph * 2.0 + (c.x - c.y) * u_stagger * 0.12, max(float(u_cycles) * 2.0, 1.0), s), 2.0);
        cellLocal = flipCoords(cellLocal, s, u_axis, back, shade);
        if (flip > 0.5 && only >= 0) { for (int t = 1; t < 3; t++) { int o = only + t; o = o - (o / 3) * 3; if (partOn(o)) { only = o; break; } } }
      }
      vec2 q = rot(-ang) * cellLocal / sc;
      float d = markParts(q, u_explode, only, delay, which, local) * u_size * sc;
      float cov = coverage(d);
      if (cov <= 0.0) continue;
      int idx = u_fill == 3 ? int(floor(h * 17.0)) : which;
      vec3 col = flipColor(which, local, idx, only >= 0 ? 0.0 : flip) * shade;
      acc.rgb = acc.rgb + col * cov * (1.0 - acc.a);
      acc.a = acc.a + cov * (1.0 - acc.a);
    }
  }
  return vec4(acc.a > 0.0 ? acc.rgb / acc.a : vec3(0.0), acc.a);
}`,
};
