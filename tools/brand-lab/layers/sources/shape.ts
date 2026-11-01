import { color, eq, float, select } from "../params";
import type { LayerDef } from "../types";

// Layout primitive for posters and frames. Chamfers are 45°, echoing the mark's cuts.
export const shape: LayerDef = {
	type: "shape",
	kind: "source",
	category: "content",
	label: "Shape",
	icon: "Square",
	description: "Rectangle, ellipse or mark-style piece for layouts",
	groups: [
		{
			title: "Shape",
			params: [
				select("shape", "Type", ["Rectangle", "Ellipse", "Puzzle piece"], 0),
				float("w", "Width", 0, 1.5, 0.5, { step: 0.001 }),
				float("h", "Height", 0, 1.5, 0.5, { step: 0.001, showIf: eq("shape", 0, 1) }),
				float("radius", "Corner radius", 0, 400, 0, { unit: "px", showIf: eq("shape", 0) }),
				float("chamfer", "Chamfer", 0, 400, 0, { unit: "px", showIf: eq("shape", 0) }),
				float("rotation", "Rotation", -180, 180, 0, { unit: "°", step: 1 }),
				float("x", "X", 0, 1, 0.5, { step: 0.001 }),
				float("y", "Y", 0, 1, 0.5, { step: 0.001 }),
			],
		},
		{
			title: "Style",
			params: [
				select("style", "Style", ["Fill", "Outline"], 0),
				float("stroke", "Stroke", 0.5, 40, 2, { unit: "px", showIf: eq("style", 1) }),
				color("color", "Colour", "$paper"),
			],
		},
	],
	position: ["x", "y"],
	frag: /* glsl */ `
float pieceSD(vec2 p) {
  float d = sdBox(p, vec2(0.47)) - 0.03;
  d = max(d, -(sdSegment(p, vec2(0.0, -0.44), vec2(0.0, -0.9)) - 0.18));
  d = max(d, -(sdSegment(p, vec2(-0.44, 0.0), vec2(-0.9, 0.0)) - 0.18));
  return d;
}

vec4 run() {
  vec2 p = rot(-radians(u_rotation)) * (P() - (vec2(u_x, u_y) - 0.5) * u_comp);
  vec2 b = vec2(u_w, u_h) * u_comp * 0.5;
  float d;
  if (u_shape == 0) {
    float r = min(u_radius, min(b.x, b.y));
    d = sdBox(p, b - r) - r;
    if (u_chamfer > 0.0) d = max(d, (abs(p.x) + abs(p.y) - (b.x + b.y - u_chamfer)) * 0.70710678);
  } else if (u_shape == 1) {
    vec2 q = p / max(b, vec2(1.0));
    d = (length(q) - 1.0) * min(b.x, b.y);
  } else {
    float s = u_w * u_comp.x;
    d = pieceSD(p / s) * s;
  }
  if (u_style == 1) d = abs(d) - u_stroke * 0.5;
  return vec4(u_color, fillAA(d));
}`,
};
