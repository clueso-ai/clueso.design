# Jigsaw (vendored)

Copied from the gigauser monorepo at commit `5c57362c19` (2026-07-07):

- `foundations/`, `lib/utils.ts`, `components/ui/**` from `packages/jigsaw` (only the components Brand Lab uses and what they import)
- `components/domain/video/{playhead,clip,gif-timeline}`, for the playground's timelines and players (Nov 2026, the one exception to "never copy more Jigsaw code")
- `icons/icons.ts` and the SVGs it references from `packages/clueso-icons`, plus the UI glyphs listed in `src/ui/ci.ts` (Brand Lab uses clueso-icons only; lucide is no longer used in the UI)

Keep these files verbatim so a re-sync is a straight copy. Brand Lab specifics live in `src/ui/`,
`src/jigsaw/index.css` (entry) and `src/components/` (Brand Lab compositions on top of jigsaw).

To re-sync: copy the same paths again from `repos/gigauser`, then run `pnpm typecheck`.

## Local patches (re-apply after a sync)

- React 19 types: `as React.ReactElement` casts read `.props`, which is `unknown` in React 19's types;
  they are cast to `React.ReactElement<any>` (`grep -rn "ReactElement<any>" src/jigsaw`).
- React 19 refs: `useRef<HTMLDivElement>(null)` is `RefObject<HTMLDivElement | null>`, so the colour
  picker's `triggerRef` / `stopPickerRef` prop types are widened to match.
  The same for `gif-timeline-scrollbar.tsx`'s `scrollContainerRef`, `contentContainerRef` and `playheadRef`.
- Video timeline (Nov 2026, for the playground; all additive, the product's props behave as before; worth sending upstream):
  - `gif-timeline.tsx`: optional `clipName` (default "GIF") names the single clip. Optional `clips`
    (`GifTimelineClip[]`: id, name, start, end, frames, category?, subType?, frameWidth?) renders several
    clips side by side, each across its time range with its own label, colour, icon and frames, with a 1 px
    seam between them. The single clip goes through the same path (id "gif", 0 to duration).
  - `gif-timeline.tsx`: the transport bar is its own export, `GifTimelineTransport` (currentTime, duration,
    paused, onPlayPause, onStepForward, onStepBackward, onGoToStart, onGoToEnd, disabled?, className?).
    GifTimeline renders it unchanged.
  - `gif-timeline.tsx`: every icon-only transport button has an `aria-label` (Go to start, Previous frame,
    Play/Pause, Next frame, Go to end) and a visible `focus-visible` outline (`outline-interaction-focused`).
  - `gif-timeline.tsx`: the shortcuts the tooltips promise work while focus is inside the timeline or the
    transport, never globally: ← / → step, Space plays or pauses (a focused button keeps its own Space).
    The track is focusable (`role="group"`, `aria-label="Timeline"`) for this. Handled keys stop propagating.
  - `gif-timeline.tsx`: optional `maxZoom` (default `GIF_TIMELINE_MAX_ZOOM`, 100) caps pinch and scrollbar
    zoom. `getTimeStampGap` (zoom to pixels a second) and its inverse `getZoomFromTimeStampGap(gap, maxZoom?)`
    are exported. `gif-timeline-scrollbar.tsx` takes the same optional `maxZoom`.
  - `gif-range-selector.tsx`: hooks moved above `if (width <= 0) return null;` (Rules of Hooks).
  - `clip.tsx`: frame thumbnails are keyed by index, not src, so identical stills don't collide.
- After a sync, copy any clueso-icons SVG the vendored files import (`grep -rhoE '@icons/icons/[^"]+\.svg' src`);
  TypeScript can't catch a missing one, `pnpm build` can.

Note: `components/ui/color/` is vendored whole. Brand Lab uses its primitives (SaturationPanel, HueSlider,
ColorSwatch, ColorBox) in `src/components/color.tsx`; jigsaw's GradientColorPicker portals a fixed panel
below modal z-index and outside Radix's focus scope, so it isn't used directly inside sheets.
- Title weight (clueso.design): every `title-*` utility in `foundations/typography.css` uses weight 300
  (Nohemi Light) instead of 500, per the design team's type decision (Nov 2026).
