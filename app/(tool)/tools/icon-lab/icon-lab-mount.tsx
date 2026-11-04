"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { applySiteTheme } from "@/lib/theme";

// Icon Lab reads localStorage and window when its modules load, so it only ever runs in the browser.
// The homepage embed (?embed, lib/tool-embed.ts) keeps nothing and takes its theme from the homepage;
// Icon Lab handles that itself (tools/icon-lab/state/storage.ts).
const IconLab = dynamic(() => import("@/tools/icon-lab/App").then((m) => m.App), {
	ssr: false,
	loading: () => (
		<div role="status" className="type-text-s fixed inset-0 grid place-items-center bg-page text-neutral-weak">
			Loading Icon Lab
		</div>
	),
});

export function IconLabMount() {
	// Icon Lab drives the page theme while it is open. Hand it back to the site on the way out.
	useEffect(() => () => applySiteTheme(), []);
	return <IconLab />;
}
