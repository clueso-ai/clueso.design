// Waveform data for the playground: the loudest point in each slice of a sound, 0 to 1, for
// components/playground/ui/waveform.tsx to draw as bars. Computed once per buffer, at a fixed
// resolution the component resamples to however many bars fit.

/** How many peaks to keep: plenty for a full-width waveform at any size. */
export const PEAK_COUNT = 1200;

/** The peaks of an AudioBuffer (all channels mixed), scaled so the loudest is 1. */
export function peaksOf(buffer: AudioBuffer, count = PEAK_COUNT): Float32Array {
	const out = new Float32Array(count);
	const length = buffer.length;
	const channels = Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c));
	const step = length / count;
	for (let i = 0; i < count; i++) {
		const from = Math.floor(i * step);
		const to = Math.min(length, Math.floor((i + 1) * step));
		let peak = 0;
		// Every sample would be slow on long clips; a few hundred per slice is plenty for a peak.
		const stride = Math.max(1, Math.floor((to - from) / 256));
		for (const data of channels) for (let j = from; j < to; j += stride) peak = Math.max(peak, Math.abs(data[j]));
		out[i] = peak;
	}
	return normalise(out);
}

/** Scales peaks so the loudest is 1. Silence stays silent. */
export function normalise(peaks: Float32Array, against = 0): Float32Array {
	let max = against;
	for (const v of peaks) max = Math.max(max, v);
	if (max <= 0) return peaks;
	return peaks.map((v) => v / max);
}

/** Resamples peaks to `bars` values, keeping the loudest of each group so short hits still show. */
export function resample(peaks: ArrayLike<number>, bars: number): Float32Array {
	const out = new Float32Array(bars);
	if (!peaks.length) return out;
	const step = peaks.length / bars;
	for (let i = 0; i < bars; i++) {
		const from = Math.floor(i * step);
		const to = Math.max(from + 1, Math.floor((i + 1) * step));
		let peak = 0;
		for (let j = from; j < to && j < peaks.length; j++) peak = Math.max(peak, peaks[j]);
		out[i] = peak;
	}
	return out;
}

/** Seconds as m:ss, or m:ss.s when `tenths`. */
export function clock(seconds: number, tenths = false) {
	const s = Math.max(0, seconds);
	const m = Math.floor(s / 60);
	const rest = s - m * 60;
	return `${m}:${(tenths ? rest.toFixed(1) : Math.floor(rest).toString()).padStart(tenths ? 4 : 2, "0")}`;
}
