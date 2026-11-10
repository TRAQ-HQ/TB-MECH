# Mandatory Scientific Limitations (Section 18 Verbatim)

> TB-MECH Voice is a research-support prototype. It does not diagnose, predict treatment outcomes, or recommend therapy. Hypotheses reflect a small curated knowledge base; associations are not proof of mechanism. Records marked "Unverified" have not been checked against primary sources. The evidence strength index is an ordinal summary and not a probability. Demonstration isolates are synthetic. Speech transcripts can contain errors, especially for gene names and mutation notation, so review them before analysis.

---

## Technical & Contextual Clarifications

1. **Ordinal Summary, Not a Probability:**
   The evidence strength index calculated by the engine ($[0.0, 1.0]$) is a strictly deterministic, ordinal metric reflecting the highest curation grade of supporting studies penalised by contradiction records. It must never be interpreted as a Bayesian posterior probability or a clinical likelihood percentage.

2. **Association vs. Molecular Causation:**
   Statistical co-occurrence and catalogue associations (such as `rpoC V483G` co-occurring with `rpoB S450L`) are capped at `association_candidate` unless corroborated by direct functional biochemical or crystal structural experiments.

3. **Phenotype-Genotype Discordance:**
   Isolates such as `SYN-003` exhibit phenotypic susceptibility despite carrying canonical resistance mutations (`rpoB S450L`). In clinical reality, discordant findings arise from testing artifacts, heteroresistance, or non-expressing pseudogenes. TB-MECH Voice flags these explicitly without overwriting experimental observations.
