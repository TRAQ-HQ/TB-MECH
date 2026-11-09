"""Template strings. English and Hindi only. Hindi text needs native-speaker review before demo.
Gene names, variant notation and drug names always stay in Latin script."""

STATUS = {
    "en": {"experimentally_supported": "experimentally supported", "multi_study_association": "association in multiple studies",
           "association_candidate": "association candidate", "weak_or_indirect": "weak or indirect evidence",
           "conflicting": "conflicting evidence", "unknown": "unknown"},
    "hi": {"experimentally_supported": "प्रायोगिक रूप से समर्थित", "multi_study_association": "कई अध्ययनों में संबंध",
           "association_candidate": "संबंध-आधारित संभावित", "weak_or_indirect": "कमज़ोर या अप्रत्यक्ष साक्ष्य",
           "conflicting": "परस्पर विरोधी साक्ष्य", "unknown": "अज्ञात"},
}

T = {
    "en": {
        "variants": "Variants in this analysis: {names}. {k} have curated evidence and {u} do not.",
        "direct": "{gene} {variant} is linked to {drug} resistance. Evidence status: {status}.",
        "compensatory": "{secondary} may compensate for the fitness effects of {primary}. Evidence status: {status}. This is an association, not proof of mechanism.",
        "no_compensatory": "No curated compensatory relationship applies to the variants in this analysis.",
        "gap": "{raw}: no curated evidence in this knowledge base.",
        "phenotype": "{drug}: {message}",
        "limitations": "This is a research-support prototype. It does not diagnose or advise treatment. Associations are not proof of mechanism.",
        "help": "I can only answer from the curated evidence for this analysis. You can ask about variants, evidence, compensatory relationships, evidence gaps, phenotype checks or limitations.",
        "none": "There is nothing to report for this question.",
    },
    "hi": {
        "variants": "इस विश्लेषण में वेरिएंट: {names}। {k} के लिए चयनित साक्ष्य उपलब्ध है और {u} के लिए नहीं।",
        "direct": "{gene} {variant} का संबंध {drug} प्रतिरोध से बताया गया है। साक्ष्य स्थिति: {status}।",
        "compensatory": "{secondary} संभवतः {primary} के फिटनेस प्रभाव की भरपाई कर सकता है। साक्ष्य स्थिति: {status}। यह केवल संबंध है, तंत्र का प्रमाण नहीं।",
        "no_compensatory": "इस विश्लेषण के वेरिएंट पर कोई चयनित क्षतिपूर्ति संबंध लागू नहीं होता।",
        "gap": "{raw}: इस ज्ञान-आधार में चयनित साक्ष्य नहीं है।",
        "phenotype": "{drug}: {message}",
        "limitations": "यह एक शोध-सहायता प्रोटोटाइप है। यह निदान या उपचार की सलाह नहीं देता। संबंध का अर्थ तंत्र का प्रमाण नहीं है।",
        "help": "मैं केवल इस विश्लेषण के चयनित साक्ष्य के आधार पर उत्तर दे सकता हूँ। आप वेरिएंट, साक्ष्य, क्षतिपूर्ति, अंतराल, फेनोटाइप जाँच या सीमाओं के बारे में पूछ सकते हैं।",
        "none": "इस प्रश्न के लिए बताने को कुछ नहीं है।",
    },
}

PHENO_HI = {
    "consistent": "फेनोटाइप प्रतिरोधी है; यह प्रतिरोध से जुड़े वेरिएंट के अनुरूप है।",
    "discordant": "फेनोटाइप संवेदनशील है, जबकि वेरिएंट प्रतिरोध से जुड़ा है। विशेषज्ञ समीक्षा आवश्यक है।",
    "unexplained_by_kb": "फेनोटाइप प्रतिरोधी है, पर इस ज्ञान-आधार में इसकी कोई व्याख्या नहीं है।",
    "no_signal": "फेनोटाइप संवेदनशील है और कोई संबंधित वेरिएंट नहीं मिला।",
}


def lang_key(language_code: str) -> str:
    base = (language_code or "en").split("-")[0].lower()
    return base if base in T else "en"


def render_fact(fact: dict, lang: str) -> str:
    t = T[lang]
    ft = fact["type"]
    if ft == "variants":
        return t["variants"].format(names=", ".join(fact["names"]) or "-", k=fact["n_known"], u=fact["n_unknown"])
    if ft == "direct":
        return t["direct"].format(gene=fact["gene"], variant=fact["variant"], drug=fact["drug"],
                                  status=STATUS[lang][fact["status"]])
    if ft == "compensatory":
        return t["compensatory"].format(secondary=fact["secondary"], primary=fact["primary"],
                                        status=STATUS[lang][fact["status"]])
    if ft == "gap":
        return t["gap"].format(raw=fact["raw"])
    if ft == "phenotype":
        msg = PHENO_HI[fact["kind"]] if lang == "hi" else fact["message"]
        return t["phenotype"].format(drug=fact["drug"], message=msg)
    return t.get(ft, t["none"])


def render_answer(facts: list[dict], lang: str) -> str:
    return " ".join(render_fact(f, lang) for f in facts) if facts else T[lang]["none"]
