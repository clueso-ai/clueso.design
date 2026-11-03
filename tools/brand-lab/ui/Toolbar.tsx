import { I } from "./ci";
import { useRef, useState } from "react";
import { ICON_NORMAL, IconButton } from "@/tools/shell/components/icon-button";
import { MenuItem, MenuLabel, MenuSeparator, Popover, PopoverContent, PopoverTrigger } from "../components/popover";
import { Button } from "@/lib/design-system/jigsaw/components/ui/controls/button/button";
import { Field } from "../components/field";
import { Kbd } from "@/lib/design-system/jigsaw/components/ui/primitives/kbd/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/lib/design-system/jigsaw/components/ui/overlays/tooltip/tooltip";
import { cn } from "@/lib/design-system/jigsaw/lib/utils";
import { canExportVideo, copyImage, exportBundle, exportFrames, exportGIF, exportImage, exportJSON, exportMP4, readJSON } from "../export";
import { defaultScene } from "../state/doc";
import { useStore } from "../state/store";
import { VARIATION_MODES } from "../state/variations";
import { ToolbarDivider } from "@/tools/shell/panels";
import { Row, Segmented } from "./controls";
import { BAR, GAP, M, timelineRight, usePanels } from "./layout";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const mod = isMac ? "⌘" : "Ctrl";

// clueso.design: the top bar's two groups, the mark and the name now come from the tool shell
// (tools/shell). Brand Lab fills them with ToolbarStart and ToolbarEnd.

/** Top left, after the mark and name: project menu, save, undo and redo. */
export function ToolbarStart() {
	const canUndo = useStore((s) => s.past.length > 0);
	const canRedo = useStore((s) => s.future.length > 0);
	const undo = useStore((s) => s.undo);
	const redo = useStore((s) => s.redo);

	return (
		<>
			<ProjectMenu />
			<SaveButton />
			<ToolbarDivider />
			<IconButton label="Undo" shortcut={[mod, "Z"]} icon={<I.Undo />} disabled={!canUndo} onClick={undo} />
			<IconButton label="Redo" shortcut={[mod, "⇧", "Z"]} icon={<I.Redo />} disabled={!canRedo} onClick={redo} />
		</>
	);
}

/** Top right: theme, library, variations, shuffle and export. */
export function ToolbarEnd() {
	const theme = useStore((s) => s.theme);
	const setTheme = useStore((s) => s.setTheme);

	return (
		<>
			<IconButton variant="outlined" label={theme === "light" ? "Dark interface" : "Light interface"} icon={theme === "light" ? <I.Moon /> : <I.Sun />} onClick={() => setTheme(theme === "light" ? "dark" : "light")} />
			<LibraryButton />
			<VariationsButton />
			<ShuffleButton />
			<ExportMenu />
		</>
	);
}

/** Zoom readout chip above the timeline's right end; opens zoom commands. */
export function ZoomChip({ fitScale }: { fitScale: number }) {
	const zoom = useStore((s) => s.zoom);
	const setZoom = useStore((s) => s.setZoom);
	const [open, setOpen] = useState(false);
	const rightW = usePanels((s) => s.right);
	const snapping = useStore((s) => s.snapping);
	const toggleSnapping = useStore((s) => s.toggleSnapping);
	const scale = zoom === "fit" ? fitScale : zoom;
	const step = (f: number) => setZoom(Math.min(8, Math.max(0.05, scale * f)));
	const item = (label: string, keys: string[], run: () => void, icon: React.ReactNode, checked = false) => (
		<MenuItem
			icon={icon}
			trailing={
				<span className="flex items-center gap-xs">
					{keys.map((k) => (
						<Kbd key={k}>{k}</Kbd>
					))}
					<I.Check width={14} height={14} className={cn("text-brand-normal", !checked && "invisible")} />
				</span>
			}
			onClick={run}
		>
			{label}
		</MenuItem>
	);
	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					type="button"
					className="label-xsmall absolute flex h-[24px] items-center gap-2xs rounded-xs border border-weak bg-surface-elevated-1 pr-xs pl-sm font-mono text-strong transition-colors hover:bg-interaction-hover-subtle max-[1099px]:hidden"
					style={{ right: timelineRight(rightW), bottom: M + BAR + GAP }}
					aria-label="Zoom"
				>
					{Math.round(scale * 100)}%
					<I.ChevronDown width={13} height={13} className="text-normal" />
				</button>
			</PopoverTrigger>
			<PopoverContent side="top" align="end" className="w-[220px] gap-2xs p-xs">
				{item("Zoom in", ["+"], () => step(1.25), <I.ZoomIn />)}
				{item("Zoom out", ["−"], () => step(1 / 1.25), <I.ZoomOut />)}
				<MenuSeparator />
				{item("Zoom to fit", ["0"], () => setZoom("fit"), <I.Fit />, zoom === "fit")}
				{item("Actual size", [], () => setZoom(1), <I.Frame />, zoom === 1)}
				<MenuSeparator />
				{item("Snapping", ["⇧", "⌘", "'"], toggleSnapping, <I.AlignHCenter />, snapping)}
			</PopoverContent>
		</Popover>
	);
}

function SaveButton() {
	const saved = useStore((s) => s.saved);
	const clean = useStore((s) => !!s.saved && s.saved.canvases === s.canvases);
	const saveToLibrary = useStore((s) => s.saveToLibrary);
	const label = clean ? "Saved in Library" : saved ? "Save changes to Library" : "Save to Library";
	return (
		<span className="relative inline-flex">
			<IconButton label={label} shortcut={[mod, "S"]} active={clean} icon={clean ? <I.BookmarkFilled /> : <I.Bookmark />} onClick={() => saveToLibrary()} />
			{saved && !clean && <span className="pointer-events-none absolute top-[5px] right-[5px] size-[6px] rounded-full bg-brand-normal" aria-hidden />}
		</span>
	);
}

function LibraryButton() {
	const setOverlay = useStore((s) => s.setOverlay);
	return (
		<IconButton variant="outlined" label="Library: saved frames and presets" shortcut={["L"]} icon={<I.Library />} onClick={() => setOverlay("library")} />
	);
}

function VariationsButton() {
	const setOverlay = useStore((s) => s.setOverlay);
	return (
		<IconButton variant="outlined" label="Variations and styles" shortcut={["E"]} icon={<I.Grid />} onClick={() => setOverlay("explore")} />
	);
}

function ShuffleButton() {
	const mode = useStore((s) => s.shuffleMode);
	const setMode = useStore((s) => s.setShuffleMode);
	const shuffleAll = useStore((s) => s.shuffleAll);
	const [open, setOpen] = useState(false);
	const current = VARIATION_MODES.find((m) => m.value === mode) ?? VARIATION_MODES.find((m) => m.value === "pattern")!;
	return (
		<div className="flex items-center">
			<Tooltip>
				<TooltipTrigger asChild>
					<Button variant="outlined" sentiment="neutral" size="small" iconBefore iconClassName={ICON_NORMAL} icon={<I.Shuffle />} className="rounded-r-none" onClick={() => shuffleAll()}>
						{current.label}
					</Button>
				</TooltipTrigger>
				<TooltipContent shortcut={["S"]}>Shuffle: {current.hint.toLowerCase()}</TooltipContent>
			</Tooltip>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button iconClassName={ICON_NORMAL} variant="outlined" sentiment="neutral" size="small" iconOnly icon={<I.ChevronDown />} className="-ml-px w-[22px] rounded-l-none" aria-label="Shuffle mode" />
				</PopoverTrigger>
				<PopoverContent align="end" className="w-[300px] gap-2xs p-xs">
					<MenuLabel className="pb-xs">Shuffle what</MenuLabel>
					{VARIATION_MODES.map((m) => (
						<MenuItem
							key={m.value}
							role="menuitemradio"
							aria-checked={m.value === mode}
							description={m.hint}
							trailing={
								<span className="flex items-center gap-xs">
									{m.key && <Kbd>{m.key}</Kbd>}
									<I.Check width={14} height={14} className={cn("text-brand-normal", m.value !== mode && "invisible")} />
								</span>
							}
							// Choosing a mode only switches it; the Shuffle button (or S) then shuffles in that mode.
							onClick={() => {
								setMode(m.value);
								setOpen(false);
							}}
						>
							{m.label}
						</MenuItem>
					))}
				</PopoverContent>
			</Popover>
		</div>
	);
}

function ProjectMenu() {
	const [open, setOpen] = useState(false);
	const loadDoc = useStore((s) => s.loadDoc);
	const loadProject = useStore((s) => s.loadProject);
	const saveToLibrary = useStore((s) => s.saveToLibrary);
	const setOverlay = useStore((s) => s.setOverlay);
	const doc = useStore((s) => s.doc);
	const projectName = useStore((s) => s.projectName);
	const setProjectName = useStore((s) => s.setProjectName);
	const file = useRef<HTMLInputElement>(null);
	const [error, setError] = useState<string | null>(null);
	const run = (fn: () => void) => () => {
		fn();
		setOpen(false);
	};

	return (
		<>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button variant="transparent" sentiment="neutral" size="small" dropdown className="max-w-[180px]">
						<span className="block max-w-[130px] truncate">{projectName || "Untitled"}</span>
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-[260px] gap-2xs p-xs">
					<label className="flex flex-col gap-xs px-sm pt-xs pb-sm">
						<span className="label-xxsmall-strong uppercase tracking-wide text-weak">Name</span>
						<Field
							key={projectName}
							size="small"
							defaultValue={projectName}
							aria-label="Design name"
							onBlur={(e) => {
								const name = e.target.value.trim();
								if (name && name !== projectName) setProjectName(name);
							}}
							onKeyDown={(e) => {
								if (e.key === "Enter") (e.target as HTMLInputElement).blur();
							}}
						/>
					</label>
					<MenuSeparator />
					<MenuItem icon={<I.FilePlus />} onClick={run(() => loadDoc({ version: 1, name: "Untitled", scene: { ...defaultScene(), palette: doc.scene.palette }, layers: [] }))}>
						New project
					</MenuItem>
					<MenuItem icon={<I.Folder />} onClick={() => file.current?.click()}>
						Open .json…
					</MenuItem>
					<MenuItem icon={<I.Download />} onClick={run(() => exportJSON({ name: projectName, canvases: useStore.getState().canvases, active: useStore.getState().active }))}>
						Download .json
					</MenuItem>
					{error && <p className="para-xxsmall px-sm text-negative-normal">{error}</p>}
					<MenuSeparator />
					<MenuItem icon={<I.Bookmark />} onClick={run(() => saveToLibrary({ asNew: true }))}>
						Save as new in Library
					</MenuItem>
					<MenuItem icon={<I.Library />} onClick={run(() => setOverlay("library"))}>
						Library and presets…
					</MenuItem>
				</PopoverContent>
			</Popover>
			<input
				ref={file}
				type="file"
				accept="application/json,.json"
				hidden
				onChange={async (e) => {
					const f = e.target.files?.[0];
					e.target.value = "";
					if (!f) return;
					try {
						loadProject(await readJSON(f));
						setError(null);
						setOpen(false);
					} catch (err) {
						setError(err instanceof Error ? err.message : "Could not open file");
					}
				}}
			/>
		</>
	);
}

type Format = "png" | "jpeg" | "webp" | "mp4" | "gif" | "frames";

const STILLS: { value: Format; label: string }[] = [
	{ value: "png", label: "PNG" },
	{ value: "jpeg", label: "JPG" },
	{ value: "webp", label: "WebP" },
];
const LOOPS: { value: Format; label: string }[] = [
	{ value: "mp4", label: "MP4" },
	{ value: "gif", label: "GIF" },
	{ value: "frames", label: "PNG frames" },
];

const NOTES: Record<Format, string> = {
	png: "Lossless, keeps transparency",
	jpeg: "Smallest file, no transparency",
	webp: "Small, keeps transparency",
	mp4: "H.264, seamless loop",
	gif: "Loops anywhere: Slack, email, docs",
	frames: "Numbered PNGs in a .zip, with alpha",
};

function ExportMenu() {
	const [open, setOpen] = useState(false);
	const doc = useStore((s) => s.doc);
	const canvases = useStore((s) => s.canvases);
	const projectName = useStore((s) => s.projectName);
	const [scope, setScope] = useState<"one" | "all">("one");
	const all = scope === "all" && canvases.length > 1;
	const [kind, setKind] = useState<"still" | "loop">("still");
	const [still, setStill] = useState<Format>("png");
	const [loop, setLoop] = useState<Format>("mp4");
	const [scale, setScale] = useState(1);
	const [loops, setLoops] = useState(1);
	const [gifFps, setGifFps] = useState(20);
	const [progress, setProgress] = useState<number | null>(null);
	const [copied, setCopied] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const abort = useRef<AbortController | null>(null);
	const format = kind === "still" ? still : loop;
	const w = Math.round(doc.scene.width * scale);
	const h = Math.round(doc.scene.height * scale);
	const video = canExportVideo();
	const fps = format === "gif" ? gifFps : doc.scene.fps;
	const frames = Math.round(doc.scene.duration * loops * fps);

	const run = async (copy = false) => {
		setError(null);
		const { time } = useStore.getState();
		abort.current = new AbortController();
		const opts = { scale, fps, loops, onProgress: setProgress, signal: abort.current.signal };
		try {
			setProgress(0);
			const one = async (d: typeof doc, onProgress: (p: number) => void) => {
				const o = { ...opts, onProgress };
				const dw = d.scene.width * scale;
				const dh = d.scene.height * scale;
				if (format === "png" || format === "jpeg" || format === "webp") await exportImage(d, time, scale, format);
				else if (format === "mp4") await exportMP4(d, { ...o, fps: d.scene.fps, bitrateMbps: Math.min(60, Math.max(8, (dw * dh) / 1e5)) });
				else if (format === "gif") await exportGIF(d, o);
				else await exportFrames(d, o);
			};
			if (copy) {
				await copyImage(doc, time, scale);
				setCopied(true);
				setTimeout(() => setCopied(false), 1600);
			} else if (all) {
				// Each canvas in turn, named after the canvas, zipped into one download.
				await exportBundle(projectName, async () => {
					for (let i = 0; i < canvases.length; i++) await one(canvases[i], (p) => setProgress((i + p) / canvases.length));
				});
			} else await one(doc, setProgress);
		} catch (e) {
			if (!(e instanceof DOMException && e.name === "AbortError")) setError(e instanceof Error ? e.message : String(e));
		} finally {
			setProgress(null);
			abort.current = null;
		}
	};

	const busy = progress !== null;
	const tooBig = format === "gif" && w * h > 1600 * 1600;

	return (
		<Popover open={open} onOpenChange={(o) => (o || !busy) && setOpen(o)}>
			<PopoverTrigger asChild>
				<Button variant="filled" sentiment="brand" size="small" iconBefore icon={<I.Download />}>
					Export
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-[320px] gap-lg p-lg">
				{canvases.length > 1 && (
					<Segmented
						label="Canvases to export"
						className="w-full [&>*]:flex-1"
						value={scope}
						options={[
							{ value: "one", label: "This canvas" },
							{ value: "all", label: `All ${canvases.length}` },
						]}
						onChange={setScope}
					/>
				)}
				<Segmented
					label="Export type"
					className="w-full [&>*]:flex-1"
					value={kind}
					options={[
						{ value: "still", label: "Still" },
						{ value: "loop", label: "Loop" },
					]}
					onChange={setKind}
				/>
				<div className="flex flex-col gap-md">
					<Row label="Format">
						{kind === "still" ? <Segmented label="Image format" value={still} options={STILLS} onChange={setStill} /> : <Segmented label="Loop format" value={loop} options={LOOPS} onChange={setLoop} />}
					</Row>
					<Row label="Scale">
						<Segmented label="Scale" value={scale} options={[0.5, 1, 2, 4].map((s) => ({ value: s, label: `${s}×` }))} onChange={setScale} />
					</Row>
					{kind === "loop" && (
						<Row label="Loops">
							<Segmented label="Loops" value={loops} options={[1, 2, 4].map((n) => ({ value: n, label: `${n}` }))} onChange={setLoops} />
						</Row>
					)}
					{format === "gif" && (
						<Row label="Frame rate">
							<Segmented label="GIF frame rate" value={gifFps} options={[10, 20, 25].map((n) => ({ value: n, label: `${n}` }))} onChange={setGifFps} />
						</Row>
					)}
				</div>
				<div className="flex flex-col gap-2xs rounded-sm bg-depth-inset-1 px-md py-sm">
					<p className="mono-xxsmall text-strong">
						{all ? `${canvases.length} canvases, each at its own size · .zip` : `${w} × ${h}`}
						{all ? "" : kind === "loop" ? ` · ${(doc.scene.duration * loops).toFixed(1)}s · ${fps} fps · ${frames} frames` : " · current frame"}
					</p>
					<p className="para-xxsmall text-weak">{NOTES[format]}</p>
				</div>
				{tooBig && <p className="para-xxsmall text-warning-normal">Large GIFs get heavy. Try 0.5× for sharing.</p>}
				{format === "mp4" && !video ? (
					<p className="para-xxsmall text-negative-normal">This browser can't encode video. Use Chrome, Edge or Safari 17+.</p>
				) : busy ? (
					<div className="flex flex-col gap-md">
						<div className="h-[6px] overflow-hidden rounded-full bg-depth-inset-2">
							<div className="h-full rounded-full bg-brand-normal transition-[width] duration-150" style={{ width: `${Math.round(progress * 100)}%` }} />
						</div>
						{kind === "loop" && (
							<Button variant="outlined" sentiment="neutral" size="small" onClick={() => abort.current?.abort()}>
								Cancel · {Math.round(progress * 100)}%
							</Button>
						)}
					</div>
				) : (
					<div className="flex gap-md">
						<Button variant="filled" sentiment="brand" size="medium" className="flex-1" iconBefore icon={<I.Download />} onClick={() => run()}>
							Export {all ? `${canvases.length} × ` : ""}
							{[...STILLS, ...LOOPS].find((f) => f.value === format)?.label}
						</Button>
						{kind === "still" && !all && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button iconClassName={ICON_NORMAL} variant="outlined" sentiment="neutral" size="medium" iconBefore icon={copied ? <I.Check /> : <I.Copy />} onClick={() => run(true)}>
										{copied ? "Copied" : "Copy"}
									</Button>
								</TooltipTrigger>
								<TooltipContent>Copy the frame as PNG</TooltipContent>
							</Tooltip>
						)}
					</div>
				)}
				{error && <p className="para-xxsmall text-negative-normal">{error}</p>}
			</PopoverContent>
		</Popover>
	);
}
