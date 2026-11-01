import { zipSync } from "fflate";
import { applyPalette, GIFEncoder, quantize } from "gifenc";
import { ArrayBufferTarget, Muxer } from "mp4-muxer";
import { resolveColor, toPalette } from "../brand/palette";
import { Renderer } from "../engine/renderer";
import { loadImage } from "../layers/sources/image";
import { FONTS } from "../layers/sources/text";
import type { Doc } from "../state/doc";

function slug(s: string) {
	return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "clueso-pattern";
}

/** While set (by exportBundle), downloads are collected instead of saved. */
let collector: ((blob: Blob, filename: string) => void) | null = null;

export function download(blob: Blob, filename: string) {
	if (collector) return collector(blob, filename);
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.click();
	setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Wait for fonts and embedded images so the first exported frame is complete. */
export async function prepare(doc: Doc) {
	await document.fonts.ready;
	await Promise.all(
		doc.layers
			.filter((l) => l.type === "image" && l.params.src)
			.map((l) => loadImage(String(l.params.src)).catch(() => null)),
	);
	const loads = doc.layers.flatMap((l) => {
		if (l.type === "text") return [`${l.params.weight} 64px "${FONTS[l.params.font as number] ?? "Geist"}"`];
		if (l.type === "binary") return [`${l.params.weight === 1 ? 700 : 400} 64px "Geist Mono"`];
		return [];
	});
	await Promise.all(loads.map((f) => document.fonts.load(f).catch(() => null)));
}

function exportRenderer() {
	const canvas = document.createElement("canvas");
	return new Renderer(canvas, { preserveDrawingBuffer: true });
}

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);
const tick = () => new Promise((res) => setTimeout(res, 0));
const abortError = () => new DOMException("Export cancelled", "AbortError");

/** Copies the GL canvas into a 2D canvas, optionally flattened onto a solid colour. */
function to2D(src: HTMLCanvasElement, flatten?: string) {
	const c = document.createElement("canvas");
	c.width = src.width;
	c.height = src.height;
	const g = c.getContext("2d", { willReadFrequently: true })!;
	if (flatten) {
		g.fillStyle = flatten;
		g.fillRect(0, 0, c.width, c.height);
	}
	g.drawImage(src, 0, 0);
	return { canvas: c, g };
}

function backgroundHex(doc: Doc) {
	return doc.scene.transparent ? "#FFFFFF" : resolveColor(doc.scene.background, toPalette(doc.scene.palette));
}

export type ImageFormat = "png" | "jpeg" | "webp";

async function renderStill(doc: Doc, time: number, scale: number, format: ImageFormat, quality = 0.92) {
	await prepare(doc);
	const r = exportRenderer();
	try {
		const w = Math.round(doc.scene.width * scale);
		const h = Math.round(doc.scene.height * scale);
		r.render(doc, time, w, h);
		// Text textures are built during the first pass; render again so they are guaranteed present.
		r.render(doc, time, w, h);
		// JPEG has no alpha: flatten a transparent scene onto white instead of black.
		const src = format === "jpeg" ? to2D(r.canvas, backgroundHex(doc)).canvas : r.canvas;
		const blob = await new Promise<Blob | null>((res) => src.toBlob(res, `image/${format}`, quality));
		if (!blob) throw new Error(`Could not encode ${format.toUpperCase()}`);
		return { blob, w, h };
	} finally {
		r.dispose({ loseContext: true });
	}
}

export async function exportImage(doc: Doc, time: number, scale = 1, format: ImageFormat = "png", quality = 0.92) {
	const { blob, w, h } = await renderStill(doc, time, scale, format, quality);
	download(blob, `${slug(doc.name)}-${w}x${h}.${format === "jpeg" ? "jpg" : format}`);
}

/** Puts the current frame on the clipboard as a PNG, ready to paste into Figma, Slack or Docs. */
export async function copyImage(doc: Doc, time: number, scale = 1) {
	if (!navigator.clipboard || typeof ClipboardItem === "undefined") throw new Error("This browser can't copy images.");
	// Safari needs the ClipboardItem created synchronously inside the click, with a promised blob.
	const blob = renderStill(doc, time, scale, "png").then((r) => r.blob);
	await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}

export interface LoopOptions {
	scale: number;
	fps: number;
	loops: number;
	onProgress: (p: number) => void;
	signal?: AbortSignal;
}

export interface VideoOptions extends LoopOptions {
	bitrateMbps: number;
}

export function canExportVideo() {
	return typeof VideoEncoder !== "undefined";
}

/**
 * Renders every frame of the loop in order. Every motion is phase-based, so one loop is seamless
 * and frame i of n lands exactly on t = i / fps.
 */
async function eachFrame(doc: Doc, opts: LoopOptions, width: number, height: number, onFrame: (r: Renderer, i: number, frames: number) => Promise<void> | void) {
	const frames = Math.max(1, Math.round(doc.scene.duration * opts.fps * opts.loops));
	const r = exportRenderer();
	try {
		r.render(doc, 0, width, height);
		for (let i = 0; i < frames; i++) {
			if (opts.signal?.aborted) throw abortError();
			r.render(doc, i / opts.fps, width, height);
			await onFrame(r, i, frames);
			if (i % 4 === 0) {
				opts.onProgress(i / frames);
				await tick();
			}
		}
		opts.onProgress(1);
	} finally {
		r.dispose({ loseContext: true });
	}
	return frames;
}

/** Frame-exact MP4 (H.264) via WebCodecs. */
export async function exportMP4(doc: Doc, opts: VideoOptions) {
	if (!canExportVideo()) throw new Error("This browser does not support WebCodecs video encoding.");
	await prepare(doc);
	const width = even(doc.scene.width * opts.scale);
	const height = even(doc.scene.height * opts.scale);
	const { fps } = opts;

	const codecs = ["avc1.640034", "avc1.640033", "avc1.4d0034", "avc1.42003e"];
	let config: VideoEncoderConfig | null = null;
	for (const codec of codecs) {
		const c: VideoEncoderConfig = { codec, width, height, bitrate: opts.bitrateMbps * 1e6, framerate: fps };
		if ((await VideoEncoder.isConfigSupported(c)).supported) {
			config = c;
			break;
		}
	}
	if (!config) throw new Error(`H.264 encoding at ${width}×${height} is not supported here. Try a smaller scale.`);

	const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: "avc", width, height, frameRate: fps }, fastStart: "in-memory" });
	let encodeError: unknown = null;
	const encoder = new VideoEncoder({
		output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
		error: (e) => {
			encodeError = e;
		},
	});
	encoder.configure(config);

	try {
		await eachFrame(doc, opts, width, height, async (r, i) => {
			if (encodeError) throw encodeError;
			const frame = new VideoFrame(r.canvas, { timestamp: Math.round((i * 1e6) / fps), duration: Math.round(1e6 / fps) });
			encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
			frame.close();
			while (encoder.encodeQueueSize > 8) await new Promise((res) => setTimeout(res, 4));
		});
		await encoder.flush();
		muxer.finalize();
		download(new Blob([muxer.target.buffer], { type: "video/mp4" }), `${slug(doc.name)}-${width}x${height}.mp4`);
	} finally {
		if (encoder.state !== "closed") encoder.close();
	}
}

/**
 * Looping GIF. One palette is built from frames sampled across the loop, so colours stay stable
 * (no per-frame palette flicker) and encoding stays fast.
 */
export async function exportGIF(doc: Doc, opts: LoopOptions) {
	await prepare(doc);
	const width = Math.round(doc.scene.width * opts.scale);
	const height = Math.round(doc.scene.height * opts.scale);
	const bg = backgroundHex(doc);

	// Palette pass: a handful of frames, subsampled.
	const sampler = exportRenderer();
	const samples: Uint8ClampedArray[] = [];
	try {
		for (let k = 0; k < 6; k++) {
			sampler.render(doc, ((k + 0.5) / 6) * doc.scene.duration, width, height);
			sampler.render(doc, ((k + 0.5) / 6) * doc.scene.duration, width, height);
			const { g } = to2D(sampler.canvas, bg);
			const data = g.getImageData(0, 0, width, height).data;
			const step = Math.max(1, Math.floor((width * height) / 120000));
			const sub = new Uint8ClampedArray(Math.ceil((width * height) / step) * 4);
			for (let i = 0, j = 0; i < width * height; i += step, j += 4) sub.set(data.subarray(i * 4, i * 4 + 4), j);
			samples.push(sub);
		}
	} finally {
		sampler.dispose({ loseContext: true });
	}
	const all = new Uint8ClampedArray(samples.reduce((n, s) => n + s.length, 0));
	samples.reduce((o, s) => (all.set(s, o), o + s.length), 0);
	const palette = quantize(all, 256);

	const gif = GIFEncoder();
	const delay = 1000 / opts.fps;
	await eachFrame(doc, { ...opts, onProgress: (p) => opts.onProgress(p * 0.98) }, width, height, (r, i) => {
		const { g } = to2D(r.canvas, bg);
		const index = applyPalette(g.getImageData(0, 0, width, height).data, palette);
		gif.writeFrame(index, width, height, { palette: i === 0 ? palette : undefined, delay, repeat: 0 });
	});
	gif.finish();
	download(new Blob([gif.bytes() as BlobPart], { type: "image/gif" }), `${slug(doc.name)}-${width}x${height}.gif`);
	opts.onProgress(1);
}

/** Numbered PNG frames in a .zip, with alpha when the scene is transparent: for After Effects, Premiere or Figma. */
export async function exportFrames(doc: Doc, opts: LoopOptions) {
	await prepare(doc);
	const width = Math.round(doc.scene.width * opts.scale);
	const height = Math.round(doc.scene.height * opts.scale);
	const files: Record<string, [Uint8Array, { level: 0 }]> = {};
	const name = slug(doc.name);
	await eachFrame(doc, opts, width, height, async (r, i, n) => {
		const blob = await new Promise<Blob | null>((res) => r.canvas.toBlob(res, "image/png"));
		if (!blob) throw new Error("Could not encode PNG frame");
		const digits = String(n).length;
		files[`${name}/${name}_${String(i).padStart(Math.max(4, digits), "0")}.png`] = [new Uint8Array(await blob.arrayBuffer()), { level: 0 }];
	});
	const zip = zipSync(files);
	download(new Blob([zip as BlobPart], { type: "application/zip" }), `${name}-${width}x${height}-frames.zip`);
}

export interface ProjectFile {
	name: string;
	canvases: Doc[];
	active?: number;
}

/** A project file: every canvas. Older files held a single doc; readJSON accepts both. */
export function exportJSON(project: ProjectFile) {
	const body = { version: 2, name: project.name, canvases: project.canvases, active: project.active ?? 0 };
	download(new Blob([JSON.stringify(body, null, 2)], { type: "application/json" }), `${slug(project.name)}.brandlab.json`);
}

export async function readJSON(file: File): Promise<ProjectFile> {
	const data = JSON.parse(await file.text());
	const isDoc = (d: unknown): d is Doc => !!d && (d as Doc).version === 1 && Array.isArray((d as Doc).layers) && !!(d as Doc).scene;
	if (Array.isArray(data?.canvases) && data.canvases.length && data.canvases.every(isDoc)) return { name: data.name ?? "Untitled", canvases: data.canvases, active: data.active ?? 0 };
	if (isDoc(data)) return { name: data.name || "Untitled", canvases: [data] };
	throw new Error("Not a Brand Lab file");
}

/** Run several exports and zip whatever they download into one file. */
export async function exportBundle(name: string, run: () => Promise<void>) {
	const files: Record<string, Uint8Array> = {};
	collector = (blob, filename) => {
		let f = filename;
		for (let n = 2; files[f]; n++) f = filename.replace(/(\.[^.]+)$/, `-${n}$1`);
		files[f] = new Uint8Array(0);
		pending.push(blob.arrayBuffer().then((b) => void (files[f] = new Uint8Array(b))));
	};
	const pending: Promise<void>[] = [];
	try {
		await run();
		await Promise.all(pending);
	} finally {
		collector = null;
	}
	download(new Blob([zipSync(files, { level: 0 }) as BlobPart], { type: "application/zip" }), `${slug(name)}-canvases.zip`);
}
