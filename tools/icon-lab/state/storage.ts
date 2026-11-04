import { THEME_KEY } from "@/lib/theme";
import { isEmbed, memoryStorage } from "@/lib/tool-embed";

// What Icon Lab keeps in this browser. The keys are the standalone app's, so visitors keep their
// edits, chosen options, kept icons and Claude key.
//
// The homepage embed (/tools/icon-lab?embed, lib/tool-embed.ts) keeps nothing: it gets memory in
// place of localStorage, so its edits and theme never reach the visitor's own Icon Lab or the site.

export const EMBED = isEmbed();

export const KEYS = {
	key: "iconTool.apiKey",
	generated: "iconTool.generated",
	edits: "iconTool.edits",
	variants: "iconTool.variants",
	requests: "iconTool.requests",
	/** Icon Lab shares the site's light and dark choice. The embed keeps its own, in memory. */
	theme: EMBED ? "icon-lab:embed-theme" : THEME_KEY,
};

export const storage: Storage = EMBED ? memoryStorage() : localStorage;

export function readJSON<T>(key: string, fallback: T): T {
	try {
		return JSON.parse(storage.getItem(key) || "null") ?? fallback;
	} catch {
		return fallback;
	}
}

/** False when the browser refused (private mode, quota). */
export function writeJSON(key: string, value: unknown) {
	try {
		storage.setItem(key, JSON.stringify(value));
		return true;
	} catch {
		return false;
	}
}
