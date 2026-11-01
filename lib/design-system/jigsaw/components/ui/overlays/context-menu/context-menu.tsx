import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import * as React from "react";
import { createPortal } from "react-dom";

import {
	CheckIcon,
	ChevronRightIcon,
	CloudIcon,
	CopyIcon,
	FolderPlusAltIcon,
	HistoryIcon,
	HomeIcon,
	SpeechBubbleCircularIcon,
} from "@icons/icons";

import { cn } from "../../../../lib/utils";
import {
	ToggleButton,
	type ToggleButtonOption,
} from "../../controls/toggle-button/toggle-button";
import { Kbd, KbdGroup } from "../../primitives/kbd/kbd";
import { Separator } from "../../primitives/separator/separator";
import {
	MagneticHoverClearZone,
	MagneticHoverRoot,
	useMagneticHover,
} from "../../utils/magnetic-hover/magnetic-hover";
import { Tooltip, TooltipContent, TooltipTrigger } from "../tooltip/tooltip";

// =============================================================================
// DESIGN TOKENS (from Figma)
// =============================================================================
// Menu Item:
//   - Height: 24px
//   - Padding-x: 6px (--spacing-sm)
//   - Padding-y: 4px (--spacing-xs) - implied by centering in fixed height
//   - Gap: 4px (--spacing-xs)
//   - Border radius: 4px (--radius-xs)
//   - Typography: label-xsmall (11px, Geist)
//   - Icon size: 14px (icon-normal)
// Container:
//   - Padding: 4px (--spacing-xs)
//   - Gap: 4px (--spacing-xs)
//   - Border radius: 6px (--radius-sm)
//   - Border: 1px solid stroke-normal
//   - Background: bg-surface-elevated-2
// =============================================================================

// =============================================================================
// RADIX-BASED CONTEXT MENU PRIMITIVES
// =============================================================================

function RContextMenu({
	...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Root>) {
	return <ContextMenuPrimitive.Root data-slot="context-menu" {...props} />;
}

function RContextMenuTrigger({
	...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Trigger>) {
	return (
		<ContextMenuPrimitive.Trigger
			data-slot="context-menu-trigger"
			{...props}
		/>
	);
}

function RContextMenuPortal({
	...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Portal>) {
	return (
		<ContextMenuPrimitive.Portal
			data-slot="context-menu-portal"
			{...props}
		/>
	);
}

function RContextMenuContent({
	className,
	children,
	...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Content>) {
	return (
		<ContextMenuPrimitive.Portal>
			<ContextMenuPrimitive.Content
				data-slot="context-menu-content"
				className={cn(
					// Container: bg-surface + elevation-2 overlay, border-weak, rounded-sm, subtle shadow
					"bg-surface-elevated-2 text-strong rounded-sm border border-weak",
					"shadow-[0px_8px_16px_-4px_rgba(0,0,0,0.08),0px_4px_8px_-2px_rgba(0,0,0,0.04)]",
					"z-9999 overflow-hidden",
					"data-[state=open]:animate-in data-[state=closed]:animate-out",
					"data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
					"data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
					"data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
					"data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
					className,
				)}
				{...props}
			>
				{/* Padding: 4px, Gap: 4px */}
				<MagneticHoverRoot className="p-xs flex flex-col gap-xs">
					{children}
				</MagneticHoverRoot>
			</ContextMenuPrimitive.Content>
		</ContextMenuPrimitive.Portal>
	);
}

function RContextMenuGroup({
	...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Group>) {
	return (
		<ContextMenuPrimitive.Group data-slot="context-menu-group" {...props} />
	);
}

interface RContextMenuItemProps extends React.ComponentProps<
	typeof ContextMenuPrimitive.Item
> {
	inset?: boolean;
	variant?: "default" | "destructive";
	/**
	 * Optional icon to display before the item text
	 */
	icon?: React.ReactNode;
	/**
	 * Optional icon to display after the item text (e.g., checkmark, external link)
	 */
	iconAfter?: React.ReactNode;
	/**
	 * Optional keyboard shortcut keys to display (e.g., ["⌘", "K"])
	 */
	shortcut?: string[];
}

function RContextMenuItem({
	className,
	inset,
	variant = "default",
	icon,
	iconAfter,
	shortcut,
	children,
	...props
}: RContextMenuItemProps) {
	const { isHovered: _isHovered, ...magneticHoverProps } =
		useMagneticHover<HTMLDivElement>();

	return (
		<ContextMenuPrimitive.Item
			data-slot="context-menu-item"
			data-inset={inset}
			data-variant={variant}
			className={cn(
				// Height: 24px, Padding-x: 6px, Gap: 4px, Border-radius: 4px
				"relative z-[1] label-xsmall text-strong flex flex-row items-center gap-xs h-[24px] px-sm cursor-default select-none rounded-xs",
				"outline-none focus:outline-none",
				"data-[variant=destructive]:text-negative-normal",
				"data-disabled:opacity-50 data-disabled:pointer-events-none",
				className,
			)}
			{...magneticHoverProps}
			{...props}
		>
			{/* Icon before: 14px, stroke-normal */}
			{icon && (
				<span className="shrink-0 inline-flex items-center justify-center size-[14px] [&_svg]:size-[14px] stroke-normal">
					{icon}
				</span>
			)}
			<span className="flex-1 whitespace-nowrap">{children}</span>
			{/* Keyboard shortcut - displayed after text, before iconAfter */}
			{shortcut && shortcut.length > 0 && (
				<KbdGroup>
					{shortcut.map((key) => (
						<Kbd key={key}>{key}</Kbd>
					))}
				</KbdGroup>
			)}
			{/* Icon after: 14px, stroke-normal (for checkmarks, external links, etc.) */}
			{iconAfter && (
				<span className="shrink-0 inline-flex items-center justify-center size-[14px] [&_svg]:size-[14px] stroke-normal">
					{iconAfter}
				</span>
			)}
		</ContextMenuPrimitive.Item>
	);
}

interface RContextMenuCheckboxItemProps extends React.ComponentProps<
	typeof ContextMenuPrimitive.CheckboxItem
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

function RContextMenuCheckboxItem({
	className,
	children,
	checked,
	icon,
	shortcut,
	...props
}: RContextMenuCheckboxItemProps) {
	const { isHovered: _isHovered, ...magneticHoverProps } =
		useMagneticHover<HTMLDivElement>();

	return (
		<ContextMenuPrimitive.CheckboxItem
			data-slot="context-menu-checkbox-item"
			className={cn(
				// Height: 24px, Padding-x: 6px, Gap: 4px, Border-radius: 4px
				"relative z-[1] label-xsmall text-strong flex flex-row items-center gap-xs h-[24px] px-sm cursor-default select-none rounded-xs",
				"outline-none focus:outline-none",
				"data-disabled:opacity-50 data-disabled:pointer-events-none",
				className,
			)}
			checked={checked}
			{...magneticHoverProps}
			{...props}
		>
			{/* Icon before: 14px, stroke-normal */}
			{icon && (
				<span className="shrink-0 inline-flex items-center justify-center size-[14px] [&_svg]:size-[14px] stroke-normal">
					{icon}
				</span>
			)}
			<span className="flex-1 whitespace-nowrap">{children}</span>
			{/* Keyboard shortcut */}
			{shortcut && shortcut.length > 0 && (
				<KbdGroup>
					{shortcut.map((key) => (
						<Kbd key={key}>{key}</Kbd>
					))}
				</KbdGroup>
			)}
			{/* Selection indicator: 14px, stroke-normal (checkmark icon) */}
			<ContextMenuPrimitive.ItemIndicator className="shrink-0 inline-flex items-center justify-center size-[14px] [&_svg]:size-[14px] stroke-normal">
				<CheckIcon />
			</ContextMenuPrimitive.ItemIndicator>
		</ContextMenuPrimitive.CheckboxItem>
	);
}

function RContextMenuRadioGroup({
	...props
}: React.ComponentProps<typeof ContextMenuPrimitive.RadioGroup>) {
	return (
		<ContextMenuPrimitive.RadioGroup
			data-slot="context-menu-radio-group"
			{...props}
		/>
	);
}

interface RContextMenuRadioItemProps extends React.ComponentProps<
	typeof ContextMenuPrimitive.RadioItem
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

function RContextMenuRadioItem({
	className,
	children,
	icon,
	shortcut,
	...props
}: RContextMenuRadioItemProps) {
	const { isHovered: _isHovered, ...magneticHoverProps } =
		useMagneticHover<HTMLDivElement>();

	return (
		<ContextMenuPrimitive.RadioItem
			data-slot="context-menu-radio-item"
			className={cn(
				// Height: 24px, Padding-x: 6px, Gap: 4px, Border-radius: 4px
				"relative z-[1] label-xsmall text-strong flex flex-row items-center gap-xs h-[24px] px-sm cursor-default select-none rounded-xs",
				"outline-none focus:outline-none",
				"data-disabled:opacity-50 data-disabled:pointer-events-none",
				className,
			)}
			{...magneticHoverProps}
			{...props}
		>
			{/* Icon before: 14px, stroke-normal */}
			{icon && (
				<span className="shrink-0 inline-flex items-center justify-center size-[14px] [&_svg]:size-[14px] stroke-normal">
					{icon}
				</span>
			)}
			<span className="flex-1 whitespace-nowrap">{children}</span>
			{/* Keyboard shortcut */}
			{shortcut && shortcut.length > 0 && (
				<KbdGroup>
					{shortcut.map((key) => (
						<Kbd key={key}>{key}</Kbd>
					))}
				</KbdGroup>
			)}
			{/* Selection indicator: 14px, stroke-normal (checkmark icon) */}
			<ContextMenuPrimitive.ItemIndicator className="shrink-0 inline-flex items-center justify-center size-[14px] [&_svg]:size-[14px] stroke-normal">
				<CheckIcon />
			</ContextMenuPrimitive.ItemIndicator>
		</ContextMenuPrimitive.RadioItem>
	);
}

function RContextMenuLabel({
	className,
	inset,
	...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Label> & {
	inset?: boolean;
}) {
	return (
		<ContextMenuPrimitive.Label
			data-slot="context-menu-label"
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

interface RContextMenuSeparatorProps {
	className?: string;
	/**
	 * Style variant for the separator
	 * @default "solid"
	 */
	variant?: "solid" | "dashed";
}

function RContextMenuSeparator({
	className,
	variant = "solid",
}: RContextMenuSeparatorProps) {
	return (
		<Separator
			data-slot="context-menu-separator"
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
 * Shortcut component for displaying keyboard shortcuts in context menu items.
 * Use the `shortcut` prop on RContextMenuItem instead for automatic kbd styling.
 * @deprecated Use the `shortcut` prop on RContextMenuItem instead
 */
function RContextMenuShortcut({
	className,
	...props
}: React.ComponentProps<"span">) {
	return (
		<span
			data-slot="context-menu-shortcut"
			className={cn("ml-auto label-xsmall text-weak", className)}
			{...props}
		/>
	);
}

function RContextMenuSub({
	...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Sub>) {
	return <ContextMenuPrimitive.Sub data-slot="context-menu-sub" {...props} />;
}

interface RContextMenuSubTriggerProps extends React.ComponentProps<
	typeof ContextMenuPrimitive.SubTrigger
> {
	inset?: boolean;
	/**
	 * Optional icon to display before the item text
	 */
	icon?: React.ReactNode;
}

function RContextMenuSubTrigger({
	className,
	inset,
	children,
	icon,
	...props
}: RContextMenuSubTriggerProps) {
	const { isHovered: _isHovered, ...magneticHoverProps } =
		useMagneticHover<HTMLDivElement>();

	return (
		<ContextMenuPrimitive.SubTrigger
			data-slot="context-menu-sub-trigger"
			data-inset={inset}
			className={cn(
				// Height: 24px, Padding-x: 6px, Gap: 4px, Border-radius: 4px
				"relative z-[1] label-xsmall text-strong flex flex-row items-center gap-xs h-[24px] px-sm cursor-default select-none rounded-xs",
				"outline-none focus:outline-none",
				"data-inset:pl-2xl",
				className,
			)}
			{...magneticHoverProps}
			{...props}
		>
			{/* Icon before: 14px, stroke-normal */}
			{icon && (
				<span className="shrink-0 inline-flex items-center justify-center size-[14px] [&_svg]:size-[14px] stroke-normal">
					{icon}
				</span>
			)}
			<span className="flex-1 whitespace-nowrap">{children}</span>
			{/* Submenu indicator: Chevron right, 14px, stroke-normal */}
			<span className="shrink-0 inline-flex items-center justify-center size-[14px] [&_svg]:size-[14px] stroke-normal">
				<ChevronRightIcon />
			</span>
		</ContextMenuPrimitive.SubTrigger>
	);
}

function RContextMenuSubContent({
	className,
	children,
	...props
}: React.ComponentProps<typeof ContextMenuPrimitive.SubContent>) {
	return (
		<ContextMenuPrimitive.SubContent
			data-slot="context-menu-sub-content"
			className={cn(
				// Container: bg-surface + elevation-2 overlay, border-weak, rounded-sm, subtle shadow
				"bg-surface-elevated-2 text-strong rounded-sm border border-weak",
				"shadow-[0px_8px_16px_-4px_rgba(0,0,0,0.08),0px_4px_8px_-2px_rgba(0,0,0,0.04)]",
				"z-9999 overflow-hidden",
				"data-[state=open]:animate-in data-[state=closed]:animate-out",
				"data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
				"data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
				"data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
				"data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
				className,
			)}
			{...props}
		>
			{/* Padding: 4px, Gap: 4px */}
			<MagneticHoverRoot className="p-xs flex flex-col gap-xs">
				{children}
			</MagneticHoverRoot>
		</ContextMenuPrimitive.SubContent>
	);
}

// =============================================================================
// ORIGINAL PRESENTATIONAL CONTEXT MENU (kept for backwards compatibility)
// =============================================================================

export interface ContextMenuItem {
	id?: string;
	label: string;
	icon?: React.ReactNode;
	onClick?: () => void;
	disabled?: boolean;
	/**
	 * Explanation shown in a tooltip when the item is disabled.
	 * Only displayed when the item is also `disabled`.
	 */
	disabledReason?: string;
	/**
	 * Optional keyboard shortcut keys to display, right-aligned (e.g. ["⌘", "D"]).
	 */
	shortcut?: string[];
}

export interface ContextMenuCustomContentItem {
	id?: string;
	type: "custom";
	content: React.ReactNode;
}

export interface ContextMenuToggleButtonItem {
	id?: string;
	type: "toggle";
	options: ToggleButtonOption[];
	value?: string;
	defaultValue?: string;
	onChange?: (value: string) => void;
}

export type ContextMenuItemType =
	| ContextMenuItem
	| ContextMenuCustomContentItem
	| ContextMenuToggleButtonItem;

export interface ContextMenuSection {
	items: ContextMenuItemType[];
}

export interface ContextMenuProps {
	sections?: ContextMenuSection[];
	className?: string;
	/** ID of the currently keyboard-selected item (for visual highlight) */
	selectedId?: string;
	/** Style variant for section separators @default "dashed" */
	separatorStyle?: "solid" | "dashed";
}

const DEFAULT_CONTEXT_MENU_SECTIONS: ContextMenuSection[] = [
	{
		items: [
			{
				id: "back-to-home",
				label: "Back to Home",
				icon: <HomeIcon />,
			},
			{
				id: "duplicate-project",
				label: "Duplicate Project",
				icon: <CopyIcon />,
			},
			{
				id: "move-to-folder",
				label: "Move to folder",
				icon: <FolderPlusAltIcon />,
			},
			{
				id: "save",
				label: "Save",
				icon: <CloudIcon />,
			},
		],
	},
	{
		items: [
			{
				id: "delete-project",
				label: "Delete Project",
				icon: <SpeechBubbleCircularIcon />,
			},
		],
	},
	{
		items: [
			{
				id: "version-history",
				label: "Version History",
				icon: <HistoryIcon />,
			},
		],
	},
];

function ContextMenu({
	sections = DEFAULT_CONTEXT_MENU_SECTIONS,
	className,
	selectedId,
	separatorStyle = "dashed",
}: ContextMenuProps) {
	return (
		<div
			data-slot="context-menu"
			className={cn(
				// Container: bg-surface + elevation-2 overlay, border-weak, rounded-sm, subtle shadow
				"bg-surface-elevated-2 rounded-sm border border-weak",
				"shadow-[0px_8px_16px_-4px_rgba(0,0,0,0.08),0px_4px_8px_-2px_rgba(0,0,0,0.04)]",
				className,
			)}
		>
			{/* Padding: 4px, Gap: 4px */}
			<MagneticHoverRoot className="flex flex-col gap-xs items-start p-xs">
				{sections.map((section, sectionIndex) => (
					<React.Fragment
						key={section.items[0]?.id || `section-${sectionIndex}`}
					>
						{section.items.map((item) => {
							if ("type" in item && item.type === "custom") {
								return (
									<ContextMenuCustomContent
										key={item.id || "custom"}
										{...item}
									/>
								);
							}
							if ("type" in item && item.type === "toggle") {
								return (
									<ContextMenuToggleButton
										key={item.id || "toggle"}
										{...item}
									/>
								);
							}
							return (
								<ContextMenuItemComponent
									key={item.id || item.label}
									isSelected={
										selectedId !== undefined &&
										item.id === selectedId
									}
									{...item}
								/>
							);
						})}
						{sectionIndex < sections.length - 1 && (
							<ContextMenuSeparatorComponent
								variant={separatorStyle as "solid" | "dashed"}
							/>
						)}
					</React.Fragment>
				))}
			</MagneticHoverRoot>
		</div>
	);
}

function ContextMenuItemComponent({
	id,
	label,
	icon,
	onClick,
	disabled = false,
	disabledReason,
	shortcut,
	isSelected,
}: ContextMenuItem & { isSelected?: boolean }) {
	const { isHovered: _isHovered, ...magneticHoverProps } =
		useMagneticHover<HTMLButtonElement>();
	const showDisabledTooltip = disabled && !!disabledReason;

	const buttonElement = (
		<button
			data-slot="context-menu-item"
			data-item-id={id}
			type="button"
			onClick={onClick}
			disabled={disabled}
			className={cn(
				// Height: 24px, Padding-x: 6px, Gap: 4px
				"relative z-[1] flex flex-row items-center gap-xs h-[24px] px-sm shrink-0 w-full",
				"text-left cursor-pointer rounded-xs",
				"disabled:opacity-50 disabled:cursor-not-allowed",
				!showDisabledTooltip && "disabled:pointer-events-none",
				isSelected && "bg-interaction-selected",
			)}
			{...magneticHoverProps}
		>
			{/* Icon: 14px, stroke-normal */}
			{icon && (
				<span className="shrink-0 inline-flex items-center justify-center size-[14px] [&_svg]:size-[14px] stroke-normal">
					{icon}
				</span>
			)}
			<span className="flex-1 label-xsmall text-strong whitespace-nowrap">
				{label}
			</span>
			{shortcut && shortcut.length > 0 && (
				<KbdGroup>
					{shortcut.map((key) => (
						<Kbd key={key}>{key}</Kbd>
					))}
				</KbdGroup>
			)}
		</button>
	);

	if (showDisabledTooltip) {
		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<span className="w-full">{buttonElement}</span>
				</TooltipTrigger>
				<TooltipContent side="right">{disabledReason}</TooltipContent>
			</Tooltip>
		);
	}

	return buttonElement;
}

function ContextMenuCustomContent({ content }: ContextMenuCustomContentItem) {
	return (
		<div data-slot="context-menu-custom-content" className="w-full">
			{content}
		</div>
	);
}

function ContextMenuToggleButton({
	options,
	value,
	defaultValue,
	onChange,
}: ContextMenuToggleButtonItem) {
	return (
		<MagneticHoverClearZone
			data-slot="context-menu-toggle-button"
			className="w-full"
		>
			<ToggleButton
				options={options}
				value={value}
				defaultValue={defaultValue}
				onChange={onChange}
			/>
		</MagneticHoverClearZone>
	);
}

function ContextMenuSeparatorComponent({
	variant = "dashed",
}: {
	variant?: "solid" | "dashed";
}) {
	return <Separator separatorStyle={variant} />;
}

// Radix-based context menu exports (R prefix for Radix)
export {
	RContextMenu,
	RContextMenuTrigger,
	RContextMenuPortal,
	RContextMenuContent,
	RContextMenuGroup,
	RContextMenuItem,
	RContextMenuCheckboxItem,
	RContextMenuRadioGroup,
	RContextMenuRadioItem,
	RContextMenuLabel,
	RContextMenuSeparator,
	RContextMenuShortcut,
	RContextMenuSub,
	RContextMenuSubTrigger,
	RContextMenuSubContent,
};

// =============================================================================
// VIEWPORT-AWARE CONTEXT MENU POPOVER
// =============================================================================

interface ContextMenuPopoverProps extends ContextMenuProps {
	/** Trigger x position (clientX from the mouse event) */
	x: number;
	/** Trigger y position (clientY from the mouse event) */
	y: number;
	/** Called when the menu should close (click-outside, item click, Escape) */
	onClose: () => void;
}

/**
 * A viewport-aware context menu popover that renders at a fixed position,
 * automatically flipping above/left when it would overflow the viewport.
 * Wraps the presentational `ContextMenu` with positioning, z-index, and
 * close-on-click behaviour.
 */
function ContextMenuPopover({
	x,
	y,
	onClose,
	sections,
	...rest
}: ContextMenuPopoverProps) {
	const menuRef = React.useRef<HTMLDivElement>(null);
	const [position, setPosition] = React.useState({ left: x, top: y });
	const [closing, setClosing] = React.useState(false);
	const didClose = React.useRef(false);

	// When the parent re-opens the menu at a new position (right-click while
	// already open), reset closing state so the enter animation replays.
	React.useLayoutEffect(() => {
		setClosing(false);
		didClose.current = false;
	}, [x, y]);

	// Viewport-aware repositioning
	React.useLayoutEffect(() => {
		const el = menuRef.current;
		if (!el) return;

		const rect = el.getBoundingClientRect();
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const padding = 8;

		let left = x;
		let top = y;

		if (left + rect.width > vw - padding) {
			left = Math.max(padding, x - rect.width);
		}
		if (top + rect.height > vh - padding) {
			top = Math.max(padding, y - rect.height);
		}

		setPosition({ left, top });
	}, [x, y]);

	const startClose = React.useCallback(() => {
		if (didClose.current) return;
		didClose.current = true;
		onClose();
	}, [onClose]);

	// Close on any outside pointerdown. For right-click, the parent may
	// re-open the menu at a new position a tick later — closing first keeps
	// the menu honest when the parent doesn't re-open (e.g. the right-click
	// target sits on a different coordination surface, or the popover itself
	// sits over the new target).
	React.useEffect(() => {
		const handlePointerDown = (e: PointerEvent) => {
			if (
				menuRef.current &&
				!menuRef.current.contains(e.target as Node)
			) {
				startClose();
			}
		};
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") startClose();
		};
		// Capture phase so descendant `stopPropagation` (e.g. the timeline
		// canvas's onPointerDown stops the event when clicking a clip) can't
		// suppress the close.
		document.addEventListener("pointerdown", handlePointerDown, true);
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener(
				"pointerdown",
				handlePointerDown,
				true,
			);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [startClose]);

	// Wrap each item's onClick to also close the menu
	const wrappedSections = React.useMemo(
		() =>
			sections?.map((section) => ({
				...section,
				items: section.items.map((item) => ({
					...item,
					...("onClick" in item
						? {
								onClick: () => {
									item.onClick?.();
									startClose();
								},
							}
						: {}),
				})),
			})),
		[sections, startClose],
	);

	return createPortal(
		<div
			ref={menuRef}
			className={cn(
				"fixed z-[100000]",
				!closing &&
					"animate-in fade-in-0 zoom-in-95 slide-in-from-top-2",
				closing && "animate-out fade-out-0 zoom-out-95",
			)}
			style={{ left: position.left, top: position.top }}
			onContextMenu={(e) => {
				// Right-clicking the menu itself closes it (the user almost
				// certainly meant to right-click the element behind it).
				e.preventDefault();
				startClose();
			}}
			onAnimationEnd={() => {
				if (closing && !didClose.current) {
					didClose.current = true;
					onClose();
				}
			}}
		>
			<ContextMenu sections={wrappedSections} {...rest} />
		</div>,
		document.body,
	);
}

// Original presentational context menu exports (for backwards compatibility)
export {
	ContextMenu,
	ContextMenuPopover,
	ContextMenuSeparatorComponent as ContextMenuSeparator,
	ContextMenuCustomContent,
	ContextMenuToggleButton,
};
