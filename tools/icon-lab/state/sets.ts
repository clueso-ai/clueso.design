// The sets Icon Lab shows, built from the engine's: the line set drawn in our style (Web and
// Platform), the signature samples (Style A and B) and the pixel direction. Saved edits and chosen
// options are applied when this loads. Icons are mutable objects shared with the engine; the store
// changes them in place and bumps a revision so the UI redraws.

import { applyEditablePaths, cluesoSet, editablePaths, pixelSet, signatureSets, siteSet } from "../engine/engine";
import type { Icon, Snapshot } from "../engine/types";
import { KEYS, readJSON, writeJSON } from "./storage";

// Families: related icons sit next to each other in the Web and Platform tabs, family after family
// (no headings, no gaps). Variants sit with their base icon (mic-ai with mic, image-ai with image...).
// Anything not listed goes at the end.
const FAMILIES = [
	["chevron-down", "chevron-up", "chevron-left", "chevron-right", "chevrons-up-down", "chevrons-left", "chevrons-right", "first", "last"],
	["arrow-up", "arrow-down", "arrow-left", "arrow-right", "arrow-up-right", "arrow-left-end", "arrow-right-end", "external-link", "download", "upload", "publish", "send",
		"expand", "collapse", "fullscreen", "fullscreen-exit", "width", "height", "swap-horizontal", "swap-vertical", "split-arrows", "turn-down", "u-turn-left", "u-turn-right"],
	["refresh", "replay", "rotate-cw", "rotate-acw", "undo", "redo", "history", "spinner"],
	["menu", "more", "more-vertical", "apps", "grid", "drag", "plus", "minus", "close", "delete", "check", "check-double", "check-circle", "search", "zoom-in", "zoom-out", "filter", "sort", "sliders", "gear", "sidebar", "card", "divider"],
	["info", "help", "warning"],
	["link", "link-off", "paperclip", "copy", "duplicate", "bookmark", "flag", "pin", "tag", "share", "cursor", "eye", "eye-off", "lock", "lock-open", "key", "shield-check", "sign-out"],
	["cloud", "cloud-sync", "cloud-done", "cloud-off"],
	["folder", "folder-open", "folder-plus", "file", "file-plus", "file-pdf", "document", "file-ppt", "clipboard", "book", "book-open", "scroll", "template", "layers", "inbox", "archive"],
	["sparkles", "star-4", "wand-ai", "effects", "spotlight"],
	["play", "pause", "pause-add", "next", "previous", "record", "record-screen", "video", "video-ai", "video-square", "video-element", "video-camera", "webcam", "webcam-off", "film", "clueprint", "captions", "4k", "gif", "image", "image-ai", "image-plus", "animation"],
	["mic", "mic-ai", "mic-off", "transcript", "speaker", "speaker-low", "mute", "waveform", "waveform-ai", "music", "headphones", "headset"],
	["pen", "pencil", "pencil-ai", "paint-brush", "eye-dropper", "scissors", "split", "crop", "swatches", "gradient", "opacity", "water-drop", "background", "corner-radius", "stroke-width", "shapes", "triangle", "frame", "padding", "gap", "anchor", "angle", "compare", "cube"],
	["align-left", "align-center-h", "align-right", "align-top", "align-center-v", "align-bottom", "flip-horizontal", "flip-vertical", "bring-to-front", "bring-forward", "send-backward", "send-to-back"],
	["playhead", "keyframe", "collapse-timeline", "expand-timeline", "timer", "hourglass", "duration", "clock", "calendar"],
	["text", "text-box", "text-field", "case", "font-size", "letter-spacing", "line-height", "bold", "italic", "underline", "strikethrough", "h1", "h2", "h3", "h4", "list", "numbered-list", "quote", "text-align-left", "text-align-center", "text-align-right", "translate"],
	["transition", "transition-dissolve", "transition-push", "transition-stack", "transition-colour-wipe", "transition-circle-wipe", "transition-corner-wipe", "transition-rainbow-wipe"],
	["bell", "chat", "chat-ai", "comment", "callout", "mail", "mail-open", "megaphone", "phone"],
	["user", "users", "users-three", "user-check", "user-plus", "user-minus", "user-off", "user-speaking", "ai-avatar", "support", "thumbs-up", "thumbs-down", "heart", "star", "award"],
	["laptop", "monitor", "keyboard"],
	["bar-chart", "analytics", "curve", "trend-up", "pie-chart", "dollar-circle", "dollar", "wallet", "billing", "bank", "building", "enterprise", "briefcase", "gem"],
	["home", "location", "map", "globe", "rocket", "confetti", "lightning", "fire", "sun", "moon", "plug", "puzzle", "browser-extension", "graduation-cap", "utensils", "code", "embed", "shuffle"],
];
const FAMILY_ORDER = new Map(FAMILIES.flat().map((n, i) => [n, i]));
export const familyRank = (icon: Icon) => FAMILY_ORDER.get(icon.name) ?? 9999;

const UPPER = new Set(["ai", "ppt", "gif", "cc", "4k"]);
export const pretty = (name: string) =>
	name
		.split("-")
		.filter(Boolean)
		.map((w) => (UPPER.has(w) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
		.join(" ");

export const hasOptions = (icon: Icon) => Boolean(icon.options && icon.options.length > 1);
/** Where an icon's edit is saved (iconTool.edits). Same keys as the standalone app. */
export const editKey = (icon: Icon) => icon.id || `${icon.clueso ? `clueso-${icon.style}` : icon.site ? "site" : "lib"}:${icon.name}${hasOptions(icon) ? `#${icon.variant}` : ""}`;
export const snapshot = (icon: Icon): Snapshot => ({ body: icon.body, scale: icon.scale, tx: icon.tx, ty: icon.ty, box: { ...icon.box }, optical: icon.optical });

// The set: every icon on clueso.io drawn in OUR style (the site set, plus a few Sharp library
// icons). Google's Material Symbols drawing of the same icon rides along as `icon.google`, shown
// behind ours with the Google toggle, as the construction reference. Icons we haven't drawn yet fall
// back to Google's (marked). Solid is Google's filled version for now.
export const drawnSet: Record<"line" | "solid", Icon[]> = { line: [], solid: cluesoSet.solid };
for (const g of cluesoSet.line) {
	const drawn = siteSet.find((i) => i.name === g.name);
	const meta = { name: g.name, replaces: g.replaces, pages: g.pages, example: g.example, keywords: g.keywords, site: true, platform: g.platform, google: g };
	if (drawn) {
		for (const o of drawn.options || [drawn]) Object.assign(o, meta);
		drawnSet.line.push(drawn);
	} else {
		for (const o of g.options!) Object.assign(o, { google: o, googleOnly: true });
		drawnSet.line.push(g);
	}
}
export const ofStyle = (style: "line" | "solid") => drawnSet[style];

// Signature options: each icon carries its base icon's details (tab, Google reference, site
// capture), so Context works the same. Its own id keeps its edits apart from the base drawing's.
const lineByName = new Map(drawnSet.line.map((i) => [i.name, i]));
export const signatures = signatureSets.map((sig) => ({
	...sig,
	icons: sig.icons.map((icon) => {
		const base: Partial<Icon> = lineByName.get(icon.name) || {};
		for (const o of icon.options || [icon])
			Object.assign(o, {
				id: `sig-${sig.key}:${o.name}${o.options ? `#${o.variant}` : ""}`,
				site: true,
				platform: base.platform,
				google: base.google,
				replaces: base.replaces,
				pages: base.pages,
				example: base.example,
				keywords: base.keywords || o.keywords,
			});
		return icon;
	}),
}));
export const signatureOf = (key: string) => signatures.find((s) => s.key === key)!;

// Pixel tab: the pixel icons (24 grid).
export const pixelIcons = pixelSet;

// Keep every built-in icon's original so Reset can bring it back, then apply saved edits.
export const loadEdits = () => readJSON<Record<string, string>>(KEYS.edits, {});
{
	const edits = loadEdits();
	const extra = [...signatures.flatMap((s) => s.icons.flatMap((i) => i.options || [i])), ...pixelIcons];
	for (const icon of [...(["line", "solid"] as const).flatMap((st) => drawnSet[st].flatMap((i) => i.options || [i])), ...extra]) {
		icon.original = snapshot(icon);
		const body = edits[editKey(icon)];
		if (body) {
			icon.body = body;
			applyEditablePaths(icon, editablePaths(Object.assign(icon, { scale: 1, tx: 0, ty: 0 })));
		}
	}
}

// ---- Icon options --------------------------------------------------------------
// Some icons come in options (upright / diagonal / sharp). The chosen option replaces the icon
// everywhere (library grid, search, exports) and is remembered.

export const loadVariants = () => readJSON<Record<string, string>>(KEYS.variants, {});

/** Put an icon's chosen option in place in both styles (line and solid share the choice). */
export function applyOption(name: string, label?: string) {
	for (const st of ["line", "solid"] as const) {
		const list = drawnSet[st];
		const i = list.findIndex((x) => x.name === name);
		const chosen = i >= 0 && list[i].options!.find((o) => o.variant === label);
		if (chosen) list[i] = chosen;
	}
}
for (const [name, label] of Object.entries(loadVariants())) applyOption(name, label);

export function saveVariant(name: string, label?: string) {
	const saved = loadVariants();
	if (label !== undefined) saved[name] = label;
	writeJSON(KEYS.variants, saved);
}

// Web: icons on clueso.io. Platform: icons in the Clueso platform (web.clueso.io). Icons used in both
// show in both. Within a tab, related icons sit together (FAMILIES order).
export const inTab = (icon: Icon, tab: string) => (tab === "platform" ? Boolean(icon.platform) : icon.platform !== true);

export function firstLibraryIcon(style: "line" | "solid") {
	return ofStyle(style).find((i) => i.name === "chevron-down") || ofStyle(style)[0];
}

export function loadGenerated(): Icon[] {
	const list = readJSON<Icon[]>(KEYS.generated, []);
	return Array.isArray(list) ? list.filter((i) => i && i.body && i.scale && i.style) : [];
}
