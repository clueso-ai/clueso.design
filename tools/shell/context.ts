import { createContext, useContext } from "react";
import { useStore } from "zustand";
import type { PanelSizes, PanelStore } from "./geometry";

export interface ShellContextValue {
	/** The tool's panel width store (see panelStore). */
	panels: PanelStore;
	/** Whether the shell has a bottom bar, so the left panel stops above it. */
	hasBottom: boolean;
	/** Whether the shell has a right panel, so the bottom bar stops before it. */
	hasRight: boolean;
}

export const ShellContext = createContext<ShellContextValue | null>(null);

export function useShell() {
	const ctx = useContext(ShellContext);
	if (!ctx) throw new Error("Use the shell's panels inside <ToolShell>.");
	return ctx;
}

/** Read the current side panel widths from inside a ToolShell. */
export function usePanelWidths<T>(selector: (s: PanelSizes) => T) {
	return useStore(useShell().panels, selector);
}
