import logging
import os
import uuid

from google import genai
from pydantic import BaseModel, Field

from schemas import EngineSource, EvidenceEvent, MeetingEvent, MeetingEventType

logger = logging.getLogger("conversation_engine")


# The schema we expect Gemini to return
class LLMScoreResponse(BaseModel):
    score: float = Field(
        ...,
        ge=-1.0,
        le=1.0,
        description="Score from -1.0 (imposter) to 1.0 (authentic candidate)",
    )
    weight: float = Field(..., ge=0.0, le=1.0, description="Confidence in this analysis snippet")
    reason: str = Field(..., description="Short explanation of why this score was given")


# Attempt to initialize Gemini client
api_key = os.environ.get("GEMINI_API_KEY")
client = None
if api_key:
    try:
        client = genai.Client(api_key=api_key)
    except Exception as e:
        logger.warning(f"Failed to initialize Gemini client: {e}")


SYSTEM_PROMPT = """
You are a technical forensic interviewer analyzing live meeting transcripts to determine if the
speaker is the expected candidate.
You are evaluating a candidate named "Alice" interviewing for a Senior Backend Engineering role.

Analyze the following transcript snippet.
Look for:
1. Deep technical understanding vs shallow buzzword usage.
2. Contextual consistency (do they sound like they know what they are talking about?)
3. Obfuscation tactics (e.g., repeating the question slowly, long suspicious pauses,
   generic answers).

Return a JSON object with:
- score (-1.0 to 1.0): -1.0 means highly suspicious/imposter. 1.0 means authentic expert.
- weight (0.0 to 1.0): How confident are you in this specific snippet? (Short greetings get low
  weight, deep technical answers get high weight).
- reason: A short string explaining your reasoning.
"""


async def process_conversation_event(event: MeetingEvent) -> EvidenceEvent | None:
    """
    Analyzes TRANSCRIPT events using Gemini to generate a semantic confidence score.
    """
    if event.type != MeetingEventType.TRANSCRIPT:
        return None

    text = event.payload.get("text", "")
    if not text.strip():
        return None

    # If Gemini is not configured, fallback to a deterministic mock
    if not client:
        return _mock_conversation_analysis(event, text)

    try:
        # Note: In a production async app, you would use client.aio.models.generate_content
        # but the standard SDK might block, so we would ideally wrap it in run_in_executor.
        # For this prototype, we'll use the standard synchronous call if aio is not available,
        # but we'll try to use the async client if possible.

        # Assuming google-genai supports async via aio:
        response = await client.aio.models.generate_content(
            model="gemini-3.1-pro",
            contents=text,
            config=genai.types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                response_mime_type="application/json",
                response_schema=LLMScoreResponse,
                temperature=0.1,
            ),
        )

        llm_response = response.parsed
        if not isinstance(llm_response, LLMScoreResponse):
            # Fallback if parsed fails
            import json

            data = json.loads(response.text)
            llm_response = LLMScoreResponse(**data)

        return EvidenceEvent(
            id=str(uuid.uuid4()),
            sessionId=event.sessionId,
            participantId=event.participantId,
            engineId=EngineSource.CONVERSATION,
            timestamp=event.timestamp,
            score=llm_response.score,
            weight=llm_response.weight,
            reason=llm_response.reason,
        )

    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        return _mock_conversation_analysis(event, text)


def _mock_conversation_analysis(event: MeetingEvent, text: str) -> EvidenceEvent:
    """
    Deterministic fallback for local testing without an API key.
    """
    text_lower = text.lower()

    # Mock heuristic: If they mention specific technical terms, they are authentic.
    good_keywords = ["kubernetes", "redis", "architecture", "microservices", "pubsub"]
    bad_keywords = ["um", "uh", "let me check", "can you repeat", "my internet"]

    score = 0.0
    weight = 0.5
    reason = "Neutral transcript snippet."

    if any(kw in text_lower for kw in good_keywords):
        score = 0.8
        weight = 0.8
        reason = "Candidate demonstrated deep technical knowledge in response."
    elif any(kw in text_lower for kw in bad_keywords):
        score = -0.6
        weight = 0.6
        reason = "Candidate showed hesitation or stalling tactics."

    return EvidenceEvent(
        id=str(uuid.uuid4()),
        sessionId=event.sessionId,
        participantId=event.participantId,
        engineId=EngineSource.CONVERSATION,
        timestamp=event.timestamp,
        score=score,
        weight=weight,
        reason=reason,
    )
