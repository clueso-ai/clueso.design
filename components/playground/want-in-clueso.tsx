"use client";

import { useEffect, useState } from "react";
import { Button, Textarea, Tooltip, TooltipContent, TooltipTrigger } from "@/lib/design-system";
import { CheckIcon, PlusIcon } from "@/lib/design-system/icons";
import { connectionId, usePresence, visitorId } from "@/lib/presence";

// "I want this in Clueso": a vote on a playground experiment, so the team can see which ideas people
// would actually use in the product. One per browser, and it can be taken back. The count updates
// at once; the server (/api/votes) catches up. A vote needs the page's live presence connection,
// which every page opens for the visitor count.
// After a vote it asks, optionally, what they'd use it for. That's kept private for the team
// (scripts/votes.ts reads it), never shown on the site.

export function WantInClueso({ slug }: { slug: string }) {
	// Keeps the presence connection open, so there's an id to vote with.
	usePresence();
	const [count, setCount] = useState<number | null>(null);
	const [voted, setVoted] = useState(false);
	const [busy, setBusy] = useState(false);
	/** The follow-up after a vote: asking, sent, or not shown. */
	const [ask, setAsk] = useState<"asking" | "sent" | null>(null);
	const [note, setNote] = useState("");

	useEffect(() => {
		let alive = true;
		fetch(`/api/votes?visitor=${encodeURIComponent(visitorId())}`)
			.then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
			.then((res: { counts: Record<string, number>; mine: string[] }) => {
				if (!alive) return;
				setCount(res.counts[slug] ?? 0);
				setVoted(res.mine.includes(slug));
			})
			.catch(() => alive && setCount(0));
		return () => {
			alive = false;
		};
	}, [slug]);

	const toggle = async () => {
		const id = connectionId();
		if (busy || count === null || !id) return;
		const next = !voted;
		setBusy(true);
		setVoted(next);
		setCount((c) => Math.max(0, (c ?? 0) + (next ? 1 : -1)));
		try {
			const res = await fetch("/api/votes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, slug, voted: next }) });
			if (!res.ok) throw new Error(String(res.status));
			const body = (await res.json()) as { count: number; voted: boolean };
			setCount(body.count);
			setVoted(body.voted);
			setAsk(body.voted ? "asking" : null);
		} catch {
			// Undone: the server didn't take it.
			setVoted(!next);
			setCount((c) => Math.max(0, (c ?? 0) + (next ? -1 : 1)));
		} finally {
			setBusy(false);
		}
	};

	const sendNote = async () => {
		const id = connectionId();
		const text = note.trim();
		if (!id || !text) return;
		setAsk("sent");
		await fetch("/api/votes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, slug, note: text }) }).catch(() => {});
	};

	const others = (count ?? 0) - (voted ? 1 : 0);
	const label = voted
		? others
			? `You and ${others} ${others === 1 ? "other" : "others"} want this in Clueso. Press to take it back.`
			: "You want this in Clueso. Press to take it back."
		: count
			? `${count} ${count === 1 ? "person wants" : "people want"} this in Clueso. Add yours.`
			: "Be the first to ask for this in Clueso.";

	return (
		<div className="flex flex-col items-start gap-gap-s sm:items-end">
			<Tooltip>
				<TooltipTrigger asChild>
					<button
						type="button"
						aria-pressed={voted}
						onClick={() => void toggle()}
						disabled={count === null}
						className={`state-layer focus-ring type-text-s flex w-fit items-center gap-gap-xs rounded-small border px-gap-s py-gap-xs transition-colors duration-200 ease-out-strong disabled:opacity-60 ${voted ? "border-brand-normal bg-brand-weak text-neutral-strong" : "border-neutral-normal text-neutral-normal hover:border-neutral-strong hover:text-neutral-strong"}`}
					>
						<span className={`flex ${voted ? "text-brand-normal" : ""}`}>{voted ? <CheckIcon aria-hidden className="size-3.5" /> : <PlusIcon aria-hidden className="size-3.5" />}</span>
						I want this in Clueso
						<span className="font-code tabular-nums text-neutral-weak">{count ?? "–"}</span>
					</button>
				</TooltipTrigger>
				<TooltipContent side="bottom">{label}</TooltipContent>
			</Tooltip>
			{ask === "asking" && (
				<form
					className="flex w-full flex-col gap-gap-xs rounded-medium border border-neutral-weak bg-raised-1 p-gap-s sm:w-80"
					onSubmit={(e) => {
						e.preventDefault();
						void sendNote();
					}}
				>
					<label htmlFor={`note-${slug}`} className="type-text-s text-neutral-strong">
						Thanks. What would you use it for?
					</label>
					<Textarea id={`note-${slug}`} value={note} maxLength={280} rows={3} placeholder="Optional. Only the Clueso team sees this." onChange={(e) => setNote(e.target.value)} />
					<div className="flex justify-end gap-gap-2xs">
						<Button variant="transparent" sentiment="neutral" size="small" className="focus-ring" onClick={() => setAsk(null)}>
							Skip
						</Button>
						<Button type="submit" variant="filled" sentiment="neutral" size="small" className="focus-ring" disabled={!note.trim()}>
							Send
						</Button>
					</div>
				</form>
			)}
			{ask === "sent" && <p className="type-text-s text-neutral-weak">Thanks, that helps us decide what to build.</p>}
		</div>
	);
}
