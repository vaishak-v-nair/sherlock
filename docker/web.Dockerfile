# ─── Stage 1: Dependencies ──────────────────────────────────
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9.4.0 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY apps/web/package.json ./apps/web/

RUN pnpm install --frozen-lockfile

# ─── Stage 2: Build ─────────────────────────────────────────
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.4.0 --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/contracts/node_modules ./packages/contracts/node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

COPY packages/contracts/ ./packages/contracts/
COPY packages/tsconfig/ ./packages/tsconfig/
COPY apps/web/ ./apps/web/
COPY turbo.json ./

RUN pnpm --filter @sherlock/web build

# ─── Stage 3: Production ────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
