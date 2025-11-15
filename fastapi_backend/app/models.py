import uuid
from typing import List, Optional
from datetime import datetime

from fastapi_users.db import SQLAlchemyBaseUserTableUUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, ForeignKey, DateTime, ARRAY, Column
from sqlalchemy.dialects.postgresql import UUID, JSONB


class Base(DeclarativeBase):
    pass


class User(SQLAlchemyBaseUserTableUUID, Base):
    """A user can create multiple lessons."""
    lessons: Mapped[List["Lesson"]] = relationship(
        "Lesson",
        back_populates="user",
        cascade="all, delete-orphan"
    )


class Video(Base):
    """A video that can be reused in different lessons, not tied to a specific user."""
    __tablename__ = "videos"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String)
    filename: Mapped[str] = mapped_column(String, nullable=False)
    file_path: Mapped[str] = mapped_column(String, nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # No direct user relationship anymore
    lesson_links: Mapped[List["LessonVideo"]] = relationship(
        "LessonVideo",
        back_populates="video",
        cascade="all, delete-orphan"
    )


class Lesson(Base):
    """A lesson belongs to a user and can contain multiple videos."""
    __tablename__ = "lessons"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Link to the user who created this lesson
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    user: Mapped["User"] = relationship("User", back_populates="lessons")

    # Ordered videos within the lesson
    lesson_videos: Mapped[List["LessonVideo"]] = relationship(
        "LessonVideo",
        back_populates="lesson",
        cascade="all, delete-orphan",
        order_by="LessonVideo.index",
    )


class LessonVideo(Base):
    """Link table between lessons and videos, preserving video order and breakpoints."""
    __tablename__ = "lesson_videos"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lesson_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("lessons.id", ondelete="CASCADE"))
    video_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("videos.id", ondelete="CASCADE"))
    index: Mapped[int] = mapped_column(Integer, nullable=False)

    lesson: Mapped["Lesson"] = relationship("Lesson", back_populates="lesson_videos")
    video: Mapped["Video"] = relationship("Video", back_populates="lesson_links")

    breakpoints: Mapped[List["Breakpoint"]] = relationship(
        "Breakpoint",
        back_populates="lesson_video",
        cascade="all, delete-orphan"
    )


class Breakpoint(Base):
    """Multiple-choice breakpoints tied to a specific lesson-video combination."""
    __tablename__ = "breakpoints"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lesson_video_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("lesson_videos.id", ondelete="CASCADE"))
    question: Mapped[str] = mapped_column(String, nullable=False)
    choices: Mapped[List[str]] = mapped_column(ARRAY(String), nullable=False)
    correct_choice: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    lesson_video: Mapped["LessonVideo"] = relationship("LessonVideo", back_populates="breakpoints")

class LessonScenarioDB(Base):
    __tablename__ = "lesson_scenario"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lesson_id = Column(UUID(as_uuid=True), nullable=False)
    scenario_json = Column(JSONB, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
