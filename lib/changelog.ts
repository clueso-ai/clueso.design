// What shipped on clueso.design, newest first. Every change that ships gets an entry, however small:
// a new tool, a fix, a bit of polish. Write what it means for the people using the site, like a note
// to a friend, in one or two short sentences. No "Fix:" or "Feature:" labels. Credit whoever shipped it.
export interface ChangelogEntry {
	/** ISO date. */
	date: string;
	title: string;
	/** One or two sentences. */
	body: string;
	/** What it touched, e.g. "Brand Lab", "Site". */
	area: string;
	/** Who shipped it: a team member's slug (lib/team.ts). */
	by: string;
}

export const changelog: ChangelogEntry[] = [
	{
		date: "2026-11-03",
		title: "Try every tool right from the homepage",
		body: "Each featured tool now runs live on the homepage, so you can click in and play with Icon Lab too. The playground has its own page, laid out like the tools page, and the homepage shows a still of each experiment.",
		area: "Site",
		by: "ajinkya",
	},
	{
		date: "2026-11-03",
		title: "A proper home for our tools",
		body: "Tools on the homepage now sit in tabs, newest first, so each one gets its own preview. The Tools link takes you to the full list, where every tool shows how it looks open.",
		area: "Site",
		by: "ajinkya",
	},
	{
		date: "2026-11-03",
		title: "Your hearts stay counted",
		body: "The heart count in the footer used to reset every time we shipped something. Now it's saved, so every heart you leave sticks.",
		area: "Site",
		by: "ajinkya",
	},
	{
		date: "2026-11-02",
		title: "Icon Lab is tool #002",
		body: "Every Clueso icon, website and platform, in one place, with the style directions to try and a dot-matrix pixel set for the web. See each icon on clueso.io with a before and after slider. Can't find one? Create it from the set's parts, or ask for it right there.",
		area: "Icon Lab",
		by: "sneha",
	},
	{
		date: "2026-11-02",
		title: "The playground works on phones",
		body: "Playground cards used to crash phones. They now show a still on touch screens, and Customize has bigger buttons that are easier to tap.",
		area: "Site",
		by: "ajinkya",
	},
	{
		date: "2026-11-02",
		title: "Leave us a heart",
		body: "Like the site? Press the heart in the footer. Everyone sees the count change live, and you can take it back.",
		area: "Site",
		by: "ajinkya",
	},
	{
		date: "2026-11-02",
		title: "Inspect any text",
		body: "Select text anywhere on the site and press Inspect to see its font, size, line height and tracking.",
		area: "Site",
		by: "ajinkya",
	},
	{
		date: "2026-11-01",
		title: "You're not alone here",
		body: "Give your cursor a name and colour when you arrive. The header shows who else is on the site, and you can see their cursors move.",
		area: "Site",
		by: "ajinkya",
	},
	{
		date: "2026-11-01",
		title: "Brand Lab and Cluego are live",
		body: "Both now live on clueso.design. Open them, play with them, break them. That's what they're here for.",
		area: "Site",
		by: "ajinkya",
	},
	{
		date: "2026-11-01",
		title: "One shell for every tool",
		body: "Every tool now starts inside the same shell: canvas, panels, layers and export come ready. So you spend your time on what the tool does, not on building its UI. Brand Lab moved in first.",
		area: "Tools",
		by: "ajinkya",
	},
	{
		date: "2026-11-01",
		title: "Turns out we own clueso.design",
		body: "So we built Brand Lab on it, a place to explore visual directions for the Clueso brand. The bigger idea: designers making tools for each other, with AI doing the heavy lifting.",
		area: "Brand Lab",
		by: "ajinkya",
	},
	{
		date: "2026-10-31",
		title: "Cluego, built on a Saturday",
		body: "A game about Clueso's features. Hop across three islands, solve each screen and collect the stamps. A few are hidden.",
		area: "Cluego",
		by: "preshita",
	},
];

export const formatDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
