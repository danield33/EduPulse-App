from app.models import Lesson, LessonVideo
from app.schemas import LessonCreate, LessonRead
from uuid import UUID
from app.users import current_active_user
from app.database import User, get_async_session as get_db
from fastapi import Depends, HTTPException, APIRouter
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/lessons", tags=["lessons"])

@router.post("/", response_model=LessonRead)
def create_lesson(lesson: LessonCreate, db: AsyncSession = Depends(get_db)):
    new_lesson = Lesson(title=lesson.title, user_id=lesson.user_id)
    db.add(new_lesson)
    db.flush()  # So we can use new_lesson.id

    for v in lesson.videos:
        lv = LessonVideo(
            lesson_id=new_lesson.id,
            video_id=v.video_id,
            index=v.index,
            breakpoints=[b.dict() for b in v.breakpoints] if v.breakpoints else None,
        )
        db.add(lv)

    db.commit()
    db.refresh(new_lesson)
    return new_lesson


@router.get("/{lesson_id}", response_model=LessonRead)
def get_lesson(lesson_id: UUID, db: AsyncSession = Depends(get_db)):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return lesson


@router.get("/{lesson_id}/video/{index}")
def get_video_by_index(lesson_id: UUID, index: int, db: AsyncSession = Depends(get_db)):
    video = (
        db.query(LessonVideo)
        .filter(LessonVideo.lesson_id == lesson_id, LessonVideo.order_index == index)
        .first()
    )
    if not video:
        raise HTTPException(status_code=404, detail="Video not found at this index")
    return video


@router.get("/{lesson_id}/video/{index}/has_next")
def has_next_video(lesson_id: UUID, index: int, db: AsyncSession = Depends(get_db)):
    next_exists = (
        db.query(LessonVideo)
        .filter(LessonVideo.lesson_id == lesson_id, LessonVideo.order_index == index + 1)
        .first()
        is not None
    )
    return {"has_next": next_exists}