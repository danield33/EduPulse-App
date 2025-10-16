import uuid
from typing import List, Optional
from datetime import datetime

from fastapi_users.db import SQLAlchemyBaseUserTableUUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, ForeignKey, DateTime, ARRAY
from sqlalchemy.dialects.postgresql import UUID


class Base(DeclarativeBase):
    pass


class User(SQLAlchemyBaseUserTableUUID, Base):
    items = relationship("Item", back_populates="user", cascade="all, delete-orphan")
    videos = relationship("Video", back_populates="user", cascade="all, delete-orphan")
    lessons = relationship("Lesson", back_populates="user", cascade="all, delete-orphan")


class Video(Base):
    __tablename__ = "videos"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String)
    filename: Mapped[str] = mapped_column(String, nullable=False)
    file_path: Mapped[str] = mapped_column(String, nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user.id"), nullable=False)

    user = relationship("User", back_populates="videos")
    lesson_links: Mapped[List["LessonVideo"]] = relationship("LessonVideo", back_populates="video")


class Lesson(Base):
    __tablename__ = "lessons"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user.id", ondelete="CASCADE"), nullable=False)

    user = relationship("User", back_populates="lessons")
    lesson_videos: Mapped[List["LessonVideo"]] = relationship(
        "LessonVideo",
        back_populates="lesson",
        cascade="all, delete-orphan",
        order_by="LessonVideo.index",
    )


class LessonVideo(Base):
    __tablename__ = "lesson_videos"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lesson_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("lessons.id", ondelete="CASCADE"))
    video_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("videos.id", ondelete="CASCADE"))
    index: Mapped[int] = mapped_column(Integer, nullable=False)

    lesson = relationship("Lesson", back_populates="lesson_videos")
    video = relationship("Video", back_populates="lesson_links")
    breakpoints: Mapped[List["Breakpoint"]] = relationship(
        "Breakpoint", back_populates="lesson_video", cascade="all, delete-orphan"
    )


class Breakpoint(Base):
    __tablename__ = "breakpoints"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lesson_video_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("lesson_videos.id", ondelete="CASCADE"))
    question: Mapped[str] = mapped_column(String, nullable=False)
    choices: Mapped[List[str]] = mapped_column(ARRAY(String), nullable=False)
    correct_choice: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    lesson_video: Mapped["LessonVideo"] = relationship("LessonVideo", back_populates="breakpoints")
