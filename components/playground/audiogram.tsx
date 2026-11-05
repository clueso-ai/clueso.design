"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Button, InputGroup, InputGroupInput, Slider, ToggleSwitch } from "@/lib/design-system";
import { CircleIcon, DotsNineIcon, DownloadIcon, GridIcon, MusicIcon, RecordIcon, SparklesIcon, UploadIcon, WaveformIcon, WavesIcon } from "@/lib/design-system/icons";
import {
	type Analysis,
	type Aspect,
	analyse,
	decodeAudio,
	type Direction,
	drawCard,
	emptyFrame,
	type Fonts,
	frameAt,
	type Gradient,
	liveliestTime,
	MAX_SECONDS,
	type Palette,
	type Placement,
	readFonts,
	resolvePalette,
	type Scene,
	SIZE,
	synthSample,
	type Tune,
	TUNABLE,
	TUNES,
	type Visual,
} from "@/lib/audiogram";
import { downloadBlob, recordCanvas, videoFormat } from "@/lib/record-canvas";
import { SOUNDTRACKS } from "@/lib/soundtracks";
import { clock } from "@/lib/waveform";
import { type ColorPreset, type ColorRole, ColorChoice, type ColorValue, colorsOf } from "./ui/color-choice";
import { Advanced, ControlGroup, ExperimentLayout } from "./ui/experiment-layout";
import { Player } from "./ui/player";
import { RecordingBar, useRecorder } from "./ui/recorder";
import { Segmented, type SegmentedOption } from "./ui/segmented";
import { SoundtrackPicker } from "./ui/soundtrack-picker";

// Audiogram maker: a voice clip becomes a social video. The clip is analysed once when it loads
// (lib/audiogram.ts), and the card is drawn from those levels at the clip's time, so the preview
// while playing, a paused card and the exported video all show the same picture.
// Export plays the clip once in real time into a recorder with the canvas. Nothing leaves the browser.

type Source = "sample" | "file" | "record" | "soundtracks";

// Where a clip can come from. Each one has its own panel in the Audio group.
const SOURCES: SegmentedOption<Source>[] = [
	{ value: "sample", label: "Sample", icon: <WaveformIcon /> },
	{ value: "file", label: "File", icon: <UploadIcon /> },
	{ value: "record", label: "Record", icon: <RecordIcon /> },
	{ value: "soundtracks", label: "Music", icon: <MusicIcon /> },
];
const VISUALS: SegmentedOption<Visual>[] = [
	{ value: "bars", label: "Bars", icon: <WaveformIcon /> },
	{ value: "spectrum", label: "Spectrum" },
	{ value: "pixel", label: "Pixel", icon: <DotsNineIcon /> },
	{ value: "blocks", label: "Blocks", icon: <GridIcon /> },
	{ value: "aura", label: "Aura", icon: <SparklesIcon /> },
	{ value: "line", label: "Line", icon: <WavesIcon /> },
	{ value: "ring", label: "Ring", icon: <CircleIcon /> },
];
const PLACEMENTS: SegmentedOption<Placement>[] = [
	{ value: "middle", label: "Middle" },
	{ value: "bottom", label: "Bottom" },
	{ value: "full", label: "Full card" },
];
const GRADIENTS: SegmentedOption<Gradient>[] = [
	{ value: "solid", label: "Solid" },
	{ value: "two", label: "2 colours" },
	{ value: "three", label: "3 colours" },
];
const DIRECTIONS: SegmentedOption<Direction>[] = [
	{ value: "along", label: "Along" },
	{ value: "across", label: "Across" },
];
const ASPECTS: SegmentedOption<Aspect>[] = [
	{ value: "1:1", label: "1:1" },
	{ value: "9:16", label: "9:16" },
	{ value: "16:9", label: "16:9" },
];
// The card's colours: the ground, the visual's one to three colours, and the words.
const ROLES: Record<Gradient, ColorRole[]> = {
	solid: [
		{ id: "ground", label: "Ground" },
		{ id: "from", label: "Visual" },
		{ id: "text", label: "Text" },
	],
	two: [
		{ id: "ground", label: "Ground" },
		{ id: "from", label: "From" },
		{ id: "to", label: "To" },
		{ id: "text", label: "Text" },
	],
	three: [
		{ id: "ground", label: "Ground" },
		{ id: "from", label: "From" },
		{ id: "via", label: "Via" },
		{ id: "to", label: "To" },
		{ id: "text", label: "Text" },
	],
};
/**
 * Looks made of tokens. Paper is white in either theme (light's inverted text, dark's strong text)
 * and ink is the portrait backdrop, so a video comes out the same whichever theme made it. The
 * in-between colours are mixes of two tokens.
 */
function palettes(dark: boolean): ColorPreset[] {
	const paper = dark ? "var(--fg-neutral-strong)" : "var(--fg-neutral-inverted)";
	const ink = "var(--surface-portrait)";
	const pink = "var(--bg-brand-normal)";
	const blue = "var(--bg-accent-normal)";
	const yellow = "var(--bg-warning-normal)";
	const mix = (a: string, b: string, share = 50) => `color-mix(in oklch, ${a} ${share}%, ${b})`;
	return [
		{ id: "neon-ink", label: "Neon on ink", colors: { ground: ink, from: pink, via: mix(pink, blue), to: blue, text: paper } },
		{ id: "sunset-ink", label: "Sunset on ink", colors: { ground: ink, from: pink, via: mix(pink, yellow), to: yellow, text: paper } },
		{ id: "pink-paper", label: "Pink on paper", colors: { ground: paper, from: pink, via: mix(pink, blue, 70), to: mix(pink, blue, 35), text: ink } },
		{ id: "ink-paper", label: "Ink on paper", colors: { ground: paper, from: ink, via: mix(ink, pink, 60), to: pink, text: ink } },
		{ id: "paper-pink", label: "Paper on pink", colors: { ground: pink, from: paper, via: mix(paper, pink, 75), to: mix(paper, pink, 45), text: paper } },
	];
}
const WIDTH_LABEL: Record<Visual, string> = { bars: "Bar width", spectrum: "Edge width", pixel: "Dot size", blocks: "Block size", aura: "Width", line: "Line width", ring: "Bar width" };
// The preview keeps the export's shape and fills the stage, short enough to keep the player in view.
const FRAME: Record<Aspect, string> = { "1:1": "aspect-square", "9:16": "aspect-9/16", "16:9": "aspect-video" };
const RATIO: Record<Aspect, number> = { "1:1": 1, "9:16": 9 / 16, "16:9": 16 / 9 };

const SAMPLE_NAME = "Sample tune";
const TITLE = "The Clueso show";
const SUBTITLE = "Episode 1 · A short tune to start";

type Status = "preparing" | "ready" | "loading" | "exporting";
/** The clip in use. `track` is the soundtrack it came from, if any. */
type Clip = { name: string; duration: number; track: string | null };

const watchTheme = (onChange: () => void) => {
	const observer = new MutationObserver(onChange);
	observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
	return () => observer.disconnect();
};
const noWatch = () => () => {};
const isDark = () => document.documentElement.classList.contains("dark");
const percent = (v: number) => Math.round(v * 100);

export function Audiogram() {
	const dark = useSyncExternalStore(watchTheme, isDark, () => false);

	const [status, setStatus] = useState<Status>("preparing");
	const [problem, setProblem] = useState("");
	const [note, setNote] = useState("");
	const [source, setSource] = useState<Source>("sample");
	const [clip, setClip] = useState<Clip | null>(null);
	const [trim, setTrimState] = useState<[number, number]>([0, 0]);
	const [playing, setPlaying] = useState(false);
	const [pos, setPos] = useState(0);
	const [visual, setVisual] = useState<Visual>("bars");
	const [placement, setPlacement] = useState<Placement>("middle");
	const [tunes, setTunes] = useState<Record<Visual, Tune>>(TUNES);
	const [gradient, setGradient] = useState<Gradient>("three");
	const [direction, setDirection] = useState<Direction>("along");
	const [aspect, setAspect] = useState<Aspect>("1:1");
	const [colors, setColors] = useState<ColorValue>({ preset: "neon-ink" });
	const [title, setTitle] = useState(TITLE);
	const [subtitle, setSubtitle] = useState(SUBTITLE);
	const [imageName, setImageName] = useState("");
	const [exported, setExported] = useState(0);
	const format = useSyncExternalStore(noWatch, videoFormat, () => null);
	const [palette, setPalette] = useState<Palette | null>(null);
	const [fonts, setFonts] = useState<Fonts | null>(null);

	const canvasRef = useRef<HTMLCanvasElement>(null);
	const probeRef = useRef<HTMLSpanElement>(null);
	const titleProbeRef = useRef<HTMLSpanElement>(null);
	const textProbeRef = useRef<HTMLSpanElement>(null);
	const audioFileRef = useRef<HTMLInputElement>(null);
	const imageFileRef = useRef<HTMLInputElement>(null);
	const sampleRef = useRef<AudioBuffer | null>(null);
	const bufferRef = useRef<AudioBuffer | null>(null);
	const analysisRef = useRef<Analysis | null>(null);
	const imageRef = useRef<HTMLImageElement | null>(null);
	const acRef = useRef<AudioContext | null>(null);
	const sourceRef = useRef<AudioBufferSourceNode | null>(null);
	// Where playback is: while playing, the clip time is the context's clock minus startedAt.
	const clockRef = useRef({ playing: false, startedAt: 0, offset: 0 });
	const trimRef = useRef<[number, number]>([0, 0]);
	const sceneRef = useRef<Scene | null>(null);
	const dirtyRef = useRef(true);
	const exportRef = useRef<{ time: () => number; cancel: () => void } | null>(null);
	const loadRef = useRef(0);
	// True while a freshly loaded clip sits paused at its liveliest frame. Play then starts from the top.
	const freshRef = useRef(false);
	// The visitor's own clip (the sample, a file or a recording), for going back to after music.
	const ownRef = useRef<{ buffer: AudioBuffer; name: string } | null>(null);
	// Whether the visitor typed their own title and subtitle. A soundtrack only fills in untouched ones.
	const typedRef = useRef({ title: false, subtitle: false });

	const recorder = useRecorder({
		maxSeconds: MAX_SECONDS,
		onFinish: (blob) => void blob.arrayBuffer().then((data) => loadData(data, "Your recording", "The recording couldn't be read. Try again, or use a file.")),
	});
	const recording = recorder.state !== "idle";

	const duration = trim[1] - trim[0];
	const ready = status === "ready" && !!clip && !recording;
	const tune = tunes[visual];

	const setTrim = (next: [number, number]) => {
		trimRef.current = next;
		setTrimState(next);
	};

	/** The clip time now, from 0 to the trimmed length. */
	const now = () => {
		const c = clockRef.current;
		const length = trimRef.current[1] - trimRef.current[0];
		if (c.playing && acRef.current) return Math.min(Math.max(acRef.current.currentTime - c.startedAt, 0), length);
		return c.offset;
	};

	const ensureAudio = () => {
		acRef.current ??= new AudioContext();
		return acRef.current;
	};

	const stopSource = () => {
		const s = sourceRef.current;
		sourceRef.current = null;
		if (!s) return;
		s.onended = null;
		try {
			s.stop();
		} catch {
			// Already stopped.
		}
		s.disconnect();
	};

	const play = async (from?: number) => {
		const buffer = bufferRef.current;
		if (!buffer) return;
		const ac = ensureAudio();
		await ac.resume().catch(() => {});
		const [a, b] = trimRef.current;
		const length = b - a;
		let start = from ?? (freshRef.current ? 0 : clockRef.current.offset);
		freshRef.current = false;
		if (start >= length - 0.05) start = 0;
		stopSource();
		const src = ac.createBufferSource();
		src.buffer = buffer;
		src.connect(ac.destination);
		src.start(0, a + start, length - start);
		src.onended = () => {
			if (sourceRef.current !== src) return;
			sourceRef.current = null;
			clockRef.current = { playing: false, startedAt: 0, offset: length };
			setPlaying(false);
			setPos(length);
			dirtyRef.current = true;
		};
		sourceRef.current = src;
		clockRef.current = { playing: true, startedAt: ac.currentTime - start, offset: start };
		setPlaying(true);
	};

	const pause = () => {
		const t = now();
		stopSource();
		clockRef.current = { playing: false, startedAt: 0, offset: t };
		setPlaying(false);
		setPos(t);
		dirtyRef.current = true;
	};

	const seek = (t: number) => {
		freshRef.current = false;
		if (clockRef.current.playing) void play(t);
		else {
			clockRef.current.offset = t;
			dirtyRef.current = true;
		}
		setPos(t);
	};

	/** Swaps in a new clip: analyses it, then resets trim and time. False if another load overtook it. */
	const loadBuffer = async (buffer: AudioBuffer, name: string, capped = false, track: string | null = null) => {
		const run = ++loadRef.current;
		setStatus("loading");
		const analysis = await analyse(buffer);
		if (run !== loadRef.current) return false;
		stopSource();
		bufferRef.current = buffer;
		analysisRef.current = analysis;
		if (!track) ownRef.current = { buffer, name };
		// Paused on the liveliest moment near the start, so the card opens with a full visual.
		const lively = liveliestTime(analysis, 0, buffer.duration);
		clockRef.current = { playing: false, startedAt: 0, offset: lively };
		freshRef.current = true;
		setPlaying(false);
		setPos(lively);
		setTrim([0, buffer.duration]);
		setClip({ name, duration: buffer.duration, track });
		setNote(capped ? "Clips can be up to a minute, so only the first minute is kept." : "");
		setStatus("ready");
		dirtyRef.current = true;
		return true;
	};

	const loadData = async (data: ArrayBuffer, name: string, failure: string, track: string | null = null) => {
		setProblem("");
		setStatus("loading");
		try {
			const { buffer, capped } = await decodeAudio(data);
			if (buffer.duration < 0.5) throw new Error("too short");
			return await loadBuffer(buffer, name, capped, track);
		} catch {
			setProblem(failure);
			setStatus("ready");
			return false;
		}
	};

	// An audio file from the visitor's device. It's decoded here and never sent anywhere.
	const openAudio = async (file: File | undefined) => {
		if (!file) return;
		pause();
		await loadData(await file.arrayBuffer(), file.name, "That file couldn't be read as audio. Try an MP3, WAV or M4A.");
	};

	const pickSample = () => {
		if (!sampleRef.current) return;
		pause();
		setProblem("");
		void loadBuffer(sampleRef.current, SAMPLE_NAME);
	};

	// A soundtrack from lib/soundtracks.ts. No music goes back to your own clip. Untouched titles follow along.
	const pickTrack = async (id: string | null) => {
		if (status === "exporting") return;
		const track = SOUNDTRACKS.find((t) => t.id === id);
		const typed = typedRef.current;
		if (!track) {
			const own = ownRef.current;
			if (!clip?.track || !own) return;
			pause();
			setProblem("");
			void loadBuffer(own.buffer, own.name);
			if (!typed.title) setTitle(TITLE);
			if (!typed.subtitle) setSubtitle(SUBTITLE);
			return;
		}
		pause();
		setProblem("");
		setStatus("loading");
		let data: ArrayBuffer;
		try {
			const res = await fetch(track.src);
			if (!res.ok) throw new Error(res.statusText);
			data = await res.arrayBuffer();
		} catch {
			setProblem("That track didn't load. Check your connection and try again.");
			setStatus("ready");
			return;
		}
		if (!(await loadData(data, track.title, "That track couldn't be read. Try another one.", track.id))) return;
		if (!typed.title) setTitle(track.title);
		if (!typed.subtitle) setSubtitle(`Music by ${track.artist}`);
	};

	const startRecording = () => {
		pause();
		setProblem("");
		void recorder.start();
	};

	const openImage = async (file: File | undefined) => {
		if (!file) return;
		const url = URL.createObjectURL(file);
		const img = new Image();
		img.src = url;
		try {
			await img.decode();
			imageRef.current = img;
			setImageName(file.name);
			setProblem("");
		} catch {
			setProblem("That file couldn't be opened as an image. Try a JPG or PNG.");
		} finally {
			URL.revokeObjectURL(url);
		}
	};

	const removeImage = () => {
		imageRef.current = null;
		setImageName("");
	};

	// Keeps the playhead on the same moment of the clip when it's still inside the new range.
	const changeTrim = (start: number, end: number) => {
		if (!clip) return;
		freshRef.current = false;
		if (clockRef.current.playing) pause();
		const at = trimRef.current[0] + clockRef.current.offset;
		const gap = Math.min(1, clip.duration / 2);
		const next: [number, number] = [Math.max(0, Math.min(start, end - gap)), Math.min(clip.duration, Math.max(end, start + gap))];
		setTrim(next);
		clockRef.current.offset = Math.min(Math.max(at - next[0], 0), next[1] - next[0]);
		setPos(clockRef.current.offset);
		dirtyRef.current = true;
	};

	const setTune = (key: keyof Tune) => (value: number | boolean) => setTunes((all) => ({ ...all, [visual]: { ...all[visual], [key]: value } }));

	const exportVideo = async () => {
		const buffer = bufferRef.current;
		const analysis = analysisRef.current;
		const scene = sceneRef.current;
		if (!buffer || !analysis || !scene) return;
		setProblem("");
		if (!videoFormat()) {
			setProblem("This browser can't record video. Try a recent Chrome, Edge or Safari.");
			return;
		}
		pause();
		const ac = ensureAudio();
		await ac.resume().catch(() => {});
		const [a, b] = trimRef.current;
		const length = b - a;
		// Full size: 1080 px on the short side.
		const [W, H] = SIZE[scene.aspect];
		const canvas = document.createElement("canvas");
		canvas.width = W;
		canvas.height = H;
		const ctx = canvas.getContext("2d")!;
		const frame = emptyFrame();
		const draw = (t: number) => {
			frameAt(analysis, a, t, scene.tune, frame);
			drawCard(ctx, scene, frame);
		};
		draw(0);
		const dest = ac.createMediaStreamDestination();
		let recording: ReturnType<typeof recordCanvas>;
		try {
			recording = recordCanvas(canvas, { fps: 30, audio: dest.stream });
		} catch (err) {
			setProblem(err instanceof Error ? err.message : "The video couldn't be recorded.");
			return;
		}
		const src = ac.createBufferSource();
		src.buffer = buffer;
		src.connect(dest);
		src.connect(ac.destination);
		const t0 = ac.currentTime + 0.2;
		src.start(t0, a, length);
		const time = () => Math.min(Math.max(ac.currentTime - t0, 0), length);

		setStatus("exporting");
		setExported(0);
		let cancelled = false;
		let raf = 0;
		await new Promise<void>((resolve) => {
			exportRef.current = {
				time,
				cancel: () => {
					cancelled = true;
					resolve();
				},
			};
			let lastUi = 0;
			const tick = (ts: number) => {
				if (cancelled) return;
				const t = ac.currentTime - t0;
				draw(Math.min(Math.max(t, 0), length));
				if (ts - lastUi > 150) {
					setExported(Math.min(Math.max(t / length, 0), 1));
					lastUi = ts;
				}
				// A short tail so the last frame and sound make it into the file.
				if (t >= length + 0.3) resolve();
				else raf = requestAnimationFrame(tick);
			};
			raf = requestAnimationFrame(tick);
		});
		cancelAnimationFrame(raf);
		exportRef.current = null;
		try {
			src.stop();
		} catch {
			// Already ended.
		}
		src.disconnect();
		const blob = await recording.stop();
		dest.stream.getTracks().forEach((t) => t.stop());
		clockRef.current = { playing: false, startedAt: 0, offset: cancelled ? 0 : length };
		setPos(clockRef.current.offset);
		dirtyRef.current = true;
		setStatus("ready");
		if (cancelled) return;
		if (!blob.size) {
			setProblem("The video came out empty. Try again, and keep this tab in front while it records.");
			return;
		}
		downloadBlob(blob, `clueso-audiogram.${recording.format.ext}`);
		setExported(1);
	};

	// The built-in sample and the site fonts, once on arrival.
	useEffect(() => {
		let alive = true;
		const loads = loadRef;
		void synthSample().then((buffer) => {
			if (!alive) return;
			sampleRef.current = buffer;
			void loadBuffer(buffer, SAMPLE_NAME);
		});
		void document.fonts.ready.then(() => {
			if (alive && titleProbeRef.current && textProbeRef.current) setFonts(readFonts(titleProbeRef.current, textProbeRef.current));
		});
		return () => {
			alive = false;
			loads.current++;
			exportRef.current?.cancel();
			stopSource();
			void acRef.current?.close();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// The chosen colours as RGB for the canvas, again whenever they or the theme change. A custom
	// choice made with fewer colours borrows the missing ones from the first preset.
	const presets = useMemo(() => palettes(dark), [dark]);
	const css = { ...presets[0].colors, ...colorsOf(colors, presets) };
	useEffect(() => {
		const probe = probeRef.current;
		if (probe) setPalette(resolvePalette(probe, { ground: css.ground, from: css.from, via: css.via, to: css.to, text: css.text }));
	}, [css.ground, css.from, css.via, css.to, css.text, dark]);

	// More colours on a custom choice start from the ones it has.
	const changeGradient = (next: Gradient) => {
		setGradient(next);
		if ("custom" in colors) setColors({ custom: { via: colors.custom.from, to: colors.custom.via ?? colors.custom.from, ...colors.custom } });
	};

	// Everything the card needs, handed to the draw loop.
	useEffect(() => {
		if (!palette || !fonts) return;
		sceneRef.current = { aspect, visual, placement, gradient, direction, tune, palette, fonts, title, subtitle, image: imageName ? imageRef.current : null };
		dirtyRef.current = true;
	}, [aspect, visual, placement, gradient, direction, tune, palette, fonts, title, subtitle, imageName]);

	// The draw loop: every frame while playing or exporting, otherwise only when something changed.
	useEffect(() => {
		const canvas = canvasRef.current;
		const ctx = canvas?.getContext("2d");
		if (!canvas || !ctx) return;
		const fit = () => {
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
			canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
			dirtyRef.current = true;
		};
		fit();
		const resize = new ResizeObserver(fit);
		resize.observe(canvas);
		const frameData = emptyFrame();
		let raf = 0;
		let lastUi = 0;
		const frame = (ts: number) => {
			raf = requestAnimationFrame(frame);
			const scene = sceneRef.current;
			const analysis = analysisRef.current;
			const exporting = exportRef.current;
			const live = clockRef.current.playing;
			if (!scene || !analysis || (!live && !exporting && !dirtyRef.current)) return;
			dirtyRef.current = false;
			const t = exporting ? exporting.time() : now();
			frameAt(analysis, trimRef.current[0], t, scene.tune, frameData);
			const [W, H] = SIZE[scene.aspect];
			ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
			drawCard(ctx, scene, frameData);
			// The player follows along while playing and while exporting.
			if ((live || exporting) && ts - lastUi > 50) {
				setPos(t);
				lastUi = ts;
			}
		};
		raf = requestAnimationFrame(frame);
		return () => {
			cancelAnimationFrame(raf);
			resize.disconnect();
		};
	}, []);

	const exporting = status === "exporting";
	const busy = status !== "ready" || recording;
	const visualLabel = VISUALS.find((v) => v.value === visual)!.label;
	const colorsLabel = "preset" in colors ? (presets.find((p) => p.id === colors.preset)?.label ?? "") : "Custom";
	const roles = ROLES[gradient];

	const stage = (
		<>
			{/* Fills the stage's width at the export's shape, but never so tall the player drops out of view. */}
			<div className={`relative mx-auto w-full overflow-hidden rounded-medium border border-neutral-weak bg-sunken-1 ${FRAME[aspect]}`} style={{ maxWidth: `calc((100svh - 13rem) * ${RATIO[aspect]})` }}>
				<canvas ref={canvasRef} role="img" aria-label={`Audiogram, ${aspect}, ${visualLabel.toLowerCase()} in ${colorsLabel.toLowerCase()}${"custom" in colors ? " colours" : ""}`} className="absolute inset-0 size-full" />
				{(status === "preparing" || status === "loading") && (
					<div className="absolute inset-0 flex items-center justify-center bg-sunken-1">
						<p className="type-text-s text-neutral-weak">{status === "preparing" ? "Making the sample" : "Reading the clip"}</p>
					</div>
				)}
				<span ref={probeRef} aria-hidden className="hidden" />
				<span ref={titleProbeRef} aria-hidden className="type-title-m hidden" />
				<span ref={textProbeRef} aria-hidden className="type-text-m hidden" />
			</div>

			<Player time={Math.min(pos, duration)} duration={duration} playing={playing} disabled={!ready} onPlayPause={() => (playing ? pause() : void play())} onSeek={seek} />
			{exporting && (
				<p role="status" className="type-text-s text-neutral-weak">
					Recording the video, {Math.round(exported * 100)}%
				</p>
			)}
			{problem && (
				<p role="alert" className="type-text-s text-negative-normal">
					{problem}
				</p>
			)}
		</>
	);

	const actions = (
		<>
			<Button variant="filled" sentiment="brand" size="medium" iconBefore icon={<DownloadIcon />} className="focus-ring" disabled={!ready || !format} onClick={exportVideo}>
				{exporting ? "Exporting" : "Export video"}
			</Button>
			{exporting && (
				<Button variant="transparent" sentiment="neutral" size="medium" className="focus-ring" onClick={() => exportRef.current?.cancel()}>
					Cancel
				</Button>
			)}
			{exporting ? (
				<div role="progressbar" aria-label="Export progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(exported * 100)} className="h-1.5 w-full overflow-hidden rounded-tiny bg-sunken-1">
					<div className="h-full bg-brand-normal transition-[width] duration-150 ease-linear" style={{ width: `${exported * 100}%` }} />
				</div>
			) : (
				<p className="type-text-xs w-full text-neutral-weak">
					Takes as long as the clip. Keep this tab in front.
					{format ? ` ${format.ext.toUpperCase()}, ${SIZE[aspect].join(" × ")}.` : ""}
				</p>
			)}
		</>
	);

	return (
		<ExperimentLayout stage={stage} actions={actions}>
			<ControlGroup title="Audio" summary={clip ? `${clip.name} · ${clock(duration)}` : undefined}>
				<Segmented label="Audio source" options={SOURCES} value={source} onChange={setSource} tiles disabled={recording || exporting} />
				{source === "sample" && (
					<div className="flex flex-col items-start gap-gap-xs">
						<p className="type-text-s text-neutral-weak">A short tune made in your browser, to try things out.</p>
						{clip && clip.name !== SAMPLE_NAME && (
							<Button variant="outlined" sentiment="neutral" size="medium" iconBefore icon={<WaveformIcon />} className="focus-ring" disabled={busy} onClick={pickSample}>
								Use the sample
							</Button>
						)}
					</div>
				)}
				{source === "file" && (
					<div className="flex flex-col items-start gap-gap-xs">
						<p className="type-text-s text-neutral-weak">An MP3, WAV or M4A, or the sound from a video.</p>
						<Button variant="outlined" sentiment="neutral" size="medium" iconBefore icon={<UploadIcon />} className="focus-ring" disabled={busy} onClick={() => audioFileRef.current?.click()}>
							Use a file
						</Button>
						<input
							ref={audioFileRef}
							type="file"
							accept="audio/*,video/*"
							aria-label="Choose an audio file"
							className="hidden"
							onChange={(e) => {
								void openAudio(e.target.files?.[0]);
								e.target.value = "";
							}}
						/>
					</div>
				)}
				{source === "record" &&
					(recording ? (
						<RecordingBar recorder={recorder} />
					) : (
						<div className="flex flex-col items-start gap-gap-xs">
							<p className="type-text-s text-neutral-weak">Talk into your microphone. It stops by itself at a minute.</p>
							<Button variant="outlined" sentiment="neutral" size="medium" iconBefore icon={<RecordIcon />} className="focus-ring" disabled={busy} onClick={startRecording}>
								{clip?.name === "Your recording" ? "Record again" : "Start recording"}
							</Button>
							{recorder.error && (
								<p role="alert" className="type-text-s text-negative-normal">
									{recorder.error}
								</p>
							)}
						</div>
					))}
				{source === "soundtracks" && (
					<SoundtrackPicker
						noneLabel="Your own audio"
						noneHint="The sample, a file or your recording"
						value={clip?.track ?? null}
						onChange={(id) => void pickTrack(id)}
						paused={playing}
						disabled={busy}
						// A preview pauses the card, and playing the card stops the preview (`paused`).
						onPreview={(on) => {
							if (on && clockRef.current.playing) pause();
						}}
					/>
				)}
				{note && <p className="type-text-s text-neutral-weak">{note}</p>}
				{clip && (
					<Advanced label="Trim">
						<Slider label="Start" unit="s" min={0} max={Math.round(clip.duration * 10) / 10} step={0.1} value={trim[0]} disabled={!ready || exporting} onValueChange={(v) => changeTrim(v, trim[1])} />
						<Slider label="End" unit="s" min={0} max={Math.round(clip.duration * 10) / 10} step={0.1} value={trim[1]} disabled={!ready || exporting} onValueChange={(v) => changeTrim(trim[0], v)} />
					</Advanced>
				)}
			</ControlGroup>

			<ControlGroup
				title="Style"
				summary={`${visualLabel} · ${PLACEMENTS.find((p) => p.value === placement)!.label}`}
				defaultOpen
				action={
					<Button variant="transparent" sentiment="neutral" size="small" className="focus-ring" disabled={exporting} onClick={() => setTunes((all) => ({ ...all, [visual]: TUNES[visual] }))}>
						Reset
					</Button>
				}
			>
				<Segmented label="Style" options={VISUALS} value={visual} onChange={setVisual} tiles disabled={exporting} />
				<div className="flex flex-col gap-gap-2xs">
					<span className="type-text-s text-neutral-weak">Placement</span>
					<Segmented label="Placement" options={PLACEMENTS} value={placement} onChange={setPlacement} disabled={exporting} />
				</div>
				<Advanced>
					{TUNABLE[visual].includes("width") && <Slider label={WIDTH_LABEL[visual]} unit="px" min={1} max={visual === "blocks" ? 80 : 40} step={1} value={tune.width} onValueChange={(v) => setTune("width")(Math.round(v))} />}
					{TUNABLE[visual].includes("gap") && <Slider label="Gap" unit="px" min={0} max={30} step={1} value={tune.gap} onValueChange={(v) => setTune("gap")(Math.round(v))} />}
					{TUNABLE[visual].includes("round") && <Slider label="Roundness" unit="%" min={0} max={100} step={5} value={percent(tune.round)} onValueChange={(v) => setTune("round")(v / 100)} />}
					<Slider label="Glow" unit="%" min={0} max={100} step={5} value={percent(tune.glow)} onValueChange={(v) => setTune("glow")(v / 100)} />
					<Slider label="Sensitivity" unit="%" min={50} max={200} step={5} value={percent(tune.sensitivity)} onValueChange={(v) => setTune("sensitivity")(v / 100)} />
					{TUNABLE[visual].includes("smoothing") && <Slider label="Smoothing" unit="%" min={0} max={90} step={5} value={percent(tune.smoothing)} onValueChange={(v) => setTune("smoothing")(v / 100)} />}
					{TUNABLE[visual].includes("mirror") && (
						<label className="type-text-s flex items-center gap-gap-xs text-neutral-normal">
							<ToggleSwitch checked={tune.mirror} onChange={setTune("mirror")} disabled={exporting} />
							Mirror, low notes in the middle
						</label>
					)}
				</Advanced>
			</ControlGroup>

			<ControlGroup title="Colours" summary={`${colorsLabel} · ${GRADIENTS.find((g) => g.value === gradient)!.label.toLowerCase()}`}>
				<ColorChoice label="Colours" roles={roles} presets={presets} value={colors} onChange={setColors} disabled={exporting} />
				<div className="flex flex-col gap-gap-2xs">
					<span className="type-text-s text-neutral-weak">Gradient</span>
					<Segmented label="Gradient" options={GRADIENTS} value={gradient} onChange={changeGradient} disabled={exporting} />
				</div>
				{gradient !== "solid" && visual !== "aura" && (
					<div className="flex flex-col gap-gap-2xs">
						<span className="type-text-s text-neutral-weak">{visual === "ring" ? "Direction: around the ring or outwards" : "Direction: along the visual or from its base to its tips"}</span>
						<Segmented label="Gradient direction" options={DIRECTIONS} value={direction} onChange={setDirection} disabled={exporting} />
					</div>
				)}
			</ControlGroup>

			<ControlGroup title="Card" summary={`${aspect} · ${title.trim() || "No title"}`}>
				<div className="flex flex-col gap-gap-2xs">
					<span className="type-text-s text-neutral-weak">Shape</span>
					<Segmented label="Shape" options={ASPECTS} value={aspect} onChange={setAspect} disabled={exporting} />
				</div>
				<label className="flex flex-col gap-gap-2xs">
					<span className="type-text-s text-neutral-weak">Title</span>
					<InputGroup>
						<InputGroupInput
							maxLength={80}
							value={title}
							disabled={exporting}
							onChange={(e) => {
								typedRef.current.title = true;
								setTitle(e.target.value);
							}}
							placeholder="Episode name"
						/>
					</InputGroup>
				</label>
				<label className="flex flex-col gap-gap-2xs">
					<span className="type-text-s text-neutral-weak">Subtitle</span>
					<InputGroup>
						<InputGroupInput
							maxLength={80}
							value={subtitle}
							disabled={exporting}
							onChange={(e) => {
								typedRef.current.subtitle = true;
								setSubtitle(e.target.value);
							}}
							placeholder="Speaker"
						/>
					</InputGroup>
				</label>
				<div className="flex flex-col gap-gap-2xs">
					<span className="type-text-s text-neutral-weak">{imageName ? `Image: ${imageName}` : "Image, shown beside the title"}</span>
					<div className="flex flex-wrap items-center gap-gap-xs">
						<Button variant="outlined" sentiment="neutral" size="small" iconBefore icon={<UploadIcon />} className="focus-ring" disabled={exporting} onClick={() => imageFileRef.current?.click()}>
							{imageName ? "Change image" : "Add image"}
						</Button>
						{imageName && (
							<Button variant="transparent" sentiment="neutral" size="small" className="focus-ring" disabled={exporting} onClick={removeImage}>
								Remove
							</Button>
						)}
					</div>
					<input
						ref={imageFileRef}
						type="file"
						accept="image/*"
						aria-label="Choose an image"
						className="hidden"
						onChange={(e) => {
							void openImage(e.target.files?.[0]);
							e.target.value = "";
						}}
					/>
				</div>
			</ControlGroup>
		</ExperimentLayout>
	);
}
