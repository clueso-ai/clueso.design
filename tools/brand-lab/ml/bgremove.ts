// Main-thread side of background removal: one shared worker, promise per request.

type Progress = { loaded: number; total: number };
type Pending = { resolve: (src: string) => void; reject: (e: Error) => void; onProgress?: (p: Progress) => void };

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, Pending>();
const files = new Map<string, Progress>();

function getWorker() {
	if (worker) return worker;
	worker = new Worker(new URL("./bgremove.worker.ts", import.meta.url), { type: "module" });
	worker.onmessage = async (e) => {
		const m = e.data;
		if (m.type === "progress") {
			// The model ships as several files; report their combined download.
			files.set(m.file, { loaded: m.loaded, total: m.total });
			let loaded = 0;
			let total = 0;
			for (const f of files.values()) {
				loaded += f.loaded;
				total += f.total;
			}
			for (const p of pending.values()) p.onProgress?.({ loaded, total });
			return;
		}
		const p = pending.get(m.id);
		if (!p) return;
		pending.delete(m.id);
		if (m.type === "error") return p.reject(new Error(m.message));
		console.info(`[bg-remove] ${m.ms} ms`);
		p.resolve(await blobToDataURL(m.png));
	};
	return worker;
}

function blobToDataURL(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const r = new FileReader();
		r.onload = () => resolve(String(r.result));
		r.onerror = reject;
		r.readAsDataURL(blob);
	});
}

export type BgModel = { model: string; device: "webgpu" | "wasm"; dtype: string };

// ormbg (Apache 2.0, an ISNet trained for background removal). BiRefNet-lite (MIT) cuts finer edges
// but needs 11 storage buffers per shader and Apple GPUs in Chrome allow 10, and its CPU path runs
// out of memory. fp16 on WebGPU: ~88 MB once, then ~0.25 s per image. CPU: int8, ~44 MB, ~6 s.
const GPU: BgModel = { model: "onnx-community/ormbg-ONNX", device: "webgpu", dtype: "fp16" };
const CPU: BgModel = { model: "onnx-community/ormbg-ONNX", device: "wasm", dtype: "q8" };
let gpuFailed = !("gpu" in navigator);

function run(blob: Blob, model: BgModel, onProgress?: (p: Progress) => void): Promise<string> {
	return new Promise((resolve, reject) => {
		const id = nextId++;
		pending.set(id, { resolve, reject, onProgress });
		getWorker().postMessage({ id, blob, ...model });
	});
}

/** Returns the image (a data URL) with its background made transparent. */
export async function removeBackground(src: string, onProgress?: (p: Progress) => void, model?: BgModel): Promise<string> {
	const blob = await (await fetch(src)).blob();
	if (model) return run(blob, model, onProgress);
	if (!gpuFailed) {
		try {
			return await run(blob, GPU, onProgress);
		} catch (err) {
			console.warn("[bg-remove] WebGPU failed, using the CPU", err);
			gpuFailed = true;
			files.clear();
		}
	}
	return run(blob, CPU, onProgress);
}
