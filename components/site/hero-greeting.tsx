"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { heroFillDoc } from "@/lib/hero-fill";
import { ButtonLink } from "@/lib/design-system";
import { ArrowRightIcon } from "@/lib/design-system/icons";
import { cursorById, DEFAULT_PREFS, oklchToHex } from "@/lib/site-prefs";
import { useSitePrefs } from "@/lib/site-prefs-store";
import { useIsDark } from "@/lib/use-dark";
import { HeroTitle } from "./hero-title";

const HeroCanvas = dynamic(() => import("./hero-canvas").then((m) => m.HeroCanvas), { ssr: false });

// The homepage hero fills the screen under the header: title, intro and buttons at the top left,
// and Brand Lab petals turning slowly up from the bottom edge, masked clear of the text. Setting
// up happens elsewhere: the Clueso cursor's tag hints at it while the pointer rests, and Customize
// website (bottom right, or C) walks the visitor through it the first time.

/** The hero's width over its height, rounded so small resizes don't rebuild the design. */
function useAspect() {
	const ref = useRef<HTMLDivElement>(null);
	const [aspect, setAspect] = useState(4 / 3);
	useEffect(() => {
		const ro = new ResizeObserver(([e]) => {
			const { width, height } = e.contentRect;
			if (width && height) setAspect(Math.round((width / height) * 20) / 20);
		});
		ro.observe(ref.current!);
		return () => ro.disconnect();
	}, []);
	return [ref, aspect] as const;
}

/** The petals, in the visitor's colour once they've picked one; before that, the team's pink. */
function Petals() {
	const p = useSitePrefs();
	const dark = useIsDark();
	const [ref, aspect] = useAspect();
	const ink = p.cursorColor !== DEFAULT_PREFS.cursorColor ? oklchToHex(cursorById(p.cursorColor).oklch) : null;
	const doc = useMemo(() => heroFillDoc(ink, dark, aspect), [ink, dark, aspect]);
	return (
		<div ref={ref} aria-hidden className="hero-fill pointer-events-none absolute inset-0">
			<HeroCanvas doc={doc} />
		</div>
	);
}

export function HeroGreeting() {
	return (
		<div className="hero-screen relative flex flex-col overflow-hidden">
			<Petals />
			<div className="relative flex flex-1 flex-col items-start gap-gap-l pt-gap-3xl pb-gap-2xl">
				<HeroTitle>{"Welcome to\nClueso design"}</HeroTitle>
				<p className="type-text-l max-w-measure px-gap-l text-pretty text-neutral-normal">
					This is where we experiment with ideas, build tools we wish existed,
					<br />
					and turn the good ones into real product experiences.
				</p>
				<div className="flex flex-wrap gap-gap-s px-gap-l pt-gap-xs">
					<ButtonLink href="#tools" size="medium" icon={<ArrowRightIcon />}>
						See what we&apos;ve made
					</ButtonLink>
					<ButtonLink href="#team" size="medium" variant="outlined" sentiment="neutral">
						Meet the team
					</ButtonLink>
				</div>
			</div>
			<div className="relative flex px-gap-l py-gap-m">
				<span className="type-text-s hidden items-center gap-gap-2xs text-neutral-weak md:flex">
					Scroll to look around
					{/* The icon set has no down arrow: the right one, turned. */}
					<ArrowRightIcon aria-hidden className="size-4 rotate-90" />
				</span>
			</div>
		</div>
	);
}
