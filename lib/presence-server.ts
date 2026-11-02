// The server's side of presence: every open tab's live connection, shared by /api/presence (cursors
// and the visitor count) and /api/hearts (the footer's heart count). Route files can only export
// handlers, so the shared state lives here.

export type Cursor = { id: string; who: string; page: string; name: string; color: string; tilt: number; x: number | null; y: number | null };
export type Conn = Cursor & { visitor: string; seq: number; send: (msg: object) => void };

// On globalThis so dev reloads keep the list.
const g = globalThis as { presenceConns?: Map<string, Conn> };
export const conns = (g.presenceConns ??= new Map());

/** People, not tabs: one browser with three tabs open counts once. */
export const count = () => new Set([...conns.values()].map((c) => c.visitor)).size;
export const broadcast = (msg: object, except?: string) => conns.forEach((c) => c.id !== except && c.send(msg));
