import Link from "next/link";
import { BrandLabPreview } from "@/components/site/brand-lab-preview";
import { type FeaturedTool, FeaturedTools } from "@/components/site/featured-tools";
import { Band, SectionHeading } from "@/components/site/frame";
import { LiveToolPreview } from "@/components/site/live-tool-preview";
import { ShippedBy } from "@/components/site/shipped-by";
import { ToolSnapshot } from "@/components/site/tool-snapshot";
import { HeroGreeting } from "@/components/site/hero-greeting";
import { TeamGrid } from "@/components/site/team-grid";
import { Timeline } from "@/components/site/timeline";
import { ButtonLink } from "@/lib/design-system";
import { changelog } from "@/lib/changelog";
import { displayTitle, publicItems, type RegistryItem } from "@/lib/registry";
import { team } from "@/lib/team";

/** Inline links: quiet underline that firms up, and the text steps up to strong, on hover. */
const TEXT_LINK = "focus-ring rounded-tiny text-neutral-strong underline decoration-neutral-weak underline-offset-4 transition-[color,text-decoration-color] duration-200 ease-out-strong hover:text-brand-normal hover:decoration-current";
const BRAND_BLOG = "https://www.clueso.io/blog/the-clueso-brand";
/** How many experiments the homepage shows, newest first. The rest are on the playground page. */
const LATEST = 3;

/** The playground: the newest experiments, each showing its still. Empty slots fill the row while there are fewer than three. */
function Playground() {
	const experiments = publicItems("experiment")
		.toSorted((a, b) => b.updated.localeCompare(a.updated))
		.slice(0, LATEST);
	const open = LATEST - experiments.length;
	return (
		<ul className="grid border-t border-neutral-weak md:grid-cols-3 [&>li]:border-neutral-weak max-md:[&>li+li]:border-t md:[&>li:not(:nth-child(3n))]:border-r md:[&>li:nth-child(n+4)]:border-t">
			{experiments.map((item) => (
				<li key={item.slug}>
					<Link href={item.href} className="group focus-ring state-layer flex h-full flex-col">
						<ToolSnapshot item={item} aspect="aspect-4/3" sizes="(min-width: 768px) 33vw, 100vw" className="border-b border-neutral-weak" />
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

/** How many tools the homepage features. The rest are on the tools page. */
const FEATURED = 3;

/** A tool's title, link and credit under its preview. `blurb` replaces the registry description. */
function ToolDetails({ item, blurb }: { item: RegistryItem; blurb?: React.ReactNode }) {
	const title = displayTitle(item.title);
	return (
		<div className="flex max-w-measure flex-col gap-gap-xs">
			{/* The title opens the tool in a new tab. Tools are built for a mouse and a big screen, so phones and tablets get the name without the link. */}
			<h3 className="type-text-xl text-neutral-strong">
				<a href={item.href} target="_blank" rel="noreferrer" className="focus-ring hidden rounded-tiny underline-offset-4 decoration-1 hover:underline pointer-fine:inline">
					{title}
				</a>
				<span className="pointer-fine:hidden">{title}</span>
			</h3>
			<p className="type-text-m whitespace-pre-line text-neutral-normal">{blurb ?? item.description}</p>
			<ShippedBy who={item.owner} className="pt-gap-m" />
		</div>
	);
}

/** Each featured tool's tab, with the tool running live. Brand Lab opens on its posters. */
function featuredTool(item: RegistryItem): FeaturedTool {
	if (item.slug === "brand-lab")
		return {
			slug: item.slug,
			title: displayTitle(item.title),
			preview: <BrandLabPreview item={item} />,
			details: (
				<ToolDetails
					item={item}
					blurb={
						<>
							A playground for patterns, compositions and visual treatments made from Clueso&apos;s brand shapes.
							<br />
							To see the thinking behind them, read about the{" "}
							<a href={BRAND_BLOG} target="_blank" rel="noreferrer" className={TEXT_LINK}>
								Clueso brand
							</a>
							.
						</>
					}
				/>
			),
		};
	return {
		slug: item.slug,
		title: displayTitle(item.title),
		preview: <LiveToolPreview item={item} />,
		details: <ToolDetails item={item} />,
	};
}

export default function Home() {
	const featured = publicItems("tool")
		.toSorted((a, b) => b.updated.localeCompare(a.updated))
		.slice(0, FEATURED)
		.map(featuredTool);

	return (
		<>
			<Band rule={false} flush>
				<HeroGreeting />
			</Band>

			<Band id="tools" labelledBy="tools-title" flush>
				<SectionHeading id="tools-title" title="Tools we built to power our design workflows">
					<ButtonLink href="/tools" size="large" variant="outlined" sentiment="neutral">
						Explore all tools
					</ButtonLink>
				</SectionHeading>
				<FeaturedTools tools={featured} />
			</Band>

			<Band id="playground" labelledBy="playground-title" flush>
				<SectionHeading id="playground-title" title="Fun experiments">
					<ButtonLink href="/playground" size="large" variant="outlined" sentiment="neutral">
						Explore the playground
					</ButtonLink>
				</SectionHeading>
				<Playground />
			</Band>

			<Band id="team" labelledBy="team-title" flush>
				<SectionHeading id="team-title" title="Meet the team" />
				<TeamGrid people={team} />
			</Band>

			<Band id="changelog" labelledBy="changelog-title" flush>
				<SectionHeading id="changelog-title" title="New on this website">
					<ButtonLink href="/changelog" size="large" variant="outlined" sentiment="neutral">
						See the changelog
					</ButtonLink>
				</SectionHeading>
				<Timeline entries={changelog.slice(0, 3)} />
			</Band>
		</>
	);
}
