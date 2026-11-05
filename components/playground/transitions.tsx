"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Button, type GifTimelineClip, type GifTimelineFrame, Slider } from "@/lib/design-system";
import { DownloadIcon, ShuffleIcon, SpeakerIcon, SpeakerMutedIcon, UploadIcon } from "@/lib/design-system/icons";
import { downloadBlob, recordCanvas, videoFormat } from "@/lib/record-canvas";
import { SCENES } from "@/lib/scenes";
import { playTransitionSound } from "@/lib/transition-sounds";
import {
	type Corner,
	type Direction,
	drawTransition,
	EASINGS,
	type EasingId,
	flatScene,
	frameAt,
	handover,
	type Look,
	loopLength,
	midpoint,
	readColor,
	resolveTones,
	type Scene,
	type Timing,
	type Tones,
	TRANSITIONS,
	type TransitionId,
} from "@/lib/transitions";
import { ColorChoice, type ColorPreset, type ColorValue, colorLabel } from "./ui/color-choice";
import { Advanced, ControlGroup, ExperimentLayout } from "./ui/experiment-layout";
import { labelOf, Segmented, type SegmentedOption } from "./ui/segmented";
import { Timeline } from "./ui/timeline";

// Transition lab: two scenes joined by a transition cut from Clueso's shapes. The preview loops
// hold A, A to B, hold B on a canvas (lib/transitions.ts draws every frame), on the product's
// timeline, with a short sound for each transition (lib/transition-sounds.ts). The scenes start as
// two short clips (lib/scenes.ts); visitors can swap in their own picture or video, tune the timing,
// and export the loop as a video with its sound. Nothing is uploaded.

const DIRECTIONS: SegmentedOption<Direction>[] = [
	{ value: "left", label: "Left" },
	{ value: "right", label: "Right" },
	{ value: "up", label: "Up" },
	{ value: "down", label: "Down" },
];
const CORNERS: SegmentedOption<Corner>[] = [
	{ value: "tl", label: "Top left" },
	{ value: "tr", label: "Top right" },
	{ value: "bl", label: "Bottom left" },
	{ value: "br", label: "Bottom right" },
];
const EDGE_ROLES = [{ id: "edge", label: "Edge" }];
const EDGES: ColorPreset[] = [
	{ id: "none", label: "None", colors: { edge: "transparent" } },
	{ id: "pink", label: "Pink", colors: { edge: "var(--bg-brand-normal)" } },
	{ id: "ink", label: "Ink", colors: { edge: "var(--surface-portrait)" } },
];
type Aspect = "16:9" | "1:1" | "9:16";
const ASPECTS: SegmentedOption<Aspect>[] = [
	{ value: "16:9", label: "16:9" },
	{ value: "1:1", label: "1:1" },
	{ value: "9:16", label: "9:16" },
];
const ASPECT_CLASS: Record<Aspect, string> = { "16:9": "aspect-video", "1:1": "aspect-square", "9:16": "aspect-9/16" };
const EXPORT_SIZE: Record<Aspect, [number, number]> = { "16:9": [1920, 1080], "1:1": [1080, 1080], "9:16": [1080, 1920] };

/** A scene the visitor sees: what to draw, its name, a thumbnail, and where it came from. */
type SceneSlot = Scene & { kind: "image" | "video"; name: string; thumb: string; href: string; owned: boolean; video?: HTMLVideoElement };
type Slot = "a" | "b";
const SLOTS: Slot[] = ["a", "b"];

/** Colours read from the page: the transition's tones, each edge preset, and the gallery's two. */
type Palette = { tones: Tones; edges: Record<string, { css: string; lum: number }>; icon: { a: string; b: string }; font: string };

type ExportState = { phase: "idle" | "recording" | "done" | "failed"; progress: number; message: string };

// The visitor's motion setting. The server renders as if motion is fine, so hydration matches.
const REDUCE = "(prefers-reduced-motion: reduce)";
const watchMotion = (onChange: () => void) => {
	const mq = window.matchMedia(REDUCE);
	mq.addEventListener("change", onChange);
	return () => mq.removeEventListener("change", onChange);
};
const prefersReduced = () => window.matchMedia(REDUCE).matches;

const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];
const round = (v: number, step: number) => Math.round(v / step) * step;

/** One step of the timeline's frame buttons. */
const FRAME = 1 / 30;
/** Live sounds are scheduled this far ahead, so they land on the frame the transition starts. */
const LEAD = 0.05;

export function Transitions() {
	const reduce = useSyncExternalStore(watchMotion, prefersReduced, () => false);

	const [id, setId] = useState<TransitionId>("bars");
	const [easing, setEasing] = useState<EasingId>("out");
	const [direction, setDirection] = useState<Direction>("right");
	const [corner, setCorner] = useState<Corner>("bl");
	const [edgeChoice, setEdgeChoice] = useState<ColorValue>({ preset: "pink" });
	const [duration, setDuration] = useState(0.9);
	const [holdBefore, setHoldBefore] = useState(1);
	const [holdAfter, setHoldAfter] = useState(1);
	const [aspect, setAspect] = useState<Aspect>("16:9");
	const [sound, setSound] = useState(true);
	const [scenes, setScenes] = useState<Partial<Record<Slot, SceneSlot>>>({});
	const [fileProblem, setFileProblem] = useState("");
	// "auto" follows the visitor's motion setting: playing, or paused when they ask for less motion.
	const [playState, setPlayState] = useState<"auto" | "playing" | "paused">("auto");
	const [exp, setExp] = useState<ExportState>({ phase: "idle", progress: 0, message: "" });
	const [palette, setPalette] = useState<Palette | null>(null);

	const playing = playState === "auto" ? !reduce : playState === "playing";
	const timing: Timing = useMemo(() => ({ duration, holdBefore, holdAfter }), [duration, holdBefore, holdAfter]);
	const total = loopLength(timing);
	const meta = TRANSITIONS.find((t) => t.id === id)!;
	const look: Look | null = useMemo(() => {
		if (!palette) return null;
		let edge: string | null = null;
		let edgeDark = false;
		if ("custom" in edgeChoice) {
			// Custom colours are oklch(), which the canvas draws as is. Lightness says if it's dark.
			edge = edgeChoice.custom.edge;
			edgeDark = Number(/oklch\(([\d.]+)/.exec(edge)?.[1] ?? 1) < 0.5;
		} else if (edgeChoice.preset !== "none") {
			const c = palette.edges[edgeChoice.preset];
			edge = c.css;
			edgeDark = c.lum < 0.3;
		}
		return { easing, direction, corner, edge, edgeDark, font: palette.font, tones: palette.tones };
	}, [easing, direction, corner, edgeChoice, palette]);

	const canvasRef = useRef<HTMLCanvasElement>(null);
	const probeRef = useRef<HTMLSpanElement>(null);
	const holderRef = useRef<HTMLDivElement>(null);
	const fileRef = useRef<HTMLInputElement>(null);
	const slotRef = useRef<Slot>("a");
	const scenesRef = useRef(scenes);
	// The draw loop reads these each frame instead of restarting when they change. The timeline
	// reads the time too.
	const timeRef = useRef(0);
	const playingRef = useRef(playing);
	const soundRef = useRef(sound);
	const dirtyRef = useRef(true);
	const settingsRef = useRef<{ id: TransitionId; look: Look | null; timing: Timing }>({ id, look, timing });
	const exportCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const exportRunRef = useRef(0);
	// Made on the visitor's first press, so the browser lets it play.
	const audioRef = useRef<AudioContext | null>(null);

	useEffect(() => {
		settingsRef.current = { id, look, timing };
		dirtyRef.current = true;
	}, [id, look, timing]);

	useEffect(() => {
		scenesRef.current = scenes;
		dirtyRef.current = true;
	}, [scenes]);

	useEffect(() => {
		playingRef.current = playing;
	}, [playing]);

	useEffect(() => {
		soundRef.current = sound;
	}, [sound]);

	// Colours and the glyph font come from the page. Read them again when the theme changes.
	useEffect(() => {
		const read = () => {
			const probe = probeRef.current;
			const canvas = canvasRef.current;
			if (!probe || !canvas) return;
			setPalette({
				tones: resolveTones(probe),
				edges: Object.fromEntries(EDGES.map((p) => [p.id, readColor(probe, p.colors.edge)])),
				icon: { a: readColor(probe, "var(--surface-page)").css, b: readColor(probe, "var(--fg-neutral-strong)").css },
				font: getComputedStyle(canvas).fontFamily || "monospace",
			});
		};
		const raf = requestAnimationFrame(read);
		const observer = new MutationObserver(read);
		observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme", "style"] });
		document.fonts?.ready.then(read);
		return () => {
			cancelAnimationFrame(raf);
			observer.disconnect();
		};
	}, []);

	// The two default scenes: the poster first, then the clip itself once it can draw.
	useEffect(() => {
		let live = true;
		SLOTS.forEach(async (slot, i) => {
			const clip = SCENES[i];
			const poster = new Image();
			poster.src = clip.poster;
			try {
				await poster.decode();
			} catch {
				return;
			}
			if (!live || scenesRef.current[slot]) return;
			const video = makeVideo(clip.src);
			holderRef.current?.appendChild(video);
			const first: SceneSlot = { kind: "video", src: poster, w: poster.naturalWidth, h: poster.naturalHeight, name: clip.title, thumb: clip.poster, href: clip.src, owned: false, video };
			setScenes((s) => ({ ...s, [slot]: first }));
			video.addEventListener(
				"loadeddata",
				() => {
					if (!live) return;
					setScenes((s) => (s[slot] === first ? { ...s, [slot]: { ...first, src: video, w: video.videoWidth, h: video.videoHeight } } : s));
				},
				{ once: true },
			);
		});
		return () => {
			live = false;
		};
	}, []);

	// The browser only lets sound play after a press, so the context is made (or woken) on one.
	useEffect(() => {
		const wake = () => {
			audioRef.current ??= new AudioContext();
			if (audioRef.current.state !== "running") void audioRef.current.resume();
		};
		window.addEventListener("pointerdown", wake, true);
		window.addEventListener("keydown", wake, true);
		return () => {
			window.removeEventListener("pointerdown", wake, true);
			window.removeEventListener("keydown", wake, true);
			void audioRef.current?.close();
			audioRef.current = null;
		};
	}, []);

	// Leaving the page stops any export and lets go of the scenes.
	useEffect(() => {
		const run = exportRunRef;
		const held = scenesRef;
		return () => {
			run.current++;
			Object.values(held.current).forEach((s) => release(s));
		};
	}, []);

	// The preview loop. It keeps the clips on the timeline's clock, plays the transition's sound as
	// it starts, and draws when something changed, every frame while playing, and always for video.
	useEffect(() => {
		const canvas = canvasRef.current;
		const ctx = canvas?.getContext("2d");
		if (!canvas || !ctx) return;
		const fit = () => {
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			canvas.width = Math.round(canvas.clientWidth * dpr);
			canvas.height = Math.round(canvas.clientHeight * dpr);
			dirtyRef.current = true;
		};
		fit();
		const resize = new ResizeObserver(fit);
		resize.observe(canvas);

		let raf = 0;
		let last = performance.now();
		const frame = (now: number) => {
			raf = requestAnimationFrame(frame);
			const dt = Math.min(0.1, (now - last) / 1000);
			last = now;
			const exporting = exportCanvasRef.current;
			if (exporting) {
				ctx.drawImage(exporting, 0, 0, canvas.width, canvas.height);
				return;
			}
			const { id, look, timing } = settingsRef.current;
			const len = loopLength(timing);
			const { a, b } = scenesRef.current;
			if (playingRef.current) {
				const prev = timeRef.current;
				const next = (prev + dt) % len;
				timeRef.current = next;
				dirtyRef.current = true;
				const audio = audioRef.current;
				const wait = ahead(prev, next, timing.holdBefore, len);
				if (soundRef.current && audio?.state === "running" && wait !== null) playTransitionSound(audio, audio.destination, id, audio.currentTime + wait, timing.duration);
			}
			syncVideos([a, b], timeRef.current, playingRef.current);
			const moving = a?.kind === "video" || b?.kind === "video";
			if (!dirtyRef.current && !moving) return;
			dirtyRef.current = false;
			if (!look || !a || !b || canvas.width < 2) return;
			drawTransition(ctx, canvas.width, canvas.height, id, frameAt(timing, Math.min(timeRef.current, len)), a, b, look);
		};
		raf = requestAnimationFrame(frame);
		return () => {
			cancelAnimationFrame(raf);
			resize.disconnect();
		};
	}, []);

	// With reduced motion the preview starts paused, partway through the transition.
	useEffect(() => {
		if (!reduce || timeRef.current !== 0) return;
		const { timing, look } = settingsRef.current;
		timeRef.current = timing.holdBefore + timing.duration * midpoint(look?.easing ?? "out");
		dirtyRef.current = true;
	}, [reduce]);

	/** Moves the preview to `time` and draws it. */
	const seek = (time: number) => {
		timeRef.current = Math.max(0, Math.min(time, total - 0.001));
		dirtyRef.current = true;
	};

	/** Seeks and pauses, for scrubbing and stepping on the timeline. */
	const scrub = (time: number) => {
		setPlayState("paused");
		seek(time);
	};

	/** Shows a new transition: just before it starts while playing, or partway through while paused. */
	const show = (next: TransitionId, tm: Timing = timing, ease: EasingId = easing) => {
		setId(next);
		seek(playing ? Math.max(0, tm.holdBefore - 0.25) : tm.holdBefore + tm.duration * midpoint(ease));
	};

	const shuffle = () => {
		const next = pick(TRANSITIONS.filter((t) => t.id !== id)).id;
		const d = round(0.5 + Math.random() * 0.9, 0.05);
		const ease = pick(EASINGS).value;
		setEasing(ease);
		setDirection(pick(DIRECTIONS).value);
		setCorner(pick(CORNERS).value);
		setEdgeChoice({ preset: pick(EDGES).id });
		setDuration(d);
		show(next, { duration: d, holdBefore, holdAfter }, ease);
	};

	const openFile = async (slot: Slot, file: File | undefined) => {
		if (!file) return;
		setFileProblem("");
		const url = URL.createObjectURL(file);
		let next: SceneSlot;
		try {
			if (file.type.startsWith("video/")) {
				const video = makeVideo(url);
				await new Promise<void>((resolve, reject) => {
					video.onloadeddata = () => resolve();
					video.onerror = () => reject(new Error("bad video"));
				});
				// Kept in the page so every browser keeps decoding it.
				holderRef.current?.appendChild(video);
				next = { kind: "video", src: video, video, w: video.videoWidth, h: video.videoHeight, name: file.name, thumb: snapshot(video, video.videoWidth, video.videoHeight), href: url, owned: true };
			} else {
				const img = new Image();
				img.src = url;
				await img.decode();
				next = { kind: "image", src: img, w: img.naturalWidth, h: img.naturalHeight, name: file.name, thumb: url, href: url, owned: true };
			}
		} catch {
			URL.revokeObjectURL(url);
			setFileProblem("That file couldn't be opened. Try another picture or a short video.");
			return;
		}
		release(scenesRef.current[slot]);
		setScenes((s) => ({ ...s, [slot]: next }));
	};

	const cancelExport = () => {
		exportRunRef.current++;
		exportCanvasRef.current = null;
		dirtyRef.current = true;
		setExp({ phase: "idle", progress: 0, message: "Export cancelled" });
	};

	// Renders the loop once in real time on a full-size canvas and records it. With sound on, the
	// transition's sound goes into the file at the moment it starts, and out of the speakers too.
	const exportClip = async () => {
		const { id, look, timing } = settingsRef.current;
		const { a, b } = scenesRef.current;
		if (!look || !a || !b || exp.phase === "recording") return;
		if (!videoFormat()) {
			setExp({ phase: "failed", progress: 0, message: "This browser can't record video. Try a recent Chrome, Edge or Safari." });
			return;
		}
		const [w, h] = EXPORT_SIZE[aspect];
		const canvas = document.createElement("canvas");
		canvas.width = w;
		canvas.height = h;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		const run = ++exportRunRef.current;
		const length = loopLength(timing);
		// Made during the click, so the browser lets it play.
		const audio = sound ? new AudioContext() : null;
		const out = audio?.createMediaStreamDestination();
		const draw = (time: number) => drawTransition(ctx, w, h, id, frameAt(timing, time), a, b, look);
		setExp({ phase: "recording", progress: 0, message: "" });
		// Both clips start from their first frame.
		await Promise.all([a, b].map((s) => s.video && seekVideo(s.video, 0)));
		if (run !== exportRunRef.current) {
			void audio?.close();
			return;
		}
		draw(0);
		exportCanvasRef.current = canvas;
		let recording: ReturnType<typeof recordCanvas>;
		try {
			await audio?.resume();
			recording = recordCanvas(canvas, { fps: 30, audio: out?.stream });
		} catch (err) {
			void audio?.close();
			exportCanvasRef.current = null;
			setExp({ phase: "failed", progress: 0, message: err instanceof Error ? err.message : "Recording didn't start." });
			return;
		}
		if (audio && out) {
			const bus = audio.createGain();
			bus.connect(out);
			bus.connect(audio.destination);
			playTransitionSound(audio, bus, id, audio.currentTime + timing.holdBefore, timing.duration);
		}
		// A short tail after the last frame so the recorder keeps it.
		const tail = 0.2;
		await new Promise<void>((resolve) => {
			const start = performance.now();
			let shown = 0;
			const step = (now: number) => {
				if (run !== exportRunRef.current) return resolve();
				const time = (now - start) / 1000;
				syncVideos([a, b], Math.min(time, length), true);
				draw(Math.min(time, length));
				if (now - shown > 100) {
					shown = now;
					setExp({ phase: "recording", progress: Math.min(1, time / length), message: "" });
				}
				if (time >= length + tail) resolve();
				else requestAnimationFrame(step);
			};
			requestAnimationFrame(step);
		});
		const blob = await recording.stop();
		void audio?.close();
		if (run !== exportRunRef.current) return;
		exportCanvasRef.current = null;
		dirtyRef.current = true;
		if (!blob.size) {
			setExp({ phase: "failed", progress: 0, message: "The recording came out empty. Try again." });
			return;
		}
		downloadBlob(blob, `clueso-transition.${recording.format.ext}`);
		setExp({ phase: "done", progress: 1, message: `Saved clueso-transition.${recording.format.ext}` });
	};

	const recordingNow = exp.phase === "recording";
	const [ew, eh] = EXPORT_SIZE[aspect];
	const now = useCallback(() => timeRef.current, []);
	const clips = useClips({ id, a: scenes.a, b: scenes.b, look, timing, ratio: ew / eh });
	const status = recordingNow
		? `Recording ${Math.round(exp.progress * 100)}%`
		: exp.message || (reduce && !playing ? "Reduced motion is on, so the preview starts paused. Press Play to watch it." : "");

	const stage = (
		<>
			{/* The stage takes the chosen shape on small screens. From lg up it stays 16:9 and the
			    frame sits inside it, so a 9:16 frame doesn't run off the bottom of the window. */}
			<div className={`relative flex w-full justify-center overflow-hidden rounded-medium border border-neutral-weak bg-sunken-1 ${ASPECT_CLASS[aspect]} lg:aspect-video`}>
				<div className={`relative h-full max-w-full ${ASPECT_CLASS[aspect]}`}>
					<canvas ref={canvasRef} role="img" aria-label={`${meta.name} from scene A to scene B`} className="font-code absolute inset-0 size-full" />
				</div>
				<span ref={probeRef} aria-hidden className="hidden" />
				<div ref={holderRef} aria-hidden className="pointer-events-none absolute size-px overflow-hidden opacity-0" />
			</div>

			<Timeline duration={total} now={now} paused={!playing} disabled={recordingNow} frames={[]} clips={clips} step={FRAME} onSeek={scrub} onJump={seek} onPlayPause={() => setPlayState(playing ? "paused" : "playing")} />
			<div className="flex flex-wrap items-center gap-gap-xs">
				<Button variant="outlined" sentiment="neutral" size="medium" iconBefore icon={<ShuffleIcon />} className="focus-ring" disabled={recordingNow} onClick={shuffle}>
					Shuffle
				</Button>
				<Button variant="outlined" sentiment="neutral" size="medium" iconBefore icon={sound ? <SpeakerIcon /> : <SpeakerMutedIcon />} aria-pressed={sound} className="focus-ring" disabled={recordingNow} onClick={() => setSound(!sound)}>
					Sound
				</Button>
				<span className="type-text-s ml-auto text-neutral-weak">{meta.name}</span>
			</div>
			<p role="status" className="type-text-s min-h-5 text-neutral-weak">
				{status}
			</p>
		</>
	);

	const actions = recordingNow ? (
		<div className="flex flex-1 items-center gap-gap-s">
			<div className="h-1.5 flex-1 overflow-hidden rounded-tiny bg-sunken-1" role="progressbar" aria-label="Export progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(exp.progress * 100)}>
				<div className="h-full bg-brand-normal" style={{ width: `${exp.progress * 100}%` }} />
			</div>
			<Button variant="outlined" sentiment="neutral" size="medium" className="focus-ring" onClick={cancelExport}>
				Cancel
			</Button>
		</div>
	) : (
		<>
			<Button variant="filled" sentiment="brand" size="medium" iconBefore icon={<DownloadIcon />} className="focus-ring" disabled={!look || !scenes.a || !scenes.b} onClick={() => void exportClip()}>
				Export video
			</Button>
			<span className="type-text-s text-neutral-weak">
				{total.toFixed(1)} s at {ew} × {eh}
				{sound ? ", with sound" : ""}
			</span>
		</>
	);

	return (
		<ExperimentLayout stage={stage} actions={actions}>
			<ControlGroup title="Transition" summary={meta.name} defaultOpen>
				<div role="radiogroup" aria-label="Transition" className="grid grid-cols-5 gap-gap-2xs">
					{TRANSITIONS.map((t) => (
						<GalleryItem key={t.id} id={t.id} label={t.short} title={t.name} on={t.id === id} look={look} iconTones={palette?.icon ?? null} still={reduce} disabled={recordingNow} onPick={() => show(t.id)} />
					))}
				</div>
				{meta.uses === "direction" && <Segmented label="Direction" options={DIRECTIONS} value={direction} onChange={setDirection} />}
				{meta.uses === "corner" && <Segmented label="Corner" options={CORNERS} value={corner} onChange={setCorner} />}
				{meta.uses === null && <p className="type-text-s text-neutral-weak">{meta.name} has no direction.</p>}
			</ControlGroup>

			<ControlGroup title="Scenes" summary={`${scenes.a?.name ?? "A"} to ${scenes.b?.name ?? "B"}`}>
				<div className="grid grid-cols-2 gap-gap-s">
					{SLOTS.map((slot) => (
						<SceneCard
							key={slot}
							label={`Scene ${slot.toUpperCase()}`}
							scene={scenes[slot]}
							disabled={recordingNow}
							onReplace={() => {
								slotRef.current = slot;
								fileRef.current?.click();
							}}
						/>
					))}
				</div>
				{fileProblem && (
					<p role="alert" className="type-text-s text-negative-normal">
						{fileProblem}
					</p>
				)}
				<p className="type-text-xs text-neutral-weak">Starter clips from the National Park Service and NASA, in the public domain.</p>
				<input
					ref={fileRef}
					type="file"
					accept="image/*,video/*"
					aria-label="Choose a picture or video"
					className="hidden"
					onChange={(e) => {
						void openFile(slotRef.current, e.target.files?.[0]);
						e.target.value = "";
					}}
				/>
			</ControlGroup>

			<ControlGroup title="Timing" summary={`${duration.toFixed(2)} s, ${labelOf(EASINGS, easing).toLowerCase()}`}>
				<Slider label="Duration" unit="s" min={0.3} max={2} step={0.05} value={duration} onValueChange={setDuration} />
				<Segmented label="Easing" options={EASINGS} value={easing} onChange={setEasing} />
				<Advanced>
					<Slider label="Hold before" unit="s" min={0} max={2} step={0.1} value={holdBefore} onValueChange={setHoldBefore} />
					<Slider label="Hold after" unit="s" min={0} max={2} step={0.1} value={holdAfter} onValueChange={setHoldAfter} />
				</Advanced>
			</ControlGroup>

			<ControlGroup title="Look" summary={`${colorLabel(edgeChoice, EDGES)}, ${labelOf(ASPECTS, aspect)}`}>
				<div className="flex flex-col gap-gap-2xs">
					<span className="type-text-s text-neutral-weak">Edge colour</span>
					<ColorChoice label="Edge colour" roles={EDGE_ROLES} presets={EDGES} value={edgeChoice} onChange={setEdgeChoice} />
				</div>
				<div className="flex flex-col gap-gap-2xs">
					<span className="type-text-s text-neutral-weak">Aspect</span>
					<Segmented label="Aspect" options={ASPECTS} value={aspect} onChange={setAspect} disabled={recordingNow} />
				</div>
			</ControlGroup>
		</ExperimentLayout>
	);
}

/**
 * How long until the transition starts (at `mark`), when the playhead moving from `prev` to `next`
 * brings it within LEAD of now. Null otherwise. Times wrap around the loop.
 */
function ahead(prev: number, next: number, mark: number, len: number) {
	const from = (prev + LEAD) % len;
	const to = (next + LEAD) % len;
	const hit = from <= to ? from < mark && mark <= to : from < mark || mark <= to;
	return hit ? Math.min(LEAD, (((mark - next) % len) + len) % len) : null;
}

/** A muted, looping video that plays inline, for a scene. */
function makeVideo(src: string) {
	const video = document.createElement("video");
	video.muted = true;
	video.loop = true;
	video.playsInline = true;
	video.preload = "auto";
	video.src = src;
	return video;
}

/** Keeps each video scene on the timeline's clock: playing along with it, or paused on its frame. */
function syncVideos(scenes: (SceneSlot | undefined)[], time: number, playing: boolean) {
	for (const s of scenes) {
		const v = s?.video;
		if (!v || v.readyState < 1 || !v.duration || v.seeking) continue;
		const target = time % v.duration;
		const off = Math.abs(v.currentTime - target);
		const drift = Math.min(off, v.duration - off);
		if (playing) {
			if (v.paused) void v.play().catch(() => {});
			if (drift > 0.25) v.currentTime = target;
		} else {
			if (!v.paused) v.pause();
			if (drift > 0.02) v.currentTime = target;
		}
	}
}

/** Seeks a video and waits until its frame is ready, or a second at most. */
function seekVideo(v: HTMLVideoElement, time: number) {
	return new Promise<void>((resolve) => {
		const done = () => {
			v.removeEventListener("seeked", done);
			clearTimeout(timer);
			resolve();
		};
		const timer = setTimeout(done, 1000);
		v.addEventListener("seeked", done);
		v.currentTime = v.duration ? time % v.duration : 0;
	});
}

/** Pauses and lets go of a scene. */
function release(s: SceneSlot | undefined) {
	if (!s) return;
	s.video?.pause();
	s.video?.remove();
	if (s.owned) URL.revokeObjectURL(s.href);
}

/** A small still of a video frame for its thumbnail. */
function snapshot(src: CanvasImageSource, w: number, h: number) {
	const c = document.createElement("canvas");
	c.width = 240;
	c.height = Math.max(1, Math.round((240 * h) / Math.max(1, w)));
	c.getContext("2d")?.drawImage(src, 0, 0, c.width, c.height);
	return c.toDataURL("image/jpeg", 0.8);
}

function SceneCard({ label, scene, disabled, onReplace }: { label: string; scene: SceneSlot | undefined; disabled: boolean; onReplace: () => void }) {
	return (
		<div className="flex min-w-0 flex-col gap-gap-2xs">
			<div
				role="img"
				aria-label={scene ? `${label}: ${scene.name}` : `${label}: loading`}
				className="aspect-video w-full rounded-small border border-neutral-weak bg-sunken-1 bg-cover bg-center"
				style={scene ? { backgroundImage: `url(${scene.thumb})` } : undefined}
			/>
			<div className="flex min-w-0 flex-col">
				<span className="type-text-s text-neutral-strong">{label}</span>
				<span className="type-text-xs truncate text-neutral-weak">{scene ? `${scene.name}${scene.kind === "video" ? ", video" : ""}` : "Loading"}</span>
			</div>
			<Button variant="outlined" sentiment="neutral" size="small" iconBefore icon={<UploadIcon />} className="focus-ring w-fit" disabled={disabled} onClick={onReplace}>
				Replace
			</Button>
		</div>
	);
}

/** One transition in the gallery: a tiny drawing of it halfway through, played on hover. */
function GalleryItem({
	id,
	label,
	title,
	on,
	look,
	iconTones,
	still,
	disabled,
	onPick,
}: {
	id: TransitionId;
	label: string;
	title: string;
	on: boolean;
	look: Look | null;
	iconTones: { a: string; b: string } | null;
	still: boolean;
	disabled: boolean;
	onPick: () => void;
}) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [hover, setHover] = useState(false);

	useEffect(() => {
		const canvas = canvasRef.current;
		const ctx = canvas?.getContext("2d");
		if (!canvas || !ctx || !look || !iconTones) return;
		const a = flatScene(iconTones.a, iconTones.b);
		const b = flatScene(iconTones.b, iconTones.a);
		const draw = (t: number) => drawTransition(ctx, canvas.width, canvas.height, id, t, a, b, look);
		if (!hover || still) {
			// The zoom only shows once B has landed, so its still is from later on.
			draw(id === "zoom" ? 0.7 : midpoint(look.easing));
			return;
		}
		// On hover it plays on a loop: a beat on A, the transition, a beat on B.
		let raf = 0;
		const start = performance.now();
		const frame = (now: number) => {
			raf = requestAnimationFrame(frame);
			const x = ((now - start) / 1600) % 1;
			draw(Math.min(1, Math.max(0, (x - 0.15) / 0.6)));
		};
		raf = requestAnimationFrame(frame);
		return () => cancelAnimationFrame(raf);
	}, [id, look, iconTones, hover, still]);

	return (
		<button
			type="button"
			role="radio"
			aria-checked={on}
			aria-label={title}
			disabled={disabled}
			onClick={onPick}
			onPointerEnter={() => setHover(true)}
			onPointerLeave={() => setHover(false)}
			className={`focus-ring flex min-w-0 flex-col gap-gap-3xs rounded-medium border p-gap-3xs transition-[background-color,color,box-shadow,border-color] duration-200 ease-out-strong disabled:opacity-50 ${on ? "border-neutral-normal bg-raised-2 text-neutral-strong shadow-raised" : "border-neutral-weak text-neutral-weak hover:text-neutral-strong"}`}
		>
			<canvas ref={canvasRef} width={160} height={90} aria-hidden className="font-code aspect-video w-full rounded-small" />
			<span className="type-text-xs truncate">{label}</span>
		</button>
	);
}

/** Timeline stills are drawn this tall: twice the strip, for sharp screens. */
const THUMB_HEIGHT = 92;

type ClipInput = { id: TransitionId; a?: SceneSlot; b?: SceneSlot; look: Look | null; timing: Timing; ratio: number };

/**
 * The timeline's two clips: scene A until halfway through the transition, where B takes over, then
 * B to the end. Each gets stills of its part of the loop, a few a second, redrawn a moment after the
 * scenes or settings settle. Video scenes are drawn from copies seeked to each still's time, so the
 * preview keeps playing.
 */
function useClips({ id, a, b, look, timing, ratio }: ClipInput): GifTimelineClip[] {
	const [stills, setStills] = useState<Record<Slot, GifTimelineFrame[]>>({ a: [], b: [] });
	const copies = useRef(new Map<string, HTMLVideoElement>());
	// One run at a time, as runs share the copies.
	const queue = useRef(Promise.resolve());

	useEffect(() => {
		if (!look || !a || !b) return;
		let live = true;
		const wait = window.setTimeout(() => {
			queue.current = queue.current.then(async () => {
				if (!live) return;
				const scenes = await Promise.all([a, b].map((s) => stillSource(s, copies.current)));
				for (const [href, v] of copies.current) {
					if (href !== a.href && href !== b.href) {
						v.removeAttribute("src");
						copies.current.delete(href);
					}
				}
				const total = loopLength(timing);
				const width = Math.round(THUMB_HEIGHT * ratio);
				const c = document.createElement("canvas");
				c.width = width;
				c.height = THUMB_HEIGHT;
				const ctx = c.getContext("2d");
				if (!ctx) return;
				const count = Math.max(12, Math.min(24, Math.round(total * 6)));
				const next: Record<Slot, GifTimelineFrame[]> = { a: [], b: [] };
				for (const span of spans(timing)) {
					const n = Math.max(1, Math.round((count * (span.end - span.start)) / total));
					const step = (span.end - span.start) / n;
					for (let i = 0; i < n; i++) {
						const time = span.start + (i + 0.5) * step;
						await Promise.all(scenes.map((s) => s instanceof HTMLVideoElement && seekVideo(s, time)));
						if (!live) return;
						const [sa, sb] = scenes.map((s) => (s instanceof HTMLVideoElement ? { src: s, w: s.videoWidth, h: s.videoHeight } : s));
						drawTransition(ctx, width, THUMB_HEIGHT, id, frameAt(timing, time), sa, sb, look);
						// The strip keys its frames by src, so stills that come out the same (the holds)
						// get a fragment to tell them apart. Data URLs ignore it.
						next[span.slot].push({ timestamp: span.start + i * step, src: `${c.toDataURL("image/jpeg", 0.7)}#${span.slot}${i}` });
					}
				}
				if (live) setStills(next);
			});
		}, 250);
		return () => {
			live = false;
			window.clearTimeout(wait);
		};
	}, [id, a, b, look, timing, ratio]);

	useEffect(() => {
		const held = copies.current;
		return () => {
			held.forEach((v) => v.removeAttribute("src"));
			held.clear();
		};
	}, []);

	return spans(timing).map((span) => {
		const scene = span.slot === "a" ? a : b;
		return {
			id: span.slot,
			name: scene?.name ?? `Scene ${span.slot.toUpperCase()}`,
			start: span.start,
			end: span.end,
			frames: stills[span.slot],
			subType: scene?.kind === "image" ? "image" : "video",
		};
	});
}

/** Where each scene sits on the timeline: A until halfway through the transition, then B. */
function spans(tm: Timing): { slot: Slot; start: number; end: number }[] {
	const cut = handover(tm);
	return [
		{ slot: "a", start: 0, end: cut },
		{ slot: "b", start: cut, end: loopLength(tm) },
	];
}

/** What a still draws a scene from: a seekable copy of a video once it can play, or the scene itself. */
async function stillSource(s: SceneSlot, copies: Map<string, HTMLVideoElement>) {
	if (s.kind !== "video" || !(s.src instanceof HTMLVideoElement)) return s;
	let v = copies.get(s.href);
	if (!v) {
		v = makeVideo(s.href);
		v.loop = false;
		copies.set(s.href, v);
	}
	if (v.readyState < 2) {
		const ready = v;
		await new Promise<void>((resolve) => {
			ready.addEventListener("loadeddata", () => resolve(), { once: true });
			ready.addEventListener("error", () => resolve(), { once: true });
			setTimeout(resolve, 5000);
		});
	}
	return v.readyState >= 2 ? v : s;
}
