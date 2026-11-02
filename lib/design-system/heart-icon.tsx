// Jigsaw has no heart icon yet. Drawn on Jigsaw's 24px grid with round caps; filled once you've
// hearted the site. Remove when Jigsaw ships one.

export function HeartIcon({ filled = false, className }: { filled?: boolean; className?: string }) {
	return (
		<svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
			<path
				d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
				fill={filled ? "currentColor" : "none"}
				stroke="currentColor"
				strokeWidth={1.5}
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
