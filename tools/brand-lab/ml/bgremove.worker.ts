// Runs the background-removal model off the main thread so the editor never freezes. Models load
// on first use and are cached by the browser after that. Images never leave the machine.
import { env, pipeline, RawImage } from "@huggingface/transformers";

env.allowLocalModels = false;

type Device = "webgpu" | "wasm";
type Segmenter = (image: RawImage) => Promise<RawImage>;
type Req = { id: number; blob: Blob; model: string; device: Device; dtype: string };

const loaded = new Map<string, Promise<Segmenter>>();

function load({ model, device, dtype }: Req): Promise<Segmenter> {
	const key = `${model}|${device}|${dtype}`;
	let p = loaded.get(key);
	if (!p) {
		p = pipeline("background-removal", model, {
			device,
			dtype: dtype as "fp16",
			progress_callback: (e: { status: string; file?: string; loaded?: number; total?: number }) => {
				if (e.status === "progress" && e.total) self.postMessage({ type: "progress", loaded: e.loaded, total: e.total, file: `${model}/${e.file}` });
			},
		}).then((run) => run as unknown as Segmenter);
		p.catch(() => loaded.delete(key));
		loaded.set(key, p);
	}
	return p;
}

self.onmessage = async (e: MessageEvent<Req>) => {
	const { id, blob } = e.data;
	try {
		const run = await load(e.data);
		const t0 = performance.now();
		const out = await run(await RawImage.fromBlob(blob));
		const png: Blob = await out.toBlob("image/png");
		self.postMessage({ type: "done", id, png, ms: Math.round(performance.now() - t0) });
	} catch (err) {
		self.postMessage({ type: "error", id, message: err instanceof Error ? err.message : String(err) });
	}
};
