from app.core.kb import load_kb


def test_kb_loads_and_validates():
    kb = load_kb()
    assert kb.variants and kb.evidence and kb.relations
    for v in kb.variants:
        if v.effect_class != "compensatory_candidate":
            assert v.evidence_ids, f"{v.variant_id} has no evidence"
    assert kb.find_variant("rpoB", "s450l").variant_id == "rpoB_S450L"


def test_kb_hash_is_stable():
    assert load_kb().sha256 == load_kb().sha256


def test_evidence_records_verified_with_citations():
    kb = load_kb()
    assert all(e.verified for e in kb.evidence)
    for e in kb.evidence:
        assert e.citation.pmid is not None
