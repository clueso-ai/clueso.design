# Architecture

Last updated 1 November 2026. This records how clueso.design is built today and the decisions behind it. The product brief is the source of intent; where this file differs from the brief, this file records the decision that changed it.

## Release 1 scope

- Public site, no sign-in: `/`, `/tools`, `/tools/brand-lab`.
- `/lab`, `/systems`, `/people` and `/journal` come later, once there is sign-in or honest public content for them.
- No backend yet. Brand Lab saves in the browser (localStorage and IndexedDB) and to `.brandlab.json` files, as it always has.
- Usage is measured with Vercel Analytics, which uses no cookies.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16.4 (App Router, Turbopack), React 19.3 |
| Language | TypeScript 6.0. TS 7 is not used yet because typescript-eslint doesn't support it. |
| Styling | Tailwind 4.3, themed in CSS. No Sass. |
| Components | Jigsaw snapshot through `lib/design-system` (see below) |
| State | zustand (Brand Lab) |
| Icons | Clueso icons, imported as React components with SVGR (`?react`) |
| Hosting | Vercel. `main` is production, `staging` gets its own address. |
| Package manager | pnpm, exact versions |

## Routes and layouts

```
app/layout.tsx             root: fonts, theme script, analytics. No chrome.
app/(site)/layout.tsx      site header and footer
app/(site)/page.tsx        /
app/(site)/tools/page.tsx  /tools
app/(tool)/tools/brand-lab /tools/brand-lab, full screen, client-only
```

Tool pages get the full viewport and no site nav. Brand Lab's mark and name in its toolbar link back to `/`, using a full page load so nothing Brand Lab set on the page outlives it.

## Design system: the Jigsaw adapter

Brand Lab was built on a copy of Jigsaw, not stock shadcn. To keep Brand Lab pixel-identical, the adapter's temporary foundation is that copy.

- `lib/design-system/jigsaw/` is a pinned snapshot of `gigauser/packages/jigsaw` at commit `5c57362c19` (see its `SYNC.md`). It is the one exception to "never copy Jigsaw". Delete it when `@clueso-ai/jigsaw` is published.
- `lib/design-system/index.ts` and `icons.ts` are the only public entry points. Pages and tools import from there.
- Don't sync the snapshot forward. Jigsaw on GitHub is 40 commits ahead. Moving to them changes Brand Lab and isn't worth it before publishing.
- shadcn variables are aliased in `styles/shadcn-map.css` so the shadcn CLI can fill gaps into `components/ui`.

## Tokens

Three tiers:

1. **Definition.** Raw palettes from the Jigsaw snapshot (`--grey-*`, `--pink-*`, ...).
2. **Semantic.** Token architecture v1 names in `styles/tokens.css`. Frozen.
3. **Contextual.** Per-component overrides.

v1 is canonical and is the direction Jigsaw is expected to move. Today every v1 token aliases a Jigsaw semantic token, in one file.

### Token mapping (Jigsaw → v1)

| v1 | Jigsaw today |
| --- | --- |
| `bg/fg/border-neutral-{weak,normal,strong,inverted}` | `bg-{weak,normal,strong,inverted}`, `fg-text-*`, `fg-stroke-*` (no intent word) |
| `bg/fg/border-{brand,positive,negative,warning,accent}-{weak,normal}` | same names |
| `surface-page` | `bg-canvas` |
| `surface-sunken-1/2` | `bg-canvas-inset-1/2` |
| `surface-raised-1/2` | `bg-surface`, `bg-surface-elevated-1` |
| `surface-overlay` | `bg-surface-elevated-2` (Jigsaw has no overlay level) |
| `state-hover/pressed/disabled` | `interaction-*` (already alpha overlays) |
| Type roles Title and Text | Jigsaw has title, para, label, mono. Para and label map to Text with weight set per component. Mono is a family, not a role. |
| `gap-*` | `spacing-*` |

Type: titles are Nohemi at weight 400, including Jigsaw's `title-*` utilities (patched in the snapshot, see its SYNC.md).

Radius: four steps by container size, 2px, 4px, 8px and 12px. Nothing larger. `rounded-full` appears only on small dots, bars and switches, where it never exceeds 12px.

Known gaps:
- v1 elevation should resolve against the parent surface. Today it resolves against the page.
- Only the lab theme is defined. Product and marketing themes come with the published packages.

### Utility names

Site code uses v1 utilities: `bg-neutral-weak`, `text-neutral-strong`, `border-neutral-weak`, `bg-raised-1`, `bg-page`, `p-gap-m`, `gap-gap-s`, `rounded-tiny/small/medium/large` (2, 4, 8, 12px; nothing larger), `type-title-xl…s`, `type-text-l…s`, `font-code`, `max-w-page`, `state-layer`, `focus-ring`.

Tailwind's `max-w-sm…7xl` resolve against Jigsaw's spacing scale (for example `max-w-2xl` becomes 16px), so they are banned in site code. `scripts/check-styles.ts` enforces this and the other style rules.

## Brand Lab port

Brand Lab comes from the standalone Vite app at `../brand-lab`, baseline commit `f3928e2`. Port-only changes:

- Moved from `src/` to `tools/brand-lab/`, with Jigsaw imports pointed at `@/lib/design-system/jigsaw/`.
- `import.meta.env.DEV` became `process.env.NODE_ENV`.
- `app.scss` became plain CSS (`tools/brand-lab/styles/brand-lab.css`). Rules that used to target `html` and `body` (cursor, focus reset, overflow) are scoped with `:root:has(.brand-lab-root)`, so they apply only while Brand Lab is mounted.
- The toolbar mark links home.
- It mounts client-only (`dynamic(..., { ssr: false })`) because its modules read localStorage when they load.
- New React Compiler lint rules are warnings in `tools/brand-lab/**`. They get fixed during harness extraction.

## Tool harness (next)

Decided, not built yet:

- **Settings schema.** Brand Lab's `ParamDef` and `ParamGroup` (`tools/brand-lab/layers/types.ts`) become the harness settings schema as they are. A simple tool is one group.
- **Goes into the harness:** timeline and playback, zoom and pan, undo, command menu, right-click menu, resizable panels, saved-designs library, export.
- **Stays in Brand Lab:** layer model and layers panel (an optional harness panel later), multi-canvas board, selection overlay, variations, style treatments, cursor.
- Pieces are extracted when a second tool needs them, not before. Brand Lab's look and behaviour must not change.

## Backend (later)

On hold until something needs it. When it ships:

- Google sign-in for `@clueso.io` accounts only, checked on the server. Ajinkya is admin.
- Neon Postgres, Drizzle and Vercel Blob through the Vercel integration.
- One Brand Lab project is one saved design. Pasted images move to Blob when saved, because inline images exceed the 1 MB document limit. Designs are visible to the team by default, with a private option.
- Built-in presets stay in code. Only presets people create go to the database.
- Moving local designs: browser storage doesn't cross from `localhost:5190` to clueso.design. The old Brand Lab gets an "Export library" button, and the site imports that file.

## Open items

- The repo stays public, by decision (1 Nov 2026). The Jigsaw snapshot is public with it. The Nohemi web licence is confirmed.

- Vercel project setup. See the checklist in README.
- "Export library" button in the old Brand Lab, then freeze it.
- Social share image made with Brand Lab.
- Clicking the homepage artwork could open Brand Lab with that preset loaded. It needs a small Brand Lab change.
