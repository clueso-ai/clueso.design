import type * as React from "react";
import { cn } from "@/lib/design-system/jigsaw/lib/utils";

// Small pieces Icon Lab's panels share. Segmented, Row and the other controls come from Brand Lab
// (tools/brand-lab/ui/controls), so both tools look the same.

/** An icon drawing as inline SVG. Icons drawn with "currentColor" take the text colour around them. */
export function Svg({ markup, className, ...props }: { markup: string; className?: string } & Omit<React.ComponentProps<"span">, "children" | "dangerouslySetInnerHTML">) {
	return <span className={cn("il-icon inline-flex shrink-0 [&>svg]:block", className)} dangerouslySetInnerHTML={{ __html: markup }} {...props} />;
}

/** A label above its control, for controls too wide to sit beside their label. */
export function Stack({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
	return (
		<div className={cn("flex flex-col gap-sm", className)}>
			<span className="label-xsmall text-normal">{label}</span>
			{children}
		</div>
	);
}
