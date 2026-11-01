import { bool, color, cycles, eq, float, int, neq, on, select } from "../params";
import type { LayerDef } from "../types";

// Square grid split on the diagonal: triangle fields, diagonal line grids and cavity-arc truchets.
export const triangles: LayerDef = {
	type: "triangles",
	kind: "source",
	category: "pattern",
	label: "Triangles",
	icon: "Triangle",
	description: "Diagonal-split grid with truchet randomness",
	groups: [
		{
			title: "Grid",
			params: [
				float("size", "Cell size", 8, 600, 140, { unit: "px", shuffle: [60, 240] }),
				float("angle", "Rotation", -180, 180, 0, { unit: "°", step: 1, shuffle: false }),
				float("random", "Randomness", 0, 1, 0, { step: 0.01, shuffle: [0, 1] }),
			],
		},
		{
			title: "Style",
			params: [
				select("style", "Style", ["Triangles", "Diagonals", "Grid + diagonals", "Arcs"], 0, { shuffle: true }),
				float("line", "Line width", 0.5, 40, 1.5, { unit: "px", showIf: neq("style", 0), shuffle: [1, 8] }),
				color("colorA", "Colour", "$pink"),
				bool("twoTone", "Fill other half", false, { showIf: eq("style", 0), shuffle: true }),
				color("colorB", "Other half", "$plum", { showIf: (p) => p.style === 0 && !!p.twoTone }),
			],
		},
		{
			title: "Motion",
			params: [
				int("flips", "Flips / loop", 0, 8, 0, { shuffle: [0, 3] }),
				bool("drift", "Drift", false, { shuffle: true }),
				cycles(1, { showIf: on("drift") }),
			],
		},
	],
	frag: /* glsl */ `
vec4 run() {
  vec2 q = rot(-radians(u_angle)) * P() / u_size;
  if (u_drift == 1) q.x += u_phase * float(u_cycles);
  vec2 c = floor(q);
  vec2 f = fract(q) - 0.5;
  float h = hash12(c + u_seed * 17.0);
  float flipIdx = u_flips > 0 ? floor(fract(u_phase + h) * float(u_flips)) : 0.0;
  if (hash12(c * 1.37 + flipIdx * 7.1 + u_seed) < u_random) {
    f = rot(floor(hash12(c * 2.1 + flipIdx * 3.3 + u_seed * 5.0) * 4.0) * PI * 0.5) * f;
  }
  float diag = (f.x - f.y) * 0.70710678 * u_size;
  if (u_style == 0) {
    float cov = fillAA(-diag);
    if (u_twoTone == 1) return vec4(mix(u_colorB, u_colorA, cov), 1.0);
    return vec4(u_colorA, cov);
  }
  float d = abs(diag) - u_line * 0.5;
  if (u_style == 2) {
    vec2 g = (0.5 - abs(f)) * u_size;
    d = min(d, min(g.x, g.y) - u_line * 0.5);
  }
  if (u_style == 3) {
    float a1 = abs(length(f - vec2(-0.5, 0.5)) - 0.5);
    float a2 = abs(length(f - vec2(0.5, -0.5)) - 0.5);
    d = min(a1, a2) * u_size - u_line * 0.5;
  }
  return vec4(u_colorA, fillAA(d));
}`,
};
