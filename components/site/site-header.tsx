import Link from "next/link";
import { LiveVisitors } from "./live-visitors";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";
import { ThemeToggle } from "./theme-toggle";

// Sections of the homepage for now, plus the changelog. Sections become pages when there's enough to fill them.
const NAV = [
	{ href: "/#tools", label: "Tools" },
	{ href: "/#playground", label: "Playground" },
	{ href: "/#team", label: "Team" },
	{ href: "/changelog", label: "Changelog" },
];

/** Normal until you point at it, then strong. */
const navLink = "focus-ring type-text-m shrink-0 rounded-small px-gap-xs py-gap-2xs text-neutral-normal transition-colors duration-200 ease-out-strong hover:text-neutral-strong";

export function SiteHeader() {
	return (
		<header className="hatch sticky top-0 z-40 border-b border-neutral-weak bg-page">
			<div className="mx-auto flex h-16 max-w-page items-center justify-between gap-gap-m bg-page px-gap-l xl:border-x xl:border-neutral-weak">
				<Link href="/" aria-label="clueso.design home" className="focus-ring shrink-0 rounded-small">
					<Logo />
				</Link>
				<div className="flex items-center gap-gap-2xs">
					<nav aria-label="Main" className="hidden items-center gap-gap-2xs md:flex">
						{NAV.map((item) => (
							<Link key={item.href} href={item.href} className={navLink}>
								{item.label}
							</Link>
						))}
					</nav>
					<LiveVisitors />
					<ThemeToggle />
					<MobileNav items={NAV} />
				</div>
			</div>
		</header>
	);
}
