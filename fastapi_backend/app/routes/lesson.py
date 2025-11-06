from typing import Literal, List, Any

from app.models import Lesson, LessonVideo, Video, Breakpoint, User
from app.schemas import LessonCreate, LessonRead, LessonVideoAddResponse
from uuid import UUID
from app.database import get_async_session as get_db
from fastapi import Depends, HTTPException, APIRouter, Query
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status
from sqlalchemy import select
from app.users import current_active_user

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
def get_lesson(lesson_id: UUID, db: AsyncSession = Depends(get_db)) -> LessonRead:
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return lesson


@router.get("/{lesson_id}/video/{index}")
def get_video_by_index(lesson_id: UUID, index: int, db: AsyncSession = Depends(get_db)) -> Any:
    video = (
        db.query(LessonVideo)
        .filter(LessonVideo.lesson_id == lesson_id, LessonVideo.order_index == index)
        .first()
    )
    if not video:
        raise HTTPException(status_code=404, detail="Video not found at this index")
    return video


@router.get("/{lesson_id}/video/{index}/has_next")
def has_next_video(lesson_id: UUID, index: int, db: AsyncSession = Depends(get_db)) -> dict[str, bool]:
    next_exists = (
        db.query(LessonVideo)
        .filter(LessonVideo.lesson_id == lesson_id, LessonVideo.order_index == index + 1)
        .first()
        is not None
    )
    return {"has_next": next_exists}