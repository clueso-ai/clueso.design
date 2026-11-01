import Link from "next/link";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";

// Sections of the homepage for now, plus the changelog. Sections become pages when there's enough to fill them.
const NAV = [
	{ href: "/#tools", label: "Tools" },
	{ href: "/#playground", label: "Playground" },
	{ href: "/#team", label: "Team" },
	{ href: "/changelog", label: "Changelog" },
];

/** Quiet until you point at it: the label steps up from weak to strong. */
const navLink = "focus-ring type-text-s shrink-0 rounded-small px-gap-xs py-gap-2xs text-neutral-weak transition-colors duration-200 ease-out-strong hover:text-neutral-strong";

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
					<ThemeToggle />
				</div>
			</div>
			{/* Small screens: the same links in a second row that scrolls sideways if it has to. */}
			<nav aria-label="Main" className="flex gap-gap-2xs overflow-x-auto border-t border-neutral-weak px-gap-s py-gap-2xs md:hidden">
				{NAV.map((item) => (
					<Link key={item.href} href={item.href} className={navLink}>
						{item.label}
					</Link>
				))}
			</nav>
		</header>
	);
}
