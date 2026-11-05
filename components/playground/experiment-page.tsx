import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Band } from "@/components/site/frame";
import { ShippedBy } from "@/components/site/shipped-by";
import { ButtonLink } from "@/lib/design-system";
import { ArrowLeftIcon } from "@/lib/design-system/icons";
import { displayTitle, getItem } from "@/lib/registry";
import { WantInClueso } from "./want-in-clueso";

// The frame every playground experiment built into the site shares: a way back to the playground and
// a breadcrumb, its title, what it is and who made it from the registry, a vote for it in Clueso,
// then the experiment itself.

const crumb = "focus-ring rounded-tiny text-neutral-normal transition-colors duration-200 ease-out-strong hover:text-neutral-strong";

/** A page's title and description, from its registry entry. */
export function experimentMetadata(slug: string): Metadata {
	const item = getItem(slug);
	return { title: item ? displayTitle(item.title) : "Playground", description: item?.description };
}

export function ExperimentPage({ slug, children }: { slug: string; children: ReactNode }) {
	const item = getItem(slug);
	if (!item) throw new Error(`No registry item for ${slug}`);
	return (
		// Flush, so the experiment's column divider runs all the way down to the footer.
		<Band rule={false} flush labelledBy="experiment-title">
			<div className="flex flex-col gap-gap-s px-gap-l pt-gap-2xl pb-gap-xl">
				{/* Back to the playground, and where you are, on their own row well clear of the title. */}
				<div className="mb-gap-l flex items-center gap-gap-s">
					<ButtonLink href="/playground" variant="outlined" sentiment="neutral" size="medium" iconOnly icon={<ArrowLeftIcon />} aria-label="Back to the playground" />
					<nav aria-label="Breadcrumb">
						<ol className="type-text-s flex items-center gap-gap-2xs text-neutral-weak">
							<li>
								<Link href="/" className={crumb}>
									Home
								</Link>
							</li>
							<li aria-hidden>/</li>
							<li>
								<Link href="/playground" className={crumb}>
									Playground
								</Link>
							</li>
							<li aria-hidden>/</li>
							<li aria-current="page" className="text-neutral-strong">
								{displayTitle(item.title)}
							</li>
						</ol>
					</nav>
				</div>
				<h1 id="experiment-title" className="type-title-l text-neutral-strong">
					{displayTitle(item.title)}
				</h1>
				<p className="type-text-l max-w-measure text-pretty text-neutral-normal">{item.description}</p>
				<div className="flex flex-col gap-gap-m pt-gap-xs sm:flex-row sm:items-start sm:justify-between">
					<ShippedBy who={item.owner} />
					<WantInClueso slug={item.slug} />
				</div>
			</div>
			<div className="border-t border-neutral-weak">{children}</div>
		</Band>
	);
}
