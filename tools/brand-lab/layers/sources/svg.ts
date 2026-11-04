import { float } from "../params";
import type { LayerDef, Params, TextureContext, TextureRequest } from "../types";

// Pasted or dropped SVG kept as vector code: it's redrawn at the size it's shown or exported, so it
// stays sharp, and every colour it uses can be swapped (for a palette colour, usually).

const SAMPLE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#da5cc7"/></svg>`;

export const svg: LayerDef = {
	type: "svg",
	kind: "source",
	category: "content",
	label: "SVG",
	icon: "Svg",
	description: "Vector code from Figma or an icon site, kept sharp, with its colours swappable",
	groups: [
		{
			title: "SVG",
			params: [
				{ type: "text", key: "markup", label: "SVG code", default: SAMPLE, multiline: true },
				// Original colour → replacement, as JSON ({"#000000": "$plum"}). Edited through the Colours list.
				{ type: "text", key: "colors", label: "Colours", default: "{}", hidden: true },
				float("size", "Width", 8, 4000, 480, { unit: "px" }),
				float("rotation", "Rotation", -180, 180, 0, { unit: "°", step: 1 }),
				float("x", "X", 0, 1, 0.5, { step: 0.001 }),
				float("y", "Y", 0, 1, 0.5, { step: 0.001 }),
			],
		},
	],
	position: ["x", "y"],
	frag: /* glsl */ `
vec4 run() {
  if (u_texSize.x < 1.0) return vec4(0.0);
  vec2 p = rot(-radians(u_rotation)) * (P() - (vec2(u_x, u_y) - 0.5) * u_comp);
  vec2 box = vec2(u_size, u_size * u_texSize.y / u_texSize.x);
  vec2 uv = p / box + 0.5;
  if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return vec4(0.0);
  return texture(u_tex, uv);
}`,
	texture: svgTexture,
};

/** True when pasted text is SVG markup (optionally behind an XML prolog, doctype or comments). */
export function isSvgCode(text: string) {
	return /^\s*(<\?xml[\s\S]*?\?>\s*)?(<!DOCTYPE[\s\S]*?>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(text) && /<\/svg>\s*$/i.test(text);
}

/** Height over width, from the viewBox (or width and height). */
export function svgAspect(markup: string) {
	const tag = markup.match(/<svg\b[^>]*>/i)?.[0] ?? "";
	const vb = tag.match(/viewBox\s*=\s*["']([^"']+)["']/i)?.[1]?.split(/[\s,]+/).map(Number);
	if (vb && vb.length === 4 && vb[2] > 0 && vb[3] > 0) return vb[3] / vb[2];
	const num = (a: string) => parseFloat(tag.match(new RegExp(`\\b${a}\\s*=\\s*["']([\\d.]+)`, "i"))?.[1] ?? "");
	const w = num("width");
	const h = num("height");
	return w > 0 && h > 0 ? h / w : 1;
}

/** The <title>, if the SVG has one, for the layer name. */
export function svgTitle(markup: string) {
	return markup.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || null;
}

const COLOR_RE = /((?:fill|stroke|stop-color|color)\s*[:=]\s*["']?)(#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|[a-z]+)/gi;
const SKIP = new Set(["none", "transparent", "inherit", "currentcolor", "url"]);

/** Every distinct colour the SVG paints with, in order of first use (lowercased). */
export function svgColors(markup: string): string[] {
	const out: string[] = [];
	for (const m of markup.matchAll(COLOR_RE)) {
		const c = m[2].toLowerCase();
		if (SKIP.has(c) || out.includes(c)) continue;
		out.push(c);
	}
	return out;
}

export function parseColorMap(params: Params): Record<string, string> {
	try {
		const map = JSON.parse(String(params.colors ?? "{}"));
		return map && typeof map === "object" ? map : {};
	} catch {
		return {};
	}
}

/** The markup with each mapped colour replaced by its resolved hex. */
function recolor(markup: string, map: Record<string, string>, resolve: (c: string) => string) {
	return markup.replace(COLOR_RE, (all, prefix: string, c: string) => {
		const to = map[c.toLowerCase()];
		return to ? prefix + resolve(to) : all;
	});
}

const images = new Map<string, HTMLImageElement>();

function svgTexture(p: Params, ctx: TextureContext): TextureRequest | null {
	const markup = String(p.markup ?? "");
	if (!isSvgCode(markup)) return null;
	const code = recolor(markup, parseColorMap(p), ctx.resolveColor);
	// Rasterised at the size it's shown (device px), so it stays crisp at any zoom or export size.
	const s = ctx.res[0] / ctx.comp[0];
	const w = Math.max(1, Math.min(4096, Math.round(Number(p.size) * s)));
	const h = Math.max(1, Math.min(4096, Math.round(w * svgAspect(code))));
	const sized = sizedSvg(code, w, h);
	let img = images.get(sized);
	if (!img) {
		// Keep a handful of decoded sizes; zooming makes new ones.
		if (images.size > 48) {
			for (const old of images.values()) URL.revokeObjectURL(old.src);
			images.clear();
		}
		img = new Image();
		img.onload = ctx.invalidate;
		img.src = URL.createObjectURL(new Blob([sized], { type: "image/svg+xml" }));
		images.set(sized, img);
	}
	// While a new version decodes (a colour swap, a zoom), keep showing the last one instead of
	// blinking to nothing. Slots are per original markup, so two different SVGs never share one.
	const slot = hash(markup);
	if (!img.complete || !img.naturalWidth) return shown.get(slot) ?? null;
	const ready = img;
	const req: TextureRequest = {
		// A hash of the whole code: a colour swap can change any character, not just the end.
		key: `${hash(code)}:${code.length}:${w}x${h}`,
		build: () => {
			const canvas = document.createElement("canvas");
			canvas.width = w;
			canvas.height = h;
			canvas.getContext("2d")!.drawImage(ready, 0, 0, w, h);
			return { source: canvas, width: w, height: h };
		},
	};
	shown.set(slot, req);
	return req;
}

/** The last texture each SVG showed, by its original markup, for while the next one decodes. */
const shown = new Map<string, TextureRequest>();

/**
 * The root tag with an exact pixel size (otherwise the browser decodes it at 300×150 and it blurs), a
 * viewBox so it scales, and the SVG namespace, which browsers need to decode it as an image.
 */
function sizedSvg(code: string, w: number, h: number) {
	return code.replace(/<svg\b([^>]*)>/i, (_, attrs: string) => {
		let a = attrs.replace(/\s(width|height)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
		if (!/\sviewBox\s*=/i.test(a)) {
			const ow = parseFloat(attrs.match(/\swidth\s*=\s*["']?([\d.]+)/i)?.[1] ?? "") || w;
			const oh = parseFloat(attrs.match(/\sheight\s*=\s*["']?([\d.]+)/i)?.[1] ?? "") || h;
			a += ` viewBox="0 0 ${ow} ${oh}"`;
		}
		if (!/\sxmlns\s*=/i.test(a)) a += ' xmlns="http://www.w3.org/2000/svg"';
		return `<svg${a} width="${w}" height="${h}">`;
	});
}

/** FNV-1a over the string, as hex. Cheap, and plenty to tell two versions of one SVG apart. */
function hash(str: string) {
	let h = 0x811c9dc5;
	for (let i = 0; i < str.length; i++) {
		h ^= str.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return (h >>> 0).toString(16);
}
