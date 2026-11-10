/**
 * Test runner implementing plan.md Section 15.1 Unit Tests
 */

import { GENES, DRUGS, VARIANTS, EVIDENCE, RELATIONS, SYNTHETIC_ISOLATES } from '../data/kbData';
import { parseVariants } from '../services/normalizer';
import { analyzeIsolate, calculateWhatIf, assessHypothesis } from '../services/engine';
import { composeAnswer, validateAnswer, buildFactsPacket } from '../services/composer';
import { runInteractionRegression, generateSyntheticStatsData } from '../services/statsDemo';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${msg}`);
    failed++;
  }
}

console.log('\n--- 1. Testing Knowledge Base (test_kb) ---');
assert(GENES.length >= 6, 'Loaded all primary genes (rpoB, rpoC, katG, inhA, embB, gyrA)');
assert(DRUGS.length >= 4, 'Loaded all primary drugs (rifampicin, isoniazid, ethambutol, fluoroquinolones)');
assert(VARIANTS.length >= 8, 'Loaded all primary variants');
assert(EVIDENCE.length >= 7, 'Loaded all primary evidence records');
assert(RELATIONS.length >= 1, 'Loaded compensatory relation R_comp_001');
assert(
  VARIANTS.every(v => v.evidence_ids.length > 0 || v.effect_class === 'compensatory_candidate'),
  'Every resistance variant has at least one evidence record'
);
assert(
  EVIDENCE.every(e => Boolean(e.citation && (e.citation.pmid || e.citation.text))),
  'All evidence records carry verifiable literature citations'
);

console.log('\n--- 2. Testing Normalizer (test_normalizer per Section 8.3) ---');
// Case 1
const c1 = parseVariants('rpoB S450L and katG S315T');
assert(c1.candidates.length === 2, 'Parsed 2 candidates from standard English text');
assert(c1.candidates[0].gene === 'rpoB' && c1.candidates[0].variant === 'S450L', 'Identified rpoB S450L');
assert(c1.candidates[1].gene === 'katG' && c1.candidates[1].variant === 'S315T', 'Identified katG S315T');
assert(c1.candidates[0].confidence === 'high', 'High confidence for direct regex match');

// Case 2
const c2 = parseVariants('rpoB es four fifty el');
assert(c2.candidates.length >= 1, 'Parsed spoken letter-names: rpoB es four fifty el');
assert(c2.candidates[0]?.variant === 'S450L', 'Correctly mapped to S450L');

// Case 3 (Hindi / Devanagari)
const c3 = parseVariants('आरपीओबी एस 450 एल और कैट जी एस 315 टी');
assert(c3.candidates.length === 2, 'Parsed Hindi spoken string into 2 candidates');
assert(c3.candidates.some(c => c.gene === 'rpoB' && c.variant === 'S450L'), 'Identified rpoB S450L from Hindi');
assert(c3.candidates.some(c => c.gene === 'katG' && c.variant === 'S315T'), 'Identified katG S315T from Hindi');

// Case 3b (Space-separated multi-gene dictation without and/aur)
const c3b = parseVariants('rpoB S450L katG S315T rpoC V483G');
assert(c3b.candidates.length === 3, 'Parsed 3 candidates from continuous speech without connectors');
assert(c3b.candidates.some(c => c.gene === 'rpoB' && c.variant === 'S450L'), 'Extracted rpoB S450L');
assert(c3b.candidates.some(c => c.gene === 'katG' && c.variant === 'S315T'), 'Extracted katG S315T');
assert(c3b.candidates.some(c => c.gene === 'rpoC' && c.variant === 'V483G'), 'Extracted rpoC V483G');

// Case 3c (Devanagari numerals without aur)
const c3c = parseVariants('कैट जी एस ३१५ टी आरपीओबी एस ४५० एल');
assert(c3c.candidates.length === 2, 'Parsed Hindi Devanagari numerals without aur');
assert(c3c.candidates.some(c => c.gene === 'katG' && c.variant === 'S315T'), 'Extracted katG S315T with Devanagari numerals');
assert(c3c.candidates.some(c => c.gene === 'rpoB' && c.variant === 'S450L'), 'Extracted rpoB S450L with Devanagari numerals');

// Case 4 (Unknown variant)
const c4 = parseVariants('katG A999Z');
assert(c4.candidates.length === 1 && c4.candidates[0].in_kb === false, 'Unknown variant katG A999Z marked in_kb: false');

// Case 5 (Garbage text)
const c5 = parseVariants('some random unrelated background speech without biology');
assert(c5.candidates.length === 0, 'Garbage text produces zero candidates');
assert(c5.unparsed_fragments.length > 0, 'Garbage text returned as unparsed fragments');

console.log('\n--- 3. Testing Engine & Hypotheses (test_engine per Section 15.1) ---');
// SYN-001 test
const syn1 = analyzeIsolate(['rpoB S450L', 'katG S315T', 'rpoC V483G'], { rifampicin: 'R', isoniazid: 'R' }, 'SYN-001');
const syn1RpoB = syn1.hypotheses.find(h => h.variant_id === 'rpoB_S450L');
const syn1KatG = syn1.hypotheses.find(h => h.variant_id === 'katG_S315T');
const syn1Comp = syn1.hypotheses.find(h => h.type === 'compensatory');

assert(Boolean(syn1RpoB), 'SYN-001 yields H_direct for rpoB S450L');
assert(Boolean(syn1KatG), 'SYN-001 yields H_direct for katG S315T');
assert(Boolean(syn1Comp), 'SYN-001 yields H_comp for rpoC V483G compensating rpoB S450L');
assert(
  syn1Comp?.status === 'association_candidate',
  'Compensatory hypothesis status is capped at association_candidate (co-occurrence != compensation)'
);
assert(
  syn1.hypotheses.every(h => h.evidence_index === null || (h.evidence_index >= 0 && h.evidence_index <= 1)),
  'Evidence strength indices are bounded in [0, 1]'
);

// rpoC V483G alone test
const alone = analyzeIsolate(['rpoC V483G'], {}, 'SYN-TEST');
const aloneComp = alone.hypotheses.find(h => h.type === 'compensatory');
assert(!aloneComp, 'rpoC V483G ALONE produces no H_comp hypothesis');

// SYN-003 discordance and unknown test
const syn3 = analyzeIsolate(['rpoB S450L', 'katG A999Z'], { rifampicin: 'S' }, 'SYN-003');
const discord = syn3.discordances.find(d => d.drug === 'rifampicin');
assert(discord?.type === 'discordant', 'SYN-003 yields discordant rifampicin notice');
assert(syn3.unknown_variants.some(u => u.raw.includes('A999Z')), 'SYN-003 reports katG A999Z as an unknown gap');

// What-If test
const whatIf = calculateWhatIf(syn1, ['rpoB_S450L']);
assert(
  whatIf.disappeared_hypotheses.some(h => h.variant_id === 'rpoB_S450L'),
  'What-if removing rpoB S450L removes its H_direct'
);
assert(
  whatIf.disappeared_hypotheses.some(h => h.type === 'compensatory'),
  'What-if removing rpoB S450L also removes dependent H_comp'
);

console.log('\n--- 4. Testing Composer & Guardrails (test_composer per Section 11.4) ---');
const facts = buildFactsPacket(syn1);
// Good answer
const goodVal = validateAnswer('Variant S450L in gene rpoB is linked to rifampicin resistance.', ['F1'], facts);
assert(goodVal.passed, 'Faithful answer passes guardrail validation');

// Forbidden phrase check
const badVal1 = validateAnswer('You should take rifampicin to treat this infection.', ['F1'], facts);
assert(!badVal1.passed, 'Answer with forbidden phrase "you should take" fails guardrails');

// Fabricated variant check
const badVal2 = validateAnswer('Variant K123Z causes complete resistance.', ['F1'], facts);
assert(!badVal2.passed, 'Answer inventing ungrounded variant K123Z fails guardrails');

console.log('\n--- 5. Testing Statistical Interaction (test_stats_demo per Section 14) ---');
const statsData = generateSyntheticStatsData(25);
const statsRes = runInteractionRegression(statsData);
assert(statsRes.valid_sample, 'Synthetic stats dataset has >= 10 isolates per cell');
assert(typeof statsRes.coefficients.bAB_interaction === 'number', 'Calculated non-linear interaction effect bAB');
assert(statsRes.bootstrap_ci_95.length === 2, 'Computed 95% bootstrap confidence interval');

console.log(`\n========================================`);
console.log(`Tests Completed: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) process.exit(1);
