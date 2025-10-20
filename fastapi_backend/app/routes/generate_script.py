# fastapi_backend/app/routes/generate_script.py
from fastapi import APIRouter, UploadFile, File, HTTPException
from PyPDF2 import PdfReader
from openai import OpenAI
from typing import List
import io
import os

router = APIRouter()

# Expect OPENAI_API_KEY in the backend .env (compose already mounts it)
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def extract_pdf_text(pdf_bytes: bytes) -> str:
    """Robust text extraction for typical text-based PDFs."""
    reader = PdfReader(io.BytesIO(pdf_bytes))
    chunks: List[str] = []
    for page in reader.pages:
        text = page.extract_text() or ""
        if text.strip():
            chunks.append(text)
    return "\n\n".join(chunks).strip()

SYSTEM_PROMPT = (
    "You are EduPulse, an AI lesson designer for nursing education. "
    "Given a human-written scenario, create a concise, emotionally engaging "
    "teaching script for a narrated training video about ~2 minutes long "
    "(~260–320 words). Use:\n"
    "• [Narrator] for narration\n"
    "• [Teacher] and [Taylor] for dialogue\n"
    "• Short scene transitions\n"
    "• 2–3 [BREAKPOINT] markers where an instructor might add questions\n"
    "End with a one-sentence reflective takeaway.\n"
    "Keep tone empathetic, professional, and practical."
)

@router.post("/generate-script-from-pdf")
async def generate_script_from_pdf(file: UploadFile = File(...)):
    """
    Accepts a PDF upload and returns a ~2-minute video script with [BREAKPOINT] tags.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a .pdf file")

    try:
        pdf_bytes = await file.read()
        if not pdf_bytes:
            raise HTTPException(status_code=400, detail="Empty file")

        scenario_text = extract_pdf_text(pdf_bytes)
        if not scenario_text:
            raise HTTPException(
                status_code=422,
                detail="Could not extract text from PDF. Please upload a text-based PDF (not just scanned images).",
            )

        user_prompt = (
            "SCENARIO INPUT (verbatim, may include headings):\n\n"
            f"{scenario_text}\n\n"
            "Now produce the final script:"
        )

        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.7,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
        )

        script = (completion.choices[0].message.content or "").strip()
        if not script:
            raise HTTPException(status_code=502, detail="AI returned an empty script")

        return {"script": script}

    except HTTPException:
        raise
    except Exception as e:
        # Don’t leak secrets; return safe message
        raise HTTPException(status_code=500, detail=f"Failed to generate script: {type(e).__name__}")