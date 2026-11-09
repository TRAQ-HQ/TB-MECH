"""Pydantic models: KB records and API payloads."""
from typing import Literal, Optional

from pydantic import BaseModel, Field


class Citation(BaseModel):
    pmid: Optional[str] = None
    doi: Optional[str] = None
    text: str = "VERIFY"


class Gene(BaseModel):
    gene: str
    locus_tag: str
    product: str
    role: str = ""
    verified: bool = False
    sources: list[str] = []


class Drug(BaseModel):
    drug: str
    abbr: str
    drug_class: str = Field(alias="class", default="")
    primary_genes: list[str] = []
    notes: str = ""
    verified: bool = False

    model_config = {"populate_by_name": True}


class Variant(BaseModel):
    variant_id: str
    gene: str
    hgvs_p: Optional[str] = None
    short: str
    drug: str
    effect_class: str
    who_group: Optional[int] = None
    who_catalogue_version: str = "VERIFY"
    evidence_ids: list[str] = []
    verified: bool = False


class Evidence(BaseModel):
    evidence_id: str
    variant_id: str
    claim: str
    direction: Literal["supports", "contradicts"] = "supports"
    evidence_type: Literal["functional_experiment", "structural", "association", "review", "catalogue"]
    grade: Literal["A", "B", "C", "D"]
    source_group: str
    citation: Citation = Citation()
    limitations: str = ""
    verified: bool = False


class Relation(BaseModel):
    relation_id: str
    type: Literal["compensates_for", "co_occurs_with", "epistatic_with"]
    from_variant: str
    to_variant: str
    claim: str
    evidence_type: Literal["functional_experiment", "structural", "association", "review", "catalogue"]
    grade: Literal["A", "B", "C", "D"]
    source_group: str
    citation: Citation = Citation()
    limitations: str = ""
    verified: bool = False
    direction: Literal["supports", "contradicts"] = "supports"

    @property
    def evidence_id(self) -> str:  # uniform access with Evidence
        return self.relation_id


# ---- API payloads ----
class AnalyzeRequest(BaseModel):
    variants: list[str]
    phenotype: dict[str, Literal["R", "S"]] = {}
    isolate_id: Optional[str] = None
    synthetic: bool = True


class ParseRequest(BaseModel):
    text: str


class WhatIfRequest(BaseModel):
    remove: list[str]


class AskRequest(BaseModel):
    analysis_id: str
    question: str
    language: str = "hi-IN"


class SpeakRequest(BaseModel):
    text: str
    language: str = "hi-IN"
    voice: Optional[str] = None
