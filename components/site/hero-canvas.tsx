"use client";

import { useEffect, useRef, useState } from "react";
import { Renderer } from "@/tools/brand-lab/engine/renderer";
import { prepare } from "@/tools/brand-lab/export";
import { presetDoc } from "@/tools/brand-lab/state/presets";

/** Longest side of the drawing buffer. Enough for a crisp hero, cheap enough for any laptop. */
const MAX_SIDE = 1600;

/**
 * A Brand Lab preset rendered live with Brand Lab's own engine. Plays only while on screen and the
 * tab is visible. Reduced motion or no WebGL2: one still frame, or the fallback surface behind it.
 */
export function HeroCanvas({ preset, still = 2 }: { preset: string; still?: number }) {
	const ref = useRef<HTMLCanvasElement>(null);
	const [ready, setReady] = useState(false);

	useEffect(() => {
		const canvas = ref.current!;
		const doc = presetDoc(preset);
		let renderer: Renderer;
		try {
			renderer = new Renderer(canvas);
		} catch {
			return; // No WebGL2: the fallback surface stays.
		}

		const reduce = matchMedia("(prefers-reduced-motion: reduce)");
		let size: [number, number] = [0, 0];
		let raf = 0;
		let visible = false;
		let time = still;
		let last = performance.now();
		let cancelled = false;

		const draw = () => {
			if (size[0] && size[1]) renderer.render(doc, time, size[0], size[1]);
		};
		const loop = (now: number) => {
			time = (time + Math.min(0.1, (now - last) / 1000)) % (doc.scene.duration || 1);
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
			let w = entry.contentRect.width * dpr;
			let h = entry.contentRect.height * dpr;
			const k = Math.min(1, MAX_SIDE / Math.max(w, h));
			w = Math.round(w * k);
			h = Math.round(h * k);
			size = [w, h];
			draw();
		});
		const seen = new IntersectionObserver(([entry]) => {
			visible = entry.isIntersecting;
			sync();
		});

		prepare(doc).then(() => {
			if (cancelled) return;
			resize.observe(canvas);
			seen.observe(canvas);
			// Texture layers build on the first pass; draw twice before showing.
			draw();
			draw();
			setReady(true);
		});
		reduce.addEventListener("change", sync);
		document.addEventListener("visibilitychange", sync);

		return () => {
			cancelled = true;
			cancelAnimationFrame(raf);
			resize.disconnect();
			seen.disconnect();
			reduce.removeEventListener("change", sync);
			document.removeEventListener("visibilitychange", sync);
			renderer.dispose({ loseContext: true });
		};
	}, [preset, still]);

	return <canvas ref={ref} aria-hidden className={`block size-full transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`} />;
}
