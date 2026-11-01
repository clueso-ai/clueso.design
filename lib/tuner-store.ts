"use client";

// Whether Customize website is open. Shared so the C shortcut works from anywhere on the site and
// the cursor knows to stop showing its hints while the visitor is in the panel.

import { useSyncExternalStore } from "react";

let open = false;
const listeners = new Set<() => void>();

export function setTunerOpen(next: boolean | ((was: boolean) => boolean)) {
	const value = typeof next === "function" ? next(open) : next;
	if (value === open) return;
	open = value;
	listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
	listeners.add(l);
	return () => listeners.delete(l);
};

export const useTunerOpen = () =>
	useSyncExternalStore(
		subscribe,
		() => open,
		() => false,
	);
