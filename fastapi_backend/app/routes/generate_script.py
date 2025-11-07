from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from PyPDF2 import PdfReader
from openai import OpenAI
from app.database import get_async_session
from pydantic import BaseModel
import io, os, uuid
from datetime import datetime
from script_system_prompt import SYSTEM_PROMPT, build_prompt

router = APIRouter(tags=["genscript"])

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class ScriptIn(BaseModel):
    content: str


def extract_pdf_text(pdf_bytes: bytes) -> str:
    reader = PdfReader(io.BytesIO(pdf_bytes))
    chunks = [page.extract_text() or "" for page in reader.pages]
    return "\n\n".join(chunks).strip()



@router.post("/from_pdf")
async def generate_script_from_pdf(file: UploadFile = File(...)):
    """Accept a PDF upload and return a 2-minute teaching script."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a .pdf file")

    pdf_bytes = await file.read()
    scenario_text = extract_pdf_text(pdf_bytes)

    if not scenario_text:
        raise HTTPException(status_code=422, detail="Could not extract text from PDF")

    prompt = build_prompt(scenario_text)
    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.7,
        messages=[
            {"role": "user", "content": prompt},
        ],
    )

    script = completion.choices[0].message.content.strip()
    if not script:
        raise HTTPException(status_code=502, detail="AI returned empty response")

    return {"script": script}
