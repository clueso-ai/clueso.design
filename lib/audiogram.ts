// Audiogram maker's audio and drawing: the built-in sample, decoding, per-frame levels and the card
// itself. components/playground/audiogram.tsx owns playback, recording and the controls.
// The card is drawn in design units (1080 px on the short side) and scaled to whatever canvas it's on,
// so the preview and the exported video are the same picture. Both read the levels from the same
// analysis at the same clip time, so they move the same too. Colours come in as CSS (site tokens or
// custom OKLCH) and are resolved to RGB at runtime.

import { rgbOf } from "./css-color";

export type Visual = "bars" | "spectrum" | "pixel" | "blocks" | "aura" | "line" | "ring";
export type Aspect = "1:1" | "9:16" | "16:9";
/** Where the visual sits: between the title and the bottom, along the bottom edge, or the whole card. */
export type Placement = "middle" | "bottom" | "full";
/** How many colours the visual blends through, and which way. */
export type Gradient = "solid" | "two" | "three";
export type Direction = "along" | "across";

export const MAX_SECONDS = 60;
export const SIZE: Record<Aspect, [number, number]> = { "1:1": [1080, 1080], "9:16": [1080, 1920], "16:9": [1920, 1080] };

/**
 * A style's fine-tuning. Width and gap are in design units (1080 on the short side). Round, glow and
 * smoothing go from 0 to 1. Sensitivity scales the levels (1 as analysed). Mirror puts the low notes
 * in the middle with the highs out to both sides, instead of lows on the left.
 */
export type Tune = { width: number; gap: number; round: number; glow: number; sensitivity: number; smoothing: number; mirror: boolean };

export const TUNES: Record<Visual, Tune> = {
	bars: { width: 6, gap: 4, round: 1, glow: 0.35, sensitivity: 1, smoothing: 0.5, mirror: true },
	spectrum: { width: 4, gap: 0, round: 0, glow: 0.5, sensitivity: 1, smoothing: 0.6, mirror: true },
	pixel: { width: 16, gap: 6, round: 1, glow: 0.45, sensitivity: 1, smoothing: 0.45, mirror: true },
	blocks: { width: 32, gap: 8, round: 0.24, glow: 0.3, sensitivity: 1, smoothing: 0.5, mirror: true },
	aura: { width: 0, gap: 0, round: 0, glow: 0.7, sensitivity: 1, smoothing: 0.7, mirror: true },
	line: { width: 5, gap: 0, round: 0, glow: 0.6, sensitivity: 1, smoothing: 0, mirror: false },
	ring: { width: 8, gap: 7, round: 1, glow: 0.45, sensitivity: 1, smoothing: 0.5, mirror: true },
};

/** The settings that mean something for each style. */
export const TUNABLE: Record<Visual, (keyof Tune)[]> = {
	bars: ["width", "gap", "round", "glow", "sensitivity", "smoothing", "mirror"],
	spectrum: ["width", "glow", "sensitivity", "smoothing", "mirror"],
	pixel: ["width", "gap", "round", "glow", "sensitivity", "smoothing", "mirror"],
	blocks: ["width", "gap", "round", "glow", "sensitivity", "smoothing", "mirror"],
	aura: ["glow", "sensitivity", "smoothing"],
	line: ["width", "glow", "sensitivity", "mirror"],
	ring: ["width", "gap", "round", "glow", "sensitivity", "smoothing", "mirror"],
};

export type RGB = { r: number; g: number; b: number };
/** ground: the card. from, via, to: the visual's colours, in gradient order. text: the title and subtitle. */
export type Palette = { ground: RGB; from: RGB; via: RGB; to: RGB; text: RGB };

export const rgba = (c: RGB, a = 1) => `rgba(${c.r},${c.g},${c.b},${a})`;

/** The card's colours from a CSS colour per role, resolved through the cascade on `probe`. */
export function resolvePalette(probe: HTMLElement, colors: Record<keyof Palette, string>): Palette {
	const at = (css: string) => rgbOf(probe, css);
	return { ground: at(colors.ground), from: at(colors.from), via: at(colors.via), to: at(colors.to), text: at(colors.text) };
}

export type Fonts = { title: string; titleWeight: string; text: string; textWeight: string };

/** The site's title and text fonts, read from two probes. */
export function readFonts(title: HTMLElement, text: HTMLElement): Fonts {
	const a = getComputedStyle(title);
	const b = getComputedStyle(text);
	return { title: a.fontFamily, titleWeight: a.fontWeight, text: b.fontFamily, textWeight: b.fontWeight };
}

// ── Audio ──────────────────────────────────────────────────────────────────────────────────────

const RATE = 44100;
const midi = (n: number) => 440 * 2 ** ((n - 69) / 12);

/** A short, soft melodic phrase, so the page has something to play before anyone picks a clip. */
export async function synthSample(): Promise<AudioBuffer> {
	const seconds = 7.5;
	const ac = new OfflineAudioContext(1, Math.ceil(seconds * RATE), RATE);
	const out = ac.createGain();
	out.gain.value = 0.5;
	// A little echo so the notes ring into each other.
	const delay = ac.createDelay(1);
	delay.delayTime.value = 0.36;
	const feedback = ac.createGain();
	feedback.gain.value = 0.32;
	const tone = ac.createBiquadFilter();
	tone.type = "lowpass";
	tone.frequency.value = 2600;
	out.connect(ac.destination);
	out.connect(delay);
	delay.connect(tone);
	tone.connect(feedback);
	feedback.connect(delay);
	tone.connect(ac.destination);

	const note = (n: number, at: number, len: number, level: number) => {
		const env = ac.createGain();
		env.gain.setValueAtTime(0, at);
		env.gain.linearRampToValueAtTime(level, at + 0.02);
		env.gain.exponentialRampToValueAtTime(level * 0.45, at + 0.25);
		env.gain.setValueAtTime(level * 0.45, at + len);
		env.gain.exponentialRampToValueAtTime(0.0001, at + len + 0.5);
		const filter = ac.createBiquadFilter();
		filter.type = "lowpass";
		filter.frequency.setValueAtTime(4200, at);
		filter.frequency.exponentialRampToValueAtTime(1400, at + len + 0.4);
		filter.connect(env);
		env.connect(out);
		for (const [type, detune] of [
			["triangle", -6],
			["sine", 7],
		] as const) {
			const osc = ac.createOscillator();
			osc.type = type;
			osc.frequency.value = midi(n);
			osc.detune.value = detune;
			osc.connect(filter);
			osc.start(at);
			osc.stop(at + len + 0.6);
		}
	};

	// A phrase in C major at 112 bpm, over a slow bass line.
	const beat = 60 / 112 / 2;
	const tune: [number, number][] = [
		[76, 1], [79, 1], [81, 2], [79, 1], [76, 1], [74, 2],
		[72, 1], [74, 1], [76, 2], [79, 2], [77, 1], [76, 1], [74, 4],
		[76, 1], [79, 1], [84, 2], [83, 1], [81, 1], [79, 2], [76, 2], [72, 6],
	];
	let at = 0.15;
	for (const [n, len] of tune) {
		note(n, at, len * beat * 0.9, 0.32);
		at += len * beat;
	}
	const bass = [48, 45, 41, 43, 48, 45, 43, 48];
	bass.forEach((n, i) => note(n, 0.15 + i * beat * 4, beat * 3.6, 0.22));
	return ac.startRendering();
}

/** Decodes any audio file the browser can read, kept to the first minute. Rejects when it can't. */
export async function decodeAudio(data: ArrayBuffer): Promise<{ buffer: AudioBuffer; capped: boolean }> {
	const ac = new OfflineAudioContext(1, 1, RATE);
	const decoded = await ac.decodeAudioData(data);
	if (decoded.duration <= MAX_SECONDS) return { buffer: decoded, capped: false };
	const length = Math.floor(MAX_SECONDS * decoded.sampleRate);
	const buffer = new AudioBuffer({ length, numberOfChannels: decoded.numberOfChannels, sampleRate: decoded.sampleRate });
	for (let c = 0; c < decoded.numberOfChannels; c++) buffer.copyToChannel(decoded.getChannelData(c).subarray(0, length), c);
	return { buffer, capped: true };
}

// ── Levels ─────────────────────────────────────────────────────────────────────────────────────
// The clip is analysed once, ahead of time, per video frame: BANDS values from 0 to 1, low notes
// first. The preview while playing, the paused card and the export all read the same numbers.

export const BANDS = 48;
const FFT = 2048;
const LO_HZ = 80;
const HI_HZ = 8000;
const DB_FLOOR = -100;
const ANALYSIS_FPS = 30;
/** How much of the clip the line shows, in seconds: a few cycles of a voice. */
const WAVE_SPAN = 0.032;
export const WAVE_POINTS = 240;

export type Analysis = { fps: number; frames: number; bands: Float32Array; mono: Float32Array; rate: number; peak: number };

/** Each band's bins, and a tilt so the quieter highs still move. */
function bandMap(sampleRate: number) {
	const hzPerBin = sampleRate / FFT;
	const from = new Int32Array(BANDS);
	const to = new Int32Array(BANDS);
	const tilt = new Float32Array(BANDS);
	for (let i = 0; i < BANDS; i++) {
		const lo = LO_HZ * (HI_HZ / LO_HZ) ** (i / BANDS);
		const hi = LO_HZ * (HI_HZ / LO_HZ) ** ((i + 1) / BANDS);
		from[i] = Math.max(1, Math.floor(lo / hzPerBin));
		to[i] = Math.max(from[i] + 1, Math.ceil(hi / hzPerBin));
		tilt[i] = 3 * Math.log2(Math.sqrt(lo * hi) / 300);
	}
	return { from, to, tilt };
}

// A small radix-2 FFT, enough for one window per frame.
function makeFft(n: number) {
	const rev = new Uint32Array(n);
	const bits = Math.log2(n);
	for (let i = 0; i < n; i++) {
		let r = 0;
		for (let b = 0; b < bits; b++) r = (r << 1) | ((i >> b) & 1);
		rev[i] = r;
	}
	const cos = new Float32Array(n / 2);
	const sin = new Float32Array(n / 2);
	for (let i = 0; i < n / 2; i++) {
		cos[i] = Math.cos((-2 * Math.PI * i) / n);
		sin[i] = Math.sin((-2 * Math.PI * i) / n);
	}
	return (re: Float32Array, im: Float32Array) => {
		for (let i = 0; i < n; i++) {
			const j = rev[i];
			if (j > i) {
				[re[i], re[j]] = [re[j], re[i]];
				[im[i], im[j]] = [im[j], im[i]];
			}
		}
		for (let size = 2; size <= n; size *= 2) {
			const half = size / 2;
			const step = n / size;
			for (let start = 0; start < n; start += size) {
				for (let k = 0; k < half; k++) {
					const a = start + k;
					const b = a + half;
					const wr = cos[k * step];
					const wi = sin[k * step];
					const tr = re[b] * wr - im[b] * wi;
					const ti = re[b] * wi + im[b] * wr;
					re[b] = re[a] - tr;
					im[b] = im[a] - ti;
					re[a] += tr;
					im[a] += ti;
				}
			}
		}
	};
}

/** Band levels for every video frame of the clip. Yields now and then so the page stays responsive. */
export async function analyse(buffer: AudioBuffer): Promise<Analysis> {
	const mono = new Float32Array(buffer.length);
	for (let c = 0; c < buffer.numberOfChannels; c++) {
		const data = buffer.getChannelData(c);
		for (let i = 0; i < data.length; i++) mono[i] += data[i] / buffer.numberOfChannels;
	}
	let peak = 1e-4;
	for (let i = 0; i < mono.length; i++) peak = Math.max(peak, Math.abs(mono[i]));
	const fps = ANALYSIS_FPS;
	const frames = Math.max(1, Math.ceil(buffer.duration * fps));
	const raw = new Float32Array(frames * BANDS);
	const fft = makeFft(FFT);
	const re = new Float32Array(FFT);
	const im = new Float32Array(FFT);
	// Blackman window, and only a light smoothing here: the Smoothing setting adds the rest.
	const win = new Float32Array(FFT);
	for (let i = 0; i < FFT; i++) win[i] = 0.42 - 0.5 * Math.cos((2 * Math.PI * i) / FFT) + 0.08 * Math.cos((4 * Math.PI * i) / FFT);
	const smooth = 0.25;
	const mag = new Float32Array(FFT / 2);
	const map = bandMap(buffer.sampleRate);
	for (let f = 0; f < frames; f++) {
		const end = Math.round((f / fps) * buffer.sampleRate);
		for (let i = 0; i < FFT; i++) {
			const s = end - FFT + i;
			re[i] = s >= 0 && s < mono.length ? mono[s] * win[i] : 0;
			im[i] = 0;
		}
		fft(re, im);
		for (let k = 0; k < FFT / 2; k++) mag[k] = smooth * mag[k] + (1 - smooth) * (Math.hypot(re[k], im[k]) / FFT);
		for (let i = 0; i < BANDS; i++) {
			let sum = 0;
			for (let k = map.from[i]; k < map.to[i]; k++) sum += Math.max(20 * Math.log10(mag[k] + 1e-12), DB_FLOOR);
			raw[f * BANDS + i] = sum / (map.to[i] - map.from[i]) + map.tilt[i];
		}
		if (f % 120 === 119) await new Promise((r) => setTimeout(r));
	}
	// The clip's own floor and ceiling, so quiet and loud recordings both fill the card.
	const sorted = Float32Array.from(raw).sort();
	const floor = sorted[Math.floor(sorted.length * 0.3)];
	const span = Math.max(sorted[Math.floor(sorted.length * 0.985)] - floor, 12);
	const bands = raw.map((v) => Math.min(1, Math.max(0, (v - floor) / span)) ** 1.4);
	return { fps, frames, bands, mono, rate: buffer.sampleRate, peak };
}

/** The loudest moment in the first third of a stretch of the clip, for a lively paused card. */
export function liveliestTime(a: Analysis, from: number, to: number): number {
	const first = Math.max(0, Math.floor(from * a.fps));
	const last = Math.min(a.frames - 1, Math.max(first, Math.floor((from + (to - from) / 3) * a.fps)));
	let best = first;
	let bestLevel = -1;
	for (let f = first; f <= last; f++) {
		let sum = 0;
		for (let b = 0; b < BANDS; b++) sum += a.bands[f * BANDS + b];
		if (sum > bestLevel) {
			bestLevel = sum;
			best = f;
		}
	}
	return Math.min(Math.max(best / a.fps - from, 0), to - from);
}

/** Analysed levels at a time in the clip, blended between the two nearest frames. */
function bandsAt(a: Analysis, time: number, out: Float32Array) {
	const x = Math.min(Math.max(time * a.fps, 0), a.frames - 1);
	const i = Math.floor(x);
	const j = Math.min(i + 1, a.frames - 1);
	const k = x - i;
	for (let b = 0; b < BANDS; b++) out[b] = a.bands[i * BANDS + b] * (1 - k) + a.bands[j * BANDS + b] * k;
}

const past = new Float32Array(BANDS);

/** Levels at a time with the style's smoothing (a fading average of the moments before) and sensitivity. */
function levelsAt(a: Analysis, time: number, tune: Tune, out: Float32Array) {
	const keep = Math.min(tune.smoothing, 0.92);
	out.fill(0);
	let total = 0;
	let w = 1;
	for (let k = 0; k < 40 && w > 0.02; k++) {
		bandsAt(a, time - k / a.fps, past);
		for (let b = 0; b < BANDS; b++) out[b] += past[b] * w;
		total += w;
		w *= keep;
	}
	for (let b = 0; b < BANDS; b++) out[b] = Math.min(1, (out[b] / total) * tune.sensitivity);
}

/** The sound itself around a time, for the line, held still on a rising zero crossing like a scope. */
function waveAt(a: Analysis, time: number, gain: number, out: Float32Array) {
	const n = Math.round(WAVE_SPAN * a.rate);
	let start = Math.round(time * a.rate) - n;
	for (let i = 0; i < n; i++) {
		const s = start - i;
		if (s < 1) break;
		if (a.mono[s - 1] < 0 && a.mono[s] >= 0) {
			start = s;
			break;
		}
	}
	const per = n / out.length;
	for (let j = 0; j < out.length; j++) {
		const lo = Math.floor(start + j * per);
		const hi = Math.max(lo + 1, Math.floor(start + (j + 1) * per));
		let sum = 0;
		for (let s = lo; s < hi; s++) sum += s >= 0 && s < a.mono.length ? a.mono[s] : 0;
		out[j] = Math.max(-1, Math.min(1, (sum / (hi - lo) / a.peak) * gain));
	}
}

export type Frame = {
	/** Seconds into the (trimmed) clip. Drives the slow drift of the aura. */
	t: number;
	bands: Float32Array;
	/** The levels a moment earlier, for the spectrum's afterglow. */
	trail: Float32Array;
	wave: Float32Array;
	/** The line a moment earlier, like a scope's fading trace. */
	waveTrail: Float32Array;
};

export const emptyFrame = (): Frame => ({ t: 0, bands: new Float32Array(BANDS), trail: new Float32Array(BANDS), wave: new Float32Array(WAVE_POINTS), waveTrail: new Float32Array(WAVE_POINTS) });

/** Fills `frame` for clip time `t`, which starts at `from` seconds into the audio. */
export function frameAt(a: Analysis, from: number, t: number, tune: Tune, frame: Frame) {
	frame.t = t;
	levelsAt(a, from + t, tune, frame.bands);
	levelsAt(a, from + t - 0.15, tune, frame.trail);
	waveAt(a, from + t, tune.sensitivity, frame.wave);
	waveAt(a, from + t - 0.06, tune.sensitivity, frame.waveTrail);
}

// ── Drawing ────────────────────────────────────────────────────────────────────────────────────

export type Scene = {
	aspect: Aspect;
	visual: Visual;
	placement: Placement;
	gradient: Gradient;
	direction: Direction;
	tune: Tune;
	palette: Palette;
	fonts: Fonts;
	title: string;
	subtitle: string;
	image: HTMLImageElement | null;
};

type Rect = { x: number; y: number; w: number; h: number };
/** Where the visual grows from: its middle line, or its bottom edge. */
type Anchor = "centre" | "base";

/** Draws the whole card. The context should already be scaled to SIZE[aspect]. */
export function drawCard(ctx: CanvasRenderingContext2D, scene: Scene, frame: Frame) {
	const [W, H] = SIZE[scene.aspect];
	const S = Math.min(W, H);
	const pad = S * 0.075;
	const p = scene.palette;
	ctx.fillStyle = rgba(p.ground);
	ctx.fillRect(0, 0, W, H);

	// The visual runs edge to edge under the header, along the bottom, or across the whole card.
	const headerBottom = drawHeader(ctx, scene, true);
	const top = headerBottom > 0 ? headerBottom + S * 0.06 : pad;
	const r: Rect = scene.placement === "full" ? { x: 0, y: 0, w: W, h: H } : { x: 0, y: top, w: W, h: Math.max(S * 0.15, H - top - (scene.placement === "middle" ? pad : 0)) };
	const anchor: Anchor = scene.placement === "bottom" ? "base" : "centre";

	// Drawn on its own layer first, so the glow can be made from it.
	const layers = layersFor(ctx.canvas);
	const lc = layers.layer.getContext("2d")!;
	lc.setTransform(1, 0, 0, 1, 0, 0);
	lc.clearRect(0, 0, layers.layer.width, layers.layer.height);
	lc.setTransform(ctx.getTransform());
	const k = S / 1080;
	if (scene.visual === "bars") drawBars(lc, r, anchor, scene, frame.bands, k);
	else if (scene.visual === "spectrum") drawSpectrum(lc, r, anchor, scene, frame, k);
	else if (scene.visual === "pixel") drawPixels(lc, r, anchor, scene, frame.bands, k);
	else if (scene.visual === "blocks") drawBlocks(lc, r, anchor, scene, frame.bands, k);
	else if (scene.visual === "aura") drawAura(lc, r, scene, frame);
	else if (scene.visual === "line") drawLine(lc, r, scene, frame, k);
	else drawRing(lc, r, scene, frame.bands, k);

	const dark = luminance(p.ground) < 0.5;
	const glow = scene.tune.glow;
	// On a dark card the glow adds light over the visual. On a light one it's a soft tint behind it.
	if (glow > 0 && !dark) bloom(ctx, layers, glow, false);
	ctx.save();
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.drawImage(layers.layer, 0, 0);
	ctx.restore();
	if (glow > 0 && dark) bloom(ctx, layers, glow, true);

	// Over a full-card visual, the ground fades in behind the words so they stay readable.
	if (scene.placement === "full" && headerBottom > 0) {
		const fade = ctx.createLinearGradient(0, 0, 0, headerBottom + S * 0.12);
		fade.addColorStop(0, rgba(p.ground, 0.92));
		fade.addColorStop(0.6, rgba(p.ground, 0.7));
		fade.addColorStop(1, rgba(p.ground, 0));
		ctx.fillStyle = fade;
		ctx.fillRect(0, 0, W, headerBottom + S * 0.12);
	}
	drawHeader(ctx, scene, false);
}

/** Picture, title and subtitle: centred and stacked on a story, in a row otherwise. Returns its bottom, 0 when empty. */
function drawHeader(ctx: CanvasRenderingContext2D, scene: Scene, measureOnly: boolean): number {
	const [W, H] = SIZE[scene.aspect];
	const S = Math.min(W, H);
	const pad = S * 0.075;
	const tall = scene.aspect === "9:16";
	const { palette: p, fonts, image } = scene;
	if (!image && !scene.title.trim() && !scene.subtitle.trim()) return 0;
	const titleSize = S * (tall ? 0.072 : 0.062);
	const subSize = S * (tall ? 0.044 : 0.038);
	const titleFont = `${fonts.titleWeight} ${titleSize}px ${fonts.title}`;
	const subFont = `${Math.max(Number(fonts.textWeight) || 400, 400)} ${subSize}px ${fonts.text}`;
	const text = (t: string, font: string, size: number, color: string, x: number, y: number, maxW: number, lines: number) => drawText(ctx, t, font, size, measureOnly ? null : color, x, y, maxW, lines);
	ctx.textBaseline = "alphabetic";
	if (tall) {
		let y = pad + S * 0.04;
		if (image) {
			const s = W * 0.3;
			if (!measureOnly) drawImage(ctx, image, { x: (W - s) / 2, y, w: s, h: s }, s * 0.08);
			y += s + S * 0.07;
		}
		ctx.textAlign = "center";
		y = text(scene.title, titleFont, titleSize, rgba(p.text), W / 2, y, W - pad * 2, 2);
		return text(scene.subtitle, subFont, subSize, rgba(p.text, 0.68), W / 2, y + S * 0.02, W - pad * 2, 1);
	}
	const s = S * 0.17;
	let x = pad;
	if (image) {
		if (!measureOnly) drawImage(ctx, image, { x: pad, y: pad, w: s, h: s }, s * 0.1);
		x += s + S * 0.045;
	}
	const maxW = W - x - pad;
	ctx.textAlign = "left";
	ctx.font = titleFont;
	const titleLines = wrap(ctx, scene.title, maxW, 2).length;
	const textH = titleLines * titleSize * 1.15 + (scene.subtitle ? subSize * 1.5 : 0);
	let y = image ? pad + Math.max(0, (s - textH) / 2) : pad;
	y = text(scene.title, titleFont, titleSize, rgba(p.text), x, y, maxW, 2);
	y = text(scene.subtitle, subFont, subSize, rgba(p.text, 0.68), x, y + S * 0.012, maxW, 1);
	return Math.max(y, image ? pad + s : 0);
}

// ── Styles ─────────────────────────────────────────────────────────────────────────────────────

/** A band level for a position across the visual (0 to 1): lows on the left, or in the middle when mirrored. */
function levelAt(bands: Float32Array, u: number, mirror: boolean) {
	const d = mirror ? Math.abs(2 * u - 1) : u;
	// The top bands rarely move, so the far end stops a little short of them.
	const x = Math.min(1, Math.max(0, d)) * (bands.length - 1) * 0.85;
	const i = Math.floor(x);
	const k = (1 - Math.cos(Math.PI * (x - i))) / 2;
	return bands[i] * (1 - k) + bands[Math.min(i + 1, bands.length - 1)] * k;
}

/** A steady 0..1 number per index, for the bars' uneven, hand-made texture. */
const grain = (i: number) => {
	const x = Math.sin(i * 12.9898) * 43758.5453;
	return x - Math.floor(x);
};

/** Bars: dense, rounded, Suno-like. */
function drawBars(c: CanvasRenderingContext2D, r: Rect, anchor: Anchor, scene: Scene, bands: Float32Array, k: number) {
	const t = scene.tune;
	const bw = Math.max(1, t.width * k);
	const gap = t.gap * k;
	const cell = bw + gap;
	const n = Math.max(4, Math.floor((r.w + gap) / cell));
	const x0 = r.x + (r.w - (n * cell - gap)) / 2;
	const reach = r.h * 0.94;
	c.fillStyle = paint(c, scene, r, anchor);
	c.beginPath();
	for (let i = 0; i < n; i++) {
		const u = (i + 0.5) / n;
		// The texture follows the mirror, so both halves match.
		const g = grain(t.mirror ? Math.abs(i - (n - 1) / 2) : i);
		const v = levelAt(bands, u, t.mirror) * (0.72 + 0.28 * g);
		const h = Math.max(bw * 0.8, v * reach);
		const y = anchor === "base" ? r.y + r.h - h : r.y + (r.h - h) / 2;
		c.roundRect(x0 + i * cell, y, bw, h, Math.min((t.round * bw) / 2, h / 2));
	}
	c.fill();
}

/** Spectrum: a smooth filled shape with a bright edge, and a fainter trace of a moment before. */
function drawSpectrum(c: CanvasRenderingContext2D, r: Rect, anchor: Anchor, scene: Scene, frame: Frame, k: number) {
	const t = scene.tune;
	const n = 96;
	const shape = (bands: Float32Array) => {
		const pts: [number, number][] = [];
		for (let i = 0; i <= n; i++) {
			const u = i / n;
			// Tapered at the ends when it grows from the middle, so it reads as one shape.
			const taper = anchor === "centre" ? Math.sin(Math.PI * u) ** 0.35 : 1;
			pts.push([r.x + u * r.w, levelAt(bands, u, t.mirror) * taper]);
		}
		return pts;
	};
	const outline = (pts: [number, number][], closed: boolean) => {
		const reach = anchor === "base" ? r.h * 0.94 : r.h * 0.47;
		const mid = anchor === "base" ? r.y + r.h : r.y + r.h / 2;
		c.beginPath();
		smooth(c, pts.map(([x, v]) => [x, mid - Math.max(v * reach, k * 2)] as [number, number]), true);
		if (!closed) return;
		if (anchor === "base") {
			c.lineTo(r.x + r.w, r.y + r.h);
			c.lineTo(r.x, r.y + r.h);
		} else smooth(c, pts.map(([x, v]) => [x, mid + Math.max(v * reach, k * 2)] as [number, number]).reverse(), false);
		c.closePath();
	};
	const fill = paint(c, scene, r, anchor);
	c.lineJoin = "round";
	c.lineCap = "round";
	c.strokeStyle = fill;
	c.fillStyle = fill;
	// The trace of a moment before, faint.
	c.globalAlpha = 0.3;
	c.lineWidth = Math.max(1, t.width * k * 0.6);
	outline(shape(frame.trail), true);
	c.stroke();
	const now = shape(frame.bands);
	// A lighter fill on a light card, so the colour reads as a tint rather than turning grey.
	c.globalAlpha = luminance(scene.palette.ground) < 0.5 ? 0.45 : 0.28;
	outline(now, true);
	c.fill();
	c.globalAlpha = 1;
	c.lineWidth = Math.max(1, t.width * k);
	outline(now, true);
	c.stroke();
}

/** Pixel: an LED dot matrix across the frame. Unlit dots stay faintly visible, like a real panel. */
function drawPixels(c: CanvasRenderingContext2D, r: Rect, anchor: Anchor, scene: Scene, bands: Float32Array, k: number) {
	const t = scene.tune;
	const dot = Math.max(2, t.width * k);
	const gap = Math.max(0, t.gap * k);
	const cell = dot + gap;
	const cols = Math.max(4, Math.floor((r.w + gap) / cell));
	const rows = Math.max(3, Math.floor((r.h + gap) / cell));
	const x0 = r.x + (r.w - (cols * cell - gap)) / 2;
	const y0 = r.y + (r.h - (rows * cell - gap)) / 2;
	const radius = (t.round * dot) / 2;
	// Dots go into a few paths by brightness, so each is filled once.
	const levels = [new Path2D(), new Path2D(), new Path2D(), new Path2D(), new Path2D()];
	for (let col = 0; col < cols; col++) {
		const v = levelAt(bands, (col + 0.5) / cols, t.mirror);
		for (let row = 0; row < rows; row++) {
			// How far into the lit run this dot is: from the middle row out, or from the bottom up.
			const lit = anchor === "base" ? v * rows - (rows - 1 - row) : v * (rows / 2) + 0.5 - Math.abs(row + 0.5 - rows / 2);
			const on = Math.min(1, Math.max(0, lit));
			levels[Math.round(on * 4)].roundRect(x0 + col * cell, y0 + row * cell, dot, dot, radius);
		}
	}
	c.fillStyle = paint(c, scene, r, anchor);
	levels.forEach((path, i) => {
		c.globalAlpha = i === 0 ? 0.1 : 0.1 + 0.9 * (i / 4);
		c.fill(path);
	});
	c.globalAlpha = 1;
}

/**
 * Blocks: chunky squares in an odd number of rows (at most 15), so there's always a middle row that's
 * lit. The block at the edge of each column's level lights partly, so the columns move smoothly.
 */
function drawBlocks(c: CanvasRenderingContext2D, r: Rect, anchor: Anchor, scene: Scene, bands: Float32Array, k: number) {
	const t = scene.tune;
	const block = Math.max(4, t.width * k);
	const gap = Math.max(0, t.gap * k);
	const cell = block + gap;
	const cols = Math.max(6, Math.floor((r.w + gap) / cell));
	let rows = Math.max(3, Math.floor((r.h + gap) / cell));
	if (rows % 2 === 0) rows--;
	rows = Math.min(rows, 15);
	const half = (rows - 1) / 2;
	const x0 = r.x + (r.w - (cols * cell - gap)) / 2;
	const y0 = anchor === "base" ? r.y + r.h - (rows * cell - gap) : r.y + (r.h - (rows * cell - gap)) / 2;
	const radius = (t.round * block) / 2;
	c.fillStyle = paint(c, scene, r, anchor);
	for (let col = 0; col < cols; col++) {
		const v = levelAt(bands, (col + 0.5) / cols, t.mirror);
		for (let row = 0; row < rows; row++) {
			// From the middle row out, or from the bottom up when it sits on the bottom edge.
			const on = anchor === "base" ? Math.min(1, Math.max(0, v * (rows + 0.6) - (rows - 1 - row))) : Math.abs(row - half) === 0 ? 1 : Math.min(1, Math.max(0, v * (half + 0.6) - Math.abs(row - half) + 1));
			c.globalAlpha = 0.12 + 0.88 * on;
			c.beginPath();
			c.roundRect(x0 + col * cell, y0 + row * cell, block, block, radius);
			c.fill();
		}
	}
	c.globalAlpha = 1;
}

/** Aura: layered glowing waves that swell with the voice, like Siri's. Each follows its own part of the sound. */
function drawAura(c: CanvasRenderingContext2D, r: Rect, scene: Scene, frame: Frame) {
	const { bands, t } = frame;
	const avg = (from: number, to: number) => {
		let s = 0;
		for (let i = from; i < to; i++) s += bands[i];
		return s / (to - from);
	};
	const parts = [avg(0, 10), avg(8, 22), avg(20, 40)];
	const colors = stops(scene);
	const cy = r.y + r.h / 2;
	const reach = r.h * 0.46;
	const dark = luminance(scene.palette.ground) < 0.5;
	const waves = [
		{ part: 0, color: 0, cycles: 1.6, speed: 1.1, drift: 0.23, width: 0.3, phase: 0 },
		{ part: 1, color: 1, cycles: 2.3, speed: -1.5, drift: 0.31, width: 0.22, phase: 1.7 },
		{ part: 2, color: 2, cycles: 3.1, speed: 2.1, drift: 0.41, width: 0.18, phase: 3.1 },
		{ part: 1, color: 0, cycles: 2.8, speed: 1.8, drift: 0.19, width: 0.2, phase: 4.4 },
		{ part: 0, color: 2, cycles: 1.9, speed: -1.2, drift: 0.27, width: 0.26, phase: 5.6 },
	];
	const steps = 180;
	// Overlaps add light on a dark card and deepen on a light one.
	c.globalCompositeOperation = dark ? "lighter" : "multiply";
	for (const w of waves) {
		const level = parts[w.part];
		const amp = reach * (0.03 + 0.97 * Math.min(1, level * 1.15));
		const centre = 0.5 + 0.3 * Math.sin(t * w.drift * 2.4 + w.phase);
		const ys: number[] = [];
		for (let s = 0; s <= steps; s++) {
			const u = s / steps;
			const env = Math.exp(-(((u - centre) / w.width) ** 2)) * Math.sin(Math.PI * u) ** 0.5;
			ys.push(amp * env * Math.sin(2 * Math.PI * w.cycles * u + t * w.speed * Math.PI + w.phase));
		}
		const fill = c.createLinearGradient(0, cy - amp, 0, cy + amp);
		const color = colors[w.color % colors.length];
		fill.addColorStop(0, rgba(color, 0.1));
		fill.addColorStop(0.5, rgba(color, dark ? 0.42 : 0.55));
		fill.addColorStop(1, rgba(color, 0.1));
		c.fillStyle = fill;
		c.beginPath();
		smooth(c, ys.map((y, s) => [r.x + (s / steps) * r.w, cy - y] as [number, number]), true);
		smooth(c, ys.map((y, s) => [r.x + (s / steps) * r.w, cy + y] as [number, number]).reverse(), false);
		c.closePath();
		c.fill();
	}
	c.globalCompositeOperation = "source-over";
	// A hairline through the middle, as the waves rest on.
	const line = c.createLinearGradient(r.x, 0, r.x + r.w, 0);
	line.addColorStop(0, rgba(colors[0], 0));
	line.addColorStop(0.5, rgba(colors[Math.floor(colors.length / 2)], 0.5));
	line.addColorStop(1, rgba(colors[colors.length - 1], 0));
	c.fillStyle = line;
	c.fillRect(r.x, cy - r.h * 0.002, r.w, r.h * 0.004);
}

/** Line: the sound wave itself, like an oscilloscope, with the fading trace of a moment before. */
function drawLine(c: CanvasRenderingContext2D, r: Rect, scene: Scene, frame: Frame, k: number) {
	const t = scene.tune;
	const cy = r.y + r.h / 2;
	const reach = r.h * 0.44;
	const trace = (wave: Float32Array, flip: number) => {
		const n = wave.length;
		const pts: [number, number][] = [];
		for (let i = 0; i < n; i++) {
			const u = i / (n - 1);
			// Mirrored, the right half retraces the left, so the line is symmetric.
			const j = t.mirror ? Math.round((1 - Math.abs(2 * u - 1)) * (n - 1) * 0.5) : i;
			pts.push([r.x + u * r.w, cy + flip * wave[j] * reach * Math.sin(Math.PI * u) ** 0.6]);
		}
		c.beginPath();
		smooth(c, pts, true);
		c.stroke();
	};
	c.strokeStyle = paint(c, scene, r, "centre");
	c.lineJoin = "round";
	c.lineCap = "round";
	c.lineWidth = Math.max(1, t.width * k);
	c.globalAlpha = 0.28;
	trace(frame.waveTrail, 1);
	c.globalAlpha = 1;
	trace(frame.wave, 1);
	if (t.mirror) {
		c.globalAlpha = 0.5;
		trace(frame.wave, -1);
		c.globalAlpha = 1;
	}
}

/** Ring: bars around a circle, lows at the top when mirrored. */
function drawRing(c: CanvasRenderingContext2D, r: Rect, scene: Scene, bands: Float32Array, k: number) {
	const t = scene.tune;
	const cx = r.x + r.w / 2;
	const cy = r.y + r.h / 2;
	const outer = (Math.min(r.w, r.h) / 2) * 0.98;
	const R = outer * 0.42;
	const reach = outer - R;
	const bw = Math.max(1, t.width * k);
	const n = Math.max(24, Math.min(400, Math.floor((2 * Math.PI * R) / (bw + t.gap * k))));
	c.strokeStyle = ringPaint(c, scene, cx, cy, R, outer);
	c.lineWidth = bw;
	c.lineCap = t.round >= 0.5 ? "round" : "butt";
	c.beginPath();
	for (let i = 0; i < n; i++) {
		const a = (i / n) * Math.PI * 2;
		const v = levelAt(bands, t.mirror ? (1 - Math.cos(a)) / 2 : i / n, false);
		const len = Math.max(bw * 0.3, v * reach * 0.96);
		const dx = Math.sin(a);
		const dy = -Math.cos(a);
		c.moveTo(cx + dx * R, cy + dy * R);
		c.lineTo(cx + dx * (R + len), cy + dy * (R + len));
	}
	c.stroke();
	// A faint inner circle the bars stand on.
	c.globalAlpha = 0.35;
	c.lineWidth = Math.max(1, 2 * k);
	c.beginPath();
	c.arc(cx, cy, R - bw * 1.2, 0, Math.PI * 2);
	c.stroke();
	c.globalAlpha = 1;
}

// ── Colour and glow ────────────────────────────────────────────────────────────────────────────

/** The visual's colours in order: one for solid, then two or three. */
function stops(scene: Scene): RGB[] {
	const p = scene.palette;
	return scene.gradient === "solid" ? [p.from] : scene.gradient === "two" ? [p.from, p.to] : [p.from, p.via, p.to];
}

/** Puts the colours on a gradient from 0 to 1, or from the middle out to both ends. */
function addStops(g: CanvasGradient, colors: RGB[], fromMiddle: boolean) {
	colors.forEach((color, i) => {
		const at = colors.length === 1 ? 0 : i / (colors.length - 1);
		if (!fromMiddle) g.addColorStop(at, rgba(color));
		else {
			g.addColorStop(0.5 - at / 2, rgba(color));
			g.addColorStop(0.5 + at / 2, rgba(color));
		}
	});
	return g;
}

/** The visual's fill: along runs left to right (from the middle out when mirrored), across runs from where it grows to its tips. */
function paint(c: CanvasRenderingContext2D, scene: Scene, r: Rect, anchor: Anchor): string | CanvasGradient {
	const colors = stops(scene);
	if (colors.length === 1) return rgba(colors[0]);
	if (scene.direction === "along") return addStops(c.createLinearGradient(r.x, 0, r.x + r.w, 0), colors, scene.tune.mirror);
	if (anchor === "base") return addStops(c.createLinearGradient(0, r.y + r.h, 0, r.y), colors, false);
	return addStops(c.createLinearGradient(0, r.y, 0, r.y + r.h), colors, true);
}

/** The ring's fill: around the circle (along) or from the inside out (across). */
function ringPaint(c: CanvasRenderingContext2D, scene: Scene, cx: number, cy: number, inner: number, outer: number): string | CanvasGradient {
	const colors = stops(scene);
	if (colors.length === 1) return rgba(colors[0]);
	if (scene.direction === "across") return addStops(c.createRadialGradient(cx, cy, inner, cx, cy, outer), colors, false);
	// Around from the top. Mirrored, both sides meet at the bottom in the last colour.
	const g = c.createConicGradient(-Math.PI / 2, cx, cy);
	if (!scene.tune.mirror) return addStops(g, [...colors, colors[0]], false);
	colors.forEach((color, i) => {
		const at = i / (colors.length - 1) / 2;
		g.addColorStop(at, rgba(color));
		g.addColorStop(1 - at, rgba(color));
	});
	return g;
}

const luminance = (c: RGB) => (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255;

type Layers = { layer: HTMLCanvasElement; mips: HTMLCanvasElement[] };
const layerCache = new WeakMap<HTMLCanvasElement, Layers>();

/** An offscreen layer the size of `canvas` for the visual, and smaller copies of it for the glow. */
function layersFor(canvas: HTMLCanvasElement): Layers {
	const { width, height } = canvas;
	let l = layerCache.get(canvas);
	if (!l || l.layer.width !== width || l.layer.height !== height) {
		const make = (d: number) => Object.assign(document.createElement("canvas"), { width: Math.max(1, Math.round(width / d)), height: Math.max(1, Math.round(height / d)) });
		l = { layer: make(1), mips: [2, 4, 8, 16].map(make) };
		layerCache.set(canvas, l);
	}
	return l;
}

/**
 * The glow: the visual halved again and again, then the small copies stretched back over the card.
 * Stretching blurs them, and that works the same in every browser, so the export glows like the preview.
 */
function bloom(ctx: CanvasRenderingContext2D, l: Layers, amount: number, dark: boolean) {
	let src = l.layer;
	for (const m of l.mips) {
		const mc = m.getContext("2d")!;
		mc.clearRect(0, 0, m.width, m.height);
		mc.drawImage(src, 0, 0, m.width, m.height);
		src = m;
	}
	const { width, height } = l.layer;
	ctx.save();
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = "high";
	ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
	ctx.globalAlpha = Math.min(1, amount * (dark ? 0.6 : 0.45));
	ctx.drawImage(l.mips[1], 0, 0, width, height);
	ctx.globalAlpha = Math.min(1, amount * (dark ? 0.9 : 0.6));
	ctx.drawImage(l.mips[3], 0, 0, width, height);
	ctx.restore();
}

// ── Shapes and text ────────────────────────────────────────────────────────────────────────────

/** A smooth curve through points, with each corner rounded through the midpoints. */
function smooth(c: CanvasRenderingContext2D, pts: [number, number][], start: boolean) {
	if (start) c.moveTo(pts[0][0], pts[0][1]);
	else c.lineTo(pts[0][0], pts[0][1]);
	for (let i = 1; i < pts.length - 1; i++) c.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
	const last = pts[pts.length - 1];
	c.lineTo(last[0], last[1]);
}

/** Draws wrapped text from its top edge, or only measures it when `color` is null. Returns the y below it. */
function drawText(ctx: CanvasRenderingContext2D, text: string, font: string, size: number, color: string | null, x: number, y: number, maxW: number, maxLines: number) {
	if (!text.trim()) return y;
	ctx.font = font;
	const lines = wrap(ctx, text, maxW, maxLines);
	const lh = size * 1.15;
	if (color) {
		ctx.fillStyle = color;
		lines.forEach((line, i) => ctx.fillText(line, x, y + size * 0.92 + i * lh));
	}
	return y + lines.length * lh;
}

/** Word wraps to at most `max` lines, with an ellipsis when it runs over. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, max: number): string[] {
	const words = text.trim().split(/\s+/).filter(Boolean);
	const lines: string[] = [];
	let line = "";
	for (const word of words) {
		const next = line ? `${line} ${word}` : word;
		if (ctx.measureText(next).width <= maxW || !line) line = next;
		else {
			lines.push(line);
			line = word;
		}
	}
	if (line) lines.push(line);
	if (lines.length <= max) return lines.map((l) => fit(ctx, l, maxW));
	const kept = lines.slice(0, max);
	kept[max - 1] = fit(ctx, `${kept[max - 1]} ${lines[max]}`, maxW, true);
	return kept;
}

/** Trims a line to the width, ending in an ellipsis if anything was cut. */
function fit(ctx: CanvasRenderingContext2D, line: string, maxW: number, cut = false) {
	if (!cut && ctx.measureText(line).width <= maxW) return line;
	let s = line;
	while (s.length > 1 && ctx.measureText(`${s}…`).width > maxW) s = s.slice(0, -1);
	return `${s.trimEnd()}…`;
}

/** An image cropped to fill the rect, with rounded corners. */
function drawImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, r: Rect, radius: number) {
	const iw = img.naturalWidth;
	const ih = img.naturalHeight;
	const scale = Math.max(r.w / iw, r.h / ih);
	const sw = r.w / scale;
	const sh = r.h / scale;
	ctx.save();
	ctx.beginPath();
	ctx.roundRect(r.x, r.y, r.w, r.h, Math.min(radius, r.w / 2, r.h / 2));
	ctx.clip();
	ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, r.x, r.y, r.w, r.h);
	ctx.restore();
}
