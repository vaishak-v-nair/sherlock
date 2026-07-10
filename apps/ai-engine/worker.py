import asyncio
import json
import logging

from engines.conversation import process_conversation_event
from engines.metadata import process_metadata_event
from engines.video import process_video_event
from redis_client import get_redis_pool
from schemas import EvidenceEvent, MeetingEvent

logger = logging.getLogger("worker")
logger.setLevel(logging.INFO)


async def start_redis_subscriber():
    """
    Subscribes to all meeting.events.* channels and processes incoming events.
    """
    redis_client = get_redis_pool()
    pubsub = redis_client.pubsub()

    # Subscribe to the pattern matching all meeting events
    await pubsub.psubscribe("meeting.events.*")

    logger.info("Started Redis Subscriber listening on 'meeting.events.*'")

    try:
        async for message in pubsub.listen():
            if message["type"] == "pmessage":
                try:
                    channel = message["channel"]
                    data = json.loads(message["data"])

                    # Validate the incoming data against our schema
                    event = MeetingEvent(**data)
                    logger.info(
                        f"Received valid event on {channel}: "
                        f"{event.type} for participant {event.participantId}"
                    )

                    # Route to intelligence engines
                    evidence_list: list[EvidenceEvent] = []

                    metadata_evidence = await process_metadata_event(event)
                    if metadata_evidence:
                        evidence_list.append(metadata_evidence)

                    video_evidence = await process_video_event(event)
                    if video_evidence:
                        evidence_list.append(video_evidence)

                    conversation_evidence = await process_conversation_event(event)
                    if conversation_evidence:
                        evidence_list.append(conversation_evidence)

                    # Publish evidence events back to Redis
                    for evidence in evidence_list:
                        publish_channel = f"evidence.events.{evidence.sessionId}"
                        await redis_client.publish(publish_channel, evidence.model_dump_json())
                        logger.info(
                            f"Published EvidenceEvent to {publish_channel} "
                            f"(Engine: {evidence.engineId}, Score: {evidence.score})"
                        )

                except json.JSONDecodeError:
                    logger.error("Failed to parse JSON payload")
                except Exception as e:
                    logger.error(f"Validation or processing error: {str(e)}")

    except asyncio.CancelledError:
        logger.info("Redis Subscriber cancelled. Shutting down...")
    finally:
        await pubsub.punsubscribe("meeting.events.*")
