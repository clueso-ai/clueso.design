// The design team, shown on the homepage. People pages (content/people) come later.
export interface Person {
	name: string;
	role: string;
}

export const team: Person[] = [
	{ name: "Ajinkya", role: "Head of design" },
	{ name: "Sneha", role: "Brand designer" },
	{ name: "Rutuparna", role: "Motion designer" },
	{ name: "Kamal", role: "Visual designer" },
	{ name: "Preshita", role: "Visual designer" },
];
