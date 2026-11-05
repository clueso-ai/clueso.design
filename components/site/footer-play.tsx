"use client";

import { MusicIcon } from "@/lib/design-system/icons";
import { setBeatBoxOpen, useBeatBoxOpen } from "./beat-box";

// Opens the beat box under the logo, and closes it.

export function FooterPlay() {
	const open = useBeatBoxOpen();
	return (
		<button
			type="button"
			aria-expanded={open}
			onClick={() => setBeatBoxOpen(!open)}
			className={`header-control state-layer focus-ring type-text-s flex shrink-0 items-center gap-gap-xs rounded-small border px-gap-xs transition-colors duration-200 ease-out-strong hover:border-neutral-normal hover:text-neutral-strong ${open ? "border-neutral-normal text-neutral-strong" : "border-neutral-weak text-neutral-normal"}`}
		>
			<MusicIcon aria-hidden className="size-3.5" />
			{open ? "Close" : "Play"}
		</button>
	);
}
