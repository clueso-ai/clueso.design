# clueso.design

The Clueso design team's workshop: tools, interaction experiments and the systems behind Clueso.

## Run it

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm check      # typecheck, lint, registry and style checks
pnpm build
```

## Where things are

- `app/`: routes. `(site)` has the header and footer; `(tool)` is full screen.
- `tools/brand-lab/`: Brand Lab, tool #001.
- `lib/design-system/`: the only place components and icons are imported from.
- `lib/registry.ts`: every tool and experiment, with owner, status and visibility.
- `styles/tokens.css`: token architecture v1.
- `docs/ARCHITECTURE.md`: decisions and open items.

## Branches

Work on a branch from `staging` and open PRs into `staging`. `main` is production and only takes release PRs from `staging`.

## Vercel setup checklist

1. Import the repo into the Clueso Vercel team. Framework: Next.js. Install command: `pnpm install`.
2. Settings → Git: production branch `main`.
3. Settings → Domains: `clueso.design` → production; `staging.clueso.design` → branch `staging`.
4. Settings → Analytics: enable Web Analytics.
5. No environment variables are needed yet.
