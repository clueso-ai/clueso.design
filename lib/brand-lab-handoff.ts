// Hands a design from the site to Brand Lab, e.g. the homepage's shuffled artwork. Session storage
// keeps it to this tab. Brand Lab adds it as a new canvas, so the visitor's own work is untouched.

import type { Doc } from "@/tools/brand-lab/state/doc";

const KEY = "clueso-design:brand-lab-handoff";

export function sendToBrandLab(doc: Doc) {
	sessionStorage.setItem(KEY, JSON.stringify(doc));
}

export function takeBrandLabHandoff(): Doc | null {
	try {
		const raw = sessionStorage.getItem(KEY);
		sessionStorage.removeItem(KEY);
		return raw ? (JSON.parse(raw) as Doc) : null;
	} catch {
		return null;
	}
}

