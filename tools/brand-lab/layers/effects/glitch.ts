import { bool, color, float, int } from "../params";
import type { LayerDef } from "../types";

// Digital corruption: displaced blocks, line tears, smeared pixels, RGB split, brand-colour blocks
// and scanlines. Glitches are stepped (a fixed number per loop), so exports loop cleanly.
export const glitch: LayerDef = {
	type: "glitch",
	kind: "effect",
	category: "distort",
	label: "Glitch",
	icon: "Zap",
	description: "Block shifts, tears, smears, RGB split and scanlines",
	groups: [
		{
			title: "Glitch",
			params: [
				float("intensity", "Intensity", 0, 1, 0.55, { step: 0.01, shuffle: [0.35, 0.8] }),
				float("block", "Block size", 4, 240, 36, { unit: "px", shuffle: [16, 80] }),
				float("shift", "Shift", 0, 600, 90, { unit: "px", shuffle: [30, 160] }),
				float("tear", "Line tears", 0, 1, 0.4, { step: 0.01, shuffle: [0.1, 0.6] }),
				float("smear", "Smear", 0, 1, 0.3, { step: 0.01, shuffle: [0, 0.6] }),
				float("split", "RGB split", 0, 60, 8, { unit: "px", shuffle: [2, 14] }),
			],
		},
		{
			title: "Colour blocks",
			params: [
				float("blocks", "Amount", 0, 1, 0.25, { step: 0.01, shuffle: [0, 0.5] }),
				color("colorA", "Colour A", "$pink"),
				color("colorB", "Colour B", "$light"),
				bool("invert", "Negative blocks", true, { shuffle: true }),
			],
		},
		{
			title: "Scanlines",
			params: [
				float("scan", "Strength", 0, 1, 0.15, { step: 0.01, shuffle: [0, 0.3] }),
				float("scanSize", "Spacing", 2, 24, 4, { unit: "px" }),
			],
		},
		{
			title: "Timing",
			params: [
				int("rate", "Glitches / loop", 1, 96, 24, { shuffle: [8, 36] }),
				float("burst", "Active time", 0, 1, 0.6, { step: 0.01, shuffle: [0.35, 0.85] }),
			],
		},
	],
	frag: /* glsl */ `
vec4 run() {
  vec2 px = compPx();
  float st = floor(u_phase * float(u_rate));
  float on = step(1.0 - u_burst, hash12(vec2(st, u_seed + 0.37)));
  float amt = u_intensity * on;

  // Blocks: rows of random height, split into random-width blocks; both re-roll every step.
  float rowH = u_block * (0.5 + 1.5 * hash12(vec2(floor(px.y / u_block), st + u_seed)));
  float row = floor(px.y / rowH);
  float bw = u_block * (2.0 + 8.0 * hash12(vec2(row, st + 4.1)));
  vec2 cell = vec2(floor(px.x / bw + hash12(vec2(row, st + 9.2))), row);
  float h = hash12(cell + st * 7.13 + u_seed);
  bool hit = h < amt * 0.55;

  vec2 off = vec2(0.0);
  if (hit) off.x = (hash12(cell + st + 3.3) - 0.5) * 2.0 * u_shift;
  // Thin line tears across the whole frame.
  float line = floor(px.y / max(2.0, u_block * 0.12));
  if (hash12(vec2(line, st + 11.0 + u_seed)) < amt * u_tear * 0.12) off.x += (hash12(vec2(line, st)) - 0.5) * u_shift * 2.5;

  vec2 sp = px + off;
  // Smear: hold the colour of the block's left edge, a datamosh-style streak.
  if (hit && hash12(cell + 5.7 + st) < u_smear) sp.x = (floor(px.x / bw) * bw) + off.x;

  float split = u_split * (0.35 + amt) * (hit ? 2.0 : 1.0);
  vec4 r = inputAt((sp + vec2(split, 0.0)) / u_comp);
  vec4 g = inputAt(sp / u_comp);
  vec4 b = inputAt((sp - vec2(split, 0.0)) / u_comp);
  vec4 c = vec4(r.r, g.g, b.b, max(max(r.a, g.a), b.a));

  float cb = hash12(cell * 1.71 + st * 3.1 + 5.0);
  float lim = amt * u_blocks * 0.3;
  if (cb < lim) {
    // Negatives stay in the palette: brightness flipped onto the two brand colours.
    if (u_invert == 1 && cb < lim * 0.3) c.rgb = mix(u_colorA * 0.12, u_colorB, 1.0 - luma(c.rgb));
    else c = vec4(cb < lim * 0.65 ? u_colorA : u_colorB, 1.0);
  }

  float sl = 0.5 + 0.5 * cos(px.y * TAU / u_scanSize);
  c.rgb *= 1.0 - u_scan * 0.6 * sl;
  return c;
}`,
};
