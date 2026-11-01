"use client";

import { useRef, useSyncExternalStore } from "react";
import { Button } from "@/lib/design-system";
import { MoonIcon, SunIcon } from "@/lib/design-system/icons";
import { applySiteTheme, resolvedTheme, THEME_KEY } from "@/lib/theme";
import { prepareThemeWipe, themeWipe } from "@/lib/theme-wipe";

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
	/** The pointer that last pressed the button. Touch switches on click like a keyboard does. */
	const pointer = useRef("");

	const toggle = (button: HTMLElement) => {
		const apply = () => {
			localStorage.setItem(THEME_KEY, next);
			applySiteTheme(next);
			listeners.forEach((fn) => fn());
		};
		// A glimm band sweeps the new theme in at the logo's 135° angle (lib/theme-wipe.ts). If the
		// Clueso cursor is in use here, the native one stays hidden throughout.
		themeWipe(apply, next === "dark", getComputedStyle(button).cursor === "none");
	};

	return (
		<Button
			variant="transparent"
			sentiment="neutral"
			size="xsmall"
			iconOnly
			className="focus-ring"
			aria-label={theme ? `Switch to ${next} mode` : "Switch theme"}
			icon={theme === "dark" ? <SunIcon /> : <MoonIcon />}
			// Warm up the sweep's WebGL band before the click, so the switch starts on the first frame.
			onPointerEnter={prepareThemeWipe}
			onFocus={prepareThemeWipe}
			// Mouse and pen switch on press, not release: it feels instant. Keyboard and touch use click.
			onPointerDown={(e) => {
				pointer.current = e.pointerType;
				if (e.button !== 0 || e.pointerType === "touch") return;
				toggle(e.currentTarget);
			}}
			onClick={(e) => {
				// A mouse or pen click was already handled on press. Keyboard clicks have detail 0.
				if (e.detail > 0 && pointer.current !== "touch") return;
				toggle(e.currentTarget);
			}}
		/>
	);
}
