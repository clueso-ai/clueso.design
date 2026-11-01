// Site light/dark theme. Follows the system unless the visitor picks one. Brand Lab keeps its own
// toggle while it is mounted and hands the page back to this on unmount.

export type SiteTheme = "light" | "dark";
export const THEME_KEY = "clueso-design:theme";

export function storedTheme(): SiteTheme | null {
	try {
		const v = localStorage.getItem(THEME_KEY);
		return v === "light" || v === "dark" ? v : null;
	} catch {
		return null;
	}
}

export function resolvedTheme(): SiteTheme {
	return storedTheme() ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
}

/** Colours switch in one frame: nothing fades between themes on its own (styles/site.css, .theme-instant). */
export function applySiteTheme(theme: SiteTheme = resolvedTheme()) {
	const root = document.documentElement;
	root.classList.add("theme-instant");
	root.classList.toggle("dark", theme === "dark");
	root.style.colorScheme = theme;
	// Force a style and layout pass with transitions off, so the whole page takes the new colours
	// now and turning transitions back on doesn't start any.
	void root.offsetHeight;
	root.classList.remove("theme-instant");
}

/** Inlined in <head> so the first paint is already in the right theme. */
export const themeScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";var d=document.documentElement;d.classList.toggle("dark",t==="dark");d.style.colorScheme=t}catch(e){}})()`;

/** Browser chrome colour per mode, matching --surface-page in the lab theme. */
export const themeColors = { light: "#ededed", dark: "#161616" } as const;
