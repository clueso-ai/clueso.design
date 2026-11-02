"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { findPerson } from "@/lib/team";

// "Shipped by" and who: their portrait and first name. Used under tools, experiments and changelog
// entries. Someone who isn't on the team list gets their name alone.
// Hovering the portrait or name grows a larger copy out of the portrait, since 20px is hard to make out.

const EASE = [0.23, 1, 0.32, 1] as const;
const SMALL = 20;
const LARGE = 96;
const RISE = 4;

export function ShippedBy({ who, className = "" }: { who: string; className?: string }) {
	const person = findPerson(who);
	const name = person?.name ?? who;
	const reduce = useReducedMotion();
	const [hover, setHover] = useState(false);
	const poster = person?.poster;

	return (
		<span className={`type-text-s flex items-center gap-gap-s text-neutral-weak ${className}`}>
			Shipped by
			<span
				className="relative flex items-center gap-gap-xs text-neutral-strong"
				onPointerEnter={poster ? () => setHover(true) : undefined}
				onPointerLeave={poster ? () => setHover(false) : undefined}
			>
				{poster && (
					// The portraits are drawn on a near-black ground (lib/team.ts), so their tile stays dark in light mode too.
					// bg-clip-padding keeps that ground from showing through the translucent border.
					// eslint-disable-next-line @next/next/no-img-element -- a 20px avatar; next/image adds nothing here
					<img src={poster} alt="" className="size-5 rounded-small border border-neutral-weak bg-portrait bg-clip-padding object-cover" />
				)}
				{name}
				<AnimatePresence>
					{poster && hover && (
						// Starts on top of the small portrait at its size, then grows up and out of it.
						<motion.img
							src={poster}
							alt=""
							aria-hidden
							initial={reduce ? { opacity: 0 } : { opacity: 0, scale: SMALL / LARGE, y: SMALL + RISE }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={reduce ? { opacity: 0 } : { opacity: 0, scale: SMALL / LARGE, y: SMALL + RISE, transition: { duration: 0.15, ease: EASE } }}
							transition={{ duration: 0.25, ease: EASE }}
							className="pointer-events-none absolute bottom-full left-0 z-50 mb-gap-2xs size-24 origin-bottom-left rounded-medium border border-neutral-weak bg-portrait bg-clip-padding object-cover shadow-overlay"
						/>
					)}
				</AnimatePresence>
			</span>
		</span>
	);
}
