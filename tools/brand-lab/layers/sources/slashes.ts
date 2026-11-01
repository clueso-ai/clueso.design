import { bool, color, cycles, eq, float, on, select } from "../params";
import type { LayerDef } from "../types";

// The mark's 45° visual breaks, repeated: stripes, staggered segments and stepped lines.
export const slashes: LayerDef = {
	type: "slashes",
	kind: "source",
	category: "pattern",
	label: "Slashes",
	icon: "Slash",
	description: "45° bands and segments from the mark's visual breaks",
	groups: [
		{
			title: "Bands",
			params: [
				float("angle", "Angle", -180, 180, 45, { unit: "°", step: 1, shuffle: false }),
				float("period", "Period", 8, 600, 120, { unit: "px", shuffle: [40, 220] }),
				float("duty", "Thickness", 0.02, 1, 0.5, { step: 0.01, shuffle: [0.15, 0.7] }),
			],
		},
		{
			title: "Segments",
			params: [
				float("segment", "Length", 0, 1200, 260, { unit: "px", shuffle: [0, 500] }),
				float("segDuty", "Fill", 0.05, 1, 0.65, { step: 0.01, shuffle: [0.3, 0.9] }),
				float("stagger", "Stagger", 0, 1, 0.5, { step: 0.01, shuffle: true }),
				float("jitter", "Jitter", 0, 1, 0, { step: 0.01, shuffle: [0, 0.6] }),
				float("shear", "End cut", -1, 1, 1, { step: 0.01, shuffle: [-1, 1] }),
			],
		},
		{
			title: "Style",
			params: [
				select("style", "Style", ["Fill", "Line"], 0, { shuffle: true }),
				float("line", "Line width", 0.5, 24, 2, { unit: "px", showIf: eq("style", 1) }),
				color("colorA", "Colour", "$pink"),
				bool("alternate", "Alternate rows", false, { shuffle: true }),
				color("colorB", "Alternate", "$light", { showIf: on("alternate") }),
			],
		},
		{
			title: "Motion",
			params: [select("motion", "Motion", ["None", "Scroll", "Counter-scroll"], 1, { shuffle: true }), cycles(1)],
		},
	],
	frag: /* glsl */ `
vec4 run() {
  vec2 q = rot(-radians(u_angle)) * P();
  float scroll = u_motion == 0 ? 0.0 : u_phase * float(u_cycles);
  bool segmented = u_segment > 0.5;
  float u = q.y + (segmented ? 0.0 : scroll * u_period);
  float row = floor(u / u_period + 0.5);
  float du = u - row * u_period;
  float d = abs(du) - u_duty * u_period * 0.5;
  if (segmented) {
    float dir = (u_motion == 2 && mod(row, 2.0) > 0.5) ? -1.0 : 1.0;
    float v = q.x + du * u_shear;
    float vv = v / u_segment + row * u_stagger + hash11(row * 1.37 + u_seed) * u_jitter + scroll * dir;
    float sv = (fract(vv) - 0.5) * u_segment;
    d = max(d, abs(sv) - u_segDuty * u_segment * 0.5);
  }
  if (u_style == 1) d = abs(d) - u_line * 0.5;
  vec3 col = (u_alternate == 1 && mod(row, 2.0) > 0.5) ? u_colorB : u_colorA;
  return vec4(col, fillAA(d));
}`,
};
