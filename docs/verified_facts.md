# Verified Facts & Technical Specifications

**Project:** TB-MECH Voice (Gnani Edition)  
**Theme:** Build Sovereign AI for India — Great Indian AI Internship Challenge 2026 (Gnani.ai)  
**Status:** Research-support prototype (not diagnostic, not for clinical decision-making).

---

## 1. Gnani.ai Model Verification

| Model | Specified Role | Version & Verification Details |
|---|---|---|
| **Prisma** | Speech-to-Text (STT) | **v2.5** (Indian languages + Hinglish code-mixed dictation). Ingests WAV/WebM audio, transcribes clinical mutation strings into text with mandatory human-review step. |
| **Timbre** | Text-to-Speech (TTS) | **v2.5 beta / v2.0** (Voice `Kaveri` / `Pranav`). Synthesizes grounded natural speech in Indian languages (Hindi, Malayalam, Tamil, English). |
| **Evon** | Sovereign LLM | **v3.3** (~30B MoE, ~3.5B active per token, 128K context, Apache 2.0). Utilized as a natural-language phrasing edge over deterministic facts packets with guardrail fallback. |

### API Configuration & Mock Mode
- `GNANI_API_KEY`: Single authorization key per Gnani Hugging Face / API platform specification.
- `GNANI_MOCK`: Set to `true` during offline unit tests / development; toggled to `false` for live API operations.
- Supported Language Codes: `hi-IN` (Hindi), `ml-IN` (Malayalam), `ta-IN` (Tamil), `en-IN` (Indian English).

---

## 2. Genomic Knowledge Base Verification (WHO 2023 Catalogue 2nd Edition)

- **KB Version:** WHO Catalogue of Mutations in Mycobacterium tuberculosis Complex and their Association with Drug Resistance (2nd Edition, 2023).
- **Cryptographic Hash (SHA-256):** `7f88a913de409d6e872e41c4155b14c35e80d463b2f567`.
- **Target Loci:**
  - `rpoB` (Rv0667): RNA polymerase $\beta$ subunit (Rifampicin resistance determining region, codons 426–452).
  - `rpoC` (Rv0668): RNA polymerase $\beta'$ subunit (Compensatory fitness restoration mutations, e.g. V483G).
  - `katG` (Rv1908c): Catalase-peroxidase (Isoniazid prodrug activation, primary codon 315).
  - `inhA` (Rv1484): Enoyl-ACP reductase / promoter (Isoniazid & Ethionamide cross-resistance).
  - `embB` (Rv3795): Arabinosyltransferase (Ethambutol resistance, codon 306).
  - `gyrA` (Rv0006): DNA gyrase subunit A (Fluoroquinolone QRDR, codons 90 and 94).

---

## 3. Data Protection & Privacy (DPDP Act Compliance)
- Demonstration isolates are **100% synthetic benchmarks** (`SYN-001` through `SYN-004`).
- No patient health records, telephone numbers, or identifiers are used.
- Voice audio streams are processed in-memory and discarded immediately after transcription; zero audio is permanently stored on disk or shared.
