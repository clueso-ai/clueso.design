# Tool shell

The editor frame Brand Lab and Icon Lab are built on, ready for a new tool. Start here when your tool needs a
canvas with panels around it.

## What you get

- A full-window canvas, with the chrome floating over it.
- A top bar: the Clueso mark and your tool's name on the left (they link back to `/` with a full page
  load), your own controls after them, and a group on the right.
- A left and a right panel. Visitors drag their inner edges to resize them and double-click to
  reset. Each has a toggle in the top bar to collapse it, and ⌘\ hides or shows both. Widths and
  open state are saved in localStorage under `clueso-<id>:panels`. Both hide below 1100px wide. Use
  `shownWidth(state, side)` (0 while collapsed) when framing the canvas in the free space.
- A bottom bar, like Brand Lab's timeline. It stops at the right panel. Pass `bottomHeight` for a taller one (Icon Lab's is 64px).
- A toast, the Clueso cursor, Jigsaw's focus reset and the light and dark themes.

The shell doesn't handle keys, undo, saving or the canvas itself. Those belong to your tool.

## The pieces

| Import from `@/tools/shell` | What it is |
| --- | --- |
| `ToolShell` | The frame. Props: `id`, `name`, `theme`, `children` (the canvas), `toolbarStart`, `toolbarCenter` (a centred bar, for drawing tools), `toolbarEnd`, `toolbarLabels`, `left`, `right`, `bottom`, `bottomHeight` (40 by default), `resizeLabels`, `overlays`, `toast`, `cursor` |
| `LeftPanel`, `RightPanel`, `BottomBar` | Panels already in their place. Put them in the `left`, `right` and `bottom` slots |
| `Panel`, `PanelHeader`, `Section` | The panel surface, a titled header and a group of controls |
| `IconButton`, `ICON_NORMAL`, `ToolbarDivider` | An icon button with a tooltip, the neutral icon colour, a rule between top bar groups |
| `Segmented`, `Row`, `Field` | A segmented control, a label and control on one line, and a text field, as in Brand Lab's and Icon Lab's panels |
| `Popover`, `PopoverTrigger`, `PopoverContent`, `MenuItem`, `MenuLabel`, `MenuSeparator` | A popover in Jigsaw's surface, with menu rows |
| `Toast`, `CustomCursor`, `ResizeHandle` | Used by `ToolShell`. You rarely need them on their own |
| `usePanelWidths`, `panelStore`, `insets`, `M`, `GAP`, `BAR`, `PANEL_TOP`, `WIDE` | Panel widths and the chrome's measurements, to frame your canvas in the free space |

Tools may use Jigsaw class names (`text-strong`, `bg-canvas`, `label-*`) inside `tools/`, like
Brand Lab does. Import components from the same paths the shell uses.

## A minimal tool

`tools/shell/example.tsx` is a complete example. In short:

```tsx
import { useState } from "react";
import { LeftPanel, PanelHeader, ToolShell } from "@/tools/shell";

export function App() {
	const [toast, setToast] = useState<string | null>(null);
	return (
		<ToolShell
			id="my-tool"
			name="My tool"
			theme="light"
			left={
				<LeftPanel aria-label="Layers">
					<PanelHeader title="Layers" />
				</LeftPanel>
			}
			toast={toast}
		>
			<div className="absolute inset-0 grid place-items-center">Your canvas</div>
		</ToolShell>
	);
}
```

Leave out a slot and it isn't drawn. Without a bottom bar, the left panel runs to the bottom.

## Add the page

1. Put your code in `tools/<slug>/`, with an `App.tsx` like the one above. Use your slug as `id`.
2. Add `app/(tool)/tools/<slug>/page.tsx` and a mount file. Tools read `window` and `localStorage`,
   so mount them client-only, the way Brand Lab does:

   ```tsx
   // app/(tool)/tools/<slug>/<slug>-mount.tsx
   "use client";

   import dynamic from "next/dynamic";
   import { useEffect } from "react";
   import { applySiteTheme } from "@/lib/theme";

   const Tool = dynamic(() => import("@/tools/<slug>/App").then((m) => m.App), { ssr: false });

   export function ToolMount() {
   	// The tool drives the page theme while it is open. Hand it back to the site on the way out.
   	useEffect(() => () => applySiteTheme(), []);
   	return <Tool />;
   }
   ```

   ```tsx
   // app/(tool)/tools/<slug>/page.tsx
   import type { Metadata } from "next";
   import { getItem } from "@/lib/registry";
   import { ToolMount } from "./<slug>-mount";

   const item = getItem("<slug>")!;

   export const metadata: Metadata = { title: item.title, description: item.description };

   export default function ToolPage() {
   	return <ToolMount />;
   }
   ```

   Files in `app/` follow the site's style rules: v1 utilities only, no Jigsaw class names.
3. Add the tool to `lib/registry.ts` with `type: "tool"` and `status: "beta"`. A tool with a page
   must be `visibility: "public"`.
4. Add a changelog entry to the top of `lib/changelog.ts`.
5. Run `pnpm check` and `pnpm build`, then open a pull request into `staging`.

`CONTRIBUTING.md` has the registry entry, the changelog format and the release steps in full.
