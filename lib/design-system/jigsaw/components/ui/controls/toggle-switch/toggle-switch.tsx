import { cva } from "class-variance-authority";
import { motion } from "framer-motion";
import * as React from "react";
import { cn } from "../../../../lib/utils";

// Ease-out curve: fast start, slow end
const easeOut = [0.22, 1, 0.36, 1] as const;

const toggleSwitchVariants = cva(
	`
		relative flex cursor-pointer items-center
		w-[28px] h-4
		rounded-xs
		border border-solid
		overflow-visible
	`,
	{
		variants: {
			checked: {
				true: "bg-brand-normal border-[var(--pink-60)]",
				false: "bg-normal border-weak",
			},
			pressing: {
				true: "bg-brand-weak border-brand-weak",
				false: "",
			},
		},
		defaultVariants: {
			checked: false,
			pressing: false,
		},
	},
);

// Shadow values for different states
// Knob border matches the track border in both states
const shadows = {
	off: `
		2px 0px 3.75px 0px rgba(0,0,0,0.06),
		inset 0 0 0 1px var(--color-fg-stroke-weak)
	`,
	on: `
		-2px 0px 3.75px 0px rgba(0,0,0,0.06),
		inset 0 0 0 1px var(--color-fg-icon-brand-normal)
	`,
	offPressing: `
		2px 0px 3.75px 0px rgba(0,0,0,0.06),
		inset 0 0 0 1px var(--color-fg-stroke-brand-weak)
	`,
	onPressing: `
		-2px 0px 3.75px 0px rgba(0,0,0,0.06),
		inset 0 0 0 1px var(--color-fg-stroke-brand-weak)
	`,
};

export interface ToggleSwitchProps {
	checked?: boolean;
	defaultChecked?: boolean;
	onChange?: (checked: boolean) => void;
	disabled?: boolean;
	className?: string;
	style?: React.CSSProperties;
	icon?: React.ReactNode;
}

const ToggleSwitch = React.forwardRef<HTMLButtonElement, ToggleSwitchProps>(
	(
		{
			className,
			checked: controlledChecked,
			defaultChecked = false,
			onChange,
			disabled = false,
			style,
			icon,
		},
		ref,
	) => {
		const [internalChecked, setInternalChecked] =
			React.useState(defaultChecked);
		const [isPressing, setIsPressing] = React.useState(false);

		const isControlled = controlledChecked !== undefined;
		const isChecked = isControlled ? controlledChecked : internalChecked;

		const handleToggle = () => {
			if (disabled) return;

			const newChecked = !isChecked;
			if (!isControlled) {
				setInternalChecked(newChecked);
			}
			onChange?.(newChecked);
		};

		const handleMouseDown = () => {
			if (!disabled) {
				setIsPressing(true);
			}
		};

		const handleMouseUp = () => {
			setIsPressing(false);
		};

		const handleMouseLeave = () => {
			setIsPressing(false);
		};

		// Calculate knob position and width
		const knobWidth = isPressing ? 20 : 15;
		const knobX = isChecked ? 28 - knobWidth : -1;

		// Get the appropriate shadow based on state
		const getShadow = () => {
			if (isPressing) {
				return isChecked ? shadows.onPressing : shadows.offPressing;
			}
			return isChecked ? shadows.on : shadows.off;
		};

		return (
			<motion.button
				ref={ref}
				type="button"
				role="switch"
				aria-checked={isChecked}
				disabled={disabled}
				className={cn(
					toggleSwitchVariants({
						checked: isChecked,
						pressing: isPressing,
					}),
					disabled && "opacity-50 cursor-not-allowed",
					className,
				)}
				onClick={(e) => {
					e.stopPropagation();
					handleToggle();
				}}
				onMouseDown={handleMouseDown}
				onMouseUp={handleMouseUp}
				onMouseLeave={handleMouseLeave}
				initial={false}
				animate={{
					backgroundColor: isPressing
						? "var(--color-bg-brand-weak)"
						: isChecked
							? "var(--color-bg-brand-normal)"
							: "var(--color-bg-normal)",
					borderColor: isPressing
						? "var(--color-fg-stroke-brand-weak)"
						: isChecked
							? "var(--pink-60)"
							: "var(--color-fg-stroke-weak)",
				}}
				transition={{ duration: 0.2, ease: easeOut }}
				style={style}
			>
				<motion.span
					className="absolute rounded-xs bg-static-white flex items-center justify-center overflow-hidden"
					initial={false}
					animate={{
						x: knobX,
						width: knobWidth,
						height: 15,
						boxShadow: getShadow(),
					}}
					transition={{ type: "spring", stiffness: 500, damping: 30 }}
				>
					{icon && (
						<span className="absolute inset-0 flex items-center justify-center pointer-events-none">
							{icon}
						</span>
					)}
				</motion.span>
			</motion.button>
		);
	},
);

ToggleSwitch.displayName = "ToggleSwitch";

export { ToggleSwitch, toggleSwitchVariants };
