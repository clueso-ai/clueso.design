// Who's on the site right now, for the header's live count and other visitors' cursors.
// GET opens a server-sent event stream: one per open tab. POST updates that tab's cursor, and what
// it's pulling on the footer logo, so visitors can play tug of war with its letters.
// Everything lives in this server's memory, so nothing is stored and a restart starts from zero.
// The one exception is the hearts sent on connect, which lib/hearts-store.ts keeps.
// Production runs one ECS task (deploy/cloudformation.yml): with more, each task would only see
// its own visitors, and this would need a shared channel.

import { heartsTotal, isHearted } from "@/lib/hearts-store";
import { broadcast, type Conn, conns, count, type Cursor, type Tug } from "@/lib/presence-server";

/** Enough for a busy day on a design team's site; bounds memory if something floods the route. */
const MAX_CONNS = 500;
/** Keeps the stream open through the ALB's and CloudFront's 60 second idle timeouts. */
const PING_MS = 20_000;
const VISITOR = /^[a-z0-9-]{8,64}$/i;
const COLOR = /^(?:[a-z]{2,12}|#[0-9a-f]{6}|oklch\([\d.]+ [\d.]+ [\d.]+\))$/i;
/** A logo handle: the letter, then its anchors (see handleKey in footer-logo.tsx). */
const HANDLE = /^[a-z]{1,8}\/[\d:|-]{1,120}$/i;
/** Most handles one pull can hold: every handle on the logo, with room to spare. */
const MAX_HANDLES = 120;

const pub = ({ id, who, page, name, color, tilt, x, y, tug }: Conn): Cursor => ({ id, who, page, name, color, tilt, x, y, tug });

// Tabs of one person share a "who", so the visitor list shows people, not tabs. It's a salted hash
// of their browser's id, never the id itself, and the salt changes with every server start.
const SALT = crypto.randomUUID();
async function whoFor(visitor: string) {
	const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(SALT + visitor));
	return [...new Uint8Array(hash).slice(0, 8)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const num = (v: unknown, min: number, max: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : null);
const page = (v: unknown) => (typeof v === "string" && v.startsWith("/") ? v.slice(0, 200) : "/");
const units = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.min(1000, Math.max(-1000, Math.round(v * 10) / 10)) : 0);
function tug(v: unknown): Tug | null {
	if (!v || typeof v !== "object") return null;
	const { keys, x, y, hx, hy } = v as Record<string, unknown>;
	if (!Array.isArray(keys) || !keys.length || keys.length > MAX_HANDLES || !keys.every((k) => typeof k === "string" && HANDLE.test(k))) return null;
	return { keys, x: units(x), y: units(y), hx: units(hx), hy: units(hy) };
}

export async function GET(req: Request) {
	const visitor = new URL(req.url).searchParams.get("visitor") ?? "";
	if (!VISITOR.test(visitor)) return new Response("Bad visitor id.", { status: 400 });
	if (conns.size >= MAX_CONNS) return new Response("Too many visitors right now.", { status: 503 });

	const id = crypto.randomUUID();
	const [who, hearts, hearted] = await Promise.all([whoFor(visitor), heartsTotal(), isHearted(visitor)]);
	const encoder = new TextEncoder();
	let ping: ReturnType<typeof setInterval> | undefined;

	const close = () => {
		clearInterval(ping);
		if (!conns.delete(id)) return;
		broadcast({ t: "gone", id });
		broadcast({ t: "count", count: count() });
	};

	const stream = new ReadableStream({
		start(controller) {
			const write = (chunk: string) => {
				try {
					controller.enqueue(encoder.encode(chunk));
				} catch {
					close();
				}
			};
			const conn: Conn = { id, who, visitor, seq: 0, page: page(new URL(req.url).searchParams.get("page")), name: "", color: "ink", tilt: 0, x: null, y: null, tug: null, send: (msg) => write(`data: ${JSON.stringify(msg)}\n\n`) };
			conns.set(id, conn);
			conn.send({ t: "hello", you: id, me: who, count: count(), hearts: hearts.total, heartsV: hearts.v, hearted, cursors: [...conns.values()].filter((c) => c.id !== id).map(pub) });
			broadcast({ t: "count", count: count() }, id);
			ping = setInterval(() => write(": ping\n\n"), PING_MS);
			req.signal.addEventListener("abort", () => {
				close();
				try {
					controller.close();
				} catch {}
			});
		},
		cancel: close,
	});

	return new Response(stream, {
		headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" },
	});
}

export async function POST(req: Request) {
	const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
	const conn = typeof body?.id === "string" ? conns.get(body.id) : undefined;
	if (!body || !conn) return new Response(null, { status: 404 });
	// Requests can overtake each other: a late one never moves the cursor back.
	const seq = num(body.seq, 0, Number.MAX_SAFE_INTEGER) ?? 0;
	if (seq <= conn.seq) return new Response(null, { status: 204 });
	conn.seq = seq;

	if ("page" in body) conn.page = page(body.page);
	if (typeof body.name === "string") conn.name = body.name.trim().slice(0, 32);
	if (typeof body.color === "string" && COLOR.test(body.color)) conn.color = body.color;
	if ("tilt" in body) conn.tilt = num(body.tilt, -180, 180) ?? 0;
	if ("x" in body) conn.x = num(body.x, -5000, 5000);
	if ("y" in body) conn.y = num(body.y, 0, 500_000);
	if (conn.x === null || conn.y === null) conn.x = conn.y = null;
	if ("tug" in body) conn.tug = tug(body.tug);

	broadcast({ t: "cursor", c: pub(conn) }, conn.id);
	return new Response(null, { status: 204 });
}
