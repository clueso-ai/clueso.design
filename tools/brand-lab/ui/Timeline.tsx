import { I } from "./ci";
import { useRef } from "react";
import { IconButton } from "../components/icon-button";
import { Panel } from "../components/panel";
import { Field } from "../components/field";
import { useStore } from "../state/store";
import { BAR, M, timelineRight, usePanels } from "./layout";

export function Timeline() {
	const rightW = usePanels((s) => s.right);
	const time = useStore((s) => s.time);
	const playing = useStore((s) => s.playing);
	const duration = useStore((s) => s.doc.scene.duration);
	const setTime = useStore((s) => s.setTime);
	const setPlaying = useStore((s) => s.setPlaying);
	const setScene = useStore((s) => s.setScene);
	const scrub = useRef<HTMLDivElement>(null);
	const wasPlaying = useRef(false);
	const t = duration > 0 ? (time % duration) / duration : 0;

	const seek = (clientX: number) => {
		const r = scrub.current!.getBoundingClientRect();
		setTime(Math.min(0.9999, Math.max(0, (clientX - r.left) / r.width)) * duration);
	};

	return (
		<Panel className="flex-row items-center gap-sm px-xs max-[1099px]:right-[12px]!" style={{ left: M, right: timelineRight(rightW), bottom: M, height: BAR }} aria-label="Timeline">
			<div className="flex items-center">
				<IconButton label="Back to start" icon={<I.Previous />} onClick={() => setTime(0)} />
				<IconButton label={playing ? "Pause" : "Play"} shortcut={["Space"]} iconClassName="stroke-strong text-strong" icon={playing ? <I.Pause /> : <I.PlayFilled />} onClick={() => setPlaying(!playing)} />
			</div>
			<span className="mono-xxsmall shrink-0 text-weak">
				<span className="text-strong">{time.toFixed(2)}s</span> / {duration.toFixed(2)}s
			</span>
			<span className="h-[20px] w-px shrink-0 bg-[var(--color-fg-stroke-weak)]" aria-hidden />
			<label className="label-xsmall flex shrink-0 items-center gap-xs text-normal" title="Loop length">
				<I.Loop width={16} height={16} className="text-(color:--color-fg-icon-normal)" />
				<Field
					key={duration}
					className="w-[60px]"
					inputClassName="font-mono"
					suffix="s"
					type="number"
					min={1}
					max={30}
					step={0.5}
					defaultValue={duration}
					aria-label="Loop length in seconds"
					onBlur={(e) => {
						const n = Number(e.target.value);
						if (n >= 1 && n <= 30) setScene({ duration: n });
						else e.target.value = String(duration);
					}}
					onKeyDown={(e) => {
						if (e.key === "Enter") (e.target as HTMLInputElement).blur();
					}}
				/>
			</label>
			<div
				ref={scrub}
				className="group/scrub relative mx-md h-[24px] min-w-0 flex-1 cursor-pointer rounded-xs outline-none focus-visible:shadow-[0_0_0_1px_var(--color-fg-stroke-brand-normal)]"
				role="slider"
				tabIndex={0}
				aria-label="Playhead"
				aria-valuemin={0}
				aria-valuemax={duration}
				aria-valuenow={Number(time.toFixed(2))}
				onPointerDown={(e) => {
					e.currentTarget.setPointerCapture(e.pointerId);
					wasPlaying.current = playing;
					setPlaying(false);
					seek(e.clientX);
				}}
				onPointerMove={(e) => {
					if (e.currentTarget.hasPointerCapture(e.pointerId)) seek(e.clientX);
				}}
				onPointerUp={() => {
					if (wasPlaying.current) setPlaying(true);
				}}
				onKeyDown={(e) => {
					if (e.key === "ArrowRight") setTime(Math.min(duration - 0.001, time + 1 / 30));
					if (e.key === "ArrowLeft") setTime(Math.max(0, time - 1 / 30));
				}}
			>
				{/* A thin track with second ticks; the played part and the playhead in brand pink. */}
				<div className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-depth-inset-2" />
				<div
					className="absolute inset-x-0 top-1/2 h-[6px] -translate-y-1/2 opacity-70"
					style={{ backgroundImage: "linear-gradient(90deg, var(--color-fg-stroke-weak) 1px, transparent 1px)", backgroundSize: `${100 / Math.max(1, duration)}% 100%` }}
				/>
				<div className="absolute top-1/2 left-0 h-[2px] -translate-y-1/2 rounded-full bg-brand-normal" style={{ width: `${t * 100}%` }} />
				<div className="absolute top-1/2 h-[12px] w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-normal transition-[height] group-hover/scrub:h-[16px]" style={{ left: `${t * 100}%` }} />
			</div>
		</Panel>
	);
}
