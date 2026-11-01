import { color, cycles, eq, float, int, neq, select } from "../params";
import type { LayerDef } from "../types";

// Illustrations made of brand blocks: the mark, its three parts, cavities, squares and slashes
// arranged into blooms, sunflowers, bursts and orbits. Softness turns the same forms into glowing
// blobs that Glyphs, Dot Matrix or Blur can reinterpret.
export const forms: LayerDef = {
	type: "forms",
	kind: "source",
	category: "brand",
	label: "Forms",
	icon: "Flower",
	description: "Flowers, bursts and orbits built from the mark, its parts and brand shapes",
	groups: [
		{
			title: "Form",
			params: [
				select("arrange", "Arrangement", ["Bloom", "Sunflower", "Burst", "Orbit"], 0, { shuffle: true }),
				select("block", "Block", ["Mark", "Top part", "Middle part", "Bottom part", "Circle", "Square", "Slash"], 1, { shuffle: true }),
				int("count", "Per ring", 3, 36, 8, { shuffle: [5, 12] }),
				int("rings", "Rings", 1, 6, 3, { shuffle: [1, 4] }),
				float("blockScale", "Block size", 0.05, 1.2, 0.36, { step: 0.01, shuffle: [0.2, 0.5] }),
				float("inner", "Inner radius", 0, 0.9, 0.2, { step: 0.01, shuffle: [0.05, 0.4] }),
				float("twist", "Twist", -180, 180, 0, { unit: "°", step: 1, shuffle: [-40, 40] }),
				select("orient", "Blocks face", ["Outward", "Inward", "Along the ring", "Upright"], 0, { shuffle: true }),
			],
		},
		{
			title: "Layout",
			params: [
				float("size", "Size", 60, 4000, 900, { unit: "px", shuffle: [600, 1100] }),
				float("rotation", "Rotation", -180, 180, 0, { unit: "°", step: 1, shuffle: false }),
				float("x", "X", 0, 1, 0.5, { step: 0.001 }),
				float("y", "Y", 0, 1, 0.5, { step: 0.001 }),
			],
		},
		{
			title: "Style",
			params: [
				select("logo", "Logo", ["Auto", "Dark mode", "Light mode"], 0),
				float("soft", "Softness", 0, 1, 0, { step: 0.01, shuffle: [0, 0.4] }),
				select("fill", "Colour", ["By ring", "Around", "Solid", "Per part"], 0, { shuffle: true }),
				color("colorA", "Inner / primary", "$light"),
				color("colorB", "Middle", "$pink", { showIf: neq("fill", 2) }),
				color("colorC", "Outer", "$magenta", { showIf: neq("fill", 2) }),
			],
		},
		{
			title: "Motion",
			params: [
				select("motion", "Motion", ["None", "Rotate", "Unfold", "Snap build"], 0, { shuffle: true }),
				select("axis", "Flip axis", ["Vertical", "Horizontal", "135° diagonal"], 2, { showIf: eq("motion", 2) }),
				float("stagger", "Stagger", 0, 1, 0.5, { step: 0.01, showIf: eq("motion", 2, 3) }),
				cycles(1, { showIf: neq("motion", 0) }),
			],
		},
	],
	position: ["x", "y"],
	frag: /* glsl */ `
vec3 ramp3(float t) {
  t = clamp(t, 0.0, 1.0);
  return t < 0.5 ? mix(u_colorA, u_colorB, t * 2.0) : mix(u_colorB, u_colorC, t * 2.0 - 1.0);
}

// Block distance in block units (the block spans -0.5..0.5); writes which mark part is nearest.
float blockSD(vec2 q, out int part) {
  part = 0;
  if (u_block == 0) {
    float a = partSDFast(q, 0), b = partSDFast(q, 1), c = partSDFast(q, 2);
    part = a < b ? (a < c ? 0 : 2) : (b < c ? 1 : 2);
    return min(min(a, b), c);
  }
  if (u_block <= 3) { part = u_block - 1; return partSDFast(q, part); }
  if (u_block == 4) return length(q) - 0.5;
  if (u_block == 5) return sdBox(q, vec2(0.47)) - 0.03;
  return sdSegment(q, vec2(-0.38, 0.38), vec2(0.38, -0.38)) - 0.12;
}

// Instance j: centre (px, from the form centre), block angle, block size (px), colour position and
// build order (0..1). Returns false past the last instance.
bool instance(int j, float R, float spin, out vec2 c, out float ang, out float bs, out float t, out float order) {
  int n = u_count;
  int rings = u_rings;
  float base = u_size * u_blockScale;
  float theta;
  if (u_arrange == 1) {
    // Sunflower: golden-angle phyllotaxis, small at the heart, larger towards the rim.
    int total = min(n * rings * 2, 216);
    if (j >= total) return false;
    float k = (float(j) + 0.5) / float(total);
    float r = R * mix(u_inner * 0.5, 0.95, sqrt(k));
    theta = float(j) * 2.39996323 + radians(u_twist) * sqrt(k) * 4.0 + spin * TAU;
    c = vec2(cos(theta), sin(theta)) * r;
    bs = base * 0.42 * mix(0.35, 1.0, sqrt(k));
    t = k;
    order = k;
  } else {
    if (j >= n * rings) return false;
    int kr = j / n;
    int i = j - kr * n;
    float rt = rings > 1 ? float(kr) / float(rings - 1) : 1.0;
    float step_ = TAU / float(n);
    float dir = 1.0;
    float r;
    if (u_arrange == 0) {
      // Bloom: petals in rings, each ring half a step round and larger, inner rings on top.
      r = R * mix(u_inner, 0.6, rt);
      theta = (float(i) + 0.5 * float(kr)) * step_ + radians(u_twist) * float(kr);
      bs = base * mix(0.55, 1.0, rt);
    } else if (u_arrange == 2) {
      // Burst: spokes, blocks growing outwards; twist curves the spokes.
      r = R * mix(u_inner, 1.0, rt) * 0.9;
      theta = float(i) * step_ + radians(u_twist) * rt;
      bs = base * 0.55 * mix(0.35, 1.0, rt);
    } else {
      // Orbit: concentric rings turning alternately.
      r = R * mix(u_inner, 1.0, rt) * 0.88;
      theta = (float(i) + 0.5 * float(kr)) * step_ + radians(u_twist) * float(kr);
      bs = base * 0.4;
      dir = mod(float(kr), 2.0) == 0.0 ? 1.0 : -1.0;
    }
    theta += spin * step_ * dir;
    c = vec2(cos(theta), sin(theta)) * r;
    t = u_fill == 1 ? fract(theta / TAU + 1.0) : rt;
    order = (float(kr) + float(i) / float(n)) / float(rings);
  }
  if (u_fill == 1 && u_arrange == 1) t = fract(theta / TAU);
  if (u_orient == 0) ang = theta - PI * 0.5;
  else if (u_orient == 1) ang = theta + PI * 0.5;
  else if (u_orient == 2) ang = theta;
  else ang = 0.0;
  return true;
}

vec4 run() {
  vec2 p = rot(-radians(u_rotation)) * (P() - (vec2(u_x, u_y) - 0.5) * u_comp);
  float R = u_size * 0.5;
  float ph = u_phase * float(u_cycles);
  float spin = u_motion == 1 ? ph : 0.0;
  float aa = u_comp.x / u_res.x;
  vec4 acc = vec4(0.0);
  for (int j = 0; j < 216; j++) {
    vec2 c; float ang, bs, t, order;
    if (!instance(j, R, spin, c, ang, bs, t, order)) break;
    float softPx = u_soft * bs * 0.45;
    vec2 d0 = p - c;
    float reach = bs * 0.72 + softPx + 2.0 * aa;
    if (dot(d0, d0) > reach * reach) continue;

    vec2 q = rot(-ang) * d0 / bs;
    float alpha = 1.0, shade = 1.0, back = 0.0, s = 0.0, flip = 0.0, sc = 1.0;
    if (u_motion == 2) {
      flip = mod(flipState(ph * 2.0 + order * u_stagger * 2.0, max(float(u_cycles) * 2.0, 1.0), s), 2.0);
      q = flipCoords(q, s, u_axis, back, shade);
    } else if (u_motion == 3) {
      // Blocks snap in one after another in build order, hold, then clear the same way.
      float tt = fract(ph);
      float arrive = order * mix(0.2, 0.6, u_stagger);
      float tin = clamp((tt - arrive) / 0.08, 0.0, 1.0);
      float tout = clamp((tt - 0.82 - order * 0.12) / 0.05, 0.0, 1.0);
      sc = max(easeSnap(tin) * (1.0 - tout), 1e-3);
      alpha = smoothstep(0.0, 0.3, tin) * (1.0 - tout);
      q /= sc;
    }
    int part;
    float d = blockSD(q, part) * bs * sc;
    d += (1.0 - alpha) * bs;
    float cov = softPx > 0.0 ? 1.0 - smoothstep(-softPx, softPx + aa, d) : fillAA(d);
    cov *= alpha;
    if (cov <= 0.0) continue;
    vec3 col;
    if (u_fill == 2) col = flip > 0.5 ? u_colorB : u_colorA;
    else if (u_fill == 3) {
      int k = u_block == 0 ? part : j;
      k = (k + int(flip)) - ((k + int(flip)) / 3) * 3;
      col = k == 0 ? u_colorA : (k == 1 ? u_colorB : u_colorC);
    } else col = ramp3(flip > 0.5 ? fract(t + 0.5) : t);
    col *= shade;
    acc.rgb += col * cov * (1.0 - acc.a);
    acc.a += cov * (1.0 - acc.a);
    if (acc.a > 0.995) break;
  }
  return vec4(acc.a > 0.0 ? acc.rgb / acc.a : vec3(0.0), acc.a);
}`,
};
