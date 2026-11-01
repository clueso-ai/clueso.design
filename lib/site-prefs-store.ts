"use client";

// The visitor's site preferences (see lib/site-prefs.ts), kept in localStorage.

import { useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { DEFAULT_PREFS, effectiveWeight, fontFamily, type SitePrefs } from "./site-prefs";

const KEY = "clueso-design:prefs";
const listeners = new Set<() => void>();
let current: SitePrefs = DEFAULT_PREFS;
let loaded = false;

function load() {
	if (loaded || typeof window === "undefined") return;
	loaded = true;
	try {
		const saved = JSON.parse(localStorage.getItem(KEY) ?? "{}");
		// A new visitor starts on a black cursor and picks a colour later.
		current = { ...DEFAULT_PREFS, ...saved };
	} catch {
		current = DEFAULT_PREFS;
	}
}

export function setPrefs(patch: Partial<SitePrefs>) {
	load();
	current = { ...current, ...patch };
	try {
		localStorage.setItem(KEY, JSON.stringify(current));
	} catch {}
	listeners.forEach((l) => l());
}

/**
 * For changes that swap a font: the page cross-fades from the old look to the new one. The new
 * fonts load first (for up to half a second), so the fade never lands on a fallback font.
 */
export function setPrefsSmooth(patch: Partial<SitePrefs>) {
	load();
	const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
	if (reduce || !document.startViewTransition) return setPrefs(patch);
	const next = { ...current, ...patch };
	const fonts = [
		`${effectiveWeight(next.titleFont, next.titleWeight)} 1em ${fontFamily(next.titleFont, next.titleStyle)}`,
		`${effectiveWeight(next.textFont, next.textWeight)} 1em ${fontFamily(next.textFont, next.textStyle)}`,
	];
	const loaded = Promise.all(fonts.map((f) => document.fonts.load(f).catch(() => null)));
	document.startViewTransition(async () => {
		await Promise.race([loaded, new Promise((r) => setTimeout(r, 500))]);
		flushSync(() => setPrefs(patch));
	});
}

/** Back to the default look. The cursor keeps its colour and name. */
export function resetPrefs() {
	load();
	setPrefsSmooth({ ...DEFAULT_PREFS, cursorColor: current.cursorColor, cursorName: current.cursorName, cursorEverywhere: current.cursorEverywhere });
}

const subscribe = (l: () => void) => {
	listeners.add(l);
	return () => listeners.delete(l);
};

export function useSitePrefs(): SitePrefs {
	return useSyncExternalStore(
		subscribe,
		() => {
			load();
			return current;
		},
		() => DEFAULT_PREFS,
	);
}
