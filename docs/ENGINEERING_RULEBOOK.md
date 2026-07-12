# Engineering Rulebook

> **Status:** APPROVED — This document is the constitution of the repository.  
> **Version:** 1.0  
> **Last Updated:** 2026-07-12

Every contributor, reviewer, and automated system MUST adhere to these rules. Violations must be caught in code review or CI.

---

## 1. Architecture Rules

### 1.1 Event-Driven Architecture Only

- All inter-service communication flows through Redis Pub/Sub channels.
- No service may directly call another service's internal API for data exchange.
- HTTP endpoints exist only for external ingestion (webhooks) and health checks.

### 1.2 Evidence-First Reasoning

- Every intelligence engine produces `EvidenceEvent` objects.
- Raw meeting events NEVER directly influence confidence scores.
- All reasoning must flow through the evidence pipeline.

### 1.3 No Business Logic in Controllers

- Controllers validate input and delegate to services.
- Controllers contain zero conditional logic beyond schema validation.
- All domain logic resides in dedicated service classes.

### 1.4 Single Responsibility Principle

- Each module has exactly one reason to change.
- Each intelligence engine processes exactly one category of signal.
- The Confidence Engine does not generate evidence; intelligence engines do not compute confidence.

### 1.5 Dependency Inversion

- High-level modules depend on abstractions, not implementations.
- Intelligence engines implement the `IntelligenceEngine` interface.
- Redis, database, and external APIs are injected via configuration, never hard-coded.

### 1.6 Clean Architecture

- Domain logic has zero framework dependencies.
- Framework-specific code (NestJS decorators, FastAPI routes) exists only at the boundary.
- Core business rules can be tested without spinning up any infrastructure.

### 1.7 Modular Design

- Each service is independently deployable.
- Each service has its own `package.json` / `pyproject.toml`.
- Shared code lives in `packages/` and is consumed via workspace dependencies.

### 1.8 Domain-Driven Boundaries

- `sessions/` owns session lifecycle.
- `engines/` owns intelligence processing.
- `confidence/` owns score computation.
- `evidence/` owns evidence storage and aggregation.
- No module reaches into another module's internal state.

### 1.9 No Circular Dependencies

- Dependency graph must be a DAG (Directed Acyclic Graph).
- If module A depends on module B, module B MUST NOT depend on module A.
- Use events or interfaces to break cycles.

### 1.10 No Tight Coupling Between Services

- Services communicate only through defined event contracts.
- Removing or replacing any single service must not require changes to other services.
- Each service can be developed, tested, and deployed independently.

### 1.11 Shared Contracts Are the Single Source of Truth

- `@sherlock/contracts` defines all cross-boundary event schemas.
- Python services use Pydantic models that mirror the Zod schemas.
- Any schema change requires updating both Zod and Pydantic definitions.
- Schema changes require a version bump.

### 1.12 Immutable Evidence

- Once an `EvidenceEvent` is created, it MUST NOT be modified.
- Evidence can only be created or read, never updated or deleted.
- Evidence corrections are handled by emitting new evidence that supersedes the old.

### 1.13 Immutable History

- The `events`, `evidence`, and `confidence_snapshots` tables are append-only.
- No UPDATE or DELETE operations on these tables (except for GDPR compliance).
- History is the ground truth for replay and auditing.

### 1.14 Replayability Must Never Be Broken

- Every state change must be reproducible from the event log.
- Given the same sequence of `NormalizedEvent`s, the system must produce the same confidence trajectory.
- Non-deterministic operations (LLM calls, timestamps) must be recorded for replay.

---

## 2. AI Rules

### 2.1 LLMs Never Make the Final Decision

- LLMs generate evidence — they are one signal among many.
- The Confidence Engine (deterministic) makes all final decisions.
- LLM output is always mediated through the evidence pipeline.

### 2.2 LLMs Only Generate Evidence

- LLM responses are parsed into `EvidenceEvent` objects.
- Raw LLM text is stored in `raw_data` for debugging but never consumed by downstream services.

### 2.3 Confidence Engine Owns All Final Decisions

- Only the Confidence Engine transitions session state.
- Only the Confidence Engine determines the identified candidate.
- Intelligence engines produce scores; the Confidence Engine interprets them.

### 2.4 Every AI Output Must Include Confidence

- Every `EvidenceEvent` has a `score` and `weight` field.
- A score without a weight is meaningless and MUST be rejected.

### 2.5 Every AI Output Must Include Reasoning

- Every `EvidenceEvent` has a `reason` field.
- The reason must be human-readable and explain why this score was assigned.
- "Unknown" or empty reasons are invalid.

### 2.6 Every AI Output Must Include Source

- Every `EvidenceEvent` has an `engineId` identifying which engine produced it.
- This enables per-engine accuracy tracking and weight tuning.

### 2.7 AI Failures Must Degrade Gracefully

- If the Gemini API is unavailable, the Conversation Engine falls back to regex heuristics.
- If any engine fails, other engines continue producing evidence.
- A single engine failure MUST NOT crash the pipeline.

### 2.8 AI Services Must Never Block Real-Time Pipelines

- LLM calls are asynchronous.
- Evidence from fast engines (Metadata: < 10ms) flows immediately.
- Evidence from slow engines (Conversation: 1–3s) arrives later and refines the score.
- The WebSocket pipeline never waits for any engine.

---

## 3. Event Rules

### 3.1 Versioning

- Every event schema has a `version` field (semver string).
- Consumers must handle events from the current and previous version.
- Breaking schema changes require a new channel name suffix.

### 3.2 UUID

- Every event has a globally unique `id` field (UUID v4).
- UUIDs are generated at the point of creation, never reused.

### 3.3 Timestamp

- Every event has a `timestamp` field in UTC milliseconds (Unix epoch).
- Timestamps are set at the point of creation, not at the point of processing.

### 3.4 Source

- Every event has a `source` field identifying the producing service.
- Format: `service-name:module-name` (e.g., `ai-engine:metadata`).

### 3.5 Schema Validation

- Every event is validated against its Zod/Pydantic schema at the point of consumption.
- Invalid events are rejected and logged, never silently dropped.
- Validation errors include the specific field and constraint that failed.

### 3.6 Retry Strategy

- Failed Redis publishes retry 3 times with exponential backoff (100ms, 500ms, 2s).
- After 3 failures, the event is written to a dead-letter queue (Redis list).
- Dead-letter events are replayed manually or by a scheduled job.

### 3.7 Dead-Letter Handling

- Dead-letter queue: `dlq:{service}:{channel}`
- Dead-letter events include the original event, error message, and retry count.
- Dead-letter queue is monitored and alerted on.

### 3.8 Ordering Guarantees

- Events within a single session are processed in timestamp order.
- Cross-session ordering is not guaranteed and not required.
- Consumers must handle out-of-order events gracefully.

### 3.9 Idempotency

- Every consumer must be idempotent: processing the same event twice produces the same result.
- Idempotency is enforced via event ID deduplication in Redis SET (TTL: 1 hour).

---

## 4. Database Rules

### 4.1 Append-Only Evidence

- The `evidence` table is INSERT-only.
- No UPDATE or DELETE triggers exist on this table.
- Corrections emit new evidence; they never modify existing records.

### 4.2 Audit Logging

- All state transitions are recorded in `state_transitions`.
- All evidence is recorded with the producing engine ID and timestamp.
- Audit logs are queryable by session, participant, engine, and time range.

### 4.3 Snapshot Strategy

- Confidence snapshots are taken after every confidence update.
- Snapshots enable confidence graph rendering without recomputation.

### 4.4 Soft Delete Policy

- Sessions use soft delete (`deleted_at` timestamp).
- Participants are never deleted (they are part of the immutable history).
- Soft-deleted records are excluded from queries by default.

### 4.5 Migration Strategy

- All schema changes go through Prisma migrations.
- Migrations are tested in CI before deployment.
- Rollback migrations exist for every forward migration.
- Data migrations are separate from schema migrations.

### 4.6 Indexing Strategy

- Every foreign key has an index.
- Columns used in WHERE clauses have indexes.
- Composite indexes for common query patterns (e.g., `session_id + timestamp`).
- Index usage is reviewed quarterly.

### 4.7 Transaction Rules

- Evidence writes are atomic per evidence event (single INSERT).
- State transitions use database transactions to ensure consistency.
- Long-running transactions (> 5 seconds) are prohibited.

### 4.8 Replay Compatibility

- The database schema must support replaying events from scratch.
- All computed state (confidence, session status) can be derived from the event log.
- Replay mode clears computed state and reprocesses events in order.

---

## 5. API Rules

### 5.1 REST Conventions

- `POST /webhooks/meeting` — Ingest meeting event
- `GET /sessions` — List sessions
- `GET /sessions/:id` — Get session detail
- `GET /sessions/:id/evidence` — Get evidence for session
- `GET /sessions/:id/confidence` — Get confidence history
- `GET /health` — Health check

### 5.2 WebSocket Conventions

- Namespace: `/` (default)
- Client subscribes to: `state.events.{sessionId}`
- Server emits: `StateUpdateEvent` on state change
- Heartbeat: every 30 seconds

### 5.3 Error Responses

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": [{ "field": "participantId", "constraint": "required" }],
  "correlationId": "uuid",
  "timestamp": "2026-07-12T00:00:00Z"
}
```

### 5.4 Status Codes

- `200` — Success (GET)
- `201` — Created
- `202` — Accepted (async processing)
- `400` — Validation error
- `401` — Authentication error
- `404` — Resource not found
- `429` — Rate limited
- `500` — Internal server error
- `503` — Service unavailable

### 5.5 Validation

- All inputs validated at the API boundary using Zod (TS) or Pydantic (Python).
- Validation errors return 400 with specific field-level details.
- No raw user input reaches business logic.

### 5.6 Pagination

- List endpoints use cursor-based pagination.
- Default page size: 50. Maximum: 100.
- Response includes `nextCursor` and `hasMore`.

### 5.7 Authentication Placeholder

- Current: No authentication (prototype).
- Future: JWT bearer tokens with organization-scoped claims.
- All endpoints accept an `Authorization` header (currently ignored).

### 5.8 Versioning

- API versioning via URL prefix: `/api/v1/...`
- Version is mandatory in all routes.
- Breaking changes require a new version.

---

## 6. Logging Rules

### 6.1 Structured Logging

- All logs are JSON-formatted.
- Every log entry includes: `timestamp`, `level`, `service`, `message`, `correlationId`.

### 6.2 Correlation IDs

- Every incoming request generates a `correlationId` (UUID).
- The correlation ID propagates through all Redis events and downstream processing.
- Logs for a single request can be traced across all services.

### 6.3 Request IDs

- Every HTTP request has a unique `requestId`.
- Request IDs are returned in the `X-Request-Id` response header.

### 6.4 Event IDs

- Every event has a unique `id` field.
- Event IDs appear in all logs related to that event's processing.

### 6.5 Error Logging

- Errors include: stack trace, input data (sanitized), service name, correlation ID.
- Errors are logged at `ERROR` level.
- Expected errors (validation failures) are logged at `WARN` level.

### 6.6 AI Inference Logging

- Every LLM call logs: prompt hash, response time, token count, model version.
- LLM responses are logged at `DEBUG` level (not in production).
- LLM errors are logged at `ERROR` level with the prompt (sanitized).

### 6.7 Confidence Update Logging

- Every confidence update logs: session ID, participant ID, old score, new score, triggering evidence ID.
- State transitions log: session ID, from state, to state, explanation.

---

## 7. Error Handling Rules

### 7.1 Retry Policies

- Redis publish: 3 retries, exponential backoff (100ms, 500ms, 2s).
- LLM API calls: 2 retries, exponential backoff (1s, 3s).
- Database writes: 2 retries, linear backoff (500ms, 1s).

### 7.2 Timeouts

- HTTP request handling: 10 seconds.
- Redis operations: 5 seconds.
- LLM API calls: 10 seconds.
- Database queries: 5 seconds.

### 7.3 Circuit Breakers

- LLM API: Open after 5 consecutive failures. Half-open after 30 seconds.
- Redis: Open after 3 consecutive failures. Half-open after 10 seconds.
- Database: Open after 3 consecutive failures. Half-open after 10 seconds.

### 7.4 Fallback Strategies

- LLM unavailable → Conversation Engine uses regex heuristics.
- Redis unavailable → Gateway queues events in memory (max 1000).
- Database unavailable → Evidence is buffered in Redis and flushed on recovery.

### 7.5 Partial Failures

- Individual engine failure does not halt the pipeline.
- Evidence from failed engines is simply absent, not replaced with defaults.
- The Confidence Engine operates with whatever evidence is available.

### 7.6 Unknown Participant Handling

- Unknown participant IDs are auto-registered in the session.
- Unknown roles default to `UNKNOWN` until evidence determines otherwise.

### 7.7 LLM Timeout Handling

- LLM calls that exceed 10 seconds are cancelled.
- A `TIMEOUT` evidence event is logged (score: 0, weight: 0, reason: "LLM timeout").
- The pipeline continues without conversation evidence for this event.

---

## 8. Performance Rules

### 8.1 Acceptable Latency Limits

| Operation                          | Target  | Maximum |
| ---------------------------------- | ------- | ------- |
| API response (webhook ingestion)   | < 50ms  | 200ms   |
| Event processing (Redis pub → sub) | < 10ms  | 50ms    |
| Metadata engine processing         | < 10ms  | 50ms    |
| Audio engine processing            | < 20ms  | 100ms   |
| Video engine processing            | < 50ms  | 200ms   |
| Conversation engine (LLM)          | < 2s    | 10s     |
| Confidence update                  | < 5ms   | 20ms    |
| WebSocket broadcast                | < 10ms  | 50ms    |
| Dashboard render (end-to-end)      | < 500ms | 2s      |
| Database write                     | < 20ms  | 100ms   |
| Redis read/write                   | < 2ms   | 10ms    |

---

## 9. Security Rules

### 9.1 Input Validation

- All external inputs validated by Zod (TypeScript) or Pydantic (Python).
- No raw user input stored without sanitization.
- SQL injection prevented by Prisma ORM (parameterized queries only).

### 9.2 Secret Management

- Secrets stored in environment variables, never in code.
- `.env` files are gitignored.
- `.env.example` contains variable names with placeholder values.

### 9.3 Environment Variables

- All configuration via environment variables.
- No hardcoded URLs, ports, or credentials.
- Default values exist for non-sensitive configuration only.

### 9.4 Sensitive Logging Policy

- Never log: API keys, passwords, tokens, email addresses, full names.
- Log sanitized versions: participant IDs (truncated), session IDs.
- LLM prompts may contain PII — log prompt hashes, not full prompts, in production.

### 9.5 API Protection

- Rate limiting: 100 requests/second per IP (placeholder).
- CORS: Configurable origin whitelist.
- Helmet headers for HTTP responses.

### 9.6 Future Authentication

- JWT-based authentication with organization scoping.
- Role-based access control: admin, operator, viewer.
- API key authentication for webhook providers.

---

## 10. Documentation Rules

### 10.1 Module Documentation

Every module directory must contain a README.md with:

- **Purpose:** One-sentence description of why this module exists.
- **Responsibilities:** Bulleted list of what this module does.
- **Dependencies:** What this module depends on.
- **Inputs:** What data flows in.
- **Outputs:** What data flows out.
- **Future Extension Notes:** How this module can be extended.
