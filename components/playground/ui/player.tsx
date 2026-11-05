"use client";

import type { ReactNode } from "react";
import { GifTimelineTransport } from "@/lib/design-system";

// The playground's player: the product timeline's own transport bar (Jigsaw's GifTimelineTransport:
// go to start, previous frame, play, next frame, go to end, and the time), for anything that plays,
// audio or video, with or without a timeline. What you scrub sits under it, like a Waveform.

export function Player({
	time,
	duration,
	playing,
	onPlayPause,
	onSeek,
	step = 1 / 30,
	disabled = false,
	children,
}: {
	time: number;
	duration: number;
	playing: boolean;
	onPlayPause: () => void;
	/** Steps and jumps go through here, like a click on the scrubber. */
	onSeek: (time: number) => void;
	/** How far the step buttons move, in seconds: a frame at 30 fps. */
	step?: number;
	disabled?: boolean;
	children?: ReactNode;
}) {
	const clamp = (t: number) => Math.min(duration, Math.max(0, t));
	return (
		<div className="min-w-0 overflow-hidden rounded-medium border border-neutral-weak">
			<GifTimelineTransport
				currentTime={Math.min(time, duration)}
				duration={duration}
				paused={!playing}
				disabled={disabled}
				onPlayPause={onPlayPause}
				onStepForward={() => onSeek(clamp(time + step))}
				onStepBackward={() => onSeek(clamp(time - step))}
				onGoToStart={() => onSeek(0)}
				onGoToEnd={() => onSeek(duration)}
			/>
			{children && <div className="border-t border-neutral-weak p-gap-s">{children}</div>}
		</div>
	);
}
