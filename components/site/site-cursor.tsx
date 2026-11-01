"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { cursorById } from "@/lib/site-prefs";
import { useSitePrefs } from "@/lib/site-prefs-store";
import { useTunerOpen } from "@/lib/tuner-store";
import { useFinePointer } from "@/lib/use-fine-pointer";
import { CURSOR_TIP, CluesoCursor } from "./clueso-cursor";

// Draws the visitor's Clueso cursor wherever the page hides the native one (a .site-cursor scope,
// see styles/site.css). Until the visitor first opens Customize website, the tag says how, from
// the first move on, and stays. After that it shows their name while the pointer rests. Same approach as Brand Lab's cursor: follows the pointer 1:1, presses down
// on click, and sits above everything (menus included) on its own fixed layer. Mouse and pen only.

// Embeds that draw their own cursor (the Brand Lab preview) switch this one off while the pointer is inside them.
let suspended = false;
const suspendListeners = new Set<() => void>();
export function suspendSiteCursor(on: boolean) {
	if (suspended === on) return;
	suspended = on;
	suspendListeners.forEach((l) => l());
}
const subscribeSuspend = (l: () => void) => {
	suspendListeners.add(l);
	return () => suspendListeners.delete(l);
};

/** The name tag keeps at least this much room to the window's right edge, in px; otherwise it sits on the left. */
const EDGE = 16;
/** How long the pointer rests before the name tag appears, in ms. */
const REST_MS = 1000;
/** How long after the first move the hint tag settles in beside the cursor, in ms. */
const HINT_DELAY_MS = 240;
/** Movement smaller than this, in px, doesn't count: a hand on a mouse is never perfectly still. */
const JITTER = 3;
/** The tag's distance from the pointer tip when it sits on the right: the piece plus the gap. */
const TAG_OFFSET = 19 + 6;

export function SiteCursor() {
	const off = useSyncExternalStore(subscribeSuspend, () => suspended, () => false);
	const prefs = useSitePrefs();
	const fine = useFinePointer();
	const [visible, setVisible] = useState(false);
	// The name tag shows only while the pointer rests, so it never trails along while you move.
	const [resting, setResting] = useState(false);
	/** The pointer has moved since the page loaded: the hint comes in only once the cursor is in view. */
	const [moved, setMoved] = useState(false);
	const pointer = useRef(0);
	const layer = useRef<HTMLDivElement>(null);
	const [flip, setFlip] = useState(false);
	const x = useMotionValue(-100);
	const y = useMotionValue(-100);
	const scale = useSpring(1, { stiffness: 700, damping: 18, mass: 0.6 });

	// No hint while the panel is open: the visitor is already doing what it says. Opening the panel
	// once (C or the button) sets hintDone, and the hint never comes back.
	const tunerOpen = useTunerOpen();
	const hinting = !prefs.hintDone && !prefs.onboarded && !tunerOpen;
	const hintingRef = useRef(hinting);
	useEffect(() => {
		hintingRef.current = hinting;
	}, [hinting]);

	useEffect(() => {
		if (!fine) return;
		let last: Element | null = null;
		let at: [number, number] | null = null;
		let rest: number | undefined;
		let still: [number, number] | null = null;
		const check = (t: Element | null) => {
			if (t === last) return;
			last = t;
			setVisible(!!t && getComputedStyle(t).cursor === "none");
		};
		const move = (e: PointerEvent) => {
			if (e.pointerType === "touch") return;
			at = [e.clientX, e.clientY];
			pointer.current = e.clientX;
			x.set(e.clientX - CURSOR_TIP[0]);
			y.set(e.clientY - CURSOR_TIP[1]);
			check(e.target as Element | null);
			setMoved(true);
			// The hint always shows, so it picks its side as the pointer moves: right, unless that
			// would bring it within EDGE px of the window's edge.
			if (hintingRef.current) {
				const tag = layer.current?.querySelector<HTMLElement>("[data-cursor-tag]");
				setFlip(e.clientX + TAG_OFFSET + (tag?.offsetWidth ?? 0) > innerWidth - EDGE);
			}
			if (still && Math.hypot(e.clientX - still[0], e.clientY - still[1]) < JITTER) return;
			still = null;
			setResting(false);
			window.clearTimeout(rest);
			rest = window.setTimeout(() => {
				still = [e.clientX, e.clientY];
				// Side is decided as it appears, never while it shows: right, unless it would come
				// within EDGE px of the window's edge.
				const tag = layer.current?.querySelector<HTMLElement>("[data-cursor-tag]");
				setFlip(e.clientX + TAG_OFFSET + (tag?.offsetWidth ?? 0) > innerWidth - EDGE);
				setResting(true);
			}, REST_MS);
		};
		// Scrolling moves the page under a still pointer: look again at what's under it.
		const scroll = () => at && check(document.elementFromPoint(at[0], at[1]));
		const down = (e: PointerEvent) => e.pointerType !== "touch" && scale.set(0.96);
		const up = () => scale.set(1);
		const leave = () => {
			last = null;
			setVisible(false);
		};
		window.addEventListener("pointermove", move, { passive: true });
		window.addEventListener("scroll", scroll, { passive: true });
		window.addEventListener("pointerdown", down, { passive: true });
		window.addEventListener("pointerup", up, { passive: true });
		window.addEventListener("pointercancel", up, { passive: true });
		document.documentElement.addEventListener("pointerleave", leave);
		return () => {
			window.removeEventListener("pointermove", move);
			window.removeEventListener("scroll", scroll);
			window.removeEventListener("pointerdown", down);
			window.removeEventListener("pointerup", up);
			window.removeEventListener("pointercancel", up);
			document.documentElement.removeEventListener("pointerleave", leave);
			window.clearTimeout(rest);
		};
	}, [fine, x, y, scale]);

	const name = prefs.cursorName.trim();

	// The hint settles in a beat after the first move, so it lands once the cursor is already there.
	const [hintIn, setHintIn] = useState(false);
	useEffect(() => {
		if (!moved || !hinting) return;
		const t = window.setTimeout(() => setHintIn(true), HINT_DELAY_MS);
		return () => window.clearTimeout(t);
	}, [moved, hinting]);

	if (!fine) return null;
	const tag = hinting ? (
		<>
			Press <kbd className="mx-0.5 rounded-tiny bg-current/20 px-1 font-code">C</kbd> to customize
		</>
	) : (
		name || undefined
	);
	const label = hinting ? hintIn : resting;
	return createPortal(
		// A still, full-window layer with the cursor moving inside it.
		<div ref={layer} aria-hidden className="pointer-events-none fixed inset-0 z-[2147483646] overflow-hidden select-none">
			<motion.div
				className="absolute top-0 left-0"
				style={{ x, y, scale, opacity: visible && !off ? 1 : 0, transformOrigin: `${CURSOR_TIP[0]}px ${CURSOR_TIP[1]}px` }}
			>
				<CluesoCursor color={cursorById(prefs.cursorColor)} name={tag} tilt={prefs.cursorTilt} label={label} flip={flip} wide={hinting} />
			</motion.div>
		</div>,
		document.body,
	);
}
