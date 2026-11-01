// The Jigsaw adapter. Pages and tools import components only from here.
//
// TEMPORARY FOUNDATION: until @clueso-ai/jigsaw is published, this re-exports a pinned snapshot of
// Jigsaw (./jigsaw, gigauser commit 5c57362c19, see ./jigsaw/SYNC.md). When the package ships, this
// file points at it and ./jigsaw is deleted. Nothing outside lib/design-system should change.
//
// Need something that isn't here? Add it with the shadcn CLI into components/ui, then export it
// below. Never copy more Jigsaw code in by hand.

export { cn } from "./jigsaw/lib/utils";
export { Button, buttonVariants, type ButtonProps } from "./jigsaw/components/ui/controls/button/button";
export { Tag } from "./jigsaw/components/ui/primitives/tag/tag";
export { Kbd, KbdGroup } from "./jigsaw/components/ui/primitives/kbd/kbd";
export { Separator } from "./jigsaw/components/ui/primitives/separator/separator";
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./jigsaw/components/ui/overlays/tooltip/tooltip";
