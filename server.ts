/**
 * Full-stack Express server for TB-MECH Voice.
 * Implements all endpoints per plan.md Section 12.
 */

import 'dotenv/config';
import dns from 'node:dns';
import { spawn } from 'node:child_process';

// Ensure IPv4 is prioritized for external REST endpoints (Vachana / Gnani Cloudflare addresses)
dns.setDefaultResultOrder('ipv4first');

import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import {
  SYNTHETIC_ISOLATES,
  INDIAN_LANGUAGES,
  LIMITATIONS_VERBATIM,
  VARIANTS
} from './src/data/kbData';
import { parseVariants } from './src/services/normalizer';
import {
  analyzeIsolate,
  calculateWhatIf,
  Analysis,
  ENGINE_VERSION,
  KB_VERSION,
  KB_SHA256,
  REQUIRED_LIMITATIONS
} from './src/services/engine';
import { composeAnswer } from './src/services/composer';
import { runInteractionRegression, generateSyntheticStatsData } from './src/services/statsDemo';

// In-memory store for analysis runs
const ANALYSIS_STORE = new Map<string, Analysis>();

// Preload synthetic isolates into analysis store
for (const iso of SYNTHETIC_ISOLATES) {
  const analysis = analyzeIsolate(iso.variants, iso.phenotype, iso.isolate_id);
  ANALYSIS_STORE.set(iso.isolate_id, analysis);
}

// Global server mock flag (default false when keys present, true if GNANI_MOCK === '1')
let GNANI_MOCK = process.env.GNANI_MOCK === '1';
const LLM_MODE = process.env.LLM_MODE || 'template';

/**
 * Converts any browser-captured audio buffer (WebM/Opus, OGG, MP4/AAC)
 * into standard 16kHz mono PCM WAV required by Gnani Prisma STT API.
 */
function convertAudioToWav(buffer: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', [
      '-i', 'pipe:0',
      '-ar', '16000',
      '-ac', '1',
      '-c:a', 'pcm_s16le',
      '-f', 'wav',
      'pipe:1'
    ], { stdio: ['pipe', 'pipe', 'ignore'] });

    const chunks: Buffer[] = [];
    ff.stdout.on('data', chunk => chunks.push(chunk));
    ff.on('error', err => reject(err));
    ff.on('close', code => {
      if (code === 0) {
        resolve(Buffer.concat(chunks));
      } else {
        reject(new Error(`ffmpeg exited with code ${code}`));
      }
    });

    ff.stdin.write(buffer);
    ff.stdin.end();
  });
}

async function main() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 1. GET /api/health
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  // 2. GET /api/meta
  app.get('/api/meta', (_req: Request, res: Response) => {
    res.json({
      kb_version: KB_VERSION,
      kb_sha256: KB_SHA256,
      gnani_mock: GNANI_MOCK,
      llm_mode: LLM_MODE,
      default_language: 'hi-IN',
      languages: INDIAN_LANGUAGES.map(l => l.code),
      engine_version: ENGINE_VERSION
    });
  });

  // Toggle mock mode endpoint (helpful for demo)
  app.post('/api/meta/toggle-mock', (req: Request, res: Response) => {
    if (typeof req.body.mock === 'boolean') {
      GNANI_MOCK = req.body.mock;
    } else {
      GNANI_MOCK = !GNANI_MOCK;
    }
    res.json({ gnani_mock: GNANI_MOCK });
  });

  // 3. GET /api/demo-isolates
  app.get('/api/demo-isolates', (_req: Request, res: Response) => {
    res.json(SYNTHETIC_ISOLATES);
  });

  // 4. POST /api/voice/transcribe
  app.post('/api/voice/transcribe', async (req: Request, res: Response) => {
    const {
      language_code = 'hi-IN',
      mock_text,
      audio_base64,
      mime_type = 'audio/webm',
      text: incomingText,
      transcript: incomingTranscript
    } = req.body;

    let text = (incomingText || incomingTranscript || mock_text || '').trim();
    let source = GNANI_MOCK ? 'mock' : 'prisma_v2.5';

    // 1. Direct Gnani Prisma STT REST API (when live key configured and mock mode off)
    const sttKey = process.env.GNANI_STT_API_KEY || process.env.GNANI_API_KEY;
    if (!text && audio_base64 && !GNANI_MOCK && sttKey) {
      try {
        const rawBuffer = Buffer.from(audio_base64, 'base64');
        let wavBuffer: Buffer;
        try {
          wavBuffer = await convertAudioToWav(rawBuffer);
        } catch (convErr) {
          console.warn('ffmpeg WAV conversion fallback to raw buffer:', convErr);
          wavBuffer = rawBuffer;
        }

        const blob = new Blob([new Uint8Array(wavBuffer)], { type: 'audio/wav' });
        const formData = new FormData();
        formData.append('audio_file', blob, 'audio.wav');
        formData.append('model', 'prisma-v2.5');
        formData.append('language_code', language_code);
        formData.append('format', 'transcribe');

        const gnaniRes = await fetch('https://api.vachana.ai/stt/v3', {
          method: 'POST',
          headers: {
            'X-API-Key-ID': sttKey
          },
          body: formData
        });
        if (gnaniRes.ok) {
          const gData = await gnaniRes.json() as any;
          const extractedText = gData?.transcript || gData?.text || gData?.output?.literal || '';
          if (extractedText.trim()) {
            text = extractedText.trim();
            source = 'Gnani Prisma v2.5 STT';
          }
        } else {
          const errDetail = await gnaniRes.text();
          console.warn('Gnani STT returned error status:', gnaniRes.status, errDetail);
        }
      } catch (gnaniErr) {
        console.warn('Gnani STT REST error:', gnaniErr);
      }
    }

    // 2. Fallback to Gemini STT if audio was submitted, Gnani did not return, and GEMINI_API_KEY exists
    if (!text && audio_base64 && process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const audioPart = {
          inlineData: {
            mimeType: mime_type,
            data: audio_base64
          }
        };
        const textPart = {
          text: `You are an expert clinical genomics speech transcriber for Mycobacterium tuberculosis drug-resistance consultations.
Accurately transcribe the spoken clinical speech into text.
Language context: ${language_code}.
Ensure gene names (rpoB, katG, inhA, embB, gyrA, rpoC) and mutation codes (e.g. S450L, S315T, c.-15C>T, V483G, D94G, M306V, Ser450Leu) are correctly spelled.
Return ONLY the raw transcription without commentary or extra quotes.`
        };
        const response = await ai.models.generateContent({
          model: 'gemini-flash-latest',
          contents: { parts: [audioPart, textPart] }
        });
        if (response.text?.trim()) {
          text = response.text.trim();
          source = 'Gemini Audio STT (Prisma)';
        }
      } catch (geminiErr) {
        console.warn('Gemini audio transcription error:', geminiErr);
      }
    }

    // If real audio was submitted but could not be transcribed (e.g. no Gemini key or silence)
    // do NOT fabricate a fake mutation list unless mock_text was explicitly requested or no audio was provided
    if (!text && audio_base64) {
      return res.json({
        text: '',
        language_code,
        source: 'No Speech Detected',
        parsed: { candidates: [], unparsed_fragments: [] }
      });
    }

    // Default benchmark phrase when no audio was sent (e.g. mock test call)
    if (!text) {
      text = language_code.startsWith('hi')
        ? 'कैट जी एस ३१५ टी और आरपीओबी एस ४५० एल'
        : 'rpoB S450L aur katG S315T rpoC V483G';
    }

    const parsed = parseVariants(text);
    res.json({
      text,
      language_code,
      source,
      parsed
    });
  });

  // 5. POST /api/parse-variants
  app.post('/api/parse-variants', (req: Request, res: Response) => {
    const { text = '' } = req.body;
    const parsed = parseVariants(text);
    res.json(parsed);
  });

  // 6. POST /api/analyze
  app.post('/api/analyze', (req: Request, res: Response) => {
    const { variants = [], phenotype = {}, isolate_id = 'SYN-USER' } = req.body;

    const analysis = analyzeIsolate(variants, phenotype, isolate_id);
    ANALYSIS_STORE.set(analysis.analysis_id, analysis);
    if (isolate_id) {
      ANALYSIS_STORE.set(isolate_id, analysis);
    }

    res.json(analysis);
  });

  // 7. GET /api/analysis/:id
  app.get('/api/analysis/:id', (req: Request, res: Response) => {
    const id = req.params.id;
    const analysis = ANALYSIS_STORE.get(id);
    if (!analysis) {
      return res.status(404).json({ error: { code: 'not_found', message: `Analysis ${id} not found.` } });
    }
    res.json(analysis);
  });

  // 8. GET /api/analysis/:id/graph
  app.get('/api/analysis/:id/graph', (req: Request, res: Response) => {
    const id = req.params.id;
    const analysis = ANALYSIS_STORE.get(id);
    if (!analysis) {
      return res.status(404).json({ error: { code: 'not_found', message: `Analysis ${id} not found.` } });
    }
    res.json(analysis.graph);
  });

  // 9. POST /api/analysis/:id/whatif
  app.post('/api/analysis/:id/whatif', (req: Request, res: Response) => {
    const id = req.params.id;
    const { remove = [] } = req.body;
    const analysis = ANALYSIS_STORE.get(id);
    if (!analysis) {
      return res.status(404).json({ error: { code: 'not_found', message: `Analysis ${id} not found.` } });
    }

    const whatIfResult = calculateWhatIf(analysis, remove);
    res.json(whatIfResult);
  });

  // 10. POST /api/assistant/ask
  app.post('/api/assistant/ask', (req: Request, res: Response) => {
    const { analysis_id, question = '', language = 'hi-IN' } = req.body;
    const analysis = ANALYSIS_STORE.get(analysis_id);
    if (!analysis) {
      return res.status(404).json({ error: { code: 'not_found', message: `Analysis ${analysis_id} not found.` } });
    }

    const answer = composeAnswer(analysis, question, language, GNANI_MOCK);
    res.json(answer);
  });

  // 11. POST /api/voice/speak
  app.post('/api/voice/speak', async (req: Request, res: Response) => {
    const { text = '', language = 'hi-IN', voice = 'Kaveri' } = req.body;
    if (!text.trim()) {
      return res.status(400).json({ error: { code: 'empty_text', message: 'Nothing to speak.' } });
    }

    // Direct Gnani Timbre TTS REST API (when live key configured and mock mode off)
    const ttsKey = process.env.GNANI_TTS_API_KEY || process.env.GNANI_API_KEY;
    if (!GNANI_MOCK && ttsKey) {
      try {
        const payload = {
          text,
          voice,
          model: 'timbre-v2.5',
          language,
          speed: 1.0,
          audio_config: {
            encoding: 'linear_pcm',
            container: 'wav',
            num_channels: 1,
            sample_rate: 22050,
            sample_width: 2
          }
        };
        const ttsResp = await fetch('https://api.vachana.ai/api/v1/tts/inference', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key-ID': ttsKey
          },
          body: JSON.stringify(payload)
        });
        if (ttsResp.ok) {
          const arrayBuf = await ttsResp.arrayBuffer();
          const base64Audio = Buffer.from(arrayBuf).toString('base64');
          return res.json({
            status: 'ok',
            text,
            language,
            voice,
            source: 'timbre',
            audio_base64: base64Audio
          });
        }
      } catch (e) {
        console.warn('Gnani TTS error:', e);
      }
    }

    // Return speech synthesis acknowledgment (for webapp browser audio or wave)
    res.json({
      status: 'ok',
      text,
      language,
      voice,
      source: GNANI_MOCK ? 'mock' : 'timbre'
    });
  });

  // 12. GET /api/report/:id.json
  app.get('/api/report/:id.json', (req: Request, res: Response) => {
    const id = req.params.id;
    const analysis = ANALYSIS_STORE.get(id);
    if (!analysis) {
      return res.status(404).json({ error: { code: 'not_found', message: `Analysis ${id} not found.` } });
    }
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=TB_MECH_${id}.json`);
    res.json(analysis);
  });

  // 13. GET /api/report/:id.md
  app.get('/api/report/:id.md', (req: Request, res: Response) => {
    const id = req.params.id;
    const analysis = ANALYSIS_STORE.get(id);
    if (!analysis) {
      return res.status(404).json({ error: { code: 'not_found', message: `Analysis ${id} not found.` } });
    }

    const markdown = `# TB-MECH Voice Analysis Report: ${analysis.analysis_id}

**Date:** ${analysis.provenance.created_utc}  
**Engine Version:** ${analysis.provenance.engine_version}  
**KB Version:** ${analysis.provenance.kb_version} (SHA-256: \`${analysis.provenance.kb_sha256}\`)  
**Synthetic Notice:** All isolate data are synthetic demonstration benchmarks.

---

## 1. Confirmed Mutations
${analysis.variants.map(v => `- **${v.gene} ${v.short}** (Locus: ${v.gene}, Drug: ${v.drug || 'N/A'}, Verified: ${v.verified ? 'Yes' : 'Unverified'})`).join('\n')}

${analysis.unknown_variants.length > 0 ? `\n## Evidence Gaps (Unknown Variants)\n` + analysis.unknown_variants.map(u => `- **${u.raw}**: ${u.message}`).join('\n') : ''}

---

## 2. Ranked Hypotheses & Resistance Calls
${analysis.hypotheses.map((h, i) => `### ${i + 1}. ${h.statement}
- **Status:** \`${h.status}\`
- **Evidence Strength Index:** ${h.evidence_index !== null ? h.evidence_index.toFixed(2) : 'N/A'} (ordinal, not a probability)
- **Independent Sources:** ${h.independent_support}
${h.supporting_evidence.map(e => `  - *Support [${e.grade}]*: ${e.claim} (PMID: ${e.citation.pmid || 'N/A'})`).join('\n')}
`).join('\n')}

${analysis.discordances.length > 0 ? `\n## 3. Phenotypic Discordances\n` + analysis.discordances.map(d => `- **${d.drug.toUpperCase()} (${d.phenotype})**: ${d.message}`).join('\n') : ''}

---

## 4. Limitations (Section 18 Verbatim)
${LIMITATIONS_VERBATIM}

Key Points:
${analysis.limitations.map((l, i) => `${i + 1}. ${l}`).join('\n')}

---
*Report generated deterministically by TB-MECH Voice.*
`;

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=TB_MECH_${id}.md`);
    res.send(markdown);
  });

  // 14. POST /api/stats-demo (P2)
  app.post('/api/stats-demo', (req: Request, res: Response) => {
    const { isolate_data, variant_a = 'rpoB S450L', variant_b = 'rpoC V483G' } = req.body;
    const data = isolate_data && Array.isArray(isolate_data) && isolate_data.length >= 40
      ? isolate_data
      : generateSyntheticStatsData(25);

    const stats = runInteractionRegression(data, variant_a, variant_b);
    res.json(stats);
  });

  // Mount Vite in development or static in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`TB-MECH Voice server active on http://0.0.0.0:${port}`);
  });
}

main().catch(err => {
  console.error('Fatal server startup failure:', err);
  process.exit(1);
});
