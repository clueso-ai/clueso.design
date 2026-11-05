import { Tooltip, TooltipContent, TooltipTrigger } from "@/lib/design-system/jigsaw/components/ui/overlays/tooltip/tooltip";
import { cn } from "@/lib/design-system/jigsaw/lib/utils";
import { Segmented } from "@/tools/shell/components/controls";
import { LeftPanel } from "@/tools/shell/panels";
import { buildSvg } from "../engine/engine";
import type { Icon } from "../engine/types";
import { pretty, signatureOf } from "../state/sets";
import { drawOptions, type Mode, useIconLab, visibleIcons } from "../state/store";
import { Svg } from "./controls";

/** The library: the set tabs, then every icon of the set in view. Click one to put it on the artboard. */
export function LibraryPanel() {
	const mode = useIconLab((s) => s.mode);
	const sig = useIconLab((s) => s.sig);
	const style = useIconLab((s) => s.style);
	const generated = useIconLab((s) => s.generated);
	const showGenerated = useIconLab((s) => s.showGenerated);
	const setMode = useIconLab((s) => s.setMode);
	useIconLab((s) => s.libRev);
	const state = useIconLab.getState();
	const icons = visibleIcons(state);
	const generatedView = mode === "generated";
	const styleName = style === "line" ? "Line" : "Solid";
	const tabName = mode === "platform" ? "Platform" : "Web";
	const set = mode !== "pixel" && sig ? signatureOf(sig) : null;
	const title = generatedView ? `Generated · ${styleName}` : mode === "pixel" ? "Pixel · web" : set ? `Style ${set.label}` : `${tabName} · ${styleName}`;
	const note =
		mode === "pixel"
			? "Pixel direction, for the website only (the platform stays on the base set). Dot matrix: drawn from the base line set, round dots of one size on a 14 × 14 grid, shapes solid with their details knocked out. Other constructions, dot size and corners are in the panel."
			: set
				? `${set.idea} A sample to compare with the base set: click an icon, then Context to see it on clueso.io and in the product.`
				: "";
	// A signature sample is on show: neither Web nor Platform is the tab in view.
	const tab = set ? "" : mode;
	const tabs: { value: Mode | ""; label: string; tooltip?: string }[] = [
		{ value: "web", label: "Web" },
		{ value: "platform", label: "Platform" },
		{ value: "pixel", label: "Pixel", tooltip: "Pixel direction, website only" },
		...(showGenerated ? [{ value: "generated" as Mode, label: generated.length ? `Generated · ${generated.length}` : "Generated" }] : []),
	];

	return (
		<LeftPanel aria-label="Icon library">
			<div className="flex h-[40px] shrink-0 items-center border-b border-weak px-sm">
				{/* Remounted when no tab is in view, so the active marker doesn't stay on the last one. */}
				<Segmented key={tab ? "tab" : "none"} label="Library" value={tab} options={tabs} onChange={(v) => v && setMode(v)} />
			</div>
			<div className="flex shrink-0 items-center justify-between px-xl pt-lg pb-2xs">
				<h2 className="label-small-strong text-strong">{title}</h2>
				<span className="mono-xxsmall text-weak">{icons.length} icons</span>
			</div>
			<div className="min-h-0 flex-1 overflow-y-auto px-md pt-sm pb-md">
				{note && <p className="para-xxsmall mx-2xs mb-md text-weak">{note}</p>}
				{generatedView && !icons.length ? (
					<p className="para-xsmall mx-2xs mt-md text-weak">Nothing kept yet. Type an icon the set doesn’t have in the prompt (e.g. “AI folder”), choose Yes, create it, and keep the options you like.</p>
				) : (
					<div className="grid grid-cols-6 gap-[2px]">
						{icons.map((icon, i) => (
							<Cell key={`${icon.id ?? icon.name}:${i}`} icon={icon} generatedView={generatedView} />
						))}
					</div>
				)}
			</div>
		</LeftPanel>
	);
}

function Cell({ icon, generatedView }: { icon: Icon; generatedView: boolean }) {
	const selected = useIconLab((s) => s.current === icon);
	const select = useIconLab((s) => s.select);
	const state = useIconLab.getState();
	// Thumbnails use the panel's ink, not the artboard colour.
	const markup = buildSvg(icon, { ...drawOptions(state), color: "currentColor" });
	const hint = icon.googleOnly
		? `${pretty(icon.name)} · not drawn in our style yet`
		: generatedView && icon.prompt
			? `${pretty(icon.name)} · “${icon.prompt}”`
			: icon.site
				? `${pretty(icon.name)} · replaces ${icon.replaces}`
				: pretty(icon.name);
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					aria-label={pretty(icon.name)}
					aria-pressed={selected}
					className={cn(
						"flex aspect-square items-center justify-center rounded-xs text-strong transition-colors hover:bg-interaction-hover-subtle",
						selected && "bg-interaction-selected-subtle shadow-[inset_0_0_0_1px_var(--color-fg-stroke-normal)]",
					)}
					onClick={() => select(icon)}
				>
					<Svg markup={markup} className="pointer-events-none [&>svg]:size-[20px]" />
				</button>
			</TooltipTrigger>
			<TooltipContent>{hint}</TooltipContent>
		</Tooltip>
	);
}
