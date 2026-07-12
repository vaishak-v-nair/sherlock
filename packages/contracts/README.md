# @sherlock/contracts — Shared Event Schemas

## Purpose

Single source of truth for all cross-boundary event schemas using Zod.

## Schemas

- `NormalizedEventSchema` — Validated meeting events
- `EvidenceEventSchema` — Intelligence engine output
- `ConfidenceUpdateSchema` — Per-participant confidence scores
- `StateUpdateEventSchema` — Session state transitions

## Usage

```typescript
import { NormalizedEventSchema, EvidenceEventSchema } from '@sherlock/contracts';
```

Python services mirror these schemas using Pydantic models.
