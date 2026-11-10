import React, { useState } from 'react';
import { Analysis } from '../services/engine';
import {
  Mic,
  Cpu,
  FileText,
  CheckCircle2,
  Dna,
  Volume2,
  ShieldCheck,
  ArrowRight,
  Play,
  RotateCcw,
  Sparkles,
  BookOpen,
  Lock,
  Layers,
  ChevronDown,
  ChevronUp,
  Activity
} from 'lucide-react';

interface PipelineVisualizerProps {
  analysis: Analysis;
  selectedLanguage: string;
}

export const PipelineVisualizer: React.FC<PipelineVisualizerProps> = ({
  analysis,
  selectedLanguage
}) => {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simStep, setSimStep] = useState<number>(0);

  const PIPELINE_STAGES = [
    {
      id: 1,
      badge: 'STAGE 1 · INPUT',
      title: 'Multilingual Audio Capture',
      provider: 'Web MediaRecorder & AudioContext',
      desc: 'Captures 16 kHz clinical voice dictation in Indian languages (Hindi, Malayalam, Tamil, English) with real-time frequency analysis.',
      sampleInput: 'Audio Stream: 16 kHz Mono PCM WAV / WebM Opus',
      sampleOutput: 'Base64 Audio Buffer (122 KB) + Live Frequency Spectrum Bars',
      details: [
        'Real-time AudioContext frequency analyser with 64-point FFT',
        'Noise suppression & echo cancellation enabled',
        'Zero audio stored permanently on disk (DPDP Act compliant)'
      ]
    },
    {
      id: 2,
      badge: 'STAGE 2 · SPEECH-TO-TEXT',
      title: 'Gnani Prisma v2.5 STT',
      provider: 'POST https://api.vachana.ai/stt/v3',
      desc: 'Transcribes code-mixed Indian speech and spoken technical nomenclature into phonetic text strings.',
      sampleInput: 'audio_file (WAV) + language_code: "hi-IN" + model: "prisma-v2.5"',
      sampleOutput: 'Transcript: "आर पी ओ बी एस 450 एल और कैट जी एस 315 टी और आरपीओसी वी 483 जी"',
      details: [
        'Dedicated Indic speech model optimized for noisy and code-mixed dictation',
        'Sub-200ms end-to-end REST latency',
        'Direct authorization via X-API-Key-ID'
      ]
    },
    {
      id: 3,
      badge: 'STAGE 3 · NORMALIZATION',
      title: 'Spoken Mutation Normalizer',
      provider: 'Deterministic Rule Engine (normalizer.ts)',
      desc: 'Converts Devanagari/regional numerals and spoken letter names into standard HGVS mutation tokens.',
      sampleInput: '"आर पी ओ बी एस 450 एल और कैट जी एस 315 टी"',
      sampleOutput: 'Candidate Tokens: ["rpoB S450L", "katG S315T", "rpoC V483G"]',
      details: [
        'Translates Indic numerals (०-९, ൦-൯, ௦-௯) to ASCII digits (0-9)',
        'Maps letter names (एस→S, एल→L, टी→T, जी→G) and gene aliases',
        'Splits on multilingual connectors (and, aur, और, மற்றும், ഉം)'
      ]
    },
    {
      id: 4,
      badge: 'STAGE 4 · HUMAN GATE',
      title: 'Human-in-the-Loop Confirmation Gate',
      provider: 'Interactive Review Chips',
      desc: 'Mandatory clinical safety step: researcher confirms, edits, or deletes candidate chips before analysis runs.',
      sampleInput: 'Unverified Candidate Chips with confidence flags',
      sampleOutput: 'Confirmed Variants: rpoB S450L, katG S315T, rpoC V483G',
      details: [
        'Prevents hallucinated or misheard ASR tokens from triggering analysis',
        'Allows manual editing of gene loci or amino acid positions',
        'Analysis NEVER proceeds automatically without explicit confirmation'
      ]
    },
    {
      id: 5,
      badge: 'STAGE 5 · EVIDENCE ENGINE',
      title: 'Deterministic Evidence Engine (Engine 2.5)',
      provider: 'WHO 2023 Catalogue 2nd Edition & PubMed',
      desc: 'Deterministic lookup, hypothesis ranking, ordinal index calculation, compensatory rules, and discordance detection.',
      sampleInput: 'Confirmed Variants + Optional Phenotype { rifampicin: "R", isoniazid: "R" }',
      sampleOutput: 'Ranked Hypotheses: H_direct(rpoB S450L: RIF), H_direct(katG S315T: INH), H_comp(rpoC V483G)',
      details: [
        'Computes Evidence Strength Index: Support - 0.5×Contradiction ([0.0, 1.0], not probability)',
        'Cites CRyPTIC Consortium NEJM 2018 (PMID: 30257473) & Comas Nat Genet 2012',
        'Caps compensatory fitness hypotheses at association_candidate'
      ]
    },
    {
      id: 6,
      badge: 'STAGE 6 · VOICE OUT',
      title: 'Guardrail Phrasing & Gnani Timbre TTS',
      provider: 'POST https://api.vachana.ai/api/v1/tts/inference',
      desc: 'Formulates answers strictly using in-memory facts packet and synthesizes fluent regional voice replies.',
      sampleInput: 'Question: "What is the katG S315T mechanism?" in Hindi',
      sampleOutput: 'Voice Out: "कैट जी एस ३१५ टी आइसोनियाज़िड प्रोड्रग सक्रियण को अक्षम करता है..."',
      details: [
        'Strict guardrail validator checks for forbidden clinical advice',
        'High-fidelity speech synthesis via Kaveri voice model in 44.1 kHz PCM WAV',
        'Transparent provenance badges: Evon v3.3, Template (no LLM), or MOCK'
      ]
    }
  ];

  const handleSimulate = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setSimStep(1);
    setActiveStep(1);

    let step = 1;
    const interval = setInterval(() => {
      step++;
      if (step <= 6) {
        setSimStep(step);
        setActiveStep(step);
      } else {
        clearInterval(interval);
        setIsSimulating(false);
      }
    }, 1800);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="p-6 bg-white border border-[#e2e7ff] rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#fef3c7] text-[#855300] border border-[#fde68a] mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>End-to-End System Walkthrough</span>
          </div>
          <h2 className="text-xl font-bold text-[#131b2e] tracking-tight">
            How TB-MECH Voice Works: Complete Data Pipeline
          </h2>
          <p className="text-xs text-[#515f74] mt-1 max-w-2xl leading-relaxed">
            From spoken Indian-language clinical dictation to deterministic WHO 2023 evidence grounding, 
            interactive What-If sensitivity, and guardrail-validated voice synthesis.
          </p>
        </div>

        <button
          onClick={handleSimulate}
          disabled={isSimulating}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
            isSimulating
              ? 'bg-amber-100 text-amber-800 cursor-not-allowed'
              : 'bg-[#f59e0b] hover:bg-[#d97706] text-[#121417] active:scale-98'
          }`}
        >
          <Play className={`w-4 h-4 fill-current ${isSimulating ? 'animate-spin' : ''}`} />
          <span>{isSimulating ? `Tracing Step ${simStep}/6...` : 'Run Pipeline Simulation'}</span>
        </button>
      </div>

      {/* Stage Flow Indicator Track */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {PIPELINE_STAGES.map(stage => {
          const isActive = activeStep === stage.id;
          const isCurrentSim = isSimulating && simStep === stage.id;

          return (
            <button
              key={stage.id}
              onClick={() => setActiveStep(stage.id)}
              className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                isActive
                  ? 'bg-white border-[#f59e0b] shadow-md ring-2 ring-[#f59e0b]/20'
                  : 'bg-[#f8fafc] border-[#e2e8f0] hover:bg-white hover:border-slate-300'
              }`}
            >
              {isCurrentSim && (
                <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-amber-500 rounded-full animate-ping" />
              )}
              <div>
                <span className={`text-[10px] font-bold block mb-1 ${isActive ? 'text-[#855300]' : 'text-slate-400'}`}>
                  {stage.badge}
                </span>
                <h4 className="text-xs font-bold text-[#131b2e] leading-snug">{stage.title}</h4>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-[#515f74]">
                <span className="font-mono text-[10px]">Step {stage.id}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isActive ? 'rotate-180 text-[#855300]' : 'text-slate-400'}`} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Deep-Dive Inspection Card for Selected Stage */}
      {(() => {
        const cur = PIPELINE_STAGES.find(s => s.id === activeStep)!;
        return (
          <div className="bg-white border border-[#e2e7ff] rounded-2xl p-6 shadow-xs space-y-6">
            {/* Stage Title & Provider */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f1f5f9] pb-4">
              <div>
                <span className="text-xs font-bold text-[#855300] uppercase tracking-wider block">
                  {cur.badge} · Technical Specification
                </span>
                <h3 className="text-lg font-bold text-[#131b2e] mt-0.5">{cur.title}</h3>
                <p className="text-xs text-[#515f74] mt-1">{cur.desc}</p>
              </div>

              <div className="px-3 py-1.5 bg-[#f2f3ff] border border-[#dae2fd] rounded-lg text-xs font-mono text-[#515f74]">
                Service: <strong className="text-[#131b2e]">{cur.provider}</strong>
              </div>
            </div>

            {/* Input vs Output Data Flow */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Input Data Payload
                </span>
                <pre className="text-xs font-mono text-[#1e293b] bg-white p-3 rounded-lg border border-slate-200 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {cur.sampleInput}
                </pre>
              </div>

              <div className="p-4 bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl space-y-2">
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                  Output Data Transformation
                </span>
                <pre className="text-xs font-mono text-emerald-900 bg-white p-3 rounded-lg border border-emerald-200 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {cur.sampleOutput}
                </pre>
              </div>
            </div>

            {/* Architectural Highlights */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-[#131b2e] uppercase tracking-wider">
                Engineering Guarantees & Verification
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {cur.details.map((detail, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 p-3 bg-[#faf8ff] border border-[#eaedff] rounded-xl text-xs text-[#515f74]">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="leading-relaxed font-medium">{detail}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Live Isolate State Summary */}
      <div className="p-5 bg-gradient-to-r from-[#faf8ff] to-[#f2f3ff] border border-[#dae2fd] rounded-2xl flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
            <Activity className="w-5 h-5 text-[#855300]" />
          </div>
          <div>
            <span className="font-bold text-[#131b2e] block">Current Pipeline State: Active Isolate ({analysis.isolate_id})</span>
            <span className="text-[#515f74]">
              {analysis.variants.length} mutations confirmed · {analysis.hypotheses.length} ranked hypotheses · {analysis.unknown_variants.length} evidence gaps
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-white border border-[#e2e7ff] rounded-lg font-mono text-[11px] text-[#515f74]">
            KB Hash: <strong className="text-[#131b2e]">{analysis.provenance.kb_sha256.substring(0, 14)}...</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
