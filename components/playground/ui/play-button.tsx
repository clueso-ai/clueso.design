"use client";

import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@/lib/design-system";
import { PauseIcon, PlayIcon } from "@/lib/design-system/icons";

// The one play button in the playground: the same one as the product timeline's transport (Jigsaw's
// GifTimeline), a filled play triangle or a pause, so playing anything looks the same everywhere.
// Icon-only by default, with a tooltip; pass `children` for a labelled version, like "Play beat".

export function PlayButton({ playing, onClick, disabled = false, label, children }: { playing: boolean; onClick: () => void; disabled?: boolean; label?: string; children?: React.ReactNode }) {
	const name = label ?? (playing ? "Pause" : "Play");
	const icon = playing ? <PauseIcon className="size-6 text-neutral-normal" /> : <PlayIcon className="size-6 text-neutral-normal" />;
	if (children) {
		return (
			<Button variant="outlined" sentiment="neutral" size="medium" iconBefore icon={icon} className="focus-ring" disabled={disabled} onClick={onClick}>
				{children}
			</Button>
		);
	}
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button variant="transparent" sentiment="neutral" size="small" iconOnly icon={icon} aria-label={name} className="focus-ring" disabled={disabled} onClick={onClick} />
			</TooltipTrigger>
			<TooltipContent side="bottom">{name}</TooltipContent>
		</Tooltip>
	);
}
