import { bool, color, cycles, eq, float, neq, select } from "../params";
import type { LayerDef } from "../types";

// Topographic rings around the mark: lines (or alternating bands) at equal distances from its edge.
// Near the logo they follow its cuts and cavities; further out they round off into soft squares.
export const contours: LayerDef = {
	type: "contours",
	kind: "source",
	category: "pattern",
	label: "Contours",
	icon: "Contours",
	description: "Rings that echo the mark's outline outwards, like a topographic map",
	groups: [
		{
			title: "Rings",
			params: [
				float("size", "Mark size", 20, 3000, 360, { unit: "px", shuffle: [160, 700] }),
				float("spacing", "Spacing", 4, 400, 36, { unit: "px", shuffle: [16, 90] }),
				float("fade", "Fade out", 0, 1, 0, { step: 0.01, shuffle: [0, 0.8] }),
				float("angle", "Rotation", -180, 180, 0, { unit: "°", step: 1, shuffle: false }),
				float("cx", "Centre X", 0, 1, 0.5, { step: 0.001 }),
				float("cy", "Centre Y", 0, 1, 0.5, { step: 0.001 }),
			],
		},
		{
			title: "Style",
			params: [
				select("logo", "Logo", ["Auto", "Dark mode", "Light mode"], 0),
				select("style", "Style", ["Lines", "Bands"], 0, { shuffle: true }),
				float("line", "Line width", 0.5, 24, 2, { unit: "px", showIf: eq("style", 0), shuffle: [1, 4] }),
				color("colorA", "Colour", "$pink"),
				color("colorB", "Second colour", "$plum", { showIf: eq("style", 1) }),
				bool("showMark", "Show mark", true, { shuffle: true }),
				color("markColor", "Mark colour", "$light", { showIf: (p) => p.showMark !== false }),
			],
		},
		{
			title: "Motion",
			params: [
				select("motion", "Motion", ["None", "Outward", "Inward"], 1, { shuffle: true }),
				cycles(1, { showIf: neq("motion", 0) }),
			],
		},
	],
	position: ["cx", "cy"],
	// Bands paint everything outside the mark, so they hide what's below unless the mark is hollow or they fade.
	covers: (p) => p.style === 1 && p.showMark !== false && !Number(p.fade),
	seeThrough: { style: 0 },
	frag: /* glsl */ `
vec4 run() {
  vec2 p = rot(-radians(u_angle)) * (P() - (vec2(u_cx, u_cy) - 0.5) * u_comp);
  // Distance from the mark's edge in px, positive outside.
  float d = markSD(p / u_size) * u_size;
  float dir = u_motion == 0 ? 0.0 : (u_motion == 1 ? 1.0 : -1.0);
  // One ring spacing per cycle, so the rings land where they started.
  float t = d / u_spacing - dir * u_phase * float(u_cycles);
  float fade = u_fade > 0.0 ? clamp(1.0 - d / (u_fade * max(u_comp.x, u_comp.y)), 0.0, 1.0) : 1.0;
  vec4 rings;
  if (u_style == 0) {
    float ld = abs(fract(t + 0.5) - 0.5) * u_spacing;
    rings = vec4(u_colorA, fillAA(ld - u_line * 0.5));
  } else {
    // Alternating bands, antialiased at each boundary.
    float tri = abs(fract(t * 0.5) * 2.0 - 1.0);
    rings = vec4(mix(u_colorB, u_colorA, fillAA((0.5 - tri) * u_spacing)), 1.0);
  }
  rings.a *= fade * fillAA(-d);
  if (u_showMark == 0) return rings;
  float m = fillAA(d);
  float a = m + rings.a * (1.0 - m);
  return vec4(a > 0.0 ? (u_markColor * m + rings.rgb * rings.a * (1.0 - m)) / a : rings.rgb, a);
}`,
};
