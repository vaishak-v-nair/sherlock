from enum import Enum
from typing import Any, Dict

from pydantic import BaseModel, Field


class MeetingEventType(str, Enum):
    JOIN = "JOIN"
    LEAVE = "LEAVE"
    TRANSCRIPT = "TRANSCRIPT"
    VIDEO_STATE_CHANGE = "VIDEO_STATE_CHANGE"
    SCREEN_SHARE = "SCREEN_SHARE"


class MeetingEvent(BaseModel):
    id: str
    sessionId: str
    participantId: str
    timestamp: int
    type: MeetingEventType
    payload: Dict[str, Any]


class EngineSource(str, Enum):
    METADATA = "METADATA"
    CONVERSATION = "CONVERSATION"
    AUDIO = "AUDIO"
    VIDEO = "VIDEO"
    BEHAVIORAL = "BEHAVIORAL"


class EvidenceEvent(BaseModel):
    id: str
    sessionId: str
    participantId: str
    engineId: EngineSource
    timestamp: int
    score: float = Field(..., ge=-1.0, le=1.0)
    weight: float = Field(..., ge=0.0, le=1.0)
    reason: str
