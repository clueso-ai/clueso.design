import EyeDropIcon from "@icons/icons/Editing Design/Eye-dropper.svg?react";
import CrossIcon from "@icons/icons/Mathematics/Cross.svg?react";
import React, {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Button } from "../../controls/button/button";
import { WrappedSelect } from "../../controls/select/select";
import { HueSlider, OpacitySlider, SaturationPanel } from "./color-primitives";
import { hexToHsl, hexToHsv, hexToRgb, hsvToHex } from "./color-utils";

type ColorFormat = "hex" | "rgb" | "hsl";
const FORMAT_OPTIONS: ColorFormat[] = ["hex", "rgb", "hsl"];

type StopPickerPopoverProps = {
	stopColor: string;
	onColorChange: (color: string) => void;
	stopOpacity: number;
	onOpacityChange: (opacity: number) => void;
	withEyedropper: boolean;
	isPickingColor: boolean;
	onEyedropperClick: (e: React.MouseEvent) => void;
	position: { top: number; left: number; triggerLeft: number };
	stopPickerRef: React.RefObject<HTMLDivElement | null>;
	isOpen: boolean;
	onAnimationEnd: () => void;
	onClose?: () => void;
};

const POPOVER_PADDING = 8;

export const StopPickerPopover: React.FC<StopPickerPopoverProps> = ({
	stopColor,
	onColorChange,
	stopOpacity,
	onOpacityChange,
	withEyedropper,

	onEyedropperClick,
	position,
	stopPickerRef,
	isOpen,
	onAnimationEnd,
	onClose,
}) => {
	const [adjustedPosition, setAdjustedPosition] = useState<{
		top: number;
		left: number;
		transformOrigin: string;
	}>({ top: position.top, left: position.left, transformOrigin: "top left" });

	useLayoutEffect(() => {
		if (!stopPickerRef.current || !isOpen) return;

		const rect = stopPickerRef.current.getBoundingClientRect();
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;

		let newTop = position.top;
		let newLeft = position.left;
		let originX = "left";
		let originY = "top";

		if (position.left + rect.width > viewportWidth - POPOVER_PADDING) {
			newLeft = position.triggerLeft - rect.width - POPOVER_PADDING;
			originX = "right";
		}

		if (position.top + rect.height > viewportHeight - POPOVER_PADDING) {
			newTop = viewportHeight - rect.height - POPOVER_PADDING;
			originY = "bottom";
		}

		if (newLeft < POPOVER_PADDING) {
			newLeft = POPOVER_PADDING;
			originX = "left";
		}

		if (newTop < POPOVER_PADDING) {
			newTop = POPOVER_PADDING;
			originY = "top";
		}

		setAdjustedPosition({
			top: newTop,
			left: newLeft,
			transformOrigin: `${originY} ${originX}`,
		});
	}, [position, isOpen, stopPickerRef]);

	const popoverStyle = useMemo(
		(): React.CSSProperties => ({
			position: "fixed",
			top: adjustedPosition.top,
			left: adjustedPosition.left,
			zIndex: 99999999,
			transformOrigin: adjustedPosition.transformOrigin,
		}),
		[adjustedPosition],
	);

	// --- HSV state for saturation panel ---
	const hsv = hexToHsv(stopColor);
	const hueRef = useRef(hsv.h);
	if (hsv.s > 0) hueRef.current = hsv.h;
	const stableHue = hsv.s === 0 ? hueRef.current : hsv.h;

	const onColorChangeRef = useRef(onColorChange);
	onColorChangeRef.current = onColorChange;
	const opacityRef = useRef(stopOpacity);
	opacityRef.current = stopOpacity;
	const colorRef = useRef(stopColor);
	colorRef.current = stopColor;
	const hsvRef = useRef(hsv);
	hsvRef.current = hsv;

	const handleSatChange = useCallback((s: number, v: number) => {
		onColorChangeRef.current(hsvToHex({ h: hueRef.current, s, v }));
	}, []);

	const handleHueChange = useCallback((h: number) => {
		hueRef.current = h;
		onColorChangeRef.current(
			hsvToHex({ h, s: hsvRef.current.s, v: hsvRef.current.v }),
		);
	}, []);

	const handleOpSliderChange = useCallback(
		(o: number) => {
			onOpacityChange(o);
		},
		[onOpacityChange],
	);

	// --- Color format state ---
	const [colorFormat, setColorFormat] = useState<ColorFormat>("hex");
	const [hexInput, setHexInput] = useState(
		stopColor?.replace("#", "").toUpperCase() ?? "",
	);

	useEffect(() => {
		setHexInput(stopColor?.replace("#", "").toUpperCase() ?? "");
	}, [stopColor]);

	const hex = stopColor?.startsWith("#")
		? stopColor
		: `#${stopColor ?? "000000"}`;
	const rgb = hexToRgb(hex);
	const hsl = hexToHsl(hex);

	const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		// Strip `#` and cap at 6 so pastes like "#144665" aren't truncated by maxLength.
		const val = e.target.value.replace(/#/g, "").slice(0, 6);
		setHexInput(val);
		if (/^[0-9a-fA-F]{6}$/.test(val)) {
			onColorChange(`#${val.toLowerCase()}`);
		}
	};

	const handleHexBlur = () => {
		let val = hexInput.trim();
		if (!val.startsWith("#")) val = `#${val}`;
		if (!/^#[0-9a-fA-F]{6}$/.test(val)) {
			setHexInput(stopColor?.replace("#", "").toUpperCase() ?? "");
		}
	};

	const renderColorValueInputs = () => {
		if (colorFormat === "hex") {
			return (
				<input
					className="gcp-num-input flex-1 min-w-0 bg-transparent text-strong label-xsmall outline-none uppercase"
					value={hexInput}
					onChange={handleHexInputChange}
					onBlur={handleHexBlur}
					maxLength={7}
					placeholder="000000"
				/>
			);
		}
		if (colorFormat === "rgb") {
			return (
				<span className="label-xsmall text-strong truncate">
					{rgb.r}, {rgb.g}, {rgb.b}
				</span>
			);
		}
		return (
			<span className="label-xsmall text-strong truncate">
				{hsl.h}°, {hsl.s}%, {hsl.l}%
			</span>
		);
	};

	return (
		<div
			ref={stopPickerRef}
			className={`w-[240px] rounded-md border border-weak bg-surface overflow-clip will-change-transform text-strong shadow-[0px_8px_24px_rgba(0,0,0,0.24)] ${
				isOpen
					? "animate-[gcpSlideIn_200ms_cubic-bezier(0.16,1,0.3,1)]"
					: "animate-[gcpSlideOut_150ms_cubic-bezier(0.16,1,0.3,1)_forwards]"
			}`}
			style={popoverStyle}
			onClick={(e) => e.stopPropagation()}
			onAnimationEnd={onAnimationEnd}
		>
			{/* Header — label + close */}
			{onClose && (
				<div className="flex items-center justify-between px-lg pt-sm">
					<span className="label-xsmall-strong text-normal">
						Solid
					</span>
					<Button
						variant="transparent"
						sentiment="neutral"
						size="xsmall"
						iconOnly
						icon={<CrossIcon />}
						onClick={onClose}
					/>
				</div>
			)}
			<div className="flex flex-col gap-sm px-lg pt-xs pb-2xl">
				{/* Saturation panel */}
				<SaturationPanel
					hue={stableHue}
					saturation={hsv.s}
					value={hsv.v}
					onChange={handleSatChange}
				/>

				{/* Eyedropper + hue/opacity sliders row */}
				<div className="flex items-center gap-sm">
					{withEyedropper && (
						<Button
							variant="outlined"
							sentiment="neutral"
							size="xsmall"
							iconOnly
							icon={<EyeDropIcon />}
							title="Pick color from screen"
							onClick={onEyedropperClick}
							className="shrink-0"
						/>
					)}
					<div className="flex flex-col gap-sm flex-1 min-w-0 py-sm">
						<HueSlider hue={stableHue} onChange={handleHueChange} />
						<OpacitySlider
							color={stopColor}
							opacity={stopOpacity}
							onChange={handleOpSliderChange}
						/>
					</div>
				</div>

				{/* Format select + color input row */}
				<div className="flex gap-sm items-center">
					<div className="shrink-0 w-[53px]">
						<WrappedSelect
							value={colorFormat}
							onValueChange={(v) =>
								setColorFormat(v as ColorFormat)
							}
							options={FORMAT_OPTIONS.map((fmt) => ({
								value: fmt,
								label: fmt.toUpperCase(),
							}))}
						/>
					</div>

					<div className="flex-1 h-[24px] bg-depth-inset-1 border border-weak rounded-xs flex items-center gap-px overflow-hidden min-w-0">
						<div className="flex-1 flex items-center gap-xs h-full pl-[5px] py-xs min-w-0">
							<div
								className="size-[14px] rounded-2xs border-[0.5px] border-normal shrink-0"
								style={{ backgroundColor: stopColor }}
							/>
							{renderColorValueInputs()}
						</div>
						<div
							className="w-px h-4 shrink-0"
							style={{
								backgroundColor: "var(--color-fg-stroke-weak)",
							}}
						/>
						<div className="flex items-center h-full px-sm py-xs shrink-0 gap-[2px]">
							<input
								type="number"
								className="gcp-num-input w-[28px] bg-transparent text-strong text-right label-xsmall outline-none"
								value={Math.round(stopOpacity)}
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
							<span className="label-xsmall text-strong shrink-0">
								%
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
