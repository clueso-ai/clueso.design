import Link from "next/link";
import { BrandLabPreview } from "@/components/site/brand-lab-preview";
import { Band, SectionHeading } from "@/components/site/frame";
import { HeroTitle } from "@/components/site/hero-title";
import { Illustration, type IllustrationKind } from "@/components/site/illustration";
import { TeamGrid } from "@/components/site/team-grid";
import { Timeline } from "@/components/site/timeline";
import { TypeTuner } from "@/components/site/type-tuner";
import { ButtonLink } from "@/lib/design-system";
import { ArrowRightIcon, ExternalLinkIcon } from "@/lib/design-system/icons";
import { changelog } from "@/lib/changelog";
import { getItem, publicItems } from "@/lib/registry";
import { team } from "@/lib/team";

/** Inline links: quiet underline that firms up, and the text steps up to strong, on hover. */
const TEXT_LINK = "focus-ring rounded-tiny text-neutral-strong underline decoration-neutral-weak underline-offset-4 transition-[color,text-decoration-color] duration-200 ease-out-strong hover:text-brand-normal hover:decoration-current";
const BRAND_BLOG = "https://www.clueso.io/blog/the-clueso-brand";
/** Art for playground cells, in order. Open slots use what's left. */
const ART: IllustrationKind[] = ["pixels", "assemble", "halftone", "construction", "lines"];

/** The playground: experiments so far, then open slots that fill out the row. With none yet, the whole row is open slots. */
function Playground() {
	const experiments = publicItems("experiment");
	const total = Math.max(3, Math.ceil((experiments.length + 1) / 3) * 3);
	const open = total - experiments.length;
	return (
		<ul className="grid border-t border-neutral-weak md:grid-cols-3 [&>li]:border-neutral-weak max-md:[&>li+li]:border-t md:[&>li:not(:nth-child(3n))]:border-r md:[&>li:nth-child(n+4)]:border-t">
			{experiments.map((item, i) => (
				<li key={item.slug}>
					<Link href={item.href} className="group focus-ring state-layer flex h-full flex-col">
						<Illustration kind={ART[i % ART.length]} className="aspect-4/3 border-b border-neutral-weak" />
						<span className="flex flex-1 flex-col gap-gap-2xs p-gap-l">
							<span className="flex items-center justify-between gap-gap-s">
								<span className="type-title-s text-neutral-strong">{item.title}</span>
								<ArrowRightIcon aria-hidden className="size-4 text-neutral-strong transition-transform duration-200 ease-out-strong group-hover:translate-x-0.5" />
							</span>
							<span className="type-text-s text-neutral-normal">{item.description}</span>
							<span className="type-text-s pt-gap-xs text-neutral-weak">By {item.owner}</span>
						</span>
					</Link>
				</li>
			))}
			{Array.from({ length: open }, (_, i) => {
				const n = experiments.length + i + 1;
				return (
					<li key={`open-${n}`} className="group flex flex-col">
						<Illustration kind={ART[(experiments.length + i) % ART.length]} className="aspect-4/3 border-b border-dashed border-neutral-weak opacity-60 transition-opacity duration-500 ease-out-strong group-hover:opacity-100" />
						<span className="flex flex-1 flex-col gap-gap-2xs p-gap-l">
							<span className="type-text-s font-code text-neutral-weak">Experiment {String(n).padStart(3, "0")}</span>
							<span className="type-title-s text-neutral-weak">{i === 0 ? "On the workbench" : "Slot open"}</span>
							<span className="type-text-s text-neutral-weak">{i === 0 ? "Something's taking shape. It lands here when it's ready to be played with." : "Saved for whatever we get curious about next."}</span>
						</span>
					</li>
				);
			})}
		</ul>
	);
}

export default function Home() {
	const brandLab = getItem("brand-lab")!;

	return (
		<>
			<Band rule={false} flush>
				<div className="flex flex-col items-start gap-gap-l pt-gap-3xl pb-gap-2xl">
					<div className="flex w-full flex-col gap-gap-xs">
						<HeroTitle>Designers who ship</HeroTitle>
						<p className="type-text-l max-w-measure-wide px-gap-l text-balance text-neutral-normal">
							We&apos;re the design team at Clueso. This is where we experiment with ideas, build tools we wish existed, and turn the good ones into real product experiences.
						</p>
					</div>
					<div className="flex flex-wrap gap-gap-s px-gap-l">
						<ButtonLink href="#tools" size="medium" icon={<ArrowRightIcon />}>
							See what we&apos;ve made
						</ButtonLink>
						<ButtonLink href="#team" size="medium" variant="outlined" sentiment="neutral">
							Meet the team
						</ButtonLink>
					</div>
				</div>
				<TypeTuner />
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
				<div className="flex flex-col gap-gap-m border-t border-neutral-weak px-gap-l py-gap-l md:flex-row md:items-end md:justify-between">
					<div className="flex max-w-measure flex-col gap-gap-2xs">
						<span className="type-text-s font-code text-neutral-weak">Tool {brandLab.number}</span>
						<h3 className="type-title-m text-neutral-strong">{brandLab.title}</h3>
						<p className="type-text-m text-neutral-normal">
							A playground for patterns, compositions and visual treatments made from Clueso&apos;s brand shapes. To see the thinking behind the shapes, read about the <a href={BRAND_BLOG} target="_blank" rel="noreferrer" className={TEXT_LINK}>Clueso brand</a>.
						</p>
					</div>
					<ButtonLink href={brandLab.href} target="_blank" variant="outlined" sentiment="neutral" icon={<ExternalLinkIcon />} className="hidden shrink-0 pointer-fine:inline-flex">
						Open in a new tab
					</ButtonLink>
				</div>
			</Band>

			<Band id="playground" labelledBy="playground-title" flush>
				<SectionHeading id="playground-title" title="Ideas worth playing with" intro="Not everything makes it into the product. But every good idea deserves a chance to be tried." />
				<Playground />
			</Band>

			<Band id="team" labelledBy="team-title" flush>
				<SectionHeading id="team-title" title="The people making it happen" intro="Different backgrounds, different interests, and a shared tendency to care a little too much about the details." />
				<TeamGrid people={team} />
			</Band>

			<Band id="changelog" labelledBy="changelog-title" flush>
				<SectionHeading id="changelog-title" title="What's new" intro="We ship small and often. Here's the latest.">
					<ButtonLink href="/changelog" variant="outlined" sentiment="neutral" icon={<ArrowRightIcon />}>
						See the changelog
					</ButtonLink>
				</SectionHeading>
				<Timeline entries={changelog.slice(0, 3)} />
			</Band>

			<Band id="join" labelledBy="join-title" flush>
				<div className="flex max-w-measure-wide flex-col items-start gap-gap-s px-gap-l py-gap-3xl">
					<h2 id="join-title" className="type-title-l text-neutral-strong">
						There&apos;s always something we&apos;re figuring out
					</h2>
					<p className="type-text-l max-w-measure text-neutral-normal">If you enjoy making things, questioning how they work, and caring about the details, we&apos;d love to meet you.</p>
					<div className="pt-gap-s">
						<ButtonLink href="https://www.clueso.io/careers" size="medium" icon={<ArrowRightIcon />}>
							Explore open roles
						</ButtonLink>
					</div>
				</div>
			</Band>
		</>
	);
}
