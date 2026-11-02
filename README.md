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
- `CONTRIBUTING.md`: how to add a playground experiment or a tool, and ship it.
- `public/playground/<slug>/`: playground experiments, as static exports.

## Branches

Work on a branch from `staging` and open PRs into `staging`. `main` is production and only takes release PRs from `staging`.

## Deploy

A merge to `main` deploys https://clueso.design through GitHub Actions (`.github/workflows/deploy.yml`).

- Runs on AWS (CluesoProduction, ap-south-1): Docker image in ECR, ECS Fargate behind a load balancer, CloudFront in front.
- `deploy/Dockerfile` builds the image. `deploy/cloudformation.yml` is the whole stack.
- `deploy/setup.sh` is the one-time AWS setup: DNS zone, certificates, image repo and deploy roles.
- DNS lives in Route 53. GoDaddy is only the registrar, with its nameservers pointed at Route 53.
- `staging` doesn't deploy yet.
- The "Say hi" form needs a Slack webhook. Store it in Secrets Manager and put the secret ARN in the repo variable `HELLO_WEBHOOK_SECRET_ARN`. Until then the form answers "We can't take messages right now".
