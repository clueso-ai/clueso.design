import { bool, color, cycles, eq, float, neq, select } from "../params";
import type { LayerDef, Params } from "../types";

// The Clueso mark, rendered from an SDF so it stays crisp at any size and can be stroked or glowed.
// The logo's three official colourways. Brand is the pink gradient from the master SVG
// (#FE89EB → #C12EAF); Dark and Light are the solid one-colour marks. Custom exposes the controls.
const THEMES: Params[] = [
	{ fill: 1, colorA: "$magenta", colorB: "$light" },
	{ fill: 0, colorA: "$ink", colorB: "$plum" },
	{ fill: 0, colorA: "$paper", colorB: "$blush" },
];

export const mark: LayerDef = {
	type: "mark",
	kind: "source",
	category: "brand",
	label: "Mark",
	icon: "Shapes",
	description: "The Clueso mark: single, tiled or bricked",
	groups: [
		{
			title: "Layout",
			params: [
				select("layout", "Layout", ["Single", "Grid", "Brick"], 0, { shuffle: [1, 2] }),
				float("size", "Size", 8, 3000, 360, { unit: "px", shuffle: [60, 260] }),
				float("rotation", "Rotation", -180, 180, 0, { unit: "°", step: 1, shuffle: false }),
				float("spacing", "Spacing", 1, 4, 1.4, { step: 0.01, showIf: neq("layout", 0), shuffle: [1.1, 2.2] }),
				bool("randRot", "Random turns", false, { showIf: neq("layout", 0), shuffle: true }),
				float("missing", "Missing", 0, 1, 0, { step: 0.01, showIf: neq("layout", 0), shuffle: [0, 0.4] }),
				float("x", "X", 0, 1, 0.5, { step: 0.001 }),
				float("y", "Y", 0, 1, 0.5, { step: 0.001 }),
			],
		},
		{
			title: "Style",
			params: [
				select("logo", "Logo", ["Auto", "Dark mode", "Light mode"], 0),
				select("style", "Style", ["Fill", "Outline", "Glow"], 0, { shuffle: true }),
				float("stroke", "Stroke / glow", 0.5, 80, 3, { unit: "px", showIf: neq("style", 0) }),
				select("theme", "Colour", ["Brand", "Dark", "Light", "Custom"], 0),
				select("fill", "Fill", ["Solid", "Mark gradient"], 1, { showIf: eq("theme", 3), shuffle: true }),
				color("colorA", "Primary", "$magenta", { showIf: eq("theme", 3) }),
				color("colorB", "Highlight / back", "$light", { showIf: (p) => p.theme === 3 && (p.fill === 1 || p.motion === 2) }),
			],
		},
		{
			title: "Motion",
			params: [
				select("motion", "Motion", ["None", "Spin", "Flip", "Snap build"], 0, { shuffle: true }),
				select("axis", "Flip axis", ["Vertical", "Horizontal", "135° diagonal"], 2, { showIf: eq("motion", 2), shuffle: true }),
				cycles(1, { showIf: neq("motion", 0) }),
			],
		},
	],
	position: ["x", "y"],
	// Repeated marks read the baked logo; a single big one stays exact.
	defines: (p) => (p.layout === 0 ? [] : ["FAST_MARK"]),
	onParamChange: (key, value, params) => (key === "theme" && THEMES[value as number] ? { ...params, ...THEMES[value as number] } : params),
	// Which colourway the colours already match (presets and older files only set colours).
	normalize: (p) => {
		const i = THEMES.findIndex((t) => t.fill === p.fill && t.colorA === p.colorA && (t.fill === 0 || t.colorB === p.colorB));
		return { ...p, theme: i >= 0 ? i : 3 };
	},
	frag: /* glsl */ `
vec4 run() {
  vec2 p = P() - (vec2(u_x, u_y) - 0.5) * u_comp;
  float baseAng = radians(u_rotation);
  float ph = TAU * u_phase * float(u_cycles);
  float best = 1e9;
  vec2 bestM = vec2(0.0);
  float bestShade = 1.0, bestFlip = 0.0, bestAlpha = 1.0;
  float cellSize = u_size * u_spacing;
  int reach = u_layout == 0 ? 0 : 1;
  if (u_layout != 0 && u_motion != 3) reach = u_spacing >= 1.42 ? 0 : 1;
  vec2 g = p / cellSize;
  float rowOff = 0.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      if ((abs(i) > reach || abs(j) > reach)) continue;
      vec2 cell = vec2(0.0);
      vec2 q = p;
      if (u_layout != 0) {
        float row = floor(g.y + 0.5) + float(j);
        rowOff = u_layout == 2 ? mod(row, 2.0) * 0.5 : 0.0;
        cell = vec2(floor(g.x - rowOff + 0.5) + float(i), row);
        if (hash12(cell * 3.3 + u_seed) < u_missing) continue;
        q = p - (cell + vec2(rowOff, 0.0)) * cellSize;
      }
      float h = hash12(cell * 1.91 + u_seed);
      float ang = baseAng;
      if (u_randRot == 1) ang += floor(h * 4.0) * PI * 0.5;
      float sc = 1.0, shade = 1.0, back = 0.0, s = 0.0, flip = 0.0, alpha = 1.0;
      if (u_motion == 1) {
        float spin = ph * (u_layout == 0 ? 1.0 : (h < 0.5 ? 1.0 : -1.0));
        ang -= spin;
        // In a grid, spinning marks shrink to stay inside their cell.
        if (u_layout != 0) sc = turnFit(spin);
      }
      vec2 local = q / u_size;
      if (u_motion == 2) {
        flip = mod(flipState(u_phase * float(u_cycles) * 2.0 + (cell.x - cell.y) * 0.08, max(float(u_cycles) * 2.0, 1.0), s), 2.0);
        local = flipCoords(local, s, u_axis, back, shade);
      }
      if (u_motion == 3) local -= snapBuild((cell + vec2(rowOff, 0.0)) * cellSize + (vec2(u_x, u_y) - 0.5) * u_comp, fract(ph / TAU), 0.5, alpha) * u_spacing;
      if (alpha <= 0.0) continue;
      vec2 m = rot(-ang) * local / sc;
      #ifdef FAST_MARK
      float d = markSDFast(m) * u_size * sc;
#else
      float d = markSD(m) * u_size * sc;
#endif
      if (d < best) { best = d; bestM = m; bestShade = shade; bestFlip = flip; bestAlpha = alpha; }
    }
  }
  float cov;
  if (u_style == 0) cov = fillAA(best);
  else if (u_style == 1) cov = fillAA(abs(best) - u_stroke * 0.5);
  else cov = max(fillAA(best), exp(-max(best, 0.0) / max(u_stroke, 0.5)) * 0.85);
  // The back of a flipped mark swaps its colours.
  vec3 a = bestFlip > 0.5 ? u_colorB : u_colorA;
  vec3 b = bestFlip > 0.5 ? u_colorA : u_colorB;
  vec3 col = u_fill == 1 ? mix(b, a, markGradT(bestM)) : a;
  return vec4(col * bestShade, cov * bestAlpha);
}`,
};
