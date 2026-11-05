---
name: new-tool
description: Start a new tool or playground experiment on clueso.design, from folder to registry, page, preview still and changelog. Use when the user wants to add a tool, bring in an experiment or prototype, or put something new on the site.
---

# Add a tool or experiment

Read `CONTRIBUTING.md` ("Two ways in") first. It decides which one this is.

- **Playground experiment**: a self-contained idea, any static export, in `public/playground/<slug>/`.
- **Tool**: something the team uses again and again, React in this repo on the shared tool shell,
  in `tools/<slug>/`.

## Tool

1. Build on the shell. `tools/shell/README.md` has the frame, the slots and a minimal example. Look at
   `tools/brand-lab/` for how a full tool uses it: panels, controls, toolbar, store, theme, embed.
2. Reuse what's there: the shell's components (`tools/shell/components/`), `IconButton`, Brand Lab's
   controls and patterns. Change the shell only with every tool that uses it in mind, and check them.
3. Mount it client-only and add its page: `app/(tool)/tools/<slug>/` (README, "Add the page").
4. Make the homepage embed work (`/tools/<slug>?embed`, `lib/tool-embed.ts`): it keeps nothing and
   takes its theme from the homepage.
5. Keep visitors' data: if it saves to `localStorage`, pick keys once and never rename them.
6. Add a still at about 1200×900 to `public/previews/<slug>.jpg`.

## Experiment

Follow `CONTRIBUTING.md`, "Add a playground experiment". Its own colours and fonts are fine inside
`public/`. Mark any edit to the export with a `clueso.design:` comment.

## Both

- Register it in `lib/registry.ts`: owner, status, visibility, theme, description, tags, updated.
  Something not ready for everyone stays on its branch: there's no sign-in, so an internal item
  can't have a page.
- Add a changelog entry (`changelog` skill).
- Update `docs/ARCHITECTURE.md` if it changes how the site is built.
- Ship it with the `ship` skill.
