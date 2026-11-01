import { cn } from "../../../../lib/utils";

export interface EyedropperPreviewProps {
	color: string;
	position: { x: number; y: number };
	visible: boolean;
	className?: string;
}

function EyedropperPreview({
	color,
	position,
	visible,
	className,
}: EyedropperPreviewProps) {
	if (!visible) return null;

	return (
		<div
			className={cn(
				"fixed z-[999999999] bg-[rgba(20,20,30,0.95)] border border-white/10 rounded-md px-2xl py-xl flex items-center gap-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] pointer-events-none backdrop-blur-[10px]",
				className,
			)}
			style={{
				left: `${position.x + 20}px`,
				top: `${position.y + 20}px`,
			}}
		>
			{/* Color swatch */}
			<div
				className="w-8 h-8 rounded-sm border-2 border-white/20"
				style={{ background: color }}
			/>

			{/* Text container */}
			<div className="flex flex-col gap-2xs">
				<div className="text-white/60 text-[11px] font-medium whitespace-nowrap tracking-[0.5px]">
					CLICK TO SELECT
				</div>
				<div className="text-white text-sm font-semibold font-mono">
					{color.toUpperCase()}
				</div>
			</div>
		</div>
	);
}

export { EyedropperPreview };
