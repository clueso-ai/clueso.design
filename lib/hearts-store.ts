// The footer's hearts: how many people like the site. Each browser can heart it once, and take it
// back. In production they live in an Upstash Redis database, reached over its REST API with
// UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN (GitHub secrets, passed in by
// deploy/cloudformation.yml). Keys:
//   hearts:total, hearts:v     the count, and a version that goes up with every change
//   hearts:browser:<hash>      a hash per browser: hearted (1/0), the cursor name it had set, the page
//                              it was on, firstAt and lastAt
// Browsers are keyed by a hash of their visitor id, never the id itself. Without the two variables
// (local dev) it's all kept in memory and a restart starts from zero.

const URL = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const remote = Boolean(URL && TOKEN);
const TOTAL = "hearts:total";
const VERSION = "hearts:v";

/** The total, and its version: clients use v to ignore updates that arrive out of order. */
export type Hearts = { total: number; v: number };

/** Runs one Redis command. */
async function redis<T>(...command: (string | number)[]): Promise<T> {
	const res = await fetch(URL!, { method: "POST", headers: { Authorization: `Bearer ${TOKEN}` }, body: JSON.stringify(command), cache: "no-store" });
	const body = (await res.json()) as { result?: T; error?: string };
	if (!res.ok || body.error) throw new Error(`Upstash: ${body.error ?? res.status}`);
	return body.result as T;
}

// Checks the browser's state and changes it in one step, so a repeat, or a second tab, can't count
// twice. Returns [changed, total, version].
const TOGGLE = `
local cur = redis.call("HGET", KEYS[1], "hearted")
if (cur == "1") == (ARGV[1] == "1") then
	return {0, tonumber(redis.call("GET", KEYS[2]) or "0"), tonumber(redis.call("GET", KEYS[3]) or "0")}
end
redis.call("HSET", KEYS[1], "hearted", ARGV[1], "name", ARGV[2], "page", ARGV[3], "lastAt", ARGV[4])
redis.call("HSETNX", KEYS[1], "firstAt", ARGV[4])
local total = redis.call("INCRBY", KEYS[2], ARGV[1] == "1" and 1 or -1)
return {1, total, redis.call("INCR", KEYS[3])}
`;

// On globalThis so dev reloads keep them.
const g = globalThis as { heartsCurrent?: Hearts; heartsReading?: Promise<Hearts>; heartsByBrowser?: Map<string, boolean> };
const hearted = (g.heartsByBrowser ??= new Map());

/** Keeps the newest total. Replies to concurrent writes can arrive in any order. */
const keep = (h: Hearts) => (g.heartsCurrent = !g.heartsCurrent || h.v > g.heartsCurrent.v ? h : g.heartsCurrent);

async function load(): Promise<Hearts> {
	if (!remote) return { total: 0, v: 0 };
	const [total, v] = await redis<(string | null)[]>("MGET", TOTAL, VERSION);
	return { total: Number(total ?? 0), v: Number(v ?? 0) };
}

/** The total, read once per server start and kept up to date in memory after that. */
export function heartsTotal(): Promise<Hearts> {
	if (g.heartsCurrent) return Promise.resolve(g.heartsCurrent);
	g.heartsReading ??= load().then(keep, (err) => {
		console.error("hearts: couldn't read the total", err);
		g.heartsReading = undefined;
		return { total: 0, v: 0 };
	});
	return g.heartsReading;
}

async function browserKey(visitor: string) {
	const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(visitor));
	return `hearts:browser:${[...new Uint8Array(hash).slice(0, 16)].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

/** Whether this browser hearts the site. */
export async function isHearted(visitor: string): Promise<boolean> {
	const key = await browserKey(visitor);
	const known = hearted.get(key);
	if (known !== undefined || !remote) return known ?? false;
	try {
		const value = (await redis<string | null>("HGET", key, "hearted")) === "1";
		hearted.set(key, value);
		return value;
	} catch (err) {
		console.error("hearts: couldn't read a browser", err);
		return false;
	}
}

/** Hearts the site from one browser, or takes it back. Doing what's already done changes nothing. */
export async function setHearted(visitor: string, value: boolean, from: { name: string; page: string }): Promise<Hearts & { changed: boolean }> {
	const key = await browserKey(visitor);

	if (!remote) {
		const now = await heartsTotal();
		if ((hearted.get(key) ?? false) === value) return { ...now, changed: false };
		hearted.set(key, value);
		return { ...keep({ total: Math.max(0, now.total + (value ? 1 : -1)), v: now.v + 1 }), changed: true };
	}

	const [changed, total, v] = await redis<number[]>("EVAL", TOGGLE, 3, key, TOTAL, VERSION, value ? "1" : "0", from.name, from.page, new Date().toISOString());
	hearted.set(key, value);
	return { ...keep({ total, v }), changed: changed === 1 };
}
