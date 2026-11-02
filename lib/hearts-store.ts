import { ConditionalCheckFailedException, DynamoDBClient, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";

// The footer's hearts: how many people like the site. Each browser can heart it once, and take it
// back. In production they live in the DynamoDB table named by HEARTS_TABLE
// (deploy/cloudformation.yml): one item holds the total and a version that goes up with every change,
// and one per browser holds whether it hearts the site, the cursor name it had set, the page it was
// on and when. Browsers are keyed by a hash of their visitor id, never the id itself. Without
// HEARTS_TABLE (local dev) it's all kept in memory and a restart starts from zero.

const TABLE = process.env.HEARTS_TABLE;
const db = TABLE ? new DynamoDBClient({}) : null;
const TOTAL = { pk: { S: "total" } };

/** The total, and its version: clients use v to ignore updates that arrive out of order. */
export type Hearts = { total: number; v: number };

// On globalThis so dev reloads keep them.
const g = globalThis as { heartsLatest?: Hearts; heartsLoading?: Promise<Hearts>; heartedBrowsers?: Map<string, boolean> };
const hearted = (g.heartedBrowsers ??= new Map());

/** Keeps the newest total. Replies to concurrent writes can arrive in any order. */
const keep = (h: Hearts) => (g.heartsLatest = !g.heartsLatest || h.v > g.heartsLatest.v ? h : g.heartsLatest);

async function load(): Promise<Hearts> {
	if (!db) return { total: 0, v: 0 };
	const { Item } = await db.send(new GetItemCommand({ TableName: TABLE, Key: TOTAL, ProjectionExpression: "hearts, v" }));
	return { total: Number(Item?.hearts?.N ?? 0), v: Number(Item?.v?.N ?? 0) };
}

/** The total, read from the table once per server start and kept up to date in memory after that. */
export function heartsTotal(): Promise<Hearts> {
	if (g.heartsLatest) return Promise.resolve(g.heartsLatest);
	g.heartsLoading ??= load().then(keep, (err) => {
		console.error("hearts: couldn't read the total", err);
		g.heartsLoading = undefined;
		return { total: 0, v: 0 };
	});
	return g.heartsLoading;
}

async function browserKey(visitor: string) {
	const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(visitor));
	return `browser#${[...new Uint8Array(hash).slice(0, 16)].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

/** Whether this browser hearts the site. */
export async function isHearted(visitor: string): Promise<boolean> {
	const key = await browserKey(visitor);
	const known = hearted.get(key);
	if (known !== undefined || !db) return known ?? false;
	try {
		const { Item } = await db.send(new GetItemCommand({ TableName: TABLE, Key: { pk: { S: key } }, ProjectionExpression: "hearted" }));
		const value = Item?.hearted?.BOOL ?? false;
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
	const delta = value ? 1 : -1;

	if (!db) {
		const now = await heartsTotal();
		if ((hearted.get(key) ?? false) === value) return { ...now, changed: false };
		hearted.set(key, value);
		return { ...keep({ total: Math.max(0, now.total + delta), v: now.v + 1 }), changed: true };
	}

	// The browser's item first, and only if it changes: a repeat, or a second tab, can't count twice.
	const now = new Date().toISOString();
	try {
		await db.send(
			new UpdateItemCommand({
				TableName: TABLE,
				Key: { pk: { S: key } },
				UpdateExpression: "SET hearted = :v, #name = :name, #page = :page, lastAt = :now, firstAt = if_not_exists(firstAt, :now)",
				ConditionExpression: value ? "attribute_not_exists(hearted) OR hearted = :off" : "hearted = :on",
				ExpressionAttributeNames: { "#name": "name", "#page": "page" },
				ExpressionAttributeValues: { ":v": { BOOL: value }, ":on": { BOOL: true }, ":off": { BOOL: false }, ":name": { S: from.name }, ":page": { S: from.page }, ":now": { S: now } },
			}),
		);
	} catch (err) {
		if (!(err instanceof ConditionalCheckFailedException)) throw err;
		hearted.set(key, value);
		return { ...(await heartsTotal()), changed: false };
	}
	hearted.set(key, value);

	const { Attributes } = await db.send(
		new UpdateItemCommand({ TableName: TABLE, Key: TOTAL, UpdateExpression: "ADD hearts :d, v :one", ExpressionAttributeValues: { ":d": { N: String(delta) }, ":one": { N: "1" } }, ReturnValues: "UPDATED_NEW" }),
	);
	return { ...keep({ total: Number(Attributes?.hearts?.N ?? 0), v: Number(Attributes?.v?.N ?? 0) }), changed: true };
}
