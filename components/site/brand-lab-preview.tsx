"use client";

import Image from "next/image";
import type { RegistryItem } from "@/lib/registry";
import { LiveToolPreview } from "./live-tool-preview";

// Brand Lab running live on the homepage (live-tool-preview.tsx), opened on a few posters (see EMBED
// in tools/brand-lab/state/store.ts). Touch screens get posters made with it instead of its still.

/** Brand Lab's poster presets, exported at 1050×1400. */
const POSTERS = [
	{ slug: "led", alt: "Every piece fits" },
	{ slug: "rays-card", alt: "Systems that run reliably" },
	{ slug: "line-stat", alt: "85% of every frame stays on brand" },
	{ slug: "sunrise", alt: "Every frame on brand" },
	{ slug: "soft-code", alt: "Clueso Agents" },
	{ slug: "glass-tiles", alt: "Built for every team" },
	{ slug: "terminal", alt: "Eighty-one pieces, one grammar" },
	{ slug: "glyph-bloom", alt: "Made of pieces" },
];

export function BrandLabPreview({ item }: { item: RegistryItem }) {
	return <LiveToolPreview item={item} fallback={<Posters />} />;
}

function Posters() {
	return (
		<ul aria-label="Posters made with Brand Lab" className="flex snap-x snap-mandatory scroll-px-gap-l gap-gap-s overflow-x-auto overscroll-x-contain p-gap-l">
			{POSTERS.map((p) => (
				<li key={p.slug} className="w-3/4 shrink-0 snap-start sm:w-2/5">
					<Image src={`/brand-lab/posters/${p.slug}.webp`} alt={`Poster: ${p.alt}`} width={1050} height={1400} sizes="(min-width: 640px) 40vw, 75vw" className="h-auto w-full rounded-small" />
				</li>
			))}
		</ul>
	);
}
