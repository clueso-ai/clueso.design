// "I want this in Clueso" votes on playground experiments: how many people would like each one in the
// product. Each browser votes once per experiment, and can take it back. They live in the same
// Upstash Redis database as the footer's hearts (lib/hearts-store.ts), with the same two variables.
// Keys:
//   votes:<slug>               a set of the browsers that want it; its size is the count
//   votes:browser:<hash>       a hash per browser: the cursor name it had set and when it last voted
//   votes:<slug>:notes         what voters said they'd use it for, newest first, the latest NOTES_KEPT
//                              kept: { note, at, browser } as JSON. Never shown on the site; the team
//                              reads them with scripts/votes.ts.
// Browsers are keyed by a hash of their visitor id, never the id itself. Without the variables (local
// dev) votes are kept in memory and a restart starts from zero.

const URL = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const remote = Boolean(URL && TOKEN);

/** Runs Redis commands in one round trip, over Upstash's REST pipeline. */
async function pipeline<T>(commands: (string | number)[][]): Promise<T[]> {
	const res = await fetch(`${URL}/pipeline`, { method: "POST", headers: { Authorization: `Bearer ${TOKEN}` }, body: JSON.stringify(commands), cache: "no-store" });
	const body = (await res.json()) as { result?: T; error?: string }[];
	if (!res.ok) throw new Error(`Upstash: ${res.status}`);
	return body.map((r) => {
		if (r.error) throw new Error(`Upstash: ${r.error}`);
		return r.result as T;
	});
}

// On globalThis so dev reloads keep them.
const g = globalThis as { votesLocal?: Map<string, Set<string>> };
const local = (g.votesLocal ??= new Map());
const setFor = (slug: string) => local.get(slug) ?? local.set(slug, new Set()).get(slug)!;

async function browserHash(visitor: string) {
	const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(visitor));
	return [...new Uint8Array(hash).slice(0, 16)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Each experiment's count, and which of them this browser wants. */
export async function readVotes(slugs: string[], visitor: string | null): Promise<{ counts: Record<string, number>; mine: string[] }> {
	const hash = visitor ? await browserHash(visitor) : null;
	if (!remote) {
		return { counts: Object.fromEntries(slugs.map((s) => [s, setFor(s).size])), mine: hash ? slugs.filter((s) => setFor(s).has(hash)) : [] };
	}
	const results = await pipeline<number>([...slugs.map((s) => ["SCARD", `votes:${s}`]), ...(hash ? slugs.map((s) => ["SISMEMBER", `votes:${s}`, hash]) : [])]);
	return {
		counts: Object.fromEntries(slugs.map((s, i) => [s, Number(results[i] ?? 0)])),
		mine: hash ? slugs.filter((_, i) => results[slugs.length + i] === 1) : [],
	};
}

/** Votes for an experiment from one browser, or takes it back. Returns the new count. */
export async function setVote(visitor: string, slug: string, value: boolean, from: { name: string }): Promise<number> {
	const hash = await browserHash(visitor);
	if (!remote) {
		const set = setFor(slug);
		if (value) set.add(hash);
		else set.delete(hash);
		return set.size;
	}
	const [, count] = await pipeline<number>([
		[value ? "SADD" : "SREM", `votes:${slug}`, hash],
		["SCARD", `votes:${slug}`],
		["HSET", `votes:browser:${hash}`, "name", from.name, "lastAt", new Date().toISOString()],
	]);
	return Number(count);
}

/** How many notes each experiment keeps, newest first, and the longest a note can be. */
const NOTES_KEPT = 500;
export const NOTE_MAX = 280;

/** Saves what a voter would use an experiment for. */
export async function addNote(visitor: string, slug: string, note: string) {
	const hash = await browserHash(visitor);
	const entry = JSON.stringify({ note: note.slice(0, NOTE_MAX), at: new Date().toISOString(), browser: hash });
	if (!remote) {
		const g2 = globalThis as { votesNotes?: Map<string, string[]> };
		const notes = (g2.votesNotes ??= new Map());
		notes.set(slug, [entry, ...(notes.get(slug) ?? [])].slice(0, NOTES_KEPT));
		return;
	}
	await pipeline([
		["LPUSH", `votes:${slug}:notes`, entry],
		["LTRIM", `votes:${slug}:notes`, 0, NOTES_KEPT - 1],
	]);
}
