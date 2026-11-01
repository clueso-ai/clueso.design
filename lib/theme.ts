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

export function applySiteTheme(theme: SiteTheme = resolvedTheme()) {
	document.documentElement.classList.toggle("dark", theme === "dark");
	document.documentElement.style.colorScheme = theme;
}

/** Inlined in <head> so the first paint is already in the right theme. */
export const themeScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";var d=document.documentElement;d.classList.toggle("dark",t==="dark");d.style.colorScheme=t}catch(e){}})()`;

/** Browser chrome colour per mode, matching --surface-page in the lab theme. */
export const themeColors = { light: "#ededed", dark: "#161616" } as const;
