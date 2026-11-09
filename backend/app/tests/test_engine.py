import copy

from app.core import engine
from app.core.graph import build_graph, to_cytoscape
from app.core.kb import KnowledgeBase, load_kb
from app.core.normalizer import parse_text

kb = load_kb()


def run(text, pheno=None):
    return engine.analyze(kb, parse_text(text, kb)["candidates"], pheno)


def test_syn001_direct_and_compensatory():
    a = run("rpoB S450L katG S315T rpoC V483G", {"rifampicin": "R", "isoniazid": "R"})
    ids = {h["hypothesis_id"] for h in a["hypotheses"]}
    assert {"H_direct:rpoB_S450L", "H_direct:katG_S315T", "H_comp:rpoC_V483G>rpoB_S450L"} <= ids
    comp = next(h for h in a["hypotheses"] if h["type"] == "compensatory")
    assert comp["status"] in ("association_candidate", "weak_or_indirect")
    assert all(c["kind"] == "consistent" for c in a["phenotype_checks"])


def test_secondary_alone_gives_no_compensatory():
    a = run("rpoC V483G")
    assert not [h for h in a["hypotheses"] if h["type"] == "compensatory"]


def test_syn003_discordance_and_unknown():
    a = run("rpoB S450L katG A999V", {"rifampicin": "S"})
    assert a["phenotype_checks"][0]["kind"] == "discordant"
    assert a["unknown_variants"][0]["raw"] == "katG A999V"


def test_unexplained_by_kb():
    a = run("gyrA D94G", {"rifampicin": "R"})
    assert a["phenotype_checks"][0]["kind"] == "unexplained_by_kb"


def _kb_with(extra_evidence=(), extra_relation=None):
    data = {
        "meta": {"kb_version": "t"}, "aliases": {},
        "genes": [{"gene": "rpoB", "locus_tag": "x", "product": "p"}],
        "drugs": [{"drug": "rifampicin", "abbr": "RIF"}],
        "variants": [{"variant_id": "rpoB_S450L", "gene": "rpoB", "short": "S450L", "drug": "rifampicin",
                      "effect_class": "target_alteration", "evidence_ids": [e["evidence_id"] for e in extra_evidence]}],
        "evidence": list(extra_evidence), "relations": [],
    }
    return KnowledgeBase(data)


def _ev(eid, grade="B", group="g1", direction="supports", etype="association"):
    return {"evidence_id": eid, "variant_id": "rpoB_S450L", "claim": "c", "direction": direction,
            "evidence_type": etype, "grade": grade, "source_group": group}


def _status(kb2):
    a = engine.analyze(kb2, [{"raw": "rpoB S450L", "gene": "rpoB", "variant": "S450L"}])
    return a["hypotheses"][0]


def test_same_source_group_counts_once():
    h = _status(_kb_with([_ev("E1", "B", "same"), _ev("E2", "B", "same")]))
    assert h["independent_sources"] == 1 and h["status"] == "association_candidate"


def test_two_independent_sources_multi_study():
    h = _status(_kb_with([_ev("E1", "B", "a"), _ev("E2", "B", "b")]))
    assert h["status"] == "multi_study_association" and h["evidence_index"] == 0.85


def test_contradiction_sets_conflicting():
    h = _status(_kb_with([_ev("E1", "B", "a"), _ev("E2", "B", "b", direction="contradicts")]))
    assert h["status"] == "conflicting"


def test_experimental_grade_a():
    h = _status(_kb_with([_ev("E1", "A", "a", etype="functional_experiment")]))
    assert h["status"] == "experimentally_supported" and h["evidence_index"] == 1.0


def test_index_in_range_and_not_percent():
    a = run("rpoB S450L katG S315T")
    for h in a["hypotheses"]:
        assert 0.0 <= h["evidence_index"] <= 1.0 and isinstance(h["evidence_index"], float)


def test_whatif_removes_dependent_compensatory():
    a = run("rpoB S450L rpoC V483G")
    r = engine.whatif(kb, a, ["rpoB_S450L"])
    assert "H_direct:rpoB_S450L" in r["lost_hypotheses"]
    assert "H_comp:rpoC_V483G>rpoB_S450L" in r["lost_hypotheses"]


def test_graph_edges_carry_provenance():
    a = run("rpoB S450L rpoC V483G")
    g = to_cytoscape(build_graph(kb, a))
    for e in g["edges"]:
        if e["data"]["type"] in ("associated_with", "supported_by", "compensates_for", "contradicted_by"):
            assert e["data"]["evidence_id"] and e["data"]["source_group"]
