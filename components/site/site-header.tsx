import Link from "next/link";
import { CluesoMark } from "@/lib/design-system/icons";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
	return (
		<header className="sticky top-0 z-40 border-b border-neutral-weak bg-page">
			<div className="mx-auto flex h-16 max-w-page items-center justify-between px-gap-l">
				<Link href="/" className="focus-ring flex items-center gap-gap-xs rounded-small text-neutral-strong">
					<CluesoMark className="size-5" aria-hidden />
					<span className="type-text-m font-medium">clueso.design</span>
				</Link>
				<nav aria-label="Main" className="flex items-center gap-gap-2xs">
					<Link href="/tools" className="state-layer focus-ring type-text-m rounded-small px-gap-s py-gap-xs text-neutral-normal">
						Tools
					</Link>
					<ThemeToggle />
				</nav>
			</div>
		</header>
	);
}
