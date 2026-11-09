"""Facts packet -> answer. The engine decides facts; the LLM (Evon) or templates only phrase them.
Guardrail validator rejects any LLM output that introduces unsupported content."""
import json
import re
from typing import Optional

from ..config import get_settings
from ..gnani import evon
from ..gnani.errors import GnaniError
from . import i18n
from .kb import KnowledgeBase

EVON_SYSTEM_PROMPT = """You explain tuberculosis drug-resistance evidence to researchers.
Use ONLY the facts provided in FACTS. Do not add biological claims, numbers, genes,
variants, drugs or citations that are not in FACTS.
Always preserve gene names, variant notation, drug names and evidence IDs exactly
as written (Latin script), even when answering in another language.
State the evidence status for each claim (for example "association candidate").
Never say a variant "causes" resistance unless the status is experimentally_supported.
If FACTS lack the answer, say the knowledge base has no curated evidence for it.
Do not give medical, treatment or diagnostic advice.
Respond in {language}. Keep the answer under 120 words.
Return JSON: {{"answer": "...", "used_fact_ids": ["..."]}}"""

FORBIDDEN = ["you should take", "recommended treatment", "diagnos", "prescribe"]
VARIANT_TOKEN = re.compile(r"\b[A-Z]\d{1,4}[A-Z*]\b")
EVIDENCE_TOKEN = re.compile(r"\b[ER]_[A-Za-z0-9_>.\-]+")

INTENTS = [
    ("limitations", ["limit", "diagnos", "सीमा"]),
    ("whatif", ["what if", "without", "remove", "if absent"]),
    ("compensatory", ["compensat", "fitness", "क्षतिपूर्ति", "भरपाई"]),
    ("phenotype_check", ["phenotype", "discord", "mic", "फेनोटाइप"]),
    ("evidence_gaps", ["gap", "unknown", "missing", "not known", "अंतराल", "अज्ञात"]),
    ("list_variants", ["list", "which variants", "what variants", "वेरिएंट"]),
    ("explain", ["explain", "why", "evidence", "mechanism", "resist", "साक्ष्य", "प्रतिरोध", "कारण"]),
]


def detect_intent(question: str) -> str:
    q = (question or "").lower()
    for intent, kws in INTENTS:
        if any(k in q for k in kws):
            return intent
    return "unknown"


def build_facts(analysis: dict, intent: str) -> list[dict]:
    facts: list[dict] = []

    def add(**kw):
        kw["fact_id"] = f"F{len(facts) + 1}"
        facts.append(kw)

    hyps = analysis["hypotheses"]
    if intent == "list_variants":
        add(type="variants", names=[v["raw"] for v in analysis["variants"]] + [u["raw"] for u in analysis["unknown_variants"]],
            n_known=len(analysis["variants"]), n_unknown=len(analysis["unknown_variants"]), evidence_ids=[], status="n/a")
        for u in analysis["unknown_variants"]:
            add(type="gap", raw=u["raw"], evidence_ids=[], status="unknown")
    elif intent == "explain":
        for h in hyps:
            if h["type"] == "direct":
                add(type="direct", gene=h["gene"], variant=h["variant"], drug=h["drug"], status=h["status"],
                    evidence_ids=[e["evidence_id"] for e in h["supporting"]])
            else:
                add(type="compensatory", secondary=h["secondary"], primary=h["primary"], status=h["status"],
                    evidence_ids=[e["evidence_id"] for e in h["supporting"]])
        for u in analysis["unknown_variants"]:
            add(type="gap", raw=u["raw"], evidence_ids=[], status="unknown")
    elif intent == "compensatory":
        comp = [h for h in hyps if h["type"] == "compensatory"]
        if not comp:
            add(type="no_compensatory", evidence_ids=[], status="n/a")
        for h in comp:
            add(type="compensatory", secondary=h["secondary"], primary=h["primary"], status=h["status"],
                evidence_ids=[e["evidence_id"] for e in h["supporting"]])
    elif intent == "phenotype_check":
        for c in analysis["phenotype_checks"]:
            add(type="phenotype", drug=c["drug"], kind=c["kind"], message=c["message"], evidence_ids=[], status=c["kind"])
        if not analysis["phenotype_checks"]:
            add(type="none", evidence_ids=[], status="n/a")
    elif intent == "evidence_gaps":
        for u in analysis["unknown_variants"]:
            add(type="gap", raw=u["raw"], evidence_ids=[], status="unknown")
        if not analysis["unknown_variants"]:
            add(type="none", evidence_ids=[], status="n/a")
    elif intent == "limitations":
        add(type="limitations", evidence_ids=[], status="n/a")
    else:  # unknown / whatif -> help (what-if is available in the Results tab)
        add(type="help", evidence_ids=[], status="n/a")
    return facts


def validate_llm_output(raw: str, facts: list[dict], kb: KnowledgeBase) -> Optional[dict]:
    """Return {'answer','used_fact_ids'} if safe, else None."""
    try:
        s = raw.strip()
        s = re.sub(r"^```(?:json)?|```$", "", s, flags=re.M).strip()
        obj = json.loads(s)
        answer, used = obj["answer"], obj["used_fact_ids"]
        assert isinstance(answer, str) and isinstance(used, list)
    except Exception:
        return None
    ids = {f["fact_id"] for f in facts}
    if not used or any(u not in ids for u in used):
        return None
    blob = json.dumps(facts, ensure_ascii=False)
    for tok in VARIANT_TOKEN.findall(answer):
        if tok not in blob:
            return None
    for g in kb.gene_names:
        if re.search(rf"\b{re.escape(g)}\b", answer, re.I) and g not in blob:
            return None
    known_ev = set(kb.evidence_by_id) | set(kb.relation_by_id)
    for tok in EVIDENCE_TOKEN.findall(answer):
        if tok.rstrip(".") not in known_ev or tok.rstrip(".") not in blob:
            return None
    low = answer.lower()
    if any(p in low for p in FORBIDDEN):
        return None
    for pct in re.findall(r"\d+\s*%", answer):
        if pct not in blob:
            return None
    return {"answer": answer, "used_fact_ids": used}


async def compose(analysis: dict, question: str, language: str, kb: KnowledgeBase) -> dict:
    s = get_settings()
    intent = detect_intent(question)
    facts = build_facts(analysis, intent)
    lang = i18n.lang_key(language)
    template_text = i18n.render_answer(facts, lang)
    all_ids = [f["fact_id"] for f in facts]
    evidence_ids = sorted({e for f in facts for e in f.get("evidence_ids", [])})
    result = {"answer_text": template_text, "language": language, "intent": intent,
              "source": "template", "used_fact_ids": all_ids, "evidence_ids": evidence_ids,
              "guardrail": {"passed": True, "fallback": False}}

    if s.llm_mode == "evon" and intent not in ("unknown", "whatif"):
        try:
            raw = await evon.complete(
                EVON_SYSTEM_PROMPT.format(language=language),
                json.dumps({"QUESTION": question, "FACTS": facts}, ensure_ascii=False))
            ok = validate_llm_output(raw, facts, kb)
            if ok:
                result.update(answer_text=ok["answer"], used_fact_ids=ok["used_fact_ids"], source="evon_v3.3")
            else:
                result["guardrail"] = {"passed": False, "fallback": True}
        except GnaniError:
            result["guardrail"] = {"passed": True, "fallback": True, "reason": "llm_unavailable"}
    return result
