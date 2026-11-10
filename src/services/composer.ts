/**
 * Assistant composer and guardrail validator for TB-MECH Voice.
 * Ported faithfully from backend/app/core/composer.py and i18n.py per plan.md Section 11.
 */

import { Analysis, Hypothesis } from './engine';
import { LIMITATIONS_VERBATIM } from '../data/kbData';

export interface Fact {
  fact_id: string;
  type: string;
  text: string;
  variant_id?: string;
  gene?: string;
  variant_short?: string;
  drug?: string;
  status: string;
  evidence_ids: string[];
}

export interface AssistantResponse {
  answer_text: string;
  language: string;
  source: 'evon_v3.3' | 'template' | 'mock';
  used_fact_ids: string[];
  evidence_ids: string[];
  guardrail: {
    passed: boolean;
    fallback: boolean;
  };
}

const FORBIDDEN_PHRASES = [
  'you should take',
  'recommended treatment',
  'diagnos',
  'prescribe'
];

const VARIANT_TOKEN_REGEX = /\b[A-Z]\d{1,4}[A-Z*]\b/g;

const INTENTS: [string, string[]][] = [
  ['limitations', ['limit', 'diagnos', 'सीमा', 'പരിമിതി', 'வரம்பு']],
  ['whatif', ['what if', 'without', 'remove', 'if absent', 'हटा दें', 'இல்லை என்றால்']],
  ['compensatory', ['compensat', 'fitness', 'क्षतिपूर्ति', 'भरपाई', 'പകരമാകുക', 'ஈடுசெய']],
  ['phenotype_check', ['phenotype', 'discord', 'mic', 'फेनोटाइप', 'പ്രത്യക്ഷലക്ഷണം', 'தோற்றவமைப்பு']],
  ['evidence_gaps', ['gap', 'unknown', 'missing', 'not known', 'अंतराल', 'अज्ञात', 'വിജ്ഞാന இடைவெளி', 'தெரியாத']],
  ['list_variants', ['list', 'which variants', 'what variants', 'वेरिएंट', 'വകഭേദങ്ങൾ', 'மாறுபாடுகள்']],
  ['explain', ['explain', 'why', 'evidence', 'mechanism', 'resist', 'साक्ष्य', 'प्रतिरोध', 'कारण', 'തെളിവ്', 'ஆதாரம்']]
];

export function detectIntent(question: string): string {
  const q = (question || '').toLowerCase();
  for (const [intent, keywords] of INTENTS) {
    if (keywords.some(k => q.includes(k.toLowerCase()))) {
      return intent;
    }
  }
  return 'unknown';
}

/**
 * Extracts a compact facts packet from the Analysis object
 */
export function buildFactsPacket(analysis: Analysis): Fact[] {
  const facts: Fact[] = [];
  let factIdx = 1;

  for (const h of analysis.hypotheses) {
    const fId = `F${factIdx++}`;
    facts.push({
      fact_id: fId,
      type: h.type,
      text: h.statement,
      variant_id: h.variant_id,
      gene: h.gene,
      variant_short: h.variant_short,
      drug: h.drug || undefined,
      status: h.status,
      evidence_ids: h.supporting_evidence.map(e => e.evidence_id)
    });
  }

  for (const g of analysis.evidence_gaps) {
    const fId = `F${factIdx++}`;
    facts.push({
      fact_id: fId,
      type: 'gap',
      text: g.statement,
      variant_id: g.variant_id,
      gene: g.gene,
      variant_short: g.variant_short,
      status: 'unknown',
      evidence_ids: []
    });
  }

  for (const d of analysis.discordances) {
    const fId = `F${factIdx++}`;
    facts.push({
      fact_id: fId,
      type: 'discordance',
      text: `${d.drug}: ${d.message}`,
      drug: d.drug,
      status: d.type,
      evidence_ids: []
    });
  }

  return facts;
}

/**
 * Formulates a template-based answer in the selected language (English, Hindi, Malayalam, Tamil)
 */
export function composeTemplateAnswer(
  intent: string,
  analysis: Analysis,
  facts: Fact[],
  languageCode: string
): { answer_text: string; used_fact_ids: string[]; evidence_ids: string[] } {
  const lang = languageCode.startsWith('hi') ? 'hi' : languageCode.startsWith('ml') ? 'ml' : languageCode.startsWith('ta') ? 'ta' : 'en';

  if (intent === 'limitations') {
    return {
      answer_text: LIMITATIONS_VERBATIM,
      used_fact_ids: [],
      evidence_ids: []
    };
  }

  if (intent === 'list_variants') {
    const names = analysis.variants.map(v => `${v.gene} ${v.short}`).join(', ');
    const kCount = analysis.variants.filter(v => v.in_kb).length;
    const uCount = analysis.unknown_variants.length;

    let ans = '';
    if (lang === 'hi') {
      ans = `इस विश्लेषण में कुल म्यूटेशन: ${names || 'कोई नहीं'}। ${kCount} के साक्ष्य मौजूद हैं और ${uCount} अज्ञात अंतराल हैं।`;
    } else if (lang === 'ml') {
      ans = `ഈ പരിശോധനയിലെ മ്യൂട്ടേഷനുകൾ: ${names || 'ഒന്നുമില്ല'}. ${kCount} എണ്ണത്തിന് തെളിവുകളുണ്ട്, ${uCount} എണ്ണം അജ്ഞാതമാണ്.`;
    } else if (lang === 'ta') {
      ans = `இந்த பகுப்பாய்வில் உள்ள மாறுபாடுகள்: ${names || 'எதுவுமில்லை'}. ${kCount} ஆதாரம் உள்ளன, ${uCount} தெரியவில்லை.`;
    } else {
      ans = `Variants in this analysis: ${names || 'none'}. ${kCount} have curated evidence and ${uCount} do not.`;
    }

    return {
      answer_text: ans,
      used_fact_ids: facts.filter(f => f.type === 'direct').map(f => f.fact_id),
      evidence_ids: []
    };
  }

  if (intent === 'compensatory') {
    const compHyp = analysis.hypotheses.find(h => h.type === 'compensatory');
    if (compHyp) {
      const fact = facts.find(f => f.type === 'compensatory');
      let ans = '';
      if (lang === 'hi') {
        ans = `म्यूटेशन ${compHyp.variant_short} प्राथमिक म्यूटेशन ${compHyp.target_variant_id} की फिटनेस क्षतिपूर्ति कर सकता है। साक्ष्य स्थिति: ${compHyp.status}। यह एक संबंध है, तंत्र का पूर्ण प्रमाण नहीं।`;
      } else if (lang === 'ml') {
        ans = `${compHyp.variant_short} എന്നത് ${compHyp.target_variant_id} ന്റെ ഫിറ്റ്നസ് ആഘാതം പരിഹരിച്ചേക്കാം. തെളിവ് നില: ${compHyp.status}. ഇത് ഒരു അനുമാനമാണ്, സ്ഥിരീകരണമല്ല.`;
      } else {
        ans = `${compHyp.statement} Evidence status: ${compHyp.status}. This is an association, not proof of mechanism.`;
      }

      return {
        answer_text: ans,
        used_fact_ids: fact ? [fact.fact_id] : [],
        evidence_ids: compHyp.supporting_evidence.map(e => e.evidence_id)
      };
    } else {
      let ans = 'No curated compensatory relationship applies to the variants in this analysis.';
      if (lang === 'hi') ans = 'इस विश्लेषण के वेरिएंट्स पर कोई ज्ञात क्षतिपूर्ति संबंध लागू नहीं होता।';
      return { answer_text: ans, used_fact_ids: [], evidence_ids: [] };
    }
  }

  if (intent === 'evidence_gaps') {
    if (analysis.unknown_variants.length > 0) {
      const gaps = analysis.unknown_variants.map(u => u.raw).join(', ');
      let ans = `Evidence gaps: ${gaps}. No curated evidence exists in this knowledge base.`;
      if (lang === 'hi') ans = `साक्ष्य अंतराल: ${gaps}। इस ज्ञानकोष में इनके लिए कोई प्रमाणित साक्ष्य नहीं है।`;
      return {
        answer_text: ans,
        used_fact_ids: facts.filter(f => f.type === 'gap').map(f => f.fact_id),
        evidence_ids: []
      };
    } else {
      let ans = 'All candidate variants in this isolate have curated evidence in the knowledge base.';
      if (lang === 'hi') ans = 'इस आइसोलेट के सभी उम्मीदवार वेरिएंट्स के साक्ष्य ज्ञानकोष में मौजूद हैं।';
      return { answer_text: ans, used_fact_ids: [], evidence_ids: [] };
    }
  }

  if (intent === 'phenotype_check') {
    if (analysis.discordances.length > 0) {
      const msg = analysis.discordances.map(d => `${d.drug.toUpperCase()}: ${d.message}`).join(' ');
      return {
        answer_text: msg,
        used_fact_ids: facts.filter(f => f.type === 'discordance').map(f => f.fact_id),
        evidence_ids: []
      };
    } else {
      return {
        answer_text: 'No phenotypic susceptibility test data was provided for discordance cross-checking.',
        used_fact_ids: [],
        evidence_ids: []
      };
    }
  }

  // Default: explain direct hypotheses
  const directHyps = analysis.hypotheses.filter(h => h.type === 'direct');
  if (directHyps.length > 0) {
    const parts = directHyps.map(h => {
      if (lang === 'hi') {
        return `${h.gene} ${h.variant_short} रिफैम्पिसिन/ड्रग प्रतिरोध से जुड़ा है। साक्ष्य स्थिति: ${h.status} (इंडेक्स ${h.evidence_index?.toFixed(2) || '0.00'})।`;
      }
      return `${h.gene} ${h.variant_short} is linked to ${h.drug} resistance. Evidence status: ${h.status} (ordinal index ${h.evidence_index?.toFixed(2) || '0.00'}).`;
    });

    const usedFacts = facts.filter(f => f.type === 'direct');
    return {
      answer_text: parts.join(' '),
      used_fact_ids: usedFacts.map(f => f.fact_id),
      evidence_ids: directHyps.flatMap(h => h.supporting_evidence.map(e => e.evidence_id))
    };
  }

  return {
    answer_text: 'No resistance mutations detected. The strain is classified as wild-type susceptible across evaluated target loci.',
    used_fact_ids: [],
    evidence_ids: []
  };
}

/**
 * Guardrail Validator per Section 11.4
 */
export function validateAnswer(
  candidateAnswer: string,
  usedFactIds: string[],
  facts: Fact[]
): { passed: boolean; reason?: string } {
  const lower = candidateAnswer.toLowerCase();

  // 1. Check forbidden phrases
  for (const phrase of FORBIDDEN_PHRASES) {
    if (lower.includes(phrase)) {
      return { passed: false, reason: `Forbidden phrase detected: "${phrase}"` };
    }
  }

  // 2. Check that all used_fact_ids exist in facts
  const validFactIds = new Set(facts.map(f => f.fact_id));
  for (const fId of usedFactIds) {
    if (!validFactIds.has(fId)) {
      return { passed: false, reason: `Invalid fact ID used: "${fId}"` };
    }
  }

  // 3. Extract variant tokens in text and verify they are present in facts
  const matchedTokens = candidateAnswer.match(VARIANT_TOKEN_REGEX) || [];
  const knownTokensInFacts = new Set<string>();
  for (const f of facts) {
    if (f.variant_short) knownTokensInFacts.add(f.variant_short.toUpperCase());
    const matches = f.text.match(VARIANT_TOKEN_REGEX) || [];
    matches.forEach(m => knownTokensInFacts.add(m.toUpperCase()));
  }

  for (const tok of matchedTokens) {
    if (!knownTokensInFacts.has(tok.toUpperCase())) {
      return { passed: false, reason: `Unverified variant token mentioned: "${tok}"` };
    }
  }

  return { passed: true };
}

/**
 * Answer composer orchestrator
 */
export function composeAnswer(
  analysis: Analysis,
  question: string,
  languageCode: string = 'en-IN',
  mockMode: boolean = false
): AssistantResponse {
  const intent = detectIntent(question);
  const facts = buildFactsPacket(analysis);

  // Template generation
  const templateResult = composeTemplateAnswer(intent, analysis, facts, languageCode);

  if (mockMode) {
    return {
      answer_text: templateResult.answer_text,
      language: languageCode,
      source: 'mock',
      used_fact_ids: templateResult.used_fact_ids,
      evidence_ids: templateResult.evidence_ids,
      guardrail: { passed: true, fallback: false }
    };
  }

  // Run guardrail validation on template
  const val = validateAnswer(templateResult.answer_text, templateResult.used_fact_ids, facts);

  if (!val.passed) {
    return {
      answer_text: LIMITATIONS_VERBATIM,
      language: languageCode,
      source: 'template',
      used_fact_ids: [],
      evidence_ids: [],
      guardrail: { passed: false, fallback: true }
    };
  }

  return {
    answer_text: templateResult.answer_text,
    language: languageCode,
    source: 'template',
    used_fact_ids: templateResult.used_fact_ids,
    evidence_ids: templateResult.evidence_ids,
    guardrail: { passed: true, fallback: false }
  };
}
