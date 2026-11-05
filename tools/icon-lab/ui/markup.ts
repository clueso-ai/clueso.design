import { buildSvg, KEYLINES } from "../engine/engine";
import { currentSvg, drawOptions, type EditState, useIconLab } from "../state/store";

type S = ReturnType<typeof useIconLab.getState>;

// The artboard's SVG: the icon over its grid, with Google's drawing behind it and the edit handles
// on top. Built as markup, as in the standalone app, so what's drawn is exactly what's exported.

// The icon grid: 1-unit grid, the 20 × 20 live area inside the 2-unit padding, keylines on the outer
// edge (circle 20, square 18, portrait 16 × 20, landscape 20 × 16), centre circle, thirds and
// diagonals. Sharp, no radius.
function keylineOverlay() {
	const k = KEYLINES;
	const rect = (cls: string, w: number, h: number) => `<rect class="${cls}" x="${(24 - w) / 2}" y="${(24 - h) / 2}" width="${w}" height="${h}" rx="${k.radius}"/>`;
	const line = (cls: string, x1: number, y1: number, x2: number, y2: number) => `<line class="${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
	const units: string[] = [];
	for (let i = 1; i < 24; i++) units.push(line("px", i, 0, i, 24), line("px", 0, i, 24, i));
	return `<g class="overlay">${[
		...units,
		'<rect class="gr" x="0" y="0" width="24" height="24"/>',
		line("gr", 0, 0, 24, 24),
		line("gr", 24, 0, 0, 24),
		line("gr", 8, 0, 8, 24),
		line("gr", 16, 0, 16, 24),
		line("gr", 0, 8, 24, 8),
		line("gr", 0, 16, 24, 16),
		`<circle class="gr" cx="12" cy="12" r="${k.centreCircle / 2}"/>`,
		rect("safe", 24 - 2 * k.padding, 24 - 2 * k.padding),
		`<circle class="kl" cx="12" cy="12" r="${k.circle / 2}"/>`,
		rect("kl", k.square, k.square),
		rect("kl", ...k.portrait),
		rect("kl", ...k.landscape),
	].join("")}</g>`;
}
const KEYLINE_OVERLAY = keylineOverlay();

// Google's Material Symbols drawing of the same icon, faint, behind ours: a construction check while
// the design language settles. (Not shown in the details or exports.)
function googleLayer(s: S) {
	const icon = s.current;
	const g = icon.google;
	if (!s.showGoogle || !g || icon.style !== "line") return "";
	const inner = buildSvg(g, { ...drawOptions(s), color: "#4f8cff" })
		.replace(/^<svg[^>]*>/, "")
		.replace(/<\/svg>$/, "");
	return `<g class="google-ref">${inner}</g>`;
}

// Pixel illustrations: the 64-pixel grid, with a stronger line every 8 pixels.
function pixelGridOverlay(n: number) {
	const lines: string[] = [];
	for (let i = 1; i < n; i++) {
		const cls = i % 8 ? "px" : "gr";
		lines.push(`<line class="${cls}" x1="${i}" y1="0" x2="${i}" y2="${n}"/>`, `<line class="${cls}" x1="0" y1="${i}" x2="${n}" y2="${i}"/>`);
	}
	return `<g class="overlay" style="stroke-width:0.04">${lines.join("")}<rect class="gr" x="0" y="0" width="${n}" height="${n}"/></g>`;
}

// Vector editing: anchors are squares, curve handles circles, and the box selection.
function handlesMarkup(edit: EditState) {
	const f = (n: number) => Number(n.toFixed(3));
	const parts: string[] = [];
	edit.handles.forEach((h) => {
		if (h.kind === "ctrl") parts.push(`<line class="cl" x1="${f(h.anchor![0])}" y1="${f(h.anchor![1])}" x2="${f(h.pt[0])}" y2="${f(h.pt[1])}"/>`);
	});
	edit.handles.forEach((h, i) => {
		const sel = edit.sel.has(i) ? " sel" : "";
		parts.push(
			h.kind === "anchor"
				? `<rect class="anchor${sel}" data-h="${i}" x="${f(h.pt[0] - 0.35)}" y="${f(h.pt[1] - 0.35)}" width="0.7" height="0.7"/>`
				: `<circle class="ctrl${sel}" data-h="${i}" cx="${f(h.pt[0])}" cy="${f(h.pt[1])}" r="0.3"/>`,
		);
	});
	const b = edit.box;
	if (b) parts.push(`<rect class="marquee" x="${f(Math.min(b.x0, b.x1))}" y="${f(Math.min(b.y0, b.y1))}" width="${f(Math.abs(b.x1 - b.x0))}" height="${f(Math.abs(b.y1 - b.y0))}"/>`);
	return `<g class="handles">${parts.join("")}</g>`;
}

export function previewMarkup(s: S) {
	const svg = currentSvg(s);
	const root = svg.match(/^<svg[^>]*>/)![0];
	const rest = svg.slice(root.length, -"</svg>".length);
	const overlay = s.current.grid ? pixelGridOverlay(s.current.grid) : KEYLINE_OVERLAY;
	return `${root}${overlay}${googleLayer(s)}${rest}${s.edit ? handlesMarkup(s.edit) : ""}</svg>`;
}

// Any CSS colour (the site uses lab() and rgb()) as #rrggbb, for an SVG fill.
export function toHex(css: string) {
	try {
		const c = document.createElement("canvas");
		c.width = 1;
		c.height = 1;
		const g = c.getContext("2d")!;
		g.fillStyle = "#000";
		g.fillStyle = css;
		g.fillRect(0, 0, 1, 1);
		const [r, gr, b] = g.getImageData(0, 0, 1, 1).data;
		return `#${[r, gr, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
	} catch {
		return "#111111";
	}
}
