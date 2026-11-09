"""Browser audio (webm/opus etc.) -> mono 16 kHz PCM WAV via ffmpeg.
VERIFY accepted formats/sample rates in docs.gnani.ai and adjust. Audio is never persisted."""
import asyncio
import shutil

from .errors import GnaniError

MAX_SECONDS = 30


async def convert_to_wav(data: bytes) -> bytes:
    if not shutil.which("ffmpeg"):
        raise GnaniError("ffmpeg_missing", "ffmpeg is required on the server to convert audio.", 500)
    proc = await asyncio.create_subprocess_exec(
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-i", "pipe:0",
        "-t", str(MAX_SECONDS), "-ac", "1", "-ar", "16000", "-f", "wav", "pipe:1",
        stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
    out, err = await proc.communicate(data)
    if proc.returncode != 0 or not out:
        raise GnaniError("audio_convert_failed", "Could not read the recorded audio.", 400)
    return out
