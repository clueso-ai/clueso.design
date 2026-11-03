# Contributing

clueso.design is one repo for everything the design team makes. Each tool and each experiment is
its own folder, and one list (`lib/registry.ts`) puts them on the site. You don't need a new repo
for a new idea: you need a folder and a pull request.

Read `CLAUDE.md` for the hard rules and `docs/ARCHITECTURE.md` for how the site is built.

## Set up

1. Clone `clueso-ai/clueso.design`.
2. `pnpm install`, then `pnpm dev`. The site runs at http://localhost:3000.
3. Branch from `staging`: `git switch -c <your-name>/<what-you-are-making> origin/staging`.

You need Node and pnpm. The exact pnpm version is pinned in `package.json`.

## Two ways in

| | Playground experiment | Tool |
| --- | --- | --- |
| For | A quick, self-contained idea to try out | Something the team will use again and again |
| Built with | Anything that exports static files: a claude.ai artifact, Vite, plain HTML | React, inside this repo, with the site's design system |
| Lives in | `public/playground/<slug>/` | `tools/<slug>/` and `app/(tool)/tools/<slug>/` |
| URL | `/playground/<slug>` | `/tools/<slug>` |
| Rules | Its own colours and fonts are fine | The token and component rules in `CLAUDE.md` apply |

Start in the playground. Move an idea to tools once it has earned a regular place.

## Add a playground experiment

1. Build it anywhere. Export it as static files with an `index.html` at the top.
2. Copy the export into `public/playground/<slug>/` as it is. The site already serves any folder
   there at `/playground/<slug>`, so there's no routing to add.
3. In its `index.html`, add `<base href="/playground/<slug>/">` as the first thing in `<head>`.
   The URL has no trailing slash, so without it relative paths to scripts and images break. Mark
   any edit you make to an exported file with a `clueso.design:` comment, like Cluego's.
4. Take a still of it (about 1200×900) and save it as `public/previews/<slug>.jpg`. Phones and
   tablets show this still instead of running the experiment live on the homepage.
5. Add it to `lib/registry.ts`:

   ```ts
   {
   	slug: "<slug>",
   	title: "<Name>",
   	type: "experiment",
   	owner: "<Your name>",
   	status: "exploring",
   	visibility: "public",
   	theme: "lab",
   	href: "/playground/<slug>",
   	preview: "/previews/<slug>.jpg",
   	description: "<One or two plain sentences: what it is and what you do in it.>",
   	tags: ["<a few>", "<tags>"],
   	updated: "<YYYY-MM-DD>",
   },
   ```

   `owner` is matched to the team list in `lib/team.ts` by first name, so your portrait shows
   next to "Shipped by".
6. Add a changelog entry (see below).

It now appears under Fun experiments on the homepage.

## Add a tool

1. Put all of its code in `tools/<slug>/`. Keep it self-contained: the site imports it, it doesn't
   import the site's pages. Start from the shared tool shell in `tools/shell/`, the same frame
   Brand Lab uses: top bar, resizable side panels, bottom bar and a full-screen canvas. Its
   `README.md` shows how. Then you only build what your tool does.
2. Add its page at `app/(tool)/tools/<slug>/page.tsx`. Tool pages are full screen, without the
   site's header and footer. If the tool reads `window` or `localStorage` when it loads, mount it
   client-only with `next/dynamic` and `ssr: false`, the way
   `app/(tool)/tools/brand-lab/brand-lab-mount.tsx` does.
3. Build with the site's system: components and icons from `lib/design-system`, styles as Tailwind
   classes backed by `styles/tokens.css`. `pnpm check` fails on hardcoded colours, arbitrary values
   and Jigsaw class names. Need a component that isn't there? Add it with the shadcn CLI into
   `components/ui`, then export it from `lib/design-system`.
4. Add it to `lib/registry.ts` with `type: "tool"` and `status: "beta"`.
5. Add a changelog entry.

There's no sign-in yet, so a tool can't be "internal" and have a page at the same time: the
registry check fails the build. Until a tool is ready for everyone, keep it on its branch.

## Improve Brand Lab

Brand Lab lives here now. Improve it like any other tool: one change per pull request, with a
changelog entry. Keep its look and behaviour as they are unless changing them is the point. If
your change touches its frame (top bar, panels, resizing), make it in `tools/shell/` and check
every tool that uses the shell still works.

## Write the changelog entry

Every pull request that ships something gets an entry, however small: a new tool, a fix, a bit of
polish. If people will see it or feel it, it goes in.

Add it to the top of `lib/changelog.ts`. Write what it means for the people using the site, not
what you changed in the code: "Playground cards used to crash phones. They now show a still" rather
than "Fix: iframe crash on mobile". No "Fix:" or "Feature:" labels. Like a note to a friend, one or
two short sentences. Sentence case title, no full stop at the end of it. `by` is your slug from
`lib/team.ts`.

```ts
{
	date: "<YYYY-MM-DD>",
	title: "<What shipped>",
	body: "<One or two short sentences.>",
	area: "<Tool or experiment name, or Site>",
	by: "<your-slug>",
},
```

## Ship it

1. `pnpm check`: typecheck, lint, registry check and style check. It must pass.
2. `pnpm build` to be sure it builds the way production will.
3. Push your branch and open a pull request into `staging`:
   `gh pr create --base staging`. Always pass the base: `main` is still GitHub's default.
   Merging it deploys https://staging.clueso.design in about five minutes. Check your change there.
4. Release by opening a pull request from `staging` into `main`. Merging into `main` deploys
   clueso.design through GitHub Actions in about five minutes.

`main` and `staging` only change through pull requests. No force pushes.

## Writing

Sentence case for titles, headings and labels. Short, plain, direct sentences. No em dashes.
