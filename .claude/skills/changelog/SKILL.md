---
name: changelog
description: Write the lib/changelog.ts entry for a change on clueso.design, in the site's voice. Use for every PR that ships something visitors can see or feel, however small, and whenever the user mentions the changelog.
---

# Write the changelog entry

The changelog is public at /changelog and on the homepage. It's how other teams and candidates see
what the design team ships, so it's written for them, not for us.

## Where

Add the entry at the **top** of the `changelog` array in `lib/changelog.ts`, in the same PR as the
change. One entry per change a visitor would name separately. A PR with three distinct features
gets three entries.

```ts
{
	date: "<YYYY-MM-DD>",   // the day it ships (merges), in IST
	title: "<What shipped>",
	body: "<One or two short sentences.>",
	area: "<Brand Lab | Icon Lab | Cluego | Site | Tools ...>",
	by: "<slug from lib/team.ts>",
},
```

`node scripts/check-changelog.ts` (part of `pnpm check`) enforces order, dates, `by` slugs and the
punctuation rules below.

## How it reads

- Say what changed for the person using the site, not what changed in the code.
- Like a note to a friend. One or two short sentences.
- Title: sentence case, names the change, no full stop. Name the tool when it isn't obvious.
- Body: full sentences ending in a full stop. Say how to use it if that isn't obvious
  ("Double-click any text to edit it").
- No "Fix:" or "Feature:" labels. No em dashes. No internal names (files, components, libraries,
  model names) unless a visitor needs them.

| Instead of | Write |
| --- | --- |
| Fix: iframe crash on mobile | Playground cards used to crash phones. They now show a still. |
| Add transformers.js bg removal worker | Select an image and press Remove background to cut out its subject, right in your browser. |
| Refactor overlay hit testing | When something hangs off the canvas, you can still select and resize it there. |

## Check before you finish

- Is it at the top, and is its date the newest?
- Would someone outside the team understand it without opening the code?
- Is the person who shipped it credited?
