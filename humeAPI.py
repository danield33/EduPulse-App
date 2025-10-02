# hume_tts_save.py
import os
import sys
import requests

API_URL = "https://api.hume.ai/v0/tts/file"

def synthesize_to_file(
    text: str,
    voice_description: str,
    fmt: str = "mp3",           # "mp3" or "wav"
    out_path: str = None,
    api_key: str | None = None,
) -> str:
    api_key = api_key or os.getenv("HUME_API_KEY")
    if not api_key:
        raise RuntimeError("Missing API key. Set HUME_API_KEY or pass api_key.")

    if out_path is None:
        out_path = f"output.{fmt}"

    payload = {
        "utterances": [
            {"text": text, "description": voice_description}
        ],
        "format": {"type": fmt},
        "num_generations": 1,
    }

    r = requests.post(
        API_URL,
        headers={"X-Hume-Api-Key": api_key},
        json=payload,
        timeout=180,
    )

    # If non-2xx, print server text for debugging
    if not r.ok:
        raise RuntimeError(f"HTTP {r.status_code}: {r.text[:500]}")

    # Branch by content type
    ctype = r.headers.get("Content-Type", "")
    try:
        if "application/json" in ctype or "json" in ctype:
            # JSON flow: expect a URL to download
            data = r.json()
            gen = data["generations"][0]
            url = gen["audio"]["url"]
            dl = requests.get(url, timeout=300)
            dl.raise_for_status()
            # ensure extension matches fmt
            if not out_path.endswith(f".{fmt}"):
                root, _ = os.path.splitext(out_path)
                out_path = f"{root}.{fmt}"
            with open(out_path, "wb") as f:
                f.write(dl.content)
            return out_path
        else:
            # Direct-bytes flow: save response body as audio
            if not out_path.endswith(f".{fmt}"):
                root, _ = os.path.splitext(out_path)
                out_path = f"{root}.{fmt}"
            with open(out_path, "wb") as f:
                f.write(r.content)
            return out_path
    except Exception as e:
        # Show first 500 chars for debugging
        peek = r.text[:500] if hasattr(r, "text") else b"(no text)"
        raise RuntimeError(f"Unexpected response; content-type={ctype}; body preview:\n{peek}") from e


def main():
    # editable text and voice description
    text = (
        "Beauty is no quality in things themselves: "
        "It exists merely in the mind which contemplates them."
    )
    # editable text and voice description
    voice_desc = (
        "Middle-aged masculine voice with a clear, rhythmic Scots lilt, "
        "rounded vowels, and a warm, steady tone with an articulate, academic quality."
    )

    fmt = sys.argv[1] if len(sys.argv) > 1 else "mp3"  # mp3|wav
    out_path = sys.argv[2] if len(sys.argv) > 2 else f"output.{fmt}"

    saved = synthesize_to_file(text, voice_desc, fmt=fmt, out_path=out_path)
    print(f"Saved: {saved}")

if __name__ == "__main__":
    main()
