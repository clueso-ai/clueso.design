import { svgToPng } from "./svg";

/** A dropped, pasted or chosen image file as a data URL. */
export async function readImageFile(file: File): Promise<string> {
	// SVGs are rasterised at full size; as a raw data URL they'd decode at the browser's default size.
	if (file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg")) return (await svgToPng(await file.text())).src;
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
}

/**
 * Opens the system file picker for one image. Call it straight from a click or key press: browsers
 * only open the picker while the user's gesture is fresh. Resolves null when it's dismissed.
 */
export function pickImageFile(): Promise<File | null> {
	return new Promise((resolve) => {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = "image/*,.svg";
		input.addEventListener("change", () => resolve(input.files?.[0] ?? null), { once: true });
		input.addEventListener("cancel", () => resolve(null), { once: true });
		input.click();
	});
}
