# Sherlock CIE Architecture

The Continuous Identity Engine relies on a zero-trust, event-driven microservices architecture powered by Redis Pub/Sub.

```mermaid
graph TD
    %% Frontend Clients
    Client[Web UI / Video Client]

    %% Gateway
    subgraph "Ingestion Layer"
        Gateway[NestJS Gateway API]
    end

    %% Message Broker
    Redis[Redis Pub/Sub Broker]

    %% Intelligence Engine
    subgraph "Intelligence Layer (FastAPI)"
        Video[Video Heuristic Engine]
        Metadata[Metadata Engine]
        Conversation[Conversation Engine (Gemini)]
    end

    %% Reasoning Engine
    subgraph "Reasoning Layer"
        Confidence[Confidence Engine (TypeScript Shim)]
    end

    %% Notification Engine
    subgraph "Notification Layer"
        Notification[NestJS Notification Server]
    end

    %% Flow
    Client -- "HTTP POST Webhooks" --> Gateway
    Gateway -- "Publish `meeting.events.*`" --> Redis

    Redis -- "Subscribe `meeting.events.*`" --> Video
    Redis -- "Subscribe `meeting.events.*`" --> Metadata
    Redis -- "Subscribe `meeting.events.*`" --> Conversation

    Video -- "Publish `evidence.events.*`" --> Redis
    Metadata -- "Publish `evidence.events.*`" --> Redis
    Conversation -- "Publish `evidence.events.*`" --> Redis

    Redis -- "Subscribe `evidence.events.*`" --> Confidence
    
    Confidence -- "Publish `state.events.*`" --> Redis

    Redis -- "Subscribe `state.events.*`" --> Notification

    Notification -- "Broadcast via WebSockets" --> Client
```

## Data Flow Description

1. **Ingestion**: A client (or the mock simulation script) sends Webhook events (`JOIN`, `VIDEO_STATE_CHANGE`, `TRANSCRIPT`) to the **NestJS Gateway**. The Gateway strictly validates the schema using Zod contracts and publishes them to the `meeting.events.*` channels on Redis.
2. **Intelligence**: The **FastAPI AI Engine** consumes these meeting events and routes them to the appropriate heuristic engine. These engines generate a semantic score (from `-1.0` to `1.0`) and publish `EvidenceEvent`s back to Redis under `evidence.events.*`.
3. **Reasoning**: The **Confidence Engine** (originally Go, currently a TypeScript shim) aggregates all evidence for a specific session ID, applying an exponential temporal decay function to older evidence. It determines the state (`PENDING`, `VERIFIED`, `SUSPICIOUS`, `FAILED`) and publishes `StateUpdateEvent`s to `state.events.*`.
4. **Notification**: The **NestJS Notification Server** consumes state updates, verifies them against the Zod contract boundary, and broadcasts them via WebSockets to connected React UI clients, dynamically updating the dashboard in real-time.
