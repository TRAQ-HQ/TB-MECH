import React, { useState, useEffect } from 'react';
import {
  GENES,
  DRUGS,
  VARIANTS,
  SYNTHETIC_ISOLATES,
  INDIAN_LANGUAGES,
  SyntheticIsolate,
  LIMITATIONS_VERBATIM
} from './data/kbData';
import { analyzeIsolate, Analysis } from './services/engine';
import { parseVariants, CandidateVariant } from './services/normalizer';
import { AudioCaptureService, transcribeClinicalPreset } from './services/voice';
import { EvidenceTriage } from './components/EvidenceTriage';
import { KnowledgeGraph } from './components/KnowledgeGraph';
import { VoiceAssistant } from './components/VoiceAssistant';
import { AuditExport } from './components/AuditExport';
import { StatsDemoView } from './components/StatsDemoView';
import { PipelineVisualizer } from './components/PipelineVisualizer';
import {
  Mic,
  MicOff,
  Dna,
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  ChevronRight,
  Info,
  Check,
  Plus,
  Trash2,
  AlertTriangle,
  Flame,
  BarChart3,
  ToggleLeft,
  ToggleRight,
  Volume2,
  Loader2
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'input' | 'triage' | 'graph' | 'assistant' | 'audit' | 'stats' | 'pipeline'>('input');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('hi-IN');
  const [gnaniMock, setGnaniMock] = useState<boolean>(false);

  // Sync mock status from server on mount
  useEffect(() => {
    fetch('/api/meta')
      .then(r => r.json())
      .then(d => {
        if (typeof d.gnani_mock === 'boolean') {
          setGnaniMock(d.gnani_mock);
        }
      })
      .catch(() => {});
  }, []);

  // Input & Voice State
  const [transcript, setTranscript] = useState<string>('rpoB S450L aur katG S315T rpoC V483G');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [recordSeconds, setRecordSeconds] = useState<number>(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [transcribeSource, setTranscribeSource] = useState<string | null>(null);
  const [waveHeights, setWaveHeights] = useState<number[]>([14, 28, 42, 20, 36, 24, 16, 30, 22, 12]);
  const audioCaptureRef = React.useRef<AudioCaptureService>(new AudioCaptureService());

  // Candidate Variant Chips with review / edit capability per Section 8
  const [chips, setChips] = useState<CandidateVariant[]>([
    { raw: 'rpoB S450L', gene: 'rpoB', variant: 'S450L', confidence: 'high', in_kb: true },
    { raw: 'katG S315T', gene: 'katG', variant: 'S315T', confidence: 'high', in_kb: true },
    { raw: 'rpoC V483G', gene: 'rpoC', variant: 'V483G', confidence: 'high', in_kb: true }
  ]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editGene, setEditGene] = useState<string>('');
  const [editVariant, setEditVariant] = useState<string>('');
  const [newManualInput, setNewManualInput] = useState<string>('');

  // Phenotype Input per Drug (optional per Section 9.6)
  const [phenotypeInput, setPhenotypeInput] = useState<Record<string, 'R' | 'S'>>({
    rifampicin: 'R',
    isoniazid: 'R'
  });

  // Current Active Analysis
  const [currentIsolateId, setCurrentIsolateId] = useState<string>('SYN-001');
  const [analysis, setAnalysis] = useState<Analysis>(() =>
    analyzeIsolate(
      ['rpoB S450L', 'katG S315T', 'rpoC V483G'],
      { rifampicin: 'R', isoniazid: 'R' },
      'SYN-001'
    )
  );

  // Audio recording timer
  useEffect(() => {
    let timerInterval: any;

    if (isRecording) {
      timerInterval = setInterval(() => {
        setRecordSeconds(s => {
          if (s >= 30) {
            handleStopRecording();
            return 30;
          }
          return s + 1;
        });
      }, 1000);
    } else {
      setRecordSeconds(0);
    }

    return () => {
      clearInterval(timerInterval);
    };
  }, [isRecording]);

  const handleStartRecording = async () => {
    setMicError(null);
    setTranscribeSource(null);
    setIsRecording(true);
    setRecordSeconds(0);

    const started = await audioCaptureRef.current.startRecording({
      languageCode: selectedLanguage,
      onLiveTranscript: liveText => {
        setTranscript(liveText);
        const parsed = parseVariants(liveText);
        if (parsed.candidates.length > 0) {
          setChips(parsed.candidates);
        }
      },
      onWaveformUpdate: bars => {
        setWaveHeights(bars);
      },
      onError: err => {
        setMicError(err);
        setIsRecording(false);
      },
      onComplete: data => {
        setIsTranscribing(false);
        if (data.text && data.text.trim()) {
          setTranscript(data.text);
          if (data.candidates && data.candidates.length > 0) {
            setChips(data.candidates);
          }
        } else {
          setMicError('No speech was detected. Please ensure your microphone is unmuted, speak mutation names clearly (e.g. "rpoB S450L and katG S315T"), or use a One-Click Preset below.');
        }
        setTranscribeSource(data.source);
      }
    });

    if (!started) {
      setIsRecording(false);
    }
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setIsTranscribing(true);
    audioCaptureRef.current.stopRecording();
  };

  const handleSimulateVoicePhrase = async (phrase: string) => {
    setMicError(null);
    setIsTranscribing(true);
    setTranscript(phrase);
    try {
      const res = await transcribeClinicalPreset(phrase, selectedLanguage);
      setChips(res.candidates);
      setTranscribeSource(res.source);
    } catch {
      const parsed = parseVariants(phrase);
      setChips(parsed.candidates);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleTranscriptChange = (newText: string) => {
    setTranscript(newText);
    const parsed = parseVariants(newText);
    if (parsed.candidates.length > 0) {
      setChips(parsed.candidates);
    }
  };

  const handleAddManualLocus = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newManualInput.trim()) return;

    const parsed = parseVariants(newManualInput.trim());
    if (parsed.candidates.length > 0) {
      setChips(prev => [...prev, ...parsed.candidates]);
    } else {
      // Add as candidate directly
      const parts = newManualInput.trim().split(/\s+/);
      const g = parts[0] || 'unknown';
      const v = parts[1] || parts[0];
      setChips(prev => [
        ...prev,
        { raw: newManualInput.trim(), gene: g, variant: v, confidence: 'medium', in_kb: false }
      ]);
    }
    setNewManualInput('');
  };

  const handleDeleteChip = (index: number) => {
    setChips(chips.filter((_, i) => i !== index));
  };

  const handleStartEditChip = (index: number) => {
    setEditingIndex(index);
    setEditGene(chips[index].gene);
    setEditVariant(chips[index].variant);
  };

  const handleSaveEditChip = () => {
    if (editingIndex === null) return;
    const updated = [...chips];
    const canonical = `${editGene}_${editVariant}`;
    const inKb = VARIANTS.some(v => v.variant_id.toLowerCase() === canonical.toLowerCase());
    updated[editingIndex] = {
      raw: `${editGene} ${editVariant}`,
      gene: editGene,
      variant: editVariant,
      confidence: 'high',
      in_kb: inKb
    };
    setChips(updated);
    setEditingIndex(null);
  };

  const handleLoadDemoIsolate = (isolate: SyntheticIsolate) => {
    setCurrentIsolateId(isolate.isolate_id);
    const textRepr = isolate.variants.join(' and ');
    setTranscript(textRepr);
    const parsed = parseVariants(textRepr);
    setChips(parsed.candidates);
    setPhenotypeInput({ ...isolate.phenotype });

    // Run deterministic analysis
    const res = analyzeIsolate(isolate.variants, isolate.phenotype, isolate.isolate_id);
    setAnalysis(res);
  };

  const handleConfirmAndAnalyse = () => {
    const variantStrings = chips.map(c => `${c.gene} ${c.variant}`);
    const res = analyzeIsolate(variantStrings, phenotypeInput, currentIsolateId);
    setAnalysis(res);
    setActiveTab('triage');
  };

  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#131b2e] flex flex-col justify-between selection:bg-[#f59e0b]/20 selection:text-[#855300]">
      {/* Top Bar Contract: Zone 1 (Wordmark) - Zone 2 (Nav Tabs Segment) - Zone 3 (Primary Action) */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#e2e7ff] px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
          {/* Zone 1: Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#f59e0b] to-[#855300] flex items-center justify-center text-white shadow-xs">
              <Dna className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <a
                href="/"
                className="text-base font-extrabold tracking-tight text-[#131b2e] whitespace-nowrap hover:text-[#855300] transition-colors leading-none"
              >
                TB-MECH Voice
              </a>
              <span className="text-[10px] text-[#515f74] font-medium leading-tight mt-0.5">
                Clinical Genomics Resistance Intelligence
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation Tabs Segmented Track */}
          <nav className="hidden lg:flex items-center p-1 bg-[#f2f3ff] rounded-xl border border-[#e2e7ff] gap-1">
            {[
              { id: 'input', label: 'Input & Voice' },
              { id: 'triage', label: 'Evidence & Triage' },
              { id: 'graph', label: 'Knowledge Graph' },
              { id: 'assistant', label: 'Voice Assistant' },
              { id: 'pipeline', label: 'Live Pipeline' },
              { id: 'audit', label: 'Audit & Export' },
              { id: 'stats', label: 'Epistasis (P2)' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-white text-[#855300] shadow-xs font-bold'
                    : 'text-[#515f74] hover:text-[#131b2e] hover:bg-white/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: Primary Action & Mobile Tab Selector */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleConfirmAndAnalyse}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-[#121417] bg-[#f59e0b] hover:bg-[#d97706] rounded-xl transition-all shadow-xs whitespace-nowrap shrink-0 active:scale-98"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Confirm and Analyse</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="lg:hidden flex items-center gap-1 overflow-x-auto pt-2.5 pb-0.5 text-xs">
          {[
            { id: 'input', label: 'Input' },
            { id: 'triage', label: 'Triage' },
            { id: 'graph', label: 'Graph' },
            { id: 'assistant', label: 'Assistant' },
            { id: 'pipeline', label: 'Pipeline' },
            { id: 'audit', label: 'Audit' },
            { id: 'stats', label: 'Epistasis' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 ${
                activeTab === tab.id
                  ? 'bg-[#855300] text-white'
                  : 'bg-[#f2f3ff] text-[#515f74]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Unified Clinical Control & Compliance Ribbon */}
      <section className="bg-white border-b border-[#e2e7ff] px-6 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Left: Gnani AI Live Status & Mode Switch */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                const next = !gnaniMock;
                setGnaniMock(next);
                fetch('/api/meta/toggle-mock', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ mock: next })
                }).catch(() => {});
              }}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${
                gnaniMock
                  ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                  : 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
              }`}
              title="Toggle between Live Gnani APIs and Mock Mode"
            >
              <span className={`w-2 h-2 rounded-full ${gnaniMock ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
              <span>{gnaniMock ? 'Mock Mode: Active' : 'Gnani AI: Live REST APIs Connected (Prisma v2.5 & Timbre)'}</span>
              <span className="text-[10px] text-slate-500 underline ml-1">
                {gnaniMock ? 'Switch to Live' : 'Toggle'}
              </span>
            </button>
          </div>

          {/* Center: Compliance & Provenance Unboxed Text */}
          <div className="hidden md:flex items-center gap-2 text-[11px] text-[#515f74]">
            <span className="font-semibold text-[#855300]">Synthetic Data Only</span>
            <span aria-hidden="true">·</span>
            <span>DPDP Act Compliant (Zero Patient Audio Retention)</span>
            <span aria-hidden="true">·</span>
            <span>WHO 2023 Catalogue (2nd Ed)</span>
          </div>

          {/* Right: Active Isolate & Engine Version */}
          <div className="flex items-center gap-2 text-[11px] font-mono text-[#515f74]">
            <span>Isolate: <strong className="text-[#855300]">{currentIsolateId}</strong></span>
            <span aria-hidden="true">·</span>
            <span>Engine: <strong>{analysis.provenance.engine_version}</strong></span>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full px-6 py-6 space-y-6 flex-1">
        {/* Tab 1: Input & Voice */}
        {activeTab === 'input' && (
          <div className="space-y-8">
            {/* Top Row: Voice & Isolate Selector */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              {/* Voice Recording Stage */}
              <div className="lg:col-span-2 bg-white border border-[#e2e7ff] rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-5">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#fffbeb] border border-[#fde68a] flex items-center justify-center text-[#855300]">
                        <Mic className="w-4 h-4" />
                      </div>
                      <h2 className="text-base font-bold text-[#131b2e] tracking-tight">
                        Voice-First Mutation Dictation (Prisma STT)
                      </h2>
                    </div>

                    {/* Language Selector & Quick Toggles */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-[#515f74] font-medium">Dictation Mode:</span>
                      <div className="inline-flex rounded-lg border border-[#dae2fd] bg-[#f2f3ff] p-0.5">
                        <button
                          type="button"
                          onClick={() => setSelectedLanguage('en-IN')}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                            selectedLanguage === 'en-IN'
                              ? 'bg-white text-[#855300] shadow-2xs'
                              : 'text-[#515f74] hover:text-[#131b2e]'
                          }`}
                        >
                          English (IN)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedLanguage('hi-IN')}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                            selectedLanguage === 'hi-IN'
                              ? 'bg-white text-[#855300] shadow-2xs'
                              : 'text-[#515f74] hover:text-[#131b2e]'
                          }`}
                        >
                          हिन्दी (Hindi)
                        </button>
                      </div>

                      <select
                        value={selectedLanguage}
                        onChange={e => setSelectedLanguage(e.target.value)}
                        className="px-2 py-1 bg-white border border-[#dae2fd] text-[#131b2e] rounded-lg text-[11px] font-semibold focus:outline-none focus:border-[#855300]"
                      >
                        {INDIAN_LANGUAGES.map(lang => (
                          <option key={lang.code} value={lang.code}>
                            {lang.name} ({lang.native})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <p className="text-xs text-[#515f74] leading-relaxed">
                    Speak resistance mutations in your language (e.g., "rpoB S450L aur katG S315T", or Hindi "कैट जी एस तीन सौ पंद्रह टी"). Live speech streams into editable candidate review chips below.
                  </p>
                </div>

                {/* Mic Action Bar & Waveform HUD */}
                <div className="p-5 bg-[#faf8ff] border border-[#e2e7ff] rounded-xl space-y-4">
                  {/* Microphone Permission Notice if blocked */}
                  {micError && (
                    <div className="p-3 bg-[#fef2f2] border border-[#fecaca] rounded-xl flex items-start gap-2.5 text-xs text-[#991b1b]">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-[#dc2626] mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-bold">Microphone status: {micError}</p>
                        <p className="text-[11px] text-slate-700 leading-relaxed">
                          To record with your physical microphone, ensure mic access is allowed in your browser address bar. You can also click any of the <strong>One-Click Clinical Dictation Presets</strong> below or load a synthetic benchmark isolate to exercise the full pipeline.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={isRecording ? handleStopRecording : handleStartRecording}
                        disabled={isTranscribing}
                        className={`flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-xs transition-all shadow-xs ${
                          isRecording
                            ? 'bg-[#dc2626] text-white animate-pulse'
                            : isTranscribing
                            ? 'bg-slate-300 text-slate-600 cursor-wait'
                            : 'bg-[#f59e0b] hover:bg-[#d97706] text-[#121417]'
                        }`}
                      >
                        {isTranscribing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isRecording ? (
                          <MicOff className="w-4 h-4" />
                        ) : (
                          <Mic className="w-4 h-4" />
                        )}
                        <span>
                          {isTranscribing
                            ? 'Transcribing (Prisma STT)...'
                            : isRecording
                            ? `Stop Recording (${30 - recordSeconds}s)`
                            : 'Speak Mutations'}
                        </span>
                      </button>

                      {isRecording && (
                        <div className="flex items-center gap-2 text-xs font-semibold text-[#dc2626]">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#dc2626] animate-ping" />
                          <span>Listening live in {INDIAN_LANGUAGES.find(l => l.code === selectedLanguage)?.name || selectedLanguage}...</span>
                        </div>
                      )}
                    </div>

                    {/* Waveform Visualizer */}
                    <div className="flex items-center gap-1.5 h-10 px-3 bg-white rounded-lg border border-[#e2e7ff]">
                      {waveHeights.map((h, i) => (
                        <div
                          key={i}
                          className={`w-1 rounded-full transition-all duration-100 ${
                            isRecording ? 'bg-[#f59e0b]' : 'bg-[#d2d9f4]'
                          }`}
                          style={{ height: `${isRecording ? h : 6}px` }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* One-Click Clinical Dictation Presets */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-[#515f74]">
                      <span>One-Click Voice Dictation Presets:</span>
                      {transcribeSource && (
                        <span className="text-[#855300] font-mono lowercase">[{transcribeSource}]</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: 'Hindi MDR: कैट जी एस ३१५ टी...', text: 'कैट जी एस ३१५ टी और आरपीओबी एस ४५० एल' },
                        { label: 'Hinglish: rpoB S450L aur katG S315T', text: 'rpoB S450L aur katG S315T rpoC V483G' },
                        { label: 'Fluoroquinolones: gyrA D94G', text: 'gyrA D94G and gyrA A90V' },
                        { label: 'Ethambutol + InhA: embB M306V', text: 'embB M306V aur inhA c.-15C>T' }
                      ].map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSimulateVoicePhrase(preset.text)}
                          className="px-2.5 py-1 bg-white hover:bg-[#f2f3ff] text-[#131b2e] border border-[#dae2fd] hover:border-[#855300] rounded-lg text-[11px] font-medium transition-colors text-left shadow-2xs"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Editable Raw Transcript Box per Section 13 */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#515f74] block">
                        Spoken Transcript (Editable)
                      </label>
                      <span className="text-[10px] text-slate-400">Live streamed from mic or preset</span>
                    </div>
                    <textarea
                      value={transcript}
                      onChange={e => handleTranscriptChange(e.target.value)}
                      rows={2}
                      placeholder="Transcribed text appears here. You can also type directly..."
                      className="w-full px-3.5 py-2.5 bg-white border border-[#dae2fd] rounded-xl text-xs text-[#131b2e] focus:outline-none focus:border-[#855300] font-sans"
                    />
                  </div>
                </div>

                {/* Fast Manual Add Input */}
                <form onSubmit={handleAddManualLocus} className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newManualInput}
                    onChange={e => setNewManualInput(e.target.value)}
                    placeholder="Type additional mutation (e.g. gyrA D94G, embB M306V, inhA c.-15C>T)..."
                    className="flex-1 px-3.5 py-2.5 bg-[#f2f3ff] border border-[#dae2fd] rounded-xl text-xs text-[#131b2e] focus:outline-none focus:border-[#855300]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-[#855300] hover:bg-[#6b4200] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </form>
              </div>

              {/* Synthetic Benchmark Isolates Loader per Section 7.4 */}
              <div className="bg-white border border-[#e2e7ff] rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#eaedff]">
                    <h3 className="text-sm font-bold text-[#131b2e] tracking-tight">
                      Synthetic Benchmark Isolates
                    </h3>
                    <span className="text-[10px] uppercase font-bold text-[#855300]">4 Presets</span>
                  </div>
                  <p className="text-xs text-[#515f74] mt-2">
                    Load standardized challenge isolates to test canonical, discordant, or gap cases:
                  </p>
                </div>

                <div className="space-y-2">
                  {SYNTHETIC_ISOLATES.map(iso => (
                    <button
                      key={iso.isolate_id}
                      onClick={() => handleLoadDemoIsolate(iso)}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all group ${
                        currentIsolateId === iso.isolate_id
                          ? 'border-[#855300] bg-[#faf8ff]'
                          : 'border-[#eaedff] hover:border-[#dae2fd]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-[#855300]">{iso.isolate_id}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#855300]" />
                      </div>
                      <p className="text-xs font-semibold text-[#131b2e] mt-0.5">{iso.name}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {iso.variants.map((v, i) => (
                          <span key={i} className="font-mono text-[10px] bg-[#f2f3ff] text-slate-700 px-1.5 py-0.2 rounded">
                            {v}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Optional Phenotype DST Selectors (Section 9.6) */}
                <div className="pt-2 border-t border-[#eaedff] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#515f74]">
                      Optional Phenotypic DST (Discordance Check):
                    </span>
                    <span className="text-[10px] text-slate-400">None / S / R</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { key: 'rifampicin', label: 'RIF' },
                      { key: 'isoniazid', label: 'INH' },
                      { key: 'ethambutol', label: 'EMB' },
                      { key: 'fluoroquinolones', label: 'FQ' }
                    ].map(d => {
                      const currentVal = phenotypeInput[d.key] || '';
                      return (
                        <div key={d.key} className="flex items-center justify-between bg-[#f2f3ff] px-2.5 py-1.5 rounded-lg border border-[#e2e7ff]">
                          <span className="font-mono text-xs font-bold text-[#131b2e]">{d.label}</span>
                          <div className="flex items-center gap-1 bg-white p-0.5 rounded-md border border-[#dae2fd]">
                            <button
                              type="button"
                              onClick={() => {
                                const copy = { ...phenotypeInput };
                                delete copy[d.key];
                                setPhenotypeInput(copy);
                              }}
                              className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                                !currentVal ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:text-slate-600'
                              }`}
                              title="No phenotypic call specified"
                            >
                              —
                            </button>
                            <button
                              type="button"
                              onClick={() => setPhenotypeInput({ ...phenotypeInput, [d.key]: 'S' })}
                              className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                                currentVal === 'S'
                                  ? 'bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]'
                                  : 'text-slate-400 hover:text-emerald-700'
                              }`}
                              title="Susceptible"
                            >
                              S
                            </button>
                            <button
                              type="button"
                              onClick={() => setPhenotypeInput({ ...phenotypeInput, [d.key]: 'R' })}
                              className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                                currentVal === 'R'
                                  ? 'bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]'
                                  : 'text-slate-400 hover:text-rose-700'
                              }`}
                              title="Resistant"
                            >
                              R
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Candidate Variant Chips Stage (Mandatory User Review Step per Section 8 & 13) */}
            <div className="bg-white border border-[#e2e7ff] rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-[#eaedff]">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[#131b2e] tracking-tight">
                      Confirmed Mutation Queue
                    </h3>
                    <span className="text-[11px] text-[#855300] font-semibold bg-[#fffbeb] px-2 py-0.5 rounded border border-[#fde68a]">
                      Human Review Step Required
                    </span>
                  </div>
                  <p className="text-xs text-[#515f74] mt-0.5">
                    Analysis never runs directly from raw speech transcript. Review, edit, or delete chips below before confirming.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setChips([])}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-[#515f74] hover:text-[#dc2626] bg-[#f2f3ff] rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All</span>
                  </button>
                  <button
                    onClick={handleConfirmAndAnalyse}
                    disabled={chips.length === 0}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#f59e0b] hover:bg-[#d97706] disabled:opacity-40 text-[#121417] text-xs font-bold rounded-xl transition-all shadow-xs"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Confirm and Analyse</span>
                  </button>
                </div>
              </div>

              {/* Chips List */}
              {chips.length > 0 ? (
                <div className="flex flex-wrap gap-2.5">
                  {chips.map((chip, idx) => {
                    const isEditing = editingIndex === idx;

                    if (isEditing) {
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-2 p-2 rounded-xl border border-[#855300] bg-[#fffbeb] text-xs shadow-xs"
                        >
                          <input
                            type="text"
                            value={editGene}
                            onChange={e => setEditGene(e.target.value)}
                            placeholder="Gene"
                            className="w-16 px-2 py-1 bg-white border border-[#dae2fd] rounded font-mono font-bold text-xs"
                          />
                          <input
                            type="text"
                            value={editVariant}
                            onChange={e => setEditVariant(e.target.value)}
                            placeholder="Mutation"
                            className="w-20 px-2 py-1 bg-white border border-[#dae2fd] rounded font-mono font-bold text-xs"
                          />
                          <button
                            onClick={handleSaveEditChip}
                            className="px-2.5 py-1 bg-[#855300] text-white rounded text-[11px] font-bold"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingIndex(null)}
                            className="px-2 py-1 bg-white border border-slate-300 rounded text-[11px]"
                          >
                            Cancel
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={idx}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs shadow-2xs transition-all ${
                          chip.in_kb
                            ? 'bg-white border-[#dae2fd] text-[#131b2e]'
                            : 'bg-[#faf5ff] border-[#e9d5ff] text-purple-900'
                        }`}
                      >
                        <div className="font-mono font-bold text-xs text-[#131b2e]">
                          {chip.gene} {chip.variant}
                        </div>

                        <div className="flex items-center gap-1.5 text-[10px] text-[#515f74]">
                          <span aria-hidden="true">·</span>
                          <span className={`font-semibold capitalize ${
                            chip.confidence === 'high' ? 'text-emerald-700' : 'text-amber-700'
                          }`}>
                            {chip.confidence}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className={`font-medium ${
                            chip.in_kb ? 'text-[#855300]' : 'text-purple-700 font-semibold'
                          }`}>
                            {chip.in_kb ? 'WHO 2023' : 'Gap'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 pl-1 ml-1 border-l border-[#e2e7ff]">
                          <button
                            onClick={() => handleStartEditChip(idx)}
                            className="text-slate-400 hover:text-[#855300] text-[10px] font-semibold px-1 py-0.5 rounded hover:bg-slate-100"
                            title="Edit mutation"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteChip(idx)}
                            className="text-slate-400 hover:text-rose-600 text-sm px-1 py-0.5 rounded hover:bg-rose-50"
                            title="Remove mutation"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs space-y-1">
                  <p>No mutation chips currently queued.</p>
                  <p className="text-[#855300]">Dictate with voice, type in the box, or click a synthetic benchmark isolate.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Evidence & Triage */}
        {activeTab === 'triage' && (
          <EvidenceTriage analysis={analysis} onUpdateVariants={variants => setChips(parseVariants(variants.join(' ')).candidates)} />
        )}

        {/* Tab 3: Knowledge Graph */}
        {activeTab === 'graph' && <KnowledgeGraph />}

        {/* Tab 4: Voice Assistant */}
        {activeTab === 'assistant' && (
          <VoiceAssistant analysis={analysis} selectedLanguage={selectedLanguage} />
        )}

        {/* Tab 5: Live Pipeline Visualizer */}
        {activeTab === 'pipeline' && (
          <PipelineVisualizer analysis={analysis} selectedLanguage={selectedLanguage} />
        )}

        {/* Tab 6: Audit & Export */}
        {activeTab === 'audit' && <AuditExport analysis={analysis} />}

        {/* Tab 7: P2 Epistasis Demo */}
        {activeTab === 'stats' && <StatsDemoView />}
      </main>

      {/* Clean Scientific Footer */}
      <footer className="mt-12 border-t border-[#e2e7ff] bg-white px-6 py-4 text-xs text-[#515f74]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p>
            TB-MECH Voice © 2026. Built for the Great Indian AI Internship Challenge (Gnani.ai) — Sovereign AI for India.
          </p>
          <div className="flex items-center gap-3 text-[11px]">
            <span>Research-Support Prototype</span>
            <span aria-hidden="true">·</span>
            <span>Not For Treatment Decisions</span>
            <span aria-hidden="true">·</span>
            <span className="text-[#855300] font-semibold">WHO 2023 Curated</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
