import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as SelectPrimitive from "@radix-ui/react-select";
import { type VariantProps, cva } from "class-variance-authority";
import { motion } from "framer-motion";
import * as React from "react";

import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "@icons/icons";
import { cn } from "../../../../lib/utils";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "../../overlays/tooltip/tooltip";
import {
	MagneticHoverRoot,
	useMagneticHover,
} from "../../utils/magnetic-hover/magnetic-hover";
import { Button } from "../button/button";
import { Tabs, TabsList, TabsTrigger } from "../tabs/tabs";

/**
 * Select Component - Jigsaw Design System
 *
 * SIZES (following component sizing paradigm):
 * ┌─────────┬──────────┬──────────┬───────────────┬─────────────────────┐
 * │ Size    │ Height   │ Icon     │ Typography    │ Padding (H × V)     │
 * ├─────────┼──────────┼──────────┼───────────────┼─────────────────────┤
 * │ xsmall  │ 24px     │ 14px     │ label-xsmall  │ 6px × 5px           │
 * │ small   │ 28px     │ 16px     │ label-xsmall  │ 8px × 6px           │
 * │ medium  │ 32px     │ 16px     │ label-small   │ 12px × 8px          │
 * │ large   │ 40px     │ 20px     │ label-medium  │ 16px × 10px         │
 * └─────────┴──────────┴──────────┴───────────────┴─────────────────────┘
 *
 * The Select opens "around" the trigger - the container wraps both
 * trigger and items in a unified visual container with animation.
 */

const Select = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

// Size configuration for Select
const selectSizeConfig = {
	xsmall: {
		iconSize: "size-[14px]",
		typography: "label-xsmall",
		radius: "rounded-xs",
	},
	small: {
		iconSize: "size-[16px]",
		typography: "label-xsmall",
		radius: "rounded-xs",
	},
	medium: {
		iconSize: "size-[16px]",
		typography: "label-small",
		radius: "rounded-sm",
	},
	large: {
		iconSize: "size-[20px]",
		typography: "label-medium",
		radius: "rounded-sm",
	},
} as const;

export type SelectSize = keyof typeof selectSizeConfig;

// Context to pass size from SelectTrigger
const SelectSizeContext = React.createContext<SelectSize>("small");

const SelectValue = React.forwardRef<
	React.ElementRef<typeof SelectPrimitive.Value>,
	React.ComponentPropsWithoutRef<typeof SelectPrimitive.Value>
>(({ className, ...props }, ref) => {
	const size = React.useContext(SelectSizeContext);
	const config = selectSizeConfig[size];

	return (
		<SelectPrimitive.Value
			ref={ref}
			data-slot="select-value"
			className={cn(
				config.typography,
				"text-strong",
				className,
				"jigsaw-select-value",
			)}
			{...props}
		/>
	);
});
SelectValue.displayName = SelectPrimitive.Value.displayName;

const selectTriggerVariants = cva(
	cn(
		"flex w-full items-center justify-between gap-2xs border bg-depth-inset-1 text-strong outline-none transition-[color,box-shadow,border-color,background-color]",
		"hover:bg-interaction-hover-subtle",
		// Focus/open: pink border and ring on trigger only
		"focus:border-brand-normal focus:shadow-[0px_0px_0px_2px_rgba(218,92,199,0.25)]",
		"data-[state=open]:border-brand-normal data-[state=open]:shadow-[0px_0px_0px_2px_rgba(218,92,199,0.25)] data-[state=open]:bg-interaction-selected-subtle",
		"disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
	),
	{
		variants: {
			size: {
				xsmall: "h-[24px] px-sm py-[5px] rounded-xs border-weak", // 24px height, 4px radius
				small: "h-[28px] px-md py-sm rounded-xs border-weak", // 28px height, 4px radius
				medium: "h-[32px] px-xl py-md rounded-sm border-weak", // 32px height, 6px radius
				large: "h-[40px] px-2xl py-lg rounded-sm border-weak", // 40px height, 6px radius
			},
		},
		defaultVariants: {
			size: "small",
		},
	},
);

export interface SelectTriggerProps
	extends
		React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>,
		VariantProps<typeof selectTriggerVariants> {}

const SelectTrigger = React.forwardRef<
	React.ElementRef<typeof SelectPrimitive.Trigger>,
	SelectTriggerProps
>(({ className, size = "small", children, ...props }, ref) => {
	const sizeKey = size || "small";
	const config = selectSizeConfig[sizeKey];

	return (
		<SelectSizeContext.Provider value={sizeKey}>
			<SelectPrimitive.Trigger
				ref={ref}
				data-slot="select-trigger"
				data-size={sizeKey}
				className={cn(
					"group",
					selectTriggerVariants({ size: sizeKey }),
					config.typography,
					className,
					"jigsaw-select-trigger",
				)}
				{...props}
			>
				{children}
				<SelectPrimitive.Icon asChild>
					<ChevronDownIcon
						className={cn(
							config.iconSize,
							"stroke-weak shrink-0 transition-transform duration-200",
							// Rotate when the Select trigger itself is open
							"group-data-[state=open]:rotate-180",
						)}
					/>
				</SelectPrimitive.Icon>
			</SelectPrimitive.Trigger>
		</SelectSizeContext.Provider>
	);
});
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<
	React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
	React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
	<SelectPrimitive.ScrollUpButton
		ref={ref}
		data-slot="select-scroll-up-button"
		className={cn(
			"flex cursor-default items-center justify-center py-xs stroke-weak",
			className,
		)}
		{...props}
	>
		<ChevronUpIcon className="size-4" />
	</SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
	React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
	React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
	<SelectPrimitive.ScrollDownButton
		ref={ref}
		data-slot="select-scroll-down-button"
		className={cn(
			"flex cursor-default items-center justify-center py-xs stroke-weak",
			className,
		)}
		{...props}
	>
		<ChevronDownIcon className="size-4" />
	</SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName =
	SelectPrimitive.ScrollDownButton.displayName;

interface SelectContentProps extends React.ComponentPropsWithoutRef<
	typeof SelectPrimitive.Content
> {
	hideScrollButtons?: boolean;
}

const SelectContent = React.forwardRef<
	React.ElementRef<typeof SelectPrimitive.Content>,
	SelectContentProps
>(
	(
		{
			className,
			children,
			position = "popper",
			hideScrollButtons = false,
			...props
		},
		ref,
	) => (
		<SelectPrimitive.Portal>
			<SelectPrimitive.Content
				ref={ref}
				data-slot="select-content"
				sideOffset={4}
				className={cn(
					"jigsaw-select-content relative z-[var(--z-index-popover)] max-h-96 overflow-hidden",
					// Container: bg-surface-elevated-2, border-weak, rounded-sm, subtle shadow
					"rounded-sm bg-surface-elevated-2 border border-weak",
					"shadow-[0px_8px_16px_-4px_rgba(0,0,0,0.08),0px_4px_8px_-2px_rgba(0,0,0,0.04)]",
					"text-strong",
					"data-[state=open]:animate-in data-[state=closed]:animate-out",
					"data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
					"data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
					"data-[side=bottom]:slide-in-from-top-2",
					"data-[side=left]:slide-in-from-right-2",
					"data-[side=right]:slide-in-from-left-2",
					"data-[side=top]:slide-in-from-bottom-2",
					position === "popper" &&
						"data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
					className,
				)}
				position={position}
				{...props}
			>
				{!hideScrollButtons && <SelectScrollUpButton />}
				<SelectPrimitive.Viewport
					className={cn(
						position === "popper" &&
							"w-full min-w-(--radix-select-trigger-width)",
					)}
				>
					<MagneticHoverRoot className="p-xs flex flex-col gap-xs">
						{children}
					</MagneticHoverRoot>
				</SelectPrimitive.Viewport>
				{!hideScrollButtons && <SelectScrollDownButton />}
			</SelectPrimitive.Content>
		</SelectPrimitive.Portal>
	),
);
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
	React.ElementRef<typeof SelectPrimitive.Label>,
	React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
	<SelectPrimitive.Label
		ref={ref}
		data-slot="select-label"
		className={cn(
			// Padding-x: 6px
			"px-sm py-xs label-xsmall-strong text-normal",
			className,
		)}
		{...props}
	/>
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

interface SelectItemProps extends React.ComponentPropsWithoutRef<
	typeof SelectPrimitive.Item
> {
	/**
	 * Optional icon to display before the item text
	 */
	icon?: React.ReactNode;
}

const SelectItem = React.forwardRef<
	React.ElementRef<typeof SelectPrimitive.Item>,
	SelectItemProps
>(({ className, children, icon, ...props }, ref) => {
	const {
		isHovered: _isHovered,
		ref: _ref,
		...magneticHoverProps
	} = useMagneticHover<HTMLDivElement>();

	return (
		<SelectPrimitive.Item
			ref={ref}
			data-slot="select-item"
			className={cn(
				// Height: 24px, Padding-x: 6px, Gap: 4px
				"relative z-[1] flex flex-row w-full h-[24px] cursor-default select-none items-center gap-xs rounded-xs px-sm label-xsmall text-strong outline-none",
				"data-disabled:pointer-events-none data-disabled:opacity-50",
				className,
			)}
			{...magneticHoverProps}
			{...props}
		>
			{/* Icon: 14px, stroke-weak */}
			{icon && (
				<span className="shrink-0 inline-flex items-center justify-center size-[14px] [&_svg]:size-[14px] stroke-weak">
					{icon}
				</span>
			)}
			<span className="flex-1 whitespace-nowrap">
				<SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
			</span>
			{/* Selection indicator: plain check, 14px */}
			<SelectPrimitive.ItemIndicator className="shrink-0 inline-flex">
				<CheckIcon className="size-[14px] stroke-strong" />
			</SelectPrimitive.ItemIndicator>
		</SelectPrimitive.Item>
	);
});
SelectItem.displayName = SelectPrimitive.Item.displayName;

interface SelectSeparatorProps extends React.ComponentPropsWithoutRef<
	typeof SelectPrimitive.Separator
> {
	/**
	 * Style variant for the separator
	 * @default "solid"
	 */
	variant?: "solid" | "dashed";
}

const SelectSeparator = React.forwardRef<
	React.ElementRef<typeof SelectPrimitive.Separator>,
	SelectSeparatorProps
>(({ className, variant = "solid", ...props }, ref) => (
	<SelectPrimitive.Separator
		ref={ref}
		data-slot="select-separator"
		className={cn(
			"-mx-xs my-xs h-px",
			variant === "solid" && "bg-weak",
			variant === "dashed" &&
				"border-t border-dashed border-weak bg-transparent",
			className,
		)}
		{...props}
	/>
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

// =============================================================================
// WRAPPED SELECT - Opens "around" the trigger with animation
// =============================================================================

interface WrappedSelectTab {
	/** Unique value for the tab */
	value: string;
	/** Display label for the tab */
	label: string;
}

interface WrappedSelectOption {
	/** Unique value for the option */
	value: string;
	/** Display label for the option */
	label: string;
	/** Whether the option is disabled */
	disabled?: boolean;
	/** Icon to display before the label (left side) */
	iconBefore?: React.ReactNode;
	/** Icon to display after the label (right side, before check indicator) */
	iconAfter?: React.ReactNode;
	/**
	 * Inline content shown immediately after the label text (left-aligned, not
	 * right-aligned like iconAfter). The label truncates first so this stays
	 * visible. Auto-hidden when the active tab equals this option's `tab` (the
	 * badge would be redundant once you've filtered into that tab).
	 */
	labelBadge?: React.ReactNode;
	/** When true, icon is rendered at its natural size (e.g. for Avatars) instead of 14px */
	largeIcon?: boolean;
	/** Whether to show a dashed separator below this item */
	showSeparator?: boolean;
	/** Tab value this option belongs to (for filtering) */
	tab?: string;
	/** Custom styles to apply to the option (e.g., fontFamily for font previews) */
	style?: React.CSSProperties;
	/** Tooltip text shown on hover */
	tooltip?: string;
	/** Icon for a per-option action (e.g. delete), revealed on hover/highlight. Clicking it fires onAction instead of selecting the option. */
	actionIcon?: React.ReactNode;
	/** Handler for the per-option action. Receives the option value. Selection is suppressed when this fires. */
	onAction?: (value: string, e: React.MouseEvent) => void;
	/** Accessible label / native tooltip for the action icon */
	actionLabel?: string;
}

interface WrappedSelectBaseProps {
	/** Whether the select is disabled */
	disabled?: boolean;
	/** Placeholder text when no value selected */
	placeholder?: string;
	/**
	 * Static label shown in the trigger instead of the selected option's
	 * label. Use when the trigger should always read the same (e.g. "Aspect
	 * ratio") while the current selection is conveyed via `triggerIcon`. The
	 * dropdown items still display their own labels. Ignored when `iconOnly`.
	 */
	triggerLabel?: string;
	/** The select options */
	options: WrappedSelectOption[];
	/** Additional class name for the wrapper */
	className?: string;
	/** Icon to show in the trigger (if set, all items will reserve icon space) */
	triggerIcon?: React.ReactNode;
	/** Automatically show the selected option's iconBefore in the trigger */
	showSelectedIcon?: boolean;
	/** Show only the trigger icon and chevron, hiding the label. Dropdown items use compact padding. */
	iconOnly?: boolean;
	/** Enable search filtering (trigger becomes searchable input) */
	searchable?: boolean;
	/** Tabs for filtering content */
	tabs?: WrappedSelectTab[];
	/** Default active tab */
	defaultTab?: string;
	/** Visual variant for the tabs bar. Defaults to "contained". */
	tabsVariant?: "contained" | "line";
	/** Header label rendered above the options list (non-interactive title). */
	header?: React.ReactNode;
	/** Footer content (e.g., action buttons) */
	footer?: React.ReactNode;
	/** Controlled open state */
	open?: boolean;
	/** Callback when open state changes */
	onOpenChange?: (open: boolean) => void;
	/** Optional callback for handling interaction events (for custom event marking) */
	onInteraction?: (e: React.MouseEvent | React.FocusEvent) => void;
	/** Additional class name for the popover content (e.g. to override z-index inside modals) */
	popoverClassName?: string;
	/** Size variant — xsmall (24px) or small (28px). Defaults to xsmall. */
	size?: WrappedSelectSize;
	/**
	 * Where the selection check is rendered. "trailing" (default) shows it at
	 * the end of the row; "leading" shows it at the start and reserves that
	 * leading space on unselected rows so labels align (macOS/Figma style).
	 */
	checkPosition?: "leading" | "trailing";
}

interface WrappedSelectSingleProps extends WrappedSelectBaseProps {
	/** Enable multi-select mode */
	multiSelect?: false;
	/** The currently selected value */
	value?: string;
	/** Default value when uncontrolled */
	defaultValue?: string;
	/** Callback when value changes */
	onValueChange?: (value: string) => void;
}

interface WrappedSelectMultiProps extends WrappedSelectBaseProps {
	/** Enable multi-select mode */
	multiSelect: true;
	/** The currently selected values */
	value?: string[];
	/** Default values when uncontrolled */
	defaultValue?: string[];
	/** Callback when values change */
	onValueChange?: (value: string[]) => void;
}

type WrappedSelectProps = WrappedSelectSingleProps | WrappedSelectMultiProps;

// Padding around trigger when container is open
const CONTAINER_PADDING = 4; // 4px (xs)

// Size config for WrappedSelect
const wrappedSelectSizeConfig = {
	xsmall: {
		triggerHeight: 24,
		triggerClass: "h-[24px] px-sm py-[5px]",
		iconSize: "size-[14px] [&_svg]:size-[14px]",
		chevronSize: "size-[14px]",
		typography: "label-xsmall",
	},
	small: {
		triggerHeight: 28,
		triggerClass: "h-[28px] px-md py-sm",
		iconSize: "size-[16px] [&_svg]:size-[16px]",
		chevronSize: "size-[16px]",
		typography: "label-xsmall",
	},
} as const;

type WrappedSelectSize = keyof typeof wrappedSelectSizeConfig;

/**
 * WrappedSelect - A Select that opens "around" the trigger using Radix Popover
 *
 * The trigger maintains its exact dimensions. When opened, a Popover appears
 * positioned to wrap around the trigger with items appearing below.
 * The pink focus ring appears only on the trigger row inside the popover.
 *
 * Features:
 * - Search filtering
 * - Tab-based content filtering
 * - Action footer
 * - Consistent icon alignment
 * - Dashed separators
 *
 * Supports xsmall (24px) and small (28px) sizes. Defaults to xsmall.
 */
function WrappedSelect({
	value: controlledValue,
	defaultValue,
	onValueChange,
	disabled = false,
	placeholder = "Select...",
	triggerLabel,
	options,
	className,
	triggerIcon,
	showSelectedIcon = false,
	searchable = false,
	tabs,
	defaultTab,
	header,
	footer,
	open: controlledOpen,
	onOpenChange,
	onInteraction,
	popoverClassName,
	size = "xsmall",
	iconOnly = false,
	tabsVariant = "contained",
	checkPosition = "trailing",
	...props
}: WrappedSelectProps) {
	const sizeConfig = wrappedSelectSizeConfig[size];
	const isMulti = props.multiSelect === true;
	const [internalOpen, setInternalOpen] = React.useState(false);
	const [internalValue, setInternalValue] = React.useState<string | string[]>(
		defaultValue ?? (isMulti ? [] : ""),
	);
	const [searchQuery, setSearchQuery] = React.useState("");
	const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
	const [activeTab, setActiveTab] = React.useState(
		defaultTab ?? tabs?.[0]?.value ?? "",
	);
	const searchInputRef = React.useRef<HTMLInputElement>(null);
	const optionsListRef = React.useRef<HTMLDivElement>(null);
	const triggerRef = React.useRef<HTMLButtonElement>(null);
	const popoverContentRef = React.useRef<HTMLDivElement | null>(null);

	// Callback ref: patch pointer-events on the wrapper div each time the
	// portaled Popover content mounts. The Dialog's DismissableLayer sets
	// body pointer-events:none which cascades down; we must override it.
	const popoverContentCallbackRef = React.useCallback(
		(node: HTMLDivElement | null) => {
			popoverContentRef.current = node;
			if (!node) return;
			const wrapper = node.closest(
				"[data-radix-popper-content-wrapper]",
			) as HTMLElement | null;
			if (wrapper) wrapper.style.pointerEvents = "auto";
		},
		[],
	);

	// Support controlled open state
	const isOpenControlled = controlledOpen !== undefined;
	const isOpen = isOpenControlled ? controlledOpen : internalOpen;
	const setIsOpen = React.useCallback(
		(open: boolean) => {
			if (!isOpenControlled) {
				setInternalOpen(open);
			}
			onOpenChange?.(open);
		},
		[isOpenControlled, onOpenChange],
	);

	// Persistent focusin/focusout interceptor: prevents a parent Dialog's
	// FocusScope from pulling focus out of the portaled search input.
	// Uses the live ref so it survives Popover remount cycles.
	React.useEffect(() => {
		if (!searchable || !isOpen) return;

		const isInsidePopover = (target: EventTarget | null) => {
			if (!(target instanceof HTMLElement)) return false;
			const content = popoverContentRef.current;
			if (!content) return false;
			const wrapper = content.closest(
				"[data-radix-popper-content-wrapper]",
			);
			return wrapper
				? wrapper.contains(target)
				: content.contains(target);
		};

		const handleFocusIn = (e: Event) => {
			if (isInsidePopover(e.target)) e.stopImmediatePropagation();
		};
		const handleFocusOut = (e: Event) => {
			if (isInsidePopover((e as FocusEvent).relatedTarget))
				e.stopImmediatePropagation();
		};

		document.addEventListener("focusin", handleFocusIn, true);
		document.addEventListener("focusout", handleFocusOut, true);
		return () => {
			document.removeEventListener("focusin", handleFocusIn, true);
			document.removeEventListener("focusout", handleFocusOut, true);
		};
	}, [searchable, isOpen]);

	const isControlled = controlledValue !== undefined;
	const currentValue = isControlled ? controlledValue : internalValue;

	// For single-select, find the selected option for trigger display
	const selectedOption = isMulti
		? undefined
		: options.find((opt) => opt.value === (currentValue as string));

	// Check if a value is selected (works for both single and multi-select)
	const isValueSelected = (value: string) => {
		if (isMulti) {
			return (currentValue as string[]).includes(value);
		}
		return currentValue === value;
	};

	// Resolve effective trigger icon: explicit prop wins, then selected option's icon
	const effectiveTriggerIcon =
		triggerIcon ??
		(showSelectedIcon ? selectedOption?.iconBefore : undefined);
	const effectiveTriggerLargeIcon =
		showSelectedIcon && !triggerIcon ? selectedOption?.largeIcon : false;

	// Determine if we should reserve icon space in the dropdown items.
	// Only reserve when options themselves have icons — triggerIcon is
	// trigger-only and shouldn't force indent on every dropdown item.
	const hasAnyIcon: boolean = options.some((opt) => !!opt.iconBefore);

	// Filter options based on search and active tab
	const filteredOptions = React.useMemo(() => {
		let filtered = options;

		// Filter by tab if tabs are present
		if (tabs && tabs.length > 0 && activeTab) {
			if (activeTab !== "all") {
				filtered = filtered.filter(
					(opt) => !opt.tab || opt.tab === activeTab,
				);
			}
		}

		// Filter by search query
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter((opt) =>
				opt.label.toLowerCase().includes(query),
			);
		}

		return filtered;
	}, [options, tabs, activeTab, searchQuery]);

	const handleSelect = (optionValue: string) => {
		if (isMulti) {
			const currentArr = currentValue as string[];
			const nextArr = currentArr.includes(optionValue)
				? currentArr.filter((v) => v !== optionValue)
				: [...currentArr, optionValue];
			if (!isControlled) {
				setInternalValue(nextArr);
			}
			(onValueChange as ((value: string[]) => void) | undefined)?.(
				nextArr,
			);
			// Don't close on multi-select — user keeps toggling
		} else {
			if (!isControlled) {
				setInternalValue(optionValue);
			}
			(onValueChange as ((value: string) => void) | undefined)?.(
				optionValue,
			);
			setIsOpen(false);
			setSearchQuery("");
		}
	};

	// Focus search input when opened, clear search when closed
	React.useEffect(() => {
		if (isOpen && searchable) {
			const timeoutId = setTimeout(() => {
				searchInputRef.current?.focus();
			}, 50);
			return () => clearTimeout(timeoutId);
		}
		if (!isOpen) {
			setSearchQuery("");
			setHighlightedIndex(-1);
		}
	}, [isOpen, searchable]);

	// Handle search input changes
	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSearchQuery(e.target.value);
		setHighlightedIndex(0);
	};

	const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		// Let global shortcut combos (Cmd/Ctrl+key, e.g. the Cmd+K command
		// palette) reach document-level handlers. The select only navigates
		// with bare keys, so only those should be kept from propagating.
		if (!(e.metaKey || e.ctrlKey)) {
			e.stopPropagation();
		}

		if (e.key === "ArrowDown") {
			e.preventDefault();
			setHighlightedIndex((prev) =>
				prev < filteredOptions.length - 1 ? prev + 1 : 0,
			);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setHighlightedIndex((prev) =>
				prev > 0 ? prev - 1 : filteredOptions.length - 1,
			);
		} else if (e.key === "Enter") {
			e.preventDefault();
			if (
				highlightedIndex >= 0 &&
				highlightedIndex < filteredOptions.length
			) {
				const opt = filteredOptions[highlightedIndex];
				if (!opt.disabled) handleSelect(opt.value);
			}
		} else if (e.key === "Escape") {
			e.preventDefault();
			setIsOpen(false);
		}
	};

	// Scroll the highlighted option into view
	React.useEffect(() => {
		if (highlightedIndex < 0) return;
		const container = optionsListRef.current;
		if (!container) return;
		const items = container.querySelectorAll("[data-wrapped-select-item]");
		const target = items[highlightedIndex] as HTMLElement | undefined;
		target?.scrollIntoView({ block: "nearest" });
	}, [highlightedIndex]);

	// Display value for trigger/input
	const displayValue = React.useMemo(() => {
		if (searchable && isOpen) return searchQuery;
		if (isMulti) {
			const selectedArr = currentValue as string[];
			if (selectedArr.length === 0) return "";
			if (selectedArr.length === 1) {
				return (
					options.find((o) => o.value === selectedArr[0])?.label ??
					selectedArr[0]
				);
			}
			return `${selectedArr.length} selected`;
		}
		return selectedOption?.label || "";
	}, [
		searchable,
		isOpen,
		searchQuery,
		isMulti,
		currentValue,
		options,
		selectedOption,
	]);

	// Handle interaction events
	const handleInteractionEvent = (e: React.MouseEvent | React.FocusEvent) => {
		onInteraction?.(e);
		// Default behavior: mark as RightPanel for backward compatibility
		if (!onInteraction) {
			(e as any).clickTarget = "RightPanel";
			if ("nativeEvent" in e) {
				(e.nativeEvent as any).clickTarget = "RightPanel";
			}
		}
	};

	return (
		<PopoverPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
			<div
				data-slot="wrapped-select"
				data-state={isOpen ? "open" : "closed"}
				className={cn("relative w-full scrollbar-hide", className)}
			>
				{/* Real trigger - maintains layout, invisible when open */}
				<PopoverPrimitive.Anchor asChild>
					<button
						ref={triggerRef}
						type="button"
						disabled={disabled}
						data-slot="wrapped-select-trigger"
						data-state={isOpen ? "open" : "closed"}
						className={cn(
							"relative flex w-full items-center gap-xs text-strong outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 transition-[color,box-shadow,border-color,background-color]",
							sizeConfig.typography,
							sizeConfig.triggerClass,
							"rounded-xs",
							iconOnly ? "gap-md" : "gap-xs",
							disabled && "cursor-not-allowed opacity-50",
							!isOpen && [
								"border border-weak bg-depth-inset-1",
								"hover:bg-interaction-hover-subtle cursor-pointer",
							],
							isOpen && "invisible border border-transparent",
						)}
						onClick={(e) => {
							handleInteractionEvent(e);
							if (!isOpen) setIsOpen(true);
						}}
						onMouseDown={handleInteractionEvent}
					>
						{effectiveTriggerIcon && (
							<span
								className={cn(
									"shrink-0 inline-flex items-center justify-center stroke-strong",
									effectiveTriggerLargeIcon
										? "mr-2xs"
										: sizeConfig.iconSize,
								)}
							>
								{effectiveTriggerIcon}
							</span>
						)}
						{!iconOnly && (
							<span className="flex-1 truncate text-left">
								{triggerLabel || displayValue || placeholder}
							</span>
						)}
						<ChevronDownIcon
							className={cn(
								sizeConfig.chevronSize,
								"stroke-weak shrink-0 transition-transform duration-200",
								iconOnly ? "size-[12px]" : "size-[14px]",
								isOpen && "rotate-180",
							)}
						/>
					</button>
				</PopoverPrimitive.Anchor>

				{/* Popover content - wraps around trigger */}
				<PopoverPrimitive.Portal>
					<PopoverPrimitive.Content
						ref={popoverContentCallbackRef}
						data-slot="wrapped-select-content"
						side="bottom"
						align="start"
						sideOffset={
							-(sizeConfig.triggerHeight + CONTAINER_PADDING + 1)
						} // trigger + 4px padding + 1px border
						alignOffset={-(CONTAINER_PADDING + 1)} // -5px: 4px padding + 1px border
						className={cn(
							"z-[2147483647] outline-none pointer-events-auto",
							popoverClassName,
						)}
						style={{
							pointerEvents: "auto" as const,
							// Make container wider to accommodate padding + border
							// This keeps trigger clone at exact original width
							// When iconOnly, let the dropdown size to its content
							...(iconOnly
								? { width: "auto" }
								: {
										width: `calc(var(--radix-popover-trigger-width) + ${CONTAINER_PADDING * 2 + 2}px)`,
									}),
						}}
						onOpenAutoFocus={(e) => {
							// Prevent auto focus stealing from search input
							e.preventDefault();
						}}
						onKeyDown={(e) => {
							// Stop keyboard events from reaching the parent Dialog/Modal,
							// which would otherwise intercept them (same pattern as onWheel fix for scroll).
							// Exception: let global shortcut combos (Cmd/Ctrl+key, e.g. the
							// Cmd+K command palette) through to document-level handlers.
							if (!(e.metaKey || e.ctrlKey)) {
								e.stopPropagation();
							}
						}}
					>
						<motion.div
							initial={{ opacity: 0, scale: 0.98, y: -4 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.98, y: -4 }}
							transition={{
								duration: 0.15,
								ease: [0.16, 1, 0.3, 1], // Custom easing for smooth motion
							}}
							className="rounded-md border border-weak bg-surface-elevated-1 shadow-[0px_8px_16px_-4px_rgba(0,0,0,0.08),0px_4px_8px_-2px_rgba(0,0,0,0.04)] p-xs"
						>
							{/* Trigger clone row with pink ring - elevation-2 for brighter appearance */}
							<div
								className={cn(
									"flex w-full items-center gap-xs text-strong",
									sizeConfig.typography,
									sizeConfig.triggerClass,
									"rounded-xs",
									"border border-brand-normal",
									"bg-surface-elevated-2 mb-xs",
									!searchable && "cursor-pointer",
									// Subtle scale animation on trigger clone
									"transition-transform duration-150 ease-out",
								)}
								style={{
									// Use box-shadow instead of shadow class for precise control
									boxShadow:
										"0px 0px 0px 2px rgba(218, 92, 199, 0.25)",
								}}
								onClick={(e) => {
									handleInteractionEvent(e);
									if (!searchable) {
										setIsOpen(false);
									}
								}}
								onMouseDown={handleInteractionEvent}
							>
								{effectiveTriggerIcon && (
									<span
										className={cn(
											"shrink-0 inline-flex items-center justify-center stroke-strong",
											effectiveTriggerLargeIcon
												? "mr-2xs"
												: sizeConfig.iconSize,
										)}
									>
										{effectiveTriggerIcon}
									</span>
								)}
								{searchable ? (
									<input
										ref={searchInputRef}
										type="text"
										size={1}
										value={displayValue}
										onChange={handleSearchChange}
										placeholder={placeholder}
										disabled={disabled}
										className={cn(
											"flex-1 bg-transparent outline-none text-left text-strong placeholder:text-weak min-w-0 w-0",
											sizeConfig.typography,
										)}
										onClick={handleInteractionEvent}
										onMouseDown={(e) => {
											handleInteractionEvent(e);
											e.stopPropagation();
										}}
										onKeyDown={handleSearchKeyDown}
										onFocus={(e) => e.stopPropagation()}
									/>
								) : !iconOnly ? (
									<span className="flex-1 truncate text-left">
										{displayValue || placeholder}
									</span>
								) : null}
								<ChevronDownIcon
									className={cn(
										sizeConfig.chevronSize,
										"stroke-weak shrink-0 rotate-180 cursor-pointer",
									)}
									onClick={(e) => {
										e.stopPropagation();
										setIsOpen(false);
									}}
								/>
							</div>

							{/* Tabs */}
							{tabs && tabs.length > 0 && (
								<Tabs
									value={activeTab}
									onValueChange={setActiveTab}
									className="pb-xs"
								>
									<TabsList
										variant={tabsVariant}
										size="small"
									>
										{tabs.map((tab) => (
											<TabsTrigger
												key={tab.value}
												value={tab.value}
											>
												{tab.label}
											</TabsTrigger>
										))}
									</TabsList>
								</Tabs>
							)}

							{/* Header label */}
							{header && (
								<div className="px-sm pt-sm pb-xs label-xsmall text-weak select-none">
									{header}
								</div>
							)}

							{/* Options list with subtle staggered animation */}
							<motion.div
								ref={optionsListRef}
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ duration: 0.2, delay: 0.05 }}
								className="max-h-60 overflow-y-scroll overflow-x-hidden scrollbar-hide"
								onWheel={(e) => {
									e.stopPropagation();
									e.currentTarget.scrollTop += e.deltaY;
								}}
							>
								<MagneticHoverRoot className="flex flex-col gap-xs">
									{filteredOptions.length > 0 ? (
										filteredOptions.map((option, index) => (
											<React.Fragment key={option.value}>
												<WrappedSelectItem
													option={option}
													isSelected={isValueSelected(
														option.value,
													)}
													isHighlighted={
														highlightedIndex ===
														index
													}
													onSelect={handleSelect}
													reserveIconSpace={
														!iconOnly && hasAnyIcon
													}
													compact={iconOnly}
													checkPosition={
														checkPosition
													}
													activeTab={activeTab}
												/>
												{option.showSeparator &&
													index <
														filteredOptions.length -
															1 && (
														<div className="h-px border-t border-dashed border-weak mx-xs" />
													)}
											</React.Fragment>
										))
									) : (
										<div className="px-sm py-xs label-xsmall text-weak">
											No results found
										</div>
									)}
								</MagneticHoverRoot>
							</motion.div>

							{/* Footer with animation */}
							{footer && (
								<motion.div
									initial={{ opacity: 0, y: 4 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.2, delay: 0.1 }}
									className="pt-xs"
								>
									{footer}
								</motion.div>
							)}
						</motion.div>
					</PopoverPrimitive.Content>
				</PopoverPrimitive.Portal>
			</div>
		</PopoverPrimitive.Root>
	);
}

interface WrappedSelectItemProps {
	option: WrappedSelectOption;
	isSelected: boolean;
	isHighlighted?: boolean;
	onSelect: (value: string) => void;
	/** Whether to reserve space for icon even if option doesn't have one */
	reserveIconSpace?: boolean;
	/** Use compact padding (reduced left padding, no icon space) */
	compact?: boolean;
	/** Where the selection check is rendered (see WrappedSelect.checkPosition) */
	checkPosition?: "leading" | "trailing";
	/** The currently active tab — used to auto-hide a redundant labelBadge */
	activeTab?: string;
}

function WrappedSelectItem({
	option,
	isSelected,
	isHighlighted = false,
	onSelect,
	reserveIconSpace = false,
	compact = false,
	checkPosition = "trailing",
	activeTab,
}: WrappedSelectItemProps) {
	const { isHovered: _isHovered, ...magneticHoverProps } =
		useMagneticHover<HTMLDivElement>();

	const leadingCheck = checkPosition === "leading";

	// The label badge is redundant once you've filtered into its own tab.
	const showLabelBadge =
		option.labelBadge != null &&
		!(option.tab != null && option.tab === activeTab);

	const hasAction = Boolean(option.actionIcon && option.onAction);

	// Row is a div (role="option") rather than a <button> so per-option action
	// controls (e.g. a delete Button) can nest as valid interactive elements.
	// Keyboard selection is handled centrally by the list (Enter on the
	// highlighted item); mouse selection is handled by onClick here.
	const row = (
		// biome-ignore lint/a11y/useSemanticElements: custom listbox option inside a popover; native <option> only works within <select>/<datalist>
		// biome-ignore lint/a11y/useFocusableInteractive: options are not individual tab stops — keyboard navigation is handled centrally on the search input (activedescendant-style)
		<div
			role="option"
			aria-selected={isSelected}
			aria-disabled={option.disabled || undefined}
			onClick={() => !option.disabled && onSelect(option.value)}
			data-slot="wrapped-select-item"
			data-wrapped-select-item=""
			data-selected={isSelected}
			data-highlighted={isHighlighted || undefined}
			style={option.style}
			className={cn(
				"group relative z-[1] flex flex-row w-full cursor-default select-none items-center rounded-xs label-xsmall text-strong outline-none text-left",
				option.largeIcon ? "h-8 gap-sm py-xs" : "h-[24px] gap-xs",
				compact ? "px-xs" : "px-sm",
				option.disabled && "pointer-events-none opacity-50",
				isHighlighted && "bg-interaction-hover",
			)}
			{...magneticHoverProps}
		>
			{/* Leading selection indicator — reserves space when unselected so
			    labels stay aligned (Figma/macOS style) */}
			{leadingCheck && (
				<span className="shrink-0 inline-flex items-center justify-center size-[14px]">
					{isSelected && (
						<CheckIcon className="size-[14px] stroke-strong" />
					)}
				</span>
			)}

			{/* Icon before (left) */}
			{(option.iconBefore || reserveIconSpace) && (
				<span
					className={cn(
						"shrink-0 inline-flex items-center justify-center stroke-strong",
						option.largeIcon
							? ""
							: "size-[14px] [&_svg]:size-[14px]",
					)}
				>
					{option.iconBefore}
				</span>
			)}

			{/* Label + inline badge, grouped left. The label truncates first so
			    the badge stays visible. */}
			<div className="flex flex-1 min-w-0 flex-row items-center gap-xs">
				<span className="truncate min-w-0">{option.label}</span>
				{showLabelBadge && (
					<span className="shrink-0 inline-flex items-center">
						{option.labelBadge}
					</span>
				)}
			</div>

			{/* Icon after (right-aligned, before check) */}
			{option.iconAfter && (
				<span className="shrink-0 inline-flex items-center justify-center">
					{option.iconAfter}
				</span>
			)}

			{/* Per-option action (e.g. delete), pinned to the end and revealed
			    on hover/highlight */}
			{hasAction && (
				<Button
					iconOnly
					size="xsmall"
					variant="transparent"
					sentiment="neutral"
					icon={option.actionIcon}
					aria-label={option.actionLabel}
					title={option.actionLabel}
					tabIndex={-1}
					iconClassName="stroke-(--color-fg-icon-normal) text-(--color-fg-icon-normal)"
					onMouseDown={(e) => {
						e.preventDefault();
						e.stopPropagation();
					}}
					onClick={(e) => {
						e.preventDefault();
						e.stopPropagation();
						option.onAction?.(option.value, e);
					}}
					className="shrink-0 p-0! bg-transparent! [&:hover:not(:disabled)]:bg-transparent! [&:active:not(:disabled)]:bg-transparent! [&:hover_svg]:stroke-(--color-fg-icon-negative-normal) [&:hover_svg]:text-(--color-fg-icon-negative-normal) opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-data-[highlighted]:opacity-100 focus-visible:opacity-100"
				/>
			)}

			{/* Trailing selection indicator (default) */}
			{!leadingCheck && isSelected && (
				<CheckIcon className="shrink-0 size-[14px] stroke-strong" />
			)}
		</div>
	);

	if (option.tooltip) {
		return (
			<Tooltip>
				<TooltipTrigger asChild>{row}</TooltipTrigger>
				<TooltipContent side="right">{option.tooltip}</TooltipContent>
			</Tooltip>
		);
	}

	return row;
}

export {
	Select,
	SelectGroup,
	SelectValue,
	SelectTrigger,
	SelectContent,
	SelectLabel,
	SelectItem,
	SelectSeparator,
	SelectScrollUpButton,
	SelectScrollDownButton,
	WrappedSelect,
};
export type { WrappedSelectOption, WrappedSelectTab, WrappedSelectSize };
