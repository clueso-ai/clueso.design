"use client";

import { useEffect, useState } from "react";
import { applySiteTheme, THEME_KEY } from "@/lib/theme";

// Icon Lab is the second tool. Its engine and UI are the standalone app (~/Downloads/icon-tool), served
// from public/tools/icon-lab and synced by its tools/sync-clueso-design.sh. This mount loads that app
// into the tool page: its markup, its stylesheet and its scripts, in order, once per page load (the
// scripts define globals, so they can't run twice). It shares the site's theme (THEME_KEY) and its
// mark links home with a full page load, like Brand Lab's. Porting it onto the tool harness comes
// with the harness extraction (docs/ARCHITECTURE.md, "Tool harness").
const BASE = "/tools/icon-lab/";
let started = false;

function loadScript(src: string) {
	return new Promise<void>((resolve, reject) => {
		const s = document.createElement("script");
		s.src = src;
		s.async = false;
		s.onload = () => resolve();
		s.onerror = () => reject(new Error(`Could not load ${src}`));
		document.body.appendChild(s);
	});
}

async function start() {
	const w = window as unknown as Record<string, unknown>;
	w.ICON_LAB_BASE = BASE;
	w.ICON_LAB_THEME_KEY = THEME_KEY;
	const html = await (await fetch(`${BASE}index.html`)).text();
	const doc = new DOMParser().parseFromString(html, "text/html");
	const scripts = [...doc.body.querySelectorAll("script[src]")]
		.map((s) => s.getAttribute("src") ?? "")
		.filter((src) => src && !src.startsWith("agentation/")); // the comment toolbar is for local review only
	doc.body.querySelectorAll("script").forEach((s) => s.remove());
	if (!document.getElementById("icon-lab-css")) {
		const link = document.createElement("link");
		link.id = "icon-lab-css";
		link.rel = "stylesheet";
		link.href = `${BASE}styles.css`;
		document.head.appendChild(link);
		await new Promise((r) => { link.onload = r; link.onerror = r; });
	}
	// Its stylesheet places the bars and panels as children of <body> (body.lab > .tb), so the markup
	// goes there, beside React's root (left empty); the tool is only left with a full page load.
	const holder = document.createElement("div");
	holder.innerHTML = doc.body.innerHTML;
	const nodes = [...holder.childNodes];
	document.body.append(...nodes);
	// The mark and name go home, with a full page load so nothing the tool set on the page outlives it.
	const brand = document.querySelector(".tb-brand");
	if (brand) {
		const a = document.createElement("a");
		a.href = "/";
		a.className = brand.className;
		a.setAttribute("aria-label", "Clueso design home");
		a.innerHTML = brand.innerHTML;
		brand.replaceWith(a);
	}
	document.body.classList.add("lab");
	for (const src of scripts) await loadScript(BASE + src);
}

export function IconLabMount() {
	const [state, setState] = useState<"loading" | "ready" | "error">("loading");

	useEffect(() => {
		if (started) return;
		started = true;
		start()
			.then(() => setState("ready"))
			.catch(() => setState("error"));
	}, []);
	// Icon Lab drives the page theme while it is open. Hand it back to the site on the way out.
	useEffect(() => () => applySiteTheme(), []);

	return (
		<>
			{state !== "ready" && (
				<div role="status" className="type-text-s fixed inset-0 z-10 grid place-items-center bg-page text-neutral-weak">
					{state === "error" ? "Icon Lab could not load. Reload to try again" : "Loading Icon Lab"}
				</div>
			)}
			{/* The tool's markup is mounted into <body> beside this (see start()). */}
			<div className="icon-lab-root" />
		</>
	);
}
