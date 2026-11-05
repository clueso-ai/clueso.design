"use client";

import { useEffect, useRef, useState } from "react";
import { GIF_TIMELINE_MAX_ZOOM, GifTimeline, type GifTimelineClip, type GifTimelineFrame, getTimeStampGap, getZoomFromTimeStampGap, PLAYHEAD_GUTTER_WIDTHS } from "@/lib/design-system";

// A clip (or a few) on the product's timeline (Jigsaw's GifTimeline) for playground experiments:
// transport, time, playhead and a strip of stills. It follows the page's playback each frame through
// `now`, so the page doesn't re-render while it plays. It fits the clips to its width until the
// visitor zooms, and fits again when the length changes. Each still spans its slice of its clip.

/** What the timeline takes from its width before the stills: its side margins, the playhead's gutter and the clip's padding. */
const INSET = 2 * 4 + PLAYHEAD_GUTTER_WIDTHS.numbered + 2 * 2;

/** Width of each still so a clip's strip fills its span: less the strip's 1 px gaps and its 2 px padding each side. */
const fillWidth = (span: number, gap: number, count: number) => (count ? Math.max(1, (span * gap - 4 - (count - 1)) / count) : undefined);

export function Timeline({
	duration,
	now,
	paused,
	disabled = false,
	frames = [],
	clips,
	clipName,
	step = 1 / 30,
	onSeek,
	onJump = onSeek,
	onPlayPause,
}: {
	duration: number;
	/** The current time, read every frame. Keep it stable (useCallback). */
	now: () => number;
	paused: boolean;
	disabled?: boolean;
	/** Stills for the single clip. Ignored when `clips` is given. */
	/** Stills for a single clip. Leave out when `clips` are given. */
	frames?: GifTimelineFrame[];
	/** Several clips side by side (say A and B), each with its own label and stills. Replaces the single clip. */
	clips?: GifTimelineClip[];
	/** Label of the single clip. Defaults to the product's "GIF". */
	clipName?: string;
	/** How far the step buttons move, in seconds: a frame at 30 fps. */
	step?: number;
	/** Click, drag or step to a time. Pages usually pause here. */
	onSeek: (time: number) => void;
	/** Go to the start or end. Pages usually keep playing here. Defaults to onSeek. */
	onJump?: (time: number) => void;
	onPlayPause: () => void;
}) {
	const box = useRef<HTMLDivElement>(null);
	const [time, setTime] = useState(0);
	const [width, setWidth] = useState(0);
	const [zoomed, setZoomed] = useState<{ duration: number; zoom: number } | null>(null);

	useEffect(() => {
		let raf = 0;
		const tick = () => {
			raf = requestAnimationFrame(tick);
			setTime(now());
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, [now]);

	useEffect(() => {
		const el = box.current!;
		const ro = new ResizeObserver(() => setWidth(el.clientWidth));
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	// Fit to the width, zooming past the product's cap when a short clip needs it.
	const fit = width > 0 && duration > 0 ? getZoomFromTimeStampGap((width - INSET) / duration, Infinity) : 50;
	const maxZoom = Math.max(GIF_TIMELINE_MAX_ZOOM, fit);
	const zoom = zoomed?.duration === duration ? Math.min(zoomed.zoom, maxZoom) : fit;
	const gap = getTimeStampGap(zoom);
	const sized = clips?.map((c) => ({ ...c, frameWidth: c.frameWidth ?? fillWidth(c.end - c.start, gap, c.frames.length) }));
	const clamp = (t: number) => Math.min(duration, Math.max(0, t));

	return (
		<div ref={box} className="min-w-0 overflow-hidden rounded-medium border border-neutral-weak">
			<GifTimeline
				duration={duration}
				currentTime={Math.min(time, duration)}
				paused={paused}
				frames={frames}
				frameWidth={fillWidth(duration, gap, frames.length)}
				clips={sized}
				clipName={clipName}
				disabled={disabled}
				zoomSliderValue={zoom}
				maxZoom={maxZoom}
				onZoomChange={(value) => setZoomed({ duration, zoom: value })}
				onSeek={onSeek}
				onPlayPause={onPlayPause}
				onStepForward={() => onSeek(clamp(now() + step))}
				onStepBackward={() => onSeek(clamp(now() - step))}
				onGoToStart={() => onJump(0)}
				onGoToEnd={() => onJump(duration)}
			/>
		</div>
	);
}
