import Image from "next/image";
import type { RegistryItem } from "@/lib/registry";

// A still of a tool or experiment (its registry `preview`), for the tools and playground pages'
// cards, the homepage's playground, and tools on touch screens. Without one, an empty frame keeps
// the layout steady.

export function ToolSnapshot({ item, sizes = "(min-width: 768px) 50vw, 100vw", aspect = "aspect-16/10", className = "" }: { item: RegistryItem; sizes?: string; aspect?: string; className?: string }) {
	return (
		<div className={`relative ${aspect} overflow-hidden bg-sunken-1 ${className}`}>
			{item.preview && <Image src={item.preview} alt={`${item.title}, as it looks open`} fill sizes={sizes} className="object-cover object-top" />}
		</div>
	);
}
