"use client";

import { useEffect, useRef } from "react";
import { oklchCss, oklchToRgb } from "@/lib/site-prefs";

// A visual OKLCH picker: an area of every lightness and chroma at the current hue, and a strip of
// every hue under it. Drag in either, or use the arrow keys once one has focus. Colours outside
// what a screen can show are drawn at the nearest one it can.

type Lch = [number, number, number];
const L: [number, number] = [0.3, 0.95];
const C: [number, number] = [0, 0.3];
/** Pixels drawn per area; the canvas scales them up smoothly. */
const AREA_W = 120;
const AREA_H = 72;

const clamp = (v: number, [lo, hi]: [number, number]) => Math.min(hi, Math.max(lo, v));
const frac = (v: number, [lo, hi]: [number, number]) => (v - lo) / (hi - lo);

/** Follows a press and drag inside `el`, reporting where it is as 0 to 1 across and down. */
function drag(e: React.PointerEvent<HTMLElement>, on: (x: number, y: number) => void) {
	const el = e.currentTarget;
	el.setPointerCapture(e.pointerId);
	const at = (ev: PointerEvent | React.PointerEvent) => {
		const r = el.getBoundingClientRect();
		on(clamp((ev.clientX - r.left) / r.width, [0, 1]), clamp((ev.clientY - r.top) / r.height, [0, 1]));
	};
	at(e);
	const move = (ev: PointerEvent) => at(ev);
	const up = () => {
		el.removeEventListener("pointermove", move);
		el.removeEventListener("pointerup", up);
		el.removeEventListener("pointercancel", up);
	};
	el.addEventListener("pointermove", move);
	el.addEventListener("pointerup", up);
	el.addEventListener("pointercancel", up);
}

function paint(canvas: HTMLCanvasElement | null, w: number, h: number, colour: (x: number, y: number) => Lch) {
	const ctx = canvas?.getContext("2d");
	if (!canvas || !ctx) return;
	canvas.width = w;
	canvas.height = h;
	const img = ctx.createImageData(w, h);
	for (let y = 0; y < h; y++)
		for (let x = 0; x < w; x++) {
			const [r, g, b] = oklchToRgb(colour(x / (w - 1), y / (h - 1)));
			const i = (y * w + x) * 4;
			img.data[i] = r;
			img.data[i + 1] = g;
			img.data[i + 2] = b;
			img.data[i + 3] = 255;
		}
	ctx.putImageData(img, 0, 0);
}

export function OklchArea({ value, onChange }: { value: Lch; onChange: (next: Lch) => void }) {
	const [l, c, h] = value;
	const area = useRef<HTMLCanvasElement>(null);
	const strip = useRef<HTMLCanvasElement>(null);

	// The area redraws when the hue moves; the hue strip is drawn once.
	useEffect(() => paint(area.current, AREA_W, AREA_H, (x, y) => [L[1] - y * (L[1] - L[0]), x * C[1], h]), [h]);
	useEffect(() => paint(strip.current, 180, 1, (x) => [0.72, 0.14, x * 360]), []);

	const key = (e: React.KeyboardEvent, dx: number, dy: number) => {
		e.preventDefault();
		onChange([clamp(l + dy, L), clamp(c + dx, C), h]);
	};

	return (
		<div className="flex flex-col gap-gap-xs">
			<div
				role="slider"
				tabIndex={0}
				aria-label="Lightness and chroma"
				aria-valuetext={`Lightness ${l.toFixed(2)}, chroma ${c.toFixed(3)}`}
				aria-valuenow={Number(l.toFixed(2))}
				aria-valuemin={L[0]}
				aria-valuemax={L[1]}
				onPointerDown={(e) => drag(e, (x, y) => onChange([L[1] - y * (L[1] - L[0]), x * C[1], h]))}
				onKeyDown={(e) => {
					if (e.key === "ArrowUp") key(e, 0, 0.01);
					else if (e.key === "ArrowDown") key(e, 0, -0.01);
					else if (e.key === "ArrowRight") key(e, 0.005, 0);
					else if (e.key === "ArrowLeft") key(e, -0.005, 0);
				}}
				className="focus-ring relative aspect-5/3 w-full touch-none overflow-hidden rounded-small border border-neutral-weak"
			>
				<canvas ref={area} className="size-full" />
				<span
					aria-hidden
					className="pointer-events-none absolute size-3 -translate-1/2 rounded-tiny border-2 border-neutral-inverted shadow-raised"
					style={{ left: `${frac(c, C) * 100}%`, top: `${(1 - frac(l, L)) * 100}%`, background: oklchCss(value) }}
				/>
			</div>
			<div
				role="slider"
				tabIndex={0}
				aria-label="Hue"
				aria-valuenow={Math.round(h)}
				aria-valuemin={0}
				aria-valuemax={360}
				onPointerDown={(e) => drag(e, (x) => onChange([l, c, Math.round(x * 360)]))}
				onKeyDown={(e) => {
					if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
					e.preventDefault();
					onChange([l, c, (h + (e.key === "ArrowRight" ? 2 : -2) + 360) % 360]);
				}}
				className="focus-ring relative h-3 w-full touch-none rounded-small border border-neutral-weak"
			>
				<canvas ref={strip} className="size-full rounded-small" />
				<span aria-hidden className="pointer-events-none absolute top-1/2 h-4 w-1.5 -translate-1/2 rounded-tiny border border-neutral-inverted bg-neutral-strong" style={{ left: `${(h / 360) * 100}%` }} />
			</div>
			<code className="type-text-s font-code text-neutral-weak">{oklchCss(value)}</code>
		</div>
	);
}
