import type { Metadata } from "next";
import { Band, SectionHeading } from "@/components/site/frame";
import { Timeline } from "@/components/site/timeline";
import { changelog } from "@/lib/changelog";

export const metadata: Metadata = {
	title: "Changelog",
	description: "What's new on clueso.design.",
};

export default function ChangelogPage() {
	return (
		<Band rule={false} labelledBy="changelog-title" flush>
			<SectionHeading id="changelog-title" title="Changelog" />
			<Timeline entries={changelog} headingLevel="h2" />
		</Band>
	);
}
