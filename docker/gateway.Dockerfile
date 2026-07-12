# ─── Stage 1: Dependencies ──────────────────────────────────
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9.4.0 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/redis-client/package.json ./packages/redis-client/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY apps/gateway/package.json ./apps/gateway/

RUN pnpm install --frozen-lockfile

# ─── Stage 2: Build ─────────────────────────────────────────
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.4.0 --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/contracts/node_modules ./packages/contracts/node_modules
COPY --from=deps /app/packages/redis-client/node_modules ./packages/redis-client/node_modules
COPY --from=deps /app/apps/gateway/node_modules ./apps/gateway/node_modules

COPY packages/contracts/ ./packages/contracts/
COPY packages/redis-client/ ./packages/redis-client/
COPY packages/tsconfig/ ./packages/tsconfig/
COPY apps/gateway/ ./apps/gateway/
COPY turbo.json ./

RUN pnpm --filter @sherlock/gateway build

# ─── Stage 3: Production ────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=builder /app/apps/gateway/dist ./dist
COPY --from=builder /app/apps/gateway/node_modules ./node_modules
COPY --from=builder /app/apps/gateway/package.json ./

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "dist/main.js"]
