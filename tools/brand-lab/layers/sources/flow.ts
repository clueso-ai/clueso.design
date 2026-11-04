import { color, cycles, eq, float, int, neq, select } from "../params";
import type { LayerDef } from "../types";

// Flowing colour fields. Every mode moves along a closed path in noise space, so loops are seamless.
export const flow: LayerDef = {
	type: "flow",
	kind: "source",
	category: "fill",
	label: "Flow",
	icon: "Wind",
	description: "Liquid, silk, aurora and blob gradients, with contour lines",
	groups: [
		{
			title: "Flow",
			params: [
				select("mode", "Type", ["Liquid", "Silk", "Aurora", "Blobs"], 0, { shuffle: true }),
				float("scale", "Scale", 0.2, 4, 1, { step: 0.01, shuffle: [0.6, 1.6] }),
				float("warp", "Warp", 0, 2, 1, { step: 0.01, showIf: neq("mode", 3), shuffle: [0.5, 1.4] }),
				float("contrast", "Contrast", 0.2, 3, 1, { step: 0.01, shuffle: [0.9, 1.6] }),
				float("bias", "Balance", -0.5, 0.5, 0, { step: 0.01, shuffle: [-0.15, 0.15] }),
				int("count", "Blobs", 2, 12, 6, { showIf: eq("mode", 3), shuffle: [3, 8] }),
				float("blobSize", "Blob size", 0.03, 0.4, 0.1, { step: 0.005, showIf: eq("mode", 3), shuffle: [0.07, 0.14] }),
				float("soft", "Edge softness", 0, 1, 0.35, { step: 0.01, showIf: eq("mode", 3), shuffle: [0.05, 0.8] }),
			],
		},
		{
			title: "Colours",
			params: [
				color("colorA", "Deep", "$plum"),
				color("colorB", "Mid", "$magenta"),
				color("colorC", "Bright", "$pink"),
				color("colorD", "Highlight", "$light"),
				int("bands", "Bands", 0, 24, 0, { shuffle: [0, 0] }),
			],
		},
		{
			title: "Contours",
			params: [
				select("contours", "Contours", ["Off", "Over colour", "Lines only"], 0, { shuffle: [0, 1] }),
				int("lineCount", "Lines", 2, 60, 14, { showIf: neq("contours", 0), shuffle: [8, 24] }),
				float("lineWeight", "Weight", 0.5, 12, 1.5, { unit: "px", showIf: neq("contours", 0) }),
				color("lineColor", "Line colour", "$light", { showIf: neq("contours", 0) }),
			],
		},
		{ title: "Motion", params: [cycles(1)] },
	],
	// Lines only leaves the gaps clear; every other setting paints the whole canvas.
	covers: (p) => p.contours !== 2,
	seeThrough: { contours: 2 },
	frag: /* glsl */ `
float A() { return TAU * u_phase * float(u_cycles); }
// Noise coordinates that travel around a circle once per cycle.
vec3 L(vec2 p, float r) { float a = A(); return vec3(p + vec2(cos(a), sin(a)) * r, u_seed * 0.37); }

vec3 ramp4(float t) {
  t = clamp(t, 0.0, 1.0) * 3.0;
  if (t < 1.0) return mix(u_colorA, u_colorB, t);
  if (t < 2.0) return mix(u_colorB, u_colorC, t - 1.0);
  return mix(u_colorC, u_colorD, t - 2.0);
}

float field() {
  float m = max(u_comp.x, u_comp.y);
  vec2 p = P() / m / u_scale;
  if (u_mode == 0) {
    p *= 2.0;
    vec2 q = vec2(fbm(L(p, 0.5)), fbm(L(p + vec2(5.2, 1.3), 0.5)));
    vec2 r = vec2(fbm(L(p + 3.0 * u_warp * q + vec2(1.7, 9.2), 0.35)), fbm(L(p + 3.0 * u_warp * q + vec2(8.3, 2.8), 0.35)));
    float f = fbm(L(p + 3.0 * u_warp * r, 0.25));
    return (f - 0.5) * 2.6 + 0.5 + (length(r) - 0.7) * 0.6;
  }
  if (u_mode == 1) {
    p *= 5.0;
    float a = A();
    for (int i = 1; i < 7; i++) {
      float fi = float(i);
      p.x += u_warp * 0.6 / fi * sin(fi * 1.3 * p.y + a + fi * 0.7 + u_seed);
      p.y += u_warp * 0.6 / fi * cos(fi * 1.1 * p.x - a + fi * 1.9);
    }
    return 0.5 + 0.5 * sin(p.x * 1.3 + p.y * 0.9);
  }
  if (u_mode == 2) {
    p *= 1.6;
    float t = 0.0;
    for (int k = 0; k < 3; k++) {
      float fk = float(k);
      float yc = (fbm(L(vec2(p.x * 1.1 + fk * 3.1, fk * 7.3), 0.45)) - 0.5) * 1.4 * u_warp + (fk - 1.0) * 0.22;
      float d = p.y - yc;
      float curtain = exp(-max(d, 0.0) * (5.0 + fk * 2.0)) * smoothstep(-0.14, 0.0, d);
      float rays = 0.55 + 0.45 * noise(L(vec2(p.x * 26.0 + fk * 11.0, d * 1.5), 0.6));
      t += curtain * rays * (0.55 + 0.25 * fk);
    }
    return t * 0.8;
  }
  // Blobs: a metaball field of circles on integer Lissajous loops.
  float a = A();
  float f = 0.0;
  for (int i = 0; i < 12; i++) {
    if (i >= u_count) break;
    float fi = float(i);
    vec2 h = hash22(vec2(fi * 1.7, u_seed));
    vec2 fr = floor(hash22(vec2(fi, u_seed + 3.0)) * 2.0) + 1.0;
    vec2 c = (h - 0.5) * vec2(u_comp.x, u_comp.y) / m * 0.9 + vec2(sin(a * fr.x + h.x * TAU), cos(a * fr.y + h.y * TAU)) * 0.16;
    float r = u_blobSize * (0.6 + 0.8 * hash11(fi * 3.1 + u_seed));
    vec2 d = p * u_scale - c;
    f += r * r / max(dot(d, d), 1e-5);
  }
  float s = max(u_soft, 0.02);
  return smoothstep(1.0 - s * 0.9, 1.0 + s * 2.0, f) * 0.9 + 0.05 * f / (1.0 + f);
}

vec4 run() {
  float t = field();
  t = clamp((t - 0.5) * u_contrast + 0.5 + u_bias, 0.0, 1.0);
  if (u_bands > 1) t = floor(min(t, 0.9999) * float(u_bands)) / float(u_bands - 1);
  vec3 col = ramp4(t);
  if (u_contours == 0) return vec4(col, 1.0);
  float k = t * float(u_lineCount);
  float px = abs(fract(k + 0.5) - 0.5) / max(fwidth(k), 1e-4);
  float line = clamp(u_lineWeight * 0.5 * u_res.x / u_comp.x - px + 0.5, 0.0, 1.0);
  // No lines across flat (clamped) regions, where every pixel would sit on a contour.
  line *= step(1e-4, fwidth(k)) * step(0.001, t) * step(t, 0.999);
  if (u_contours == 2) return vec4(u_lineColor, line);
  return vec4(mix(col, u_lineColor, line), 1.0);
}`,
};
