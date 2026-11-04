import { color, cycles, eq, float, int, neq, select } from "../params";
import type { LayerDef } from "../types";

// Tonal fields around a centre: rays, swirls, rings, vortices, petals and spirals. Built as smooth tone so a
// Dot Matrix, Dither or Glyphs effect on top turns the gradients into checkers, dots or characters.
export const radial: LayerDef = {
	type: "radial",
	kind: "source",
	category: "pattern",
	label: "Radial",
	icon: "Sun",
	description: "Rays, swirls, rings, vortices, petals and spirals as soft tone, made for pixel and glyph effects",
	groups: [
		{
			title: "Field",
			params: [
				// Saved values index this list, so new types go at the end. "Vortex" was called "Spiral" before
				// the even, coiled Spiral arrived.
				select("mode", "Type", ["Rays", "Swirl", "Rings", "Vortex", "Petals", "Spiral"], 0, { shuffle: true }),
				int("count", "Count", 2, 48, 8, { shuffle: [5, 14] }),
				int("arms", "Arms", 1, 8, 1, { showIf: eq("mode", 5), shuffle: [1, 3] }),
				select("turn", "Direction", ["Clockwise", "Anticlockwise"], 0, { showIf: eq("mode", 5), shuffle: true }),
				float("twist", "Twist", -6, 6, 0, { step: 0.01, showIf: neq("mode", 2, 5), shuffle: [-3, 3] }),
				select("profile", "Profile", ["Smooth", "Ramp", "Hard"], 1, { shuffle: true }),
				float("soft", "Softness", 0, 1, 0.3, { step: 0.01, showIf: neq("profile", 1), shuffle: [0.05, 0.6] }),
				float("scale", "Scale", 0.2, 3, 1, { step: 0.01, shuffle: [0.7, 1.4] }),
				float("hole", "Centre hole", 0, 0.6, 0, { step: 0.01, shuffle: [0, 0.2] }),
				float("fade", "Edge fade", 0, 1, 0.3, { step: 0.01, shuffle: [0, 0.7] }),
				float("cx", "Centre X", 0, 1, 0.5, { step: 0.01 }),
				float("cy", "Centre Y", 0, 1, 0.5, { step: 0.01 }),
			],
		},
		{
			title: "Colour",
			params: [
				select("fill", "Fill", ["Two colours", "Colour on transparent"], 0, { shuffle: [0, 0] }),
				color("colorA", "Light", "$light"),
				color("colorB", "Dark", "$plum", { showIf: eq("fill", 0) }),
			],
		},
		{
			title: "Motion",
			params: [select("motion", "Motion", ["None", "Rotate", "Flow outward"], 0, { shuffle: true }), cycles(1, { showIf: neq("motion", 0) })],
		},
	],
	position: ["cx", "cy"],
	covers: (p) => p.fill !== 1,
	seeThrough: { fill: 1 },
	frag: /* glsl */ `
float shapeWave(float w) {
  // w is a 0..1 sawtooth. Ramp keeps it (graded rays), Smooth rounds it, Hard cuts it.
  if (u_profile == 1) return w;
  float c = 0.5 - 0.5 * cos(TAU * w);
  if (u_profile == 2) return smoothstep(0.5 - u_soft * 0.5 - 0.01, 0.5 + u_soft * 0.5 + 0.01, c);
  return mix(c, smoothstep(0.2, 0.8, c), 1.0 - u_soft);
}

vec4 run() {
  float m = min(u_comp.x, u_comp.y) * 0.5 * u_scale;
  vec2 p = (P() - (vec2(u_cx, u_cy) - 0.5) * u_comp) / m;
  float r = length(p);
  float a = atan(p.y, p.x) / TAU;          // -0.5..0.5
  float ph = u_phase * float(u_cycles);
  float n = float(u_count);
  // Rotating by one period per cycle (or flowing by one ring) lands exactly where it started.
  float spin = u_motion == 1 ? ph : 0.0;
  float flowOut = u_motion == 2 ? ph : 0.0;
  float f;
  if (u_mode == 0) f = shapeWave(fract(a * n + u_twist * r * 0.25 - spin));
  else if (u_mode == 1) f = shapeWave(fract(a * n + (u_twist + 1.5) * r - spin));
  else if (u_mode == 2) f = shapeWave(fract(r * n * 0.5 - flowOut));
  else if (u_mode == 3) f = shapeWave(fract(a * n + log(max(r, 1e-3)) * (u_twist + 2.0) - flowOut - spin));
  else if (u_mode == 5) {
    // Spiral: Archimedean, so the coil keeps an even gap like Rings (Count sets how tight it winds).
    // Arms are extra coils, evenly offset. Direction is read from the centre outward (P() has y up,
    // so angle grows anticlockwise). One loop rotates it by one arm, or flows it out by one gap.
    float dir = u_turn == 0 ? 1.0 : -1.0;
    f = shapeWave(fract(r * n * 0.5 + dir * (a * float(u_arms) - spin) - flowOut));
  } else {
    // Petals: a rose curve, filled with a gradient that brightens towards the tips.
    float k = abs(cos(PI * (a * n - spin)));
    float edge = 0.25 + 0.75 * pow(k, max(0.3, 2.0 + u_twist * 0.5));
    float d = r - edge;
    f = (1.0 - smoothstep(-0.02 - u_soft * 0.3, 0.02, d)) * mix(0.35, 1.0, clamp(r / max(edge, 1e-3), 0.0, 1.0));
  }
  if (u_motion == 2 && u_mode != 2 && u_mode != 3 && u_mode != 5) f *= 0.65 + 0.35 * (0.5 + 0.5 * cos(TAU * (r * 2.0 - flowOut)));
  f *= smoothstep(u_hole, u_hole + 0.03, r);
  f *= 1.0 - smoothstep(1.0 - u_fade * 0.6, 1.0 + u_fade * 0.8, r) * u_fade;
  f = clamp(f, 0.0, 1.0);
  if (u_fill == 1) return vec4(u_colorA, f);
  return vec4(mix(u_colorB, u_colorA, f), 1.0);
}`,
};
