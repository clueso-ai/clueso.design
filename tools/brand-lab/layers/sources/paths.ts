import { color, cycles, eq, float, neq, select } from "../params";
import type { LayerDef } from "../types";

// Truchet tiles: every cell joins its edge midpoints with two curves (the cavity's quarter arcs) or two
// 45° cuts (the mark's visual breaks), turned at random, so the lines link up into endless paths.
// Flip turns each tile a quarter at a time; tiles always meet at their midpoints, so paths stay joined.
export const paths: LayerDef = {
	type: "paths",
	kind: "source",
	category: "pattern",
	label: "Paths",
	icon: "Paths",
	description: "Tiles of arcs or 45° cuts that link into endless winding paths",
	groups: [
		{
			title: "Tiles",
			params: [
				select("shape", "Shape", ["Arcs", "45° cuts"], 0, { shuffle: true }),
				float("cell", "Tile size", 8, 600, 120, { unit: "px", shuffle: [50, 220] }),
				float("angle", "Angle", -180, 180, 0, { unit: "°", step: 1, shuffle: false }),
			],
		},
		{
			title: "Style",
			params: [
				select("fill", "Fill", ["Lines", "Two colours"], 0, { shuffle: true }),
				float("weight", "Thickness", 0.01, 0.5, 0.18, { step: 0.005, showIf: eq("fill", 0), shuffle: [0.06, 0.3] }),
				color("colorA", "Colour", "$pink"),
				color("colorB", "Second colour", "$plum", { showIf: eq("fill", 1) }),
			],
		},
		{
			title: "Motion",
			params: [select("motion", "Motion", ["None", "Flip"], 1, { shuffle: true }), cycles(1, { showIf: neq("motion", 0) })],
		},
	],
	covers: (p) => p.fill === 1,
	seeThrough: { fill: 0 },
	frag: /* glsl */ `
vec4 run() {
  vec2 p = rot(-radians(u_angle)) * P() / u_cell;
  vec2 cell = floor(p);
  vec2 f = fract(p) - 0.5;
  // Quarter turns so far: a random start, plus two turns per cycle at each tile's own moment.
  float turns = step(0.5, hash12(cell + u_seed * 17.0));
  if (u_motion == 1 && u_cycles > 0) {
    float t = fract(u_phase * float(u_cycles));
    float t0 = hash12(cell * 1.7 + 3.1 + u_seed) * 0.3;
    turns += smoothstep(t0, t0 + 0.2, t) + smoothstep(t0 + 0.5, t0 + 0.7, t);
  }
  // A quarter turn is the mirrored tile, so draw the nearest whole turn mirrored and the rest as a slight turn.
  float whole = floor(turns + 0.5);
  f = rot(-(turns - whole) * PI * 0.5) * f;
  bool flip = mod(whole, 2.0) > 0.5;
  if (flip) f.x = -f.x;
  float d1, d2;
  if (u_shape == 0) {
    d1 = length(f - 0.5) - 0.5;
    d2 = length(f + 0.5) - 0.5;
  } else {
    d1 = (0.5 - (f.x + f.y)) * 0.70710678;
    d2 = (0.5 + (f.x + f.y)) * 0.70710678;
  }
  float ld = min(abs(d1), abs(d2)) * u_cell;
  if (u_fill == 0) return vec4(u_colorA, fillAA(ld - u_weight * u_cell * 0.5));
  // Two colours: the corner pieces and the band between them swap colour on a checkerboard, so
  // neighbouring regions always differ.
  bool inside = d1 < 0.0 || d2 < 0.0;
  bool parity = (mod(cell.x + cell.y, 2.0) > 0.5) != flip;
  float k = fillAA(inside ? -ld : ld);
  vec3 inC = parity ? u_colorA : u_colorB;
  vec3 outC = parity ? u_colorB : u_colorA;
  return vec4(mix(outC, inC, k), 1.0);
}`,
};
