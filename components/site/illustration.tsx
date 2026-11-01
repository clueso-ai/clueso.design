import { MARK_PATHS } from "@/tools/brand-lab/brand/mark";

// Illustrations made from the Clueso mark and Brand Lab's treatments: halftone dots, a line
// screen, LED pixels, the logo's construction grid, and the three parts coming together. Drawn
// in the neutral line colour; hovering the surrounding .group brings in the brand pink.

export type IllustrationKind = "assemble" | "halftone" | "lines" | "pixels" | "construction";

const BOX = "-10 -10 120 120";
const ease = "transition-[translate,color,opacity] duration-500 ease-out-strong motion-reduce:transition-none";
const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1, vectorEffect: "non-scaling-stroke" } as const;
const dashed = { ...stroke, stroke: "var(--border-neutral-strong)", strokeDasharray: "3 3" } as const;

function MarkClip({ id }: { id: string }) {
	return (
		<clipPath id={id}>
			{MARK_PATHS.map((d) => (
				<path key={d} d={d} />
			))}
		</clipPath>
	);
}

function Outline() {
	return MARK_PATHS.map((d) => <path key={d} d={d} {...stroke} />);
}

/** Dots that grow along the 135° diagonal, like Brand Lab's halftone. */
function Halftone({ id }: { id: string }) {
	const dots = [];
	for (let y = 2; y < 100; y += 5)
		for (let x = 2 + ((y / 5) % 2) * 2.5; x < 100; x += 5) {
			const t = (x + (100 - y)) / 200;
			dots.push(<circle key={`${x}-${y}`} cx={x} cy={y} r={0.5 + 2 * t} fill="currentColor" />);
		}
	return <g clipPath={`url(#${id})`}>{dots}</g>;
}

/** Horizontal rules that thicken towards the bottom, like the line-screen posters. */
function LineScreen({ id }: { id: string }) {
	return (
		<g clipPath={`url(#${id})`}>
			{Array.from({ length: 25 }, (_, i) => {
				const y = i * 4 + 1;
				return <rect key={y} x="0" y={y} width="100" height={0.4 + (i / 24) * 2.8} fill="currentColor" />;
			})}
		</g>
	);
}

/** Rounded LED cells with a seeded pattern of dim ones, like the matrix layer. */
function Pixels({ id }: { id: string }) {
	const cells = [];
	// A fixed hash per cell, so the pattern is the same on every render.
	const dim = (x: number, y: number) => {
		const h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
		return h - Math.floor(h) < 0.18;
	};
	for (let y = 0; y < 100; y += 6.25)
		for (let x = 0; x < 100; x += 6.25) {
			const on = !dim(x, y);
			cells.push(<rect key={`${x}-${y}`} x={x + 0.9} y={y + 0.9} width="4.45" height="4.45" rx="1.2" fill="currentColor" opacity={on ? 1 : 0.25} />);
		}
	return <g clipPath={`url(#${id})`}>{cells}</g>;
}

/** The logo's construction: 36-unit cavity openings, 135° breaks, cavity circles. */
function Construction() {
	return (
		<>
			{[32, 68].map((v) => (
				<g key={v}>
					<line x1={v} y1="-10" x2={v} y2="110" {...dashed} />
					<line x1="-10" y1={v} x2="110" y2={v} {...dashed} />
				</g>
			))}
			{[16, 52, 68].map((x0) => (
				<line key={x0} x1={x0 - 10} y1="-10" x2={x0 + 110 - 0} y2={110} {...dashed} />
			))}
			<circle cx="6" cy="50" r="18" {...dashed} />
			<circle cx="50" cy="94" r="18" {...dashed} />
			<Outline />
		</>
	);
}

/** The three parts pulled apart along the diagonal. Hover snaps them together. */
function Assemble() {
	const offsets = ["translate-x-[14px] -translate-y-[14px]", "translate-x-[7px] -translate-y-[7px]", "-translate-x-[4px] translate-y-[4px]"];
	return (
		<>
			{MARK_PATHS.map((d) => (
				<path key={`ghost-${d}`} d={d} {...dashed} />
			))}
			{MARK_PATHS.map((d, i) => (
				<path key={d} d={d} fill="var(--surface-raised-1)" stroke="currentColor" strokeWidth={1} vectorEffect="non-scaling-stroke" className={`${ease} ${offsets[i]} group-hover:translate-0`} />
			))}
		</>
	);
}

export function Illustration({ kind, className = "" }: { kind: IllustrationKind; className?: string }) {
	const id = `mark-clip-${kind}`;
	return (
		<div aria-hidden className={`grid-lines flex items-center justify-center ${className}`}>
			<svg viewBox={BOX} className={`size-32 overflow-visible text-neutral-normal ${ease} group-hover:text-brand-normal`}>
				<defs>
					<MarkClip id={id} />
				</defs>
				{kind === "halftone" && <Halftone id={id} />}
				{kind === "lines" && <LineScreen id={id} />}
				{kind === "pixels" && <Pixels id={id} />}
				{kind === "construction" && <Construction />}
				{kind === "assemble" && <Assemble />}
			</svg>
		</div>
	);
}
