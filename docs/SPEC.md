# TB-MECH (Gnani Edition): Final Implementation Spec for an LLM Coding Agent

**Target:** Great Indian AI Internship Challenge 2026 (Gnani.ai), theme "Build Sovereign AI for India"
**Hard deadline:** 11:59 PM IST, 10 November 2026, no extensions (per the challenge coverage; confirm at gnani.ai/internship)
**Product:** A voice-first, Indian-language, evidence-grounded assistant that helps TB researchers and students interpret *Mycobacterium tuberculosis* drug-resistance mutations, and shows *why* with traceable evidence and explicit uncertainty.
**Status of outputs:** Research-support prototype. Not diagnostic. Not a treatment tool.

---

## 0. Instructions to the implementing LLM (read first)

You are building an MVP that must be demonstrable, honest and finished, in that order. Follow these rules throughout.

1. **Priority tiers.** Build P0 completely before touching P1. Build P1 before P2. Never leave P0 half-done to start something interesting.
2. **Never fabricate science.** Every biological claim shown to a user must come from a record in the knowledge base (KB) with a source. If a variant is not in the KB, the app says "no curated evidence in this knowledge base". It never guesses.
3. **Never fabricate Gnani behaviour.** Do not invent endpoints, payloads, model IDs or language codes. Use only what is in section 10 or what you read in the official docs (https://docs.gnani.ai). Where this spec says VERIFY, check the docs and record what you found in `docs/verified_facts.md`.
4. **The LLM never computes scores or invents citations.** All scores, statuses and evidence IDs come from the deterministic engine (section 9). Evon (or the template fallback) only phrases results.
5. **Honest provenance in the UI.** Every spoken or written answer shows which component produced it: `Evon v3.3`, `Template (no LLM)`, or `MOCK`. Do not label something as Evon unless Evon actually generated it.
6. **Synthetic data only.** No real patient data, phone numbers, IDs or third-party voice recordings. Demo isolates are synthetic and labelled as such everywhere. Do not delete this label.
7. **Secrets.** API keys live only in backend environment variables. Commit `.env.example`, never `.env`.
8. **Mock mode first.** Every Gnani wrapper must work in mock mode so the whole app can be developed and tested offline. The final demo video must be recorded with mock mode OFF.
9. **Keep it small.** No Neo4j, Postgres, Celery, Docker or React build chain in P0/P1. Use FastAPI plus one static HTML page.
10. **After each milestone**, run the tests (section 15) and fix failures before continuing.

---

## 1. Verdict on the original plan and what changed

The original plan is scientifically careful, but it was written as a research programme (49 days, 17 deliverables). The challenge is a build-and-demo contest judged on a working application, a public demo, a written explanation and honest use of named Gnani models.

| # | Issue in original plan | Change made here |
|---|---|---|
| 1 | Voice was an optional add-on to an English genomics workflow | Voice is the **primary interface**, in Indian languages, including code-mixed speech |
| 2 | Evon was assumed to be an API with endpoint variables | Evon v3.3 is **open-weight, requested via Hugging Face, not on the API platform** (per challenge page). It becomes a P1 self-hosted component with a mandatory fallback |
| 3 | Model versions loosely named | Use Prisma v2.5 (STT) and Timbre (TTS, challenge page says v2.5 beta, the HF card says v2.0: VERIFY in dashboard) |
| 4 | Separate endpoint env vars per Gnani service | Gnani's HF integration states all speech endpoints need only `GNANI_API_KEY` |
| 5 | CRyPTIC-scale data plus population-structure statistics | Not feasible by the deadline, and challenge rules call for synthetic data only. P0/P1 use a small curated KB and synthetic isolates. Statistics module is P2 and clearly labelled as a code demo, not a finding |
| 6 | Hugging Face biomedical model benchmarking, GNN, Neo4j, Postgres, Celery | Dropped from MVP |
| 7 | 17 deliverables, 7 pages | Reduced to one page with tabs and a defined P0 set |
| 8 | "Multilingual" in positioning but no language design | Explicit language support, spoken-mutation normaliser and confirm-before-analyse step |
| 9 | Novelty claim of an evidence-weighted interaction framework | Reframed honestly as an **evidence-grounded interpretation assistant**. Research novelty is not claimed |
| 10 | No submission mechanics | Added demo script, 60-second video plan, hashtags, and submission checklist |

What is kept from the original: provenance-aware evidence graph, separation of association from mechanism, contradiction handling, uncertainty labels, counterfactual sensitivity (as KB what-if), no clinical claims, transcript review before use.

---

## 2. Challenge requirements checklist

Source: public coverage of the official programme page. The official page gnani.ai/internship holds the binding terms, so re-read it before submitting.

| Requirement | How this project meets it | Status |
|---|---|---|
| Must use Gnani models/APIs and **name each one** in the submission | Prisma v2.5 (P0), Timbre (P0), Evon v3.3 (P1, only if actually run) | P0 |
| Working app plus demo or video | Web app and 60-second video | P0 |
| Written explanation | Section 17 template | P0 |
| Public post on LinkedIn or X with `#GreatIndianAIInternshipChallenge` and `#GnaniAI`, then nominate the posts | Section 17 checklist | P0 |
| Synthetic data only; voice is personal data under DPDP Act | Synthetic isolates; record only yourself or a consenting teammate; do not store audio | P0 |
| No bought engagement or faked demos; honest limitations preferred | Limitations panel plus honest provenance badges | P0 |
| Solo or team of two; credits (5,000) go to the primary registrant | Decide who holds the API key | Info |
| Read programme terms on ownership before submitting | Do this | Info |
| Award categories (read as the brief): Main Character (regional/low-resource language), Mixed Vibes (code-mixed), Real Deal, Noise Canceller, Jugaad Genius, Small Town Big Build, Demo Day Drop (60 s video), Solo Ninja / Two-Person Army | Target **Main Character, Mixed Vibes, Real Deal, Demo Day Drop**. Test with noisy audio for Noise Canceller | Strategy |

---

## 3. Product definition

**Name:** TB-MECH Voice
**One line:** Speak a TB isolate's mutations in your language, hear which resistance mechanisms the evidence supports, which it does not, and where the knowledge base is silent.

**Users:** TB genomics students, microbiology researchers, lab microbiologists who are more comfortable in an Indian language than English. India carries a very large share of the global TB burden, so an accessible interpretation aid is relevant.

**Core flow (P0):**
1. User selects a language, then speaks or types mutations (for example "rpoB S450L aur katG S315T").
2. Prisma transcribes. The app shows the transcript and parsed mutation chips for the user to **confirm or edit**.
3. The engine looks each variant up in the KB, builds the evidence graph, ranks mechanism hypotheses, detects KB-curated compensatory pairs, and flags unknowns.
4. UI shows variants, hypotheses with evidence status, graph, and limitations.
5. User asks follow-up questions by voice or text. Answer is composed from engine output only. Timbre reads it aloud in the selected language.

**Out of scope:** diagnosis, treatment or regimen advice, resistance "calls" for patient care, raw-read processing, wet-lab protocols, claims of new biological discovery, any real patient data.

---

## 4. Architecture

```text
Browser (index.html + JS)
  mic (MediaRecorder) / text input / language picker
        |
        v
FastAPI backend
  /api/voice/transcribe --> Prisma wrapper (Gnani, STT)
  /api/parse-variants  --> normaliser (rules first, optional Evon assist, KB-validated)
  /api/analyze         --> engine: KB lookup -> graph -> hypotheses -> scores -> limitations
  /api/analysis/{id}/whatif --> engine re-run with variants removed
  /api/assistant/ask   --> intent -> engine facts -> composer (Evon or template) -> guardrail validator
  /api/voice/speak     --> Timbre wrapper (Gnani, TTS)
  /api/report/{id}     --> JSON / Markdown export with versions and flags
        |
        v
data/kb/*.json (curated, versioned, verification flags)
data/demo/*.json (synthetic isolates)
```

Design principle: **deterministic engine in the middle, language models only at the edges** (speech in, phrasing out).

---

## 5. Tech stack and repo layout

**Backend:** Python 3.11+, FastAPI, Uvicorn, Pydantic v2, httpx, NetworkX, python-multipart, pydub plus ffmpeg (audio conversion), pytest, python-dotenv.
**Frontend:** one `static/index.html` with vanilla JS and Cytoscape.js loaded from a CDN. No build step.
**Optional (P1):** vLLM or Transformers for Evon; `gnani-vachana` and `transformers` if you use the Hugging Face pipeline route for speech.
**Storage:** in-memory dict plus JSON files in `data/runs/`. No database.

```text
tb-mech/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── schemas.py
│   │   ├── api/
│   │   │   ├── analysis.py
│   │   │   ├── voice.py
│   │   │   ├── assistant.py
│   │   │   └── report.py
│   │   ├── core/
│   │   │   ├── kb.py              # load, validate, hash KB
│   │   │   ├── normalizer.py      # spoken/typed mutation parsing
│   │   │   ├── engine.py          # lookup, hypotheses, scoring, whatif
│   │   │   ├── graph.py           # NetworkX build and Cytoscape export
│   │   │   ├── composer.py        # answer composition + guardrail validator
│   │   │   ├── i18n.py            # template strings per language
│   │   │   └── stats_demo.py      # P2 only
│   │   ├── gnani/
│   │   │   ├── prisma.py
│   │   │   ├── timbre.py
│   │   │   ├── evon.py
│   │   │   └── audio.py           # webm/opus -> wav conversion
│   │   └── tests/
│   └── requirements.txt
├── static/index.html
├── data/
│   ├── kb/{genes,drugs,variants,evidence,relations}.json
│   ├── demo/synthetic_isolates.json
│   └── runs/                      # gitignored
├── docs/{verified_facts.md,limitations.md,architecture.md}
├── .env.example
├── .gitignore
└── README.md
```

---

## 6. Configuration

`.env.example`:

```env
# Gnani
GNANI_API_KEY=
GNANI_MOCK=1                # 1 = canned responses for dev; MUST be 0 for the final demo
GNANI_STT_LANGUAGE_DEFAULT=hi-IN
GNANI_TTS_VOICE_DEFAULT=Kaveri   # from HF card; VERIFY current voice list in docs

# Evon (P1, self-hosted, OpenAI-compatible server such as vLLM)
LLM_MODE=template            # template | evon
EVON_BASE_URL=http://localhost:8001/v1
EVON_MODEL=                  # fill after obtaining weights; do not guess the repo name

# App
MAX_UPLOAD_MB=5
RUNS_DIR=data/runs
```

`config.py` exposes these via Pydantic Settings. `GET /api/meta` returns the active modes so the UI can display them.

---

## 7. Knowledge base (the factual backbone)

### 7.1 Verification workflow (mandatory, P0)

Seed records below are **from the model's general knowledge and are UNVERIFIED**. Before the demo:
1. For each record, check it against the current WHO catalogue of *M. tuberculosis* complex mutations and associated resistance, and against PubMed.
2. Fill `source` fields (PMID or DOI, or WHO catalogue edition and entry).
3. Set `verified: true` only after you personally checked it.
4. The UI shows an **"Unverified"** badge on any record with `verified: false`. The demo should use only verified records. If you run out of time, delete unverified records rather than showing them.

Do not add PMIDs from memory. Leave `pmid: null` until looked up.

### 7.2 Schemas (Pydantic models in `schemas.py`, JSON on disk)

`genes.json` item:
```json
{"gene":"rpoB","locus_tag":"Rv0667","product":"RNA polymerase beta subunit",
 "role":"Rifampicin target; drug binds the beta subunit and blocks RNA elongation",
 "verified":false,"sources":[]}
```

`drugs.json` item:
```json
{"drug":"rifampicin","abbr":"RIF","class":"rifamycin",
 "primary_genes":["rpoB"],"notes":"","verified":false}
```

`variants.json` item (protein-level, Mtb numbering; use `nucleotide` for promoter variants):
```json
{"variant_id":"rpoB_S450L","gene":"rpoB","hgvs_p":"p.Ser450Leu","short":"S450L",
 "drug":"rifampicin","effect_class":"target_alteration",
 "who_group":null,"who_catalogue_version":"VERIFY",
 "evidence_ids":["E_rpoB_S450L_001"],"verified":false}
```

`evidence.json` item:
```json
{"evidence_id":"E_rpoB_S450L_001","variant_id":"rpoB_S450L",
 "claim":"Associated with rifampicin resistance; lies in the rifampicin-binding region of the beta subunit.",
 "direction":"supports",              
 "evidence_type":"association",      
 "grade":"B",                        
 "source_group":"VERIFY_cohort_or_study",
 "citation":{"pmid":null,"doi":null,"text":"VERIFY"},
 "limitations":"",
 "verified":false}
```
- `direction`: `supports` | `contradicts`
- `evidence_type`: `functional_experiment` | `structural` | `association` | `review` | `catalogue`
- `grade`: `A` (direct functional or structural experiment) = 1.0, `B` (multiple independent association studies or catalogue) = 0.75, `C` (single association study) = 0.5, `D` (indirect or review only) = 0.25
- `source_group`: identifier of the underlying cohort or study family. Records sharing a `source_group` count as **one** independent source (prevents double counting).

`relations.json` item (curated interactions, including compensation):
```json
{"relation_id":"R_comp_001","type":"compensates_for",
 "from_variant":"rpoC_V483G","to_variant":"rpoB_S450L",
 "claim":"Candidate compensatory variant associated with restoring fitness in rifampicin-resistant strains carrying rpoB mutations.",
 "evidence_type":"association","grade":"C",
 "source_group":"VERIFY","citation":{"pmid":null,"doi":null,"text":"VERIFY (e.g. Comas et al. 2012, Nature Genetics; de Vos et al. 2013, AAC)"},
 "limitations":"Association and inference; not proof of mechanism for every strain background.",
 "verified":false}
```
Allowed `type`: `compensates_for`, `co_occurs_with`, `epistatic_with`.

### 7.3 Seed records (all UNVERIFIED; verify or remove)

Genes and loci: rpoB (Rv0667), rpoC (Rv0668), katG (Rv1908c), inhA (Rv1484), embB (Rv3795), gyrA (Rv0006).

| variant_id | gene | variant | drug | effect_class | notes to verify |
|---|---|---|---|---|---|
| rpoB_S450L | rpoB | S450L | rifampicin | target_alteration | Common rifampicin resistance variant (E. coli numbering S531L) |
| rpoB_D435V | rpoB | D435V | rifampicin | target_alteration | Rifampicin resistance region variant |
| katG_S315T | katG | S315T | isoniazid | prodrug_activation_loss | katG activates isoniazid; variant reduces activation |
| inhA_c-15C>T | inhA | c.-15C>T | isoniazid | target_overexpression | Promoter variant; verify cross-resistance to ethionamide |
| embB_M306V | embB | M306V | ethambutol | target_alteration | Verify evidence strength and reports in susceptible isolates |
| gyrA_D94G | gyrA | D94G | fluoroquinolones | target_alteration | DNA gyrase target |
| gyrA_A90V | gyrA | A90V | fluoroquinolones | target_alteration | DNA gyrase target |
| rpoC_V483G | rpoC | V483G | rifampicin (context) | compensatory_candidate | Relation record only, not a resistance variant by itself |

For the demo, the synthetic MDR-pattern isolate is `rpoB S450L + katG S315T + rpoC V483G` (section 7.4).

### 7.4 Synthetic demo isolates (`data/demo/synthetic_isolates.json`)

```json
[
 {"isolate_id":"SYN-001","synthetic":true,"variants":["rpoB S450L","katG S315T","rpoC V483G"],"phenotype":{"rifampicin":"R","isoniazid":"R"}},
 {"isolate_id":"SYN-002","synthetic":true,"variants":["gyrA D94G"],"phenotype":{}},
 {"isolate_id":"SYN-003","synthetic":true,"variants":["rpoB S450L","katG A999V"],"phenotype":{"rifampicin":"S"}},
 {"isolate_id":"SYN-004","synthetic":true,"variants":["embB M306V","inhA c.-15C>T"],"phenotype":{}}
]
```
SYN-003 deliberately contains an unknown variant (`katG A999V`, not in KB) and a **phenotype-genotype discordance** (rpoB S450L with phenotype S) to demonstrate honest handling of gaps.
Every API response for these isolates includes `"synthetic": true` and the UI shows a "Synthetic demonstration data" banner.

---

## 8. Variant parsing and spoken-notation normaliser (`core/normalizer.py`)

Goal: turn typed or transcribed text into candidate variants, then require user confirmation.

### 8.1 Output
```json
{"candidates":[{"raw":"rpoB S450L","gene":"rpoB","variant":"S450L","confidence":"high|medium|low","in_kb":true}],
 "unparsed_fragments":["..."]}
```

### 8.2 Algorithm
1. Normalise text: lowercase copy, strip punctuation except `.`, `>`, `-`, `_`.
2. **Gene detection** via alias dictionary (Latin names plus common ASR renderings). Examples: `rpob`, `rpo b`, `rpo bee`, `आरपीओबी`, `आर पी ओ बी`; `katg`, `kat g`, `kat gee`, `कैट जी`; and the same pattern for `rpoC`, `inhA`, `embB`, `gyrA`. Build the alias list programmatically from letter-name maps below plus a small hand-written list. Keep aliases in `data/kb/aliases.json`.
3. **Amino-acid variant detection**: regex `\b([ACDEFGHIKLMNPQRSTVWY])\s*(\d{1,4})\s*([ACDEFGHIKLMNPQRSTVWY*])\b` on the normalised text, plus three-letter forms (`Ser450Leu`, `p.Ser450Leu`). Also nucleotide promoter form `c.-15C>T` or `-15 C to T`.
4. **Spoken letter-names**: map English letter names (ay, bee, see, dee, ee, eff, gee, aitch, eye, jay, kay, el, em, en, oh, pee, cue, ar, ess, tee, you, vee, double-u, ex, why, zed) and Devanagari letter names (for example एस, एल, टी, जी, ए, बी, सी, डी) to letters. Also map number words (English and Hindi) to digits when the transcript spells numbers out ("four fifty" to 450, "चार सौ पचास" to 450). Start with English plus Hindi; add others only if tested.
5. **Pair gene with nearest following variant** in token order. Handle the connectors "and", "aur", "और", "மற்றும்", "ഉം" by splitting on a connector list.
6. **KB validation**: set `in_kb` by matching `(gene, variant)` against `variants.json`. Unknown but well-formed variants are still returned (`in_kb:false`) so the app can say "no curated evidence".
7. **Confidence**: `high` if regex matched directly; `medium` if built from spoken letter-names; `low` if only fuzzy gene alias.
8. **Optional Evon assist (P1)**: if rules leave `unparsed_fragments`, ask Evon to propose candidates in strict JSON. Accept a proposal **only if** it matches the variant regex and a known gene alias. Never accept free text.
9. **Mandatory UI step**: show chips (gene, variant, confidence). The user can edit or delete before analysis runs. Analysis never starts from raw transcript.

### 8.3 Required unit tests (examples)
- `"rpoB S450L and katG S315T"` returns 2 candidates, high confidence.
- `"rpoB es four fifty el"` returns rpoB S450L, medium confidence.
- `"आरपीओबी एस 450 एल और कैट जी एस 315 टी"` returns rpoB S450L and katG S315T. If your Hindi maps do not pass this, fix the maps, do not delete the test.
- `"katG A999V"` returns `in_kb:false`.
- Garbage text returns zero candidates and a non-empty `unparsed_fragments`.

---

## 9. Evidence engine (`core/engine.py`, `core/graph.py`)

All logic deterministic and unit-tested. No language model in this module.

### 9.1 Inputs and outputs
Input: list of confirmed variants, optional per-drug phenotype `{drug: "R"|"S"}`, KB.
Output (`Analysis` object):
```json
{
 "analysis_id":"...", "synthetic":true,
 "variants":[{"variant_id":"rpoB_S450L","in_kb":true,"gene":"rpoB","drug":"rifampicin",
              "effect_class":"target_alteration","evidence_ids":["..."],"verified":false}],
 "unknown_variants":[{"raw":"katG A999V","message":"No curated evidence in this knowledge base."}],
 "hypotheses":[...], "interactions":[...], "discordances":[...],
 "graph":{"nodes":[...],"edges":[...]},
 "limitations":["..."], "provenance":{"kb_version":"...","kb_sha256":"...","engine_version":"...","created_utc":"..."}
}
```

### 9.2 Hypothesis generation
For each variant in KB with an associated drug, create a hypothesis:
- **H_direct(variant, drug):** "Variant V in gene G is associated with resistance to drug D via {effect_class}."

For each KB relation of type `compensates_for` where **both** variants are present in the isolate:
- **H_comp(secondary, primary):** "Variant S may compensate for fitness effects of primary resistance variant P."
- If only the secondary is present without the primary, do **not** generate it.

For each unknown variant: **H_unknown** with status `unknown` and no score.

### 9.3 Evidence strength index (not a probability)
For hypothesis H with supporting records `S` and contradicting records `C` (from `evidence.json` or `relations.json`):

```text
grade_value: A=1.0, B=0.75, C=0.5, D=0.25
independent_support = number of distinct source_group values among S
support = max(grade_value over S) + 0.10 * min(independent_support - 1, 3)
support = min(support, 1.0)
contradiction = 0.5 * max(grade_value over C)    # 0 if C is empty
index = clamp(support - contradiction, 0, 1)
```

The UI labels this **"Evidence strength index (ordinal, not a probability)"**. Never format it as a percentage.

### 9.4 Status label (rule-based; takes precedence over the number)
Evaluate in order:
1. `unknown`: no supporting records, or the variant is not in the KB.
2. `conflicting`: any contradicting record with grade A or B, or contradiction >= support.
3. `experimentally_supported`: at least one supporting record with `evidence_type` in {`functional_experiment`, `structural`} and grade A.
4. `multi_study_association`: independent_support >= 2 and best grade >= B.
5. `association_candidate`: at least one supporting association record.
6. `weak_or_indirect`: otherwise.

Compensatory hypotheses can never exceed `association_candidate` unless a grade A functional record exists on the relation. This enforces "co-occurrence is not compensation".

### 9.5 Ranking
Sort hypotheses by (status rank, index desc, variant_id), where status rank order is: experimentally_supported, multi_study_association, association_candidate, weak_or_indirect, conflicting, unknown. Unknown hypotheses are listed in a separate "Evidence gaps" section, not mixed into the ranked list.

### 9.6 Phenotype consistency (optional input)
If the user supplies `phenotype[drug]`:
- Genotype predicts resistance (a ranked direct hypothesis exists for that drug) and phenotype is `R`: `consistent`.
- Predicts resistance but phenotype is `S`: `discordant`. Message: "Phenotype susceptible despite a variant associated with resistance. Possible reasons include variant-specific effect sizes, borderline MIC, testing issues or incomplete KB. Needs expert review."
- No KB resistance hypothesis for that drug but phenotype is `R`: `unexplained_by_kb`. Message states the KB has no explanation for this drug.
Never overwrite the phenotype with a prediction.

### 9.7 KB what-if (counterfactual sensitivity)
`POST /api/analysis/{id}/whatif {remove:["rpoB_S450L"]}` re-runs the engine without those variants and returns which hypotheses disappear or change status. UI label: "Knowledge-base sensitivity check. This shows what the curated evidence implies, not what would happen biologically."

### 9.8 Evidence graph
Build with NetworkX, export to Cytoscape.js elements.
- Node types: `isolate`, `variant`, `gene`, `drug`, `evidence`.
- Edge types: `has_variant` (isolate to variant), `in_gene` (variant to gene), `associated_with` (variant to drug), `supported_by` (variant or relation to evidence), `contradicted_by`, `compensates_for` (variant to variant).
- Every `associated_with`, `supported_by`, `contradicted_by` and `compensates_for` edge carries `evidence_id`, `grade`, `evidence_type`, `verified`.
- **Never merge** evidence from different `source_group`s into one edge. Click on an edge shows the underlying record(s) and citation.

### 9.9 Required limitations (always included in output)
```text
1. Research-support prototype; not diagnostic and not for treatment decisions.
2. Associations are not proof of mechanism.
3. The knowledge base is small, curated and may be incomplete or out of date.
4. Records marked Unverified have not been checked against primary sources.
5. Demonstration isolates are synthetic.
6. Evidence strength index is an ordinal summary, not a probability.
```

---

## 10. Gnani integrations

### 10.1 Facts known from public sources (verified in coverage and on the Hugging Face card)
- **Prisma v2.5**: hosted speech-to-text for Indian languages (10+ languages plus Hinglish code-mixing), REST file-based and WebSocket streaming, optimised for noisy and telephony audio. Hosted API only, not an open model. The model card states medical transcription needs human review, which matches this app's confirm-before-analyse step.
- **Timbre**: hosted text-to-speech. Modes `rest`, `sse`, `realtime`. Voices listed on the HF card: Pranav, Kaveri, Shubhra, Deepak. Challenge page calls it v2.5 beta; HF card says v2.0. **VERIFY** the version string in your dashboard and cite that in the submission.
- **Auth**: `GNANI_API_KEY` only.
- **Hugging Face route (documented):**
```python
# pip install gnani-vachana transformers
import os
os.environ["GNANI_API_KEY"] = "<key>"
from transformers import pipeline

stt = pipeline("automatic-speech-recognition", model="gnani-ai/vachana", trust_remote_code=True)
text = stt("audio.wav", language_code="hi-IN")["text"]

tts = pipeline("text-to-speech", model="gnani-ai/vachana", trust_remote_code=True)
out = tts("नमस्ते", voice="Kaveri", tts_mode="rest", sample_rate=22050, container="wav", encoding="linear_pcm")
open("out.wav","wb").write(out["audio"])
```
- **Evon v3.3**: open-weight reasoning model, about 30B parameters with about 3.5B active per token, 128K context, 11 Indian languages, Apache 2.0. **Not on the API platform**; request weights via Hugging Face.
- Docs: https://docs.gnani.ai (STT REST, STT WebSocket, TTS REST/SSE/WebSocket pages are linked from the HF card).

### 10.2 What you must VERIFY in docs.gnani.ai (record in `docs/verified_facts.md`)
1. Exact REST endpoint, headers and payload for STT file upload, accepted audio formats and sample rates.
2. The list of valid `language_code` values for STT and TTS (expect values like `hi-IN`; confirm Malayalam, Tamil, Telugu, Kannada, Marathi, Bengali, Gujarati, Punjabi, Odia and `en-IN`).
3. Whether auto language detection is available through the route you use.
4. TTS voice list and which voices support which languages.
5. Rate limits and credit cost per call (5,000 credits total; budget them, section 16).
6. Evon: how to request weights, repository name, licence acceptance steps, recommended serving settings and chat template.

Implement the wrappers against the REST endpoints in the docs when available, using `httpx`. Use the `gnani-vachana` pipeline as a documented fallback.

### 10.3 Wrapper contract (`gnani/prisma.py`, `gnani/timbre.py`, `gnani/evon.py`)

Each wrapper must: validate inputs, set timeouts (STT 30 s, TTS 30 s, Evon 60 s), retry at most once on network errors or 5xx, never log audio or full transcripts, return typed results, and raise a `GnaniError(code, user_message)` that the API converts to a structured error. All support mock mode.

```python
# prisma.py
class TranscriptionResult(BaseModel):
    text: str
    language_code: str
    source: Literal["prisma_v2.5","mock"]

async def transcribe(wav_bytes: bytes, language_code: str) -> TranscriptionResult: ...

# timbre.py
class SpeechResult(BaseModel):
    audio_wav: bytes
    voice: str
    language_code: str
    source: Literal["timbre","mock"]

async def synthesize(text: str, language_code: str, voice: str) -> SpeechResult: ...

# evon.py
class EvonResult(BaseModel):
    text: str
    source: Literal["evon_v3.3","template"]

async def phrase(structured_facts: dict, language_code: str, question: str) -> EvonResult: ...
async def propose_variants(unparsed: list[str]) -> list[dict]: ...   # returns proposals only
```

Mock mode: `transcribe` returns a canned string chosen by a `mock_text` query parameter, defaulting to `"rpoB S450L aur katG S315T"`; `synthesize` returns a short valid silent WAV. Mock results set `source="mock"` and the UI shows a red MOCK banner.

### 10.4 Audio handling (`gnani/audio.py`)
Browser `MediaRecorder` gives webm/opus. Convert with ffmpeg to mono 16 kHz PCM WAV (adjust if the docs require another rate). Cap recordings at 30 seconds and the upload at `MAX_UPLOAD_MB`. Delete temporary files immediately after transcription. Do not persist audio.

### 10.5 Evon serving (P1, time-boxed to 45 minutes)
1. After gaining access, serve with a vLLM OpenAI-compatible server and set `EVON_BASE_URL`, `EVON_MODEL`, `LLM_MODE=evon`.
2. Memory note (estimate): a 30B-parameter model needs roughly 60 GB of GPU memory at 16-bit and roughly 15 to 20 GB when 4-bit quantised, because a mixture-of-experts model reduces compute per token, not weight memory. Use a quantised build and a rented or free GPU if needed.
3. If weights are unavailable or serving fails within the time box, set `LLM_MODE=template`, **do not claim Evon in the submission**, and note it under "next steps".

---

## 11. Assistant (`core/composer.py`, `api/assistant.py`)

### 11.1 Intents (rule-based keyword matcher, extendable)
`list_variants`, `explain_hypothesis(variant|drug)`, `evidence_for(variant)`, `compensatory`, `phenotype_check`, `whatif(variant)`, `evidence_gaps`, `limitations`, `unknown`. For `unknown`, answer: "I can only answer using the curated evidence for this analysis" and list supported question types.
Optionally let Evon classify intent into this fixed enum when rules fail. Reject any output outside the enum.

### 11.2 Facts packet
The engine selects the relevant subset of the Analysis into a compact `facts` dict, each fact carrying `fact_id`, text, evidence_ids and `status`. This packet is the **only** content the composer may use.

### 11.3 Composer
- If `LLM_MODE=evon`: call Evon with the system prompt below and the facts packet.
- Else: fill templates from `i18n.py` (English and Hindi at minimum; add more languages only if you can review the text).

**Evon system prompt:**
```text
You explain tuberculosis drug-resistance evidence to researchers.
Use ONLY the facts provided in FACTS. Do not add biological claims, numbers, genes,
variants, drugs or citations that are not in FACTS.
Always preserve gene names, variant notation, drug names and evidence IDs exactly
as written (Latin script), even when answering in another language.
State the evidence status for each claim (for example "association candidate").
Never say a variant "causes" resistance unless the status is experimentally_supported.
If FACTS lack the answer, say the knowledge base has no curated evidence for it.
Do not give medical, treatment or diagnostic advice.
Respond in {language}. Keep the answer under 120 words.
Return JSON: {"answer": "...", "used_fact_ids": ["..."]}
```

### 11.4 Guardrail validator (mandatory, tested)
After composing, validate:
1. JSON parses to the schema.
2. Every `used_fact_id` exists in the facts packet.
3. Extract all variant-like tokens (regex from section 8), gene names from the alias list, and drug names from the KB in the answer text. Each must appear in the facts packet. Evidence IDs shown must exist.
4. Forbidden phrases check (case-insensitive): "you should take", "recommended treatment", "diagnos", "prescribe", plus any numerical percentage not present in facts.
5. If any check fails: discard the LLM answer, use the template answer, set `source="template"`, and log a `guardrail_fallback` event (no content logged).

### 11.5 Response shape
```json
{"answer_text":"...","language":"hi-IN","source":"evon_v3.3|template|mock",
 "used_fact_ids":["F1","F3"],"evidence_ids":["E_..."],"guardrail":{"passed":true,"fallback":false}}
```
The UI shows the answer text, the source badge, the evidence links, and a "Play (Timbre)" button.

---

## 12. API specification

All responses JSON except audio. Errors use `{"error":{"code":"...","message":"..."}}` with proper HTTP status. Validate file size and type.

| Method | Path | Body or params | Returns |
|---|---|---|---|
| GET | `/api/health` | none | `{"status":"ok"}` |
| GET | `/api/meta` | none | KB version and hash, `gnani_mock`, `llm_mode`, supported languages, engine version |
| GET | `/api/demo-isolates` | none | Synthetic isolates |
| POST | `/api/voice/transcribe` | multipart `audio`, form `language_code` (and `mock_text` in mock mode) | `TranscriptionResult` plus `parsed` (normaliser output) |
| POST | `/api/parse-variants` | `{"text":"..."}` | normaliser output |
| POST | `/api/analyze` | `{"variants":["rpoB S450L",...],"phenotype":{"rifampicin":"R"},"isolate_id":"optional","synthetic":true}` | `Analysis` (also stored) |
| GET | `/api/analysis/{id}` | none | `Analysis` |
| GET | `/api/analysis/{id}/graph` | none | Cytoscape elements |
| POST | `/api/analysis/{id}/whatif` | `{"remove":["rpoB_S450L"]}` | diff of hypotheses |
| POST | `/api/assistant/ask` | `{"analysis_id":"...","question":"...","language":"hi-IN"}` | response shape in 11.5 |
| POST | `/api/voice/speak` | `{"text":"...","language":"hi-IN","voice":"Kaveri"}` | `audio/wav` bytes |
| GET | `/api/report/{id}.json` | none | Full Analysis plus versions and flags |
| GET | `/api/report/{id}.md` | none | Markdown report |

The report includes: isolate id and synthetic flag, confirmed variants, hypotheses with status and index, evidence list with citations and verification flags, discordances, evidence gaps, limitations, KB version and sha256, engine version, which Gnani components were used (real or mock), and the timestamp.

---

## 13. Frontend (`static/index.html`)

Single page, responsive, accessible (labels, keyboard focus, sufficient contrast). Language selector at top (default `hi-IN`), persistent disclaimer banner, mode banner (MOCK in red when mock), synthetic-data banner.

Tabs:
1. **Input**: mic button (record up to 30 s) and text box; "Load synthetic demo isolate" dropdown; optional phenotype selectors per drug. After transcription show transcript in an editable box and **variant chips** with confidence, in-KB marker, edit and delete. Button "Confirm and analyse".
2. **Results**: variants table; ranked hypothesis cards each showing status badge, evidence strength index (as a bar with the text "ordinal, not a probability"), supporting and contradicting evidence with citations and Verified/Unverified badges; separate "Evidence gaps" list; discordance notices; what-if control.
3. **Graph**: Cytoscape.js graph with filters by node type; clicking an edge opens the evidence record and citation.
4. **Ask**: text or voice question, answer card with source badge (`Evon v3.3` / `Template` / `MOCK`), evidence links and "Play" (Timbre). Show the exact text being spoken.
5. **Export**: buttons for JSON and Markdown report; the limitations list.

Error states: microphone permission denied, STT failure (text fallback stays usable), TTS failure (text answer still shown), Gnani quota or network errors (clear message, no crash).

---

## 14. P2 only: statistical interaction demo (`core/stats_demo.py`)

Implement only if P0 and P1 are complete and tested.
- Input: a user-supplied CSV with columns `isolate_id, A, B, log2_mic` (binary mutation indicators).
- Model: `Y = b0 + bA*A + bB*B + bAB*(A*B)` via ordinary least squares (statsmodels or NumPy), report `bAB`, bootstrap 95% CI, and refuse to run unless each of the four A/B cells has at least 10 isolates.
- Multiple testing: Benjamini-Hochberg if more than one pair.
- Unit-test on **synthetic data with a known planted interaction** to verify code correctness only.
- UI label: "Method demonstration. Statistical interaction is not molecular causation. No lineage or population-structure control is applied; do not interpret as a finding."
- Never run this on synthetic phenotypes and present the result as evidence for a mechanism.

---

## 15. Testing and acceptance

### 15.1 Unit tests (pytest)
- `test_kb.py`: all JSON files validate against schemas; every `evidence_id` referenced exists; every variant has at least one evidence record; KB hash is stable.
- `test_normalizer.py`: cases in section 8.3.
- `test_engine.py`:
  - SYN-001 yields H_direct for rpoB S450L (rifampicin) and katG S315T (isoniazid) and H_comp for rpoC V483G compensating rpoB S450L, with status for H_comp never above `association_candidate`.
  - rpoC V483G **alone** produces no H_comp.
  - SYN-003 yields a `discordant` rifampicin notice and an `unknown` entry for `katG A999V`.
  - Two records with the same `source_group` count as one independent source.
  - A grade A or B contradicting record sets status `conflicting`.
  - What-if removing rpoB S450L removes its H_direct and the dependent H_comp.
  - Scores are in [0,1] and never serialised as percentages.
- `test_graph.py`: every evidence edge carries `evidence_id`; no edge merges two `source_group`s.
- `test_composer.py`: a fake LLM that invents a variant or citation triggers the template fallback; forbidden phrases trigger fallback; a faithful answer passes.
- `test_api.py` in mock mode: full flow transcribe, confirm, analyse, ask, speak returns 200 with correct `source` flags.

### 15.2 Manual acceptance (P0 "Definition of Done")
- [ ] User can speak a mutation list in at least Hindi and one more Indian language (for example Malayalam) and see transcript plus editable chips
- [ ] Analysis never starts without user confirmation
- [ ] Results show ranked hypotheses with status, ordinal index, evidence and Verified/Unverified badges
- [ ] Unknown variant is reported as a gap, not explained
- [ ] Discordance case (SYN-003) displays correctly
- [ ] Graph renders; clicking an edge shows its source
- [ ] Spoken answer plays through Timbre in the selected language; exact text also displayed
- [ ] Source badge always correct (Evon vs Template vs MOCK)
- [ ] JSON and Markdown report export contain versions, flags and limitations
- [ ] No API key in the repo or front-end; `.env` ignored
- [ ] Tested with real Gnani keys, mock mode OFF
- [ ] Tested with background noise (fan, street or crowded-room audio recorded by you) and failures recorded in the README

### 15.3 Honest measurement for the write-up
Record 20 to 30 spoken mutation lists across the languages you support (your own voice and a consenting teammate only). Report transcript-to-variant parse success rate, the number needing manual correction, and the noisy-audio result. Report real numbers, including failures.

---

## 16. Build order and time boxes

Work backwards from 11:59 PM IST on 10 November 2026. Reserve the **last 90 minutes** for recording, writing, posting, nominating and submitting. Freeze features 2 hours before the deadline. If you are already past your own schedule, cut P1 and finish P0.

| Step | Tier | Task | Suggested time |
|---|---|---|---|
| 1 | P0 | Scaffold repo, config, mock-mode wrappers, `/api/health`, `/api/meta` | 30 min |
| 2 | P0 | KB schemas, loader, seed data, hash, `test_kb.py` | 45 min |
| 3 | P0 | Normaliser with English and Hindi maps plus tests | 45 min |
| 4 | P0 | Engine, scoring, status rules, discordance, graph, tests | 75 min |
| 5 | P0 | Real Prisma and Timbre wrappers (docs verified), audio conversion; test with real key | 60 min |
| 6 | P0 | `index.html` tabs 1, 2, 3, 5 | 75 min |
| 7 | P0 | Composer with templates, guardrail validator, Ask tab, Timbre playback | 60 min |
| 8 | P0 | Verify KB records, fix or remove unverified ones | 30 min |
| 9 | P1 | What-if, additional language templates (only if you can review them) | 30 min |
| 10 | P1 | Evon serving attempt (time box 45 min; else template mode) | 45 min |
| 11 | P2 | Stats demo | only with spare time |
| 12 | P0 | Noise test, README, limitations, demo recording, post, submit | 90 min |

Credit budget: 5,000 programme credits. Check per-call cost in the dashboard, estimate roughly 100 test calls plus demo takes, and avoid wasteful loops. Cache transcripts and audio of fixed demo phrases during development (not user audio).

---

## 17. Demo script and submission

### 17.1 60-second demo video (Demo Day Drop)
- 0 to 8 s: Problem. Show a TB researcher who must interpret mutations in English-only tools. One line of on-screen text.
- 8 to 22 s: Speak a mutation list in an Indian language (Hindi or Malayalam). Show transcript, chips, and correct one chip to show the review step.
- 22 to 40 s: Results for SYN-001: MDR-pattern hypotheses with status badges, the compensatory candidate labelled "association candidate", Unverified/Verified badges.
- 40 to 52 s: Ask a spoken follow-up. Timbre answers in the chosen language. Show source badge.
- 52 to 60 s: One honest limitation on screen (for example "small curated KB, synthetic data, not diagnostic") and hashtags.
Open with the problem, not the tech stack. No faked results. Mock mode must be OFF.

### 17.2 Written explanation template
```text
Title: TB-MECH Voice
Problem: ...
Users: ...
What it does: ...
Gnani models used (name each): Prisma v2.5 (speech-to-text, used for ...),
  Timbre <version verified in dashboard> (text-to-speech, used for ...),
  Evon v3.3 (ONLY if actually used: used for ...).
How we built it: deterministic evidence engine + curated knowledge base; models only at the edges.
Data: synthetic isolates; curated public literature/catalogue records with citations.
Measured results: <your real parse and noise numbers>.
Limitations: <section 9.9 plus anything you observed>.
Next steps: real data validation with expert review, more languages, interaction statistics on authorised datasets.
Team and roles: ...
```

### 17.3 Submission checklist
- [ ] Registered (solo or team of two), API key holder decided
- [ ] Programme terms (including ownership) read
- [ ] App works with real Gnani keys; demo recorded with mock OFF
- [ ] Each Gnani model actually used is named; none claimed that was not used
- [ ] Public LinkedIn or X post with both `#GreatIndianAIInternshipChallenge` and `#GnaniAI`; posts nominated as the form requires
- [ ] Synthetic-data statement and limitations included
- [ ] Repository public or demo accessible as the form requires; no secrets in history
- [ ] Submitted before 11:59 PM IST, with a buffer for form problems

---

## 18. Limitations text (use verbatim in UI and report)

> TB-MECH Voice is a research-support prototype. It does not diagnose, predict treatment outcomes, or recommend therapy. Hypotheses reflect a small curated knowledge base; associations are not proof of mechanism. Records marked "Unverified" have not been checked against primary sources. The evidence strength index is an ordinal summary and not a probability. Demonstration isolates are synthetic. Speech transcripts can contain errors, especially for gene names and mutation notation, so review them before analysis.

---

## 19. Open items the implementer must resolve (do not guess)

1. Official programme terms and submission form fields (gnani.ai/internship).
2. Exact STT and TTS REST contracts, language codes, voices and audio format requirements.
3. Timbre version string (v2.5 beta vs v2.0) in the dashboard.
4. Evon weight access process, repository identifier and chat template.
5. Verification of every KB record against the WHO catalogue edition and PubMed, with citations filled in.
6. Whether Hindi plus one additional language (such as Malayalam) transcribes mutation notation reliably enough for the demo; if not, show the confirm step prominently and report the numbers honestly.
7. Record all findings in `docs/verified_facts.md`.
