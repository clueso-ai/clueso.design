import EyeDropIcon from "@icons/icons/Editing Design/Eye-dropper.svg?react";
import React, { useEffect, useState } from "react";
import {
	type HslColor,
	type RgbColor,
	checkerboardStyle,
	hexToHsl,
	hexToRgb,
	hslToHex,
	rgbToHex,
} from "./color-utils";

type ColorFormat = "hex" | "rgb" | "hsl";

type ColorPickerControlsProps = {
	color: string;
	onColorChange: (color: string) => void;
	withEyedropper: boolean;
	isPickingColor: boolean;
	onEyedropperClick: (e: React.MouseEvent) => void;
	opacity?: number;
	onOpacityChange?: (opacity: number) => void;
};

const FORMAT_OPTIONS: ColorFormat[] = ["hex", "rgb", "hsl"];

/** Compact number input used for R/G/B/H/S/L/A channel fields */
const ChannelInput = ({
	label,
	value,
	min,
	max,
	onChange,
}: {
	label: string;
	value: number;
	min: number;
	max: number;
	onChange: (val: number) => void;
}) => (
	<div className="flex items-center gap-0.5 flex-1 min-w-0">
		<span className="text-weak text-[0.75rem] font-semibold shrink-0">
			{label}
		</span>
		<input
			type="number"
			className="gcp-num-input w-full bg-transparent text-strong text-[0.8rem] font-semibold text-center outline-none min-w-0"
			value={value}
			min={min}
			max={max}
			onChange={(e) => {
				const v = Math.max(min, Math.min(max, Number(e.target.value)));
				if (!Number.isNaN(v)) onChange(v);
			}}
		/>
	</div>
);

export const ColorPickerControls: React.FC<ColorPickerControlsProps> = ({
	color,
	onColorChange,
	withEyedropper,
	isPickingColor,
	onEyedropperClick,
	opacity,
	onOpacityChange,
}) => {
	const [colorFormat, setColorFormat] = useState<ColorFormat>("hex");
	const [hexInput, setHexInput] = useState(color?.toUpperCase() ?? "");

	const hex = color?.startsWith("#") ? color : `#${color ?? "000000"}`;
	const rgb: RgbColor = hexToRgb(hex);
	const hsl: HslColor = hexToHsl(hex);

	useEffect(() => {
		setHexInput(color?.toUpperCase() ?? "");
	}, [color]);

	const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = e.target.value;
		setHexInput(val);
		let hexVal = val.trim();
		if (!hexVal.startsWith("#")) hexVal = `#${hexVal}`;
		if (/^#[0-9a-fA-F]{6}$/.test(hexVal)) {
			onColorChange(hexVal.toLowerCase());
		}
	};

	const handleHexBlur = () => {
		let val = hexInput.trim();
		if (!val.startsWith("#")) val = `#${val}`;
		if (!/^#[0-9a-fA-F]{6}$/.test(val)) {
			setHexInput(color?.toUpperCase() ?? "");
		}
	};

	return (
		<div className="flex flex-col gap-2 mt-3">
			{/* Top row: eyedropper + format selector */}
			<div className="flex items-center gap-1.5">
				{withEyedropper && (
					<button
						type="button"
						title="Pick color from video"
						onClick={onEyedropperClick}
						className={`h-8 w-8 p-1 rounded-md cursor-pointer flex items-center justify-center transition-all duration-200 ${
							isPickingColor
								? "text-strong bg-depth-inset-2"
								: "text-normal bg-depth-inset-1 hover:text-strong hover:bg-depth-inset-2"
						}`}
					>
						<EyeDropIcon width="16" height="16" />
					</button>
				)}

				{/* Format toggle buttons */}
				<div className="flex gap-0.5">
					{FORMAT_OPTIONS.map((fmt) => (
						<button
							key={fmt}
							type="button"
							onClick={() => setColorFormat(fmt)}
							className={`px-2 py-0.5 rounded-2xs text-[0.7rem] font-semibold transition-all duration-150 ${
								colorFormat === fmt
									? "bg-depth-elevation-2 text-strong"
									: "text-weak hover:text-normal hover:bg-interaction-hover-subtle"
							}`}
						>
							{fmt.toUpperCase()}
						</button>
					))}
				</div>
			</div>

			{/* Value row */}
			<div className="flex items-center gap-1.5 mt-1">
				{/* Color preview swatch */}
				<div
					className="size-[24px] rounded-2xs border border-weak shrink-0 overflow-hidden relative"
					style={{ backgroundColor: hex }}
				>
					{opacity !== undefined && opacity < 100 && (
						<div className="absolute top-0 right-0 w-[12px] h-full overflow-hidden rounded-r-[1.5px]">
							<div
								className="absolute inset-0"
								style={checkerboardStyle}
							/>
							<div
								className="absolute inset-0"
								style={{
									backgroundColor: hex,
									opacity: opacity / 100,
								}}
							/>
						</div>
					)}
				</div>

				{colorFormat === "hex" && (
					<input
						className="gcp-num-input flex-1 min-w-0 px-1.5 py-1.5 bg-depth-inset-1 border border-weak rounded-md text-strong text-[0.75rem] font-semibold uppercase outline-none transition-all focus:bg-depth-inset-2"
						value={hexInput}
						onChange={handleHexChange}
						onBlur={handleHexBlur}
						maxLength={7}
						placeholder="#000000"
					/>
				)}

				{colorFormat === "rgb" && (
					<div className="flex items-center gap-1 flex-1 bg-depth-inset-1 px-1.5 py-1.5 rounded-md">
						<ChannelInput
							label="R"
							value={rgb.r}
							min={0}
							max={255}
							onChange={(v) =>
								onColorChange(rgbToHex(v, rgb.g, rgb.b))
							}
						/>
						<ChannelInput
							label="G"
							value={rgb.g}
							min={0}
							max={255}
							onChange={(v) =>
								onColorChange(rgbToHex(rgb.r, v, rgb.b))
							}
						/>
						<ChannelInput
							label="B"
							value={rgb.b}
							min={0}
							max={255}
							onChange={(v) =>
								onColorChange(rgbToHex(rgb.r, rgb.g, v))
							}
						/>
					</div>
				)}

				{colorFormat === "hsl" && (
					<div className="flex items-center gap-1 flex-1 bg-depth-inset-1 px-1.5 py-1.5 rounded-md">
						<ChannelInput
							label="H"
							value={hsl.h}
							min={0}
							max={360}
							onChange={(v) =>
								onColorChange(
									hslToHex({ h: v, s: hsl.s, l: hsl.l }),
								)
							}
						/>
						<ChannelInput
							label="S"
							value={hsl.s}
							min={0}
							max={100}
							onChange={(v) =>
								onColorChange(
									hslToHex({ h: hsl.h, s: v, l: hsl.l }),
								)
							}
						/>
						<ChannelInput
							label="L"
							value={hsl.l}
							min={0}
							max={100}
							onChange={(v) =>
								onColorChange(
									hslToHex({ h: hsl.h, s: hsl.s, l: v }),
								)
							}
						/>
					</div>
				)}

				{onOpacityChange && opacity !== undefined && (
					<div className="w-14 shrink-0">
						<div className="flex items-center bg-depth-inset-1 px-1.5 py-1.5 rounded-md gap-0.5">
							<input
								type="number"
								className="gcp-num-input w-full bg-transparent text-strong text-[0.8rem] font-semibold text-center outline-none"
								value={Math.round(opacity)}
								min={0}
								max={100}
								onChange={(e) => {
									const v = Math.max(
										0,
										Math.min(100, Number(e.target.value)),
									);
									if (!Number.isNaN(v)) onOpacityChange(v);
								}}
							/>
							<span className="text-weak text-xs font-medium shrink-0">
								%
							</span>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
