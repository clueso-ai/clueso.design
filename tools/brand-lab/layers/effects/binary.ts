import { bool, color, cycles, eq, float, int, neq, select } from "../params";
import type { LayerDef, Params, TextureContext, TextureRequest } from "../types";

const RAMPS = ["01", " .:-=+*#%@", "0123456789ABCDEF", "", "0123456789", "(){}[]<>;:=_.,+-*/%!?&|~^#$@abcdefxnrstil"];

/** Glyphs for the current mode. Ramp modes (ASCII, Custom) are ordered dark to light. */
function glyphs(p: Params) {
	const mode = p.mode as number;
	if (mode === 3) return String(p.chars || "01").slice(0, 32) || "01";
	return RAMPS[mode] ?? "01";
}

// Re-renders the image below as characters: random 0/1 or hex digits lit by brightness, or an ASCII
// ramp where brightness picks the glyph. Glyphs come from a Geist Mono atlas texture.
export const binary: LayerDef = {
	type: "binary",
	kind: "effect",
	category: "stylize",
	label: "Glyphs",
	icon: "Binary",
	description: "The image as characters: binary, digits, code or an ASCII ramp, scattered or dense",
	groups: [
		{
			title: "Characters",
			params: [
				select("mode", "Set", ["Binary", "ASCII ramp", "Hex", "Custom", "Digits", "Code"], 0, { shuffle: true }),
				{ type: "text", key: "chars", label: "Characters (dark to light)", default: " /\\CLUESO", showIf: eq("mode", 3) },
				float("cell", "Size", 6, 120, 18, { unit: "px", shuffle: [10, 28] }),
				select("weight", "Weight", ["Regular", "Bold"], 0, { shuffle: true }),
				float("threshold", "Threshold", 0, 1, 0.15, { step: 0.01, shuffle: [0.05, 0.4] }),
				bool("skipBg", "Skip background", false, { shuffle: false }),
				float("contrast", "Contrast", 0.2, 3, 1.2, { step: 0.01, shuffle: [0.9, 1.6] }),
				int("flicker", "Changes / loop", 0, 96, 12, { showIf: neq("mode", 1, 3), shuffle: [0, 24] }),
				float("scatter", "Density", 0.02, 1, 1, { step: 0.01, shuffle: [0.15, 1] }),
				float("warp", "Flow warp", 0, 1, 0, { step: 0.01, shuffle: [0, 0.5] }),
			],
		},
		{
			title: "Colour",
			params: [
				select("tint", "Colour", ["Source", "Ink", "Ink ramp"], 2, { shuffle: true }),
				color("ink", "Ink", "$light", { showIf: neq("tint", 0) }),
				color("ink2", "Dim ink", "$magenta", { showIf: eq("tint", 2) }),
				bool("bg", "Fill background", true),
				color("bgColor", "Background", "$plum", { showIf: (p) => !!p.bg }),
				bool("under", "Show source behind", false, { showIf: (p) => !p.bg }),
				float("dim", "Source dim", 0, 1, 0.2, { step: 0.01, showIf: (p) => !p.bg && !!p.under }),
				float("glow", "Glow", 0, 1, 0, { step: 0.01, shuffle: [0, 0.6] }),
			],
		},
		{
			title: "Rain",
			params: [
				bool("rain", "Digital rain", false, { shuffle: true }),
				float("trail", "Trail length", 0.05, 1, 0.35, { step: 0.01, showIf: (p) => !!p.rain }),
				float("rest", "Resting glyphs", 0, 1, 0.3, { step: 0.01, showIf: (p) => !!p.rain }),
				cycles(1, { showIf: (p) => !!p.rain }),
			],
		},
	],
	frag: /* glsl */ `
vec4 run() {
  vec2 sz = vec2(u_cell * 0.6, u_cell);
  vec2 px = compPx();
  vec2 wofs = vec2(0.0);
  // Flow warp bends the character grid along a smooth noise field (moves with the loop).
  if (u_warp > 0.0) {
    vec2 q = px / 520.0;
    vec3 lp = loopP(q, 0.35, float(max(u_cycles, 0)));
    vec2 w = vec2(noise(lp + 3.1) - 0.5, noise(lp + 11.7) - 0.5);
    wofs = w * u_warp * 420.0;
    px += wofs;
  }
  vec2 cell = floor(px / sz);
  vec2 f = fract(px / sz);
  vec4 s = inputAt(((cell + 0.5) * sz - wofs) / u_comp);
  float l = clamp((luma(s.rgb) * s.a - 0.5) * u_contrast + 0.5, 0.0, 1.0);
  float n = u_texSize.y > 0.0 ? floor(u_texSize.x / u_texSize.y + 0.5) : 1.0;
  bool ramp = u_mode == 1 || u_mode == 3;

  float beat = u_flicker > 0 ? mod(floor(u_phase * float(u_flicker) + hash12(cell * 0.73 + u_seed)), float(u_flicker)) : 0.0;
  float g = ramp ? floor(l * (n - 0.001)) : floor(hash12(cell + beat * 17.31 + u_seed) * n);
  float vis = smoothstep(u_threshold, u_threshold + 0.08, ramp ? l + 0.08 : l);
  // Skip background: cells whose colour matches the canvas corner stay empty, so glyphs sit only on
  // the subject.
  if (u_skipBg == 1) vis *= smoothstep(0.04, 0.14, length(s.rgb * s.a - inputAt(vec2(0.003)).rgb * inputAt(vec2(0.003)).a));
  // Density thins the field into scattered fragments; brighter areas keep more of their glyphs.
  if (u_scatter < 1.0) vis *= step(hash12(cell * 1.37 + u_seed * 3.1), u_scatter * (0.35 + 0.65 * l) * 1.4);
  float head = 0.0;

  if (u_rain == 1) {
    // Each column's head falls a whole number of screens per cycle, so the loop is seamless.
    float rows = u_comp.y / sz.y;
    float speed = floor(hash11(cell.x * 1.31 + u_seed) * 3.0) + 1.0;
    float y = 1.0 - (cell.y + 0.5) / rows;
    float pos = fract(u_phase * float(max(u_cycles, 1)) * speed + hash11(cell.x * 7.13 + u_seed));
    float behind = fract(pos - y);
    float tr = clamp(1.0 - behind / u_trail, 0.0, 1.0);
    head = step(behind, 1.0 / rows);
    vis *= mix(u_rest, 1.0, tr * tr);
    if (!ramp) g = floor(hash12(cell + floor(pos * rows) * 3.1 + u_seed) * n);
  }

  float a = texture(u_tex, vec2((g + 0.2 + f.x * 0.6) / n, f.y)).a * vis;
  // Glow: a soft halo around lit cells, so glyphs read as light rather than ink.
  if (u_glow > 0.0) a = max(a, vis * u_glow * 0.35 * exp(-6.0 * dot(f - 0.5, f - 0.5)) * l);
  vec3 col = u_tint == 0 ? s.rgb : (u_tint == 1 ? u_ink : mix(u_ink2, u_ink, l));
  col = mix(col, vec3(1.0), head * 0.6);
  if (u_bg == 1) return vec4(mix(u_bgColor, col, a), 1.0);
  if (u_under == 1) {
    vec4 base = inputAt(v_uv);
    // Source-coloured glyphs over their own source would vanish: lift them towards white.
    if (u_tint == 0) col = 1.0 - (1.0 - col) * 0.4;
    base.rgb *= 1.0 - u_dim;
    return vec4(mix(base.rgb, col, a), max(base.a, a));
  }
  return vec4(col, a);
}`,
	texture: glyphAtlas,
};

const canvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
const GLYPH = 96;

function glyphAtlas(p: Params, ctx: TextureContext): TextureRequest | null {
	if (!canvas) return null;
	const chars = [...glyphs(p)];
	const weight = p.weight === 1 ? 700 : 400;
	const font = `${weight} ${GLYPH * 0.9}px "Geist Mono"`;
	const ready = document.fonts.check(font);
	if (!ready) document.fonts.load(font).then(ctx.invalidate, () => {});
	return {
		key: JSON.stringify([chars, weight, ready]),
		build: () => {
			canvas.width = GLYPH * chars.length;
			canvas.height = GLYPH;
			const g = canvas.getContext("2d")!;
			g.clearRect(0, 0, canvas.width, canvas.height);
			g.font = font;
			g.fillStyle = "#fff";
			g.textAlign = "center";
			g.textBaseline = "middle";
			chars.forEach((c, i) => g.fillText(c, GLYPH * (i + 0.5), GLYPH * 0.54));
			return { source: canvas, width: canvas.width, height: canvas.height };
		},
	};
}
