from typing import List, Optional

from app.schema_models.scenario import Scenario
from app.schema_models.scenario import ScriptBlock
from app.ffmpeg_cmds import stitch_base64_mp3s
from app.routes.tts import synthesize_with_hume, TTSRequest

async def handle_dialogue_segment(segment: List[ScriptBlock], segment_name: Optional[str]):
    base64_mp3s = []
    for block in segment:
        print(block, 'BLOCK')
        audio_url = await handle_dialogue_block(block)
        base64_mp3s.append(audio_url)

    file_path = stitch_base64_mp3s(base64_mp3s, segment_name)
    return file_path

async def handle_dialogue_block(block: ScriptBlock):
    print(block, "handleBlock")
    tts_request = TTSRequest(text=block.dialogue, voice_description="A deep lumberjack voice.")
    response = synthesize_with_hume(tts_request)
    return response.audio_url

async def generate_scenario(scenario: Scenario):

    audio_files = []
    current_segment: List[ScriptBlock] = []
    segment_index = 0

    for line in scenario.script:
        if line.role and line.dialogue:
            current_segment.append(line)

        if line.image or line.breakpoint or line == scenario.script[-1]:
            segment_id = f"{scenario.title.replace(' ', '_')}_segment_{segment_index}"
            output_path = f"./segments/{segment_id}.mp3"
            path = await handle_dialogue_segment(current_segment)
            audio_files.append(path)

            current_segment = []
            segment_index += 1

    print(f"[AUDIO] Generated {len(audio_files)} segments total.")
    return audio_files