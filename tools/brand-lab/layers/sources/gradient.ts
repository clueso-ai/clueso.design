import { color, cycles, eq, float, int, neq, select } from "../params";
import type { LayerDef } from "../types";

export const gradient: LayerDef = {
	type: "gradient",
	kind: "source",
	category: "fill",
	label: "Gradient",
	icon: "Blend",
	description: "Linear, radial, conic or flowing mesh gradient",
	groups: [
		{
			title: "Shape",
			params: [
				select("mode", "Type", ["Linear", "Radial", "Conic", "Mesh"], 0, { shuffle: true }),
				float("angle", "Angle", -180, 180, -135, { unit: "°", step: 1, showIf: neq("mode", 1), shuffle: [-180, 180] }),
				float("scale", "Scale", 0.1, 3, 1, { step: 0.01, showIf: neq("mode", 0), shuffle: [0.4, 1.6] }),
				float("warp", "Warp", 0, 2, 0.8, { step: 0.01, showIf: eq("mode", 3), shuffle: [0.3, 1.5] }),
				float("cx", "Centre X", 0, 1, 0.5, { step: 0.01, showIf: eq("mode", 1, 2) }),
				float("cy", "Centre Y", 0, 1, 0.5, { step: 0.01, showIf: eq("mode", 1, 2) }),
			],
		},
		{
			title: "Colours",
			params: [
				color("colorA", "Start", "$light"),
				color("colorB", "Middle", "$pink"),
				color("colorC", "End", "$magenta"),
				float("mid", "Middle position", 0.05, 0.95, 0.5, { step: 0.01, shuffle: [0.3, 0.7] }),
				int("bands", "Bands", 0, 24, 0, { shuffle: [0, 8] }),
			],
		},
		{
			title: "Motion",
			params: [cycles(0)],
		},
	],
	position: ["cx", "cy"],
	frag: /* glsl */ `
vec3 ramp(float t) {
  t = clamp(t, 0.0, 1.0);
  return t < u_mid ? mix(u_colorA, u_colorB, t / u_mid) : mix(u_colorB, u_colorC, (t - u_mid) / (1.0 - u_mid));
}

vec4 run() {
  float m = max(u_comp.x, u_comp.y);
  vec2 p = P() / m;
  vec2 c = (vec2(u_cx, u_cy) - 0.5) * u_comp / m;
  float a = radians(u_angle);
  float shift = u_phase * float(u_cycles);
  float t;
  if (u_mode == 0) {
    vec2 dir = vec2(cos(a), sin(a));
    float ext = 0.5 * (abs(dir.x) * u_comp.x + abs(dir.y) * u_comp.y) / m;
    t = dot(p, dir) / (2.0 * ext) + 0.5;
  } else if (u_mode == 1) {
    t = length(p - c) / (0.7 * u_scale);
  } else if (u_mode == 2) {
    vec2 d = p - c;
    t = fract(atan(d.y, d.x) / TAU - u_angle / 360.0);
    t = 1.0 - abs(t * 2.0 - 1.0);
  } else {
    vec2 s = p * 2.2 / u_scale;
    vec3 lp = loopP(s, 0.35, max(float(u_cycles), 1.0));
    vec2 w = vec2(fbm(lp + vec3(0.0, 0.0, u_seed)), fbm(lp + vec3(5.2, 1.3, u_seed))) - 0.5;
    vec2 dir = vec2(cos(a), sin(a));
    t = dot(p + w * u_warp, dir) + 0.5 + (fbm(vec3(s + w * 2.0 * u_warp, u_seed)) - 0.5) * u_warp;
  }
  if (u_cycles > 0 && u_mode != 3) {
    t = t + shift;
    t = 1.0 - abs(fract(t * 0.5) * 2.0 - 1.0);
  }
  if (u_bands > 1) t = floor(clamp(t, 0.0, 0.9999) * float(u_bands)) / float(u_bands - 1);
  return vec4(ramp(t), 1.0);
}`,
};
