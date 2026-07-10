# Evaluation Metrics

The Sherlock Continuous Identity Engine (CIE) ensures that remote candidate assessments are rigorously validated with high performance and reliability. To measure the success of the implementation, we use the following evaluation metrics:

## 1. System Latency
The primary constraint of the architecture is that identity verification must occur in near real-time without introducing lag to the interview process.
- **Target Ingestion Latency:** Webhooks processed and acknowledged within `< 50ms`.
- **Target Analysis Latency:** Heuristic engines process events and emit evidence within `< 200ms`. External LLM queries (e.g., Gemini) should stream responses and conclude within `< 1500ms`.
- **Target UI Update Latency:** The end-to-end delay from event ingestion to the WebSocket broadcasting a state update to the React UI should be `< 500ms` (excluding LLM generation time).

## 2. Reliability & Decoupling
The event-driven Pub/Sub design ensures that failure in one intelligence engine does not crash the system.
- **Fault Tolerance:** If the `Video Engine` crashes, the `Conversation Engine` must continue analyzing transcripts and emitting evidence.
- **Contract Adherence:** 100% of events passed between the Redis message broker and the Next.js UI must pass Zod schema validation to ensure the UI never renders a malformed state.

## 3. Accuracy & Scoring Mechanics
The Bayesian-style aggregation and temporal decay in the Confidence Engine ensures dynamic and forgiving score computation.
- **Decay Rate Validation:** Older evidence must decay exponentially. For example, a minor negative flag generated 10 minutes ago should have `< 10%` of its original weight, allowing candidates to recover from early nervous behavior.
- **False Positive Minimization:** A candidate should not be transitioned to a `FAILED` state unless the aggregate score strictly breaches the `-0.6` threshold, ensuring isolated mistakes or transient internet issues do not terminate the session.

## 4. Scalability
By completely decoupling the REST API, AI Workers, and WebSockets through Redis, each component can be horizontally scaled independently.
- **Target Concurrency:** The NestJS Gateway and Notification Servers should easily handle `> 10,000` concurrent WebSocket connections per instance.
- **AI Processing Queue:** Fast-path events (Metadata) should never be blocked by slow-path events (LLM processing). Redis Pub/Sub multiplexing inherently solves this.
