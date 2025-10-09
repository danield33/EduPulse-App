import os
import tempfile
from typing import Optional

import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.config import settings

router = APIRouter(tags=["tts"])

API_URL = "https://api.hume.ai/v0/tts/file"


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
async def synthesize_speech(request: TTSRequest):
    """
    Generate speech from text using Hume.ai TTS API.

    Args:
        request: TTS request containing text, voice description, and format

    Returns:
        Audio URL or base64-encoded audio data
    """
    api_key = os.getenv("HUME_API_KEY")
    print(os.environ)
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="HUME_API_KEY not configured",
        )

    payload = {
        "utterances": [{"text": request.text, "description": request.voice_description}],
        "format": {"type": request.format},
        "num_generations": 1,
    }

    try:
        response = requests.post(
            API_URL,
            headers={"X-Hume-Api-Key": api_key},
            json=payload,
            timeout=180,
        )

        if not response.ok:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Hume API error: {response.text[:500]}",
            )

        content_type = response.headers.get("Content-Type", "")

        # Handle JSON response with URL
        if "application/json" in content_type or "json" in content_type:
            data = response.json()
            gen = data["generations"][0]
            audio_url = gen["audio"]["url"]

            return TTSResponse(
                audio_url=audio_url,
                format=request.format,
                message="Speech synthesized successfully. Audio available via URL.",
            )

        # Handle direct audio bytes response
        else:
            import base64

            audio_base64 = base64.b64encode(response.content).decode("utf-8")

            return TTSResponse(
                audio_base64=audio_base64,
                format=request.format,
                message="Speech synthesized successfully. Audio encoded in base64.",
            )

    except requests.RequestException as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error communicating with Hume API: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error during speech synthesis: {str(e)}",
        )
