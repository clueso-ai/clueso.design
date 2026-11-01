import React, { useCallback, useRef } from "react";
import { checkerboardStyle, hexToHsv, hexToRgb, hsvToHex } from "./color-utils";

// ---------------------------------------------------------------------------
// Shared drag interaction hook
// ---------------------------------------------------------------------------

function useDrag(
	onMove: (x: number, y: number) => void,
	onEnd?: () => void,
): (e: React.MouseEvent | React.TouchEvent) => void {
	const onMoveRef = useRef(onMove);
	onMoveRef.current = onMove;
	const onEndRef = useRef(onEnd);
	onEndRef.current = onEnd;

	return useCallback((e: React.MouseEvent | React.TouchEvent) => {
		e.preventDefault();
		const container = (e.target as HTMLElement).closest(
			"[data-drag-area]",
		) as HTMLElement | null;
		if (!container) return;

		const getPos = (ev: MouseEvent | TouchEvent) => {
			const rect = container.getBoundingClientRect();
			const cx = "touches" in ev ? ev.touches[0].clientX : ev.clientX;
			const cy = "touches" in ev ? ev.touches[0].clientY : ev.clientY;
			return {
				x: Math.max(0, Math.min(1, (cx - rect.left) / rect.width)),
				y: Math.max(0, Math.min(1, (cy - rect.top) / rect.height)),
			};
		};

		const pos = getPos(e.nativeEvent as MouseEvent | TouchEvent);
		onMoveRef.current(pos.x, pos.y);

		const handleMove = (ev: MouseEvent | TouchEvent) => {
			ev.preventDefault();
			const p = getPos(ev);
			onMoveRef.current(p.x, p.y);
		};
		const handleEnd = () => {
			onEndRef.current?.();
			document.removeEventListener("mousemove", handleMove);
			document.removeEventListener("mouseup", handleEnd);
			document.removeEventListener("touchmove", handleMove);
			document.removeEventListener("touchend", handleEnd);
		};
		document.addEventListener("mousemove", handleMove);
		document.addEventListener("mouseup", handleEnd);
		document.addEventListener("touchmove", handleMove, { passive: false });
		document.addEventListener("touchend", handleEnd);
	}, []);
}

// ---------------------------------------------------------------------------
// Saturation Panel (2D: X = saturation, Y = value in HSV)
// ---------------------------------------------------------------------------

export const SaturationPanel: React.FC<{
	hue: number;
	saturation: number;
	value: number;
	onChange: (s: number, v: number) => void;
	className?: string;
}> = React.memo(({ hue, saturation, value, onChange, className }) => {
	const thumbRef = useRef<HTMLDivElement>(null);
	const hueRef = useRef(hue);
	hueRef.current = hue;
	const lastSRef = useRef(saturation);
	const lastVRef = useRef(value);

	const rafRef = useRef(0);

	const handleMove = useCallback(
		(x: number, y: number) => {
			const s = Math.round(x * 100);
			const v = Math.round((1 - y) * 100);
			lastSRef.current = s;
			lastVRef.current = v;

			// Move thumb instantly via DOM
			if (thumbRef.current) {
				thumbRef.current.style.left = `calc(${s}% - 8px)`;
				thumbRef.current.style.top = `calc(${100 - v}% - 8px)`;
				thumbRef.current.style.backgroundColor = hsvToHex({
					h: hueRef.current,
					s,
					v,
				});
			}

			// Propagate color change throttled to once per frame
			if (!rafRef.current) {
				rafRef.current = requestAnimationFrame(() => {
					rafRef.current = 0;
					onChange(lastSRef.current, lastVRef.current);
				});
			}
		},
		[onChange],
	);
	const onStart = useDrag(handleMove, () => {
		// Flush on drag end
		if (rafRef.current) {
			cancelAnimationFrame(rafRef.current);
			rafRef.current = 0;
		}
		onChange(lastSRef.current, lastVRef.current);
	});

	// Sync thumb from props when not dragging (e.g. hue slider changed)
	const thumbColor = hsvToHex({ h: hue, s: saturation, v: value });
	const thumbLeft = `calc(${saturation}% - 8px)`;
	const thumbTop = `calc(${100 - value}% - 8px)`;

	return (
		<div
			data-drag-area
			className={`relative w-full h-[173px] rounded-sm border border-weak overflow-hidden cursor-crosshair select-none bg-clip-padding ${className ?? ""}`}
			onMouseDown={onStart}
			onTouchStart={onStart}
		>
			<div
				className="absolute inset-0"
				style={{ backgroundColor: `hsl(${hue}, 100%, 50%)` }}
			/>
			<div
				className="absolute inset-0"
				style={{
					background: "linear-gradient(to right, #fff, transparent)",
				}}
			/>
			<div
				className="absolute inset-0"
				style={{
					background: "linear-gradient(to top, #000, transparent)",
				}}
			/>
			<div
				ref={thumbRef}
				className="absolute size-4 rounded-2xs border-[1.5px] border-static-white shadow-[0_0_15px_rgba(0,0,0,0.25)] pointer-events-none"
				style={{
					backgroundColor: thumbColor,
					left: thumbLeft,
					top: thumbTop,
				}}
			/>
		</div>
	);
});

// ---------------------------------------------------------------------------
// Hue Slider (horizontal rainbow)
// ---------------------------------------------------------------------------

export const HueSlider: React.FC<{
	hue: number;
	onChange: (hue: number) => void;
}> = React.memo(({ hue, onChange }) => {
	const thumbRef = useRef<HTMLDivElement>(null);

	const handleMove = useCallback(
		(x: number) => {
			const h = Math.round(x * 360);

			// Move thumb instantly via DOM. The `hue` prop comes from Redux
			// via useFreshElement and stays stale until the debounced commit
			// lands, so the prop-driven position can't track the drag.
			if (thumbRef.current) {
				thumbRef.current.style.left = `clamp(0px, calc(${(h / 360) * 100}% - 8px), calc(100% - 16px))`;
				thumbRef.current.style.backgroundColor = `hsl(${h}, 100%, 50%)`;
			}

			onChange(h);
		},
		[onChange],
	);
	const onStart = useDrag(handleMove);

	return (
		<div
			data-drag-area
			className="relative h-[13px] rounded-full cursor-pointer select-none"
			style={{
				background:
					"linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
			}}
			onMouseDown={onStart}
			onTouchStart={onStart}
		>
			<div
				ref={thumbRef}
				className="absolute size-4 rounded-2xs border-[1.5px] border-static-white shadow-[0_0_15px_rgba(0,0,0,0.25)] pointer-events-none"
				style={{
					backgroundColor: `hsl(${hue}, 100%, 50%)`,
					left: `clamp(0px, calc(${(hue / 360) * 100}% - 8px), calc(100% - 16px))`,
					top: "50%",
					transform: "translateY(-50%)",
				}}
			/>
		</div>
	);
});

// ---------------------------------------------------------------------------
// Opacity Slider (checkerboard → color)
// ---------------------------------------------------------------------------

export const OpacitySlider: React.FC<{
	color: string;
	opacity: number; // 0-100
	onChange: (opacity: number) => void;
}> = React.memo(({ color, opacity, onChange }) => {
	const thumbRef = useRef<HTMLDivElement>(null);
	const opacityOverlayRef = useRef<HTMLDivElement>(null);

	const handleMove = useCallback(
		(x: number) => {
			const o = Math.round(x * 100);

			// Move thumb and update split-swatch overlay instantly via DOM.
			// The `opacity` prop is Redux-backed and stays stale until the
			// debounced commit lands.
			if (thumbRef.current) {
				thumbRef.current.style.left = `clamp(0px, calc(${o}% - 8px), calc(100% - 16px))`;
			}
			if (opacityOverlayRef.current) {
				opacityOverlayRef.current.style.opacity = `${o / 100}`;
			}

			onChange(o);
		},
		[onChange],
	);
	const onStart = useDrag(handleMove);

	return (
		<div
			data-drag-area
			className="relative h-[13px] rounded-full cursor-pointer select-none"
			onMouseDown={onStart}
			onTouchStart={onStart}
		>
			<div className="absolute inset-0 rounded-full overflow-hidden">
				<div className="absolute inset-0" style={checkerboardStyle} />
				<div
					className="absolute inset-0"
					style={{
						background: `linear-gradient(to right, transparent, ${color})`,
					}}
				/>
			</div>
			<div
				ref={thumbRef}
				className="absolute size-4 rounded-2xs border-[1.5px] border-static-white shadow-[0_0_15px_rgba(0,0,0,0.25)] pointer-events-none overflow-hidden"
				style={{
					backgroundColor: color,
					left: `clamp(0px, calc(${opacity}% - 8px), calc(100% - 16px))`,
					top: "50%",
					transform: "translateY(-50%)",
				}}
			>
				<div className="absolute top-0 right-0 w-[7px] h-full overflow-hidden rounded-r-[0.5px]">
					<div
						className="absolute inset-0"
						style={checkerboardStyle}
					/>
					<div
						ref={opacityOverlayRef}
						className="absolute inset-0"
						style={{
							backgroundColor: color,
							opacity: opacity / 100,
						}}
					/>
				</div>
			</div>
		</div>
	);
});

// ---------------------------------------------------------------------------
// Combined color picker (saturation + hue + opacity) — replaces react-colorful
// ---------------------------------------------------------------------------

export const ColorPicker: React.FC<{
	color: string;
	opacity?: number;
	onChange: (color: string, opacity: number) => void;
}> = ({ color, opacity = 100, onChange }) => {
	const hsv = hexToHsv(color);
	const hueRef = useRef(hsv.h);

	// Keep latest values in refs to avoid stale closures during drag
	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;
	const opacityRef = useRef(opacity);
	opacityRef.current = opacity;
	const colorRef = useRef(color);
	colorRef.current = color;
	const hsvRef = useRef(hsv);
	hsvRef.current = hsv;

	// Keep hue stable when color is achromatic (s === 0).
	// hexToHsv reports h=0 for any achromatic color (white/gray/black) since
	// hue is undefined without chroma — without this guard, dragging toward
	// the white corner of the SV square would snap hue to red.
	if (hsv.s > 0) {
		hueRef.current = hsv.h;
	}
	const stableHue = hsv.s === 0 ? hueRef.current : hsv.h;

	const handleSaturationChange = useCallback((s: number, v: number) => {
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

	const handleOpacityChange = useCallback((o: number) => {
		onChangeRef.current(colorRef.current, o);
	}, []);

	return (
		<>
			<SaturationPanel
				hue={stableHue}
				saturation={hsv.s}
				value={hsv.v}
				onChange={handleSaturationChange}
			/>
			<HueSlider hue={stableHue} onChange={handleHueChange} />
			{opacity !== undefined && (
				<OpacitySlider
					color={color}
					opacity={opacity}
					onChange={handleOpacityChange}
				/>
			)}
		</>
	);
};

// ---------------------------------------------------------------------------
// Gradient Bar — shows gradient with draggable stop thumbs
// ---------------------------------------------------------------------------

export const GradientBar: React.FC<{
	stops: { color: string; position: number; opacity?: number }[];
	activeIndex: number;
	onStopMove: (index: number, position: number) => void;
	onStopSelect: (index: number) => void;
	onDoubleClick?: (position: number) => void;
	onStopContextMenu?: (e: React.MouseEvent, index: number) => void;
	onStopDoubleClick?: (e: React.MouseEvent, index: number) => void;
}> = ({
	stops,
	activeIndex,
	onStopMove,
	onStopSelect,
	onDoubleClick,
	onStopContextMenu,
	onStopDoubleClick,
}) => {
	const barRef = useRef<HTMLDivElement>(null);
	const draggingRef = useRef<number | null>(null);
	const onStopMoveRef = useRef(onStopMove);
	onStopMoveRef.current = onStopMove;
	/** Per-thumb DOM refs so we can move them synchronously during drag.
	 *  Mirrors the HueSlider/OpacitySlider pattern: the `stops` prop is
	 *  Redux-backed and stays stale until the caller's debounced commit
	 *  lands, so the prop-driven `left` position can't track the drag. */
	const thumbRefs = useRef<(HTMLDivElement | null)[]>([]);

	const sorted = [...stops]
		.map((s, i) => ({ ...s, originalIndex: i }))
		.sort((a, b) => a.position - b.position);

	const gradientString = sorted
		.map((s) => {
			const rgb = hexToRgb(s.color);
			const a = (s.opacity ?? 100) / 100;
			return `rgba(${rgb.r},${rgb.g},${rgb.b},${a}) ${(s.position * 100).toFixed(0)}%`;
		})
		.join(", ");

	const handleThumbDown = useCallback(
		(e: React.MouseEvent, index: number) => {
			// Only handle left-click for dragging; right-click / ctrl+click is for context menu
			if (e.button !== 0 || e.ctrlKey) return;
			e.preventDefault();
			e.stopPropagation();
			draggingRef.current = index;
			onStopSelect(index);

			const handleMove = (ev: MouseEvent) => {
				ev.preventDefault();
				if (draggingRef.current !== null && barRef.current) {
					const rect = barRef.current.getBoundingClientRect();
					const pos = Math.max(
						0,
						Math.min(1, (ev.clientX - rect.left) / rect.width),
					);
					const quantized = Math.round(pos * 100) / 100;

					// Move thumb instantly via DOM so the drag feels smooth
					// even while the Redux-backed `stops` prop stays stale.
					const thumb = thumbRefs.current[draggingRef.current];
					if (thumb) {
						thumb.style.left = `clamp(-6px, calc(${quantized * 100}% - 14px), calc(100% - 20px))`;
					}

					onStopMoveRef.current(draggingRef.current, quantized);
				}
			};
			const handleEnd = () => {
				draggingRef.current = null;
				document.removeEventListener("mousemove", handleMove);
				document.removeEventListener("mouseup", handleEnd);
			};
			document.addEventListener("mousemove", handleMove);
			document.addEventListener("mouseup", handleEnd);
		},
		[onStopSelect],
	);

	const handleBarDoubleClick = useCallback(
		(e: React.MouseEvent) => {
			if (!barRef.current || !onDoubleClick) return;
			const rect = barRef.current.getBoundingClientRect();
			const pos = Math.max(
				0,
				Math.min(1, (e.clientX - rect.left) / rect.width),
			);
			onDoubleClick(Math.round(pos * 100) / 100);
		},
		[onDoubleClick],
	);

	const handleBarContextMenu = useCallback(
		(e: React.MouseEvent) => {
			if (!barRef.current || !onStopContextMenu || stops.length === 0)
				return;
			e.preventDefault();
			// Find the nearest stop to the click position
			const rect = barRef.current.getBoundingClientRect();
			const clickPos = (e.clientX - rect.left) / rect.width;
			let nearestIndex = 0;
			let nearestDist = Math.abs(stops[0].position - clickPos);
			for (let i = 1; i < stops.length; i++) {
				const dist = Math.abs(stops[i].position - clickPos);
				if (dist < nearestDist) {
					nearestDist = dist;
					nearestIndex = i;
				}
			}
			onStopContextMenu(e, nearestIndex);
		},
		[stops, onStopContextMenu],
	);

	return (
		<div
			ref={barRef}
			className="relative h-7 w-full select-none"
			onContextMenu={handleBarContextMenu}
		>
			{/* Gradient track — receives double-click for adding stops, context menu for nearest stop */}
			<div
				className="absolute inset-y-[6px] inset-x-0 rounded-sm cursor-pointer"
				style={{
					background: `linear-gradient(to right, ${gradientString})`,
				}}
				onDoubleClick={handleBarDoubleClick}
				onContextMenu={handleBarContextMenu}
			/>
			{/* Stop thumbs — outer div is larger hit area, inner div is the visible thumb.
			   Clamped so visible thumb (16px) stays inside the bar: left ranges from 0px to calc(100% - 16px). */}
			{stops.map((stop, i) => (
				<div
					key={`thumb-${i}`}
					ref={(el) => {
						thumbRefs.current[i] = el;
					}}
					className={`absolute size-7 cursor-grab top-1/2 -translate-y-1/2 flex items-center justify-center ${
						i === activeIndex ? "z-10" : "z-0"
					}`}
					style={{
						left: `clamp(-6px, calc(${stop.position * 100}% - 14px), calc(100% - 20px))`,
					}}
					onMouseDown={(e) => handleThumbDown(e, i)}
					onDoubleClick={(e) => {
						e.stopPropagation();
						onStopDoubleClick?.(e, i);
					}}
					onContextMenu={(e) => {
						if (onStopContextMenu) {
							e.preventDefault();
							e.stopPropagation();
							onStopContextMenu(e, i);
						}
					}}
				>
					<div
						className="size-4 rounded-2xs border-[1.5px] border-static-white shadow-[0_0_15px_rgba(0,0,0,0.25)] pointer-events-none"
						style={{ backgroundColor: stop.color }}
					/>
				</div>
			))}
		</div>
	);
};
