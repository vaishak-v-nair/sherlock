import uuid

from schemas import EngineSource, EvidenceEvent, MeetingEvent, MeetingEventType


async def process_video_event(event: MeetingEvent) -> EvidenceEvent | None:
    """
    Analyzes VIDEO_STATE_CHANGE and SCREEN_SHARE events for suspicious behavioral heuristics.
    """
    if event.type not in [MeetingEventType.VIDEO_STATE_CHANGE, MeetingEventType.SCREEN_SHARE]:
        return None

    if event.type == MeetingEventType.VIDEO_STATE_CHANGE:
        camera_on = event.payload.get("cameraOn", False)

        if camera_on:
            return EvidenceEvent(
                id=str(uuid.uuid4()),
                sessionId=event.sessionId,
                participantId=event.participantId,
                engineId=EngineSource.VIDEO,
                timestamp=event.timestamp,
                score=0.2,
                weight=0.3,
                reason="Camera turned on. Positive signal for engagement.",
            )
        else:
            return EvidenceEvent(
                id=str(uuid.uuid4()),
                sessionId=event.sessionId,
                participantId=event.participantId,
                engineId=EngineSource.VIDEO,
                timestamp=event.timestamp,
                score=-0.6,
                weight=0.7,
                reason="Camera turned off. Potential obfuscation tactic.",
            )

    if event.type == MeetingEventType.SCREEN_SHARE:
        sharing = event.payload.get("isSharing", False)
        if sharing:
            return EvidenceEvent(
                id=str(uuid.uuid4()),
                sessionId=event.sessionId,
                participantId=event.participantId,
                engineId=EngineSource.BEHAVIORAL,
                timestamp=event.timestamp,
                score=0.4,
                weight=0.5,
                reason="Participant is screen sharing, showing active participation.",
            )

    return None
