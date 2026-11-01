"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/lib/design-system";
import { MenuIcon } from "@/lib/design-system/icons";

// Phones: the main links behind a menu button. The menu drops down under the header as full-width
// rows, big enough to tap. It closes on a link, on Escape, and whenever the page changes.
//
// Opening, the panel wipes down from the header and the links follow one after another. Closing is
// quicker and all at once, so it gets out of the way. Reduced motion: a plain fade.

const EASE = [0.23, 1, 0.32, 1] as const;
const MotionLink = motion.create(Link);

export function MobileNav({ items }: { items: { href: string; label: string }[] }) {
	const [open, setOpen] = useState(false);
	const reduce = useReducedMotion();
	const path = usePathname();

	// A new page closes the menu. Hash links on the same page close it through onClick.
	const [lastPath, setLastPath] = useState(path);
	if (path !== lastPath) {
		setLastPath(path);
		setOpen(false);
	}

	useEffect(() => {
		if (!open) return;
		const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
		window.addEventListener("keydown", key);
		return () => window.removeEventListener("keydown", key);
	}, [open]);

	return (
		<div className="md:hidden">
			<Button
				variant="transparent"
				sentiment="neutral"
				size="medium"
				iconOnly
				className="focus-ring"
				aria-label={open ? "Close menu" : "Open menu"}
				aria-expanded={open}
				aria-controls="mobile-nav"
				icon={<MenuIcon open={open} />}
				onClick={() => setOpen((o) => !o)}
			/>
			<AnimatePresence>
				{open && (
					<motion.nav
						id="mobile-nav"
						aria-label="Main"
						className="absolute inset-x-0 top-full border-b border-neutral-weak bg-page"
						initial={reduce ? { opacity: 0 } : { clipPath: "inset(0 0 100% 0)" }}
						animate={reduce ? { opacity: 1 } : { clipPath: "inset(0 0 0% 0)", transition: { duration: 0.32, ease: EASE } }}
						exit={reduce ? { opacity: 0 } : { clipPath: "inset(0 0 100% 0)", transition: { duration: 0.18, ease: EASE } }}
					>
						<ul className="flex flex-col">
							{items.map((item, i) => (
								<li key={item.href} className="border-t border-neutral-weak first:border-t-0">
									<MotionLink
										href={item.href}
										onClick={() => setOpen(false)}
										className="focus-ring type-text-l flex px-gap-l py-gap-s text-neutral-strong"
										initial={reduce ? false : { opacity: 0, y: -6 }}
										animate={{ opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE, delay: 0.04 + i * 0.035 } }}
									>
										{item.label}
									</MotionLink>
								</li>
							))}
						</ul>
					</motion.nav>
				)}
			</AnimatePresence>
		</div>
	);
}
