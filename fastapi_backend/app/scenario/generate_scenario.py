import base64
import os
import subprocess
import tempfile
from typing import List, Optional

from PIL import Image

from app.schema_models.scenario import Scenario
from app.schema_models.scenario import ScriptBlock
from app.ffmpeg_cmds import stitch_base64_mp3s, make_video
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
    make_video(image_path, audio_path, output_path)


def create_black_image(width=1280, height=720) -> str:
    """Create a black placeholder image and return its path."""
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".png")
    Image.new("RGB", (width, height), color=(0, 0, 0)).save(tmp.name, "PNG")
    return tmp.name


async def generate_scenario(scenario: Scenario, lesson_id: str):
    """
    Stitch each image+audio group in a scenario into separate video files.
    Includes support for branch_options after the main script.
    Returns a list of paths to generated video segments.
    """

    output_dir = f"{os.path.curdir}/lessons/{lesson_id}/videos/"
    os.makedirs(output_dir, exist_ok=True)

    # Trackers
    current_image_b64 = None
    current_audios = []

    segment_paths = []
    main_segment_index = 1  # independent numbering for main script
    branch_segment_index = {}  # dict: branch_type -> counter

    def get_branch_index(branch_type: str) -> int:
        """Return and increment the index for this branch type."""
        if branch_type not in branch_segment_index:
            branch_segment_index[branch_type] = 1

        idx = branch_segment_index[branch_type]
        branch_segment_index[branch_type] += 1
        return idx

    def flush_segment(branch_type: Optional[str]):
        nonlocal main_segment_index

        if not current_audios:
            return

        # Pick image
        if current_image_b64:
            img_path = decode_base64_to_file(current_image_b64, ".png")
        else:
            img_path = create_black_image()

        # Combine audio
        audio_concat = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3").name
        concat_audio_files(current_audios, audio_concat)

        # Filename
        if branch_type:
            idx = get_branch_index(branch_type)
            filename = f"segment_{branch_type}_{idx:03d}.mp4"
        else:
            filename = f"segment_main_{main_segment_index:03d}.mp4"
            main_segment_index += 1

        seg_path = os.path.join(output_dir, filename)

        # Make video
        make_video_segment(img_path, audio_concat, seg_path)
        segment_paths.append(seg_path)

    # -------------------------------------------------
    # Helper to process one DialogueLine-like structure
    # -------------------------------------------------
    async def process_dialogue(role, dialogue, image, branch_type: Optional[str]):
        nonlocal current_image_b64, current_audios

        # Image begins a new segment
        if image and image.base64:
            if current_audios:
                flush_segment(branch_type)
                current_audios.clear()
            current_image_b64 = image.base64

        # Generate speech
        if dialogue:
            dummy = ScriptBlock(dialogue=dialogue, image=image)
            b64_audio = await get_b64_audio(dummy)
            audio_path = decode_base64_to_file(b64_audio, ".mp3")
            current_audios.append(audio_path)

    # -------------------------------------------------
    # 1️⃣ Process MAIN SCRIPT
    # -------------------------------------------------
    for block in scenario.script:

        await process_dialogue(block.role, block.dialogue, block.image, None)

        # Breakpoint ends main segment
        if block.breakpoint:
            flush_segment(None)
            current_audios.clear()
            continue

        # -------------------------------------------------
        # 2️⃣ Process BRANCHES on this block
        # -------------------------------------------------
        if getattr(block, "branch_options", None):
            for branch in block.branch_options:

                for line in branch.dialogue:
                    await process_dialogue(
                        role=line.role,
                        dialogue=line.dialogue,
                        image=line.image,
                        branch_type=branch.type
                    )

                # End of branch = flush independently
                flush_segment(branch.type)
                current_audios.clear()

    # -------------------------------------------------
    # 3️⃣ Flush trailing main content
    # -------------------------------------------------
    flush_segment(None)

    print(f"Created {len(segment_paths)} video segments in {output_dir}")
    return segment_paths
