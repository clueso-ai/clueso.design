import React from "react";
import { ColorPicker } from "./color-primitives";

type ColorPickerWithFormatProps = {
	color: string;
	opacity?: number; // 0-100, omit to hide alpha slider
	onChange: (color: string, opacity: number) => void;
};

export const ColorPickerWithFormat: React.FC<ColorPickerWithFormatProps> = ({
	color,
	opacity,
	onChange,
}) => {
	return <ColorPicker color={color} opacity={opacity} onChange={onChange} />;
};
