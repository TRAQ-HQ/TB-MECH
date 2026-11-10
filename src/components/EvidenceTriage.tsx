import React, { useState } from 'react';
import { Analysis, Hypothesis, calculateWhatIf } from '../services/engine';
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Dna,
  BookOpen,
  Sliders,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Flame,
  Info,
  Check,
  RotateCcw
} from 'lucide-react';

interface EvidenceTriageProps {
  analysis: Analysis;
  onUpdateVariants?: (variants: string[]) => void;
}

export const EvidenceTriage: React.FC<EvidenceTriageProps> = ({ analysis, onUpdateVariants }) => {
  // What-If state
  const [removedVariants, setRemovedVariants] = useState<string[]>([]);
  const [whatIfActive, setWhatIfActive] = useState<boolean>(false);

  // Compute what-if when active
  const whatIfResult = whatIfActive
    ? calculateWhatIf(analysis, removedVariants)
    : null;

  const currentAnalysis = whatIfResult ? whatIfResult.new_analysis : analysis;

  const toggleRemoveVariant = (variantId: string) => {
    if (removedVariants.includes(variantId)) {
      setRemovedVariants(removedVariants.filter(v => v !== variantId));
    } else {
      setRemovedVariants([...removedVariants, variantId]);
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'experimentally_supported':
        return 'bg-[#ecfdf5] border-[#a7f3d0] text-[#065f46]';
      case 'multi_study_association':
        return 'bg-[#eff6ff] border-[#bfdbfe] text-[#1e40af]';
      case 'association_candidate':
        return 'bg-[#fffbeb] border-[#fde68a] text-[#92400e]';
      case 'weak_or_indirect':
        return 'bg-[#f8fafc] border-[#e2e8f0] text-[#475569]';
      case 'conflicting':
        return 'bg-[#fef2f2] border-[#fecaca] text-[#991b1b]';
      case 'unknown':
      default:
        return 'bg-[#faf5ff] border-[#e9d5ff] text-[#6b21a8]';
    }
  };

  // Helper to compute summary status for each of the 4 key drugs
  const getDrugSummary = (drugKey: string) => {
    const drugHypotheses = currentAnalysis.hypotheses.filter(h => h.drug === drugKey);
    const pheno = currentAnalysis.phenotype?.[drugKey];
    const isDiscordant = currentAnalysis.discordances.some(d => d.drug === drugKey && d.type === 'discordant');

    let call: 'Resistant' | 'Susceptible' | 'Candidate' | 'Not Detected' = 'Not Detected';
    let determinant = 'None identified';
    let group = 'None';

    if (drugHypotheses.length > 0) {
      const topH = drugHypotheses[0];
      if (topH.status === 'experimentally_supported' || topH.status === 'multi_study_association') {
        call = 'Resistant';
      } else if (topH.status === 'association_candidate') {
        call = 'Candidate';
      }
      determinant = topH.statement;
    } else {
      call = 'Not Detected';
    }

    // Associated variants
    const assocVars = currentAnalysis.variants.filter(v => v.drug === drugKey);
    if (assocVars.length > 0) {
      determinant = assocVars.map(v => `${v.gene} ${v.short}`).join(', ');
      group = assocVars[0].who_group ? `WHO Group ${assocVars[0].who_group}` : 'Curated';
    }

    return { call, determinant, group, pheno, isDiscordant };
  };

  const DRUG_CARDS = [
    { key: 'rifampicin', label: 'Rifampicin (RIF)', class: 'Rifamycin / RNA Polymerase β' },
    { key: 'isoniazid', label: 'Isoniazid (INH)', class: 'Prodrug / Catalase-Peroxidase' },
    { key: 'ethambutol', label: 'Ethambutol (EMB)', class: 'Arabinogalactan Synthesis' },
    { key: 'fluoroquinolones', label: 'Fluoroquinolones (FQ)', class: 'DNA Gyrase Subunit A' }
  ];

  return (
    <div className="space-y-6">
      {/* 4-Drug Antimicrobial Triage Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {DRUG_CARDS.map(d => {
          const info = getDrugSummary(d.key);
          const isRes = info.call === 'Resistant';
          const isCand = info.call === 'Candidate';

          return (
            <div
              key={d.key}
              className={`bg-white border rounded-2xl p-4 shadow-xs flex flex-col justify-between space-y-3 transition-all ${
                info.isDiscordant
                  ? 'border-rose-400 ring-1 ring-rose-200'
                  : isRes
                  ? 'border-[#fecaca]'
                  : isCand
                  ? 'border-[#fde68a]'
                  : 'border-[#e2e7ff]'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#131b2e] tracking-tight">{d.label}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      isRes
                        ? 'bg-[#fef2f2] border-[#fecaca] text-[#991b1b]'
                        : isCand
                        ? 'bg-[#fffbeb] border-[#fde68a] text-[#92400e]'
                        : 'bg-[#ecfdf5] border-[#a7f3d0] text-[#065f46]'
                    }`}
                  >
                    {isRes ? 'Resistant' : isCand ? 'Disputed / Candidate' : 'Not Detected (S)'}
                  </span>
                </div>
                <p className="text-[10px] text-[#515f74]">{d.class}</p>
              </div>

              <div className="pt-2 border-t border-[#f2f3ff] space-y-1 text-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#515f74]">Determinant:</span>
                  <span className="font-mono font-bold text-[#855300] truncate max-w-[140px]" title={info.determinant}>
                    {info.determinant}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#515f74]">Phenotypic DST:</span>
                  <span className="font-mono font-semibold">
                    {info.pheno ? (
                      <span className={info.pheno === 'R' ? 'text-rose-700 font-bold' : 'text-emerald-700 font-bold'}>
                        {info.pheno === 'R' ? 'R (Resistant)' : 'S (Susceptible)'}
                      </span>
                    ) : (
                      <span className="text-slate-400">Not provided</span>
                    )}
                  </span>
                </div>

                {info.isDiscordant && (
                  <div className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded flex items-center gap-1 border border-rose-200">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Genotype-Phenotype Discordance</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Genomic Sequence Alignment Track (Deep Chamber Slate #121417) */}
      <div className="bg-[#121417] text-white border border-[#283044] rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#283044]">
          <div className="flex items-center gap-2">
            <Dna className="w-4 h-4 text-[#f59e0b]" />
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Genomic Sequence Alignment & Codon Track (H37Rv Reference vs Isolate)
            </h4>
          </div>
          <span className="text-[10px] font-mono text-[#f59e0b]">WHO RRDR / QRDR Mapped</span>
        </div>

        <div className="font-mono text-xs overflow-x-auto space-y-2 py-1 leading-relaxed">
          {/* rpoB RRDR Core track */}
          <div className="space-y-0.5">
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span className="w-24 text-slate-400 font-semibold">rpoB (RRDR):</span>
              <span className="tracking-widest">
                426-ASN VAL GLN SER GLN LEU SER GLN PHE MET ASP GLN ASN ASN PRO LEU <span className="text-[#f59e0b] font-bold underline">SER(450)</span> LEU SER GLY-452
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="w-24 text-slate-400 font-semibold">Isolate:</span>
              <span className="tracking-widest text-slate-300">
                426-ASN VAL GLN SER GLN LEU SER GLN PHE MET ASP GLN ASN ASN PRO LEU{' '}
                {currentAnalysis.variants.some(v => v.variant_id === 'rpoB_S450L') ? (
                  <span className="bg-[#f59e0b] text-[#121417] px-1 font-bold rounded">LEU(450*)</span>
                ) : (
                  <span className="text-slate-400">SER(450)</span>
                )}{' '}
                LEU SER GLY-452
              </span>
            </div>
          </div>

          {/* katG 315 track */}
          <div className="space-y-0.5 pt-1.5 border-t border-[#1e2430]">
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span className="w-24 text-slate-400 font-semibold">katG (Cat-Per):</span>
              <span className="tracking-widest">
                310-VAL ALA GLU GLY LEU <span className="text-[#f59e0b] font-bold underline">SER(315)</span> TRP THR PRO ILE-320
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="w-24 text-slate-400 font-semibold">Isolate:</span>
              <span className="tracking-widest text-slate-300">
                310-VAL ALA GLU GLY LEU{' '}
                {currentAnalysis.variants.some(v => v.variant_id === 'katG_S315T') ? (
                  <span className="bg-[#f59e0b] text-[#121417] px-1 font-bold rounded">THR(315*)</span>
                ) : (
                  <span className="text-slate-400">SER(315)</span>
                )}{' '}
                TRP THR PRO ILE-320
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Discordance Notices Banner (e.g. SYN-003) */}
      {currentAnalysis.discordances.length > 0 && (
        <div className="space-y-2">
          {currentAnalysis.discordances.map((d, i) => (
            <div
              key={i}
              className={`p-4 rounded-xl border flex items-start gap-3 ${
                d.type === 'discordant'
                  ? 'bg-[#fef2f2] border-[#fecaca] text-[#991b1b]'
                  : d.type === 'unexplained_by_kb'
                  ? 'bg-[#fffbeb] border-[#fde68a] text-[#92400e]'
                  : 'bg-[#ecfdf5] border-[#a7f3d0] text-[#065f46]'
              }`}
            >
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <span className="font-bold uppercase tracking-wider text-[11px] block">
                  {d.type === 'discordant' ? 'Genotype-Phenotype Discordance Alert' : 'Phenotype Finding'}
                </span>
                <p className="font-medium leading-relaxed">{d.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Compensatory Interactions Alert (e.g. SYN-001) */}
      {currentAnalysis.interactions.length > 0 && (
        <div className="p-4 bg-[#fffbeb] border border-[#fde68a] rounded-xl flex items-start gap-3 text-xs text-[#92400e]">
          <Flame className="w-5 h-5 shrink-0 text-[#f59e0b] mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold uppercase tracking-wider text-[11px] block text-[#855300]">
              Candidate Compensatory Fitness Restoration Detected
            </span>
            {currentAnalysis.interactions.map(rel => (
              <p key={rel.relation_id} className="leading-relaxed">
                <strong>{rel.from_variant}</strong> compensates for <strong>{rel.to_variant}</strong>: {rel.claim}{' '}
                <span className="font-semibold text-[#855300]">({rel.citation.text})</span>
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Variants Table with Verified/Unverified Badges */}
      <div className="bg-white border border-[#e2e7ff] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#eaedff]">
          <div className="flex items-center gap-2">
            <Dna className="w-5 h-5 text-[#855300]" />
            <div>
              <h3 className="text-sm font-bold text-[#131b2e] tracking-tight">Confirmed Variants Table</h3>
              <p className="text-xs text-[#515f74]">Genomic variants in this isolate evaluated against the WHO catalogue</p>
            </div>
          </div>
          <span className="text-xs text-[#855300] font-semibold">{currentAnalysis.variants.length} Identified</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#e2e7ff] text-[#515f74] uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Variant ID</th>
                <th className="py-2.5 px-3">Gene Locus</th>
                <th className="py-2.5 px-3">Mutation</th>
                <th className="py-2.5 px-3">Associated Drug</th>
                <th className="py-2.5 px-3">Effect Class</th>
                <th className="py-2.5 px-3">WHO Tier</th>
                <th className="py-2.5 px-3">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f2f3ff]">
              {currentAnalysis.variants.map(v => (
                <tr key={v.variant_id} className="hover:bg-[#faf8ff] transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-[#855300] whitespace-nowrap">
                    {v.variant_id}
                  </td>
                  <td className="py-3 px-3 font-semibold text-[#131b2e]">
                    {v.gene}
                  </td>
                  <td className="py-3 px-3 font-mono text-[#131b2e]">
                    {v.short}
                  </td>
                  <td className="py-3 px-3 capitalize text-[#131b2e]">
                    {v.drug || 'Context'}
                  </td>
                  <td className="py-3 px-3 text-[#515f74]">
                    {v.effect_class?.replace('_', ' ') || 'candidate'}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-slate-700">
                      {v.who_group ? `Group ${v.who_group}` : 'Candidate'}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        v.verified
                          ? 'bg-[#ecfdf5] border-[#a7f3d0] text-[#065f46]'
                          : 'bg-[#fffbeb] border-[#fde68a] text-[#92400e]'
                      }`}
                    >
                      {v.verified ? 'Verified' : 'Unverified'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ranked Hypotheses Cards per Section 9.5 */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-bold text-[#131b2e] tracking-tight">Ranked Mechanism Hypotheses</h3>
          <p className="text-xs text-[#515f74]">
            Ranked by evidence status, ordinal evidence strength index (not a probability), and independent source count
          </p>
        </div>

        <div className="space-y-3">
          {currentAnalysis.hypotheses.map((h, idx) => (
            <div
              key={h.hypothesis_id}
              className="bg-white border border-[#e2e7ff] rounded-2xl p-5 shadow-xs space-y-3 hover:border-[#dae2fd] transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-[#f2f3ff] text-[#855300] font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <h4 className="text-sm font-bold text-[#131b2e]">{h.statement}</h4>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold border capitalize ${getStatusBadgeStyle(
                      h.status
                    )}`}
                  >
                    {h.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              {/* Ordinal Evidence Strength Index Bar */}
              <div className="bg-[#faf8ff] border border-[#eaedff] rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#515f74]">
                      Evidence Strength Index <span className="font-normal text-slate-400">(ordinal, not a probability)</span>
                    </span>
                    <span className="font-mono font-bold text-[#855300]">
                      {h.evidence_index !== null ? `${h.evidence_index.toFixed(2)} / 1.00` : 'N/A'}
                    </span>
                  </div>
                  <div className="w-full bg-[#e2e7ff] h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#f59e0b] to-[#855300] rounded-full transition-all"
                      style={{ width: `${Math.max((h.evidence_index ?? 0) * 100, 6)}%` }}
                    />
                  </div>
                </div>

                <div className="text-right text-[11px] text-[#515f74] shrink-0">
                  <span className="block font-medium">Independent Sources: {h.independent_support}</span>
                  <span className="block text-slate-400">{h.supporting_evidence.length} supporting records</span>
                </div>
              </div>

              {/* Citations & Evidence Records */}
              {h.supporting_evidence.length > 0 && (
                <div className="pt-2 border-t border-[#f2f3ff] space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#515f74] block">
                    Curated Citations
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {h.supporting_evidence.map(ev => (
                      <div
                        key={ev.evidence_id}
                        className="p-2.5 bg-[#f8fafc] border border-slate-200 rounded-lg text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-[11px] text-[#855300]">
                            {ev.evidence_id}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-200">
                              Grade {ev.grade}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              {ev.verified ? 'Verified' : 'Unverified'}
                            </span>
                          </div>
                        </div>
                        <p className="text-slate-700 leading-snug line-clamp-2">{ev.claim}</p>
                        <p className="text-[11px] text-slate-500 italic">{ev.citation.text}</p>
                        {ev.citation.pmid && (
                          <a
                            href={`https://pubmed.ncbi.nlm.nih.gov/${ev.citation.pmid}/`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-[#855300] hover:underline font-mono"
                          >
                            PMID:{ev.citation.pmid} <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Evidence Gaps List (Unknown Variants) */}
      {currentAnalysis.evidence_gaps.length > 0 && (
        <div className="bg-white border border-[#e2e7ff] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#eaedff]">
            <HelpCircle className="w-5 h-5 text-purple-600" />
            <div>
              <h3 className="text-sm font-bold text-[#131b2e] tracking-tight">Evidence Gaps</h3>
              <p className="text-xs text-[#515f74]">Variants detected in isolate with no curated evidence in current knowledge base</p>
            </div>
          </div>

          <div className="space-y-2">
            {currentAnalysis.evidence_gaps.map((gap, i) => (
              <div
                key={i}
                className="p-3 bg-[#faf5ff] border border-[#e9d5ff] rounded-xl flex items-center justify-between text-xs text-purple-900"
              >
                <div>
                  <span className="font-mono font-bold text-sm block">{gap.variant_id}</span>
                  <span className="text-[11px] text-purple-700">{gap.statement}</span>
                </div>
                <span className="px-2.5 py-1 rounded-md text-[10.5px] font-bold bg-white border border-purple-200 text-purple-800">
                  Status: Unknown
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* What-If Counterfactual Sensitivity Section per Section 9.7 */}
      <div className="bg-[#faf8ff] border border-[#d2d9f4] rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-[#855300]" />
            <div>
              <h3 className="text-sm font-bold text-[#131b2e] tracking-tight">
                Knowledge-Base What-If Sensitivity Check
              </h3>
              <p className="text-xs text-[#515f74]">
                This shows what the curated evidence implies if specific variants were removed, not what would happen biologically.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setWhatIfActive(!whatIfActive);
                if (!whatIfActive) setRemovedVariants([]);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                whatIfActive
                  ? 'bg-[#855300] text-white shadow-xs'
                  : 'bg-white text-[#855300] border border-[#d2d9f4] hover:bg-[#eaedff]'
              }`}
            >
              {whatIfActive ? 'What-If Simulation Active' : 'Start What-If Test'}
            </button>
            {whatIfActive && (
              <button
                onClick={() => setRemovedVariants([])}
                className="px-3 py-1.5 text-xs text-[#515f74] hover:text-[#131b2e] bg-white border border-[#d2d9f4] rounded-lg"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {whatIfActive && (
          <div className="pt-2 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#515f74] block">
              Select variants to simulate removing from isolate:
            </span>
            <div className="flex flex-wrap gap-2">
              {analysis.variants.map(v => {
                const isRemoved = removedVariants.includes(v.variant_id);
                return (
                  <button
                    key={v.variant_id}
                    onClick={() => toggleRemoveVariant(v.variant_id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                      isRemoved
                        ? 'bg-[#dc2626] text-white font-bold'
                        : 'bg-white border border-[#d2d9f4] text-[#131b2e] hover:border-[#855300]'
                    }`}
                  >
                    <span>{isRemoved ? '✕ Removed' : v.variant_id}</span>
                  </button>
                );
              })}
            </div>

            {whatIfResult && (
              <div className="p-3 bg-white border border-[#dae2fd] rounded-xl text-xs space-y-2 mt-3">
                <span className="font-bold text-[#855300] block text-xs">What-If Delta:</span>
                {whatIfResult.disappeared_hypotheses.length > 0 ? (
                  <div>
                    <span className="font-semibold text-rose-700">Hypotheses that disappear:</span>
                    <ul className="list-disc pl-5 text-slate-700 mt-1 space-y-0.5">
                      {whatIfResult.disappeared_hypotheses.map(h => (
                        <li key={h.hypothesis_id}>{h.statement}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <span className="text-slate-500 italic block">No hypotheses disappeared.</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
