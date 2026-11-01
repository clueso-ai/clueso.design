"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSitePrefs } from "@/lib/site-prefs-store";

// The hero title with its type guides drawn across the frame: cap height and x-height dashed, the
// baseline solid. Measured from the live font, so they follow whatever font a visitor picks.

interface Guides {
	lines: { cap: number; x: number; base: number }[];
}

const LINES = ["cap", "x", "base"] as const;

/** `className` goes on the heading, for alignment. A "\n" in `children` breaks the line there. */
export function HeroTitle({ children, className = "" }: { children: string; className?: string }) {
	const wrap = useRef<HTMLDivElement>(null);
	const title = useRef<HTMLHeadingElement>(null);
	const [guides, setGuides] = useState<Guides>({ lines: [] });
	const prefs = useSitePrefs();

	const measure = () => {
		const h = title.current;
		const box = wrap.current;
		if (!h || !box) return;
		const style = getComputedStyle(h);
		const ctx = document.createElement("canvas").getContext("2d")!;
		ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
		const ascent = ctx.measureText("Hxg").fontBoundingBoxAscent;
		const cap = ctx.measureText("H").actualBoundingBoxAscent;
		const xh = ctx.measureText("x").actualBoundingBoxAscent;
		const range = document.createRange();
		range.selectNodeContents(h);
		const top = box.getBoundingClientRect().top;
		// One rect per line of text; the inline box's top is the font's ascent above the baseline.
		const seen = new Set<number>();
		const lines = [...range.getClientRects()]
			.filter((r) => r.width > 0 && !seen.has(Math.round(r.top)) && seen.add(Math.round(r.top)))
			.map((r) => {
				const base = r.top - top + ascent;
				return { base, cap: base - cap, x: base - xh };
			});
		setGuides({ lines });
	};

	useLayoutEffect(measure, [prefs.titleFont, prefs.titleWeight, prefs.titleStyle, prefs.typeBase, prefs.typeRatio, children]);
	useEffect(() => {
		const ro = new ResizeObserver(() => measure());
		ro.observe(wrap.current!);
		document.fonts.addEventListener("loadingdone", measure);
		document.fonts.ready.then(measure);
		return () => {
			ro.disconnect();
			document.fonts.removeEventListener("loadingdone", measure);
		};
	}, []);

	return (
		<div ref={wrap} className="relative w-full">
			<div aria-hidden className="pointer-events-none absolute inset-x-0 top-0">
				{guides.lines.map((line, i) =>
					LINES.map((key) => (
						<div
							key={`${i}-${key}`}
							className={`absolute inset-x-0 border-t ${key === "base" ? "border-neutral-normal" : "border-dashed border-neutral-weak"}`}
							style={{ top: line[key] }}
						/>
					)),
				)}
			</div>
			<h1 ref={title} className={`type-title-xl relative px-gap-l text-balance whitespace-pre-line text-neutral-strong ${className}`}>
				{children}
			</h1>
		</div>
	);
}
