import type * as React from "react";
import { cn } from "@/lib/design-system/jigsaw/lib/utils";

/** A floating editor panel: elevated surface, hairline border, soft shadow. */
function Panel({ className, ...props }: React.ComponentProps<"div">) {
	return <div className={cn("absolute flex flex-col overflow-hidden rounded-md border border-weak bg-surface-elevated-1 text-strong", className)} {...props} />;
}

function PanelHeader({ title, children, className }: { title: React.ReactNode; children?: React.ReactNode; className?: string }) {
	return (
		<div className={cn("flex h-[40px] shrink-0 items-center gap-xs border-b border-weak pl-xl pr-sm", className)}>
			<h2 className="label-small-strong flex-1 truncate text-strong">{title}</h2>
			{children}
		</div>
	);
}

/** A titled group of controls inside a panel, separated by a dashed rule like jigsaw's menus. */
function Section({ title, children, className, action }: { title?: React.ReactNode; children: React.ReactNode; className?: string; action?: React.ReactNode }) {
	return (
		<section className={cn("flex flex-col gap-md border-b border-dashed border-weak px-xl py-xl last:border-b-0", className)}>
			{(title || action) && (
				<div className="flex min-h-[20px] items-center justify-between">
					{title && <h3 className="label-xsmall-strong text-strong">{title}</h3>}
					{action}
				</div>
			)}
			{children}
		</section>
	);
}

export { Panel, PanelHeader, Section };
