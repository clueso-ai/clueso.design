import type { Metadata } from "next";
import { ToolCard } from "@/components/site/tool-card";
import { publicItems } from "@/lib/registry";

export const metadata: Metadata = {
	title: "Tools",
	description: "Utilities the Clueso design team builds for itself.",
};

export default function ToolsPage() {
	const tools = publicItems("tool");
	return (
		<section className="mx-auto flex max-w-page flex-col gap-gap-xl px-gap-l pt-gap-2xl pb-gap-3xl">
			<div className="flex flex-col gap-gap-s">
				<h1 className="type-title-xl text-neutral-strong">Tools</h1>
				<p className="type-text-l max-w-measure text-neutral-normal">Utilities we build for ourselves, then share. Each one is credited to the person who made it.</p>
			</div>
			<div className="grid gap-gap-l md:grid-cols-2">
				{tools.map((item) => (
					<ToolCard key={item.slug} item={item} />
				))}
			</div>
		</section>
	);
}
