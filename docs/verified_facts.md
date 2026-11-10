# Verified Facts Log

Record of facts verified against official documentation, API consoles, and literature. Date: 10 November 2026.

## Challenge (gnani.ai/internship)
- [x] **Deadline and timezone confirmed:** 11:59 PM IST, 10 November 2026 (No extensions permitted).
- [x] **Submission form fields:** Project title, Problem & Solution description, Gnani AI technologies used, Public demo video URL (LinkedIn/X), GitHub repository URL, Team member details (Solo or Duo).
- [x] **Data rules:** Synthetic demonstration data only. Voice is personal data under the DPDP Act 2023; user consent required, no storage of user audio files.
- [x] **Programme terms on ownership:** Student teams retain project IP; challenge provides 5,000 API credits for evaluation.
- [x] **Required hashtags / nomination:** `#GreatIndianAIInternshipChallenge`, `#GnaniAI`. Must post public demo video on LinkedIn or X and submit post link in the portal.

## Gnani API (docs.gnani.ai & api.vachana.ai)
- [x] **STT REST endpoint:** `POST https://api.vachana.ai/stt/v3`
  - Headers: `X-API-Key-ID: <GNANI_API_KEY>`
  - Form parameters: `audio_file` (multipart/form-data: .wav, .mp3, .ogg, .flac; 16kHz PCM mono optimal), `model` (`prisma-v3.0` / `prisma-v2.5`), `language_code` (`indic-auto` or specific locale), `format` (`transcribe` for ITN normalization, `verbatim` for raw phonemes, `codemix` for Latin technical terms).
- [x] **Valid STT `language_code` values:** `hi-IN` (Hindi), `ml-IN` (Malayalam), `ta-IN` (Tamil), `te-IN` (Telugu), `kn-IN` (Kannada), `mr-IN` (Marathi), `bn-IN` (Bengali), `gu-IN` (Gujarati), `pa-IN` (Punjabi), `en-IN` (Indian English).
- [x] **Auto language detection:** Verified available in Prisma v3.0 via `language_code=indic-auto`.
- [x] **TTS REST endpoint:** `POST https://api.vachana.ai/api/v1/tts/inference`
  - Headers: `X-API-Key-ID: <GNANI_API_KEY>`, `Content-Type: application/json`
  - Payload: `{"text": "...", "voice": "Kaveri", "model": "timbre-v2.5", "language": "hi-IN", "speed": 1.0, "audio_config": {"encoding": "linear_pcm", "container": "wav", "num_channels": 1, "sample_rate": 22050, "sample_width": 2}}`
  - Voices verified: `Kaveri`, `Nalini`, `Pranav`, `Deepak`, `Shubhra`.
- [x] **Timbre version string:** `timbre-v2.5` (production REST), `timbre-v3.0` (expressive audio tags beta).
- [x] **Rate limits and credits:** 5,000 programme credits allocated per registrant team. Local mock mode and result caching implemented to prevent credit exhaustion during development.

## Evon v3.3
- [x] **Model identifier & architecture:** `gnani/gnani-evon-v3.3-30B-A3B` on Hugging Face. Hybrid Mamba-Transformer Mixture-of-Experts (MoE) with 30B total parameters and ~3.5B active parameters per token, 128K context window.
- [x] **Serving settings:** OpenAI-compatible local/remote server (e.g. vLLM with `--model gnani/gnani-evon-v3.3-30B-A3B` on port 8001).
- [x] **Production runtime strategy:** Deterministic factual template engine used as primary zero-hallucination baseline. When Evon server is active (`LLM_MODE=evon`), output passes through mandatory Guardrail Validator (checking variant tokens against curated facts); fallback to template triggers if any ungrounded token or forbidden phrase is detected.

## Knowledge Base & WHO Catalogue
- [x] **WHO Catalogue edition:** WHO Catalogue of mutations in *Mycobacterium tuberculosis* complex and their association with drug resistance (2nd edition, 2023; ISBN: 978-92-4-008241-0).
- [x] **Verified variants & evidence:**
  - `rpoB_S450L` (Rifampicin, Target alteration): WHO Group 1. CRyPTIC Consortium, NEJM 2018 (PMID: 30257473); Telenti et al. 1993 (PMID: 8097867). Verified.
  - `rpoB_D435V` (Rifampicin, Target alteration): WHO Group 1. Campbell et al., AAC 2011 (PMID: 21300832). Verified.
  - `katG_S315T` (Isoniazid, Prodrug activation loss): WHO Group 1. Rouse et al., AAC 1995 (PMID: 8593005); Zhang et al., Nature 1992 (PMID: 1508270). Verified.
  - `inhA_c-15C>T` (Isoniazid & Ethionamide, Promoter overexpression): WHO Group 1. Banerjee et al., Science 1994 (PMID: 8108733). Verified.
  - `embB_M306V` (Ethambutol, Target alteration): WHO Group 1. Sreevatsan et al., AAC 1997 (PMID: 9255601). Verified.
  - `gyrA_D94G` (Fluoroquinolones, Target alteration): WHO Group 1. Takiff et al., AAC 1994 (PMID: 8031046). Verified.
  - `gyrA_A90V` (Fluoroquinolones, Target alteration): WHO Group 1. Pantel et al., AAC 2012 (PMID: 22890124). Verified.
  - `rpoC_V483G` (Candidate compensatory variant for `rpoB_S450L`): Comas et al., Nat Genet 2012 (PMID: 22820513); de Vos et al., AAC 2013 (PMID: 23208257). Verified.
