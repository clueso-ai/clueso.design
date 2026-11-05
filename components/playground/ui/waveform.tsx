"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Playhead } from "@/lib/design-system";
import { clock, resample } from "@/lib/waveform";

// The playground's waveform, after Suno's: dense, thin, rounded bars mirrored around the middle, the
// played part in brand pink and the rest in a quiet grey. With `onSeek` it's a scrubber: press or
// drag anywhere to move the playhead (the timeline's own, with the time on its head), hover to see where you'd
// land, or use the arrow keys (Shift for bigger steps). With `live` it's a recording meter instead:
// the newest level on the right, scrolling left.
// When `peaks` changes (say, from before to after), the bars glide to their new heights.

const BAR = 2;
const GAP = 2;
const GLIDE_MS = 260;

export function Waveform({
	peaks,
	duration = 0,
	time = 0,
	onSeek,
	label,
	live = false,
	size = "medium",
	muted = false,
}: {
	peaks: ArrayLike<number>;
	duration?: number;
	time?: number;
	onSeek?: (time: number) => void;
	label: string;
	live?: boolean;
	size?: "small" | "medium" | "large";
	/** Draws everything in the quiet colour, for a version that isn't the one playing. */
	muted?: boolean;
}) {
	const wrap = useRef<HTMLDivElement>(null);
	/** Where the bars are drawn: the whole box, or inset on a scrubber so the playhead's time fits at either end. */
	const track = useRef<HTMLDivElement>(null);
	const canvas = useRef<HTMLCanvasElement>(null);
	const played = useRef<HTMLSpanElement>(null);
	const rest = useRef<HTMLSpanElement>(null);
	const [width, setWidth] = useState(0);
	const [hover, setHover] = useState<number | null>(null);
	const [dragging, setDragging] = useState(false);
	/** The heights on screen, which glide toward `peaks`. */
	const shown = useRef<Float32Array>(new Float32Array(0));
	const frame = useRef(0);

	useLayoutEffect(() => {
		const el = track.current!;
		const ro = new ResizeObserver(() => setWidth(el.clientWidth));
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	const interactive = !!onSeek && !live && duration > 0;
	const progress = duration > 0 ? Math.min(1, Math.max(0, time / duration)) : 0;

	// The bars on screen glide to new heights only when the shape changes, not as playback moves.
	const glide = useRef<{ from: Float32Array; to: Float32Array; start: number } | null>(null);
	useEffect(() => {
		if (!width) return;
		const bars = Math.max(1, Math.floor((width + GAP) / (BAR + GAP)));
		const to = live ? tail(peaks, bars) : resample(peaks, bars);
		const from = shown.current.length === bars ? shown.current : to;
		const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
		glide.current = { from: live || reduce ? to : from, to, start: performance.now() };
	}, [peaks, width, live]);

	// Sized only when the box changes, so repaints don't clear the canvas first.
	useEffect(() => {
		const el = canvas.current;
		if (!el || !width) return;
		const dpr = Math.min(devicePixelRatio || 1, 2);
		el.width = Math.round(width * dpr);
		el.height = Math.round(el.clientHeight * dpr);
	}, [width, size, interactive]);

	useEffect(() => {
		const el = canvas.current;
		const g = glide.current;
		if (!el || !width || !g) return;
		const ctx = el.getContext("2d")!;
		const dpr = el.width / width;
		const height = el.height / dpr;
		const playedColor = getComputedStyle(played.current!).color;
		const restColor = getComputedStyle(rest.current!).color;
		const split = live ? 0 : progress * width;
		const ghost = hover ?? split;

		const draw = (now: number) => {
			const t = Math.min(1, (now - g.start) / GLIDE_MS);
			const e = 1 - (1 - t) ** 3;
			const heights = g.from.map((v, i) => v + (g.to[i] - v) * e);
			shown.current = heights;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			ctx.clearRect(0, 0, width, height);
			const mid = height / 2;
			for (let i = 0; i < heights.length; i++) {
				const x = i * (BAR + GAP);
				const h = Math.max(BAR, heights[i] * (height - 2));
				const isPlayed = !muted && x + BAR / 2 <= split;
				const isGhost = !muted && !isPlayed && x + BAR / 2 <= ghost;
				ctx.globalAlpha = isGhost ? 0.55 : 1;
				ctx.fillStyle = live || isPlayed || isGhost ? playedColor : restColor;
				ctx.beginPath();
				ctx.roundRect(x, mid - h / 2, BAR, h, BAR / 2);
				ctx.fill();
			}
			ctx.globalAlpha = 1;
			if (t < 1) frame.current = requestAnimationFrame(draw);
		};
		cancelAnimationFrame(frame.current);
		draw(performance.now());
		return () => cancelAnimationFrame(frame.current);
	}, [peaks, width, size, interactive, progress, hover, live, muted]);

	const timeAt = (clientX: number) => {
		const box = track.current!.getBoundingClientRect();
		return Math.min(1, Math.max(0, (clientX - box.left) / box.width)) * duration;
	};

	// A scrubber is taller by the playhead's head, which sits above the bars.
	const height = { small: interactive ? "h-16" : "h-10", medium: interactive ? "h-28" : "h-20", large: interactive ? "h-36" : "h-28" }[size];

	return (
		<div
			ref={wrap}
			role={interactive ? "slider" : "img"}
			aria-label={label}
			aria-valuemin={interactive ? 0 : undefined}
			aria-valuemax={interactive ? Math.round(duration * 10) / 10 : undefined}
			aria-valuenow={interactive ? Math.round(time * 10) / 10 : undefined}
			aria-valuetext={interactive ? `${clock(time)} of ${clock(duration)}` : undefined}
			tabIndex={interactive ? 0 : undefined}
			onKeyDown={(e) => {
				if (!interactive) return;
				const step = e.shiftKey ? 5 : 1;
				const next = e.key === "ArrowRight" ? time + step : e.key === "ArrowLeft" ? time - step : e.key === "Home" ? 0 : e.key === "End" ? duration : null;
				if (next === null) return;
				e.preventDefault();
				onSeek!(Math.min(duration, Math.max(0, next)));
			}}
			onPointerDown={(e) => {
				if (!interactive) return;
				e.currentTarget.setPointerCapture(e.pointerId);
				setDragging(true);
				onSeek!(timeAt(e.clientX));
			}}
			onPointerMove={(e) => {
				if (!interactive) return;
				if (dragging) onSeek!(timeAt(e.clientX));
				if (e.pointerType === "mouse") setHover(Math.min(width, Math.max(0, e.clientX - track.current!.getBoundingClientRect().left)));
			}}
			onPointerUp={() => setDragging(false)}
			onPointerCancel={() => setDragging(false)}
			onPointerLeave={() => setHover(null)}
			className={`focus-ring relative w-full rounded-small ${height} ${interactive ? "cursor-pointer touch-none select-none" : ""}`}
		>
			<div ref={track} className={`absolute inset-y-0 ${interactive ? "inset-x-gap-l" : "inset-x-0"}`}>
				<canvas ref={canvas} className={`absolute inset-x-0 bottom-0 w-full ${interactive ? "top-gap-2xl" : "top-0"}`} />
				{/* Colours for the canvas, read from tokens. */}
				<span ref={played} aria-hidden className="hidden text-brand-normal" />
				<span ref={rest} aria-hidden className="hidden text-neutral-weak" />
				{interactive && width > 0 && (
					// The timeline's own playhead: the time on its head, above the bars.
					<Playhead position={progress * width} timestamp={clock(time, true)} interactive={false} className="z-1" />
				)}
				{interactive && hover !== null && !dragging && (
					<span className="type-text-xs font-code pointer-events-none absolute top-full mt-gap-3xs -translate-x-1/2 rounded-tiny bg-neutral-inverted px-gap-2xs text-neutral-inverted" style={{ left: hover }}>
						{clock((hover / width) * duration, true)}
					</span>
				)}
			</div>
		</div>
	);
}

/** The last `bars` levels, right-aligned, for a live meter. */
function tail(levels: ArrayLike<number>, bars: number) {
	const out = new Float32Array(bars);
	const n = Math.min(bars, levels.length);
	for (let i = 0; i < n; i++) out[bars - n + i] = levels[levels.length - n + i];
	return out;
}
