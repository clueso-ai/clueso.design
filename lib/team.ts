// The design team, shown on the homepage. Everyone's Clueso cursor is pink (one team, one colour).
// Each person has a looping portrait: public/team/<slug>.mp4 (square, 640px, no sound) with <slug>.jpg as its poster.
// The portraits are drawn on #161616, so their tiles keep that backdrop in light mode too.
export interface Person {
	slug: string;
	name: string;
	title: string;
	/** A colour id from CURSOR_COLORS in lib/site-prefs.ts. */
	cursor: string;
	/** Looping portrait video and its poster, under public/. */
	video?: string;
	poster?: string;
}

const portrait = (slug: string) => ({ video: `/team/${slug}.mp4`, poster: `/team/${slug}.jpg` });

export const team: Person[] = [
	{ slug: "kamal", name: "Kamal", title: "Visual designer", cursor: "pink", ...portrait("kamal") },
	{ slug: "preshita", name: "Preshita", title: "Visual designer", cursor: "pink", ...portrait("preshita") },
	{ slug: "rutu", name: "Rutu", title: "Motion designer", cursor: "pink", ...portrait("rutu") },
	{ slug: "sneha", name: "Sneha", title: "Brand designer", cursor: "pink", ...portrait("sneha") },
	{ slug: "ajinkya", name: "Ajinkya", title: "Product designer", cursor: "pink", ...portrait("ajinkya") },
];
