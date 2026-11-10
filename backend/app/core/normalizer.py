"""Typed / spoken mutation parsing.

Rules first. Output is ALWAYS shown to the user as editable chips; analysis never
starts from raw transcript. Add languages only with tests.
"""
import re
import unicodedata

from .kb import KnowledgeBase, norm_short

AA = set("ACDEFGHIKLMNPQRSTVWY")
THREE = {"ala": "A", "arg": "R", "asn": "N", "asp": "D", "cys": "C", "gln": "Q", "glu": "E",
         "gly": "G", "his": "H", "ile": "I", "leu": "L", "lys": "K", "met": "M", "phe": "F",
         "pro": "P", "ser": "S", "thr": "T", "trp": "W", "tyr": "Y", "val": "V"}
EN_NAMES = {"ay": "A", "bee": "B", "see": "C", "dee": "D", "ee": "E", "eff": "F", "gee": "G",
            "aitch": "H", "eye": "I", "jay": "J", "kay": "K", "el": "L", "em": "M", "en": "N",
            "oh": "O", "pee": "P", "cue": "Q", "ar": "R", "ess": "S", "es": "S", "tee": "T",
            "you": "U", "vee": "V", "ex": "X", "why": "Y", "zed": "Z"}
HI_NAMES = {"ए": "A", "बी": "B", "सी": "C", "डी": "D", "ई": "E", "एफ": "F", "जी": "G",
            "एच": "H", "आई": "I", "जे": "J", "के": "K", "एल": "L", "एम": "M", "एन": "N",
            "ओ": "O", "पी": "P", "क्यू": "Q", "आर": "R", "एस": "S", "टी": "T", "यू": "U",
            "वी": "V", "डब्ल्यू": "W", "एक्स": "X", "वाई": "Y", "जेड": "Z"}
ML_NAMES = {"ആർ": "R", "പി": "P", "ഒ": "O", "ബി": "B", "സി": "C", "ഡി": "D",
            "ഇ": "E", "എഫ്": "F", "ജി": "G", "എച്ച്": "H", "ഐ": "I", "ജെ": "J",
            "കെ": "K", "എൽ": "L", "എം": "M", "എൻ": "N", "ക്യു": "Q", "എസ്": "S",
            "ടി": "T", "യു": "U", "വി": "V", "ഡബ്ല്യു": "W", "എക്സ്": "X", "വൈ": "Y", "സെഡ്": "Z"}
TA_NAMES = {"ஏ": "A", "பி": "B", "சி": "C", "டி": "D", "இ": "E", "எப்": "F", "ஜி": "G",
            "ஹெச்": "H", "ஐ": "I", "ஜே": "J", "கே": "K", "எல்": "L", "எம்": "M", "என்": "N",
            "ஓ": "O", "ஆர்": "R", "எஸ்": "S", "டி": "T", "யு": "U", "வி": "V"}
SINGLE = {c.lower(): c for c in "ABCDEFGHIJKLMNOPQRSTUVWXYZ"}
LETTER_MAP = {
    **SINGLE, **EN_NAMES,
    **{unicodedata.normalize("NFC", k): v for k, v in HI_NAMES.items()},
    **{unicodedata.normalize("NFC", k): v for k, v in ML_NAMES.items()},
    **{unicodedata.normalize("NFC", k): v for k, v in TA_NAMES.items()},
}
LETTER_TO_NAME = {"A": "ay", "B": "bee", "C": "see", "D": "dee", "G": "gee"}

UNITS = {"zero": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7,
         "eight": 8, "nine": 9}
TEENS = {"ten": 10, "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14, "fifteen": 15,
         "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19}
TENS = {"twenty": 20, "thirty": 30, "forty": 40, "fifty": 50, "sixty": 60, "seventy": 70,
        "eighty": 80, "ninety": 90}
NUMWORDS = {**UNITS, **TEENS, **TENS, "hundred": 100}

_names_alt = "|".join(re.escape(n) for n in sorted(LETTER_MAP, key=len, reverse=True))
SPOKEN_RE = re.compile(rf"(?<!\S)({_names_alt})\s+(\d{{1,4}})\s+({_names_alt})(?!\S)", re.I)
DIRECT_RE = re.compile(r"(?<![A-Za-z0-9])([A-Za-z])\s*(\d{1,4})\s*([A-Za-z*])(?![A-Za-z0-9])")
_three_alt = "|".join(THREE)
THREE_RE = re.compile(rf"(?:p\.)?\s*({_three_alt})\s*(\d{{1,4}})\s*({_three_alt})", re.I)
PROM_RE = re.compile(r"(?<!\S)c\s*\.?\s*-\s*(\d{1,4})\s*([ACGT])\s*(?:>|to)\s*([ACGT])(?!\S)", re.I)


def _convert_run(run: list[str]) -> str:
    merged: list = []
    j = 0
    while j < len(run):
        w = run[j]
        if w in TENS and j + 1 < len(run) and run[j + 1] in UNITS and UNITS[run[j + 1]] > 0:
            merged.append(TENS[w] + UNITS[run[j + 1]]); j += 2
        elif w == "hundred":
            merged.append("H"); j += 1
        else:
            merged.append(NUMWORDS[w]); j += 1
    out, k = [], 0
    while k < len(merged):
        if k + 1 < len(merged) and merged[k + 1] == "H" and isinstance(merged[k], int):
            val = merged[k] * 100
            k += 2
            if k < len(merged) and isinstance(merged[k], int) and merged[k] < 100:
                val += merged[k]; k += 1
            out.append(str(val))
        elif merged[k] == "H":
            out.append("100"); k += 1
        else:
            out.append(str(merged[k])); k += 1
    return "".join(out)


def _words_to_digits(text: str) -> str:
    toks, out, i = text.split(), [], 0
    while i < len(toks):
        t = toks[i].lower()
        if t in NUMWORDS and out and unicodedata.normalize("NFC", out[-1]).lower() in LETTER_MAP:
            j = i
            while j < len(toks) and toks[j].lower() in NUMWORDS:
                j += 1
            out.append(_convert_run([x.lower() for x in toks[i:j]]))
            i = j
        else:
            out.append(toks[i]); i += 1
    return " ".join(out)


def _gene_aliases(kb: KnowledgeBase) -> dict[str, list[str]]:
    res: dict[str, list[str]] = {}
    for g in kb.gene_names:
        prefix, last = g[:-1].lower(), g[-1].upper()
        al = {g.lower(), f"{prefix} {last.lower()}"}
        if last in LETTER_TO_NAME:
            al.add(f"{prefix} {LETTER_TO_NAME[last]}")
        for a in kb.aliases.get(g, []):
            al.add(unicodedata.normalize("NFC", a).lower())
        res[g] = sorted(al, key=len, reverse=True)
    return res


def _find_genes(text: str, kb: KnowledgeBase) -> list[dict]:
    found = []
    for gene, aliases in _gene_aliases(kb).items():
        for a in aliases:
            pat = r"(?<!\S)" + r"\s*".join(re.escape(p) for p in a.split()) + r"(?!\S)"
            for m in re.finditer(pat, text, re.I):
                matched = re.sub(r"\s+", "", m.group(0)).lower()
                found.append({"gene": gene, "start": m.start(), "end": m.end(),
                              "conf": "high" if matched == gene.lower() else "medium"})
    found.sort(key=lambda x: (x["start"], -(x["end"] - x["start"])))
    res, last_end = [], -1
    for f in found:  # drop overlaps, keep longest at same start
        if f["start"] >= last_end:
            res.append(f); last_end = f["end"]
    return res


def _mask(text: str, start: int, end: int) -> str:
    return text[:start] + " " * (end - start) + text[end:]


def parse_text(text: str, kb: KnowledgeBase) -> dict:
    raw = unicodedata.normalize("NFC", text or "")
    t = re.sub(r"[,;।]", " ", raw)
    t = re.sub(r"\bminus\b", "-", t, flags=re.I)
    t = re.sub(r"\b(and|aur|और|കൂടാതെ|പിന്നെ|മற்றும்)\b", " ", t, flags=re.I)
    t = _words_to_digits(t)

    spoken: set[str] = set()

    def _spoken_sub(m: re.Match) -> str:
        n1, num, n2 = m.group(1), m.group(2), m.group(3)
        l1, l2 = LETTER_MAP.get(n1.lower()), LETTER_MAP.get(n2.lower())
        if not l1 or not l2 or l1 not in AA or (l2 not in AA and l2 != "*"):
            return m.group(0)
        if len(n1) > 1 or len(n2) > 1:
            spoken.add(f"{l1}{num}{l2}")
        return f"{l1}{num}{l2}"

    t = SPOKEN_RE.sub(_spoken_sub, t)

    variants: list[dict] = []  # {pos, short, conf}
    for m in PROM_RE.finditer(t):
        variants.append({"pos": m.start(), "short": f"c.-{m.group(1)}{m.group(2).upper()}>{m.group(3).upper()}", "conf": "high"})
    for m in list(PROM_RE.finditer(t))[::-1]:
        t = _mask(t, m.start(), m.end())
    for m in list(THREE_RE.finditer(t)):
        a, b = THREE[m.group(1).lower()], THREE[m.group(3).lower()]
        variants.append({"pos": m.start(), "short": f"{a}{m.group(2)}{b}", "conf": "high"})
    for m in list(THREE_RE.finditer(t))[::-1]:
        t = _mask(t, m.start(), m.end())
    for m in DIRECT_RE.finditer(t):
        a, num, b = m.group(1).upper(), m.group(2), m.group(3).upper()
        if a in AA and (b in AA or b == "*"):
            short = f"{a}{num}{b}"
            variants.append({"pos": m.start(), "short": short, "conf": "medium" if short in spoken else "high"})

    genes = _find_genes(t, kb)
    used_genes: set[int] = set()
    candidates, fragments, seen = [], [], set()
    for v in sorted(variants, key=lambda x: x["pos"]):
        prev = [i for i, g in enumerate(genes) if g["start"] < v["pos"]]
        nxt = [i for i, g in enumerate(genes) if g["start"] > v["pos"]]
        gi = prev[-1] if prev else (nxt[0] if nxt else None)
        if gi is None:
            fragments.append(f"variant {v['short']} has no gene")
            continue
        g = genes[gi]
        used_genes.add(gi)
        conf = "medium" if (g["conf"] == "medium" or v["conf"] == "medium" or not prev) else "high"
        key = (g["gene"], norm_short(v["short"]))
        if key in seen:
            continue
        seen.add(key)
        candidates.append({
            "raw": f"{g['gene']} {v['short']}", "gene": g["gene"], "variant": v["short"],
            "confidence": conf, "in_kb": kb.find_variant(g["gene"], v["short"]) is not None,
        })
    for i, g in enumerate(genes):
        if i not in used_genes:
            fragments.append(f"gene {g['gene']} has no variant")
    if not candidates and not fragments and raw.strip():
        fragments.append(raw.strip())
    return {"candidates": candidates, "unparsed_fragments": fragments}
