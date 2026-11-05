"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon } from "@/lib/design-system/icons";
import { SOUNDTRACKS } from "@/lib/soundtracks";
import { clock } from "@/lib/waveform";
import { PlayButton } from "./play-button";
import { Waveform } from "./waveform";

// Music for a playground experiment: the soundtracks (lib/soundtracks.ts, all CC0) as a one-of-many
// list, "No music" first. Press a row to choose it: the chosen one is outlined in brand pink with a
// check. Each track has the timeline's play button to hear it first, and a small waveform you can
// scrub while it plays. Previews stop when another starts, when the page sets `paused` (say, while
// its own preview plays) or when the picker goes away. `onPreview` says when one starts or stops.

export function SoundtrackPicker({
	value,
	onChange,
	paused = false,
	disabled = false,
	onPreview,
	noneLabel = "No music",
	noneHint = "Just the picture",
}: {
	value: string | null;
	onChange: (id: string | null) => void;
	/** Stops any preview while true. */
	paused?: boolean;
	/** No choosing while true, say during an export. */
	disabled?: boolean;
	onPreview?: (playing: boolean) => void;
	/** What the first row, no track, is called and says, e.g. "Your clip" on an audio page. */
	noneLabel?: string;
	noneHint?: string;
}) {
	const audio = useRef<HTMLAudioElement | null>(null);
	const [playing, setPlaying] = useState<string | null>(null);
	const [time, setTime] = useState(0);

	useEffect(
		() => () => {
			audio.current?.pause();
			audio.current = null;
		},
		[],
	);

	const previewRef = useRef(onPreview);
	useEffect(() => {
		previewRef.current = onPreview;
	});
	useEffect(() => {
		previewRef.current?.(playing !== null);
	}, [playing]);

	// The page's own playback takes over. Pausing clears `playing` through the audio's pause event.
	useEffect(() => {
		if (paused) audio.current?.pause();
	}, [paused]);

	const toggle = (id: string, src: string) => {
		const el = (audio.current ??= new Audio());
		if (playing === id) return el.pause();
		el.src = src;
		el.ontimeupdate = () => setTime(el.currentTime);
		el.onended = () => setPlaying(null);
		el.onpause = () => setPlaying(null);
		setTime(0);
		void el.play().then(() => setPlaying(id), () => setPlaying(null));
	};

	const rows = [{ id: null, title: noneLabel, mood: noneHint }, ...SOUNDTRACKS];

	return (
		<div className="flex flex-col gap-gap-2xs">
			<div role="radiogroup" aria-label="Music" aria-disabled={disabled || undefined} className={`flex flex-col gap-gap-3xs ${disabled ? "opacity-60" : ""}`}>
				{rows.map((t) => {
					const on = value === t.id;
					const track = t.id ? SOUNDTRACKS.find((s) => s.id === t.id)! : null;
					return (
						<div
							key={t.id ?? "none"}
							className={`flex items-center gap-gap-xs rounded-medium border p-gap-2xs transition-[background-color,border-color] duration-200 ease-out-strong ${on ? "border-brand-normal bg-brand-weak" : "border-neutral-weak hover:border-neutral-normal"}`}
						>
							{track ? <PlayButton playing={playing === track.id} onClick={() => toggle(track.id, track.src)} label={playing === track.id ? `Pause ${track.title}` : `Play ${track.title}`} /> : <span aria-hidden className="size-7 shrink-0" />}
							<button
								type="button"
								role="radio"
								aria-checked={on}
								disabled={disabled}
								onClick={() => onChange(t.id)}
								className="focus-ring flex min-w-0 flex-1 items-center gap-gap-s rounded-small py-gap-3xs text-left"
							>
								<span className="flex min-w-0 flex-col">
									<span className="type-text-s truncate text-neutral-strong">{t.title}</span>
									<span className="type-text-xs truncate text-neutral-weak">{track ? `${t.mood} · ${track.artist}` : t.mood}</span>
								</span>
								{track && (
									<span className="ml-auto flex w-24 shrink-0 items-center">
										<Waveform peaks={track.peaks} duration={track.seconds} time={playing === track.id ? time : 0} label={`${track.title} waveform`} size="small" muted={playing !== track.id} />
									</span>
								)}
								{track && <span className="type-text-xs w-8 shrink-0 text-right font-code text-neutral-weak">{clock(track.seconds)}</span>}
								<span aria-hidden className={`flex size-4 shrink-0 ${on ? "text-brand-normal" : "text-transparent"}`}>
									<CheckIcon className="size-full" />
								</span>
							</button>
						</div>
					);
				})}
			</div>
			<p className="type-text-xs text-neutral-weak">
				Free to use anywhere: CC0 music from the Free Music Archive.{" "}
				<a href="/audio/soundtracks/CREDITS.md" target="_blank" rel="noreferrer" className="focus-ring rounded-tiny underline decoration-neutral-weak underline-offset-4 hover:text-neutral-strong">
					Credits
				</a>
			</p>
		</div>
	);
}
