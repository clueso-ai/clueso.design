import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// The Clueso cursor as a DOM element, so a click can spring it down and back like a button press
// (a CSS cursor image can't animate). Only where the stylesheet says `cursor: none` (the arrow and
// hand states, see shell.css); grab, resize and text cursors stay native. Mouse and pen only.

const W = 26;
const H = 23;
/** The piece's top-left tip, in the drawn 26×23 cursor. */
const TIP: [number, number] = [5, 8];

export function CustomCursor() {
	const [on, setOn] = useState(false);
	const [visible, setVisible] = useState(false);
	// ⌥ over something draggable (canvas objects, board canvases): the duplicate cursor, like Figma.
	const [dup, setDup] = useState(false);
	const x = useMotionValue(-100);
	const y = useMotionValue(-100);
	const scale = useSpring(1, { stiffness: 700, damping: 18, mass: 0.6 });

	useEffect(() => {
		const fine = window.matchMedia("(pointer: fine)");
		const sync = () => {
			document.documentElement.classList.toggle("custom-cursor", fine.matches);
			setOn(fine.matches);
		};
		sync();
		fine.addEventListener("change", sync);
		return () => {
			fine.removeEventListener("change", sync);
			document.documentElement.classList.remove("custom-cursor");
		};
	}, []);

	useEffect(() => {
		if (!on) return;
		let last: Element | null = null;
		let show = false;
		let alt = false;
		const evaluate = () => {
			const t = last;
			const onDup = alt && !!t?.closest("[data-dup]");
			document.documentElement.classList.toggle("dup-cursor", onDup);
			show = !!t && (onDup || getComputedStyle(t).cursor === "none");
			setVisible(show);
			setDup(onDup);
		};
		const move = (e: PointerEvent) => {
			if (e.pointerType === "touch") return;
			x.set(e.clientX - TIP[0]);
			y.set(e.clientY - TIP[1]);
			alt = e.altKey;
			// Re-check the cursor only when the element under the pointer (or ⌥) changes.
			const t = e.target as Element | null;
			if (t !== last || alt !== document.documentElement.classList.contains("dup-cursor")) {
				last = t;
				evaluate();
			} else if (!show) setVisible(false);
		};
		const key = (e: KeyboardEvent) => {
			if (e.key !== "Alt" || alt === (e.type === "keydown")) return;
			alt = e.type === "keydown";
			evaluate();
		};
		const blur = () => {
			alt = false;
			evaluate();
		};
		const down = (e: PointerEvent) => e.pointerType !== "touch" && scale.set(0.96);
		const up = () => scale.set(1);
		const leave = () => {
			last = null;
			setVisible(false);
		};
		window.addEventListener("pointermove", move, { passive: true });
		window.addEventListener("keydown", key);
		window.addEventListener("keyup", key);
		window.addEventListener("blur", blur);
		window.addEventListener("pointerdown", down, { passive: true });
		window.addEventListener("pointerup", up, { passive: true });
		window.addEventListener("pointercancel", up, { passive: true });
		document.documentElement.addEventListener("pointerleave", leave);
		return () => {
			window.removeEventListener("pointermove", move);
			window.removeEventListener("keydown", key);
			window.removeEventListener("keyup", key);
			window.removeEventListener("blur", blur);
			window.removeEventListener("pointerdown", down);
			window.removeEventListener("pointerup", up);
			window.removeEventListener("pointercancel", up);
			document.documentElement.removeEventListener("pointerleave", leave);
		};
	}, [on, x, y, scale]);

	if (!on) return null;
	// In the browser's top layer (a manual popover), which paints above every z-index on the page.
	// jigsaw's selects and tooltips also use the max z-index and portal to <body> after the cursor, so
	// a z-index alone loses those ties.
	return createPortal(
		<motion.div
			ref={(el) => {
				if (el && !el.matches(":popover-open")) el.showPopover?.();
			}}
			popover="manual"
			aria-hidden
			className="pointer-events-none fixed inset-auto top-0 left-0 z-[2147483647] m-0 overflow-visible border-0 bg-transparent p-0 select-none"
			style={{ x, y, scale, opacity: visible ? 1 : 0, transformOrigin: `${TIP[0]}px ${TIP[1]}px`, width: W, height: H }}
		>
			{/* A tiny fixed SVG; next/image adds nothing here. */}
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img src="/cursor.svg" alt="" draggable={false} width={W} height={H} className="block" />
			{dup && (
				// The duplicate badge: a small plus beside the piece.
				<svg width="11" height="11" viewBox="0 0 11 11" className="absolute" style={{ left: TIP[0] + 13, top: TIP[1] + 12 }}>
					<rect x="0.5" y="0.5" width="10" height="10" rx="2" fill="black" stroke="white" />
					<path d="M5.5 3V8M3 5.5H8" stroke="white" strokeLinecap="round" />
				</svg>
			)}
		</motion.div>,
		document.body,
	);
}
