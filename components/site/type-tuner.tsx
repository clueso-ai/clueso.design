"use client";

import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button, InputGroup, InputGroupInput, Slider, Tooltip, TooltipContent, TooltipTrigger, WrappedSelect } from "@/lib/design-system";
import { type CursorColor, DEFAULT_PREFS, FONTS, cursorById, fontById, oklchCss, shuffleColor, shuffleSite, siteTypeRatio } from "@/lib/site-prefs";
import { ArrowRightIcon, CloseIcon, PlusIcon, ShuffleIcon, SwatchesIcon } from "@/lib/design-system/icons";
import { resetPrefs, setPrefs, setPrefsSmooth, useSitePrefs } from "@/lib/site-prefs-store";
import { setTunerOpen, useTunerOpen } from "@/lib/tuner-store";
import { useFinePointer } from "@/lib/use-fine-pointer";
import { CluesoCursor } from "./clueso-cursor";
import { OklchArea } from "./oklch-area";

// Phones get the panel as a bottom sheet under half the screen tall, so it always fits and the page
// stays in view behind it as you customize. Its content scrolls.
const PHONE = "(max-width: 767px)";
const subscribePhone = (fn: () => void) => {
	const m = matchMedia(PHONE);
	m.addEventListener("change", fn);
	return () => m.removeEventListener("change", fn);
};
const usePhone = () => useSyncExternalStore(subscribePhone, () => matchMedia(PHONE).matches, () => false);

const FONT_OPTIONS = FONTS.map((f) => ({ value: f.id, label: f.label, style: { fontFamily: f.family } }));

/** One field: a quiet label over its control. Spacing between fields belongs to the section. */
function Group({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="flex flex-col gap-gap-xs">
			<span className="type-text-s text-neutral-weak">{label}</span>
			{children}
		</div>
	);
}

interface FontControlProps {
	role: string;
	font: string;
	weight: number;
	style: string;
	onFont: (id: string) => void;
	onWeight: (w: number) => void;
	onStyle: (id: string) => void;
}

function FontControl({ role, font, weight, style, onFont, onWeight, onStyle }: FontControlProps) {
	const { weights: range, styles } = fontById(font);
	return (
		<Group label={`${role} font`}>
			<WrappedSelect size="small" value={font} onValueChange={onFont} options={FONT_OPTIONS} />
			{styles ? (
				<WrappedSelect size="small" value={style} onValueChange={onStyle} options={styles.map((s) => ({ value: s.id, label: s.label, style: { fontFamily: s.family } }))} />
			) : typeof range === "number" ? (
				<span className="type-text-s flex h-8 items-center text-neutral-weak">Comes in one weight</span>
			) : (
				// Variable fonts take any weight, so the slider glides instead of jumping in hundreds.
				<Slider label="Weight" min={range[0]} max={range[1]} step={1} value={weight} onValueChange={(w) => onWeight(Math.round(w))} />
			)}
		</Group>
	);
}

/** Body size and the ratio between steps. Every title and text size follows from these two. */
function ScaleControl() {
	const p = useSitePrefs();
	return (
		<Group label="Type scale">
			<Slider label="Base" unit="px" min={12} max={20} step={0.1} value={p.typeBase} onValueChange={(v) => setPrefs({ typeBase: Math.round(v * 10) / 10 })} />
			<Slider label="Ratio" min={1.05} max={1.6} step={0.01} value={p.typeRatio ?? siteTypeRatio()} onValueChange={(v) => setPrefs({ typeRatio: Math.round(v * 100) / 100 })} />
		</Group>
	);
}

/** Your own colour, picked visually in OKLCH: steps look even to the eye, so nudging one axis changes only that. */
function OklchPicker() {
	const p = useSitePrefs();
	return <OklchArea value={cursorById(p.cursorColor).oklch} onChange={(next) => setPrefs({ cursorColor: oklchCss(next) })} />;
}

const SWATCH = "focus-ring size-6 shrink-0 rounded-small border transition-[scale,border-color] duration-150 ease-out-strong active:scale-95";

function Swatch({ c, on, onPick }: { c: CursorColor; on: boolean; onPick: (id: string) => void }) {
	// Selected: a strong edge with a ring of the panel's own colour inside it. Same size as the others, so the row never shifts.
	return (
		<button
			type="button"
			role="radio"
			aria-checked={on}
			aria-label={c.label}
			onClick={() => onPick(c.id)}
			// Colours near white or near black get a strong edge too, so they never vanish into the panel.
			className={`${SWATCH} ${on || c.oklch[0] > 0.85 || c.oklch[0] < 0.3 ? "border-neutral-strong" : "border-neutral-weak"}`}
			style={{ background: c.fill, boxShadow: on ? "inset 0 0 0 2px var(--surface-overlay)" : undefined }}
		/>
	);
}

/** The swatches always in view, so the row fits on one line: black (where visitors start), then six hues. */
const MAIN_COLORS = ["ink", "pink", "blue", "green", "orange", "violet", "red"];

/**
 * A short palette on one row, with your own colour and Shuffle at its end. The plus opens a visual
 * OKLCH picker, starting from the colour you have. Your own colour takes the last slot in the row,
 * so the choice always shows. `onPick` hears every choice, even the colour already set.
 */
export function ColorPicker({ onPick }: { onPick?: () => void }) {
	const p = useSitePrefs();
	const color = cursorById(p.cursorColor);
	const [own, setOwn] = useState(false);
	const pick = (cursorColor: string) => {
		setPrefs({ cursorColor });
		onPick?.();
	};
	const main = MAIN_COLORS.map((id) => cursorById(id));
	// Your own colour, or a palette colour not in the row, stands in for the last swatch.
	if (!MAIN_COLORS.includes(color.id)) main[main.length - 1] = color;
	return (
		<div className="flex flex-col gap-gap-s">
			<div className="flex items-center gap-1.5">
				<div role="radiogroup" aria-label="Cursor colour" className="flex items-center gap-1.5">
					{main.map((c) => (
						<Swatch key={c.id} c={c} on={c.id === color.id} onPick={pick} />
					))}
				</div>
				<button
					type="button"
					aria-expanded={own}
					aria-label="Pick your own colour"
					onClick={() => {
						// Opening starts from the colour you have, as your own.
						if (!own && color.label !== "Custom") pick(oklchCss(color.oklch));
						setOwn((o) => !o);
					}}
					className={`${SWATCH} grid place-items-center border-dashed ${own ? "border-neutral-strong text-neutral-strong" : "border-neutral-normal text-neutral-weak hover:text-neutral-strong"}`}
				>
					<PlusIcon aria-hidden className={`size-3.5 transition-transform duration-150 ease-out-strong ${own ? "rotate-45" : ""}`} />
				</button>
				<Button variant="outlined" sentiment="neutral" size="xsmall" iconOnly icon={<ShuffleIcon />} aria-label="Shuffle colour" className="focus-ring ml-auto" onClick={() => pick(shuffleColor())} />
			</div>
			<AnimatePresence initial={false}>
				{own && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
						className="overflow-hidden"
					>
						<div className="pt-gap-3xs">
							<OklchPicker />
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

function NameField({ autoFocus, onEnter }: { autoFocus?: boolean; onEnter?: () => void }) {
	const p = useSitePrefs();
	return (
		<InputGroup size="small">
			<InputGroupInput
				autoFocus={autoFocus}
				placeholder="Your name"
				aria-label="Your name, shown on your cursor"
				maxLength={24}
				value={p.cursorName}
				onChange={(e) => setPrefs({ cursorName: e.target.value })}
				onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
			/>
		</InputGroup>
	);
}

/** The system arrow, standing for the visitor's own pointer in the preview. */
function SystemArrow() {
	return (
		<svg aria-hidden viewBox="0 0 16 22" width={15} height={21} className="overflow-visible text-neutral-strong" style={{ filter: "drop-shadow(0 0 2px rgb(0 0 0 / 0.25))" }}>
			<path d="M1 1v17.5l4.6-4.4 3 6.9 3-1.3-3-6.8H15z" fill="currentColor" stroke="var(--surface-overlay)" strokeWidth={1.25} strokeLinejoin="round" />
		</svg>
	);
}

/** Clueso cursor or the visitor's own: a two-option radio group drawn as a segmented control. The preview above shows the result. */
function PointerChoice() {
	const p = useSitePrefs();
	const options = [
		{ on: true, label: "Clueso cursor" },
		{ on: false, label: "Default" },
	];
	return (
		<div role="radiogroup" aria-label="Cursor" className="grid grid-cols-2 gap-gap-3xs rounded-medium border border-neutral-weak p-gap-3xs">
			{options.map((o) => (
				<button
					key={o.label}
					type="button"
					role="radio"
					aria-checked={p.cluesoCursor === o.on}
					onClick={() => setPrefs({ cluesoCursor: o.on })}
					className={`focus-ring type-text-s h-7 rounded-small px-gap-xs transition-[background-color,color,box-shadow] duration-200 ease-out-strong ${p.cluesoCursor === o.on ? "border border-neutral-weak bg-raised-2 text-neutral-strong shadow-raised" : "text-neutral-weak hover:text-neutral-strong"}`}
				>
					{o.label}
				</button>
			))}
		</div>
	);
}

/** The visitor's cursor as it will look: the Clueso piece with their name, or their own arrow. */
function CursorPreview() {
	const p = useSitePrefs();
	const name = p.cursorName.trim();
	return (
		<div aria-hidden className="flex h-20 items-center justify-center rounded-medium bg-sunken-1">
			{p.cluesoCursor ? (
				// Nudged left so the piece and its tag sit centred together.
				<CluesoCursor color={cursorById(p.cursorColor)} name={name || "Your name"} tilt={p.cursorTilt} className="-translate-x-gap-l" />
			) : (
				<SystemArrow />
			)}
		</div>
	);
}

/** The pointer choice under one preview, and the tilt. Tilt stays in place, off for the default
 *  pointer, so switching changes nothing but the preview. */
function PointerControl() {
	const p = useSitePrefs();
	return (
		<div className="flex flex-col gap-gap-xs">
			<CursorPreview />
			<PointerChoice />
			<div className="pt-gap-2xs">
				<Slider label="Tilt" unit="°" min={-45} max={45} step={1} value={p.cursorTilt} disabled={!p.cluesoCursor} onValueChange={(t) => setPrefs({ cursorTilt: Math.round(t) })} />
			</div>
		</div>
	);
}

function CursorControl() {
	// Touch screens have no cursor. Name and colour still count (selection, Say hi), the rest doesn't.
	const fine = useFinePointer();
	return (
		<>
			{fine && <PointerControl />}
			<Group label="Name">
				<NameField />
			</Group>
			<Group label="Colour">
				<ColorPicker />
			</Group>
		</>
	);
}

function useChanged() {
	const p = useSitePrefs();
	const keys = ["titleFont", "titleWeight", "titleStyle", "textFont", "textWeight", "textStyle", "cursorTilt", "typeBase", "typeRatio"] as const;
	return keys.some((k) => p[k] !== DEFAULT_PREFS[k]);
}

/** Title and text fonts, then the type scale. */
function TypeControls() {
	const p = useSitePrefs();
	return (
		<>
			<FontControl
				role="Title"
				font={p.titleFont}
				weight={p.titleWeight}
				style={p.titleStyle}
				onFont={(titleFont) => setPrefsSmooth({ titleFont })}
				onWeight={(titleWeight) => setPrefs({ titleWeight })}
				onStyle={(titleStyle) => setPrefsSmooth({ titleStyle })}
			/>
			<FontControl
				role="Text"
				font={p.textFont}
				weight={p.textWeight}
				style={p.textStyle}
				onFont={(textFont) => setPrefsSmooth({ textFont })}
				onWeight={(textWeight) => setPrefs({ textWeight })}
				onStyle={(textStyle) => setPrefsSmooth({ textStyle })}
			/>
			<ScaleControl />
		</>
	);
}

/**
 * A titled part of the full panel. Three levels of spacing carry the hierarchy: a rule and generous
 * padding between sections, a medium gap between fields, a small one between a label and its control.
 */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<section className="flex flex-col gap-gap-s px-gap-m pt-gap-m pb-gap-l [&+&]:border-t [&+&]:border-neutral-weak">
			<h3 className="type-text-s type-strong text-neutral-strong">{title}</h3>
			<div className="flex flex-col gap-gap-m">{children}</div>
		</section>
	);
}

/** Shuffle the whole look, and put it back. */
function Actions() {
	const changed = useChanged();
	return (
		<div className="flex items-center justify-between gap-gap-2xs">
			<Button variant="outlined" sentiment="neutral" size="small" iconBefore icon={<ShuffleIcon />} className="focus-ring" onClick={() => setPrefsSmooth(shuffleSite())}>
				Shuffle
			</Button>
			<Button variant="outlined" sentiment="neutral" size="small" className="focus-ring" disabled={!changed} onClick={resetPrefs}>
				Reset
			</Button>
		</div>
	);
}

const STEPS = [
	{ id: "name", label: "Name", title: "What should we call you?", note: "Your name rides along on your cursor, so people here can tell it's you." },
	{ id: "cursor", label: "Cursor", title: "Pick your pointer", note: "Keep your own, or switch to the Clueso cursor and give it a tilt." },
	{ id: "colour", label: "Colour", title: "Choose your colour", note: "It colours your cursor and the text you select." },
	{ id: "type", label: "Type", title: "Set the type", note: "Fonts and sizes change every page. Try a few, or shuffle." },
] as const;

/**
 * The first time the panel opens it walks the visitor through, one question at a time: their name,
 * their pointer (mouse and pen only), their colour, then the site's type. A live preview sits on
 * top and a thin bar shows how far along they are. Finishing or skipping marks them onboarded,
 * and from then on the panel opens in full.
 */
function Onboarding({ step, setStep, onDone }: { step: number; setStep: (n: number) => void; onDone: () => void }) {
	const p = useSitePrefs();
	const fine = useFinePointer();
	// Touch screens have no cursor to pick.
	const steps = fine ? STEPS : STEPS.filter((s) => s.id !== "cursor");
	const at = Math.min(step, steps.length - 1);
	const current = steps[at];
	const last = at === steps.length - 1;
	// Which way the steps slide: forward comes in from the right, back from the left.
	const [dir, setDir] = useState(1);
	const go = (n: number) => {
		setDir(n > at ? 1 : -1);
		setStep(n);
	};
	const finish = () => {
		setPrefs({ onboarded: true });
		onDone();
	};
	const next = () => (last ? finish() : go(at + 1));

	return (
		<>
			<div className="flex shrink-0 flex-col gap-gap-s px-gap-m pt-gap-s">
				{/* Progress: one segment per step, filled up to this one. Steps already seen can be revisited. */}
				<div className="flex gap-gap-3xs">
					{steps.map((s, i) => (
						<button
							key={s.id}
							type="button"
							aria-label={`Step ${i + 1}: ${s.label}`}
							aria-current={i === at ? "step" : undefined}
							disabled={i > at}
							onClick={() => go(i)}
							className="focus-ring flex-1 py-gap-2xs disabled:cursor-default"
						>
							<span className={`block h-0.5 rounded-tiny transition-colors duration-300 ease-out-strong ${i <= at ? "bg-neutral-inverted" : "bg-neutral-weak"}`} />
						</button>
					))}
				</div>
				{fine && current.id !== "type" && <CursorPreview />}
			</div>
			<div className="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
				<AnimatePresence mode="popLayout" initial={false} custom={dir}>
					<motion.div
						key={current.id}
						custom={dir}
						variants={{
							enter: (d: number) => ({ opacity: 0, x: 12 * d }),
							center: { opacity: 1, x: 0, transition: { duration: 0.22, ease: [0.23, 1, 0.32, 1] } },
							exit: (d: number) => ({ opacity: 0, x: -12 * d, transition: { duration: 0.12, ease: "easeOut" } }),
						}}
						initial="enter"
						animate="center"
						exit="exit"
						className="flex flex-col gap-gap-s px-gap-m pt-gap-m pb-gap-s"
					>
						<div className="flex flex-col gap-gap-3xs">
							<h3 className="type-text-m type-strong text-neutral-strong">{current.title}</h3>
							<p className="type-text-s text-neutral-normal">{current.note}</p>
						</div>
						{current.id === "name" && <NameField autoFocus onEnter={next} />}
						{current.id === "cursor" && (
							<>
								<PointerChoice />
								<Slider label="Tilt" unit="°" min={-45} max={45} step={1} value={p.cursorTilt} disabled={!p.cluesoCursor} onValueChange={(t) => setPrefs({ cursorTilt: Math.round(t) })} />
							</>
						)}
						{current.id === "colour" && <ColorPicker />}
						{current.id === "type" && (
							<div className="flex flex-col gap-gap-m">
								<TypeControls />
							</div>
						)}
					</motion.div>
				</AnimatePresence>
			</div>
			<div className="flex shrink-0 items-center justify-between gap-gap-xs border-t border-neutral-weak px-gap-m py-gap-s">
				{at === 0 ? (
					<Button variant="outlined" sentiment="neutral" size="small" className="focus-ring" onClick={finish}>
						Skip setup
					</Button>
				) : (
					<Button variant="outlined" sentiment="neutral" size="small" className="focus-ring" onClick={() => go(at - 1)}>
						Back
					</Button>
				)}
				<div className="flex items-center gap-gap-2xs">
					{current.id === "type" && (
						<Button variant="outlined" sentiment="neutral" size="small" iconOnly icon={<ShuffleIcon />} aria-label="Shuffle the look" className="focus-ring" onClick={() => setPrefsSmooth(shuffleSite())} />
					)}
					<Button size="small" icon={last ? undefined : <ArrowRightIcon />} className="focus-ring" onClick={next}>
						{last ? "Done" : "Continue"}
					</Button>
				</div>
			</div>
		</>
	);
}

/** Every control, in two parts: the visitor's cursor, then the site's type. */
function FullPanel() {
	return (
		<>
			<div className="min-h-0 flex-1 overflow-y-auto">
				<Section title="Your cursor">
					<CursorControl />
				</Section>
				<Section title="Type">
					<TypeControls />
				</Section>
			</div>
			{/* Always in reach, however far the controls scroll. */}
			<div className="shrink-0 border-t border-neutral-weak px-gap-m py-gap-s">
				<Actions />
			</div>
		</>
	);
}

/** Opens and closes the panel from anywhere: C, unless the visitor is typing or holding a modifier. */
const SHORTCUT = "c";

/** Every control (cursor, fonts, type scale) behind the Customize website button, bottom right, or C. */
export function TypeTuner() {
	const open = useTunerOpen();
	const [atFooter, setAtFooter] = useState(false);

	useEffect(() => {
		const key = (e: KeyboardEvent) => {
			if (e.key.toLowerCase() !== SHORTCUT || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
			const t = e.target as HTMLElement;
			if (t.closest("input, textarea, select, [contenteditable='true']")) return;
			e.preventDefault();
			setTunerOpen((o) => !o);
		};
		window.addEventListener("keydown", key);
		return () => window.removeEventListener("keydown", key);
	}, []);

	// The button steps aside at the footer so it doesn't cover the footer line.
	useEffect(() => {
		const footer = document.querySelector("footer");
		const fo = new IntersectionObserver(([e]) => setAtFooter(e.isIntersecting));
		if (footer) fo.observe(footer);
		return () => fo.disconnect();
	}, []);

	// Opening the panel by any route (C or the button) retires the cursor's "Press C" hint for good.
	const p = useSitePrefs();
	useEffect(() => {
		if (open && !p.hintDone) setPrefs({ hintDone: true });
	}, [open, p.hintDone]);

	return <FloatingTuner show={!atFooter || open} open={open} setOpen={setTunerOpen} />;
}

/** The panel and the button that opens it. */
function FloatingTuner({ show, open, setOpen }: { show: boolean; open: boolean; setOpen: (fn: (o: boolean) => boolean) => void }) {
	const p = useSitePrefs();
	const wrap = useRef<HTMLDivElement>(null);
	const phone = usePhone();
	const drag = useDragControls();
	// Kept here, not in the steps, so closing the panel mid way picks up where the visitor left off.
	const [step, setStep] = useState(0);

	// Escape or a click anywhere else closes it. Clicks in its dropdown menus (portalled out of the
	// panel) don't count as outside.
	useEffect(() => {
		if (!open) return;
		const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(() => false);
		const down = (e: PointerEvent) => {
			const t = e.target as Element;
			if (wrap.current?.contains(t) || t.closest("[data-radix-popper-content-wrapper], [role='listbox']")) return;
			setOpen(() => false);
		};
		window.addEventListener("keydown", key);
		window.addEventListener("pointerdown", down);
		return () => {
			window.removeEventListener("keydown", key);
			window.removeEventListener("pointerdown", down);
		};
	}, [open, setOpen]);

	return (
		<AnimatePresence>
			{show && (
				<motion.div
					ref={wrap}
					initial={{ opacity: 0, x: 12 }}
					animate={{ opacity: 1, x: 0 }}
					exit={{ opacity: 0, x: 12 }}
					transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
					className="fixed right-gap-m bottom-gap-m z-40 flex flex-col items-end gap-gap-xs"
				>
					<AnimatePresence>
						{open && (
							<motion.div
								id="floating-tuner"
								role="dialog"
								aria-label="Customize website"
								initial={phone ? { y: "100%" } : { opacity: 0, scale: 0.96, y: 8 }}
								animate={phone ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
								exit={phone ? { y: "100%" } : { opacity: 0, scale: 0.96, y: 8 }}
								transition={{ duration: phone ? 0.3 : 0.2, ease: [0.23, 1, 0.32, 1] }}
								// Phones: drag the sheet down by its header to close it.
								drag={phone ? "y" : false}
								dragListener={false}
								dragControls={drag}
								dragConstraints={{ top: 0, bottom: 0 }}
								dragElastic={{ top: 0, bottom: 1 }}
								onDragEnd={(_, info) => (info.offset.y > 100 || info.velocity.y > 500) && setOpen(() => false)}
								style={{ transformOrigin: "bottom right" }}
								className={`flex ${p.onboarded ? "h-[min(40rem,calc(100dvh-6rem))]" : "h-[min(31rem,calc(100dvh-6rem))]"} w-80 flex-col overflow-hidden rounded-medium border border-neutral-weak bg-overlay text-left shadow-overlay max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:h-[45dvh] max-md:w-full max-md:rounded-none max-md:rounded-t-large max-md:border-x-0 max-md:border-b-0 max-md:pb-[env(safe-area-inset-bottom)]`}
							>
								<div
									className="relative flex shrink-0 touch-none items-center justify-between border-b border-neutral-weak py-gap-s pr-gap-xs pl-gap-m md:touch-auto"
									onPointerDown={phone ? (e) => drag.start(e) : undefined}
								>
									{/* Phones: the sheet's grab handle. */}
									<span aria-hidden className="absolute top-gap-2xs left-1/2 w-8 -translate-x-1/2 rounded-tiny border-t-4 border-neutral-normal md:hidden" />
									<h2 className="type-text-m type-strong text-neutral-strong">Customize</h2>
									<Button variant="transparent" sentiment="neutral" size="xsmall" iconOnly icon={<CloseIcon />} aria-label="Close" className="focus-ring" onClick={() => setOpen(() => false)} />
								</div>
								{p.onboarded ? <FullPanel /> : <Onboarding step={step} setStep={setStep} onDone={() => setOpen(() => false)} />}
							</motion.div>
						)}
					</AnimatePresence>
					<Tooltip>
						<TooltipTrigger asChild>
							<button
								type="button"
								aria-expanded={open}
								aria-controls="floating-tuner"
								aria-label="Customize website"
								aria-keyshortcuts="C"
								onClick={() => setOpen((o) => !o)}
								className="focus-ring grid size-10 place-items-center rounded-medium border border-neutral-weak bg-overlay text-neutral-strong shadow-overlay transition-transform duration-200 ease-out-strong active:scale-[0.97]"
							>
								<SwatchesIcon aria-hidden className="size-5" />
							</button>
						</TooltipTrigger>
						<TooltipContent side="left" shortcut={["C"]}>
							Customize website
						</TooltipContent>
					</Tooltip>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
