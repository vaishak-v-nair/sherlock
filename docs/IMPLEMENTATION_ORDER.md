# Implementation Order

> **Version:** 1.0  
> **Last Updated:** 2026-07-12

The definitive build order. Every task lists prerequisites, files, interfaces, tests, and acceptance criteria. No implementation code — only the execution roadmap.

---

## S0-1: Initialize Turborepo Workspace

| Field                   | Detail                                                                                         |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| **Task ID**             | S0-1                                                                                           |
| **Title**               | Initialize Turborepo + pnpm workspace                                                          |
| **Description**         | Set up the monorepo root with Turborepo orchestration and pnpm workspaces                      |
| **Prerequisites**       | None                                                                                           |
| **Files to Create**     | `package.json`, `turbo.json`, `pnpm-workspace.yaml`                                            |
| **Files to Modify**     | None                                                                                           |
| **Expected Interfaces** | `pnpm install` succeeds, `turbo run build` recognizes workspaces                               |
| **Expected Tests**      | `pnpm install` exits 0                                                                         |
| **Acceptance Criteria** | Monorepo root resolves all workspace paths. Turbo pipeline defined for build, dev, lint, test. |
| **Potential Risks**     | pnpm version mismatch                                                                          |
| **Validation Steps**    | Run `pnpm install`, verify no errors. Run `turbo run build --dry-run`.                         |

---

## S0-2: Repository Meta Files

| Field                   | Detail                                                      |
| ----------------------- | ----------------------------------------------------------- |
| **Task ID**             | S0-2                                                        |
| **Title**               | .gitignore, .editorconfig, .gitattributes, LICENSE          |
| **Description**         | Standard repository metadata files                          |
| **Prerequisites**       | S0-1                                                        |
| **Files to Create**     | `.gitignore`, `.editorconfig`, `.gitattributes`, `LICENSE`  |
| **Files to Modify**     | None                                                        |
| **Expected Interfaces** | N/A                                                         |
| **Expected Tests**      | `.gitignore` excludes node_modules, .env, dist, **pycache** |
| **Acceptance Criteria** | All files present with correct content                      |
| **Potential Risks**     | None                                                        |
| **Validation Steps**    | Visual inspection                                           |

---

## S0-3: Documentation Scaffold

| Field                   | Detail                                                                                                                      |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Task ID**             | S0-3                                                                                                                        |
| **Title**               | README, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY                                                                             |
| **Description**         | Top-level documentation scaffold                                                                                            |
| **Prerequisites**       | S0-1                                                                                                                        |
| **Files to Create**     | `README.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`                                                         |
| **Files to Modify**     | None                                                                                                                        |
| **Expected Interfaces** | N/A                                                                                                                         |
| **Expected Tests**      | N/A                                                                                                                         |
| **Acceptance Criteria** | README contains project overview, architecture diagram, setup instructions (placeholder). CONTRIBUTING outlines PR process. |
| **Potential Risks**     | None                                                                                                                        |
| **Validation Steps**    | Visual inspection                                                                                                           |

---

## S0-4: GitHub Templates + Actions

| Field                   | Detail                                                                                                                                              |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Task ID**             | S0-4                                                                                                                                                |
| **Title**               | GitHub issue templates, PR template, Actions CI skeleton                                                                                            |
| **Description**         | GitHub-specific project configuration                                                                                                               |
| **Prerequisites**       | S0-1                                                                                                                                                |
| **Files to Create**     | `.github/ISSUE_TEMPLATE/bug_report.md`, `.github/ISSUE_TEMPLATE/feature_request.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/workflows/ci.yml` |
| **Files to Modify**     | None                                                                                                                                                |
| **Expected Interfaces** | CI workflow runs on push/PR                                                                                                                         |
| **Expected Tests**      | CI YAML validates (`actionlint` or manual check)                                                                                                    |
| **Acceptance Criteria** | Templates render correctly on GitHub. CI skeleton defines lint/test/build jobs.                                                                     |
| **Potential Risks**     | Actions syntax errors                                                                                                                               |
| **Validation Steps**    | Push to GitHub, verify templates appear in issue/PR creation UI                                                                                     |

---

## S0-5: Linting & Formatting

| Field                   | Detail                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| **Task ID**             | S0-5                                                                                        |
| **Title**               | Husky + lint-staged + Prettier + ESLint + TypeScript root configs                           |
| **Description**         | Code quality tooling                                                                        |
| **Prerequisites**       | S0-1                                                                                        |
| **Files to Create**     | `.prettierrc`, `.prettierignore`, `tsconfig.json` (root), `.husky/pre-commit`               |
| **Files to Modify**     | `package.json` (add lint-staged config)                                                     |
| **Expected Interfaces** | `pnpm format` formats all files. `pnpm lint` runs ESLint. Pre-commit hook runs lint-staged. |
| **Expected Tests**      | `pnpm format --check` exits 0 on formatted code                                             |
| **Acceptance Criteria** | Prettier, ESLint, and TypeScript configured. Husky pre-commit hook installed.               |
| **Potential Risks**     | Husky doesn't install on Windows                                                            |
| **Validation Steps**    | `pnpm format --check`, `pnpm lint`                                                          |

---

## S0-6: Docker Compose Skeleton

| Field                   | Detail                                                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Task ID**             | S0-6                                                                                                                                                         |
| **Title**               | Docker Compose + Dockerfiles                                                                                                                                 |
| **Description**         | Container configuration for all services                                                                                                                     |
| **Prerequisites**       | S0-1                                                                                                                                                         |
| **Files to Create**     | `docker-compose.yml`, `docker/gateway.Dockerfile`, `docker/notification.Dockerfile`, `docker/ai-engine.Dockerfile`, `docker/web.Dockerfile`, `.dockerignore` |
| **Files to Modify**     | None                                                                                                                                                         |
| **Expected Interfaces** | `docker compose config` validates successfully                                                                                                               |
| **Expected Tests**      | YAML validation                                                                                                                                              |
| **Acceptance Criteria** | All services defined. Infrastructure (Postgres, Redis) configured with health checks.                                                                        |
| **Potential Risks**     | Docker not available on dev machine                                                                                                                          |
| **Validation Steps**    | `docker compose config` (if Docker available)                                                                                                                |

---

## S0-7: Folder Structure

| Field                   | Detail                                                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Task ID**             | S0-7                                                                                                              |
| **Title**               | Create folder structure matching blueprint                                                                        |
| **Description**         | Create all directories with placeholder README.md files                                                           |
| **Prerequisites**       | S0-1                                                                                                              |
| **Files to Create**     | Directory tree as specified in Technical Design §8.1. Each leaf directory gets a `README.md` stating its purpose. |
| **Files to Modify**     | None                                                                                                              |
| **Expected Interfaces** | N/A                                                                                                               |
| **Expected Tests**      | N/A                                                                                                               |
| **Acceptance Criteria** | All directories from the blueprint exist. Each has a README.                                                      |
| **Potential Risks**     | None                                                                                                              |
| **Validation Steps**    | `find . -name README.md -type f` shows expected paths                                                             |

---

## S0-8: Environment Configuration

| Field                   | Detail                                                               |
| ----------------------- | -------------------------------------------------------------------- |
| **Task ID**             | S0-8                                                                 |
| **Title**               | .env.example + documentation                                         |
| **Description**         | Document all environment variables                                   |
| **Prerequisites**       | S0-7                                                                 |
| **Files to Create**     | `.env.example`                                                       |
| **Files to Modify**     | None                                                                 |
| **Expected Interfaces** | N/A                                                                  |
| **Expected Tests**      | N/A                                                                  |
| **Acceptance Criteria** | Every environment variable listed with description and default value |
| **Potential Risks**     | None                                                                 |
| **Validation Steps**    | Visual inspection                                                    |

---

## S1-1: Shared TypeScript Config

| Field                   | Detail                                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Task ID**             | S1-1                                                                                                                           |
| **Title**               | `@sherlock/tsconfig` package                                                                                                   |
| **Description**         | Shared TypeScript configurations (base, node, react)                                                                           |
| **Prerequisites**       | S0 complete                                                                                                                    |
| **Files to Create**     | `packages/tsconfig/package.json`, `packages/tsconfig/base.json`, `packages/tsconfig/node.json`, `packages/tsconfig/react.json` |
| **Files to Modify**     | None                                                                                                                           |
| **Expected Interfaces** | Other packages extend these configs                                                                                            |
| **Expected Tests**      | `tsc --showConfig` resolves correctly                                                                                          |
| **Acceptance Criteria** | Three config profiles: base (strict), node (CommonJS + paths), react (JSX + dom)                                               |
| **Potential Risks**     | None                                                                                                                           |
| **Validation Steps**    | Create a test .ts file that imports and verify `tsc --noEmit`                                                                  |

---

## S1-2: Shared ESLint Config

| Field                   | Detail                                                                   |
| ----------------------- | ------------------------------------------------------------------------ |
| **Task ID**             | S1-2                                                                     |
| **Title**               | `@sherlock/eslint-config` package                                        |
| **Description**         | Shared ESLint configuration with TypeScript rules                        |
| **Prerequisites**       | S1-1                                                                     |
| **Files to Create**     | `packages/eslint-config/package.json`, `packages/eslint-config/index.js` |
| **Files to Modify**     | None                                                                     |
| **Expected Interfaces** | Other packages use `extends: ['@sherlock/eslint-config']`                |
| **Expected Tests**      | `pnpm lint` succeeds                                                     |
| **Acceptance Criteria** | TypeScript-aware linting with strict rules                               |
| **Potential Risks**     | ESLint version conflicts                                                 |
| **Validation Steps**    | `pnpm lint`                                                              |

---

## S1-3: Shared Contracts

| Field                   | Detail                                                                                                                                                                                                                                                                                        |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Task ID**             | S1-3                                                                                                                                                                                                                                                                                          |
| **Title**               | `@sherlock/contracts` — all event schemas                                                                                                                                                                                                                                                     |
| **Description**         | Define Zod schemas for NormalizedEvent, EvidenceEvent, ConfidenceUpdate, StateUpdateEvent                                                                                                                                                                                                     |
| **Prerequisites**       | S1-1                                                                                                                                                                                                                                                                                          |
| **Files to Create**     | `packages/contracts/src/events/normalized.ts`, `packages/contracts/src/events/evidence.ts`, `packages/contracts/src/events/confidence.ts`, `packages/contracts/src/events/state.ts`, `packages/contracts/src/index.ts`, `packages/contracts/package.json`, `packages/contracts/tsconfig.json` |
| **Files to Modify**     | None                                                                                                                                                                                                                                                                                          |
| **Expected Interfaces** | `import { NormalizedEventSchema } from '@sherlock/contracts'`                                                                                                                                                                                                                                 |
| **Expected Tests**      | Schema validation tests for valid/invalid payloads                                                                                                                                                                                                                                            |
| **Acceptance Criteria** | All four event types have complete Zod schemas with strict validation                                                                                                                                                                                                                         |
| **Potential Risks**     | Schema design may need revision                                                                                                                                                                                                                                                               |
| **Validation Steps**    | Run unit tests, import from another package                                                                                                                                                                                                                                                   |

---

## S1-4: Contract Tests

| Field                   | Detail                                                                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Task ID**             | S1-4                                                                                                                                             |
| **Title**               | Unit tests for `@sherlock/contracts`                                                                                                             |
| **Description**         | Test all schema validations with valid and invalid data                                                                                          |
| **Prerequisites**       | S1-3                                                                                                                                             |
| **Files to Create**     | `packages/contracts/__tests__/normalized.spec.ts`, `packages/contracts/__tests__/evidence.spec.ts`, `packages/contracts/__tests__/state.spec.ts` |
| **Files to Modify**     | `packages/contracts/package.json` (add vitest)                                                                                                   |
| **Expected Interfaces** | N/A                                                                                                                                              |
| **Expected Tests**      | All schema edge cases covered                                                                                                                    |
| **Acceptance Criteria** | 100% of schema fields have validation tests                                                                                                      |
| **Potential Risks**     | None                                                                                                                                             |
| **Validation Steps**    | `pnpm --filter @sherlock/contracts test`                                                                                                         |

---

## S1-5: Redis Client

| Field                   | Detail                                                                                                                                                   |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Task ID**             | S1-5                                                                                                                                                     |
| **Title**               | `@sherlock/redis-client` package                                                                                                                         |
| **Description**         | Singleton Redis connection factory with health check and configuration                                                                                   |
| **Prerequisites**       | S1-1                                                                                                                                                     |
| **Files to Create**     | `packages/redis-client/src/index.ts`, `packages/redis-client/src/client.ts`, `packages/redis-client/package.json`, `packages/redis-client/tsconfig.json` |
| **Files to Modify**     | None                                                                                                                                                     |
| **Expected Interfaces** | `getRedisClient()` returns configured ioredis client                                                                                                     |
| **Expected Tests**      | Unit test with mock (no real Redis needed)                                                                                                               |
| **Acceptance Criteria** | Configurable via env vars. Singleton pattern. Error handling.                                                                                            |
| **Potential Risks**     | ioredis version compatibility                                                                                                                            |
| **Validation Steps**    | Import and call `getRedisClient()`                                                                                                                       |

---

## S1-6: Database Schema

| Field                   | Detail                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Task ID**             | S1-6                                                                                                          |
| **Title**               | `@sherlock/database` — Prisma schema + migration                                                              |
| **Description**         | Define Prisma models for all entities from Technical Design §4.2                                              |
| **Prerequisites**       | S1-1                                                                                                          |
| **Files to Create**     | `packages/database/prisma/schema.prisma`, `packages/database/package.json`, `packages/database/tsconfig.json` |
| **Files to Modify**     | None                                                                                                          |
| **Expected Interfaces** | `import { PrismaClient } from '@sherlock/database'`                                                           |
| **Expected Tests**      | `prisma validate` succeeds                                                                                    |
| **Acceptance Criteria** | All tables from Technical Design defined. Relations correct. Indexes defined.                                 |
| **Potential Risks**     | Schema may evolve during implementation                                                                       |
| **Validation Steps**    | `pnpm --filter @sherlock/database prisma validate`                                                            |

---

## Future Tasks (S2–S8)

Tasks S2-1 through S8-6 follow the same structure. Each task in the Sprint Plan has a corresponding entry here. For brevity, the detailed task specifications for Sprints 2–8 will be generated at the start of each sprint, following the same template above.

This approach ensures:

1. Tasks don't become stale before they're needed
2. Lessons learned in earlier sprints inform later task specifications
3. The architecture remains frozen while task details stay current

---

## Future Improvements

These improvements are identified but deferred to post-launch:

1. **Voice embedding pipeline** — Replace audio duration heuristics with actual speaker verification ML model
2. **Face recognition pipeline** — Match candidate face against profile photo using a lightweight face embedding model
3. **Online learning** — Use resolved sessions as training data to auto-tune engine weights via gradient descent
4. **Session replay UI** — Full timeline scrubber with event-by-event replay
5. **Multi-language conversation analysis** — Extend LLM prompts for non-English interviews
6. **Webhook signature verification** — Validate incoming webhooks against provider secrets
7. **Rate limiting** — Per-organization rate limits on webhook ingestion
8. **Horizontal scaling** — Redis Streams instead of Pub/Sub for consumer groups
