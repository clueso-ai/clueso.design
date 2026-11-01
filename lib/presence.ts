"use client";

// The browser's side of /api/presence: one live connection per tab, shared by the header's
// visitor count and other visitors' cursors. It opens with the first component that needs it.

import { useSyncExternalStore } from "react";

export interface RemoteCursor {
	id: string;
	/** The same for every tab of one person. */
	who: string;
	page: string;
	name: string;
	color: string;
	tilt: number;
	/** From the middle of the window, in px, so centred layouts line up across window sizes. Null while their pointer is away. */
	x: number | null;
	/** From the top of the page, in px. */
	y: number | null;
}

interface Presence {
	/** People on the site, you included. Null until the server has answered. */
	count: number | null;
	/** Your own "who", to tell your other tabs apart from other people. */
	me: string | null;
	cursors: RemoteCursor[];
}

const KEY = "clueso-visitor-id";
/** How often your cursor goes out, at most, in ms. The other side smooths between updates. */
const SEND_MS = 66;

let state: Presence = { count: null, me: null, cursors: [] };
const listeners = new Set<() => void>();
let source: EventSource | null = null;
let you: string | null = null;
let page = "/";
let seq = 0;
let pending: Partial<RemoteCursor> = {};
/** Everything you've sent, so a reconnect can bring your cursor back as it was. */
let sent: Partial<RemoteCursor> = {};
let timer: ReturnType<typeof setTimeout> | undefined;

function visitorId() {
	try {
		const saved = localStorage.getItem(KEY);
		if (saved) return saved;
		const id = crypto.randomUUID();
		localStorage.setItem(KEY, id);
		return id;
	} catch {
		return crypto.randomUUID();
	}
}

function set(next: Partial<Presence>) {
	state = { ...state, ...next };
	listeners.forEach((l) => l());
}

function connect() {
	source = new EventSource(`/api/presence?visitor=${visitorId()}&page=${encodeURIComponent(page)}`);
	source.onmessage = (e) => {
		const msg = JSON.parse(e.data);
		if (msg.t === "hello") {
			// A new connection after a drop: start over, and put your cursor back.
			you = msg.you;
			seq = 0;
			set({ count: msg.count, me: msg.me, cursors: msg.cursors });
			send({ ...sent, page });
		} else if (msg.t === "count") set({ count: msg.count });
		else if (msg.t === "gone") set({ cursors: state.cursors.filter((c) => c.id !== msg.id) });
		else if (msg.t === "cursor") set({ cursors: [...state.cursors.filter((c) => c.id !== msg.c.id), msg.c] });
	};
}

function flush() {
	timer = undefined;
	if (!you || !Object.keys(pending).length) return;
	const body = JSON.stringify({ id: you, seq: ++seq, ...pending });
	pending = {};
	fetch("/api/presence", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
}

/** Updates your cursor for everyone else. Sends at most every SEND_MS, always ending on the latest. */
export function send(patch: Partial<RemoteCursor>) {
	if (patch.page) page = patch.page;
	pending = { ...pending, ...patch };
	sent = { ...sent, ...patch };
	if (!timer) timer = setTimeout(flush, SEND_MS);
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	if (!source) connect();
	return () => {
		listeners.delete(listener);
		if (listeners.size) return;
		source?.close();
		source = null;
		you = null;
		state = { count: null, me: null, cursors: [] };
	};
}

const empty: Presence = { count: null, me: null, cursors: [] };
export const usePresence = () =>
	useSyncExternalStore(
		subscribe,
		() => state,
		() => empty,
	);

/** Everyone else on the site, one entry per person: their most recently active tab. */
export function people({ cursors, me }: Presence): RemoteCursor[] {
	const byWho = new Map<string, RemoteCursor>();
	for (const c of cursors) if (c.who !== me) byWho.set(c.who, c);
	return [...byWho.values()].reverse();
}
