# Brand Lab presets

Each `.brandlab.json` file here is a preset in Library → Presets, for everyone who uses Brand Lab.
(The older presets are written in code in `../state/presets.ts`. New ones go here.)

## Add a preset

1. Make the design in Brand Lab, on one canvas. Name the canvas: that's the preset's name.
2. Project menu → **Share as preset**. A `<name>.brandlab.json` file downloads.
3. Put it in this folder. Rename it if you like: lowercase words and hyphens.
4. List it in `index.ts`: one `import` line and one entry in `FILE_PRESETS`.
5. Check `"group"` in the file: `Posters`, `Illustrations` or `Patterns`. It decides the section.
6. Add a changelog entry and open a PR into `staging` (the `ship` skill covers the rest).

`pnpm check` fails if a file isn't listed in `index.ts` or isn't a valid preset.

## Remove a preset

Delete its file and its two lines in `index.ts`. For a preset in `../state/presets.ts`, delete its
entry there. If the homepage shows it (`EMBED_POSTERS` in `app/(tool)/tools/brand-lab/brand-lab-client.tsx`),
pick another there too.
