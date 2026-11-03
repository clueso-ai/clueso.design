import { panelStore } from "@/tools/shell/geometry";

// clueso.design: the chrome geometry moved to tools/shell so other tools can share it. Brand Lab's
// panel widths stay under the same key ("clueso-brand-lab:panels").
export { BAR, GAP, insets, M, PANEL_LIMITS, PANEL_TOP, timelineRight, WIDE } from "@/tools/shell/geometry";

export const usePanels = panelStore("brand-lab");
