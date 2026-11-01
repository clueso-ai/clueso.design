import React from "react";
import { checkerboardStyle } from "./color-utils";

type ColorSwatchProps = {
	type: "fill" | "stroke";
	color: string;
	isGradientMode: boolean;
	gradientType?: "linear" | "radial";
	gradientPreviewStyle: React.CSSProperties;
	withHexCode: boolean;
	withOpacity: boolean;
	showOpacityLabel: boolean;
	opacity: number;
	onOpacityChange?: (color: string, opacity: number) => void;
	onClick: () => void;
	triggerRef: React.RefObject<HTMLDivElement | null>;
};

export const ColorSwatch: React.FC<ColorSwatchProps> = ({
	type,
	color,
	isGradientMode,
	gradientType,
	gradientPreviewStyle,
	withHexCode,
	withOpacity,
	showOpacityLabel,
	opacity,
	onOpacityChange,
	onClick,
	triggerRef,
}) => {
	const showOpacityIndicator = !isGradientMode && opacity < 100;

	const solidStyle: React.CSSProperties =
		type === "stroke"
			? {
					borderColor: "var(--color-fg-stroke-weak)",
					borderWidth: 2,
					borderStyle: "solid",
				}
			: { backgroundColor: color ?? "transparent" };

	const swatchStyle: React.CSSProperties =
		isGradientMode && gradientPreviewStyle
			? gradientPreviewStyle
			: solidStyle;

	return (
		<div
			ref={triggerRef}
			className="flex items-center relative w-full h-[24px] rounded-xs border border-weak bg-depth-inset-1 hover:bg-interaction-hover-subtle transition-colors cursor-pointer select-none"
			onClick={onClick}
		>
			{/* Left section: swatch + hex */}
			<div
				className={`box-border flex gap-xs items-center h-full px-[5px] ${withHexCode ? "flex-1 min-w-0" : "shrink-0"}`}
			>
				{/* Color swatch with optional opacity indicator */}
				<div
					className="relative size-[14px] rounded-2xs shrink-0 border-[0.5px] border-normal box-border overflow-hidden"
					style={swatchStyle}
				>
					{showOpacityIndicator && (
						<div className="absolute top-0 right-0 w-[7px] h-full overflow-hidden rounded-r-[1.5px]">
							<div
								className="absolute inset-0"
								style={checkerboardStyle}
							/>
							<div
								className="absolute inset-0"
								style={{
									backgroundColor: color,
									opacity: opacity / 100,
								}}
							/>
						</div>
					)}
				</div>

				{/* Hex or gradient-type label */}
				{withHexCode && (
					<span
						className={`label-xsmall text-strong truncate ${isGradientMode ? "capitalize" : "uppercase"}`}
					>
						{isGradientMode
							? (gradientType ?? "linear")
							: (color?.replace("#", "") ?? "000000")}
					</span>
				)}
			</div>

			{/* Separator + opacity */}
			{showOpacityLabel && withOpacity && (
				<>
					<div
						className="h-[16px] w-px shrink-0"
						style={{
							backgroundColor: "var(--color-fg-stroke-weak)",
						}}
					/>
					<div
						className="box-border flex items-center justify-center h-full px-sm py-xs shrink-0 gap-[2px]"
						onClick={(e) => e.stopPropagation()}
					>
						<input
							type="number"
							className="gcp-num-input w-[28px] bg-transparent text-strong text-right label-xsmall outline-none"
							value={Math.round(opacity)}
							min={0}
							max={100}
							onChange={(e) => {
								const v = Math.max(
									0,
									Math.min(100, Number(e.target.value)),
								);
								if (!Number.isNaN(v))
									onOpacityChange?.(color || "#ffffff", v);
							}}
						/>
						<span className="label-xsmall text-strong shrink-0">
							%
						</span>
					</div>
				</>
			)}
		</div>
	);
};
