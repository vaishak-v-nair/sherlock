# @sherlock/database — Prisma Schema & Migrations

## Purpose

Database schema definitions and Prisma client for PostgreSQL persistence.

## Models

- `Session` — Interview session lifecycle
- `Participant` — Meeting participants
- `Event` — Normalized event log (append-only)
- `Evidence` — Intelligence engine evidence (append-only)
- `ConfidenceSnapshot` — Confidence score history
- `StateTransition` — Session state audit log

## Usage

```typescript
import { PrismaClient } from '@sherlock/database';

const prisma = new PrismaClient();
```

## Commands

```bash
pnpm db:push     # Apply schema to database
pnpm db:migrate  # Create and apply migrations
pnpm db:seed     # Seed development data
```
