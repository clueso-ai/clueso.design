import { bool, color, eq, float, neq, select } from "../params";
import type { LayerDef, Params, TextureContext, TextureRequest } from "../types";

export const FONTS = ["Nohemi", "Geist", "Geist Mono"];

/** House type spec per font: Nohemi for titles, Geist for body, Geist Mono for numbers and code. */
export const TYPE_STYLES = [
	{ label: "Title", description: "Nohemi 300, 80px, 1.1 line height", text: "Every piece fits", params: { font: 0, weight: 300, size: 80, tracking: -0.02, leading: 1.1, width: 0.5 } },
	{
		label: "Body",
		description: "Geist 300, 28px, 1.4 line height",
		text: "Clueso turns raw screen recordings into polished videos and step-by-step guides.",
		params: { font: 1, weight: 300, size: 28, tracking: 0, leading: 1.4, width: 0.5 },
	},
	{ label: "Mono", description: "Geist Mono 300, 20px, for numbers and code", text: "01 / 2026", params: { font: 2, weight: 300, size: 20, tracking: 0, leading: 1.4, width: 0.5 } },
] as const;

const TITLE = TYPE_STYLES[0].params;

export const text: LayerDef = {
	type: "text",
	kind: "source",
	category: "content",
	label: "Text",
	icon: "Type",
	description: "Nohemi titles, Geist body, with spacing, wrapping and highlight boxes",
	groups: [
		{
			title: "Text",
			params: [
				{ type: "text", key: "text", label: "Text", default: TYPE_STYLES[0].text, multiline: true },
				select("font", "Font", FONTS, TITLE.font),
				float("weight", "Weight", 100, 900, TITLE.weight, { step: 100 }),
				float("size", "Size", 8, 1600, TITLE.size, { unit: "px" }),
				float("tracking", "Letter spacing", -0.2, 1, TITLE.tracking, { step: 0.005, unit: "em" }),
				float("leading", "Line height", 0.6, 3, TITLE.leading, { step: 0.01, unit: "×" }),
				select("align", "Align", ["Left", "Centre", "Right"], 0),
				bool("upper", "Uppercase", false),
			],
		},
		{
			title: "Box",
			params: [
				// 0 hugs the text (one line per paragraph, box as wide as the longest); above 0 wraps at that width.
				float("width", "Wrap width", 0.01, 1, TITLE.width, { step: 0.005, showIf: (p) => Number(p.width) > 0 }),
				select("anchor", "Anchor", ["Top", "Middle", "Bottom"], 1),
				float("x", "X (box left)", 0, 1, 0.25, { step: 0.001 }),
				float("y", "Y", 0, 1, 0.5, { step: 0.001 }),
				float("rotation", "Rotation", -180, 180, 0, { unit: "°", step: 1 }),
				// Marks layers that use the box model (x = box left edge); older layers are migrated.
				{ type: "bool", key: "boxModel", label: "Box model", default: true, hidden: true },
			],
		},
		{
			title: "Style",
			params: [
				select("style", "Style", ["Fill", "Outline"], 0),
				float("stroke", "Stroke", 0.5, 20, 2, { unit: "px", showIf: eq("style", 1) }),
				color("color", "Colour", "$paper"),
				select("box", "Highlight", ["Off", "Block", "Per line"], 0),
				color("boxColor", "Highlight colour", "$magenta", { showIf: neq("box", 0) }),
				float("pad", "Padding", 0, 1, 0.2, { step: 0.01, unit: "em", showIf: neq("box", 0) }),
			],
		},
	],
	position: ["x", "y"],
	frag: /* glsl */ `
vec4 run() { return texture(u_tex, v_uv); }`,
	texture: drawText,
	variants: TYPE_STYLES.map((t) => ({ label: t.label, description: t.description, params: { ...t.params, text: t.text } })),
	onParamChange: (key, value, params) => (key === "font" ? { ...params, ...TYPE_STYLES[value as number]?.params } : params),
};

const canvas = typeof document !== "undefined" ? document.createElement("canvas") : null;

/**
 * Text layers saved before the box model anchored centred text at its centre and right-aligned text
 * at its right edge. Move x to the box's left edge so they stay exactly where they were.
 */
export function migrateText(p: Params, compWidth: number): Params {
	if (p.boxModel !== undefined) return p;
	const align = (p.align as number) ?? 1;
	if (align === 0 || !canvas) return { ...p, boxModel: true };
	let boxW = ((p.width as number) || 0) * compWidth;
	if (!boxW) {
		const g = canvas.getContext("2d")!;
		const size = p.size as number;
		g.font = `${p.weight} ${size}px "${FONTS[p.font as number] ?? "Geist"}"`;
		g.letterSpacing = `${(p.tracking as number) * size}px`;
		const str = p.upper ? String(p.text).toUpperCase() : String(p.text);
		boxW = Math.max(0, ...str.split("\n").map((l) => g.measureText(l).width));
	}
	const shift = align === 1 ? boxW / 2 : boxW;
	return { ...p, x: (p.x as number) - shift / compWidth, boxModel: true };
}

function drawText(p: Params, ctx: TextureContext): TextureRequest | null {
	if (!canvas) return null;
	const [w, h] = ctx.res;
	const s = w / ctx.comp[0];
	const family = FONTS[p.font as number] ?? "Geist";
	const weight = Math.round(p.weight as number);
	const size = (p.size as number) * s;
	const font = `${weight} ${size}px "${family}"`;
	const ready = document.fonts.check(font);
	if (!ready) document.fonts.load(font).then(ctx.invalidate, () => {});
	const colors = [ctx.resolveColor(p.color as string), ctx.resolveColor(p.boxColor as string)];

	const key = JSON.stringify([p, w, h, colors, ready]);
	return { key, build: () => paint(canvas, p, w, h, s, font, size, colors[0], colors[1]) };
}

const measurer = typeof document !== "undefined" ? document.createElement("canvas").getContext("2d") : null;

/** The text box in composition px, relative to the layer's pivot (x = box left, y = anchor). */
export function textBox(p: Params, compW: number) {
	if (!measurer) return null;
	const size = p.size as number;
	measurer.font = `${Math.round(p.weight as number)} ${size}px "${FONTS[p.font as number] ?? "Geist"}"`;
	const spacing = (p.tracking as number) * size;
	measurer.letterSpacing = `${spacing}px`;
	let str = String(p.text ?? "");
	if (p.upper) str = str.toUpperCase();
	const lines = wrap(measurer, str, (p.width as number) * compW);
	const widths = lines.map((l) => (l ? Math.max(0, measurer.measureText(l).width - spacing) : 0));
	const w = (p.width as number) > 0 ? (p.width as number) * compW : Math.max(0, ...widths);
	const h = lines.length * size * (p.leading as number);
	return { w, h, top: -h * [0, 0.5, 1][(p.anchor as number) ?? 1] };
}

/** Greedy word wrap; explicit newlines always break. */
function wrap(g: CanvasRenderingContext2D, str: string, max: number) {
	const out: string[] = [];
	for (const para of str.split("\n")) {
		if (!max) {
			out.push(para);
			continue;
		}
		let line = "";
		for (const word of para.split(/(\s+)/)) {
			const next = line + word;
			if (line.trim() && g.measureText(next.trimEnd()).width > max) {
				out.push(line.trimEnd());
				line = word.trimStart();
			} else line = next;
		}
		out.push(line.trimEnd());
	}
	return out;
}

/**
 * The text sits in a box whose left edge is at x. Alignment only moves lines inside that box, so
 * switching Left / Centre / Right never shifts the block across the canvas. The box is the wrap
 * width, or the widest line when wrapping is off.
 */
function paint(canvas: HTMLCanvasElement, p: Params, w: number, h: number, s: number, font: string, size: number, fill: string, boxFill: string) {
	canvas.width = w;
	canvas.height = h;
	const g = canvas.getContext("2d")!;
	g.clearRect(0, 0, w, h);
	g.font = font;
	g.textBaseline = "middle";
	g.textAlign = "left";
	const spacing = (p.tracking as number) * size;
	g.letterSpacing = `${spacing}px`;
	const align = (p.align as number) ?? 0;

	let str = String(p.text ?? "");
	if (p.upper) str = str.toUpperCase();
	const lines = wrap(g, str, (p.width as number) * w);
	// Canvas adds letter spacing after the last glyph too; leave it out of the measured width.
	const widths = lines.map((l) => (l ? Math.max(0, g.measureText(l).width - spacing) : 0));
	const boxW = (p.width as number) > 0 ? (p.width as number) * w : Math.max(0, ...widths);
	const lineX = (lw: number) => [0, (boxW - lw) / 2, boxW - lw][align] ?? 0;
	const lh = size * (p.leading as number);
	const blockH = lines.length * lh;
	const anchor = (p.anchor as number) ?? 1;
	const top = -blockH * [0, 0.5, 1][anchor];

	g.save();
	g.translate((p.x as number) * w, (1 - (p.y as number)) * h);
	g.rotate((-(p.rotation as number) * Math.PI) / 180);

	if (p.box) {
		const pad = (p.pad as number) * size;
		g.fillStyle = boxFill;
		if (p.box === 1) {
			const bw = Math.max(0, ...widths);
			g.fillRect(lineX(bw) - pad, top - pad, bw + pad * 2, blockH + pad * 2);
		} else {
			lines.forEach((l, i) => {
				if (!l.trim()) return;
				g.fillRect(lineX(widths[i]) - pad, top + i * lh + (lh - size * 1.05) / 2 - pad * 0.5, widths[i] + pad * 2, size * 1.05 + pad);
			});
		}
	}

	g.fillStyle = fill;
	g.strokeStyle = fill;
	g.lineWidth = (p.stroke as number) * s;
	g.lineJoin = "round";
	lines.forEach((line, i) => {
		const x = lineX(widths[i]);
		const y = top + (i + 0.5) * lh;
		if (p.style === 1) g.strokeText(line, x, y);
		else g.fillText(line, x, y);
	});
	g.restore();
	return { source: canvas, width: w, height: h };
}
