"""Deterministic evidence engine. NO language model in this module.

Evidence strength index is ORDINAL (not a probability). Status labels are rule-based
and take precedence over the number.
"""
import uuid
from datetime import datetime, timezone
from typing import Iterable, Optional

from ..config import ENGINE_VERSION
from .kb import KnowledgeBase

GRADE_VALUE = {"A": 1.0, "B": 0.75, "C": 0.5, "D": 0.25}
STATUS_ORDER = ["experimentally_supported", "multi_study_association", "association_candidate",
                "weak_or_indirect", "conflicting", "unknown"]
LIMITATIONS = [
    "Research-support prototype; not diagnostic and not for treatment decisions.",
    "Associations are not proof of mechanism.",
    "The knowledge base is small, curated and may be incomplete or out of date.",
    "Records marked Unverified have not been checked against primary sources.",
    "Demonstration isolates are synthetic.",
    "Evidence strength index is an ordinal summary, not a probability.",
]


def _g(rec) -> float:
    return GRADE_VALUE[rec.grade]


def assess(support: list, contra: list, is_comp: bool = False) -> tuple[str, float, int]:
    """Return (status, evidence_index, n_independent_sources)."""
    if not support:
        return "unknown", 0.0, 0
    n_ind = len({r.source_group for r in support})
    s_val = min(max(_g(r) for r in support) + 0.10 * min(n_ind - 1, 3), 1.0)
    c_val = 0.5 * max(_g(r) for r in contra) if contra else 0.0
    index = round(max(0.0, min(1.0, s_val - c_val)), 2)

    if contra and (any(r.grade in ("A", "B") for r in contra) or c_val >= s_val):
        return "conflicting", index, n_ind
    has_exp = any(r.evidence_type in ("functional_experiment", "structural") and r.grade == "A"
                  for r in support)
    best = max(_g(r) for r in support)
    if has_exp:
        status = "experimentally_supported"
    elif n_ind >= 2 and best >= GRADE_VALUE["B"]:
        status = "multi_study_association"
    elif any(r.evidence_type in ("association", "catalogue") for r in support):
        status = "association_candidate"
    else:
        status = "weak_or_indirect"
    # co-occurrence is not compensation: cap unless direct experimental evidence
    if is_comp and status == "multi_study_association":
        status = "association_candidate"
    return status, index, n_ind


def ev_dict(r) -> dict:
    return {
        "evidence_id": r.evidence_id, "claim": r.claim, "direction": r.direction,
        "evidence_type": r.evidence_type, "grade": r.grade, "source_group": r.source_group,
        "citation": r.citation.model_dump(), "limitations": r.limitations, "verified": r.verified,
    }


def _rank_key(h: dict):
    return (STATUS_ORDER.index(h["status"]), -h["evidence_index"], h["hypothesis_id"])


def analyze(kb: KnowledgeBase, candidates: list[dict], phenotype: Optional[dict] = None,
            isolate_id: Optional[str] = None, synthetic: bool = True,
            exclude_variant_ids: Iterable[str] = (), analysis_id: Optional[str] = None) -> dict:
    phenotype = {k.lower(): v for k, v in (phenotype or {}).items()}
    exclude = set(exclude_variant_ids)

    present: dict[str, dict] = {}
    unknown: list[dict] = []
    seen_unknown = set()
    for c in candidates:
        v = kb.find_variant(c["gene"], c["variant"])
        if v is None:
            if c["raw"] not in seen_unknown:
                seen_unknown.add(c["raw"])
                unknown.append({"raw": c["raw"], "gene": c["gene"], "variant": c["variant"],
                                "message": "No curated evidence in this knowledge base."})
            continue
        if v.variant_id in exclude:
            continue
        present[v.variant_id] = {
            "variant_id": v.variant_id, "raw": c["raw"], "gene": v.gene, "variant": v.short,
            "in_kb": True, "drug": v.drug, "effect_class": v.effect_class,
            "evidence_ids": v.evidence_ids, "verified": v.verified,
        }

    hyps: list[dict] = []
    for vid in present:
        v = kb.variant_by_id[vid]
        if v.effect_class == "compensatory_candidate":
            continue  # only meaningful through a relation
        ev = kb.evidence_for_variant(vid)
        sup = [e for e in ev if e.direction == "supports"]
        con = [e for e in ev if e.direction == "contradicts"]
        status, idx, n_ind = assess(sup, con)
        hyps.append({
            "hypothesis_id": f"H_direct:{vid}", "type": "direct", "variant_ids": [vid],
            "gene": v.gene, "variant": v.short, "drug": v.drug, "effect_class": v.effect_class,
            "claim": f"{v.gene} {v.short} is associated with {v.drug} resistance (effect class: {v.effect_class}).",
            "status": status, "evidence_index": idx, "independent_sources": n_ind,
            "supporting": [ev_dict(e) for e in sup], "contradicting": [ev_dict(e) for e in con],
            "verified": all(e.verified for e in sup) if sup else False,
        })

    interactions: list[dict] = []
    for r in kb.relations_for("compensates_for"):
        if r.from_variant in present and r.to_variant in present:
            status, idx, n_ind = assess([r], [], is_comp=True)
            s, p = kb.variant_by_id[r.from_variant], kb.variant_by_id[r.to_variant]
            h = {
                "hypothesis_id": f"H_comp:{s.variant_id}>{p.variant_id}", "type": "compensatory",
                "variant_ids": [s.variant_id, p.variant_id], "secondary": f"{s.gene} {s.short}",
                "primary": f"{p.gene} {p.short}", "drug": p.drug,
                "claim": f"{s.gene} {s.short} may compensate for fitness effects of {p.gene} {p.short}.",
                "status": status, "evidence_index": idx, "independent_sources": n_ind,
                "supporting": [ev_dict(r)], "contradicting": [], "verified": r.verified,
            }
            hyps.append(h)
            interactions.append({"relation_id": r.relation_id, "type": r.type,
                                 "from": s.variant_id, "to": p.variant_id, "status": status})
    hyps.sort(key=_rank_key)

    checks: list[dict] = []
    for drug, ph in phenotype.items():
        predicted = any(h["type"] == "direct" and h["drug"].lower() == drug
                        and h["status"] not in ("unknown", "conflicting") for h in hyps)
        if predicted and ph == "R":
            kind, msg = "consistent", "Phenotype resistant; consistent with a variant associated with resistance."
        elif predicted and ph == "S":
            kind, msg = "discordant", ("Phenotype susceptible despite a variant associated with resistance. "
                                       "Possible reasons include variant-specific effect sizes, borderline MIC, "
                                       "testing issues or an incomplete knowledge base. Needs expert review.")
        elif ph == "R":
            kind, msg = "unexplained_by_kb", "Phenotype resistant but this knowledge base has no explanation for this drug."
        else:
            kind, msg = "no_signal", "Phenotype susceptible and no associated variant found in this knowledge base."
        checks.append({"drug": drug, "phenotype": ph, "kind": kind, "message": msg})

    return {
        "analysis_id": analysis_id or uuid.uuid4().hex[:12],
        "isolate_id": isolate_id, "synthetic": synthetic,
        "inputs": {"candidates": candidates, "phenotype": phenotype},
        "variants": list(present.values()), "unknown_variants": unknown,
        "hypotheses": hyps, "interactions": interactions, "phenotype_checks": checks,
        "limitations": LIMITATIONS,
        "provenance": {"kb_version": kb.version, "kb_sha256": kb.sha256, "engine_version": ENGINE_VERSION,
                       "created_utc": datetime.now(timezone.utc).isoformat()},
    }


def whatif(kb: KnowledgeBase, analysis: dict, remove: list[str]) -> dict:
    inp = analysis["inputs"]
    new = analyze(kb, inp["candidates"], inp["phenotype"], analysis.get("isolate_id"),
                  analysis.get("synthetic", True), exclude_variant_ids=remove)
    old = {h["hypothesis_id"]: h for h in analysis["hypotheses"]}
    cur = {h["hypothesis_id"]: h for h in new["hypotheses"]}
    return {
        "removed_variants": remove,
        "lost_hypotheses": [hid for hid in old if hid not in cur],
        "changed_hypotheses": [{"hypothesis_id": hid, "from": old[hid]["status"], "to": cur[hid]["status"]}
                               for hid in old if hid in cur and old[hid]["status"] != cur[hid]["status"]],
        "remaining_hypotheses": [h["hypothesis_id"] for h in new["hypotheses"]],
        "note": "Knowledge-base sensitivity check. This shows what the curated evidence implies, "
                "not what would happen biologically.",
    }
