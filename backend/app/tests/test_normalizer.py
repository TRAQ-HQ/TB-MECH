from app.core import normalizer
from app.core.kb import load_kb

kb = load_kb()


def got(text):
    return [(c["gene"], c["variant"], c["confidence"], c["in_kb"]) for c in normalizer.parse_text(text, kb)["candidates"]]


def test_typed_two_variants():
    assert got("rpoB S450L and katG S315T") == [("rpoB", "S450L", "high", True), ("katG", "S315T", "high", True)]


def test_spoken_english_letters_and_numbers():
    assert got("rpoB es four fifty el") == [("rpoB", "S450L", "medium", True)]


def test_hindi_letter_names_and_hindi_gene_aliases():
    r = got("आरपीओबी एस 450 एल और कैट जी एस 315 टी")
    assert [(g, v) for g, v, *_ in r] == [("rpoB", "S450L"), ("katG", "S315T")]


def test_hinglish_connector():
    assert [(g, v) for g, v, *_ in got("rpoB S450L aur katG S315T")] == [("rpoB", "S450L"), ("katG", "S315T")]


def test_unknown_variant_kept_but_flagged():
    assert got("katG A999V") == [("katG", "A999V", "high", False)]


def test_three_letter_form():
    assert [(g, v) for g, v, *_ in got("rpoB p.Ser450Leu")] == [("rpoB", "S450L")]


def test_promoter_variant():
    assert [(g, v, k) for g, v, _, k in got("inhA c.-15C>T")] == [("inhA", "c.-15C>T", True)]


def test_garbage_gives_fragments():
    r = normalizer.parse_text("hello there", kb)
    assert r["candidates"] == [] and r["unparsed_fragments"]


def test_gene_without_variant_is_reported():
    r = normalizer.parse_text("rpoB", kb)
    assert r["candidates"] == [] and r["unparsed_fragments"]


def test_malayalam_spoken_letters_and_aliases():
    r = got("ആർപിഒബി എസ് 450 എൽ കൂടാതെ കാറ്റ് ജി എസ് 315 ടി")
    assert [(g, v) for g, v, *_ in r] == [("rpoB", "S450L"), ("katG", "S315T")]


def test_tamil_spoken_letters_and_aliases():
    r = got("ஆர்பிஓபி எஸ் 450 எல் மற்றும் கேட் ஜி எஸ் 315 டி")
    assert [(g, v) for g, v, *_ in r] == [("rpoB", "S450L"), ("katG", "S315T")]
