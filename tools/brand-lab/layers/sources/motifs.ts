import { color, cycles, eq, float, neq, select } from "../params";
import type { LayerDef } from "../types";

// Brand motifs: the things Clueso is about (play, cloud, speech, cursor, document, browser, waveform,
// camera, sparkle, check, chart) drawn in the mark's geometry: soft corners, circular cavities and the
// logo's two 135° breaks, which split any motif into top, middle and bottom parts like the mark.

export const MOTIFS = ["Play button", "Cloud", "Speech bubble", "Cursor", "Document", "Browser", "Waveform", "Video camera", "Sparkle", "Check badge", "Chart"];

export const motifs: LayerDef = {
	type: "motif",
	kind: "source",
	category: "brand",
	label: "Motifs",
	icon: "Motif",
	description: "Play button, cloud, cursor, document and more, cut by the logo's 135° breaks",
	groups: [
		{
			title: "Motif",
			params: [
				select("motif", "Shape", MOTIFS, 0, { shuffle: true }),
				select("breaks", "Breaks", ["None", "One", "Two (like the mark)"], 2, { shuffle: true }),
				float("gap", "Break width", 0.005, 0.12, 0.045, { step: 0.001, showIf: neq("breaks", 0), shuffle: [0.03, 0.07] }),
				float("offset", "Break position", -0.3, 0.3, 0, { step: 0.005, showIf: neq("breaks", 0), shuffle: [-0.12, 0.12] }),
				float("explode", "Explode", 0, 1, 0, { step: 0.01, showIf: neq("breaks", 0), shuffle: false }),
			],
		},
		{
			title: "Layout",
			params: [
				float("size", "Size", 20, 4000, 560, { unit: "px", shuffle: [500, 800] }),
				float("rotation", "Rotation", -180, 180, 0, { unit: "°", step: 1, shuffle: false }),
				float("x", "X", 0, 1, 0.5, { step: 0.001 }),
				float("y", "Y", 0, 1, 0.5, { step: 0.001 }),
			],
		},
		{
			title: "Style",
			params: [
				select("style", "Style", ["Fill", "Outline"], 0, { shuffle: [0, 0] }),
				float("stroke", "Stroke", 0.5, 40, 3, { unit: "px", showIf: eq("style", 1) }),
				select("fill", "Colour", ["Per part", "Mark gradient", "Solid"], 0, { shuffle: true }),
				color("colorA", "Top / primary", "$light"),
				color("colorB", "Middle", "$pink", { showIf: neq("fill", 2) }),
				color("colorC", "Bottom", "$magenta", { showIf: eq("fill", 0) }),
			],
		},
		{
			title: "Motion",
			params: [
				select("motion", "Motion", ["None", "Assemble", "Flip", "Turn"], 0, { shuffle: true }),
				select("axis", "Flip axis", ["Vertical", "Horizontal", "135° diagonal"], 2, { showIf: eq("motion", 2) }),
				float("amount", "Amount", 0, 1, 0.5, { step: 0.01, showIf: eq("motion", 1) }),
				cycles(1, { showIf: neq("motion", 0) }),
			],
		},
	],
	position: ["x", "y"],
	frag: /* glsl */ `
const float R2 = 0.70710678;

float sdRBox(vec2 p, vec2 b, float r) { vec2 d = abs(p) - b + r; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r; }
float sdCircle(vec2 p, vec2 c, float r) { return length(p - c) - r; }
float sdTri(vec2 p, vec2 p0, vec2 p1, vec2 p2) {
  vec2 e0 = p1 - p0, e1 = p2 - p1, e2 = p0 - p2;
  vec2 v0 = p - p0, v1 = p - p1, v2 = p - p2;
  vec2 pq0 = v0 - e0 * clamp(dot(v0, e0) / dot(e0, e0), 0.0, 1.0);
  vec2 pq1 = v1 - e1 * clamp(dot(v1, e1) / dot(e1, e1), 0.0, 1.0);
  vec2 pq2 = v2 - e2 * clamp(dot(v2, e2) / dot(e2, e2), 0.0, 1.0);
  float s = sign(e0.x * e2.y - e0.y * e2.x);
  vec2 d = min(min(vec2(dot(pq0, pq0), s * (v0.x * e0.y - v0.y * e0.x)), vec2(dot(pq1, pq1), s * (v1.x * e1.y - v1.y * e1.x))), vec2(dot(pq2, pq2), s * (v2.x * e2.y - v2.y * e2.x)));
  return -sqrt(d.x) * sign(d.y);
}
float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }

// One motif in the unit box (-0.5..0.5, y up). Negative inside.
float motifSD(vec2 q) {
  int m = u_motif;
  if (m == 0) {
    // Play button: a video frame with the play triangle cut out.
    float d = sdRBox(q, vec2(0.47, 0.34), 0.07);
    float tri = sdTri(q, vec2(-0.1, 0.16), vec2(-0.1, -0.16), vec2(0.18, 0.0)) - 0.025;
    return max(d, -tri);
  }
  if (m == 1) {
    // Cloud: cavity-sized circles on a soft base.
    float d = sdRBox(q - vec2(0.0, -0.13), vec2(0.42, 0.13), 0.13);
    d = smin(d, sdCircle(q, vec2(-0.17, -0.02), 0.19), 0.04);
    d = smin(d, sdCircle(q, vec2(0.07, 0.08), 0.25), 0.04);
    d = smin(d, sdCircle(q, vec2(0.28, -0.07), 0.15), 0.04);
    return d;
  }
  if (m == 2) {
    // Speech bubble with a 135° tail.
    float d = sdRBox(q - vec2(0.0, 0.07), vec2(0.45, 0.3), 0.09);
    float tail = sdTri(q, vec2(-0.3, -0.2), vec2(-0.06, -0.2), vec2(-0.38, -0.44)) - 0.015;
    return min(d, tail);
  }
  if (m == 3) {
    // Cursor: an arrowhead with its tail on the 135° diagonal.
    float head = sdTri(q, vec2(-0.3, 0.44), vec2(-0.3, -0.16), vec2(0.16, 0.06)) - 0.02;
    float tail = sdSegment(q, vec2(-0.06, -0.02), vec2(0.2, -0.4)) - 0.065;
    return min(head, tail);
  }
  if (m == 4) {
    // Document: the top-right corner cut on the 135° line, three lines of text cut out.
    float d = sdRBox(q, vec2(0.34, 0.45), 0.04);
    d = max(d, (q.x + q.y - 0.56) * R2);
    float lines = min(min(sdSegment(q, vec2(-0.2, 0.08), vec2(0.18, 0.08)), sdSegment(q, vec2(-0.2, -0.08), vec2(0.18, -0.08))), sdSegment(q, vec2(-0.2, -0.24), vec2(0.06, -0.24))) - 0.025;
    return max(d, -lines);
  }
  if (m == 5) {
    // Browser window: a frame, its screen cut out, three dots in the bar.
    float d = sdRBox(q, vec2(0.47, 0.37), 0.06);
    float screen = sdRBox(q - vec2(0.0, -0.07), vec2(0.41, 0.25), 0.03);
    float dots = min(min(sdCircle(q, vec2(-0.37, 0.28), 0.028), sdCircle(q, vec2(-0.28, 0.28), 0.028)), sdCircle(q, vec2(-0.19, 0.28), 0.028));
    return max(max(d, -screen), -dots);
  }
  if (m == 6) {
    // Waveform: capsule bars.
    float d = 1e9;
    for (int i = 0; i < 7; i++) {
      float x = -0.39 + float(i) * 0.13;
      float h = i == 0 ? 0.14 : i == 1 ? 0.28 : i == 2 ? 0.42 : i == 3 ? 0.3 : i == 4 ? 0.4 : i == 5 ? 0.22 : 0.1;
      d = min(d, sdSegment(q, vec2(x, -h), vec2(x, h)) - 0.045);
    }
    return d;
  }
  if (m == 7) {
    // Video camera: a body with the lens cut out, and the viewfinder wedge.
    float body = sdRBox(q - vec2(-0.09, 0.0), vec2(0.32, 0.25), 0.06);
    body = max(body, -sdCircle(q, vec2(-0.09, 0.0), 0.11));
    float wedge = sdTri(q, vec2(0.25, 0.0), vec2(0.46, 0.2), vec2(0.46, -0.2)) - 0.02;
    return min(body, wedge);
  }
  if (m == 8) {
    // Sparkle: a four-point star, its sides scooped by circles.
    float d = (abs(q.x) + abs(q.y) - 0.48) * R2;
    float r = 0.3;
    float k = 0.36;
    float c = min(min(sdCircle(q, vec2(k), r), sdCircle(q, vec2(-k, k), r)), min(sdCircle(q, vec2(k, -k), r), sdCircle(q, vec2(-k), r)));
    return max(d, -c);
  }
  if (m == 9) {
    // Check badge: a disc with the check cut out.
    float d = sdCircle(q, vec2(0.0), 0.45);
    float tick = min(sdSegment(q, vec2(-0.19, 0.0), vec2(-0.05, -0.14)), sdSegment(q, vec2(-0.05, -0.14), vec2(0.21, 0.14))) - 0.05;
    return max(d, -tick);
  }
  // Chart: three rising bars.
  float d = sdRBox(q - vec2(-0.29, -0.25), vec2(0.09, 0.2), 0.03);
  d = min(d, sdRBox(q - vec2(0.0, -0.12), vec2(0.09, 0.33), 0.03));
  return min(d, sdRBox(q - vec2(0.29, 0.02), vec2(0.09, 0.47), 0.03));
}

// The 135° breaks: s runs along the diagonal (the same direction as the mark's breaks).
// Part 0 = top, 1 = middle, 2 = bottom.
int partOf(float s) {
  if (u_breaks == 0) return 0;
  float b = u_offset;
  if (u_breaks == 1) return s > b ? 0 : 2;
  return s > b + 0.16 ? 0 : (s < b - 0.16 ? 2 : 1);
}

vec4 run() {
  vec2 p = rot(-radians(u_rotation)) * (P() - (vec2(u_x, u_y) - 0.5) * u_comp);
  vec2 q = p / u_size;
  float ph = u_phase * float(u_cycles);
  float shade = 1.0, back = 0.0, s = 0.0, flip = 0.0;
  if (u_motion == 3) {
    // Turn a quarter at a time, scaled to stay inside its square.
    float t = fract(ph);
    float a = smoothstep(0.15, 0.85, t) * PI * 0.5;
    q = rot(-a) * q / turnFit(a);
  }
  if (u_motion == 2) {
    flip = mod(flipState(ph * 2.0, max(float(u_cycles) * 2.0, 1.0), s), 2.0);
    q = flipCoords(q, s, u_axis, back, shade);
  }
  // Explode / Assemble push the parts apart along the diagonal (loops start and end assembled).
  float e = u_explode;
  if (u_motion == 1) { float t = fract(ph); e += smoothstep(0.15, 0.45, t) * (1.0 - smoothstep(0.55, 0.85, t)) * u_amount; }
  vec2 dir = vec2(R2);
  float best = 1e9;
  int which = 0;
  vec2 bestQ = q;
  for (int i = 0; i < 3; i++) {
    if (u_breaks == 0 && i > 0) break;
    if (u_breaks == 1 && i == 1) continue;
    float shift = (1.0 - float(i)) * 0.18 * e * (u_breaks == 1 ? 1.4 : 1.0);
    if (u_breaks == 1 && i == 2) shift = -0.25 * e;
    if (u_breaks == 1 && i == 0) shift = 0.25 * e;
    vec2 lq = q - dir * shift;
    float d = motifSD(lq);
    if (u_breaks > 0) {
      float sd = dot(lq, dir);
      // Keep only this part's band, minus half the break width on each cut.
      float b = u_offset, g = u_gap * 0.5;
      float band;
      if (u_breaks == 1) band = i == 0 ? (b + g) - sd : sd - (b - g);
      else band = i == 0 ? (b + 0.16 + g) - sd : (i == 2 ? sd - (b - 0.16 - g) : max(sd - (b + 0.16 - g), (b - 0.16 + g) - sd));
      d = max(d, band);
    }
    if (d < best) { best = d; which = i; bestQ = lq; }
  }
  float dpx = best * u_size;
  float cov = u_style == 1 ? fillAA(abs(dpx) - u_stroke * 0.5) : fillAA(dpx);
  vec3 col;
  if (u_fill == 2) col = flip > 0.5 ? u_colorB : u_colorA;
  else if (u_fill == 1) col = mix(flip > 0.5 ? u_colorA : u_colorB, flip > 0.5 ? u_colorB : u_colorA, markGradT(bestQ));
  else {
    int k = (which + int(flip)) - ((which + int(flip)) / 3) * 3;
    col = k == 0 ? u_colorA : (k == 1 ? u_colorB : u_colorC);
  }
  return vec4(col * shade, cov);
}`,
};
