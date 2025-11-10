import base64
import os
import subprocess
import tempfile
from typing import List, Optional

from PIL import Image

from app.schema_models.scenario import Scenario
from app.schema_models.scenario import ScriptBlock
from app.ffmpeg_cmds import stitch_base64_mp3s, get_audio_duration
from app.routes.tts import synthesize_with_hume, TTSRequest

# async def handle_dialogue_segment(segment: List[ScriptBlock], segment_name: Optional[str]):
#     base64_mp3s = []
#     for block in segment:
#         print(block, 'BLOCK')
#         audio_url = await handle_dialogue_block(block)
#         base64_mp3s.append(audio_url)
#
#     file_path = stitch_base64_mp3s(base64_mp3s, segment_name)
#     return file_path

async def get_b64_audio(block: ScriptBlock):
    tts_request = TTSRequest(text=block.dialogue, voice_description="A deep lumberjack voice.")
    response = synthesize_with_hume(tts_request)
    return response.audio_url

def decode_base64_to_file(data_b64: str, suffix: Optional[str] = None) -> str:
    """Write base64 data to a temporary file and return its path, detecting image/audio type if possible."""
    # Clean up data URL if included
    if data_b64.startswith("data:"):
        header, data_b64 = data_b64.split(",", 1)

    # Auto-detect format
    header = data_b64[:10]
    if header.startswith("/9j/"):          # JPEG
        suffix = suffix or ".jpg"
    elif header.startswith("iVBORw0K"):    # PNG
        suffix = suffix or ".png"
    elif header.startswith("UklGR"):       # WEBP
        suffix = suffix or ".webp"
    elif header.startswith("//uUx"):       # MP3
        suffix = suffix or ".mp3"
    else:
        # Fallbacks
        suffix = suffix or ".bin"

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    tmp.write(base64.b64decode(data_b64))
    tmp.close()
    return tmp.name


def concat_audio_files(audio_files: List[str], output_path: str):
    """Use FFmpeg to concatenate audio files."""
    concat_file = tempfile.NamedTemporaryFile(delete=False, mode="w", suffix=".txt")
    for f in audio_files:
        concat_file.write(f"file '{os.path.abspath(f)}'\n")
    concat_file.close()
    cmd = [
        "ffmpeg", "-y", "-f", "concat", "-safe", "0",
        "-i", concat_file.name, "-c", "copy", output_path
    ]
    subprocess.run(cmd, check=True)
    os.remove(concat_file.name)

def make_video_segment(image_path: str, audio_path: str, output_path: str):
    cmd = [
        "ffmpeg", "-y",
        "-loop", "1",
        "-framerate", "2",
        "-i", image_path,
        "-i", audio_path,
        "-c:v", "libx264",
        "-tune", "stillimage",
        "-pix_fmt", "yuv420p",
        "-shortest",
        "-preset", "ultrafast",
        output_path,
    ]

    try:
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT, timeout=30)
    except subprocess.CalledProcessError as e:
        print("FFmpeg failed!")
        print("Command:", " ".join(e.cmd))
        print("Return code:", e.returncode)
        print("STDERR:", e.stderr.decode(errors="ignore"))
        raise


def create_black_image(width=1280, height=720) -> str:
    """Create a black placeholder image and return its path."""
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".png")
    Image.new("RGB", (width, height), color=(0, 0, 0)).save(tmp.name, "PNG")
    return tmp.name


def save_base64_image(base64_str: str, suffix=".png") -> str:
    """Save base64 image data to a temporary file and return its path."""
    decoded = base64.b64decode(base64_str)
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    tmp.write(decoded)
    tmp.close()
    return tmp.name

def stitch_mp3_files(audio_paths: list[str], output_name: str) -> str:
    """
    Concatenate multiple MP3 files efficiently using ffmpeg concat demuxer.
    """
    if not audio_paths:
        raise ValueError("No MP3 files to stitch.")

    # create temporary list file for ffmpeg
    with tempfile.NamedTemporaryFile("w", delete=False, suffix=".txt") as list_file:
        for path in audio_paths:
            abs_path = os.path.abspath(path)
            list_file.write(f"file '{abs_path}'\n")
        list_file_path = list_file.name

    output_path = f"/tmp/{output_name}.mp3"

    # suppress ffmpeg logs for speed and prevent blocking
    subprocess.run(
        [
            "ffmpeg", "-y", "-f", "concat", "-safe", "0",
            "-i", list_file_path, "-c", "copy", output_path
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.STDOUT,
        timeout=30
    )

    os.remove(list_file_path)
    return output_path

async def generate_scenario(scenario: Scenario):
    """
    Stitch each image+audio group in a scenario into separate video files.
    Returns a list of paths to generated video segments.
    """

    output_dir = f"{os.path.curdir}/uploaded_videos/lessons/{scenario.title.replace(' ', '_')}/"
    os.makedirs(output_dir, exist_ok=True)

    current_image_path = create_black_image()
    current_audios: list[str] = []
    current_segment_index = 0
    video_files = []

    def flush_segment():
        nonlocal current_audios, current_image_path, current_segment_index, video_files
        if not current_audios:
            return

        try:
            audio_path = stitch_mp3_files(current_audios, f"segment_{current_segment_index:03d}")
            seg_path = os.path.join(output_dir, f"segment_{current_segment_index:03d}.mp4")

            # dynamically adjust timeout based on duration
            duration = get_audio_duration(audio_path)
            try:
                subprocess.run(
                    [
                        "ffmpeg", "-y",
                        "-loop", "1",
                        "-framerate", "2",
                        "-i", current_image_path,
                        "-i", audio_path,
                        "-c:v", "libx264",
                        "-tune", "stillimage",
                        "-pix_fmt", "yuv420p",
                        "-shortest",
                        "-preset", "ultrafast",
                        "-t", str(duration),
                        seg_path,
                    ],
                    check=True,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    timeout=duration + 10,  # buffer
                )
            except subprocess.TimeoutExpired:
                print(f"⚠️ Segment {seg_path} timed out after {duration + 10}s.")
            video_files.append(seg_path)
            current_segment_index += 1

        finally:
            # clean up temporary audio files after use
            for f in current_audios:
                try:
                    os.remove(f)
                except FileNotFoundError:
                    pass
            current_audios = []

    for block in scenario.script:
        print("working on block: ", block.dialogue)

        # 1️⃣ Handle new image — flush current segment before switching
        if getattr(block, "image", None) and getattr(block.image, "base64", None):
            flush_segment()
            current_image_path = save_base64_image(block.image.base64)

        # 2️⃣ Dialogue: always synthesize audio
        if getattr(block, "dialogue", None):
            b64_audio = await get_b64_audio(block)
            if b64_audio:
                audio_path = decode_base64_to_file(b64_audio, ".mp3")
                current_audios.append(audio_path)

        # 3️⃣ Breakpoint: include it in *this* segment unless a new image follows
        if getattr(block, "breakpoint", None):
            # if breakpoint doesn’t have an image, just flush *after* including its audio
            # (so it still ends up in this segment)
            flush_segment()

    # 4️⃣ Flush any trailing audio into final segment
    flush_segment()

    print(f"✅ Created {len(video_files)} video segments in {output_dir}")
    return video_files
