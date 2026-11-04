# Architecture

Last updated 4 November 2026. This records how clueso.design is built today and the decisions behind it. The product brief is the source of intent; where this file differs from the brief, this file records the decision that changed it.

## Release 1 scope

- Public site, no sign-in: `/`, `/tools`, `/tools/brand-lab`, `/tools/icon-lab`, `/playground/cluego`.
- The homepage has sections for Tools (with Brand Lab embedded live), Playground, Team and the changelog, and the nav links to them. Each becomes its own page once there is enough to fill it. Systems (Jigsaw) comes back when there is something to show.
- No backend yet. Brand Lab saves in the browser (localStorage and IndexedDB) and to `.brandlab.json` files, as it always has.
- No usage analytics yet. Vercel Analytics was removed when hosting moved to AWS.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16.4 (App Router, Turbopack), React 19.3 |
| Language | TypeScript 6.0. TS 7 is not used yet because typescript-eslint doesn't support it. |
| Styling | Tailwind 4.3, themed in CSS. No Sass. |
| Components | Jigsaw snapshot through `lib/design-system` (see below) |
| State | zustand (Brand Lab, Icon Lab) |
| Icons | Clueso icons, imported as React components with SVGR (`?react`) |
| Hosting | AWS: ECS Fargate behind CloudFront, deployed by GitHub Actions. `main` is production. `staging` doesn't deploy yet. See README. |
| Package manager | pnpm, exact versions |

## Routes and layouts

```
app/layout.tsx             root: fonts, theme script, analytics. No chrome.
app/(site)/layout.tsx      site header and footer
app/(site)/page.tsx        /
app/(site)/tools/page.tsx  /tools
app/(site)/changelog       /changelog, from lib/changelog.ts
app/(tool)/tools/brand-lab /tools/brand-lab, full screen, client-only
app/(tool)/tools/icon-lab  /tools/icon-lab, full screen, client-only (mounts tools/icon-lab)
```

Playground pieces are static exports, not React. Each lives in `public/playground/<slug>/` with its files unchanged, and `next.config.ts` rewrites `/playground/<slug>` to its `index.html`. Port-only edits are marked with a `clueso.design:` comment. Cluego (Preshita) came from a claude.ai artifact this way. Its page needs a `<base>` tag because the URL has no trailing slash. Its own colours and fonts stay as made, so the token rules don't apply inside `public/`.

Tool pages get the full viewport and no site nav. Brand Lab's mark and name in its toolbar link back to `/`, using a full page load so nothing Brand Lab set on the page outlives it.

## Site features

- **Make it yours.** The homepage hero asks for a name and favourite colour for the visitor's cursor. The Customize website button (bottom right) lets visitors pick the title and text fonts (Nohemi, Geist, Geist Mono, Geist Pixel, Geist Serif), their weights, a type scale (base size and ratio, which override `--type-base` and `--type-ratio`; every size token is computed from them), and a Clueso cursor colour (palette, OKLCH picker or shuffle), name and tilt. Shuffle changes the whole look at once. Font swaps cross-fade with a view transition; weights and sizes animate with CSS. The cursor colour is also the text highlight colour, with ink picked from its OKLCH lightness. Saved in localStorage (`lib/site-prefs.ts` for the data, `lib/site-prefs-store.ts` for the store) and applied by `components/site/site-prefs-root.tsx` to site pages only. Tool pages ignore it. The logo is always Nohemi. The hero's petals are always the team's pink, whatever cursor colour a visitor picks, so the hero stays on brand.
- **The cursor.** `.site-cursor` hides the native pointer inside its scope (`styles/site.css`) and `site-cursor.tsx` draws the piece. The hero asks whether to use the Clueso cursor or the visitor's own (`cluesoCursor`, on by default). On makes the whole site one scope. Near the right edge the name tag moves to the left of the piece.
- **Type guides.** `hero-title.tsx` draws cap height, x-height and baseline across the hero, measured from the live font.
- **Type inspector.** Select text on a site page and a small toolbar floats above it: Copy text, and Inspect. Inspect opens a specimen card: family and weight set in the face, then size, line height and tracking, read from the computed styles (`type-inspector.tsx`). Mouse and pen only; fields and the Customize panel are skipped.
- **Team.** Each card's cursor leans towards yours and high-fives it (`team-card.tsx`).
- **Footer logo.** The Clueso logo as editable paths (`footer-logo.tsx`, `lib/path-edit.ts`, `lib/clueso-logo.ts`).
- **Guide lines.** `components/site/frame.tsx`: each band has a full-width rule, a framed content column, hatched gutters and crosses where rules meet. Illustrations (`illustration.tsx`) are the Clueso mark in Brand Lab treatments: halftone, line screen, LED pixels, construction grid, assembly. The hatch runs at the logo's 135° diagonal.
- **Team data.** `lib/team.ts`. Photos go in `public/team/<slug>.jpg` at 4:5.
- **Changelog.** Every change that ships gets an entry in `lib/changelog.ts`, however small, written as what it means for visitors (CONTRIBUTING.md).
- The theme toggle switches light and dark in one frame, with no animation (`applySiteTheme` in `lib/theme.ts`).
- Featured tools run live on the homepage at `/tools/<slug>?embed` (`lib/tool-embed.ts`). An embed keeps nothing and takes its theme from the homepage, the opposite of the page's. Brand Lab opens on posters and never reads or writes the visitor's autosave (`EMBED` in its store). Icon Lab keeps its edits, options and theme in memory instead of `localStorage` (`EMBED` in `tools/icon-lab/state/storage.ts`), so they stay in the frame.
- **Footer hearts.** How many people like the site, live (`footer-hearts.tsx`). Each browser hearts it once and can take it back; pressing slides a +1 or −1 in after the count, then the digits roll to the new number. `/api/hearts` saves the change and broadcasts the new total, with a version so late updates are ignored, over the presence stream (`lib/presence-server.ts`). The total and one item per browser (hashed id, hearted, cursor name, page, times) live in Upstash Redis, reached with `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (GitHub secrets the deploy passes in; `lib/hearts-store.ts`). Without them, dev keeps them in memory and a restart starts from zero.
- Say hi (`components/site/say-hi.tsx`) is parked: built but not on any page yet. It posts to `/api/hello`, which forwards to a Slack incoming webhook in `HELLO_WEBHOOK_URL`. Without it, production answers 503 and dev logs to the console.
- Geist Pixel and Geist Serif are OFL (`public/fonts/GEIST-OFL.txt`).

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

Type: site titles default to Nohemi 350 and body to Geist 350, and visitors can change them. The logo is always Nohemi 400. Brand Lab keeps Nohemi 300 titles through Jigsaw's `title-*` utilities (patched in the snapshot, see its SYNC.md).

Radius: four steps by container size, 2px, 4px, 8px and 12px. Nothing larger. `rounded-full` appears only on small dots, bars and switches, where it never exceeds 12px.

Known gaps:
- v1 elevation should resolve against the parent surface. Today it resolves against the page.
- Only the lab theme is defined. Product and marketing themes come with the published packages.

### Utility names

Site code uses v1 utilities: `bg-neutral-weak`, `text-neutral-strong`, `border-neutral-weak`, `bg-raised-1`, `bg-page`, `p-gap-m`, `gap-gap-s`, `rounded-tiny/small/medium/large` (2, 4, 8, 12px; nothing larger), `type-title-xl…s`, `type-text-l…s`, `font-code`, `max-w-page`, `state-layer`, `focus-ring`.

Tailwind's `max-w-sm…7xl` resolve against Jigsaw's spacing scale (for example `max-w-2xl` becomes 16px), so they are banned in site code. `scripts/check-styles.ts` enforces this and the other style rules.

## Brand Lab

Brand Lab started as a port of the standalone Vite app at `../brand-lab`, baseline commit `f3928e2`. This repo is now its home: it's improved here like any other tool, and the standalone app is no longer the source. Changes made while porting:

- Moved from `src/` to `tools/brand-lab/`, with Jigsaw imports pointed at `@/lib/design-system/jigsaw/`.
- `import.meta.env.DEV` became `process.env.NODE_ENV`.
- `app.scss` became plain CSS (`tools/brand-lab/styles/brand-lab.css`). Rules that used to target `html` and `body` (cursor, focus reset, overflow) now live in the tool shell (`tools/shell/shell.css`), scoped with `:root:has(.tool-shell)`, so they apply only while a tool is mounted.
- The toolbar mark links home.
- It mounts client-only (`dynamic(..., { ssr: false })`) because its modules read localStorage when they load.
- New React Compiler lint rules are warnings in `tools/brand-lab/**`. They get fixed during harness extraction.

## Icon Lab

Icon Lab (tool #002, Sneha) started as a standalone plain-JavaScript app, first shown here by loading its files from `public/tools/icon-lab`. It was ported onto the tool shell on 4 November 2026, and this repo is now its home: it's improved here like any other tool, and the standalone app and its sync script are no longer the source.

- `tools/icon-lab/engine/` is the drawing engine (`engine.ts`), composing icons from the set's parts (`compose.ts`) and matching drawings (`sketch.ts`). Ported line for line; a script compared every icon, option and setting against the old engine and the SVG output is identical.
- `tools/icon-lab/data/` holds the sets as data modules. The large generated ones (the Material Symbols set, the original icons, the library, the clueso.io captures) are parsed from a string, which keeps them out of the type checker. The captures' images stay in `public/tools/icon-lab/references/`.
- `tools/icon-lab/state/` builds the sets the UI shows and holds a zustand store. Icons are mutable objects, as in the original: actions change them in place and bump a revision so React redraws.
- It keeps the original's `localStorage` keys (`iconTool.edits`, `iconTool.variants`, `iconTool.generated`, `iconTool.requests`, `iconTool.apiKey`) and shares the site's theme key, so visitors keep their work.
- Changes made while porting: the size ramp moved into the bottom bar beside the prompt (the shell's `bottomHeight` makes the bar 64px so 48px fits). The In context dialog (URL, screenshot, sizes) opens from the Context view; it had no button left in the old app. Drawing icons with Claude stays parked as it was: its generator never shipped, so the Connect Claude button is hidden and the key dialog is kept for later.
- `Segmented`, `Row`, `Field` and the popover menu moved from Brand Lab into `tools/shell/components/` so both tools use them. Brand Lab re-exports them from their old paths, unchanged.

## Tool shell

Built: `tools/shell/` holds the editor frame Brand Lab and Icon Lab run in, so a new tool can start from it. `ToolShell` gives a full-window canvas, the top bar with the mark and the tool's name (linking home), resizable side panels with widths saved per tool, a bottom bar, a toast and the Clueso cursor. The tool fills the slots. `tools/shell/README.md` shows how to start a tool. Brand Lab's look and behaviour didn't change when it moved onto the shell.

Still to come, as decided:

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

- "Export library" button in the old Brand Lab, then freeze it.
- Social share image made with Brand Lab.
