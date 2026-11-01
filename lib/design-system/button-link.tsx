import Link from "next/link";
import { cn } from "./jigsaw/lib/utils";
import { buttonVariants } from "./jigsaw/components/ui/controls/button/button";

// A Jigsaw button that navigates. Jigsaw's Button only renders <button>, so this applies the same
// variants and label structure to a Next.js <Link>. Remove when Jigsaw ships asChild or a link
// variant. Jigsaw buttons drop the focus outline, so focus-ring puts a visible one back.

// Below md, large buttons step down to medium so they sit right on phones. Medium stays medium:
// any smaller is too small to tap comfortably. From md up they're the size you asked for. The md: classes repeat Jigsaw's size
// variants, written out in full so Tailwind finds them.

const LABEL = { small: "label-xsmall", medium: "label-small", large: "label-medium" } as const;
const LABEL_HEIGHT = { small: "h-[16px]", medium: "h-[16px]", large: "h-[20px]" } as const;
const ICON = { small: "size-[16px]", medium: "size-[16px]", large: "size-[20px]" } as const;

type Size = keyof typeof LABEL;

const STEP_DOWN: Record<Size, Size> = { small: "small", medium: "medium", large: "medium" };
const MD_BUTTON = { small: "", medium: "", large: "md:h-[40px] md:px-2xl md:gap-xs md:rounded-sm" } as const;
const MD_LABEL = { small: "", medium: "", large: "md:label-medium" } as const;
const MD_LABEL_HEIGHT = { small: "", medium: "", large: "md:h-[20px]" } as const;
const MD_ICON = { small: "", medium: "", large: "md:size-[20px]" } as const;

export interface ButtonLinkProps extends React.ComponentProps<typeof Link> {
	variant?: "filled" | "outlined" | "transparent";
	sentiment?: "brand" | "neutral";
	size?: Size;
	/** Shown after the label. */
	icon?: React.ReactElement<{ className?: string }>;
}

export function ButtonLink({ variant = "filled", sentiment = "brand", size = "small", icon, className, children, ...rest }: ButtonLinkProps) {
	const iconColour = variant === "filled" ? (sentiment === "neutral" ? "stroke-inverted text-inverted" : "stroke-static-white text-static-white") : sentiment === "brand" ? "stroke-brand-normal text-brand-normal" : "stroke-strong text-strong";
	const base = STEP_DOWN[size];
	return (
		<Link {...rest} className={cn(buttonVariants({ variant, sentiment, size: base }), MD_BUTTON[size], "focus-ring", className)}>
			<span className={cn("flex shrink-0 items-center justify-center px-xs py-2xs", LABEL_HEIGHT[base], MD_LABEL_HEIGHT[size])}>
				<span className={cn(LABEL[base], MD_LABEL[size])}>{children}</span>
			</span>
			{icon && <span className={cn("flex shrink-0 items-center", ICON[base], MD_ICON[size], iconColour, "[&>svg]:size-full")}>{icon}</span>}
		</Link>
	);
}
