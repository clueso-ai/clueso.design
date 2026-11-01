// The homepage hero's backdrop, built from Brand Lab layers: seven twisted petals rising from the
// bottom edge and turning slowly, cut into fine -45° lines with the petals glowing through between
// them. In the visitor's colour, or the team's pink before they pick one. Light mode is quieter.

import { createLayer } from "@/tools/brand-lab/layers/registry";
import { type Doc, defaultScene } from "@/tools/brand-lab/state/doc";

/** Height of Brand Lab's frame. Its width follows the hero's shape, so nothing stretches. */
const FRAME_H = 1200;
/** Seconds per turn. */
const LOOP = 22;

/**
 * `ink` is a hex colour, or null for the team's pink. `aspect` is the hero's width over its height.
 * The petals are sized by the frame's shorter side, so on a hero taller than it is wide they're
 * scaled back up to stay the same size relative to the hero's height.
 */
export function heroFillDoc(ink: string | null, dark: boolean, aspect: number): Doc {
	const color = ink ?? "$pink";
	const width = Math.round(FRAME_H * aspect);
	const scale = 2.06 * Math.max(1, FRAME_H / width);
	const strength = dark ? 1 : 0.7;
	return {
		version: 1,
		name: "Hero petals",
		// Transparent, so the page shows through and the theme's own background stays.
		scene: { ...defaultScene(), width, height: FRAME_H, transparent: true, duration: LOOP },
		// Top of the stack first: the halftone cuts the petals below it into lines. It draws nothing
		// between them, so the petals show through there as a glow.
		layers: [
			createLayer("halftone", { name: "Lines", opacity: strength, params: { cell: 7, angle: -45, shape: 5, contrast: 1.3, gain: 1, mode: 3 } }),
			createLayer("radial", {
				name: "Petals",
				// Brand Lab measures the centre from the bottom left: cy 0.02 sits it on the bottom edge.
				params: { mode: 4, count: 7, twist: -1.82, profile: 0, soft: 0.86, scale, hole: 0.08, fade: 0.37, cx: 0.5, cy: 0.02, fill: 1, colorA: color, motion: 1, cycles: 1 },
			}),
		],
	};
}
