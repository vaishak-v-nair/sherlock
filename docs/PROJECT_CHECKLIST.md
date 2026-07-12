# Project Checklist

> **Version:** 1.0  
> **Last Updated:** 2026-07-12

---

## Repository

- [ ] Git initialized with `.gitignore`
- [ ] `.editorconfig` present
- [ ] `.gitattributes` present
- [ ] `LICENSE` (MIT)
- [ ] `README.md` with architecture, setup, usage
- [ ] `CONTRIBUTING.md`
- [ ] `CODE_OF_CONDUCT.md`
- [ ] `SECURITY.md`
- [ ] `.env.example` with all variables documented
- [ ] `legacy/prototype-v1` branch preserves original work

## Infrastructure

- [ ] `docker-compose.yml` with all services
- [ ] Individual Dockerfiles for each service
- [ ] PostgreSQL container configured
- [ ] Redis container configured
- [ ] Health checks on all containers
- [ ] Volume mounts for persistence
- [ ] Network isolation between services
- [ ] `docker compose up` starts entire stack

## Backend — Gateway

- [ ] NestJS application scaffolded
- [ ] Health endpoint (`GET /health`)
- [ ] Webhook endpoint (`POST /api/v1/webhooks/meeting`)
- [ ] Request validation via Zod
- [ ] Event normalization (UUID, timestamp, dedup)
- [ ] Redis publish to `session.events.*`
- [ ] Structured logging with correlation IDs
- [ ] Error handling (400, 401, 500)
- [ ] Unit tests passing

## Backend — Notification

- [ ] NestJS application scaffolded
- [ ] Socket.io WebSocket gateway
- [ ] Redis subscriber for `state.events.*`
- [ ] Broadcast to connected clients
- [ ] Session-scoped rooms
- [ ] Connection/disconnection logging
- [ ] Unit tests passing

## AI Services

- [ ] FastAPI application scaffolded
- [ ] Pydantic schemas mirroring Zod contracts
- [ ] Redis subscriber worker
- [ ] Metadata Intelligence Engine
- [ ] Conversation Intelligence Engine (Gemini + fallback)
- [ ] Audio Intelligence Engine
- [ ] Video Intelligence Engine
- [ ] Behavioral Intelligence Engine
- [ ] Temporal Intelligence Engine
- [ ] Evidence publisher to `evidence.events.*`
- [ ] Structured logging
- [ ] Unit tests passing

## Reasoning Layer

- [ ] Evidence Aggregator (collect + store + aggregate)
- [ ] Confidence Engine (weighted decay + Bayesian update)
- [ ] Explainability Engine (generate explanations)
- [ ] Decision Engine (state machine + thresholds)
- [ ] State publisher to `state.events.*`
- [ ] Unit tests passing

## Frontend

- [ ] Next.js 15 with App Router
- [ ] TailwindCSS configured
- [ ] shadcn/ui components installed
- [ ] Live Dashboard page
- [ ] Participant cards with confidence scores
- [ ] Real-time confidence graph
- [ ] Evidence timeline
- [ ] Explanation panel
- [ ] Session list page
- [ ] Connection status indicator
- [ ] Error states (disconnected, no data)
- [ ] Loading states (skeleton UI)
- [ ] Responsive layout

## Redis

- [ ] Connection factory in `@sherlock/redis-client`
- [ ] Pub/Sub channels documented
- [ ] Key patterns documented with TTLs
- [ ] Idempotency via event ID dedup
- [ ] Session state stored in HASH
- [ ] Evidence stored in LIST
- [ ] Confidence stored in HASH

## PostgreSQL

- [ ] Prisma schema defined
- [ ] Migrations generated and applied
- [ ] `sessions` table
- [ ] `participants` table
- [ ] `events` table (append-only)
- [ ] `evidence` table (append-only)
- [ ] `confidence_snapshots` table
- [ ] `state_transitions` table
- [ ] Indexes on foreign keys and query patterns
- [ ] Seed script for development data

## Shared Packages

- [ ] `@sherlock/contracts` — all event Zod schemas
- [ ] `@sherlock/redis-client` — Redis connection factory
- [ ] `@sherlock/database` — Prisma client + schema
- [ ] `@sherlock/eslint-config` — shared ESLint rules
- [ ] `@sherlock/tsconfig` — shared TypeScript configs

## Docker

- [ ] `gateway.Dockerfile`
- [ ] `notification.Dockerfile`
- [ ] `ai-engine.Dockerfile`
- [ ] `web.Dockerfile`
- [ ] Multi-stage builds for production
- [ ] `.dockerignore` files

## Deployment

- [ ] GitHub Actions CI workflow
- [ ] Lint + type check + test in CI
- [ ] Build step in CI
- [ ] Docker build in CI
- [ ] `.env.example` documents all required variables
- [ ] Vercel deployment config (frontend)
- [ ] Railway deployment config (backend)

## Testing

- [ ] Vitest configured for TypeScript packages
- [ ] pytest configured for Python
- [ ] Unit tests for all intelligence engines
- [ ] Unit tests for confidence engine
- [ ] Unit tests for evidence aggregator
- [ ] Unit tests for schema validation
- [ ] E2E simulation script
- [ ] `pnpm test` runs all tests
- [ ] CI runs tests on every push

## Monitoring

- [ ] Structured logging across all services
- [ ] Correlation IDs propagated
- [ ] Health endpoints on all services
- [ ] System health component in dashboard

## Documentation

- [ ] `TECHNICAL_DESIGN.md`
- [ ] `ENGINEERING_RULEBOOK.md`
- [ ] `CODING_STANDARDS.md`
- [ ] `DEVELOPMENT_WORKFLOW.md`
- [ ] `SPRINT_PLAN.md`
- [ ] `PROJECT_CHECKLIST.md`
- [ ] `IMPLEMENTATION_ORDER.md`
- [ ] Architecture diagram (Mermaid)
- [ ] Module-level READMEs

## Evaluation

- [ ] `evaluation_metrics.md` with accuracy/precision/recall targets
- [ ] Edge case documentation
- [ ] Limitation documentation
- [ ] Replay capability description

## Demo

- [ ] E2E simulation runs successfully
- [ ] Dashboard shows real-time updates
- [ ] Confidence transitions visible
- [ ] Explanation text visible
- [ ] Multiple participants handled

## Final Deliverables

- [ ] Working demo (all services running)
- [ ] Demo video script/outline (5–10 minutes)
- [ ] GitHub repository public
- [ ] Architecture diagram in README
- [ ] Setup instructions verified on clean machine
- [ ] Assumptions documented
