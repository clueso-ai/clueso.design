"use client";

// The footer logo's sound, made with Web Audio, no files. The logo's seven parts are the seven
// notes of C major, left to right: the mark is C, then D, E, F, G, A and B for C, l, u, e, s, o.
// Points high on a letter play an octave up, points low an octave down.
// The tone is a soft electric piano: a sine whose FM bite fades as it rings, a faint bell partial on
// top, panned left to right across the logo and played into a small room.
// The beat box (lib/beat-box.ts) plays its drums through the same output.
// Browsers only allow sound after a press or a key, so nothing plays before one.

/** The logo's parts, low to high, and their notes in the middle octave (C4 to B4). */
const PARTS = ["mark", "C", "l", "u", "e", "s", "o"];
const MIDDLE = [261.63, 293.66, 329.63, 349.23, 392, 440, 493.88];
/** A stretch this far, in logo units, plays at full loudness. */
const FULL = 80;
/** How long the room rings, in seconds, and how much of it you hear. */
const ROOM = 2.4;
const WET = 0.28;

let ctx: AudioContext | null = null;
let dry: AudioNode | null = null;
let room: AudioNode | null = null;

/** A soft room: stereo noise fading out, darker as it goes. */
function roomResponse(ac: AudioContext) {
	const length = Math.floor(ac.sampleRate * ROOM);
	const ir = ac.createBuffer(2, length, ac.sampleRate);
	for (let c = 0; c < 2; c++) {
		const data = ir.getChannelData(c);
		let smooth = 0;
		for (let i = 0; i < length; i++) {
			const t = i / length;
			// Smoothing that grows over time takes the hiss out of the tail.
			const k = 0.2 + 0.75 * t;
			smooth = smooth * k + (Math.random() * 2 - 1) * (1 - k);
			data[i] = smooth * (1 - t) ** 2.5 * 2;
		}
	}
	return ir;
}

/** Starts audio. Call it from a press or a key. */
export function unlockSound() {
	if (!ctx) {
		try {
			ctx = new AudioContext();
		} catch {
			return;
		}
		// A gentle compressor, so a chord of every letter over a beat stays smooth.
		const squeeze = ctx.createDynamicsCompressor();
		squeeze.threshold.value = -18;
		squeeze.ratio.value = 3;
		const master = ctx.createGain();
		master.gain.value = 0.6;
		master.connect(squeeze).connect(ctx.destination);
		const reverb = ctx.createConvolver();
		reverb.buffer = roomResponse(ctx);
		const send = ctx.createGain();
		send.gain.value = WET;
		send.connect(reverb).connect(master);
		dry = master;
		room = send;
	}
	if (ctx.state === "suspended") void ctx.resume();
}

/** The output, once sound has started: straight to the speakers (`dry`) or into the room. */
export function output() {
	return ctx && dry && room && ctx.state !== "closed" ? { ac: ctx, dry, room } : null;
}

const degree = (id: string) => Math.max(0, PARTS.indexOf(id));
const freq = (id: string, octave: number) => MIDDLE[degree(id)] * 2 ** octave;
/** Where a part sits, left to right, as a stereo pan. */
const panFor = (id: string) => (degree(id) / (PARTS.length - 1)) * 1.1 - 0.55;

/** One electric piano note. */
function voice(f: number, level: number, panAt: number) {
	const out = output();
	if (!out || out.ac.state !== "running") return;
	const { ac } = out;
	const now = ac.currentTime;
	// Low notes ring longer, as on a real instrument.
	const ring = 1.1 * (220 / f) ** 0.35;

	const pan = ac.createStereoPanner();
	pan.pan.value = panAt;
	pan.connect(out.dry);
	pan.connect(out.room);

	const amp = ac.createGain();
	amp.gain.setValueAtTime(0, now);
	amp.gain.linearRampToValueAtTime(level, now + 0.006);
	amp.gain.setTargetAtTime(0, now + 0.006, ring / 3);
	amp.connect(pan);

	// The body: a sine with a little FM, bright at the strike and mellowing as it rings.
	const tone = ac.createOscillator();
	tone.frequency.value = f;
	const mod = ac.createOscillator();
	mod.frequency.value = f;
	const depth = ac.createGain();
	depth.gain.setValueAtTime(f * (0.6 + 1.2 * (level / 0.25)), now);
	depth.gain.setTargetAtTime(f * 0.08, now, 0.12);
	mod.connect(depth).connect(tone.frequency);
	tone.connect(amp);

	// The tine: a faint partial well above, gone in a moment.
	const tine = ac.createOscillator();
	tine.frequency.value = f * 4.2;
	const tineAmp = ac.createGain();
	tineAmp.gain.setValueAtTime(level * 0.12, now);
	tineAmp.gain.setTargetAtTime(0, now, 0.06);
	tine.connect(tineAmp).connect(pan);

	const end = now + ring * 2.5;
	for (const o of [tone, mod, tine]) {
		o.start(now);
		o.stop(end);
	}
}

/** Plays a letter let go after a stretch of `stretch` logo units: quietly for a small stretch. */
export function pluck(id: string, stretch: number, octave = 0) {
	if (stretch < 2) return;
	voice(freq(id, octave), 0.05 + 0.2 * Math.min(1, stretch / FULL) ** 0.7, panFor(id));
}

/** A quiet tap for grabbing a letter's handle: its note, very short and soft. */
export function tick(id: string) {
	const out = output();
	if (!out || out.ac.state !== "running") return;
	const { ac } = out;
	const now = ac.currentTime;
	const o = ac.createOscillator();
	o.frequency.value = freq(id, 1);
	const amp = ac.createGain();
	amp.gain.setValueAtTime(0, now);
	amp.gain.linearRampToValueAtTime(0.025, now + 0.004);
	amp.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
	const pan = ac.createStereoPanner();
	pan.pan.value = panFor(id);
	o.connect(amp).connect(pan).connect(out.dry);
	o.start(now);
	o.stop(now + 0.1);
}
