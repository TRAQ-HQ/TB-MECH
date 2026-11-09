from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import Response

from ..config import get_settings
from ..core import normalizer
from ..core.kb import get_kb
from ..gnani import audio, prisma, timbre
from ..gnani.errors import GnaniError
from ..schemas import SpeakRequest

router = APIRouter()


@router.post("/voice/transcribe")
async def transcribe(audio_file: UploadFile = File(..., alias="audio"), language_code: str = Form("hi-IN"),
                     mock_text: str | None = Form(None)):
    s = get_settings()
    data = await audio_file.read()
    if len(data) > s.max_upload_mb * 1024 * 1024:
        raise GnaniError("file_too_large", f"Audio exceeds {s.max_upload_mb} MB.", 413)
    wav = None if s.gnani_mock else await audio.convert_to_wav(data)
    res = await prisma.transcribe(wav, language_code, mock_text)
    parsed = normalizer.parse_text(res.text, get_kb())
    return {**res.model_dump(), "parsed": parsed}


@router.post("/voice/speak")
async def speak(req: SpeakRequest):
    res = await timbre.synthesize(req.text, req.language, req.voice)
    return Response(content=res.audio_wav, media_type="audio/wav",
                    headers={"X-Tts-Source": res.source, "X-Tts-Voice": res.voice})
