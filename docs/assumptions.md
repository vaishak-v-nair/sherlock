# System Assumptions

During the design and implementation of the Sherlock Continuous Identity Engine (CIE), several architectural and product assumptions were made to scope the prototype effectively:

## 1. Ingestion & Upstream Systems
- **Stream Separation:** We assume the upstream meeting bot (e.g., a Zoom or Google Meet headless client) handles the complex physical separation of audio and video streams for each participant.
- **Webhook Interface:** We assume these streams are converted into discrete events (e.g., `VIDEO_STATE_CHANGE`, `TRANSCRIPT`) and forwarded to our Gateway via standard HTTP POST webhooks.
- **Stable Identifiers:** We assume the meeting platform provides a stable, unique `participantId` for each connection, regardless of whether the user changes their display name mid-interview.

## 2. Intelligence & Latency
- **Asynchronous Analysis:** We assume that LLM-based transcript analysis (via Gemini) will take significantly longer (1-2 seconds) than simple metadata heuristics (50ms). Therefore, the system is entirely asynchronous; fast weak signals immediately update the UI, while slower semantic analysis refines the score upon completion.
- **Heuristic Sufficiency:** For the prototype demo, we assume deterministic heuristic mock engines provide a sufficient representation of the actual deepfake/voice-cloning models that will be plugged into the Python FastAPI layer in production.

## 3. UI & State Management
- **Stateless Frontend:** We assume the Next.js React Dashboard is ephemeral. It relies entirely on the NestJS WebSocket server to push the current state. If the browser is refreshed, it resets to `WAITING FOR DATA` until the next event arrives.
- **No Database Persistence for Demo:** While Prisma is initialized, we assume that for the real-time prototype evaluation, persisting every intermediate confidence tick to Postgres is not strictly necessary for the demo UI to function.

## 4. Environment
- **Native Bypassing:** Due to standard Docker/Go environment constraints encountered during development, we assume running the services via native Windows binaries (Node.js, Python, Redis) is an acceptable substitution for containerized deployment, provided the microservice boundaries remain completely intact.
