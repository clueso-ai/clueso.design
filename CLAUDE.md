# CLAUDE.md

This is clueso.design, the Clueso design team's lab. Designers build here with AI.
Read docs/ARCHITECTURE.md before structural changes.

## Branches
- Branch from `staging`. Open PRs into `staging` (`gh pr create --base staging`). `main` is production and only moves through a `staging` → `main` release PR.
- `main` is still the GitHub default branch, so always pass the base explicitly.
- Rulesets protect `main` and `staging`: changes only through a PR, no force-push, no deletion. Branches are deleted after merge.

## Hard rules
- Style with Tailwind classes backed by v1 tokens (styles/tokens.css). Never hardcode colors, spacing, radius or type sizes. No arbitrary values like bg-[#DA5CC7].
- Site code uses v1 utilities only: text-neutral-strong, bg-raised-1, p-gap-m, type-title-l, type-text-m, max-w-page. Jigsaw names (text-strong, bg-canvas, label-*, para-*) are allowed only inside tools/brand-lab, the shared tool shell (tools/shell) and the Jigsaw snapshot. `pnpm check` enforces this.
- Don't use Tailwind's max-w-sm…7xl. They collide with Jigsaw's spacing scale. Use max-w-page, max-w-measure-wide, max-w-measure.
- No Sass, no CSS-in-JS.
- Import components and icons only from lib/design-system. Never import lib/design-system/jigsaw or components/ui directly. Never copy more Jigsaw code here.
- Need a component that isn't there? Add it with the shadcn CLI into components/ui, then export it from lib/design-system.
- Register every item in lib/registry.ts with owner, status, visibility and theme. Anything not yet public is visibility: internal. There is no sign-in yet, so internal items must not have pages.
- No production secrets, customer data or internal APIs.
- Pin dependency versions exactly (.npmrc has save-exact).

## Brand Lab
- tools/brand-lab is tool #001. It started as a port of the standalone Vite app (baseline commit f3928e2 in ../brand-lab). This repo is now its home: improve it here like any other tool, one change per PR, with a changelog entry. The standalone app is no longer the source.
- Keep its look and behaviour as they are unless changing them is the point of the PR. Existing `clueso.design:` comments mark where the port differs from the original; they can go as that code changes.
- Its editor frame (top bar, side panels, resizing, bottom bar) lives in tools/shell so new tools can start from it. Change the shell with every tool that uses it in mind.
- It runs client-only. Page-level CSS for tools (focus reset, cursor, overflow) is scoped with :root:has(.tool-shell) in tools/shell/shell.css; Brand Lab's own is scoped to .brand-lab-root.

## Writing
- Sentence case for titles, headings and labels.
- Short, plain, direct sentences. No em dashes.

## Brand
- Site titles default to Nohemi 350, body to Geist 350 (visitors can retune fonts and the type scale from the hero). Nohemi for the logo and brand moments. Geist for body and controls. Geist Mono for values and code.
- No full stops at the end of titles or headings.
- Brand color #DA5CC7, used sparingly in the lab theme.

## Commands
- `pnpm dev` · `pnpm build` · `pnpm check` (typecheck, lint, registry check, style check)
