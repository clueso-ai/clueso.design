import type * as React from "react";

/** A short status note, centred above the bottom bar. Render it while there is something to say. */
export function Toast({ children }: { children: React.ReactNode }) {
	return (
		<div role="status" className="label-xsmall-strong animate-in fade-in-0 slide-in-from-bottom-2 absolute bottom-[84px] left-1/2 z-toast -translate-x-1/2 rounded-sm bg-inverted px-xl py-md text-inverted shadow-elevation-2">
			{children}
		</div>
	);
}
