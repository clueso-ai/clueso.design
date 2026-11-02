import type { ReactNode } from "react";

// Guide lines, in the spirit of an engineering drawing: every band of the page spans the full
// width with a rule on top, the content sits in a framed column, the gutters outside the frame are
// hatched, and a small cross marks where the rules meet.

/** A + where two guide lines cross. Sits centred on its corner. */
export function Cross({ className = "" }: { className?: string }) {
	return (
		<svg aria-hidden viewBox="0 0 11 11" className={`absolute z-10 size-3 text-neutral-normal ${className}`}>
			<path d="M5.5 0V11M0 5.5H11" stroke="currentColor" />
		</svg>
	);
}

interface BandProps {
	id?: string;
	labelledBy?: string;
	/** Rule on top. Off for the first band under the header. */
	rule?: boolean;
	className?: string;
	children: ReactNode;
	as?: "section" | "div" | "header" | "footer";
	/** No bottom padding: the band ends on its content. */
	flush?: boolean;
}

/** One horizontal band of the page: full-width rule, hatched gutters, framed content column. */
export function Band({ id, labelledBy, rule = true, flush = false, className = "", children, as: Tag = "section" }: BandProps) {
	return (
		<Tag id={id} aria-labelledby={labelledBy} className={`hatch scroll-mt-16 ${rule ? "border-t border-neutral-weak" : ""}`}>
			<div className={`relative mx-auto max-w-page bg-page ${flush ? "" : "pb-gap-3xl"} xl:border-x xl:border-neutral-weak ${className}`}>
				{rule && (
					<>
						<Cross className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 xl:block" />
						<Cross className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 xl:block" />
					</>
				)}
				{children}
			</div>
		</Tag>
	);
}

/** A section heading with its intro, left-aligned like everything else, with any actions on the right. */
export function SectionHeading({ id, title, intro, children }: { id: string; title: string; intro?: string; children?: ReactNode }) {
	return (
		<div className="flex flex-col gap-gap-m px-gap-l pt-gap-3xl pb-gap-xl md:flex-row md:items-end md:justify-between">
			<div className="flex max-w-measure flex-col gap-gap-s">
				<h2 id={id} className="type-title-l text-neutral-strong">
					{title}
				</h2>
				{/* A "\n" in the intro breaks the line there. */}
				{intro && <p className="type-text-l text-pretty whitespace-pre-line text-neutral-normal">{intro}</p>}
			</div>
			{/* Phones: the heading's buttons span the full width. */}
			{children && <div className="flex shrink-0 flex-col gap-gap-s *:w-full md:flex-row md:flex-wrap md:*:w-auto">{children}</div>}
		</div>
	);
}
