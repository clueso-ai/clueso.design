import { type VariantProps, cva } from "class-variance-authority";
import * as React from "react";

import { cn } from "../../../../lib/utils";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "../../overlays/tooltip/tooltip";
import { Button } from "../button/button";
import { Input, showFakeCursor } from "../input/input";
import { Textarea } from "../textarea/textarea";

/**
 * InputGroup Component - Jigsaw Design System
 *
 * SIZES (following component sizing paradigm):
 * ┌─────────┬──────────┬──────────┬───────────────┬─────────────────────┐
 * │ Size    │ Height   │ Icon     │ Typography    │ Padding (H × V)     │
 * ├─────────┼──────────┼──────────┼───────────────┼─────────────────────┤
 * │ xsmall  │ 24px     │ 14px     │ label-xsmall  │ 6px × 5px           │
 * │ small   │ 28px     │ 16px     │ label-xsmall  │ 8px × 6px           │
 * │ medium  │ 32px     │ 16px     │ label-small   │ 12px × 8px          │
 * │ large   │ 40px     │ 20px     │ label-medium  │ 16px × 10px         │
 * └─────────┴──────────┴──────────┴───────────────┴─────────────────────┘
 */

// Size configuration for InputGroup
const inputGroupSizeConfig = {
	xsmall: {
		height: "h-[24px]",
		iconSize: "size-[14px]",
		typography: "label-xsmall",
		inputHeight: "h-[14px]",
		padding: "px-sm py-xs",
		radius: "rounded-xs", // 4px
	},
	small: {
		height: "h-[28px]",
		iconSize: "size-[16px]",
		typography: "label-xsmall",
		inputHeight: "h-[16px]",
		padding: "px-md py-sm",
		radius: "rounded-xs", // 4px
	},
	medium: {
		height: "h-[32px]",
		iconSize: "size-[16px]",
		typography: "label-small",
		inputHeight: "h-[16px]",
		padding: "px-xl py-md",
		radius: "rounded-sm", // 6px
	},
	large: {
		height: "h-[40px]",
		iconSize: "size-[20px]",
		typography: "label-medium",
		inputHeight: "h-[20px]",
		padding: "px-2xl py-lg",
		radius: "rounded-sm", // 6px
	},
} as const;

export type InputGroupSize = keyof typeof inputGroupSizeConfig;

// Context to pass size from InputGroup to children
const InputGroupSizeContext = React.createContext<InputGroupSize>("xsmall");

interface InputGroupProps extends React.ComponentProps<"div"> {
	/**
	 * Size of the input group (xsmall: 24px, small: 28px, medium: 32px, large: 40px)
	 * @default "xsmall"
	 */
	size?: InputGroupSize;
	/**
	 * When true, enables drag-to-scrub functionality.
	 * Dragging on the input group label will adjust the numeric value.
	 * The cursor changes to ew-resize during dragging.
	 */
	scrubbable?: boolean;
	/**
	 * Validation function called during scrubbing.
	 * Receives the raw computed value and should validate and update the value.
	 * Required when scrubbable is true.
	 */
	onScrubValidate?: (value: number) => void;
	/**
	 * Callback fired when scrub interaction ends (pointer up).
	 */
	onScrubEnd?: () => void;
	/**
	 * Tooltip text shown on hover. Useful for icon-only inputs where the
	 * purpose isn't immediately obvious.
	 */
	tooltip?: string;
}

function InputGroup({
	className,
	size = "xsmall",
	scrubbable = false,
	onScrubValidate,
	onScrubEnd,
	tooltip,
	...props
}: InputGroupProps) {
	const groupRef = React.useRef<HTMLDivElement>(null);
	const isDraggingRef = React.useRef(false);
	const hasDraggedRef = React.useRef(false);
	const startValueRef = React.useRef(0);
	const accumulatedDeltaRef = React.useRef(0);
	const fakeCursorRef = React.useRef<HTMLElement | null>(null);

	const sizeConfig = inputGroupSizeConfig[size];

	// Store onScrubValidate in a ref to avoid stale closures
	const onScrubValidateRef = React.useRef(onScrubValidate);
	onScrubValidateRef.current = onScrubValidate;
	const onScrubEndRef = React.useRef(onScrubEnd);
	onScrubEndRef.current = onScrubEnd;

	React.useEffect(() => {
		if (!scrubbable || !groupRef.current) return;

		const inputGroup = groupRef.current;
		const input = inputGroup.querySelector("input");
		if (!input) return;

		const addons = Array.from(
			inputGroup.querySelectorAll("[data-slot=input-group-addon]"),
		) as HTMLElement[];
		for (const el of addons) {
			el.style.cursor = "ew-resize";
		}

		const handlePointerDown = (e: PointerEvent) => {
			const target = e.target as HTMLElement;
			if (
				target.closest("input") ||
				target.closest('[data-slot="input-spin-buttons"]')
			)
				return;

			e.preventDefault();
			isDraggingRef.current = true;
			hasDraggedRef.current = false;
			startValueRef.current = Number.parseFloat(input.value) || 0;
			accumulatedDeltaRef.current = 0;

			fakeCursorRef.current = showFakeCursor(e.clientX, e.clientY);
			inputGroup.requestPointerLock();
		};

		const handlePointerMove = (e: PointerEvent) => {
			if (!isDraggingRef.current) return;

			hasDraggedRef.current = true;

			accumulatedDeltaRef.current += e.movementX;
			const newValue =
				startValueRef.current + accumulatedDeltaRef.current;

			if (onScrubValidateRef.current) {
				onScrubValidateRef.current(newValue);
			}
		};

		const handlePointerUp = () => {
			if (!isDraggingRef.current) return;

			isDraggingRef.current = false;
			document.exitPointerLock();
			fakeCursorRef.current?.remove();
			fakeCursorRef.current = null;

			if (hasDraggedRef.current) {
				onScrubEndRef.current?.();
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

		// pointercancel fires when a scroll gesture (e.g. trackpad two-finger
		// scroll) takes over from an in-progress pointer drag. Without this
		// handler, isDraggingRef stays true and the pointer lock persists, so
		// any subsequent mouse movement (including resize drags) is dispatched
		// to the still-locked inputGroup and changes the scrub value.
		const handlePointerCancel = () => {
			if (!isDraggingRef.current) return;
			isDraggingRef.current = false;
			document.exitPointerLock();
			fakeCursorRef.current?.remove();
			fakeCursorRef.current = null;
		};

		inputGroup.addEventListener(
			"pointerdown",
			handlePointerDown as EventListener,
		);
		inputGroup.addEventListener(
			"pointermove",
			handlePointerMove as EventListener,
		);
		inputGroup.addEventListener(
			"pointerup",
			handlePointerUp as EventListener,
		);
		inputGroup.addEventListener(
			"pointercancel",
			handlePointerCancel as EventListener,
		);

		return () => {
			inputGroup.removeEventListener(
				"pointerdown",
				handlePointerDown as EventListener,
			);
			inputGroup.removeEventListener(
				"pointermove",
				handlePointerMove as EventListener,
			);
			inputGroup.removeEventListener(
				"pointerup",
				handlePointerUp as EventListener,
			);
			inputGroup.removeEventListener(
				"pointercancel",
				handlePointerCancel as EventListener,
			);
			for (const el of addons) {
				el.style.cursor = "";
			}
			if (isDraggingRef.current) {
				document.exitPointerLock();
			}
			fakeCursorRef.current?.remove();
			fakeCursorRef.current = null;
		};
	}, [scrubbable]);

	const innerDiv = (
		<div
			ref={groupRef}
			data-slot="input-group"
			data-size={size}
			role="group"
			className={cn(
				"group/input-group border border-weak bg-depth-inset-1 relative flex w-full items-center gap-xs outline-none",
				"transition-[background-color,border-color,box-shadow]",
				sizeConfig.height,
				sizeConfig.radius,
				"min-w-0 has-[>textarea]:h-auto",
				// Apply padding, but override vertical padding for textareas to 6px
				sizeConfig.padding,
				"has-[>textarea]:!py-sm",

				// Variants based on alignment.
				"has-[>[data-align=inline-end]]:[&>input]:pr-md",
				"has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-start]]:[&>input]:pb-md",
				"has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-md",

				// Hover state - only when not focused and not disabled
				"hover:bg-interaction-hover-subtle",
				"has-[[data-slot=input-group-control]:focus-visible]:hover:bg-interaction-hover-subtle",
				"has-[[data-slot=input-group-control]:disabled]:hover:bg-depth-inset-1",

				// Disabled state.
				"has-[[data-slot=input-group-control]:disabled]:cursor-not-allowed has-[[data-slot=input-group-control]:disabled]:opacity-50",

				// Focus state - pink border with shadow ring
				"has-[[data-slot=input-group-control]:focus-visible]:bg-interaction-selected-subtle has-[[data-slot=input-group-control]:focus-visible]:border-brand-normal has-[[data-slot=input-group-control]:focus-visible]:shadow-[0px_0px_0px_1px_rgba(218,92,199,0.25)]",

				// Error state.
				"has-[[data-slot][aria-invalid=true]]:ring-negative-weak has-[[data-slot][aria-invalid=true]]:border-negative-normal",

				className,
			)}
			{...props}
		/>
	);

	if (tooltip) {
		return (
			<InputGroupSizeContext.Provider value={size}>
				<Tooltip>
					<TooltipTrigger asChild>{innerDiv}</TooltipTrigger>
					<TooltipContent side="top" align="start">
						{tooltip}
					</TooltipContent>
				</Tooltip>
			</InputGroupSizeContext.Provider>
		);
	}

	return (
		<InputGroupSizeContext.Provider value={size}>
			{innerDiv}
		</InputGroupSizeContext.Provider>
	);
}

const inputGroupAddonVariants = cva(
	"relative flex h-auto cursor-text items-center justify-center gap-2xs select-none [&>svg]:shrink-0 [&>img]:shrink-0 [&>img]:object-contain [&>kbd]:rounded-2xs group-data-[disabled=true]/input-group:opacity-50 before:absolute before:inset-[-4px] before:content-['']",
	{
		variants: {
			align: {
				"inline-start":
					"order-first text-weak has-[>button]:ml-[-0.45rem] has-[>kbd]:ml-[-0.35rem] [&>svg]:stroke-weak",
				"inline-end":
					"order-last text-weak has-[>button]:mr-[-0.45rem] has-[>kbd]:mr-[-0.35rem] [&>svg]:stroke-weak",
				"block-start":
					"order-first w-full justify-start pt-md [.border-b]:pb-md group-has-[>input]/input-group:pt-md",
				"block-end":
					"order-last w-full justify-start pb-md [.border-t]:pt-md group-has-[>input]/input-group:pb-md",
			},
		},
		defaultVariants: {
			align: "inline-start",
		},
	},
);

function InputGroupAddon({
	className,
	align = "inline-start",
	...props
}: React.ComponentProps<"div"> & VariantProps<typeof inputGroupAddonVariants>) {
	const size = React.useContext(InputGroupSizeContext);
	const config = inputGroupSizeConfig[size];

	return (
		<div
			role="group"
			data-slot="input-group-addon"
			data-align={align}
			className={cn(
				inputGroupAddonVariants({ align }),
				config.typography,
				// Dynamic icon sizes based on InputGroup size
				`[&>svg:not([class*='size-'])]:${config.iconSize}`,
				`[&>img:not([class*='size-'])]:${config.iconSize}`,
				className,
			)}
			onClick={(e) => {
				if ((e.target as HTMLElement).closest("button")) {
					return;
				}
				e.currentTarget.parentElement?.querySelector("input")?.focus();
			}}
			{...props}
		/>
	);
}

const inputGroupButtonVariants = cva("shadow-none flex items-center", {
	variants: {
		size: {
			xsmall: "h-[14px] gap-2xs px-xs rounded-2xs", // Fits in 24px InputGroup
			small: "h-[16px] gap-2xs px-xs rounded-2xs", // Fits in 28px InputGroup
			medium: "h-[16px] gap-2xs px-sm rounded-xs", // Fits in 32px InputGroup
			large: "h-[20px] gap-xs px-md rounded-xs", // Fits in 40px InputGroup
			"icon-xsmall": "size-[14px] rounded-2xs p-0", // Icon-only for 24px InputGroup
			"icon-small": "size-[16px] rounded-2xs p-0", // Icon-only for 28px InputGroup
			"icon-medium": "size-[16px] rounded-xs p-0", // Icon-only for 32px InputGroup
			"icon-large": "size-[20px] rounded-xs p-0", // Icon-only for 40px InputGroup
		},
	},
	defaultVariants: {
		size: "xsmall",
	},
});

export type InputGroupButtonSize =
	| "xsmall"
	| "small"
	| "medium"
	| "large"
	| "icon-xsmall"
	| "icon-small"
	| "icon-medium"
	| "icon-large";

function InputGroupButton({
	className,
	type = "button",
	style = "filled",
	size,
	...props
}: Omit<React.ComponentProps<typeof Button>, "size"> & {
	size?: InputGroupButtonSize;
}) {
	const groupSize = React.useContext(InputGroupSizeContext);
	const config = inputGroupSizeConfig[groupSize];
	// Use provided size or derive from InputGroup size
	const resolvedSize = size || groupSize;

	return (
		<Button
			type={type}
			data-size={resolvedSize}
			style={style}
			className={cn(
				inputGroupButtonVariants({ size: resolvedSize }),
				config.typography,
				className,
			)}
			{...props}
		/>
	);
}

function InputGroupText({ className, ...props }: React.ComponentProps<"span">) {
	const size = React.useContext(InputGroupSizeContext);
	const config = inputGroupSizeConfig[size];

	return (
		<span
			className={cn(
				"text-weak flex items-center gap-2xs [&_svg]:pointer-events-none [&_svg]:stroke-weak",
				config.typography,
				`[&_svg:not([class*='size-'])]:${config.iconSize}`,
				className,
			)}
			{...props}
		/>
	);
}

/**
 * Opt-in props for managed-draft inputs whose authoritative value lives outside
 * React (Redux + override store) and may change continuously while the user is
 * mid-edit (e.g. on-canvas drags). Pass `liveValue` to enable; the input then
 * keeps an internal string draft, syncs it from `liveValue` only when not
 * focused, and emits parsed-number callbacks for preview/commit. When
 * `liveValue` is omitted the input behaves like a normal controlled `<input>`.
 *
 * Render-time sync (not `useEffect`) is intentional — external updates land on
 * the next paint without an extra commit cycle.
 */
type LiveValueProps = {
	/** External authoritative value. When provided, switches to managed-draft mode. */
	liveValue?: number;
	/** Format `liveValue` → draft string. Default: `String(Math.round(v))`. */
	formatLive?: (value: number) => string;
	/** Called on each keystroke with the parsed number (NaN suppressed). */
	onPreview?: (value: number) => void;
	/** Called on blur / Enter with the parsed number (NaN suppressed). */
	onCommit?: (value: number) => void;
};

type InputGroupInputProps = Omit<
	React.ComponentProps<"input">,
	"value" | "defaultValue"
> &
	LiveValueProps & {
		value?: React.ComponentProps<"input">["value"];
		defaultValue?: React.ComponentProps<"input">["defaultValue"];
		/**
		 * Forwarded to the underlying `Input`'s drag-to-scrub. Defaults to
		 * `true` for `type="number"`. Pass `false` to lock the value (e.g. for
		 * a disabled input — scrubbing otherwise bypasses `disabled`).
		 */
		scrubbable?: boolean;
	};

function InputGroupInput({
	className,
	min,
	max,
	liveValue,
	formatLive,
	onPreview,
	onCommit,
	value,
	onChange,
	onFocus,
	onBlur,
	onKeyDown,
	scrubbable,
	...props
}: InputGroupInputProps) {
	const size = React.useContext(InputGroupSizeContext);
	const config = inputGroupSizeConfig[size];

	const isManaged = liveValue !== undefined;
	const format = formatLive ?? ((v: number) => String(Math.round(v)));

	// Managed-draft state. These hooks run unconditionally so hook order is
	// stable across renders even when consumers toggle `liveValue` on/off.
	const [draft, setDraft] = React.useState<string>(() =>
		isManaged ? format(liveValue as number) : "",
	);
	const [prevLive, setPrevLive] = React.useState<number | undefined>(
		liveValue,
	);
	const focusedRef = React.useRef(false);
	if (isManaged && liveValue !== prevLive) {
		setPrevLive(liveValue);
		if (!focusedRef.current) setDraft(format(liveValue as number));
	}

	// Exclude min/max from props to avoid type conflicts
	const {
		min: _,
		max: __,
		...restProps
	} = props as {
		min?: string | number;
		max?: string | number;
		[key: string]: unknown;
	};

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (isManaged) {
			setDraft(e.target.value);
			const parsed = Number.parseFloat(e.target.value);
			if (!Number.isNaN(parsed)) onPreview?.(parsed);
		}
		onChange?.(e);
	};

	const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
		if (isManaged) focusedRef.current = true;
		onFocus?.(e);
	};

	const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
		if (isManaged) {
			focusedRef.current = false;
			const parsed = Number.parseFloat(e.target.value);
			if (!Number.isNaN(parsed)) onCommit?.(parsed);
			// Reset draft from the authoritative value so a NaN/empty entry
			// snaps back to the live number on blur.
			setDraft(format(liveValue as number));
		}
		onBlur?.(e);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (isManaged && e.key === "Enter") {
			e.preventDefault();
			e.currentTarget.blur();
		}
		onKeyDown?.(e);
	};

	return (
		<Input
			data-slot="input-group-control"
			className={cn(
				"flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:border-0 dark:bg-transparent text-strong px-0 py-0",
				config.typography,
				config.inputHeight,
				className,
			)}
			{...restProps}
			scrubbable={scrubbable}
			value={isManaged ? draft : value}
			onChange={handleChange}
			onFocus={handleFocus}
			onBlur={handleBlur}
			onKeyDown={handleKeyDown}
			min={min !== undefined ? Number(min) : undefined}
			max={max !== undefined ? Number(max) : undefined}
		/>
	);
}

function InputGroupTextarea({
	className,
	...props
}: React.ComponentProps<"textarea">) {
	const size = React.useContext(InputGroupSizeContext);
	const config = inputGroupSizeConfig[size];

	return (
		<Textarea
			data-slot="input-group-control"
			className={cn(
				"flex-1 resize-none rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:border-0 dark:bg-transparent",
				"!px-0 !py-0 h-[40px] min-h-[40px]",
				"hover:bg-transparent focus:bg-transparent focus:border-0 focus:shadow-none",
				"disabled:hover:bg-transparent",
				config.typography,
				className,
			)}
			{...props}
		/>
	);
}

export {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupText,
	InputGroupInput,
	InputGroupTextarea,
};
