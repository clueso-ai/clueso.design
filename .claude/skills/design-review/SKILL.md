---
name: design-review
description: Review a UI change on clueso.design against the team's design bar (tokens, type, spacing, radius, states, themes, motion, accessibility, copy) and return ranked findings with fixes. Use before opening a PR with any visual change, and when the user asks to review, polish or critique a page, tool or component here.
---

# Design review

This site is the benchmark for Clueso design. Review like a senior designer who will be judged by
it: specific, evidence-based, ranked. Look at the running UI, not only the code.

## Gather

1. Read the diff and the components it touches.
2. Open the change in the browser. Look at it in light and dark, at desktop width and phone width
   (site pages) or 1280px and 1100px (tools).
3. Use it with a mouse and with the keyboard alone.

## Check

**System**
- Colours, spacing, radius and type come from tokens. Site code uses v1 utilities
  (`text-neutral-strong`, `bg-raised-1`, `p-gap-m`, `type-title-l`). Tools may use Jigsaw names inside
  `tools/`. No hex, no arbitrary values like `bg-[#DA5CC7]`, no Tailwind `max-w-sm…7xl`.
- Radius is 2, 4, 8 or 12px by container size. Nothing larger.
- Components and icons come from `lib/design-system` (site) or the paths Brand Lab uses (tools).
  Reuse before you build. A new component is a deliberate choice, not a copy.

**Type**
- Titles Nohemi, body and controls Geist, values and code Geist Mono, at the site's scale.
- Sentence case. No full stops on titles or headings. No em dashes.

**Layout and states**
- Aligned to the frame and grid. Consistent gaps. Nothing cramped or floating.
- Every state exists and reads clearly: hover, focus-visible, pressed, selected, disabled, empty,
  loading, error. Selection keeps a non-colour cue.
- Long text, missing data and small screens don't break it.

**Themes and colour**
- Light and dark have the same hierarchy. Check each surface pairing, not just the page.
- Brand pink `#DA5CC7` is used sparingly.
- Text meets WCAG AA contrast.

**Motion**
- Motion has a purpose, is quick (about 150 to 250ms for UI), can be interrupted, and respects
  `prefers-reduced-motion`.

**Accessibility**
- Everything works by keyboard, in a sensible order, with a visible focus ring.
- Controls have accessible names. Icons-only buttons have tooltips and labels.
- Hit targets are at least 24px.

**Copy**
- Plain, short, specific. Labels say what happens. Errors say what to do next.

## Report

Rank findings, most serious first. For each: where (file:line or the screen and element), what's
wrong, why it matters, and the exact fix. Separate "must fix before shipping" from "polish". Say
what you checked and what you couldn't (for example, no phone to test on). Fix the must-fix items
before the PR unless the user says otherwise.
