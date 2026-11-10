"""Gnani Prisma v2.5 / v3.0 speech-to-text wrapper.

Real mode calls the Gnani STT REST API directly via httpx (needs only GNANI_API_KEY).
Falls back to transformers pipeline if configured. Never logs audio or transcripts.
"""
import asyncio
import os
import tempfile
from typing import Literal, Optional

import httpx
from pydantic import BaseModel

from ..config import get_settings
from .errors import GnaniError

DEFAULT_MOCK_TEXT = "rpoB S450L aur katG S315T"
GNANI_STT_URL = "https://api.vachana.ai/stt/v3"
_pipe = None


class TranscriptionResult(BaseModel):
    text: str
    language_code: str
    source: Literal["prisma_v2.5", "mock"]


async def _run_rest(wav_bytes: bytes, language_code: str, api_key: str) -> str:
    headers = {"X-API-Key-ID": api_key}
    files = {"audio_file": ("audio.wav", wav_bytes, "audio/wav")}
    data = {
        "model": "prisma-v3.0",
        "language_code": language_code,
        "format": "transcribe",
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.post(GNANI_STT_URL, headers=headers, files=files, data=data)
        if r.status_code == 400 and "prisma-v3.0" in r.text:
            # Fallback to prisma-v2.5 if v3 is not enabled on the key
            data["model"] = "prisma-v2.5"
            r = await client.post(GNANI_STT_URL, headers=headers, files=files, data=data)
        r.raise_for_status()
        res = r.json()
        return res.get("transcript") or res.get("text") or ""


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

    # First attempt: Direct Gnani REST API (fast, low memory)
    try:
        text = await _run_rest(wav_bytes, language_code, s.gnani_api_key)
        return TranscriptionResult(text=text or "", language_code=language_code, source="prisma_v2.5")
    except Exception as rest_exc:
        # Fallback to local HuggingFace pipeline if installed
        try:
            text = await asyncio.wait_for(
                asyncio.to_thread(_run_pipeline, wav_bytes, language_code, s.gnani_api_key), timeout=60)
            return TranscriptionResult(text=text or "", language_code=language_code, source="prisma_v2.5")
        except ImportError:
            raise GnaniError("stt_failed", f"Speech recognition REST request failed: {rest_exc}. Please type instead.")
        except Exception:
            raise GnaniError("stt_failed", "Speech recognition failed. Please type instead.")
