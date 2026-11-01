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
	// A self-contained server bundle for the Docker image (deploy/Dockerfile).
	output: "standalone",
	// Static playground pieces live in public/playground/<slug>/ and keep their exported files as is.
	async rewrites() {
		return [
			{ source: "/playground/:slug", destination: "/playground/:slug/index.html" },
			// Browsers ask for /favicon.ico regardless of the <link rel="icon">.
			{ source: "/favicon.ico", destination: "/mark.svg" },
		];
	},
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
