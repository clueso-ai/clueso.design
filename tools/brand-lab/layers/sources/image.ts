import { float, select } from "../params";
import type { LayerDef, Params, TextureContext, TextureRequest } from "../types";

/** Crop params: the share of the image cut from the left, top, right and bottom. */
export const CROP = ["cropL", "cropT", "cropR", "cropB"] as const;

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
				float("rotation", "Rotation", -180, 180, 0, { unit: "°", step: 1, shuffle: false }),
				float("radius", "Corner radius", 0, 400, 0, { unit: "px", shuffle: false }),
				float("x", "X", 0, 1, 0.5, { step: 0.001 }),
				float("y", "Y", 0, 1, 0.5, { step: 0.001 }),
				// ⌘-drag a handle to crop: the share of the image cut from each side. x/y is the crop's centre.
				...CROP.map((key) => ({ ...float(key, key, 0, 0.99, 0, { step: 0.0001, shuffle: false }), hidden: true })),
			],
		},
	],
	position: ["x", "y"],
	frag: /* glsl */ `
vec4 run() {
  if (u_texSize.x < 1.0) return vec4(0.0);
  vec2 r = u_comp / u_texSize;
  float s = (u_fit == 0 ? max(r.x, r.y) : min(r.x, r.y)) * u_scale;
  vec2 full = u_texSize * s;
  // The visible (cropped) box, centred on x/y and turned with the layer; y points up here.
  vec2 p = rot(-radians(u_rotation)) * (P() - (vec2(u_x, u_y) - 0.5) * u_comp);
  vec2 b = full * vec2(1.0 - u_cropL - u_cropR, 1.0 - u_cropT - u_cropB) * 0.5;
  float rad = min(u_radius, min(b.x, b.y));
  float cover = fillAA(sdBox(p, b - rad) - rad);
  if (cover <= 0.0) return vec4(0.0);
  vec2 offset = full * vec2(u_cropL - u_cropR, u_cropB - u_cropT) * 0.5;
  vec4 c = texture(u_tex, (p + offset) / full + 0.5);
  return vec4(c.rgb, c.a * cover);
}`,
	texture: imageTexture,
};

const cache = new Map<string, HTMLImageElement>();

/** Natural size of a loaded image, or null while it loads. */
export function imageSize(src: string): [number, number] | null {
	const img = cache.get(src);
	return img?.complete && img.naturalWidth ? [img.naturalWidth, img.naturalHeight] : null;
}

/**
 * Params that place a new image inside the canvas instead of covering it: fitted with a margin
 * (`max` of the canvas's short side), and never blown up past the image's own pixels.
 */
export async function fitInside(src: string, scene: { width: number; height: number }, max = 0.8): Promise<Params> {
	const img = await loadImage(src);
	const fit = Math.min(scene.width / img.naturalWidth, scene.height / img.naturalHeight);
	return { src, fit: 1, scale: Math.round(Math.min(max, 1 / fit) * 1000) / 1000 };
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
