# Jigsaw (vendored)

Copied from the gigauser monorepo at commit `5c57362c19` (2026-07-07):

- `foundations/`, `lib/utils.ts`, `components/ui/**` from `packages/jigsaw` (only the components Brand Lab uses and what they import)
- `icons/icons.ts` and the SVGs it references from `packages/clueso-icons`, plus the UI glyphs listed in `src/ui/ci.ts` (Brand Lab uses clueso-icons only; lucide is no longer used in the UI)

Keep these files verbatim so a re-sync is a straight copy. Brand Lab specifics live in `src/ui/`,
`src/jigsaw/index.css` (entry) and `src/components/` (Brand Lab compositions on top of jigsaw).

To re-sync: copy the same paths again from `repos/gigauser`, then run `pnpm typecheck`.

## Local patches (re-apply after a sync)

- React 19 types: `as React.ReactElement` casts read `.props`, which is `unknown` in React 19's types;
  they are cast to `React.ReactElement<any>` (`grep -rn "ReactElement<any>" src/jigsaw`).
- React 19 refs: `useRef<HTMLDivElement>(null)` is `RefObject<HTMLDivElement | null>`, so the colour
  picker's `triggerRef` / `stopPickerRef` prop types are widened to match.
- After a sync, copy any clueso-icons SVG the vendored files import (`grep -rhoE '@icons/icons/[^"]+\.svg' src`);
  TypeScript can't catch a missing one, `pnpm build` can.

Note: `components/ui/color/` is vendored whole. Brand Lab uses its primitives (SaturationPanel, HueSlider,
ColorSwatch, ColorBox) in `src/components/color.tsx`; jigsaw's GradientColorPicker portals a fixed panel
below modal z-index and outside Radix's focus scope, so it isn't used directly inside sheets.
- Title weight (clueso.design): every `title-*` utility in `foundations/typography.css` uses weight 400
  (Nohemi Regular) instead of 500, per the design team's type decision (Nov 2026).
