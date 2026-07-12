# Docker — Container Build Files

## Purpose

Dockerfiles for building production container images of each service.

## Files

- `gateway.Dockerfile` — NestJS Gateway service
- `notification.Dockerfile` — NestJS Notification service
- `ai-engine.Dockerfile` — FastAPI AI Engine
- `web.Dockerfile` — Next.js frontend

All Dockerfiles use multi-stage builds to minimize production image size.
