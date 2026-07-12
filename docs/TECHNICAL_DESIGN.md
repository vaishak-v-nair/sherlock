# Sherlock Candidate Identity Engine (CIE) — Technical Design Document

> **Status:** APPROVED  
> **Author:** Engineering Lead  
> **Last Updated:** 2026-07-12  
> **Version:** 2.0

---

## Table of Contents

1. [Phase 1: Problem Analysis](#phase-1-problem-analysis)
2. [Phase 2: System Architecture](#phase-2-system-architecture)
3. [Phase 3: Module Design](#phase-3-module-design)
4. [Phase 4: Data Model](#phase-4-data-model)
5. [Phase 5: AI Reasoning Pipeline](#phase-5-ai-reasoning-pipeline)
6. [Phase 6: Frontend Design](#phase-6-frontend-design)
7. [Phase 7: Deployment Design](#phase-7-deployment-design)
8. [Phase 8: Repository Design](#phase-8-repository-design)
9. [Phase 9: Evaluation Design](#phase-9-evaluation-design)

---

## Phase 1: Problem Analysis

### 1.1 The Engineering Problem

Sherlock is an AI platform that detects fraud during live video interviews. Before any fraud detection can occur, the system must solve a prerequisite problem: **which participant in the meeting is the interview candidate?**

This is not a lookup problem. It is a **continuous inference problem under uncertainty**. The system must:

- Identify the candidate from a pool of N participants (interviewer(s), observers, the candidate)
- Do so in real-time as the interview progresses
- Handle ambiguous, missing, or contradictory information
- Continuously update its belief as new evidence arrives
- Explain every decision it makes
- Never make a hard binary decision — instead, produce a confidence distribution

### 1.2 Why This Problem Is Difficult

**Identity is not a field in a database.** Participants join meetings with arbitrary display names ("MacBook Pro", "John's iPhone", nicknames). There is no guaranteed mapping from display name to real identity.

**The ground truth is unknown at inference time.** We have external metadata (candidate name, email, calendar invite), but the mapping from metadata to a specific participant stream is the inference we must perform.

**Multiple signals are weak individually.** Name matching alone fails when names are misspelled, abbreviated, or absent. Audio analysis alone fails in the first seconds. Transcript analysis alone fails when the candidate hasn't spoken yet. Only the combination of weak signals over time produces reliable identification.

**The system must work from the first second.** An interviewer expects fraud detection to be active immediately, not after 5 minutes of warm-up.

**False positives are catastrophic.** If Sherlock incorrectly identifies the interviewer as the candidate and runs deepfake detection against them, the entire fraud pipeline produces garbage.

### 1.3 Hidden Engineering Challenges

| Challenge                | Description                                                                                                                                                                  |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cold start**           | At JOIN time, we have only a display name and participant ID. No audio, no video, no transcript yet.                                                                         |
| **Late joiners**         | The candidate may join after the interviewer. A new participant joining mid-session must be re-evaluated against existing participants.                                      |
| **Display name changes** | Participants can change their display name mid-meeting. The system must handle identity continuity.                                                                          |
| **Multiple observers**   | Silent observers (HR, panel members) inflate the participant pool without providing signal. They must be classified as "not the candidate" without relying on them speaking. |
| **Network partitions**   | A participant may disconnect and rejoin with a new participant ID. The system must correlate these as the same person.                                                       |
| **Concurrent sessions**  | The system must handle hundreds of concurrent interview sessions without cross-contamination.                                                                                |
| **Event ordering**       | Redis Pub/Sub does not guarantee ordering across channels. Events may arrive out of sequence.                                                                                |
| **LLM latency**          | Gemini API calls take 1–3 seconds. The pipeline cannot block on LLM inference.                                                                                               |
| **Evidence conflicts**   | Two engines may produce contradictory evidence for the same participant. The system must resolve conflicts gracefully.                                                       |

### 1.4 Hidden Product Challenges

| Challenge                  | Description                                                                                                                                    |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Explainability**         | A recruiter seeing "Candidate: User-007, Confidence: 0.87" needs to understand _why_. Every decision needs a human-readable explanation chain. |
| **Trust calibration**      | If the system says "95% confident" but is wrong 20% of the time, users lose trust. Confidence scores must be well-calibrated.                  |
| **Graceful degradation**   | If all AI engines fail, the system must still function using metadata-only heuristics rather than crashing.                                    |
| **Session lifecycle**      | Interviews have a defined lifecycle: scheduling → joining → active → ending. The system must respect this lifecycle.                           |
| **Multi-tenant isolation** | Different organizations must have completely isolated sessions and data.                                                                       |

### 1.5 Hidden AI Challenges

| Challenge              | Description                                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Evidence weighting** | Not all evidence is equally valuable. A name match is weaker than a voice identification. Weights must be tunable without code changes.                 |
| **Temporal dynamics**  | Evidence relevance decays over time. A name match from 30 minutes ago is less relevant than a voice match from 10 seconds ago.                          |
| **Bayesian updating**  | Confidence must be updated incrementally as new evidence arrives, not recomputed from scratch each time.                                                |
| **Prior bias**         | External metadata (candidate name) creates a strong prior. The system must balance this prior against observed evidence without anchoring too strongly. |
| **Adversarial inputs** | A fraudulent candidate may deliberately use a misleading display name to confuse the identification system.                                             |

### 1.6 Failure Scenarios

| Scenario                               | Impact                                  | Mitigation                                            |
| -------------------------------------- | --------------------------------------- | ----------------------------------------------------- |
| Redis goes down                        | All event routing stops                 | Circuit breaker + in-memory fallback queue            |
| Gemini API timeout                     | Conversation analysis fails             | Async processing + graceful degradation to heuristics |
| All participants have generic names    | Name matching produces no signal        | Fall back to behavioral + audio signals               |
| Candidate never turns on webcam        | Video engine produces no evidence       | System must not require video evidence                |
| Interviewer speaks more than candidate | Audio duration heuristic inverts        | Use transcript content analysis, not just duration    |
| Two participants have the same name    | Name matching produces ambiguous signal | Disambiguate using audio/video/behavioral signals     |
| Database unavailable                   | Cannot persist evidence                 | Write-ahead to Redis, replay into DB on recovery      |

---

## Phase 2: System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MEETING PLATFORM                          │
│              (Zoom / Google Meet / Teams)                    │
└──────────────────────────┬──────────────────────────────────┘
                           │ Webhooks / Bot Events
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   INGESTION LAYER                            │
│  ┌─────────────┐  ┌────────────────┐  ┌──────────────────┐ │
│  │   Meeting    │  │    Event       │  │    Session       │ │
│  │   Adapter    │→ │  Normalizer    │→ │    Manager       │ │
│  └─────────────┘  └────────────────┘  └──────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │ NormalizedEvent (Redis)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  INTELLIGENCE LAYER                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ Metadata │ │  Audio   │ │  Video   │ │ Conver-  │      │
│  │ Engine   │ │  Engine  │ │  Engine  │ │ sation   │      │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘      │
│       │            │            │            │              │
│  ┌────┴────┐ ┌─────┴────┐ ┌────┴─────┐ ┌───┴──────┐      │
│  │Behavior │ │ Temporal  │ │          │ │          │      │
│  │ Engine  │ │  Engine   │ │          │ │          │      │
│  └────┬────┘ └────┬──────┘ └──────────┘ └──────────┘      │
└───────┼───────────┼─────────────────────────────────────────┘
        │           │  EvidenceEvent (Redis)
        ▼           ▼
┌─────────────────────────────────────────────────────────────┐
│                   REASONING LAYER                            │
│  ┌──────────────┐  ┌────────────────┐  ┌─────────────────┐ │
│  │   Evidence    │  │   Confidence   │  │  Explainability │ │
│  │   Aggregator  │→ │    Engine      │→ │     Engine      │ │
│  └──────────────┘  └────────────────┘  └─────────────────┘ │
│                         │                                    │
│                    ┌────┴─────┐                              │
│                    │ Decision │                              │
│                    │  Engine  │                              │
│                    └────┬─────┘                              │
└─────────────────────────┼───────────────────────────────────┘
                          │ StateUpdateEvent (Redis)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   DELIVERY LAYER                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Notification │  │  Persistence │  │   Evaluation     │   │
│  │   Server     │  │    Service   │  │    Engine        │   │
│  └──────┬──────┘  └──────────────┘  └──────────────────┘   │
└─────────┼───────────────────────────────────────────────────┘
          │ WebSocket
          ▼
┌─────────────────────────────────────────────────────────────┐
│                   PRESENTATION LAYER                         │
│           Next.js Dashboard + Admin Panel                    │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Service Communication

All inter-service communication flows through **Redis Pub/Sub** channels with strict contracts:

| Channel Pattern                 | Producer             | Consumer(s)                      | Payload            |
| ------------------------------- | -------------------- | -------------------------------- | ------------------ |
| `session.events.{sessionId}`    | Meeting Adapter      | Session Manager, all Engines     | `NormalizedEvent`  |
| `evidence.events.{sessionId}`   | Intelligence Engines | Evidence Aggregator              | `EvidenceEvent`    |
| `confidence.events.{sessionId}` | Confidence Engine    | Decision Engine, Notification    | `ConfidenceUpdate` |
| `state.events.{sessionId}`      | Decision Engine      | Notification Server, Persistence | `StateUpdateEvent` |
| `system.events`                 | All services         | Monitoring                       | `SystemEvent`      |

### 2.3 Event Flow (Request Lifecycle)

```
1. Meeting bot sends webhook → Gateway receives HTTP POST
2. Gateway validates against Zod schema → publishes NormalizedEvent to Redis
3. Session Manager creates/updates session state
4. Intelligence Engines each independently consume NormalizedEvent:
   a. Metadata Engine → name matching, role inference → EvidenceEvent
   b. Audio Engine → speaker identification, duration analysis → EvidenceEvent
   c. Video Engine → face matching, deepfake signals → EvidenceEvent
   d. Conversation Engine → LLM transcript analysis → EvidenceEvent
   e. Behavioral Engine → interaction pattern analysis → EvidenceEvent
   f. Temporal Engine → timing pattern analysis → EvidenceEvent
5. Evidence Aggregator collects all EvidenceEvents for the session
6. Confidence Engine computes weighted aggregate with temporal decay
7. Explainability Engine generates human-readable explanation chain
8. Decision Engine determines session state transition
9. Notification Server broadcasts StateUpdateEvent via WebSocket
10. Dashboard renders real-time update
11. Persistence Service writes evidence + state to PostgreSQL
```

### 2.4 Data Flow

```
External Metadata (calendar, email) ─┐
                                      ├─→ Session Context
Meeting Events (join, leave, etc.) ───┘
                                      │
                            ┌─────────▼──────────┐
                            │  Normalized Events  │
                            └─────────┬──────────┘
                                      │
                    ┌─────────┬───────┼───────┬─────────┐
                    ▼         ▼       ▼       ▼         ▼
               Metadata   Audio   Video  Conver-   Behavioral
               Evidence  Evidence Evidence sation   Evidence
                    │         │       │   Evidence      │
                    └─────────┴───────┼───────┴─────────┘
                                      │
                            ┌─────────▼──────────┐
                            │  Evidence Store     │
                            │  (append-only)      │
                            └─────────┬──────────┘
                                      │
                            ┌─────────▼──────────┐
                            │  Confidence State   │
                            │  (per participant)  │
                            └─────────┬──────────┘
                                      │
                            ┌─────────▼──────────┐
                            │  Session State      │
                            │  Machine            │
                            └─────────┬──────────┘
                                      │
                       ┌──────────────┼──────────────┐
                       ▼              ▼              ▼
                  WebSocket      PostgreSQL       Audit Log
                  (real-time)    (persistence)    (compliance)
```

---

## Phase 3: Module Design

### 3.1 Meeting Adapter

| Aspect                   | Detail                                                                                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Purpose**              | Normalize platform-specific webhook payloads into a unified internal event format                                                                                              |
| **Responsibilities**     | Accept HTTP webhooks, validate signatures, transform platform schemas, emit `NormalizedEvent`                                                                                  |
| **Inputs**               | Raw webhook payloads from Zoom, Google Meet, Microsoft Teams                                                                                                                   |
| **Outputs**              | `NormalizedEvent` published to `session.events.{sessionId}`                                                                                                                    |
| **Internal Logic**       | Strategy pattern: one adapter per platform. Each adapter maps platform-specific fields to the internal schema. Unknown platforms are rejected with 400.                        |
| **Failure Handling**     | Invalid payloads → 400 Bad Request with structured error. Webhook signature mismatch → 401. Redis publish failure → retry 3x with exponential backoff, then dead-letter queue. |
| **Scalability**          | Stateless. Horizontally scalable behind a load balancer.                                                                                                                       |
| **Future Extensibility** | New meeting platforms require only a new adapter implementation conforming to the `MeetingAdapterInterface`. Zero changes to downstream services.                              |

### 3.2 Event Normalizer

| Aspect                   | Detail                                                                                                                                               |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**              | Enrich raw events with correlation metadata (request ID, timestamp normalization, deduplication)                                                     |
| **Responsibilities**     | Assign UUIDs, normalize timestamps to UTC milliseconds, detect and discard duplicate events, attach session context                                  |
| **Inputs**               | Raw validated event from Meeting Adapter                                                                                                             |
| **Outputs**              | `NormalizedEvent` with enriched metadata                                                                                                             |
| **Internal Logic**       | Idempotency check via event ID in Redis SET. Timestamp normalization handles timezone differences. Attaches `correlationId` for distributed tracing. |
| **Failure Handling**     | Duplicate events silently discarded (idempotent). Clock skew > 30 seconds triggers a warning log.                                                    |
| **Scalability**          | Stateless except for the Redis idempotency SET (TTL: 1 hour).                                                                                        |
| **Future Extensibility** | Can add schema versioning transformers for backward compatibility.                                                                                   |

### 3.3 Session Manager

| Aspect                   | Detail                                                                                                                                                                                                                                                                                                                |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**              | Manage the lifecycle of interview sessions and maintain participant rosters                                                                                                                                                                                                                                           |
| **Responsibilities**     | Create sessions, track participants, manage session state machine (CREATED → ACTIVE → COMPLETED → ARCHIVED), handle reconnections                                                                                                                                                                                     |
| **Inputs**               | `NormalizedEvent` (JOIN, LEAVE, session metadata)                                                                                                                                                                                                                                                                     |
| **Outputs**              | Session context available to all engines via Redis HASH                                                                                                                                                                                                                                                               |
| **Internal Logic**       | Session state stored in Redis HASH (`session:{id}`). Participant roster in Redis SET. External metadata (candidate name, email, interviewer names) loaded from calendar integration or API input and stored as session context. Reconnection detection via participant fingerprinting (name + user agent similarity). |
| **Failure Handling**     | Session not found → auto-create with CREATED state. Stale sessions (no events for 2 hours) → auto-transition to COMPLETED.                                                                                                                                                                                            |
| **Scalability**          | Redis-backed. Each session is an independent key space. No cross-session state.                                                                                                                                                                                                                                       |
| **Future Extensibility** | Can add session templates for different interview formats (panel, 1:1, group).                                                                                                                                                                                                                                        |

### 3.4 Metadata Intelligence Engine

| Aspect                   | Detail                                                                                                                                                                                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**              | Generate evidence from participant metadata (display name, email, join timing)                                                                                                                                                                                                              |
| **Responsibilities**     | Name matching against known candidate/interviewer names, role inference from display name patterns, join order analysis                                                                                                                                                                     |
| **Inputs**               | `NormalizedEvent` + Session Context (candidate name, interviewer names)                                                                                                                                                                                                                     |
| **Outputs**              | `EvidenceEvent` with source `METADATA`                                                                                                                                                                                                                                                      |
| **Internal Logic**       | Fuzzy string matching (Levenshtein distance) between display name and known names. Pattern matching for device names ("MacBook Pro", "iPhone"). Join order heuristic (candidate typically joins after interviewer). Role inference from name patterns ("HR - Sarah", "[Interviewer] John"). |
| **Failure Handling**     | No metadata match → emit neutral evidence (score: 0, weight: 0.1). Missing candidate name → skip name matching, rely on other heuristics.                                                                                                                                                   |
| **Scalability**          | CPU-bound but lightweight. No external API calls.                                                                                                                                                                                                                                           |
| **Future Extensibility** | Can add email domain matching, organization directory lookup, historical name correlation.                                                                                                                                                                                                  |

### 3.5 Conversation Intelligence Engine

| Aspect                   | Detail                                                                                                                                                                                                                                                                                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**              | Analyze speaker-attributed transcripts to infer participant roles                                                                                                                                                                                                                                                                                     |
| **Responsibilities**     | Determine who is asking vs. answering questions, detect interview-specific language patterns, identify candidate self-introductions                                                                                                                                                                                                                   |
| **Inputs**               | `NormalizedEvent` of type TRANSCRIPT + Session Context                                                                                                                                                                                                                                                                                                |
| **Outputs**              | `EvidenceEvent` with source `CONVERSATION`                                                                                                                                                                                                                                                                                                            |
| **Internal Logic**       | LLM-based analysis using Gemini: prompt includes transcript segment + session context. The LLM is asked to classify the speaker's role (interviewer/candidate/observer) with confidence and reasoning. Response is parsed into an `EvidenceEvent`. Heuristic fallback: question detection (sentences ending in "?") correlates with interviewer role. |
| **Failure Handling**     | LLM timeout (> 5 seconds) → fall back to regex-based question detection. LLM returns invalid format → log error, emit no evidence. LLM rate limit → exponential backoff with jitter.                                                                                                                                                                  |
| **Scalability**          | LLM calls are the bottleneck. Use async processing with configurable concurrency limit. Batch short transcript segments.                                                                                                                                                                                                                              |
| **Future Extensibility** | Can add fine-tuned models for interview detection, speaker diarization integration, sentiment analysis.                                                                                                                                                                                                                                               |

### 3.6 Audio Intelligence Engine

| Aspect                   | Detail                                                                                                                                                                                                                                                                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**              | Analyze audio signals to identify participant roles                                                                                                                                                                                                                                                                     |
| **Responsibilities**     | Track speaking duration per participant, detect speaking patterns (interviewer asks short questions, candidate gives long answers), voice fingerprinting                                                                                                                                                                |
| **Inputs**               | `NormalizedEvent` with audio metadata (speaking activity, duration)                                                                                                                                                                                                                                                     |
| **Outputs**              | `EvidenceEvent` with source `AUDIO`                                                                                                                                                                                                                                                                                     |
| **Internal Logic**       | Speaking ratio analysis: in a typical interview, the candidate speaks 60–70% of the time. The participant with the highest cumulative speaking duration after the first 5 minutes is likely the candidate. Speaking pattern analysis: short utterances followed by long responses suggest interviewer → candidate pair. |
| **Failure Handling**     | No audio data → emit no evidence. All participants have similar speaking duration → emit low-confidence evidence.                                                                                                                                                                                                       |
| **Scalability**          | Lightweight computation. No external API calls.                                                                                                                                                                                                                                                                         |
| **Future Extensibility** | Can add voice embedding comparison with reference recordings, accent detection, voice cloning detection signals.                                                                                                                                                                                                        |

### 3.7 Video Intelligence Engine

| Aspect                   | Detail                                                                                                                                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**              | Analyze video signals to identify participant roles                                                                                                                                                                                               |
| **Responsibilities**     | Track webcam state per participant, face detection and matching, environment analysis                                                                                                                                                             |
| **Inputs**               | `NormalizedEvent` with video metadata (webcam on/off, frame analysis results)                                                                                                                                                                     |
| **Outputs**              | `EvidenceEvent` with source `VIDEO`                                                                                                                                                                                                               |
| **Internal Logic**       | Webcam state tracking: candidate typically has webcam on throughout. Face matching: compare detected face against reference photo from candidate profile (if available). Environment heuristic: professional background vs. home office patterns. |
| **Failure Handling**     | Webcam off → emit neutral evidence. Face detection fails → fall back to webcam state tracking only. No reference photo → skip face matching.                                                                                                      |
| **Scalability**          | Frame analysis is CPU-intensive. Use dedicated worker pool with configurable concurrency.                                                                                                                                                         |
| **Future Extensibility** | Can add lip-sync analysis, deepfake detection signals, gaze tracking for attention analysis.                                                                                                                                                      |

### 3.8 Behavioral Intelligence Engine

| Aspect                   | Detail                                                                                                                                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**              | Analyze interaction patterns to distinguish candidate from non-candidate                                                                                                                                                                          |
| **Responsibilities**     | Track screen sharing behavior, reaction patterns, chat participation, mute/unmute patterns                                                                                                                                                        |
| **Inputs**               | `NormalizedEvent` for interaction events + Participant Timeline                                                                                                                                                                                   |
| **Outputs**              | `EvidenceEvent` with source `BEHAVIORAL`                                                                                                                                                                                                          |
| **Internal Logic**       | Screen share heuristic: candidate doing a coding interview will share screen; interviewer typically doesn't. Reaction analysis: passive observers tend to mute and not react. Chat analysis: candidates rarely use chat except for sharing links. |
| **Failure Handling**     | Insufficient behavioral data → emit no evidence. Contradictory patterns → emit low-confidence evidence with explanation.                                                                                                                          |
| **Scalability**          | Stateful per session (needs participant timeline). State stored in Redis.                                                                                                                                                                         |
| **Future Extensibility** | Can add mouse/keyboard activity analysis (for coding interviews), eye tracking, tab switching detection.                                                                                                                                          |

### 3.9 Temporal Intelligence Engine

| Aspect                   | Detail                                                                                                                                                                                                                                                                        |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**              | Analyze timing patterns across the session to refine identification                                                                                                                                                                                                           |
| **Responsibilities**     | Track evidence arrival rates, detect confidence plateau, identify phase transitions (warm-up → technical → closing)                                                                                                                                                           |
| **Inputs**               | Evidence history for the session                                                                                                                                                                                                                                              |
| **Outputs**              | `EvidenceEvent` with source `TEMPORAL`                                                                                                                                                                                                                                        |
| **Internal Logic**       | Confidence velocity: if confidence is rising rapidly, increase temporal weight of recent evidence. Plateau detection: if confidence hasn't changed significantly in 5 minutes, the system is likely stable. Phase detection: interview phases have different signal profiles. |
| **Failure Handling**     | Insufficient evidence history → emit no temporal evidence until minimum threshold (5 events).                                                                                                                                                                                 |
| **Scalability**          | Reads from evidence store. Lightweight computation.                                                                                                                                                                                                                           |
| **Future Extensibility** | Can add anomaly detection (sudden confidence drop), session pacing analysis, optimal identification time prediction.                                                                                                                                                          |

### 3.10 Evidence Engine (Aggregator)

| Aspect                   | Detail                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Purpose**              | Collect, validate, store, and aggregate evidence from all intelligence engines                                                                                                                                                                                                                                                                                                             |
| **Responsibilities**     | Validate evidence schema, apply evidence weights, store in append-only log, compute aggregate scores per participant                                                                                                                                                                                                                                                                       |
| **Inputs**               | `EvidenceEvent` from all intelligence engines                                                                                                                                                                                                                                                                                                                                              |
| **Outputs**              | Aggregated evidence summary per participant → `ConfidenceUpdate`                                                                                                                                                                                                                                                                                                                           |
| **Internal Logic**       | Evidence is immutable once stored. Aggregation uses weighted averaging with temporal decay: `score = Σ(evidence_i.score × evidence_i.weight × decay(age_i)) / Σ(evidence_i.weight × decay(age_i))`. Decay function: `exp(-λ × age_in_seconds)` where λ is configurable per evidence source. Conflict detection: if two engines disagree by > 0.5 on the same participant, flag for review. |
| **Failure Handling**     | Invalid evidence → reject and log. Duplicate evidence (same ID) → idempotent discard.                                                                                                                                                                                                                                                                                                      |
| **Scalability**          | Append-only storage scales linearly. Aggregation is O(n) where n is evidence count per session.                                                                                                                                                                                                                                                                                            |
| **Future Extensibility** | Can add evidence pruning policies, confidence intervals, ensemble methods.                                                                                                                                                                                                                                                                                                                 |

### 3.11 Confidence Engine

| Aspect                   | Detail                                                                                                                      |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**              | Compute and maintain per-participant confidence scores                                                                      |
| **Responsibilities**     | Own the authoritative confidence state, apply Bayesian updating, manage confidence history                                  |
| **Inputs**               | Aggregated evidence summaries from Evidence Engine                                                                          |
| **Outputs**              | `ConfidenceUpdate` with per-participant scores                                                                              |
| **Internal Logic**       | Maintains a confidence distribution across all participants. Uses weighted Bayesian updating: `P(candidate_i                | evidence) ∝ P(evidence | candidate_i) × P(candidate_i)`. Prior: uniform (1/N) unless metadata provides a strong prior. Likelihood: derived from evidence scores. Confidence normalization ensures all participant scores sum to 1.0. |
| **Failure Handling**     | No evidence → maintain prior. All evidence contradictory → lower overall confidence, flag ambiguity.                        |
| **Scalability**          | Lightweight per-session computation. State in Redis HASH.                                                                   |
| **Future Extensibility** | Can add Monte Carlo simulation for confidence intervals, multi-hypothesis tracking, online learning from resolved sessions. |

### 3.12 Explainability Engine

| Aspect                   | Detail                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**              | Generate human-readable explanations for every confidence decision                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Responsibilities**     | Translate raw scores into narratives, build evidence chains, highlight key factors                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Inputs**               | `ConfidenceUpdate` + evidence history                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Outputs**              | `ExplanationChain` attached to `StateUpdateEvent`                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Internal Logic**       | Template-based explanation generation: "Participant X was identified as the candidate because: (1) display name 'John D.' closely matches expected candidate 'John Doe' [confidence: 0.8], (2) participant has spoken 65% of the time, consistent with candidate role [confidence: 0.7], (3) LLM analysis of transcript indicates this participant is answering interview questions [confidence: 0.9]." Explanation ranking: sort evidence by absolute contribution to final score. |
| **Failure Handling**     | Insufficient evidence → "Insufficient data to make a determination. Monitoring continues."                                                                                                                                                                                                                                                                                                                                                                                          |
| **Scalability**          | String generation is lightweight. No external dependencies.                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Future Extensibility** | Can add multi-language explanations, confidence interval visualization descriptions, counter-factual explanations ("if X hadn't happened, confidence would be Y").                                                                                                                                                                                                                                                                                                                  |

### 3.13 Decision Engine

| Aspect                   | Detail                                                                                                                                                                                                                                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**              | Make final session state transitions based on confidence thresholds                                                                                                                                                                                                                                                                               |
| **Responsibilities**     | Implement session state machine, apply configurable thresholds, emit state transitions                                                                                                                                                                                                                                                            |
| **Inputs**               | `ConfidenceUpdate` from Confidence Engine                                                                                                                                                                                                                                                                                                         |
| **Outputs**              | `StateUpdateEvent` published to `state.events.{sessionId}`                                                                                                                                                                                                                                                                                        |
| **Internal Logic**       | State machine: `PENDING → TENTATIVE → IDENTIFIED → CONFIRMED` with reverse transitions allowed. Thresholds (configurable): `TENTATIVE` at 0.6 confidence, `IDENTIFIED` at 0.8, `CONFIRMED` at 0.95 after sustained confidence for > 2 minutes. Hysteresis: state only drops if confidence falls below threshold minus 0.1 (prevents oscillation). |
| **Failure Handling**     | Ambiguous state (top two participants within 0.1 of each other) → remain in current state, flag AMBIGUOUS.                                                                                                                                                                                                                                        |
| **Scalability**          | Lightweight state machine. O(1) per update.                                                                                                                                                                                                                                                                                                       |
| **Future Extensibility** | Can add custom threshold profiles per organization, A/B testing of threshold configurations.                                                                                                                                                                                                                                                      |

### 3.14 Evaluation Engine

| Aspect                   | Detail                                                                                                                                                                                                                                                   |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**              | Measure system accuracy, latency, and calibration                                                                                                                                                                                                        |
| **Responsibilities**     | Compare predictions against ground truth, compute metrics, generate reports                                                                                                                                                                              |
| **Inputs**               | Session history + ground truth labels (post-interview)                                                                                                                                                                                                   |
| **Outputs**              | Evaluation metrics (accuracy, precision, recall, time-to-identification, calibration)                                                                                                                                                                    |
| **Internal Logic**       | Replay mode: re-process historical sessions with current engine configuration. A/B comparison: run two configurations side-by-side on the same session data. Calibration: bin predictions by confidence level and compare predicted vs. actual accuracy. |
| **Failure Handling**     | Missing ground truth → skip session in metrics, flag for manual labeling.                                                                                                                                                                                |
| **Scalability**          | Batch processing. Can run offline against archived sessions.                                                                                                                                                                                             |
| **Future Extensibility** | Can add continuous monitoring dashboards, automated regression detection, model selection.                                                                                                                                                               |

### 3.15 Participant Timeline

| Aspect                   | Detail                                                                                                                                                               |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**              | Maintain a chronological event history per participant                                                                                                               |
| **Responsibilities**     | Track all events for each participant in order, provide timeline queries                                                                                             |
| **Inputs**               | All `NormalizedEvent`s for a session                                                                                                                                 |
| **Outputs**              | Queryable timeline per participant                                                                                                                                   |
| **Internal Logic**       | Redis Sorted Set keyed by `timeline:{sessionId}:{participantId}`, scored by timestamp. Provides range queries: "all events for participant X in the last 5 minutes." |
| **Failure Handling**     | Out-of-order events → sorted set handles ordering automatically.                                                                                                     |
| **Scalability**          | Redis sorted set operations are O(log n).                                                                                                                            |
| **Future Extensibility** | Can add timeline compression for long sessions, cross-participant correlation views.                                                                                 |

---

## Phase 4: Data Model

### 4.1 Entity Relationship

```
Session (1) ──── (N) Participant
Session (1) ──── (N) NormalizedEvent
Session (1) ──── (N) EvidenceEvent
Session (1) ──── (N) ConfidenceSnapshot
Session (1) ──── (N) StateTransition
Participant (1) ── (N) EvidenceEvent
Participant (1) ── (N) ConfidenceSnapshot
```

### 4.2 PostgreSQL Schema

```sql
-- Sessions
CREATE TABLE sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id   VARCHAR(255) NOT NULL UNIQUE,
  status        VARCHAR(50) NOT NULL DEFAULT 'CREATED',
  candidate_name     VARCHAR(255),
  candidate_email    VARCHAR(255),
  interviewer_names  TEXT[],
  calendar_invite_id VARCHAR(255),
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);

-- Participants
CREATE TABLE participants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES sessions(id),
  external_id   VARCHAR(255) NOT NULL,
  display_name  VARCHAR(255),
  role          VARCHAR(50) DEFAULT 'UNKNOWN',
  joined_at     TIMESTAMPTZ NOT NULL,
  left_at       TIMESTAMPTZ,
  metadata      JSONB DEFAULT '{}',
  UNIQUE(session_id, external_id)
);

-- Normalized Events (append-only)
CREATE TABLE events (
  id            UUID PRIMARY KEY,
  session_id    UUID NOT NULL REFERENCES sessions(id),
  participant_id UUID NOT NULL REFERENCES participants(id),
  type          VARCHAR(50) NOT NULL,
  payload       JSONB NOT NULL,
  timestamp     TIMESTAMPTZ NOT NULL,
  correlation_id UUID NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Evidence (append-only, immutable)
CREATE TABLE evidence (
  id            UUID PRIMARY KEY,
  session_id    UUID NOT NULL REFERENCES sessions(id),
  participant_id UUID NOT NULL REFERENCES participants(id),
  engine_id     VARCHAR(50) NOT NULL,
  score         DECIMAL(4,3) NOT NULL CHECK (score >= -1.0 AND score <= 1.0),
  weight        DECIMAL(4,3) NOT NULL CHECK (weight >= 0.0 AND weight <= 1.0),
  confidence    DECIMAL(4,3),
  reason        TEXT NOT NULL,
  raw_data      JSONB DEFAULT '{}',
  timestamp     TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Confidence Snapshots (append-only)
CREATE TABLE confidence_snapshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES sessions(id),
  participant_id UUID NOT NULL REFERENCES participants(id),
  score         DECIMAL(4,3) NOT NULL CHECK (score >= 0.0 AND score <= 1.0),
  rank          INTEGER NOT NULL,
  evidence_count INTEGER NOT NULL,
  explanation   TEXT,
  timestamp     TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- State Transitions (audit log)
CREATE TABLE state_transitions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES sessions(id),
  from_state    VARCHAR(50) NOT NULL,
  to_state      VARCHAR(50) NOT NULL,
  trigger_evidence_id UUID REFERENCES evidence(id),
  explanation   TEXT NOT NULL,
  timestamp     TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 4.3 Indexes

```sql
CREATE INDEX idx_events_session_id ON events(session_id);
CREATE INDEX idx_events_participant_id ON events(participant_id);
CREATE INDEX idx_events_timestamp ON events(timestamp);
CREATE INDEX idx_evidence_session_id ON evidence(session_id);
CREATE INDEX idx_evidence_participant_id ON evidence(participant_id);
CREATE INDEX idx_evidence_engine_id ON evidence(engine_id);
CREATE INDEX idx_evidence_timestamp ON evidence(timestamp);
CREATE INDEX idx_confidence_session_participant ON confidence_snapshots(session_id, participant_id);
CREATE INDEX idx_confidence_timestamp ON confidence_snapshots(timestamp);
CREATE INDEX idx_state_transitions_session_id ON state_transitions(session_id);
```

### 4.4 Redis Usage

| Key Pattern                               | Type       | Purpose                                | TTL                       |
| ----------------------------------------- | ---------- | -------------------------------------- | ------------------------- |
| `session:{id}`                            | HASH       | Session state and metadata             | 24 hours after last event |
| `session:{id}:participants`               | SET        | Participant IDs in session             | Same as session           |
| `participant:{sessionId}:{participantId}` | HASH       | Participant metadata                   | Same as session           |
| `timeline:{sessionId}:{participantId}`    | SORTED SET | Event timeline                         | Same as session           |
| `evidence:{sessionId}`                    | LIST       | Evidence log (append-only)             | Same as session           |
| `confidence:{sessionId}`                  | HASH       | Current confidence per participant     | Same as session           |
| `idempotency:{eventId}`                   | STRING     | Deduplication marker                   | 1 hour                    |
| `lock:session:{id}`                       | STRING     | Distributed lock for state transitions | 30 seconds                |

### 4.5 Caching Strategy

- **Hot data (Redis):** Active session state, participant rosters, recent evidence, current confidence scores
- **Warm data (PostgreSQL):** Complete session history, all evidence, confidence snapshots, audit logs
- **Cold data (Cloudflare R2):** Archived session replays, audio/video recordings, large payloads

### 4.6 Session Lifecycle

```
CREATED → ACTIVE → COMPLETING → COMPLETED → ARCHIVED
   │         │          │
   └─ FAILED ←──────────┘ (on critical error)
```

- **CREATED:** Session registered, awaiting first participant event
- **ACTIVE:** At least one participant present, engines processing events
- **COMPLETING:** Interview ending signal received, finalizing confidence
- **COMPLETED:** Final identification determined, evidence persisted
- **ARCHIVED:** Session data moved to cold storage (R2), Redis keys evicted

---

## Phase 5: AI Reasoning Pipeline

### 5.1 Evidence Generation

Each intelligence engine operates independently and asynchronously. When a `NormalizedEvent` arrives, every engine evaluates it and optionally produces an `EvidenceEvent`.

Evidence structure:

```typescript
{
  id: UUID,
  sessionId: string,
  participantId: string,
  engineId: 'METADATA' | 'CONVERSATION' | 'AUDIO' | 'VIDEO' | 'BEHAVIORAL' | 'TEMPORAL',
  score: number,     // [-1.0, 1.0] where 1.0 = "definitely the candidate"
  weight: number,    // [0.0, 1.0] engine's self-assessed confidence in this evidence
  confidence: number, // [0.0, 1.0] calibrated confidence
  reason: string,    // Human-readable explanation
  timestamp: number
}
```

### 5.2 Evidence Weighting

Weights are determined by two factors:

1. **Engine base weight** (configurable): Metadata (0.3), Audio (0.7), Video (0.6), Conversation (0.8), Behavioral (0.4), Temporal (0.3)
2. **Self-assessed weight** (per evidence): Each engine assesses how confident it is in this specific piece of evidence. A strong name match gets weight 0.9; a weak pattern match gets weight 0.2.

Final weight = `engine_base_weight × self_assessed_weight`

### 5.3 Confidence Evolution

Confidence evolves using weighted exponential decay aggregation:

```
For each participant p:
  confidence(p) = Σ_i [ score_i × weight_i × decay(age_i) ] / Σ_i [ weight_i × decay(age_i) ]

Where:
  decay(age) = exp(-λ × age_in_seconds)
  λ = decay_rate (configurable per engine, default: 0.01)
```

The confidence distribution is then normalized across all participants so scores sum to 1.0:

```
normalized_confidence(p) = confidence(p) / Σ_j confidence(j)
```

### 5.4 Ambiguity Handling

The system explicitly handles ambiguity rather than forcing a decision:

- **High ambiguity** (top two participants within 0.15): State remains PENDING, explanation says "Cannot distinguish between X and Y"
- **Moderate ambiguity** (gap 0.15–0.30): State moves to TENTATIVE with a note
- **Low ambiguity** (gap > 0.30): State moves to IDENTIFIED
- **Extreme confidence** (gap > 0.50 sustained for 2+ minutes): CONFIRMED

### 5.5 Evidence Expiration

Evidence doesn't expire—it decays. The temporal decay function ensures:

- Evidence from 1 minute ago retains ~55% of its weight (λ=0.01)
- Evidence from 5 minutes ago retains ~5% of its weight
- Evidence from 10+ minutes ago contributes negligibly

This means the system naturally "forgets" stale signals without discarding them.

### 5.6 Explanation Generation

Explanations are constructed by:

1. Ranking all active evidence by absolute contribution to the final score
2. Selecting the top 3–5 contributing factors
3. Formatting each as: "[Engine] [reason] (contribution: X%)"
4. Combining into a narrative with the overall confidence

Example:

> "Participant 'John D.' identified as candidate with 87% confidence. Key factors: (1) Display name closely matches expected candidate 'John Doe' [Metadata, 25%], (2) Transcript analysis shows this participant is answering interview questions [Conversation, 40%], (3) Participant has spoken for 68% of total audio time [Audio, 20%]."

### 5.7 Adding Future ML Models

The architecture supports adding new models without structural changes:

1. Create a new engine class implementing `IntelligenceEngine` interface
2. Register it in the engine registry
3. Configure its base weight
4. It automatically receives `NormalizedEvent`s and produces `EvidenceEvent`s

No changes to the Evidence Aggregator, Confidence Engine, or any downstream service.

---

## Phase 6: Frontend Design

### 6.1 Dashboard Layout

The dashboard uses a three-panel layout:

```
┌──────────────────────────────────────────────────────────────┐
│  Header: Sherlock CIE │ Session: ABC-123 │ ● Connected      │
├──────────────┬───────────────────────────┬───────────────────┤
│              │                           │                   │
│  Participant │    Confidence Graph        │   Evidence        │
│  Cards       │    (real-time line chart)  │   Timeline        │
│              │                           │                   │
│  ┌────────┐  │   1.0 ─── John ───────    │   ▸ 09:01 META   │
│  │ John D │  │   0.8 ─── ─── ───────    │   ▸ 09:02 AUDIO  │
│  │ ★ 87%  │  │   0.6 ───────────────    │   ▸ 09:03 CONV   │
│  │ Candi- │  │   0.4 ── Sarah ──────    │   ▸ 09:04 VIDEO  │
│  │  date  │  │   0.2 ── Bob ────────    │   ▸ 09:05 META   │
│  └────────┘  │   0.0 ──────────────→    │                   │
│              │        Time               │                   │
│  ┌────────┐  │                           │                   │
│  │ Sarah  │  ├───────────────────────────┤                   │
│  │  12%   │  │  Explanation Panel        │                   │
│  │ Inter- │  │  "John D. identified as   │                   │
│  │ viewer │  │   candidate because..."   │                   │
│  └────────┘  │                           │                   │
│              │                           │                   │
├──────────────┴───────────────────────────┴───────────────────┤
│  Footer: System Health │ Latency: 45ms │ Events: 142        │
└──────────────────────────────────────────────────────────────┘
```

### 6.2 Screens

| Screen             | Purpose                                | Key Components                                                            |
| ------------------ | -------------------------------------- | ------------------------------------------------------------------------- |
| **Live Dashboard** | Real-time monitoring of active session | Participant cards, confidence graph, evidence timeline, explanation panel |
| **Session List**   | Browse all sessions                    | Filterable table, status badges, quick metrics                            |
| **Session Replay** | Review completed sessions              | Playback controls, timeline scrubber, evidence replay                     |
| **Admin Settings** | Configure engine weights, thresholds   | Weight sliders, threshold inputs, engine toggles                          |
| **System Health**  | Monitor infrastructure                 | Service status, latency graphs, error rates                               |

### 6.3 Component Hierarchy

```
App
├── Layout
│   ├── Header (session selector, connection status)
│   └── Footer (system metrics)
├── LiveDashboard
│   ├── ParticipantCardList
│   │   └── ParticipantCard (name, role, confidence, status indicator)
│   ├── ConfidenceGraph (real-time line chart per participant)
│   ├── EvidenceTimeline (chronological evidence entries)
│   ├── ExplanationPanel (current explanation chain)
│   └── SessionInfo (metadata, duration, event count)
├── SessionList
│   ├── SessionTable
│   └── SessionFilters
├── SessionReplay
│   ├── ReplayControls (play, pause, speed, scrubber)
│   ├── ReplayDashboard (same as LiveDashboard but driven by replay data)
│   └── ReplayTimeline
└── AdminPanel
    ├── EngineConfig
    ├── ThresholdConfig
    └── SystemHealth
```

### 6.4 State Management

- **WebSocket state:** Managed by a custom `useSocket` hook connected to the Notification Server
- **Session state:** React context providing session metadata and participant roster
- **UI state:** Local component state for filters, selections, panel visibility
- **No global state library required** — WebSocket is the single source of truth for live data

### 6.5 Error & Loading States

| State                | Display                                                              |
| -------------------- | -------------------------------------------------------------------- |
| **Connecting**       | Pulsing connection indicator, "Connecting to Sherlock Engine..."     |
| **Disconnected**     | Red indicator, "Connection lost. Retrying..." with countdown         |
| **No session**       | Empty state with "Select or create a session to begin"               |
| **Waiting for data** | Skeleton UI with "Waiting for first participant..."                  |
| **Engine error**     | Yellow badge on affected engine card, tooltip with error detail      |
| **Session complete** | Green banner "Session completed. Candidate: [name] (confidence: X%)" |

---

## Phase 7: Deployment Design

### 7.1 Docker Architecture

```yaml
services:
  # Infrastructure
  postgres: # PostgreSQL 16
  redis: # Redis 7 Alpine

  # Backend Services
  gateway: # NestJS Gateway (port 3001)
  ai-engine: # FastAPI AI Engine (port 8000)
  notification: # NestJS Notification Server (port 3002)
  confidence: # Node.js Confidence Engine (internal)

  # Frontend
  web: # Next.js (port 3000)
```

### 7.2 Container Responsibilities

| Container      | Base Image           | Purpose                 | Resources          |
| -------------- | -------------------- | ----------------------- | ------------------ |
| `postgres`     | `postgres:16-alpine` | Persistent storage      | 512MB RAM, 1 CPU   |
| `redis`        | `redis:7-alpine`     | Pub/Sub + caching       | 256MB RAM, 0.5 CPU |
| `gateway`      | `node:20-alpine`     | HTTP ingestion          | 256MB RAM, 0.5 CPU |
| `ai-engine`    | `python:3.12-slim`   | Intelligence processing | 512MB RAM, 1 CPU   |
| `notification` | `node:20-alpine`     | WebSocket server        | 256MB RAM, 0.5 CPU |
| `confidence`   | `node:20-alpine`     | Reasoning engine        | 256MB RAM, 0.5 CPU |
| `web`          | `node:20-alpine`     | Frontend                | 256MB RAM, 0.5 CPU |

### 7.3 Environment Variables

```bash
# Database
DATABASE_URL=postgresql://sherlock:password@postgres:5432/sherlock

# Redis
REDIS_URL=redis://redis:6379

# AI
GEMINI_API_KEY=<key>
GEMINI_MODEL=gemini-2.5-pro

# Services
GATEWAY_PORT=3001
NOTIFICATION_PORT=3002
AI_ENGINE_PORT=8000
WEB_PORT=3000

# Feature Flags
ENABLE_VIDEO_ENGINE=true
ENABLE_AUDIO_ENGINE=true
ENABLE_CONVERSATION_ENGINE=true
ENABLE_BEHAVIORAL_ENGINE=true

# Confidence Thresholds
THRESHOLD_TENTATIVE=0.6
THRESHOLD_IDENTIFIED=0.8
THRESHOLD_CONFIRMED=0.95
DECAY_RATE=0.01
```

### 7.4 CI/CD (GitHub Actions)

```
on push to main:
  1. Lint (ESLint + Prettier check + mypy)
  2. Type check (tsc --noEmit)
  3. Unit tests (vitest + pytest)
  4. Build all services
  5. Docker build
  6. Integration tests
  7. Deploy to staging (Railway)
```

---

## Phase 8: Repository Design

### 8.1 Folder Structure

```
sherlock/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   └── deploy.yml
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   └── PULL_REQUEST_TEMPLATE.md
├── apps/
│   ├── web/                    # Next.js 15 frontend
│   │   ├── src/
│   │   │   ├── app/            # App router pages
│   │   │   ├── components/     # UI components
│   │   │   ├── hooks/          # Custom hooks
│   │   │   ├── lib/            # Utilities
│   │   │   └── types/          # TypeScript types
│   │   ├── public/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── gateway/                # NestJS Gateway
│   │   ├── src/
│   │   │   ├── adapters/       # Meeting platform adapters
│   │   │   ├── events/         # Event normalizer
│   │   │   ├── sessions/       # Session management
│   │   │   ├── health/         # Health checks
│   │   │   └── main.ts
│   │   ├── test/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── notification/           # NestJS Notification Server
│   │   ├── src/
│   │   │   ├── gateway/        # WebSocket gateway
│   │   │   ├── subscribers/    # Redis subscribers
│   │   │   └── main.ts
│   │   ├── test/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── ai-engine/              # FastAPI AI Service
│       ├── src/
│       │   ├── engines/        # Intelligence engines
│       │   │   ├── metadata.py
│       │   │   ├── conversation.py
│       │   │   ├── audio.py
│       │   │   ├── video.py
│       │   │   ├── behavioral.py
│       │   │   └── temporal.py
│       │   ├── core/           # Core logic
│       │   │   ├── evidence.py
│       │   │   ├── confidence.py
│       │   │   └── explainability.py
│       │   ├── schemas/        # Pydantic models
│       │   ├── worker/         # Redis subscriber worker
│       │   └── main.py
│       ├── tests/
│       ├── requirements.txt
│       └── pyproject.toml
├── packages/
│   ├── contracts/              # Shared Zod schemas
│   ├── database/               # Prisma schema + migrations
│   ├── redis-client/           # Shared Redis client
│   ├── eslint-config/          # Shared ESLint config
│   └── tsconfig/               # Shared TypeScript config
├── docker/
│   ├── gateway.Dockerfile
│   ├── notification.Dockerfile
│   ├── ai-engine.Dockerfile
│   └── web.Dockerfile
├── docs/
│   ├── TECHNICAL_DESIGN.md
│   ├── ENGINEERING_RULEBOOK.md
│   ├── CODING_STANDARDS.md
│   ├── DEVELOPMENT_WORKFLOW.md
│   ├── SPRINT_PLAN.md
│   ├── PROJECT_CHECKLIST.md
│   └── IMPLEMENTATION_ORDER.md
├── scripts/
│   ├── e2e-mock.ts             # E2E simulation script
│   └── seed.ts                 # Database seeding
├── .editorconfig
├── .env.example
├── .gitignore
├── .gitattributes
├── .prettierrc
├── docker-compose.yml
├── LICENSE
├── package.json
├── pnpm-workspace.yaml
├── README.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md
└── turbo.json
```

### 8.2 Naming Conventions

| Element            | Convention                              | Example                             |
| ------------------ | --------------------------------------- | ----------------------------------- |
| Files (TypeScript) | `kebab-case.ts`                         | `meeting-adapter.ts`                |
| Files (Python)     | `snake_case.py`                         | `metadata_engine.py`                |
| Classes            | `PascalCase`                            | `MetadataEngine`                    |
| Functions/methods  | `camelCase` (TS), `snake_case` (Python) | `processEvent()`, `process_event()` |
| Constants          | `UPPER_SNAKE_CASE`                      | `MAX_RETRY_COUNT`                   |
| Interfaces         | `PascalCase` (no I prefix)              | `IntelligenceEngine`                |
| Zod schemas        | `PascalCase` + `Schema` suffix          | `MeetingEventSchema`                |
| Redis channels     | `dot.separated.{variable}`              | `evidence.events.{sessionId}`       |
| Database tables    | `snake_case` (plural)                   | `confidence_snapshots`              |

### 8.3 Testing Strategy

| Layer               | Tool                     | Scope                              |
| ------------------- | ------------------------ | ---------------------------------- |
| Unit tests (TS)     | Vitest                   | Individual functions, engine logic |
| Unit tests (Python) | pytest                   | Engine logic, schema validation    |
| Integration tests   | Vitest + Supertest       | API endpoints, Redis pub/sub       |
| E2E tests           | Custom simulation script | Full pipeline end-to-end           |
| Type checking       | `tsc --noEmit` + mypy    | Static analysis                    |

---

## Phase 9: Evaluation Design

### 9.1 Metrics

| Metric                     | Definition                                                   | Target                         |
| -------------------------- | ------------------------------------------------------------ | ------------------------------ |
| **Accuracy**               | % of sessions where the correct candidate was identified     | > 90%                          |
| **Precision**              | Among identified candidates, % that were correct             | > 95%                          |
| **Recall**                 | Among actual candidates, % that were identified              | > 85%                          |
| **Time to Identification** | Seconds from first event to IDENTIFIED state                 | < 60s                          |
| **Confidence Calibration** | Correlation between predicted confidence and actual accuracy | > 0.85                         |
| **Event Latency**          | Time from webhook receipt to dashboard update                | < 500ms                        |
| **AI Inference Latency**   | Time for intelligence engine to produce evidence             | < 2s (LLM), < 50ms (heuristic) |

### 9.2 Edge Cases

| Edge Case                                                    | Expected Behavior                                                     |
| ------------------------------------------------------------ | --------------------------------------------------------------------- |
| Single participant (only candidate, no interviewer)          | Identify with high confidence based on metadata match                 |
| All participants have device names ("MacBook Pro", "iPhone") | Fall back to audio/video/conversation engines                         |
| Candidate never speaks                                       | Use metadata + video + behavioral signals only                        |
| Candidate joins, leaves, and rejoins                         | Detect reconnection, maintain identity continuity                     |
| Two participants have the same display name                  | Use audio/video to disambiguate                                       |
| Interviewer joins as "Candidate Name"                        | Cross-reference with calendar data, use conversation analysis         |
| 10+ participants (panel interview)                           | Scale confidence across all participants, likely identify 1 candidate |
| No external metadata provided                                | Infer roles entirely from behavioral signals                          |

### 9.3 Limitations

1. **No real meeting bot integration** — The prototype uses simulated webhook events rather than connecting to live Zoom/Meet/Teams sessions
2. **Audio/Video analysis is heuristic-based** — Production would require actual ML models for speaker identification and face recognition
3. **LLM dependency** — Conversation analysis requires Gemini API access; offline fallback is regex-based
4. **Single-node deployment** — The prototype runs on a single machine; production would require distributed deployment
5. **No authentication** — The prototype has no user authentication or authorization

### 9.4 Future Improvements

1. **Voice embedding model** — Replace speaking duration heuristic with actual speaker verification
2. **Face recognition** — Match candidate face against profile photo
3. **Online learning** — Use resolved sessions as training data to improve engine weights
4. **Confidence intervals** — Report confidence ranges, not point estimates
5. **Multi-language support** — Conversation engine currently assumes English
6. **Historical correlation** — Use past interview data for the same candidate
