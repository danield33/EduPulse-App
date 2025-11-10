import re
import subprocess
import base64
import tempfile
import subprocess
import os
from typing import List, Optional


def get_audio_duration(audio_path: str) -> float:
    result = subprocess.run(
        [
            "ffprobe",
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            audio_path,
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    return float(result.stdout.strip())


"""--- FFmpeg command to combine image + audio ---"""


def make_video(image_path: str, audio_path: str, output_path: str) -> None:
    duration = get_audio_duration(audio_path)
    cmd = [
        "ffmpeg",
        "-y",
        "-loop", "1",
        "-i", image_path,
        "-i", audio_path,
        "-c:v", "libx264",
        "-tune", "stillimage",
        "-c:a", "aac",
        "-b:a", "192k",
        "-t", str(duration),
        "-pix_fmt", "yuv420p",
        output_path,
    ]
    subprocess.run(cmd, check=True)

def stitch_base64_mp3s(base64_list: List[str], output_path: Optional[str] = None) -> str:
    """
    Stitch together a list of base64-encoded audio clips (AAC or MP3)
    into a single MP3 file using ffmpeg re-encoding.

    Args:
        base64_list: List of base64-encoded audio strings.
        output_path: Path where final MP3 should be saved.

    Returns:
        Path to the combined MP3 file.
    """
    if not base64_list:
        raise ValueError("base64_list cannot be empty")

    if output_path is None:
        output_path = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3").name

    # Sanitize output filename
    output_path = re.sub(r"[^\w\-.]", "_", output_path)

    with tempfile.TemporaryDirectory() as tmpdir:
        input_files = []
        for i, b64_data in enumerate(base64_list):
            # Write as AAC (not MP3)
            audio_path = os.path.join(tmpdir, f"part_{i}.aac")
            with open(audio_path, "wb") as f:
                f.write(base64.b64decode(b64_data))
            input_files.append(audio_path)

        # Create a text file listing all AAC files
        list_path = os.path.join(tmpdir, "inputs.txt")
        with open(list_path, "w") as f:
            for path in input_files:
                f.write(f"file '{path}'\n")

        # Re-encode and concatenate safely
        cmd = [
            "ffmpeg",
            "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", list_path,
            "-acodec", "libmp3lame",
            "-ar", "44100",
            "-b:a", "192k",
            output_path
        ]

        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode != 0:
            raise RuntimeError(
                f"FFmpeg failed: {result.stderr[:500]}"  # show only first part of log
            )

    return output_path