// What changed on clueso.design, newest first. Add an entry when something ships: a new tool, a
// new section, or a change people will notice. Keep it short and plain.
export interface ChangelogEntry {
	/** ISO date. */
	date: string;
	title: string;
	/** One or two sentences. */
	body: string;
	/** What it touched, e.g. "Brand Lab", "Site". */
	area: string;
}

export const changelog: ChangelogEntry[] = [
	{
		date: "2026-11-01",
		title: "Make the site yours",
		body: "Put your name and favourite colour on a Clueso cursor in the hero. Fonts, weights and the type scale for the whole site live behind Customize website, bottom right.",
		area: "Site",
	},
	{
		date: "2026-11-01",
		title: "Meet the team, and our logo",
		body: "Bring your cursor into the team section and everyone comes over to say hi. The footer has our logo drawn as points you can pull.",
		area: "Site",
	},
	{
		date: "2026-11-01",
		title: "Brand Lab moves in",
		body: "Tool 001 now runs at clueso.design/tools/brand-lab. You can also play with it live on the homepage.",
		area: "Brand Lab",
	},
	{
		date: "2026-11-01",
		title: "clueso.design is live",
		body: "A home for what the Clueso design team makes: tools, experiments and the systems behind our product and brand.",
		area: "Site",
	},
];

export const formatDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
