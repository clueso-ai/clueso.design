import * as SliderPrimitive from "@radix-ui/react-slider";
import * as React from "react";

import { cn } from "../../../../lib/utils";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "../../overlays/tooltip/tooltip";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
	InputGroupText,
} from "../input-group/input-group";

export const round10 = (num: number) => {
	return Math.round(num * 10) / 10;
};

export const roundN = (num: number, n: number) => {
	return Math.round(num * n) / n;
};

interface SliderProps extends Omit<
	React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>,
	"value" | "onValueChange"
> {
	value: number;
	onValueChange: (value: number) => void;
	label?: string;
	icon?: React.ReactNode;
	iconColor?: string;
	disabled?: boolean;
	className?: string;
	iconClassName?: string;
	unit?: string;
	editable?: boolean;
	unitHoverTip?: string;
	onFocus?: () => void;
	onBlur?: () => void;
	onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
	applyToAll?: {
		handler: (value: boolean) => void;
		value: boolean;
		disabled?: boolean;
	};
	applyToAllLabel?: string;
	hideValue?: boolean;
	reversed?: boolean;
	/**
	 * Position of the input relative to the slider track.
	 * @default "start"
	 */
	inputPosition?: "start" | "end";
}

const Slider = React.forwardRef<
	React.ElementRef<typeof SliderPrimitive.Root>,
	SliderProps
>(
	(
		{
			value,
			onValueChange,
			label,
			icon,
			iconColor,
			disabled = false,
			className,
			iconClassName,
			unit,
			editable = true,
			unitHoverTip,
			min = 0,
			max = 100,
			step = 0.1,
			onFocus,
			onBlur,
			onKeyDown,
			applyToAll,
			applyToAllLabel = "Apply to all clips",
			hideValue = false,
			reversed = false,
			inputPosition = "start",
			...props
		},
		ref,
	) => {
		const handleChangeSlider = (newValue: number[]) => {
			if (disabled) return;
			onValueChange(newValue[0]);
		};

		const onChangeInput = (newValue: number) => {
			if (disabled) return;
			const clampedValue = Math.max(min, Math.min(max, newValue));
			onValueChange(clampedValue);
		};

		const getRoundedValue = (val: number) => {
			if (!step) return round10(val);

			// Calculate decimal places needed based on step size
			const stepStr = step.toString();
			const decimalPlaces = stepStr.includes(".")
				? stepStr.split(".")[1].length
				: 0;
			const multiplier = 10 ** decimalPlaces;

			return Math.round(val * multiplier) / multiplier;
		};

		const displayValue = getRoundedValue(value);
		// Ensure displayValue is always a valid number (not NaN or undefined)
		// Fallback to the original value if displayValue is invalid, or to min if value is also invalid
		const safeDisplayValue =
			Number.isNaN(displayValue) || displayValue === undefined
				? Number.isNaN(value) || value === undefined
					? min
					: value
				: displayValue;
		const shouldShowValue = !hideValue;

		// Format display value to preserve trailing decimals based on step precision
		const formatDisplayValue = React.useCallback(
			(val: number) => {
				if (!step) return String(round10(val));
				const stepStr = step.toString();
				const decimalPlaces = stepStr.includes(".")
					? stepStr.split(".")[1].length
					: 0;
				return decimalPlaces > 0
					? val.toFixed(decimalPlaces)
					: String(val);
			},
			[step],
		);

		// Local input state allows empty/partial values while typing
		const [inputValue, setInputValue] = React.useState<string>(
			formatDisplayValue(safeDisplayValue),
		);
		const [isInputFocused, setIsInputFocused] = React.useState(false);

		// Sync local state when external value changes (but not while user is typing)
		React.useEffect(() => {
			if (!isInputFocused) {
				setInputValue(formatDisplayValue(safeDisplayValue));
			}
		}, [safeDisplayValue, isInputFocused, formatDisplayValue]);

		const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
			setInputValue(e.target.value);
			const numValue = Number.parseFloat(e.target.value);
			if (!Number.isNaN(numValue)) {
				onChangeInput(numValue);
			}
		};

		const handleInputBlur = () => {
			setIsInputFocused(false);
			const numValue = Number.parseFloat(inputValue);
			if (Number.isNaN(numValue) || inputValue.trim() === "") {
				setInputValue(String(safeDisplayValue));
			} else {
				onChangeInput(numValue);
			}
			onBlur?.();
		};

		const handleInputFocus = () => {
			setIsInputFocused(true);
			onFocus?.();
		};

		return (
			<div className={cn("flex flex-col gap-lg text-strong", className)}>
				{label && (
					<div className="flex items-center gap-md">
						{icon && (
							<div
								className={cn(
									"flex items-center justify-center stroke-weak",
									iconClassName,
								)}
								style={
									iconColor ? { color: iconColor } : undefined
								}
							>
								{icon}
							</div>
						)}
						<p className="label-xsmall text-weak">{label}</p>
					</div>
				)}

				<div className="flex items-center gap-md">
					{shouldShowValue && inputPosition === "start" && (
						<InputGroup className="shrink-0 w-fit">
							{unitHoverTip ? (
								<Tooltip>
									<TooltipTrigger asChild>
										<div>
											<InputGroupInput
												type="number"
												value={
													isInputFocused
														? inputValue
														: safeDisplayValue
												}
												onChange={handleInputChange}
												onFocus={handleInputFocus}
												onBlur={handleInputBlur}
												onKeyDown={onKeyDown}
												disabled={!editable || disabled}
												min={min}
												max={max}
												step={step}
												className="text-center flex-none! w-full text-strong!"
											/>
										</div>
									</TooltipTrigger>
									<TooltipContent>
										{unitHoverTip}
									</TooltipContent>
								</Tooltip>
							) : (
								<InputGroupInput
									type="number"
									value={
										isInputFocused
											? inputValue
											: safeDisplayValue
									}
									onChange={handleInputChange}
									onFocus={handleInputFocus}
									onBlur={handleInputBlur}
									onKeyDown={onKeyDown}
									disabled={!editable || disabled}
									min={min}
									max={max}
									step={step}
									className="text-center w-full"
								/>
							)}

							{unit && (
								<InputGroupAddon align="inline-end">
									<InputGroupText>{unit}</InputGroupText>
								</InputGroupAddon>
							)}
						</InputGroup>
					)}

					<SliderPrimitive.Root
						ref={ref}
						value={[value]}
						onValueChange={handleChangeSlider}
						min={min}
						max={max}
						step={step}
						disabled={disabled}
						dir={reversed ? "rtl" : "ltr"}
						className={cn(
							"relative flex flex-1 touch-none select-none items-center",
							disabled && "opacity-50",
						)}
						{...props}
					>
						{/* Track height matches InputGroup xsmall height (24px) */}
						<SliderPrimitive.Track className="relative h-[24px] w-full grow rounded-xs bg-depth-inset-2 p-[2px]">
							{/* Custom range element */}
							<div
								className={cn(
									"h-full bg-brand-normal rounded-[2px] flex items-center p-[2px]",
									reversed ? "justify-start" : "justify-end",
								)}
								style={{
									// Width based on value percentage, minimum of 6px to show the indicator
									width: `max(6px, ${((value - min) / (max - min)) * 100}%)`,
								}}
							>
								{/* Vertical bar indicator (slider base) */}
								<div className="w-[2px] h-full rounded-full bg-brand-weak shrink-0" />
							</div>
							{/* Hide Radix's default Range */}
							<SliderPrimitive.Range className="hidden" />
						</SliderPrimitive.Track>
						{/* Thumb is visually hidden but still functional for dragging */}
						<SliderPrimitive.Thumb className="size-0 focus-visible:outline-none" />
					</SliderPrimitive.Root>

					{shouldShowValue && inputPosition === "end" && (
						<InputGroup className="shrink-0 w-fit">
							{unitHoverTip ? (
								<Tooltip>
									<TooltipTrigger asChild>
										<div>
											<InputGroupInput
												type="number"
												value={
													isInputFocused
														? inputValue
														: safeDisplayValue
												}
												onChange={handleInputChange}
												onFocus={handleInputFocus}
												onBlur={handleInputBlur}
												onKeyDown={onKeyDown}
												disabled={!editable || disabled}
												min={min}
												max={max}
												step={step}
												className="text-center flex-none! w-full text-strong!"
											/>
										</div>
									</TooltipTrigger>
									<TooltipContent>
										{unitHoverTip}
									</TooltipContent>
								</Tooltip>
							) : (
								<InputGroupInput
									type="number"
									value={
										isInputFocused
											? inputValue
											: safeDisplayValue
									}
									onChange={handleInputChange}
									onFocus={handleInputFocus}
									onBlur={handleInputBlur}
									onKeyDown={onKeyDown}
									disabled={!editable || disabled}
									min={min}
									max={max}
									step={step}
									className="text-center w-full"
								/>
							)}

							{unit && (
								<InputGroupAddon align="inline-end">
									<InputGroupText>{unit}</InputGroupText>
								</InputGroupAddon>
							)}
						</InputGroup>
					)}
				</div>

				{/* {applyToAll && (
					<div
						style={{
							opacity: applyToAll.disabled ? 0.5 : 1,
						}}
						className="flex items-center gap-md"
					>
						<span className="label-xsmall text-normal">
							{applyToAllLabel}
						</span>
						<button
							type="button"
							role="switch"
							aria-checked={applyToAll.value}
							onClick={() =>
								applyToAll.handler(!applyToAll.value)
							}
							disabled={applyToAll.disabled}
							className={cn(
								"relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-weak focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
								applyToAll.value
									? "bg-brand-normal"
									: "bg-depth-inset-1 border border-weak",
							)}
						>
							<span
								className={cn(
									"inline-block size-4 transform rounded-full bg-static-white transition-transform",
									applyToAll.value
										? "translate-x-4"
										: "translate-x-0.5",
								)}
							/>
						</button>
					</div>
				)} */}
			</div>
		);
	},
);

Slider.displayName = "Slider";

export { Slider };
export type { SliderProps };
