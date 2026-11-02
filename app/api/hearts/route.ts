// The footer's hearts: how many people like the site. POST { id, hearted } hearts the site from a
// tab, or takes it back: id is the tab's presence connection (/api/presence). Each browser counts
// once, however many tabs it has open. A change goes out to every tab over the presence stream,
// with who made it, so that browser's other tabs follow along.

import { setHearted } from "@/lib/hearts-store";
import { broadcast, type Conn, conns } from "@/lib/presence-server";

/** A tab's allowance: BURST changes at once, refilling at RATE a second. Enough for anyone toggling; not for a script. */
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

export async function POST(req: Request) {
	const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
	const conn = typeof body?.id === "string" ? conns.get(body.id) : undefined;
	if (!body || !conn) return new Response(null, { status: 404 });
	if (typeof body.hearted !== "boolean") return new Response(null, { status: 400 });
	if (!take(conn)) return new Response(null, { status: 429 });

	try {
		const { total, v, changed } = await setHearted(conn.visitor, body.hearted, { name: conn.name, page: conn.page });
		if (changed) broadcast({ t: "hearts", total, v, who: conn.who, hearted: body.hearted });
		return Response.json({ total, v, hearted: body.hearted });
	} catch (err) {
		console.error("hearts: couldn't save", err);
		return new Response(null, { status: 503 });
	}
}
