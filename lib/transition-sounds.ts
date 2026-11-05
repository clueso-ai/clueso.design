// Transition sounds: one short sound for each transition in the Transition lab, made with Web Audio.
// No audio files, so nothing to license. Each sound is noise, sines and filters on soft envelopes,
// with a little stereo width. A call schedules one sound at a time you give, stretched to suit the
// transition's length, into any node. So the same code plays live, records into an export stream and
// renders in an OfflineAudioContext. Random parts use a fixed seed, so a sound is the same every time.

export type TransitionSound = "bars" | "blocks" | "glyphs" | "zoom" | "iris";

/** The lab's default transition length. Sounds are tuned at this length and stretch from it. */
const BASE = 0.9;

/** Each sound's length at the default transition, in seconds. */
const LENGTH: Record<TransitionSound, number> = { bars: 0.35, blocks: 0.3, glyphs: 0.4, zoom: 0.45, iris: 0.5 };

/** Silence below this. Exponential ramps cannot reach zero, so they end here and then step down. */
const FLOOR = 0.0001;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** A small seeded random, so every render of a sound is the same. */
function seeded(seed: number) {
	let s = seed >>> 0;
	return () => {
		s = (s + 0x6d2b79f5) >>> 0;
		let t = s;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();

/** Two seconds of white noise, made once per context. */
function noiseBuffer(ctx: BaseAudioContext) {
	let buffer = noiseBuffers.get(ctx);
	if (!buffer) {
		buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
		const data = buffer.getChannelData(0);
		const rand = seeded(7);
		for (let i = 0; i < data.length; i++) data[i] = rand() * 2 - 1;
		noiseBuffers.set(ctx, buffer);
	}
	return buffer;
}

/** What one sound is built with: the context, its output and every source it starts. */
type Voice = { ctx: BaseAudioContext; out: GainNode; sources: AudioScheduledSourceNode[] };

/** Rises from silence to peak in `attack`, then falls back to silence by `end`. No clicks either way. */
function envelope(param: AudioParam, start: number, attack: number, peak: number, end: number) {
	param.setValueAtTime(0, start);
	param.linearRampToValueAtTime(peak, start + attack);
	param.exponentialRampToValueAtTime(FLOOR, Math.max(start + attack + 0.005, end));
	param.linearRampToValueAtTime(0, Math.max(start + attack + 0.01, end + 0.01));
}

function noise(v: Voice, start: number, stop: number, offset: number) {
	const src = v.ctx.createBufferSource();
	src.buffer = noiseBuffer(v.ctx);
	src.loop = true;
	src.start(start, offset % 2);
	src.stop(stop);
	v.sources.push(src);
	return src;
}

function tone(v: Voice, type: OscillatorType, frequency: number, start: number, stop: number) {
	const osc = v.ctx.createOscillator();
	osc.type = type;
	osc.frequency.setValueAtTime(frequency, start);
	osc.start(start);
	osc.stop(stop);
	v.sources.push(osc);
	return osc;
}

function panner(v: Voice, pan: number) {
	const node = v.ctx.createStereoPanner();
	node.pan.value = clamp(pan, -1, 1);
	node.connect(v.out);
	return node;
}

/** Chains nodes left to right and returns the first. */
function chain(...nodes: AudioNode[]) {
	for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
	return nodes[0];
}

// ── The sounds ──

/** An airy swish: band-passed noise whose filter sweeps up, slightly different in each ear. */
function bars(v: Voice, t: number, len: number) {
	for (const [side, offset, detune] of [[-0.55, 0, 1], [0.55, 0.73, 1.12]] as const) {
		const src = noise(v, t, t + len + 0.05, offset);
		const band = v.ctx.createBiquadFilter();
		band.type = "bandpass";
		band.Q.value = 1.4;
		band.frequency.setValueAtTime(380 * detune, t);
		band.frequency.exponentialRampToValueAtTime(4200 * detune, t + len);
		const gain = v.ctx.createGain();
		envelope(gain.gain, t, len * 0.62, 0.75, t + len);
		const pan = panner(v, side);
		// The swish drifts across, from one side towards the middle.
		pan.pan.setValueAtTime(side, t);
		pan.pan.linearRampToValueAtTime(side * 0.3, t + len);
		chain(src, band, gain, pan);
	}
}

/** A soft cascade of ticks, like small wooden blocks with a glassy ring, climbing a scale. */
function blocks(v: Voice, t: number, len: number) {
	const steps = [0, 2, 4, 7, 9, 12];
	const gap = (len * 0.8) / (steps.length - 1);
	steps.forEach((step, i) => {
		const at = t + i * gap;
		const f = 880 * 2 ** (step / 12);
		// Louder in the middle of the run, so it swells and settles.
		const level = 0.32 * (0.6 + 0.4 * Math.sin((Math.PI * (i + 0.5)) / steps.length));
		const pan = panner(v, i % 2 === 0 ? -0.35 : 0.35);
		// The body: a sine that dies fast. The ring: a quieter partial a little over two octaves up.
		for (const [ratio, amount, decay] of [[1, 1, 0.07], [3.93, 0.22, 0.035]] as const) {
			const osc = tone(v, "sine", f * ratio, at, at + decay + 0.05);
			const gain = v.ctx.createGain();
			envelope(gain.gain, at, 0.003, level * amount, at + decay);
			chain(osc, gain, pan);
		}
	});
}

/** A digital shimmer: quick high blips with a touch of FM, scattered across the stereo field. */
function glyphs(v: Voice, t: number, len: number) {
	const rand = seeded(42);
	const notes = [2093, 2349.3, 2637, 3136, 3520, 4186];
	const bed = v.ctx.createGain();
	// A faint bed of high air under the blips.
	const air = noise(v, t, t + len + 0.05, 0.31);
	const high = v.ctx.createBiquadFilter();
	high.type = "highpass";
	high.frequency.value = 6500;
	envelope(bed.gain, t, len * 0.4, 0.05, t + len);
	chain(air, high, bed, panner(v, 0));
	const count = 13;
	for (let i = 0; i < count; i++) {
		const at = t + (i / count) * len * 0.85 + rand() * 0.015;
		const f = notes[Math.floor(rand() * notes.length)];
		const length = 0.03 + rand() * 0.04;
		const carrier = tone(v, "sine", f, at, at + length + 0.03);
		const mod = tone(v, "sine", f * (rand() < 0.5 ? 2 : 3.5), at, at + length + 0.03);
		const depth = v.ctx.createGain();
		depth.gain.setValueAtTime(f * 0.6, at);
		depth.gain.exponentialRampToValueAtTime(f * 0.02, at + length);
		chain(mod, depth);
		depth.connect(carrier.frequency);
		const gain = v.ctx.createGain();
		// Busiest in the middle, quieter at the ends.
		const level = 0.22 * (0.5 + 0.5 * Math.sin((Math.PI * (i + 0.5)) / count));
		envelope(gain.gain, at, 0.004, level, at + length);
		chain(carrier, gain, panner(v, (rand() * 2 - 1) * 0.7));
	}
}

/** A whoosh that rushes in, then lands as a soft, low thump. */
function zoom(v: Voice, t: number, len: number) {
	const land = t + len * 0.72;
	for (const [side, offset] of [[-0.4, 0.2], [0.4, 1.1]] as const) {
		const src = noise(v, t, land + 0.06, offset);
		const low = v.ctx.createBiquadFilter();
		low.type = "lowpass";
		low.Q.value = 2.2;
		low.frequency.setValueAtTime(300, t);
		low.frequency.exponentialRampToValueAtTime(5200, land);
		const gain = v.ctx.createGain();
		gain.gain.setValueAtTime(0, t);
		gain.gain.linearRampToValueAtTime(0.06, t + len * 0.3);
		gain.gain.exponentialRampToValueAtTime(0.42, land - 0.01);
		gain.gain.linearRampToValueAtTime(0, land + 0.04);
		chain(src, low, gain, panner(v, side));
	}
	// The thump: a sine that drops in pitch, with a little more weight from a triangle an octave up.
	const tail = clamp(len * 0.6, 0.22, 0.6);
	const center = panner(v, 0);
	for (const [type, from, to, amount] of [["sine", 130, 46, 0.45], ["triangle", 260, 92, 0.08]] as const) {
		const osc = tone(v, type, from, land, land + tail + 0.05);
		osc.frequency.exponentialRampToValueAtTime(to, land + 0.16);
		const gain = v.ctx.createGain();
		envelope(gain.gain, land, 0.006, amount, land + tail);
		chain(osc, gain, center);
	}
}

/** A smooth swell: a soft open chord that glides up, opens and shimmers, then fades. */
function iris(v: Voice, t: number, len: number) {
	const end = t + len;
	const filter = v.ctx.createBiquadFilter();
	filter.type = "lowpass";
	filter.Q.value = 0.7;
	filter.frequency.setValueAtTime(700, t);
	filter.frequency.exponentialRampToValueAtTime(5000, t + len * 0.75);
	const swell = v.ctx.createGain();
	swell.gain.setValueAtTime(0, t);
	swell.gain.linearRampToValueAtTime(1, t + len * 0.7);
	swell.gain.linearRampToValueAtTime(0, end);
	// A gentle tremolo gives the shimmer.
	const shimmer = v.ctx.createGain();
	shimmer.gain.value = 0.85;
	const lfo = tone(v, "sine", 11, t, end + 0.05);
	const lfoDepth = v.ctx.createGain();
	lfoDepth.gain.value = 0.15;
	chain(lfo, lfoDepth);
	lfoDepth.connect(shimmer.gain);
	chain(filter, swell, shimmer);
	const chord = [[440, -0.5], [659.26, 0.5], [880, 0], [1318.5, -0.2]] as const;
	chord.forEach(([f, side], i) => {
		const osc = tone(v, i < 2 ? "triangle" : "sine", f * 0.75, t, end + 0.05);
		// Glide up a fourth, slightly detuned per voice for width.
		osc.detune.value = (i - 1.5) * 4;
		osc.frequency.exponentialRampToValueAtTime(f, t + len * 0.8);
		const gain = v.ctx.createGain();
		gain.gain.value = i < 2 ? 0.14 : 0.07;
		const pan = v.ctx.createStereoPanner();
		pan.pan.value = side;
		chain(osc, gain, pan, filter);
	});
	shimmer.connect(v.out);
}

const SOUNDS: Record<TransitionSound, (v: Voice, t: number, len: number) => void> = { bars, blocks, glyphs, zoom, iris };

/**
 * Plays a transition's sound into `destination`, starting at `when` (seconds on the context's
 * clock). `duration` is the transition's length: the sound stretches with it, within limits.
 * `gain` scales the whole sound. Works with an AudioContext, an OfflineAudioContext, or an
 * AudioContext feeding a MediaStreamAudioDestinationNode for exports.
 */
export function playTransitionSound(ctx: BaseAudioContext, destination: AudioNode, kind: TransitionSound, when: number, duration: number, gain = 0.6) {
	const t = Math.max(when, ctx.currentTime);
	const len = LENGTH[kind] * clamp(duration / BASE, 0.6, 2.2);
	const out = ctx.createGain();
	out.gain.value = gain;
	out.connect(destination);
	const voice: Voice = { ctx, out, sources: [] };
	SOUNDS[kind](voice, t, len);
	// Let go of the output once every part has stopped.
	let left = voice.sources.length;
	for (const src of voice.sources) {
		src.onended = () => {
			left -= 1;
			if (left === 0) out.disconnect();
		};
	}
}
