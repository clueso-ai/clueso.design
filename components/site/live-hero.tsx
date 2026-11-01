"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const HeroCanvas = dynamic(() => import("./hero-canvas").then((m) => m.HeroCanvas), { ssr: false });

export const HERO_PRESET = { id: "dither-aurora", name: "Dither aurora" };

/** The homepage's live artwork: a Brand Lab preset running on Brand Lab's engine. */
export function LiveHero() {
	return (
		<figure className="flex flex-col gap-gap-xs">
			<Link
				href="/tools/brand-lab"
				aria-label={`Open Brand Lab. The artwork is the ${HERO_PRESET.name} preset, rendered live.`}
				className="focus-ring group relative block aspect-video overflow-hidden rounded-large bg-brand-weak shadow-overlay"
			>
				<HeroCanvas preset={HERO_PRESET.id} />
			</Link>
			<figcaption className="type-text-s flex justify-between gap-gap-s text-neutral-weak">
				<span>Rendered live in your browser by Brand Lab.</span>
				<span className="font-code">Preset: {HERO_PRESET.name}</span>
			</figcaption>
		</figure>
	);
}
