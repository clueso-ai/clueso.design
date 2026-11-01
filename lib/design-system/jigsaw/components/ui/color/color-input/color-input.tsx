import React from "react";
import { GradientColorPicker } from "../gradient-color-picker/gradient-color-picker";

export type ColorInputProps = {
	/** Current hex color value */
	value: string;
	/** Opacity 0–100 */
	opacity?: number;
	/** Called when the color changes */
	onChange?: (color: string) => void;
	/** Alias for onChange */
	onColorChange?: (color: string) => void;
	/** Whether to show the opacity control @default true */
	shouldShowOpacity?: boolean;
	/** Whether to show the eyedropper button */
	withEyedropper?: boolean;
	/** Called when the eyedropper button is clicked, receives a callback to invoke with the picked color */
	onEyedropperClick?: (
		onColorPicked: (color: string, opacity?: number) => void,
	) => void;
	/** Whether the eyedropper is currently active */
	isEyedropperActive?: boolean;
};

/**
 * A simple solid-color input built on GradientColorPicker.
 * Provides a flatter API for callers that don't need gradient or full opacity control.
 */
export const ColorInput: React.FC<ColorInputProps> = ({
	value,
	opacity = 100,
	onChange,
	onColorChange,
	shouldShowOpacity = true,
	withEyedropper = false,
	onEyedropperClick,
	isEyedropperActive = false,
}) => {
	const handleChange = (color: string, _opacity: number) => {
		onChange?.(color);
		onColorChange?.(color);
	};

	return (
		<GradientColorPicker
			color={value}
			opacity={opacity}
			onChange={handleChange}
			withOpacity={shouldShowOpacity}
			showOpacityLabel={shouldShowOpacity}
			withEyedropper={withEyedropper}
			startEyedropper={onEyedropperClick}
			isPickingColor={isEyedropperActive}
			enableGradient={false}
			withLabel={false}
		/>
	);
};
