// "I want this in Clueso" votes on playground experiments (lib/votes-store.ts).
// GET ?visitor=<id> returns every experiment's count and which ones this browser wants.
// POST { id, slug, voted } votes from a tab, or takes it back: id is the tab's presence connection
// (/api/presence), so a vote needs a live visit, and each browser counts once.
// POST { id, slug, note } adds what the voter would use it for (kept private; see lib/votes-store.ts).

import { conns, type Conn } from "@/lib/presence-server";
import { publicItems } from "@/lib/registry";
import { addNote, NOTE_MAX, readVotes, setVote } from "@/lib/votes-store";

const VISITOR = /^[a-z0-9-]{8,64}$/i;
const slugs = () => publicItems("experiment").map((item) => item.slug);

/** A tab's allowance, like the hearts': BURST changes at once, refilling at RATE a second. */
const BURST = 10;
const RATE = 1;
const allowance = new WeakMap<Conn, { left: number; at: number }>();
function take(conn: Conn) {
	const now = Date.now();
	const a = allowance.get(conn) ?? { left: BURST, at: now };
	a.left = Math.min(BURST, a.left + ((now - a.at) / 1000) * RATE);
	a.at = now;
	allowance.set(conn, a);
	if (a.left < 1) return false;
	a.left -= 1;
	return true;
}

export async function GET(req: Request) {
	const visitor = new URL(req.url).searchParams.get("visitor");
	try {
		return Response.json(await readVotes(slugs(), visitor && VISITOR.test(visitor) ? visitor : null), { headers: { "Cache-Control": "no-store" } });
	} catch (err) {
		console.error("votes: couldn't read", err);
		return new Response(null, { status: 503 });
	}
}

export async function POST(req: Request) {
	const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
	const conn = typeof body?.id === "string" ? conns.get(body.id) : undefined;
	if (!body || !conn) return new Response(null, { status: 404 });
	if (typeof body.slug !== "string" || !slugs().includes(body.slug)) return new Response(null, { status: 400 });
	if (typeof body.note === "string") {
		const note = body.note.trim();
		if (!note || note.length > NOTE_MAX) return new Response(null, { status: 400 });
		if (!take(conn)) return new Response(null, { status: 429 });
		try {
			await addNote(conn.visitor, body.slug, note);
			return new Response(null, { status: 204 });
		} catch (err) {
			console.error("votes: couldn't save a note", err);
			return new Response(null, { status: 503 });
		}
	}
	if (typeof body.voted !== "boolean") return new Response(null, { status: 400 });
	if (!take(conn)) return new Response(null, { status: 429 });
	try {
		const count = await setVote(conn.visitor, body.slug, body.voted, { name: conn.name });
		return Response.json({ slug: body.slug, count, voted: body.voted });
	} catch (err) {
		console.error("votes: couldn't save", err);
		return new Response(null, { status: 503 });
	}
}
