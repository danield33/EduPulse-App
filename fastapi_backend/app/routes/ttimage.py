
from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, Field
import os
import requests

router = APIRouter(tags=["ttimage"])

API_URL = "https://api.openai.com/v1/images/generations"


class TTImageRequest(BaseModel):
    prompt: str = Field(..., description="Text prompt for image generation")
    n: int = Field(..., description="Number of images to generate (max 1)")
    size: str = Field(
        default="1024x1024",
        description="Image size: '1024x1024', '512x512', or '256x256'",
        pattern="^(1024x1024|512x512|256x256)$",
    )

class DalleResponse(BaseModel):
    image_url: str

@router.post("/generateImage", response_model=DalleResponse)
async def generate_image(request: TTImageRequest):
    """
    Generate an image using DALL-E based on a text prompt.

    Args:
        request: Dalle request containing the prompt and desired image size.

    Returns:
        Image URL or image data
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="OPENAI_API_KEY not configured",
        )

    try:
        response = requests.post(
            API_URL,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            json={
                "prompt": request.prompt,
                "n": request.n,
                "size": request.size,
            },
            timeout=180,
        )

        if not response.ok:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"OpenAI API error: {response.text[:500]}",
            )

        data = response.json()
        image_url = data["data"][0]["url"]

        return DalleResponse(image_url=image_url)

    except requests.RequestException as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error communicating with OpenAI API: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error during image generation: {str(e)}",
        )


