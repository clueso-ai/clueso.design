"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Button, InputGroup, InputGroupInput, Slider, WrappedSelect } from "@/lib/design-system";
import { CURSOR_COLORS, DEFAULT_PREFS, FONTS, cursorById, fontById, oklchCss, shuffleColor, shuffleSite, siteTypeRatio } from "@/lib/site-prefs";
import { CloseIcon, ShuffleIcon, SlidersIcon } from "@/lib/design-system/icons";
import { resetPrefs, setPrefs, setPrefsSmooth, useSitePrefs } from "@/lib/site-prefs-store";
import { useFinePointer } from "@/lib/use-fine-pointer";

const FONT_OPTIONS = FONTS.map((f) => ({ value: f.id, label: f.label, style: { fontFamily: f.family } }));

/** One group of controls. The floating panel uses tighter spacing so it stays light. */
function Group({ label, compact, children }: { label: string; compact?: boolean; children: React.ReactNode }) {
	return (
		<div className={`flex flex-col ${compact ? "gap-gap-xs px-gap-m py-gap-s" : "gap-gap-s p-gap-l"}`}>
			<span className="type-text-s text-neutral-weak">{label}</span>
			{children}
		</div>
	);
}

interface FontControlProps {
	role: string;
	compact?: boolean;
	font: string;
	weight: number;
	style: string;
	onFont: (id: string) => void;
	onWeight: (w: number) => void;
	onStyle: (id: string) => void;
}

function FontControl({ role, compact, font, weight, style, onFont, onWeight, onStyle }: FontControlProps) {
	const { weights: range, styles } = fontById(font);
	return (
		<Group label={`${role} font`} compact={compact}>
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
function ScaleControl({ compact }: { compact?: boolean }) {
	const p = useSitePrefs();
	return (
		<Group label="Type scale" compact={compact}>
			<Slider label="Base" unit="px" min={12} max={20} step={0.1} value={p.typeBase} onValueChange={(v) => setPrefs({ typeBase: Math.round(v * 10) / 10 })} />
			<Slider label="Ratio" min={1.05} max={1.6} step={0.01} value={p.typeRatio ?? siteTypeRatio()} onValueChange={(v) => setPrefs({ typeRatio: Math.round(v * 100) / 100 })} />
		</Group>
	);
}

/** Lightness, chroma and hue. OKLCH steps look even to the eye, so nudging one slider changes only that. */
function OklchPicker() {
	const p = useSitePrefs();
	const [l, c, h] = cursorById(p.cursorColor).oklch;
	const set = (next: [number, number, number]) => setPrefs({ cursorColor: oklchCss(next) });
	return (
		<div className="flex flex-col gap-gap-xs">
			<Slider label="Lightness" min={0.3} max={0.95} step={0.01} value={Number(l.toFixed(2))} onValueChange={(v) => set([v, c, h])} />
			<Slider label="Chroma" min={0} max={0.3} step={0.005} value={Number(c.toFixed(3))} onValueChange={(v) => set([l, v, h])} />
			<Slider label="Hue" unit="°" min={0} max={360} step={1} value={Math.round(h)} onValueChange={(v) => set([l, c, v])} />
			<code className="type-text-s font-code text-neutral-weak">{oklchCss([l, c, h])}</code>
		</div>
	);
}

/** Palette, your own colour in OKLCH, and shuffle. */
function ColorPicker() {
	const p = useSitePrefs();
	const color = cursorById(p.cursorColor);
	const custom = color.label === "Custom";
	const [picking, setPicking] = useState(false);
	const swatch = "focus-ring size-5 rounded-small outline-offset-2 transition-transform duration-200 ease-out-strong active:scale-95";
	return (
		<>
			<div className="flex flex-wrap items-center gap-1.5">
				<div role="radiogroup" aria-label="Cursor colour" className="contents">
					{CURSOR_COLORS.map((c) => (
						<button
							key={c.id}
							type="button"
							role="radio"
							aria-checked={c.id === color.id}
							aria-label={c.label}
							onClick={() => setPrefs({ cursorColor: c.id })}
							className={`${swatch} ${c.id === color.id ? "outline-2 outline-neutral-strong" : ""}`}
							style={{ background: c.fill }}
						/>
					))}
				</div>
				{/* Your own colour: opens the OKLCH picker, and shows the colour once you've made one. */}
				<button
					type="button"
					aria-expanded={picking}
					aria-label="Pick your own colour in OKLCH"
					onClick={() => {
						if (!custom) setPrefs({ cursorColor: oklchCss(color.oklch) });
						setPicking((o) => !o);
					}}
					className={`${swatch} grid place-items-center border border-dashed border-neutral-strong ${custom ? "border-solid outline-2 outline-neutral-strong" : ""}`}
					style={custom ? { background: color.fill, color: color.ink } : undefined}
				>
					<span aria-hidden className="type-text-s leading-none">+</span>
				</button>
				<Button
					variant="transparent"
					sentiment="neutral"
					size="xsmall"
					iconOnly
					icon={<ShuffleIcon />}
					aria-label="Shuffle colour"
					className="focus-ring"
					onClick={() => setPrefs({ cursorColor: shuffleColor() })}
				/>
			</div>
			<AnimatePresence initial={false}>
				{picking && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
						className="overflow-hidden"
					>
						<OklchPicker />
					</motion.div>
				)}
			</AnimatePresence>
		</>
	);
}

function NameField() {
	const p = useSitePrefs();
	return (
		<InputGroup size="small">
			<InputGroupInput placeholder="Your name" aria-label="Your name, shown on your cursor" maxLength={24} value={p.cursorName} onChange={(e) => setPrefs({ cursorName: e.target.value })} />
		</InputGroup>
	);
}

/** Clueso cursor or the visitor's own. A two-option radio group drawn as a segmented control. */
function CursorChoice() {
	const p = useSitePrefs();
	const options = [
		{ on: true, label: "Clueso cursor" },
		{ on: false, label: "My own" },
	];
	return (
		<div role="radiogroup" aria-label="Cursor" className="grid grid-cols-2 gap-gap-3xs rounded-medium bg-sunken-1 p-gap-3xs">
			{options.map((o) => (
				<button
					key={o.label}
					type="button"
					role="radio"
					aria-checked={p.cluesoCursor === o.on}
					onClick={() => setPrefs({ cluesoCursor: o.on })}
					className={`focus-ring type-text-s h-7 rounded-small px-gap-xs transition-[background-color,color,box-shadow] duration-200 ease-out-strong ${p.cluesoCursor === o.on ? "bg-raised-2 text-neutral-strong shadow-raised" : "text-neutral-weak hover:text-neutral-strong"}`}
				>
					{o.label}
				</button>
			))}
		</div>
	);
}

function CursorControl({ compact }: { compact?: boolean }) {
	const p = useSitePrefs();
	// Touch screens have no cursor. Name and colour still count (selection, Say hi), the rest doesn't.
	const fine = useFinePointer();
	return (
		<Group label={fine ? "Your cursor" : "You"} compact={compact}>
			<ColorPicker />
			<NameField />
			{fine && (
				<>
					<CursorChoice />
					{p.cluesoCursor && <Slider label="Tilt" unit="°" min={-45} max={45} step={1} value={p.cursorTilt} onValueChange={(t) => setPrefs({ cursorTilt: Math.round(t) })} />}
				</>
			)}
		</Group>
	);
}

function useChanged() {
	const p = useSitePrefs();
	const keys = ["titleFont", "titleWeight", "titleStyle", "textFont", "textWeight", "textStyle", "cursorTilt", "typeBase", "typeRatio"] as const;
	return keys.some((k) => p[k] !== DEFAULT_PREFS[k]);
}

function Controls({ compact }: { compact?: boolean }) {
	const p = useSitePrefs();
	return (
		<>
			<FontControl
				role="Title"
				compact={compact}
				font={p.titleFont}
				weight={p.titleWeight}
				style={p.titleStyle}
				onFont={(titleFont) => setPrefsSmooth({ titleFont })}
				onWeight={(titleWeight) => setPrefs({ titleWeight })}
				onStyle={(titleStyle) => setPrefsSmooth({ titleStyle })}
			/>
			<FontControl
				role="Text"
				compact={compact}
				font={p.textFont}
				weight={p.textWeight}
				style={p.textStyle}
				onFont={(textFont) => setPrefsSmooth({ textFont })}
				onWeight={(textWeight) => setPrefs({ textWeight })}
				onStyle={(textStyle) => setPrefsSmooth({ textStyle })}
			/>
			<ScaleControl compact={compact} />
			<CursorControl compact={compact} />
		</>
	);
}

/** Shuffle the whole look, and put it back. */
function Actions() {
	const changed = useChanged();
	return (
		<div className="flex items-center justify-between gap-gap-2xs">
			<Button variant="transparent" sentiment="neutral" size="xsmall" iconBefore icon={<ShuffleIcon />} className="focus-ring" onClick={() => setPrefsSmooth(shuffleSite())}>
				Shuffle
			</Button>
			<Button variant="transparent" sentiment="neutral" size="xsmall" className="focus-ring" disabled={!changed} onClick={resetPrefs}>
				Reset
			</Button>
		</div>
	);
}

/**
 * The hero asks for two things, your name and a favourite colour, and puts them on your cursor.
 * Everything else (fonts, type scale, tilt) lives behind the Customize website button.
 */
export function TypeTuner() {
	const [open, setOpen] = useState(false);
	const [atFooter, setAtFooter] = useState(false);

	// The button steps aside at the footer so it doesn't cover the footer line.
	useEffect(() => {
		const footer = document.querySelector("footer");
		const fo = new IntersectionObserver(([e]) => setAtFooter(e.isIntersecting));
		if (footer) fo.observe(footer);
		return () => fo.disconnect();
	}, []);

	return (
		<div className="flex flex-col">
			<div className="grid border-t border-neutral-weak text-left md:grid-cols-2 md:pointer-fine:grid-cols-3 [&>*]:border-neutral-weak max-md:[&>*+*]:border-t md:[&>*+*]:border-l">
				<Group label="Your name">
					<NameField />
				</Group>
				<Group label="Favourite colour">
					<ColorPicker />
				</Group>
				{/* Touch screens have no cursor to choose. */}
				<div className="hidden pointer-fine:block">
					<Group label="Cursor">
						<CursorChoice />
					</Group>
				</div>
			</div>
			<div className="flex items-center justify-between gap-gap-s border-t border-neutral-weak px-gap-l py-gap-xs">
				<span className="type-text-s text-left text-neutral-normal">
					<span className="pointer-fine:hidden">Make it yours. Your name and colour stay with you, in this browser.</span>
					<span className="hidden pointer-fine:inline">Make it yours. Your name and colour ride along on your cursor, in this browser.</span>
				</span>
				<Button variant="transparent" sentiment="neutral" size="xsmall" iconBefore icon={<SlidersIcon />} className="focus-ring shrink-0" aria-expanded={open} aria-controls="floating-tuner" onClick={() => setOpen(true)}>
					Fonts and more
				</Button>
			</div>
			<FloatingTuner show={!atFooter || open} open={open} setOpen={setOpen} />
		</div>
	);
}

/** Every control, behind a floating button on the right. */
function FloatingTuner({ show, open, setOpen }: { show: boolean; open: boolean; setOpen: (fn: (o: boolean) => boolean) => void }) {
	const wrap = useRef<HTMLDivElement>(null);

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
								initial={{ opacity: 0, scale: 0.96, y: 8 }}
								animate={{ opacity: 1, scale: 1, y: 0 }}
								exit={{ opacity: 0, scale: 0.96, y: 8 }}
								transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
								style={{ transformOrigin: "bottom right" }}
								className="flex max-h-[calc(100dvh-6rem)] w-72 flex-col overflow-hidden rounded-medium border border-neutral-weak bg-overlay text-left shadow-overlay"
							>
								<div className="flex shrink-0 items-center justify-between border-b border-neutral-weak py-gap-2xs pr-gap-2xs pl-gap-m">
									<span className="type-text-s text-neutral-normal">Make it yours</span>
									<Button variant="transparent" sentiment="neutral" size="xsmall" iconOnly icon={<CloseIcon />} aria-label="Close" className="focus-ring" onClick={() => setOpen(() => false)} />
								</div>
								<div className="min-h-0 flex-1 overflow-y-auto [&>*+*]:border-t [&>*]:border-neutral-weak">
									<Controls compact />
								</div>
								{/* Always in reach, however far the controls scroll. */}
								<div className="shrink-0 border-t border-neutral-weak px-gap-2xs py-gap-2xs">
									<Actions />
								</div>
							</motion.div>
						)}
					</AnimatePresence>
					<button
						type="button"
						aria-expanded={open}
						aria-controls="floating-tuner"
						onClick={() => setOpen((o) => !o)}
						className="focus-ring type-text-s flex h-9 items-center gap-gap-xs rounded-medium border border-neutral-weak bg-overlay px-gap-s text-neutral-strong shadow-overlay transition-transform duration-200 ease-out-strong active:scale-[0.97]"
					>
						<SlidersIcon aria-hidden className="size-4" />
						{open ? "Close" : "Customize website"}
					</button>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
