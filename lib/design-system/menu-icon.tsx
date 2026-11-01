// Jigsaw has no menu icon yet. Two lines, drawn like Jigsaw's Cross, that turn into a cross when
// the menu is open. Remove when Jigsaw ships one.

export function MenuIcon({ open = false, className, style }: { open?: boolean; className?: string; style?: React.CSSProperties }) {
	const line = "origin-center transition-transform duration-200 ease-out-strong motion-reduce:transition-none";
	return (
		<svg viewBox="0 0 24 24" fill="none" aria-hidden className={className} style={style}>
			<path d="M5 8H19" stroke="currentColor" strokeLinecap="round" className={line} style={{ transformBox: "fill-box", transform: open ? "translateY(4px) rotate(45deg)" : undefined }} />
			<path d="M5 16H19" stroke="currentColor" strokeLinecap="round" className={line} style={{ transformBox: "fill-box", transform: open ? "translateY(-4px) rotate(-45deg)" : undefined }} />
		</svg>
	);
}
