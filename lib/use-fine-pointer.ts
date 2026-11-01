"use client";

import { useSyncExternalStore } from "react";

// Whether the main pointer is a mouse or pen. Touch screens get no Clueso cursor, so anything about
// the cursor hides there. The server assumes touch, so nothing cursor-only flashes on a phone. For
// anything in the first paint, prefer pointer-fine: classes.
const QUERY = "(pointer: fine)";

function subscribe(fn: () => void) {
	const mq = matchMedia(QUERY);
	mq.addEventListener("change", fn);
	return () => mq.removeEventListener("change", fn);
}

export const useFinePointer = () =>
	useSyncExternalStore(
		subscribe,
		() => matchMedia(QUERY).matches,
		() => false,
	);
