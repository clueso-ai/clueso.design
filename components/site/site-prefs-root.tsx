"use client";

import type { CSSProperties, ReactNode } from "react";
import { effectiveWeight, fontFamily, selectionVars, typeScaleVars } from "@/lib/site-prefs";
import { useSitePrefs } from "@/lib/site-prefs-store";
import { RemoteCursors } from "./remote-cursors";
import { SiteCursor } from "./site-cursor";
import { TypeInspector } from "./type-inspector";
import { TypeTuner } from "./type-tuner";

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
		// Clipped at the bottom, so nothing hanging below the footer (like the logo's stretched mark
		// fill) makes the page longer. Clip, not hidden, so sticky headers still stick.
		<div data-type-scope style={style} className={`flex min-h-dvh flex-col overflow-y-clip ${p.cluesoCursor ? "site-cursor" : ""}`}>
			{children}
			<RemoteCursors />
			<SiteCursor />
			<TypeInspector />
			<TypeTuner />
		</div>
	);
}
