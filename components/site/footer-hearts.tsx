"use client";

import { AnimatePresence, motion, useAnimate, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/lib/design-system";
import { HeartIcon } from "@/lib/design-system/icons";
import { setHearted, usePresence } from "@/lib/presence";

// The footer's heart: how many people like the site, live. Each person hearts it once and can take
// it back. Hearting makes the outlined heart jump and grow, flip over to its red side at the top and
// spring back down.
// Meanwhile a "+1" (or "−1") slides in after the count, widening the pill; then the count rolls to its
// new number and the suffix folds away. Other people's hearts just roll the count.
// The state lives in lib/presence.ts.

const EASE = [0.23, 1, 0.32, 1] as const;
/** How long the suffix shows before the count rolls. */
const SUFFIX_MS = 650;
/** The heart's jump, flip and landing. It turns filled halfway through the flip, when it's edge-on. */
const JUMP = { duration: 0.16, ease: "easeOut" } as const;
const FLIP = { duration: 0.24, ease: "easeInOut" } as const;
const LAND = { type: "spring", stiffness: 520, damping: 14 } as const;

export function FooterHearts() {
	const { hearts, hearted } = usePresence();
	const reduce = useReducedMotion();
	// While your change plays out: the suffix, and the count from before it.
	const [suffix, setSuffix] = useState<1 | -1 | null>(null);
	const [before, setBefore] = useState<number | null>(null);
	// The heart's look, which lags your choice while it flips.
	const [filled, setFilled] = useState<boolean | null>(null);
	const [heart, animate] = useAnimate<HTMLSpanElement>();
	/** Bumped on every press, so a sequence that's been overtaken stops. */
	const run = useRef(0);
	const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

	useEffect(() => () => clearTimeout(timer.current), []);

	const play = async (on: boolean) => {
		const id = ++run.current;
		const el = heart.current;
		if (!el || reduce) return setFilled(null);
		if (!on) {
			setFilled(null);
			await animate(el, { y: 0, rotateY: 0, scale: [0.8, 1] }, LAND);
			return;
		}
		setFilled(false);
		// Perspective, so the flip turns in depth rather than squashing flat.
		animate(el, { y: 0, rotateY: 0, scale: 1, transformPerspective: 200 }, { duration: 0 });
		await animate(el, { y: -8, scale: 1.1 }, JUMP);
		if (id !== run.current) return;
		const flip = animate(el, { rotateY: 180 }, FLIP);
		setTimeout(() => id === run.current && setFilled(null), FLIP.duration * 500);
		await flip;
		if (id !== run.current) return;
		await animate(el, { y: 0, scale: 1 }, LAND);
	};

	if (hearts === null || hearted === null) return null;

	const toggle = () => {
		const next = !hearted;
		setBefore((b) => b ?? hearts);
		setSuffix(next ? 1 : -1);
		setHearted(next);
		void play(next);
		clearTimeout(timer.current);
		timer.current = setTimeout(
			() => {
				setSuffix(null);
				setBefore(null);
			},
			reduce ? 0 : SUFFIX_MS,
		);
	};

	const showFilled = filled ?? hearted;
	const others = hearts - (hearted ? 1 : 0);
	const n = (k: number) => k.toLocaleString("en-US");
	const label = hearted
		? `${others ? `You and ${n(others)} ${others === 1 ? "other" : "others"}` : "You"} heart clueso.design. Press to take it back.`
		: hearts
			? `${n(hearts)} ${hearts === 1 ? "person hearts" : "people heart"} clueso.design. Add yours.`
			: "Be the first to heart clueso.design.";

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					aria-pressed={hearted}
					aria-label="Heart clueso.design"
					onClick={toggle}
					className="group header-control state-layer focus-ring type-text-s flex shrink-0 items-center gap-gap-xs rounded-small border border-neutral-weak px-gap-xs text-neutral-normal transition-colors duration-200 ease-out-strong hover:border-neutral-normal hover:text-neutral-strong"
				>
					{/* Animated by play(): a jump and flip when you heart it, a small spring when you take it back. */}
					<span
						ref={heart}
						className={`flex transition-colors duration-200 ease-out-strong ${showFilled ? "text-heart" : "text-neutral-weak group-hover:text-heart"}`}
					>
						<HeartIcon filled={showFilled} className="size-3.5" />
					</span>
					<span aria-hidden className="flex items-center">
						<RollingNumber value={before ?? hearts} reduce={!!reduce} />
						<AnimatePresence initial={false}>
							{suffix && (
								<motion.span
									key="suffix"
									initial={{ width: 0, opacity: 0 }}
									animate={{ width: "auto", opacity: 1 }}
									exit={{ width: 0, opacity: 0 }}
									transition={{ duration: reduce ? 0 : 0.25, ease: EASE }}
									className="overflow-hidden"
								>
									<span
										className={`block pl-gap-2xs whitespace-nowrap tabular-nums ${suffix > 0 ? "text-heart" : "text-neutral-weak"}`}
									>
										{suffix > 0 ? "+1" : "−1"}
									</span>
								</motion.span>
							)}
						</AnimatePresence>
					</span>
				</button>
			</TooltipTrigger>
			<TooltipContent side="top">{label}</TooltipContent>
		</Tooltip>
	);
}

const digit = {
	enter: ({ dir, reduce }: { dir: number; reduce: boolean }) =>
		reduce
			? { opacity: 0 }
			: { y: dir > 0 ? "75%" : "-75%", opacity: 0, filter: "blur(3px)" },
	settle: { y: 0, opacity: 1, filter: "blur(0px)" },
	leave: ({ dir, reduce }: { dir: number; reduce: boolean }) =>
		reduce
			? { opacity: 0 }
			: { y: dir > 0 ? "-75%" : "75%", opacity: 0, filter: "blur(3px)" },
};

/** A count whose changed digits roll in: up from below when it rises, down from above when it falls, blurred until they settle. */
function RollingNumber({ value, reduce }: { value: number; reduce: boolean }) {
	const [prev, setPrev] = useState(value);
	const [dir, setDir] = useState(1);
	if (value !== prev) {
		setDir(value > prev ? 1 : -1);
		setPrev(value);
	}
	const chars = value.toLocaleString("en-US").split("");
	return (
		<span className="flex tabular-nums">
			{/* Keyed by place from the right, so the units stay put when a digit is added in front. */}
			{chars.map((c, i) => (
				<span key={chars.length - i} className="relative flex overflow-hidden">
					<AnimatePresence
						initial={false}
						mode="popLayout"
						custom={{ dir, reduce }}
					>
						<motion.span
							key={c}
							custom={{ dir, reduce }}
							variants={digit}
							initial="enter"
							animate="settle"
							exit="leave"
							transition={{ duration: 0.35, ease: EASE }}
						>
							{c}
						</motion.span>
					</AnimatePresence>
				</span>
			))}
		</span>
	);
}
