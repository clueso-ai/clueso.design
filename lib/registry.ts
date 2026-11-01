// Registry of everything on clueso.design. Pages render from this list, so history lives in git.
// Every item needs an owner, status, visibility and theme. Anything not yet public is "internal".

export type ItemType = "tool" | "experiment" | "system";
/** Tools: beta or live. Experiments: exploring, testing, validated, adopted. Anything: archived. */
export type Status = "beta" | "live" | "exploring" | "testing" | "validated" | "adopted" | "archived";
export type Visibility = "public" | "internal";
export type Theme = "lab" | "product" | "marketing";

export interface RegistryItem {
	slug: string;
	/** Display number for tools, e.g. "001". */
	number?: string;
	title: string;
	type: ItemType;
	owner: string;
	status: Status;
	visibility: Visibility;
	theme: Theme;
	/** Internal route, or an external URL. */
	href: string;
	description: string;
	tags: string[];
	/** ISO date of the latest meaningful change. */
	updated: string;
	jigsawComponent?: string;
	pr?: string;
	issue?: string;
	storybook?: string;
}

export const registry: RegistryItem[] = [
	{
		slug: "brand-lab",
		number: "001",
		title: "Brand Lab",
		type: "tool",
		owner: "Ajinkya Gajbhiye",
		status: "live",
		visibility: "public",
		theme: "lab",
		href: "/tools/brand-lab",
		description: "Make posters, patterns and illustrations from Clueso's brand blocks. Layer shaders, shuffle the palette and export stills, video or GIFs.",
		tags: ["brand", "generative", "webgl", "export"],
		updated: "2026-11-01",
	},
	{
		slug: "cluego",
		title: "Cluego",
		type: "experiment",
		owner: "Preshita",
		status: "exploring",
		visibility: "public",
		theme: "lab",
		href: "/playground/cluego",
		description: "A stamp trip across three islands of the Clueso app. Solve each screen, collect its stamp and find the secret ones.",
		tags: ["game", "onboarding", "illustration"],
		updated: "2026-11-01",
	},
];

/** Items a signed-out visitor may see. There is no sign-in yet, so internal items are never listed. */
export function publicItems(type?: ItemType) {
	return registry.filter((item) => item.visibility === "public" && (!type || item.type === type));
}

export function getItem(slug: string) {
	return registry.find((item) => item.slug === slug);
}
