"use client";

import { AnimatePresence, motion } from "framer-motion";
import { type ReactNode, type Ref, useEffect, useState } from "react";
import type { RegistryItem } from "@/lib/registry";
import { useFinePointer } from "@/lib/use-fine-pointer";
import { suspendSiteCursor } from "./site-cursor";
import { ToolSnapshot } from "./tool-snapshot";

// A featured tool running live on the homepage. It stays still until you click, so scrolling past
// it never scrolls or zooms the tool by accident.
//
// Tools need a mouse. Touch screens get `fallback` (the tool's still unless given) and never load
// the frame.

export function LiveToolPreview({ item, src = item.href, frameRef, fallback }: { item: RegistryItem; src?: string; frameRef?: Ref<HTMLIFrameElement>; fallback?: ReactNode }) {
	const fine = useFinePointer();
	return (
		<div className="relative overflow-hidden bg-sunken-1 pointer-fine:h-[min(46rem,80dvh)] pointer-fine:min-h-96">
			<div className="pointer-fine:hidden">{fallback ?? <ToolSnapshot item={item} />}</div>
			{fine && <LiveFrame src={src} title={`${item.title}, live`} frameRef={frameRef} />}
		</div>
	);
}

function LiveFrame({ src, title, frameRef }: { src: string; title: string; frameRef?: Ref<HTMLIFrameElement> }) {
	const [live, setLive] = useState(false);

	// Tools draw their own cursor, or the system's, inside the frame. Hide the site's while the pointer is in there.
	useEffect(() => () => suspendSiteCursor(false), []);

	return (
		<div className="absolute inset-0" onPointerEnter={() => live && suspendSiteCursor(true)} onPointerLeave={() => suspendSiteCursor(false)}>
			<iframe ref={frameRef} src={src} title={title} loading="lazy" className={`size-full border-0 ${live ? "" : "pointer-events-none"}`} />
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
