"use client";

import { motion, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { type RemoteCursor, send, usePresence } from "@/lib/presence";
import { cursorById } from "@/lib/site-prefs";
import { useSitePrefs } from "@/lib/site-prefs-store";
import { useFinePointer } from "@/lib/use-fine-pointer";
import { CURSOR_TIP, CluesoCursor } from "./clueso-cursor";

// Other visitors' Clueso cursors, live, with their names and colours. You see the people on the
// same page as you, and they see you. Positions are measured from the middle of the window and the
// top of the page, so they line up while the page is centred in a wide window; below that, the
// layout reflows and a cursor lands near, not exactly on, what its owner is pointing at.
// Mouse and pen only, like the site cursor: touch screens neither send nor show cursors.

export function RemoteCursors() {
	const fine = useFinePointer();
	const prefs = useSitePrefs();
	const path = usePathname();
	const { cursors } = usePresence();
	const { scrollY } = useScroll();

	useEffect(() => send({ page: path }), [path]);
	useEffect(() => send({ name: prefs.cursorName.trim(), color: prefs.cursorColor, tilt: prefs.cursorTilt }), [prefs.cursorName, prefs.cursorColor, prefs.cursorTilt]);

	useEffect(() => {
		if (!fine) return;
		const move = (e: PointerEvent) => e.pointerType !== "touch" && send({ x: e.pageX - document.documentElement.clientWidth / 2, y: e.pageY });
		const away = () => send({ x: null, y: null });
		const visibility = () => document.visibilityState === "hidden" && away();
		window.addEventListener("pointermove", move, { passive: true });
		document.documentElement.addEventListener("pointerleave", away);
		document.addEventListener("visibilitychange", visibility);
		return () => {
			window.removeEventListener("pointermove", move);
			document.documentElement.removeEventListener("pointerleave", away);
			document.removeEventListener("visibilitychange", visibility);
		};
	}, [fine]);

	if (!fine) return null;
	const here = cursors.filter((c) => c.page === path && c.x !== null && c.y !== null);
	return createPortal(
		// Just under the visitor's own cursor (z-[2147483646] in site-cursor.tsx).
		<div aria-hidden className="pointer-events-none fixed inset-0 z-[2147483645] overflow-hidden select-none">
			{here.map((c) => (
				<Cursor key={c.id} cursor={c} scrollY={scrollY} />
			))}
		</div>,
		document.body,
	);
}

/** One visitor's cursor. Glides between updates so ~15 a second reads as smooth movement. */
function Cursor({ cursor, scrollY }: { cursor: RemoteCursor; scrollY: MotionValue<number> }) {
	const reduce = useReducedMotion();
	const spring = reduce ? { duration: 0 } : { stiffness: 500, damping: 45, mass: 0.6 };
	const px = useSpring(cursor.x ?? 0, spring);
	const py = useSpring(cursor.y ?? 0, spring);
	useEffect(() => {
		if (cursor.x !== null) px.set(cursor.x);
		if (cursor.y !== null) py.set(cursor.y);
	}, [cursor.x, cursor.y, px, py]);
	const x = useTransform(() => document.documentElement.clientWidth / 2 + px.get() - CURSOR_TIP[0]);
	const y = useTransform(() => py.get() - scrollY.get() - CURSOR_TIP[1]);

	return (
		<motion.div className="absolute top-0 left-0" style={{ x, y }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
			<CluesoCursor color={cursorById(cursor.color)} name={cursor.name || "Visitor"} tilt={cursor.tilt} />
		</motion.div>
	);
}
