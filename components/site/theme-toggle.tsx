"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { Button } from "@/lib/design-system";
import { MoonIcon, SunIcon } from "@/lib/design-system/icons";
import { resolvedTheme, THEME_KEY } from "@/lib/theme";
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

/** Reads the theme when called, so a switch mid wipe always goes the other way from the last one. */
function toggle(button: HTMLElement) {
	const next = resolvedTheme() === "dark" ? "light" : "dark";
	// The choice and the icon change at once. The page follows behind a glimm band that sweeps the
	// new theme in at the logo's 135° angle (lib/theme-wipe.ts). Switching again mid sweep turns
	// the band around. If the Clueso cursor is in use here, the native one stays hidden throughout.
	localStorage.setItem(THEME_KEY, next);
	listeners.forEach((fn) => fn());
	themeWipe(next, getComputedStyle(button).cursor === "none");
}

export function ThemeToggle() {
	// null on the server: the icon appears once the real theme is known, so nothing flips on hydration.
	const theme = useSyncExternalStore(subscribe, resolvedTheme, () => null);
	const next = theme === "dark" ? "light" : "dark";
	/** The pointer that last pressed the button. Touch switches on click like a keyboard does. */
	const pointer = useRef("");
	const button = useRef<HTMLButtonElement>(null);

	// Mid wipe the page is a snapshot, and snapshots don't take the pointer: every press lands on <html>
	// and nothing is hovered. The live layout underneath is still right, so the button's box decides.
	useEffect(() => {
		const inside = (e: PointerEvent, el: HTMLElement) => {
			const r = el.getBoundingClientRect();
			return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
		};
		// The hover shade follows the pointer itself, so it holds steady through a wipe: the snapshot
		// and the live page show the same button, and the band crossing it changes nothing.
		const onMove = (e: PointerEvent) => {
			const el = button.current;
			if (el) el.toggleAttribute("data-hover", e.pointerType !== "touch" && inside(e, el));
		};
		const onLeave = () => button.current?.removeAttribute("data-hover");
		// A press inside the box mid wipe still switches.
		const onPress = (e: PointerEvent) => {
			const el = button.current;
			if (!el || e.target !== document.documentElement || e.button !== 0) return;
			if (!document.documentElement.classList.contains("theme-wipe") || !inside(e, el)) return;
			// Handled here, so the click that follows (it can reach the button if the wipe ends first) is skipped.
			pointer.current = "wipe";
			toggle(el);
		};
		document.addEventListener("pointermove", onMove, { passive: true });
		document.documentElement.addEventListener("pointerleave", onLeave);
		document.addEventListener("pointerdown", onPress);
		return () => {
			document.removeEventListener("pointermove", onMove);
			document.documentElement.removeEventListener("pointerleave", onLeave);
			document.removeEventListener("pointerdown", onPress);
		};
	}, []);

	return (
		<Button
			variant="transparent"
			sentiment="neutral"
			size="xsmall"
			iconOnly
			ref={button}
			className="theme-toggle focus-ring"
			aria-label={theme ? `Switch to ${next} mode` : "Switch theme"}
			icon={
				// Both icons stay mounted so they can animate between each other. No theme yet: neither shows.
				<span className="theme-icon" data-theme={theme ?? undefined}>
					<SunIcon data-icon="sun" aria-hidden />
					<MoonIcon data-icon="moon" aria-hidden />
				</span>
			}
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
