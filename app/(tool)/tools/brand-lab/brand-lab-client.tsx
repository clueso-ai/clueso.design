"use client";

import { useEffect } from "react";
import { EMBED_READY, EMBED_THEME, takeBrandLabHandoff } from "@/lib/brand-lab-handoff";
import { App } from "@/tools/brand-lab/App";
import { presetDoc } from "@/tools/brand-lab/state/presets";
import { useStore } from "@/tools/brand-lab/state/store";

/** Posters the homepage embed opens with. */
const EMBED_POSTERS = ["poster-sunrise", "poster-led", "poster-glyph-bloom"];

/** Brand Lab, plus anything the site handed over (opened as a new canvas). */
export function BrandLabClient() {
	useEffect(() => {
		const s = useStore.getState();
		// The homepage embed starts on a few posters each time and keeps nothing.
		if (new URLSearchParams(location.search).has("embed")) {
			s.loadProject({ name: "Posters", canvases: EMBED_POSTERS.map(presetDoc), active: 0 });
			s.setZoom("fit");
			// The homepage sets the theme: the opposite of its own, so the preview stands out.
			const theme = (e: MessageEvent) => {
				if (e.origin === location.origin && e.data?.type === EMBED_THEME) useStore.getState().setTheme(e.data.theme);
			};
			window.addEventListener("message", theme);
			window.parent.postMessage({ type: EMBED_READY }, location.origin);
			return () => window.removeEventListener("message", theme);
		}
		const doc = takeBrandLabHandoff();
		if (!doc) return;
		s.addCanvas(doc);
		s.setZoom("fit");
		s.showToast("Opened from clueso.design");
	}, []);
	return <App />;
}
