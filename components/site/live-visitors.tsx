"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/lib/design-system";
import { people, usePresence } from "@/lib/presence";
import { cursorById } from "@/lib/site-prefs";
import { useSitePrefs } from "@/lib/site-prefs-store";

// The header's live visitor count: a green dot and how many people have the site open right now,
// you included. Tabs in one browser count once. See lib/presence.ts.
// Pressing it lists who's here, with their cursor colour and the page they're on. It closes on
// Escape, on a press outside, or on pressing it again. In the footer the list opens upward.

const EASE = [0.23, 1, 0.32, 1] as const;

/** "/" is Home; anything else is named after its first part: /changelog is Changelog, /tools/x is Tools. */
function pageName(path: string) {
	const first = path.split("/")[1];
	return first ? first[0].toUpperCase() + first.slice(1).replace(/-/g, " ") : "Home";
}

export function LiveVisitors({ up = false }: { up?: boolean }) {
	const presence = usePresence();
	const prefs = useSitePrefs();
	const reduce = useReducedMotion();
	const path = usePathname();
	const [open, setOpen] = useState(false);
	const root = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
		const press = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
		window.addEventListener("keydown", key);
		document.addEventListener("pointerdown", press);
		return () => {
			window.removeEventListener("keydown", key);
			document.removeEventListener("pointerdown", press);
		};
	}, [open]);

	const { count } = presence;
	if (count === null) return null;
	const others = people(presence);
	const you = prefs.cursorName.trim();

	return (
		<div ref={root} className="relative flex shrink-0">
			{/* The tooltip stays away while the list is open. */}
			<Tooltip open={open ? false : undefined}>
				<TooltipTrigger asChild>
					<button
						type="button"
						aria-expanded={open}
						aria-controls="live-visitors"
						onClick={() => setOpen((o) => !o)}
						className="header-control state-layer focus-ring type-text-s flex items-center gap-gap-xs rounded-small border border-neutral-weak px-gap-xs text-neutral-normal"
					>
						<span aria-hidden className="relative flex size-1.5">
							<span className="absolute inset-0 rounded-tiny bg-positive-normal opacity-60 motion-safe:animate-ping" />
							<span className="relative size-1.5 rounded-tiny bg-positive-normal" />
						</span>
						{count} online
					</button>
				</TooltipTrigger>
				<TooltipContent side={up ? "top" : "bottom"}>{count === 1 ? "Just you on clueso.design right now" : `${count} people on clueso.design right now`}</TooltipContent>
			</Tooltip>
			<AnimatePresence>
				{open && (
					<motion.div
						id="live-visitors"
						initial={reduce ? { opacity: 0 } : { opacity: 0, y: up ? 4 : -4, scale: 0.98 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, transition: { duration: 0.1 } }}
						transition={{ duration: 0.2, ease: EASE }}
						className={`absolute z-50 flex w-64 flex-col ${up ? "bottom-full left-0 mb-gap-xs origin-bottom-left" : "top-full right-0 mt-gap-xs origin-top-right"} gap-gap-2xs rounded-medium border border-neutral-weak bg-raised-1 p-gap-xs shadow-raised`}
					>
						<p className="type-text-s px-gap-xs pt-gap-2xs text-neutral-weak">On the site now</p>
						<ul className="flex max-h-72 flex-col overflow-y-auto">
							<Person color={prefs.cursorColor} name={you ? `${you} (you)` : "You"} page={pageName(path)} />
							{others.map((p) => (
								<Person key={p.who} color={p.color} name={p.name || "Visitor"} page={pageName(p.page)} />
							))}
						</ul>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

function Person({ color, name, page }: { color: string; name: string; page?: string }) {
	return (
		<li className="type-text-m flex items-center gap-gap-xs rounded-small px-gap-xs py-gap-2xs">
			<span aria-hidden className="size-2.5 shrink-0 rounded-tiny" style={{ background: cursorById(color).fill }} />
			<span className="min-w-0 flex-1 truncate text-neutral-strong">{name}</span>
			{page && <span className="type-text-s shrink-0 text-neutral-weak">{page}</span>}
		</li>
	);
}
