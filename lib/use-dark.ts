"use client";

import { useSyncExternalStore } from "react";

// Whether the site is in dark mode right now. Follows the `dark` class the theme toggle sets.
function subscribe(fn: () => void) {
	const mo = new MutationObserver(fn);
	mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
	return () => mo.disconnect();
}

export const useIsDark = () =>
	useSyncExternalStore(
		subscribe,
		() => document.documentElement.classList.contains("dark"),
		() => true,
	);
