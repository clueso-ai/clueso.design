import { cn } from "@/lib/design-system/jigsaw/lib/utils";
import { usePanelWidths } from "@/tools/shell/context";
import { GAP, M, PANEL_TOP, shownWidth } from "@/tools/shell/geometry";
import type { Pt } from "../engine/types";
import { useIconLab } from "../state/store";
import { ContextPane } from "./ContextPane";
import { previewMarkup } from "./markup";

/** The bottom bar's height: the size ramp shows the icon up to 48 px. */
export const BOTTOM = 64;

/**
 * The canvas: in the Icon view a dotted grid you can draw on to find or create an icon, with the
 * icon on its artboard in the space between the panels; in the Context view, the icon where it's used.
 */
export function Canvas() {
	const pane = useIconLab((s) => s.pane);
	// 0 while a panel is collapsed, so the icon re-centres in the space it frees.
	const left = usePanelWidths((s) => shownWidth(s, "left"));
	const right = usePanelWidths((s) => shownWidth(s, "right"));
	const { sketchStart, sketchMove, sketchEnd } = useIconLab.getState();
	const at = (e: React.PointerEvent<HTMLDivElement>): Pt => {
		const r = e.currentTarget.getBoundingClientRect();
		return [e.clientX - r.left, e.clientY - r.top];
	};

	return (
		<div
			className={cn("il-canvas absolute inset-0", pane === "icon" && "il-drawable")}
			// Press and drag anywhere on the grid (not on the artboard) to draw. A short pause after the
			// last stroke and the drawing is matched against the set.
			onPointerDown={(e) => {
				if (pane !== "icon" || e.button !== 0 || (e.target as Element).closest(".il-artboard, button, input, a, .il-edit-hint")) return;
				e.preventDefault();
				e.currentTarget.setPointerCapture(e.pointerId);
				sketchStart(at(e));
			}}
			onPointerMove={(e) => sketchMove(at(e))}
			onPointerUp={sketchEnd}
			onPointerCancel={sketchEnd}
		>
			<Sketch />
			{/* The free space between the panels and the bars; panels hide on narrow screens. */}
			<div
				className="absolute right-[12px] left-[12px] flex flex-col items-center overflow-y-auto min-[1100px]:right-(--il-right) min-[1100px]:left-(--il-left)"
				style={{ top: PANEL_TOP, bottom: M + BOTTOM + GAP, "--il-left": `${left ? M + left + GAP : M}px`, "--il-right": `${right ? M + right + GAP : M}px` } as React.CSSProperties}
			>
				{pane === "icon" ? <IconView /> : <ContextPane />}
			</div>
		</div>
	);
}

function Sketch() {
	const { strokes, live } = useIconLab((s) => s.sketch);
	const all = live ? [...strokes, live] : strokes;
	return (
		<svg className="il-sketch pointer-events-none absolute inset-0 z-[3] size-full overflow-visible" aria-hidden>
			{all.map((st, i) => (
				<polyline key={i} points={st.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")} />
			))}
		</svg>
	);
}

function IconView() {
	const editing = useIconLab((s) => !!s.edit);
	return (
		<div className="my-auto flex w-full flex-col items-center py-lg">
			{editing && (
				<p className="il-edit-hint para-xxsmall cursor-default mb-md text-center text-weak">
					Drag points to edit · Shift-click or drag a box to select several · ⌘A selects all · snaps to ¼ (hold Alt for free) · arrows nudge ¼, Shift + arrow 1
				</p>
			)}
			<Artboard />
		</div>
	);
}

/** The icon on its artboard, over the keyline grid. While editing, its points are handles. */
function Artboard() {
	const editing = useIconLab((s) => !!s.edit);
	const showGrid = useIconLab((s) => s.showGrid);
	useIconLab((s) => s.rev);
	const state = useIconLab.getState();
	const { editDown, editMove, editUp } = state;
	const markup = previewMarkup(state);

	// The pointer in the icon's grid units.
	const point = (e: React.PointerEvent): Pt => {
		const svg = e.currentTarget.querySelector("svg");
		const ctm = svg?.getScreenCTM();
		if (!svg || !ctm) return [0, 0];
		const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
		return [p.x, p.y];
	};

	return (
		<div className={cn("il-artboard relative cursor-default aspect-square w-[min(100%,520px,calc(100vh-220px))] rounded-xs bg-(--il-artboard)", showGrid && "il-show-grid", editing && "il-editing")}>
			<div
				className="il-icon absolute inset-[24px] flex justify-center [&>svg]:block [&>svg]:aspect-square [&>svg]:h-full [&>svg]:w-auto"
				dangerouslySetInnerHTML={{ __html: markup }}
				onPointerDown={(e) => {
					if (!editing) return;
					e.preventDefault();
					const attr = (e.target as Element).getAttribute?.("data-h");
					e.currentTarget.setPointerCapture(e.pointerId);
					editDown(point(e), attr === null || attr === undefined ? null : Number(attr), e.shiftKey);
				}}
				onPointerMove={(e) => editing && editMove(point(e), e.altKey)}
				onPointerUp={editUp}
				onPointerCancel={editUp}
			/>
		</div>
	);
}
