import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { SitePrefsRoot } from "@/components/site/site-prefs-root";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
	return (
		<SitePrefsRoot>
			<a href="#main" className="focus-ring type-text-s sr-only rounded-small bg-raised-2 px-gap-s py-gap-xs focus:not-sr-only focus:fixed focus:top-gap-s focus:left-gap-s focus:z-50">
				Skip to content
			</a>
			<SiteHeader />
			<main id="main" className="flex-1">
				{children}
			</main>
			<SiteFooter />
		</SitePrefsRoot>
	);
}
