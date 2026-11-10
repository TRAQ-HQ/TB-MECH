"""Gnani Timbre text-to-speech wrapper.

Real mode calls the Gnani TTS REST API directly via httpx (needs only GNANI_API_KEY).
Falls back to transformers pipeline if configured.
"""
import asyncio
import io
import os
import wave
from typing import Literal, Optional

import httpx
from pydantic import BaseModel

from ..config import get_settings
from .errors import GnaniError

GNANI_TTS_URL = "https://api.vachana.ai/api/v1/tts/inference"
_pipe = None


class SpeechResult(BaseModel):
    audio_wav: bytes
    voice: str
    language_code: str
    source: Literal["timbre", "mock"]


def silent_wav(seconds: float = 0.5, rate: int = 16000) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate)
        w.writeframes(b"\x00\x00" * int(rate * seconds))
    return buf.getvalue()


async def _run_tts_rest(text: str, voice: str, language_code: str, api_key: str) -> bytes:
    headers = {
        "Content-Type": "application/json",
        "X-API-Key-ID": api_key,
    }
    payload = {
        "text": text,
        "voice": voice,
        "model": "timbre-v2.5",
        "language": language_code,
        "speed": 1.0,
        "audio_config": {
            "encoding": "linear_pcm",
            "container": "wav",
            "num_channels": 1,
            "sample_rate": 22050,
            "sample_width": 2,
        },
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.post(GNANI_TTS_URL, headers=headers, json=payload)
        r.raise_for_status()
        return r.content


def _run_tts(text: str, voice: str, api_key: str) -> bytes:
    global _pipe
    os.environ["GNANI_API_KEY"] = api_key
    from transformers import pipeline
    if _pipe is None:
        _pipe = pipeline("text-to-speech", model="gnani-ai/vachana", trust_remote_code=True)
    out = _pipe(text, voice=voice, tts_mode="rest", sample_rate=22050, container="wav", encoding="linear_pcm")
    return out["audio"]


async def synthesize(text: str, language_code: str, voice: Optional[str] = None) -> SpeechResult:
    s = get_settings()
    voice = voice or s.tts_voice_default
    if not text.strip():
        raise GnaniError("empty_text", "Nothing to speak.", 400)
    if len(text) > 1500:
        raise GnaniError("text_too_long", "Text is too long to speak.", 400)
    if s.gnani_mock:
        return SpeechResult(audio_wav=silent_wav(), voice=voice, language_code=language_code, source="mock")
    if not s.gnani_api_key:
        raise GnaniError("missing_api_key", "GNANI_API_KEY is not configured.", 500)

    # First attempt: Direct Gnani REST API
    try:
        audio = await _run_tts_rest(text, voice, language_code, s.gnani_api_key)
        return SpeechResult(audio_wav=audio, voice=voice, language_code=language_code, source="timbre")
    except Exception as rest_exc:
        # Fallback to local HuggingFace pipeline if installed
        try:
            audio = await asyncio.wait_for(asyncio.to_thread(_run_tts, text, voice, s.gnani_api_key), timeout=60)
            return SpeechResult(audio_wav=audio, voice=voice, language_code=language_code, source="timbre")
        except ImportError:
            raise GnaniError("tts_failed", f"Speech synthesis REST request failed: {rest_exc}. The text answer is still shown.")
        except Exception:
            raise GnaniError("tts_failed", "Speech synthesis failed. The text answer is still shown.")
