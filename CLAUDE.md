# CLAUDE.md

This is clueso.design, the Clueso design team's lab. Designers build here with AI.
Read docs/ARCHITECTURE.md before structural changes.

## Who sees this
clueso.design is public. Other design teams, the rest of Clueso and candidates read it as the benchmark for Clueso design. Treat every change as a product release, not a prototype.
- Finish what you ship. No half-built states, placeholder copy or debug UI on staging or main.
- Look at your change in a browser before you call it done: every state you touched, light and dark, keyboard, and phone width for site pages. A passing build is not a tested feature.
- Say plainly what you verified and what you didn't. Never imply a check you didn't run.
- Keep each tool's look and behaviour unless changing them is the point of the work. Fix what you were asked to; mention other problems instead of fixing them unasked.
- When unsure about a design decision that a visitor will see, ask before shipping it.

## Every change that ships
Use the `ship` skill. In short:
1. One change per PR, on a branch from `staging`.
2. A changelog entry at the top of lib/changelog.ts, in the same PR. Every feature, fix or bit of polish a visitor can see gets one, however small. Use the `changelog` skill. Only a change no visitor can see (CI, docs, agent rules) skips it, with the `no-changelog` PR label. CI blocks PRs into `staging` without an entry.
3. `pnpm check` (0 errors, no new warnings) and `pnpm build`.
4. The browser pass above, and the `design-review` skill for anything visual.
5. A PR into `staging` using the PR template, with screenshots for visual changes and a "Not verified" list.
Production only moves through a `staging` → `main` release PR (`release` skill).

## Skills
Repo skills live in .claude/skills. Use them:
- `ship`: from working copy to a PR into staging.
- `changelog`: write the entry, in the site's voice.
- `design-review`: check a UI change against the design bar before it ships.
- `release`: staging → main.
- `new-tool`: add a tool or playground experiment.

## Branches
- Branch from `staging`. Open PRs into `staging` (`gh pr create --base staging`). `main` is production and only moves through a `staging` → `main` release PR.
- `main` is still the GitHub default branch, so always pass the base explicitly.
- Rulesets protect `main` and `staging`: changes only through a PR, no force-push, no deletion. Branches are deleted after merge.

## Hard rules
- Style with Tailwind classes backed by v1 tokens (styles/tokens.css). Never hardcode colors, spacing, radius or type sizes. No arbitrary values like bg-[#DA5CC7].
- Site code uses v1 utilities only: text-neutral-strong, bg-raised-1, p-gap-m, type-title-l, type-text-m, max-w-page. Jigsaw names (text-strong, bg-canvas, label-*, para-*) are allowed only inside tools/ (each tool and the shared tool shell) and the Jigsaw snapshot. `pnpm check` enforces this.
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

## Changelog
- Every PR that ships gets an entry at the top of lib/changelog.ts, however small the change. Add it in the same PR. If you release a feature, it is in the changelog. No exceptions for "small".
- Write what the change means for people using the site, in plain words. No "Fix:" or "Feature:" labels. See CONTRIBUTING.md and the `changelog` skill.
- `pnpm check` runs scripts/check-changelog.ts: newest first, real dates, `by` from lib/team.ts, no full stop on titles, no em dashes.

## Writing
- Sentence case for titles, headings and labels.
- Short, plain, direct sentences. No em dashes.

## Brand
- Site titles default to Nohemi 350, body to Geist 350 (visitors can retune fonts and the type scale from the hero). Nohemi for the logo and brand moments. Geist for body and controls. Geist Mono for values and code.
- No full stops at the end of titles or headings.
- Brand color #DA5CC7, used sparingly in the lab theme.

## Commands
- `pnpm dev` · `pnpm build` · `pnpm check` (typecheck, lint, registry, style and changelog checks)
