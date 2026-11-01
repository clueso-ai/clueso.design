import type { Doc } from "./doc";

/** Board positions: stored ones, or auto-placed left to right (tops aligned) after the placed ones. */
export function boardPositions(canvases: Doc[]) {
	const gap = Math.max(...canvases.map((c) => c.scene.width)) * 0.12;
	let right = 0;
	for (const c of canvases) if (c.board) right = Math.max(right, c.board.x + c.scene.width + gap);
	return canvases.map((c) => {
		if (c.board) return c.board;
		const p = { x: right, y: 0 };
		right += c.scene.width + gap;
		return p;
	});
}

/** Freeze every canvas at its current spot, so moving one never reshuffles the auto-placed rest. */
export function placeAll(canvases: Doc[]): Doc[] {
	if (canvases.every((c) => c.board)) return canvases;
	const pos = boardPositions(canvases);
	return canvases.map((c, i) => (c.board ? c : { ...c, board: pos[i] }));
}
