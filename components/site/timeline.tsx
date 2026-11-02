import { type ChangelogEntry, formatDate } from "@/lib/changelog";
import { DaysAgo } from "./days-ago";
import { ShippedBy } from "./shipped-by";

/**
 * The changelog as a timeline: dates on the left, a rail with square markers (like the footer
 * logo's handles), and what changed on the right, with who shipped it.
 * Entries shipped on the same day share one date, and each entry gets an outlined square on the rail.
 * Phones: the date sits on the rail above the day's entries, marked by a short bar (a connection point
 * as tall as the squares). The newest day's bar is brand pink.
 * Desktop: the date's line runs out to the square of the day's latest entry.
 * Dates, lines, bars and squares sit in rows as tall as a title's first line (.timeline-line), so
 * they stay centred on each other at any type scale.
 */
export function Timeline({ entries, headingLevel: H = "h3" }: { entries: ChangelogEntry[]; headingLevel?: "h2" | "h3" }) {
	const days: { date: string; entries: ChangelogEntry[] }[] = [];
	for (const entry of entries) {
		const last = days.at(-1);
		if (last?.date === entry.date) last.entries.push(entry);
		else days.push({ date: entry.date, entries: [entry] });
	}

	return (
		<ol className="border-t border-neutral-weak">
			{days.map((day, i) => {
				const dayMarker = `h-2.5 w-1 ${i === 0 ? "bg-brand-normal" : "bg-current text-neutral-strong"}`;
				return (
					<li key={day.date} className="grid grid-cols-1 md:grid-cols-4">
						{/* Phones: the date sits on the rail, above the day's entries, with the day's bar. */}
						<div className="type-text-xs md:type-text-s relative ml-gap-l flex items-center gap-gap-xs border-l border-neutral-weak pt-gap-l pl-gap-l text-neutral-weak md:ml-0 md:flex-col md:items-stretch md:gap-gap-3xs md:border-l-0 md:px-gap-l md:pb-gap-l">
							<span aria-hidden className="timeline-line absolute top-gap-l left-0 flex -translate-x-1/2 items-center md:hidden">
								<span className={dayMarker} />
							</span>
							<div className="timeline-line flex items-center gap-gap-s">
								<time dateTime={day.date} className="font-code text-neutral-strong">
									{formatDate(day.date)}
								</time>
								<span aria-hidden className="-mr-gap-l hidden flex-1 border-t border-neutral-weak md:block" />
							</div>
							{/* Phones: a short rule between the date and how long ago, side by side. */}
							<span aria-hidden className="h-3 border-l border-neutral-weak md:hidden" />
							<DaysAgo date={day.date} />
						</div>
						<div className="relative ml-gap-l flex flex-col gap-gap-xl border-l border-neutral-weak pt-gap-xs pr-gap-l pb-gap-l pl-gap-l md:col-span-3 md:ml-0 md:pt-gap-l">
							{day.entries.map((entry) => (
								<article key={entry.title} className="relative flex flex-col gap-gap-2xs">
									<span aria-hidden className="timeline-line absolute top-0 -left-gap-l flex -translate-x-1/2 items-center">
										<span className="size-2.5 border border-neutral-strong bg-page" />
									</span>
									<H className="type-text-l text-neutral-strong">{entry.title}</H>
									<p className="type-text-m max-w-measure text-neutral-normal">{entry.body}</p>
									<ShippedBy who={entry.by} className="pt-gap-xs" />
								</article>
							))}
						</div>
					</li>
				);
			})}
		</ol>
	);
}
