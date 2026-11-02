// What shipped on clueso.design, newest first. Add an entry when something ships: a new tool, a new
// experiment, or a change people will notice. Write it like a note to a friend: what it is, why it
// exists, one or two short sentences. Credit whoever shipped it.
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
		date: "2026-11-02",
		title: "Icon Lab is tool #002",
		body: "Every Clueso icon, website and platform, in one place, with the style directions to try and a dot-matrix pixel set for the web. See each icon on clueso.io with a before and after slider. Can't find one? Create it from the set's parts, or ask for it right there.",
		area: "Icon Lab",
		by: "sneha",
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
