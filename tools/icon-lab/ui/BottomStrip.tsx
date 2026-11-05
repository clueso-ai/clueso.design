import { useState } from "react";
import { Button } from "@/lib/design-system/jigsaw/components/ui/controls/button/button";
import { cn } from "@/lib/design-system/jigsaw/lib/utils";
import { ICON_NORMAL } from "@/tools/shell/components/icon-button";
import { BottomBar, ToolbarDivider } from "@/tools/shell/panels";
import { pretty } from "../state/sets";
import { sizedSvg, useIconLab } from "../state/store";
import { I } from "./ci";
import { Svg } from "./controls";

/** Along the bottom: the icon at real sizes, and the prompt that finds or creates an icon. */
export function BottomStrip() {
	return (
		<BottomBar aria-label="Sizes and prompt" className="gap-md overflow-visible px-lg">
			<Ramp />
			<ToolbarDivider />
			<Prompt />
		</BottomBar>
	);
}

/** The current icon at real sizes, in the panel's ink. Each size sits centred with its label beside it. */
function Ramp() {
	useIconLab((s) => s.rev);
	const s = useIconLab.getState();
	return (
		<div aria-label="Sizes" className="flex shrink-0 items-center gap-lg">
			{[16, 20, 24, 32, 48].map((size) => (
				<span key={size} className="flex items-center gap-xs">
					<Svg markup={sizedSvg(s, s.current, size, "currentColor")} className="text-strong" />
					<span className="mono-xxsmall text-weak">{size}</span>
				</span>
			))}
		</div>
	);
}

// Search finds an icon in the set; when it isn't there, the tray offers to compose it from the set's
// parts (no API) or to request it from the design team.
function Prompt() {
	const [text, setText] = useState("");
	const prompt = useIconLab((s) => s.prompt);
	return (
		<div className="relative flex min-w-0 flex-1 justify-center">
			<Tray />
			<form
				className="flex h-[40px] w-full max-w-[560px] items-center gap-sm rounded-sm border border-weak bg-depth-inset-1 pr-2xs pl-md focus-within:border-brand-normal"
				onSubmit={(e) => {
					e.preventDefault();
					prompt(text);
				}}
			>
				<I.Search width={14} height={14} className="shrink-0 stroke-normal text-(color:--color-fg-icon-normal)" aria-hidden />
				<input
					type="text"
					value={text}
					onChange={(e) => setText(e.target.value)}
					placeholder="Find or create an icon, e.g. “add folder”, or draw one on the grid"
					autoComplete="off"
					aria-label="Find or create an icon"
					className="para-xsmall h-full min-w-0 flex-1 bg-transparent text-strong outline-none placeholder:text-weak"
				/>
				<Button type="submit" variant="filled" sentiment="brand" size="small" iconOnly icon={<I.ArrowRight className="-rotate-90" />} aria-label="Go" />
			</form>
		</div>
	);
}

/** What the prompt or a drawing found: matching icons as chips, and what to do next. */
function Tray() {
	const tray = useIconLab((s) => s.tray);
	const pickChip = useIconLab((s) => s.pickChip);
	const closeTray = useIconLab((s) => s.closeTray);
	useIconLab((s) => s.rev);
	const s = useIconLab.getState();
	if (!tray) return null;
	return (
		<div className="absolute bottom-[calc(100%+20px)] left-1/2 z-10 flex w-full max-w-[560px] -translate-x-1/2 flex-col gap-md rounded-md border border-weak bg-surface-elevated-1 p-lg shadow-elevation-2">
			<div className="flex min-h-[22px] items-start gap-md">
				<p className="label-xsmall-strong flex-1 text-strong">{tray.title}</p>
				<Button variant="transparent" sentiment="neutral" size="xsmall" iconOnly iconClassName={ICON_NORMAL} icon={<I.Cross />} aria-label="Close" onClick={closeTray} />
			</div>
			{tray.question && <p className="para-xsmall text-strong">{tray.question}</p>}
			{tray.sub && <p className="mono-xxsmall -mb-xs text-weak">{tray.sub}</p>}
			{tray.chips && tray.chips.length > 0 && (
				<div className="flex flex-wrap gap-xs">
					{tray.chips.map((ic, i) => (
						<button
							key={`${ic.name}:${i}`}
							type="button"
							title={ic.title || pretty(ic.name)}
							aria-pressed={tray.sel === i}
							onClick={() => pickChip(i)}
							className={cn(
								"flex flex-col items-center gap-2xs rounded-sm px-2xs pt-sm pb-xs text-strong shadow-[inset_0_0_0_1px_var(--color-fg-stroke-weak)] transition-colors hover:shadow-[inset_0_0_0_1px_var(--color-fg-stroke-normal)]",
								tray.small ? "w-[72px]" : "w-[80px]",
								tray.sel === i && "bg-interaction-selected-subtle shadow-[inset_0_0_0_1px_var(--color-fg-stroke-strong)]",
							)}
						>
							<Svg markup={sizedSvg(s, ic, 32, "currentColor")} />
							<span className="mono-xxsmall text-center leading-tight text-weak">{ic.label || ic.title || pretty(ic.name)}</span>
						</button>
					))}
				</div>
			)}
			{tray.note && <p className="para-xxsmall text-weak">{tray.note}</p>}
			{tray.actions.length > 0 && (
				<div className="flex flex-wrap items-center gap-sm">
					{tray.actions.map((a) => (
						<Button key={a.label} variant={a.primary ? "filled" : "outlined"} sentiment="neutral" size="small" disabled={a.keep && tray.kept} onClick={a.run}>
							{a.keep && tray.kept ? "Kept in Generated" : a.label}
						</Button>
					))}
				</div>
			)}
		</div>
	);
}
