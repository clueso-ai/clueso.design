"use client";

import type { CSSProperties, ReactNode } from "react";
import { effectiveWeight, fontFamily, selectionVars, typeScaleVars } from "@/lib/site-prefs";
import { useSitePrefs } from "@/lib/site-prefs-store";
import { SiteCursor } from "./site-cursor";

/** Applies a visitor's fonts, type scale, cursor and highlight colour to every site page. Tool pages sit outside it. */
export function SitePrefsRoot({ children }: { children: ReactNode }) {
	const p = useSitePrefs();
	const style = {
		"--font-title-family": fontFamily(p.titleFont, p.titleStyle),
		"--font-text-family": fontFamily(p.textFont, p.textStyle),
		"--title-weight": effectiveWeight(p.titleFont, p.titleWeight),
		"--text-weight": effectiveWeight(p.textFont, p.textWeight),
		...typeScaleVars(p.typeBase, p.typeRatio),
		// Selected text takes the cursor's colour, with ink that keeps it readable.
		...selectionVars(p.cursorColor),
		fontFamily: "var(--font-text-family)",
	} as CSSProperties;

	return (
		<div data-type-scope style={style} className={`flex min-h-dvh flex-col ${p.cursorEverywhere ? "site-cursor" : ""}`}>
			{children}
			<SiteCursor />
		</div>
	);
}
