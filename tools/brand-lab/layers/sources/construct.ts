import { bool, color, eq, float, int, neq, select } from "../params";
import type { LayerDef, Params, TextureContext, TextureRequest } from "../types";

// Drafting overlays: the logo's construction (its 135° breaks, edge stops and cavity circles), corner
// brackets, a measured spec box, or a ruled grid. Drawn with Canvas 2D at the render resolution so
// lines and labels stay crisp, then composited like any layer.
export const construct: LayerDef = {
	type: "construct",
	kind: "source",
	category: "content",
	label: "Construction",
	icon: "Ruler",
	description: "Logo construction lines, corner brackets, spec boxes and ruled grids",
	groups: [
		{
			title: "Drawing",
			params: [
				select("mode", "Type", ["Logo construction", "Corner brackets", "Spec box", "Ruled grid"], 0),
				float("size", "Size", 20, 4000, 520, { unit: "px" }),
				float("aspect", "Height / width", 0.1, 4, 1, { step: 0.01, showIf: eq("mode", 1, 2) }),
				select("logo", "Logo", ["Auto", "Dark mode", "Light mode"], 0, { showIf: eq("mode", 0) }),
				bool("extend", "Extend guides", true, { showIf: eq("mode", 0) }),
				int("divisions", "Divisions", 2, 40, 8, { showIf: eq("mode", 3) }),
				float("x", "X", 0, 1, 0.5, { step: 0.001 }),
				float("y", "Y", 0, 1, 0.5, { step: 0.001 }),
			],
		},
		{
			title: "Style",
			params: [
				float("stroke", "Line weight", 0.5, 8, 1.25, { unit: "px", step: 0.25 }),
				bool("dashed", "Dashed guides", true),
				bool("labels", "Labels", true),
				float("labelSize", "Label size", 8, 64, 16, { unit: "px", showIf: (p) => !!p.labels }),
				color("color", "Lines", "$light"),
				color("accent", "Accent", "$pink", { showIf: neq("mode", 1) }),
			],
		},
	],
	position: ["x", "y"],
	frag: /* glsl */ `
vec4 run() { return texture(u_tex, v_uv); }`,
	texture: drawConstruction,
};

const canvas = typeof document !== "undefined" ? document.createElement("canvas") : null;

// Where the 135° breaks meet the right edge (y, in the 100-unit logo box), per variant.
const STOPS = { light: [32, 48, 68, 84], dark: [32, 50, 68, 86] };

function drawConstruction(p: Params, ctx: TextureContext): TextureRequest | null {
	if (!canvas) return null;
	const [w, h] = ctx.res;
	const s = w / ctx.comp[0];
	const font = `400 ${(p.labelSize as number) * s}px "Geist Mono"`;
	const ready = document.fonts.check(font);
	if (!ready) document.fonts.load(font).then(ctx.invalidate, () => {});
	const ink = ctx.resolveColor(p.color as string);
	const accent = ctx.resolveColor(p.accent as string);
	// Auto follows the background, like the mark.
	const dark = p.logo === 1 || (p.logo === 0 && ctx.darkBg);
	const key = JSON.stringify([p, w, h, ink, accent, ready]);
	return { key, build: () => paint(p, w, h, s, font, ink, accent, dark) };
}

function paint(p: Params, w: number, h: number, s: number, font: string, ink: string, accent: string, dark: boolean) {
	const c = canvas!;
	c.width = w;
	c.height = h;
	const g = c.getContext("2d")!;
	g.clearRect(0, 0, w, h);
	const cx = (p.x as number) * w;
	const cy = (1 - (p.y as number)) * h;
	const size = (p.size as number) * s;
	const lw = (p.stroke as number) * s;
	const dash = p.dashed ? [lw * 4, lw * 3] : [];
	const labels = !!p.labels;
	const ls = (p.labelSize as number) * s;
	g.lineWidth = lw;
	g.strokeStyle = ink;
	g.fillStyle = ink;
	g.font = font;
	g.textBaseline = "middle";

	const line = (x0: number, y0: number, x1: number, y1: number, dashed = false) => {
		g.setLineDash(dashed ? dash : []);
		g.beginPath();
		g.moveTo(x0, y0);
		g.lineTo(x1, y1);
		g.stroke();
	};
	const label = (text: string, x: number, y: number, align: CanvasTextAlign = "left", color = ink) => {
		if (!labels) return;
		g.save();
		g.setLineDash([]);
		g.textAlign = align;
		g.fillStyle = color;
		g.fillText(text, x, y);
		g.restore();
	};

	const mode = p.mode as number;
	if (mode === 0) {
		// Logo box in 100-unit construction space.
		const X = (u: number) => cx + (u / 100 - 0.5) * size;
		const Y = (v: number) => cy + (v / 100 - 0.5) * size;
		const ext = p.extend ? size * 0.22 : 0;
		const stops = dark ? STOPS.dark : STOPS.light;
		g.setLineDash([]);
		g.strokeRect(X(0), Y(0), size, size);
		// Faint unit grid at the cavity openings and centre.
		g.globalAlpha = 0.45;
		for (const v of [32, 50, 68]) {
			line(X(0) - ext, Y(v), X(100) + ext, Y(v), true);
			line(X(v), Y(0) - ext, X(v), Y(100) + ext, true);
		}
		g.globalAlpha = 1;
		// The 135° breaks: lines x - y = k, from the top edge down to the right edge, extended.
		const tops = dark ? [68, 50, 32, 14] : [68, 52, 32, 16];
		g.strokeStyle = accent;
		for (const k of tops) {
			const e = ext / size * 100;
			line(X(k - e), Y(-e), X(100 + e), Y(100 - k + e), true);
		}
		// Cavities: radius 18, centred 6 in from the left and bottom edges.
		g.setLineDash(dash);
		for (const [ux, uy] of [
			[6, 50],
			[50, 94],
		]) {
			g.beginPath();
			g.arc(X(ux), Y(uy), (18 / 100) * size, 0, Math.PI * 2);
			g.stroke();
			g.setLineDash([]);
			g.beginPath();
			g.arc(X(ux), Y(uy), lw * 2.2, 0, Math.PI * 2);
			g.fillStyle = accent;
			g.fill();
			g.setLineDash(dash);
		}
		g.strokeStyle = ink;
		// Right-edge stops with their values; the cavity radius callout.
		for (const v of stops) {
			line(X(100), Y(v), X(100) + size * 0.06, Y(v));
			label(String(v), X(100) + size * 0.075, Y(v));
		}
		label("0", X(100) + size * 0.075, Y(0));
		label("100", X(100) + size * 0.075, Y(100));
		label("r 18", X(6) + (18 / 100) * size * 0.75, Y(50) - (18 / 100) * size * 0.75, "left", accent);
		label("135°", X(tops[0]) + ls * 0.4, Y(0) - ls * 0.9, "left", accent);
		label(dark ? "DARK MODE" : "LIGHT MODE", X(0), Y(100) + ls * 1.4);
	} else if (mode === 1 || mode === 2) {
		const bw = size;
		const bh = size * (p.aspect as number);
		const x0 = cx - bw / 2;
		const y0 = cy - bh / 2;
		if (mode === 1) {
			const arm = Math.min(bw, bh) * 0.08;
			g.setLineDash([]);
			g.lineCap = "square";
			for (const [x, y, dx, dy] of [
				[x0, y0, 1, 1],
				[x0 + bw, y0, -1, 1],
				[x0, y0 + bh, 1, -1],
				[x0 + bw, y0 + bh, -1, -1],
			]) {
				g.beginPath();
				g.moveTo(x + dx * arm, y);
				g.lineTo(x, y);
				g.lineTo(x, y + dy * arm);
				g.stroke();
			}
		} else {
			// Spec box: the frame, handles, centre cross, and dimension lines with values.
			g.setLineDash([]);
			g.strokeStyle = accent;
			g.strokeRect(x0, y0, bw, bh);
			const hs = lw * 4;
			g.fillStyle = ink;
			for (const [x, y] of [
				[x0, y0],
				[x0 + bw, y0],
				[x0, y0 + bh],
				[x0 + bw, y0 + bh],
			]) {
				g.fillRect(x - hs, y - hs, hs * 2, hs * 2);
				g.strokeRect(x - hs, y - hs, hs * 2, hs * 2);
			}
			g.strokeStyle = ink;
			line(cx - lw * 6, cy, cx + lw * 6, cy);
			line(cx, cy - lw * 6, cx, cy + lw * 6);
			g.globalAlpha = 0.6;
			line(x0, y0, x0 + bw, y0 + bh, true);
			line(x0 + bw, y0, x0, y0 + bh, true);
			g.globalAlpha = 1;
			const off = ls * 1.6;
			line(x0, y0 - off, x0 + bw, y0 - off);
			line(x0, y0 - off - lw * 4, x0, y0 - off + lw * 4);
			line(x0 + bw, y0 - off - lw * 4, x0 + bw, y0 - off + lw * 4);
			line(x0 + bw + off, y0, x0 + bw + off, y0 + bh);
			label(String(Math.round(p.size as number)), cx, y0 - off - ls * 0.8, "center", accent);
			g.save();
			g.translate(x0 + bw + off + ls * 0.8, cy);
			g.rotate(Math.PI / 2);
			label(String(Math.round((p.size as number) * (p.aspect as number))), 0, 0, "center", accent);
			g.restore();
		}
	} else {
		// Ruled grid across the canvas, with numbered rulers along the top and left.
		const n = p.divisions as number;
		const cell = size / n;
		g.globalAlpha = 0.5;
		for (let x = cx - Math.ceil(cx / cell) * cell; x <= w; x += cell) line(x, 0, x, h, true);
		for (let y = cy - Math.ceil(cy / cell) * cell; y <= h; y += cell) line(0, y, w, y, true);
		g.globalAlpha = 1;
		g.strokeStyle = accent;
		line(cx, 0, cx, h);
		line(0, cy, w, cy);
		for (let x = cx - Math.ceil(cx / cell) * cell; x <= w; x += cell) label(String(Math.round((x - cx) / s)), x + ls * 0.3, ls, "left", accent);
		for (let y = cy - Math.ceil(cy / cell) * cell; y <= h; y += cell) label(String(Math.round((cy - y) / s)), ls * 0.4, y - ls * 0.6, "left", accent);
	}
	return { source: c, width: w, height: h };
}
