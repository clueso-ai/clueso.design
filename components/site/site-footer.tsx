import { FooterLogo } from "./footer-logo";
import { FooterHearts } from "./footer-hearts";
import { FooterPlay } from "./footer-play";
import { BeatBox } from "./beat-box";
import { Cross } from "./frame";
import { LiveVisitors } from "./live-visitors";

export function SiteFooter() {
	return (
		<footer className="hatch overflow-x-clip border-t border-neutral-weak">
			<div className="relative mx-auto max-w-page bg-page xl:border-x xl:border-neutral-weak">
				<Cross className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 xl:block" />
				<Cross className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 xl:block" />
				<FooterLogo />
				<BeatBox />
				<div className="type-text-s relative flex flex-col gap-gap-xs border-t border-neutral-weak px-gap-l py-gap-m text-neutral-weak sm:flex-row sm:items-center sm:justify-between">
					<Cross className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 xl:block" />
					<Cross className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 xl:block" />
					<div className="flex items-center gap-gap-xs">
						<LiveVisitors up />
						<FooterHearts />
						<FooterPlay />
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
