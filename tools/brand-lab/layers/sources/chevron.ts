import { color, cycles, float } from "../params";
import type { LayerDef } from "../types";

// Folded chevron bands: the mark's diagonal read as forward motion ("progress").
export const chevron: LayerDef = {
	type: "chevron",
	kind: "source",
	category: "pattern",
	label: "Chevron",
	icon: "ChevronsRight",
	description: "Folded zig-zag bands with fold shading",
	groups: [
		{
			title: "Bands",
			params: [
				float("angle", "Direction", -180, 180, 0, { unit: "°", step: 1, shuffle: false }),
				float("period", "Period", 12, 600, 180, { unit: "px", shuffle: [80, 260] }),
				float("duty", "Thickness", 0.05, 1, 0.5, { step: 0.01, shuffle: [0.3, 0.65] }),
			],
		},
		{
			title: "Fold",
			params: [
				float("wavelength", "Wavelength", 40, 2000, 520, { unit: "px", shuffle: [260, 900] }),
				float("amplitude", "Depth", 0, 800, 220, { unit: "px", shuffle: [80, 360] }),
				float("sharp", "Sharpness", 0, 1, 1, { step: 0.01, shuffle: [0.6, 1] }),
				float("shade", "Fold shade", 0, 1, 0.25, { step: 0.01, shuffle: [0, 0.4] }),
			],
		},
		{
			title: "Style",
			params: [color("colorA", "Colour", "$pink")],
		},
		{
			title: "Motion",
			params: [cycles(1)],
		},
	],
	frag: /* glsl */ `
vec4 run() {
  vec2 q = rot(-radians(u_angle)) * P();
  float x = q.x / u_wavelength;
  float tri = abs(fract(x) - 0.5) * 2.0;
  float sn = 0.5 + 0.5 * cos(x * TAU);
  float z = mix(sn, tri, u_sharp);
  float u = q.y + z * u_amplitude - u_phase * float(u_cycles) * u_period;
  float du = (fract(u / u_period) - 0.5) * u_period;
  float slope = u_amplitude * 2.0 / u_wavelength;
  float d = (abs(du) - u_duty * u_period * 0.5) / sqrt(1.0 + slope * slope * u_sharp);
  float side = step(0.5, fract(x));
  vec3 col = mix(u_colorA, u_colorA * (1.0 - u_shade), side);
  return vec4(col, fillAA(d));
}`,
};
