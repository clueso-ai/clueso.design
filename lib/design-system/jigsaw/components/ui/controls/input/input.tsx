import * as React from "react";

import { cn } from "../../../../lib/utils";

const EW_RESIZE_SVG = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="black" stroke="white" stroke-width="1" d="M4 12l4-4v3h8V8l4 4-4 4v-3H8v3z"/></svg>')}`;

function showFakeCursor(x: number, y: number): HTMLImageElement {
	const el = document.createElement("img");
	el.src = EW_RESIZE_SVG;
	el.style.cssText = `position:fixed;left:${x - 12}px;top:${y - 12}px;width:24px;height:24px;pointer-events:none;z-index:2147483647;`;
	document.body.appendChild(el);
	return el;
}

/**
 * Scrubbing hook for numeric inputs.
 * Enables drag-to-scrub functionality. Uses pointer lock to freeze
 * the cursor in place and renders a fake ew-resize cursor at the
 * click position so the user sees a cursor during the lock.
 */
function useScrub({
	inputRef,
	enabled,
	min,
	max,
	step = 1,
	onChange,
}: {
	inputRef: React.RefObject<HTMLInputElement | null>;
	enabled: boolean;
	min?: number;
	max?: number;
	step?: number;
	onChange?: (value: number) => void;
}) {
	const isDraggingRef = React.useRef(false);
	const hasDraggedRef = React.useRef(false);
	const fakeCursorRef = React.useRef<HTMLElement | null>(null);

	React.useEffect(() => {
		if (!enabled || !inputRef.current) return;

		const input = inputRef.current;
		const parent = input.parentElement;
		if (!parent) return;

		const updateValue = (rawValue: number) => {
			let clampedValue = rawValue;
			if (min !== undefined) clampedValue = Math.max(min, clampedValue);
			if (max !== undefined) clampedValue = Math.min(max, clampedValue);

			// Clean float epsilon without snapping to step grid — see
			// `stepValue` below for the rationale.
			const stepDecimals = step.toString().includes(".")
				? step.toString().split(".")[1].length
				: 0;
			const decimalPlaces = Math.max(stepDecimals, 6);
			const finalValue =
				Math.round(clampedValue * 10 ** decimalPlaces) /
				10 ** decimalPlaces;

			const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
				window.HTMLInputElement.prototype,
				"value",
			)?.set;
			if (nativeInputValueSetter) {
				nativeInputValueSetter.call(input, finalValue.toString());
				input.dispatchEvent(new Event("input", { bubbles: true }));
			}

			onChange?.(finalValue);
		};

		const handlePointerDown = (e: PointerEvent) => {
			const target = e.target as HTMLElement;
			if (
				target === input ||
				target.closest('[data-slot="input-spin-buttons"]')
			)
				return;

			e.preventDefault();
			isDraggingRef.current = true;
			hasDraggedRef.current = false;

			fakeCursorRef.current = showFakeCursor(e.clientX, e.clientY);
			parent.requestPointerLock();
		};

		const handlePointerMove = (e: PointerEvent) => {
			if (!isDraggingRef.current) return;

			hasDraggedRef.current = true;

			const delta = e.movementX;
			const currentValue = Number.parseFloat(input.value) || 0;
			const newValue = currentValue + delta * step;
			updateValue(newValue);
		};

		const handlePointerUp = () => {
			if (!isDraggingRef.current) return;

			isDraggingRef.current = false;
			document.exitPointerLock();
			fakeCursorRef.current?.remove();
			fakeCursorRef.current = null;

			if (hasDraggedRef.current) {
				const preventClick = (ev: MouseEvent) => {
					ev.stopPropagation();
					document.removeEventListener("click", preventClick, true);
				};
				document.addEventListener("click", preventClick, true);
				setTimeout(() => {
					document.removeEventListener("click", preventClick, true);
				}, 100);
			}
		};

		// Only set ew-resize cursor on addon areas, not on the input or spin buttons
		for (const child of Array.from(parent.children)) {
			const el = child as HTMLElement;
			if (
				el !== input &&
				!el.matches('[data-slot="input-spin-buttons"]')
			) {
				el.style.cursor = "ew-resize";
			}
		}

		parent.addEventListener(
			"pointerdown",
			handlePointerDown as EventListener,
		);
		parent.addEventListener(
			"pointermove",
			handlePointerMove as EventListener,
		);
		parent.addEventListener("pointerup", handlePointerUp as EventListener);

		return () => {
			parent.removeEventListener(
				"pointerdown",
				handlePointerDown as EventListener,
			);
			parent.removeEventListener(
				"pointermove",
				handlePointerMove as EventListener,
			);
			parent.removeEventListener(
				"pointerup",
				handlePointerUp as EventListener,
			);
			for (const child of Array.from(parent.children)) {
				(child as HTMLElement).style.cursor = "";
			}
			if (isDraggingRef.current) {
				document.exitPointerLock();
			}
			fakeCursorRef.current?.remove();
			fakeCursorRef.current = null;
		};
	}, [enabled, min, max, step, onChange, inputRef]);
}

interface InputProps extends React.ComponentProps<"input"> {
	selectOnFocus?: boolean;
	/**
	 * Enable numeric scrubbing with arrow keys.
	 * Up/Down: ±1, Shift+Up/Down: ±10
	 */
	numericKeyboard?: boolean;
	/**
	 * Enable drag-to-scrub functionality on the input's parent container.
	 * Dragging left/right will decrease/increase the numeric value.
	 * The cursor will wrap around screen edges.
	 * @default true for type="number"
	 */
	scrubbable?: boolean;
	/**
	 * Minimum value for numeric inputs
	 */
	min?: number;
	/**
	 * Maximum value for numeric inputs
	 */
	max?: number;
	/**
	 * Step for numeric inputs (default 1)
	 */
	step?: number;
}

function stepValue(
	input: HTMLInputElement,
	direction: 1 | -1,
	step: number,
	min?: number,
	max?: number,
) {
	const currentValue = Number.parseFloat(input.value) || 0;
	let newValue = currentValue + direction * step;
	if (min !== undefined) newValue = Math.max(min, newValue);
	if (max !== undefined) newValue = Math.min(max, newValue);
	// Clean up float epsilon (0.1 + 0.2 = 0.30000000000000004 etc.) without
	// snapping to the step grid — an integer step on a decimal value (e.g.
	// arrow-up on 105.7 with step=1) should produce 106.7, not 107. Use the
	// max of step's precision and a generous 6 decimals so the original
	// sub-step portion is preserved.
	const stepDecimals = step.toString().includes(".")
		? step.toString().split(".")[1].length
		: 0;
	const decimalPlaces = Math.max(stepDecimals, 6);
	newValue = Math.round(newValue * 10 ** decimalPlaces) / 10 ** decimalPlaces;
	const setter = Object.getOwnPropertyDescriptor(
		window.HTMLInputElement.prototype,
		"value",
	)?.set;
	if (setter) {
		setter.call(input, newValue.toString());
		input.dispatchEvent(new Event("input", { bubbles: true }));
	}
}

function Input({
	className,
	type,
	onFocus,
	onKeyDown,
	selectOnFocus = true,
	numericKeyboard = false,
	scrubbable,
	min,
	max,
	step = 1,
	...props
}: InputProps) {
	const inputRef = React.useRef<HTMLInputElement>(null);

	const isScrubEnabled = scrubbable ?? type === "number";

	useScrub({
		inputRef,
		enabled: isScrubEnabled,
		min,
		max,
		step,
	});

	const handleFocus = React.useCallback(
		(e: React.FocusEvent<HTMLInputElement>) => {
			if (selectOnFocus) {
				e.target.select();
			}
			onFocus?.(e);
		},
		[onFocus, selectOnFocus],
	);

	const handleWheel = React.useCallback(
		(e: React.WheelEvent<HTMLInputElement>) => {
			if (e.currentTarget === document.activeElement) {
				e.currentTarget.blur();
			}
		},
		[],
	);

	const handleKeyDown = React.useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (numericKeyboard || type === "number") {
				if (e.key === "ArrowUp" || e.key === "ArrowDown") {
					e.preventDefault();
					const delta = e.shiftKey ? step * 10 : step;
					stepValue(
						e.currentTarget,
						e.key === "ArrowUp" ? 1 : -1,
						delta,
						min,
						max,
					);
				}
			}
			onKeyDown?.(e);
		},
		[numericKeyboard, type, min, max, step, onKeyDown],
	);

	const inputElement = (
		<input
			ref={inputRef}
			type={type}
			data-slot="input"
			onFocus={handleFocus}
			onKeyDown={handleKeyDown}
			onWheel={type === "number" ? handleWheel : undefined}
			className={cn(
				"bg-transparent border-0 outline-none shadow-none ring-0 rounded-none",
				"w-full min-w-0 h-auto px-0 py-0",
				"label-xsmall text-strong transition-[color,box-shadow]",
				"selection:bg-brand-normal selection:text-inverted",
				"placeholder:text-weak",
				"focus-visible:ring-0 focus-visible:border-0",
				"disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
				"file:text-strong file:inline-flex file:h-7 file:border-0 file:bg-transparent file:label-xsmall",
				type === "number" &&
					"[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
				type === "search" &&
					"[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none",
				className,
			)}
			min={min}
			max={max}
			step={step}
			{...props}
		/>
	);

	return inputElement;
}

export { Input, useScrub, showFakeCursor, type InputProps };
