import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import * as React from "react";

import { CheckIcon, ChevronRightIcon } from "@icons/icons";

import { cn } from "../../../../lib/utils";
import { Kbd, KbdGroup } from "../../primitives/kbd/kbd";
import { Separator } from "../../primitives/separator/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "../tooltip/tooltip";

import {
	MagneticHoverClearZone,
	MagneticHoverRoot,
	useMagneticHover,
} from "../../utils/magnetic-hover/magnetic-hover";

function DropdownMenu({
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
	return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuPortal({
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
	return (
		<DropdownMenuPrimitive.Portal
			data-slot="dropdown-menu-portal"
			{...props}
		/>
	);
}

function DropdownMenuTrigger({
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
	return (
		<DropdownMenuPrimitive.Trigger
			data-slot="dropdown-menu-trigger"
			{...props}
		/>
	);
}

function DropdownMenuContent({
	className,
	sideOffset = 4,
	container,
	children,
	onCloseAutoFocus,
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content> & {
	container?: HTMLElement;
}) {
	return (
		<DropdownMenuPrimitive.Portal container={container as HTMLElement}>
			<DropdownMenuPrimitive.Content
				data-slot="dropdown-menu-content"
				sideOffset={sideOffset}
				onCloseAutoFocus={(e) => {
					// Prevent Radix from returning focus to the trigger on close.
					// This avoids Space/Enter re-opening the menu when the user
					// intends to trigger a shortcut (e.g. play/pause video).
					e.preventDefault();
					onCloseAutoFocus?.(e);
				}}
				className={cn(
					// Container: bg-surface + elevation-2 overlay, border-weak, rounded-sm, subtle shadow
					"bg-surface-elevated-2 text-strong rounded-sm border border-weak",
					"shadow-[0px_6px_6px_0px_rgba(0,0,0,0.04),0px_2px_4px_0px_rgba(0,0,0,0.04)]",
					"data-[state=open]:animate-in data-[state=closed]:animate-out",
					"data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
					"data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
					"data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
					"data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
					"z-9999 max-h-(--radix-dropdown-menu-content-available-height)",
					"origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto scrollbar-hide",
					className,
				)}
				{...props}
			>
				<MagneticHoverRoot className="p-xs flex flex-col gap-xs">
					{children}
				</MagneticHoverRoot>
			</DropdownMenuPrimitive.Content>
		</DropdownMenuPrimitive.Portal>
	);
}

function DropdownMenuGroup({
	className,
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
	return (
		<DropdownMenuPrimitive.Group
			data-slot="dropdown-menu-group"
			className={cn("flex flex-col gap-xs", className)}
			{...props}
		/>
	);
}

interface DropdownMenuItemProps extends React.ComponentProps<
	typeof DropdownMenuPrimitive.Item
> {
	inset?: boolean;
	variant?: "default" | "destructive";
	/**
	 * Optional icon to display before the item text
	 */
	icon?: React.ReactNode;
	/**
	 * Optional keyboard shortcut keys to display (e.g., ["⌘", "K"])
	 */
	shortcut?: string[];
	/**
	 * Explanation shown in a tooltip when the item is disabled.
	 * Only displayed when the item is also `disabled`.
	 */
	disabledReason?: string;
	/**
	 * Optional secondary text rendered on a second line below `children`.
	 * When present, the item grows to a two-line layout and labels wrap
	 * instead of truncating.
	 */
	description?: React.ReactNode;
}

function DropdownMenuItem({
	className,
	inset,
	variant = "default",
	icon,
	shortcut,
	children,
	disabledReason,
	disabled,
	description,
	...props
}: DropdownMenuItemProps) {
	const { isHovered: _isHovered, ...magneticHoverProps } =
		useMagneticHover<HTMLDivElement>();
	const showDisabledTooltip = disabled && !!disabledReason;
	const hasDescription = description !== undefined && description !== null;

	const itemElement = (
		<DropdownMenuPrimitive.Item
			data-slot="dropdown-menu-item"
			data-inset={inset}
			data-variant={variant}
			disabled={disabled}
			className={cn(
				// Height: 24px (single-line) / auto (two-line), Padding-x: 6px, Gap: 4px
				"relative z-1 label-xsmall text-strong flex flex-row gap-xs px-sm cursor-default select-none rounded-xs",
				hasDescription
					? "items-start py-sm min-h-4xl"
					: "items-center h-4xl",
				"outline-none focus:outline-none",
				"data-[variant=destructive]:text-negative-normal",
				"data-disabled:opacity-50",
				// Keep pointer events off for ordinary disabled items, but NOT
				// when a disabledReason tooltip must show — pointer-events-none
				// would swallow the hover that triggers it. Radix still blocks
				// selection on disabled items, so hover is the only effect.
				!showDisabledTooltip && "data-disabled:pointer-events-none",
				className,
			)}
			{...magneticHoverProps}
			{...props}
		>
			{icon && (
				<span
					className={cn(
						"shrink-0 inline-flex items-center justify-center size-3.5 [&_svg]:size-3.5 stroke-normal",
						hasDescription && "mt-0.5",
					)}
				>
					{icon}
				</span>
			)}
			{hasDescription ? (
				<span className="flex-1 min-w-0 flex flex-col gap-3xs">
					<span className="text-strong">{children}</span>
					<span className="para-xsmall text-weak whitespace-normal">
						{description}
					</span>
				</span>
			) : (
				<span className="flex-1 min-w-0 truncate">{children}</span>
			)}
			{shortcut && shortcut.length > 0 && (
				<KbdGroup>
					{shortcut.map((key) => (
						<Kbd key={key}>{key}</Kbd>
					))}
				</KbdGroup>
			)}
		</DropdownMenuPrimitive.Item>
	);

	if (showDisabledTooltip) {
		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<span className="w-full">{itemElement}</span>
				</TooltipTrigger>
				<TooltipContent side="right">{disabledReason}</TooltipContent>
			</Tooltip>
		);
	}

	return itemElement;
}

interface DropdownMenuCheckboxItemProps extends React.ComponentProps<
	typeof DropdownMenuPrimitive.CheckboxItem
> {
	/**
	 * Optional icon to display before the item text
	 */
	icon?: React.ReactNode;
	/**
	 * Optional keyboard shortcut keys to display (e.g., ["⌘", "K"])
	 */
	shortcut?: string[];
}

function DropdownMenuCheckboxItem({
	className,
	children,
	checked,
	icon,
	shortcut,
	...props
}: DropdownMenuCheckboxItemProps) {
	const { isHovered: _isHovered, ...magneticHoverProps } =
		useMagneticHover<HTMLDivElement>();

	return (
		<DropdownMenuPrimitive.CheckboxItem
			data-slot="dropdown-menu-checkbox-item"
			className={cn(
				"relative z-1 label-xsmall text-strong flex flex-row items-center gap-xs h-4xl px-sm cursor-default select-none rounded-xs",
				"outline-none focus:outline-none",
				"data-disabled:opacity-50",
				// When checked, paint label + leading icon + trailing tick
				// in the brand colour to match the rest of the design system.
				"data-[state=checked]:text-brand-normal",
				className,
			)}
			checked={checked}
			{...magneticHoverProps}
			{...props}
		>
			{icon && (
				<span
					className={cn(
						"shrink-0 inline-flex items-center justify-center size-3.5 [&_svg]:size-3.5 stroke-normal",
						checked && "stroke-brand-normal",
					)}
				>
					{icon}
				</span>
			)}
			<span className="flex-1 min-w-0 truncate">{children}</span>
			{shortcut && shortcut.length > 0 ? (
				<KbdGroup>
					{shortcut.map((key) => (
						<Kbd key={key}>{key}</Kbd>
					))}
				</KbdGroup>
			) : (
				<span
					className={cn(
						"shrink-0 inline-flex items-center justify-center size-3.5",
						checked ? "stroke-brand-normal" : "stroke-strong",
						!checked && "invisible",
					)}
				>
					<CheckIcon className="size-3.5" />
				</span>
			)}
		</DropdownMenuPrimitive.CheckboxItem>
	);
}

function DropdownMenuRadioGroup({
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
	return (
		<DropdownMenuPrimitive.RadioGroup
			data-slot="dropdown-menu-radio-group"
			{...props}
		/>
	);
}

interface DropdownMenuRadioItemProps extends React.ComponentProps<
	typeof DropdownMenuPrimitive.RadioItem
> {
	/**
	 * Optional icon to display before the item text
	 */
	icon?: React.ReactNode;
}

function DropdownMenuRadioItem({
	className,
	children,
	icon,
	...props
}: DropdownMenuRadioItemProps) {
	const { isHovered: _isHovered, ...magneticHoverProps } =
		useMagneticHover<HTMLDivElement>();

	return (
		<DropdownMenuPrimitive.RadioItem
			data-slot="dropdown-menu-radio-item"
			className={cn(
				"relative z-1 label-xsmall text-strong flex flex-row items-center gap-xs h-4xl px-sm cursor-default select-none rounded-xs",
				"outline-none focus:outline-none",
				"data-disabled:opacity-50",
				className,
			)}
			{...magneticHoverProps}
			{...props}
		>
			{icon && (
				<span className="shrink-0 inline-flex items-center justify-center size-3.5 [&_svg]:size-3.5 stroke-normal">
					{icon}
				</span>
			)}
			<span className="flex-1 min-w-0 truncate">{children}</span>
			<DropdownMenuPrimitive.ItemIndicator className="shrink-0 inline-flex items-center justify-center size-3.5 stroke-strong">
				<CheckIcon className="size-3.5" />
			</DropdownMenuPrimitive.ItemIndicator>
		</DropdownMenuPrimitive.RadioItem>
	);
}

function DropdownMenuLabel({
	className,
	inset,
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
	inset?: boolean;
}) {
	return (
		<DropdownMenuPrimitive.Label
			data-slot="dropdown-menu-label"
			data-inset={inset}
			className={cn(
				// Padding-x: 6px
				"label-xsmall-strong text-normal px-sm py-xs",
				"data-inset:pl-2xl",
				className,
			)}
			{...props}
		/>
	);
}

interface DropdownMenuSeparatorProps {
	className?: string;
	/**
	 * Style variant for the separator
	 * @default "solid"
	 */
	variant?: "solid" | "dashed";
}

function DropdownMenuSeparator({
	className,
	variant = "solid",
}: DropdownMenuSeparatorProps) {
	return (
		<Separator
			data-slot="dropdown-menu-separator"
			separatorStyle={variant}
			className={cn(
				"-mx-xs my-xs w-[calc(100%+var(--spacing-xs)*2)]",
				variant === "dashed" && "border-normal",
				className,
			)}
		/>
	);
}

/**
 * Shortcut component for displaying keyboard shortcuts in dropdown menu items.
 * Use the `shortcut` prop on DropdownMenuItem instead for automatic kbd styling.
 * @deprecated Use the `shortcut` prop on DropdownMenuItem instead
 */
function DropdownMenuShortcut({
	className,
	...props
}: React.ComponentProps<"span">) {
	return (
		<span
			data-slot="dropdown-menu-shortcut"
			className={cn("ml-auto label-xsmall text-weak", className)}
			{...props}
		/>
	);
}

function DropdownMenuSub({
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
	return (
		<DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />
	);
}

interface DropdownMenuSubTriggerProps extends React.ComponentProps<
	typeof DropdownMenuPrimitive.SubTrigger
> {
	inset?: boolean;
	/**
	 * Optional icon to display before the item text
	 */
	icon?: React.ReactNode;
}

function DropdownMenuSubTrigger({
	className,
	inset,
	children,
	icon,
	...props
}: DropdownMenuSubTriggerProps) {
	const { isHovered: _isHovered, ...magneticHoverProps } =
		useMagneticHover<HTMLDivElement>();

	return (
		<DropdownMenuPrimitive.SubTrigger
			data-slot="dropdown-menu-sub-trigger"
			data-inset={inset}
			className={cn(
				// Height: 24px, Padding-x: 6px, Gap: 4px
				"relative z-1 label-xsmall text-strong flex flex-row items-center gap-xs h-4xl px-sm cursor-default select-none rounded-xs",
				"outline-none focus:outline-none",
				"data-inset:pl-2xl",
				className,
			)}
			{...magneticHoverProps}
			{...props}
		>
			{icon && (
				<span className="shrink-0 inline-flex items-center justify-center size-3.5 [&_svg]:size-3.5 stroke-normal">
					{icon}
				</span>
			)}
			<span className="flex-1 min-w-0 truncate">{children}</span>
			<ChevronRightIcon className="shrink-0 size-3.5 stroke-weak" />
		</DropdownMenuPrimitive.SubTrigger>
	);
}

function DropdownMenuSubContent({
	className,
	children,
	sideOffset = 8,
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
	return (
		<DropdownMenuPrimitive.SubContent
			data-slot="dropdown-menu-sub-content"
			sideOffset={sideOffset}
			className={cn(
				// Container: bg-surface + elevation-2 overlay, border-weak, rounded-sm, subtle shadow
				"bg-surface-elevated-2 text-strong rounded-sm border border-weak",
				"shadow-[0px_6px_6px_0px_rgba(0,0,0,0.04),0px_2px_4px_0px_rgba(0,0,0,0.04)]",
				"data-[state=open]:animate-in data-[state=closed]:animate-out",
				"data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
				"data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
				"data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
				"data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
				"z-9999 origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden",
				className,
			)}
			{...props}
		>
			<MagneticHoverRoot className="p-xs flex flex-col gap-xs">
				{children}
			</MagneticHoverRoot>
		</DropdownMenuPrimitive.SubContent>
	);
}

export {
	DropdownMenu,
	DropdownMenuPortal,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuLabel,
	DropdownMenuItem,
	DropdownMenuCheckboxItem,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubTrigger,
	DropdownMenuSubContent,
	MagneticHoverClearZone as DropdownMenuClearZone,
};
