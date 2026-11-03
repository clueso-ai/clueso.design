"use client";

import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/lib/design-system";

// The homepage's featured tools: a tab for each, newest first, with the chosen tool's preview
// inline and a few lines about it underneath. The page picks which tools and builds each preview
// and blurb, so a tool can bring its own (Brand Lab runs live). Only the open tab's preview is
// mounted, so a live tool loads only when someone picks it.

export interface FeaturedTool {
	slug: string;
	/** The tab's label. */
	title: string;
	preview: ReactNode;
	details: ReactNode;
}

export function FeaturedTools({ tools }: { tools: FeaturedTool[] }) {
	if (!tools.length) return null;
	return (
		<Tabs defaultValue={tools[0].slug} className="border-t border-neutral-weak">
			<div className="overflow-x-auto px-gap-l pt-gap-s">
				<TabsList aria-label="Featured tools" size="medium">
					{tools.map((t) => (
						<TabsTrigger key={t.slug} value={t.slug}>
							{t.title}
						</TabsTrigger>
					))}
				</TabsList>
			</div>
			{tools.map((t) => (
				<TabsContent key={t.slug} value={t.slug} className="mt-0">
					<div className="border-t border-neutral-weak">{t.preview}</div>
					<div className="border-t border-neutral-weak px-gap-l py-gap-l">{t.details}</div>
				</TabsContent>
			))}
		</Tabs>
	);
}
