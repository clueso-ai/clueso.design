// Any CSS colour as plain RGB, for drawing on canvases: a token like var(--bg-brand-normal), an
// oklch() from a colour picker, a hex. The colour is resolved through the cascade on `probe` (an
// element on the page, so tokens and the theme apply), then painted into one pixel and read back,
// which works whatever format the browser resolves it to. Browser only.

let pixel: CanvasRenderingContext2D | null = null;

export function rgbOf(probe: HTMLElement, css: string): { r: number; g: number; b: number; a: number } {
	pixel ??= Object.assign(document.createElement("canvas"), { width: 1, height: 1 }).getContext("2d", { willReadFrequently: true })!;
	probe.style.color = css;
	pixel.clearRect(0, 0, 1, 1);
	pixel.fillStyle = getComputedStyle(probe).color;
	pixel.fillRect(0, 0, 1, 1);
	const [r, g, b, a] = pixel.getImageData(0, 0, 1, 1).data;
	return { r, g, b, a: a / 255 };
}
