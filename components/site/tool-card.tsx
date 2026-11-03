import Link from "next/link";
import { displayTitle, type RegistryItem } from "@/lib/registry";
import { ShippedBy } from "./shipped-by";
import { ToolSnapshot } from "./tool-snapshot";

const STATUS_LABEL: Record<RegistryItem["status"], string> = {
	beta: "Beta",
	live: "Live",
	exploring: "Exploring",
	testing: "Testing",
	validated: "Validated",
	adopted: "Adopted",
	archived: "Archived",
};

/** A tool on the tools page: a snapshot of it open, then what it is and who shipped it. */
export function ToolCard({ item }: { item: RegistryItem }) {
	return (
		<Link href={item.href} className="state-layer focus-ring group flex flex-col overflow-hidden rounded-large border border-neutral-weak bg-raised-1">
			<ToolSnapshot item={item} className="border-b border-neutral-weak" />
			<div className="flex flex-1 flex-col gap-gap-xs p-gap-l">
				<div className="flex items-center justify-between gap-gap-s">
					<h3 className="type-text-xl text-neutral-strong decoration-1 underline-offset-4 group-hover:underline">{displayTitle(item.title)}</h3>
					<span className="type-text-s rounded-small border border-neutral-normal px-gap-xs py-gap-3xs text-neutral-weak">{STATUS_LABEL[item.status]}</span>
				</div>
				<p className="type-text-m text-neutral-normal">{item.description}</p>
				<ShippedBy who={item.owner} className="mt-auto pt-gap-m" />
			</div>
		</Link>
	);
}
