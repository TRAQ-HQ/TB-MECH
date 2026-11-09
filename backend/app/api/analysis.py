import json

from fastapi import APIRouter, HTTPException

from .. import store
from ..config import ROOT, get_settings, ENGINE_VERSION
from ..core import engine, normalizer
from ..core.graph import build_graph, to_cytoscape
from ..core.kb import get_kb
from ..schemas import AnalyzeRequest, ParseRequest, WhatIfRequest

router = APIRouter()
LANGUAGES = ["hi-IN", "en-IN", "ml-IN", "ta-IN", "te-IN", "kn-IN", "mr-IN", "bn-IN", "gu-IN", "pa-IN"]  # VERIFY codes in docs


@router.get("/health")
def health():
    return {"status": "ok"}


@router.get("/meta")
def meta():
    s, kb = get_settings(), get_kb()
    return {"kb_version": kb.version, "kb_sha256": kb.sha256, "engine_version": ENGINE_VERSION,
            "gnani_mock": s.gnani_mock, "llm_mode": s.llm_mode, "languages": LANGUAGES,
            "default_language": s.stt_language_default, "default_voice": s.tts_voice_default,
            "unverified_records": sum(1 for e in kb.evidence if not e.verified)}


@router.get("/demo-isolates")
def demo_isolates():
    return json.loads((ROOT / "data" / "demo" / "synthetic_isolates.json").read_text(encoding="utf-8"))


@router.post("/parse-variants")
def parse_variants(req: ParseRequest):
    return normalizer.parse_text(req.text, get_kb())


@router.post("/analyze")
def analyze(req: AnalyzeRequest):
    kb = get_kb()
    candidates, unparsed = [], []
    for s in req.variants:
        parsed = normalizer.parse_text(s, kb)
        candidates.extend(parsed["candidates"])
        unparsed.extend(parsed["unparsed_fragments"])
    if not candidates and not unparsed:
        raise HTTPException(400, {"code": "no_variants", "message": "Provide at least one variant."})
    result = engine.analyze(kb, candidates, req.phenotype, req.isolate_id, req.synthetic)
    result["unparsed_inputs"] = unparsed
    store.save(result)
    return result


def _get(analysis_id: str) -> dict:
    a = store.load(analysis_id)
    if not a:
        raise HTTPException(404, {"code": "not_found", "message": "Analysis not found."})
    return a


@router.get("/analysis/{analysis_id}")
def get_analysis(analysis_id: str):
    return _get(analysis_id)


@router.get("/analysis/{analysis_id}/graph")
def get_graph(analysis_id: str):
    return to_cytoscape(build_graph(get_kb(), _get(analysis_id)))


@router.post("/analysis/{analysis_id}/whatif")
def whatif(analysis_id: str, req: WhatIfRequest):
    return engine.whatif(get_kb(), _get(analysis_id), req.remove)
