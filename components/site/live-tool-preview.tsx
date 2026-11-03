"use client";

import { AnimatePresence, motion } from "framer-motion";
import { type ReactNode, useEffect, useRef, useState } from "react";
import type { RegistryItem } from "@/lib/registry";
import { EMBED_READY, EMBED_THEME } from "@/lib/tool-embed";
import { useIsDark } from "@/lib/use-dark";
import { useFinePointer } from "@/lib/use-fine-pointer";
import { suspendSiteCursor } from "./site-cursor";
import { ToolSnapshot } from "./tool-snapshot";

// A featured tool running live on the homepage, in its embed mode (lib/tool-embed.ts): it keeps
// nothing and runs in the opposite theme to the page. It stays still until you click, so scrolling
// past it never scrolls or zooms the tool by accident.
//
// Tools need a mouse. Touch screens get `fallback` (the tool's still unless given) and never load
// the frame.

export function LiveToolPreview({ item, fallback }: { item: RegistryItem; fallback?: ReactNode }) {
	const fine = useFinePointer();
	return (
		<div className="relative overflow-hidden bg-sunken-1 pointer-fine:h-[min(46rem,80dvh)] pointer-fine:min-h-96">
			<div className="pointer-fine:hidden">{fallback ?? <ToolSnapshot item={item} />}</div>
			{fine && <LiveFrame src={`${item.href}?embed`} title={`${item.title}, live`} />}
		</div>
	);
}

function LiveFrame({ src, title }: { src: string; title: string }) {
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

	// Tools draw their own cursor, or the system's, inside the frame. Hide the site's while the pointer is in there.
	useEffect(() => () => suspendSiteCursor(false), []);

	return (
		<div className="absolute inset-0" onPointerEnter={() => live && suspendSiteCursor(true)} onPointerLeave={() => suspendSiteCursor(false)}>
			<iframe ref={frame} src={src} title={title} loading="lazy" className={`size-full border-0 ${live ? "" : "pointer-events-none"}`} />
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
