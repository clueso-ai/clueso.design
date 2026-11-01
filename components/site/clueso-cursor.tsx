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

/** `label` false tucks the name tag away (the site cursor does this when the mouse rests). */
export function CluesoCursor({ color, name, tilt = 0, label = true, className }: { color: CursorColor; name?: string; tilt?: number; label?: boolean; className?: string }) {
	return (
		<span aria-hidden className={`relative block ${className ?? ""}`} style={{ width: CURSOR_SIZE, height: CURSOR_SIZE }}>
			<svg
				viewBox="8 8 25 25"
				width={CURSOR_SIZE}
				height={CURSOR_SIZE}
				className="block overflow-visible"
				// The design's shadow: 4px blur, black at 29%.
				style={{ rotate: `${tilt}deg`, transformOrigin: `${CURSOR_TIP[0]}px ${CURSOR_TIP[1]}px`, filter: "drop-shadow(0 0 3px rgb(0 0 0 / 0.29))" }}
			>
				<path d={PIECE} fill={color.fill} stroke="white" strokeWidth={1} vectorEffect="non-scaling-stroke" />
			</svg>
			{name && (
				<span
					className={`absolute top-2.5 left-full ml-1.5 max-w-48 origin-left truncate type-text-xs rounded-tiny px-1 whitespace-nowrap shadow-raised transition-[opacity,scale,translate] duration-200 ease-out-strong motion-reduce:transition-none ${label ? "" : "-translate-x-1 scale-90 opacity-0"}`}
					style={{ background: color.fill, color: color.ink }}
				>
					{name}
				</span>
			)}
		</span>
	);
}
