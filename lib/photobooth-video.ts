// Video helpers for Pink photobooth: the size clips are recorded at, and getting a visitor's video
// file ready to restyle (its real duration, whether it has sound, and a route for that sound into
// the recording). Recording itself is lib/record-canvas.ts. Nothing here leaves the browser.

/** Clips are recorded at this many pixels on the long side, in the chosen shape. Even sizes suit H.264. */
const LONG_SIDE = 1080;

export function recordSize(ratio: number) {
	const even = (n: number) => Math.round(n / 2) * 2;
	return ratio >= 1 ? { width: LONG_SIDE, height: even(LONG_SIDE / ratio) } : { width: even(LONG_SIDE * ratio), height: LONG_SIDE };
}

const once = (el: HTMLMediaElement, event: string) => new Promise<void>((resolve) => el.addEventListener(event, () => resolve(), { once: true }));

/**
 * Files straight out of a browser recorder often report an infinite duration until they've been
 * read to the end. Seek far past the end once so the real duration shows up, then come back.
 */
export async function ensureDuration(video: HTMLVideoElement) {
	if (video.readyState < HTMLMediaElement.HAVE_METADATA) await once(video, "loadedmetadata");
	if (Number.isFinite(video.duration)) return;
	const changed = once(video, "durationchange");
	video.currentTime = Number.MAX_SAFE_INTEGER;
	await changed;
	const back = once(video, "seeked");
	video.currentTime = 0;
	await back;
}

/** Whether a playing video has sound, as far as the browser lets us tell. */
export function hasAudio(video: HTMLVideoElement) {
	const v = video as HTMLVideoElement & { audioTracks?: { length: number }; mozHasAudio?: boolean; webkitAudioDecodedByteCount?: number };
	return Boolean(v.audioTracks?.length || v.mozHasAudio || v.webkitAudioDecodedByteCount);
}

/**
 * Routes a video element's sound into a MediaStream for the recorder. It goes only to the
 * recording, not the speakers, so restyling a clip plays silently. An element can be routed once,
 * so the route is kept and reused for every file played through the same element. Music can be
 * mixed in by playing it into `destination` too.
 */
export type AudioRoute = { context: AudioContext; destination: MediaStreamAudioDestinationNode; stream: MediaStream };
export function routeAudio(video: HTMLVideoElement, existing: AudioRoute | null): AudioRoute {
	if (existing) return existing;
	const context = new AudioContext();
	const destination = context.createMediaStreamDestination();
	context.createMediaElementSource(video).connect(destination);
	return { context, destination, stream: destination.stream };
}
