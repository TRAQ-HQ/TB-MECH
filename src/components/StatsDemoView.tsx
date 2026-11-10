import React, { useState } from 'react';
import {
  runInteractionRegression,
  generateSyntheticStatsData,
  StatsResult,
  IsolateDatum,
  STATS_DISCLAIMER
} from '../services/statsDemo';
import { BarChart3, RefreshCw, Upload, AlertCircle, Info, CheckCircle2 } from 'lucide-react';

export const StatsDemoView: React.FC = () => {
  const [data, setData] = useState<IsolateDatum[]>(() => generateSyntheticStatsData(25));
  const [variantA, setVariantA] = useState<string>('rpoB S450L');
  const [variantB, setVariantB] = useState<string>('rpoC V483G');
  const [stats, setStats] = useState<StatsResult>(() =>
    runInteractionRegression(generateSyntheticStatsData(25), 'rpoB S450L', 'rpoC V483G')
  );

  const handleRegenerate = () => {
    const newData = generateSyntheticStatsData(25);
    setData(newData);
    const newStats = runInteractionRegression(newData, variantA, variantB);
    setStats(newStats);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const text = event.target?.result as string;
        const lines = text.trim().split('\n');
        const header = lines[0].split(',').map(h => h.trim().toLowerCase());
        const idIdx = header.indexOf('isolate_id');
        const aIdx = header.indexOf('a');
        const bIdx = header.indexOf('b');
        const micIdx = header.indexOf('log2_mic');

        if (aIdx === -1 || bIdx === -1 || micIdx === -1) {
          alert('CSV must contain headers: isolate_id, A, B, log2_mic');
          return;
        }

        const parsed: IsolateDatum[] = [];
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',').map(p => p.trim());
          if (parts.length >= 4) {
            parsed.push({
              isolate_id: parts[idIdx] || `ISO-${i}`,
              A: parseInt(parts[aIdx], 10),
              B: parseInt(parts[bIdx], 10),
              log2_mic: parseFloat(parts[micIdx])
            });
          }
        }

        setData(parsed);
        const newStats = runInteractionRegression(parsed, variantA, variantB);
        setStats(newStats);
      } catch (err) {
        alert('Failed to parse CSV file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Mandatory Disclaimer Banner per Section 14 */}
      <div className="p-4 bg-[#fffbeb] border border-[#fde68a] rounded-xl flex items-start gap-3 text-xs text-[#92400e]">
        <AlertCircle className="w-5 h-5 shrink-0 text-[#f59e0b] mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold uppercase tracking-wider text-[11px] block text-[#855300]">
            Statistical Epistasis Demo Notice (P2)
          </span>
          <p className="font-medium leading-relaxed">{STATS_DISCLAIMER}</p>
        </div>
      </div>

      {/* Control Header */}
      <div className="p-5 bg-white border border-[#e2e7ff] rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-[#131b2e] tracking-tight">
            Two-Variant Epistasis Regression Model (OLS)
          </h3>
          <p className="text-xs text-[#515f74]">
            Evaluates statistical interaction: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">log2(MIC) = b0 + bA·A + bB·B + bAB·(A·B)</code>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#855300] bg-[#f2f3ff] hover:bg-[#eaedff] border border-[#dae2fd] rounded-lg transition-colors cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Upload CSV</span>
            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
          </label>
          <button
            onClick={handleRegenerate}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#121417] bg-[#f59e0b] hover:bg-[#d97706] rounded-lg transition-colors shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Regenerate Benchmark</span>
          </button>
        </div>
      </div>

      {/* Regression Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#e2e7ff] rounded-xl p-4 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#515f74]">Interaction Effect (bAB)</span>
          <p className="font-mono text-xl font-bold text-[#855300]">
            {stats.coefficients.bAB_interaction > 0 ? `+${stats.coefficients.bAB_interaction}` : stats.coefficients.bAB_interaction}
          </p>
          <span className="text-[11px] text-slate-400">Non-linear epistasis parameter</span>
        </div>

        <div className="bg-white border border-[#e2e7ff] rounded-xl p-4 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#515f74]">Bootstrap 95% CI</span>
          <p className="font-mono text-sm font-bold text-[#131b2e] mt-1">
            [{stats.bootstrap_ci_95[0]}, {stats.bootstrap_ci_95[1]}]
          </p>
          <span className="text-[11px] text-slate-400">500 bootstrap iterations</span>
        </div>

        <div className="bg-white border border-[#e2e7ff] rounded-xl p-4 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#515f74]">FDR Adjusted p-value (BH)</span>
          <p className="font-mono text-sm font-bold text-emerald-700 mt-1">
            {stats.p_value_fdr_bh < 0.001 ? '< 0.001' : stats.p_value_fdr_bh}
          </p>
          <span className="text-[11px] text-slate-400">Benjamini-Hochberg adjustment</span>
        </div>

        <div className="bg-white border border-[#e2e7ff] rounded-xl p-4 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#515f74]">Total Sample Size</span>
          <p className="font-mono text-xl font-bold text-[#131b2e]">{stats.sample_size}</p>
          <span className="text-[11px] text-slate-400">Isolates evaluated</span>
        </div>
      </div>

      {/* 2x2 Cell Matrix Verification */}
      <div className="bg-white border border-[#e2e7ff] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#eaedff]">
          <h4 className="text-xs font-bold text-[#131b2e] uppercase tracking-wider">
            2×2 Contingency Cell Counts (Minimum Threshold: ≥10 per cell)
          </h4>
          <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
            stats.valid_sample ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            {stats.valid_sample ? 'Cell Threshold Satisfied' : 'Threshold Violated'}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {Object.entries(stats.cell_counts).map(([cell, count]) => (
            <div key={cell} className="p-3 bg-[#faf8ff] border border-[#eaedff] rounded-xl text-center space-y-1">
              <span className="font-mono text-[#515f74] block text-[11px]">{cell}</span>
              <span className="font-mono text-lg font-bold text-[#131b2e] block">{count}</span>
              <span className="text-[10px] text-slate-400 block">{count >= 10 ? '✓ Valid' : '⚠️ <10'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
