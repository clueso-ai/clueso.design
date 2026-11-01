import type { NextConfig } from "next";

// SVGR setup copied from Brand Lab's vite.config.ts: clueso-icons imported with `?react` become
// components that take currentColor. The Jigsaw snapshot relies on this, so keep both in sync.
const svgr = {
	loader: "@svgr/webpack",
	options: {
		icon: true,
		replaceAttrValues: { "#171717": "currentColor", "#353535": "currentColor", "#000": "currentColor", "#000000": "currentColor", black: "currentColor" },
	},
};

const config: NextConfig = {
	reactStrictMode: true,
	turbopack: {
		root: import.meta.dirname,
		rules: {
			"*.svg": {
				condition: { query: /[?&]react(?=&|$)/ },
				loaders: [svgr],
				as: "*.js",
			},
		},
	},
};

export default config;
