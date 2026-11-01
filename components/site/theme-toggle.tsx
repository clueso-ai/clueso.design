"use client";

import { useRef, useSyncExternalStore } from "react";
import { Button } from "@/lib/design-system";
import { MoonIcon, SunIcon } from "@/lib/design-system/icons";
import { applySiteTheme, resolvedTheme, THEME_KEY } from "@/lib/theme";

const listeners = new Set<() => void>();
function subscribe(fn: () => void) {
	listeners.add(fn);
	const media = matchMedia("(prefers-color-scheme: dark)");
	media.addEventListener("change", fn);
	return () => {
		listeners.delete(fn);
		media.removeEventListener("change", fn);
	};
}

function toggle() {
	const next = resolvedTheme() === "dark" ? "light" : "dark";
	// The choice, the icon and the page all switch in one frame, with nothing animating.
	localStorage.setItem(THEME_KEY, next);
	listeners.forEach((fn) => fn());
	applySiteTheme(next);
}

export function ThemeToggle() {
	// null on the server: the icon appears once the real theme is known, so nothing flips on hydration.
	const theme = useSyncExternalStore(subscribe, resolvedTheme, () => null);
	const next = theme === "dark" ? "light" : "dark";
	/** The pointer that last pressed the button. Touch switches on click like a keyboard does. */
	const pointer = useRef("");

	return (
		<Button
			variant="transparent"
			sentiment="neutral"
			size="xsmall"
			iconOnly
			// Same height as the live visitor badge beside it (styles/site.css).
			className="theme-toggle header-control header-control-square focus-ring border border-neutral-weak"
			aria-label={theme ? `Switch to ${next} mode` : "Switch theme"}
			icon={
				// No theme yet: neither icon shows.
				<span className="theme-icon" data-theme={theme ?? undefined}>
					<SunIcon data-icon="sun" aria-hidden />
					<MoonIcon data-icon="moon" aria-hidden />
				</span>
			}
			// Mouse and pen switch on press, not release: it feels instant. Keyboard and touch use click.
			onPointerDown={(e) => {
				pointer.current = e.pointerType;
				if (e.button !== 0 || e.pointerType === "touch") return;
				toggle();
			}}
			onClick={(e) => {
				// A mouse or pen click was already handled on press. Keyboard clicks have detail 0.
				if (e.detail > 0 && pointer.current !== "touch") return;
				toggle();
			}}
		/>
	);
}
