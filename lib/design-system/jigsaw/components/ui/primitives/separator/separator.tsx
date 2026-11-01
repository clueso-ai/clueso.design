import * as SeparatorPrimitive from "@radix-ui/react-separator";
import * as React from "react";

import PlusIcon from "@icons/icons/Mathematics/Plus.svg?react";
import { cn } from "../../../../lib/utils";
import { Button } from "../../controls/button/button";

type SeparatorStyle = "solid" | "dashed";

interface SeparatorProps extends React.ComponentProps<
	typeof SeparatorPrimitive.Root
> {
	/**
	 * The visual style of the separator line.
	 * @default "solid"
	 */
	separatorStyle?: SeparatorStyle;
	/**
	 * Whether to show a plus (+) button centered on the separator on hover.
	 * Only works with horizontal orientation.
	 * @default false
	 */
	showAddButton?: boolean;
	/**
	 * Callback when the add button is clicked.
	 */
	onAddClick?: () => void;
}

function Separator({
	className,
	orientation = "horizontal",
	separatorStyle = "solid",
	decorative = true,
	showAddButton = false,
	onAddClick,
	...props
}: SeparatorProps) {
	const separatorElement = (
		<SeparatorPrimitive.Root
			data-slot="separator"
			decorative={decorative}
			orientation={orientation}
			className={cn(
				"shrink-0",
				// Horizontal separator
				orientation === "horizontal" && "w-full",
				// Vertical separator
				orientation === "vertical" && "h-full",
				// Style variants
				separatorStyle === "dashed" && [
					"border-weak",
					orientation === "horizontal"
						? "border-t border-dashed"
						: "border-l border-dashed",
				],
				separatorStyle === "solid" && [
					"bg-(--color-fg-stroke-weak)",
					orientation === "horizontal" ? "h-px" : "w-px",
				],
				!showAddButton && className,
			)}
			{...props}
		/>
	);

	if (!showAddButton || orientation === "vertical") {
		return separatorElement;
	}

	return (
		<div
			data-slot="separator-with-add"
			className={cn(
				"group relative flex h-6 w-full items-center justify-center",
				className,
			)}
		>
			{separatorElement}
			<Button
				type="button"
				onClick={onAddClick}
				iconOnly
				variant={"outlined"}
				size={"xsmall"}
				sentiment={"neutral"}
				className={cn(
					"absolute  left-1/2 -translate-x-1/2  flex items-center justify-center  opacity-0 transition-opacity duration-150 group-hover:opacity-100",
					className,
				)}
				icon={<PlusIcon className="h-[14px] w-[14px]" />}
			/>
		</div>
	);
}

export { Separator, type SeparatorStyle };
