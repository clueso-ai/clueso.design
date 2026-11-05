---
name: ship
description: Take a change on clueso.design from working copy to a pull request into staging, with the changelog entry, checks, a real browser pass and an honest PR description. Use whenever you're about to commit, push or open a PR in this repo, or the user says ship, raise a PR, or put it on staging.
---

# Ship a change

clueso.design is public. Other design teams and candidates read it as the benchmark for Clueso
design, so a change ships only when it's finished, checked and recorded. Work through every step.
Don't skip one because the change is small.

## 1. One change, on its own branch

- Branch from the latest staging: `git fetch origin && git switch -c <name>/<what> origin/staging`.
  `<name>` is the person's first name (`ajinkya/brand-lab-crop`).
- One change per PR. If the work holds two things a visitor would name separately (a Brand Lab
  feature and an Icon Lab port), split them into two branches and two PRs.

## 2. Changelog entry, in this same PR

Every PR that ships something a visitor can see or feel gets an entry. That includes fixes and
polish. Use the `changelog` skill. Only a change no visitor can see (CI, docs, agent rules) skips
it, and its PR gets the `no-changelog` label. CI fails a PR into staging without one.

## 3. Checks

```bash
pnpm check   # typecheck, lint, registry, styles, changelog. 0 errors, and no new warnings
pnpm build
```

Compare the warning count with staging's. Don't add warnings.

## 4. Look at it, for real

A passing build is not a working feature. Open it in a browser and use it the way a visitor would.

- Every state you touched: default, hover, focus (keyboard), pressed, disabled, empty, loading, error.
- Light and dark.
- Site pages at phone width (375px) and desktop. Tools at 1280px and at the 1100px panel cutoff.
- Copy: sentence case, no full stops on titles, no em dashes.
- For anything visual, run the `design-review` skill on it before the PR.

If you can't run it (no browser, no server), say so in the PR under "Not verified". Never imply
you tested what you didn't.

## 5. Commit and PR

- Commit message: a one-line summary in plain words, then a short body of what changed and why.
- Push the branch under its own name: `git push -u origin HEAD`. Never force-push a branch other
  people may have pulled, and never push to staging or main directly.
- Open the PR with the template (`.github/pull_request_template.md`):
  `gh pr create --base staging`. Always pass `--base staging`. main is GitHub's default.
- Fill every section. Screenshots for anything visual. Name what you couldn't verify.

## 6. After merge

Merging into staging deploys https://staging.clueso.design in about five minutes. Check the change
there. It reaches clueso.design only through a release (`release` skill).

## Before you say "done"

Tell the user the PR link, what's in it, what you verified and what you didn't, and that it's on
staging, not production, until a release.
