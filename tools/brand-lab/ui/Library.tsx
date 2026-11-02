import { I } from "./ci";
import { useCallback, useEffect, useMemo, useState } from "react";
import { exportJSON } from "../export";
import { renderThumb } from "../export/thumb";
import { newId } from "../layers/registry";
import { deleteEntry, type LibraryEntry, listEntries, putEntry } from "../state/library";
import { PRESETS } from "../state/presets";
import { ICON_NORMAL, IconButton } from "../components/icon-button";
import { Thumb, ThumbActions, ThumbBadge, ThumbCard, ThumbGrid, ThumbMeta } from "../components/thumb";
import { Button } from "@/lib/design-system/jigsaw/components/ui/controls/button/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/lib/design-system/jigsaw/components/ui/overlays/tooltip/tooltip";
import { Field } from "../components/field";
import { useStore } from "../state/store";
import { Segmented } from "./controls";
import { Sheet, SheetEmpty } from "./Sheet";

// Preset thumbnails are rendered once per session, on first open.
const presetThumbs = new Map<string, string>();

function ago(t: number) {
	const s = (Date.now() - t) / 1000;
	if (s < 60) return "just now";
	if (s < 3600) return `${Math.floor(s / 60)} min ago`;
	if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
	return new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function Library() {
	const setOverlay = useStore((s) => s.setOverlay);
	const loadDoc = useStore((s) => s.loadDoc);
	const loadProject = useStore((s) => s.loadProject);
	const saveToLibrary = useStore((s) => s.saveToLibrary);
	const savedId = useStore((s) => s.saved?.id ?? null);
	const [tab, setTab] = useState<"saved" | "presets">("saved");
	const [entries, setEntries] = useState<LibraryEntry[] | null>(null);
	const close = useCallback(() => setOverlay(null), [setOverlay]);

	const refresh = useCallback(() => listEntries().then(setEntries, () => setEntries([])), []);
	useEffect(() => {
		// An empty library opens on presets.
		listEntries().then(
			(list) => {
				setEntries(list);
				if (!list.length) setTab("presets");
			},
			() => setEntries([]),
		);
	}, []);

	const open = (e: LibraryEntry) => {
		if (e.project) loadProject({ name: e.name, ...e.project }, { id: e.id });
		else loadDoc(e.doc, { id: e.id });
		close();
	};

	return (
		<Sheet
			label="Library"
			title="Library"
			onClose={close}
			controls={
				<>
					<Segmented
						size="button"
						// Remount when the count changes so the selected pill re-measures its label.
						key={entries?.length ?? 0}
						label="Library section"
						value={tab}
						options={[
							{ value: "saved", label: `Saved${entries?.length ? ` · ${entries.length}` : ""}` },
							{ value: "presets", label: "Presets" },
						]}
						onChange={setTab}
					/>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button iconClassName={ICON_NORMAL}
								variant="outlined"
								sentiment="neutral"
								size="small"
								iconBefore
								icon={<I.Bookmark />}
								onClick={async () => {
									await saveToLibrary({ asNew: true });
									await refresh();
									setTab("saved");
								}}
							>
								Save current
							</Button>
						</TooltipTrigger>
						<TooltipContent>Save the current frame as a new entry</TooltipContent>
					</Tooltip>
				</>
			}
		>
			{tab === "saved" ? (
				entries === null ? null : entries.length === 0 ? (
					<SheetEmpty title="Nothing saved yet">
						Press ⌘S on any frame, or bookmark a variation, and it lands here with a thumbnail. Open it later to export or keep building.
					</SheetEmpty>
				) : (
					<ThumbGrid>
						{entries.map((e) => (
							<SavedCard key={e.id} entry={e} current={e.id === savedId} onOpen={() => open(e)} onChange={refresh} />
						))}
					</ThumbGrid>
				)
			) : (
				<PresetGrid
					onOpen={(id) => {
						const p = PRESETS.find((x) => x.id === id)!;
						loadDoc(p.build());
						close();
					}}
				/>
			)}
		</Sheet>
	);
}

function SavedCard({ entry, current, onOpen, onChange }: { entry: LibraryEntry; current: boolean; onOpen: () => void; onChange: () => void }) {
	const [renaming, setRenaming] = useState(false);
	const [confirm, setConfirm] = useState(false);
	const { width, height } = entry.doc.scene;

	return (
		<ThumbCard>
			<Thumb src={entry.thumb} ratio={`${width} / ${height}`} current={current} onClick={onOpen} title="Open">
				{current && <ThumbBadge>Open</ThumbBadge>}
			</Thumb>
			<ThumbMeta sub={`${width}×${height} · ${ago(entry.updated)}`}>
				{renaming ? (
					<Field
						autoFocus
						
						defaultValue={entry.name}
						onBlur={async (e) => {
							const name = e.target.value.trim();
							setRenaming(false);
							if (name && name !== entry.name) {
								await putEntry({ ...entry, name, doc: { ...entry.doc, name } });
								onChange();
							}
						}}
						onKeyDown={(e) => {
							if (e.key === "Enter") (e.target as HTMLInputElement).blur();
							if (e.key === "Escape") {
								e.stopPropagation();
								setRenaming(false);
							}
						}}
					/>
				) : (
					<Tooltip>
						<TooltipTrigger asChild>
							<span className="label-xsmall-strong truncate text-strong" onDoubleClick={() => setRenaming(true)}>
								{entry.name}
							</span>
						</TooltipTrigger>
						<TooltipContent>Double-click to rename</TooltipContent>
					</Tooltip>
				)}
			</ThumbMeta>
			<ThumbActions>
				<IconButton
					size="xsmall"
					label="Duplicate"
					icon={<I.Copy />}
					onClick={async () => {
						const now = Date.now();
						await putEntry({ ...entry, id: newId(), name: `${entry.name} copy`, created: now, updated: now });
						onChange();
					}}
				/>
				<IconButton size="xsmall" label="Download .json" icon={<I.Download />} onClick={() => exportJSON({ name: entry.name, canvases: entry.project?.canvases ?? [entry.doc], active: entry.project?.active })} />
				<IconButton
					size="xsmall"
					label={confirm ? "Click again to delete" : "Delete"}
					sentiment={confirm ? "negative" : "neutral"}
					active={confirm}
					icon={<I.Bin />}
					onBlur={() => setConfirm(false)}
					onClick={async () => {
						if (!confirm) return setConfirm(true);
						await deleteEntry(entry.id);
						onChange();
					}}
				/>
			</ThumbActions>
		</ThumbCard>
	);
}

function PresetGrid({ onOpen }: { onOpen: (id: string) => void }) {
	const [, bump] = useState(0);
	const docs = useMemo(() => new Map(PRESETS.map((p) => [p.id, p.build()])), []);

	useEffect(() => {
		let alive = true;
		(async () => {
			for (const p of PRESETS) {
				if (presetThumbs.has(p.id)) continue;
				presetThumbs.set(p.id, await renderThumb(docs.get(p.id)!, 1.5));
				if (!alive) return;
				bump((n) => n + 1);
			}
		})();
		return () => {
			alive = false;
		};
	}, [docs]);

	return (
		<div className="flex flex-col gap-6xl">
			{(["Posters", "Illustrations", "Patterns"] as const).map((group) => (
				<section key={group} className="flex flex-col gap-xl">
					<h3 className="label-xsmall-strong uppercase tracking-wide text-weak">{group}</h3>
					<ThumbGrid>
						{PRESETS.filter((p) => p.group === group).map((p) => {
							const doc = docs.get(p.id)!;
							return (
								<ThumbCard key={p.id}>
									<Thumb src={presetThumbs.get(p.id)} ratio={`${doc.scene.width} / ${doc.scene.height}`} onClick={() => onOpen(p.id)} title="Start from this preset" />
									<ThumbMeta name={p.name} sub={`${doc.scene.width}×${doc.scene.height}`} />
								</ThumbCard>
							);
						})}
					</ThumbGrid>
				</section>
			))}
		</div>
	);
}
