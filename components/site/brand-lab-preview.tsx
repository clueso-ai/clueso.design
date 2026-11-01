"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { EMBED_READY, EMBED_THEME } from "@/lib/brand-lab-handoff";
import { useIsDark } from "@/lib/use-dark";
import { useFinePointer } from "@/lib/use-fine-pointer";
import { suspendSiteCursor } from "./site-cursor";

// Brand Lab running live on the homepage, opened on a few posters. It stays still until you click,
// so scrolling past it never zooms the canvas by accident. The embed keeps nothing: the visitor's
// own Brand Lab project is untouched (see EMBED in tools/brand-lab/state/store.ts). It runs in the
// opposite theme to the page, so it reads as its own thing.
//
// Brand Lab needs a mouse. Touch screens get posters made with it instead, and never load the embed.

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

export function BrandLabPreview({ href }: { href: string }) {
	const fine = useFinePointer();
	return (
		<div className="relative overflow-hidden bg-sunken-1 pointer-fine:h-[min(46rem,80dvh)] pointer-fine:min-h-96">
			<Posters />
			{fine && <LivePreview href={href} />}
		</div>
	);
}

function Posters() {
	return (
		<ul aria-label="Posters made with Brand Lab" className="flex snap-x snap-mandatory scroll-px-gap-l gap-gap-s overflow-x-auto overscroll-x-contain p-gap-l pointer-fine:hidden">
			{POSTERS.map((p) => (
				<li key={p.slug} className="w-3/4 shrink-0 snap-start sm:w-2/5">
					<Image src={`/brand-lab/posters/${p.slug}.webp`} alt={`Poster: ${p.alt}`} width={1050} height={1400} sizes="(min-width: 640px) 40vw, 75vw" className="h-auto w-full rounded-small" />
				</li>
			))}
		</ul>
	);
}

function LivePreview({ href }: { href: string }) {
	const [live, setLive] = useState(false);
	const frame = useRef<HTMLIFrameElement>(null);
	const dark = useIsDark();

	useEffect(() => {
		const send = () => frame.current?.contentWindow?.postMessage({ type: EMBED_THEME, theme: dark ? "light" : "dark" }, location.origin);
		send();
		// The embed asks once it has loaded.
		const ready = (e: MessageEvent) => e.origin === location.origin && e.data?.type === EMBED_READY && send();
		window.addEventListener("message", ready);
		return () => window.removeEventListener("message", ready);
	}, [dark]);

	// Brand Lab draws its own cursor inside the frame. Hide the site's while the pointer is in there.
	useEffect(() => () => suspendSiteCursor(false), []);

	return (
		<div
			className="absolute inset-0"
			onPointerEnter={() => live && suspendSiteCursor(true)}
			onPointerLeave={() => suspendSiteCursor(false)}
		>
			<iframe ref={frame} src={`${href}?embed`} title="Brand Lab, live" loading="lazy" className={`size-full border-0 ${live ? "" : "pointer-events-none"}`} />
			<AnimatePresence>
				{!live && (
					<motion.button
						type="button"
						onClick={() => {
							setLive(true);
							suspendSiteCursor(true);
						}}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
						className="group focus-ring absolute inset-0 grid place-items-center bg-transparent"
					>
						<span className="type-text-s rounded-medium border border-neutral-weak bg-overlay px-gap-s py-gap-xs text-neutral-strong shadow-overlay transition-transform duration-200 ease-out-strong group-hover:-translate-y-0.5 group-active:scale-[0.97]">
							Click to play with it
						</span>
					</motion.button>
				)}
			</AnimatePresence>
		</div>
	);
}
