# Web Dashboard — Next.js Frontend

## Purpose

Real-time monitoring dashboard for interview sessions showing participant identification confidence.

## Responsibilities

- Display live participant cards with confidence scores
- Render real-time confidence graph
- Show evidence timeline
- Display explainability panel
- Manage WebSocket connection to Notification Server

## Dependencies

- `@sherlock/contracts` — event type definitions

## Inputs

- WebSocket events from Notification Server

## Outputs

- Visual rendering of session state

## Future Extensions

- Session list and history pages
- Session replay with timeline scrubber
- Admin settings for engine weights and thresholds
- Multi-language UI support
