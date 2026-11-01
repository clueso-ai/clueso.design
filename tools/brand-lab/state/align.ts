import { aabb, layerFrame, type Rect } from "../layers/bounds";
import { getDef } from "../layers/registry";
import type { Params } from "../layers/types";
import { useStore } from "./store";

export type AlignMode = "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom";

/**
 * Figma-style align (⌥A/H/D, ⌥W/V/S). One layer aligns to the canvas; several align to the box
 * around them. Layers without a frame (full-bleed patterns) or a position param are left alone.
 */
export function alignSelection(mode: AlignMode) {
	const s = useStore.getState();
	const { doc } = s;
	const { width: W, height: H } = doc.scene;
	const items = doc.layers
		.filter((l) => s.selectedIds.includes(l.id) && !l.locked)
		.map((l) => {
			const frame = layerFrame(l, doc);
			const pos = getDef(l.type)?.position;
			return frame && pos ? { l, box: aabb(frame), pos } : null;
		})
		.filter((x): x is NonNullable<typeof x> => !!x);
	if (!items.length) return;
	const target: Rect =
		items.length === 1
			? { l: 0, t: 0, r: W, b: H }
			: items.reduce((a, { box }) => ({ l: Math.min(a.l, box.l), t: Math.min(a.t, box.t), r: Math.max(a.r, box.r), b: Math.max(a.b, box.b) }), { l: Infinity, t: Infinity, r: -Infinity, b: -Infinity });

	const patches: Record<string, Params> = {};
	for (const { l, box, pos } of items) {
		let dx = 0;
		let dy = 0;
		if (mode === "left") dx = target.l - box.l;
		if (mode === "right") dx = target.r - box.r;
		if (mode === "hcenter") dx = (target.l + target.r) / 2 - (box.l + box.r) / 2;
		if (mode === "top") dy = target.t - box.t;
		if (mode === "bottom") dy = target.b - box.b;
		if (mode === "vcenter") dy = (target.t + target.b) / 2 - (box.t + box.b) / 2;
		if (!dx && !dy) continue;
		// Position params are 0..1 with y up; frames are composition px with y down.
		patches[l.id] = {
			[pos[0]]: Math.round((Number(l.params[pos[0]]) + dx / W) * 10000) / 10000,
			[pos[1]]: Math.round((Number(l.params[pos[1]]) - dy / H) * 10000) / 10000,
		};
	}
	if (Object.keys(patches).length) s.patchLayers(patches);
}

/** ⌥ + key code → align mode (codes, since ⌥ changes e.key on macOS). */
export const ALIGN_KEYS: Record<string, AlignMode> = {
	KeyA: "left",
	KeyH: "hcenter",
	KeyD: "right",
	KeyW: "top",
	KeyV: "vcenter",
	KeyS: "bottom",
};
