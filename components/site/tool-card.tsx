import Link from "next/link";
import type { RegistryItem } from "@/lib/registry";
import { ArrowRightIcon } from "@/lib/design-system/icons";

const STATUS_LABEL: Record<RegistryItem["status"], string> = {
	beta: "Beta",
	live: "Live",
	exploring: "Exploring",
	testing: "Testing",
	validated: "Validated",
	adopted: "Adopted",
	archived: "Archived",
};

export function ToolCard({ item }: { item: RegistryItem }) {
	return (
		<Link href={item.href} className="state-layer focus-ring group flex flex-col gap-gap-m rounded-large border border-neutral-weak bg-raised-1 p-gap-l">
			<div className="type-text-s flex items-center justify-between text-neutral-weak">
				<span className="font-code">Tool {item.number}</span>
				<span className="rounded-small border border-neutral-normal px-gap-xs py-gap-3xs">{STATUS_LABEL[item.status]}</span>
			</div>
			<div className="flex flex-col gap-gap-xs">
				<h3 className="type-title-m text-neutral-strong">{item.title}</h3>
				<p className="type-text-m text-neutral-normal">{item.description}</p>
			</div>
			<div className="type-text-s mt-auto flex items-center justify-between text-neutral-weak">
				<span>Made by {item.owner}</span>
				<ArrowRightIcon className="size-4 text-neutral-strong transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
			</div>
		</Link>
	);
}
