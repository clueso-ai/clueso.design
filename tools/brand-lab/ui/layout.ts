import { create } from "zustand";

// Editor chrome geometry, shared by the floating panels and the viewport's "fit" insets so they can't
// drift apart. Mirrors the Clueso editor: top bar clusters, a left panel, a full-height right panel,
// and a timeline along the bottom that stops at the right panel. Side panel widths are resizable.

/** Screen margin around the chrome. */
export const M = 12;
/** Gap between neighbouring panels. */
export const GAP = 8;
/** Height of the top bar clusters and the timeline. */
export const BAR = 40;
/** Below this width the side panels hide and the canvas gets the whole window. */
export const WIDE = 1100;
/** Where panels start, under the top bar. */
export const PANEL_TOP = M + BAR + GAP;

export const PANEL_LIMITS = { left: { min: 200, max: 480, initial: 260 }, right: { min: 280, max: 560, initial: 320 } } as const;
type Side = keyof typeof PANEL_LIMITS;

const KEY = "clueso-brand-lab:panels";
const saved = (() => {
	try {
		return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Record<Side, number>>;
	} catch {
		return {};
	}
})();
const clampW = (side: Side, w: number) => Math.round(Math.min(PANEL_LIMITS[side].max, Math.max(PANEL_LIMITS[side].min, w)));

interface PanelSizes {
	left: number;
	right: number;
	setWidth: (side: Side, w: number) => void;
	reset: (side: Side) => void;
}

export const usePanels = create<PanelSizes>((set, get) => {
	const persist = () => localStorage.setItem(KEY, JSON.stringify({ left: get().left, right: get().right }));
	return {
		left: clampW("left", saved.left ?? PANEL_LIMITS.left.initial),
		right: clampW("right", saved.right ?? PANEL_LIMITS.right.initial),
		setWidth: (side, w) => {
			set({ [side]: clampW(side, w) } as Pick<PanelSizes, Side>);
			persist();
		},
		reset: (side) => {
			set({ [side]: PANEL_LIMITS[side].initial } as Pick<PanelSizes, Side>);
			persist();
		},
	};
});

/** Timeline's right edge leaves room for the right panel. */
export const timelineRight = (rightW: number) => M + rightW + GAP;

/** Space the chrome occupies, so "fit" frames the artboard in the free area (with room for the size chip). */
export function insets(vw: number, leftW: number, rightW: number) {
	const wide = vw >= WIDE;
	return {
		top: PANEL_TOP + 44,
		bottom: M + BAR + GAP + 40,
		left: wide ? M + leftW + 40 : 24,
		right: wide ? timelineRight(rightW) + 32 : 24,
	};
}
