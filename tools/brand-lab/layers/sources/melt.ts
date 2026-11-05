import { color, cycles, eq, float, select } from "../params";
import type { LayerDef } from "../types";

// The mark's three parts drift apart and melt into each other like liquid, then settle back into the
// exact logo at the start of every loop. Still (0 cycles), it holds the melt at its set amount.
export const melt: LayerDef = {
	type: "melt",
	kind: "source",
	category: "brand",
	label: "Melt",
	icon: "Melt",
	description: "The mark goes liquid, then snaps back to the logo every loop",
	groups: [
		{
			title: "Layout",
			params: [
				float("size", "Size", 8, 3000, 420, { unit: "px", shuffle: [200, 700] }),
				float("rotation", "Rotation", -180, 180, 0, { unit: "°", step: 1, shuffle: false }),
				float("x", "X", 0, 1, 0.5, { step: 0.001 }),
				float("y", "Y", 0, 1, 0.5, { step: 0.001 }),
			],
		},
		{
			title: "Melt",
			params: [
				float("amount", "Melt", 0, 1, 0.6, { step: 0.01, shuffle: [0.3, 0.9] }),
				float("drift", "Drift apart", 0, 1, 0.4, { step: 0.01, shuffle: [0.1, 0.8] }),
				float("wobble", "Wobble", 0, 1, 0.3, { step: 0.01, shuffle: [0, 0.6] }),
			],
		},
		{
			title: "Style",
			params: [
				select("logo", "Logo", ["Auto", "Dark mode", "Light mode"], 0),
				select("style", "Style", ["Fill", "Outline"], 0, { shuffle: true }),
				float("stroke", "Stroke", 0.5, 40, 3, { unit: "px", showIf: eq("style", 1) }),
				select("fill", "Fill", ["Solid", "Mark gradient"], 1, { shuffle: true }),
				color("colorA", "Primary", "$magenta"),
				color("colorB", "Highlight", "$light", { showIf: eq("fill", 1) }),
			],
		},
		{ title: "Motion", params: [cycles(1)] },
	],
	position: ["x", "y"],
	frag: /* glsl */ `
float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }

vec4 run() {
  vec2 q = rot(-radians(u_rotation)) * (P() - (vec2(u_x, u_y) - 0.5) * u_comp) / u_size;
  float cyc = float(u_cycles);
  // How melted: none at the loop's start and end (the exact logo), most at its middle.
  float m = u_amount;
  if (u_cycles > 0) m *= smoothstep(0.0, 1.0, 1.0 - abs(fract(u_phase * cyc) * 2.0 - 1.0));
  // A slow liquid wobble that loops with the timeline.
  vec2 w = vec2(noise(loopP(q * 2.5, 0.6, cyc) + vec3(0.0, 0.0, u_seed)), noise(loopP(q * 2.5 + 7.3, 0.6, cyc) + vec3(0.0, 0.0, u_seed))) - 0.5;
  vec2 qw = q + w * u_wobble * m * 0.6;
  // The top corner and the body drift apart along the diagonal; the slash slides across it.
  vec2 diag = vec2(0.70710678);
  float dr = u_drift * m * 0.3;
  float sway = sin(TAU * u_phase * max(cyc, 1.0));
  float a = partSD(qw - diag * dr, 0);
  float b = partSD(qw - vec2(-diag.y, diag.x) * dr * 0.5 * sway, 1);
  float c = partSD(qw + diag * dr, 2);
  float k = max(m * 0.2, 1e-4);
  float d = smin(smin(a, b, k), c, k) * u_size;
  float cov = u_style == 0 ? fillAA(d) : fillAA(abs(d) - u_stroke * 0.5);
  vec3 col = u_fill == 1 ? mix(u_colorB, u_colorA, markGradT(q)) : u_colorA;
  return vec4(col, cov);
}`,
};
