from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from PyPDF2 import PdfReader
from openai import OpenAI
from app.models import Script
from app.database import get_async_session
from pydantic import BaseModel
import io, os, uuid
from datetime import datetime

router = APIRouter()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class ScriptIn(BaseModel):
    content: str


def extract_pdf_text(pdf_bytes: bytes) -> str:
    reader = PdfReader(io.BytesIO(pdf_bytes))
    chunks = [page.extract_text() or "" for page in reader.pages]
    return "\n\n".join(chunks).strip()


SYSTEM_PROMPT = (
    "You are EduPulse, an AI lesson designer for nursing education. "
    "Given a human-written scenario, create a concise, emotionally engaging "
    "teaching script for a narrated training video about ~2 minutes long (~260–320 words). "
    "Use [Narrator], [Teacher], and [Taylor] for dialogue, and add 2–3 [BREAKPOINT] markers."
)


@router.post("/generate-script-from-pdf")
async def generate_script_from_pdf(file: UploadFile = File(...)):
    """Accept a PDF upload and return a 2-minute teaching script."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a .pdf file")

    pdf_bytes = await file.read()
    scenario_text = extract_pdf_text(pdf_bytes)

    if not scenario_text:
        raise HTTPException(status_code=422, detail="Could not extract text from PDF")

    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.7,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": scenario_text},
        ],
    )

    script = completion.choices[0].message.content.strip()
    if not script:
        raise HTTPException(status_code=502, detail="AI returned empty response")

    return {"script": script}


@router.post("/save-script")
async def save_script(payload: ScriptIn, session: AsyncSession = Depends(get_async_session)):
    """Save the generated script to the database."""
    try:
        row = Script(content=payload.content)
        session.add(row)
        await session.commit()
        await session.refresh(row)
        return {"id": str(row.id), "message": "Script saved successfully!"}
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"DB save failed: {e}")