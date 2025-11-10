import base64
import os
import subprocess
import tempfile
from typing import List, Optional

from app.schema_models.scenario import Scenario
from app.schema_models.scenario import ScriptBlock
from app.ffmpeg_cmds import stitch_base64_mp3s
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

def decode_base64_to_file(data_b64: str, suffix: str) -> str:
    """Write base64 data to a temporary file and return path."""
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
    """Create a static video from an image and an audio file."""
    cmd = [
        "ffmpeg", "-y",
        "-loop", "1",
        "-i", image_path,
        "-i", audio_path,
        "-c:v", "libx264",
        "-c:a", "aac",
        "-shortest",
        "-pix_fmt", "yuv420p",
        output_path
    ]
    subprocess.run(cmd, check=True)

async def generate_scenario(scenario: Scenario):
    """
    Stitch each image+audio group in a scenario into separate video files.
    Returns a list of paths to generated video segments.
    """

    output_dir = f"./uploaded_videos/lesson/{scenario.title.replace(' ', '_')}/"
    os.makedirs(output_dir, exist_ok=True)

    current_image_b64 = None
    current_audios = []
    segment_paths = []
    segment_index = 1

    def flush_segment():
        nonlocal segment_index
        if not current_audios or not current_image_b64:
            return
        img_path = decode_base64_to_file(current_image_b64, ".png")
        audio_concat = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3").name
        concat_audio_files(current_audios, audio_concat)

        seg_path = os.path.join(output_dir, f"segment_{segment_index:03d}.mp4")
        make_video_segment(img_path, audio_concat, seg_path)
        segment_paths.append(seg_path)
        segment_index += 1

    for block in scenario.script:
        # Breakpoints end the current segment
        if block.breakpoint:
            flush_segment()
            current_audios.clear()
            continue

        # A new image starts a new segment
        if block.image and block.image.base64:
            if current_audios:
                flush_segment()
                current_audios.clear()
            current_image_b64 = block.image.base64

        # Add dialogue audio if available
        if block.audio_base64:
            audio_path = decode_base64_to_file(block.audio_base64, ".mp3")
            current_audios.append(audio_path)

    # Flush any remaining lines into a final segment
    flush_segment()

    print(f"✅ Created {len(segment_paths)} video segments in {output_dir}")
    return segment_paths