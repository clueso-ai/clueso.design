import { bool, color, eq, float, neq, select } from "../params";
import type { LayerDef } from "../types";

// Re-draws the image below on a grid of display pixels: sized dots, LED pills that join along a row,
// a pixel dither with gaps (checkerboard mid-tones), terminal-style bars (. - = and solid), or a
// line screen whose lines glow with the image.
export const matrix: LayerDef = {
	type: "matrix",
	kind: "effect",
	category: "stylize",
	label: "Dot Matrix",
	icon: "LayoutGrid",
	description: "LED pills, pixel checkers, terminal bars and line screens",
	groups: [
		{
			title: "Grid",
			params: [
				select("mode", "Style", ["Dots", "LED", "Pixel checker", "Bars", "Lines"], 2, { shuffle: true }),
				float("cell", "Cell", 4, 120, 20, { unit: "px", shuffle: [12, 32] }),
				float("gap", "Gap", 0, 0.8, 0.2, { step: 0.01, showIf: neq("mode", 3), shuffle: [0.1, 0.35] }),
				float("round", "Roundness", 0, 1, 0.3, { step: 0.01, showIf: eq("mode", 0, 1, 2), shuffle: [0, 1] }),
				float("join", "Joins", 0, 1, 0.35, { step: 0.01, showIf: eq("mode", 1), shuffle: [0.1, 0.6] }),
				select("bayer", "Pattern", ["2×2", "4×4"], 0, { showIf: eq("mode", 2), shuffle: true }),
				select("dir", "Direction", ["Vertical", "Horizontal"], 0, { showIf: eq("mode", 4), shuffle: true }),
				bool("widthByTone", "Width follows tone", true, { showIf: eq("mode", 4) }),
			],
		},
		{
			title: "Tone",
			params: [
				float("threshold", "Threshold", 0, 1, 0.12, { step: 0.01, shuffle: [0.05, 0.3] }),
				float("contrast", "Contrast", 0.2, 3, 1.2, { step: 0.01, shuffle: [0.9, 1.6] }),
				float("bias", "Brightness", -0.5, 0.5, 0, { step: 0.01 }),
				bool("invert", "Invert", false),
			],
		},
		{
			title: "Colour",
			params: [
				select("tint", "Colour", ["Ink", "Source", "Ink ramp"], 0, { shuffle: true }),
				color("ink", "Ink", "$light", { showIf: neq("tint", 1) }),
				color("ink2", "Dim ink", "$magenta", { showIf: eq("tint", 2) }),
				select("under", "Behind", ["Nothing", "Fill", "Source"], 1, { shuffle: [0, 1] }),
				color("bgColor", "Fill", "$plum", { showIf: eq("under", 1) }),
				float("dim", "Source dim", 0, 1, 0, { step: 0.01, showIf: eq("under", 2) }),
			],
		},
	],
	frag: /* glsl */ `
vec4 sampleAt(vec2 cellPx, vec2 sz) { return inputAt((cellPx + 0.5) * sz / u_comp); }

float tone(vec4 s) {
  float l = luma(s.rgb) * s.a;
  if (u_invert == 1) l = 1.0 - l;
  return clamp((l - 0.5 + u_bias) * u_contrast + 0.5, 0.0, 1.0);
}

float bayer2(vec2 c) { vec2 m = mod(c, 2.0); return (m.x + 2.0 * m.y == 0.0 ? 0.0 : (m.x == 1.0 && m.y == 1.0 ? 1.0 : (m.x == 1.0 ? 2.0 : 3.0))) / 4.0; }
float bayer4(vec2 c) { vec2 m = mod(floor(c / 2.0), 2.0); return bayer2(c) + bayer2(m) / 4.0; }

// Rounded box, rounding as a fraction of the half size.
float rbox(vec2 f, vec2 h, float r) { float rr = min(h.x, h.y) * r; return sdBox(f, h - rr) - rr; }

vec4 run() {
  vec2 px = compPx();
  float cov = 0.0;
  float l = 0.0;
  vec4 s;

  if (u_mode == 4) {
    // Line screen: continuous along the line, the line's width or light follows the image.
    bool vert = u_dir == 0;
    float along = vert ? px.x : px.y;
    float k = floor(along / u_cell);
    vec2 at = vert ? vec2((k + 0.5) * u_cell, px.y) : vec2(px.x, (k + 0.5) * u_cell);
    s = inputAt(at / u_comp);
    l = tone(s);
    float lit = smoothstep(u_threshold, u_threshold + 0.06, l);
    float half_ = u_cell * 0.5 * (1.0 - u_gap) * (u_widthByTone == 1 ? l : 1.0);
    float d = abs(along - (k + 0.5) * u_cell) - half_;
    cov = fillAA(d) * lit * (u_widthByTone == 1 ? 1.0 : l);
  } else if (u_mode == 3) {
    // Terminal bars: each cell is one of . - = or a solid bar that joins its neighbours.
    vec2 sz = vec2(u_cell * 0.6, u_cell);
    vec2 c = floor(px / sz);
    vec2 f = px - (c + 0.5) * sz;
    s = sampleAt(c, sz);
    l = tone(s);
    float lv = l < u_threshold ? 0.0 : floor(mix(1.0, 4.99, (l - u_threshold) / max(1.0 - u_threshold, 1e-3)));
    float d = 1e3;
    if (lv == 1.0) d = sdBox(f - vec2(0.0, -sz.y * 0.18), vec2(sz.y * 0.06));
    else if (lv == 2.0) d = sdBox(f, vec2(sz.x * 0.42, sz.y * 0.05));
    else if (lv == 3.0) d = min(sdBox(f - vec2(0.0, sz.y * 0.12), vec2(sz.x * 0.42, sz.y * 0.05)), sdBox(f + vec2(0.0, sz.y * 0.12), vec2(sz.x * 0.42, sz.y * 0.05)));
    else if (lv == 4.0) d = sdBox(f, vec2(sz.x * 0.51, sz.y * 0.3));
    cov = fillAA(d);
  } else {
    vec2 c = floor(px / u_cell);
    vec2 f = px - (c + 0.5) * u_cell;
    s = sampleAt(c, vec2(u_cell));
    l = tone(s);
    vec2 h = vec2(u_cell * 0.5 * (1.0 - u_gap));
    float d = 1e3;
    if (u_mode == 0) {
      float k = l < u_threshold ? 0.0 : sqrt(l);
      d = k > 0.0 ? rbox(f, h * k, u_round) : 1e3;
    } else if (u_mode == 1) {
      // LED: lit cells are pills; a lit neighbour on the left or right joins the run, so rows read
      // as dashes of different lengths. The box overshoots the shared edge to hide its rounding.
      // Only some bright neighbours join (decided per pair, so both cells agree).
      bool on = l >= u_threshold;
      float jt = mix(u_threshold, 1.0, 0.5);
      bool left = on && l >= jt && tone(sampleAt(c - vec2(1.0, 0.0), vec2(u_cell))) >= jt && hash12(c - vec2(1.0, 0.0) + u_seed) < u_join;
      bool right = on && l >= jt && tone(sampleAt(c + vec2(1.0, 0.0), vec2(u_cell))) >= jt && hash12(c + u_seed) < u_join;
      float x0 = left ? -u_cell : -h.x;
      float x1 = right ? u_cell : h.x;
      d = on ? rbox(f - vec2((x0 + x1) * 0.5, 0.0), vec2((x1 - x0) * 0.5, h.y), u_round) : 1e3;
      l = on ? mix(0.35, 1.0, l) : 0.0;
    } else {
      // Pixel checker: ordered dither on the pixel grid, so mid-tones become checkerboards.
      float b = u_bayer == 0 ? bayer2(c) : bayer4(c);
      bool on = l > u_threshold + b * (1.0 - u_threshold);
      d = on ? rbox(f, h, u_round) : 1e3;
    }
    cov = fillAA(d);
  }

  vec3 col = u_tint == 0 ? u_ink : (u_tint == 1 ? s.rgb : mix(u_ink2, u_ink, l));
  if (u_under == 1) return vec4(mix(u_bgColor, col, cov), 1.0);
  if (u_under == 2) {
    vec4 base = inputAt(v_uv);
    base.rgb *= 1.0 - u_dim;
    return vec4(mix(base.rgb, col, cov), max(base.a, cov));
  }
  return vec4(col, cov);
}`,
};
