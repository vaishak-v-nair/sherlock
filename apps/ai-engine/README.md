# AI Engine — Intelligence Processing Service

## Purpose

Run multiple intelligence engines against meeting events to produce weighted evidence for candidate identification.

## Responsibilities

- Subscribe to `session.events.*` on Redis
- Route events to registered intelligence engines
- Produce `EvidenceEvent` from each engine
- Publish evidence to `evidence.events.{sessionId}`

## Engines

- **Metadata Engine** — fuzzy name matching, join order, role inference
- **Conversation Engine** — LLM transcript analysis (Gemini) with regex fallback
- **Audio Engine** — speaking duration and pattern analysis
- **Video Engine** — webcam state and face analysis
- **Behavioral Engine** — interaction pattern analysis
- **Temporal Engine** — timing pattern and confidence velocity analysis

## Dependencies

- Redis (via `redis.asyncio`)
- Gemini API (via `google-genai`)

## Inputs

- `NormalizedEvent` from Redis Pub/Sub

## Outputs

- `EvidenceEvent` published to Redis Pub/Sub

## Future Extensions

- Voice embedding models for speaker verification
- Face recognition pipeline
- Online learning from resolved sessions
