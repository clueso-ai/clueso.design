"use client";

import { AnimatePresence, type MotionValue, motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { Person } from "@/lib/team";
import { cursorById } from "@/lib/site-prefs";
import { CluesoCursor } from "./clueso-cursor";
import { TeamCard } from "./team-card";

// The team section. Each person's cursor rests on their portrait. Point at someone's card and that
// person, only them, glides over to your pointer and says hi with a high five, then heads back to
// their portrait. Pointer moves never re-render React: the cursor's springs read them directly.

const HELLOS: Record<string, string> = { kamal: "Namaste!", preshita: "Hola!", rutu: "Hey there!", sneha: "Bonjour!", ajinkya: "Hi!" };
/** Where the visiting cursor sits, relative to your pointer's tip, in px: just up and to the left. */
const BESIDE: [number, number] = [-34, -30];
/** How long they stay before heading home, in ms. */
const VISIT = 2400;
/** Soft, well-damped springs: smooth to follow, no wobble. */
const SPRING = { stiffness: 170, damping: 26, mass: 0.9 };

interface CursorProps {
	person: Person;
	home: [number, number] | null;
	visiting: boolean;
	greeting: boolean;
	px: MotionValue<number>;
	py: MotionValue<number>;
}

function TeamCursor({ person, home, visiting, greeting, px, py }: CursorProps) {
	const x = useSpring(0, SPRING);
	const y = useSpring(0, SPRING);
	const placed = useRef(false);

	useEffect(() => {
		if (!home) return;
		// The first position is home: jump there instead of flying in from the corner.
		if (!placed.current) {
			x.jump(home[0]);
			y.jump(home[1]);
			placed.current = true;
			return;
		}
		if (!visiting) {
			x.set(home[0]);
			y.set(home[1]);
			return;
		}
		// While visiting, follow the pointer straight from its motion values.
		const follow = () => {
			x.set(px.get() + BESIDE[0]);
			y.set(py.get() + BESIDE[1]);
		};
		follow();
		const offX = px.on("change", follow);
		const offY = py.on("change", follow);
		return () => {
			offX();
			offY();
		};
	}, [home, visiting, px, py, x, y]);

	return (
		<motion.div className="absolute top-0 left-0" style={{ x, y, opacity: home ? 1 : 0 }}>
			<CluesoCursor color={cursorById(person.cursor)} name={greeting ? HELLOS[person.slug] ?? "Hi!" : person.name} />
		</motion.div>
	);
}

export function TeamGrid({ people }: { people: Person[] }) {
	const grid = useRef<HTMLUListElement>(null);
	const reduce = useReducedMotion();
	const [homes, setHomes] = useState<Record<string, [number, number]>>({});
	const [visitor, setVisitor] = useState<string | null>(null);
	/** Who is saying hi right now. */
	const [greeter, setGreeter] = useState<string | null>(null);
	const [burst, setBurst] = useState<{ at: [number, number]; n: number } | null>(null);
	const px = useMotionValue(0);
	const py = useMotionValue(0);
	const timers = useRef<number[]>([]);
	/** The card the pointer is on. */
	const over = useRef<string | null>(null);

	// Home spots: low on each portrait, clear of the face.
	useEffect(() => {
		const el = grid.current!;
		const measure = () => {
			const box = el.getBoundingClientRect();
			const next: Record<string, [number, number]> = {};
			el.querySelectorAll<HTMLElement>("[data-team-art]").forEach((art) => {
				const r = art.getBoundingClientRect();
				next[art.dataset.teamArt!] = [r.left - box.left + r.width * 0.1, r.top - box.top + r.height * 0.8];
			});
			setHomes(next);
		};
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	useEffect(() => () => timers.current.forEach(clearTimeout), []);

	const goHome = () => {
		timers.current.forEach(clearTimeout);
		setVisitor(null);
		setGreeter(null);
	};

	const track = (e: React.PointerEvent) => {
		// The visit is a mouse thing. Taps would only send people flying to your finger.
		if (e.pointerType === "touch") return;
		const box = grid.current!.getBoundingClientRect();
		const at: [number, number] = [e.clientX - box.left, e.clientY - box.top];
		px.set(at[0]);
		py.set(at[1]);
		const slug = (e.target as Element).closest<HTMLElement>("[data-person]")?.dataset.person ?? null;
		if (slug === over.current) return;
		// A new card: its person visits once. Leaving the card sends them home.
		goHome();
		over.current = slug;
		if (!slug) return;
		if (!reduce) setVisitor(slug);
		timers.current = [
			window.setTimeout(
				() => {
					setGreeter(slug);
					setBurst({ at: [px.get(), py.get()], n: Date.now() });
				},
				reduce ? 0 : 420,
			),
			window.setTimeout(goHome, VISIT),
		];
	};
	const leave = () => {
		over.current = null;
		goHome();
	};

	const guest = people.find((p) => p.slug === greeter);

	return (
		<div className="relative">
			<ul
				ref={grid}
				onPointerMove={track}
				onPointerLeave={leave}
				className="grid grid-cols-2 border-t border-neutral-weak md:grid-cols-5 [&>li]:border-neutral-weak max-md:[&>li:nth-child(odd)]:border-r md:[&>li:not(:last-child)]:border-r max-md:[&>li:nth-child(n+3)]:border-t"
			>
				{people.map((person) => (
					<TeamCard key={person.slug} person={person} />
				))}
			</ul>
			<div aria-hidden className="pointer-events-none absolute inset-0 hidden pointer-fine:block">
				{people.map((person) => (
					<TeamCursor
						key={person.slug}
						person={person}
						home={homes[person.slug] ?? null}
						visiting={visitor === person.slug}
						greeting={greeter === person.slug}
						px={px}
						py={py}
					/>
				))}
				<AnimatePresence>{burst && guest && <Burst key={burst.n} at={burst.at} color={cursorById(guest.cursor).fill} />}</AnimatePresence>
			</div>
			<span className="sr-only" aria-live="polite">
				{guest ? `${guest.name} says ${HELLOS[guest.slug] ?? "hi"}` : ""}
			</span>
		</div>
	);
}

/** The high five: strokes bursting out around your pointer, in the person's colour. */
function Burst({ at, color }: { at: [number, number]; color: string }) {
	return (
		<svg viewBox="-40 -40 80 80" className="absolute size-20 overflow-visible" style={{ left: at[0] - 40, top: at[1] - 40, color }}>
			{Array.from({ length: 12 }, (_, i) => {
				const a = (i / 12) * Math.PI * 2;
				return (
					<motion.line
						key={i}
						x1={Math.cos(a) * 14}
						y1={Math.sin(a) * 14}
						x2={Math.cos(a) * 26}
						y2={Math.sin(a) * 26}
						stroke="currentColor"
						strokeWidth={2}
						strokeLinecap="round"
						initial={{ pathLength: 0, opacity: 1, scale: 0.5 }}
						animate={{ pathLength: 1, opacity: 0, scale: 1.4 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
					/>
				);
			})}
		</svg>
	);
}
