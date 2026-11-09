# Architecture

```
Browser (static/index.html)  mic / text / language
   |
FastAPI
   /api/voice/transcribe -> gnani/prisma.py (STT) -> core/normalizer.py -> editable chips
   /api/analyze          -> core/engine.py (KB lookup, hypotheses, evidence index, status, phenotype checks)
   /api/analysis/{id}/graph, /whatif
   /api/assistant/ask    -> core/composer.py (facts packet -> Evon or template -> guardrail validator)
   /api/voice/speak      -> gnani/timbre.py (TTS)
   /api/report/{id}.json|.md
data/kb/*.json  (curated, versioned, sha256-hashed, verification flags)
```
Language models never compute scores or invent citations. See SPEC.md sections 9 and 11.
