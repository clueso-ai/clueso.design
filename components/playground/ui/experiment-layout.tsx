"use client";

import { type ReactNode, useId, useState } from "react";
import { ChevronRightIcon } from "@/lib/design-system/icons";

// The playground's two-column frame: the stage on the left (sticky below the header from lg up, so
// it stays in view while the controls scroll) and the controls on the right, split by one hairline
// that runs the full height. On phones the controls stack under the stage.
// The controls are an accordion of ControlGroups (Source, Look, and so on), closed until you open
// one, each showing its current value while closed. Fine-tuning sits inside under Advanced. The one
// thing you came to do (Export, Download) goes in `actions`, pinned to the bottom of the panel.

export function ExperimentLayout({ stage, actions, children }: { stage: ReactNode; actions?: ReactNode; children: ReactNode }) {
	return (
		<div className="grid grid-cols-1 lg:grid-cols-3">
			<div className="flex min-w-0 flex-col gap-gap-s p-gap-l lg:sticky lg:top-16 lg:col-span-2 lg:self-start">{stage}</div>
			<div className="flex min-w-0 flex-col border-t border-neutral-weak lg:border-t-0 lg:border-l">
				<div className="flex flex-1 flex-col">{children}</div>
				{/* On phones the site's floating Customize button sits bottom right, so the actions keep clear of it. */}
				{actions && <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-gap-xs border-t border-neutral-weak bg-page p-gap-l max-lg:pr-gap-3xl">{actions}</div>}
			</div>
		</div>
	);
}

/**
 * One section of the controls: a header you click to open or close it, with its current value
 * (`summary`) on the right while closed, and an optional action (like Reset) while open.
 */
export function ControlGroup({ title, summary, action, defaultOpen = false, children }: { title: string; summary?: ReactNode; action?: ReactNode; defaultOpen?: boolean; children: ReactNode }) {
	const [open, setOpen] = useState(defaultOpen);
	const id = useId();
	return (
		<section className="border-b border-neutral-weak first:border-t-0">
			<div className="flex items-center gap-gap-s pr-gap-l">
				<button
					type="button"
					aria-expanded={open}
					aria-controls={id}
					onClick={() => setOpen(!open)}
					className="focus-ring group flex min-h-12 min-w-0 flex-1 items-center gap-gap-xs py-gap-s pl-gap-l text-left"
				>
					<ChevronRightIcon aria-hidden className={`size-3.5 shrink-0 text-neutral-weak transition-transform duration-200 ease-out-strong group-hover:text-neutral-strong motion-reduce:transition-none ${open ? "rotate-90" : ""}`} />
					<h3 className="type-text-m text-neutral-strong">{title}</h3>
					{summary !== undefined && !open && <span className="type-text-s ml-auto min-w-0 truncate pl-gap-s text-neutral-weak">{summary}</span>}
				</button>
				{open && action}
			</div>
			{/* Rows from 0fr to 1fr, so the section opens to its own height. */}
			<div
				id={id}
				role="region"
				aria-label={title}
				inert={!open}
				className="grid transition-[grid-template-rows] duration-200 ease-out-strong motion-reduce:transition-none"
				style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
			>
				<div className="min-h-0 overflow-hidden">
					<div className="flex flex-col gap-gap-s px-gap-l pb-gap-l">{children}</div>
				</div>
			</div>
		</section>
	);
}

/** Settings most people won't need, folded away under a label until opened. */
export function Advanced({ label = "Advanced", children }: { label?: string; children: ReactNode }) {
	return (
		<details className="group flex flex-col gap-gap-s">
			<summary className="focus-ring type-text-s flex w-fit cursor-pointer list-none items-center gap-gap-2xs rounded-tiny text-neutral-normal hover:text-neutral-strong [&::-webkit-details-marker]:hidden">
				<ChevronRightIcon aria-hidden className="size-3.5 transition-transform duration-200 ease-out-strong group-open:rotate-90" />
				{label}
			</summary>
			<div className="flex flex-col gap-gap-s pt-gap-s">{children}</div>
		</details>
	);
}
