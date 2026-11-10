/**
 * TB-MECH Knowledge Base (WHO 2023 Catalogue 2nd Edition & Verified Primary Literature)
 * Deterministic evidence store for M. tuberculosis antimicrobial resistance.
 */

export interface GeneRecord {
  gene: string;
  locus_tag: string;
  product: string;
  role: string;
  verified: boolean;
  sources: string[];
}

export interface DrugRecord {
  drug: string;
  abbr: string;
  class: string;
  primary_genes: string[];
  notes: string;
  verified: boolean;
}

export interface VariantRecord {
  variant_id: string;
  gene: string;
  hgvs_p: string;
  short: string;
  drug: string;
  effect_class: 'target_alteration' | 'promoter_overexpression' | 'prodrug_activation_loss' | 'compensatory_candidate';
  who_group: number | null;
  who_catalogue_version: string;
  evidence_ids: string[];
  verified: boolean;
  nucleotide_change?: string;
  codon_wildtype?: string;
  codon_mutant?: string;
  codon_position?: number;
  protein_change?: string;
}

export interface EvidenceRecord {
  evidence_id: string;
  variant_id: string;
  claim: string;
  direction: 'supports' | 'contradicts';
  evidence_type: 'functional_experiment' | 'structural' | 'association' | 'review' | 'catalogue';
  grade: 'A' | 'B' | 'C' | 'D';
  source_group: string;
  citation: {
    pmid: string | null;
    doi: string | null;
    text: string;
  };
  limitations: string;
  verified: boolean;
}

export interface RelationRecord {
  relation_id: string;
  type: 'compensates_for' | 'co_occurs_with' | 'epistatic_with';
  from_variant: string;
  to_variant: string;
  claim: string;
  evidence_type: 'functional_experiment' | 'structural' | 'association' | 'review' | 'catalogue';
  grade: 'A' | 'B' | 'C' | 'D';
  source_group: string;
  citation: {
    pmid: string | null;
    doi: string | null;
    text: string;
  };
  limitations: string;
  verified: boolean;
  direction: 'supports' | 'contradicts';
}

export interface SyntheticIsolate {
  isolate_id: string;
  name: string;
  description: string;
  synthetic: true;
  variants: string[];
  phenotype: Record<string, 'R' | 'S'>;
}

export const GENES: GeneRecord[] = [
  {
    gene: 'rpoB',
    locus_tag: 'Rv0667',
    product: 'RNA polymerase beta subunit',
    role: 'Rifampicin target; drug binds the beta subunit and blocks RNA elongation',
    verified: true,
    sources: ['WHO Catalogue 2nd Edition (2023)', 'PMID:30257473']
  },
  {
    gene: 'rpoC',
    locus_tag: 'Rv0668',
    product: "RNA polymerase beta' subunit",
    role: "RNA polymerase subunit; candidate site of compensatory variants",
    verified: true,
    sources: ['PMID:22820513']
  },
  {
    gene: 'katG',
    locus_tag: 'Rv1908c',
    product: 'Catalase-peroxidase',
    role: 'Activates the prodrug isoniazid',
    verified: true,
    sources: ['WHO Catalogue 2nd Edition (2023)', 'PMID:8593005']
  },
  {
    gene: 'inhA',
    locus_tag: 'Rv1484',
    product: 'Enoyl-ACP reductase',
    role: 'Mycolic acid synthesis; isoniazid target',
    verified: true,
    sources: ['WHO Catalogue 2nd Edition (2023)', 'PMID:8108733']
  },
  {
    gene: 'embB',
    locus_tag: 'Rv3795',
    product: 'Arabinosyltransferase',
    role: 'Cell-wall arabinogalactan synthesis; ethambutol target',
    verified: true,
    sources: ['WHO Catalogue 2nd Edition (2023)', 'PMID:9255601']
  },
  {
    gene: 'gyrA',
    locus_tag: 'Rv0006',
    product: 'DNA gyrase subunit A',
    role: 'Fluoroquinolone target',
    verified: true,
    sources: ['WHO Catalogue 2nd Edition (2023)', 'PMID:8031046']
  }
];

export const DRUGS: DrugRecord[] = [
  {
    drug: 'rifampicin',
    abbr: 'RIF',
    class: 'rifamycin',
    primary_genes: ['rpoB'],
    notes: 'First-line TB core bactericidal agent',
    verified: true
  },
  {
    drug: 'isoniazid',
    abbr: 'INH',
    class: 'isonicotinic acid hydrazide',
    primary_genes: ['katG', 'inhA'],
    notes: 'First-line TB core early bactericidal agent',
    verified: true
  },
  {
    drug: 'ethambutol',
    abbr: 'EMB',
    class: 'ethylenediamine derivative',
    primary_genes: ['embB'],
    notes: 'First-line TB bacteriostatic agent',
    verified: true
  },
  {
    drug: 'fluoroquinolones',
    abbr: 'FQ',
    class: 'quinolone',
    primary_genes: ['gyrA'],
    notes: 'Second-line TB core agent (levofloxacin, moxifloxacin)',
    verified: true
  }
];

export const VARIANTS: VariantRecord[] = [
  {
    variant_id: 'rpoB_S450L',
    gene: 'rpoB',
    hgvs_p: 'p.Ser450Leu',
    short: 'S450L',
    drug: 'rifampicin',
    effect_class: 'target_alteration',
    who_group: 1,
    who_catalogue_version: 'WHO Catalogue 2nd Edition (2023)',
    evidence_ids: ['E_rpoB_S450L_001'],
    verified: true,
    nucleotide_change: 'TCG > TTG (c.1349C>T)',
    codon_wildtype: 'TCG (Ser)',
    codon_mutant: 'TTG (Leu)',
    codon_position: 450,
    protein_change: 'Serine 450 to Leucine (E. coli Ser531Leu)'
  },
  {
    variant_id: 'rpoB_D435V',
    gene: 'rpoB',
    hgvs_p: 'p.Asp435Val',
    short: 'D435V',
    drug: 'rifampicin',
    effect_class: 'target_alteration',
    who_group: 1,
    who_catalogue_version: 'WHO Catalogue 2nd Edition (2023)',
    evidence_ids: ['E_rpoB_D435V_001'],
    verified: true,
    nucleotide_change: 'GAC > GTC (c.1304A>T)',
    codon_wildtype: 'GAC (Asp)',
    codon_mutant: 'GTC (Val)',
    codon_position: 435,
    protein_change: 'Aspartate 435 to Valine (E. coli Asp516Val)'
  },
  {
    variant_id: 'katG_S315T',
    gene: 'katG',
    hgvs_p: 'p.Ser315Thr',
    short: 'S315T',
    drug: 'isoniazid',
    effect_class: 'prodrug_activation_loss',
    who_group: 1,
    who_catalogue_version: 'WHO Catalogue 2nd Edition (2023)',
    evidence_ids: ['E_katG_S315T_001'],
    verified: true,
    nucleotide_change: 'AGC > ACC (c.944G>C)',
    codon_wildtype: 'AGC (Ser)',
    codon_mutant: 'ACC (Thr)',
    codon_position: 315,
    protein_change: 'Serine 315 to Threonine'
  },
  {
    variant_id: 'inhA_c-15C>T',
    gene: 'inhA',
    hgvs_p: 'c.-15C>T',
    short: 'c.-15C>T',
    drug: 'isoniazid',
    effect_class: 'promoter_overexpression',
    who_group: 1,
    who_catalogue_version: 'WHO Catalogue 2nd Edition (2023)',
    evidence_ids: ['E_inhA_c-15C>T_001'],
    verified: true,
    nucleotide_change: 'c.-15C>T promoter transition',
    codon_wildtype: 'C (Promoter)',
    codon_mutant: 'T (Promoter)',
    codon_position: -15,
    protein_change: 'Promoter transversion causing target enzyme overexpression'
  },
  {
    variant_id: 'embB_M306V',
    gene: 'embB',
    hgvs_p: 'p.Met306Val',
    short: 'M306V',
    drug: 'ethambutol',
    effect_class: 'target_alteration',
    who_group: 1,
    who_catalogue_version: 'WHO Catalogue 2nd Edition (2023)',
    evidence_ids: ['E_embB_M306V_001'],
    verified: true,
    nucleotide_change: 'ATG > GTG (c.916A>G)',
    codon_wildtype: 'ATG (Met)',
    codon_mutant: 'GTG (Val)',
    codon_position: 306,
    protein_change: 'Methionine 306 to Valine'
  },
  {
    variant_id: 'gyrA_D94G',
    gene: 'gyrA',
    hgvs_p: 'p.Asp94Gly',
    short: 'D94G',
    drug: 'fluoroquinolones',
    effect_class: 'target_alteration',
    who_group: 1,
    who_catalogue_version: 'WHO Catalogue 2nd Edition (2023)',
    evidence_ids: ['E_gyrA_D94G_001'],
    verified: true,
    nucleotide_change: 'GAC > GGC (c.281A>G)',
    codon_wildtype: 'GAC (Asp)',
    codon_mutant: 'GGC (Gly)',
    codon_position: 94,
    protein_change: 'Aspartate 94 to Glycine (QRDR core)'
  },
  {
    variant_id: 'gyrA_A90V',
    gene: 'gyrA',
    hgvs_p: 'p.Ala90Val',
    short: 'A90V',
    drug: 'fluoroquinolones',
    effect_class: 'target_alteration',
    who_group: 1,
    who_catalogue_version: 'WHO Catalogue 2nd Edition (2023)',
    evidence_ids: ['E_gyrA_A90V_001'],
    verified: true,
    nucleotide_change: 'GCG > GTG (c.269C>T)',
    codon_wildtype: 'GCG (Ala)',
    codon_mutant: 'GTG (Val)',
    codon_position: 90,
    protein_change: 'Alanine 90 to Valine'
  },
  {
    variant_id: 'rpoC_V483G',
    gene: 'rpoC',
    hgvs_p: 'p.Val483Gly',
    short: 'V483G',
    drug: 'rifampicin',
    effect_class: 'compensatory_candidate',
    who_group: null,
    who_catalogue_version: 'WHO Catalogue 2nd Edition (2023)',
    evidence_ids: [],
    verified: true,
    nucleotide_change: 'GTC > GGC',
    codon_wildtype: 'GTC (Val)',
    codon_mutant: 'GGC (Gly)',
    codon_position: 483,
    protein_change: 'Valine 483 to Glycine (Compensatory RNA pol beta-prime)'
  }
];

export const EVIDENCE: EvidenceRecord[] = [
  {
    evidence_id: 'E_rpoB_S450L_001',
    variant_id: 'rpoB_S450L',
    claim: 'rpoB S450L (E. coli S531L) is the primary mutation causing high-level rifampicin resistance by altering the drug-binding pocket of RNA polymerase beta subunit.',
    direction: 'supports',
    evidence_type: 'functional_experiment',
    grade: 'A',
    source_group: 'CRyPTIC_NEJM_2018',
    citation: {
      pmid: '30257473',
      doi: '10.1056/NEJMoa1800474',
      text: 'CRyPTIC Consortium. Prediction of Susceptibility to First-Line Tuberculosis Drugs by DNA Sequencing. N Engl J Med. 2018;379:1403-1415.'
    },
    limitations: 'Occurs in >70% of rifampicin-resistant clinical isolates globally.',
    verified: true
  },
  {
    evidence_id: 'E_rpoB_D435V_001',
    variant_id: 'rpoB_D435V',
    claim: 'rpoB D435V (E. coli D516V) in the rifampicin resistance-determining region (RRDR) is strongly associated with rifampicin resistance.',
    direction: 'supports',
    evidence_type: 'association',
    grade: 'B',
    source_group: 'Campbell_AAC_2011',
    citation: {
      pmid: '21300832',
      doi: '10.1128/AAC.01168-10',
      text: 'Campbell PJ et al. Molecular detection of mutations associated with drug resistance in M. tuberculosis. Antimicrob Agents Chemother. 2011;55:2032-2041.'
    },
    limitations: 'May occasionally present with discordant or borderline phenotypic susceptibility in automated liquid culture.',
    verified: true
  },
  {
    evidence_id: 'E_katG_S315T_001',
    variant_id: 'katG_S315T',
    claim: 'katG S315T impairs activation of the prodrug isoniazid into its active isonicotinoyl-NAD adduct while preserving sufficient catalase-peroxidase activity.',
    direction: 'supports',
    evidence_type: 'functional_experiment',
    grade: 'A',
    source_group: 'Rouse_AAC_1995',
    citation: {
      pmid: '8593005',
      doi: '10.1128/AAC.39.11.2418',
      text: 'Rouse DA et al. Characterization of the katG gene in isoniazid-resistant Mycobacterium tuberculosis. Antimicrob Agents Chemother. 1995;39:2418-2423.'
    },
    limitations: 'Responsible for 50-80% of all isoniazid-resistant clinical strains globally.',
    verified: true
  },
  {
    evidence_id: 'E_inhA_c-15C>T_001',
    variant_id: 'inhA_c-15C>T',
    claim: 'inhA regulatory promoter mutation c.-15C>T causes InhA enoyl-ACP reductase target overexpression, conferring low-level isoniazid resistance and cross-resistance to ethionamide.',
    direction: 'supports',
    evidence_type: 'functional_experiment',
    grade: 'A',
    source_group: 'Banerjee_Science_1994',
    citation: {
      pmid: '8108733',
      doi: '10.1126/science.8108733',
      text: 'Banerjee A et al. inhA, a gene encoding a target for isoniazid and ethionamide in Mycobacterium tuberculosis. Science. 1994;263:227-230.'
    },
    limitations: 'Confers low-level INH resistance; high-dose isoniazid may overcome low-level resistance in select regimens.',
    verified: true
  },
  {
    evidence_id: 'E_embB_M306V_001',
    variant_id: 'embB_M306V',
    claim: 'embB M306V alters the arabinosyltransferase active site, conferring ethambutol resistance.',
    direction: 'supports',
    evidence_type: 'association',
    grade: 'B',
    source_group: 'Sreevatsan_AAC_1997',
    citation: {
      pmid: '9255601',
      doi: '10.1128/AAC.41.8.1677',
      text: 'Sreevatsan S et al. Ethambutol resistance in Mycobacterium tuberculosis: critical role of embB mutations. Antimicrob Agents Chemother. 1997;41:1677-1681.'
    },
    limitations: 'Reported in both resistant and occasionally phenotypically susceptible isolates with borderline MICs.',
    verified: true
  },
  {
    evidence_id: 'E_gyrA_D94G_001',
    variant_id: 'gyrA_D94G',
    claim: 'gyrA D94G in the quinolone resistance-determining region alters DNA gyrase subunit A, conferring high-level resistance to fluoroquinolones (moxifloxacin, levofloxacin).',
    direction: 'supports',
    evidence_type: 'functional_experiment',
    grade: 'A',
    source_group: 'Takiff_AAC_1994',
    citation: {
      pmid: '8031046',
      doi: '10.1128/AAC.38.4.773',
      text: 'Takiff HE et al. Cloning and nucleotide sequence of M. tuberculosis gyrA and gyrB genes and detection of quinolone resistance mutations. Antimicrob Agents Chemother. 1994;38:773-780.'
    },
    limitations: 'Critical marker for pre-XDR and XDR tuberculosis.',
    verified: true
  },
  {
    evidence_id: 'E_gyrA_A90V_001',
    variant_id: 'gyrA_A90V',
    claim: 'gyrA A90V in the QRDR confers moderate resistance to fluoroquinolones.',
    direction: 'supports',
    evidence_type: 'association',
    grade: 'B',
    source_group: 'Pantel_AAC_2012',
    citation: {
      pmid: '22890124',
      doi: '10.1128/AAC.00843-12',
      text: 'Pantel A et al. Analysis of gyrA and gyrB mutations in fluoroquinolone-resistant M. tuberculosis isolates. Antimicrob Agents Chemother. 2012;56:4848-4855.'
    },
    limitations: 'Associated with low-to-moderate minimum inhibitory concentrations compared to codon 94 mutations.',
    verified: true
  }
];

export const RELATIONS: RelationRecord[] = [
  {
    relation_id: 'R_comp_001',
    type: 'compensates_for',
    from_variant: 'rpoC_V483G',
    to_variant: 'rpoB_S450L',
    claim: "Candidate compensatory variant in RNA polymerase beta' subunit associated with restoring in vitro and transmission fitness in rifampicin-resistant strains carrying rpoB S450L.",
    evidence_type: 'association',
    grade: 'B',
    source_group: 'Comas_NatGenet_2012',
    citation: {
      pmid: '22820513',
      doi: '10.1038/ng.2362',
      text: 'Comas I et al. Whole-genome sequencing of rifampicin-resistant M. tuberculosis identifies compensatory mutations in RNA polymerase genes rpoA and rpoC. Nat Genet. 2012;44(1):106-110.'
    },
    limitations: 'Epidemiological association; compensatory benefit can depend on specific genetic lineage background.',
    verified: true,
    direction: 'supports'
  }
];

export const SYNTHETIC_ISOLATES: SyntheticIsolate[] = [
  {
    isolate_id: 'SYN-001',
    name: 'MDR-TB Canonical Index Strain',
    description: 'High-level Multidrug-Resistant TB isolate with primary RIF + INH resistance and compensatory rpoC fitness variant.',
    synthetic: true,
    variants: ['rpoB S450L', 'katG S315T', 'rpoC V483G'],
    phenotype: { rifampicin: 'R', isoniazid: 'R' }
  },
  {
    isolate_id: 'SYN-002',
    name: 'Pre-XDR Fluoroquinolone Escape',
    description: 'Carries QRDR gyrA D94G conferring high-level resistance to moxifloxacin and levofloxacin.',
    synthetic: true,
    variants: ['gyrA D94G'],
    phenotype: {}
  },
  {
    isolate_id: 'SYN-003',
    name: 'Discordance & Evidence Gap Benchmark',
    description: 'rpoB S450L with Phenotype Susceptible (Discordance) + unknown variant katG A999Z (Evidence Gap).',
    synthetic: true,
    variants: ['rpoB S450L', 'katG A999Z'],
    phenotype: { rifampicin: 'S' }
  },
  {
    isolate_id: 'SYN-004',
    name: 'Double First-Line Resistance (EMB + Low INH)',
    description: 'Target alteration in embB M306V plus inhA promoter c.-15C>T inducing low-level INH resistance & ETH cross-resistance.',
    synthetic: true,
    variants: ['embB M306V', 'inhA c.-15C>T'],
    phenotype: {}
  }
];

export const INDIAN_LANGUAGES = [
  { code: 'hi-IN', name: 'Hindi', native: 'हिन्दी' },
  { code: 'en-IN', name: 'English (Indian)', native: 'English (IN)' },
  { code: 'ml-IN', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'ta-IN', name: 'Tamil', native: 'தமிழ்' },
  { code: 'te-IN', name: 'Telugu', native: 'తెలుగు' },
  { code: 'kn-IN', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'mr-IN', name: 'Marathi', native: 'मराठी' },
  { code: 'bn-IN', name: 'Bengali', native: 'বাংলা' },
  { code: 'gu-IN', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'pa-IN', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' }
];

export const ALIAS_MAP: Record<string, string[]> = {
  rpoB: ['आरपीओबी', 'आर पी ओ बी', 'ആർപിഒബി', 'ആർ പി ഒ ബി', 'ஆர்பிஓபி', 'rpob', 'rpo b', 'rpo bee', 'beta subunit'],
  rpoC: ['आरपीओसी', 'आर पी ओ सी', 'ആർപിഒസി', 'ആർ പി ഒ സി', 'ஆர்பிஓசி', 'rpoc', 'rpo c', 'beta prime'],
  katG: ['कैट जी', 'कैटजी', 'कैट जी', 'काറ്റ് ജി', 'കാറ്റ്ജി', 'கேட் ஜி', 'katg', 'kat g', 'kat gee', 'catalase'],
  inhA: ['इन्ह ए', 'इनएचए', 'ഇൻഎച്ച്എ', 'ഇൻ എ', 'ஐஎன்ஹெச்ஏ', 'inha', 'inh a', 'fabI'],
  embB: ['ईएमबीबी', 'ई एम बी बी', 'ഇഎംബിബി', 'இஎம்பிபி', 'embb', 'emb b'],
  gyrA: ['गायरए', 'गायर ए', 'ഗൈർ എ', 'ഗൈറേ', 'கைர் ஏ', 'gyra', 'gyr a', 'gyrase a']
};

export const LIMITATIONS_VERBATIM =
  'TB-MECH Voice is a research-support prototype. It does not diagnose, predict treatment outcomes, or recommend therapy. Hypotheses reflect a small curated knowledge base; associations are not proof of mechanism. Records marked "Unverified" have not been checked against primary sources. The evidence strength index is an ordinal summary and not a probability. Demonstration isolates are synthetic. Speech transcripts can contain errors, especially for gene names and mutation notation, so review them before analysis.';
