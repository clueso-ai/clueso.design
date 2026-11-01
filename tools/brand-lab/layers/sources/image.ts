import { float, select } from "../params";
import type { LayerDef, Params, TextureContext, TextureRequest } from "../types";

// Drop in a screenshot or photo, then run brand effects (halftone, dither, glass) over it.
export const image: LayerDef = {
	type: "image",
	kind: "source",
	category: "content",
	label: "Image",
	icon: "Image",
	description: "A dropped image or screenshot",
	groups: [
		{
			title: "Image",
			params: [
				{ type: "image", key: "src", label: "File", default: "" },
				select("fit", "Fit", ["Cover", "Contain"], 0),
				float("scale", "Scale", 0.05, 4, 1, { step: 0.01, unit: "×" }),
				float("x", "X", 0, 1, 0.5, { step: 0.001 }),
				float("y", "Y", 0, 1, 0.5, { step: 0.001 }),
			],
		},
	],
	position: ["x", "y"],
	frag: /* glsl */ `
vec4 run() {
  if (u_texSize.x < 1.0) return vec4(0.0);
  vec2 p = P() - (vec2(u_x, u_y) - 0.5) * u_comp;
  vec2 r = u_comp / u_texSize;
  float s = (u_fit == 0 ? max(r.x, r.y) : min(r.x, r.y)) * u_scale;
  vec2 uv = p / (u_texSize * s) + 0.5;
  if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return vec4(0.0);
  return texture(u_tex, uv);
}`,
	texture: imageTexture,
};

const cache = new Map<string, HTMLImageElement>();

/** Natural size of a loaded image, or null while it loads. */
export function imageSize(src: string): [number, number] | null {
	const img = cache.get(src);
	return img?.complete && img.naturalWidth ? [img.naturalWidth, img.naturalHeight] : null;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
	const existing = cache.get(src);
	if (existing?.complete && existing.naturalWidth) return Promise.resolve(existing);
	return new Promise((resolve, reject) => {
		const img = existing ?? new Image();
		img.addEventListener("load", () => resolve(img), { once: true });
		img.addEventListener("error", reject, { once: true });
		if (!existing) {
			img.src = src;
			cache.set(src, img);
		}
	});
}

function imageTexture(p: Params, ctx: TextureContext): TextureRequest | null {
	const src = p.src as string;
	if (!src) return null;
	const img = cache.get(src);
	if (!img || !img.complete || !img.naturalWidth) {
		loadImage(src).then(ctx.invalidate, () => {});
		return null;
	}
	return {
		key: `${src.length}:${src.slice(-64)}`,
		build: () => ({ source: img, width: img.naturalWidth, height: img.naturalHeight }),
	};
}
