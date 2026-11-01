import Link from "next/link";
import { cn } from "@/lib/design-system";
import { ArrowRightIcon } from "@/lib/design-system/icons";

type Props = React.ComponentProps<typeof Link> & { variant?: "primary" | "quiet"; arrow?: boolean };

/** A link that looks like a button. Site-only; tools use the harness controls. */
export function LinkButton({ variant = "primary", arrow, className, children, ...rest }: Props) {
	return (
		<Link
			{...rest}
			className={cn(
				"state-layer focus-ring type-text-m inline-flex h-11 items-center gap-gap-xs rounded-medium px-gap-l font-medium whitespace-nowrap",
				variant === "primary" ? "bg-neutral-inverted text-neutral-inverted" : "border border-neutral-normal text-neutral-strong",
				className,
			)}
		>
			{children}
			{arrow && <ArrowRightIcon className="size-4" aria-hidden />}
		</Link>
	);
}
