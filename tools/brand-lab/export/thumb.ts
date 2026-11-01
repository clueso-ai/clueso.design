import { Renderer } from "../engine/renderer";
import type { Doc } from "../state/doc";
import { prepare } from "./index";

// One offscreen renderer shared by every thumbnail (Library and Variations), so the grid costs a
// single WebGL context however many cards it shows. Renders are queued, one at a time.

let renderer: Renderer | null = null;
let queue: Promise<unknown> = Promise.resolve();

export function renderThumb(doc: Doc, time: number, maxSide = 360): Promise<string> {
	const job = queue.then(async () => {
		await prepare(doc);
		renderer ??= new Renderer(document.createElement("canvas"), { preserveDrawingBuffer: true });
		const k = maxSide / Math.max(doc.scene.width, doc.scene.height);
		const w = Math.max(1, Math.round(doc.scene.width * k));
		const h = Math.max(1, Math.round(doc.scene.height * k));
		// Twice: texture layers (text, binary glyphs) build their textures during the first pass.
		renderer.render(doc, time, w, h);
		renderer.render(doc, time, w, h);
		return renderer.canvas.toDataURL("image/webp", 0.85);
	});
	queue = job.catch(() => undefined);
	return job;
}
