# TB-MECH Voice (Gnani Edition)

> **Theme:** Build Sovereign AI for India  
> **Challenge:** Great Indian AI Internship Challenge 2026 (Gnani.ai)  
> **Solution Document:** [1-Page Solution Explanation](SOLUTION_EXPLANATION.md)  
> **Status:** Research-support prototype. Not diagnostic. Not for clinical treatment decisions.

---

## 🔬 Overview

**TB-MECH Voice** is a voice-first, Indian-language, evidence-grounded assistant designed to help tuberculosis researchers, microbiologists, and students interpret *Mycobacterium tuberculosis* drug-resistance mutations with verifiable biological mechanisms, traceable literature citations, and explicit uncertainty quantification.

India carries over 27% of the global tuberculosis burden. TB-MECH Voice bridges the gap between complex genomic catalogues and Indian researchers by accepting spoken technical dictation in regional Indian languages (Hindi, Malayalam, Tamil, and code-mixed Indian English), normalizing phonetic mutation codes into standard HGVS notation, and evaluating drug resistance through a 100% deterministic, audit-logged evidence engine.

### Core Architectural Principle
**Deterministic engine in the middle; sovereign language models only at the edges.**  
No language model ever computes resistance scores, predicts minimum inhibitory concentrations (MIC), or invents citations. Every biological fact traces directly to primary literature and the WHO 2023 Catalogue 2nd Edition.

---

## 🌟 Key Capabilities

1. **Multilingual Voice Dictation (Prisma v2.5)**
   - Speak mutations naturally in Hindi, Malayalam, Tamil, or Indian English (e.g., *"आरपीओबी एस ४५० एल और कैट जी एस ३१५ टी"* or *"rpoB S450L aur katG S315T"*).
   - Real-time AudioContext waveform visualizer and speech-to-text integration.
   - Human-in-the-loop candidate confirmation chips: edit or delete parsed variants before running analysis.

2. **Deterministic Evidence Engine (Engine 2.5)**
   - Evaluates variants across 6 target TB loci (`rpoB`, `katG`, `inhA`, `embB`, `gyrA`, `rpoC`) and 4 primary drug classes (Rifampicin, Isoniazid, Ethambutol, Fluoroquinolones).
   - Computes an **ordinal evidence strength index** ($[0.0, 1.0]$, never formatted as a percentage or probability).
   - Detects compensatory mutations (e.g. `rpoC V483G` compensating `rpoB S450L` fitness loss) and caps their status at `association_candidate` to enforce *"co-occurrence is not mechanism"*.
   - Flags phenotype-genotype discordances (e.g., `SYN-003` with RIF-S phenotype despite carrying `rpoB S450L`).
   - Isolates unknown variants (e.g. `katG A999Z`) into explicit "Evidence Gaps" rather than guessing.

3. **Interactive Knowledge Graph**
   - High-performance visual graph connecting Genes, Variants, Biochemical Mechanisms, and Antimicrobial Drugs.
   - Zoom, pan, drug-specific filtering, and interactive node metadata inspector.

4. **Counterfactual What-If Sensitivity Sandbox**
   - Dynamically toggle individual mutations off to see which resistance hypotheses disappear or how compensatory interactions break.
   - Clarifies knowledge-base dependencies in real time.

5. **Guardrail-Protected Voice Assistant (Timbre & Evon / Clinical Composer)**
   - Answers clinical and biochemical inquiries strictly using a pre-filtered deterministic facts packet.
   - Multi-layer guardrail validator checks for forbidden medical phrases ("you should take", "prescribe") and rejects ungrounded variants or hallucinated citations.
   - Reads answers aloud in the selected Indian language via Gnani Timbre TTS (voices: *Kaveri*, *Pranav*).

6. **Reproducibility & Audit Export**
   - SHA-256 cryptographic knowledge-base provenance (`7f88a913de409d6e872e41c4155b14c35e80d463b2f567`).
   - One-click export of structured JSON and Markdown audit reports containing Section 18 verbatim limitations.

7. **Statistical Epistasis Regression Demo (P2)**
   - Two-variant epistasis regression model: $\log_2(\text{MIC}) = \beta_0 + \beta_A A + \beta_B B + \beta_{AB}(A \times B)$
   - Bootstrap 95% confidence intervals, minimum cell count threshold ($N \ge 10$ per cell), and CSV upload support.

---

## 🤖 Gnani Models & Sovereign AI Stack

| Model | Role | Version / Specification | Grounding & Provenance |
|---|---|---|---|
| **Prisma** | Speech-to-Text (STT) | **v2.5** (Indian languages + Hinglish code-mixing) | Transcribes spoken audio; output is gated behind mandatory user review chips. |
| **Timbre** | Text-to-Speech (TTS) | **v2.5** (Voices: *Kaveri*, *Pranav*) | Synthesizes spoken explanations in Indian languages from verified facts packets. |
| **Evon** | Sovereign LLM | **v3.3** (~30B MoE, ~3.5B active/token, Apache 2.0) | Optional phrasing layer over deterministic facts packets with guardrail fallback. |

*Note on Mock Mode:* Built-in mock mode (`GNANI_MOCK=1`) allows offline development and automated testing without exhausting API credits. The live demo video is recorded with mock mode `OFF`.

---

## 📁 Repository Structure

```text
TB-MECH/
├── src/
│   ├── components/
│   │   ├── EvidenceTriage.tsx     # Ranked hypotheses, drug cards, What-If sandbox
│   │   ├── KnowledgeGraph.tsx     # Interactive Genes-Variants-Mechanisms-Drugs graph
│   │   ├── VoiceAssistant.tsx     # Q&A assistant with speech playback & guardrails
│   │   ├── AuditExport.tsx        # Cryptographic export (JSON & Markdown reports)
│   │   └── StatsDemoView.tsx      # P2 OLS epistasis regression demo
│   ├── data/
│   │   └── kbData.ts              # Curated WHO 2023 Catalogue 2nd Edition & PMIDs
│   ├── services/
│   │   ├── engine.ts              # Deterministic hypothesis ranking & scoring engine
│   │   ├── normalizer.ts          # Indic/Devanagari numerals & mutation parsing
│   │   ├── composer.ts            # Clinical phrasing & guardrail validator
│   │   ├── voice.ts               # Web MediaRecorder, AudioContext & TTS playback
│   │   └── statsDemo.ts           # Two-variant interaction regression math
│   ├── tests/
│   │   └── run_tests.ts           # 42 automated unit tests per plan.md Section 15.1
│   ├── App.tsx                    # Main responsive clinical interface
│   ├── main.tsx                   # React 19 application root
│   └── index.css                  # Modern Tailwind CSS v4 styling
├── data/
│   ├── kb/                        # Curated JSON records (genes, drugs, variants, evidence, relations)
│   └── demo/                      # Synthetic benchmark isolates (SYN-001 through SYN-004)
├── docs/
│   ├── architecture.md            # System architecture flow
│   ├── limitations.md             # Scientific limitations & clinical disclaimers
│   ├── verified_facts.md          # Model, endpoint & literature verification logs
│   └── SPEC.md                    # Complete implementation specification
├── server.ts                      # Full-stack Express server implementing plan.md Section 12
├── package.json                   # Dependencies, scripts (dev, test, build, lint)
├── tsconfig.json                  # Strict TypeScript configuration
├── vite.config.ts                 # Vite bundler configuration
├── run.sh                         # One-click startup script
├── plan.md                        # Project plan & execution spec
├── SOLUTION_EXPLANATION.md        # Official 1-page solution explanation for challenge
└── README.md                      # Project documentation
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: v18+ (tested on Node v26)
- **npm**: v9+

### 1. Installation
```bash
git clone https://github.com/jyothikacodes/TB-MECH.git
cd TB-MECH
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```
Edit `.env` to provide your `GNANI_API_KEY` (or leave `GNANI_MOCK=1` for offline evaluation):
```env
GNANI_API_KEY=your_key_here
GNANI_MOCK=1
GNANI_STT_LANGUAGE_DEFAULT=hi-IN
GNANI_TTS_VOICE_DEFAULT=Kaveri
```

### 3. Run Development Server
```bash
./run.sh
# or
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Run Automated Unit Tests
```bash
npm test
```
Executes all 42 unit tests covering:
- Knowledge base validation & schemas (`test_kb`)
- Spoken & typed mutation normalizer across English, Hindi, and numerals (`test_normalizer`)
- Deterministic hypothesis scoring, compensatory rules, and discordances (`test_engine`)
- Composer guardrails & forbidden phrase filtering (`test_composer`)
- Statistical epistasis regression & 95% bootstrap CI (`test_stats_demo`)

### 5. Production Build
```bash
npm run build
npm start
```

---

## 🔒 Data Protection & DPDP Act Compliance

- **100% Synthetic Benchmarks:** All demonstration isolates (`SYN-001` through `SYN-004`) are synthetic data. No real patient data, clinical specimens, or phone numbers are utilized.
- **Audio Privacy:** Spoken voice audio streams are processed in-memory for transcription and immediately discarded. Zero audio recordings are stored on disk.
- **Human-in-the-Loop:** All speech-to-text transcriptions require explicit human review and confirmation before the evidence engine is invoked.

---

## ⚠️ Limitations Text (Section 18 Verbatim)

> TB-MECH Voice is a research-support prototype. It does not diagnose, predict treatment outcomes, or recommend therapy. Hypotheses reflect a small curated knowledge base; associations are not proof of mechanism. Records marked "Unverified" have not been checked against primary sources. The evidence strength index is an ordinal summary and not a probability. Demonstration isolates are synthetic. Speech transcripts can contain errors, especially for gene names and mutation notation, so review them before analysis.
