import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const twMerge = extendTailwindMerge({
	extend: {
		theme: {
			spacing: [
				"none",
				"2xs",
				"xs",
				"sm",
				"md",
				"lg",
				"xl",
				"2xl",
				"3xl",
				"4xl",
				"5xl",
				"6xl",
				"7xl",
				"8xl",
				"9xl",
				"10xl",
				"11xl",
				"12xl",
			],
			radius: [
				"none",
				"2xs",
				"xs",
				"sm",
				"md",
				"lg",
				"xl",
				"2xl",
				"3xl",
				"4xl",
				"full",
			],
		},
	},
});

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/**
 * Sanitize a URL for use as an anchor `href`. Only http(s), mailto, same-page
 * (`#…`) and root-relative (`/…`) URLs pass; everything else — notably
 * `javascript:` and `data:` — is dropped to `fallback` (default `undefined`).
 * Use this for any href built from admin-writable catalog data or a third-party
 * provider payload so a hostile URL can't smuggle script into a click.
 */
export function safeHref(
	url: string | null | undefined,
	fallback?: string,
): string | undefined {
	if (!url) return fallback;
	const trimmed = url.trim();
	if (trimmed.startsWith("#") || trimmed.startsWith("/")) return trimmed;
	try {
		// The URL parser strips embedded tabs/newlines, so obfuscated schemes
		// like "java\tscript:" are normalized before the protocol check.
		const { protocol } = new URL(trimmed);
		if (
			protocol === "http:" ||
			protocol === "https:" ||
			protocol === "mailto:"
		) {
			return trimmed;
		}
	} catch {
		// Unparseable — treat as unsafe.
	}
	return fallback;
}
