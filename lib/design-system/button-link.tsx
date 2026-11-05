import Link from "next/link";
import { cn } from "./jigsaw/lib/utils";
import { buttonVariants } from "./jigsaw/components/ui/controls/button/button";

// A Jigsaw button that navigates. Jigsaw's Button only renders <button>, so this applies the same
// variants and label structure to a Next.js <Link>. Remove when Jigsaw ships asChild or a link
// variant. Jigsaw buttons drop the focus outline, so focus-ring puts a visible one back.

// Sizes follow Jigsaw's: small, medium and large. Large is the one to use where a button must be
// easy to tap on a phone, like the homepage hero's.

const LABEL = { small: "label-xsmall", medium: "label-small", large: "label-medium" } as const;
const LABEL_HEIGHT = { small: "h-[16px]", medium: "h-[16px]", large: "h-[20px]" } as const;
const ICON = { small: "size-[16px]", medium: "size-[16px]", large: "size-[20px]" } as const;
/** Square, like Jigsaw's icon-only buttons. */
const SQUARE = { small: "size-[28px] p-0!", medium: "size-[32px] p-0!", large: "size-[40px] p-0!" } as const;

type Size = keyof typeof LABEL;

export interface ButtonLinkProps extends React.ComponentProps<typeof Link> {
	variant?: "filled" | "outlined" | "transparent";
	sentiment?: "brand" | "neutral";
	size?: Size;
	/** Shown after the label, or alone with `iconOnly`. */
	icon?: React.ReactElement<{ className?: string }>;
	/** Just the icon, in a square. Give it an aria-label. */
	iconOnly?: boolean;
}

export function ButtonLink({ variant = "filled", sentiment = "brand", size = "small", icon, iconOnly = false, className, children, ...rest }: ButtonLinkProps) {
	const iconColour = variant === "filled" ? (sentiment === "neutral" ? "stroke-inverted text-inverted" : "stroke-static-white text-static-white") : sentiment === "brand" ? "stroke-brand-normal text-brand-normal" : "stroke-strong text-strong";
	if (iconOnly) {
		return (
			<Link {...rest} className={cn(buttonVariants({ variant, sentiment, size }), SQUARE[size], "focus-ring", className)}>
				<span className={cn("flex shrink-0 items-center", ICON[size], iconColour, "[&>svg]:size-full")}>{icon}</span>
			</Link>
		);
	}
	return (
		<Link {...rest} className={cn(buttonVariants({ variant, sentiment, size }), "focus-ring", className)}>
			<span className={cn("flex shrink-0 items-center justify-center px-xs py-2xs", LABEL_HEIGHT[size])}>
				<span className={cn("flex items-center gap-gap-xs", LABEL[size])}>{children}</span>
			</span>
			{icon && <span className={cn("flex shrink-0 items-center", ICON[size], iconColour, "[&>svg]:size-full")}>{icon}</span>}
		</Link>
	);
}
