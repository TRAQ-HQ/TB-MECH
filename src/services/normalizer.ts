/**
 * Spoken and typed mutation normaliser for TB-MECH Voice.
 * Ported faithfully from backend/app/core/normalizer.py per plan.md Section 8.
 * Enhanced for robust clinical speech transcription, multilingual phonetics,
 * multi-gene boundary segmentation, and Indic numeral normalization.
 */

import { VARIANTS, ALIAS_MAP } from '../data/kbData';

export interface CandidateVariant {
  raw: string;
  gene: string;
  variant: string;
  confidence: 'high' | 'medium' | 'low';
  in_kb: boolean;
}

export interface ParseResult {
  candidates: CandidateVariant[];
  unparsed_fragments: string[];
}

const AA_SET = new Set('ACDEFGHIKLMNPQRSTVWY');

const THREE_AA: Record<string, string> = {
  ala: 'A', arg: 'R', asn: 'N', asp: 'D', cys: 'C', gln: 'Q', glu: 'E',
  gly: 'G', his: 'H', ile: 'I', leu: 'L', lys: 'K', met: 'M', phe: 'F',
  pro: 'P', ser: 'S', thr: 'T', trp: 'W', tyr: 'Y', val: 'V'
};

const FULL_AA: Record<string, string> = {
  alanine: 'A', arginine: 'R', asparagine: 'N', aspartate: 'D', 'aspartic acid': 'D',
  cysteine: 'C', glutamine: 'Q', glutamate: 'E', 'glutamic acid': 'E', glycine: 'G',
  histidine: 'H', isoleucine: 'I', leucine: 'L', lysine: 'K', methionine: 'M',
  phenylalanine: 'F', proline: 'P', serine: 'S', threonine: 'T', tryptophan: 'W',
  tyrosine: 'Y', valine: 'V'
};

const EN_LETTER_NAMES: Record<string, string> = {
  ay: 'A', bee: 'B', see: 'C', dee: 'D', ee: 'E', eff: 'F', gee: 'G',
  aitch: 'H', eye: 'I', jay: 'J', kay: 'K', el: 'L', em: 'M', en: 'N',
  oh: 'O', pee: 'P', cue: 'Q', ar: 'R', ess: 'S', es: 'S', tee: 'T',
  you: 'U', vee: 'V', ex: 'X', why: 'Y', zed: 'Z'
};

const HI_LETTER_NAMES: Record<string, string> = {
  ए: 'A', बी: 'B', सी: 'C', डी: 'D', ई: 'E', एफ: 'F', जी: 'G',
  एच: 'H', आई: 'I', जे: 'J', के: 'K', एल: 'L', एम: 'M', एन: 'N',
  ओ: 'O', पी: 'P', क्यू: 'Q', आर: 'R', एस: 'S', टी: 'T', यू: 'U',
  वी: 'V', डब्ल्यू: 'W', एक्स: 'X', वाई: 'Y', जेड: 'Z'
};

const ML_LETTER_NAMES: Record<string, string> = {
  ആർ: 'R', പി: 'P', ഒ: 'O', ബി: 'B', സി: 'C', ഡി: 'D',
  ഇ: 'E', എഫ്: 'F', ജി: 'G', എച്ച്: 'H', ഐ: 'I', ജെ: 'J',
  കെ: 'K', എൽ: 'L', എം: 'M', എൻ: 'N', ക്യു: 'Q', എസ്: 'S',
  ടി: 'T', യു: 'U', വി: 'V', ഡബ്ല്യു: 'W', എക്സ്: 'X', വൈ: 'Y', സെഡ്: 'Z'
};

const TA_LETTER_NAMES: Record<string, string> = {
  ஏ: 'A', பி: 'B', சி: 'C', டி: 'D', இ: 'E', எப்: 'F', ஜி: 'G',
  ஹெச்: 'H', ஐ: 'I', ஜே: 'J', கே: 'K', எல்: 'L', எம்: 'M', என்: 'N',
  ஓ: 'O', ஆர்: 'R', எஸ்: 'S', டீ: 'T', யு: 'U', வி: 'V'
};

const SINGLE_LETTERS: Record<string, string> = {};
for (const char of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
  SINGLE_LETTERS[char.toLowerCase()] = char;
}

const LETTER_MAP: Record<string, string> = {
  ...SINGLE_LETTERS,
  ...EN_LETTER_NAMES,
  ...HI_LETTER_NAMES,
  ...ML_LETTER_NAMES,
  ...TA_LETTER_NAMES
};

// Map Devanagari, Malayalam, and Tamil numerals to ASCII digits
const INDIC_NUMERALS: Record<string, string> = {
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4', '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
  '൦': '0', '൧': '1', '൨': '2', '൩': '3', '൪': '4', '൫': '5', '൬': '6', '൭': '7', '൮': '8', '൯': '9',
  '௦': '0', '௧': '1', '௨': '2', '௩': '3', '௪': '4', '௫': '5', '௬': '6', '௭': '7', '௮': '8', '௯': '9'
};

const NUMBER_COMBOS: Record<string, string> = {
  'four fifty': '450',
  'four five zero': '450',
  'four hundred fifty': '450',
  'चार सौ पचास': '450',
  'चार पचास': '450',
  'three fifteen': '315',
  'three one five': '315',
  'three hundred fifteen': '315',
  'तीन सौ पंद्रह': '315',
  'तीन पंद्रह': '315',
  'three zero six': '306',
  'three hundred six': '306',
  'तीन सौ छह': '306',
  'ninety four': '94',
  'nine four': '94',
  'चौरानवे': '94',
  'ninety': '90',
  'nine zero': '90',
  'नब्बे': '90',
  'four eighty three': '483',
  'four eight three': '483',
  'four hundred eighty three': '483',
  'चार सौ तिरासी': '483',
  'four thirty five': '435',
  'four three five': '435',
  'four hundred thirty five': '435',
  'चार सौ पैंतीस': '435',
  'four forty five': '445',
  'four four five': '445',
  'four hundred forty five': '445',
  'चार सौ पैंतालीस': '445'
};

function normShort(gene: string, short: string): string {
  return `${gene.toLowerCase()}_${short.replace(/\s+/g, '')}`;
}

/**
 * Pre-processes spoken strings to normalize numerals, letter pauses, and connectors
 */
function cleanSpokenSpeech(text: string): string {
  let cleaned = text;

  // 1. Convert Indic numerals to ASCII 0-9
  cleaned = cleaned.replace(/[०-९൦-൯௦-௯]/g, d => INDIC_NUMERALS[d] || d);

  // 2. Pre-normalize spoken number combos
  for (const [combo, digitStr] of Object.entries(NUMBER_COMBOS)) {
    cleaned = cleaned.replace(new RegExp(combo, 'gi'), digitStr);
  }

  // 3. Spoken minus / promoter phrasing: "minus 15" -> "-15"
  cleaned = cleaned.replace(/\bminus\s*(\d+)/gi, '-$1');

  // 4. Clean trailing punctuation from STT word tokens (e.g. "s. 450 l." -> "s 450 l")
  cleaned = cleaned.replace(/\b([A-Za-z])\./g, '$1 ');

  return cleaned;
}

export function parseVariants(text: string): ParseResult {
  if (!text || !text.trim()) {
    return { candidates: [], unparsed_fragments: [] };
  }

  const workingText = cleanSpokenSpeech(text.trim());

  // Split on primary speech connectors (supporting ASCII word boundaries and Indic words)
  const connectorRegex = /(?:\b(?:and|aur)\b|(?:\s+|^)(?:और|मற்றும்|ഉം)(?:\s+|$)|[,;&+\n])/gi;
  const initialSegments = workingText.split(connectorRegex).map(s => s.trim()).filter(Boolean);

  const candidates: CandidateVariant[] = [];
  const unparsed_fragments: string[] = [];

  for (const segment of initialSegments) {
    const segmentCandidates = extractCandidatesFromSegment(segment);
    if (segmentCandidates.length > 0) {
      candidates.push(...segmentCandidates);
    } else {
      unparsed_fragments.push(segment);
    }
  }

  // Deduplicate candidates by gene + variant
  const seen = new Set<string>();
  const uniqueCandidates: CandidateVariant[] = [];
  for (const c of candidates) {
    const key = `${c.gene.toLowerCase()}::${c.variant.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueCandidates.push(c);
    }
  }

  return { candidates: uniqueCandidates, unparsed_fragments };
}

/**
 * Handles segments that may contain single or multiple gene-variant pairs,
 * even without explicit connectors (e.g. "rpoB S450L katG S315T rpoC V483G")
 */
function extractCandidatesFromSegment(segment: string): CandidateVariant[] {
  const clean = segment.replace(/[,;]/g, ' ').trim();
  const lower = clean.toLowerCase();

  // Find all gene mentions in this segment with their start indices
  interface GeneMatch {
    gene: string;
    aliasMatched: string;
    startIndex: number;
    endIndex: number;
  }

  const geneMatches: GeneMatch[] = [];

  for (const [gene, aliases] of Object.entries(ALIAS_MAP)) {
    const allNames = [gene.toLowerCase(), ...aliases.map(a => a.toLowerCase())];
    for (const name of allNames) {
      // Find all occurrences of this name in lower
      let pos = 0;
      while ((pos = lower.indexOf(name, pos)) !== -1) {
        // Ensure word-like boundary for short names
        const prevChar = pos > 0 ? lower[pos - 1] : ' ';
        const nextChar = pos + name.length < lower.length ? lower[pos + name.length] : ' ';
        const isPrevBoundary = /[\s,;.!?'"(\[\{]/.test(prevChar) || pos === 0;
        const isNextBoundary = /[\s,;.!?'")\]\}]/.test(nextChar) || pos + name.length === lower.length;

        if (isPrevBoundary && isNextBoundary) {
          geneMatches.push({
            gene,
            aliasMatched: name,
            startIndex: pos,
            endIndex: pos + name.length
          });
        }
        pos += name.length;
      }
    }
  }

  // Sort by start index
  geneMatches.sort((a, b) => a.startIndex - b.startIndex);

  // Filter overlapping gene matches (keep the longest alias)
  const filteredGenes: GeneMatch[] = [];
  for (const gm of geneMatches) {
    const overlaps = filteredGenes.find(
      existing => (gm.startIndex >= existing.startIndex && gm.startIndex < existing.endIndex) ||
                  (gm.endIndex > existing.startIndex && gm.endIndex <= existing.endIndex)
    );
    if (!overlaps) {
      filteredGenes.push(gm);
    }
  }

  // If multiple distinct genes are present in one segment without connectors:
  // Split the segment at the gene boundaries and parse each sub-segment!
  if (filteredGenes.length > 1) {
    const subCandidates: CandidateVariant[] = [];
    for (let i = 0; i < filteredGenes.length; i++) {
      const currentGene = filteredGenes[i];
      const start = currentGene.startIndex;
      const end = i < filteredGenes.length - 1 ? filteredGenes[i + 1].startIndex : clean.length;
      const subSlice = clean.substring(start, end).trim();
      const parsed = parseSingleGeneSubSegment(subSlice, currentGene.gene);
      if (parsed) {
        subCandidates.push(...parsed);
      }
    }
    if (subCandidates.length > 0) {
      return subCandidates;
    }
  }

  // If 1 gene or 0 genes found in this segment
  const singleGene = filteredGenes.length === 1 ? filteredGenes[0].gene : null;
  const parsed = parseSingleGeneSubSegment(clean, singleGene);
  return parsed || [];
}

/**
 * Extracts one or more variants from a text block with a known or inferred gene
 */
function parseSingleGeneSubSegment(textBlock: string, assignedGene: string | null): CandidateVariant[] | null {
  const clean = textBlock.replace(/[,;]/g, ' ').trim();
  let gene = assignedGene;

  // 1. If gene not yet known, try finding it in the textBlock
  if (!gene) {
    const lower = clean.toLowerCase();
    for (const [g, aliases] of Object.entries(ALIAS_MAP)) {
      const allNames = [g.toLowerCase(), ...aliases.map(a => a.toLowerCase())];
      for (const name of allNames) {
        if (lower.includes(name)) {
          gene = g;
          break;
        }
      }
      if (gene) break;
    }
  }

  const variantsFound: { code: string; confidence: 'high' | 'medium' | 'low' }[] = [];

  // Match 1-letter amino acid notations: S450L, S 450 L, A999Z, V483G, etc.
  const aa1Regex = /\b([A-Za-z])\s*(\d{1,4})\s*([A-Za-z*])\b/g;
  let m1: RegExpExecArray | null;
  while ((m1 = aa1Regex.exec(clean)) !== null) {
    const code = `${m1[1].toUpperCase()}${m1[2]}${m1[3].toUpperCase()}`;
    // Don't match gene abbreviations as mutations (e.g. if someone has "rpoB")
    if (!['RPOB', 'RPOC', 'KATG', 'INHA', 'EMBB', 'GYRA'].includes(code)) {
      variantsFound.push({ code, confidence: 'high' });
    }
  }

  // Match 3-letter amino acid notations: Ser450Leu, p.Ser450Leu
  if (variantsFound.length === 0) {
    const aa3Regex = /(?:p\.)?([A-Za-z]{3})\s*(\d{1,4})\s*([A-Za-z]{3})/gi;
    let m3: RegExpExecArray | null;
    while ((m3 = aa3Regex.exec(clean)) !== null) {
      const a1 = THREE_AA[m3[1].toLowerCase()];
      const a2 = THREE_AA[m3[3].toLowerCase()];
      if (a1 && a2) {
        variantsFound.push({ code: `${a1}${m3[2]}${a2}`, confidence: 'high' });
      }
    }
  }

  // Match full amino acid names: e.g. "serine 450 leucine", "threonine 315 serine"
  if (variantsFound.length === 0) {
    const fullAaNames = Object.keys(FULL_AA).join('|');
    const fullAaRegex = new RegExp(`(?:${fullAaNames})\\s*(\\d{1,4})\\s*(?:${fullAaNames})`, 'gi');
    let mFull: RegExpExecArray | null;
    while ((mFull = fullAaRegex.exec(clean)) !== null) {
      const words = mFull[0].toLowerCase().split(/\s+/);
      const a1 = FULL_AA[words[0]];
      const pos = mFull[1];
      const a2 = FULL_AA[words[words.length - 1]];
      if (a1 && a2 && pos) {
        variantsFound.push({ code: `${a1}${pos}${a2}`, confidence: 'high' });
      }
    }
  }

  // Match promoter notation: c.-15C>T, -15C>T, -15 C to T, c.-15c>t, c -15 C to T
  if (variantsFound.length === 0) {
    const promRegex = /(?:c\.)?(-?\d+)\s*([A-Za-z])\s*(?:>|to)\s*([A-Za-z])/gi;
    let mProm: RegExpExecArray | null;
    while ((mProm = promRegex.exec(clean)) !== null) {
      const code = `c.${mProm[1]}${mProm[2].toUpperCase()}>${mProm[3].toUpperCase()}`;
      variantsFound.push({ code, confidence: 'high' });
    }
  }

  // Match Spoken Tokens: e.g. "es 450 el", "एस 450 एल", "एस ३१५ टी" (already normalized to ASCII 315)
  if (variantsFound.length === 0) {
    const tokens = clean.split(/\s+/);
    for (let i = 0; i < tokens.length - 2; i++) {
      const l1 = LETTER_MAP[tokens[i].toLowerCase()] || LETTER_MAP[tokens[i]];
      const posStr = tokens[i + 1];
      const l2 = LETTER_MAP[tokens[i + 2].toLowerCase()] || LETTER_MAP[tokens[i + 2]];

      if (l1 && l2 && /^\d{1,4}$/.test(posStr) && AA_SET.has(l1) && AA_SET.has(l2)) {
        variantsFound.push({ code: `${l1}${posStr}${l2}`, confidence: 'medium' });
        break;
      }
    }
  }

  if (variantsFound.length === 0) {
    return null;
  }

  const results: CandidateVariant[] = [];

  for (const vf of variantsFound) {
    let finalGene = gene;
    // If no gene was identified, check if known variant code matches a unique gene in KB
    if (!finalGene) {
      const foundInKb = VARIANTS.filter(v => v.short.toLowerCase() === vf.code.toLowerCase());
      if (foundInKb.length === 1) {
        finalGene = foundInKb[0].gene;
      }
    }

    if (!finalGene) continue;

    const canonicalId = normShort(finalGene, vf.code);
    const inKb = VARIANTS.some(v => v.variant_id.toLowerCase() === canonicalId.toLowerCase());

    results.push({
      raw: textBlock,
      gene: finalGene,
      variant: vf.code,
      confidence: vf.confidence,
      in_kb: inKb
    });
  }

  return results.length > 0 ? results : null;
}
