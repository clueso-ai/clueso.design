import { cn } from "../../../../lib/utils";

/**
 * ColorBox Component - Jigsaw Design System
 *
 * A color swatch that displays a color with optional opacity indicator.
 * When opacity is less than 100%, shows a checkerboard pattern on the right
 * half with the semi-transparent color overlaid.
 *
 * Size: 14px × 14px
 * Border: 0.5px stroke-normal
 * Border radius: 2px (radius-2xs)
 */

export interface ColorBoxProps {
	/** Color in hex format (e.g., "#FF0000") */
	color: string;
	/** Opacity value (0-100). When < 100, shows checkerboard pattern */
	opacity?: number;
	/** Additional class name */
	className?: string;
}

// CSS checkerboard pattern using linear gradients
const checkerboardStyle = {
	backgroundImage: `
		linear-gradient(45deg, #E5E5E5 25%, transparent 25%),
		linear-gradient(-45deg, #E5E5E5 25%, transparent 25%),
		linear-gradient(45deg, transparent 75%, #E5E5E5 75%),
		linear-gradient(-45deg, transparent 75%, #E5E5E5 75%)
	`,
	backgroundSize: "3.5px 3.5px",
	backgroundPosition: "0 0, 0 1.75px, 1.75px -1.75px, -1.75px 0px",
	backgroundColor: "white",
};

function ColorBox({ color, opacity = 100, className }: ColorBoxProps) {
	const showOpacityIndicator = opacity < 100;

	return (
		<div
			className={cn(
				"relative size-[14px] rounded-2xs shrink-0",
				"border-[0.5px] border-normal box-border overflow-hidden",
				className,
			)}
			style={{ backgroundColor: color }}
		>
			{showOpacityIndicator && (
				<div className="absolute top-0 right-0 w-[7px] h-full overflow-hidden rounded-r-[1.5px]">
					{/* Checkerboard pattern background */}
					<div
						className="absolute inset-0"
						style={checkerboardStyle}
					/>
					{/* Color overlay with opacity */}
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
	);
}

export { ColorBox };
