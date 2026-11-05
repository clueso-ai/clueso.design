import { GRID } from "../engine/engine";
import { currentSvg, useIconLab } from "../state/store";

// Export: the current icon as an SVG file, a transparent PNG at a size, or SVG code on the clipboard.

function download(name: string, href: string) {
	const a = document.createElement("a");
	a.href = href;
	a.download = name;
	document.body.appendChild(a);
	a.click();
	a.remove();
}

function fileName() {
	const s = useIconLab.getState();
	return s.round ? `${s.current.name}-round` : s.current.name;
}

export function downloadSvg() {
	download(`${fileName()}.svg`, `data:image/svg+xml;charset=utf-8,${encodeURIComponent(currentSvg(useIconLab.getState()))}`);
}

export function downloadPng(size: number) {
	const s = useIconLab.getState();
	// Render at the export size so strokes stay sharp, not upscaled from 24px.
	const sized = currentSvg(s).replace(`width="${GRID}" height="${GRID}"`, `width="${size}" height="${size}"`);
	const name = `${fileName()}-${size}.png`;
	const img = new Image();
	img.onload = () => {
		const canvas = document.createElement("canvas");
		canvas.width = size;
		canvas.height = size;
		canvas.getContext("2d")!.drawImage(img, 0, 0, size, size);
		download(name, canvas.toDataURL("image/png"));
	};
	img.onerror = () => s.setStatus("Could not render the PNG. Try again.", true);
	img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sized)}`;
}

export async function copyCode() {
	const s = useIconLab.getState();
	try {
		await navigator.clipboard.writeText(currentSvg(s));
		s.setStatus("SVG code copied");
	} catch {
		s.setStatus("Copy failed. Open the code and copy it by hand.", true);
	}
}
