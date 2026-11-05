"use client";

import { MusicIcon } from "@/lib/design-system/icons";
import { setBeatBoxOpen, useBeatBoxOpen } from "./beat-box";

// Opens the beat box under the logo, and closes it. The box grows above this button, so the page
// scrolls with it while it animates: the button stays under the pointer, open or closed.

/** A bit longer than the beat box's 0.3s open and close, so the last frame is caught too. */
const FOLLOW_MS = 450;

function keepInPlace(el: HTMLElement) {
	const top = el.getBoundingClientRect().top;
	const end = performance.now() + FOLLOW_MS;
	const follow = () => {
		const drift = el.getBoundingClientRect().top - top;
		// "instant": the page has smooth scrolling on, which would make the button lag behind.
		if (Math.abs(drift) > 0.5) window.scrollBy({ top: drift, behavior: "instant" });
		if (performance.now() < end) requestAnimationFrame(follow);
	};
	requestAnimationFrame(follow);
}

export function FooterPlay() {
	const open = useBeatBoxOpen();
	return (
		<button
			type="button"
			aria-expanded={open}
			onClick={(e) => {
				keepInPlace(e.currentTarget);
				setBeatBoxOpen(!open);
			}}
			className={`header-control state-layer focus-ring type-text-s flex shrink-0 items-center gap-gap-xs rounded-small border px-gap-xs transition-colors duration-200 ease-out-strong hover:border-neutral-normal hover:text-neutral-strong ${open ? "border-neutral-normal text-neutral-strong" : "border-neutral-weak text-neutral-normal"}`}
		>
			<MusicIcon aria-hidden className="size-3.5" />
			{open ? "Close" : "Play"}
		</button>
	);
}
