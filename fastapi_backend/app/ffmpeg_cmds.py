import re
import subprocess
import base64
import tempfile
import subprocess
import os
from typing import List, Optional

from PIL import Image


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
    image_path = prepare_canvas_image(image_path, 1280, 720)
    duration = get_audio_duration(audio_path)
    cmd = [
        "ffmpeg",
        "-y",
        "-loop", "1",
        "-i", image_path,
        "-i", audio_path,

        # Video
        "-c:v", "libx264",
        "-preset", "ultrafast",  # massively boosts speed
        "-tune", "stillimage",
        "-crf", "18",  # visually lossless for static images
        "-r", "1",  # 1 FPS good for still image
        "-pix_fmt", "yuv420p",
        "-vsync", "0",

        # Audio
        "-c:a", "aac",
        "-b:a", "192k",

        # Duration
        "-shortest",  # ensures video ends at audio
        "-t", str(duration),

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


def prepare_canvas_image(img_path: str, target_w=1280, target_h=720) -> str:
    """
    Ensures the image fits inside a fixed-size canvas (letterboxed or pillarboxed)
    so all output video segments have identical dimensions.
    """
    img = Image.open(img_path).convert("RGB")
    iw, ih = img.size
    aspect_img = iw / ih
    aspect_target = target_w / target_h

    # Resize image to fit inside target canvas while preserving aspect ratio
    if aspect_img > aspect_target:
        # Image is wider → fit width
        new_w = target_w
        new_h = int(target_w / aspect_img)
    else:
        # Image is taller → fit height
        new_h = target_h
        new_w = int(target_h * aspect_img)

    # Resize
    img_resized = img.resize((new_w, new_h), Image.LANCZOS)

    # Create black canvas
    canvas = Image.new("RGB", (target_w, target_h), (0, 0, 0))

    # Center the resized image
    offset_x = (target_w - new_w) // 2
    offset_y = (target_h - new_h) // 2
    canvas.paste(img_resized, (offset_x, offset_y))

    # Save final canvas output
    fixed_path = img_path.replace(".png", "_canvas.png")
    canvas.save(fixed_path, format="PNG")

    return fixed_path
