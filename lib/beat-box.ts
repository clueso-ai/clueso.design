"use client";

// The beat box's drum machine: kick, snare and hi-hats synthesised with Web Audio, played from a
// step pattern. Steps are 16th notes, scheduled a little ahead on the audio clock so the beat stays
// tight even when the page is busy. Plays through the logo's output (lib/logo-sound.ts).
// Every beat is announced with onBeat as it sounds, so the logo can dance to it.

import { output } from "./logo-sound";

export interface Pattern {
	id: string;
	name: string;
	bpm: number;
	/** 12 for 3/4, 16 for 4/4. */
	steps: number;
	/** How late every second 16th lands, as a share of a step. */
	swing: number;
	kick: number[];
	snare: number[];
	hat: number[];
	open: number[];
}

const every = (n: number, steps = 16) => Array.from({ length: steps / n }, (_, i) => i * n);

export const PATTERNS: Pattern[] = [
	// Oom-pah-pah in 3/4, the time Happy Birthday is in.
	{ id: "waltz", name: "Waltz", bpm: 100, steps: 12, swing: 0, kick: [0], snare: [4, 8], hat: every(2, 12), open: [] },
	{ id: "lofi", name: "Lo-fi", bpm: 84, steps: 16, swing: 0.22, kick: [0, 7, 10], snare: [4, 12], hat: every(2), open: [14] },
	{ id: "house", name: "House", bpm: 120, steps: 16, swing: 0, kick: every(4), snare: [4, 12], hat: every(1), open: [2, 6, 10, 14] },
	{ id: "trap", name: "Trap", bpm: 140, steps: 16, swing: 0, kick: [0, 6, 11], snare: [8], hat: every(1), open: [] },
];

/** How far ahead steps are scheduled, in seconds, and how often the scheduler wakes, in ms. */
const AHEAD = 0.12;
const WAKE_MS = 25;

let noise: AudioBuffer | null = null;
let bus: GainNode | null = null;
let timer = 0;
let running: { pattern: Pattern; bpm: number; step: number; next: number; onStep: (step: number) => void } | null = null;

export interface Beat {
	/** Beats since the start, counting from 0. */
	count: number;
	/** The first beat of a bar. */
	downbeat: boolean;
}
let beats = 0;
const listeners = new Set<(beat: Beat | null) => void>();
/** Hears every beat as it sounds, and null when the beat stops. Returns the way to stop listening. */
export function onBeat(fn: (beat: Beat | null) => void) {
	listeners.add(fn);
	return () => {
		listeners.delete(fn);
	};
}

function drums() {
	const out = output();
	if (!out) return null;
	const { ac } = out;
	if (!noise || noise.sampleRate !== ac.sampleRate) {
		noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
		const data = noise.getChannelData(0);
		for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
	}
	if (!bus || bus.context !== ac) {
		bus = ac.createGain();
		bus.gain.value = 0.4;
		bus.connect(out.dry);
	}
	return { ...out, bus, noise };
}

type Kit = NonNullable<ReturnType<typeof drums>>;

function kick({ ac, bus }: Kit, t: number, v: number) {
	const o = ac.createOscillator();
	o.frequency.setValueAtTime(140, t);
	o.frequency.exponentialRampToValueAtTime(42, t + 0.11);
	const g = ac.createGain();
	g.gain.setValueAtTime(v, t);
	g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
	o.connect(g).connect(bus);
	o.start(t);
	o.stop(t + 0.42);
}

function hiss({ ac, bus, room, noise }: Kit, t: number, v: number, cutoff: number, length: number, wet = 0) {
	const src = ac.createBufferSource();
	src.buffer = noise;
	const f = ac.createBiquadFilter();
	f.type = "highpass";
	f.frequency.value = cutoff;
	const g = ac.createGain();
	g.gain.setValueAtTime(v, t);
	g.gain.exponentialRampToValueAtTime(0.0001, t + length);
	src.connect(f).connect(g).connect(bus);
	if (wet) {
		const send = ac.createGain();
		send.gain.value = wet;
		g.connect(send).connect(room);
	}
	src.start(t);
	src.stop(t + length + 0.02);
}

function snare(kit: Kit, t: number, v: number) {
	hiss(kit, t, v * 0.45, 1500, 0.18, 0.4);
	const { ac, bus } = kit;
	const o = ac.createOscillator();
	o.type = "triangle";
	o.frequency.setValueAtTime(200, t);
	o.frequency.exponentialRampToValueAtTime(160, t + 0.08);
	const g = ac.createGain();
	g.gain.setValueAtTime(v * 0.3, t);
	g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
	o.connect(g).connect(bus);
	o.start(t);
	o.stop(t + 0.12);
}

function play(kit: Kit, p: Pattern, step: number, t: number) {
	// The first step of each beat is accented.
	const accent = step % 4 === 0;
	if (p.kick.includes(step)) kick(kit, t, accent ? 0.95 : 0.75);
	if (p.snare.includes(step)) snare(kit, t, p.id === "waltz" ? 0.5 : 0.85);
	if (p.open.includes(step)) hiss(kit, t, 0.12, 7000, 0.24);
	else if (p.hat.includes(step)) hiss(kit, t, accent ? 0.11 : step % 2 ? 0.05 : 0.08, 8000, 0.045);
}

function schedule() {
	const kit = drums();
	const r = running;
	if (!kit || !r) return;
	while (r.next < kit.ac.currentTime + AHEAD) {
		const length = 60 / r.bpm / 4;
		const at = r.next + (r.step % 2 ? r.pattern.swing * length : 0);
		const step = r.step;
		play(kit, r.pattern, step, at);
		window.setTimeout(
			() => {
				if (running !== r) return;
				r.onStep(step);
				if (step % 4) return;
				const beat = { count: beats++, downbeat: step === 0 };
				listeners.forEach((l) => l(beat));
			},
			Math.max(0, (at - kit.ac.currentTime) * 1000),
		);
		r.next += length;
		r.step = (r.step + 1) % r.pattern.steps;
	}
}

/** Starts the beat. Call it from a press: sound needs one. False when there's no audio. */
export function startBeat(pattern: Pattern, bpm: number, onStep: (step: number) => void) {
	stopBeat();
	const kit = drums();
	if (!kit) return false;
	running = { pattern, bpm, step: 0, next: kit.ac.currentTime + 0.06, onStep };
	schedule();
	timer = window.setInterval(schedule, WAKE_MS);
	return true;
}

/** Changes the pattern or tempo without stopping. */
export function changeBeat(pattern: Pattern, bpm: number) {
	if (!running) return;
	running.step %= pattern.steps;
	running.pattern = pattern;
	running.bpm = bpm;
}

export function stopBeat() {
	window.clearInterval(timer);
	if (running) listeners.forEach((l) => l(null));
	running = null;
	beats = 0;
}
