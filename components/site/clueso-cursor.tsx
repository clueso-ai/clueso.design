import { type MotionValue, motion } from "framer-motion";
import type { ReactNode } from "react";
import type { CursorColor } from "@/lib/site-prefs";

// The Clueso cursor: an upright brand piece, a square with two cavities cut into its right and
// bottom edges. Its top-left corner is the pointer tip. A name tag sits beside
// it, like a multiplayer cursor. Only the piece tilts; the tag stays level.

/** The cursor exactly as designed (41×41 artboard, piece from 8.5 to 32.5, 1px white outline). */
const PIECE =
	"M9.5 8.5L31.5 8.5C32.0523 8.5 32.5 8.94772 32.5 9.5V15.18C32.5 15.7323 32.0523 16.18 31.5 16.18H31.06C28.6741 16.18 26.74 18.1141 26.74 20.5C26.74 22.8859 28.6741 24.82 31.06 24.82H31.5C32.0523 24.82 32.5 25.2677 32.5 25.82V31.5C32.5 32.0523 32.0523 32.5 31.5 32.5H25.82C25.2677 32.5 24.82 32.0523 24.82 31.5V31.06C24.82 28.6741 22.8859 26.74 20.5 26.74C18.1141 26.74 16.18 28.6741 16.18 31.06V31.5C16.18 32.0523 15.7323 32.5 15.18 32.5H9.5C8.94771 32.5 8.5 32.0523 8.5 31.5V9.5C8.5 8.94772 8.94771 8.5 9.5 8.5Z";

/** Size of the drawn piece in px. */
export const CURSOR_SIZE = 19;
/** Where the pointer tip sits inside the drawing, in px. */
export const CURSOR_TIP: [number, number] = [0.75, 0.75];

/**
 * `label` false hides the name tag (the site cursor shows it only while the pointer rests). `flip`
 * puts the tag on the left of the piece, for when the right edge of the window is close. The tag
 * grows out of the corner next to the piece and shrinks back into it, both on an ease-out curve:
 * a gentle settle coming in, a quick tuck going out.
 */
export function CluesoCursor({
	color,
	name,
	tilt = 0,
	label = true,
	flip = false,
	wide = false,
	press,
	className,
}: {
	color: CursorColor;
	/** A name, or a short hint with markup (the site cursor's "Press C to customize"). */
	name?: ReactNode;
	tilt?: number;
	label?: boolean;
	flip?: boolean;
	/** A hint, not a name: room for a sentence, and a little more padding so it reads as a callout. */
	wide?: boolean;
	/** The press: scales the piece alone, so the tag stays put at full size. */
	press?: MotionValue<number>;
	className?: string;
}) {
	// Anchored on the corner nearest the piece: top left when the tag is on the right, top right when it's on the left.
	const side = flip ? "right-full mr-0.5" : "left-full ml-1.5";
	const pill = `block truncate type-text-xs whitespace-nowrap ${wide ? "max-w-80 rounded-small px-1.5 py-0.5" : "max-w-48 rounded-tiny px-1"}`;
	// Coming in, it slides out from under the piece as it grows; going out, it tucks back the same way.
	const hidden = flip ? "translate-x-1" : "-translate-x-1";
	return (
		<span aria-hidden className={`relative block ${className ?? ""}`} style={{ width: CURSOR_SIZE, height: CURSOR_SIZE }}>
			<motion.svg
				viewBox="8 8 25 25"
				width={CURSOR_SIZE}
				height={CURSOR_SIZE}
				className="block overflow-visible"
				// The design's shadow: 4px blur, black at 29%.
				style={{ rotate: tilt, scale: press, transformOrigin: `${CURSOR_TIP[0]}px ${CURSOR_TIP[1]}px`, filter: "drop-shadow(0 0 3px rgb(0 0 0 / 0.29))" }}
			>
				<path d={PIECE} fill={color.fill} stroke="white" strokeWidth={1} vectorEffect="non-scaling-stroke" />
			</motion.svg>
			{name && (
				<span
					data-cursor-tag
					className={`absolute top-2.5 shadow-raised ${pill} ${side} ${flip ? "origin-top-right" : "origin-top-left"} transition-[scale,opacity,translate] ease-out-strong motion-reduce:transition-none ${label ? "translate-x-0 scale-100 opacity-100 duration-300" : `${hidden} scale-60 opacity-0 duration-150`}`}
					style={{ background: color.fill, color: color.ink }}
				>
					{name}
				</span>
			)}
		</span>
	);
}
