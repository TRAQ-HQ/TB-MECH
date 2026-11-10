import React, { useState, useRef, useMemo } from 'react';
import { GENES, DRUGS, VARIANTS, EVIDENCE, RELATIONS } from '../data/kbData';
import { ZoomIn, ZoomOut, RotateCcw, Filter, ExternalLink, ShieldAlert, Sparkles, BookOpen } from 'lucide-react';

interface GraphNode {
  id: string;
  label: string;
  sublabel?: string;
  type: 'gene' | 'variant' | 'mechanism' | 'drug';
  x: number;
  y: number;
  color: string;
  stroke: string;
  meta?: any;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  type: 'harbors' | 'mechanism' | 'resistance' | 'compensatory';
  color: string;
  dashed?: boolean;
}

export const KnowledgeGraph: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [activeDrugFilter, setActiveDrugFilter] = useState<string>('all');
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Initial nodes layout (columns: Genes, Variants, Mechanisms, Drugs)
  const baseNodes: GraphNode[] = useMemo(() => {
    const nodes: GraphNode[] = [];

    // 1. Genes (x: 100)
    const genesList = ['rpoB', 'rpoC', 'katG', 'inhA', 'embB', 'gyrA'];
    genesList.forEach((g, idx) => {
      const gRec = GENES.find(item => item.gene === g);
      nodes.push({
        id: `gene_${g}`,
        label: g,
        sublabel: gRec?.locus_tag || 'Locus',
        type: 'gene',
        x: 120,
        y: 80 + idx * 85,
        color: '#f2f3ff',
        stroke: '#515f74',
        meta: gRec
      });
    });

    // 2. Variants (x: 360)
    VARIANTS.forEach((v, idx) => {
      const isComp = v.effect_class === 'compensatory_candidate';
      nodes.push({
        id: `var_${v.variant_id}`,
        label: v.short,
        sublabel: v.gene,
        type: 'variant',
        x: 370,
        y: 60 + idx * 65,
        color: isComp ? '#fef3c7' : '#ffffff',
        stroke: isComp ? '#f59e0b' : '#855300',
        meta: v
      });
    });

    // 3. Mechanisms (x: 640)
    const mechanisms = [
      { id: 'mech_rrdr', label: 'RNA Pol Binding Pocket Distortion', drug: 'rifampicin', desc: 'Steric blockage preventing RNA elongation past 2-3 nt.' },
      { id: 'mech_prodrug', label: 'Catalase Prodrug Activation Failure', drug: 'isoniazid', desc: 'Disables KatG conversion of INH to isonicotinoyl radical.' },
      { id: 'mech_overexp', label: 'InhA Target Overexpression', drug: 'isoniazid', desc: 'Elevates enoyl-ACP reductase titration threshold; cross-resistant to ETH.' },
      { id: 'mech_arabino', label: 'Arabinogalactan Synthesis Arrest', drug: 'ethambutol', desc: 'Disrupts EmbB arabinosyltransferase cell-wall synthesis.' },
      { id: 'mech_topoiso', label: 'DNA Gyrase QRDR Pocket Distortion', drug: 'fluoroquinolones', desc: 'Disrupts water-metal ion bridge binding of moxifloxacin/levofloxacin.' },
      { id: 'mech_fitness', label: 'RNA Pol Fitness Compensation', drug: 'rifampicin', desc: "Compensates catalytic elongation velocity of beta' subunit." }
    ];

    mechanisms.forEach((m, idx) => {
      nodes.push({
        id: m.id,
        label: m.label,
        sublabel: 'Biochemical Mechanism',
        type: 'mechanism',
        x: 650,
        y: 80 + idx * 85,
        color: '#f8fafc',
        stroke: '#785a00',
        meta: m
      });
    });

    // 4. Drugs (x: 930)
    DRUGS.forEach((d, idx) => {
      nodes.push({
        id: `drug_${d.drug}`,
        label: d.drug.toUpperCase(),
        sublabel: d.class,
        type: 'drug',
        x: 940,
        y: 100 + idx * 115,
        color: '#fffbeb',
        stroke: '#f59e0b',
        meta: d
      });
    });

    return nodes;
  }, []);

  // Edges connecting Genes -> Variants -> Mechanisms -> Drugs
  const baseEdges: GraphEdge[] = useMemo(() => {
    return [
      // Gene -> Variant
      { id: 'e1', source: 'gene_rpoB', target: 'var_rpoB_S450L', label: 'harbors', type: 'harbors', color: '#94a3b8' },
      { id: 'e2', source: 'gene_rpoB', target: 'var_rpoB_D435V', label: 'harbors', type: 'harbors', color: '#94a3b8' },
      { id: 'e3', source: 'gene_katG', target: 'var_katG_S315T', label: 'harbors', type: 'harbors', color: '#94a3b8' },
      { id: 'e4', source: 'gene_inhA', target: 'var_inhA_c-15C>T', label: 'harbors', type: 'harbors', color: '#94a3b8' },
      { id: 'e5', source: 'gene_embB', target: 'var_embB_M306V', label: 'harbors', type: 'harbors', color: '#94a3b8' },
      { id: 'e6', source: 'gene_gyrA', target: 'var_gyrA_D94G', label: 'harbors', type: 'harbors', color: '#94a3b8' },
      { id: 'e7', source: 'gene_gyrA', target: 'var_gyrA_A90V', label: 'harbors', type: 'harbors', color: '#94a3b8' },
      { id: 'e8', source: 'gene_rpoC', target: 'var_rpoC_V483G', label: 'harbors', type: 'harbors', color: '#94a3b8' },

      // Compensatory Variant -> Variant
      { id: 'e_comp', source: 'var_rpoC_V483G', target: 'var_rpoB_S450L', label: 'compensates for', type: 'compensatory', color: '#f59e0b', dashed: true },

      // Variant -> Mechanism
      { id: 'e9', source: 'var_rpoB_S450L', target: 'mech_rrdr', label: 'induces', type: 'mechanism', color: '#cbd5e1' },
      { id: 'e10', source: 'var_rpoB_D435V', target: 'mech_rrdr', label: 'induces', type: 'mechanism', color: '#cbd5e1' },
      { id: 'e11', source: 'var_katG_S315T', target: 'mech_prodrug', label: 'induces', type: 'mechanism', color: '#cbd5e1' },
      { id: 'e12', source: 'var_inhA_c-15C>T', target: 'mech_overexp', label: 'induces', type: 'mechanism', color: '#cbd5e1' },
      { id: 'e13', source: 'var_embB_M306V', target: 'mech_arabino', label: 'induces', type: 'mechanism', color: '#cbd5e1' },
      { id: 'e14', source: 'var_gyrA_D94G', target: 'mech_topoiso', label: 'induces', type: 'mechanism', color: '#cbd5e1' },
      { id: 'e15', source: 'var_gyrA_A90V', target: 'mech_topoiso', label: 'induces', type: 'mechanism', color: '#cbd5e1' },
      { id: 'e16', source: 'var_rpoC_V483G', target: 'mech_fitness', label: 'induces', type: 'mechanism', color: '#f59e0b' },

      // Mechanism -> Drug
      { id: 'e17', source: 'mech_rrdr', target: 'drug_rifampicin', label: 'confers resistance', type: 'resistance', color: '#dc2626' },
      { id: 'e18', source: 'mech_prodrug', target: 'drug_isoniazid', label: 'confers resistance', type: 'resistance', color: '#dc2626' },
      { id: 'e19', source: 'mech_overexp', target: 'drug_isoniazid', label: 'confers resistance', type: 'resistance', color: '#d97706' },
      { id: 'e20', source: 'mech_arabino', target: 'drug_ethambutol', label: 'confers resistance', type: 'resistance', color: '#d97706' },
      { id: 'e21', source: 'mech_topoiso', target: 'drug_fluoroquinolones', label: 'confers resistance', type: 'resistance', color: '#dc2626' }
    ];
  }, []);

  // Filter nodes & edges based on active drug filter
  const { filteredNodes, filteredEdges } = useMemo(() => {
    if (activeDrugFilter === 'all') {
      return { filteredNodes: baseNodes, filteredEdges: baseEdges };
    }

    // Match nodes connected to the selected drug
    const drugId = `drug_${activeDrugFilter}`;
    const connectedNodeIds = new Set<string>([drugId]);

    // Find mechanisms connected to drug
    baseEdges.forEach(e => {
      if (e.target === drugId) connectedNodeIds.add(e.source);
    });

    // Find variants connected to those mechanisms
    baseEdges.forEach(e => {
      if (connectedNodeIds.has(e.target)) connectedNodeIds.add(e.source);
    });

    // Find genes connected to those variants
    baseEdges.forEach(e => {
      if (connectedNodeIds.has(e.target)) connectedNodeIds.add(e.source);
    });

    // Include compensatory nodes if rifampicin
    if (activeDrugFilter === 'rifampicin') {
      connectedNodeIds.add('var_rpoC_V483G');
      connectedNodeIds.add('gene_rpoC');
      connectedNodeIds.add('mech_fitness');
    }

    const fNodes = baseNodes.filter(n => connectedNodeIds.has(n.id));
    const fEdges = baseEdges.filter(e => connectedNodeIds.has(e.source) && connectedNodeIds.has(e.target));

    return { filteredNodes: fNodes, filteredEdges: fEdges };
  }, [baseNodes, baseEdges, activeDrugFilter]);

  // Pan & Zoom handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white border border-[#e2e7ff] rounded-xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#855300]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#515f74]">Filter by Target Drug</span>
          </div>
          <div className="flex items-center gap-1.5 p-1 bg-[#f2f3ff] rounded-lg">
            {['all', 'rifampicin', 'isoniazid', 'ethambutol', 'fluoroquinolones'].map(d => (
              <button
                key={d}
                onClick={() => setActiveDrugFilter(d)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap capitalize ${
                  activeDrugFilter === d
                    ? 'bg-white text-[#855300] shadow-xs'
                    : 'text-[#515f74] hover:text-[#131b2e]'
                }`}
              >
                {d === 'all' ? 'All Drugs' : d}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(z => Math.min(z + 0.15, 2.0))}
            className="p-2 text-xs font-medium text-[#515f74] bg-[#f2f3ff] hover:bg-[#eaedff] rounded-lg transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(z => Math.max(z - 0.15, 0.5))}
            className="p-2 text-xs font-medium text-[#515f74] bg-[#f2f3ff] hover:bg-[#eaedff] rounded-lg transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#515f74] bg-[#f2f3ff] hover:bg-[#eaedff] rounded-lg transition-colors"
            title="Reset Pan & Zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset View</span>
          </button>
        </div>
      </div>

      {/* Main Canvas + Inspector Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Interactive SVG Graph Stage */}
        <div
          className="lg:col-span-3 bg-white border border-[#e2e7ff] rounded-2xl overflow-hidden relative shadow-xs select-none cursor-grab active:cursor-grabbing"
          style={{ height: '600px' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Subtle Bacillary Watermark Geometry */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03] overflow-hidden">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 100 Q150 70 250 110 T450 120" stroke="#f59e0b" strokeWidth="24" strokeLinecap="round" fill="none" />
              <path d="M400 350 Q500 320 600 360 T800 370" stroke="#f59e0b" strokeWidth="28" strokeLinecap="round" fill="none" />
              <path d="M200 480 Q320 440 440 490" stroke="#855300" strokeWidth="20" strokeLinecap="round" fill="none" />
            </svg>
          </div>

          {/* Graph Legend Overlay */}
          <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-3 p-2.5 bg-white/90 backdrop-blur-xs border border-[#e2e7ff] rounded-xl text-xs text-[#515f74] shadow-xs pointer-events-none">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-[#f2f3ff] border border-[#515f74]" />
              <span>Target Genes</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-white border border-[#855300]" />
              <span>Mutations</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-[#f8fafc] border border-[#785a00]" />
              <span>Mechanisms</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-[#fffbeb] border border-[#f59e0b]" />
              <span>Antimicrobials</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-0.5 border-t-2 border-dashed border-[#f59e0b]" />
              <span>Compensatory</span>
            </div>
          </div>

          {/* SVG Canvas */}
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 1100 620"
            className="w-full h-full"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '50% 50%',
              transition: isDragging ? 'none' : 'transform 0.15s ease-out'
            }}
          >
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="18" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#94a3b8" />
              </marker>
              <marker id="arrow-res" viewBox="0 0 10 10" refX="18" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#dc2626" />
              </marker>
              <marker id="arrow-comp" viewBox="0 0 10 10" refX="18" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b" />
              </marker>
            </defs>

            {/* Edges */}
            {filteredEdges.map(edge => {
              const srcNode = filteredNodes.find(n => n.id === edge.source);
              const tgtNode = filteredNodes.find(n => n.id === edge.target);
              if (!srcNode || !tgtNode) return null;

              const isComp = edge.type === 'compensatory';
              const isRes = edge.type === 'resistance';

              return (
                <g key={edge.id}>
                  <line
                    x1={srcNode.x}
                    y1={srcNode.y}
                    x2={tgtNode.x}
                    y2={tgtNode.y}
                    stroke={edge.color}
                    strokeWidth={isComp ? 2.5 : 1.5}
                    strokeDasharray={edge.dashed ? '6,4' : undefined}
                    markerEnd={isComp ? 'url(#arrow-comp)' : isRes ? 'url(#arrow-res)' : 'url(#arrow)'}
                    className="transition-colors"
                  />
                  {isComp && (
                    <text
                      x={(srcNode.x + tgtNode.x) / 2}
                      y={(srcNode.y + tgtNode.y) / 2 - 8}
                      fill="#855300"
                      fontSize="10"
                      fontFamily="var(--font-sans)"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      restores fitness
                    </text>
                  )}
                </g>
              );
            })}

            {/* Nodes */}
            {filteredNodes.map(node => {
              const isSelected = selectedNode?.id === node.id;
              const isGene = node.type === 'gene';
              const isVar = node.type === 'variant';
              const isMech = node.type === 'mechanism';
              const isDrug = node.type === 'drug';

              const width = isMech ? 190 : isDrug ? 120 : isVar ? 100 : 90;
              const height = isMech ? 48 : 42;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x - width / 2}, ${node.y - height / 2})`}
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedNode(node);
                  }}
                  className="cursor-pointer group"
                >
                  {/* Glowing selection aura */}
                  {isSelected && (
                    <rect
                      x={-4}
                      y={-4}
                      width={width + 8}
                      height={height + 8}
                      rx={14}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="3"
                      className="animate-pulse"
                    />
                  )}

                  {/* Main Node Card */}
                  <rect
                    x={0}
                    y={0}
                    width={width}
                    height={height}
                    rx={10}
                    fill={node.color}
                    stroke={isSelected ? '#855300' : node.stroke}
                    strokeWidth={isSelected ? 2 : 1.25}
                    className="transition-all duration-200 group-hover:stroke-[#855300] drop-shadow-xs"
                  />

                  {/* Node Text */}
                  <text
                    x={width / 2}
                    y={isMech ? 20 : 18}
                    textAnchor="middle"
                    fill="#131b2e"
                    fontSize={isMech ? '11' : isDrug ? '12' : '13'}
                    fontWeight="700"
                    fontFamily={isVar || isGene ? 'var(--font-mono)' : 'var(--font-sans)'}
                  >
                    {node.label}
                  </text>

                  {node.sublabel && (
                    <text
                      x={width / 2}
                      y={isMech ? 34 : 31}
                      textAnchor="middle"
                      fill="#515f74"
                      fontSize="9.5"
                      fontFamily="var(--font-sans)"
                      fontWeight="500"
                    >
                      {node.sublabel}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Node Inspector Drawer */}
        <div className="bg-white border border-[#e2e7ff] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#eaedff]">
            <BookOpen className="w-4 h-4 text-[#855300]" />
            <h3 className="text-sm font-bold text-[#131b2e] tracking-tight">Entity Evidence Inspector</h3>
          </div>

          {selectedNode ? (
            <div className="space-y-4 text-xs">
              <div>
                <span className="uppercase text-[10px] font-bold tracking-wider text-[#515f74]">Type</span>
                <p className="text-sm font-bold text-[#131b2e] capitalize">{selectedNode.type}</p>
              </div>

              <div>
                <span className="uppercase text-[10px] font-bold tracking-wider text-[#515f74]">Identifier</span>
                <p className="font-mono font-semibold text-sm text-[#855300]">{selectedNode.label}</p>
              </div>

              {selectedNode.type === 'variant' && selectedNode.meta && (
                <>
                  <div>
                    <span className="uppercase text-[10px] font-bold tracking-wider text-[#515f74]">HGVS Nomenclature</span>
                    <p className="font-mono text-xs bg-[#f2f3ff] p-2 rounded-lg text-[#131b2e]">
                      {selectedNode.meta.hgvs_p} ({selectedNode.meta.nucleotide_change})
                    </p>
                  </div>

                  <div>
                    <span className="uppercase text-[10px] font-bold tracking-wider text-[#515f74]">WHO Catalogue Status</span>
                    <p className="font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                      {selectedNode.meta.who_group ? `Group ${selectedNode.meta.who_group} (Associated with Resistance)` : 'Compensatory Restorer'}
                    </p>
                  </div>

                  <div>
                    <span className="uppercase text-[10px] font-bold tracking-wider text-[#515f74]">Primary Evidence</span>
                    {EVIDENCE.filter(e => e.variant_id === selectedNode.meta.variant_id).map(ev => (
                      <div key={ev.evidence_id} className="mt-1 p-2.5 bg-[#f8fafc] border border-slate-200 rounded-lg space-y-1">
                        <p className="text-slate-700">{ev.claim}</p>
                        <div className="flex items-center gap-2 pt-1 text-[11px] text-[#855300]">
                          <span className="font-mono font-bold">PMID: {ev.citation.pmid}</span>
                          <span>·</span>
                          <span className="font-semibold">Grade {ev.grade}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {selectedNode.type === 'gene' && selectedNode.meta && (
                <>
                  <div>
                    <span className="uppercase text-[10px] font-bold tracking-wider text-[#515f74]">Gene Product</span>
                    <p className="text-slate-800 font-medium">{selectedNode.meta.product}</p>
                  </div>
                  <div>
                    <span className="uppercase text-[10px] font-bold tracking-wider text-[#515f74]">Biological Function</span>
                    <p className="text-slate-600 leading-relaxed">{selectedNode.meta.role}</p>
                  </div>
                </>
              )}

              {selectedNode.type === 'drug' && selectedNode.meta && (
                <>
                  <div>
                    <span className="uppercase text-[10px] font-bold tracking-wider text-[#515f74]">Pharmacologic Class</span>
                    <p className="text-slate-800 font-medium">{selectedNode.meta.class}</p>
                  </div>
                  <div>
                    <span className="uppercase text-[10px] font-bold tracking-wider text-[#515f74]">Clinical Role</span>
                    <p className="text-slate-600 leading-relaxed">{selectedNode.meta.notes}</p>
                  </div>
                </>
              )}

              {selectedNode.type === 'mechanism' && selectedNode.meta && (
                <div>
                  <span className="uppercase text-[10px] font-bold tracking-wider text-[#515f74]">Biochemical Mechanism</span>
                  <p className="text-slate-700 leading-relaxed mt-1">{selectedNode.meta.desc}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-[#515f74] space-y-2">
              <Sparkles className="w-8 h-8 mx-auto text-[#f59e0b] opacity-60" />
              <p className="text-xs">Click any Gene, Variant, Mechanism, or Drug node to inspect full evidence, citations, and WHO 2023 classification.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
