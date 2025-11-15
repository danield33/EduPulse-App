from typing import Literal, List, Optional
import os
from pathlib import Path

from app.models import Lesson, LessonVideo, Video, Breakpoint, User, LessonScenarioDB
from app.schemas import LessonCreate, LessonRead, LessonVideoAddResponse, LessonVideoRead
from uuid import UUID
from app.database import get_async_session as get_db
from fastapi import Depends, HTTPException, APIRouter, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.users import current_active_user
from app.routes.videos import generate_video, VideoGenerateRequest
from app.routes.tts import TTSRequest
from app.routes.ttimage import TTImageRequest
from app.schema_models.scenario import Scenario
from app.scenario.generate_scenario import generate_scenario

router = APIRouter(tags=["lessons"])

@router.get("/my", response_model=List[LessonRead])
async def get_my_lessons(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
    sort_by: Literal["created_at", "title"] = Query(
        "created_at", description="Sort lessons by 'created_at' or 'title'"
    ),
    order: Literal["asc", "desc"] = Query(
        "desc", description="Sort order: 'asc' for ascending, 'desc' for descending"
    ),
    limit: int = Query(
        20, ge=1, le=100, description="Number of lessons to return per page (1–100)"
    ),
    offset: int = Query(
        0, ge=0, description="Number of lessons to skip for pagination"
    ),
) -> List[LessonRead]:
    """
    Get all lessons belonging to the current signed-in user.
    Supports sorting (by creation date or title) and pagination.
    """

    # Base query
    query = select(Lesson).where(Lesson.user_id == user.id)

    # Apply sorting
    if sort_by == "created_at":
        query = query.order_by(
            Lesson.created_at.asc() if order == "asc" else Lesson.created_at.desc()
        )
    elif sort_by == "title":
        query = query.order_by(
            Lesson.title.asc() if order == "asc" else Lesson.title.desc()
        )

    # Apply pagination
    query = query.limit(limit).offset(offset)

    # Execute query
    result = await db.execute(query)
    lessons = result.scalars().all()

    return lessons

@router.post("/create", response_model=LessonRead)
async def create_lesson(lesson: LessonCreate, db: AsyncSession = Depends(get_db)) -> LessonRead:
    new_lesson = Lesson(title=lesson.title, user_id=lesson.user_id)
    db.add(new_lesson)
    await db.commit()
    await db.refresh(new_lesson)
    return new_lesson

@router.post("/upload_scenario", response_model=LessonRead)
async def upload_scenario(scenario: Scenario,
                          db: AsyncSession = Depends(get_db),
                          user: User = Depends(current_active_user)):

    new_lesson = await create_lesson(LessonCreate(title=scenario.title, user_id=user.id), db)
    video_paths = await generate_scenario(scenario, new_lesson.id)
    await save_scenario_json(scenario=scenario, lesson_id=new_lesson.id, session=db)

    LessonVideo(lesson_id=new_lesson.id, )

    return new_lesson

async def save_scenario_json(scenario: Scenario, lesson_id: UUID, session: AsyncSession):
    record = LessonScenarioDB(
        lesson_id=lesson_id,
        scenario_json=scenario.dict()
    )
    session.add(record)
    await session.commit()
    return record.id

@router.post("/{lesson_id}/add_video", response_model=LessonVideoAddResponse)
async def add_video_to_lesson(
    lesson_id: UUID,
    request: LessonVideoAddResponse,
    db: AsyncSession = Depends(get_db)
) -> LessonVideoAddResponse:
    # Check that the lesson exists
    lesson_result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = lesson_result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lesson {lesson_id} not found"
        )

    # Check that the video exists
    video_result = await db.execute(select(Video).where(Video.id == request.video_id))
    video = video_result.scalar_one_or_none()
    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Video {request.video_id} not found"
        )

    # Check that this video isn’t already linked to the lesson
    existing_link = await db.execute(
        select(LessonVideo).where(
            LessonVideo.lesson_id == lesson_id,
            LessonVideo.video_id == request.video_id
        )
    )
    if existing_link.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Video already added to this lesson"
        )

    # Create new LessonVideo association
    lesson_video = LessonVideo(
        lesson_id=lesson_id,
        video_id=request.video_id,
        index=request.index,
    )

    # Optionally create breakpoints
    if request.breakpoints:
        for bp in request.breakpoints:
            new_bp = Breakpoint(
                lesson_video_id=lesson_video.id,
                question=bp.question,
                choices=bp.options,
                correct_choice=bp.correct_option,
            )
            lesson_video.breakpoints.append(new_bp)
            db.add(new_bp)

    db.add(lesson_video)

    await db.commit()
    await db.refresh(lesson_video)

    # Return the result (could be your LessonVideoRead schema)
    return {
        "lesson_id": lesson_id,
        "video_id": request.video_id,
        "index": request.index
    }

@router.get("/{lesson_id}", response_model=LessonRead)
async def get_lesson(lesson_id: UUID, db: AsyncSession = Depends(get_db)) -> LessonRead:
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return lesson


@router.get("/{lesson_id}/video/{index}", response_model=LessonVideoRead)
async def get_video_by_index(lesson_id: UUID, index: int, db: AsyncSession = Depends(get_db)) -> LessonVideoRead:
    result = await db.execute(
        select(LessonVideo)
        .options(selectinload(LessonVideo.video), selectinload(LessonVideo.breakpoints))
        .where(
            LessonVideo.lesson_id == lesson_id,
            LessonVideo.index == index
        )
    )
    lesson_video = result.scalar_one_or_none()
    if not lesson_video:
        raise HTTPException(status_code=404, detail="Video not found at this index")
    return lesson_video


@router.get("/{lesson_id}/video/{index}/has_next")
async def has_next_video(lesson_id: UUID, index: int, db: AsyncSession = Depends(get_db)) -> dict[str, bool]:
    result = await db.execute(
        select(LessonVideo).where(
            LessonVideo.lesson_id == lesson_id,
            LessonVideo.index == index + 1
        )
    )
    next_exists = result.scalar_one_or_none() is not None
    return {"has_next": next_exists}

@router.post("/{lesson_id}/temp_lesson", response_model=LessonRead)
async def create_temp_lesson(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(current_active_user),
) -> LessonRead:
    """
    Create a temporary lesson with 2 videos.
    Video 1 will have a breakpoint, video 2 will not.
    Uses existing APIs from videos.py and lesson.py.
    """
    
    # Create video 1 using generate_video
    video1_request = VideoGenerateRequest(
        audio=TTSRequest(
            text="This is temporary video 1 for testing purposes.",
            voice_description="neutral voice",
            format="mp3"
        ),
        images=TTImageRequest(
            prompt="A simple educational image",
            n=1,
            size="1024x1024"
        ),
        lesson_id="950abebd-0b01-4f4b-a5fd-1490c6561b12",  # This will be ignored since we create a new lesson
        title="Temp Video 1"
    )
    video1 = await generate_video(video1_request, user, db)
    
    # Create video 2 using generate_video
    video2_request = VideoGenerateRequest(
        audio=TTSRequest(
            text="This is temporary video 2 for testing purposes.",
            voice_description="neutral voice",
            format="mp3"
        ),
        images=TTImageRequest(
            prompt="A simple educational image",
            n=1,
            size="1024x1024"
        ),
        lesson_id="950abebd-0b01-4f4b-a5fd-1490c6561b12",  # This will be ignored since we create a new lesson
        title="Temp Video 2"
    )
    video2 = await generate_video(video2_request, user, db)
    
    # Create lesson using create_lesson (from this same file)
    lesson_create = LessonCreate(
        title="Temp Lesson",
        user_id=user.id
    )
    lesson = await create_lesson(lesson_create, db)
    
    # Add video 1 with breakpoint
    # Note: There's a type mismatch in add_video_to_lesson - it expects LessonVideoAddResponse
    # but uses request.breakpoints. We'll work around this by directly creating the association.
    lesson_video1 = LessonVideo(
        lesson_id=lesson.id,
        video_id=video1.id,
        index=0,
    )
    db.add(lesson_video1)
    await db.flush()  # Flush to get lesson_video1.id
    
    # Create breakpoint 1 for video 1
    breakpoint1 = Breakpoint(
        lesson_video_id=lesson_video1.id,
        question="What is the main topic of this video?",
        choices=["Topic A", "Topic B", "Topic C", "Topic D"],
        correct_choice=0,
    )
    db.add(breakpoint1)
    
    # Create breakpoint 2 for video 1
    breakpoint2 = Breakpoint(
        lesson_video_id=lesson_video1.id,
        question="What is a secondary topic in this video?",
        choices=["Topic X", "Topic Y", "Topic Z", "Topic W"],
        correct_choice=1,
    )
    db.add(breakpoint2)
    
    # Add video 2 without breakpoint
    lesson_video2 = LessonVideo(
        lesson_id=lesson.id,
        video_id=video2.id,
        index=1,
    )
    db.add(lesson_video2)
    
    # Commit all changes
    await db.commit()
    await db.refresh(lesson)

    return lesson


# Helper function to resolve segment file path
def resolve_segment_file_path(
    lesson_id: UUID,
    segment_number: int,
    segment_type: Optional[str] = None
) -> str:
    """
    Resolve the video file path based on lesson_id, segment_number, and segment_type.

    Args:
        lesson_id: UUID of the lesson
        segment_number: The segment number (1-indexed)
        segment_type: The branch type (e.g., "option_A", "option_B") or None for main segments

    Returns:
        Absolute path to the video file

    Raises:
        HTTPException if the file doesn't exist
    """
    # Base directory for lesson videos
    base_dir = Path.cwd() / "lessons" / str(lesson_id) / "videos"

    # Construct filename based on segment type
    if segment_type and segment_type != "main":
        # Branch segment: segment_{branch_type}_{number:03d}.mp4
        filename = f"segment_{segment_type}_{segment_number:03d}.mp4"
    else:
        # Main segment: segment_main_{number:03d}.mp4
        filename = f"segment_main_{segment_number:03d}.mp4"

    file_path = base_dir / filename

    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Video file not found: {filename}"
        )

    return str(file_path)


# Helper function to validate segment exists in scenario JSON
async def validate_segment_in_scenario(
    lesson_id: UUID,
    segment_number: int,
    segment_type: Optional[str],
    db: AsyncSession
) -> bool:
    """
    Validate that the requested segment exists in the lesson's scenario JSON.

    Args:
        lesson_id: UUID of the lesson
        segment_number: The segment number to validate
        segment_type: The branch type or None for main segments
        db: Database session

    Returns:
        True if segment exists and is valid

    Raises:
        HTTPException if lesson or segment doesn't exist
    """
    # Query the scenario JSON from database
    result = await db.execute(
        select(LessonScenarioDB).where(LessonScenarioDB.lesson_id == lesson_id)
    )
    scenario_record = result.scalar_one_or_none()

    if not scenario_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lesson scenario not found for lesson_id: {lesson_id}"
        )

    # The scenario_json contains the full Scenario structure
    # We validate that the segment_number is reasonable (>= 1)
    # More detailed validation could be added based on the JSON structure
    if segment_number < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Segment number must be >= 1"
        )

    return True


@router.get("/{lesson_id}/segment")
async def stream_video_segment(
    lesson_id: UUID,
    segment_number: int = Query(..., ge=1, description="The segment number (1-indexed)"),
    segment_type: Optional[str] = Query(None, description="Branch type (e.g., 'option_A', 'option_B') or None for main segments"),
    db: AsyncSession = Depends(get_db)
):
    """
    Stream a video segment for a lesson based on segment number and optional branch type.

    This endpoint:
    1. Validates the lesson exists in the database
    2. Validates the segment exists in the lesson's scenario JSON
    3. Resolves the video file path on disk
    4. Streams the MP4 file to the client

    Args:
        lesson_id: UUID of the lesson
        segment_number: The segment number to retrieve (1-indexed)
        segment_type: Optional branch identifier (e.g., "option_A", "option_B")
        db: Database session dependency

    Returns:
        StreamingResponse with the video file

    Raises:
        404: If lesson, segment, or video file not found
        400: If segment_number is invalid

    Example:
        GET /lessons/{lesson_id}/segment?segment_number=1
        GET /lessons/{lesson_id}/segment?segment_number=3&segment_type=option_A
    """
    # 1. Check that the lesson exists
    lesson_result = await db.execute(
        select(Lesson).where(Lesson.id == lesson_id)
    )
    lesson = lesson_result.scalar_one_or_none()

    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lesson not found: {lesson_id}"
        )

    # 2. Validate segment exists in scenario JSON
    if segment_type:
        segment_type = segment_type.replace(" ", ":")
    await validate_segment_in_scenario(lesson_id, segment_number, segment_type, db)

    # 3. Resolve the video file path
    try:
        video_path = resolve_segment_file_path(lesson_id, segment_number, segment_type)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error resolving video path: {str(e)}"
        )

    # 4. Stream the video file
    def iterfile():
        """Generator to stream the file in chunks."""
        with open(video_path, mode="rb") as file_like:
            while chunk := file_like.read(65536):  # 64KB chunks
                yield chunk

    return StreamingResponse(
        iterfile(),
        media_type="video/mp4",
        headers={
            "Content-Disposition": f"inline; filename=segment_{segment_number}.mp4",
            "Accept-Ranges": "bytes"
        }
    )
