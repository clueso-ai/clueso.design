// Prints every playground experiment's "I want this in Clueso" count and what voters said they'd use
// it for. Reads the production Upstash Redis, so run it with the same two variables the site uses:
//   UPSTASH_REDIS_REST_URL=… UPSTASH_REDIS_REST_TOKEN=… node scripts/votes.ts
import { publicItems } from "../lib/registry.ts";

const URL = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
if (!URL || !TOKEN) {
	console.error("Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN first.");
	process.exit(1);
}

const slugs = publicItems("experiment").map((item) => item.slug);
const res = await fetch(`${URL}/pipeline`, {
	method: "POST",
	headers: { Authorization: `Bearer ${TOKEN}` },
	body: JSON.stringify(slugs.flatMap((s) => [["SCARD", `votes:${s}`], ["LRANGE", `votes:${s}:notes`, 0, -1]])),
});
const results = (await res.json()) as { result: number | string[] }[];
slugs
	.map((slug, i) => ({ slug, count: results[i * 2].result as number, notes: (results[i * 2 + 1].result as string[]).map((n) => JSON.parse(n) as { note: string; at: string }) }))
	.sort((a, b) => b.count - a.count)
	.forEach(({ slug, count, notes }) => {
		console.log(`\n${slug}: ${count} ${count === 1 ? "vote" : "votes"}, ${notes.length} ${notes.length === 1 ? "note" : "notes"}`);
		for (const n of notes) console.log(`  ${n.at.slice(0, 10)}  ${n.note}`);
	});
