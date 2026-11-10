import React, { useState } from 'react';
import { Analysis } from '../services/engine';
import { LIMITATIONS_VERBATIM } from '../data/kbData';
import { Download, Copy, Check, Shield, FileText, Lock, FileCode } from 'lucide-react';

interface AuditExportProps {
  analysis: Analysis;
}

export const AuditExport: React.FC<AuditExportProps> = ({ analysis }) => {
  const [copiedJson, setCopiedJson] = useState<boolean>(false);
  const [copiedReport, setCopiedReport] = useState<boolean>(false);

  const generateMarkdownReport = () => {
    return `# TB-MECH Voice Analysis Report: ${analysis.analysis_id}

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

## 4. Limitations (Verbatim Section 18)
${LIMITATIONS_VERBATIM}

---
*Report generated deterministically by TB-MECH Voice.*
`;
  };

  const handleDownloadJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(analysis, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `TB_MECH_${analysis.analysis_id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleDownloadMd = () => {
    const dataStr = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(generateMarkdownReport());
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `TB_MECH_${analysis.analysis_id}.md`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleCopyReport = () => {
    navigator.clipboard.writeText(generateMarkdownReport());
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(analysis, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="p-5 bg-white border border-[#e2e7ff] rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#ecfdf5] border border-[#a7f3d0] flex items-center justify-center text-[#059669]">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#131b2e]">Reproducibility, Integrity & Audit Logs</h3>
            <p className="text-xs text-[#515f74]">
              Cryptographically verified outputs with exact knowledge-base hash provenance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyReport}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#855300] bg-[#f2f3ff] hover:bg-[#eaedff] rounded-lg transition-colors border border-[#dae2fd]"
          >
            {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedReport ? 'Copied' : 'Copy Text'}</span>
          </button>
          <button
            onClick={handleDownloadMd}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#131b2e] bg-[#f2f3ff] hover:bg-[#eaedff] border border-[#dae2fd] rounded-lg transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-[#855300]" />
            <span>Download .MD</span>
          </button>
          <button
            onClick={handleDownloadJson}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#121417] bg-[#f59e0b] hover:bg-[#d97706] rounded-lg transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .JSON</span>
          </button>
        </div>
      </div>

      {/* Cryptographic Hash and Verification Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-[#e2e7ff] rounded-xl p-4 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#515f74]">KB Cryptographic Signature</span>
          <p className="font-mono text-xs font-bold text-[#855300] break-all">{analysis.provenance.kb_sha256}</p>
          <span className="text-[11px] text-slate-400">Strict immutability across evaluation turns</span>
        </div>

        <div className="bg-white border border-[#e2e7ff] rounded-xl p-4 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#515f74]">Engine Architecture</span>
          <p className="text-xs font-bold text-[#131b2e]">{analysis.provenance.engine_version}</p>
          <span className="text-[11px] text-emerald-700 font-semibold">100% Deterministic (Zero Hallucination)</span>
        </div>

        <div className="bg-white border border-[#e2e7ff] rounded-xl p-4 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#515f74]">WHO Evidence Standard</span>
          <p className="text-xs font-bold text-[#131b2e]">{analysis.provenance.kb_version}</p>
          <span className="text-[11px] text-slate-400">Curated variant association tiers</span>
        </div>
      </div>

      {/* Mandatory Limitations per Section 18 */}
      <div className="bg-white border border-[#e2e7ff] rounded-2xl p-6 shadow-xs space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-[#eaedff]">
          <Shield className="w-4 h-4 text-[#855300]" />
          <h4 className="text-xs font-bold text-[#131b2e] uppercase tracking-wider">
            Mandatory Scientific Limitations (Section 18 Verbatim)
          </h4>
        </div>
        <blockquote className="p-4 bg-[#faf8ff] border border-[#eaedff] rounded-xl text-xs text-slate-700 leading-relaxed italic">
          "{LIMITATIONS_VERBATIM}"
        </blockquote>
      </div>

      {/* Markdown Preview */}
      <div className="bg-white border border-[#e2e7ff] rounded-2xl p-6 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#eaedff]">
          <span className="text-xs font-bold text-[#131b2e] uppercase tracking-wider">
            Markdown Clinical Interpretation Report Preview
          </span>
          <button
            onClick={handleCopyReport}
            className="text-xs font-semibold text-[#855300] hover:underline flex items-center gap-1"
          >
            {copiedReport ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            <span>Copy MD</span>
          </button>
        </div>

        <pre className="p-4 bg-[#faf8ff] border border-[#e2e7ff] rounded-xl font-mono text-[11px] text-[#131b2e] overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[360px]">
          {generateMarkdownReport()}
        </pre>
      </div>

      {/* Raw JSON Tree Inspector */}
      <div className="bg-white border border-[#e2e7ff] rounded-2xl p-6 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#eaedff]">
          <span className="text-xs font-bold text-[#131b2e] uppercase tracking-wider">
            Raw Deterministic Run Payload (JSON)
          </span>
          <button
            onClick={handleCopyJson}
            className="text-xs font-semibold text-[#855300] hover:underline flex items-center gap-1"
          >
            {copiedJson ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            <span>Copy JSON</span>
          </button>
        </div>

        <pre className="p-4 bg-[#121417] text-amber-200 border border-[#283044] rounded-xl font-mono text-[11px] overflow-x-auto max-h-[300px] leading-relaxed">
          {JSON.stringify(analysis, null, 2)}
        </pre>
      </div>
    </div>
  );
};
