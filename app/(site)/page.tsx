import { LinkButton } from "@/components/site/link-button";
import { LiveHero } from "@/components/site/live-hero";
import { ToolCard } from "@/components/site/tool-card";
import { publicItems } from "@/lib/registry";
import { team } from "@/lib/team";

const LOOP = [
	{ step: "01", title: "Explore", body: "Prototype new interactions and tools. Real code, running in the browser, not pictures of ideas." },
	{ step: "02", title: "Systematize", body: "Turn what works into patterns. One token core, themed for product, marketing and the lab." },
	{ step: "03", title: "Ship", body: "Move validated work into Clueso. What we learn in production feeds the next round." },
];

export default function Home() {
	const tools = publicItems("tool");

	return (
		<>
			<section className="mx-auto flex max-w-page flex-col gap-gap-2xl px-gap-l pt-gap-2xl pb-gap-3xl">
				<div className="flex max-w-measure-wide flex-col gap-gap-l">
					<p className="type-text-s font-code text-neutral-weak">The Clueso design team&apos;s workshop</p>
					<h1 className="type-title-xl text-balance text-neutral-strong">Explore freely. Validate together. Ship what works.</h1>
					<p className="type-text-l max-w-measure text-pretty text-neutral-normal">
						This is where Clueso&apos;s designers build the tools we use, test interactions before they reach the product, and grow the system they come from.
					</p>
					<div className="flex flex-wrap gap-gap-s">
						<LinkButton href="/tools/brand-lab" arrow>
							Open Brand Lab
						</LinkButton>
						<LinkButton href="/tools" variant="quiet">
							All tools
						</LinkButton>
					</div>
				</div>
				<LiveHero />
			</section>

			<section aria-labelledby="loop" className="border-t border-neutral-weak">
				<div className="mx-auto flex max-w-page flex-col gap-gap-xl px-gap-l py-gap-3xl">
					<h2 id="loop" className="type-title-l max-w-measure text-balance text-neutral-strong">
						One loop, from idea to product.
					</h2>
					<ol className="grid gap-gap-l md:grid-cols-3">
						{LOOP.map((item) => (
							<li key={item.step} className="flex flex-col gap-gap-xs border-t border-neutral-normal pt-gap-m">
								<span className="type-text-s font-code text-neutral-weak">{item.step}</span>
								<h3 className="type-title-s text-neutral-strong">{item.title}</h3>
								<p className="type-text-m text-neutral-normal">{item.body}</p>
							</li>
						))}
					</ol>
				</div>
			</section>

			<section aria-labelledby="tools" className="border-t border-neutral-weak">
				<div className="mx-auto flex max-w-page flex-col gap-gap-xl px-gap-l py-gap-3xl">
					<div className="flex flex-col gap-gap-xs">
						<h2 id="tools" className="type-title-l text-neutral-strong">
							Tools
						</h2>
						<p className="type-text-l max-w-measure text-neutral-normal">Utilities we build for ourselves, then share. Each one is credited to the person who made it.</p>
					</div>
					<div className="grid gap-gap-l md:grid-cols-2">
						{tools.map((item) => (
							<ToolCard key={item.slug} item={item} />
						))}
					</div>
				</div>
			</section>

			<section aria-labelledby="team" className="border-t border-neutral-weak">
				<div className="mx-auto flex max-w-page flex-col gap-gap-xl px-gap-l py-gap-3xl">
					<div className="flex flex-col gap-gap-s">
						<h2 id="team" className="type-title-l max-w-measure-wide text-balance text-neutral-strong">
							Five designers who build with code.
						</h2>
						<p className="type-text-l max-w-measure text-pretty text-neutral-normal">
							Motion, brand and visual design, working with AI coding tools. We make the things we need, and when they work, we ship them into Clueso.
						</p>
					</div>
					<ul className="grid grid-cols-2 gap-gap-l sm:grid-cols-3 lg:grid-cols-5">
						{team.map((person) => (
							<li key={person.name} className="flex flex-col gap-gap-3xs border-t border-neutral-normal pt-gap-m">
								<span className="type-title-s text-neutral-strong">{person.name}</span>
								<span className="type-text-s text-neutral-weak">{person.role}</span>
							</li>
						))}
					</ul>
				</div>
			</section>
		</>
	);
}
