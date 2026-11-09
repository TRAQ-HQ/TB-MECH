"""Gnani Prisma v2.5 speech-to-text wrapper.

Real mode uses the documented Hugging Face route (`gnani-vachana` + transformers pipeline,
needs only GNANI_API_KEY). TODO(VERIFY): once you have read docs.gnani.ai/api/STT, you may
replace _run_pipeline with a direct httpx REST call. Never log audio or transcripts.
"""
import asyncio
import os
import tempfile
from typing import Literal, Optional

from pydantic import BaseModel

from ..config import get_settings
from .errors import GnaniError

DEFAULT_MOCK_TEXT = "rpoB S450L aur katG S315T"
_pipe = None


class TranscriptionResult(BaseModel):
    text: str
    language_code: str
    source: Literal["prisma_v2.5", "mock"]


def _run_pipeline(wav_bytes: bytes, language_code: str, api_key: str) -> str:
    global _pipe
    os.environ["GNANI_API_KEY"] = api_key
    from transformers import pipeline  # lazy import; optional dependency
    if _pipe is None:
        _pipe = pipeline("automatic-speech-recognition", model="gnani-ai/vachana", trust_remote_code=True)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        f.write(wav_bytes)
        path = f.name
    try:
        return _pipe(path, language_code=language_code)["text"]
    finally:
        try:
            os.remove(path)
        except OSError:
            pass


async def transcribe(wav_bytes: Optional[bytes], language_code: str,
                     mock_text: Optional[str] = None) -> TranscriptionResult:
    s = get_settings()
    if s.gnani_mock:
        return TranscriptionResult(text=mock_text or DEFAULT_MOCK_TEXT, language_code=language_code, source="mock")
    if not s.gnani_api_key:
        raise GnaniError("missing_api_key", "GNANI_API_KEY is not configured.", 500)
    if not wav_bytes:
        raise GnaniError("empty_audio", "No audio received.", 400)
    try:
        text = await asyncio.wait_for(
            asyncio.to_thread(_run_pipeline, wav_bytes, language_code, s.gnani_api_key), timeout=60)
    except asyncio.TimeoutError:
        raise GnaniError("stt_timeout", "Speech recognition timed out. Please type instead.")
    except ImportError:
        raise GnaniError("sdk_missing", "Install `transformers` and `gnani-vachana` for real speech mode.", 500)
    except Exception:
        raise GnaniError("stt_failed", "Speech recognition failed. Please type instead.")
    return TranscriptionResult(text=text or "", language_code=language_code, source="prisma_v2.5")
