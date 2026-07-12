# ─── Stage 1: Dependencies ──────────────────────────────────
FROM python:3.12-slim AS deps
WORKDIR /app

COPY apps/ai-engine/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# ─── Stage 2: Production ────────────────────────────────────
FROM python:3.12-slim AS runner
WORKDIR /app

COPY --from=deps /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=deps /usr/local/bin /usr/local/bin

COPY apps/ai-engine/ ./

ENV PYTHONUNBUFFERED=1
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
