import Link from "next/link";
import { publicItems } from "@/lib/registry";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";
import { ThemeToggle } from "./theme-toggle";
import { TuckingHeader } from "./tucking-header";

// Pages, plus the team section of the homepage. Sections become pages when there's enough to fill them.
// Tools and the playground show how many things are inside, as a small number after the name.
const NAV = [
	// Tools and the playground have their own pages; the homepage only features some of each.
	{ href: "/tools", label: "Tools", count: publicItems("tool").length },
	{ href: "/playground", label: "Playground", count: publicItems("experiment").length },
	{ href: "/#team", label: "Team" },
	{ href: "/changelog", label: "Changelog" },
];

/** Normal until you point at it, then strong. */
const navLink = "focus-ring type-text-m shrink-0 rounded-small px-gap-xs py-gap-2xs text-neutral-normal transition-colors duration-200 ease-out-strong hover:text-neutral-strong";

export function SiteHeader() {
	return (
		<TuckingHeader className="hatch sticky top-0 z-40 border-b border-neutral-weak bg-page">
			<div className="mx-auto flex h-16 max-w-page items-center justify-between gap-gap-m bg-page px-gap-l xl:border-x xl:border-neutral-weak">
				<Link href="/" aria-label="clueso.design home" className="focus-ring flex shrink-0 rounded-small">
					<Logo className="site-logo" />
				</Link>
				<div className="flex items-center gap-gap-s">
					<nav aria-label="Main" className="hidden items-center gap-gap-s md:flex">
						{NAV.map((item) => (
							<Link key={item.href} href={item.href} className={navLink} aria-label={item.count ? `${item.label}, ${item.count}` : undefined}>
								{item.label}
								{item.count ? <sup className="type-text-xs ml-gap-3xs font-code text-neutral-weak">{item.count}</sup> : null}
							</Link>
						))}
					</nav>
					<ThemeToggle />
					<MobileNav items={NAV} />
				</div>
			</div>
		</TuckingHeader>
	);
}
