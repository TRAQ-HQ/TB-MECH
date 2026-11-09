"""Settings read from environment at call time (so tests can monkeypatch)."""
import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]  # repo root
load_dotenv(ROOT / ".env")

ENGINE_VERSION = "0.1.0"


@dataclass
class Settings:
    gnani_api_key: str
    gnani_mock: bool
    stt_language_default: str
    tts_voice_default: str
    llm_mode: str
    evon_base_url: str
    evon_model: str
    max_upload_mb: int
    runs_dir: Path


def get_settings() -> Settings:
    e = os.environ.get
    return Settings(
        gnani_api_key=e("GNANI_API_KEY", ""),
        gnani_mock=e("GNANI_MOCK", "1") == "1",
        stt_language_default=e("GNANI_STT_LANGUAGE_DEFAULT", "hi-IN"),
        tts_voice_default=e("GNANI_TTS_VOICE_DEFAULT", "Kaveri"),
        llm_mode=e("LLM_MODE", "template"),
        evon_base_url=e("EVON_BASE_URL", "http://localhost:8001/v1"),
        evon_model=e("EVON_MODEL", ""),
        max_upload_mb=int(e("MAX_UPLOAD_MB", "5")),
        runs_dir=ROOT / e("RUNS_DIR", "data/runs"),
    )
