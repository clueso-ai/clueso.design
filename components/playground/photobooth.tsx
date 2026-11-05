"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Button, InputGroup, InputGroupInput, Slider, ToggleSwitch } from "@/lib/design-system";
import { BinIcon, CameraIcon, DownloadIcon, RecordIcon, StopIcon, UploadIcon, VideoCameraIcon, VideoCameraOffIcon } from "@/lib/design-system/icons";
import {
	type BoothColors,
	BoothRenderer,
	composeStrip,
	download,
	type Effect,
	type GlyphSet,
	type Look,
	type Palette,
	resolvePalette,
	SHAPE_RATIO,
	type Shape,
	TEXT_MAX,
	thumbnail,
} from "@/lib/photobooth";
import { type AudioRoute, ensureDuration, hasAudio, recordSize, routeAudio } from "@/lib/photobooth-video";
import { db, musicBed } from "@/lib/music-bed";
import { downloadBlob, type Recording, recordCanvas, type VideoFormat, videoFormat } from "@/lib/record-canvas";
import { SOUNDTRACKS, trackTitle } from "@/lib/soundtracks";
import { clock } from "@/lib/waveform";
import { type ColorPreset, type ColorRole, ColorChoice, type ColorValue, colorLabel, colorsOf } from "./ui/color-choice";
import { Advanced, ControlGroup, ExperimentLayout } from "./ui/experiment-layout";
import { Player } from "./ui/player";
import { RecPill } from "./ui/recorder";
import { labelOf, Segmented, type SegmentedOption } from "./ui/segmented";
import { SoundtrackPicker } from "./ui/soundtrack-picker";

// Pink photobooth: the visitor's camera, or a photo or video they pick, redrawn live in a palette of
// site tokens or their own colours. Each frame the picture is drawn small, read back as pixels and painted onto the stage as
// glyphs, halftone dots, chunky pixels or a duotone (lib/photobooth.ts). Snap saves the stage as a
// PNG, Strip stacks four shots like a booth strip, Record saves a short clip, and a video file can
// be restyled whole, sound and all (lib/photobooth-video.ts), with optional music under either
// (lib/music-bed.ts). Nothing leaves the browser.

const EFFECTS: SegmentedOption<Effect>[] = [
	{ value: "glyphs", label: "Glyphs" },
	{ value: "halftone", label: "Halftone" },
	{ value: "pixels", label: "Pixels" },
	{ value: "duotone", label: "Duotone" },
];
const GLYPH_SETS: SegmentedOption<GlyphSet>[] = [
	{ value: "symbols", label: "Symbols" },
	{ value: "blocks", label: "Blocks" },
	{ value: "letters", label: "Letters" },
	{ value: "text", label: "Your text" },
];
const SHAPES: SegmentedOption<Shape>[] = [
	{ value: "4:3", label: "4:3" },
	{ value: "1:1", label: "1:1" },
	{ value: "9:16", label: "Story" },
];
const TIMERS: SegmentedOption<"0" | "3" | "5">[] = [
	{ value: "0", label: "Off" },
	{ value: "3", label: "3 s" },
	{ value: "5", label: "5 s" },
];
const LENGTHS: SegmentedOption<"3" | "5" | "10">[] = [
	{ value: "3", label: "3 s" },
	{ value: "5", label: "5 s" },
	{ value: "10", label: "10 s" },
];
const ASPECT: Record<Shape, string> = { "4:3": "aspect-4/3", "1:1": "aspect-square", "9:16": "aspect-9/16" };

const COLOR_ROLES: ColorRole[] = [
	{ id: "ground", label: "Ground" },
	{ id: "ink", label: "Ink" },
	{ id: "peak", label: "Peak" },
];
/** The palettes, from site tokens. Peak is Ink where a palette has no third colour. */
function colorPresets(dark: boolean): ColorPreset[] {
	// The lightest neutral: the page in light mode, the strongest text in dark mode.
	const light = dark ? "var(--fg-neutral-strong)" : "var(--surface-page)";
	const page = "var(--surface-page)";
	const strong = "var(--fg-neutral-strong)";
	return [
		{ id: "pink-paper", label: "Pink on paper", colors: { ground: page, ink: "var(--fg-brand-normal)", peak: strong } },
		// The portrait backdrop is the same near-black in both modes.
		{ id: "pink-ink", label: "Pink on ink", colors: { ground: "var(--surface-portrait)", ink: "var(--bg-brand-normal)", peak: light } },
		{ id: "ink-paper", label: "Ink on paper", colors: { ground: page, ink: strong, peak: strong } },
		{ id: "paper-pink", label: "Paper on pink", colors: { ground: "var(--bg-brand-normal)", ink: light, peak: light } },
		{ id: "accent-paper", label: "Accent on paper", colors: { ground: page, ink: "var(--fg-accent-normal)", peak: strong } },
	];
}

type Status = "idle" | "starting" | "live" | "blocked" | "missing" | "unsupported" | "failed" | "badPhoto" | "badVideo";
type Source = "camera" | "photo" | "video";
type Clip = { url: string; blob: Blob; name: string };
const PROBLEMS: Partial<Record<Status, string>> = {
	blocked: "Camera access is blocked. Allow it in your browser's site settings, then try again.",
	missing: "No camera found. Connect one, or use a photo instead.",
	unsupported: "This browser can't open a camera here. You can use a photo instead.",
	failed: "The camera didn't start. Try again.",
	badPhoto: "That file couldn't be opened as an image. Try another.",
	badVideo: "That file couldn't be played as a video. Try another.",
};

const EASE = [0.23, 1, 0.32, 1] as const;

// Light or dark, from the class the site theme sets on <html>.
const watchTheme = (onChange: () => void) => {
	const observer = new MutationObserver(onChange);
	observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
	return () => observer.disconnect();
};
const isDark = () => document.documentElement.classList.contains("dark");

// The video format this browser can record, read once on the client. Null on the server.
let format: VideoFormat | null | undefined;
const noWatch = () => () => {};
const recordFormat = () => (format === undefined ? (format = videoFormat()) : format);

export function Photobooth() {
	const reduce = useReducedMotion();
	const dark = useSyncExternalStore(watchTheme, isDark, () => false);
	const canRecord = useSyncExternalStore(noWatch, recordFormat, () => null) !== null;

	const [status, setStatus] = useState<Status>("idle");
	const [source, setSource] = useState<Source>("camera");
	const [effect, setEffect] = useState<Effect>("glyphs");
	const [glyphs, setGlyphs] = useState<GlyphSet>("symbols");
	const [text, setText] = useState("");
	const [cols, setCols] = useState(96);
	const [color, setColor] = useState<ColorValue>({ preset: "pink-paper" });
	const [contrast, setContrast] = useState(100);
	const [brightness, setBrightness] = useState(0);
	const [invert, setInvert] = useState(false);
	const [shape, setShape] = useState<Shape>("4:3");
	const [timer, setTimer] = useState<"0" | "3" | "5">("0");
	const [busy, setBusy] = useState(false);
	const [count, setCount] = useState(0);
	const [shot, setShot] = useState(0);
	const [strip, setStrip] = useState<string[]>([]);
	const [flash, setFlash] = useState(0);
	const [length, setLength] = useState<"3" | "5" | "10">("3");
	// Recording the live stage, or restyling a video file: seconds in, out of how many.
	const [recording, setRecording] = useState<{ kind: "live" | "restyle"; elapsed: number; total: number } | null>(null);
	const [music, setMusic] = useState<string | null>(null);
	const [clip, setClip] = useState<Clip | null>(null);

	const videoRef = useRef<HTMLVideoElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const probeRef = useRef<HTMLSpanElement>(null);
	const fileRef = useRef<HTMLInputElement>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const photoRef = useRef<HTMLImageElement | null>(null);
	const fileVideoRef = useRef<HTMLVideoElement>(null);
	const videoFileRef = useRef<HTMLInputElement>(null);
	const videoUrlRef = useRef<string | null>(null);
	const audioRef = useRef<AudioRoute | null>(null);
	// While recording, the loop draws at the clip's size into this canvas and copies it to the stage.
	const targetRef = useRef<HTMLCanvasElement | null>(null);
	const recRef = useRef<Recording | null>(null);
	const recStopRef = useRef(false);
	const mountedRef = useRef(false);
	// The draw loop reads these each frame instead of restarting when they change.
	const lookRef = useRef<Look>({ effect, glyphs, text, cols, ratio: SHAPE_RATIO[shape], contrast: 1, brightness: 0, invert, mirror: true, swirl: true });
	const paletteRef = useRef<Palette | null>(null);
	// A copy of the next frame, handed over by the loop when asked (for the strip).
	const grabRef = useRef<((frame: HTMLCanvasElement) => void) | null>(null);
	// Bumped to cancel a countdown or strip in progress.
	const runRef = useRef(0);
	const timersRef = useRef<number[]>([]);

	useEffect(() => {
		lookRef.current = {
			effect,
			glyphs,
			text,
			cols,
			ratio: SHAPE_RATIO[shape],
			contrast: contrast / 100,
			brightness: brightness / 100,
			invert,
			mirror: source === "camera",
			swirl: !reduce,
		};
	}, [effect, glyphs, text, cols, shape, contrast, brightness, invert, source, reduce]);

	// Resolve the colours again whenever they or the theme change. Presets are new objects per theme.
	const presets = useMemo(() => colorPresets(dark), [dark]);
	const colors = colorsOf(color, presets) as BoothColors;
	useEffect(() => {
		if (probeRef.current) paletteRef.current = resolvePalette(probeRef.current, colors);
	}, [colors]);

	const cancelShoot = () => {
		runRef.current++;
		timersRef.current.forEach((id) => clearTimeout(id));
		timersRef.current = [];
		grabRef.current = null;
		setBusy(false);
		setCount(0);
		setShot(0);
	};

	const stopFileVideo = () => {
		fileVideoRef.current?.pause();
	};

	const discardClip = () => {
		if (clip) URL.revokeObjectURL(clip.url);
		setClip(null);
	};

	const stopStream = () => {
		streamRef.current?.getTracks().forEach((t) => t.stop());
		streamRef.current = null;
		if (videoRef.current) videoRef.current.srcObject = null;
	};

	// Leaving the page turns the camera off and stops any countdown.
	useEffect(() => {
		mountedRef.current = true;
		const timers = timersRef;
		const rec = recRef;
		const audio = audioRef;
		const videoUrl = videoUrlRef;
		return () => {
			mountedRef.current = false;
			timers.current.forEach((id) => clearTimeout(id));
			stopStream();
			void rec.current?.stop();
			void audio.current?.context.close();
			if (videoUrl.current) URL.revokeObjectURL(videoUrl.current);
		};
	}, []);

	const startCamera = async () => {
		cancelShoot();
		if (!navigator.mediaDevices?.getUserMedia) {
			setStatus("unsupported");
			return;
		}
		setStatus("starting");
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } },
				audio: false,
			});
			streamRef.current = stream;
			if (!mountedRef.current || !videoRef.current) {
				stopStream();
				return;
			}
			videoRef.current.srcObject = stream;
			await videoRef.current.play();
			stopFileVideo();
			setSource("camera");
			setStatus("live");
		} catch (err) {
			stopStream();
			const name = err instanceof DOMException ? err.name : "";
			if (name === "NotAllowedError" || name === "SecurityError") setStatus("blocked");
			else if (name === "NotFoundError" || name === "OverconstrainedError") setStatus("missing");
			else setStatus("failed");
		}
	};

	// A photo from the visitor's device. It's decoded here and never sent anywhere.
	const openPhoto = async (file: File | undefined) => {
		if (!file) return;
		cancelShoot();
		const url = URL.createObjectURL(file);
		const img = new Image();
		img.src = url;
		try {
			await img.decode();
		} catch {
			URL.revokeObjectURL(url);
			setStatus("badPhoto");
			return;
		}
		URL.revokeObjectURL(url);
		stopStream();
		stopFileVideo();
		photoRef.current = img;
		setSource("photo");
		setStatus("live");
	};

	// A video from the visitor's device. It plays muted on a loop and the effects run on it live.
	const openVideo = async (file: File | undefined) => {
		const video = fileVideoRef.current;
		if (!file || !video) return;
		cancelShoot();
		if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
		videoUrlRef.current = URL.createObjectURL(file);
		video.src = videoUrlRef.current;
		video.muted = true;
		video.loop = true;
		try {
			await video.play();
		} catch {
			setStatus("badVideo");
			return;
		}
		stopStream();
		photoRef.current = null;
		setSource("video");
		setStatus("live");
	};

	const stop = () => {
		cancelShoot();
		stopStream();
		stopFileVideo();
		photoRef.current = null;
		setStatus("idle");
	};

	const wait = (ms: number) =>
		new Promise<void>((resolve) => {
			const id = window.setTimeout(() => {
				timersRef.current = timersRef.current.filter((t) => t !== id);
				resolve();
			}, ms);
			timersRef.current.push(id);
		});

	/** Counts down on the stage. False if it was cancelled on the way. */
	const countdown = async (seconds: number, run: number) => {
		for (let s = seconds; s > 0; s--) {
			setCount(s);
			await wait(1000);
			if (run !== runRef.current) return false;
		}
		setCount(0);
		return true;
	};

	const snap = async () => {
		const canvas = canvasRef.current;
		if (!canvas || busy) return;
		const run = ++runRef.current;
		setBusy(true);
		if (!(await countdown(Number(timer), run))) return;
		download(canvas, "clueso-photobooth.png");
		setFlash((f) => f + 1);
		setBusy(false);
	};

	const shootStrip = async () => {
		if (busy) return;
		const run = ++runRef.current;
		setBusy(true);
		setStrip([]);
		if (!(await countdown(Number(timer) || 3, run))) return;
		const shots: HTMLCanvasElement[] = [];
		for (let i = 0; i < 4; i++) {
			if (i > 0) await wait(1000);
			if (run !== runRef.current) return;
			setShot(i + 1);
			shots.push(await new Promise<HTMLCanvasElement>((resolve) => (grabRef.current = resolve)));
			setFlash((f) => f + 1);
		}
		const palette = paletteRef.current;
		if (run !== runRef.current || !palette) return;
		download(composeStrip(shots, palette), "clueso-photobooth-strip.png");
		setStrip(shots.map((s) => thumbnail(s, 160)));
		setShot(0);
		setBusy(false);
	};

	const showClip = (blob: Blob, rec: Recording, name: string) => {
		setClip({ url: URL.createObjectURL(blob), blob, name: `${name}.${rec.format.ext}` });
	};

	/** Starts recording the look into a canvas at the clip's size, in the chosen shape. */
	const startRecording = (audio?: MediaStream) => {
		const target = document.createElement("canvas");
		Object.assign(target, recordSize(SHAPE_RATIO[shape]));
		targetRef.current = target;
		recStopRef.current = false;
		recRef.current = recordCanvas(target, { fps: 30, audio });
		return recRef.current;
	};

	const finishRecording = async (rec: Recording) => {
		const blob = await rec.stop();
		recRef.current = null;
		targetRef.current = null;
		setRecording(null);
		return blob;
	};

	/** The chosen music, loaded and ready to start, or null for none (or when it won't load). */
	const loadMusic = (length: number, into?: AudioNode, gain = 1) => {
		const track = SOUNDTRACKS.find((t) => t.id === music);
		return track ? musicBed(track.src, { length, into, gain }).catch(() => null) : Promise.resolve(null);
	};

	// Record: a clip of the live stage, effects and all, after the timer.
	const recordClip = async () => {
		if (busy) return;
		const run = ++runRef.current;
		setBusy(true);
		discardClip();
		const total = Number(length);
		const ready = loadMusic(total);
		if (!(await countdown(Number(timer), run))) {
			(await ready)?.close();
			return;
		}
		const bed = await ready;
		const rec = startRecording(bed?.stream);
		const playing = bed?.start();
		const start = performance.now();
		for (let elapsed = 0; elapsed < total * 1000 && !recStopRef.current && run === runRef.current; elapsed = performance.now() - start) {
			setRecording({ kind: "live", elapsed: elapsed / 1000, total });
			await wait(100);
		}
		await playing?.stop();
		const blob = await finishRecording(rec);
		bed?.close();
		if (run !== runRef.current) return;
		showClip(blob, rec, "clueso-photobooth");
		setBusy(false);
	};

	// Restyle the whole clip: play the video file once from the start through the current look and
	// record it in real time, with its sound when it has any. Music sits 10 dB under that sound, or
	// is the only sound when the clip has none.
	const restyleClip = async () => {
		const video = fileVideoRef.current;
		if (busy || !video) return;
		const run = ++runRef.current;
		setBusy(true);
		discardClip();
		video.pause();
		video.loop = false;
		await ensureDuration(video);
		video.currentTime = 0;
		let route: AudioRoute | undefined;
		if (hasAudio(video)) {
			route = audioRef.current = routeAudio(video, audioRef.current);
			await route.context.resume();
			// Unmuted so the sound reaches the recording. It isn't routed to the speakers.
			video.muted = false;
		}
		const total = video.duration;
		const bed = await loadMusic(total, route?.destination, route ? db(-10) : 1);
		const rec = startRecording(route?.stream ?? bed?.stream);
		setRecording({ kind: "restyle", elapsed: 0, total });
		await video.play();
		const playing = bed?.start();
		while (!video.ended && !recStopRef.current && run === runRef.current) {
			setRecording({ kind: "restyle", elapsed: video.currentTime, total });
			await wait(100);
		}
		await playing?.stop();
		const blob = await finishRecording(rec);
		bed?.close();
		video.muted = true;
		video.loop = true;
		void video.play();
		if (run !== runRef.current) return;
		showClip(blob, rec, "clueso-photobooth-clip");
		setBusy(false);
	};

	// The draw loop, while there's a camera, photo or video to draw.
	useEffect(() => {
		if (status !== "live") return;
		const video = videoRef.current;
		const fileVideo = fileVideoRef.current;
		const canvas = canvasRef.current;
		const probe = probeRef.current;
		const ctx = canvas?.getContext("2d");
		if (!video || !canvas || !probe || !ctx) return;
		const renderer = new BoothRenderer();

		const fit = () => {
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			canvas.width = Math.round(canvas.clientWidth * dpr);
			canvas.height = Math.round(canvas.clientHeight * dpr);
		};
		fit();
		const resize = new ResizeObserver(fit);
		resize.observe(canvas);

		let raf = 0;
		const frame = (t: number) => {
			raf = requestAnimationFrame(frame);
			const palette = paletteRef.current;
			const photo = photoRef.current;
			const moving = source === "camera" ? video : fileVideo;
			const img = source === "photo" ? photo : moving;
			const w = source === "photo" ? (photo?.naturalWidth ?? 0) : (moving?.videoWidth ?? 0);
			const h = source === "photo" ? (photo?.naturalHeight ?? 0) : (moving?.videoHeight ?? 0);
			if (!palette || !img || !w || !h || canvas.width < 2 || canvas.height < 2) return;
			if (moving && source !== "photo" && moving.readyState < 2) return;
			// The glyphs' font comes from the page: Geist Mono.
			const code = getComputedStyle(canvas).fontFamily;
			const target = targetRef.current;
			const tctx = target?.getContext("2d");
			if (target && tctx) {
				// Recording: draw once at the clip's size, then show that on the stage.
				renderer.render(tctx, target.width, target.height, img, w, h, lookRef.current, palette, code, t);
				ctx.drawImage(target, 0, 0, canvas.width, canvas.height);
			} else {
				renderer.render(ctx, canvas.width, canvas.height, img, w, h, lookRef.current, palette, code, t);
			}
			if (grabRef.current) {
				const copy = document.createElement("canvas");
				copy.width = canvas.width;
				copy.height = canvas.height;
				copy.getContext("2d")!.drawImage(canvas, 0, 0);
				grabRef.current(copy);
				grabRef.current = null;
			}
		};
		raf = requestAnimationFrame(frame);

		return () => {
			cancelAnimationFrame(raf);
			resize.disconnect();
		};
	}, [status, source]);

	const live = status === "live";
	const problem = PROBLEMS[status];
	const progress = recording ? recording.elapsed / Math.max(0.001, recording.total) : 0;
	const effectName = EFFECTS.find((e) => e.value === effect)?.label ?? "";
	const colorName = "preset" in color ? presets.find((p) => p.id === color.preset)?.label.toLowerCase() : "your colours";

	const stage = (
		<>
			{/* The stage takes the chosen shape on small screens. From lg up it keeps 4:3 and the
			    picture sits inside it, so a story frame doesn't run off the bottom of the window. */}
			<div className={`relative flex w-full justify-center overflow-hidden rounded-medium border border-neutral-weak bg-sunken-1 ${ASPECT[shape]} lg:aspect-4/3`}>
				<div className={`relative h-full max-w-full ${ASPECT[shape]}`}>
					<canvas
						ref={canvasRef}
						role="img"
						aria-label={`Your ${source} in ${colorName}, drawn as ${effectName.toLowerCase()}`}
						className={`font-code absolute inset-0 size-full ${live ? "" : "invisible"}`}
					/>
				</div>
				{/* Plays the camera for the canvas to read. Kept in the page so every browser keeps decoding it. */}
				<video ref={videoRef} aria-hidden muted playsInline className="pointer-events-none absolute size-px opacity-0" />
				<video ref={fileVideoRef} aria-hidden muted loop playsInline className="pointer-events-none absolute size-px opacity-0" />
				<span ref={probeRef} aria-hidden className="font-text hidden" />

				{!live && (
					<div className="absolute inset-0 flex flex-col items-center justify-center gap-gap-s p-gap-l text-center">
						<h2 className="type-title-s text-neutral-strong">Step into the booth</h2>
						<p className="type-text-s max-w-measure text-pretty text-neutral-weak">Your video stays in this browser. Nothing is uploaded or saved.</p>
						<div className="flex flex-wrap justify-center gap-gap-xs">
							<Button variant="filled" sentiment="neutral" size="medium" iconBefore icon={<VideoCameraIcon />} className="focus-ring" disabled={status === "starting"} onClick={startCamera}>
								{status === "starting" ? "Starting camera" : "Turn on camera"}
							</Button>
							<Button variant="outlined" sentiment="neutral" size="medium" iconBefore icon={<UploadIcon />} className="focus-ring" onClick={() => fileRef.current?.click()}>
								Use a photo
							</Button>
							<Button variant="outlined" sentiment="neutral" size="medium" iconBefore icon={<UploadIcon />} className="focus-ring" onClick={() => videoFileRef.current?.click()}>
								Use a video
							</Button>
						</div>
						<p role="status" className="type-text-s max-w-measure text-pretty text-neutral-strong">
							{problem}
						</p>
					</div>
				)}

				{recording && (
					<div aria-hidden className="pointer-events-none absolute top-gap-s left-gap-s flex items-center gap-gap-xs rounded-medium bg-raised-1 py-gap-3xs pr-gap-xs pl-gap-3xs shadow-raised">
						<RecPill />
						<span className="type-text-s font-code tabular-nums text-neutral-strong">
							{clock(recording.elapsed)} <span className="text-neutral-weak">/ {clock(recording.total)}</span>
						</span>
					</div>
				)}

				{count > 0 && (
					<div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
						<motion.span
							key={count}
							initial={reduce ? false : { scale: 1.4, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							transition={{ duration: 0.3, ease: EASE }}
							className="type-title-2xl flex size-32 items-center justify-center rounded-large bg-raised-1 text-neutral-strong tabular-nums shadow-raised"
						>
							{count}
						</motion.span>
					</div>
				)}

				{/* A quick flash on each shot. Left out with reduced motion. */}
				{flash > 0 && !reduce && (
					<motion.div
						key={flash}
						aria-hidden
						initial={{ opacity: 0.85 }}
						animate={{ opacity: 0 }}
						transition={{ duration: 0.45, ease: EASE }}
						className="pointer-events-none absolute inset-0 bg-raised-1 dark:bg-neutral-inverted"
					/>
				)}
			</div>
			<p role="status" className="type-text-s text-neutral-weak">
				{count > 0
					? `Starting in ${count}`
					: recording?.kind === "live"
						? `Recording, ${Math.ceil(recording.total - recording.elapsed)} s left`
						: recording?.kind === "restyle"
							? `Restyling the clip, ${Math.round(progress * 100)}%`
							: shot > 0
								? `Shot ${shot} of 4`
								: ""}
			</p>
		</>
	);

	// The main actions, pinned under the panel. While a clip is restyled, its progress and Cancel.
	const actions =
		recording?.kind === "restyle" ? (
			<>
				<div role="progressbar" aria-label="Restyling" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} className="h-1 min-w-0 flex-1 overflow-hidden rounded-tiny bg-sunken-1">
					<div className="h-full bg-brand-normal" style={{ width: `${progress * 100}%` }} />
				</div>
				<Button variant="transparent" sentiment="neutral" size="medium" className="focus-ring" onClick={cancelShoot}>
					Cancel
				</Button>
			</>
		) : (
			<>
				<Button variant="filled" sentiment="brand" size="medium" iconBefore icon={<CameraIcon />} className="focus-ring" disabled={!live || busy} onClick={snap}>
					Snap
				</Button>
				<Button variant="outlined" sentiment="neutral" size="medium" className="focus-ring" disabled={!live || busy} onClick={shootStrip}>
					Strip
				</Button>
				{canRecord &&
					(recording?.kind === "live" ? (
						<Button variant="filled" sentiment="neutral" size="medium" iconBefore icon={<StopIcon />} className="focus-ring" onClick={() => (recStopRef.current = true)}>
							Stop
						</Button>
					) : (
						<Button variant="outlined" sentiment="neutral" size="medium" iconBefore icon={<RecordIcon />} className="focus-ring" disabled={!live || busy} onClick={recordClip}>
							Record
						</Button>
					))}
				{canRecord && source === "video" && live && !recording && (
					<Button variant="outlined" sentiment="neutral" size="medium" className="focus-ring" disabled={busy} onClick={restyleClip}>
						Restyle the whole clip
					</Button>
				)}
				{busy && !recording && (
					<Button variant="transparent" sentiment="neutral" size="medium" className="focus-ring" onClick={cancelShoot}>
						Cancel
					</Button>
				)}
			</>
		);

	return (
		<ExperimentLayout stage={stage} actions={actions}>
			<ControlGroup title="Source" summary={!live ? "Off" : source === "camera" ? "Camera" : source === "video" ? "Video" : "Photo"}>
				<div className="flex flex-wrap items-center gap-gap-xs">
					{live && source === "camera" ? (
						<Button variant="outlined" sentiment="neutral" size="medium" iconBefore icon={<VideoCameraOffIcon />} className="focus-ring" onClick={stop}>
							Turn off camera
						</Button>
					) : (
						<Button variant="outlined" sentiment="neutral" size="medium" iconBefore icon={<VideoCameraIcon />} className="focus-ring" disabled={status === "starting"} onClick={startCamera}>
							Turn on camera
						</Button>
					)}
					<Button variant="transparent" sentiment="neutral" size="medium" iconBefore icon={<UploadIcon />} className="focus-ring" onClick={() => fileRef.current?.click()}>
						Use a photo
					</Button>
					<Button variant="transparent" sentiment="neutral" size="medium" iconBefore icon={<UploadIcon />} className="focus-ring" onClick={() => videoFileRef.current?.click()}>
						Use a video
					</Button>
				</div>
				{canRecord && source === "video" && live && <p className="type-text-s text-neutral-weak">Restyle the whole clip plays it once from the start, silently. Its sound is kept in the file.</p>}
				<input
					ref={fileRef}
					type="file"
					accept="image/*"
					aria-label="Choose a photo"
					className="hidden"
					onChange={(e) => {
						void openPhoto(e.target.files?.[0]);
						e.target.value = "";
					}}
				/>
				<input
					ref={videoFileRef}
					type="file"
					accept="video/*"
					aria-label="Choose a video"
					className="hidden"
					onChange={(e) => {
						void openVideo(e.target.files?.[0]);
						e.target.value = "";
					}}
				/>
			</ControlGroup>

			<ControlGroup title="Look" summary={labelOf(EFFECTS, effect)}>
				<Segmented label="Effect" options={EFFECTS} value={effect} onChange={setEffect} />
				{effect === "glyphs" && (
					<>
						<Segmented label="Glyph text" options={GLYPH_SETS} value={glyphs} onChange={setGlyphs} />
						{glyphs === "text" && (
							<label className="flex flex-col gap-gap-2xs">
								<span className="type-text-s text-neutral-weak">Your text, tiled across the picture</span>
								<InputGroup>
									<InputGroupInput maxLength={TEXT_MAX} value={text} onChange={(e) => setText(e.target.value)} placeholder="Your name" />
								</InputGroup>
							</label>
						)}
					</>
				)}
				<Slider label="Density" unit="cols" min={40} max={160} step={4} value={cols} onValueChange={(v) => setCols(Math.round(v))} />
			</ControlGroup>

			<ControlGroup title="Colour" summary={colorLabel(color, presets)}>
				<ColorChoice label="Colours" roles={COLOR_ROLES} presets={presets} value={color} onChange={setColor} />
				{"custom" in color && <p className="type-text-s text-neutral-weak">Ground fills the frame and Ink draws the glyphs and dots. Pixels and Duotone run from Ground through Ink to Peak.</p>}
				<Advanced>
					<Slider label="Contrast" unit="%" min={50} max={200} step={5} value={contrast} onValueChange={(v) => setContrast(Math.round(v))} />
					<Slider label="Brightness" min={-50} max={50} step={1} value={brightness} onValueChange={(v) => setBrightness(Math.round(v))} />
					<label className="type-text-s flex items-center gap-gap-xs text-neutral-normal">
						<ToggleSwitch checked={invert} onChange={setInvert} />
						Invert
					</label>
				</Advanced>
			</ControlGroup>

			<ControlGroup title="Frame" summary={labelOf(SHAPES, shape)}>
				<Segmented label="Shape" options={SHAPES} value={shape} onChange={setShape} disabled={recording !== null} />
			</ControlGroup>

			<ControlGroup title="Timing" summary={timer === "0" ? "No timer" : `${labelOf(TIMERS, timer)} timer`}>
				<div className="flex flex-col gap-gap-2xs">
					<span className="type-text-s text-neutral-weak">Timer</span>
					<Segmented label="Timer" options={TIMERS} value={timer} onChange={setTimer} />
				</div>
				{canRecord ? (
					<div className="flex flex-col gap-gap-2xs">
						<span className="type-text-s text-neutral-weak">Clip length</span>
						<Segmented label="Clip length" options={LENGTHS} value={length} onChange={setLength} disabled={busy} />
					</div>
				) : (
					<p className="type-text-s text-neutral-weak">This browser can&apos;t record video, so Record is hidden.</p>
				)}
			</ControlGroup>

			{canRecord && (
				<ControlGroup title="Music" summary={trackTitle(music)}>
					<p className="type-text-s text-neutral-weak">Plays under the clips you record or restyle.</p>
					<SoundtrackPicker value={music} onChange={setMusic} paused={busy} disabled={busy} />
				</ControlGroup>
			)}

			{clip && (
				<ControlGroup title="Your clip" defaultOpen>
					<ClipPreview key={clip.url} url={clip.url} />
					<div className="flex flex-wrap items-center gap-gap-xs">
						<Button variant="filled" sentiment="brand" size="medium" iconBefore icon={<DownloadIcon />} className="focus-ring" onClick={() => downloadBlob(clip.blob, clip.name)}>
							Download
						</Button>
						<Button variant="transparent" sentiment="neutral" size="medium" iconBefore icon={<BinIcon />} className="focus-ring" onClick={discardClip}>
							Discard
						</Button>
					</div>
				</ControlGroup>
			)}

			{strip.length > 0 && (
				<ControlGroup title="Your last strip" defaultOpen>
					<div className="grid grid-cols-4 gap-gap-2xs">
						{strip.map((url, i) => (
							<div
								key={i}
								role="img"
								aria-label={`Shot ${i + 1}`}
								className={`${ASPECT[shape]} rounded-tiny border border-neutral-weak bg-cover bg-center`}
								style={{ backgroundImage: `url(${url})` }}
							/>
						))}
					</div>
				</ControlGroup>
			)}
		</ExperimentLayout>
	);
}

/** The recorded clip, with the timeline's transport bar under it. */
function ClipPreview({ url }: { url: string }) {
	const ref = useRef<HTMLVideoElement>(null);
	const [time, setTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [playing, setPlaying] = useState(false);

	useEffect(() => {
		const video = ref.current;
		if (!video) return;
		let raf = 0;
		let gone = false;
		// The time follows every frame while it plays.
		const tick = () => {
			setTime(video.currentTime);
			raf = requestAnimationFrame(tick);
		};
		const onPlay = () => {
			setPlaying(true);
			raf = requestAnimationFrame(tick);
		};
		const onPause = () => {
			cancelAnimationFrame(raf);
			setPlaying(false);
			setTime(video.currentTime);
		};
		const onSeeked = () => setTime(video.currentTime);
		video.addEventListener("play", onPlay);
		video.addEventListener("pause", onPause);
		video.addEventListener("seeked", onSeeked);
		void ensureDuration(video).then(() => !gone && setDuration(video.duration));
		return () => {
			gone = true;
			cancelAnimationFrame(raf);
			video.removeEventListener("play", onPlay);
			video.removeEventListener("pause", onPause);
			video.removeEventListener("seeked", onSeeked);
		};
	}, []);

	return (
		<div className="flex flex-col gap-gap-xs">
			<div className="flex justify-center overflow-hidden rounded-medium border border-neutral-weak bg-sunken-1">
				<video ref={ref} src={url} preload="auto" playsInline aria-label="Your recorded clip" className="max-h-64 w-auto max-w-full" />
			</div>
			<Player
				time={time}
				duration={duration}
				playing={playing}
				disabled={!duration}
				onPlayPause={() => {
					const video = ref.current;
					if (video?.paused) void video.play();
					else video?.pause();
				}}
				onSeek={(t) => {
					if (!ref.current) return;
					ref.current.currentTime = t;
					setTime(t);
				}}
			/>
		</div>
	);
}
