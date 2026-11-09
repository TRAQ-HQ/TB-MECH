import asyncio
import json

from app.core import composer, engine
from app.core.kb import load_kb
from app.core.normalizer import parse_text

kb = load_kb()
A = engine.analyze(kb, parse_text("rpoB S450L katG S315T rpoC V483G katG A999V", kb)["candidates"])
FACTS = composer.build_facts(A, "explain")


def check(answer, used=("F1",)):
    return composer.validate_llm_output(json.dumps({"answer": answer, "used_fact_ids": list(used)}), FACTS, kb)


def test_faithful_answer_passes():
    assert check("rpoB S450L is an association candidate for rifampicin resistance.")


def test_invented_variant_rejected():
    assert check("rpoB D999E is linked to rifampicin resistance.") is None


def test_invented_evidence_id_rejected():
    assert check("See E_rpoB_S450L_999 for details.") is None


def test_forbidden_phrase_rejected():
    assert check("The recommended treatment is to switch drugs.") is None


def test_unknown_fact_id_rejected():
    assert check("rpoB S450L is an association candidate.", used=("F99",)) is None


def test_invented_percentage_rejected():
    assert check("rpoB S450L is 95% likely to cause resistance.") is None


def test_malformed_json_rejected():
    assert composer.validate_llm_output("not json", FACTS, kb) is None


def test_intents():
    assert composer.detect_intent("Any compensatory variants?") == "compensatory"
    assert composer.detect_intent("what are the evidence gaps") == "evidence_gaps"
    assert composer.detect_intent("blah") == "unknown"


def test_template_answers_en_and_hi_keep_latin_tokens():
    en = asyncio.run(composer.compose(A, "explain the evidence", "en-IN", kb))
    hi = asyncio.run(composer.compose(A, "explain the evidence", "hi-IN", kb))
    assert en["source"] == hi["source"] == "template"
    assert "rpoB S450L" in en["answer_text"] and "rpoB S450L" in hi["answer_text"]
    assert "katG A999V" in en["answer_text"]  # gap reported, not explained
