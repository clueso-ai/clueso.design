"use client";

import { type ReactNode, useEffect, useRef } from "react";

// The site header, sticky. Scrolling down past it tucks the logo's "Design" away into the mark
// (styles/site.css); scrolling back up, even a little, brings it out again.

/** Movement smaller than this, in px, is ignored, so a resting finger or trackpad doesn't flicker it. */
const JITTER = 6;

export function TuckingHeader({ className, children }: { className: string; children: ReactNode }) {
	const ref = useRef<HTMLElement>(null);
	useEffect(() => {
		let last = scrollY;
		const scroll = () => {
			const y = scrollY;
			if (Math.abs(y - last) < JITTER) return;
			const el = ref.current;
			// Near the top it always shows; below that, down tucks and up untucks.
			if (el) el.toggleAttribute("data-tucked", y > (el.offsetHeight || 64) && y > last);
			last = y;
		};
		window.addEventListener("scroll", scroll, { passive: true });
		return () => window.removeEventListener("scroll", scroll);
	}, []);
	return (
		<header ref={ref} className={className}>
			{children}
		</header>
	);
}
