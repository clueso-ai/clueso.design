import Link from "next/link";
import { BrandLabPreview } from "@/components/site/brand-lab-preview";
import { Band, SectionHeading } from "@/components/site/frame";
import { ShippedBy } from "@/components/site/shipped-by";
import { HeroGreeting } from "@/components/site/hero-greeting";
import { TeamGrid } from "@/components/site/team-grid";
import { Timeline } from "@/components/site/timeline";
import { ButtonLink } from "@/lib/design-system";
import { ArrowRightIcon } from "@/lib/design-system/icons";
import { changelog } from "@/lib/changelog";
import { getItem, publicItems } from "@/lib/registry";
import { team } from "@/lib/team";

/** Inline links: quiet underline that firms up, and the text steps up to strong, on hover. */
const TEXT_LINK = "focus-ring rounded-tiny text-neutral-strong underline decoration-neutral-weak underline-offset-4 transition-[color,text-decoration-color] duration-200 ease-out-strong hover:text-brand-normal hover:decoration-current";
const BRAND_BLOG = "https://www.clueso.io/blog/the-clueso-brand";
/** The playground: experiments so far, each showing a live glimpse of itself, then empty slots that fill out the row on wider screens. */
function Playground() {
	const experiments = publicItems("experiment");
	const total = Math.max(3, Math.ceil((experiments.length + 1) / 3) * 3);
	const open = total - experiments.length;
	return (
		<ul className="grid border-t border-neutral-weak md:grid-cols-3 [&>li]:border-neutral-weak max-md:[&>li+li]:border-t md:[&>li:not(:nth-child(3n))]:border-r md:[&>li:nth-child(n+4)]:border-t">
			{experiments.map((item) => (
				<li key={item.slug}>
					<Link href={item.href} className="group focus-ring state-layer flex h-full flex-col">
						{/* The experiment itself, scaled down (styles/site.css). Lazy, and out of the tab order. */}
						<span className="playground-snippet relative block aspect-4/3 overflow-hidden border-b border-neutral-weak">
							<iframe src={item.href} title={`${item.title} preview`} loading="lazy" tabIndex={-1} aria-hidden className="absolute top-0 left-0" />
						</span>
						<span className="flex flex-1 flex-col gap-gap-xs p-gap-l">
							{/* The text style and a hover underline, like Brand lab's title above. */}
							<span className="type-text-xl text-neutral-strong decoration-1 underline-offset-4 group-hover:underline">{item.title}</span>
							<span className="type-text-m whitespace-pre-line text-neutral-normal">{item.description}</span>
							<ShippedBy who={item.owner} className="pt-gap-s" />
						</span>
					</Link>
				</li>
			))}
			{/* Empty slots: an outline, waiting for the next experiment. Only in the grid: stacked on phones, there's no row to fill. */}
			{Array.from({ length: open }, (_, i) => (
				<li key={`open-${i}`} className="hidden p-gap-l md:flex">
					<span className="type-text-m flex min-h-full w-full items-center justify-center rounded-medium border border-dashed border-neutral-normal text-neutral-weak">Coming soon</span>
				</li>
			))}
		</ul>
	);
}

export default function Home() {
	const brandLab = getItem("brand-lab")!;

	return (
		<>
			<Band rule={false} flush>
				<HeroGreeting />
			</Band>

			<Band id="tools" labelledBy="tools-title" flush>
				<SectionHeading id="tools-title" title="Tools we built to power our design workflows">
					<ButtonLink href="/tools" variant="outlined" sentiment="neutral" icon={<ArrowRightIcon />}>
						Explore all tools
					</ButtonLink>
				</SectionHeading>
				<div className="border-t border-neutral-weak">
					<BrandLabPreview href={brandLab.href} />
				</div>
				<div className="border-t border-neutral-weak px-gap-l py-gap-l">
					<div className="flex max-w-measure flex-col gap-gap-xs">
						{/* Sentence case and the text style here, unlike the registry's title for the tool. The title opens the tool in a new tab. */}
						<h3 className="type-text-xl text-neutral-strong">
							<a href={brandLab.href} target="_blank" rel="noreferrer" className="focus-ring rounded-tiny underline-offset-4 decoration-1 hover:underline">
								Brand lab
							</a>
						</h3>
						<p className="type-text-m text-neutral-normal">
							A playground for patterns, compositions and visual treatments made from Clueso&apos;s brand shapes.
							<br />
							To see the thinking behind them, read about the{" "}
							<a href={BRAND_BLOG} target="_blank" rel="noreferrer" className={TEXT_LINK}>
								Clueso brand
							</a>
							.
						</p>
						<ShippedBy who={brandLab.owner} className="pt-gap-m" />
					</div>
				</div>
			</Band>

			<Band id="playground" labelledBy="playground-title" flush>
				<SectionHeading id="playground-title" title="Fun experiments" />
				<Playground />
			</Band>

			<Band id="team" labelledBy="team-title" flush>
				<SectionHeading id="team-title" title="Meet the team" />
				<TeamGrid people={team} />
			</Band>

			<Band id="changelog" labelledBy="changelog-title" flush>
				<SectionHeading id="changelog-title" title="New on this website">
					<ButtonLink href="/changelog" variant="outlined" sentiment="neutral" icon={<ArrowRightIcon />}>
						See the changelog
					</ButtonLink>
				</SectionHeading>
				<Timeline entries={changelog.slice(0, 3)} />
			</Band>
		</>
	);
}
