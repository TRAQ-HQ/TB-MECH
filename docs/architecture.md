# System Architecture

```text
Browser UI (React 19 + Tailwind v4 + Cytoscape.js)
  │  Mic / Audio Input (MediaRecorder)
  │  Language Selector (hi-IN, ml-IN, ta-IN, en-IN)
  │  Editable Candidate Mutation Chips Review Stage
  ▼
FastAPI / Express Full-Stack Server (server.ts / Vite Dev Middleware)
  ├── POST /api/voice/transcribe  ──> Gnani Prisma v2.5 STT (WAV/PCM streaming)
  ├── POST /api/parse-variants    ──> Spoken Normalizer (Indic + English letter/number parsing)
  ├── POST /api/analyze           ──> Deterministic Evidence Engine (Engine 2.5)
  │                                     ├── WHO 2023 Catalogue Lookup
  │                                     ├── Direct Resistance Hypotheses (H_direct)
  │                                     ├── Compensatory Fitness Rules (H_comp)
  │                                     ├── Ordinal Index Math (Support - Contradiction)
  │                                     └── Phenotype Discordance Detection
  ├── POST /api/analysis/:id/whatif ──> KB Counterfactual Sensitivity Sandbox
  ├── POST /api/assistant/ask     ──> Evon v3.3 / Clinical Template Composer + Guardrails
  ├── POST /api/voice/speak       ──> Gnani Timbre TTS (Voice Kaveri/Pranav)
  ├── GET  /api/report/:id.json   ──> Cryptographically Signed JSON Audit Record
  ├── GET  /api/report/:id.md     ──> Markdown Clinical Report with Verbatim Section 18
  └── POST /api/stats-demo        ──> P2 Two-Variant OLS Epistasis with 95% Bootstrap CI
```
