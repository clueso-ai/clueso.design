export type GradientColorStop = {
	color: string;
	position: number; // 0-1
	opacity?: number; // 0-100
};

export type GradientSetting = {
	show: boolean;
	type: "linear" | "radial";
	angle?: number;
	colorStops: GradientColorStop[];
};
