import uuid

from schemas import EngineSource, EvidenceEvent, MeetingEvent, MeetingEventType


async def process_metadata_event(event: MeetingEvent) -> EvidenceEvent | None:
    """
    Analyzes JOIN events for suspicious display names.
    Returns an EvidenceEvent if a heuristic triggers, or None.
    """
    if event.type != MeetingEventType.JOIN:
        return None

    display_name = event.payload.get("initialDisplayName", "").lower()
    # Mocking the expected candidate's name that would ideally come from
    # Postgres or the Session context
    expected_name = "alice"

    # Heuristic 1: Exact match or contains expected name
    if expected_name in display_name:
        return EvidenceEvent(
            id=str(uuid.uuid4()),
            sessionId=event.sessionId,
            participantId=event.participantId,
            engineId=EngineSource.METADATA,
            timestamp=event.timestamp,
            score=0.5,  # Positive evidence, but not absolute proof
            weight=0.6,
            reason=f"Display name '{display_name}' matches expected candidate '{expected_name}'.",
        )

    # Heuristic 2: Suspicious placeholder names
    suspicious_names = ["ipad", "iphone", "zoom user", "guest"]
    if any(suspicious in display_name for suspicious in suspicious_names):
        return EvidenceEvent(
            id=str(uuid.uuid4()),
            sessionId=event.sessionId,
            participantId=event.participantId,
            engineId=EngineSource.METADATA,
            timestamp=event.timestamp,
            score=-0.2,  # Slightly negative, implies low-effort obfuscation or lazy join
            weight=0.4,
            reason=f"Generic display name detected: '{display_name}'.",
        )

    # Heuristic 3: Total mismatch
    return EvidenceEvent(
        id=str(uuid.uuid4()),
        sessionId=event.sessionId,
        participantId=event.participantId,
        engineId=EngineSource.METADATA,
        timestamp=event.timestamp,
        score=-0.8,  # Strong negative evidence
        weight=0.8,
        reason=f"Display name '{display_name}' does not match expected candidate.",
    )
