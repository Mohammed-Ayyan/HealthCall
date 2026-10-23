"""Multilingual Processing Service for CareOps AI Engine (Phase 7).

Provides:
1. Fast, deterministic language identification for English ('en'), Hindi ('hi'), and Kannada ('kn').
2. Script classification using Unicode code point blocks:
   - Kannada script: U+0C80 - U+0CFF
   - Devanagari script (Hindi): U+0900 - U+097F
   - Latin script (English): U+0000 - U+007F
3. Multilingual intent keyword lexicons across English, Hindi, and Kannada.
4. Multilingual emergency and clinical escalation indicators.
5. Multilingual action item extraction and staff commitment detection patterns.
6. Preservation of source language without unnecessary translation to English.
"""

import re
import unicodedata
import uuid
from typing import Dict, List, Optional, Tuple

from app.models.schemas import (
    ActionExtractionResponse,
    CallIntent,
    CallPriority,
    CallSentiment,
    CommitmentResponse,
)


# ============================================================================
# Unicode Script Ranges
# ============================================================================

# Kannada: U+0C80 to U+0CFF
_KANNADA_START = 0x0C80
_KANNADA_END = 0x0CFF

# Devanagari (Hindi): U+0900 to U+097F
_DEVANAGARI_START = 0x0900
_DEVANAGARI_END = 0x097F


def is_kannada_char(char: str) -> bool:
    """Return True if character belongs to Kannada Unicode block."""
    code = ord(char)
    return _KANNADA_START <= code <= _KANNADA_END


def is_devanagari_char(char: str) -> bool:
    """Return True if character belongs to Devanagari Unicode block."""
    code = ord(char)
    return _DEVANAGARI_START <= code <= _DEVANAGARI_END


def detect_language(text: str) -> Tuple[str, float, str]:
    """Identify the language of a text string deterministically.

    Returns:
        (language_code, confidence, script_name)
        language_code: 'en', 'hi', or 'kn'
        confidence: 0.0 to 1.0
        script_name: 'Latin', 'Devanagari', 'Kannada', or 'Unknown'
    """
    if not text or not text.strip():
        return "en", 0.5, "Unknown"

    cleaned = text.strip()
    kannada_count = 0
    devanagari_count = 0
    latin_count = 0
    total_alpha = 0

    for ch in cleaned:
        if ch.isalpha():
            total_alpha += 1
            if is_kannada_char(ch):
                kannada_count += 1
            elif is_devanagari_char(ch):
                devanagari_count += 1
            elif ch.isascii():
                latin_count += 1

    if total_alpha == 0:
        return "en", 0.5, "Unknown"

    # Kannada check
    if kannada_count > 0 and kannada_count >= devanagari_count and kannada_count >= latin_count:
        confidence = round(min(1.0, 0.85 + (kannada_count / total_alpha) * 0.15), 3)
        return "kn", confidence, "Kannada"

    # Hindi / Devanagari check
    if devanagari_count > 0 and devanagari_count >= kannada_count and devanagari_count >= latin_count:
        confidence = round(min(1.0, 0.85 + (devanagari_count / total_alpha) * 0.15), 3)
        return "hi", confidence, "Devanagari"

    # Latin / English check
    if latin_count > 0:
        confidence = round(min(1.0, 0.85 + (latin_count / total_alpha) * 0.15), 3)
        return "en", confidence, "Latin"

    # Fallback to majority or English
    if kannada_count > devanagari_count:
        return "kn", 0.75, "Kannada"
    elif devanagari_count > 0:
        return "hi", 0.75, "Devanagari"

    return "en", 0.75, "Latin"


# ============================================================================
# Multilingual Intent Keywords & Heuristic Classifiers
# ============================================================================

# Intent detection keyword mappings across all three languages
_INTENT_PATTERNS: Dict[str, Dict[str, List[str]]] = {
    CallIntent.APPOINTMENT_REQUEST.value: {
        "en": [
            r"\b(?:book|schedule|make|need|want|get|request)?\s*(?:an?\s+)?(?:appointment|consultation|visit|slot)\b",
            r"\bsee\s+(?:a|the|my)?\s*(?:doctor|physician|specialist)\b",
            r"\bbook\s+a\s+visit\b",
        ],
        "hi": [
            r"अपॉइंटमेंट",
            r"अपॉइन्टमेंट",
            r"डॉक्टर\s+से\s+मिलना",
            r"डॉक्टर\s+को\s+दिखाना",
            r"तारीख\s+चाहिए",
            r"परामर्श\s+बुक",
            r"मुलाकात\s+का\s+समय",
        ],
        "kn": [
            r"ಅಪಾಯಿಂಟ್ಮೆಂಟ್",
            r"ಅಪಾಯಿಂಟ್‍ಮೆಂಟ್",
            r"ವೈದ್ಯರ\s+ಅಪಾಯಿಂಟ್ಮೆಂಟ್",
            r"ವೈದ್ಯರನ್ನು\s+ಭೇಟಿ",
            r"ವೈದ್ಯರನ್ನು\s+ನೋಡಲು",
            r"ದಿನಾಂಕ\s+ನಿಗದಿ",
            r"ಕನ್ಸಲ್ಟೇಶನ್\s+ಬುಕ್",
        ],
    },
    CallIntent.FOLLOW_UP_REQUEST.value: {
        "en": [
            r"\b(?:follow[\s-]?up|after\s+surgery|post[\s-]?op(?:erative)?|test\s+results|biopsy\s+result|check[\s-]?up)\b",
            r"\bsurgery\s+follow[\s-]?up\b",
        ],
        "hi": [
            r"फॉलो[\s-]?अप",
            r"सर्जरी\s+के\s+बाद",
            r"ऑपरेशन\s+के\s+बाद",
            r"जांच\s+की\s+रिपोर्ट",
            r"रिपोर्ट\s+चेक",
            r"दोबारा\s+जांच",
        ],
        "kn": [
            r"ಫಾಲೋ[\s-]?ಅಪ್",
            r"ಶಸ್ತ್ರಚಿಕಿತ್ಸೆಯ\s+ನಂತರ",
            r"ಆಪರೇಷನ್\s+ನಂತರ",
            r"ವರದಿ\s+ಪರಿಶೀಲನೆ",
            r"ಮತ್ತೆ\s+ತಪಾಸಣೆ",
        ],
    },
    CallIntent.INSURANCE_QUERY.value: {
        "en": [
            r"\b(?:insurance|pre[\s-]?auth(?:orization)?|claim|coverage|copay|deductible|policy)\b",
            r"\binsurance\s+card\b",
        ],
        "hi": [
            r"बीमा",
            r"इंश्योरेंस",
            r"क्लेम",
            r"कवरेज",
            r"पॉलिसी",
            r"पूर्व-अनुमोदन",
        ],
        "kn": [
            r"ವಿಮೆ",
            r"ಇನ್ಶೂರೆನ್ಸ್",
            r"ಕ್ಲೇಮ್",
            r"ಕವರೇಜ್",
            r"ಪಾಲಿಸಿ",
        ],
    },
    CallIntent.BILLING_ISSUE.value: {
        "en": [
            r"\b(?:billing|invoice|charged\s+twice|duplicate\s+charge|overcharged?|refund|payment\s+error|bill)\b",
        ],
        "hi": [
            r"बिल",
            r"बिलिंग",
            r"दो\s+बार\s+चार्ज",
            r"रिफंड",
            r"अतिरिक्त\s+शुल्क",
            r"भुगतान\s+समस्या",
        ],
        "kn": [
            r"ಬಿಲ್",
            r"ಬಿಲ್ಲಿಂಗ್",
            r"ಎರಡು\s+ಬಾರಿ\s+ಶುಲ್ಕ",
            r"ಮರುಪಾವತಿ",
            r"ಹೆಚ್ಚುವರಿ\s+ಶುಲ್ಕ",
        ],
    },
    CallIntent.COMPLAINT.value: {
        "en": [
            r"\b(?:complaint|rude\s+staff|terrible\s+service|unacceptable|waited\s+too\s+long|neglect|bad\s+behavior)\b",
        ],
        "hi": [
            r"शिकायत",
            r"खराब\s+सेवा",
            r"रुखा\s+व्यवहार",
            r"बहुत\s+देर",
            r"लापरवाही",
            r"अनुचित\s+व्यवहार",
        ],
        "kn": [
            r"ದೂರು",
            r"ಕೆಟ್ಟ\s+ಸೇವೆ",
            r"ತಡವಾಯಿತು",
            r"ಅಸಭ್ಯ\s+ವರ್ತನೆ",
            r"ನಿರ್ಲಕ್ಷ್ಯ",
        ],
    },
    CallIntent.MEDICINE_REFILL.value: {
        "en": [
            r"\b(?:refill|prescription|pharmacy|medication\s+refill|renewal|tablets|pills|medicine)\b",
        ],
        "hi": [
            r"दवा",
            r"दवाई",
            r"प्रिस्क्रिप्शन",
            r"रिफिल",
            r"दवाइयां\s+खत्म",
            r"गोलियां",
        ],
        "kn": [
            r"ಔಷಧ",
            r"ಔಷಧಿ",
            r"ಮಾತ್ರೆಗಳು",
            r"ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್",
            r"ರೀಫಿಲ್",
            r"ಔಷಧ\s+ಮುಗಿದಿದೆ",
        ],
    },
    CallIntent.EMERGENCY_CONCERN.value: {
        "en": [
            r"\b(?:chest\s+pain|cannot\s+breathe|can'?t\s+breathe|heart\s+attack|unconscious|unresponsive|severe\s+bleeding|stroke)\b",
        ],
        "hi": [
            r"सीने\s+में\s+दर्द",
            r"सांस\s+नहीं\s+आ\s+रही",
            r"सांस\s+लेने\s+में\s+तकलीफ",
            r"दिल\s+का\s+दौरा",
            r"बेहोश",
            r"गंभीर\s+रक्तस्राव",
            r"बहुत\s+खून",
        ],
        "kn": [
            r"ಎದೆ\s+ನೋವು",
            r"ಉಸಿರಾಟದ\s+ತೊಂದರೆ",
            r"ಉಸಿರಾಡಲು\s+ಕಷ್ಟ",
            r"ಪ್ರಜ್ಞೆ\s+ತಪ್ಪಿದೆ",
            r"ತೀವ್ರ\s+ರಕ್ತಸ್ರಾವ",
            r"ತುರ್ತು",
        ],
    },
    CallIntent.GENERAL_INQUIRY.value: {
        "en": [
            r"\b(?:visiting\s+hours|directions|location|open\s+from|timings|visiting\s+time)\b",
        ],
        "hi": [
            r"मिलने\s+का\s+समय",
            r"अस्पताल\s+कहां\s+है",
            r"समय\s+क्या\s+है",
            r"खुलने\s+का\s+समय",
            r"सामान्य\s+जानकारी",
        ],
        "kn": [
            r"ಭೇಟಿ\s+ಸಮಯ",
            r"ಆಸ್ಪತ್ರೆ\s+ಎಲ್ಲಿದೆ",
            r"ತೆರೆಯುವ\s+ಸಮಯ",
            r"ಸಾಮಾನ್ಯ\s+ಮಾಹಿತಿ",
        ],
    },
}


def classify_intent_multilingual(text: str, language: Optional[str] = None) -> Tuple[str, Optional[str]]:
    """Deterministically classify intent across English, Hindi, and Kannada.

    Returns:
        (intent_label, evidence_snippet)
    """
    if not text or not text.strip():
        return CallIntent.UNKNOWN.value, None

    if not language or language == "auto":
        language, _, _ = detect_language(text)

    # Search for matching patterns in target language first, then fallback across all
    candidate_langs = [language] + [l for l in ["en", "hi", "kn"] if l != language]

    for intent_label, lang_dict in _INTENT_PATTERNS.items():
        for lang in candidate_langs:
            patterns = lang_dict.get(lang, [])
            for pattern in patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    return intent_label, match.group(0)

    return CallIntent.GENERAL_INQUIRY.value, None


# ============================================================================
# Multilingual Emergency & Escalation Indicators
# ============================================================================

_MULTILINGUAL_EMERGENCY_PATTERNS = [
    # English
    r"\b(?:chest\s+pain|heart\s+attack|cardiac\s+arrest|cannot\s+breathe|can'?t\s+breathe|shortness\s+of\s+breath|unresponsive|unconscious|stroke|anaphylaxis|severe\s+bleeding|coughing\s+up\s+blood)\b",
    r"\b(?:fever\s+of\s+10[0-9]|post[\s-]?op(?:erative)?\s+fever|incision\s+(?:oozing\s+pus|swollen\s+and\s+red|infected))\b",
    # Hindi
    r"(?:सीने\s+में\s+दर्द|दिल\s+का\s+दौरा|सांस\s+नहीं\s+आ\s+रही|सांस\s+फूलना|बेहोश|अचेत|खून\s+की\s+उल्टी|बहुत\s+ज्यादा\s+खून|गंभीर\s+दर्द)",
    r"(?:१०[०-९]\s+डिग्री\s+बुखार|टांके\s+में\s+मवाद|घाव\s+पक\s+गया|ऑपरेशन\s+के\s+बाद\s+तेज\s+बुखार)",
    # Kannada
    r"(?:ಎದೆ\s+ನೋವು|ಹೃದಯಾಘಾತ|ಉಸಿರಾಟದ\s+ತೊಂದರೆ|ಉಸಿರಾಡಲು\s+ಆಗುತ್ತಿಲ್ಲ|ಪ್ರಜ್ಞೆ\s+ತಪ್ಪಿದೆ|ರಕ್ತದ\s+ವಾಂತಿ|ತೀವ್ರ\s+ರಕ್ತಸ್ರಾವ|ವಿಪರೀತ\s+ನೋವು)",
    r"(?:೧೦[೦-೯]\s+ಜ್ವರ|ಗಾಯದಲ್ಲಿ\s+ಕೀವು|ಶಸ್ತ್ರಚಿಕಿತ್ಸೆಯ\s+ನಂತರ\s+ಜ್ವರ|ಹೊಲಿಗೆ\s+ಸೋಂಕು)",
]

_MULTILINGUAL_EMERGENCY_REGEX = re.compile("|".join(_MULTILINGUAL_EMERGENCY_PATTERNS), re.IGNORECASE)


def check_emergency_multilingual(text: str) -> Optional[str]:
    """Detect acute emergency phrases across English, Hindi, and Kannada."""
    match = _MULTILINGUAL_EMERGENCY_REGEX.search(text)
    if match:
        return match.group(0)
    return None


# ============================================================================
# Multilingual Greetings & Insufficient Dialogue
# ============================================================================

_GREETINGS_MULTILINGUAL = {
    "en": {"hello", "hi", "hey", "good morning", "good afternoon", "good evening", "anyone there"},
    "hi": {"नमस्ते", "नमस्कार", "हेलो", "हाय", "सुप्रभात", "कोई है"},
    "kn": {"ನಮಸ್ಕಾರ", "ನಮಸ್ತೆ", "ಹಲೋ", "ಶುಭೋದಯ", "ಯಾರಾದರೂ ಇದ್ದೀರಾ"},
}


def is_greeting_or_insufficient_multilingual(text: str) -> bool:
    """Check if transcript contains only a greeting or pleasantry without substantive request."""
    cleaned = text.strip()
    words = cleaned.split()
    if len(words) < 2:
        return True

    lower = cleaned.lower()
    for lang, greetings in _GREETINGS_MULTILINGUAL.items():
        if any(g in lower for g in greetings) and len(words) <= 4:
            return True

    return False
 
 
# ============================================================================
# Multilingual Action-Item Extraction & Staff Commitment Detection (Phases 5-7)
# ============================================================================

def extract_actions_multilingual(text: str, language: str = "en") -> List[ActionExtractionResponse]:
    """Extract healthcare operational actions grounded in source transcript evidence across EN, HI, KN."""
    if not text or not text.strip():
        return []

    actions: List[ActionExtractionResponse] = []

    # 1. Emergency action
    emergency_quote = check_emergency_multilingual(text)
    if emergency_quote:
        actions.append(
            ActionExtractionResponse(
                id=f"act-{uuid.uuid4().hex[:8]}",
                task=(
                    "EMERGENCY: Immediate clinical triage and attending physician notification"
                    if language == "en"
                    else (
                        "आपातकालीन: तत्काल क्लिनिकल मूल्यांकन और चिकित्सक अधिसूचना"
                        if language == "hi"
                        else "ತುರ್ತು: ತಕ್ಷಣದ ಕ್ಲಿನಿಕಲ್ ಮೌಲ್ಯಮಾಪನ ಮತ್ತು ವೈದ್ಯರಿಗೆ ಮಾಹಿತಿ"
                    )
                ),
                department="Emergency / Triage",
                priority="CRITICAL",
                evidence_quote=emergency_quote,
                suggested_assignee="Triage Nurse / Attending Physician",
                status="pending",
            )
        )

    # 2. Appointment Booking action
    appt_patterns = {
        "en": r"\b(?:book|schedule|make|need|want|get|request)?\s*(?:an?\s+)?(?:appointment|consultation|visit|slot)\b|\bsee\s+(?:a|the|my)?\s*(?:doctor|physician|specialist)\b",
        "hi": r"अपॉइंटमेंट|अपॉइन्टमेंट|डॉक्टर\s+से\s+मिलना|डॉक्टर\s+को\s+दिखाना|परामर्श\s+बुक",
        "kn": r"ಅಪಾಯಿಂಟ್ಮೆಂಟ್|ಅಪಾಯಿಂಟ್‍ಮೆಂಟ್|ವೈದ್ಯರ\s+ಅಪಾಯಿಂಟ್ಮೆಂಟ್|ವೈದ್ಯರನ್ನು\s+ಭೇಟಿ",
    }
    for l, pat in appt_patterns.items():
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            actions.append(
                ActionExtractionResponse(
                    id=f"act-{uuid.uuid4().hex[:8]}",
                    task=(
                        "Schedule outpatient doctor consultation"
                        if language == "en"
                        else (
                            "डॉक्टर परामर्श अपॉइंटमेंट शेड्यूल करें"
                            if language == "hi"
                            else "ವೈದ್ಯರ ಸಮಾಲೋಚನೆ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ನಿಗದಿಪಡಿಸಿ"
                        )
                    ),
                    department="Scheduling / Front Desk",
                    priority="MEDIUM",
                    evidence_quote=m.group(0),
                    suggested_assignee="Scheduling Coordinator",
                    status="pending",
                )
            )
            break

    # 3. Follow-up consultation action
    followup_patterns = {
        "en": r"\b(?:follow[\s-]?up|after\s+surgery|post[\s-]?op(?:erative)?|test\s+results|biopsy\s+result|check[\s-]?up)\b",
        "hi": r"फॉलो[\s-]?अप|सर्जरी\s+के\s+बाद|ऑपरेशन\s+के\s+बाद|जांच\s+की\s+रिपोर्ट|रिपोर्ट\s+चेक",
        "kn": r"ಫಾಲೋ[\s-]?ಅಪ್|ಶಸ್ತ್ರಚಿಕಿತ್ಸೆಯ\s+ನಂತರ|ಆಪರೇಷನ್\s+ನಂತರ|ವರದಿ\s+ಪರಿಶೀಲನೆ",
    }
    for l, pat in followup_patterns.items():
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            actions.append(
                ActionExtractionResponse(
                    id=f"act-{uuid.uuid4().hex[:8]}",
                    task=(
                        "Coordinate post-procedure clinical follow-up review"
                        if language == "en"
                        else (
                            "फॉलो-अप और टेस्ट रिपोर्ट की क्लिनिकल समीक्षा"
                            if language == "hi"
                            else "ಫಾಲೋ-ಅಪ್ ಮತ್ತು ಪರೀಕ್ಷಾ ವರದಿಯ ಕ್ಲಿನಿಕಲ್ ಪರಿಶೀಲನೆ"
                        )
                    ),
                    department="Nursing / Outpatient",
                    priority="HIGH",
                    evidence_quote=m.group(0),
                    suggested_assignee="Clinical Care Coordinator",
                    status="pending",
                )
            )
            break

    # 4. Medication refill action
    med_patterns = {
        "en": r"\b(?:refill|prescription|pharmacy|medication\s+refill|renewal|tablets|pills|medicine)\b",
        "hi": r"दवा|दवाई|प्रिस्क्रिप्शन|रिफिल|गोलियां",
        "kn": r"ಔಷಧ|ಔಷಧಿ|ಮಾತ್ರೆಗಳು|ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್|ರೀಫಿಲ್",
    }
    for l, pat in med_patterns.items():
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            actions.append(
                ActionExtractionResponse(
                    id=f"act-{uuid.uuid4().hex[:8]}",
                    task=(
                        "Verify and process prescription medication refill"
                        if language == "en"
                        else (
                            "प्रिस्क्रिप्शन दवा रिफिल की प्रक्रिया करें"
                            if language == "hi"
                            else "ಔಷಧಿ ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಮರುಪೂರಣವನ್ನು ಪ್ರಕ್ರಿಯೆಗೊಳಿಸಿ"
                        )
                    ),
                    department="Pharmacy",
                    priority="MEDIUM",
                    evidence_quote=m.group(0),
                    suggested_assignee="Staff Pharmacist",
                    status="pending",
                )
            )
            break

    # 5. Billing or Insurance action
    billing_patterns = {
        "en": r"\b(?:billing|invoice|charged\s+twice|duplicate\s+charge|overcharged?|refund|bill|insurance|claim|pre[\s-]?auth)\b",
        "hi": r"बिल|बिलिंग|दो\s+बार\s+चार्ज|रिफंड|बीमा|इंश्योरेंस|क्लेम",
        "kn": r"ಬಿಲ್|ಬಿಲ್ಲಿಂಗ್|ಎರಡು\s+ಬಾರಿ\s+ಶುಲ್ಕ|ಮರುಪಾವತಿ|ವಿಮೆ|ಇನ್ಶೂರೆನ್ಸ್|ಕ್ಲೇಮ್",
    }
    for l, pat in billing_patterns.items():
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            actions.append(
                ActionExtractionResponse(
                    id=f"act-{uuid.uuid4().hex[:8]}",
                    task=(
                        "Investigate billing dispute and verify insurance authorization"
                        if language == "en"
                        else (
                            "बिलिंग विसंगति और बीमा कवरेज की जांच करें"
                            if language == "hi"
                            else "ಬಿಲ್ಲಿಂಗ್ ಸಮಸ್ಯೆ ಮತ್ತು ವಿಮಾ ಅನುಮೋದನೆಯನ್ನು ಪರಿಶೀಲಿಸಿ"
                        )
                    ),
                    department="Billing & Insurance",
                    priority="MEDIUM",
                    evidence_quote=m.group(0),
                    suggested_assignee="Revenue Cycle Specialist",
                    status="pending",
                )
            )
            break

    return actions


def extract_commitments_multilingual(text: str, language: str = "en") -> List[CommitmentResponse]:
    """Detect staff verbal promises and commitments grounded in conversation evidence across EN, HI, KN."""
    if not text or not text.strip():
        return []

    commitments: List[CommitmentResponse] = []

    # Commitment regex per language
    commitment_rules = [
        # English commitments
        (
            r"\b(?:I\s+will|we\s+will|I'll|we'll)\s+(?:call\s+you\s+back|send\s+(?:the|you|over)|follow\s+up|check\s+with|have\s+the\s+nurse|schedule\s+you|get\s+back\s+to\s+you|verify\s+your)[^.!?\n]*",
            "Front Desk / Clinic Staff",
            "Call patient back or send requested details",
        ),
        (
            r"\b(?:doctor|physician|nurse)\s+will\s+(?:see|call|review|visit)\s+you[^.!?\n]*",
            "Clinical Staff",
            "Clinical team review and patient contact",
        ),
        # Hindi commitments
        (
            r"(?:मैं|हम)\s+(?:आपको\s+(?:कॉल|फोन|रिपोर्ट\s+भेज|जानकारी\s+देंगे|सूचित\s+करेंगे)|डॉक्टर\s+से\s+बात\s+करेंगे)[^।!?\n]*",
            "क्लिनिक स्टाफ (Clinic Staff)",
            "मरीज को कॉल करना या आवश्यक जानकारी भेजना",
        ),
        (
            r"(?:डॉक्टर|नर्स)\s+(?:आपको\s+देखेंगे|बात\s+करेंगे|जांच\s+करेंगे)[^।!?\n]*",
            "चिकित्सक दल (Clinical Team)",
            "डॉक्टर द्वारा परामर्श या जांच",
        ),
        # Kannada commitments
        (
            r"(?:ನಾವು|ನಾನು)\s+(?:ನಿಮಗೆ\s+(?:ಕರೆ|ಫೋನ್\s+ಮಾಡುತ್ತೇನೆ|ವರದಿ\s+ಕಳುಹಿಸುತ್ತೇವೆ|ಮಾಹಿತಿ\s+ನೀಡುತ್ತೇವೆ)|ವೈದ್ಯರೊಂದಿಗೆ\s+ಮಾತನಾಡುತ್ತೇವೆ)[^.!?\n]*",
            "ಕ್ಲಿನಿಕ್ ಸಿಬ್ಬಂದಿ (Clinic Staff)",
            "ರೋಗಿಗೆ ಕರೆ ಮಾಡುವುದು ಅಥವಾ ಮಾಹಿತಿ ಕಳುಹಿಸುವುದು",
        ),
        (
            r"(?:ವೈದ್ಯರು|ನರ್ಸ್)\s+(?:ನಿಮ್ಮನ್ನು\s+ನೋಡುತ್ತಾರೆ|ತಪಾಸಣೆ\s+ಮಾಡುತ್ತಾರೆ)[^.!?\n]*",
            "ವೈದ್ಯಕೀಯ ತಂಡ (Medical Team)",
            "ವೈದ್ಯರ ತಪಾಸಣೆ ಮತ್ತು ಸಂಪರ್ಕ",
        ),
    ]

    for pat, owner, commitment_desc in commitment_rules:
        for m in re.finditer(pat, text, re.IGNORECASE):
            commitments.append(
                CommitmentResponse(
                    id=f"com-{uuid.uuid4().hex[:8]}",
                    commitment=commitment_desc,
                    owner=owner,
                    deadline=None,
                    timestamp=None,
                    status="pending",
                    evidence_quote=m.group(0).strip(),
                )
            )

    return commitments


# ============================================================================
# Source-Language Factual Summarization
# ============================================================================

def summarize_multilingual(text: str, intent_label: str, language: str) -> str:
    """Generate a concise, factual summary in the source language preserving meaning and negation."""
    cleaned = text.strip()
    preview = cleaned[:100] + ("..." if len(cleaned) > 100 else "")

    if language == "hi":
        return f"मरीज ने '{intent_label}' के संबंध में क्लिनिक से संपर्क किया। विवरण: \"{preview}\""
    elif language == "kn":
        return f"ರೋಗಿಯು '{intent_label}' ಕುರಿತು ಕ್ಲಿನಿಕ್ ಅನ್ನು ಸಂಪರ್ಕಿಸಿದ್ದಾರೆ. ವಿವರ: \"{preview}\""
    else:
        return f"Patient contacted clinic regarding {intent_label}. Summary: \"{preview}\""

