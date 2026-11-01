import { color, eq, float, neq, select } from "../params";
import type { LayerDef } from "../types";

// Soft focus for everything below: a uniform defocus, a progressive blur that fades in along a
// direction, or a zoom blur towards a point. Optional frost tint for glass panels.
export const blur: LayerDef = {
	type: "blur",
	kind: "effect",
	category: "finish",
	label: "Blur",
	icon: "Droplet",
	description: "Soft focus, progressive blur or zoom blur, with an optional frost tint",
	groups: [
		{
			title: "Blur",
			params: [
				select("mode", "Type", ["Defocus", "Progressive", "Zoom"], 0, { shuffle: [0, 1] }),
				float("radius", "Radius", 0, 400, 48, { unit: "px", shuffle: [16, 120] }),
				float("angle", "Direction", -180, 180, -90, { unit: "°", step: 1, showIf: eq("mode", 1) }),
				float("from", "Starts at", 0, 1, 0.35, { step: 0.01, showIf: eq("mode", 1), shuffle: [0.2, 0.5] }),
				float("to", "Full at", 0, 1, 0.9, { step: 0.01, showIf: eq("mode", 1), shuffle: [0.7, 1] }),
				float("cx", "Centre X", 0, 1, 0.5, { step: 0.01, showIf: eq("mode", 2) }),
				float("cy", "Centre Y", 0, 1, 0.5, { step: 0.01, showIf: eq("mode", 2) }),
			],
		},
		{
			title: "Frost",
			params: [
				float("frost", "Tint", 0, 1, 0, { step: 0.01, shuffle: [0, 0] }),
				color("tint", "Tint colour", "$blush", { showIf: (p) => (p.frost as number) > 0 }),
				float("lift", "Saturation", 0, 2, 1, { step: 0.01, showIf: neq("mode", 2), shuffle: [1, 1.3] }),
			],
		},
	],
	position: ["cx", "cy"],
	mipInput: true,
	frag: /* glsl */ `
// Premultiplied samples, so transparent areas don't bleed black into the edges. Taps read a mip level
// matched to their spacing: few taps, no cache thrash at big radii, and no sampling grain.
float g_lod = 0.0;
vec4 tap(vec2 p) { return textureLod(u_input, toUV(p), g_lod); }
void setSpacing(float compPx) { g_lod = max(0.0, log2(max(compPx * u_res.x / u_comp.x, 1.0)) - 0.3); }

vec4 run() {
  vec2 p = P();
  float r = u_radius;
  if (u_mode == 1) {
    vec2 dir = vec2(cos(radians(u_angle)), sin(radians(u_angle)));
    float ext = 0.5 * (abs(dir.x) * u_comp.x + abs(dir.y) * u_comp.y);
    float t = dot(p, dir) / (2.0 * ext) + 0.5;
    r *= smoothstep(u_from, max(u_to, u_from + 0.001), t);
  }
  vec4 acc = vec4(0.0);
  float wsum = 0.0;
  // Rotating the sample pattern per pixel trades banding for a fine grain that reads as frosted.
  float jit = hash12(gl_FragCoord.xy) * TAU;
  if (u_mode == 2) {
    vec2 c = (vec2(u_cx, u_cy) - 0.5) * u_comp;
    vec2 d = c - p;
    float k = clamp(u_radius / 400.0, 0.0, 1.0);
    setSpacing(length(d) * k / 48.0);
    for (int i = 0; i < 48; i++) {
      float t = (float(i) + fract(jit)) / 48.0;
      acc += tap(p + d * t * k);
      wsum += 1.0;
    }
  } else if (r < 0.5) {
    acc = tap(p);
    wsum = 1.0;
  } else {
    setSpacing(r * 0.25);
    for (int i = 0; i < 48; i++) {
      float fi = float(i);
      float rr = sqrt((fi + 0.5) / 48.0);
      float th = fi * 2.39996323 + jit;
      float w = exp(-3.0 * rr * rr);
      acc += tap(p + vec2(cos(th), sin(th)) * rr * r * 1.4) * w;
      wsum += w;
    }
  }
  acc /= wsum;
  vec3 col = acc.a > 0.0 ? acc.rgb / acc.a : vec3(0.0);
  float l = luma(col);
  col = max(mix(vec3(l), col, u_lift), 0.0);
  col = mix(col, u_tint, u_frost * 0.6);
  return vec4(col, max(acc.a, u_frost * 0.6));
}`,
};
