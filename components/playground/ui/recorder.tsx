"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "@/lib/design-system";
import { BinIcon, MicIcon, PauseIcon, RecordIcon, StopIcon } from "@/lib/design-system/icons";
import { clock } from "@/lib/waveform";
import { Waveform } from "./waveform";

// Recording from the microphone, for any playground experiment: `useRecorder` runs it and
// `RecordingBar` shows it, after the patterns the good recorders share (Krea, Manus, Descript):
// a live waveform scrolling into a line at now, a big clock out of the limit with a pulsing red dot,
// which mic is listening, and Discard, Pause and Stop. It stops by itself at the limit.
// The raw voice is kept honest: the browser's echo cancelling, noise suppression and auto gain are off.

export type RecorderState = "idle" | "starting" | "recording" | "paused";

/** How many level readings the live waveform keeps, and how often it takes one. */
const LEVELS = 400;
const LEVEL_MS = 50;

function format() {
	if (typeof MediaRecorder === "undefined") return null;
	return ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

/** A microphone error in plain words. */
function explain(err: unknown) {
	const name = err instanceof DOMException ? err.name : "";
	if (name === "NotAllowedError" || name === "SecurityError") return "The microphone is blocked. Allow it for this site in your browser's settings, then try again.";
	if (name === "NotFoundError" || name === "OverconstrainedError") return "No microphone found. Plug one in, or use a file instead.";
	if (name === "NotReadableError") return "Another app is using the microphone. Close it and try again.";
	return "The microphone didn't start. Try again, or use a file instead.";
}

export function useRecorder({ maxSeconds, onFinish }: { maxSeconds: number; onFinish: (audio: Blob) => void }) {
	const [state, setState] = useState<RecorderState>("idle");
	const [elapsed, setElapsed] = useState(0);
	const [levels, setLevels] = useState<Float32Array>(() => new Float32Array(0));
	const [device, setDevice] = useState("");
	const [error, setError] = useState<string | null>(null);
	const live = useRef<{ stream: MediaStream; recorder: MediaRecorder; ac: AudioContext; timer: number; chunks: Blob[]; keep: boolean; startedAt: number; before: number } | null>(null);
	const finishRef = useRef(onFinish);
	useEffect(() => {
		finishRef.current = onFinish;
	});

	const teardown = () => {
		const r = live.current;
		if (!r) return;
		window.clearInterval(r.timer);
		r.stream.getTracks().forEach((t) => t.stop());
		void r.ac.close();
		live.current = null;
	};
	// Leaving mid-recording throws the take away rather than handing it to a page that's gone.
	useEffect(
		() => () => {
			if (live.current) live.current.keep = false;
			teardown();
		},
		[],
	);

	const seconds = () => {
		const r = live.current;
		if (!r) return 0;
		return r.before + (r.recorder.state === "recording" ? (performance.now() - r.startedAt) / 1000 : 0);
	};

	const stop = (keep: boolean) => {
		const r = live.current;
		if (!r) return;
		r.keep = keep;
		if (r.recorder.state !== "inactive") r.recorder.stop();
		else teardown();
		setState("idle");
	};

	const start = async () => {
		if (live.current) return;
		setError(null);
		const mime = format();
		if (mime === null || !navigator.mediaDevices?.getUserMedia) {
			setError("This browser can't record audio. Try a recent Chrome, Edge or Safari, or use a file instead.");
			return;
		}
		setState("starting");
		let stream: MediaStream;
		try {
			stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
		} catch (err) {
			setError(explain(err));
			setState("idle");
			return;
		}
		const ac = new AudioContext();
		const analyser = ac.createAnalyser();
		analyser.fftSize = 1024;
		ac.createMediaStreamSource(stream).connect(analyser);
		const wave = new Float32Array(analyser.fftSize);
		const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
		const r = { stream, recorder, ac, timer: 0, chunks: [] as Blob[], keep: true, startedAt: performance.now(), before: 0 };
		recorder.ondataavailable = (e) => e.data.size && r.chunks.push(e.data);
		recorder.onstop = () => {
			const blob = new Blob(r.chunks, { type: recorder.mimeType || mime || "audio/webm" });
			const keep = r.keep;
			teardown();
			if (keep && blob.size) finishRef.current(blob);
		};
		let history = new Float32Array(0);
		r.timer = window.setInterval(() => {
			const s = seconds();
			setElapsed(s);
			if (s >= maxSeconds) return stop(true);
			if (recorder.state !== "recording") return;
			analyser.getFloatTimeDomainData(wave);
			let sum = 0;
			for (const v of wave) sum += v * v;
			// A gentle curve, so speech fills the meter without shouting.
			const level = Math.min(1, Math.sqrt(Math.sqrt(sum / wave.length)) * 1.6);
			const next = new Float32Array(Math.min(LEVELS, history.length + 1));
			next.set(history.subarray(history.length - next.length + 1));
			next[next.length - 1] = level;
			history = next;
			setLevels(next);
		}, LEVEL_MS);
		live.current = r;
		recorder.start(250);
		setDevice(stream.getAudioTracks()[0]?.label || "Default microphone");
		setElapsed(0);
		setLevels(new Float32Array(0));
		setState("recording");
	};

	const pause = () => {
		const r = live.current;
		if (!r || r.recorder.state !== "recording") return;
		r.before = seconds();
		r.recorder.pause();
		setState("paused");
	};
	const resume = () => {
		const r = live.current;
		if (!r || r.recorder.state !== "paused") return;
		r.startedAt = performance.now();
		r.recorder.resume();
		setState("recording");
	};

	return { state, elapsed, levels, device, error, maxSeconds, start, pause, resume, finish: () => stop(true), discard: () => stop(false) };
}

export type Recorder = ReturnType<typeof useRecorder>;

/**
 * The recorder deck: a live waveform scrolling into a line at now, the time, and big buttons for
 * Pause, Stop and Discard. Idle (and while the mic opens) it shows Record, with whatever else the
 * experiment wants either side (`left`, `right`) and a `hint` under it. Experiments that only show
 * it while recording just pass the recorder.
 */
export function RecordingBar({ recorder, onRecord, left, right, hint }: { recorder: Recorder; onRecord?: () => void; left?: ReactNode; right?: ReactNode; hint?: ReactNode }) {
	const { state, elapsed, levels, device, maxSeconds } = recorder;
	const idle = state === "idle";
	const paused = state === "paused";
	const label = { idle: "Ready", starting: "Opening the microphone", recording: "Recording", paused: "Paused" }[state];
	return (
		// Flat, so it sits inside whatever card holds it without making a card within a card.
		<div className="flex w-full flex-col items-center gap-gap-m">
			<div className="relative flex h-20 w-full items-center">
				<div className="flex h-full w-3/4 min-w-0 items-center">{state === "recording" || paused ? <Waveform peaks={levels} live label="Your voice, live" size="medium" /> : <Baseline />}</div>
				{/* Now: the take grows into this line, and the dots ahead are the time still to come. */}
				<span aria-hidden className={`h-full w-px shrink-0 ${state === "recording" ? "bg-brand-normal" : "bg-neutral-normal"}`} />
				<Baseline />
			</div>
			<div className="flex flex-col items-center gap-gap-2xs" aria-live="polite">
				<span className="type-text-xs flex items-center gap-gap-2xs text-neutral-weak">
					<span aria-hidden className={`size-2 rounded-small ${state === "recording" ? "bg-negative-normal motion-safe:animate-pulse" : "bg-neutral-normal"}`} />
					{label}
				</span>
				<span className="type-title-l font-code tabular-nums text-neutral-strong">
					{clock(elapsed)}
					<span className="type-text-s font-code text-neutral-weak"> / {clock(maxSeconds)}</span>
				</span>
			</div>
			<div className="flex items-start justify-center gap-gap-l">
				{idle || state === "starting" ? (
					<>
						{left}
						<RecorderButton label="Record" icon={<RecordIcon />} primary disabled={!idle} onClick={onRecord ?? (() => void recorder.start())} />
						{right}
					</>
				) : (
					<>
						<RecorderButton label="Discard" icon={<BinIcon />} onClick={recorder.discard} />
						<RecorderButton label={paused ? "Resume" : "Pause"} icon={paused ? <RecordIcon /> : <PauseIcon />} primary onClick={paused ? recorder.resume : recorder.pause} />
						<RecorderButton label="Stop" icon={<StopIcon />} onClick={recorder.finish} />
					</>
				)}
			</div>
			{idle ? (
				hint && <p className="type-text-xs max-w-measure text-center text-pretty text-neutral-weak">{hint}</p>
			) : (
				<span className="type-text-xs flex max-w-full min-w-0 items-center gap-gap-2xs text-neutral-weak">
					<MicIcon aria-hidden className="size-3.5 shrink-0" />
					<span className="truncate">{device || "Microphone"}</span>
				</span>
			)}
		</div>
	);
}

/** One of the deck's big buttons, with its name under it. Record and Pause are the primary one. */
export function RecorderButton({ label, icon, onClick, primary = false, disabled = false }: { label: string; icon: ReactNode; onClick: () => void; primary?: boolean; disabled?: boolean }) {
	return (
		<span className="flex flex-col items-center gap-gap-2xs">
			{/* Every button sits in the primary's height, so they share a middle and their labels a line. */}
			<span className="flex h-12 items-center">
				<Button variant={primary ? "filled" : "outlined"} sentiment={primary ? "brand" : "neutral"} size="large" iconOnly icon={icon} aria-label={label} className={`focus-ring ${primary ? "size-12" : ""}`} disabled={disabled} onClick={onClick} />
			</span>
			<span aria-hidden className="type-text-xs text-neutral-weak">
				{label}
			</span>
		</span>
	);
}

/** A dotted line through the middle, for silence or time still to come. */
function Baseline() {
	return <span aria-hidden className="min-w-0 flex-1 border-t-2 border-dotted border-neutral-normal" />;
}

/** The red REC pill with a pulsing dot, or a grey Paused one. Shared by every recorder in the playground. */
export function RecPill({ paused = false }: { paused?: boolean }) {
	return (
		<span className={`type-text-xs flex w-fit items-center gap-gap-2xs rounded-small px-gap-xs py-gap-3xs font-code uppercase ${paused ? "bg-sunken-1 text-neutral-weak" : "bg-negative-weak text-negative-normal"}`}>
			<span aria-hidden className={`size-2 rounded-small ${paused ? "bg-neutral-normal" : "bg-negative-normal motion-safe:animate-pulse"}`} />
			{paused ? "Paused" : "Rec"}
		</span>
	);
}
