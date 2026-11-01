import { type ChangelogEntry, formatDate } from "@/lib/changelog";

/**
 * The changelog as a timeline: dates on the left, a rail with a square marker per entry (like the
 * footer logo's handles), and what changed on the right. The newest marker is filled in brand pink.
 */
export function Timeline({ entries, headingLevel: H = "h3" }: { entries: ChangelogEntry[]; headingLevel?: "h2" | "h3" }) {
	return (
		<ol className="border-t border-neutral-weak">
			{entries.map((entry, i) => (
				<li key={`${entry.date}-${entry.title}`} className="grid grid-cols-1 md:grid-cols-4">
					<div className="type-text-s flex gap-gap-s px-gap-l pt-gap-l text-neutral-weak md:flex-col md:gap-gap-3xs md:pb-gap-l">
						<time dateTime={entry.date} className="font-code">
							{formatDate(entry.date)}
						</time>
						<span>{entry.area}</span>
					</div>
					<div className="relative ml-gap-l flex flex-col gap-gap-2xs border-l border-neutral-weak py-gap-l pr-gap-l pl-gap-l md:col-span-3 md:ml-0">
						<span
							aria-hidden
							className={`absolute top-gap-l left-0 mt-1.5 size-2.5 -translate-x-1/2 border ${i === 0 ? "border-brand-normal bg-brand-normal" : "border-neutral-strong bg-page"}`}
						/>
						<H className="type-title-s text-neutral-strong">{entry.title}</H>
						<p className="type-text-m max-w-measure text-neutral-normal">{entry.body}</p>
					</div>
				</li>
			))}
		</ol>
	);
}
