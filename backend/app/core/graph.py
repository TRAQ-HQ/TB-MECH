"""Provenance-aware evidence graph (NetworkX) with Cytoscape.js export.

Evidence from different source_groups is never merged into one edge.
"""
import networkx as nx

from .kb import KnowledgeBase


def build_graph(kb: KnowledgeBase, analysis: dict) -> nx.MultiDiGraph:
    G = nx.MultiDiGraph()
    iso = f"isolate:{analysis.get('isolate_id') or analysis['analysis_id']}"
    G.add_node(iso, label=analysis.get("isolate_id") or "isolate", type="isolate")
    present = {v["variant_id"] for v in analysis["variants"]}

    for vid in present:
        v = kb.variant_by_id[vid]
        vn, gn, dn = f"variant:{vid}", f"gene:{v.gene}", f"drug:{v.drug}"
        G.add_node(vn, label=f"{v.gene} {v.short}", type="variant")
        G.add_node(gn, label=v.gene, type="gene")
        G.add_node(dn, label=v.drug, type="drug")
        G.add_edge(iso, vn, type="has_variant")
        G.add_edge(vn, gn, type="in_gene")
        for e in kb.evidence_for_variant(vid):
            en = f"evidence:{e.evidence_id}"
            G.add_node(en, label=e.evidence_id, type="evidence")
            meta = dict(evidence_id=e.evidence_id, grade=e.grade, evidence_type=e.evidence_type,
                        source_group=e.source_group, verified=e.verified)
            if e.direction == "supports":
                G.add_edge(vn, dn, type="associated_with", **meta)
                G.add_edge(vn, en, type="supported_by", **meta)
            else:
                G.add_edge(vn, en, type="contradicted_by", **meta)

    for r in kb.relations_for("compensates_for"):
        if r.from_variant in present and r.to_variant in present:
            en = f"evidence:{r.relation_id}"
            G.add_node(en, label=r.relation_id, type="evidence")
            meta = dict(evidence_id=r.relation_id, grade=r.grade, evidence_type=r.evidence_type,
                        source_group=r.source_group, verified=r.verified)
            G.add_edge(f"variant:{r.from_variant}", f"variant:{r.to_variant}", type="compensates_for", **meta)
            G.add_edge(f"variant:{r.from_variant}", en, type="supported_by", **meta)
    return G


def to_cytoscape(G: nx.MultiDiGraph) -> dict:
    nodes = [{"data": {"id": n, **d}} for n, d in G.nodes(data=True)]
    edges = [{"data": {"id": f"e{i}", "source": u, "target": v, **d}}
             for i, (u, v, d) in enumerate(G.edges(data=True))]
    return {"nodes": nodes, "edges": edges}
