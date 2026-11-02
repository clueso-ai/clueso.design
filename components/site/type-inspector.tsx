"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/lib/design-system";
import { CheckIcon, ChevronRightIcon, CloseIcon, CopyIcon, FontSizeIcon } from "@/lib/design-system/icons";
import { useSitePrefs } from "@/lib/site-prefs-store";
import { useFinePointer } from "@/lib/use-fine-pointer";

// Select any text on the site and a small toolbar floats above it: Copy text, and Inspect. Inspect
// turns it into a specimen card, like a type foundry's spec sheet: the family and weight set in the
// face itself, then size, leading and tracking, read from the styles the browser actually
// computed, so it follows the visitor's own fonts and type scale. A selection across several
// styles says so ("1 of 2") and steps through them. Close puts it away until the next selection. Mouse and pen only: on touch the system's own selection menu sits there.

/** How long a selection has to hold still before the toolbar comes in, in ms. */
const SETTLE_MS = 140;
/** Room kept to the window's edges, and between the card and the selection, in px. */
const EDGE = 16;
const GAP = 10;
/** Card width (w-64) and a little more than its height, to decide whether it fits above. */
const CARD_W = 256;
const CARD_H = 210;
/** How long "Copied" stays up, in ms. */
const COPIED_MS = 1600;

/** Where the card can't go: fields, and Customize website, which has its own type controls. */
const SKIP = "input, textarea, select, [contenteditable='true'], #floating-tuner, [data-type-inspector]";

const WEIGHT_NAMES: [number, string][] = [
	[150, "Thin"],
	[250, "ExtraLight"],
	[325, "Light"],
	[375, "Book"],
	[450, "Regular"],
	[550, "Medium"],
	[650, "SemiBold"],
	[750, "Bold"],
	[850, "ExtraBold"],
	[1000, "Black"],
];
const weightName = (w: number) => WEIGHT_NAMES.find(([max]) => w < max)?.[1] ?? "Black";

/** Trims a number to what's worth reading, with a real minus sign. */
const num = (n: number, digits = 2) => {
	const s = Number(n.toFixed(digits)).toString();
	return s.startsWith("-") ? `−${s.slice(1)}` : s;
};

/** One style found in the selection. */
interface Face {
	family: string;
	/** The full stack, so the name renders in the very same face. */
	stack: string;
	weight: number;
	italic: boolean;
	size: number;
	rem: number;
	/** null for "normal", which the browser picks per font. */
	leading: number | null;
	tracking: number;
	/** The first bit of selected text set in it, so mixed styles can be told apart. */
	sample: string;
}

interface Spec {
	/** The selected text, for Copy text. */
	text: string;
	/** Every distinct style in the selection, in reading order. Usually one. */
	faces: Face[];
	/** Where the card sits, in viewport px, and whether it hangs below the selection. */
	x: number;
	y: number;
	below: boolean;
}

/** The element whose styles the selected text is set in: where the selection starts. */
function startElement(range: Range): Element | null {
	const n = range.startContainer;
	if (n.nodeType === Node.TEXT_NODE) return n.parentElement;
	const child = (n as Element).childNodes[range.startOffset];
	return child?.nodeType === Node.ELEMENT_NODE ? (child as Element) : (n as Element);
}

/** Text nodes checked per selection, at most: plenty for anything a person selects by hand. */
const MAX_NODES = 400;

function faceOf(el: Element, root: number, sample: string): Face {
	const cs = getComputedStyle(el);
	const size = parseFloat(cs.fontSize);
	const lh = parseFloat(cs.lineHeight);
	const ls = parseFloat(cs.letterSpacing);
	return {
		family: cs.fontFamily.split(",")[0].trim().replace(/^["']|["']$/g, ""),
		stack: cs.fontFamily,
		weight: Number(cs.fontWeight) || 400,
		italic: cs.fontStyle === "italic",
		size,
		rem: size / root,
		leading: Number.isNaN(lh) ? null : lh / size,
		tracking: Number.isNaN(ls) ? 0 : ls / size,
		sample,
	};
}

/** The distinct styles across the selected text, walking its text nodes in order. */
function facesIn(range: Range): Face[] {
	const root = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
	const top = range.commonAncestorContainer;
	const walker = document.createTreeWalker(top.nodeType === Node.TEXT_NODE ? top.parentNode! : top, NodeFilter.SHOW_TEXT);
	const faces = new Map<string, Face>();
	let node: Node | null = top.nodeType === Node.TEXT_NODE ? top : walker.nextNode();
	for (let n = 0; node && n < MAX_NODES; n++, node = walker.nextNode()) {
		const el = node.parentElement;
		if (!el || !range.intersectsNode(node) || el.closest(SKIP) || !el.getClientRects().length) continue;
		let text = node.textContent ?? "";
		// Only the selected part: cut the end first, so the start offset still lines up.
		if (node === range.endContainer) text = text.slice(0, range.endOffset);
		if (node === range.startContainer) text = text.slice(range.startOffset);
		text = text.replace(/\s+/g, " ").trim();
		if (!text) continue;
		const f = faceOf(el, root, text);
		const key = [f.stack, f.weight, f.italic, f.size, f.leading, f.tracking].join("|");
		if (!faces.has(key)) faces.set(key, f);
		if (top.nodeType === Node.TEXT_NODE) break;
	}
	return [...faces.values()];
}

function read(): Spec | null {
	const sel = window.getSelection();
	if (!sel || sel.isCollapsed || !sel.rangeCount || !sel.toString().trim()) return null;
	const range = sel.getRangeAt(0);
	const el = startElement(range);
	if (!el || el.closest(SKIP) || !el.closest("[data-type-scope]")) return null;
	const faces = facesIn(range);
	if (!faces.length) faces.push(faceOf(el, parseFloat(getComputedStyle(document.documentElement).fontSize) || 16, sel.toString().trim()));
	// A selection over several lines: anchor on the first line's box, so the card sits by where reading starts.
	const rect = range.getClientRects()[0] ?? range.getBoundingClientRect();
	const below = rect.top < CARD_H + GAP + EDGE;
	return {
		text: sel.toString(),
		faces,
		x: Math.min(Math.max(rect.left, EDGE), innerWidth - CARD_W - EDGE),
		y: below ? rect.bottom + GAP : rect.top - GAP,
		below,
	};
}

function Row({ label, value, detail }: { label: string; value: string; detail?: string }) {
	return (
		<div className="grid grid-cols-[5rem_1fr_auto] items-baseline gap-gap-xs py-gap-2xs">
			<dt className="type-text-xs text-neutral-weak">{label}</dt>
			<dd className="type-text-s font-code text-neutral-strong tabular-nums">{value}</dd>
			<dd className="type-text-xs font-code text-neutral-weak tabular-nums">{detail}</dd>
		</div>
	);
}

const MOTION = { duration: 0.18, ease: [0.23, 1, 0.32, 1] } as const;

export function TypeInspector() {
	const fine = useFinePointer();
	const prefs = useSitePrefs();
	const [spec, setSpec] = useState<Spec | null>(null);
	/** The toolbar, or the specimen card it opens. */
	const [inspecting, setInspecting] = useState(false);
	/** Which of the selection's styles the card shows, when there's more than one. */
	const [index, setIndex] = useState(0);
	const [copied, setCopied] = useState(false);
	const copiedTimer = useRef<number | undefined>(undefined);

	useEffect(() => {
		if (!fine) return;
		let pressing = false;
		let settle: number | undefined;
		let frame = 0;
		// A new selection always starts on the toolbar.
		const update = () => {
			setSpec(read());
			setInspecting(false);
			setIndex(0);
			setCopied(false);
		};
		// While a drag is still choosing text, wait. Once the selection holds still, show the toolbar.
		const changed = () => {
			window.clearTimeout(settle);
			const sel = window.getSelection();
			if (!sel || sel.isCollapsed) return setSpec(null);
			if (!pressing) settle = window.setTimeout(update, SETTLE_MS);
		};
		const down = (e: PointerEvent) => {
			// Presses on the toolbar or card leave the selection alone.
			if ((e.target as Element).closest?.("[data-type-inspector]")) return;
			if (e.pointerType !== "touch") pressing = true;
		};
		const up = () => {
			if (!pressing) return;
			pressing = false;
			window.clearTimeout(settle);
			settle = window.setTimeout(update, SETTLE_MS);
		};
		const key = (e: KeyboardEvent) => e.key === "Escape" && setSpec(null);
		// The page moves under a selection when it scrolls or resizes: keep the toolbar with it.
		const follow = () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() => setSpec((s) => (s ? read() : s)));
		};
		document.addEventListener("selectionchange", changed);
		window.addEventListener("pointerdown", down, { passive: true });
		window.addEventListener("pointerup", up, { passive: true });
		window.addEventListener("keydown", key);
		window.addEventListener("scroll", follow, { passive: true, capture: true });
		window.addEventListener("resize", follow, { passive: true });
		return () => {
			document.removeEventListener("selectionchange", changed);
			window.removeEventListener("pointerdown", down);
			window.removeEventListener("pointerup", up);
			window.removeEventListener("keydown", key);
			window.removeEventListener("scroll", follow, { capture: true });
			window.removeEventListener("resize", follow);
			window.clearTimeout(settle);
			window.clearTimeout(copiedTimer.current);
			cancelAnimationFrame(frame);
		};
	}, [fine]);

	const copy = (text: string) =>
		navigator.clipboard?.writeText(text).then(
			() => {
				setCopied(true);
				window.clearTimeout(copiedTimer.current);
				copiedTimer.current = window.setTimeout(() => setCopied(false), COPIED_MS);
			},
			() => {},
		);

	if (!fine) return null;
	const count = spec?.faces.length ?? 0;
	const f = spec ? spec.faces[Math.min(index, count - 1)] : null;
	const face = f ? { fontFamily: f.stack, fontWeight: f.weight, fontStyle: f.italic ? "italic" : undefined } : undefined;
	const step = (by: number) => setIndex((i) => (i + by + count) % count);
	return createPortal(
		<AnimatePresence>
			{spec && f && (
				<motion.div
					key="type-inspector"
					data-type-inspector
					initial={{ opacity: 0, scale: 0.97, y: spec.below ? -4 : 4 }}
					animate={{ opacity: 1, scale: 1, y: 0 }}
					exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.1, ease: "easeOut" } }}
					transition={MOTION}
					// Pressing it mustn't clear the selection it acts on. It sits outside the page's cursor
					// scope, so it joins it here to keep the Clueso cursor over it.
					onPointerDown={(e) => e.preventDefault()}
					className={`fixed z-50 select-none ${prefs.cluesoCursor ? "site-cursor" : ""}`}
					style={{ left: spec.x, top: spec.y, translateY: spec.below ? 0 : "-100%", transformOrigin: spec.below ? "top left" : "bottom left" }}
				>
					<AnimatePresence mode="popLayout" initial={false}>
						{!inspecting ? (
							// The toolbar: two actions side by side.
							<motion.div
								key="menu"
								role="toolbar"
								aria-label="Selected text"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0, transition: { duration: 0.08 } }}
								transition={MOTION}
								className="flex items-center gap-gap-3xs rounded-medium border border-neutral-weak bg-overlay p-gap-3xs shadow-overlay"
							>
								<Button variant="transparent" sentiment="neutral" size="small" iconBefore icon={copied ? <CheckIcon /> : <CopyIcon />} className="focus-ring" onClick={() => copy(spec.text)}>
									{copied ? "Copied" : "Copy text"}
								</Button>
								<span aria-hidden className="h-4 w-px bg-neutral-weak" />
								<Button variant="transparent" sentiment="neutral" size="small" iconBefore icon={<FontSizeIcon />} className="focus-ring" onClick={() => setInspecting(true)}>
									Inspect
								</Button>
							</motion.div>
						) : (
							// The specimen card, opened from Inspect.
							<motion.div
								key="card"
								role="group"
								aria-label="Type specimen"
								initial={{ opacity: 0, scale: 0.97 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, transition: { duration: 0.08 } }}
								transition={MOTION}
								style={{ transformOrigin: spec.below ? "top left" : "bottom left" }}
								className="w-64 overflow-hidden rounded-medium border border-neutral-weak bg-overlay shadow-overlay"
							>
								{/* Mixed styles: which one this is, and arrows to the others. */}
								{count > 1 && (
									<div className="flex items-center justify-between border-b border-neutral-weak py-gap-2xs pr-gap-2xs pl-gap-m">
										<span className="type-text-xs text-neutral-weak">Mixed styles</span>
										<span className="flex items-center gap-gap-3xs">
											<Button variant="transparent" sentiment="neutral" size="xsmall" iconOnly icon={<ChevronRightIcon className="rotate-180" />} aria-label="Previous style" className="focus-ring" onClick={() => step(-1)} />
											<span className="type-text-xs font-code min-w-12 text-center tabular-nums" aria-live="polite">
												<span className="text-neutral-strong">{Math.min(index, count - 1) + 1}</span>
												<span className="text-neutral-weak"> of {count}</span>
											</span>
											<Button variant="transparent" sentiment="neutral" size="xsmall" iconOnly icon={<ChevronRightIcon />} aria-label="Next style" className="focus-ring" onClick={() => step(1)} />
										</span>
									</div>
								)}
								<div className="flex items-start justify-between gap-gap-xs border-b border-neutral-weak py-gap-s pr-gap-s pl-gap-m">
									<span className="flex min-w-0 flex-col">
										<span className="type-text-m truncate text-neutral-strong" style={face}>
											{f.family}
										</span>
										<span className="type-text-xs font-code text-neutral-weak">
											{weightName(f.weight)} {f.weight}
											{f.italic ? " Italic" : ""}
										</span>
										{count > 1 && <span className="type-text-xs mt-gap-2xs truncate text-neutral-normal">“{f.sample}”</span>}
									</span>
									<Button variant="outlined" sentiment="neutral" size="xsmall" iconOnly icon={<CloseIcon />} aria-label="Close" className="focus-ring shrink-0" onClick={() => setSpec(null)} />
								</div>
								<dl className="flex flex-col px-gap-m py-gap-xs">
									<Row label="Size" value={`${num(f.size, 1)} px`} detail={`${num(f.rem, 3)} rem`} />
									<Row label="Line height" value={f.leading === null ? "Normal" : num(f.leading)} detail={f.leading === null ? "font default" : `${num(f.leading * f.size, 1)} px`} />
									<Row label="Tracking" value={`${num(f.tracking, 3)} em`} detail={`${num(f.tracking * f.size, 2)} px`} />
								</dl>
							</motion.div>
						)}
					</AnimatePresence>
				</motion.div>
			)}
		</AnimatePresence>,
		document.body,
	);
}
