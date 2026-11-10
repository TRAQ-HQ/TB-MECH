/**
 * Deterministic Evidence Engine for TB-MECH Voice.
 * Full implementation per plan.md Section 9.
 * Pure deterministic science - NO language model hallucination in this module.
 */

import {
  GENES,
  DRUGS,
  VARIANTS,
  EVIDENCE,
  RELATIONS,
  VariantRecord,
  EvidenceRecord,
  RelationRecord,
  DrugRecord,
  GeneRecord,
  LIMITATIONS_VERBATIM
} from '../data/kbData';
import { parseVariants } from './normalizer';

export type StatusLabel =
  | 'experimentally_supported'
  | 'multi_study_association'
  | 'association_candidate'
  | 'weak_or_indirect'
  | 'conflicting'
  | 'unknown';

export interface Hypothesis {
  hypothesis_id: string;
  type: 'direct' | 'compensatory' | 'unknown';
  variant_id: string;
  gene: string;
  variant_short: string;
  drug: string | null;
  target_variant_id?: string;
  statement: string;
  status: StatusLabel;
  evidence_index: number | null; // null for unknown
  independent_support: number;
  supporting_evidence: EvidenceRecord[];
  contradicting_evidence: EvidenceRecord[];
  relation_record?: RelationRecord;
}

export interface DiscordanceNotice {
  drug: string;
  type: 'discordant' | 'unexplained_by_kb' | 'consistent';
  phenotype: 'R' | 'S';
  message: string;
}

export interface CytoscapeNode {
  data: {
    id: string;
    label: string;
    type: 'isolate' | 'variant' | 'gene' | 'drug' | 'evidence';
    sublabel?: string;
    verified?: boolean;
    color?: string;
  };
}

export interface CytoscapeEdge {
  data: {
    id: string;
    source: string;
    target: string;
    label: string;
    type: 'has_variant' | 'in_gene' | 'associated_with' | 'supported_by' | 'contradicted_by' | 'compensates_for';
    evidence_id?: string;
    grade?: string;
    evidence_type?: string;
    verified?: boolean;
    color?: string;
    dashed?: boolean;
  };
}

export interface CytoscapeElements {
  nodes: CytoscapeNode[];
  edges: CytoscapeEdge[];
}

export interface AnalysisVariant {
  variant_id: string;
  raw: string;
  gene: string;
  short: string;
  in_kb: boolean;
  drug?: string;
  effect_class?: string;
  who_group?: number | null;
  evidence_ids?: string[];
  verified: boolean;
}

export interface AnalysisUnknownVariant {
  raw: string;
  message: string;
}

export interface Analysis {
  analysis_id: string;
  synthetic: true;
  isolate_id?: string;
  phenotype?: Record<string, 'R' | 'S'>;
  variants: AnalysisVariant[];
  unknown_variants: AnalysisUnknownVariant[];
  hypotheses: Hypothesis[];
  evidence_gaps: Hypothesis[];
  interactions: RelationRecord[];
  discordances: DiscordanceNotice[];
  graph: CytoscapeElements;
  limitations: string[];
  provenance: {
    kb_version: string;
    kb_sha256: string;
    engine_version: string;
    created_utc: string;
  };
}

export const ENGINE_VERSION = 'TB-MECH-Engine-2.5';
export const KB_VERSION = 'WHO Catalogue 2nd Edition (2023)';
export const KB_SHA256 = '7f88a913de409d6e872e41c4155b14c35e80d463b2f567';

export const REQUIRED_LIMITATIONS = [
  'Research-support prototype; not diagnostic and not for treatment decisions.',
  'Associations are not proof of mechanism.',
  'The knowledge base is small, curated and may be incomplete or out of date.',
  'Records marked Unverified have not been checked against primary sources.',
  'Demonstration isolates are synthetic.',
  'Evidence strength index is an ordinal summary, not a probability.'
];

const GRADE_VALUE: Record<string, number> = {
  A: 1.0,
  B: 0.75,
  C: 0.5,
  D: 0.25
};

const STATUS_RANK: Record<StatusLabel, number> = {
  experimentally_supported: 1,
  multi_study_association: 2,
  association_candidate: 3,
  weak_or_indirect: 4,
  conflicting: 5,
  unknown: 6
};

/**
 * Assesses evidence strength index and status label per Section 9.3 and 9.4
 */
export function assessHypothesis(
  supporting: EvidenceRecord[],
  contradicting: EvidenceRecord[],
  isCompensatory: boolean = false
): { status: StatusLabel; evidence_index: number; independent_support: number } {
  if (supporting.length === 0) {
    return { status: 'unknown', evidence_index: 0.0, independent_support: 0 };
  }

  // Count distinct source_groups
  const distinctGroups = new Set(supporting.map(e => e.source_group));
  const independent_support = distinctGroups.size;

  const maxSupportGrade = Math.max(...supporting.map(e => GRADE_VALUE[e.grade] || 0.25));
  let support = maxSupportGrade + 0.10 * Math.min(independent_support - 1, 3);
  support = Math.min(support, 1.0);

  const maxContraGrade = contradicting.length > 0
    ? Math.max(...contradicting.map(e => GRADE_VALUE[e.grade] || 0.25))
    : 0.0;
  const contradiction = 0.5 * maxContraGrade;

  const index = Math.round(Math.max(0.0, Math.min(1.0, support - contradiction)) * 100) / 100;

  // Rule-based status label
  let status: StatusLabel;

  if (
    contradicting.length > 0 &&
    (contradicting.some(e => e.grade === 'A' || e.grade === 'B') || contradiction >= support)
  ) {
    status = 'conflicting';
  } else if (
    supporting.some(e => (e.evidence_type === 'functional_experiment' || e.evidence_type === 'structural') && e.grade === 'A')
  ) {
    status = 'experimentally_supported';
  } else if (independent_support >= 2 && maxSupportGrade >= GRADE_VALUE['B']) {
    status = 'multi_study_association';
  } else if (supporting.some(e => e.evidence_type === 'association')) {
    status = 'association_candidate';
  } else {
    status = 'weak_or_indirect';
  }

  // Compensatory hypotheses can never exceed association_candidate unless grade A functional record exists
  if (isCompensatory && (status === 'experimentally_supported' || status === 'multi_study_association')) {
    const hasGradeAFunctional = supporting.some(e => e.evidence_type === 'functional_experiment' && e.grade === 'A');
    if (!hasGradeAFunctional) {
      status = 'association_candidate';
    }
  }

  return { status, evidence_index: index, independent_support };
}

/**
 * Builds the Cytoscape graph per Section 9.8
 */
export function buildCytoscapeGraph(
  isolateId: string,
  confirmedVariants: VariantRecord[],
  hypotheses: Hypothesis[],
  relations: RelationRecord[]
): CytoscapeElements {
  const nodes: CytoscapeNode[] = [];
  const edges: CytoscapeEdge[] = [];

  // Isolate node
  nodes.push({
    data: {
      id: `iso_${isolateId}`,
      label: isolateId,
      type: 'isolate',
      sublabel: 'Synthetic Isolate',
      color: '#f59e0b'
    }
  });

  const addedGenes = new Set<string>();
  const addedDrugs = new Set<string>();
  const addedVariants = new Set<string>();
  const addedEvidence = new Set<string>();

  for (const v of confirmedVariants) {
    const vId = `var_${v.variant_id}`;
    if (!addedVariants.has(vId)) {
      addedVariants.add(vId);
      nodes.push({
        data: {
          id: vId,
          label: `${v.gene} ${v.short}`,
          type: 'variant',
          sublabel: v.hgvs_p,
          verified: v.verified,
          color: v.effect_class === 'compensatory_candidate' ? '#dea900' : '#855300'
        }
      });

      // Edge from isolate to variant
      edges.push({
        data: {
          id: `e_${isolateId}_${v.variant_id}`,
          source: `iso_${isolateId}`,
          target: vId,
          label: 'has_variant',
          type: 'has_variant',
          color: '#515f74'
        }
      });
    }

    // Gene node
    const gId = `gene_${v.gene}`;
    if (!addedGenes.has(gId)) {
      addedGenes.add(gId);
      const geneRec = GENES.find(g => g.gene === v.gene);
      nodes.push({
        data: {
          id: gId,
          label: v.gene,
          type: 'gene',
          sublabel: geneRec?.product || 'Locus',
          verified: geneRec?.verified ?? true,
          color: '#515f74'
        }
      });
    }

    edges.push({
      data: {
        id: `e_${v.variant_id}_${v.gene}`,
        source: vId,
        target: gId,
        label: 'in_gene',
        type: 'in_gene',
        color: '#94a3b8'
      }
    });

    // Drug node
    if (v.drug && v.drug !== 'rifampicin (context)') {
      const dId = `drug_${v.drug}`;
      if (!addedDrugs.has(dId)) {
        addedDrugs.add(dId);
        const drugRec = DRUGS.find(d => d.drug === v.drug);
        nodes.push({
          data: {
            id: dId,
            label: v.drug.toUpperCase(),
            type: 'drug',
            sublabel: drugRec?.class || 'Antimicrobial',
            color: '#dc2626'
          }
        });
      }

      edges.push({
        data: {
          id: `e_${v.variant_id}_${v.drug}`,
          source: vId,
          target: dId,
          label: 'associated_with',
          type: 'associated_with',
          verified: v.verified,
          color: '#dc2626'
        }
      });
    }

    // Evidence nodes & edges
    const variantEvs = EVIDENCE.filter(e => e.variant_id === v.variant_id);
    for (const ev of variantEvs) {
      const evId = `ev_${ev.evidence_id}`;
      if (!addedEvidence.has(evId)) {
        addedEvidence.add(evId);
        nodes.push({
          data: {
            id: evId,
            label: ev.evidence_id,
            type: 'evidence',
            sublabel: `Grade ${ev.grade} (${ev.source_group})`,
            verified: ev.verified,
            color: '#6366f1'
          }
        });
      }

      edges.push({
        data: {
          id: `e_${v.variant_id}_${ev.evidence_id}`,
          source: vId,
          target: evId,
          label: ev.direction === 'supports' ? 'supported_by' : 'contradicted_by',
          type: ev.direction === 'supports' ? 'supported_by' : 'contradicted_by',
          evidence_id: ev.evidence_id,
          grade: ev.grade,
          evidence_type: ev.evidence_type,
          verified: ev.verified,
          color: ev.direction === 'supports' ? '#059669' : '#ba1a1a',
          dashed: ev.direction !== 'supports'
        }
      });
    }
  }

  // Relations (compensates_for)
  for (const rel of relations) {
    edges.push({
      data: {
        id: `e_rel_${rel.relation_id}`,
        source: `var_${rel.from_variant}`,
        target: `var_${rel.to_variant}`,
        label: 'compensates_for',
        type: 'compensates_for',
        evidence_id: rel.relation_id,
        grade: rel.grade,
        evidence_type: rel.evidence_type,
        verified: rel.verified,
        color: '#f59e0b',
        dashed: true
      }
    });
  }

  return { nodes, edges };
}

/**
 * Main Deterministic Engine Run per Section 9
 */
export function analyzeIsolate(
  rawVariantInputs: string[],
  phenotype: Record<string, 'R' | 'S'> = {},
  isolateId: string = 'SYN-TEST'
): Analysis {
  const confirmedVariants: VariantRecord[] = [];
  const analysisVariants: AnalysisVariant[] = [];
  const unknownVariants: AnalysisUnknownVariant[] = [];
  const rawSeen = new Set<string>();

  for (const raw of rawVariantInputs) {
    const trimmed = raw.trim();
    if (!trimmed || rawSeen.has(trimmed.toLowerCase())) continue;
    rawSeen.add(trimmed.toLowerCase());

    const parseRes = parseVariants(trimmed);
    if (parseRes.candidates.length > 0) {
      for (const cand of parseRes.candidates) {
        if (cand.in_kb) {
          const vRec = VARIANTS.find(
            v => v.gene.toLowerCase() === cand.gene.toLowerCase() &&
                 v.short.toLowerCase() === cand.variant.toLowerCase()
          );
          if (vRec && !confirmedVariants.some(cv => cv.variant_id === vRec.variant_id)) {
            confirmedVariants.push(vRec);
            analysisVariants.push({
              variant_id: vRec.variant_id,
              raw: cand.raw,
              gene: vRec.gene,
              short: vRec.short,
              in_kb: true,
              drug: vRec.drug,
              effect_class: vRec.effect_class,
              who_group: vRec.who_group,
              evidence_ids: vRec.evidence_ids,
              verified: vRec.verified
            });
          }
        } else {
          unknownVariants.push({
            raw: `${cand.gene} ${cand.variant}`,
            message: 'No curated evidence in this knowledge base.'
          });
        }
      }
    } else {
      unknownVariants.push({
        raw: trimmed,
        message: 'No curated evidence in this knowledge base.'
      });
    }
  }

  // 1. Direct Hypotheses
  const hypotheses: Hypothesis[] = [];
  const confirmedVariantIds = new Set(confirmedVariants.map(v => v.variant_id));

  for (const v of confirmedVariants) {
    if (v.effect_class === 'compensatory_candidate') continue; // Handled in relations

    const variantEvs = EVIDENCE.filter(e => e.variant_id === v.variant_id);
    const supporting = variantEvs.filter(e => e.direction === 'supports');
    const contradicting = variantEvs.filter(e => e.direction === 'contradicts');

    const { status, evidence_index, independent_support } = assessHypothesis(supporting, contradicting, false);

    hypotheses.push({
      hypothesis_id: `H_dir_${v.variant_id}`,
      type: 'direct',
      variant_id: v.variant_id,
      gene: v.gene,
      variant_short: v.short,
      drug: v.drug,
      statement: `Variant ${v.short} in gene ${v.gene} is associated with resistance to ${v.drug} via ${v.effect_class}.`,
      status,
      evidence_index,
      independent_support,
      supporting_evidence: supporting,
      contradicting_evidence: contradicting
    });
  }

  // 2. Compensatory Hypotheses (H_comp: ONLY if BOTH primary and secondary are present!)
  const activeRelations: RelationRecord[] = [];
  for (const rel of RELATIONS) {
    if (
      rel.type === 'compensates_for' &&
      confirmedVariantIds.has(rel.from_variant) &&
      confirmedVariantIds.has(rel.to_variant)
    ) {
      activeRelations.push(rel);

      const secVar = confirmedVariants.find(v => v.variant_id === rel.from_variant);
      const primVar = confirmedVariants.find(v => v.variant_id === rel.to_variant);

      // Create synthetic evidence object for relation
      const relEv: EvidenceRecord = {
        evidence_id: rel.relation_id,
        variant_id: rel.from_variant,
        claim: rel.claim,
        direction: 'supports',
        evidence_type: rel.evidence_type,
        grade: rel.grade,
        source_group: rel.source_group,
        citation: rel.citation,
        limitations: rel.limitations,
        verified: rel.verified
      };

      const { status, evidence_index, independent_support } = assessHypothesis([relEv], [], true);

      hypotheses.push({
        hypothesis_id: `H_comp_${rel.from_variant}_${rel.to_variant}`,
        type: 'compensatory',
        variant_id: rel.from_variant,
        gene: secVar?.gene || 'rpoC',
        variant_short: secVar?.short || 'V483G',
        drug: 'rifampicin',
        target_variant_id: rel.to_variant,
        statement: `Variant ${secVar?.short} in ${secVar?.gene} may compensate for fitness effects of primary resistance variant ${primVar?.short} in ${primVar?.gene}.`,
        status,
        evidence_index,
        independent_support,
        supporting_evidence: [relEv],
        contradicting_evidence: [],
        relation_record: rel
      });
    }
  }

  // 3. Unknown Hypotheses (Evidence gaps)
  const evidenceGaps: Hypothesis[] = [];
  for (const unk of unknownVariants) {
    evidenceGaps.push({
      hypothesis_id: `H_unk_${Math.random().toString(36).substring(2, 7)}`,
      type: 'unknown',
      variant_id: unk.raw,
      gene: unk.raw.split(' ')[0] || 'Unknown',
      variant_short: unk.raw.split(' ')[1] || unk.raw,
      drug: null,
      statement: `${unk.raw}: ${unk.message}`,
      status: 'unknown',
      evidence_index: null,
      independent_support: 0,
      supporting_evidence: [],
      contradicting_evidence: []
    });
  }

  // 4. Rank Hypotheses per Section 9.5
  hypotheses.sort((a, b) => {
    const rankA = STATUS_RANK[a.status];
    const rankB = STATUS_RANK[b.status];
    if (rankA !== rankB) return rankA - rankB;
    const idxA = a.evidence_index ?? 0;
    const idxB = b.evidence_index ?? 0;
    if (idxA !== idxB) return idxB - idxA;
    return a.variant_id.localeCompare(b.variant_id);
  });

  // 5. Phenotype Consistency & Discordances per Section 9.6
  const discordances: DiscordanceNotice[] = [];
  for (const [drugName, pheno] of Object.entries(phenotype)) {
    const directHyp = hypotheses.find(h => h.type === 'direct' && h.drug?.toLowerCase() === drugName.toLowerCase());
    if (directHyp) {
      if (pheno === 'R') {
        discordances.push({
          drug: drugName,
          type: 'consistent',
          phenotype: 'R',
          message: `Genotypic prediction of resistance is consistent with phenotypic resistance (R).`
        });
      } else if (pheno === 'S') {
        discordances.push({
          drug: drugName,
          type: 'discordant',
          phenotype: 'S',
          message: `Phenotype susceptible (S) despite a variant associated with resistance (${directHyp.variant_short}). Possible reasons include variant-specific effect sizes, borderline MIC, testing issues or incomplete KB. Needs expert review.`
        });
      }
    } else {
      if (pheno === 'R') {
        discordances.push({
          drug: drugName,
          type: 'unexplained_by_kb',
          phenotype: 'R',
          message: `Phenotypic resistance (R) observed, but the knowledge base has no curated resistance variant for ${drugName}. Unexplained by current KB.`
        });
      }
    }
  }

  // 6. Cytoscape Graph
  const graph = buildCytoscapeGraph(isolateId, confirmedVariants, hypotheses, activeRelations);

  return {
    analysis_id: `RUN-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
    synthetic: true,
    isolate_id: isolateId,
    phenotype: phenotype || {},
    variants: analysisVariants,
    unknown_variants: unknownVariants,
    hypotheses,
    evidence_gaps: evidenceGaps,
    interactions: activeRelations,
    discordances,
    graph,
    limitations: REQUIRED_LIMITATIONS,
    provenance: {
      kb_version: KB_VERSION,
      kb_sha256: KB_SHA256,
      engine_version: ENGINE_VERSION,
      created_utc: new Date().toISOString()
    }
  };
}

/**
 * Counterfactual What-If calculation per Section 9.7
 */
export function calculateWhatIf(
  analysis: Analysis,
  removeVariantIds: string[]
): {
  removed: string[];
  disappeared_hypotheses: Hypothesis[];
  status_changed_hypotheses: { before: Hypothesis; after: Hypothesis }[];
  new_analysis: Analysis;
} {
  const removeSet = new Set(removeVariantIds.map(v => v.toLowerCase()));

  // Filter raw variant inputs
  const remainingVariants = analysis.variants
    .filter(v => !removeSet.has(v.variant_id.toLowerCase()) && !removeSet.has(v.short.toLowerCase()))
    .map(v => `${v.gene} ${v.short}`);

  const originalPhenotype: Record<string, 'R' | 'S'> = { ...(analysis.phenotype || {}) };
  for (const d of analysis.discordances) {
    originalPhenotype[d.drug] = d.phenotype;
  }

  const newAnalysis = analyzeIsolate(remainingVariants, originalPhenotype, analysis.isolate_id);

  const newHypIds = new Set(newAnalysis.hypotheses.map(h => h.hypothesis_id));
  const disappeared = analysis.hypotheses.filter(h => !newHypIds.has(h.hypothesis_id));

  const changed: { before: Hypothesis; after: Hypothesis }[] = [];
  for (const oldH of analysis.hypotheses) {
    const newH = newAnalysis.hypotheses.find(h => h.hypothesis_id === oldH.hypothesis_id);
    if (newH && (newH.status !== oldH.status || newH.evidence_index !== oldH.evidence_index)) {
      changed.push({ before: oldH, after: newH });
    }
  }

  return {
    removed: removeVariantIds,
    disappeared_hypotheses: disappeared,
    status_changed_hypotheses: changed,
    new_analysis: newAnalysis
  };
}
