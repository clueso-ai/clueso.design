---
name: release
description: Release staging to production (clueso.design) with a staging → main pull request, after checking every change on staging.clueso.design and that the changelog covers what's going out. Use when the user asks to release, go live, ship to production or update the live site.
---

# Release to production

`main` is clueso.design. It only moves through a pull request from `staging`. A release puts every
change merged into staging since the last release in front of the public at once, so check them
all, not just your own.

## 1. See what's going out

```bash
git fetch origin
git log --oneline origin/main..origin/staging     # every commit in this release
gh pr list --base staging --state merged --limit 20
```

List the PRs in the release. If anything in staging isn't ready (half-built, unreviewed, waiting on
someone's sign-off), stop and tell the user. Don't release around it.

## 2. Check staging

Open https://staging.clueso.design and walk through each change in the list, in light and dark,
desktop and phone width. Check the homepage, /tools, /changelog and every tool page still load.

## 3. Check the changelog

Every visitor-facing PR in the release must have its entry in `lib/changelog.ts` on staging, newest
first. Read them as a visitor would: plain, specific, no jargon. If one is missing, add it in a PR
into staging first (`ship` skill), then release.

## 4. Open the release PR

```bash
gh pr create --base main --head staging --title "Release <YYYY-MM-DD>" --body "<the list of changes, linked PRs, and anything not verified>"
```

Release PRs don't need a new changelog entry: the entries came in with each change.

## 5. After merge

Merging deploys clueso.design through GitHub Actions in about five minutes. Watch the run
(`gh run list --workflow deploy.yml --limit 3`), then check https://clueso.design and
https://clueso.design/changelog. Tell the user what went live.
