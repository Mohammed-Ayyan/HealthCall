"""Automated test suite for Phase 7: Multilingual Processing & Privacy/PII Masking.

Covers:
1. TEST A — English: Personal info masked ([PATIENT_NAME], [PHONE_NUMBER]) and appointment intent preserved.
2. TEST B — Hindi: Hindi script preserved, personal info masked, appointment intent identified.
3. TEST C — Kannada: Kannada script preserved, personal info masked, appointment intent identified.
4. TEST D — No Personal Information: Ordinary clinic hours ("9 AM to 5 PM") NOT unnecessarily masked.
5. TEST E — Regression: English transcription, processing, action-item extraction, and staff commitment detection continue to work.
6. Multi-category PII redaction: Email, Phone, MRN, Address, Government ID, Patient Name.
7. Clinical vitals (dosages, temperatures) preservation without false-positive masking.
8. API endpoints:
   - POST /api/v1/detect-language
   - POST /api/v1/privacy/mask
   - POST /api/v1/analyze-transcript with mask_pii
"""

import json
import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.models.schemas import CallIntent, CallPriority, CallSentiment
from app.services.intelligence_service import (
    IntelligenceService,
    intelligence_service,
)
from app.services.multilingual_service import (
    check_emergency_multilingual,
    classify_intent_multilingual,
    detect_language,
    extract_actions_multilingual,
    extract_commitments_multilingual,
    summarize_multilingual,
)
from app.services.privacy_service import (
    TOKEN_ADDRESS,
    TOKEN_EMAIL,
    TOKEN_GOVERNMENT_ID,
    TOKEN_MRN,
    TOKEN_PATIENT_NAME,
    TOKEN_PHONE_NUMBER,
    privacy_service,
)
from app.services.transcript_processing_service import transcript_processing_service


client = TestClient(app)


# Mock client for local intelligence tests without live Ollama dependency
class MockLLMClient:
    def __init__(self, responses=None):
        self.responses = list(responses) if responses else []
        self.model_name = "mock-phase7-llm"

    def generate(self, prompt: str, system=None) -> str:
        if self.responses:
            return self.responses.pop(0)
        return json.dumps({
            "intent": {"label": "Appointment Request", "evidence": "book an appointment"},
            "summary": "Patient calling to book an appointment.",
            "sentiment": {"label": "Neutral", "explanation": "Calm request"},
            "priority": {"level": "MEDIUM", "reason": "Standard appointment booking"},
        })


# ============================================================================
# 1. TEST A — ENGLISH (User Requirement)
# ============================================================================

def test_a_english_pii_masked_and_intent_preserved():
    """TEST A: English conversation with patient name and phone number.

    Input: "Hello, my name is Rahul Sharma. My phone number is 9876543210. I need to book an appointment."
    Verify: Supported personal info is masked and appointment intent remains understandable.
    """
    raw_input = "Hello, my name is Rahul Sharma. My phone number is 9876543210. I need to book an appointment."

    # 1. Direct Privacy Service verification
    mask_result = privacy_service.mask_pii(raw_input, language="en")
    assert mask_result.is_masked is True
    assert mask_result.masked_entities_count >= 2
    assert "PATIENT_NAME" in mask_result.detected_entity_types
    assert "PHONE_NUMBER" in mask_result.detected_entity_types
    assert "Rahul Sharma" not in mask_result.masked_transcript
    assert "9876543210" not in mask_result.masked_transcript
    assert TOKEN_PATIENT_NAME in mask_result.masked_transcript
    assert TOKEN_PHONE_NUMBER in mask_result.masked_transcript
    assert "I need to book an appointment" in mask_result.masked_transcript

    # 2. Intelligence pipeline verification
    service = IntelligenceService(MockLLMClient())
    res = service.analyze(transcript=raw_input, language="en", mask_pii=True)

    assert res.success is True
    assert res.language == "en"
    assert res.intent.label == CallIntent.APPOINTMENT_REQUEST.value
    assert res.masked_transcript is not None
    assert "Rahul Sharma" not in res.masked_transcript
    assert "9876543210" not in res.masked_transcript
    assert res.original_transcript == raw_input
    assert res.privacy_masking is not None
    assert res.privacy_masking.is_masked is True
    assert res.privacy_masking.masked_entities_count >= 2


# ============================================================================
# 2. TEST B — HINDI (User Requirement)
# ============================================================================

def test_b_hindi_pii_masked_and_intent_preserved():
    """TEST B: Hindi conversation with Hindi name and phone number.

    Input: "मेरा नाम राहुल शर्मा है। मेरा फोन नंबर 9876543210 है। मुझे डॉक्टर से अपॉइंटमेंट लेना है।"
    Verify: Preserves Hindi text, masks detectable personal info, and identifies appointment intent.
    """
    raw_input = "मेरा नाम राहुल शर्मा है। मेरा फोन नंबर 9876543210 है। मुझे डॉक्टर से अपॉइंटमेंट लेना है।"

    # 1. Language detection
    lang, conf, script = detect_language(raw_input)
    assert lang == "hi"
    assert script == "Devanagari"
    assert conf >= 0.85

    # 2. Direct Privacy Service verification
    mask_result = privacy_service.mask_pii(raw_input, language="hi")
    assert mask_result.is_masked is True
    assert mask_result.masked_entities_count >= 2
    assert "PATIENT_NAME" in mask_result.detected_entity_types
    assert "PHONE_NUMBER" in mask_result.detected_entity_types
    assert "राहुल शर्मा" not in mask_result.masked_transcript
    assert "9876543210" not in mask_result.masked_transcript
    assert TOKEN_PATIENT_NAME in mask_result.masked_transcript
    assert TOKEN_PHONE_NUMBER in mask_result.masked_transcript
    # Preserves Devanagari appointment request
    assert "अपॉइंटमेंट" in mask_result.masked_transcript

    # 3. Intelligence pipeline verification
    service = IntelligenceService(MockLLMClient())
    res = service.analyze(transcript=raw_input, language="hi", mask_pii=True)

    assert res.success is True
    assert res.language == "hi"
    assert res.intent.label == CallIntent.APPOINTMENT_REQUEST.value
    assert "राहुल शर्मा" not in (res.masked_transcript or "")
    assert "9876543210" not in (res.masked_transcript or "")
    assert res.original_transcript == raw_input
    assert res.privacy_masking is not None
    assert res.privacy_masking.is_masked is True
    assert len(res.actions) >= 1
    assert "Scheduling" in res.actions[0].department


# ============================================================================
# 3. TEST C — KANNADA (User Requirement)
# ============================================================================

def test_c_kannada_pii_masked_and_intent_preserved():
    """TEST C: Kannada conversation with Kannada name and phone number.

    Input: "ನನ್ನ ಹೆಸರು ರಾಹುಲ್ ಶರ್ಮಾ. ನನ್ನ ಫೋನ್ ಸಂಖ್ಯೆ 9876543210. ನನಗೆ ವೈದ್ಯರ ಅಪಾಯಿಂಟ್ಮೆಂಟ್ ಬೇಕು."
    Verify: Preserves Kannada text, masks detectable personal info, and identifies appointment intent.
    """
    raw_input = "ನನ್ನ ಹೆಸರು ರಾಹುಲ್ ಶರ್ಮಾ. ನನ್ನ ಫೋನ್ ಸಂಖ್ಯೆ 9876543210. ನನಗೆ ವೈದ್ಯರ ಅಪಾಯಿಂಟ್ಮೆಂಟ್ ಬೇಕು."

    # 1. Language detection
    lang, conf, script = detect_language(raw_input)
    assert lang == "kn"
    assert script == "Kannada"
    assert conf >= 0.85

    # 2. Direct Privacy Service verification
    mask_result = privacy_service.mask_pii(raw_input, language="kn")
    assert mask_result.is_masked is True
    assert mask_result.masked_entities_count >= 2
    assert "PATIENT_NAME" in mask_result.detected_entity_types
    assert "PHONE_NUMBER" in mask_result.detected_entity_types
    assert "ರಾಹುಲ್ ಶರ್ಮಾ" not in mask_result.masked_transcript
    assert "9876543210" not in mask_result.masked_transcript
    assert TOKEN_PATIENT_NAME in mask_result.masked_transcript
    assert TOKEN_PHONE_NUMBER in mask_result.masked_transcript
    # Preserves Kannada appointment request
    assert "ಅಪಾಯಿಂಟ್ಮೆಂಟ್" in mask_result.masked_transcript

    # 3. Intelligence pipeline verification
    service = IntelligenceService(MockLLMClient())
    res = service.analyze(transcript=raw_input, language="kn", mask_pii=True)

    assert res.success is True
    assert res.language == "kn"
    assert res.intent.label == CallIntent.APPOINTMENT_REQUEST.value
    assert "ರಾಹುಲ್ ಶರ್ಮಾ" not in (res.masked_transcript or "")
    assert "9876543210" not in (res.masked_transcript or "")
    assert res.original_transcript == raw_input
    assert res.privacy_masking is not None
    assert res.privacy_masking.is_masked is True
    assert len(res.actions) >= 1
    assert "Scheduling" in res.actions[0].department


# ============================================================================
# 4. TEST D — NO PERSONAL INFORMATION (User Requirement)
# ============================================================================

def test_d_no_personal_information_preserves_ordinary_text():
    """TEST D: Ordinary facility hours without personal information.

    Input: "The clinic is open from 9 AM to 5 PM."
    Verify: Ordinary text and timings are NOT unnecessarily masked.
    """
    raw_input = "The clinic is open from 9 AM to 5 PM."

    mask_result = privacy_service.mask_pii(raw_input, language="en")
    assert mask_result.is_masked is False
    assert mask_result.masked_entities_count == 0
    assert len(mask_result.detected_entity_types) == 0
    assert mask_result.masked_transcript == raw_input
    assert "9 AM" in mask_result.masked_transcript
    assert "5 PM" in mask_result.masked_transcript


# ============================================================================
# 5. TEST E — REGRESSION (User Requirement)
# ============================================================================

def test_e_regression_phases_1_to_6_continue_working():
    """TEST E: Verify Phases 1-6 pipelines continue to operate seamlessly.

    - Phase 1 validation
    - Phase 2 audio config & supported languages
    - Phase 3 transcript processing (normalization, segmentation, metadata)
    - Phase 4 intelligence intent & safety guardrail
    - Phase 5 action-item extraction
    - Phase 6 staff commitment detection
    """
    # 1. Phase 1 validation endpoint
    val_res = client.post(
        "/api/v1/transcript/validate",
        json={"transcript": "Routine follow-up call after blood test.", "language": "en"},
    )
    assert val_res.status_code == 200
    assert val_res.json()["status"] == "valid"

    # 2. Phase 2 supported languages
    assert "en" in settings.SUPPORTED_AUDIO_LANGUAGES
    assert "hi" in settings.SUPPORTED_AUDIO_LANGUAGES
    assert "kn" in settings.SUPPORTED_AUDIO_LANGUAGES

    # 3. Phase 3 transcript processing
    proc = transcript_processing_service.process(
        transcript="Hello doctor. I need a follow-up. Thank you.",
        language="en",
    )
    assert proc.success is True
    assert len(proc.sentences) >= 2
    assert proc.metadata.character_count > 0

    # 4. Phase 4 intelligence analysis
    service = IntelligenceService(
        MockLLMClient([
            json.dumps({
                "intent": {"label": "Follow-up Request", "evidence": "I need a follow-up"},
                "summary": "Patient requesting follow-up consultation.",
                "sentiment": {"label": "Neutral", "explanation": "Polite follow-up query"},
                "priority": {"level": "HIGH", "reason": "Follow-up care"},
            })
        ])
    )
    analysis = service.analyze("Hello doctor. I need a follow-up. Thank you.", language="en", mask_pii=False)
    assert analysis.intent.label == CallIntent.FOLLOW_UP_REQUEST.value

    # 5. Phase 5 action extraction
    actions = extract_actions_multilingual("Patient needs to book an appointment with cardiologist.", language="en")
    assert len(actions) >= 1
    assert "Schedule" in actions[0].task

    # 6. Phase 6 staff commitment detection
    commitments = extract_commitments_multilingual(
        "I will call you back with the lab results tomorrow morning.",
        language="en",
    )
    assert len(commitments) >= 1
    assert "Call patient back" in commitments[0].commitment


# ============================================================================
# 6. Multi-Category PII Redaction Coverage
# ============================================================================

def test_multi_category_pii_masking():
    """Verify redaction of Email, MRN, Address/PIN, and Government IDs."""
    test_text = (
        "Patient Priya Patel contacted clinic. Email is priya.patel@healthmail.com. "
        "Her MRN is MRN-98421. She resides at 42 MG Road, Indiranagar, Pincode 560038. "
        "Aadhaar is 1234 5678 9012."
    )

    mask_result = privacy_service.mask_pii(test_text, language="en")

    assert mask_result.is_masked is True
    assert "EMAIL" in mask_result.detected_entity_types
    assert "MEDICAL_RECORD_NUMBER" in mask_result.detected_entity_types
    assert "ADDRESS" in mask_result.detected_entity_types
    assert "GOVERNMENT_ID" in mask_result.detected_entity_types
    assert "PATIENT_NAME" in mask_result.detected_entity_types

    assert "priya.patel@healthmail.com" not in mask_result.masked_transcript
    assert "MRN-98421" not in mask_result.masked_transcript
    assert "1234 5678 9012" not in mask_result.masked_transcript
    assert TOKEN_EMAIL in mask_result.masked_transcript
    assert TOKEN_MRN in mask_result.masked_transcript
    assert TOKEN_GOVERNMENT_ID in mask_result.masked_transcript


def test_clinical_vitals_not_falsely_masked():
    """Verify that clinical vitals (temperature, dosage, BP) are NOT masked as phone numbers or addresses."""
    text = "Patient took Paracetamol 500mg. Temperature is 101.4 F. Blood pressure is 120/80 mmHg."
    mask_result = privacy_service.mask_pii(text, language="en")

    # None of the clinical vitals should be masked
    assert "500mg" in mask_result.masked_transcript
    assert "101.4 F" in mask_result.masked_transcript
    assert "120/80" in mask_result.masked_transcript
    assert mask_result.masked_entities_count == 0


# ============================================================================
# 7. HTTP API Endpoint Tests
# ============================================================================

def test_detect_language_api():
    """Verify POST /api/v1/detect-language endpoint across EN, HI, KN."""
    # English
    r_en = client.post("/api/v1/detect-language", json={"transcript": "I need to book a doctor appointment."})
    assert r_en.status_code == 200
    assert r_en.json()["language"] == "en"
    assert r_en.json()["script"] == "Latin"

    # Hindi
    r_hi = client.post("/api/v1/detect-language", json={"transcript": "मुझे डॉक्टर से अपॉइंटमेंट लेना है।"})
    assert r_hi.status_code == 200
    assert r_hi.json()["language"] == "hi"
    assert r_hi.json()["script"] == "Devanagari"

    # Kannada
    r_kn = client.post("/api/v1/detect-language", json={"transcript": "ನನಗೆ ವೈದ್ಯರ ಅಪಾಯಿಂಟ್ಮೆಂಟ್ ಬೇಕು."})
    assert r_kn.status_code == 200
    assert r_kn.json()["language"] == "kn"
    assert r_kn.json()["script"] == "Kannada"


def test_privacy_mask_api():
    """Verify POST /api/v1/privacy/mask endpoint."""
    payload = {
        "transcript": "Hello, my name is Rahul Sharma. Call me at 9876543210.",
        "language": "en",
    }
    r = client.post("/api/v1/privacy/mask", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    assert data["is_masked"] is True
    assert data["masked_entities_count"] >= 2
    assert "Rahul Sharma" not in data["masked_transcript"]
    assert "9876543210" not in data["masked_transcript"]
    assert data["original_transcript"] == payload["transcript"]
    assert len(data["entities"]) >= 2


def test_multilingual_actions_and_commitments_hindi_kannada():
    """Verify actions and commitments in Hindi and Kannada transcripts."""
    # Hindi
    hi_text = "मुझे डॉक्टर से अपॉइंटमेंट लेना है। हम आपको फोन करेंगे।"
    hi_actions = extract_actions_multilingual(hi_text, language="hi")
    hi_commits = extract_commitments_multilingual(hi_text, language="hi")
    assert len(hi_actions) >= 1
    assert len(hi_commits) >= 1

    # Kannada
    kn_text = "ನನಗೆ ವೈದ್ಯರ ಅಪಾಯಿಂಟ್ಮೆಂಟ್ ಬೇಕು. ನಾವು ನಿಮಗೆ ಕರೆ ಮಾಡುತ್ತೇವೆ."
    kn_actions = extract_actions_multilingual(kn_text, language="kn")
    kn_commits = extract_commitments_multilingual(kn_text, language="kn")
    assert len(kn_actions) >= 1
    assert len(kn_commits) >= 1
