// Voice booth's audio. Each preset is a Web Audio graph rendered with an OfflineAudioContext, so a
// take renders faster than real time and the same way every time. The graph can't do everything,
// so a few steps run on the samples directly: spectral noise reduction and a gentle expander
// before the graph, then loudness matching and a peak limiter after it. WAV encoding is here too.
// Nothing leaves the browser.

export type PresetId = "original" | "studio" | "radio" | "phone" | "stadium" | "chipmunk" | "deep";

/** The tune sliders. They apply on top of whichever preset is picked. */
export type Tune = {
	/** Noise reduction, 0 to 100 */
	clean: number;
	/** Low shelf, in dB */
	warmth: number;
	/** Presence, in dB */
	clarity: number;
	/** Small room reverb mix, 0 to 100 */
	room: number;
	/** Match loudness to `target` */
	level: boolean;
	/** Loudness target, in LUFS (roughly) */
	target: number;
};

export const MAX_SECONDS = 30;
const NEUTRAL_TUNE: Tune = { clean: 0, warmth: 0, clarity: 0, room: 0, level: false, target: -16 };

type Preset = { id: PresetId; name: string; tune: Tune; rate: number };

const tune = (t: Partial<Tune>): Tune => ({ ...NEUTRAL_TUNE, level: true, ...t });

export const PRESETS: Preset[] = [
	{ id: "original", name: "Original", tune: NEUTRAL_TUNE, rate: 1 },
	{ id: "studio", name: "Studio voice", tune: tune({ clean: 55, room: 10 }), rate: 1 },
	{ id: "radio", name: "Radio", tune: tune({ clean: 30 }), rate: 1 },
	{ id: "phone", name: "Phone", tune: tune({ clean: 20, target: -18 }), rate: 1 },
	{ id: "stadium", name: "Stadium", tune: tune({ clean: 30 }), rate: 1 },
	{ id: "chipmunk", name: "Chipmunk", tune: tune({ clean: 30 }), rate: 1.5 },
	{ id: "deep", name: "Deep", tune: tune({ clean: 30 }), rate: 0.72 },
];

export const presetOf = (id: PresetId) => PRESETS.find((p) => p.id === id) ?? PRESETS[0];

const db = (v: number) => 10 ** (v / 20);
export const toDb = (v: number) => (v > 0 ? 20 * Math.log10(v) : -Infinity);

// ── Rendering ────────────────────────────────────────────────────────────────

/** A processed take, with what's needed to line it up with the original. */
export type Rendered = { buffer: AudioBuffer; rate: number };

const isNeutral = (t: Tune) => t.clean === 0 && t.warmth === 0 && t.clarity === 0 && t.room === 0 && !t.level;

/** Runs `input` through a preset and the tune settings. */
export async function renderVoice(input: AudioBuffer, id: PresetId, t: Tune): Promise<Rendered> {
	const preset = presetOf(id);
	if (id === "original" && isNeutral(t)) return { buffer: input, rate: 1 };

	const sr = input.sampleRate;
	const voice = prepare(input, t.clean / 100, id === "studio");
	const rate = preset.rate;
	const content = Math.ceil(voice.length / rate);
	const tail = (id === "stadium" ? HALL_SECONDS + 0.6 : 0) + (t.room > 0 ? ROOM_SECONDS : 0) + 0.1;
	const ctx = new OfflineAudioContext(2, content + Math.ceil(tail * sr), sr);

	const buf = ctx.createBuffer(1, voice.length, sr);
	buf.copyToChannel(voice, 0);
	const src = ctx.createBufferSource();
	src.buffer = buf;
	src.playbackRate.value = rate;

	// Warmth and clarity first, so the preset's compressor sees them like any EQ in front of it.
	const eq = series(src, bq(ctx, "lowshelf", 180, 0.707, t.warmth), bq(ctx, "peaking", 3500, 0.9, t.clarity));
	const voiced = CHAINS[id](ctx, eq);

	const out = ctx.createGain();
	voiced.connect(out);
	if (t.room > 0) series(voiced, reverb(ctx, ROOM_SECONDS, 0.45, 0.006, 7000, 11), amp(ctx, (t.room / 100) * 0.5), out);
	out.connect(ctx.destination);

	src.start();
	const raw = await ctx.startRendering();
	const chs = [raw.getChannelData(0), raw.getChannelData(1)].map((c) => trimTail(c, content, sr));
	const end = Math.max(...chs.map((c) => c.length));
	const outChs = chs.map((c) => (c.length === end ? c : padTo(c, end)));

	// Loudness, then the limiter. Limiting can pull a peaky take under the target, so a second pass
	// makes up some of the difference (at most 4 dB more, to keep it from squashing).
	for (const most of t.level ? [36, 4] : []) {
		const lufs = loudness(outChs, sr);
		if (!Number.isFinite(lufs)) break;
		const gain = Math.min(db(t.target - lufs), db(most));
		for (const c of outChs) for (let i = 0; i < c.length; i++) c[i] *= gain;
		limit(outChs, sr, db(-1));
	}
	limit(outChs, sr, db(-1));

	const buffer = new AudioBuffer({ length: end, numberOfChannels: 2, sampleRate: sr });
	outChs.forEach((c, i) => buffer.copyToChannel(c, i));
	return { buffer, rate };
}

type Chain = (ctx: OfflineAudioContext, input: AudioNode) => AudioNode;

const CHAINS: Record<PresetId, Chain> = {
	original: (_ctx, input) => input,

	// High-pass, de-mud, presence, air, then a compressor with makeup gain into a soft limiter.
	// The small room comes from the Room slider, which this preset starts at 10.
	studio: (ctx, input) =>
		series(
			input,
			bq(ctx, "highpass", 80, 0.707),
			bq(ctx, "highpass", 80, 0.707),
			bq(ctx, "peaking", 300, 1.1, -3),
			bq(ctx, "peaking", 4200, 0.8, 3),
			bq(ctx, "highshelf", 10000, 0.707, 3),
			comp(ctx, -24, 3, 0.005, 0.15, 8),
			amp(ctx, db(5)),
			shaper(ctx, softClip(0.8), "4x"),
		),

	// Telephone-ish band with a mid bump, driven into saturation and squashed.
	radio: (ctx, input) =>
		series(
			input,
			bq(ctx, "highpass", 300, 0.707),
			bq(ctx, "highpass", 300, 0.707),
			bq(ctx, "lowpass", 3400, 0.707),
			bq(ctx, "lowpass", 3400, 0.707),
			bq(ctx, "peaking", 1800, 1, 4),
			amp(ctx, db(6)),
			shaper(ctx, tanhCurve(2.5), "2x"),
			comp(ctx, -30, 8, 0.003, 0.1, 3),
			amp(ctx, db(4)),
		),

	// A narrower, steeper band and harder clipping.
	phone: (ctx, input) =>
		series(
			input,
			bq(ctx, "highpass", 500, 0.707),
			bq(ctx, "highpass", 500, 0.707),
			bq(ctx, "highpass", 500, 0.707),
			bq(ctx, "lowpass", 2800, 0.707),
			bq(ctx, "lowpass", 2800, 0.707),
			bq(ctx, "lowpass", 2800, 0.707),
			bq(ctx, "peaking", 1300, 1.2, 5),
			amp(ctx, db(10)),
			shaper(ctx, hardClip(0.5), "2x"),
			comp(ctx, -28, 6, 0.003, 0.12, 4),
		),

	// A big hall and a slapback echo off the far stand.
	stadium: (ctx, input) => {
		const voice = series(input, bq(ctx, "highpass", 120, 0.707), bq(ctx, "peaking", 2500, 1, 2), comp(ctx, -22, 3, 0.01, 0.2, 6));
		const mix = ctx.createGain();
		voice.connect(amp(ctx, 0.7)).connect(mix);

		const slap = ctx.createDelay(1);
		slap.delayTime.value = 0.11;
		const feedback = amp(ctx, 0.3);
		const tone = bq(ctx, "lowpass", 2500, 0.707);
		voice.connect(slap);
		slap.connect(tone).connect(feedback).connect(slap);
		tone.connect(amp(ctx, 0.35)).connect(mix);

		series(voice, reverb(ctx, HALL_SECONDS, 3, 0.035, 5000, 7), bq(ctx, "lowpass", 6000, 0.707), amp(ctx, 0.6), mix);
		return mix;
	},

	// The pitch comes from the source's playback rate. These only tidy up the result.
	chipmunk: (ctx, input) => series(input, bq(ctx, "highpass", 150, 0.707), comp(ctx, -24, 3, 0.005, 0.12, 6)),
	deep: (ctx, input) => series(input, bq(ctx, "lowpass", 7000, 0.707), bq(ctx, "highpass", 50, 0.707), comp(ctx, -24, 3, 0.008, 0.15, 6)),
};

const HALL_SECONDS = 3.6;
const ROOM_SECONDS = 0.6;

function series(first: AudioNode, ...rest: AudioNode[]): AudioNode {
	let node = first;
	for (const next of rest) node = node.connect(next);
	return node;
}

function bq(ctx: BaseAudioContext, type: BiquadFilterType, frequency: number, q: number, gain = 0) {
	const f = ctx.createBiquadFilter();
	f.type = type;
	f.frequency.value = frequency;
	f.Q.value = q;
	f.gain.value = gain;
	return f;
}

function amp(ctx: BaseAudioContext, gain: number) {
	const g = ctx.createGain();
	g.gain.value = gain;
	return g;
}

function comp(ctx: BaseAudioContext, threshold: number, ratio: number, attack: number, release: number, knee: number) {
	const c = ctx.createDynamicsCompressor();
	c.threshold.value = threshold;
	c.ratio.value = ratio;
	c.attack.value = attack;
	c.release.value = release;
	c.knee.value = knee;
	return c;
}

function shaper(ctx: BaseAudioContext, curve: Float32Array<ArrayBuffer>, oversample: OverSampleType) {
	const s = ctx.createWaveShaper();
	s.curve = curve;
	s.oversample = oversample;
	return s;
}

function curveOf(fn: (x: number) => number) {
	const size = 4096;
	const c = new Float32Array(size);
	for (let i = 0; i < size; i++) c[i] = fn((i / (size - 1)) * 2 - 1);
	return c;
}

/** Straight up to `knee`, then bends smoothly towards full scale. */
const softClip = (knee: number) =>
	curveOf((x) => {
		const a = Math.abs(x);
		if (a <= knee) return x;
		return Math.sign(x) * (knee + (1 - knee) * Math.tanh((a - knee) / (1 - knee)));
	});
const tanhCurve = (drive: number) => curveOf((x) => Math.tanh(drive * x) / Math.tanh(drive));
const hardClip = (ceiling: number) => curveOf((x) => Math.max(-ceiling, Math.min(ceiling, x)) / ceiling);

/** A convolution reverb with an impulse made in code: decaying, darkening noise. */
function reverb(ctx: BaseAudioContext, seconds: number, rt60: number, predelay: number, damp: number, seed: number) {
	const sr = ctx.sampleRate;
	const n = Math.ceil(seconds * sr);
	const ir = ctx.createBuffer(2, n, sr);
	const rand = mulberry32(seed);
	const start = Math.round(predelay * sr);
	const fadeIn = Math.round(0.004 * sr);
	for (let ch = 0; ch < 2; ch++) {
		const d = new Float32Array(n);
		let lp = 0;
		let energy = 0;
		for (let i = start; i < n; i++) {
			const t = (i - start) / sr;
			// The cutoff falls as the tail goes on, like air soaking up the highs.
			const fc = damp * (1 - 0.75 * Math.min(1, t / rt60));
			const k = 1 - Math.exp((-2 * Math.PI * fc) / sr);
			lp += k * (rand() * 2 - 1 - lp);
			const env = 10 ** ((-3 * t) / rt60) * Math.min(1, (i - start) / fadeIn);
			d[i] = lp * env;
			energy += d[i] * d[i];
		}
		// Unit energy, so the wet level sits close to the dry level and the mix control means something.
		const norm = energy > 0 ? 1 / Math.sqrt(energy) : 0;
		for (let i = 0; i < n; i++) d[i] *= norm;
		ir.copyToChannel(d, ch);
	}
	const conv = ctx.createConvolver();
	conv.normalize = false;
	conv.buffer = ir;
	return conv;
}

function mulberry32(seed: number) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Cuts the reverb tail once it's 60 dB down, with a short fade. Never cuts into the voice. */
function trimTail(c: Float32Array, content: number, sr: number) {
	let peak = 0;
	for (let i = 0; i < c.length; i++) peak = Math.max(peak, Math.abs(c[i]));
	const floor = peak * db(-60);
	let last = c.length - 1;
	while (last > content && Math.abs(c[last]) < floor) last--;
	const end = Math.min(c.length, Math.max(content, last + Math.round(0.05 * sr)));
	const out = new Float32Array(end);
	out.set(c.subarray(0, end));
	if (end > content) {
		const fade = Math.min(Math.round(0.05 * sr), end - content);
		for (let i = 0; i < fade; i++) out[end - 1 - i] *= i / fade;
	}
	return out;
}

function padTo(c: Float32Array<ArrayBuffer>, n: number) {
	const out = new Float32Array(n);
	out.set(c);
	return out;
}

// ── Before the graph: mono, noise reduction, expander ────────────────────────

// Noise reduction is the slow part, so the last few results are kept per take.
const prepared = new WeakMap<AudioBuffer, Map<string, Float32Array<ArrayBuffer>>>();

function prepare(input: AudioBuffer, clean: number, gate: boolean) {
	const key = `${clean}|${gate}`;
	let cache = prepared.get(input);
	if (!cache) prepared.set(input, (cache = new Map()));
	const hit = cache.get(key);
	if (hit) return hit;
	let x = toMono(input);
	if (clean > 0) x = denoise(x, input.sampleRate, clean);
	if (gate) x = expand(x, input.sampleRate);
	if (cache.size > 6) cache.delete(cache.keys().next().value!);
	cache.set(key, x);
	return x;
}

function toMono(b: AudioBuffer) {
	const out = new Float32Array(b.length);
	for (let ch = 0; ch < b.numberOfChannels; ch++) {
		const d = b.getChannelData(ch);
		for (let i = 0; i < d.length; i++) out[i] += d[i] / b.numberOfChannels;
	}
	return out;
}

/**
 * Spectral noise reduction. Learns the noise from the quietest frames, then turns each frequency
 * down by how much of it is noise. `amount` sets how hard it subtracts and how low it can go.
 */
function denoise(x: Float32Array<ArrayBuffer>, sr: number, amount: number) {
	const N = sr > 32000 ? 1024 : 512;
	const hop = N / 4;
	const bins = N / 2 + 1;
	const frames = Math.ceil((x.length + N) / hop);
	const win = new Float32Array(N);
	for (let i = 0; i < N; i++) win[i] = Math.sqrt(0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
	const fft = makeFft(N);
	const re = new Float32Array(N);
	const im = new Float32Array(N);
	const specRe = new Float32Array(frames * bins);
	const specIm = new Float32Array(frames * bins);
	const energy = new Float32Array(frames);
	const inside: number[] = [];

	for (let f = 0; f < frames; f++) {
		const start = f * hop - N;
		for (let i = 0; i < N; i++) {
			const j = start + i;
			re[i] = j >= 0 && j < x.length ? x[j] * win[i] : 0;
			im[i] = 0;
		}
		fft(re, im, false);
		let e = 0;
		for (let k = 0; k < bins; k++) {
			specRe[f * bins + k] = re[k];
			specIm[f * bins + k] = im[k];
			e += re[k] * re[k] + im[k] * im[k];
		}
		energy[f] = e;
		if (start >= 0 && start + N <= x.length && e > 0) inside.push(f);
	}

	// The noise print: the average spectrum of the quietest fifth of the take.
	const noise = new Float32Array(bins);
	const quiet = inside.sort((a, b) => energy[a] - energy[b]).slice(0, Math.max(1, Math.floor(inside.length * 0.2)));
	if (!inside.length) return x;
	for (const f of quiet) for (let k = 0; k < bins; k++) noise[k] += (specRe[f * bins + k] ** 2 + specIm[f * bins + k] ** 2) / quiet.length;

	const over = 1 + 3 * amount;
	const floor = db(-(6 + 18 * amount));
	const raw = new Float32Array(bins);
	const prev = new Float32Array(bins).fill(1);
	const out = new Float32Array(x.length + 2 * N);
	const norm = new Float32Array(x.length + 2 * N);

	for (let f = 0; f < frames; f++) {
		for (let k = 0; k < bins; k++) {
			const p = specRe[f * bins + k] ** 2 + specIm[f * bins + k] ** 2;
			raw[k] = p > 0 ? Math.max(floor, Math.sqrt(Math.max(0, 1 - (over * noise[k]) / p))) : floor;
		}
		for (let k = 0; k < bins; k++) {
			// Smoothed across neighbouring bins, then opened quickly and closed slowly, to keep the
			// warbly "musical noise" down.
			const g = (raw[Math.max(0, k - 1)] + 2 * raw[k] + raw[Math.min(bins - 1, k + 1)]) / 4;
			const s = g > prev[k] ? g : prev[k] * 0.65 + g * 0.35;
			prev[k] = s;
			re[k] = specRe[f * bins + k] * s;
			im[k] = specIm[f * bins + k] * s;
		}
		for (let k = 1; k < N / 2; k++) {
			re[N - k] = re[k];
			im[N - k] = -im[k];
		}
		fft(re, im, true);
		const at = f * hop;
		for (let i = 0; i < N; i++) {
			out[at + i] += re[i] * win[i];
			norm[at + i] += win[i] * win[i];
		}
	}
	const y = new Float32Array(x.length);
	for (let i = 0; i < x.length; i++) {
		const n = norm[i + N];
		y[i] = n > 1e-6 ? out[i + N] / n : 0;
	}
	return y;
}

/** In-place radix-2 FFT. The inverse is scaled by 1/N. */
function makeFft(n: number) {
	const levels = Math.log2(n);
	const cos = new Float32Array(n / 2);
	const sin = new Float32Array(n / 2);
	for (let i = 0; i < n / 2; i++) {
		cos[i] = Math.cos((2 * Math.PI * i) / n);
		sin[i] = Math.sin((2 * Math.PI * i) / n);
	}
	const rev = new Uint32Array(n);
	for (let i = 0; i < n; i++) {
		let r = 0;
		for (let b = 0; b < levels; b++) r |= ((i >> b) & 1) << (levels - 1 - b);
		rev[i] = r;
	}
	return (re: Float32Array, im: Float32Array, inverse: boolean) => {
		for (let i = 0; i < n; i++) {
			const j = rev[i];
			if (j > i) {
				[re[i], re[j]] = [re[j], re[i]];
				[im[i], im[j]] = [im[j], im[i]];
			}
		}
		const sign = inverse ? 1 : -1;
		for (let size = 2; size <= n; size *= 2) {
			const half = size / 2;
			const step = n / size;
			for (let i = 0; i < n; i += size) {
				for (let j = 0; j < half; j++) {
					const wr = cos[j * step];
					const wi = sign * sin[j * step];
					const a = i + j;
					const b = a + half;
					const tr = re[b] * wr - im[b] * wi;
					const ti = re[b] * wi + im[b] * wr;
					re[b] = re[a] - tr;
					im[b] = im[a] - ti;
					re[a] += tr;
					im[a] += ti;
				}
			}
		}
		if (!inverse) return;
		for (let i = 0; i < n; i++) {
			re[i] /= n;
			im[i] /= n;
		}
	};
}

/** A gentle downward expander: pauses get quieter, words are left alone. */
function expand(x: Float32Array<ArrayBuffer>, sr: number) {
	const frame = Math.round(0.02 * sr);
	const levels: number[] = [];
	for (let s = 0; s + frame <= x.length; s += frame) {
		let sum = 0;
		for (let i = s; i < s + frame; i++) sum += x[i] * x[i];
		if (sum > 0) levels.push(Math.sqrt(sum / frame));
	}
	if (levels.length < 5) return x;
	levels.sort((a, b) => a - b);
	const noise = levels[Math.floor(levels.length * 0.1)];
	const speech = levels[Math.floor(levels.length * 0.9)];
	const threshold = Math.min(Math.max(noise * 3, db(-70)), speech * 0.25);

	const att = Math.exp(-1 / (0.002 * sr));
	const rel = Math.exp(-1 / (0.1 * sr));
	const open = Math.exp(-1 / (0.002 * sr));
	const close = Math.exp(-1 / (0.06 * sr));
	const minGain = db(-18);
	const y = new Float32Array(x.length);
	let env = 0;
	let g = 1;
	for (let i = 0; i < x.length; i++) {
		const a = Math.abs(x[i]);
		env = a > env ? att * env + (1 - att) * a : rel * env + (1 - rel) * a;
		const want = env >= threshold ? 1 : Math.max(minGain, env / threshold);
		const k = want > g ? open : close;
		g = k * g + (1 - k) * want;
		y[i] = x[i] * g;
	}
	return y;
}

// ── After the graph: loudness and a limiter ──────────────────────────────────

/**
 * Integrated loudness, close to BS.1770: K-weighted, 400 ms blocks, absolute and relative gates.
 * Channels are averaged rather than summed, so a mono take and its stereo render read the same.
 */
export function loudness(chs: Float32Array[], sr: number) {
	const weighted = chs.map((c) => biquadRun(biquadRun(c, rbj("highshelf", 1500, 0.707, 4, sr)), rbj("highpass", 38, 0.5, 0, sr)));
	const block = Math.round(0.4 * sr);
	const step = Math.round(0.1 * sr);
	const powers: number[] = [];
	for (let s = 0; s + block <= weighted[0].length; s += step) {
		let sum = 0;
		for (const c of weighted) for (let i = s; i < s + block; i++) sum += c[i] * c[i];
		powers.push(sum / block / weighted.length);
	}
	// Shorter than one block: measure all of it.
	if (!powers.length) {
		let sum = 0;
		for (const c of weighted) for (let i = 0; i < c.length; i++) sum += c[i] * c[i];
		if (weighted[0].length) powers.push(sum / weighted[0].length / weighted.length);
	}
	const lufs = (p: number) => -0.691 + 10 * Math.log10(p);
	const loud = powers.filter((p) => p > 0 && lufs(p) > -70);
	if (!loud.length) return -Infinity;
	const relative = lufs(loud.reduce((a, b) => a + b, 0) / loud.length) - 10;
	const gated = loud.filter((p) => lufs(p) > relative);
	return lufs(gated.reduce((a, b) => a + b, 0) / gated.length);
}

export function peakOf(chs: Float32Array[]) {
	let peak = 0;
	for (const c of chs) for (let i = 0; i < c.length; i++) peak = Math.max(peak, Math.abs(c[i]));
	return peak;
}

export const channels = (b: AudioBuffer) => Array.from({ length: b.numberOfChannels }, (_, i) => b.getChannelData(i));

type Coeffs = [number, number, number, number, number];

/** Audio EQ cookbook coefficients, normalised: b0 b1 b2 a1 a2. */
function rbj(type: "highshelf" | "highpass", f: number, q: number, gainDb: number, sr: number): Coeffs {
	const w = (2 * Math.PI * f) / sr;
	const cw = Math.cos(w);
	const alpha = Math.sin(w) / (2 * q);
	if (type === "highpass") {
		const a0 = 1 + alpha;
		return [(1 + cw) / 2 / a0, -(1 + cw) / a0, (1 + cw) / 2 / a0, (-2 * cw) / a0, (1 - alpha) / a0];
	}
	const A = 10 ** (gainDb / 40);
	const s = 2 * Math.sqrt(A) * alpha;
	const a0 = A + 1 - (A - 1) * cw + s;
	return [
		(A * (A + 1 + (A - 1) * cw + s)) / a0,
		(-2 * A * (A - 1 + (A + 1) * cw)) / a0,
		(A * (A + 1 + (A - 1) * cw - s)) / a0,
		(2 * (A - 1 - (A + 1) * cw)) / a0,
		(A + 1 - (A - 1) * cw - s) / a0,
	];
}

function biquadRun(x: Float32Array, [b0, b1, b2, a1, a2]: Coeffs) {
	const y = new Float32Array(x.length);
	let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
	for (let i = 0; i < x.length; i++) {
		const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
		x2 = x1;
		x1 = x[i];
		y2 = y1;
		y1 = v;
		y[i] = v;
	}
	return y;
}

/**
 * A look-ahead peak limiter, linked across channels. Gain starts falling 5 ms before a peak and
 * recovers over about 80 ms, so nothing passes `ceiling` and nothing clicks.
 */
function limit(chs: Float32Array[], sr: number, ceiling: number) {
	const n = chs[0].length;
	if (peakOf(chs) <= ceiling) return;
	const look = Math.max(1, Math.round(0.005 * sr));
	const need = new Float32Array(n);
	for (let i = 0; i < n; i++) {
		let p = 0;
		for (const c of chs) p = Math.max(p, Math.abs(c[i]));
		need[i] = p > ceiling ? ceiling / p : 1;
	}
	// The lowest gain needed anywhere in the next `look` samples (a monotonic queue, right to left).
	const ahead = new Float32Array(n);
	const queue = new Int32Array(n);
	let head = 0;
	let tail = 0;
	for (let i = n - 1; i >= 0; i--) {
		while (tail > head && need[queue[tail - 1]] >= need[i]) tail--;
		queue[tail++] = i;
		while (queue[head] >= i + look) head++;
		ahead[i] = need[queue[head]];
	}
	// Averaging those minima over the same window gives a smooth ramp that still never overshoots.
	// Before the start, the window holds the first value.
	const release = 1 - Math.exp(-1 / (0.08 * sr));
	let sum = look * ahead[0];
	let g = 1;
	for (let i = 0; i < n; i++) {
		if (i > 0) sum += ahead[i] - ahead[Math.max(0, i - look)];
		const target = Math.min(1, sum / look);
		g = target < g ? target : g + (target - g) * release;
		for (const c of chs) c[i] = Math.max(-ceiling, Math.min(ceiling, c[i] * g));
	}
}

// ── Output ───────────────────────────────────────────────────────────────────

/** 16-bit PCM WAV, header written by hand, with a little TPDF dither. */
export function encodeWav(buffer: AudioBuffer): Blob {
	const chs = channels(buffer);
	const n = buffer.length;
	const count = chs.length;
	const dataBytes = n * count * 2;
	const view = new DataView(new ArrayBuffer(44 + dataBytes));
	const text = (at: number, s: string) => {
		for (let i = 0; i < s.length; i++) view.setUint8(at + i, s.charCodeAt(i));
	};
	text(0, "RIFF");
	view.setUint32(4, 36 + dataBytes, true);
	text(8, "WAVE");
	text(12, "fmt ");
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true);
	view.setUint16(22, count, true);
	view.setUint32(24, buffer.sampleRate, true);
	view.setUint32(28, buffer.sampleRate * count * 2, true);
	view.setUint16(32, count * 2, true);
	view.setUint16(34, 16, true);
	text(36, "data");
	view.setUint32(40, dataBytes, true);
	const rand = mulberry32(1);
	let at = 44;
	for (let i = 0; i < n; i++) {
		for (let ch = 0; ch < count; ch++) {
			const dither = (rand() - rand()) / 32768;
			const s = Math.max(-1, Math.min(1, chs[ch][i] + dither));
			view.setInt16(at, Math.round(s < 0 ? s * 32768 : s * 32767), true);
			at += 2;
		}
	}
	return new Blob([view.buffer], { type: "audio/wav" });
}

/** The first `seconds` of a buffer. */
export function clip(b: AudioBuffer, seconds: number) {
	const n = Math.min(b.length, Math.round(seconds * b.sampleRate));
	if (n === b.length) return b;
	const out = new AudioBuffer({ length: n, numberOfChannels: b.numberOfChannels, sampleRate: b.sampleRate });
	for (let ch = 0; ch < b.numberOfChannels; ch++) out.copyToChannel(b.getChannelData(ch).subarray(0, n), ch);
	return out;
}
