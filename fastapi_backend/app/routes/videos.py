import os
import shutil
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, Query
from fastapi.responses import FileResponse, StreamingResponse
from fastapi_pagination import Page, Params
from fastapi_pagination.ext.sqlalchemy import apaginate
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.config import settings
from app.database import User, get_async_session
from app.models import Video
from app.schemas import VideoRead
from app.users import current_active_user

router = APIRouter(tags=["videos"])

# Ensure video upload directory exists
VIDEO_DIR = Path(settings.VIDEO_UPLOAD_DIR)
VIDEO_DIR.mkdir(exist_ok=True)


def transform_videos(videos):
    return [VideoRead.model_validate(video) for video in videos]


@router.post("/upload", response_model=VideoRead)
async def upload_video(
    title: str = Form(...),
    description: str | None = Form(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    """Upload a video file to disk and save metadata to database"""

    # Validate file type
    if not file.content_type or not file.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="File must be a video")

    # Read file to check size
    file_content = await file.read()
    file_size = len(file_content)

    if file_size > settings.MAX_VIDEO_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds maximum allowed size of {settings.MAX_VIDEO_SIZE} bytes"
        )

    # Create unique filename
    file_extension = os.path.splitext(file.filename or "video.mp4")[1]
    unique_filename = f"{user.id}_{title.replace(' ', '_')}_{file.filename}"
    file_path = VIDEO_DIR / unique_filename

    # Save file to disk
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(file_content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save video: {str(e)}")

    # Create database record
    db_video = Video(
        title=title,
        description=description,
        filename=unique_filename,
        file_path=str(file_path),
        file_size=file_size,
        user_id=user.id
    )

    db.add(db_video)
    await db.commit()
    await db.refresh(db_video)

    return db_video


@router.get("/", response_model=Page[VideoRead])
async def list_videos(
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(10, ge=1, le=100, description="Page size"),
):
    """Get all videos for the authenticated user"""
    params = Params(page=page, size=size)
    query = select(Video).filter(Video.user_id == user.id).order_by(Video.created_at.desc())
    return await apaginate(db, query, params, transformer=transform_videos)


@router.get("/{video_id}", response_model=VideoRead)
async def get_video(
    video_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    """Get a specific video's metadata"""
    result = await db.execute(
        select(Video).filter(Video.id == video_id, Video.user_id == user.id)
    )
    video = result.scalars().first()

    if not video:
        raise HTTPException(status_code=404, detail="Video not found or not authorized")

    return video


@router.get("/{video_id}/stream")
async def stream_video(
    video_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    """Stream a video file"""
    result = await db.execute(
        select(Video).filter(Video.id == video_id, Video.user_id == user.id)
    )
    video = result.scalars().first()

    if not video:
        raise HTTPException(status_code=404, detail="Video not found or not authorized")

    file_path = Path(video.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Video file not found on disk")

    def iterfile():
        with open(file_path, mode="rb") as file_like:
            yield from file_like

    return StreamingResponse(
        iterfile(),
        media_type="video/mp4",
        headers={
            "Content-Disposition": f'inline; filename="{video.filename}"'
        }
    )


@router.delete("/{video_id}")
async def delete_video(
    video_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    """Delete a video and its file from disk"""
    result = await db.execute(
        select(Video).filter(Video.id == video_id, Video.user_id == user.id)
    )
    video = result.scalars().first()

    if not video:
        raise HTTPException(status_code=404, detail="Video not found or not authorized")

    # Delete file from disk
    file_path = Path(video.file_path)
    if file_path.exists():
        try:
            os.remove(file_path)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to delete video file: {str(e)}")

    # Delete database record
    await db.delete(video)
    await db.commit()

    return {"message": "Video successfully deleted"}
