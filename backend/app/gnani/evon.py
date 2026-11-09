"""Evon v3.3 client (P1). Open-weight model, NOT on the Gnani API platform.

Serve it yourself (e.g. vLLM OpenAI-compatible server) after obtaining weights via Hugging Face,
then set LLM_MODE=evon, EVON_BASE_URL, EVON_MODEL. If unavailable, the composer falls back to
templates and the UI says so. Do NOT claim Evon in the submission unless it actually ran.
"""
import httpx

from ..config import get_settings
from .errors import GnaniError


async def complete(system: str, user: str) -> str:
    s = get_settings()
    if s.llm_mode != "evon" or not s.evon_model:
        raise GnaniError("evon_disabled", "Evon is not enabled.", 503)
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(
                f"{s.evon_base_url.rstrip('/')}/chat/completions",
                json={"model": s.evon_model, "temperature": 0.2,
                      "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]},
            )
            r.raise_for_status()
            return r.json()["choices"][0]["message"]["content"]
    except Exception:
        raise GnaniError("evon_failed", "Evon request failed.", 502)
