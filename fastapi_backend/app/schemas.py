from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi_users import schemas
from pydantic import BaseModel, Field


class UserRead(schemas.BaseUser[uuid.UUID]):
    pass


class UserCreate(schemas.BaseUserCreate):
    pass


class UserUpdate(schemas.BaseUserUpdate):
    pass


class VideoBase(BaseModel):
    title: str
    description: str | None = None


class VideoCreate(VideoBase):
    pass


class VideoRead(VideoBase):
    id: UUID
    filename: str
    file_size: int
    created_at: datetime

    model_config = {"from_attributes": True}


class Breakpoint(BaseModel):
    question: str
    options: List[str]
    correct_option: int


class BreakpointRead(BaseModel):
    id: UUID
    question: str
    choices: List[str]
    correct_choice: int
    created_at: datetime

    model_config = {"from_attributes": True}


class LessonVideoBase(BaseModel):
    video_id: UUID
    index: int
    breakpoints: Optional[List[Breakpoint]] = None


class LessonVideoRead(LessonVideoBase):
    id: UUID
    video: VideoRead
    breakpoints: Optional[List[BreakpointRead]] = None

    class Config:
        from_attributes = True


class LessonBase(BaseModel):
    title: str = Field(..., description="Lesson title")


class LessonCreate(LessonBase):
    user_id: UUID  # Associate lesson with user who created it


class LessonRead(LessonBase):
    id: UUID
    created_at: datetime
    user_id: UUID

    class Config:
        from_attributes = True


class LessonVideoAdd(BaseModel):
    video_id: UUID
    index: Optional[int] = None
    breakpoints: Optional[List[Breakpoint]] = None

    model_config = {"from_attributes": True}


class LessonVideoAddResponse(BaseModel):
    lesson_id: UUID
    video_id: UUID
    index: int
