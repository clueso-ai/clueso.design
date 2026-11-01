import { color, cycles, eq, float, neq, select } from "../params";
import type { LayerDef } from "../types";

// Interlocking puzzle pieces from the brand's shape system: every edge is flat, a cavity or an
// extrusion (3^4 = 81 permutations). Shared edges are hashed once, so neighbours always fit.
// Cavity geometry matches the mark: radius 0.18, centre 0.06 in from the edge.
export const puzzle: LayerDef = {
	type: "puzzle",
	kind: "source",
	category: "brand",
	label: "Puzzle",
	icon: "JigsawPuzzle",
	description: "Interlocking pieces built from the mark's edge grammar",
	groups: [
		{
			title: "Grid",
			params: [
				float("size", "Piece size", 24, 600, 160, { unit: "px", shuffle: [80, 320] }),
				float("gap", "Gap", 0, 60, 10, { unit: "px", shuffle: [0, 24] }),
				float("angle", "Rotation", -180, 180, 0, { unit: "°", step: 1, shuffle: false }),
				float("interlock", "Interlock", 0, 1, 0.85, { step: 0.01, shuffle: [0.4, 1] }),
				float("missing", "Missing pieces", 0, 1, 0, { step: 0.01, shuffle: [0, 0.4] }),
			],
		},
		{
			title: "Breaks",
			params: [
				select("breaks", "Visual breaks", ["None", "One", "Two (mark)"], 2, { shuffle: true }),
				select("breakDir", "Corner", ["Top-right first", "Any"], 0, { showIf: neq("breaks", 0), shuffle: true }),
				float("breakWidth", "Break width", 0.3, 2, 1, { step: 0.01, showIf: neq("breaks", 0), shuffle: [0.6, 1.4] }),
			],
		},
		{
			title: "Style",
			params: [
				select("style", "Style", ["Fill", "Outline"], 0, { shuffle: true }),
				float("stroke", "Stroke", 0.5, 24, 3, { unit: "px", showIf: eq("style", 1) }),
				select("fill", "Colour", ["Solid", "Two-tone", "Three-tone", "Mark gradient"], 3, { shuffle: true }),
				color("colorA", "Primary", "$magenta"),
				color("colorB", "Secondary", "$light", { showIf: (p) => p.fill !== 0 || p.motion === 1 }),
				color("colorC", "Tertiary", "$pink", { showIf: eq("fill", 2) }),
			],
		},
		{
			title: "Motion",
			params: [
				select("motion", "Motion", ["None", "Flip", "Snap build", "Assemble", "Turn"], 2, { shuffle: true }),
				select("axis", "Flip axis", ["Vertical", "Horizontal", "135° diagonal"], 2, { showIf: eq("motion", 1), shuffle: true }),
				float("amount", "Amount", 0, 1, 0.5, { step: 0.01, showIf: eq("motion", 3, 4) }),
				float("spread", "Stagger", 0, 2, 0.35, { step: 0.01, showIf: neq("motion", 0) }),
				cycles(1, { showIf: neq("motion", 0) }),
			],
		},
	],
	frag: /* glsl */ `
int edgeState(vec2 e, float salt) {
  if (hash12(e * 1.73 + vec2(salt * 9.1, u_seed)) > u_interlock) return 0;
  return hash12(e * 0.71 + vec2(u_seed * 3.1, salt + 7.0)) < 0.5 ? -1 : 1;
}

float applyEdge(float d, vec2 p, vec2 n, int s) {
  if (s == 0) return d;
  if (s < 0) return max(d, -(sdSegment(p, n * 0.44, n * 0.9) - 0.18));
  return min(d, sdSegment(p, n * 0.40, n * 0.56) - 0.18);
}

float slab(float k, float c, float h) { return (abs(k - c) - h) * 0.70710678; }

// Breaks go into a corner whose two edges carry no extrusion, exactly like the mark (flat top/right,
// breaks in the top-right corner), so knobs are never cut and pieces still interlock.
float pieceSD(vec2 p, vec2 cell) {
  int t = edgeState(cell, 1.0);
  int b = -edgeState(cell - vec2(0.0, 1.0), 1.0);
  int r = edgeState(cell, 2.0);
  int l = -edgeState(cell - vec2(1.0, 0.0), 2.0);
  float d = sdBox(p, vec2(0.47)) - 0.03;
  if (u_breaks > 0) {
    int start = u_breakDir == 1 ? int(floor(hash12(cell * 4.7 + u_seed) * 4.0)) : 0;
    for (int i = 0; i < 4; i++) {
      int c = (start + i) - ((start + i) / 4) * 4;
      // corners: 0 top-right, 1 top-left, 2 bottom-left, 3 bottom-right
      vec2 dir = c == 0 ? vec2(1, 1) : (c == 1 ? vec2(-1, 1) : (c == 2 ? vec2(-1, -1) : vec2(1, -1)));
      int he = dir.y > 0.0 ? t : b;
      int ve = dir.x > 0.0 ? r : l;
      if (he > 0 || ve > 0) continue;
      float k = dot(p, dir);
      float h = 0.08 * u_breakWidth;
      if (u_breaks == 1) d = max(d, -slab(k, 0.42, h));
      else { d = max(d, -slab(k, 0.24, h)); d = max(d, -slab(k, 0.60, h)); }
      break;
    }
  }
  d = applyEdge(d, p, vec2(0.0, 1.0), t);
  d = applyEdge(d, p, vec2(0.0, -1.0), b);
  d = applyEdge(d, p, vec2(1.0, 0.0), r);
  d = applyEdge(d, p, vec2(-1.0, 0.0), l);
  return d;
}

vec4 run() {
  vec2 q = rot(-radians(u_angle)) * P() / u_size;
  vec2 cell0 = floor(q + 0.5);
  float bestD = 1e9;
  vec2 bestCell = vec2(0.0);
  vec2 bestP = vec2(0.0);
  float bestShade = 1.0, bestFlip = 0.0, bestAlpha = 1.0;
  float ph = TAU * u_phase * float(u_cycles);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 c = cell0 + vec2(float(i), float(j));
      if (hash12(c * 3.17 + u_seed * 1.3) < u_missing) continue;
      float h = hash12(c + u_seed * 13.7);
      float wave = 0.5 + 0.5 * sin(ph - (c.x + c.y) * u_spread * PI);
      vec2 p = q - c;
      float sc = 1.0, ang = 0.0, flipS = 0.0, back = 0.0, alpha = 1.0, shade = 1.0, flipped = 0.0;
      vec2 off = vec2(0.0);
      if (u_motion == 1) {
        // Each flip turns the piece over to its other colour.
        float st = flipState(u_phase * float(u_cycles) * 2.0 + (c.x - c.y) * u_spread * 0.12, max(float(u_cycles) * 2.0, 1.0), flipS);
        p = flipCoords(p, flipS, u_axis, back, shade);
        flipped = mod(st, 2.0);
      }
      if (u_motion == 2) off = snapBuild(c * u_size, fract(ph / TAU), u_spread * 0.5, alpha);
      if (u_motion == 3) {
        float t = pow(wave, 3.0);
        vec2 dir = normalize(hash22(c + u_seed) - 0.5 + 1e-3);
        off = dir * t * u_amount * 0.5;
        sc = 1.0 - t * u_amount * 0.4;
      }
      if (u_motion == 4) {
        ang = smoothstep(0.2, 0.8, wave) * PI * 0.5 * floor(1.0 + u_amount * 3.99);
        sc = turnFit(ang);
      }
      if (alpha <= 0.0) continue;
      p = rot(-ang) * (p - off) / sc;
      float d = pieceSD(p, c) * sc * u_size + u_gap * 0.5;
      // A piece still arriving never wins a pixel from one that has landed (no ghosting at the front).
      d += (1.0 - alpha) * u_size;
      if (d < bestD) { bestD = d; bestCell = c; bestP = p; bestShade = shade; bestFlip = flipped; bestAlpha = alpha; }
    }
  }
  bestD -= (1.0 - bestAlpha) * u_size;
  float cov = (u_style == 1 ? fillAA(abs(bestD) - u_stroke * 0.5) : fillAA(bestD)) * bestAlpha;
  // A flipped piece shows its back: the next colour along.
  float h = fract(hash12(bestCell * 7.13 + u_seed) + bestFlip * 0.5);
  vec3 col = bestFlip > 0.5 ? u_colorB : u_colorA;
  if (u_fill == 1) col = h < 0.5 ? u_colorA : u_colorB;
  if (u_fill == 2) col = h < 0.34 ? u_colorA : (h < 0.67 ? u_colorB : u_colorC);
  if (u_fill == 3) col = bestFlip > 0.5 ? mix(u_colorA, u_colorB, markGradT(bestP)) : mix(u_colorB, u_colorA, markGradT(bestP));
  return vec4(col * bestShade, cov);
}`,
};
