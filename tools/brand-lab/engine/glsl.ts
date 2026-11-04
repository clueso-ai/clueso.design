import { MARK_PARTS, type RoundedPoly } from "../brand/mark";

const f = (n: number) => (Number.isInteger(n) ? n.toFixed(1) : String(Number(n.toFixed(5))));
const v2 = ([x, y]: [number, number]) => `vec2(${f(x)}, ${f(y)})`;

/**
 * Exact SDF of a convex polygon with a radius per corner. Outside, every point is either in an
 * edge's slab (half-plane distance) or in a corner's cone (distance to that corner's arc).
 */
function roundedPolyFn(name: string, poly: RoundedPoly) {
	const planes = poly.edges.map((e) => `dot(p - ${v2(e.p)}, ${v2(e.n)})`);
	const corners = poly.corners
		.map(({ c, r, din, dout }) => `  q = p - ${v2(c)}; if (dot(q, ${v2(din)}) > 0.0 && dot(q, ${v2(dout)}) < 0.0) return length(q) - ${f(r)};`)
		.join("\n");
	return `float ${name}(vec2 p) {
  vec2 q;
${corners}
  return ${planes.reduce((acc, pl) => (acc ? `max(${acc}, ${pl})` : pl), "")};
}`;
}

/** Fraction of the bake texture the mark box spans; the rest is padding for strokes and glows. */
export const MARK_BAKE_FRACTION = 0.8;
export const MARK_BAKE_SIZE = 1024;

export const VERT = /* glsl */ `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

/**
 * Shared prelude for every layer shader. Coordinates: `P()` is composition px from the
 * centre with y up, so shaders are resolution independent (preview == export).
 * Animation uses `u_phase` (0..1 across the loop) so every motion loops seamlessly.
 */
export const PRELUDE = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
in vec2 v_uv;
out vec4 outColor;
uniform vec2 u_res;
uniform vec2 u_comp;
uniform float u_time;
uniform float u_phase;
uniform float u_seed;
uniform sampler2D u_input;
uniform sampler2D u_tex;
uniform vec2 u_texSize;
uniform float u_markDark;
uniform sampler2D u_markL;
uniform sampler2D u_markD;
uniform float u_markBaked;
// The real canvas size. u_comp equals it, except for a framed background, where u_comp is the box's
// size and u_frame (centre x, y with y up, from the canvas centre; w, h) places the box on the canvas.
uniform vec2 u_canvas;
uniform vec4 u_frame;
uniform float u_frameRot;

#define PI 3.14159265359
#define TAU 6.28318530718

mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
vec2 P() {
  if (u_frame.z <= 0.0) return (v_uv - 0.5) * u_comp;
  return rot(-radians(u_frameRot)) * ((v_uv - 0.5) * u_canvas - u_frame.xy);
}
vec2 compPx() { return v_uv * u_comp; }
vec2 toUV(vec2 p) { return p / u_comp + 0.5; }
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

float hash11(float p) { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
vec3 hash32(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yxz + 33.33); return fract((p3.xxy + p3.yzz) * p3.zyx); }
float hash13(vec3 p3) { p3 = fract(p3 * 0.1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }

float noise(vec3 p) {
  vec3 i = floor(p); vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash13(i), hash13(i + vec3(1,0,0)), u.x), mix(hash13(i + vec3(0,1,0)), hash13(i + vec3(1,1,0)), u.x), u.y),
    mix(mix(hash13(i + vec3(0,0,1)), hash13(i + vec3(1,0,1)), u.x), mix(hash13(i + vec3(0,1,1)), hash13(i + vec3(1,1,1)), u.x), u.y),
    u.z);
}
float fbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
// Samples noise along a circle in (y, z) so animated noise loops exactly once per u_phase cycle.
vec3 loopP(vec2 p, float r, float cycles) { float a = TAU * u_phase * cycles; return vec3(p.x, p.y + cos(a) * r, sin(a) * r); }

// Antialias a distance in composition px. Uses the constant px footprint instead of fwidth(d), which
// spikes where cell-based SDFs are discontinuous and leaves hairline seams between tiles.
float fillAA(float d) { float w = u_canvas.x / u_res.x; return clamp(0.5 - d / w, 0.0, 1.0); }
float sdBox(vec2 p, vec2 b) { vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
float sdSegment(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }

// Clueso mark, built from its three parts (exact vector geometry, crisp at any size).
// q in [-0.5, 0.5]^2 is the mark box (y up), distances in mark units, positive outside.
// Parts: 0 top corner triangle, 1 middle slash, 2 bottom body with the two cavities.
// Two construction variants: light mode (the master SVG) and dark mode (thinner slash, wider
// breaks). u_markDark picks one per layer: the layer's Logo setting, or the background when Auto.
${roundedPolyFn("polyTopL", MARK_PARTS.light.top)}
${roundedPolyFn("polyMidL", MARK_PARTS.light.middle)}
${roundedPolyFn("polyBodyL", MARK_PARTS.light.body)}
${roundedPolyFn("polyMidD", MARK_PARTS.dark.middle)}
${roundedPolyFn("polyBodyD", MARK_PARTS.dark.body)}
// Rounded intersection: max(a, b) with the convex corner filleted by r.
float roundMax(float a, float b, float r) { vec2 u = max(vec2(a + r, b + r), 0.0); return min(max(a + r, b + r), 0.0) + length(u) - r; }
// The brand cavity: a capsule of radius 0.18 centred 0.06 in from the edge with normal n.
float cavitySD(vec2 q, vec2 n, float r) { return sdSegment(q, n * (0.5 - r / 3.0), n * 2.0) - r; }
float partSD(vec2 q, int part) {
  bool dark = u_markDark > 0.5;
  if (part == 0) return polyTopL(q);
  if (part == 1) return dark ? polyMidD(q) : polyMidL(q);
  float d = dark ? polyBodyD(q) : polyBodyL(q);
  // Cavity mouths are filleted with radius 2.
  d = roundMax(d, -cavitySD(q, vec2(-1.0, 0.0), 0.18), 0.02);
  return roundMax(d, -cavitySD(q, vec2(0.0, -1.0), 0.18), 0.02);
}
float markSD(vec2 q) { return min(min(partSD(q, 0), partSD(q, 1)), partSD(q, 2)); }
// Fast path for repeated marks (grids, echoes, halftone dots): the same distances baked into a
// texture once per renderer (R/G/B = top/middle/bottom part). Big single marks stay exact.
float partSDFast(vec2 q, int part) {
  if (u_markBaked < 0.5) return partSD(q, part);
  vec2 uv = q * ${MARK_BAKE_FRACTION.toFixed(4)} + 0.5;
  if (any(lessThan(uv, vec2(0.002))) || any(greaterThan(uv, vec2(0.998)))) return sdBox(q, vec2(0.5));
  vec4 t = u_markDark > 0.5 ? texture(u_markD, uv) : texture(u_markL, uv);
  return part == 0 ? t.r : (part == 1 ? t.g : t.b);
}
float markSDFast(vec2 q) {
  if (u_markBaked < 0.5) return markSD(q);
  vec2 uv = q * ${MARK_BAKE_FRACTION.toFixed(4)} + 0.5;
  if (any(lessThan(uv, vec2(0.002))) || any(greaterThan(uv, vec2(0.998)))) return sdBox(q, vec2(0.5));
  vec4 t = u_markDark > 0.5 ? texture(u_markD, uv) : texture(u_markL, uv);
  return min(min(t.r, t.g), t.b);
}
// The logo gradient direction: 0 at the top-right corner, 1 at the bottom-left.
float markGradT(vec2 q) { return clamp((0.58 - (q.x + q.y) * 0.5) / 1.225, 0.0, 1.0); }

// ── Brand tile motions, shared by the grid layers ──────────────────────────────────────
// Flip: a tile turned s*180° like a card. Local coords stretch along the flip axis so the shape
// squashes in place (never leaves its cell); past halfway the back face shows.
vec2 flipCoords(vec2 q, float s, int axis, out float back, out float shade) {
  float c = cos(PI * s);
  back = step(0.5, s);
  shade = 0.78 + 0.22 * abs(c);
  float k = max(abs(c), 1e-3);
  if (axis == 0) return vec2(q.x / k, q.y);
  if (axis == 1) return vec2(q.x, q.y / k);
  vec2 d = vec2(0.70710678);   // around the 135° line: squash across it, along (1, 1)
  float a = dot(q, d);
  return q + d * (a / k - a);
}
// One flip per beat, staggered by delay: s is the flip's progress, state counts flips so far
// (wraps with the loop, so exports stay seamless).
float flipState(float t, float beats, out float s) {
  float k = floor(t);
  s = smoothstep(0.0, 1.0, clamp(fract(t) / 0.45, 0.0, 1.0));
  return mod(k + step(0.5, s), beats);
}
// Snap: ease-out with a small overshoot, the click of a piece seating.
float easeSnap(float x) { x = clamp(x, 0.0, 1.0); float c1 = 1.25; return 1.0 + (c1 + 1.0) * pow(x - 1.0, 3.0) + c1 * pow(x - 1.0, 2.0); }
// Snap build: pieces arrive one after another along the 135° reading order (top-left first),
// hold, then clear the same way. centre is the tile centre in composition px. Returns the
// tile's slide (in tile units, from the right, where nothing has landed yet) and its alpha.
vec2 snapBuild(vec2 centre, float t, float spread, out float alpha) {
  float o = clamp(0.5 * ((centre.x / u_comp.x + 0.5) + (0.5 - centre.y / u_comp.y)), 0.0, 1.0);
  float arrive = o * mix(0.25, 0.55, clamp(spread, 0.0, 1.0));
  float leave = 0.78 + o * 0.15;
  float tin = clamp((t - arrive) / 0.09, 0.0, 1.0);
  float tout = clamp((t - leave) / 0.06, 0.0, 1.0);
  alpha = smoothstep(0.0, 0.35, tin) * (1.0 - tout);
  return vec2((1.0 - easeSnap(tin)) * 0.45 - tout * 0.2, 0.0);
}
// Turn without overlap: a square turned by a fits its cell when scaled by this.
float turnFit(float a) { return 1.0 / (abs(cos(a)) + abs(sin(a))); }

vec4 inputAt(vec2 uv) {
  vec4 c = texture(u_input, uv);
  return vec4(c.a > 0.0 ? c.rgb / c.a : vec3(0.0), c.a);
}
`;

export const COMPOSITE_FRAG = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
uniform sampler2D u_base;
uniform sampler2D u_src;
uniform int u_mode;
uniform float u_opacity;
uniform int u_srcPremult;
// An effect on a single layer that doesn't spill: it only changes pixels the layer already covers.
uniform int u_keepToBase;
// Layer styles. Gradient: 0 none, 1 linear, 2 radial, across u_gradRect (uv: x0, y0, x1, y1).
uniform int u_grad;
uniform vec3 u_gradA;
uniform vec3 u_gradB;
uniform vec4 u_gradRect;
uniform vec2 u_gradDir;
uniform vec2 u_aspect;
// Drop shadow: offset and blur radius in uv, colour, opacity. Blur reads the source's mip levels.
uniform int u_shadow;
uniform vec2 u_shadowOff;
uniform float u_shadowBlur;
uniform float u_shadowLod;
uniform vec3 u_shadowColor;
uniform float u_shadowOpacity;
// Framed backgrounds and Looks: clip to the box (centre, half size in composition px, y up), turned and rounded.
uniform int u_clip;
uniform vec4 u_clipBox;
uniform float u_clipRot;
uniform float u_clipRadius;
uniform vec2 u_clipComp;
uniform float u_clipPx;

float clipMask() {
  if (u_clip == 0) return 1.0;
  float a = radians(u_clipRot);
  vec2 p = mat2(cos(a), -sin(a), sin(a), cos(a)) * ((v_uv - 0.5) * u_clipComp - u_clipBox.xy);
  float r = min(u_clipRadius, min(u_clipBox.z, u_clipBox.w));
  vec2 d = abs(p) - (u_clipBox.zw - r);
  float sd = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
  return clamp(0.5 - sd / u_clipPx, 0.0, 1.0);
}

float shadowAlpha() {
  vec2 c = v_uv - u_shadowOff;
  if (u_shadowBlur <= 0.0) return texture(u_src, c).a;
  float a = 0.0, w = 0.0;
  for (int i = 0; i < 32; i++) {
    float fi = float(i);
    float r = sqrt((fi + 0.5) / 32.0);
    float th = fi * 2.39996323;
    float k = exp(-3.0 * r * r);
    a += textureLod(u_src, c + vec2(cos(th), sin(th)) * r * u_shadowBlur * vec2(1.0, u_aspect.x / u_aspect.y), u_shadowLod).a * k;
    w += k;
  }
  return a / w;
}

vec3 gradientColor() {
  vec2 lo = u_gradRect.xy, hi = u_gradRect.zw;
  // Work in canvas-proportioned space so angles and circles aren't squashed.
  vec2 p = (v_uv - (lo + hi) * 0.5) * u_aspect;
  vec2 half_ = (hi - lo) * 0.5 * u_aspect;
  float t;
  if (u_grad == 1) {
    float ext = abs(u_gradDir.x) * half_.x + abs(u_gradDir.y) * half_.y;
    t = dot(p, u_gradDir) / max(ext, 1e-5) * 0.5 + 0.5;
  } else {
    t = length(p / max(half_, vec2(1e-5)));
  }
  return mix(u_gradA, u_gradB, clamp(t, 0.0, 1.0));
}

vec3 blendMode(vec3 b, vec3 s, int m) {
  if (m == 1) return b * s;
  if (m == 2) return b + s - b * s;
  if (m == 3) return mix(2.0 * b * s, 1.0 - 2.0 * (1.0 - b) * (1.0 - s), step(0.5, b));
  if (m == 4) return min(b + s, 1.0);
  if (m == 5) return abs(b - s);
  if (m == 6) return (1.0 - 2.0 * s) * b * b + 2.0 * s * b;
  if (m == 7) return min(b / max(1.0 - s, 1e-3), 1.0);
  if (m == 8) return max(b, s);
  if (m == 9) return min(b, s);
  return s;
}

void main() {
  vec4 B = texture(u_base, v_uv);   // premultiplied
  vec4 S = texture(u_src, v_uv);    // straight, or premultiplied for a layer with its own effects
  if (u_srcPremult == 1) S.rgb = S.a > 0.0 ? S.rgb / S.a : vec3(0.0);
  S = clamp(S, 0.0, 1.0);
  if (u_shadow == 1) {
    // The shadow goes under the layer, composited normally.
    float sa = clamp(shadowAlpha() * u_shadowOpacity * u_opacity, 0.0, 1.0);
    B = vec4(u_shadowColor * sa + B.rgb * (1.0 - sa), sa + B.a * (1.0 - sa));
  }
  if (u_grad != 0) S.rgb = gradientColor();
  float as = S.a * u_opacity * clipMask();
  if (u_keepToBase == 1) as *= B.a;
  vec3 Cb = B.a > 0.0 ? B.rgb / B.a : vec3(0.0);
  vec3 mixed = (1.0 - B.a) * S.rgb + B.a * blendMode(Cb, S.rgb, u_mode);
  outColor = vec4(as * mixed + (1.0 - as) * B.rgb, as + B.a * (1.0 - as));
}`;

export const BLIT_FRAG = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
uniform sampler2D u_src;
void main() { outColor = texture(u_src, v_uv); }`;

export const CLEAR_FRAG = /* glsl */ `#version 300 es
precision highp float;
out vec4 outColor;
uniform vec4 u_color;
void main() { outColor = u_color; }`;

/** Bakes the exact part distances for one variant (set u_markDark) into an RGBA16F texture. */
export const MARK_BAKE_FRAG = `${PRELUDE}
void main() {
  vec2 q = (v_uv - 0.5) / ${MARK_BAKE_FRACTION.toFixed(4)};
  outColor = vec4(partSD(q, 0), partSD(q, 1), partSD(q, 2), 1.0);
}`;
