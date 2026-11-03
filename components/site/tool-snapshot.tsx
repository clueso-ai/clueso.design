import Image from "next/image";
import type { RegistryItem } from "@/lib/registry";

// A still of a tool (its registry `preview`, a 1440×900 screenshot), for the tools page's cards and
// for featured tools that don't run live on the homepage. Without one, an empty frame keeps the
// layout steady.

export function ToolSnapshot({ item, sizes = "(min-width: 768px) 50vw, 100vw", className = "" }: { item: RegistryItem; sizes?: string; className?: string }) {
	return (
		<div className={`relative aspect-16/10 overflow-hidden bg-sunken-1 ${className}`}>
			{item.preview && <Image src={item.preview} alt={`${item.title}, as it looks open`} fill sizes={sizes} className="object-cover object-top" />}
		</div>
	);
}
