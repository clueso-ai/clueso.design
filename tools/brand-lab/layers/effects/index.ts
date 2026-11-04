import { bool, color, cycles, eq, float, int, neq, select } from "../params";
import type { LayerDef } from "../types";
import { binary } from "./binary";
import { blur } from "./blur";
import { matrix } from "./matrix";
import { glitch } from "./glitch";

// Effects read the composite of every layer below them through `inputAt(uv)` (straight alpha).

export const halftone: LayerDef = {
	type: "halftone",
	kind: "effect",
	category: "stylize",
	label: "Halftone",
	icon: "Grip",
	description: "Print dots, or tiny marks and slashes as the dot shape",
	groups: [
		{
			title: "Screen",
			params: [
				float("cell", "Cell size", 3, 200, 22, { unit: "px", shuffle: [10, 40] }),
				float("angle", "Angle", -90, 90, 45, { unit: "°", step: 1, shuffle: [0, 45] }),
				select("shape", "Dot shape", ["Circle", "Square", "Diamond", "Mark", "Slash", "Line"], 0, { shuffle: true }),
				float("contrast", "Contrast", 0.2, 4, 1.2, { step: 0.01, shuffle: [0.8, 2] }),
				float("gain", "Dot gain", 0.2, 1.6, 1, { step: 0.01 }),
				bool("invert", "Invert", false, { shuffle: true }),
			],
		},
		{
			title: "Ink",
			params: [
				select("mode", "Mode", ["Ink on paper", "Source colour on paper", "Ink only", "Source colour only"], 0, { shuffle: true }),
				color("ink", "Ink", "$pink", { showIf: eq("mode", 0, 2) }),
				color("paper", "Paper", "$plum", { showIf: eq("mode", 0, 1) }),
			],
		},
	],
	frag: /* glsl */ `
vec4 run() {
  float a = radians(u_angle);
  vec2 p = rot(-a) * P();
  vec2 cell = floor(p / u_cell) + 0.5;
  vec2 cpx = rot(a) * (cell * u_cell);
  vec4 s = inputAt(toUV(cpx));
  float l = mix(1.0, luma(s.rgb), s.a);
  float amt = u_invert == 1 ? l : 1.0 - l;
  amt = clamp((amt - 0.5) * u_contrast + 0.5, 0.0, 1.0) * u_gain;
  vec2 f = p - cell * u_cell;
  float d;
  if (u_shape == 0) d = length(f) - sqrt(amt) * u_cell * 0.71;
  else if (u_shape == 1) d = sdBox(f, vec2(sqrt(amt) * u_cell * 0.5));
  else if (u_shape == 2) d = (abs(f.x) + abs(f.y)) * 0.70710678 - sqrt(amt) * u_cell * 0.5;
  else if (u_shape == 3) { float sz = max(sqrt(amt) * u_cell * 0.98, 1e-3); d = amt < 0.02 ? 1e3 : markSDFast(rot(a) * f / sz) * sz; }
  else if (u_shape == 4) d = max(abs(f.x - f.y) * 0.70710678 - amt * u_cell * 0.36, sdBox(f, vec2(u_cell * 0.5)));
  else d = abs(f.y) - amt * u_cell * 0.5;
  float cov = fillAA(d);
  if (u_mode == 0) return vec4(mix(u_paper, u_ink, cov), 1.0);
  if (u_mode == 1) return vec4(mix(u_paper, s.rgb, cov), 1.0);
  if (u_mode == 2) return vec4(u_ink, cov);
  return vec4(s.rgb, cov * s.a);
}`,
};

export const dither: LayerDef = {
	type: "dither",
	kind: "effect",
	category: "stylize",
	label: "Dither",
	icon: "Grid3x3",
	description: "Ordered dithering into brand tones: Bayer, noise, 135° lines or dots",
	groups: [
		{
			title: "Dither",
			params: [
				float("pixel", "Pixel size", 1, 40, 4, { unit: "px", shuffle: [3, 8] }),
				select("matrix", "Pattern", ["Bayer 8×8", "Bayer 4×4", "Bayer 2×2", "Noise", "135° lines", "Horizontal lines", "Dots"], 0, {
					shuffle: [0, 6],
				}),
				float("screen", "Screen", 2, 24, 6, { unit: "px", showIf: eq("matrix", 4, 5, 6), shuffle: [4, 8] }),
				select("shape", "Pixel shape", ["Square", "Round"], 0, { shuffle: [0, 0] }),
				float("bias", "Brightness", -0.5, 0.5, 0, { step: 0.01, shuffle: [-0.15, 0.15] }),
				float("contrast", "Contrast", 0.2, 3, 1, { step: 0.01, shuffle: [0.8, 1.6] }),
			],
		},
		{
			title: "Tones",
			params: [
				select("tones", "Tones", ["Two", "Three", "Four", "Source colour"], 0, { shuffle: [0, 2] }),
				color("c0", "Shadow", "$plum", { showIf: neq("tones", 3) }),
				color("c1", "Dark mid", "$magenta", { showIf: eq("tones", 1, 2) }),
				color("c2", "Light mid", "$pink", { showIf: eq("tones", 2) }),
				color("c3", "Highlight", "$light", { showIf: neq("tones", 3) }),
				int("levels", "Levels", 2, 8, 3, { showIf: eq("tones", 3) }),
			],
		},
	],
	frag: /* glsl */ `
float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }

float threshold(vec2 cell) {
  float s = max(u_screen / u_pixel, 2.0);
  if (u_matrix == 0) return bayer8(cell);
  if (u_matrix == 1) return bayer4(cell);
  if (u_matrix == 2) return bayer2(cell);
  if (u_matrix == 3) return hash12(cell + u_seed);
  if (u_matrix == 4) return abs(fract((cell.x + cell.y) / s) * 2.0 - 1.0);
  if (u_matrix == 5) return abs(fract(cell.y / s) * 2.0 - 1.0);
  return 0.5 + 0.25 * (cos(TAU * cell.x / s) + cos(TAU * cell.y / s));
}

vec4 run() {
  vec2 cell = floor(compPx() / u_pixel);
  vec4 s = inputAt(((cell + 0.5) * u_pixel) / u_comp);
  float th = threshold(cell);
  float l = clamp((luma(s.rgb) * s.a - 0.5) * u_contrast + 0.5 + u_bias, 0.0, 1.0);
  vec4 c;
  if (u_tones == 0) c = vec4(l > th ? u_c3 : u_c0, 1.0);
  else if (u_tones == 1) {
    float idx = clamp(floor(l * 2.0 + th), 0.0, 2.0);
    c = vec4(idx < 0.5 ? u_c0 : (idx < 1.5 ? u_c1 : u_c3), 1.0);
  } else if (u_tones == 2) {
    float idx = clamp(floor(l * 3.0 + th), 0.0, 3.0);
    c = vec4(idx < 0.5 ? u_c0 : (idx < 1.5 ? u_c1 : (idx < 2.5 ? u_c2 : u_c3)), 1.0);
  } else {
    float n = float(u_levels - 1);
    c = vec4(floor(clamp((s.rgb - 0.5) * u_contrast + 0.5 + u_bias, 0.0, 1.0) * n + th) / n, s.a);
  }
  if (u_shape == 1) {
    vec2 f = compPx() - (cell + 0.5) * u_pixel;
    float disc = fillAA(length(f) - u_pixel * 0.46);
    vec4 under = u_tones == 3 ? vec4(c.rgb, 0.0) : vec4(u_c0, 1.0);
    c = mix(under, c, disc);
  }
  return c;
}`,
};

export const gradientMap: LayerDef = {
	type: "gradientMap",
	kind: "effect",
	category: "stylize",
	label: "Gradient Map",
	icon: "Palette",
	description: "Remap brightness onto a brand ramp",
	groups: [
		{
			title: "Ramp",
			params: [
				color("c0", "Shadows", "$plum"),
				color("c1", "Mids", "$magenta"),
				color("c2", "Highlights", "$light"),
				float("mid", "Mid point", 0.05, 0.95, 0.5, { step: 0.01, shuffle: [0.3, 0.7] }),
				int("steps", "Steps", 0, 16, 0, { shuffle: [0, 6] }),
				float("contrast", "Contrast", 0.2, 3, 1, { step: 0.01 }),
				bool("invert", "Invert", false, { shuffle: true }),
			],
		},
	],
	frag: /* glsl */ `
vec4 run() {
  vec4 s = inputAt(v_uv);
  float t = clamp((luma(s.rgb) - 0.5) * u_contrast + 0.5, 0.0, 1.0);
  if (u_invert == 1) t = 1.0 - t;
  if (u_steps > 1) t = floor(min(t, 0.9999) * float(u_steps)) / float(u_steps - 1);
  vec3 c = t < u_mid ? mix(u_c0, u_c1, t / u_mid) : mix(u_c1, u_c2, (t - u_mid) / (1.0 - u_mid));
  return vec4(c, s.a);
}`,
};

export const glass: LayerDef = {
	type: "glass",
	spills: true,
	kind: "effect",
	category: "distort",
	label: "Reeded Glass",
	icon: "Columns3",
	description: "Fluted glass refraction",
	groups: [
		{
			title: "Flutes",
			params: [
				float("width", "Flute width", 4, 400, 60, { unit: "px", shuffle: [24, 80] }),
				float("angle", "Angle", -180, 180, 45, { unit: "°", step: 1, shuffle: false }),
				float("strength", "Refraction", 0, 3, 1, { step: 0.01, shuffle: [0.2, 0.8] }),
				float("frost", "Frost", 0, 40, 0, { unit: "px", shuffle: [0, 10] }),
				float("shade", "Edge shade", 0, 1, 0.2, { step: 0.01 }),
				float("highlight", "Highlight", 0, 1, 0.15, { step: 0.01 }),
			],
		},
		{ title: "Motion", params: [cycles(0)] },
	],
	frag: /* glsl */ `
vec4 run() {
  float a = radians(u_angle);
  vec2 p = rot(-a) * P();
  float x = p.x / u_width + u_phase * float(u_cycles);
  float f = fract(x) - 0.5;
  vec2 sp = p;
  sp.x += -sin(f * PI) * u_strength * u_width * 0.9;
  vec4 acc = vec4(0.0);
  for (int i = 0; i < 6; i++) {
    vec2 j = (hash22(gl_FragCoord.xy + float(i) * 13.1) - 0.5) * u_frost;
    acc += inputAt(toUV(rot(a) * (sp + j)));
  }
  acc /= 6.0;
  float edge = abs(f) * 2.0;
  acc.rgb *= 1.0 - u_shade * pow(edge, 3.0);
  acc.rgb += u_highlight * pow(max(0.0, 1.0 - abs(f + 0.28) * 7.0), 2.0);
  return acc;
}`,
};

export const wave: LayerDef = {
	type: "wave",
	spills: true,
	kind: "effect",
	category: "distort",
	label: "Wave Warp",
	icon: "Waves",
	description: "Sine or noise displacement",
	groups: [
		{
			title: "Warp",
			params: [
				select("mode", "Type", ["Sine", "Noise", "Swirl"], 0, { shuffle: [0, 1] }),
				float("amp", "Amplitude", 0, 300, 40, { unit: "px", shuffle: [8, 40] }),
				float("freq", "Frequency", 0.1, 20, 3, { step: 0.01, shuffle: [1, 4] }),
				float("angle", "Angle", -180, 180, 0, { unit: "°", step: 1, showIf: eq("mode", 0) }),
			],
		},
		{ title: "Motion", params: [cycles(1)] },
	],
	frag: /* glsl */ `
vec4 run() {
  vec2 p = P();
  float m = max(u_comp.x, u_comp.y);
  float ph = TAU * u_phase * float(u_cycles);
  vec2 off;
  if (u_mode == 0) {
    vec2 dir = vec2(cos(radians(u_angle)), sin(radians(u_angle)));
    vec2 n = vec2(-dir.y, dir.x);
    off = n * sin(dot(p, dir) / m * u_freq * TAU + ph) * u_amp;
  } else if (u_mode == 1) {
    vec3 lp = loopP(p / m * u_freq, 0.5, float(u_cycles));
    off = (vec2(noise(lp + vec3(u_seed)), noise(lp + vec3(17.3, 4.1, u_seed))) - 0.5) * 2.0 * u_amp;
  } else {
    float r = length(p) / m;
    float ang = sin(r * u_freq * PI - ph) * u_amp / 200.0;
    off = rot(ang) * p - p;
  }
  return inputAt(toUV(p + off));
}`,
};

export const slice: LayerDef = {
	type: "slice",
	spills: true,
	kind: "effect",
	category: "distort",
	label: "Slice",
	icon: "SquareSplitHorizontal",
	description: "Shifted bands: visual breaks applied to anything",
	groups: [
		{
			title: "Slices",
			params: [
				float("height", "Band height", 2, 400, 48, { unit: "px", shuffle: [16, 120] }),
				float("offset", "Offset", 0, 600, 80, { unit: "px", shuffle: [10, 90] }),
				float("angle", "Angle", -180, 180, 45, { unit: "°", step: 1, shuffle: false }),
				float("chance", "Chance", 0, 1, 0.5, { step: 0.01, shuffle: [0.2, 0.6] }),
			],
		},
		{ title: "Motion", params: [cycles(1)] },
	],
	frag: /* glsl */ `
vec4 run() {
  float a = radians(u_angle);
  vec2 p = rot(-a) * P();
  float band = floor(p.y / u_height);
  float h = hash12(vec2(band, u_seed));
  if (h < u_chance) {
    float k = hash12(vec2(band, u_seed + 1.7)) * 2.0 - 1.0;
    float t = u_cycles > 0 ? sin(TAU * (u_phase * float(u_cycles) + h)) : 1.0;
    p.x += k * u_offset * t;
  }
  return inputAt(toUV(rot(a) * p));
}`,
};

export const pixelate: LayerDef = {
	type: "pixelate",
	kind: "effect",
	category: "stylize",
	label: "Pixelate",
	icon: "Grid2x2",
	description: "Mosaic blocks with optional gaps",
	groups: [
		{
			title: "Mosaic",
			params: [
				float("size", "Block size", 2, 200, 16, { unit: "px", shuffle: [6, 40] }),
				float("gap", "Gap", 0, 0.8, 0, { step: 0.01, shuffle: [0, 0.3] }),
				select("shape", "Shape", ["Square", "Round", "Diamond"], 0, { shuffle: true }),
			],
		},
	],
	frag: /* glsl */ `
vec4 run() {
  vec2 px = compPx();
  vec2 cell = floor(px / u_size);
  vec4 s = inputAt(((cell + 0.5) * u_size) / u_comp);
  vec2 f = px - (cell + 0.5) * u_size;
  float r = u_size * 0.5 * (1.0 - u_gap);
  float d = u_shape == 0 ? sdBox(f, vec2(r)) : (u_shape == 1 ? length(f) - r : (abs(f.x) + abs(f.y)) - r);
  if (u_gap <= 0.0 && u_shape == 0) return s;
  return vec4(s.rgb, s.a * fillAA(d));
}`,
};

export const bloom: LayerDef = {
	type: "bloom",
	spills: true,
	kind: "effect",
	category: "finish",
	label: "Bloom",
	icon: "Sun",
	description: "Soft glow from bright areas",
	groups: [
		{
			title: "Glow",
			params: [
				float("threshold", "Threshold", 0, 1, 0.45, { step: 0.01, shuffle: [0.4, 0.7] }),
				float("radius", "Radius", 2, 300, 60, { unit: "px", shuffle: [20, 120] }),
				float("intensity", "Intensity", 0, 4, 1.2, { step: 0.01, shuffle: [0.4, 1.2] }),
				color("tint", "Tint", "$light"),
			],
		},
	],
	frag: /* glsl */ `
vec4 run() {
  vec4 base = inputAt(v_uv);
  vec3 acc = vec3(0.0);
  float wsum = 0.0;
  for (int i = 0; i < 64; i++) {
    float fi = float(i);
    float r = sqrt((fi + 0.5) / 64.0) * u_radius;
    float th = fi * 2.39996323;
    vec4 s = inputAt(toUV(P() + vec2(cos(th), sin(th)) * r));
    vec3 b = max(s.rgb * s.a - u_threshold, 0.0) / max(1.0 - u_threshold, 1e-3);
    float w = exp(-2.0 * r * r / (u_radius * u_radius));
    acc += b * w;
    wsum += w;
  }
  acc = acc / wsum * u_intensity * mix(vec3(1.0), u_tint, 0.6);
  float glowA = clamp(luma(acc), 0.0, 1.0);
  float a = base.a + glowA * (1.0 - base.a);
  vec3 col = (base.rgb * base.a + acc) / max(a, 1e-3);
  return vec4(col, a);
}`,
};

export const chroma: LayerDef = {
	type: "chroma",
	spills: true,
	kind: "effect",
	category: "distort",
	label: "Chromatic",
	icon: "Aperture",
	description: "RGB channel split",
	groups: [
		{
			title: "Split",
			params: [
				float("amount", "Amount", 0, 60, 6, { unit: "px", shuffle: [2, 8] }),
				float("angle", "Angle", -180, 180, 45, { unit: "°", step: 1, showIf: (p) => !p.radial }),
				bool("radial", "Radial", false, { shuffle: true }),
			],
		},
	],
	frag: /* glsl */ `
vec4 run() {
  vec2 p = P();
  vec2 dir = u_radial == 1 ? p / (max(u_comp.x, u_comp.y) * 0.5) : vec2(cos(radians(u_angle)), sin(radians(u_angle)));
  vec2 o = dir * u_amount;
  vec4 r = inputAt(toUV(p + o));
  vec4 g = inputAt(v_uv);
  vec4 b = inputAt(toUV(p - o));
  return vec4(r.r, g.g, b.b, max(max(r.a, g.a), b.a));
}`,
};

export const grain: LayerDef = {
	type: "grain",
	kind: "effect",
	category: "finish",
	label: "Grain",
	icon: "Sparkles",
	description: "Film grain",
	groups: [
		{
			title: "Grain",
			params: [
				float("amount", "Amount", 0, 0.6, 0.12, { step: 0.005, shuffle: [0.05, 0.18] }),
				float("size", "Size", 0.5, 8, 1, { unit: "px", step: 0.1 }),
				bool("mono", "Monochrome", true),
				bool("animate", "Animate", true),
			],
		},
	],
	frag: /* glsl */ `
vec4 run() {
  vec4 s = inputAt(v_uv);
  vec2 cell = floor(compPx() / u_size);
  float t = u_animate == 1 ? floor(u_time * 24.0) : 0.0;
  vec3 n = u_mono == 1 ? vec3(hash12(cell + t * 13.1 + u_seed)) : hash32(cell + t * 13.1 + u_seed);
  return vec4(s.rgb + (n - 0.5) * u_amount * 2.0, s.a);
}`,
};

export const vignette: LayerDef = {
	type: "vignette",
	kind: "effect",
	category: "finish",
	label: "Vignette",
	icon: "Circle",
	description: "Darken or tint the edges",
	groups: [
		{
			title: "Vignette",
			params: [
				float("amount", "Amount", 0, 1, 0.6, { step: 0.01 }),
				float("radius", "Radius", 0, 1.5, 0.6, { step: 0.01 }),
				float("soft", "Softness", 0.01, 1.5, 0.7, { step: 0.01 }),
				color("color", "Colour", "$plum"),
			],
		},
	],
	frag: /* glsl */ `
vec4 run() {
  vec4 s = inputAt(v_uv);
  float d = length(P() / (u_comp * 0.5));
  float v = smoothstep(u_radius, u_radius + u_soft, d) * u_amount;
  return vec4(mix(s.rgb, u_color, v), max(s.a, v));
}`,
};

export const EFFECTS: LayerDef[] = [dither, halftone, matrix, binary, gradientMap, pixelate, glitch, slice, chroma, wave, glass, blur, bloom, grain, vignette];

