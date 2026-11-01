import { I, type IconName } from "./ci";

// Layer definitions name their icon (historically lucide names); each maps to a clueso-icons glyph.
const LAYER_ICONS: Record<string, IconName> = {
	Shapes: "Clueso",
	Motif: "Play",
	Split: "Split",
	Puzzle: "PuzzlePiece",
	JigsawPuzzle: "JigsawPuzzle",
	Flower: "Star4",
	LayoutGrid: "Grid",
	Slash: "Parallelogram",
	Triangle: "Triangle",
	ChevronsRight: "ChevronsRight",
	Sun: "Sun",
	Wind: "Wind",
	Blend: "GradientLinear",
	Type: "FontSize",
	Ruler: "Ruler",
	Square: "Square",
	Image: "Image",
	Grid3x3: "DotsNine",
	Grip: "DotsFour",
	Binary: "Code",
	Palette: "Swatches",
	Grid2x2: "Frame",
	Zap: "LightningBolt",
	SquareSplitHorizontal: "HorizontalStack",
	Columns3: "VerticalStack",
	Waves: "Waves",
	Droplet: "Blur",
	Aperture: "Opacity",
	Sparkles: "Sparkles",
	Circle: "Circle",
};

export function LayerIcon({ name, size = 16 }: { name: string; size?: number }) {
	const Icon = I[LAYER_ICONS[name] ?? "Shapes"];
	return <Icon width={size} height={size} />;
}
