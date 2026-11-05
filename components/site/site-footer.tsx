import { FooterLogo } from "./footer-logo";
import { FooterHearts } from "./footer-hearts";
import { FooterPlay } from "./footer-play";
import { BeatBox } from "./beat-box";
import { Cross } from "./frame";
import { HomeOnly } from "./home-only";
import { LiveVisitors } from "./live-visitors";

// The playable logo and its beat box are the homepage's sign-off. Every other page ends on the
// bottom bar alone: who's online, the hearts, and who made it.
export function SiteFooter() {
	return (
		<footer className="hatch overflow-x-clip border-t border-neutral-weak">
			<div className="relative mx-auto max-w-page bg-page xl:border-x xl:border-neutral-weak">
				<Cross className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 xl:block" />
				<Cross className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 xl:block" />
				<HomeOnly>
					<div className="border-b border-neutral-weak">
						<FooterLogo />
						<BeatBox />
					</div>
				</HomeOnly>
				<div className="type-text-s relative flex flex-col gap-gap-xs px-gap-l py-gap-m text-neutral-weak sm:flex-row sm:items-center sm:justify-between">
					<Cross className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 xl:block" />
					<Cross className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 xl:block" />
					<div className="flex items-center gap-gap-xs">
						<LiveVisitors up />
						<FooterHearts />
						<HomeOnly>
							<FooterPlay />
						</HomeOnly>
					</div>
					<p>
						Made by the people who make{" "}
						<a href="https://clueso.io" className="focus-ring rounded-tiny text-neutral-normal underline decoration-neutral-weak underline-offset-4 transition-[color,text-decoration-color] duration-200 ease-out-strong hover:text-brand-normal hover:decoration-current">
							Clueso
						</a>
						.
					</p>
				</div>
			</div>
		</footer>
	);
}
