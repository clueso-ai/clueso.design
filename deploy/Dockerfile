# clueso.design production image. Built by .github/workflows/deploy.yml for linux/arm64 (Fargate Graviton).
FROM node:24-alpine3.23 AS builder
RUN corepack enable pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile
COPY . .
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
RUN pnpm run build

FROM node:24-alpine3.23
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
