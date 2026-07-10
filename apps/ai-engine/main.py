import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from worker import start_redis_subscriber

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai-engine")

# Store the background task reference so it doesn't get garbage collected
background_tasks = set()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up AI Engine...")

    # Start the Redis subscriber as a background asyncio task
    subscriber_task = asyncio.create_task(start_redis_subscriber())
    subscriber_task.add_done_callback(lambda t: logger.error(f"Task failed: {t.exception()}") if t.exception() else None)
    background_tasks.add(subscriber_task)

    yield

    logger.info("Shutting down AI Engine...")
    # Cancel the subscriber task gracefully
    subscriber_task.cancel()
    try:
        await subscriber_task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="Sherlock Candidate Identity Engine - AI Workers",
    description="FastAPI service running intelligence engines and background tasks.",
    lifespan=lifespan,
)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "ai-engine"}
