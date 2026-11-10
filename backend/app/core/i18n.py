"""Template strings. English, Hindi, Malayalam, and Tamil.
Gene names, variant notation and drug names always stay in Latin script."""

STATUS = {
    "en": {"experimentally_supported": "experimentally supported", "multi_study_association": "association in multiple studies",
           "association_candidate": "association candidate", "weak_or_indirect": "weak or indirect evidence",
           "conflicting": "conflicting evidence", "unknown": "unknown"},
    "hi": {"experimentally_supported": "प्रायोगिक रूप से समर्थित", "multi_study_association": "कई अध्ययनों में संबंध",
           "association_candidate": "संबंध-आधारित संभावित", "weak_or_indirect": "कमज़ोर या अप्रत्यक्ष साक्ष्य",
           "conflicting": "परस्पर विरोधी साक्ष्य", "unknown": "अज्ञात"},
    "ml": {"experimentally_supported": "പരീക്ഷണങ്ങളിലൂടെ സ്ഥിരീകരിച്ചത്", "multi_study_association": "നിരവധി പഠനങ്ങളിലെ കണ്ടെത്തൽ",
           "association_candidate": "സാധ്യതയുള്ള ബന്ധം", "weak_or_indirect": "ദുർബലമായ തെളിവ്",
           "conflicting": "പരസ്പരവിരുദ്ധമായ തെളിവുകൾ", "unknown": "അജ്ഞാതം"},
    "ta": {"experimentally_supported": "சோதனை மூலம் உறுதிப்படுத்தப்பட்டது", "multi_study_association": "பல ஆய்வுகளில் தொடர்பு",
           "association_candidate": "தொடர்பு சாத்தியம்", "weak_or_indirect": "பலவீனமான அல்லது மறைமுக ஆதாரம்",
           "conflicting": "முரண்பட்ட ஆதாரம்", "unknown": "தெரியவில்லை"},
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
    "ml": {
        "variants": "ഈ വിശകലനത്തിലെ വേരിയന്റുകൾ: {names}. {k} എണ്ണത്തിന് തെളിവുകൾ ലഭ്യമാണ്, {u} എണ്ണത്തിന് ലഭ്യമല്ല.",
        "direct": "{gene} {variant} എന്നത് {drug} പ്രതിരോധവുമായി ബന്ധപ്പെട്ടിരിക്കുന്നു. തെളിവ് നില: {status}.",
        "compensatory": "{secondary} എന്നത് {primary} യുടെ ഫിറ്റ്നസ് നഷ്ടം പരിഹരിച്ചേക്കാം. തെളിവ് നില: {status}. ഇത് ബന്ധം മാത്രമാണ്, കൃത്യമായ തെളിവല്ല.",
        "no_compensatory": "ഈ വിശകലനത്തിലെ വേരിയന്റുകൾക്ക് സ്ഥിരീകരിച്ച നഷ്ടപരിഹാര ബന്ധങ്ങൾ ലഭ്യമല്ല.",
        "gap": "{raw}: ഈ വിജ്ഞാന അടിത്തറയിൽ തെളിവുകളില്ല.",
        "phenotype": "{drug}: {message}",
        "limitations": "ഇതൊരു ഗവേഷണ സഹായ പ്രോട്ടോടൈപ്പ് മാത്രമാണ്. രോഗനിർണയത്തിനോ ചികിത്സാ തീരുമാനങ്ങൾക്കോ ഉപയോഗിക്കരുത്. ബന്ധങ്ങൾ കൃത്യമായ പ്രവർത്തന തെളിവുകളല്ല.",
        "help": "ഈ വിശകലനത്തിലെ തെളിവുകളുടെ അടിസ്ഥാനത്തിൽ മാത്രമേ എനിക്ക് ഉത്തരം നൽകാൻ കഴിയൂ. വേരിയന്റുകൾ, തെളിവുകൾ, നഷ്ടപരിഹാര ബന്ധങ്ങൾ എന്നിവയെക്കുറിച്ച് ചോദിക്കാം.",
        "none": "ഈ ചോദ്യത്തിന് നൽകാൻ വിവരങ്ങളൊന്നുമില്ല.",
    },
    "ta": {
        "variants": "இந்த பகுப்பாய்வில் உள்ள மாறுபாடுகள்: {names}. {k} மாறுபாடுகளுக்கு ஆதாரங்கள் உள்ளன, {u} மாறுபாடுகளுக்கு இல்லை.",
        "direct": "{gene} {variant} என்பது {drug} எதிர்ப்புத்தன்மையுடன் தொடர்புடையது. ஆதார நிலை: {status}.",
        "compensatory": "{secondary} என்பது {primary} இன் செயல்திறன் இழப்பை ஈடுசெய்யக்கூடும். ஆதார நிலை: {status}. இது ஒரு தொடர்பு மட்டுமே, வழிமுறையின் சான்று அல்ல.",
        "no_compensatory": "இந்த பகுப்பாய்வில் உள்ள மாறுபாடுகளுக்கு ஈடுசெய்யும் உறவுகள் இல்லை.",
        "gap": "{raw}: இந்த அறிவுத் தளத்தில் ஆதாரம் இல்லை.",
        "phenotype": "{drug}: {message}",
        "limitations": "இது ஒரு ஆராய்ச்சி-ஆதரவு முன்மாதிரி மட்டுமே. இது நோயறிதல் அல்லது சிகிச்சைக்கான ஆலோசனை அல்ல.",
        "help": "இந்த பகுப்பாய்வின் ஆதாரங்களின் அடிப்படையில் மட்டுமே பதிலளிக்க முடியும். மாறுபாடுகள், ஆதாரங்கள் அல்லது வரம்புகள் பற்றி கேட்கலாம்.",
        "none": "இந்த கேள்விக்கு தகவல் எதுவும் இல்லை.",
    },
}

PHENO_TRANSLATIONS = {
    "hi": {
        "consistent": "फेनोटाइप प्रतिरोधी है; यह प्रतिरोध से जुड़े वेरिएंट के अनुरूप है।",
        "discordant": "फेनोटाइप संवेदनशील है, जबकि वेरिएंट प्रतिरोध से जुड़ा है। विशेषज्ञ समीक्षा आवश्यक है।",
        "unexplained_by_kb": "फेनोटाइप प्रतिरोधी है, पर इस ज्ञान-आधार में इसकी कोई व्याख्या नहीं है।",
        "no_signal": "फेनोटाइप संवेदनशील है और कोई संबंधित वेरिएंट नहीं मिला।",
    },
    "ml": {
        "consistent": "ഫീനോടൈപ്പ് പ്രതിരോധശേഷിയുള്ളതാണ്; ഇത് വേരിയന്റുമായി പൊരുത്തപ്പെടുന്നു.",
        "discordant": "ഫീനോടൈപ്പ് സാധ്യത കാണിക്കുന്നു, എന്നാൽ വേരിയന്റ് പ്രതിരോധവുമായി ബന്ധപ്പെട്ടതാണ്. വിദഗ്ദ്ധ പരിശോധന ആവശ്യമാണ്.",
        "unexplained_by_kb": "ഫീനോടൈപ്പ് പ്രതിരോധശേഷിയുള്ളതാണ്, എന്നാൽ ഈ വിജ്ഞാന അടിത്തറയിൽ ഇതിന് വിശദീകരണമില്ല.",
        "no_signal": "ഫീനോടൈപ്പ് സാധാരണം, മറ്റ് വേരിയന്റുകളൊന്നും കണ്ടെത്തിയില്ല.",
    },
    "ta": {
        "consistent": "பினோடைப் எதிர்ப்புத்திறன் கொண்டது; இது மாறுபாட்டுடன் ஒத்துப்போகிறது.",
        "discordant": "பினோடைப் உணர்திறன் கொண்டது, ஆனால் மாறுபாடு எதிர்ப்புத்திறனுடன் தொடர்புடையது. நிபுணர் ஆய்வு தேவை.",
        "unexplained_by_kb": "பினோடைப் எதிர்ப்புத்திறன் கொண்டது, ஆனால் அறிவுத் தளத்தில் விளக்கம் இல்லை.",
        "no_signal": "பினோடைப் உணர்திறன் கொண்டது, மாறுபாடுகள் எதுவும் இல்லை.",
    },
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
        trans = PHENO_TRANSLATIONS.get(lang, {})
        msg = trans.get(fact["kind"], fact["message"])
        return t["phenotype"].format(drug=fact["drug"], message=msg)
    return t.get(ft, t["none"])


def render_answer(facts: list[dict], lang: str) -> str:
    return " ".join(render_fact(f, lang) for f in facts) if facts else T[lang]["none"]
