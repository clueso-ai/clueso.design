// SVG markup (pasted code or a dropped .svg) becomes a crisp PNG for the image layer. The layer
// samples a texture, so the vector is rasterised once at a generous size instead of at whatever
// default size the browser picks for an SVG without width/height (often 300×150).

const MAX_SIDE = 2048;

/** True when pasted text is SVG markup (optionally behind an XML prolog, doctype or comments). */
export function isSvgCode(text: string) {
	return /^\s*(<\?xml[\s\S]*?\?>\s*)?(<!DOCTYPE[\s\S]*?>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(text) && /<\/svg>\s*$/i.test(text);
}

/** Rasterise SVG markup to a PNG data URL, longest side MAX_SIDE. Rejects markup that isn't a valid SVG. */
export async function svgToPng(code: string): Promise<{ src: string; title: string | null }> {
	const doc = new DOMParser().parseFromString(code, "image/svg+xml");
	const svg = doc.documentElement;
	if (svg.nodeName.toLowerCase() !== "svg" || doc.querySelector("parsererror")) throw new Error("Not a valid SVG");

	// Intrinsic size: viewBox first, then width/height, then a square fallback.
	const vb = (svg.getAttribute("viewBox") ?? "").split(/[\s,]+/).map(Number);
	const num = (a: string) => {
		const v = parseFloat(svg.getAttribute(a) ?? "");
		return Number.isFinite(v) && v > 0 && !/%$/.test(svg.getAttribute(a) ?? "") ? v : 0;
	};
	let w = vb.length === 4 && vb[2] > 0 ? vb[2] : num("width");
	let h = vb.length === 4 && vb[3] > 0 ? vb[3] : num("height");
	if (!w || !h) [w, h] = [w || h || 512, h || w || 512];
	if (!svg.getAttribute("viewBox")) svg.setAttribute("viewBox", `0 0 ${w} ${h}`);

	const k = MAX_SIDE / Math.max(w, h);
	const W = Math.max(1, Math.round(w * k));
	const H = Math.max(1, Math.round(h * k));
	svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
	svg.setAttribute("width", String(W));
	svg.setAttribute("height", String(H));
	const title = svg.querySelector("title")?.textContent?.trim() || null;

	const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" }));
	try {
		const img = new Image();
		img.src = url;
		await img.decode();
		const canvas = document.createElement("canvas");
		canvas.width = W;
		canvas.height = H;
		canvas.getContext("2d")!.drawImage(img, 0, 0, W, H);
		return { src: canvas.toDataURL("image/png"), title };
	} finally {
		URL.revokeObjectURL(url);
	}
}
