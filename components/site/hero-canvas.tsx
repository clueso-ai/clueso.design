"use client";

import { useEffect, useRef, useState } from "react";
import { Renderer } from "@/tools/brand-lab/engine/renderer";
import { prepare } from "@/tools/brand-lab/export";
import type { Doc } from "@/tools/brand-lab/state/doc";

/** Longest side of the drawing buffer. Enough for a crisp hero, cheap enough for any laptop. */
const MAX_SIDE = 1600;

/**
 * A Brand Lab design rendered live with Brand Lab's own engine. Plays only while on screen and the
 * tab is visible. Reduced motion: one still frame. No WebGL2: the fallback surface behind it shows.
 * Changing `doc` swaps the design without rebuilding the renderer.
 */
export function HeroCanvas({ doc, still = 2 }: { doc: Doc; still?: number }) {
	const ref = useRef<HTMLCanvasElement>(null);
	const docRef = useRef<Doc | null>(null);
	const drawRef = useRef<() => void>(() => {});
	const [ready, setReady] = useState(false);

	// Renderer and loop: created once per canvas.
	useEffect(() => {
		const canvas = ref.current!;
		let renderer: Renderer;
		try {
			renderer = new Renderer(canvas);
		} catch {
			return;
		}

		const reduce = matchMedia("(prefers-reduced-motion: reduce)");
		let size: [number, number] = [0, 0];
		let raf = 0;
		let visible = false;
		let time = still;
		let last = performance.now();

		const draw = () => {
			const d = docRef.current;
			if (d && size[0] && size[1]) renderer.render(d, time, size[0], size[1]);
		};
		drawRef.current = () => {
			// Texture layers (text, glyphs) build on the first pass.
			draw();
			draw();
		};
		const loop = (now: number) => {
			time = (time + Math.min(0.1, (now - last) / 1000)) % (docRef.current?.scene.duration || 1);
			last = now;
			draw();
			raf = requestAnimationFrame(loop);
		};
		const sync = () => {
			cancelAnimationFrame(raf);
			if (visible && !reduce.matches && !document.hidden) {
				last = performance.now();
				raf = requestAnimationFrame(loop);
			} else draw();
		};

		const resize = new ResizeObserver(([entry]) => {
			const dpr = Math.min(devicePixelRatio || 1, 2);
			const w = entry.contentRect.width * dpr;
			const h = entry.contentRect.height * dpr;
			const k = Math.min(1, MAX_SIDE / Math.max(w, h));
			size = [Math.round(w * k), Math.round(h * k)];
			draw();
		});
		const seen = new IntersectionObserver(([entry]) => {
			visible = entry.isIntersecting;
			sync();
		});
		resize.observe(canvas);
		seen.observe(canvas);
		reduce.addEventListener("change", sync);
		document.addEventListener("visibilitychange", sync);

		return () => {
			cancelAnimationFrame(raf);
			resize.disconnect();
			seen.disconnect();
			reduce.removeEventListener("change", sync);
			document.removeEventListener("visibilitychange", sync);
			drawRef.current = () => {};
			// Free GPU resources but keep the context: React's dev double-mount reuses this canvas, and a
			// lost context can't be revived. The context goes when the canvas leaves the page.
			renderer.dispose();
		};
	}, [still]);

	// Swap the design once its fonts and images are ready.
	useEffect(() => {
		let cancelled = false;
		prepare(doc).then(() => {
			if (cancelled) return;
			docRef.current = doc;
			drawRef.current();
			setReady(true);
		});
		return () => {
			cancelled = true;
		};
	}, [doc]);

	return <canvas ref={ref} aria-hidden className={`block size-full transition-opacity duration-500 ease-out-strong ${ready ? "opacity-100" : "opacity-0"}`} />;
}
