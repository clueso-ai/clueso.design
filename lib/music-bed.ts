// Music under a playground video export: a soundtrack (lib/soundtracks.ts) played once from the
// start into the recording's sound, with a short fade out at the end. On its own it makes its own
// audio stream for recordCanvas; mixed under other sound, it plays into that sound's destination.

const decoded = new Map<string, Promise<AudioBuffer>>();

/** Fetches and decodes a track once per page. A buffer works in any AudioContext. */
function load(context: BaseAudioContext, src: string) {
	let buffer = decoded.get(src);
	if (!buffer) {
		buffer = fetch(src)
			.then((r) => {
				if (!r.ok) throw new Error(`Couldn't load ${src}`);
				return r.arrayBuffer();
			})
			.then((data) => context.decodeAudioData(data));
		decoded.set(src, buffer);
		buffer.catch(() => decoded.delete(src));
	}
	return buffer;
}

/** A level in decibels as a gain. */
export const db = (value: number) => 10 ** (value / 20);

/**
 * Loads `src` and gets it ready to play `length` seconds, at `gain`, into `into` or a stream of its
 * own (`stream`). Call `start()` the moment recording starts, `stop()` before the recording stops
 * and `close()` once it has.
 */
export async function musicBed(src: string, { length, gain = 1, into }: { length: number; gain?: number; into?: AudioNode }) {
	const context = (into?.context as AudioContext | undefined) ?? new AudioContext();
	const own = !into;
	try {
		const buffer = await load(context, src);
		await context.resume();
		const destination = into ?? context.createMediaStreamDestination();
		return {
			stream: own ? (destination as MediaStreamAudioDestinationNode).stream : undefined,
			start: () => play(context, buffer, destination, { length, gain }),
			close: () => {
				if (own) void context.close();
			},
		};
	} catch (err) {
		if (own) void context.close();
		throw err;
	}
}

/** Plays the bed now. Its `stop()` fades out quickly if it's still playing, then lets go. */
function play(context: AudioContext, buffer: AudioBuffer, into: AudioNode, { length, gain }: { length: number; gain: number }) {
	const source = context.createBufferSource();
	source.buffer = buffer;
	const level = context.createGain();
	source.connect(level).connect(into);
	const at = context.currentTime;
	const end = at + length;
	const fade = Math.min(0.8, length / 4);
	level.gain.setValueAtTime(gain, at);
	level.gain.setValueAtTime(gain, end - fade);
	level.gain.linearRampToValueAtTime(0, end);
	source.start(at);
	return {
		stop: async () => {
			const now = context.currentTime;
			// Stopped early: a quick fade so the clip doesn't end on a click.
			if (now < end - 0.05) {
				level.gain.cancelScheduledValues(now);
				level.gain.setValueAtTime(level.gain.value, now);
				level.gain.linearRampToValueAtTime(0, now + 0.25);
				await new Promise((resolve) => setTimeout(resolve, 260));
			}
			source.stop();
			source.disconnect();
			level.disconnect();
		},
	};
}
