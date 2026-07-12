# Development Workflow

> **Version:** 1.0  
> **Last Updated:** 2026-07-12

---

## 1. Local Setup

### Prerequisites

- Node.js 20+
- pnpm 9+
- Python 3.12+
- Docker & Docker Compose
- Git

### First-Time Setup

```bash
git clone https://github.com/vaishak-v-nair/sherlock.git
cd sherlock
pnpm install
cp .env.example .env
docker compose up -d postgres redis
cd apps/ai-engine && python -m venv .venv && .venv/Scripts/pip install -r requirements.txt
cd ../..
pnpm db:push          # Apply Prisma schema
pnpm db:seed          # Seed development data
```

### Starting Services

```bash
# Option 1: All services via Docker
docker compose up

# Option 2: Infrastructure via Docker, services via dev mode
docker compose up -d postgres redis
pnpm dev              # Starts all services via Turborepo
```

---

## 2. Development Lifecycle

### Feature Development

1. Create branch: `feat/feature-name` from `main`
2. Implement changes following Coding Standards
3. Write/update tests
4. Run locally: `pnpm lint && pnpm test && pnpm build`
5. Commit with conventional commit message
6. Push and create PR against `main`
7. Address review feedback
8. Squash merge after approval

### Bug Fixing

1. Create branch: `fix/bug-description` from `main`
2. Write a failing test that reproduces the bug
3. Fix the bug
4. Verify the test passes
5. Follow standard PR flow

---

## 3. Testing Lifecycle

```bash
pnpm test             # Run all unit tests
pnpm test:watch       # Watch mode
pnpm lint             # Lint all packages
pnpm typecheck        # TypeScript type checking
pnpm test:e2e         # End-to-end simulation
```

### Python

```bash
cd apps/ai-engine
.venv/Scripts/python -m pytest tests/
.venv/Scripts/python -m mypy src/
```

---

## 4. CI/CD Flow

### On Every Push / PR

1. Install dependencies
2. Lint (ESLint + ruff)
3. Type check (tsc + mypy)
4. Unit tests (vitest + pytest)
5. Build all packages
6. Report status

### On Merge to Main

1. All CI checks pass
2. Docker images built
3. Deploy to staging (Railway)
4. Run integration tests against staging
5. Manual approval for production

---

## 5. Release Flow

1. Merge PR to `main`
2. CI builds and tests
3. Tag release: `v1.x.x`
4. Docker images tagged with version
5. Deploy to production

---

## 6. Architecture Review Process

Any change that modifies:

- Event schemas (contracts)
- Database schema
- Service boundaries
- Redis channel patterns
- API endpoints

Requires:

1. Update to `docs/TECHNICAL_DESIGN.md`
2. Explicit approval before implementation
3. Migration plan for existing data

---

## 7. AI-Generated Code Review

All AI-generated code must:

- Pass all automated checks (lint, type, test)
- Be reviewed by a human for correctness
- Have clear comments explaining non-obvious logic
- Not introduce new dependencies without justification
