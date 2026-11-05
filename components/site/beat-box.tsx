"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, useSyncExternalStore } from "react";
import { changeBeat, PATTERNS, startBeat, stopBeat } from "@/lib/beat-box";
import { Button, Slider, ToggleSwitch } from "@/lib/design-system";
import { PauseIcon, PlayIcon } from "@/lib/design-system/icons";
import { unlockSound } from "@/lib/logo-sound";
import { setPrefs, useSitePrefs } from "@/lib/site-prefs-store";

// The beat box: put on a beat and the footer logo dances to it. A drum loop runs (lib/beat-box.ts)
// and every beat sends a hop through the letters, left to right; the mark's fill changes every bar.
// Drag the logo's points while it plays. Opened from the footer's Play button; closing it stops the beat.

const EASE = [0.23, 1, 0.32, 1] as const;

let isOpen = false;
const watchers = new Set<() => void>();
export const setBeatBoxOpen = (open: boolean) => {
	isOpen = open;
	watchers.forEach((w) => w());
};
export const useBeatBoxOpen = () =>
	useSyncExternalStore(
		(w) => {
			watchers.add(w);
			return () => {
				watchers.delete(w);
			};
		},
		() => isOpen,
		() => false,
	);

export function BeatBox() {
	const open = useBeatBoxOpen();
	const reduce = useReducedMotion();
	return (
		<AnimatePresence initial={false}>
			{open && (
				<motion.section
					key="beat-box"
					aria-label="Beat box"
					initial={{ height: 0, opacity: 0 }}
					animate={{ height: "auto", opacity: 1 }}
					exit={{ height: 0, opacity: 0 }}
					transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}
					className="overflow-hidden border-t border-neutral-weak"
				>
					<Panel />
				</motion.section>
			)}
		</AnimatePresence>
	);
}

function Panel() {
	const { logoSound } = useSitePrefs();
	const [pattern, setPattern] = useState(PATTERNS[0]);
	const [bpm, setBpm] = useState(PATTERNS[0].bpm);
	const [playing, setPlaying] = useState(false);
	const [step, setStep] = useState(-1);

	// Closing the panel stops the beat.
	useEffect(() => () => stopBeat(), []);

	const toggle = () => {
		if (playing) {
			stopBeat();
			setPlaying(false);
			setStep(-1);
			return;
		}
		unlockSound();
		setPlaying(startBeat(pattern, bpm, setStep));
	};
	const choose = (p: (typeof PATTERNS)[number]) => {
		setPattern(p);
		setBpm(p.bpm);
		changeBeat(p, p.bpm);
	};

	return (
		<div className="grid gap-gap-l p-gap-l md:grid-cols-3">
			<div className="flex flex-col gap-gap-2xs">
				<h2 className="type-title-s text-neutral-strong">Play the logo</h2>
				<p className="type-text-s text-neutral-weak">Pick a beat and the logo dances to it. Drag its points while it plays.</p>
			</div>

			<div className="flex flex-col gap-gap-s">
				<div role="radiogroup" aria-label="Beat" className="grid grid-cols-4 gap-gap-3xs rounded-medium border border-neutral-weak p-gap-3xs">
					{PATTERNS.map((p) => (
						<button
							key={p.id}
							type="button"
							role="radio"
							aria-checked={pattern.id === p.id}
							onClick={() => choose(p)}
							className={`focus-ring type-text-s h-7 rounded-small px-gap-xs transition-[background-color,color,box-shadow] duration-200 ease-out-strong ${pattern.id === p.id ? "border border-neutral-weak bg-raised-2 text-neutral-strong shadow-raised" : "text-neutral-weak hover:text-neutral-strong"}`}
						>
							{p.name}
						</button>
					))}
				</div>
				<div className="flex items-center gap-gap-s">
					<Button variant="filled" sentiment="neutral" size="medium" iconBefore icon={playing ? <PauseIcon /> : <PlayIcon />} className="focus-ring" onClick={toggle}>
						{playing ? "Stop beat" : "Play beat"}
					</Button>
					{/* One light per step, the first of each beat brighter. */}
					<div aria-hidden className="flex flex-wrap items-center gap-gap-3xs">
						{Array.from({ length: pattern.steps }, (_, i) => (
							<span
								key={i}
								className={`size-2 rounded-tiny transition-colors duration-100 ${i === step ? "bg-brand-normal" : i % 4 === 0 ? "bg-neutral-normal" : "bg-neutral-weak"}`}
							/>
						))}
					</div>
				</div>
			</div>

			<div className="flex flex-col gap-gap-s">
				<Slider
					label="Tempo"
					unit="bpm"
					min={60}
					max={160}
					step={1}
					value={bpm}
					onValueChange={(v) => {
						setBpm(Math.round(v));
						changeBeat(pattern, Math.round(v));
					}}
				/>
				<label className="type-text-s flex items-center gap-gap-xs text-neutral-normal">
					<ToggleSwitch checked={logoSound} onChange={(on) => setPrefs({ logoSound: on })} />
					Notes when you pull the letters
				</label>
			</div>
		</div>
	);
}
