import ArrowsRightLeftIcon from "@icons/icons/Arrows and Directions/Arrows-right-left.svg?react";

import RotateIcon from "@icons/icons/Arrows and Directions/Rotate-circular-cw.svg?react";
import EyeDropIcon from "@icons/icons/Editing Design/Eye-dropper.svg?react";
import GradientLinearIcon from "@icons/icons/Editing Design/Gradient-linear.svg?react";
import GradientRadialIcon from "@icons/icons/Editing Design/Gradient-radial.svg?react";
import CrossIcon from "@icons/icons/Mathematics/Cross.svg?react";
import MinusIcon from "@icons/icons/Mathematics/Minus.svg?react";
import PlusIcon from "@icons/icons/Mathematics/Plus.svg?react";
import { AnimatePresence, motion } from "framer-motion";
import React, {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import { Tabs, TabsList, TabsTrigger } from "../../controls/tabs/tabs";
import {
	GradientBar,
	HueSlider,
	OpacitySlider,
	SaturationPanel,
} from "./color-primitives";
import { ColorSwatch } from "./color-swatch";
import {
	checkerboardStyle,
	hexToHsl,
	hexToHsv,
	hexToRgb,
	hslToHex,
	hsvToHex,
	rgbToHex,
} from "./color-utils";
import "./gradient-color-picker.css";
import TrashIcon from "@icons/icons/Miscellaneous Objects/Bin.svg?react";
import { Button } from "../../../ui/controls/button/button";
import { Input } from "../../../ui/controls/input/input";
import { WrappedSelect } from "../../../ui/controls/select/select";
import { ContextMenuPopover } from "../../overlays/context-menu/context-menu";
import { StopPickerPopover } from "./stop-picker-popover";
import type { GradientSetting } from "./types";

export type { GradientSetting } from "./types";

type ColorFormat = "hex" | "rgb" | "hsl";
const FORMAT_OPTIONS: ColorFormat[] = ["hex", "rgb", "hsl"];

const PANEL_WIDTH = 240;

// ---------------------------------------------------------------------------
// Recent colors — persisted in localStorage
// ---------------------------------------------------------------------------

const RECENT_COLORS_KEY = "gcp-recent-colors";
const MAX_RECENT_COLORS = 18;

function getRecentColors(): string[] {
	try {
		const raw = localStorage.getItem(RECENT_COLORS_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

function addRecentColor(color: string) {
	const normalized = color.toLowerCase();
	const current = getRecentColors().filter(
		(c) => c.toLowerCase() !== normalized,
	);
	const updated = [normalized, ...current].slice(0, MAX_RECENT_COLORS);
	try {
		localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(updated));
	} catch {
		// localStorage full or unavailable
	}
}

// ---------------------------------------------------------------------------
// Scrubbable number input — wraps Jigsaw Input with a suffix label
// ---------------------------------------------------------------------------

const ScrubInput: React.FC<{
	value: number;
	min: number;
	max: number;
	suffix: string;
	onChange: (v: number) => void;
	className?: string;
}> = ({ value, min, max, suffix, onChange, className }) => (
	<div className="flex items-center w-full [&_[data-slot=input-spin-buttons]]:hidden">
		<Input
			type="number"
			value={value}
			min={min}
			max={max}
			scrubbable
			className={className}
			onChange={(e) => {
				const v = Math.max(min, Math.min(max, Number(e.target.value)));
				if (!Number.isNaN(v)) onChange(v);
			}}
		/>
		<span className="label-xsmall text-strong shrink-0 cursor-ew-resize">
			{suffix}
		</span>
	</div>
);

export type GradientColorPickerProps = {
	allowClear?: boolean;
	disableOpacity?: boolean;
	color: string;
	type?: "fill" | "stroke";
	opacity?: number;
	onChange: (color: string, opacity: number) => void;
	withHexCode?: boolean;
	withOpacity?: boolean;
	showOpacityLabel?: boolean;
	withLabel?: boolean;
	withEyedropper?: boolean;
	className?: string;
	label?: string;
	icon?: React.ReactNode;
	gradient?: GradientSetting;
	onGradientChange?: (gradient: GradientSetting) => void;
	enableGradient?: boolean;
	startEyedropper?: (onColorPicked: (color: string) => void) => void;
	isPickingColor?: boolean;
	recentColors?: string[];
};

const GradientColorPicker: React.FC<GradientColorPickerProps> = ({
	color = "#000000",
	type = "fill",
	opacity = 100,
	withHexCode = true,
	withOpacity = true,
	withLabel = true,
	showOpacityLabel = true,
	withEyedropper = true,
	label = "Fill Color",
	gradient,
	onGradientChange,
	enableGradient = false,
	onChange,
	icon,
	startEyedropper,
	isPickingColor = false,
	recentColors,
}) => {
	const [open, setOpen] = useState(false);
	const [shouldRender, setShouldRender] = useState(false);
	const [storedRecentColors, setStoredRecentColors] =
		useState<string[]>(getRecentColors);

	// Save current color to recent colors when picker closes
	const prevOpenRef = useRef(false);
	useEffect(() => {
		if (prevOpenRef.current && !open) {
			// Picker just closed — save current color
			addRecentColor(color);
			setStoredRecentColors(getRecentColors());
		}
		prevOpenRef.current = open;
	}, [open, color]);

	const effectiveRecentColors = recentColors ?? storedRecentColors;
	const panelRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLDivElement>(null);
	/** Fill element inside the angle slider track. Moved via DOM during
	 *  drag because the `gradient.angle` prop is Redux-backed and stays
	 *  stale until the caller's debounced commit lands. Same trick as
	 *  HueSlider/OpacitySlider in color-primitives. */
	const angleFillRef = useRef<HTMLDivElement>(null);
	const [openStopPicker, setOpenStopPicker] = useState<number | null>(null);
	const mouseDownInsideRef = useRef(false);
	const stopPickerMouseDownInsideRef = useRef(false);
	const [stopContextMenu, setStopContextMenu] = useState<{
		index: number;
		x: number;
		y: number;
	} | null>(null);

	const [panelPosition, setPanelPosition] = useState<{
		top: number;
		left: number;
	} | null>(null);

	// Inline color controls state
	const [colorFormat, setColorFormat] = useState<ColorFormat>("hex");
	const [hexInput, setHexInput] = useState(
		color?.replace("#", "").toUpperCase() ?? "",
	);

	// Gradient state
	const [isGradientMode, setIsGradientMode] = useState(
		gradient?.show ?? false,
	);
	const [activeStopIndex, setActiveStopIndex] = useState(0);
	const [stopPickerPosition, setStopPickerPosition] = useState<{
		top: number;
		left: number;
		triggerLeft: number;
	} | null>(null);
	const [shouldRenderStopPicker, setShouldRenderStopPicker] = useState(false);
	const stopPickerRef = useRef<HTMLDivElement>(null);
	const stopsContainerRef = useRef<HTMLDivElement>(null);
	const [stopHoverStyle, setStopHoverStyle] = useState({
		top: 0,
		height: 0,
		opacity: 0,
	});

	// --- Lifecycle ---

	useEffect(() => {
		if (open) setShouldRender(true);
	}, [open]);

	useEffect(() => {
		if (openStopPicker !== null) setShouldRenderStopPicker(true);
	}, [openStopPicker]);

	const handlePanelAnimationEnd = useCallback(() => {
		if (!open) setShouldRender(false);
	}, [open]);

	const handleStopPickerAnimationEnd = useCallback(() => {
		if (openStopPicker === null) setShouldRenderStopPicker(false);
	}, [openStopPicker]);

	useLayoutEffect(() => {
		if (!shouldRender || !panelRef.current || !panelPosition) return;
		const el = panelRef.current;
		const elRect = el.getBoundingClientRect();
		const triggerRect = triggerRef.current?.getBoundingClientRect();
		// Respect a host-defined boundary (e.g. the area above a video editor
		// timeline) when one exists, so the panel doesn't open into reserved
		// bottom UI even when it would technically fit inside the viewport.
		const boundaryRect = triggerRef.current
			?.closest("[data-popover-boundary]")
			?.getBoundingClientRect();
		const bottomBound = (boundaryRect?.bottom ?? window.innerHeight) - 8;
		let { top, left } = panelPosition;
		if (top + elRect.height > bottomBound && triggerRect) {
			top = triggerRect.top - elRect.height - 8;
		}
		if (top < 8) top = 8;
		if (top !== panelPosition.top) {
			setPanelPosition({ top, left });
		}
	}, [shouldRender, panelPosition]);

	// --- Click-outside ---

	useEffect(() => {
		if (!open) return;

		const isInsidePicker = (t: Node) =>
			!!panelRef.current?.contains(t) ||
			!!triggerRef.current?.contains(t) ||
			!!stopPickerRef.current?.contains(t) ||
			!!(t as HTMLElement).closest?.(
				"[data-gcp-portal], [data-radix-popper-content-wrapper], [data-radix-dismissable-layer], [data-slot='context-menu']",
			);

		// Skip the first mouseup after opening to prevent the opening click
		// from immediately closing the picker (race with effect registration)
		let armed = false;

		const handleMouseDown = (e: MouseEvent) => {
			armed = true;
			mouseDownInsideRef.current = isInsidePicker(e.target as Node);
		};
		const handleMouseUp = (e: MouseEvent) => {
			if (!armed) return;
			if (
				!isInsidePicker(e.target as Node) &&
				!mouseDownInsideRef.current
			) {
				setOpen(false);
				setOpenStopPicker(null);
			}
		};
		document.addEventListener("mousedown", handleMouseDown);
		document.addEventListener("mouseup", handleMouseUp);
		return () => {
			document.removeEventListener("mousedown", handleMouseDown);
			document.removeEventListener("mouseup", handleMouseUp);
		};
	}, [open]);

	useEffect(() => {
		if (openStopPicker === null) return;

		const isInsideStopPicker = (t: Node) =>
			!!stopPickerRef.current?.contains(t) ||
			!!panelRef.current?.contains(t) ||
			!!(t as HTMLElement).closest?.(
				"[data-gcp-portal], [data-radix-popper-content-wrapper], [data-radix-dismissable-layer], [data-slot='context-menu']",
			);

		const handleMouseDown = (e: MouseEvent) => {
			stopPickerMouseDownInsideRef.current = isInsideStopPicker(
				e.target as Node,
			);
		};
		const handleMouseUp = (e: MouseEvent) => {
			if (
				!isInsideStopPicker(e.target as Node) &&
				!stopPickerMouseDownInsideRef.current
			) {
				setOpenStopPicker(null);
			}
		};
		document.addEventListener("mousedown", handleMouseDown);
		document.addEventListener("mouseup", handleMouseUp);
		return () => {
			document.removeEventListener("mousedown", handleMouseDown);
			document.removeEventListener("mouseup", handleMouseUp);
		};
	}, [openStopPicker]);

	useEffect(() => {
		if (gradient?.show !== undefined) setIsGradientMode(gradient.show);
	}, [gradient?.show]);

	useEffect(() => {
		if (gradient && activeStopIndex >= gradient.colorStops.length) {
			setActiveStopIndex(Math.max(0, gradient.colorStops.length - 1));
		}
	}, [gradient?.colorStops.length, activeStopIndex, gradient]);

	// --- Gradient helpers ---

	const gradientSortedStops = useMemo(() => {
		if (!gradient) return [];
		return [...gradient.colorStops].sort((a, b) => a.position - b.position);
	}, [gradient]);

	const gradientPreviewStyle = useMemo((): React.CSSProperties => {
		if (!gradient || gradientSortedStops.length === 0)
			return { background: "#ccc" };
		if (gradientSortedStops.length === 1) {
			const s = gradientSortedStops[0];
			const c =
				s.opacity !== undefined && s.opacity !== 100
					? `rgba(${hexToRgb(s.color).r},${hexToRgb(s.color).g},${hexToRgb(s.color).b},${(s.opacity ?? 100) / 100})`
					: s.color;
			return { background: c };
		}
		const strs = gradientSortedStops.map((s) => {
			const c =
				s.opacity !== undefined && s.opacity !== 100
					? `rgba(${hexToRgb(s.color).r},${hexToRgb(s.color).g},${hexToRgb(s.color).b},${(s.opacity ?? 100) / 100})`
					: s.color;
			return `${c} ${(s.position * 100).toFixed(0)}%`;
		});
		if (gradient.type === "radial") {
			return {
				background: `radial-gradient(circle, ${strs.join(", ")})`,
			};
		}
		return {
			background: `linear-gradient(${(gradient.angle ?? 0) + 90}deg, ${strs.join(", ")})`,
		};
	}, [gradient, gradientSortedStops]);

	const updateGradientStop = useCallback(
		(
			index: number,
			update: { color?: string; position?: number; opacity?: number },
		) => {
			if (!gradient || !onGradientChange) return;
			const newStops = [...gradient.colorStops];
			newStops[index] = { ...newStops[index], ...update };
			onGradientChange({ ...gradient, colorStops: newStops });
		},
		[gradient, onGradientChange],
	);

	const addGradientStop = useCallback(() => {
		if (!gradient || !onGradientChange) return;
		const sorted = [...gradient.colorStops].sort(
			(a, b) => a.position - b.position,
		);
		let bestGap = 0;
		let bestLeft = -1;
		let bestRight = -1;
		if (sorted.length > 0 && sorted[0].position > bestGap) {
			bestGap = sorted[0].position;
			bestLeft = -1;
			bestRight = 0;
		}
		for (let i = 0; i < sorted.length - 1; i++) {
			const gap = sorted[i + 1].position - sorted[i].position;
			if (gap > bestGap) {
				bestGap = gap;
				bestLeft = i;
				bestRight = i + 1;
			}
		}
		if (sorted.length > 0) {
			const tailGap = 1 - sorted[sorted.length - 1].position;
			if (tailGap > bestGap) {
				bestLeft = sorted.length - 1;
				bestRight = -1;
			}
		}
		const leftPos = bestLeft >= 0 ? sorted[bestLeft].position : 0;
		const rightPos = bestRight >= 0 ? sorted[bestRight].position : 1;
		const newPos = Math.round(((leftPos + rightPos) / 2) * 100) / 100;
		let newColor: string;
		let newOpacity: number;
		if (bestLeft >= 0 && bestRight >= 0) {
			const lS = sorted[bestLeft];
			const rS = sorted[bestRight];
			const lr = hexToRgb(lS.color);
			const rr = hexToRgb(rS.color);
			newColor = rgbToHex(
				Math.round((lr.r + rr.r) / 2),
				Math.round((lr.g + rr.g) / 2),
				Math.round((lr.b + rr.b) / 2),
			);
			newOpacity = Math.round(
				((lS.opacity ?? 100) + (rS.opacity ?? 100)) / 2,
			);
		} else if (bestLeft >= 0) {
			newColor = sorted[bestLeft].color;
			newOpacity = sorted[bestLeft].opacity ?? 100;
		} else if (bestRight >= 0) {
			newColor = sorted[bestRight].color;
			newOpacity = sorted[bestRight].opacity ?? 100;
		} else {
			newColor = "#FFFFFF";
			newOpacity = 100;
		}
		const newStops = [
			...gradient.colorStops,
			{ color: newColor, position: newPos, opacity: newOpacity },
		];
		onGradientChange({ ...gradient, colorStops: newStops });
		setActiveStopIndex(newStops.length - 1);
	}, [gradient, onGradientChange]);

	const addGradientStopAtPosition = useCallback(
		(position: number) => {
			if (!gradient || !onGradientChange) return;
			if (gradient.colorStops.length >= 10) return;
			const sorted = [...gradient.colorStops].sort(
				(a, b) => a.position - b.position,
			);
			// Find the two stops surrounding the clicked position and interpolate
			let leftStop = sorted[0];
			let rightStop = sorted[sorted.length - 1];
			for (let i = 0; i < sorted.length - 1; i++) {
				if (
					sorted[i].position <= position &&
					sorted[i + 1].position >= position
				) {
					leftStop = sorted[i];
					rightStop = sorted[i + 1];
					break;
				}
			}
			const range = rightStop.position - leftStop.position;
			const t = range > 0 ? (position - leftStop.position) / range : 0.5;
			const lr = hexToRgb(leftStop.color);
			const rr = hexToRgb(rightStop.color);
			const newColor = rgbToHex(
				Math.round(lr.r + (rr.r - lr.r) * t),
				Math.round(lr.g + (rr.g - lr.g) * t),
				Math.round(lr.b + (rr.b - lr.b) * t),
			);
			const newOpacity = Math.round(
				(leftStop.opacity ?? 100) +
					((rightStop.opacity ?? 100) - (leftStop.opacity ?? 100)) *
						t,
			);
			const newStops = [
				...gradient.colorStops,
				{ color: newColor, position, opacity: newOpacity },
			];
			onGradientChange({ ...gradient, colorStops: newStops });
			setActiveStopIndex(newStops.length - 1);
		},
		[gradient, onGradientChange],
	);

	const removeGradientStop = useCallback(
		(index: number) => {
			if (!gradient || !onGradientChange) return;
			// Minimum 2 stops required for a valid gradient
			if (gradient.colorStops.length <= 2) return;
			onGradientChange({
				...gradient,
				colorStops: gradient.colorStops.filter((_, i) => i !== index),
			});
		},
		[gradient, onGradientChange],
	);

	const handleFlipGradient = useCallback(() => {
		if (!gradient || !onGradientChange) return;
		const flipped = gradient.colorStops.map((s) => ({
			...s,
			position: Math.round((1 - s.position) * 100) / 100,
		}));
		onGradientChange({ ...gradient, colorStops: flipped });
	}, [gradient, onGradientChange]);

	// --- Callbacks ---

	const handleEyedropperClick = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			startEyedropper?.((pickedColor) => {
				if (isGradientMode && gradient && onGradientChange) {
					updateGradientStop(activeStopIndex, {
						color: pickedColor,
					});
				} else {
					onChange(pickedColor, opacity);
				}
			});
		},
		[
			startEyedropper,
			onChange,
			opacity,
			isGradientMode,
			gradient,
			onGradientChange,
			activeStopIndex,
			updateGradientStop,
		],
	);

	const handleModeToggle = useCallback(
		(active: boolean) => {
			setIsGradientMode(active);
			if (gradient && onGradientChange) {
				// Figma-style seeding: when flipping from solid → gradient,
				// derive a 2-stop gradient from the *current* solid color
				// (color → same color at 0% alpha) so the user starts from
				// "the gradient version of the color in front of them"
				// instead of an unrelated hardcoded default. Only seed on
				// the off→on edge — toggling off and back on preserves any
				// customizations the user already made this session.
				const hasExistingStops =
					(gradient.colorStops?.length ?? 0) >= 2;
				const wasOff = !gradient.show;
				if (active && wasOff && !hasExistingStops) {
					const seededStops = [
						{
							color: color ?? "#FFFFFF",
							position: 0,
							opacity: 100,
						},
						{
							color: color ?? "#FFFFFF",
							position: 1,
							opacity: 0,
						},
					];
					onGradientChange({
						...gradient,
						show: true,
						colorStops: seededStops,
					});
					setActiveStopIndex(0);
				} else {
					onGradientChange({ ...gradient, show: active });
				}
			}
			setOpenStopPicker(null);
			setStopPickerPosition(null);
		},
		[gradient, onGradientChange, color],
	);

	const pickerValue = useMemo(() => {
		if (isGradientMode && gradient) {
			const stop = gradient.colorStops[activeStopIndex];
			return stop ? stop.color : "#FFFFFF";
		}
		return color;
	}, [isGradientMode, gradient, activeStopIndex, color]);

	useEffect(() => {
		setHexInput(pickerValue?.replace("#", "").toUpperCase() ?? "");
	}, [pickerValue]);

	const handleHexChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			// Strip `#` and cap at 6 so pastes like "#144665" aren't truncated by maxLength.
			const val = e.target.value.replace(/#/g, "").slice(0, 6);
			setHexInput(val);
			if (/^[0-9a-fA-F]{6}$/.test(val)) {
				onChange(`#${val.toLowerCase()}`, opacity);
			}
		},
		[onChange, opacity],
	);

	const handleHexBlur = useCallback(() => {
		if (!/^[0-9a-fA-F]{6}$/.test(hexInput)) {
			setHexInput(pickerValue?.replace("#", "").toUpperCase() ?? "");
		}
	}, [hexInput, pickerValue]);

	// Format dropdown uses WrappedSelect

	const handleStopEyedropperClick = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			const idx = openStopPicker;
			setOpenStopPicker(null);
			setStopPickerPosition(null);
			if (idx !== null) {
				startEyedropper?.((pickedColor) => {
					updateGradientStop(idx, { color: pickedColor });
				});
			}
		},
		[openStopPicker, startEyedropper, updateGradientStop],
	);

	const handleClose = useCallback(() => {
		setOpen(false);
		setOpenStopPicker(null);
	}, []);

	const handleStopHover = useCallback((element: HTMLElement | null) => {
		if (!stopsContainerRef.current || !element) {
			setStopHoverStyle((prev) => ({ ...prev, opacity: 0 }));
			return;
		}
		const containerRect = stopsContainerRef.current.getBoundingClientRect();
		const rowRect = element.getBoundingClientRect();
		setStopHoverStyle({
			top: rowRect.top - containerRect.top,
			height: rowRect.height,
			opacity: 1,
		});
	}, []);

	// Derived color values for inline inputs
	const hex = pickerValue?.startsWith("#")
		? pickerValue
		: `#${pickerValue ?? "000000"}`;
	const rgb = hexToRgb(hex);
	const hsl = hexToHsl(hex);

	// =====================================================================
	// Color value inputs (HEX / RGB / HSL)
	// =====================================================================

	const renderColorValueInputs = () => {
		if (colorFormat === "hex") {
			return (
				<input
					className="gcp-num-input flex-1 min-w-0 bg-transparent text-strong label-xsmall outline-none uppercase"
					value={hexInput}
					onChange={handleHexChange}
					onBlur={handleHexBlur}
					maxLength={7}
					placeholder="000000"
				/>
			);
		}
		if (colorFormat === "rgb") {
			return (
				<div className="flex gap-2xs flex-1 min-w-0 items-center">
					{[
						{
							val: rgb.r,
							max: 255,
							set: (v: number) =>
								onChange(rgbToHex(v, rgb.g, rgb.b), opacity),
						},
						{
							val: rgb.g,
							max: 255,
							set: (v: number) =>
								onChange(rgbToHex(rgb.r, v, rgb.b), opacity),
						},
						{
							val: rgb.b,
							max: 255,
							set: (v: number) =>
								onChange(rgbToHex(rgb.r, rgb.g, v), opacity),
						},
					].map((ch, i) => (
						<input
							key={i}
							type="number"
							className="gcp-num-input w-full min-w-0 flex-1 bg-transparent text-strong label-xsmall outline-none text-center"
							value={ch.val}
							min={0}
							max={ch.max}
							onChange={(e) => {
								const v = Math.max(
									0,
									Math.min(ch.max, Number(e.target.value)),
								);
								if (!Number.isNaN(v)) ch.set(v);
							}}
						/>
					))}
				</div>
			);
		}
		return (
			<div className="flex gap-2xs flex-1 min-w-0 items-center">
				{[
					{
						val: hsl.h,
						max: 360,
						set: (v: number) =>
							onChange(
								hslToHex({ h: v, s: hsl.s, l: hsl.l }),
								opacity,
							),
					},
					{
						val: hsl.s,
						max: 100,
						set: (v: number) =>
							onChange(
								hslToHex({ h: hsl.h, s: v, l: hsl.l }),
								opacity,
							),
					},
					{
						val: hsl.l,
						max: 100,
						set: (v: number) =>
							onChange(
								hslToHex({ h: hsl.h, s: hsl.s, l: v }),
								opacity,
							),
					},
				].map((ch, i) => (
					<input
						key={i}
						type="number"
						className="gcp-num-input w-full min-w-0 flex-1 bg-transparent text-strong label-xsmall outline-none text-center"
						value={ch.val}
						min={0}
						max={ch.max}
						onChange={(e) => {
							const v = Math.max(
								0,
								Math.min(ch.max, Number(e.target.value)),
							);
							if (!Number.isNaN(v)) ch.set(v);
						}}
					/>
				))}
			</div>
		);
	};

	// =====================================================================
	// Gradient stop row (for the stops list)
	// =====================================================================

	const handleStopRowClick = useCallback(
		(e: React.MouseEvent, index: number) => {
			setActiveStopIndex(index);
			if (openStopPicker === index) {
				setOpenStopPicker(null);
				setStopPickerPosition(null);
			} else {
				const rowEl = e.currentTarget;
				const rect = rowEl.getBoundingClientRect();
				setStopPickerPosition({
					top: rect.top,
					left: rect.right + 8,
					triggerLeft: rect.left,
				});
				setOpenStopPicker(index);
			}
		},
		[openStopPicker],
	);

	const renderStopRow = (
		stop: { color: string; position: number; opacity?: number },
		index: number,
	) => (
		<div
			key={`stop-${index}`}
			className={`flex gap-sm items-start p-xs rounded-xs w-full transition-colors ${
				activeStopIndex === index ? "bg-interaction-hover" : ""
			}`}
			onMouseEnter={(e) => handleStopHover(e.currentTarget)}
		>
			{/* Position input */}
			<div
				className="w-[52px] h-[24px] bg-depth-inset-1 border border-weak rounded-xs flex items-center px-sm py-xs shrink-0 overflow-hidden"
				onClick={(e) => e.stopPropagation()}
			>
				<ScrubInput
					value={Math.round(stop.position * 100)}
					min={0}
					max={100}
					suffix="%"
					onChange={(v) =>
						updateGradientStop(index, { position: v / 100 })
					}
				/>
			</div>

			{/* Color input (swatch + hex | opacity) */}
			<div className="flex-1 min-w-0">
				<div
					className={`h-[24px] bg-depth-inset-1 border rounded-xs flex items-center gap-px overflow-hidden transition-colors ${
						openStopPicker === index
							? "border-brand-normal"
							: "border-weak"
					}`}
				>
					<div className="flex-1 flex items-center gap-xs h-full pl-[5px] py-xs min-w-0">
						<div
							className="size-[14px] rounded-2xs border-[0.5px] border-normal shrink-0 relative overflow-hidden cursor-pointer"
							style={{ backgroundColor: stop.color }}
							onClick={(e) => handleStopRowClick(e, index)}
						>
							{(stop.opacity ?? 100) < 100 && (
								<div className="absolute top-0 right-0 w-[7px] h-full overflow-hidden rounded-r-[1.5px]">
									<div
										className="absolute inset-0"
										style={checkerboardStyle}
									/>
									<div
										className="absolute inset-0"
										style={{
											backgroundColor: stop.color,
											opacity:
												(stop.opacity ?? 100) / 100,
										}}
									/>
								</div>
							)}
						</div>
						<input
							key={stop.color}
							className="gcp-num-input flex-1 min-w-0 bg-transparent text-strong label-xsmall outline-none uppercase"
							defaultValue={stop.color
								.replace("#", "")
								.toUpperCase()}
							maxLength={7}
							placeholder="000000"
							onClick={(e) => {
								e.stopPropagation();
								setActiveStopIndex(index);
							}}
							onFocus={() => setActiveStopIndex(index)}
							onChange={(e) => {
								// Strip `#` and cap at 6 so pastes like "#144665" aren't truncated by maxLength.
								const val = e.target.value
									.replace(/#/g, "")
									.slice(0, 6);
								if (e.target.value !== val) {
									e.target.value = val;
								}
								if (/^[0-9a-fA-F]{6}$/.test(val)) {
									updateGradientStop(index, {
										color: `#${val.toLowerCase()}`,
									});
								}
							}}
							onBlur={(e) => {
								const val = e.target.value.replace(/#/g, "");
								if (!/^[0-9a-fA-F]{6}$/.test(val)) {
									e.target.value = stop.color
										.replace("#", "")
										.toUpperCase();
								}
							}}
						/>
					</div>
					<div
						className="w-px h-4 shrink-0"
						style={{
							backgroundColor: "var(--color-fg-stroke-weak)",
						}}
					/>
					<div
						className="flex items-center h-full px-sm py-xs shrink-0"
						onClick={(e) => e.stopPropagation()}
					>
						<ScrubInput
							value={Math.round(stop.opacity ?? 100)}
							min={0}
							max={100}
							suffix="%"
							onChange={(v) =>
								updateGradientStop(index, { opacity: v })
							}
						/>
					</div>
				</div>
			</div>

			{/* Delete button */}
			<Button
				variant="transparent"
				sentiment="neutral"
				size="xsmall"
				iconOnly
				icon={<MinusIcon />}
				onClick={() => removeGradientStop(index)}
				disabled={!!gradient && gradient.colorStops.length <= 2}
			/>
		</div>
	);

	// =====================================================================
	// Panel header (shared between solid/gradient)
	// =====================================================================

	const renderHeader = () => (
		<div className="flex items-center justify-between border-b border-weak px-md pt-sm">
			{enableGradient && gradient ? (
				<Tabs
					value={isGradientMode ? "gradient" : "solid"}
					onValueChange={(val) =>
						handleModeToggle(val === "gradient")
					}
				>
					<TabsList
						variant="line"
						size="small"
						className="border-none"
					>
						<TabsTrigger value="solid">Solid</TabsTrigger>
						<TabsTrigger value="gradient">Gradient</TabsTrigger>
					</TabsList>
				</Tabs>
			) : (
				<div />
			)}
			<Button
				variant="transparent"
				sentiment="neutral"
				size="small"
				iconOnly
				icon={<CrossIcon />}
				onClick={handleClose}
				className="relative bottom-2xs"
			/>
		</div>
	);

	// =====================================================================
	// Solid mode panel content
	// =====================================================================

	// HSV state for saturation panel (keeps hue stable when color is achromatic)
	const hsv = hexToHsv(pickerValue);
	const hueRef = useRef(hsv.h);
	if (hsv.s > 0) hueRef.current = hsv.h;
	const stableHue = hsv.s === 0 ? hueRef.current : hsv.h;

	// Refs for stable access during drag operations
	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;
	const opacityRef = useRef(opacity);
	opacityRef.current = opacity;
	const pickerValueRef = useRef(pickerValue);
	pickerValueRef.current = pickerValue;
	const hsvRef = useRef(hsv);
	hsvRef.current = hsv;

	const handleSatChange = useCallback((s: number, v: number) => {
		onChangeRef.current(
			hsvToHex({ h: hueRef.current, s, v }),
			opacityRef.current,
		);
	}, []);

	const handleHueChange = useCallback((h: number) => {
		hueRef.current = h;
		onChangeRef.current(
			hsvToHex({ h, s: hsvRef.current.s, v: hsvRef.current.v }),
			opacityRef.current,
		);
	}, []);

	const handleOpSliderChange = useCallback((o: number) => {
		onChangeRef.current(pickerValueRef.current, o);
	}, []);

	const renderSolidMode = () => (
		<>
			<div className="flex flex-col gap-sm px-lg pt-lg pb-2xl border-b border-weak">
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
							iconOnly
							size={"small"}
							icon={<EyeDropIcon className="size-3.5" />}
							title="Pick color from screen"
							onClick={handleEyedropperClick}
						/>
					)}
					<div className="flex flex-col gap-sm flex-1 min-w-0 py-sm">
						<HueSlider hue={stableHue} onChange={handleHueChange} />
						{withOpacity && (
							<OpacitySlider
								color={pickerValue}
								opacity={opacity}
								onChange={handleOpSliderChange}
							/>
						)}
					</div>
				</div>

				{/* Format select + color input row */}
				<div className="flex gap-sm items-center">
					<div className="shrink-0 w-[62px]" data-gcp-portal>
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
								style={{ backgroundColor: pickerValue }}
							/>
							{renderColorValueInputs()}
						</div>
						{withOpacity && (
							<>
								<div
									className="w-px h-4 shrink-0"
									style={{
										backgroundColor:
											"var(--color-fg-stroke-weak)",
									}}
								/>
								<div className="w-[54px] flex items-center h-full pl-[5px] pr-[5px] py-xs shrink-0">
									<ScrubInput
										value={Math.round(opacity)}
										min={0}
										max={100}
										suffix="%"
										onChange={(v) =>
											onChange(pickerValue, v)
										}
									/>
								</div>
							</>
						)}
					</div>
				</div>
			</div>

			{/* Recent Colors */}
			{effectiveRecentColors.length > 0 && (
				<div className="flex flex-col gap-sm px-lg py-md bg-surface overflow-x-clip overflow-y-auto">
					<p className="label-xsmall-strong text-normal pl-sm pr-xs">
						Recent Colors
					</p>
					<div className="flex gap-sm flex-wrap px-sm py-xs h-fit items-start content-start">
						{effectiveRecentColors.map((c, i) => (
							<div
								key={`recent-${i}`}
								className="size-[18px] rounded-2xs border-[0.5px] border-normal shrink-0 cursor-pointer hover:scale-110 transition-transform"
								style={{ backgroundColor: c }}
								onClick={() => onChange(c, opacity)}
							/>
						))}
					</div>
				</div>
			)}
		</>
	);

	// =====================================================================
	// Gradient mode panel content (matching Figma)
	// =====================================================================

	// Refs for gradient drag operations
	const gradientRef = useRef(gradient);
	gradientRef.current = gradient;
	const onGradientChangeRef = useRef(onGradientChange);
	onGradientChangeRef.current = onGradientChange;

	const renderGradientMode = () => {
		if (!gradient || !onGradientChange) return null;

		return (
			<>
				{/* Top section: tabs + gradient bar + angle */}
				<div className="flex flex-col gap-3xl items-center px-lg pt-xl pb-2xl border-b border-weak">
					{/* Linear / Radial tabs + flip button */}
					<div className="flex items-center justify-between w-full h-[24px]">
						<Tabs
							value={gradient.type}
							onValueChange={(v) =>
								onGradientChange({
									...gradient,
									type: v as "linear" | "radial",
								})
							}
						>
							<TabsList variant="contained" size="small">
								<TabsTrigger
									value="linear"
									icon={<GradientLinearIcon />}
								>
									Linear
								</TabsTrigger>
								<TabsTrigger
									value="radial"
									icon={<GradientRadialIcon />}
								>
									Radial
								</TabsTrigger>
							</TabsList>
						</Tabs>
						<Button
							icon={<ArrowsRightLeftIcon className="size-3.5" />}
							iconOnly
							variant={"outlined"}
							sentiment={"neutral"}
							title="Flip gradient"
							size={"xsmall"}
							onClick={handleFlipGradient}
						/>
					</div>

					{/* Gradient bar with stop thumbs */}
					<GradientBar
						stops={gradient.colorStops}
						activeIndex={activeStopIndex}
						onStopMove={(index, position) =>
							updateGradientStop(index, { position })
						}
						onStopSelect={setActiveStopIndex}
						onDoubleClick={addGradientStopAtPosition}
						onStopContextMenu={(e, index) => {
							setStopContextMenu({
								index,
								x: e.clientX,
								y: e.clientY,
							});
						}}
						onStopDoubleClick={(e, index) => {
							handleStopRowClick(e, index);
						}}
					/>

					{/* Angle slider + input (linear only) */}
					{gradient.type === "linear" && (
						<div className="flex gap-sm items-center w-full">
							{/* Slider track (interactive) */}
							<div
								className="flex-1 h-[24px] bg-depth-inset-2 border border-weak rounded-xs p-[2px] min-w-0 cursor-pointer select-none"
								onMouseDown={(e) => {
									e.preventDefault();
									const track = e.currentTarget;
									const update = (ev: MouseEvent) => {
										const rect =
											track.getBoundingClientRect();
										const x = Math.max(
											0,
											Math.min(
												1,
												(ev.clientX - rect.left) /
													rect.width,
											),
										);
										const angle = Math.round(x * 360);

										// Move fill instantly via DOM so the
										// drag feels smooth even while the
										// Redux-backed `gradient.angle` prop
										// stays stale until the debounced
										// commit lands.
										if (angleFillRef.current) {
											angleFillRef.current.style.width = `${Math.max(4, (angle / 360) * 100)}%`;
										}

										const g = gradientRef.current;
										const fn = onGradientChangeRef.current;
										if (g && fn) {
											fn({
												...g,
												angle,
											});
										}
									};
									update(
										e.nativeEvent as unknown as MouseEvent,
									);
									const onMove = (ev: MouseEvent) => {
										ev.preventDefault();
										update(ev);
									};
									const onUp = () => {
										document.removeEventListener(
											"mousemove",
											onMove,
										);
										document.removeEventListener(
											"mouseup",
											onUp,
										);
									};
									document.addEventListener(
										"mousemove",
										onMove,
									);
									document.addEventListener("mouseup", onUp);
								}}
							>
								<div
									ref={angleFillRef}
									className="h-full rounded-2xs bg-brand-normal flex items-center justify-end pr-[2px] pointer-events-none"
									style={{
										width: `${Math.max(4, ((gradient.angle ?? 0) / 360) * 100)}%`,
									}}
								>
									<div className="w-0.5 h-4 rounded-full bg-brand-weak shrink-0" />
								</div>
							</div>
							{/* Angle input */}
							<div className="w-[57px] h-[24px] bg-depth-inset-1 border border-weak rounded-xs flex items-center px-sm py-xs shrink-0 gap-xs">
								<RotateIcon className="size-3.5 text-normal shrink-0" />
								<ScrubInput
									value={gradient.angle ?? 0}
									min={0}
									max={360}
									suffix="°"
									onChange={(v) =>
										onGradientChange({
											...gradient,
											angle: v,
										})
									}
								/>
							</div>
						</div>
					)}
				</div>

				{/* Stops section */}
				<div className="flex flex-col gap-sm px-sm py-md bg-surface overflow-x-clip overflow-y-auto scrollbar-hide">
					{/* Title + add button */}
					<div className="flex items-center justify-between px-xs">
						<p className="label-xsmall-strong text-normal">Stops</p>
						{gradient.colorStops.length < 10 && (
							<Button
								variant="outlined"
								sentiment="neutral"
								iconOnly
								size={"xsmall"}
								icon={<PlusIcon />}
								onClick={addGradientStop}
							/>
						)}
					</div>

					{/* Stop rows */}
					<div
						ref={stopsContainerRef}
						className="relative flex flex-col"
						onMouseLeave={() => handleStopHover(null)}
					>
						<AnimatePresence>
							{stopHoverStyle.opacity > 0 && (
								<motion.div
									layout
									className="absolute left-0 right-0 pointer-events-none bg-interaction-hover rounded"
									initial={{ opacity: 0, scale: 0.96 }}
									animate={{ opacity: 1, scale: 1 }}
									exit={{ opacity: 0, scale: 0.96 }}
									transition={{
										layout: {
											type: "spring",
											stiffness: 500,
											damping: 40,
										},
										opacity: { duration: 0.1 },
									}}
									style={{
										top: stopHoverStyle.top,
										height: stopHoverStyle.height,
									}}
								/>
							)}
						</AnimatePresence>

						{gradient.colorStops.map((stop, i) =>
							renderStopRow(stop, i),
						)}
					</div>
				</div>

				{/* Stop context menu (right-click on a gradient stop thumb) */}
				{stopContextMenu && (
					<ContextMenuPopover
						x={stopContextMenu.x}
						y={stopContextMenu.y}
						onClose={() => setStopContextMenu(null)}
						sections={[
							{
								items: [
									{
										id: "delete-stop",
										icon: <TrashIcon />,
										label: "Delete stop",
										onClick: () =>
											removeGradientStop(
												stopContextMenu.index,
											),
										disabled:
											(gradient?.colorStops.length ??
												0) <= 2,
									},
								],
							},
						]}
					/>
				)}
			</>
		);
	};

	// =====================================================================
	// Panel
	// =====================================================================

	const renderPanel = () => (
		<div
			ref={panelRef}
			data-slot="color-picker-panel"
			className={`fixed z-[9999999] w-[240px] rounded-md border border-weak bg-surface overflow-clip pb-lg will-change-transform text-strong shadow-[0px_8px_24px_rgba(0,0,0,0.24)] ${
				open
					? "animate-[gcpSlideIn_200ms_cubic-bezier(0.16,1,0.3,1)]"
					: "animate-[gcpSlideOut_150ms_cubic-bezier(0.16,1,0.3,1)_forwards]"
			}`}
			style={{
				top: panelPosition?.top ?? 0,
				left: panelPosition?.left ?? 0,
			}}
			onAnimationEnd={handlePanelAnimationEnd}
		>
			{enableGradient && gradient && onGradientChange && renderHeader()}
			{isGradientMode && gradient && onGradientChange
				? renderGradientMode()
				: renderSolidMode()}
		</div>
	);

	// =====================================================================
	// Trigger swatch
	// =====================================================================

	const handleSwatchClick = useCallback(() => {
		if (!open && triggerRef.current) {
			const rect = triggerRef.current.getBoundingClientRect();
			const MARGIN = 8;
			const rawLeft = rect.right - PANEL_WIDTH;
			const left = Math.max(
				MARGIN,
				Math.min(rawLeft, window.innerWidth - PANEL_WIDTH - MARGIN),
			);
			setPanelPosition({ top: rect.bottom + MARGIN, left });
		}
		setOpen((prev) => !prev);
	}, [open]);

	const swatchEl = (
		<ColorSwatch
			type={type}
			color={color}
			isGradientMode={isGradientMode}
			gradientType={gradient?.type}
			gradientPreviewStyle={gradientPreviewStyle}
			withHexCode={withHexCode}
			withOpacity={withOpacity}
			showOpacityLabel={showOpacityLabel}
			opacity={opacity}
			onOpacityChange={(c, o) => onChange(c, o)}
			onClick={handleSwatchClick}
			triggerRef={triggerRef}
		/>
	);

	return (
		<>
			{withLabel ? (
				<div className="flex items-center w-full justify-between gap-md">
					<div className="flex items-center gap-md shrink-0">
						{icon && (
							<span className="h-5 w-5 flex items-center justify-center select-none">
								{icon}
							</span>
						)}
						<p className="label-small text-normal">{label}</p>
					</div>
					<div className="flex-1 min-w-0">{swatchEl}</div>
				</div>
			) : (
				swatchEl
			)}

			{shouldRender &&
				panelPosition &&
				createPortal(renderPanel(), document.body)}

			{shouldRenderStopPicker &&
				stopPickerPosition &&
				gradient &&
				createPortal(
					<StopPickerPopover
						stopColor={
							gradient.colorStops[openStopPicker ?? 0]?.color ??
							"#FFFFFF"
						}
						onColorChange={(newColor) => {
							if (openStopPicker !== null) {
								updateGradientStop(openStopPicker, {
									color: newColor,
								});
							}
						}}
						stopOpacity={
							gradient.colorStops[openStopPicker ?? 0]?.opacity ??
							100
						}
						onOpacityChange={(newOpacity) => {
							if (openStopPicker !== null) {
								updateGradientStop(openStopPicker, {
									opacity: newOpacity,
								});
							}
						}}
						withEyedropper={withEyedropper}
						isPickingColor={isPickingColor}
						onEyedropperClick={handleStopEyedropperClick}
						position={stopPickerPosition}
						stopPickerRef={stopPickerRef}
						isOpen={openStopPicker !== null}
						onAnimationEnd={handleStopPickerAnimationEnd}
						onClose={() => {
							setOpenStopPicker(null);
							setStopPickerPosition(null);
						}}
					/>,
					document.body,
				)}
		</>
	);
};

export { GradientColorPicker };
