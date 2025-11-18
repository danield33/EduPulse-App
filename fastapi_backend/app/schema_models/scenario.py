from typing import List, Optional, Dict

from pydantic import BaseModel, Field


class ImageData(BaseModel):
    url: Optional[str] = None
    prompt: Optional[str] = None
    base64: Optional[str] = None


class DialogueLine(BaseModel):
    role: str
    dialogue: str
    image: Optional[ImageData] = None


class BranchOption(BaseModel):
    type: str
    dialogue: List[DialogueLine]


class BreakpointOption(BaseModel):
    text: str
    isCorrect: bool
    branchTarget: Optional[str] = None  # name or index of branch to go to


class BreakpointQuestion(BaseModel):
    question: str
    options: List[BreakpointOption]


class ScriptBlock(BaseModel):
    role: Optional[str] = None
    dialogue: Optional[str] = None
    branch_options: Optional[List[BranchOption]] = None
    image: Optional[ImageData] = None
    breakpoint: Optional[BreakpointQuestion] = None


class Scenario(BaseModel):
    title: str
    script: List[ScriptBlock]
    characters: Optional[Dict[str, str]] = Field(
        default=None,
        description="Dictionary mapping character names to voice descriptions. "
                    "Example: {'Narrator': 'A man with a deep voice', 'Teacher': 'Warm female voice'}"
    )

    class Config:
        schema_extra = {
            "example": {
                "title": "Engaging a Disconnected Student",
                "script": [
                    {
                        "role": "Teacher",
                        "dialogue": "Let's begin today's class!",
                        "image": {"url": "https://example.com/teacher.png"},
                    }
                ],
            }
        }
