"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { applySiteTheme } from "@/lib/theme";

// Brand Lab reads localStorage and window when its modules load, so it only ever runs in the browser.
const BrandLab = dynamic(() => import("./brand-lab-client").then((m) => m.BrandLabClient), {
	ssr: false,
	loading: () => (
		<div role="status" className="type-text-s fixed inset-0 grid place-items-center bg-page text-neutral-weak">
			Loading Brand Lab
		</div>
	),
});

export function BrandLabMount() {
	// Brand Lab drives the page theme while it is open. Hand it back to the site on the way out.
	useEffect(() => () => applySiteTheme(), []);
	return <BrandLab />;
}
