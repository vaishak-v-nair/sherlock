# Sprint Plan

> **Version:** 1.0  
> **Last Updated:** 2026-07-12

Each sprint contains tasks requiring 30–90 minutes of focused work. Tasks are sequential and dependency-aware.

---

## Sprint 0: Repository Foundation

**Goal:** Production-grade repository scaffold before any business logic.  
**Estimated Effort:** 2–3 hours

| Task | Description                                                  | Dependencies | Est. Time |
| ---- | ------------------------------------------------------------ | ------------ | --------- |
| S0-1 | Initialize Turborepo + pnpm workspace + root configs         | None         | 30 min    |
| S0-2 | .gitignore, .editorconfig, .gitattributes, LICENSE           | S0-1         | 15 min    |
| S0-3 | README, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY              | S0-1         | 30 min    |
| S0-4 | GitHub templates (issues, PRs) + Actions skeleton            | S0-1         | 30 min    |
| S0-5 | Husky + lint-staged + Prettier + ESLint + TypeScript configs | S0-1         | 45 min    |
| S0-6 | Docker Compose skeleton + Dockerfiles                        | S0-1         | 30 min    |
| S0-7 | Folder structure matching blueprint (empty dirs + READMEs)   | S0-1         | 30 min    |
| S0-8 | .env.example + environment variable documentation            | S0-7         | 15 min    |

**Success Criteria:** `pnpm install` succeeds, `pnpm lint` succeeds (no source), `docker compose config` validates, folder structure matches blueprint.

---

## Sprint 1: Shared Packages

**Goal:** Build the shared foundation packages consumed by all services.  
**Estimated Effort:** 3–4 hours

| Task | Description                                              | Dependencies | Est. Time |
| ---- | -------------------------------------------------------- | ------------ | --------- |
| S1-1 | `@sherlock/tsconfig` — shared TypeScript configurations  | S0           | 30 min    |
| S1-2 | `@sherlock/eslint-config` — shared ESLint configuration  | S0, S1-1     | 30 min    |
| S1-3 | `@sherlock/contracts` — Zod schemas for all event types  | S1-1         | 60 min    |
| S1-4 | `@sherlock/contracts` — unit tests for schemas           | S1-3         | 30 min    |
| S1-5 | `@sherlock/redis-client` — Redis connection factory      | S1-1         | 45 min    |
| S1-6 | `@sherlock/database` — Prisma schema + initial migration | S1-1         | 60 min    |

**Success Criteria:** All packages build, tests pass, contracts importable from other workspaces.

---

## Sprint 2: Gateway Service

**Goal:** Implement the ingestion layer (webhook → Redis).  
**Estimated Effort:** 3–4 hours

| Task | Description                                       | Dependencies     | Est. Time |
| ---- | ------------------------------------------------- | ---------------- | --------- |
| S2-1 | NestJS app scaffold + health endpoint             | S1               | 30 min    |
| S2-2 | Meeting adapter interface + generic adapter       | S2-1             | 45 min    |
| S2-3 | Event normalizer (UUID, timestamp, dedup)         | S2-2             | 45 min    |
| S2-4 | Webhook controller (validate + publish)           | S2-3, S1-3, S1-5 | 45 min    |
| S2-5 | Session manager (create/update sessions in Redis) | S2-4             | 45 min    |
| S2-6 | Gateway unit tests                                | S2-5             | 45 min    |

**Success Criteria:** POST to `/api/v1/webhooks/meeting` publishes a validated NormalizedEvent to Redis.

---

## Sprint 3: AI Intelligence Engines

**Goal:** Implement all intelligence engines in FastAPI.  
**Estimated Effort:** 4–5 hours

| Task  | Description                                               | Dependencies | Est. Time |
| ----- | --------------------------------------------------------- | ------------ | --------- |
| S3-1  | FastAPI app scaffold + health endpoint + Pydantic schemas | S1           | 30 min    |
| S3-2  | Redis subscriber worker (consume NormalizedEvents)        | S3-1, S1-5   | 45 min    |
| S3-3  | Intelligence engine interface + registry                  | S3-2         | 30 min    |
| S3-4  | Metadata engine implementation                            | S3-3         | 45 min    |
| S3-5  | Conversation engine (Gemini + regex fallback)             | S3-3         | 60 min    |
| S3-6  | Audio engine implementation                               | S3-3         | 30 min    |
| S3-7  | Video engine implementation                               | S3-3         | 30 min    |
| S3-8  | Behavioral engine implementation                          | S3-3         | 30 min    |
| S3-9  | Evidence publisher (emit EvidenceEvents to Redis)         | S3-4         | 30 min    |
| S3-10 | AI engine unit tests                                      | S3-9         | 60 min    |

**Success Criteria:** NormalizedEvent on Redis → each engine produces EvidenceEvent → published to Redis.

---

## Sprint 4: Reasoning Layer

**Goal:** Implement evidence aggregation, confidence engine, and decision engine.  
**Estimated Effort:** 3–4 hours

| Task | Description                                         | Dependencies | Est. Time |
| ---- | --------------------------------------------------- | ------------ | --------- |
| S4-1 | Evidence aggregator (consume + store + aggregate)   | S1, S3       | 60 min    |
| S4-2 | Confidence engine (weighted decay, Bayesian update) | S4-1         | 60 min    |
| S4-3 | Explainability engine (generate explanations)       | S4-2         | 45 min    |
| S4-4 | Decision engine (state machine + thresholds)        | S4-3         | 45 min    |
| S4-5 | Reasoning layer unit tests                          | S4-4         | 45 min    |

**Success Criteria:** EvidenceEvents → aggregated → confidence computed → state transition emitted.

---

## Sprint 5: Notification Service

**Goal:** Implement real-time delivery to frontend.  
**Estimated Effort:** 2–3 hours

| Task | Description                               | Dependencies | Est. Time |
| ---- | ----------------------------------------- | ------------ | --------- |
| S5-1 | NestJS app scaffold + Socket.io gateway   | S1           | 30 min    |
| S5-2 | Redis subscriber for state.events.*       | S5-1, S1-5   | 30 min    |
| S5-3 | WebSocket broadcast to clients            | S5-2, S1-3   | 30 min    |
| S5-4 | Connection management (rooms per session) | S5-3         | 30 min    |
| S5-5 | Notification service unit tests           | S5-4         | 30 min    |

**Success Criteria:** StateUpdateEvent on Redis → broadcast to connected WebSocket clients.

---

## Sprint 6: Frontend Dashboard

**Goal:** Implement the real-time monitoring dashboard.  
**Estimated Effort:** 4–5 hours

| Task | Description                                             | Dependencies | Est. Time |
| ---- | ------------------------------------------------------- | ------------ | --------- |
| S6-1 | Next.js 15 app scaffold + TailwindCSS + shadcn/ui setup | S1           | 45 min    |
| S6-2 | Layout component (header, footer, navigation)           | S6-1         | 30 min    |
| S6-3 | useSocket hook (WebSocket connection management)        | S6-2         | 30 min    |
| S6-4 | ParticipantCard component                               | S6-3         | 30 min    |
| S6-5 | ConfidenceGraph component (real-time chart)             | S6-3         | 45 min    |
| S6-6 | EvidenceTimeline component                              | S6-3         | 30 min    |
| S6-7 | ExplanationPanel component                              | S6-3         | 30 min    |
| S6-8 | LiveDashboard page (compose all components)             | S6-4..S6-7   | 45 min    |
| S6-9 | Error states + loading states                           | S6-8         | 30 min    |

**Success Criteria:** Dashboard renders live participant cards, confidence graph, evidence timeline, and explanations via WebSocket.

---

## Sprint 7: Persistence & Database

**Goal:** Implement database persistence and history.  
**Estimated Effort:** 2–3 hours

| Task | Description                                 | Dependencies | Est. Time |
| ---- | ------------------------------------------- | ------------ | --------- |
| S7-1 | Prisma migrations applied                   | S1-6         | 30 min    |
| S7-2 | Persistence service (write events to DB)    | S7-1         | 45 min    |
| S7-3 | Evidence persistence (write evidence to DB) | S7-2         | 30 min    |
| S7-4 | Confidence snapshot persistence             | S7-3         | 30 min    |
| S7-5 | Session API (list, get, history)            | S7-4         | 45 min    |

**Success Criteria:** All events, evidence, and confidence snapshots persisted to PostgreSQL.

---

## Sprint 8: Integration & Polish

**Goal:** End-to-end integration, simulation, and polish.  
**Estimated Effort:** 3–4 hours

| Task | Description                                   | Dependencies | Est. Time |
| ---- | --------------------------------------------- | ------------ | --------- |
| S8-1 | E2E simulation script (multi-participant)     | S2..S7       | 60 min    |
| S8-2 | Docker Compose full stack validation          | S8-1         | 45 min    |
| S8-3 | Session list page                             | S6, S7-5     | 45 min    |
| S8-4 | Admin settings page (weight/threshold config) | S6           | 45 min    |
| S8-5 | README finalization                           | S8-4         | 30 min    |
| S8-6 | Architecture diagram (Mermaid)                | S8-5         | 30 min    |

**Success Criteria:** Full system runs in Docker, E2E simulation works, dashboard shows live data.

---

## Risk Assessment

| Risk                          | Probability | Impact | Mitigation                               |
| ----------------------------- | ----------- | ------ | ---------------------------------------- |
| Docker unavailable on Windows | Medium      | High   | Provide native dev mode as fallback      |
| Gemini API rate limits        | Medium      | Medium | Implement retry + regex fallback         |
| Redis memory pressure         | Low         | High   | TTL on all keys, eviction policy         |
| Complex WebSocket debugging   | Medium      | Medium | Structured logging, connection health UI |
