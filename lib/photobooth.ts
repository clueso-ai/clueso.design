// Pink photobooth's drawing: the colours resolved to RGB, the four effects and the photo strip.
// components/playground/photobooth.tsx owns the camera, the loop, the controls and the colour presets.
// Colours come in as CSS (site tokens or custom OKLCH) and are resolved at runtime, so presets follow
// light and dark.

import { rgbOf } from "./css-color";

export type Effect = "glyphs" | "halftone" | "pixels" | "duotone";
export type GlyphSet = "symbols" | "blocks" | "letters" | "text";
export type Shape = "4:3" | "1:1" | "9:16";

export const SHAPE_RATIO: Record<Shape, number> = { "4:3": 4 / 3, "1:1": 1, "9:16": 9 / 16 };
export const TEXT_MAX = 24;
const LETTERS = "CLUESO";
// Light to dense.
const RAMPS = { symbols: " .·:-=+*xo%@", blocks: " ░▒▓█" } as const;
// 4×4 ordered dither, so posterised pixels keep some shading between tones.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
// Duotone samples up to about this many pixels.
const SMOOTH_PIXELS = 480 * 360;

/** The booth's colour roles. Ground fills the frame, Ink draws glyphs and dots, and Pixels and
 *  Duotone run from Ground through Ink to Peak. Each is any CSS colour. */
export type BoothColors = Record<"ground" | "ink" | "peak", string>;

type Tone = { css: string; r: number; g: number; b: number; lum: number };
/** tones[0] is the ground. inkIsDark says which end of the picture gets the ink. */
export type Palette = { ground: Tone; tones: Tone[]; ink: Tone; inkIsDark: boolean };

const toneOf = (css: string, r: number, g: number, b: number): Tone => ({ css, r, g, b, lum: (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 });
const mix = (a: Tone, b: Tone, f: number) => {
	const [r, g, bl] = [a.r + (b.r - a.r) * f, a.g + (b.g - a.g) * f, a.b + (b.b - a.b) * f].map(Math.round);
	return toneOf(`rgb(${r} ${g} ${bl})`, r, g, bl);
};

/** Resolve each colour through the cascade on `probe`, then paint it into one pixel to get plain
 *  RGB. Four tones, ground to peak. When Peak is Ink, the steps between are all ground to ink. */
export function resolvePalette(probe: HTMLElement, colors: BoothColors): Palette {
	const tone = (color: string): Tone => {
		const { r, g, b } = rgbOf(probe, color);
		return toneOf(`rgb(${r}, ${g}, ${b})`, r, g, b);
	};
	const ground = tone(colors.ground);
	const ink = tone(colors.ink);
	const peak = tone(colors.peak);
	const flat = peak.r === ink.r && peak.g === ink.g && peak.b === ink.b;
	const tones = flat ? [ground, mix(ground, ink, 1 / 3), mix(ground, ink, 2 / 3), ink] : [ground, mix(ground, ink, 0.5), ink, peak];
	return { ground, tones, ink, inkIsDark: tones[tones.length - 1].lum < ground.lum };
}

/** Everything about the look that can change from frame to frame. */
export type Look = {
	effect: Effect;
	glyphs: GlyphSet;
	text: string;
	cols: number;
	ratio: number;
	contrast: number;
	brightness: number;
	invert: boolean;
	mirror: boolean;
	swirl: boolean;
};

export class BoothRenderer {
	private sample = document.createElement("canvas");
	private sctx = this.sample.getContext("2d", { willReadFrequently: true })!;
	private ink = new Float32Array(0);
	private levels = new Uint8Array(0);
	private lo = 0;
	private hi = 1;
	// Glyphs are drawn once into an atlas and stamped from there, much cheaper than fillText per cell.
	private atlas = document.createElement("canvas");
	private atlasKey = "";
	private seq = new Int16Array(0);
	private lut = new Uint8ClampedArray(256 * 3);
	private lutFor: Palette | null = null;

	render(ctx: CanvasRenderingContext2D, W: number, H: number, source: CanvasImageSource, srcW: number, srcH: number, look: Look, p: Palette, font: string, t: number) {
		const { effect, ratio } = look;
		// Duotone samples finer for a smooth picture. Tiled text samples coarser so the letters are big enough to read.
		const tiled = effect === "glyphs" && (look.glyphs === "letters" || look.glyphs === "text");
		const sw = effect === "duotone" ? Math.min(look.cols * 4, Math.floor(Math.sqrt(SMOOTH_PIXELS * ratio))) : tiled ? Math.max(20, Math.round(look.cols * 0.66)) : look.cols;
		const sh = Math.max(1, Math.round(sw / ratio));
		const { sample, sctx } = this;
		if (sample.width !== sw || sample.height !== sh) {
			sample.width = sw;
			sample.height = sh;
		}

		// Crop the source to the shape from its centre. The camera is mirrored, like a selfie.
		const cw = Math.min(srcW, srcH * ratio);
		const ch = cw / ratio;
		sctx.setTransform(look.mirror ? -1 : 1, 0, 0, 1, look.mirror ? sw : 0, 0);
		sctx.drawImage(source, (srcW - cw) / 2, (srcH - ch) / 2, cw, ch, 0, 0, sw, sh);
		sctx.setTransform(1, 0, 0, 1, 0, 0);
		const image = sctx.getImageData(0, 0, sw, sh);
		const data = image.data;

		// Brightness per cell, auto levelled (eased between frames so a dim room still uses the whole
		// range), then contrast and brightness, then turned into ink: 0 is ground, 1 is full ink.
		const n = sw * sh;
		if (this.ink.length !== n) {
			this.ink = new Float32Array(n);
			this.levels = new Uint8Array(n);
		}
		const ink = this.ink;
		let lo = 1;
		let hi = 0;
		for (let i = 0; i < n; i++) {
			const l = (0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2]) / 255;
			ink[i] = l;
			if (l < lo) lo = l;
			if (l > hi) hi = l;
		}
		this.lo += (lo - this.lo) * 0.08;
		this.hi += (hi - this.hi) * 0.08;
		const span = Math.max(this.hi - this.lo, 0.2);
		const flip = p.inkIsDark !== look.invert;
		for (let i = 0; i < n; i++) {
			let l = ((ink[i] - this.lo) / span - 0.5) * look.contrast + 0.5 + look.brightness;
			l = l < 0 ? 0 : l > 1 ? 1 : l;
			ink[i] = flip ? 1 - l : l;
		}

		ctx.fillStyle = p.ground.css;
		ctx.fillRect(0, 0, W, H);

		if (effect === "duotone") {
			// A smooth map through the palette's tones, ground to ink.
			if (this.lutFor !== p) this.buildLut(p);
			const lut = this.lut;
			for (let i = 0; i < n; i++) {
				const v = Math.round(ink[i] * 255) * 3;
				data[i * 4] = lut[v];
				data[i * 4 + 1] = lut[v + 1];
				data[i * 4 + 2] = lut[v + 2];
				data[i * 4 + 3] = 255;
			}
			sctx.putImageData(image, 0, 0);
			ctx.imageSmoothingEnabled = true;
			ctx.imageSmoothingQuality = "high";
			ctx.drawImage(sample, 0, 0, W, H);
			return;
		}

		const cellW = W / sw;
		const cellH = H / sh;

		if (effect === "glyphs") {
			this.glyphs(ctx, sw, sh, cellW, cellH, look, p, font, t);
			return;
		}

		if (effect === "halftone") {
			// Dots on a staggered grid, area following the ink. They just touch at full ink.
			ctx.fillStyle = p.ink.css;
			ctx.beginPath();
			const max = cellW * 0.55;
			for (let y = 0; y < sh; y++) {
				// Odd rows sit half a cell over and start one dot early, so the left edge stays filled.
				const shift = y % 2 ? cellW / 2 : 0;
				for (let x = shift ? -1 : 0; x < sw; x++) {
					const r = Math.sqrt(ink[y * sw + Math.max(0, x)]) * max;
					if (r < 0.5) continue;
					const cx = x * cellW + cellW / 2 + shift;
					const cy = y * cellH + cellH / 2;
					ctx.moveTo(cx + r, cy);
					ctx.arc(cx, cy, r, 0, Math.PI * 2);
				}
			}
			ctx.fill();
			return;
		}

		// Pixels: the palette's tones, dithered, with a hairline of ground between cells.
		const tones = p.tones;
		const count = tones.length;
		const levels = this.levels;
		for (let y = 0; y < sh; y++) {
			for (let x = 0; x < sw; x++) {
				const dither = BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5;
				const level = Math.floor(ink[y * sw + x] * count + dither);
				levels[y * sw + x] = level < 0 ? 0 : level >= count ? count - 1 : level;
			}
		}
		const gap = Math.max(1, Math.round(cellW * 0.08));
		for (let k = 1; k < count; k++) {
			ctx.fillStyle = tones[k].css;
			ctx.beginPath();
			for (let y = 0; y < sh; y++) {
				const y0 = Math.round(y * cellH);
				const y1 = Math.round((y + 1) * cellH) - gap;
				for (let x = 0; x < sw; x++) {
					if (levels[y * sw + x] !== k) continue;
					const x0 = Math.round(x * cellW);
					ctx.rect(x0, y0, Math.round((x + 1) * cellW) - gap - x0, y1 - y0);
				}
			}
			ctx.fill();
		}
	}

	private glyphs(ctx: CanvasRenderingContext2D, sw: number, sh: number, cellW: number, cellH: number, look: Look, p: Palette, font: string, t: number) {
		const ramp = look.glyphs === "symbols" || look.glyphs === "blocks";
		const text = look.glyphs === "letters" || !look.text.trim() ? LETTERS : look.text;
		const chars = ramp ? RAMPS[look.glyphs as keyof typeof RAMPS] : text;
		const a = Math.max(4, Math.ceil(cellW));
		const key = `${a}|${font}|${p.ink.css}|${ramp}|${chars}`;
		if (key !== this.atlasKey) {
			this.atlasKey = key;
			this.buildAtlas(chars, a, font, p.ink.css, ramp);
		}
		const atlas = this.atlas;
		const ink = this.ink;

		if (ramp) {
			const last = chars.length - 1;
			// A slow swirl around the centre nudges each cell a little denser or lighter.
			const swirl = look.swirl ? 0.06 * last : 0;
			const time = t * 0.0015;
			for (let y = 0; y < sh; y++) {
				const dy = y - sh / 2;
				for (let x = 0; x < sw; x++) {
					const dx = x - sw / 2;
					const wave = swirl && swirl * Math.sin(time + Math.atan2(dy, dx) * 3 + Math.hypot(dx, dy) * 0.18);
					const g = Math.round(Math.min(last, Math.max(0, ink[y * sw + x] * last + wave)));
					if (g === 0) continue;
					ctx.drawImage(atlas, g * a, 0, a, a, x * cellW, y * cellH, cellW, cellH);
				}
			}
			return;
		}

		// Text is tiled across the picture in reading order. Each letter grows with the ink it stands
		// for and drops out where the picture is lightest.
		const seq = this.seq;
		const len = seq.length;
		for (let y = 0; y < sh; y++) {
			for (let x = 0; x < sw; x++) {
				const i = y * sw + x;
				const g = seq[i % len];
				const d = ink[i];
				if (g < 0 || d < 0.12) continue;
				const s = Math.min(1, 0.3 + d) * cellW;
				ctx.drawImage(atlas, g * a, 0, a, a, x * cellW + (cellW - s) / 2, y * cellH + (cellH - s) / 2, s, s);
			}
		}
	}

	private buildAtlas(chars: string, a: number, font: string, fill: string, ramp: boolean) {
		const glyphs = ramp ? [...chars] : [...new Set([...chars].filter((c) => c.trim()))];
		const atlas = this.atlas;
		atlas.width = a * Math.max(1, glyphs.length);
		atlas.height = a;
		const actx = atlas.getContext("2d")!;
		actx.clearRect(0, 0, atlas.width, atlas.height);
		actx.font = ramp ? `500 ${Math.round(a * 1.15)}px ${font}` : `600 ${Math.round(a * 0.95)}px ${font}`;
		actx.textAlign = "center";
		actx.textBaseline = "middle";
		actx.fillStyle = fill;
		glyphs.forEach((c, i) => actx.fillText(c, i * a + a / 2, a / 2));
		if (!ramp) this.seq = Int16Array.from([...chars], (c) => glyphs.indexOf(c));
	}

	private buildLut(p: Palette) {
		this.lutFor = p;
		const stops = p.tones;
		const last = stops.length - 1;
		for (let v = 0; v < 256; v++) {
			const pos = (v / 255) * last;
			const i = Math.min(last - 1, Math.floor(pos));
			const f = pos - i;
			const from = stops[i];
			const to = stops[i + 1];
			this.lut[v * 3] = from.r + (to.r - from.r) * f;
			this.lut[v * 3 + 1] = from.g + (to.g - from.g) * f;
			this.lut[v * 3 + 2] = from.b + (to.b - from.b) * f;
		}
	}
}

/** Four shots stacked into a classic booth strip on the palette's ground. */
export function composeStrip(shots: HTMLCanvasElement[], p: Palette) {
	const w = Math.min(shots[0].width, 720);
	const h = Math.round((w * shots[0].height) / shots[0].width);
	const pad = Math.round(w * 0.06);
	const out = document.createElement("canvas");
	const ctx = out.getContext("2d")!;
	out.width = w + pad * 2;
	out.height = pad + shots.length * (h + pad);
	ctx.fillStyle = p.ground.css;
	ctx.fillRect(0, 0, out.width, out.height);
	ctx.imageSmoothingQuality = "high";
	shots.forEach((s, i) => ctx.drawImage(s, pad, pad + i * (h + pad), w, h));
	return out;
}

/** A canvas copy scaled to `width`, as a data URL, for the strip preview. */
export function thumbnail(source: HTMLCanvasElement, width: number) {
	const c = document.createElement("canvas");
	c.width = width;
	c.height = Math.round((width * source.height) / source.width);
	c.getContext("2d")!.drawImage(source, 0, 0, c.width, c.height);
	return c.toDataURL("image/png");
}

export function download(canvas: HTMLCanvasElement, name: string) {
	canvas.toBlob((blob) => {
		if (!blob) return;
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = name;
		a.click();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	}, "image/png");
}
