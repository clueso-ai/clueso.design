import { NextResponse } from "next/server";

// The homepage's "Say hi" form. Messages go to the design team's Slack through an incoming
// webhook in HELLO_WEBHOOK_URL (set in Vercel, never committed). Nothing is stored here.

const LIMITS = { name: 60, email: 120, message: 2000 };

export async function POST(req: Request) {
	const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
	const field = (k: keyof typeof LIMITS) => (typeof body?.[k] === "string" ? (body[k] as string).trim().slice(0, LIMITS[k]) : "");
	// A field people can't see. Bots fill it in.
	if (body?.website) return NextResponse.json({ ok: true });
	const name = field("name");
	const email = field("email");
	const message = field("message");
	if (!message) return NextResponse.json({ error: "Write a message first." }, { status: 400 });

	const hook = process.env.HELLO_WEBHOOK_URL;
	if (!hook) {
		if (process.env.NODE_ENV !== "production") {
			console.info("[say hi]", { name, email, message });
			return NextResponse.json({ ok: true });
		}
		return NextResponse.json({ error: "We can't take messages right now." }, { status: 503 });
	}
	const text = `*${name || "Someone"}* said hi on clueso.design${email ? ` (${email})` : ""}:\n>${message.replace(/\n/g, "\n>")}`;
	const res = await fetch(hook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
	if (!res.ok) return NextResponse.json({ error: "That didn't go through. Try again in a bit." }, { status: 502 });
	return NextResponse.json({ ok: true });
}
