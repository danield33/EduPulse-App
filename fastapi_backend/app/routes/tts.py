import os
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from hume import HumeClient
from hume.tts import PostedUtterance
from pydantic import BaseModel, Field

from app.database import User
from app.users import current_active_user

router = APIRouter(tags=["tts"])



class TTSRequest(BaseModel):
    text: str = Field(..., description="Text to synthesize into speech")
    voice_description: str = Field(
        ...,
        description="Description of the voice characteristics (e.g., 'warm female voice with slight accent')",
    )
    format: str = Field(
        default="mp3",
        description="Audio format: 'mp3' or 'wav'",
        pattern="^(mp3|wav)$",
    )


class TTSResponse(BaseModel):
    audio_url: Optional[str] = None
    audio_base64: Optional[str] = None
    format: str
    message: str


@router.post("/synthesize", response_model=TTSResponse)
async def synthesize_speech(
    request: TTSRequest,
    user: User = Depends(current_active_user),
) -> TTSResponse:

    """
    Generate speech from text using Hume.ai TTS API.

    - Ensures user is authenticated
    - Delegates to Hume TTS service for synthesis
    """

    if not user:
        raise HTTPException(status_code=401, detail="User not authenticated")

    # Call core synthesis logic
    return synthesize_with_hume(request)


def synthesize_with_hume(request: TTSRequest) -> TTSResponse:
    """
    Handles the actual Hume.ai TTS request and returns audio data or URL.
    """

    api_key = os.getenv("HUME_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="HUME_API_KEY not configured")

    client = HumeClient(api_key=api_key)
    result = client.tts.synthesize_json(
        utterances=[
            PostedUtterance(
                text=request.text,
                description=request.voice_description
            )
        ],
        num_generations=1,
        version="1"
    )

    return  TTSResponse(
                audio_url=result.generations[0].audio,
                format=request.format,
                message="Speech synthesized successfully. Audio available via URL.",
            )