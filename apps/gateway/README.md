# Gateway — Meeting Event Ingestion Service

## Purpose

Accept HTTP webhooks from meeting platforms, validate payloads, and publish normalized events to Redis.

## Responsibilities

- Receive and validate webhook payloads (Zoom, Google Meet, Teams)
- Normalize events into the internal `NormalizedEvent` schema
- Deduplicate events via idempotency checks
- Publish to `session.events.{sessionId}` Redis channel

## Dependencies

- `@sherlock/contracts` — event schemas
- `@sherlock/redis-client` — Redis connection
- `@sherlock/database` — session persistence

## Inputs

- HTTP POST requests to `/api/v1/webhooks/meeting`

## Outputs

- `NormalizedEvent` published to Redis Pub/Sub

## Future Extensions

- Platform-specific adapters (Zoom, Meet, Teams)
- Webhook signature verification
- Rate limiting per organization
