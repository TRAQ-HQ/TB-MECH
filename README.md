# TB-MECH Voice: base architecture

Voice-first, Indian-language, evidence-grounded assistant for interpreting *M. tuberculosis*
drug-resistance mutations. Built for the Great Indian AI Internship Challenge 2026 (Gnani.ai).
**Research-support prototype. Not diagnostic. Not for treatment decisions.**

Full requirements, algorithms and checklists: [`docs/SPEC.md`](docs/SPEC.md).

## Design in one line
Deterministic evidence engine in the middle; language/speech models only at the edges
(Prisma in, Timbre/Evon out). Every claim traces to a knowledge-base record.

## Quick start
```bash
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r backend/requirements.txt
cp .env.example .env                                    # Windows: copy .env.example .env
./run.sh                                                # or: cd backend && uvicorn app.main:app --reload
# open http://localhost:8000
cd backend && pytest -q                                 # 36 tests, all in mock mode
```
Requires `ffmpeg` on PATH for real-mode audio conversion (not needed in mock mode).

## What works now (scaffold status)
| Area | Status |
|---|---|
| KB loader/validator/hash, seed data | Done (**seed is UNVERIFIED**) |
| Typed + spoken mutation normaliser (English, Hindi) | Done, tested |
| Engine: hypotheses, evidence index, status rules, phenotype checks, what-if | Done, tested |
| Evidence graph + Cytoscape export | Done, tested |
| Composer + guardrail validator, EN/HI templates | Done, tested |
| Prisma / Timbre wrappers | Mock mode done. **Real mode written against the documented Hugging Face route; untested without your key** |
| Evon wrapper | Client written; needs self-hosted weights (P1) |
| Frontend (5 tabs) | Done; mic recording untested in a real browser here |
| Stats demo (P2) | Not started (see SPEC section 14) |

## Do these next (in order)
1. **Verify the KB** (`data/kb/*.json`): check each record against the WHO catalogue and PubMed, fill citations, set `verified: true`, delete what you cannot verify. Never show unverified records in the final demo.
2. **Read docs.gnani.ai** and record findings in `docs/verified_facts.md` (endpoints, language codes, voices, audio formats, Timbre version).
3. Put your key in `.env`, `pip install transformers gnani-vachana`, set `GNANI_MOCK=0`, test real STT/TTS in 2 languages.
4. Have a native speaker review the Hindi templates in `backend/app/core/i18n.py`; add a second Indian language only if you can review it.
5. Optional: obtain Evon weights, serve with vLLM, set `LLM_MODE=evon`. If you cannot, do **not** claim Evon.
6. Record noisy-audio and parse-rate numbers for your write-up; record the 60 s demo with mock OFF.

## Rules baked into the code
- Mock mode shows a red banner; answer source badge is `Evon v3.3` only if Evon actually generated the text.
- Scores are an *ordinal evidence strength index*, never a probability.
- Unknown variants are reported as gaps, never explained.
- Demo isolates are synthetic; no audio is stored; API keys are backend-only.

## Layout
```
backend/app/{api,core,gnani,tests}   data/{kb,demo,runs}   static/index.html   docs/
```
