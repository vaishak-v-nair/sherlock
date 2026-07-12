# Notification Server — Real-Time Delivery Service

## Purpose

Bridge Redis state events to connected browser clients via WebSocket.

## Responsibilities

- Subscribe to `state.events.*` on Redis
- Validate incoming state events against Zod schema
- Broadcast `StateUpdateEvent` to clients via Socket.io
- Manage client connections and session-scoped rooms

## Dependencies

- `@sherlock/contracts` — event schemas
- `@sherlock/redis-client` — Redis connection

## Inputs

- `StateUpdateEvent` from Redis Pub/Sub

## Outputs

- WebSocket broadcasts to connected dashboard clients

## Future Extensions

- Session-scoped rooms for multi-tenant isolation
- Push notifications for critical state transitions
- Webhook callbacks for external integrations
