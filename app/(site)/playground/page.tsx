import type { Metadata } from "next";
import { Band, SectionHeading } from "@/components/site/frame";
import { ToolCard } from "@/components/site/tool-card";
import { publicItems } from "@/lib/registry";

export const metadata: Metadata = {
	title: "Playground",
	description: "Quick experiments from the Clueso design team.",
};

// Each experiment itself is a static export at /playground/<slug> (next.config.ts).
export default function PlaygroundPage() {
	// Newest first, like the tools page.
	const experiments = publicItems("experiment").toSorted((a, b) => b.updated.localeCompare(a.updated));
	return (
		<Band rule={false} labelledBy="playground-title">
			<SectionHeading id="playground-title" title="Ideas we're playing with" intro="Quick experiments we make to try an idea out. Some grow into tools. Most are just for fun." />
			<div className="grid gap-gap-l border-t border-neutral-weak p-gap-l md:grid-cols-2">
				{experiments.map((item) => (
					<ToolCard key={item.slug} item={item} />
				))}
			</div>
		</Band>
	);
}
