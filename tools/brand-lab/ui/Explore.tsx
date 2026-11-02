import { I } from "./ci";
import { useCallback, useEffect, useRef, useState } from "react";
import { ICON_NORMAL, IconButton } from "@/tools/shell/components/icon-button";
import { Thumb, ThumbActions, ThumbBadge, ThumbCard, ThumbGrid } from "../components/thumb";
import { renderThumb } from "../export/thumb";
import { Button } from "@/lib/design-system/jigsaw/components/ui/controls/button/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/lib/design-system/jigsaw/components/ui/overlays/tooltip/tooltip";
import type { Doc } from "../state/doc";
import { mulberry32 } from "../state/shuffle";
import { styleSet } from "../state/styles";
import { useStore } from "../state/store";
import { VARIATION_MODES, type VariationMode, vary } from "../state/variations";
import { Segmented } from "./controls";
import { Sheet, SheetHint } from "./Sheet";

/** Columns by aspect ratio, so the base plus its variations fill whole rows without cropping. */
function layoutFor(doc: Doc) {
	const aspect = doc.scene.width / doc.scene.height;
	return aspect >= 1.3 ? { cols: 3, count: 8 } : { cols: 5, count: 9 };
}

interface Variation {
	doc: Doc;
	label?: string;
	thumb?: string;
	saved?: boolean;
}

/**
 * A contact sheet of variations of the current frame. Pick one to use it, bookmark it straight into
 * the Library, or branch from it to keep exploring in that direction.
 */
export function Explore() {
	const setOverlay = useStore((s) => s.setOverlay);
	const commit = useStore((s) => s.commit);
	const saveToLibrary = useStore((s) => s.saveToLibrary);
	// Frozen when the sheet opens: thumbnails shouldn't re-render as the timeline plays.
	const [time] = useState(() => useStore.getState().time);
	const [mode, setMode] = useState<VariationMode>(() => {
		const m = useStore.getState().shuffleMode;
		return m === "pattern" || m === "poster" ? "colors" : m;
	});
	const [base, setBase] = useState<Doc>(() => useStore.getState().doc);
	const [baseThumb, setBaseThumb] = useState<string>();
	const [branched, setBranched] = useState(false);
	const [items, setItems] = useState<Variation[]>([]);
	const round = useRef(0);
	const close = useCallback(() => setOverlay(null), [setOverlay]);

	const { cols, count } = layoutFor(base);

	const generate = useCallback(async () => {
		const id = ++round.current;
		const n = layoutFor(base).count;
		const rng = mulberry32((Math.random() * 2 ** 32) >>> 0);
		// Styles: n different treatments, each labelled; every other mode is n random variations.
		const next: Variation[] = mode === "styles" ? styleSet(base, n, rng).map(({ style, doc }) => ({ doc, label: style.name })) : Array.from({ length: n }, () => ({ doc: vary(base, mode, rng) }));
		const docs = next.map((v) => v.doc);
		setItems(next);
		// Thumbnails fill in one by one; a newer round abandons this one.
		for (let i = 0; i < docs.length; i++) {
			const thumb = await renderThumb(docs[i], time);
			if (round.current !== id) return;
			setItems((prev) => prev.map((v, j) => (j === i ? { ...v, thumb } : v)));
		}
	}, [base, mode, time]);

	useEffect(() => {
		generate();
	}, [generate]);

	useEffect(() => {
		let alive = true;
		renderThumb(base, time).then((t) => alive && setBaseThumb(t));
		return () => {
			alive = false;
		};
	}, [base, time]);

	const use = useCallback(
		(doc: Doc) => {
			// A variation replaces the active canvas but keeps its name.
			commit((d) => ({ ...doc, name: d.name }));
			close();
		},
		[commit, close],
	);

	useEffect(() => {
		const key = (e: KeyboardEvent) => {
			if (e.metaKey || e.ctrlKey || (e.target as HTMLElement).tagName === "INPUT") return;
			if (e.key.toLowerCase() === "r") generate();
			const n = Number(e.key);
			if (n >= 1 && n <= items.length) use(items[n - 1].doc);
		};
		window.addEventListener("keydown", key);
		return () => window.removeEventListener("keydown", key);
	}, [generate, items, use]);

	const hint = VARIATION_MODES.find((m) => m.value === mode)?.hint;
	const ratio = `${base.scene.width} / ${base.scene.height}`;

	return (
		<Sheet
			label="Variations"
			title="Variations"
			onClose={close}
			controls={
				<>
					<span className="label-xsmall text-normal">Change what</span>
					<Segmented size="button" label="Change what" value={mode} options={VARIATION_MODES} onChange={setMode} />
					<Tooltip>
						<TooltipTrigger asChild>
							<Button iconClassName={ICON_NORMAL} variant="outlined" sentiment="neutral" size="small" iconBefore icon={<I.Refresh />} onClick={generate}>
								New set
							</Button>
						</TooltipTrigger>
						<TooltipContent shortcut={["R"]}>New set</TooltipContent>
					</Tooltip>
				</>
			}
		>
			<SheetHint>
				{hint}. Click one to use it (or press 1 to {count}), bookmark it to save for later, or branch to explore from it.
			</SheetHint>
			<ThumbGrid cols={cols}>
				<ThumbCard>
					<Thumb src={baseThumb} ratio={ratio} current onClick={() => use(base)} title={branched ? "Use this branch" : "Keep the current frame"}>
						<ThumbBadge>{branched ? "Branch" : "Current"}</ThumbBadge>
					</Thumb>
				</ThumbCard>
				{items.map((v, i) => (
					<ThumbCard key={i}>
						<Thumb src={v.thumb} ratio={ratio} onClick={() => use(v.doc)} title="Use this variation">
							<ThumbBadge className="font-mono opacity-0 transition-opacity group-hover/thumb:opacity-100">{i + 1}</ThumbBadge>
							{v.label && <ThumbBadge position="bottom">{v.label}</ThumbBadge>}
						</Thumb>
						<ThumbActions>
							<IconButton
								size="xsmall"
								label={v.saved ? "Saved to Library" : "Save to Library"}
								active={v.saved}
								disabled={v.saved}
								icon={v.saved ? <I.BookmarkFilled /> : <I.Bookmark />}
								onClick={async () => {
									await saveToLibrary({ doc: v.doc, name: `${v.doc.name || "Untitled"} variation` });
									setItems((prev) => prev.map((x, j) => (j === i ? { ...x, saved: true } : x)));
								}}
							/>
							<IconButton
								size="xsmall"
								label="Branch: explore variations of this one"
								icon={<I.Branch />}
								onClick={() => {
									setBase(v.doc);
									setBranched(true);
								}}
							/>
						</ThumbActions>
					</ThumbCard>
				))}
			</ThumbGrid>
		</Sheet>
	);
}
