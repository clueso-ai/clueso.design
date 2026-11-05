"use client";

import { type ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ControlGroup, ExperimentLayout } from "@/components/playground/ui/experiment-layout";
import { Player } from "@/components/playground/ui/player";
import { RecorderButton, RecordingBar, useRecorder } from "@/components/playground/ui/recorder";
import { Waveform } from "@/components/playground/ui/waveform";
import { Button, Kbd, Slider, Tabs, TabsContent, TabsList, TabsTrigger, ToggleSwitch } from "@/lib/design-system";
import {
	DownloadIcon,
	DownwardTrendIcon,
	MegaphoneIcon,
	RadioIcon,
	RecordIcon,
	ShuffleIcon,
	SparklesIcon,
	TelephoneIcon,
	UploadIcon,
	UpwardTrendIcon,
	WaveformIcon,
} from "@/lib/design-system/icons";
import { channels, clip, encodeWav, loudness, MAX_SECONDS, peakOf, type PresetId, PRESETS, presetOf, type Rendered, renderVoice, toDb, type Tune } from "@/lib/voice-fx";
import { clock, PEAK_COUNT, peaksOf } from "@/lib/waveform";

// Voice booth: record a line or bring a file, then hear it through a preset. Studio voice is the
// point: noise reduction, EQ, compression and loudness, like a voiceover gets in an edit. The rest
// are for fun. Each change renders offline (lib/voice-fx.ts). The presets are tabs on the stage over
// the timeline's transport bar and one waveform of the version you're hearing; switch tabs, or hold O
// for the original, and the sound swaps in place without stopping. Nothing leaves the browser.

const LINES = [
	"Hi, I'm making product videos with Clueso",
	"Here's how to set up your first project in under a minute",
	"Click export, pick a format, and you're done",
	"Welcome back. Here's what's new this week",
];

const ICONS: Record<PresetId, ReactNode> = {
	original: <WaveformIcon />,
	studio: <SparklesIcon />,
	radio: <RadioIcon />,
	phone: <TelephoneIcon />,
	stadium: <MegaphoneIcon />,
	chipmunk: <UpwardTrendIcon />,
	deep: <DownwardTrendIcon />,
};

type Problem = "badFile" | "bigFile" | "unreadable" | "silent" | "short" | "render";
const PROBLEMS: Record<Problem, string> = {
	badFile: "That file couldn't be opened as audio. Try a WAV, MP3 or M4A.",
	bigFile: "That file is too big. Pick one under 100 MB.",
	unreadable: "That take couldn't be read. Try recording again.",
	silent: "That take came through silent. Check your microphone and try again.",
	short: "That take was too short. Try again and read the whole line.",
	render: "Something went wrong while processing. Try another preset.",
};

/** What you hear: the untouched take, or the preset tab you're on. */
type Version = "original" | "enhanced";
type Measured = { lufs: number; peak: number };
type Take = Measured & { buffer: AudioBuffer; name: string };
type Processed = Rendered & Measured;

/** How long a swap between versions takes, in seconds. Short enough to feel instant, long enough not to click. */
const FADE = 0.03;

function measure(buffer: AudioBuffer): Measured {
	const chs = channels(buffer);
	return { lufs: loudness(chs, buffer.sampleRate), peak: peakOf(chs) };
}

const fmtDb = (v: number, unit: string) => (Number.isFinite(v) ? `${(Math.abs(v) < 0.05 ? 0 : v).toFixed(1).replace("-", "−")} ${unit}` : "silent");

/** Length of the timeline in seconds of the original take. A pitched take is stretched to fit. */
const spanOf = (take: Take, after: Processed | null) => Math.max(take.buffer.duration, after ? after.buffer.duration * after.rate : 0);

/** Peaks for `seconds` of a `total`-long timeline, the rest silent, scaled so both versions share one scale. */
function lane(buffer: AudioBuffer, seconds: number, total: number, scale: number) {
	const out = new Float32Array(PEAK_COUNT);
	const count = Math.max(1, Math.min(PEAK_COUNT, Math.round((PEAK_COUNT * seconds) / total)));
	out.set(peaksOf(buffer, count).map((v) => v * scale));
	return out;
}

/** True when a key press belongs to whatever has focus, not to the page's shortcuts. */
function typing(target: EventTarget | null, alsoControls: boolean) {
	const el = target as HTMLElement | null;
	const fields = "input, textarea, select, [contenteditable=true]";
	// A preset tab is picked as soon as it has focus, so Space is free to play there.
	if (!el || (alsoControls && el.closest("[role=tab]"))) return false;
	return !!el.closest(alsoControls ? `${fields}, button, a, [role=radio], [role=switch], [role=checkbox]` : fields);
}

export function VoiceBooth() {
	const [problem, setProblem] = useState<Problem | null>(null);
	// Microphone errors come from the recorder; they show until you try something else.
	const [source, setSource] = useState<"mic" | "file">("mic");
	const [decoding, setDecoding] = useState(false);
	const [line, setLine] = useState(0);
	const [take, setTake] = useState<Take | null>(null);
	const [preset, setPreset] = useState<PresetId>("studio");
	const [tune, setTune] = useState<Tune>(presetOf("studio").tune);
	const [after, setAfter] = useState<Processed | null>(null);
	// What the latest finished render was made from. Anything else means a render is on its way.
	const [done, setDone] = useState<{ take: Take; preset: PresetId; tune: Tune } | null>(null);
	const [holding, setHolding] = useState(false);
	const [playing, setPlaying] = useState(false);
	const [time, setTime] = useState(0);
	const hearing: Version = holding ? "original" : "enhanced";

	const fileRef = useRef<HTMLInputElement>(null);
	const ctxRef = useRef<AudioContext | null>(null);
	// Where the playhead is, in seconds of the original take.
	const posRef = useRef(0);
	const voiceRef = useRef<{ src: AudioBufferSourceNode; gain: GainNode; at: number; from: number; speed: number } | null>(null);
	// A hold in progress, and whether it started playback (so letting go stops it again).
	const holdRef = useRef<{ started: boolean } | null>(null);
	const mountedRef = useRef(false);
	// The latest values, for callbacks that outlive a render.
	const live = useRef({ take, after, hearing, playing });
	useLayoutEffect(() => {
		live.current = { take, after, hearing, playing };
	});
	// Each preset's render at its own settings, for this take, so going back to a tab is instant.
	const renders = useRef(new Map<PresetId, Processed>());
	const lastPreset = useRef(preset);

	const audio = () => (ctxRef.current ??= new AudioContext());

	// ── Playback ──

	const span = useCallback(() => {
		const { take, after } = live.current;
		return take ? spanOf(take, after) : 0;
	}, []);

	const position = useCallback(() => {
		const v = voiceRef.current;
		if (!v || !ctxRef.current) return posRef.current;
		return Math.min(span(), v.from + (ctxRef.current.currentTime - v.at) * v.speed);
	}, [span]);

	/** Fades out whatever is playing. */
	const halt = useCallback(() => {
		const v = voiceRef.current;
		if (!v || !ctxRef.current) return;
		posRef.current = position();
		voiceRef.current = null;
		const now = ctxRef.current.currentTime;
		v.src.onended = null;
		v.gain.gain.cancelScheduledValues(now);
		v.gain.gain.setValueAtTime(v.gain.gain.value, now);
		v.gain.gain.linearRampToValueAtTime(0, now + FADE);
		v.src.stop(now + FADE + 0.01);
	}, [position]);

	const pause = useCallback(() => {
		halt();
		setPlaying(false);
		setTime(posRef.current);
	}, [halt]);

	/** Plays one version from `from` (seconds of the original take), crossfading from whatever was playing. */
	const play = useCallback(
		(from: number, which: Version) => {
			const { take, after } = live.current;
			if (!take) return;
			const ctx = audio();
			void ctx.resume();
			halt();
			const useAfter = which === "enhanced" && after;
			const buffer = useAfter ? after.buffer : take.buffer;
			const rate = useAfter ? after.rate : 1;
			const start = from >= span() - 0.02 ? 0 : from;
			const offset = start / rate;
			posRef.current = start;
			if (offset >= buffer.duration) {
				setPlaying(false);
				setTime(start);
				return;
			}
			const src = ctx.createBufferSource();
			src.buffer = buffer;
			const gain = ctx.createGain();
			const now = ctx.currentTime;
			gain.gain.setValueAtTime(0, now);
			gain.gain.linearRampToValueAtTime(1, now + FADE);
			src.connect(gain).connect(ctx.destination);
			src.start(now, offset);
			const voice = { src, gain, at: now, from: start, speed: rate };
			src.onended = () => {
				if (voiceRef.current !== voice) return;
				voiceRef.current = null;
				posRef.current = span();
				setPlaying(false);
				setTime(posRef.current);
			};
			voiceRef.current = voice;
			setPlaying(true);
		},
		[halt, span],
	);

	const toggle = useCallback(() => {
		if (live.current.playing) pause();
		else play(posRef.current, live.current.hearing);
	}, [pause, play]);

	/** Switches what you hear, in place, if something is playing. */
	const listen = useCallback(
		(which: Version) => {
			if (live.current.playing) play(position(), which);
		},
		[play, position],
	);

	const seek = (to: number) => {
		const t = Math.max(0, Math.min(span(), to));
		if (playing) play(t, hearing);
		else posRef.current = t;
		setTime(t);
	};

	// Press and hold to hear the original, let go to go back. Holding while paused plays.
	const canCompare = !!take && !!after && after.buffer !== take.buffer;
	const startHold = useCallback(() => {
		const { take, after, playing } = live.current;
		if (holdRef.current || !take || !after || after.buffer === take.buffer) return;
		holdRef.current = { started: !playing };
		setHolding(true);
		if (playing) listen("original");
		else play(posRef.current, "original");
	}, [listen, play]);
	const endHold = useCallback(() => {
		const hold = holdRef.current;
		if (!hold) return;
		holdRef.current = null;
		setHolding(false);
		if (hold.started) pause();
		else listen("enhanced");
	}, [listen, pause]);

	// The clock and playhead follow the sound while it plays.
	useEffect(() => {
		if (!playing) return;
		let raf = 0;
		const frame = () => {
			setTime(position());
			raf = requestAnimationFrame(frame);
		};
		raf = requestAnimationFrame(frame);
		return () => cancelAnimationFrame(raf);
	}, [playing, position]);

	// Space plays and pauses, unless focus is on something that uses Space itself. Holding O plays the original.
	useEffect(() => {
		const down = (e: KeyboardEvent) => {
			if (!live.current.take || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
			if (e.code === "Space" && !typing(e.target, true)) {
				e.preventDefault();
				toggle();
			} else if (e.code === "KeyO" && !typing(e.target, false)) {
				startHold();
			}
		};
		const up = (e: KeyboardEvent) => {
			if (e.code === "KeyO") endHold();
		};
		window.addEventListener("keydown", down);
		window.addEventListener("keyup", up);
		window.addEventListener("blur", endHold);
		return () => {
			window.removeEventListener("keydown", down);
			window.removeEventListener("keyup", up);
			window.removeEventListener("blur", endHold);
		};
	}, [toggle, startHold, endHold]);

	// ── Rendering ──

	useEffect(() => {
		if (!take) return;
		const stock = tune === presetOf(preset).tune;
		const kept = stock && renders.current.get(preset);
		const switched = lastPreset.current !== preset;
		lastPreset.current = preset;
		if (kept) {
			setAfter(kept);
			setDone({ take, preset, tune });
			return;
		}
		let cancelled = false;
		// A new tab renders now; slider moves wait to settle first.
		const id = window.setTimeout(
			async () => {
				try {
					const out = await renderVoice(take.buffer, preset, tune);
					if (cancelled) return;
					const next = { ...out, ...measure(out.buffer) };
					if (stock) renders.current.set(preset, next);
					setAfter(next);
					setProblem((p) => (p === "render" ? null : p));
				} catch {
					if (!cancelled) setProblem("render");
				} finally {
					if (!cancelled) setDone({ take, preset, tune });
				}
			},
			switched ? 0 : 140,
		);
		return () => {
			cancelled = true;
			window.clearTimeout(id);
		};
	}, [take, preset, tune]);

	// A fresh render replaces what's playing, from the same spot.
	const lastAfter = useRef<Processed | null>(null);
	useEffect(() => {
		if (after === lastAfter.current) return;
		lastAfter.current = after;
		if (after && live.current.playing && live.current.hearing === "enhanced") play(position(), "enhanced");
	}, [after, play, position]);

	// Both versions on one timeline and one scale, so switching glides between their shapes.
	const shapes = useMemo(() => {
		if (!take) return null;
		const total = spanOf(take, after);
		const top = Math.max(take.peak, after?.peak ?? 0) || 1;
		const original = lane(take.buffer, take.buffer.duration, total, take.peak / top);
		const enhanced = after ? lane(after.buffer, after.buffer.duration * after.rate, total, after.peak / top) : original;
		return { original, enhanced, total };
	}, [take, after]);

	// ── Sources ──

	useEffect(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
			voiceRef.current?.src.stop();
			void ctxRef.current?.close();
		};
	}, []);

	const load = (buffer: AudioBuffer, name: string) => {
		halt();
		holdRef.current = null;
		setHolding(false);
		setPlaying(false);
		posRef.current = 0;
		setTime(0);
		const b = clip(buffer, MAX_SECONDS);
		renders.current.clear();
		setAfter(null);
		setTake({ buffer: b, name, ...measure(b) });
	};

	const openRecording = async (blob: Blob) => {
		setDecoding(true);
		try {
			const buffer = await audio().decodeAudioData(await blob.arrayBuffer());
			if (!mountedRef.current) return;
			if (buffer.duration < 0.4) setProblem("short");
			else if (peakOf(channels(buffer)) < 0.001) setProblem("silent");
			else load(buffer, "your take");
		} catch {
			setProblem("unreadable");
		} finally {
			setDecoding(false);
		}
	};

	const recorder = useRecorder({ maxSeconds: MAX_SECONDS, onFinish: (blob) => void openRecording(blob) });
	const recording = recorder.state !== "idle";

	const startRecording = () => {
		pause();
		setProblem(null);
		setSource("mic");
		void recorder.start();
	};

	// A file from the visitor's device. It's decoded here and never sent anywhere.
	const openFile = async (file: File | undefined) => {
		if (!file) return;
		setProblem(null);
		setSource("file");
		if (file.size > 100 * 1024 * 1024) {
			setProblem("bigFile");
			return;
		}
		setDecoding(true);
		try {
			const buffer = await audio().decodeAudioData(await file.arrayBuffer());
			if (!mountedRef.current) return;
			if (buffer.duration < 0.1) throw new Error("short");
			load(buffer, file.name);
		} catch {
			setProblem("badFile");
		} finally {
			setDecoding(false);
		}
	};

	const pickPreset = (id: PresetId) => {
		setPreset(id);
		setTune(presetOf(id).tune);
	};

	const save = () => {
		if (!after) return;
		const url = URL.createObjectURL(encodeWav(after.buffer));
		const a = document.createElement("a");
		a.href = url;
		a.download = `clueso-voice-${preset}.wav`;
		document.body.append(a);
		a.click();
		a.remove();
		window.setTimeout(() => URL.revokeObjectURL(url), 2000);
	};

	const setT = <K extends keyof Tune>(key: K) => (value: Tune[K]) => setTune((t) => ({ ...t, [key]: value }));
	const rendering = !!take && !(done?.take === take && done.preset === preset && done.tune === tune);
	const changed = JSON.stringify(tune) !== JSON.stringify(presetOf(preset).tune);
	// With the Original preset, the other version is just your tuning.
	const enhancedName = preset === "original" ? "Tuned" : presetOf(preset).name;
	const message = problem ? PROBLEMS[problem] : source === "mic" ? recorder.error : null;
	const busy = recording || decoding;

	const openPicker = () => fileRef.current?.click();

	const stage = (
		<>
			{take && shapes && !recording && !decoding ? (
				<Tabs value={preset} onValueChange={(v) => pickPreset(v as PresetId)} className="min-w-0 overflow-hidden rounded-medium border border-neutral-weak bg-raised-1">
					<div className="overflow-x-auto">
						<TabsList variant="line" size="medium" aria-label="Preset" className="min-w-fit px-gap-s">
							{PRESETS.map((p) => (
								<TabsTrigger key={p.id} value={p.id} icon={ICONS[p.id]} className="focus-ring rounded-small">
									{p.name}
								</TabsTrigger>
							))}
						</TabsList>
					</div>
					<TabsContent value={preset} tabIndex={-1} className="flex flex-col gap-gap-m p-gap-l">
						<Player time={time} duration={shapes.total} playing={playing} onPlayPause={toggle} onSeek={seek}>
							<Waveform
								peaks={hearing === "original" ? shapes.original : shapes.enhanced}
								duration={shapes.total}
								time={time}
								onSeek={seek}
								size="large"
								label={`Waveform of ${take.name}, ${canCompare && hearing === "enhanced" ? enhancedName.toLowerCase() : "original"}`}
							/>
						</Player>
						<div className="flex flex-wrap items-center justify-between gap-x-gap-l gap-y-gap-s">
							<dl className="type-text-xs flex flex-col gap-gap-3xs text-neutral-weak">
								<Reading name="Original" value={take} on={hearing === "original"} />
								{after && canCompare && <Reading name={enhancedName} value={after} on={hearing === "enhanced"} />}
							</dl>
							<div className="flex items-center gap-gap-s">
								<span role="status" className="type-text-xs text-neutral-weak">
									{rendering ? "Rendering" : ""}
								</span>
								{/* Holding the button does what holding O does, for anyone without a keyboard. */}
								<Button
									variant={holding ? "filled" : "outlined"}
									sentiment="neutral"
									size="small"
									aria-pressed={holding}
									aria-keyshortcuts="O"
									disabled={!canCompare}
									className="focus-ring touch-none select-none"
									onPointerDown={(e) => {
										e.currentTarget.setPointerCapture(e.pointerId);
										startHold();
									}}
									onPointerUp={endHold}
									onPointerCancel={endHold}
									onLostPointerCapture={endHold}
									onContextMenu={(e) => e.preventDefault()}
									onKeyDown={(e) => {
										if ((e.key === " " || e.key === "Enter") && !e.repeat) {
											e.preventDefault();
											startHold();
										}
									}}
									onKeyUp={(e) => {
										if (e.key === " " || e.key === "Enter") endHold();
									}}
									onBlur={endHold}
								>
									<span className="flex items-center gap-gap-2xs">
										Hold <Kbd>O</Kbd> for the original
									</span>
								</Button>
							</div>
						</div>
					</TabsContent>
				</Tabs>
			) : (
				<div className="flex min-h-80 flex-col items-center justify-center gap-gap-l rounded-medium border border-neutral-weak bg-raised-1 p-gap-l">
					{decoding ? (
						<p role="status" className="type-text-s text-center text-neutral-weak">
							Getting your take ready
						</p>
					) : (
						<>
							<div className="flex flex-col items-center gap-gap-xs text-center">
								<p className="type-text-s text-neutral-weak">Read this line, or say anything you like</p>
								<p className="type-title-m max-w-measure text-balance text-neutral-strong">“{LINES[line]}”</p>
							</div>
							<RecordingBar
								recorder={recorder}
								onRecord={startRecording}
								left={<RecorderButton label="Use a file" icon={<UploadIcon />} onClick={openPicker} />}
								right={<RecorderButton label="Another line" icon={<ShuffleIcon />} onClick={() => setLine((l) => (l + 1) % LINES.length)} />}
								hint="Up to 30 seconds. Your voice stays in this browser. Nothing is uploaded."
							/>
						</>
					)}
				</div>
			)}
			<p role="alert" className="type-text-s text-pretty text-negative-normal empty:hidden">
				{message}
			</p>
			{take && !busy && (
				<p className="type-text-xs flex items-center gap-gap-2xs text-neutral-weak">
					<Kbd>Space</Kbd> plays or pauses
				</p>
			)}
			<input
				ref={fileRef}
				type="file"
				accept="audio/*,.wav,.mp3,.m4a,.aac,.ogg,.oga,.webm,.flac"
				aria-label="Choose an audio file"
				className="hidden"
				onChange={(e) => {
					void openFile(e.target.files?.[0]);
					e.target.value = "";
				}}
			/>
		</>
	);

	return (
		<ExperimentLayout
			stage={stage}
			actions={
				<Button variant="filled" sentiment="brand" size="medium" iconBefore icon={<DownloadIcon />} className="focus-ring" disabled={!take || !after || rendering || busy} onClick={save}>
					Download WAV
				</Button>
			}
		>
			<ControlGroup title="Source" summary={take ? take.name.charAt(0).toUpperCase() + take.name.slice(1) : "Nothing yet"}>
				<div className="flex flex-wrap items-center gap-gap-xs">
					<Button variant={take ? "outlined" : "filled"} sentiment={take ? "neutral" : "brand"} size="medium" iconBefore icon={<RecordIcon />} className="focus-ring" disabled={busy} onClick={startRecording}>
						{take ? "Record again" : "Record"}
					</Button>
					<Button variant="transparent" sentiment="neutral" size="medium" iconBefore icon={<UploadIcon />} className="focus-ring" disabled={busy} onClick={openPicker}>
						Use a file
					</Button>
				</div>
				{take && (
					<p className="type-text-xs truncate text-neutral-weak">
						Using {take.name}, {clock(take.buffer.duration, true)} long
					</p>
				)}
			</ControlGroup>

			<ControlGroup
				title="Tune"
				summary={changed ? `${presetOf(preset).name}, tuned` : presetOf(preset).name}
				action={
					changed && (
						<Button variant="transparent" sentiment="neutral" size="small" className="focus-ring" onClick={() => setTune(presetOf(preset).tune)}>
							Reset
						</Button>
					)
				}
			>
				<Slider label="Clean" unit="%" min={0} max={100} step={1} value={tune.clean} onValueChange={(v) => setT("clean")(Math.round(v))} />
				<Slider label="Warmth" unit="dB" min={-6} max={6} step={0.5} value={tune.warmth} onValueChange={setT("warmth")} />
				<Slider label="Clarity" unit="dB" min={-6} max={6} step={0.5} value={tune.clarity} onValueChange={setT("clarity")} />
				<Slider label="Room" unit="%" min={0} max={100} step={1} value={tune.room} onValueChange={(v) => setT("room")(Math.round(v))} />
				<label className="type-text-s flex items-center gap-gap-xs text-neutral-normal">
					<ToggleSwitch checked={tune.level} onChange={setT("level")} />
					Match loudness
				</label>
				<Slider label="Target" unit="LUFS" min={-24} max={-10} step={1} value={tune.target} disabled={!tune.level} onValueChange={(v) => setT("target")(Math.round(v))} />
			</ControlGroup>
		</ExperimentLayout>
	);
}

/** One version's loudness and peak, quiet, and a little stronger for the one you're hearing. */
function Reading({ name, value, on }: { name: string; value: Measured; on: boolean }) {
	return (
		<div className={`flex items-center gap-gap-xs transition-colors duration-200 ${on ? "text-neutral-strong" : ""}`}>
			<dt className="flex items-center gap-gap-2xs">
				<span aria-hidden className={`size-1.5 rounded-tiny ${on ? "bg-brand-normal" : "bg-neutral-normal"}`} />
				{name}
			</dt>
			<dd className="font-code tabular-nums">
				{fmtDb(value.lufs, "LUFS")} · peak {fmtDb(toDb(value.peak), "dB")}
			</dd>
		</div>
	);
}
