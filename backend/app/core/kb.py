"""Knowledge base loader, validator and indexer."""
import hashlib
import json
from functools import lru_cache
from pathlib import Path
from typing import Optional

from ..config import ROOT
from ..schemas import Drug, Evidence, Gene, Relation, Variant

KB_FILES = ["meta", "genes", "drugs", "variants", "evidence", "relations", "aliases"]


def norm_short(s: str) -> str:
    return s.upper().replace(" ", "")


class KnowledgeBase:
    def __init__(self, data: dict):
        self.meta = data.get("meta", {})
        self.genes = [Gene(**g) for g in data["genes"]]
        self.drugs = [Drug(**d) for d in data["drugs"]]
        self.variants = [Variant(**v) for v in data["variants"]]
        self.evidence = [Evidence(**e) for e in data["evidence"]]
        self.relations = [Relation(**r) for r in data["relations"]]
        self.aliases: dict[str, list[str]] = data.get("aliases", {})
        self.sha256 = hashlib.sha256(
            json.dumps(data, sort_keys=True, ensure_ascii=False).encode("utf-8")
        ).hexdigest()
        self._index()
        self.validate()

    @property
    def version(self) -> str:
        return self.meta.get("kb_version", "unknown")

    def _index(self) -> None:
        self.variant_by_id = {v.variant_id: v for v in self.variants}
        self.gene_names = [g.gene for g in self.genes]
        self.evidence_by_id = {e.evidence_id: e for e in self.evidence}
        self.relation_by_id = {r.relation_id: r for r in self.relations}
        self._by_gene_short = {(v.gene.lower(), norm_short(v.short)): v for v in self.variants}
        self._ev_by_variant: dict[str, list[Evidence]] = {}
        for e in self.evidence:
            self._ev_by_variant.setdefault(e.variant_id, []).append(e)

    def validate(self) -> None:
        genes = set(self.gene_names)
        for v in self.variants:
            if v.gene not in genes:
                raise ValueError(f"Variant {v.variant_id}: unknown gene {v.gene}")
            for eid in v.evidence_ids:
                if eid not in self.evidence_by_id:
                    raise ValueError(f"Variant {v.variant_id}: unknown evidence {eid}")
        for e in self.evidence:
            if e.variant_id not in self.variant_by_id:
                raise ValueError(f"Evidence {e.evidence_id}: unknown variant {e.variant_id}")
        for r in self.relations:
            for vid in (r.from_variant, r.to_variant):
                if vid not in self.variant_by_id:
                    raise ValueError(f"Relation {r.relation_id}: unknown variant {vid}")

    def find_variant(self, gene: str, short: str) -> Optional[Variant]:
        return self._by_gene_short.get((gene.lower(), norm_short(short)))

    def evidence_for_variant(self, variant_id: str) -> list[Evidence]:
        return self._ev_by_variant.get(variant_id, [])

    def relations_for(self, rtype: str) -> list[Relation]:
        return [r for r in self.relations if r.type == rtype]


def load_kb(path: Optional[Path] = None) -> KnowledgeBase:
    base = Path(path) if path else ROOT / "data" / "kb"
    data = {}
    for name in KB_FILES:
        with open(base / f"{name}.json", encoding="utf-8") as f:
            data[name] = json.load(f)
    return KnowledgeBase(data)


@lru_cache(maxsize=1)
def get_kb() -> KnowledgeBase:
    return load_kb()
