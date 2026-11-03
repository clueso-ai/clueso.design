// Tools on the homepage run in a frame at /tools/<slug>?embed (components/site/live-tool-preview.tsx).
// An embed keeps nothing, so the visitor's own work in the tool is untouched, and it takes its
// theme from the homepage: the opposite of the page's, so it reads as its own thing.

export const EMBED_READY = "clueso-design:embed-ready";
export const EMBED_THEME = "clueso-design:embed-theme";

export function isEmbed() {
	return new URLSearchParams(location.search).has("embed");
}

/** Storage that forgets everything on reload, for a tool that saves to localStorage itself. */
export function memoryStorage(): Storage {
	const m = new Map<string, string>();
	return {
		get length() {
			return m.size;
		},
		key: (i) => [...m.keys()][i] ?? null,
		getItem: (k) => m.get(k) ?? null,
		setItem: (k, v) => void m.set(k, String(v)),
		removeItem: (k) => void m.delete(k),
		clear: () => m.clear(),
	};
}
