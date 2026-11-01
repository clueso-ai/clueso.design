import type { Doc } from "./doc";

// Saved designs live in IndexedDB, not localStorage: docs can embed dropped images, and the
// thumbnails alone would blow localStorage's ~5 MB quota after a few dozen saves.

export interface LibraryEntry {
	id: string;
	name: string;
	/** The canvas shown as the thumbnail (the active one when saved). */
	doc: Doc;
	/** All canvases, for projects saved with more than one; older entries only have `doc`. */
	project?: { canvases: Doc[]; active: number };
	/** Small WebP data URL for the grid. */
	thumb: string;
	created: number;
	updated: number;
}

const DB = "clueso-brand-lab";
const STORE = "library";

let dbPromise: Promise<IDBDatabase> | null = null;

function db() {
	dbPromise ??= new Promise((resolve, reject) => {
		const req = indexedDB.open(DB, 1);
		req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
	return dbPromise;
}

async function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
	const store = (await db()).transaction(STORE, mode).objectStore(STORE);
	return new Promise((resolve, reject) => {
		const req = run(store);
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

/** Newest first. */
export async function listEntries(): Promise<LibraryEntry[]> {
	const all = await tx<LibraryEntry[]>("readonly", (s) => s.getAll());
	return all.sort((a, b) => b.updated - a.updated);
}

export const getEntry = (id: string) => tx<LibraryEntry | undefined>("readonly", (s) => s.get(id));
export const putEntry = (entry: LibraryEntry) => tx("readwrite", (s) => s.put(entry));
export const deleteEntry = (id: string) => tx("readwrite", (s) => s.delete(id));
