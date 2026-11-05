// Records a canvas, and optionally sound, to a video file in the browser, for playground experiments
// that export clips. MP4 where the browser's recorder can make it (recent Chrome and Safari), WebM
// otherwise. Nothing is uploaded: the file is assembled in memory and handed back as a Blob.

export interface VideoFormat {
	mime: string;
	ext: "mp4" | "webm";
}

const CANDIDATES: VideoFormat[] = [
	{ mime: "video/mp4;codecs=avc1.42E01E,mp4a.40.2", ext: "mp4" },
	{ mime: "video/mp4", ext: "mp4" },
	{ mime: "video/webm;codecs=vp9,opus", ext: "webm" },
	{ mime: "video/webm;codecs=vp8,opus", ext: "webm" },
	{ mime: "video/webm", ext: "webm" },
];

/** The best video format this browser can record, or null when it can't record at all. */
export function videoFormat(): VideoFormat | null {
	if (typeof MediaRecorder === "undefined") return null;
	return CANDIDATES.find((f) => MediaRecorder.isTypeSupported(f.mime)) ?? null;
}

export interface Recording {
	format: VideoFormat;
	/** Stops and resolves with the finished file. */
	stop: () => Promise<Blob>;
}

/**
 * Starts recording `canvas` at `fps`, with the audio tracks of `audio` if given. Draw to the canvas
 * as usual while it records. Throws when the browser can't record video.
 */
export function recordCanvas(canvas: HTMLCanvasElement, { fps = 30, audio, bitsPerSecond = 8_000_000 }: { fps?: number; audio?: MediaStream; bitsPerSecond?: number } = {}): Recording {
	const format = videoFormat();
	if (!format) throw new Error("This browser can't record video. Try a recent Chrome, Edge or Safari.");
	const stream = canvas.captureStream(fps);
	audio?.getAudioTracks().forEach((t) => stream.addTrack(t));
	const recorder = new MediaRecorder(stream, { mimeType: format.mime, videoBitsPerSecond: bitsPerSecond });
	const chunks: Blob[] = [];
	recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
	recorder.start(250);
	return {
		format,
		stop: () =>
			new Promise<Blob>((resolve) => {
				recorder.onstop = () => {
					stream.getVideoTracks().forEach((t) => t.stop());
					resolve(new Blob(chunks, { type: format.mime.split(";")[0] }));
				};
				if (recorder.state !== "inactive") recorder.stop();
				else recorder.onstop(new Event("stop"));
			}),
	};
}

/** Saves a Blob as a file. */
export function downloadBlob(blob: Blob, name: string) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = name;
	a.click();
	setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
