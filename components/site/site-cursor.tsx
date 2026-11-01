"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { cursorById } from "@/lib/site-prefs";
import { useSitePrefs } from "@/lib/site-prefs-store";
import { useFinePointer } from "@/lib/use-fine-pointer";
import { CURSOR_TIP, CluesoCursor } from "./clueso-cursor";

// Draws the visitor's Clueso cursor wherever the page hides the native one (a .site-cursor scope,
// see styles/site.css). Same approach as Brand Lab's cursor: follows the pointer 1:1, presses down
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

/** How long the mouse rests before the name tag tucks away. */
const IDLE_MS = 2000;

export function SiteCursor() {
	const off = useSyncExternalStore(subscribeSuspend, () => suspended, () => false);
	const prefs = useSitePrefs();
	const fine = useFinePointer();
	const [visible, setVisible] = useState(false);
	// The name tag steps aside when the mouse rests, and comes back on the next move.
	const [awake, setAwake] = useState(true);
	const x = useMotionValue(-100);
	const y = useMotionValue(-100);
	const scale = useSpring(1, { stiffness: 700, damping: 18, mass: 0.6 });

	useEffect(() => {
		if (!fine) return;
		let last: Element | null = null;
		let at: [number, number] | null = null;
		let rest: number | undefined;
		const check = (t: Element | null) => {
			// Mid theme wipe every event lands on the page root: keep showing what was under the pointer.
			if (document.documentElement.classList.contains("theme-wipe")) return;
			if (t === last) return;
			last = t;
			setVisible(!!t && getComputedStyle(t).cursor === "none");
		};
		const move = (e: PointerEvent) => {
			if (e.pointerType === "touch") return;
			at = [e.clientX, e.clientY];
			x.set(e.clientX - CURSOR_TIP[0]);
			y.set(e.clientY - CURSOR_TIP[1]);
			check(e.target as Element | null);
			setAwake(true);
			window.clearTimeout(rest);
			rest = window.setTimeout(() => setAwake(false), IDLE_MS);
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

	if (!fine) return null;
	return createPortal(
		// A still, full-window layer with the cursor moving inside it. During the theme wipe it becomes
		// its own live view-transition layer (data-site-cursor, styles/site.css), so it keeps moving.
		<div aria-hidden data-site-cursor className="pointer-events-none fixed inset-0 z-[2147483646] overflow-hidden select-none">
			<motion.div
				className="absolute top-0 left-0"
				style={{ x, y, scale, opacity: visible && !off ? 1 : 0, transformOrigin: `${CURSOR_TIP[0]}px ${CURSOR_TIP[1]}px` }}
			>
				<CluesoCursor color={cursorById(prefs.cursorColor)} name={prefs.cursorName.trim() || undefined} tilt={prefs.cursorTilt} label={awake} />
			</motion.div>
		</div>,
		document.body,
	);
}
