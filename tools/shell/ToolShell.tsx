import type * as React from "react";
import { useEffect, useMemo } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/lib/design-system/jigsaw/components/ui/overlays/tooltip/tooltip";
import { cn } from "@/lib/design-system/jigsaw/lib/utils";
import CluesoIcon from "@icons/icons/Brands/Clueso-icon.svg?react";
import SidebarIcon from "@icons/icons/Technical Concepts/Sidebar.svg?react";
import { useStore } from "zustand";
import { IconButton } from "./components/icon-button";
import { CustomCursor } from "./components/cursor";
import { Panel } from "./components/panel";
import { Toast } from "./components/toast";
import { ShellContext } from "./context";
import { BAR, M, panelStore } from "./geometry";
import { ToolbarDivider } from "./panels";
import { ResizeHandle } from "./ResizeHandle";

export interface ToolShellProps {
	/** The tool's slug, e.g. "brand-lab". Names the saved panel widths ("clueso-<id>:panels") and adds a "<id>-root" class for page CSS. */
	id: string;
	/** The tool's name, shown beside the mark in the top bar. */
	name: string;
	/** Light or dark interface. Sets the "dark" class on <html>, so portalled menus follow it too. Leave it out to not touch the theme. */
	theme?: "light" | "dark";
	/** The canvas. Fills the window, under the chrome. */
	children?: React.ReactNode;
	/** Controls after the mark and name, top left. */
	toolbarStart?: React.ReactNode;
	/** Controls top right. */
	toolbarEnd?: React.ReactNode;
	/** Tools centred at the top, in their own bar (drawing tools, like Figma's). */
	toolbarCenter?: React.ReactNode;
	/** Accessible names for the two top bar groups. */
	toolbarLabels?: { start?: string; end?: string };
	/** The left panel. Use <LeftPanel>. Gets a resize handle. */
	left?: React.ReactNode;
	/** The right panel. Use <RightPanel>. Gets a resize handle. */
	right?: React.ReactNode;
	/** Along the bottom. Use <BottomBar>. */
	bottom?: React.ReactNode;
	/** The bottom bar's height. BAR (40) by default; the left panel stops above it. */
	bottomHeight?: number;
	/** Accessible names for the two resize handles. */
	resizeLabels?: { left?: string; right?: string };
	/** Sheets, menus and anything else above the chrome. */
	overlays?: React.ReactNode;
	/** A short status note. Render it while it has text, null otherwise. */
	toast?: React.ReactNode;
	/** The Clueso cursor. On by default. */
	cursor?: boolean;
}

/**
 * The editor frame every tool shares: a full-window canvas, the top bar with the mark and the tool's
 * name, resizable side panels, a bottom bar, a toast and the Clueso cursor. The tool fills the slots.
 */
export function ToolShell({ id, name, theme, children, toolbarStart, toolbarEnd, toolbarCenter, toolbarLabels, left, right, bottom, bottomHeight = BAR, resizeLabels, overlays, toast, cursor = true }: ToolShellProps) {
	const panels = panelStore(id);
	const hasBottom = !!bottom;
	const hasRight = !!right;
	const ctx = useMemo(() => ({ panels, hasBottom, hasRight, bottomHeight }), [panels, hasBottom, hasRight, bottomHeight]);

	const leftOpen = useStore(panels, (s) => s.leftOpen);
	const rightOpen = useStore(panels, (s) => s.rightOpen);
	const mod = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl";

	// ⌘\ hides both side panels for a clear view of the canvas, and brings them back. Like Figma's.
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
				e.preventDefault();
				panels.getState().toggleAll();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [panels]);

	// jigsaw themes with a .dark class; on <html> so portalled menus and modals pick it up too.
	useEffect(() => {
		if (theme) document.documentElement.classList.toggle("dark", theme === "dark");
	}, [theme]);

	return (
		<ShellContext.Provider value={ctx}>
			<div className={cn("tool-shell", `${id}-root`, "font-body fixed inset-0 overflow-hidden bg-canvas text-strong select-none")}>
				{children}
				<Panel className="flex-row items-center gap-2xs overflow-visible px-xs" style={{ top: M, left: M, height: BAR }} role="toolbar" aria-label={toolbarLabels?.start ?? name}>
					{/* The mark and name link back to the site home. A full page load on purpose, so nothing the
					    tool set on the page (theme, cursor, listeners) outlives it. */}
					<Tooltip>
						<TooltipTrigger asChild>
							{/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
							<a href="/" aria-label={`${name}. Back to clueso.design`} className="flex shrink-0 items-center gap-sm rounded-xs px-sm">
								<CluesoIcon className="size-[18px] text-strong [&_path]:[stroke-width:0.75]" aria-hidden />
								<span className="label-small-strong font-body whitespace-nowrap text-strong">{name}</span>
							</a>
						</TooltipTrigger>
						<TooltipContent>Back to clueso.design</TooltipContent>
					</Tooltip>
					{left && (
						<IconButton
							label={leftOpen ? "Hide left panel" : "Show left panel"}
							shortcut={[mod, "\\"]}
							active={!leftOpen}
							icon={<SidebarIcon />}
							onClick={() => panels.getState().toggle("left")}
							className="max-[1099px]:hidden"
						/>
					)}
					{toolbarStart && (
						<>
							<ToolbarDivider />
							{toolbarStart}
						</>
					)}
				</Panel>
				{toolbarCenter && (
					<Panel className="left-1/2 -translate-x-1/2 flex-row items-center gap-2xs overflow-visible px-xs" style={{ top: M, height: BAR }} role="toolbar" aria-label="Tools">
						{toolbarCenter}
					</Panel>
				)}
				{toolbarEnd && (
					<div className="absolute flex items-center gap-xs" style={{ top: M, right: M, height: BAR }} role="toolbar" aria-label={toolbarLabels?.end ?? "Actions"}>
						{toolbarEnd}
						{right && (
							<IconButton
								variant="outlined"
								label={rightOpen ? "Hide right panel" : "Show right panel"}
								shortcut={[mod, "\\"]}
								active={!rightOpen}
								icon={<SidebarIcon className="-scale-x-100" />}
								onClick={() => panels.getState().toggle("right")}
								className="max-[1099px]:hidden"
							/>
						)}
					</div>
				)}
				{left}
				{right}
				{bottom}
				{left && leftOpen && <ResizeHandle side="left" label={resizeLabels?.left ?? "Resize left panel"} />}
				{right && rightOpen && <ResizeHandle side="right" label={resizeLabels?.right ?? "Resize right panel"} />}
				{overlays}
				{cursor && <CustomCursor />}
				{toast && <Toast>{toast}</Toast>}
			</div>
		</ShellContext.Provider>
	);
}
