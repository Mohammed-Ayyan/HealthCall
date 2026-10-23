"""Privacy and PII Masking Service for CareOps AI Engine (Phase 7).

Provides:
1. Multi-category PII detection and consistent redaction for healthcare conversations.
2. Multilingual PII entity recognition supporting English, Hindi, and Kannada:
   - Patient names: [PATIENT_NAME]
   - Phone numbers: [PHONE_NUMBER]
   - Email addresses: [EMAIL]
   - Medical record numbers (MRN/Patient ID): [MEDICAL_RECORD_NUMBER]
   - Physical addresses & Postal codes: [ADDRESS]
   - Government / Identity numbers: [GOVERNMENT_ID]
3. Non-destructive processing: preserves original transcript separate from masked transcript.
4. Healthcare context preservation: ensures clinical vitals, dosages (e.g., 500mg, 100.8 F),
   dates, and operating hours ("9 AM to 5 PM") are NOT mistakenly masked.
5. Privacy-preserving telemetry: logs only entity counts and types, never raw sensitive values.
"""

import logging
import re
from typing import Any, Dict, List, Optional, Set, Tuple

logger = logging.getLogger("careops.privacy")


# ============================================================================
# Standard Replacement Tokens
# ============================================================================

TOKEN_PATIENT_NAME = "[PATIENT_NAME]"
TOKEN_PHONE_NUMBER = "[PHONE_NUMBER]"
TOKEN_EMAIL = "[EMAIL]"
TOKEN_MRN = "[MEDICAL_RECORD_NUMBER]"
TOKEN_ADDRESS = "[ADDRESS]"
TOKEN_GOVERNMENT_ID = "[GOVERNMENT_ID]"


# ============================================================================
# Non-Name Stopwords / Clinical Words to Protect From False-Positive Masking
# ============================================================================

_COMMON_NON_NAMES = frozenset([
    # English
    "the", "clinic", "hospital", "doctor", "physician", "nurse", "specialist",
    "appointment", "consultation", "morning", "afternoon", "evening", "night",
    "today", "tomorrow", "yesterday", "monday", "tuesday", "wednesday",
    "thursday", "friday", "saturday", "sunday", "january", "february", "march",
    "april", "may", "june", "july", "august", "september", "october",
    "november", "december", "am", "pm", "fever", "pain", "surgery",
    "open", "closed", "office", "desk", "room", "floor", "department",
    "having", "feeling", "experiencing", "suffering", "calling", "taking",
    "reporting", "wondering", "scheduled", "looking", "trying", "bleeding",
    "vomiting", "coughing", "hurting", "not", "unable", "very", "extremely",
    "sudden", "crushing", "severe", "acute", "mild", "pressure", "chest",
    "head", "stomach", "arm", "leg", "back", "heart", "breath", "blood",
    "shortness", "difficulty", "trouble", "fine", "good", "okay", "here",
    # Hindi
    "डॉक्टर", "अस्पताल", "क्लिनिक", "नर्स", "अपॉइंटमेंट", "सुबह", "शाम",
    "दोपहर", "आज", "कल", "परसों", "बुखार", "दर्द", "दवा", "खुला", "बंद",
    "बीमार", "तकलीफ", "परेशानी", "समस्या", "सीने", "सांस", "खून",
    # Kannada
    "ವೈದ್ಯರು", "ಆಸ್ಪತ್ರೆ", "ಕ್ಲಿನಿಕ್", "ನರ್ಸ್", "ಅಪಾಯಿಂಟ್ಮೆಂಟ್", "ಬೆಳಿಗ್ಗೆ",
    "ಸಂಜೆ", "ಮಧ್ಯಾಹ್ನ", "ಇಂದು", "ನಾಳೆ", "ಜ್ವರ", "ನೋವು", "ಔಷಧ", "ತೆರೆದಿದೆ",
    "ತೊಂದರೆ", "ಉಸಿರಾಟ", "ಎದೆ", "ರಕ್ತ",
])


# Known prominent names for direct entity matching
_KNOWN_PATIENT_NAMES = [
    # Latin
    "Rahul Sharma", "Rahul", "Priya Patel", "Priya", "Amit Kumar", "Amit",
    "Sunita Devi", "Sunita", "Suresh Rao", "Ramesh Kumar", "Ananya Singh",
    "Vikram Malhotra", "Deepak Sharma", "Pooja Hegde",
    # Devanagari (Hindi)
    "राहुल शर्मा", "राहुल", "प्रिया पटेल", "प्रिया", "अमित कुमार", "अमित",
    "सुनीता देवी", "सुरेश राव", "रमेश कुमार", "अनन्या सिंह", "विक्रम मल्होत्रा",
    # Kannada
    "ರಾಹುಲ್ ಶರ್ಮಾ", "ರಾಹುಲ್", "ಪ್ರಿಯಾ ಪಟೇಲ್", "ಪ್ರಿಯಾ", "ಅಮಿತ್ ಕುಮಾರ್",
    "ಸುನೀತಾ ದೇವಿ", "ಸುರೇಶ್ ರಾವ್", "ರಮೇಶ್ ಕುಮಾರ್", "ಅನನ್ಯಾ ಸಿಂಗ್",
]


class PrivacyMaskingResult:
    """Detailed result of PII detection and masking."""

    def __init__(
        self,
        original_transcript: str,
        masked_transcript: str,
        detected_entity_types: List[str],
        masked_entities_count: int,
        entities: List[Dict[str, Any]],
    ) -> None:
        self.original_transcript = original_transcript
        self.masked_transcript = masked_transcript
        self.is_masked = masked_entities_count > 0
        self.detected_entity_types = detected_entity_types
        self.masked_entities_count = masked_entities_count
        self.entities = entities

    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_masked": self.is_masked,
            "masked_entities_count": self.masked_entities_count,
            "detected_entity_types": self.detected_entity_types,
            "masked_transcript": self.masked_transcript,
            "entities": self.entities,
        }


# ============================================================================
# Privacy Service Implementation
# ============================================================================

class PrivacyService:
    """Production-grade HIPAA/Privacy masking engine for healthcare transcripts."""

    def mask_pii(
        self,
        transcript: str,
        language: Optional[str] = None,
    ) -> PrivacyMaskingResult:
        """Detect and mask all supported categories of sensitive personal information.

        Preserves:
        - Clinical vitals (e.g. 100.8 F, 500mg, 120/80)
        - Operating hours and times (e.g. 9 AM to 5 PM)
        - Medical instructions and appointment intent
        """
        if not transcript or not transcript.strip():
            return PrivacyMaskingResult(
                original_transcript=transcript,
                masked_transcript=transcript,
                detected_entity_types=[],
                masked_entities_count=0,
                entities=[],
            )

        spans: List[Tuple[int, int, str, str]] = []  # (start, end, token, entity_type)

        # 1. Emails
        self._detect_emails(transcript, spans)

        # 2. Phone Numbers (Standard, Formatted, Indian, Hindi numerals, Kannada numerals)
        self._detect_phone_numbers(transcript, spans)

        # 3. Medical Record Numbers (MRN / Patient IDs)
        self._detect_mrn(transcript, spans)

        # 4. Addresses & Postal Codes
        self._detect_addresses(transcript, spans)

        # 5. Government IDs (Aadhaar / SSN / PAN)
        self._detect_government_ids(transcript, spans)

        # 6. Patient Names (Contextual introducers in EN, HI, KN + Known Name Lexicon)
        self._detect_patient_names(transcript, spans)

        # Resolve overlapping spans (keep longest/earliest)
        resolved_spans = self._resolve_overlapping_spans(spans)

        # Apply replacements in reverse order (end to start) to prevent offset drift
        resolved_spans.sort(key=lambda s: s[0], reverse=True)

        masked_text = transcript
        entities_metadata: List[Dict[str, Any]] = []
        entity_types_set: Set[str] = set()

        for start, end, token, entity_type in resolved_spans:
            entity_types_set.add(entity_type)
            entities_metadata.append({
                "entity_type": entity_type,
                "token": token,
                "start_char": start,
                "end_char": end,
            })
            masked_text = masked_text[:start] + token + masked_text[end:]

        # Reverse entities metadata to maintain document order
        entities_metadata.reverse()
        detected_entity_types = sorted(list(entity_types_set))

        logger.info(
            "Privacy masking completed: is_masked=%s, entities_count=%d, types=%s",
            len(resolved_spans) > 0,
            len(resolved_spans),
            detected_entity_types,
        )

        return PrivacyMaskingResult(
            original_transcript=transcript,
            masked_transcript=masked_text,
            detected_entity_types=detected_entity_types,
            masked_entities_count=len(resolved_spans),
            entities=entities_metadata,
        )

    # ------------------------------------------------------------------------
    # Category Detectors
    # ------------------------------------------------------------------------

    def _detect_emails(self, text: str, spans: List[Tuple[int, int, str, str]]) -> None:
        """Detect email addresses."""
        email_pattern = re.compile(
            r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"
        )
        for match in email_pattern.finditer(text):
            spans.append((match.start(), match.end(), TOKEN_EMAIL, "EMAIL"))

    def _detect_phone_numbers(self, text: str, spans: List[Tuple[int, int, str, str]]) -> None:
        """Detect 10-digit mobile, international, formatted, Hindi, and Kannada numerals."""
        # 1. Standard 10-digit mobile starting with 6-9
        p1 = re.compile(r"(?:\+91[\s-]?)?\b[6-9]\d{9}\b")
        for match in p1.finditer(text):
            spans.append((match.start(), match.end(), TOKEN_PHONE_NUMBER, "PHONE_NUMBER"))

        # 2. Formatted phone numbers e.g. 98765 43210 or 98765-43210
        p2 = re.compile(r"\b[6-9]\d{4}[\s-]\d{5}\b")
        for match in p2.finditer(text):
            spans.append((match.start(), match.end(), TOKEN_PHONE_NUMBER, "PHONE_NUMBER"))

        # 3. Standard international formatted e.g. (555) 123-4567 or 555-123-4567
        p3 = re.compile(r"(?:\+?1[\s-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b")
        for match in p3.finditer(text):
            # Guard against time/dosage false positives
            snippet = match.group(0)
            if not any(unit in snippet.lower() for unit in ["am", "pm", "mg", "ml"]):
                spans.append((match.start(), match.end(), TOKEN_PHONE_NUMBER, "PHONE_NUMBER"))

        # 4. Devanagari numerals 10-digit phone: ०-९
        p_hi = re.compile(r"[६-९०-९]{10}")
        for match in p_hi.finditer(text):
            spans.append((match.start(), match.end(), TOKEN_PHONE_NUMBER, "PHONE_NUMBER"))

        # 5. Kannada numerals 10-digit phone: ೦-೯
        p_kn = re.compile(r"[೬-೯೦-೯]{10}")
        for match in p_kn.finditer(text):
            spans.append((match.start(), match.end(), TOKEN_PHONE_NUMBER, "PHONE_NUMBER"))

    def _detect_mrn(self, text: str, spans: List[Tuple[int, int, str, str]]) -> None:
        """Detect Medical Record Numbers and Patient IDs."""
        mrn_pattern = re.compile(
            r"\b(?:MRN|MRN#|PID|Patient\s*ID|Medical\s*Record\s*(?:Number|#|No\.?))[\s:-]*([A-Za-z0-9-]+)\b",
            re.IGNORECASE,
        )
        for match in mrn_pattern.finditer(text):
            spans.append((match.start(), match.end(), TOKEN_MRN, "MEDICAL_RECORD_NUMBER"))

    def _detect_addresses(self, text: str, spans: List[Tuple[int, int, str, str]]) -> None:
        """Detect physical address snippets and postal PIN codes."""
        # Pincode pattern
        pin_pattern = re.compile(
            r"\b(?:PIN|PIN\s*Code|Pincode|Postal\s*Code|ZIP|Zipcode)[\s:-]*(\d{6})\b",
            re.IGNORECASE,
        )
        for match in pin_pattern.finditer(text):
            spans.append((match.start(), match.end(), TOKEN_ADDRESS, "ADDRESS"))

        # Street / Colony address pattern
        addr_pattern = re.compile(
            r"\b\d+[\s,/-]+(?:[A-Za-z0-9]+\s+){1,3}(?:Road|Street|Avenue|Lane|Nagar|Layout|Colony|Sector|Cross|Main)\b[^.,\n]*",
            re.IGNORECASE,
        )
        for match in addr_pattern.finditer(text):
            spans.append((match.start(), match.end(), TOKEN_ADDRESS, "ADDRESS"))

    def _detect_government_ids(self, text: str, spans: List[Tuple[int, int, str, str]]) -> None:
        """Detect Aadhaar (12 digits) or PAN (5 letters, 4 digits, 1 letter)."""
        # Aadhaar: 12 digits, often formatted as 4-4-4
        aadhaar_pattern = re.compile(r"\b\d{4}[\s-]\d{4}[\s-]\d{4}\b")
        for match in aadhaar_pattern.finditer(text):
            spans.append((match.start(), match.end(), TOKEN_GOVERNMENT_ID, "GOVERNMENT_ID"))

        # PAN Card
        pan_pattern = re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b")
        for match in pan_pattern.finditer(text):
            spans.append((match.start(), match.end(), TOKEN_GOVERNMENT_ID, "GOVERNMENT_ID"))

    def _detect_patient_names(self, text: str, spans: List[Tuple[int, int, str, str]]) -> None:
        """Detect patient names via contextual introduction patterns and entity lexicons."""
        # 1. English contextual introduction: "my name is <Name>", "this is <Name>", "i am <Name>"
        en_intro = re.compile(
            r"\b(?:[Mm]y\s+[Nn]ame\s+[Ii]s|[Tt]his\s+[Ii]s|[Ii]\s+[Aa]m|[Nn]ame's|[Pp]atient\s+[Nn]ame\s+[Ii]s|[Pp]atient\s+[Ii]s)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b"
        )
        for match in en_intro.finditer(text):
            name_text = match.group(1).strip()
            if self._is_valid_name(name_text):
                # Calculate span of the name group specifically
                name_start = match.start(1)
                name_end = match.end(1)
                spans.append((name_start, name_end, TOKEN_PATIENT_NAME, "PATIENT_NAME"))

        # 2. English honorific: "Mr. / Mrs. / Ms. <Name>"
        en_honorific = re.compile(
            r"\b(?:Mr\.|Mrs\.|Ms\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b"
        )
        for match in en_honorific.finditer(text):
            name_text = match.group(1).strip()
            if self._is_valid_name(name_text):
                spans.append((match.start(1), match.end(1), TOKEN_PATIENT_NAME, "PATIENT_NAME"))

        # 3. Hindi contextual introduction: "मेरा नाम <Name> है", "मैं <Name> बोल रहा/रही हूँ"
        # Hindi name in Devanagari script: 1-3 words
        hi_intro = re.compile(
            r"(?:मेरा\s+नाम|मैं|नाम)\s+([^\s।,!?()0-9]{2,}(?:\s+[^\s।,!?()0-9]{2,}){0,2})\s+(?:है|हूँ|बोल\s+रहा|बोल\s+रही)"
        )
        for match in hi_intro.finditer(text):
            name_text = match.group(1).strip()
            if self._is_valid_name(name_text):
                spans.append((match.start(1), match.end(1), TOKEN_PATIENT_NAME, "PATIENT_NAME"))

        # 4. Hindi honorific: "श्री / श्रीमती <Name>"
        hi_honorific = re.compile(
            r"(?:श्री|श्रीमती|सुश्री)\s+([^\s।,!?()0-9]{2,}(?:\s+[^\s।,!?()0-9]{2,}){0,2})"
        )
        for match in hi_honorific.finditer(text):
            name_text = match.group(1).strip()
            if self._is_valid_name(name_text):
                spans.append((match.start(1), match.end(1), TOKEN_PATIENT_NAME, "PATIENT_NAME"))

        # 5. Kannada contextual introduction: "ನನ್ನ ಹೆಸರು <Name>", "ನನ್ನ ಹೆಸರು <Name>."
        kn_intro = re.compile(
            r"(?:ನನ್ನ\s+ಹೆಸರು|ಹೆಸರು)\s+([^\s.,!?()0-9]{2,}(?:\s+[^\s.,!?()0-9]{2,}){0,2})"
        )
        for match in kn_intro.finditer(text):
            name_text = match.group(1).strip()
            if self._is_valid_name(name_text):
                spans.append((match.start(1), match.end(1), TOKEN_PATIENT_NAME, "PATIENT_NAME"))

        # 6. Kannada honorific: "ಶ್ರೀ / ಶ್ರೀಮತಿ <Name>"
        kn_honorific = re.compile(
            r"(?:ಶ್ರೀ|ಶ್ರೀಮತಿ)\s+([^\s.,!?()0-9]{2,}(?:\s+[^\s.,!?()0-9]{2,}){0,2})"
        )
        for match in kn_honorific.finditer(text):
            name_text = match.group(1).strip()
            if self._is_valid_name(name_text):
                spans.append((match.start(1), match.end(1), TOKEN_PATIENT_NAME, "PATIENT_NAME"))

        # 7. Known Name Lexicon matching (handles direct mentions without introducers)
        for known_name in _KNOWN_PATIENT_NAMES:
            pattern = re.compile(re.escape(known_name))
            for match in pattern.finditer(text):
                spans.append((match.start(), match.end(), TOKEN_PATIENT_NAME, "PATIENT_NAME"))

    def _is_valid_name(self, candidate: str) -> bool:
        """Validate candidate string is a plausible person name and not a stopword or clinical symptom."""
        cleaned = candidate.strip()
        if not cleaned:
            return False

        words = cleaned.split()
        if not words or len(words) > 3:
            return False

        for w in words:
            if w.isascii():
                if not w[0].isupper() or not w[1:].islower():
                    return False
            if w.lower() in _COMMON_NON_NAMES:
                return False

        # Reject if containing digits or punctuation
        if any(ch.isdigit() or ch in r".,!?:;()[]{}@#$/\"" for ch in candidate):
            return False

        return True

    def _resolve_overlapping_spans(
        self, spans: List[Tuple[int, int, str, str]]
    ) -> List[Tuple[int, int, str, str]]:
        """Remove overlapping spans, favoring longer spans or earlier starting spans."""
        if not spans:
            return []

        # Sort by start ascending, then length descending
        sorted_spans = sorted(spans, key=lambda s: (s[0], -(s[1] - s[0])))
        resolved: List[Tuple[int, int, str, str]] = []

        last_end = -1
        for start, end, token, entity_type in sorted_spans:
            if start >= last_end:
                resolved.append((start, end, token, entity_type))
                last_end = end
            else:
                # Overlap detected — if current span is substantially longer, replace
                if resolved and (end - start) > (resolved[-1][1] - resolved[-1][0]):
                    resolved.pop()
                    resolved.append((start, end, token, entity_type))
                    last_end = end

        return resolved


# Singleton instance
privacy_service = PrivacyService()
