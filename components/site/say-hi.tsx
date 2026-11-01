"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState, useSyncExternalStore } from "react";
import { Button, InputGroup, InputGroupInput, Textarea } from "@/lib/design-system";
import { cursorById, effectiveWeight, fontById } from "@/lib/site-prefs";
import { setPrefs, useSitePrefs } from "@/lib/site-prefs-store";
import { CluesoCursor } from "./clueso-cursor";

// "Say hi": a note to the team, plus a few lines that show we noticed you. Your local time next to
// ours, and the look you gave this site. The name field is the name on your cursor.

const OUR_ZONE = "Asia/Kolkata";
const OUR_CITY = "Bengaluru";

// A clock that ticks once a minute. Null on the server, so times only appear in the browser.
const subscribe = (fn: () => void) => {
	const t = window.setInterval(fn, 15_000);
	return () => window.clearInterval(t);
};
const minute = () => Math.floor(Date.now() / 60_000);
const useMinute = () => useSyncExternalStore(subscribe, minute, () => null);

function timeIn(zone: string | undefined, at: number) {
	return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", timeZone: zone }).format(at * 60_000);
}

function greeting(at: number) {
	const h = new Date(at * 60_000).getHours();
	if (h < 5) return "Up late";
	if (h < 12) return "Good morning";
	if (h < 17) return "Good afternoon";
	return "Good evening";
}

function Seen() {
	const at = useMinute();
	const p = useSitePrefs();
	if (at === null) return <p className="type-text-l text-neutral-normal">We read every message.</p>;
	const yours = Intl.DateTimeFormat().resolvedOptions().timeZone;
	const sameZone = timeIn(yours, at) === timeIn(OUR_ZONE, at);
	const strong = "text-neutral-strong";
	const font = (id: string, w: number) => `${fontById(id).label} ${effectiveWeight(id, w)}`;
	return (
		<div className="flex flex-col gap-gap-s">
			<p className="type-text-l text-neutral-normal">
				{greeting(at)}
				{p.cursorName.trim() ? `, ${p.cursorName.trim()}` : ""}. It&apos;s <span className={strong}>{timeIn(undefined, at)}</span> where you are
				{sameZone ? (
					<> and the same here in {OUR_CITY}. Hello, neighbour.</>
				) : (
					<>
						{" "}
						and <span className={strong}>{timeIn(OUR_ZONE, at)}</span> in {OUR_CITY}, where we are.
					</>
				)}
			</p>
			<p className="type-text-l text-neutral-normal">
				You&apos;ve set titles in <span className={strong}>{font(p.titleFont, p.titleWeight)}</span> and text in <span className={strong}>{font(p.textFont, p.textWeight)}</span>. Good taste.
			</p>
		</div>
	);
}

type Status = { kind: "idle" | "sending" | "sent" } | { kind: "error"; message: string };

export function SayHi() {
	const p = useSitePrefs();
	const [email, setEmail] = useState("");
	const [message, setMessage] = useState("");
	const [status, setStatus] = useState<Status>({ kind: "idle" });

	const send = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const website = new FormData(e.currentTarget).get("website");
		setStatus({ kind: "sending" });
		try {
			const res = await fetch("/api/hello", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: p.cursorName, email, message, website }),
			});
			const data = (await res.json()) as { error?: string };
			if (!res.ok) throw new Error(data.error ?? "That didn't go through. Try again in a bit.");
			setStatus({ kind: "sent" });
			setMessage("");
		} catch (err) {
			setStatus({ kind: "error", message: err instanceof Error ? err.message : "That didn't go through." });
		}
	};

	return (
		<div className="grid border-t border-neutral-weak md:grid-cols-2">
			<div className="flex flex-col justify-between gap-gap-xl px-gap-l py-gap-xl md:border-r md:border-neutral-weak">
				<Seen />
				<div className="hidden pointer-fine:block">
					<CluesoCursor color={cursorById(p.cursorColor)} name={p.cursorName.trim() || "You"} tilt={p.cursorTilt} />
				</div>
			</div>
			<div className="px-gap-l py-gap-xl max-md:border-t max-md:border-neutral-weak">
				<AnimatePresence mode="wait" initial={false}>
					{status.kind === "sent" ? (
						<motion.div
							key="sent"
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
							className="flex h-full flex-col items-start justify-center gap-gap-s"
						>
							<p className="type-title-s text-neutral-strong">Thanks{p.cursorName.trim() ? `, ${p.cursorName.trim()}` : ""}. It&apos;s with us now</p>
							<p className="type-text-m text-neutral-normal">We read every message. If you left an email, we&apos;ll write back.</p>
							<Button variant="outlined" sentiment="neutral" size="xsmall" className="focus-ring" onClick={() => setStatus({ kind: "idle" })}>
								Send another
							</Button>
						</motion.div>
					) : (
						<motion.form key="form" exit={{ opacity: 0 }} transition={{ duration: 0.15 }} onSubmit={send} className="flex flex-col gap-gap-s">
							<label className="flex flex-col gap-gap-2xs">
								<span className="type-text-s text-neutral-weak">
									Your name<span className="hidden pointer-fine:inline">. It&apos;s on your cursor too</span>
								</span>
								<InputGroup>
									<InputGroupInput maxLength={24} value={p.cursorName} onChange={(e) => setPrefs({ cursorName: e.target.value })} placeholder="Your name" />
								</InputGroup>
							</label>
							<label className="flex flex-col gap-gap-2xs">
								<span className="type-text-s text-neutral-weak">Email, if you&apos;d like a reply</span>
								<InputGroup>
									<InputGroupInput type="email" maxLength={120} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
								</InputGroup>
							</label>
							<label className="flex flex-col gap-gap-2xs">
								<span className="type-text-s text-neutral-weak">Message</span>
								<Textarea required rows={4} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Feedback, an idea, or just hi" />
							</label>
							{/* Hidden from people. Bots fill it in and get ignored. */}
							<input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="sr-only" />
							<div className="flex items-center justify-between gap-gap-s">
								<span role="status" className="type-text-s text-negative-normal">
									{status.kind === "error" ? status.message : ""}
								</span>
								<Button type="submit" size="small" className="focus-ring" disabled={status.kind === "sending" || !message.trim()}>
									{status.kind === "sending" ? "Sending" : "Send"}
								</Button>
							</div>
						</motion.form>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
}
