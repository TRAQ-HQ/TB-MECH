from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse

from .. import store
from ..config import get_settings

router = APIRouter()


def _get(i: str) -> dict:
    a = store.load(i)
    if not a:
        raise HTTPException(404, {"code": "not_found", "message": "Analysis not found."})
    return a


def _flags() -> dict:
    s = get_settings()
    return {"gnani_mock": s.gnani_mock, "llm_mode": s.llm_mode}


@router.get("/report/{analysis_id}.json")
def report_json(analysis_id: str):
    a = _get(analysis_id)
    return {**a, "components": _flags()}


@router.get("/report/{analysis_id}.md", response_class=PlainTextResponse)
def report_md(analysis_id: str):
    a, p, f = _get(analysis_id), None, _flags()
    p = a["provenance"]
    L = [f"# TB-MECH Voice report: {a.get('isolate_id') or a['analysis_id']}", ""]
    if a.get("synthetic"):
        L += ["> **Synthetic demonstration data.**", ""]
    L += [f"- KB version: `{p['kb_version']}` (sha256 `{p['kb_sha256'][:16]}...`)",
          f"- Engine version: `{p['engine_version']}`  | Created (UTC): {p['created_utc']}",
          f"- Components: Gnani mock = {f['gnani_mock']}, LLM mode = {f['llm_mode']}", "",
          "## Confirmed variants"]
    L += [f"- {v['gene']} {v['variant']} ({v['drug']}, {v['effect_class']})"
          f"{'' if v['verified'] else ' [UNVERIFIED]'}" for v in a["variants"]] or ["- none"]
    L += ["", "## Ranked hypotheses (evidence strength index is ordinal, not a probability)"]
    for h in a["hypotheses"]:
        L.append(f"### {h['claim']}")
        L.append(f"- Status: **{h['status']}** | index {h['evidence_index']} | independent sources {h['independent_sources']}"
                 f"{'' if h['verified'] else ' | UNVERIFIED'}")
        for e in h["supporting"]:
            L.append(f"  - supports `{e['evidence_id']}` (grade {e['grade']}, {e['evidence_type']}): {e['citation']['text']}")
        for e in h["contradicting"]:
            L.append(f"  - contradicts `{e['evidence_id']}` (grade {e['grade']}): {e['citation']['text']}")
    L += ["", "## Evidence gaps"]
    L += [f"- {u['raw']}: {u['message']}" for u in a["unknown_variants"]] or ["- none"]
    L += ["", "## Phenotype checks"]
    L += [f"- {c['drug']} ({c['phenotype']}): {c['kind']}. {c['message']}" for c in a["phenotype_checks"]] or ["- none supplied"]
    L += ["", "## Limitations"] + [f"- {x}" for x in a["limitations"]]
    return "\n".join(L) + "\n"
