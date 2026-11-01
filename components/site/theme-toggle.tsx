"use client";

import { useSyncExternalStore } from "react";
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

export function ThemeToggle() {
	// null on the server: the icon appears once the real theme is known, so nothing flips on hydration.
	const theme = useSyncExternalStore(subscribe, resolvedTheme, () => null);
	const next = theme === "dark" ? "light" : "dark";

	return (
		<button
			type="button"
			onClick={() => {
				localStorage.setItem(THEME_KEY, next);
				applySiteTheme(next);
				listeners.forEach((fn) => fn());
			}}
			aria-label={theme ? `Switch to ${next} mode` : "Switch theme"}
			className="state-layer focus-ring grid size-9 place-items-center rounded-medium text-neutral-normal"
		>
			{theme === "dark" ? <SunIcon className="size-4.5" aria-hidden /> : theme === "light" ? <MoonIcon className="size-4.5" aria-hidden /> : null}
		</button>
	);
}
