import type { Metadata } from "next";
import { Band, SectionHeading } from "@/components/site/frame";
import { ToolCard } from "@/components/site/tool-card";
import { publicItems } from "@/lib/registry";

export const metadata: Metadata = {
	title: "Tools",
	description: "Small tools the Clueso design team builds for itself.",
};

export default function ToolsPage() {
	// Newest first, like the homepage's featured tools.
	const tools = publicItems("tool").toSorted((a, b) => b.updated.localeCompare(a.updated));
	return (
		<Band rule={false} labelledBy="tools-title">
			<SectionHeading id="tools-title" title="Built because we needed them" intro="We make small tools to solve the little problems that slow us down. Some are useful. Some are just fun. A few become indispensable." />
			<div className="grid gap-gap-l border-t border-neutral-weak p-gap-l md:grid-cols-2">
				{tools.map((item) => (
					<ToolCard key={item.slug} item={item} />
				))}
			</div>
		</Band>
	);
}
