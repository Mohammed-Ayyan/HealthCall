"""Automated tests for Phase 3 Transcript Processing Engine.

Covers (all test IDs reference the Phase 3 spec):
 1.  Valid English transcript — full pipeline round-trip
 2.  Valid Hindi transcript — Unicode preserved, not translated
 3.  Valid Kannada transcript — Unicode preserved, not translated
 4.  Empty transcript rejected at API level (HTTP 422)
 5.  Whitespace-only transcript rejected at API level (HTTP 422)
 6.  Leading / trailing whitespace normalised
 7.  Repeated spaces collapsed
 8.  Excessive blank lines collapsed
 9.  Sentence segmentation — basic two-sentence English input
10.  Sentence ordering preserved
11.  Question and exclamation marks treated as sentence boundaries
12.  Unicode character counting (non-ASCII script)
13.  Character-count calculated from normalized transcript
14.  Word-count calculated correctly
15.  Sentence-count matches actual segments
16.  Maximum transcript-length validation (HTTP 422)
17.  Negation word "not" preserved exactly
18.  Negation words "never", "without", "denies" preserved
19.  Original transcript preserved unchanged
20.  Sentence indices are sequential and zero-based
21.  Character offsets reference normalized_transcript
22.  Phase 1 existing tests not broken (health, validation endpoints)
23.  Phase 2 existing behaviour not broken (transcription endpoint schema)
24.  Service can be called directly (unit test without HTTP layer)
25.  Hindi danda (।) treated as a sentence boundary
26.  Abbreviation "Dr." does not trigger spurious sentence split
27.  response schema contains expected top-level keys
28.  No intent / summary / sentiment / priority / actions in response
"""

import sys
from pathlib import Path
from typing import Any
from unittest.mock import MagicMock

# Ensure ai-engine root is on sys.path
ai_engine_dir = Path(__file__).resolve().parent.parent
if str(ai_engine_dir) not in sys.path:
    sys.path.insert(0, str(ai_engine_dir))

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.services.transcript_processing_service import (
    TranscriptProcessingError,
    TranscriptProcessingService,
    normalize_transcript,
    segment_sentences,
    transcript_processing_service,
)

PROCESS_URL = f"{settings.API_PREFIX}/process-transcript"
VALIDATE_URL = f"{settings.API_PREFIX}/transcript/validate"
HEALTH_URL = f"{settings.API_PREFIX}/health"
TRANSCRIBE_URL = f"{settings.API_PREFIX}/transcribe"


# ============================================================================
# Helper: realistic (fictional) healthcare examples
# ============================================================================

EN_SIMPLE = (
    "Hello, I need to book an appointment for tomorrow. "
    "Certainly, I will schedule it for you."
)

EN_MULTI = (
    "Good morning, this is Dr. Smith from the cardiology department. "
    "The patient does not have chest pain at this time. "
    "She has never experienced shortness of breath before. "
    "Please schedule a follow-up in two weeks."
)

HI_SAMPLE = (
    "नमस्ते, मुझे कल के लिए अपॉइंटमेंट बुक करनी है। "
    "बिल्कुल, मैं आपके लिए इसे शेड्यूल कर दूंगा।"
)

KN_SAMPLE = (
    "ನಮಸ್ಕಾರ, ನನಗೆ ನಾಳೆಗೆ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಬೇಕು. "
    "ಖಂಡಿತವಾಗಿ, ನಾನು ಅದನ್ನು ನಿಮಗಾಗಿ ನಿಗದಿಪಡಿಸುತ್ತೇನೆ."
)


# ============================================================================
# 1. Valid English transcript — API round-trip
# ============================================================================

def test_valid_english_transcript_succeeds(client: TestClient) -> None:
    """Requirement 1: Valid English transcript returns HTTP 200 with expected shape."""
    payload = {"transcript": EN_SIMPLE, "language": "en"}
    response = client.post(PROCESS_URL, json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["language"] == "en"


# ============================================================================
# 2. Valid Hindi transcript — Unicode preserved
# ============================================================================

def test_valid_hindi_transcript_accepted(client: TestClient) -> None:
    """Requirement 2: Hindi transcript returns 200; original script not transliterated."""
    payload = {"transcript": HI_SAMPLE, "language": "hi"}
    response = client.post(PROCESS_URL, json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["language"] == "hi"
    # Verify Devanagari script was preserved, not transliterated
    assert "नमस्ते" in data["original_transcript"]
    assert "नमस्ते" in data["normalized_transcript"]


# ============================================================================
# 3. Valid Kannada transcript — Unicode preserved
# ============================================================================

def test_valid_kannada_transcript_accepted(client: TestClient) -> None:
    """Requirement 3: Kannada transcript returns 200; original script preserved."""
    payload = {"transcript": KN_SAMPLE, "language": "kn"}
    response = client.post(PROCESS_URL, json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["language"] == "kn"
    assert "ನಮಸ್ಕಾರ" in data["original_transcript"]
    assert "ನಮಸ್ಕಾರ" in data["normalized_transcript"]


# ============================================================================
# 4. Empty transcript rejected
# ============================================================================

def test_empty_transcript_rejected(client: TestClient) -> None:
    """Requirement 4: Empty transcript is rejected with HTTP 422."""
    response = client.post(PROCESS_URL, json={"transcript": "", "language": "en"})
    assert response.status_code == 422
    data = response.json()
    assert data["error"] == "Validation Error"


# ============================================================================
# 5. Whitespace-only transcript rejected
# ============================================================================

def test_whitespace_only_transcript_rejected(client: TestClient) -> None:
    """Requirement 5: Whitespace-only transcript is rejected with HTTP 422."""
    response = client.post(PROCESS_URL, json={"transcript": "   \n\t  ", "language": "en"})
    assert response.status_code == 422
    data = response.json()
    assert data["error"] == "Validation Error"


# ============================================================================
# 6. Leading / trailing whitespace normalized
# ============================================================================

def test_leading_trailing_whitespace_normalized() -> None:
    """Requirement 6: normalize_transcript strips leading and trailing whitespace."""
    raw = "  \n  Patient called about fever.  \n  "
    result = normalize_transcript(raw)
    assert not result.startswith(" ")
    assert not result.endswith(" ")
    assert not result.startswith("\n")
    assert not result.endswith("\n")
    assert "Patient called about fever." in result


def test_api_leading_trailing_whitespace(client: TestClient) -> None:
    """Requirement 6 (API): normalized_transcript has no leading/trailing whitespace."""
    raw = "   Hello, I need an appointment.   "
    response = client.post(PROCESS_URL, json={"transcript": raw, "language": "en"})
    assert response.status_code == 200
    data = response.json()
    assert data["normalized_transcript"] == data["normalized_transcript"].strip()
    # original_transcript is what arrived after the schema validator stripped it
    assert data["original_transcript"] is not None


# ============================================================================
# 7. Repeated spaces collapsed
# ============================================================================

def test_repeated_spaces_collapsed() -> None:
    """Requirement 7: normalize_transcript collapses internal runs of spaces."""
    raw = "Patient  had   a  fever."
    result = normalize_transcript(raw)
    assert "  " not in result
    assert "Patient had a fever." == result


def test_tabs_normalized_to_spaces() -> None:
    """Requirement 7: Tabs in input are converted to spaces."""
    raw = "Patient\thad\ta\tfever."
    result = normalize_transcript(raw)
    assert "\t" not in result
    assert "Patient had a fever." == result


# ============================================================================
# 8. Excessive blank lines collapsed
# ============================================================================

def test_excessive_blank_lines_collapsed() -> None:
    """Requirement 8: Three or more consecutive blank lines become a single blank line."""
    raw = "First sentence.\n\n\n\n\nSecond sentence."
    result = normalize_transcript(raw)
    assert "\n\n\n" not in result
    assert "First sentence." in result
    assert "Second sentence." in result


# ============================================================================
# 9. Sentence segmentation — two English sentences
# ============================================================================

def test_sentence_segmentation_basic() -> None:
    """Requirement 9: Two clear English sentences are split into exactly two segments."""
    text = "Hello, I need an appointment tomorrow. I also need a prescription refill."
    segments = segment_sentences(text)
    assert len(segments) == 2
    assert segments[0][0] == "Hello, I need an appointment tomorrow."
    assert segments[1][0] == "I also need a prescription refill."


def test_api_sentence_segmentation_basic(client: TestClient) -> None:
    """Requirement 9 (API): sentence list has correct texts."""
    payload = {
        "transcript": "Hello, I need an appointment tomorrow. I also need a prescription refill.",
        "language": "en",
    }
    response = client.post(PROCESS_URL, json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["sentences"]) == 2
    assert data["sentences"][0]["text"] == "Hello, I need an appointment tomorrow."
    assert data["sentences"][1]["text"] == "I also need a prescription refill."


# ============================================================================
# 10. Sentence order preserved
# ============================================================================

def test_sentence_order_preserved() -> None:
    """Requirement 10: Sentences appear in the same order as in the input."""
    text = "First. Second. Third."
    segments = segment_sentences(text)
    texts = [s[0] for s in segments]
    assert texts == ["First.", "Second.", "Third."]


def test_api_sentence_order_preserved(client: TestClient) -> None:
    """Requirement 10 (API): sentence indices are in correct order."""
    payload = {"transcript": "First sentence. Second sentence. Third sentence.", "language": "en"}
    response = client.post(PROCESS_URL, json=payload)
    assert response.status_code == 200
    data = response.json()
    indices = [s["index"] for s in data["sentences"]]
    assert indices == sorted(indices)
    assert indices[0] == 0


# ============================================================================
# 11. Question and exclamation marks treated as sentence boundaries
# ============================================================================

def test_question_mark_splits_sentences() -> None:
    """Requirement 11: Question mark is a valid sentence terminator."""
    text = "Can I book an appointment? Yes, of course."
    segments = segment_sentences(text)
    assert len(segments) == 2
    assert segments[0][0] == "Can I book an appointment?"
    assert segments[1][0] == "Yes, of course."


def test_exclamation_mark_splits_sentences() -> None:
    """Requirement 11: Exclamation mark is a valid sentence terminator."""
    text = "This is urgent! Please schedule it today."
    segments = segment_sentences(text)
    assert len(segments) == 2
    assert segments[0][0] == "This is urgent!"


def test_api_question_and_exclamation(client: TestClient) -> None:
    """Requirement 11 (API): mixed terminators handled correctly."""
    payload = {
        "transcript": "Is the doctor available? Yes! Please book the appointment.",
        "language": "en",
    }
    response = client.post(PROCESS_URL, json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["sentences"]) >= 2


# ============================================================================
# 12. Unicode character counting
# ============================================================================

def test_unicode_character_count_hindi() -> None:
    """Requirement 12: Character count uses Unicode code points, not bytes."""
    text = "नमस्ते"  # 6 Unicode code points
    from app.services.transcript_processing_service import compute_character_count
    assert compute_character_count(text) == len(text) == 6


def test_unicode_character_count_kannada() -> None:
    """Requirement 12: Kannada script counted correctly."""
    text = "ನಮಸ್ಕಾರ"  # actual code-point length matters
    from app.services.transcript_processing_service import compute_character_count
    assert compute_character_count(text) == len(text)


# ============================================================================
# 13. Character count is from normalized transcript
# ============================================================================

def test_character_count_from_normalized(client: TestClient) -> None:
    """Requirement 13: metadata.character_count matches len(normalized_transcript)."""
    payload = {
        "transcript": "  Hello, I need an appointment.  ",
        "language": "en",
    }
    response = client.post(PROCESS_URL, json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["metadata"]["character_count"] == len(data["normalized_transcript"])


# ============================================================================
# 14. Word count calculated correctly
# ============================================================================

def test_word_count_english() -> None:
    """Requirement 14: Word count matches whitespace-split token count for English."""
    from app.services.transcript_processing_service import compute_word_count
    text = "I need to book an appointment"
    # 6 words
    assert compute_word_count(text, "en") == 6


def test_api_word_count(client: TestClient) -> None:
    """Requirement 14 (API): word_count is present and positive for non-empty transcript."""
    payload = {"transcript": "Patient reports mild fever and cough.", "language": "en"}
    response = client.post(PROCESS_URL, json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["metadata"]["word_count"] is not None
    assert data["metadata"]["word_count"] > 0


# ============================================================================
# 15. Sentence count matches actual segments
# ============================================================================

def test_sentence_count_matches_sentences(client: TestClient) -> None:
    """Requirement 15: metadata.sentence_count equals len(sentences)."""
    payload = {
        "transcript": "First sentence. Second sentence. Third sentence.",
        "language": "en",
    }
    response = client.post(PROCESS_URL, json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["metadata"]["sentence_count"] == len(data["sentences"])


# ============================================================================
# 16. Maximum transcript length validation
# ============================================================================

def test_max_length_transcript_rejected(client: TestClient) -> None:
    """Requirement 16: Transcript exceeding MAX_TRANSCRIPT_LENGTH is rejected."""
    oversized = "a" * (settings.MAX_TRANSCRIPT_LENGTH + 1)
    response = client.post(PROCESS_URL, json={"transcript": oversized, "language": "en"})
    assert response.status_code == 422
    data = response.json()
    assert data["error"] == "Validation Error"


# ============================================================================
# 17. Negation "not" preserved
# ============================================================================

def test_negation_not_preserved() -> None:
    """Requirement 17: The word 'not' is never removed or altered."""
    text = "The patient does not have chest pain."
    result = normalize_transcript(text)
    assert "not" in result
    assert result == text  # normalization should not change this clean text


def test_negation_not_preserved_api(client: TestClient) -> None:
    """Requirement 17 (API): 'not' appears in normalized_transcript and sentence texts."""
    transcript = "The patient does not have chest pain. She does not report fever."
    response = client.post(PROCESS_URL, json={"transcript": transcript, "language": "en"})
    assert response.status_code == 200
    data = response.json()
    assert "not" in data["normalized_transcript"]
    all_sent_text = " ".join(s["text"] for s in data["sentences"])
    assert "not" in all_sent_text


# ============================================================================
# 18. Negation words "never", "without", "denies" preserved
# ============================================================================

def test_negation_words_preserved(client: TestClient) -> None:
    """Requirement 18: 'never', 'without', and 'denies' are preserved."""
    transcript = (
        "Patient denies any history of cardiac disease. "
        "She has never smoked. "
        "She presented without any fever or chills."
    )
    response = client.post(PROCESS_URL, json={"transcript": transcript, "language": "en"})
    assert response.status_code == 200
    data = response.json()
    norm = data["normalized_transcript"]
    assert "denies" in norm
    assert "never" in norm
    assert "without" in norm


# ============================================================================
# 19. Original transcript preserved
# ============================================================================

def test_original_transcript_preserved_api(client: TestClient) -> None:
    """Requirement 19: original_transcript equals the stripped (schema-validated) input."""
    raw = "  Patient called about fever.  "
    # The schema validator strips leading/trailing whitespace before we see it
    stripped = raw.strip()
    response = client.post(PROCESS_URL, json={"transcript": raw, "language": "en"})
    assert response.status_code == 200
    data = response.json()
    assert data["original_transcript"] == stripped


def test_original_not_replaced_by_normalized() -> None:
    """Requirement 19: original_transcript differs from normalized when they should differ."""
    svc = TranscriptProcessingService()
    # Input with internal multiple spaces
    raw = "Patient  had  a  fever."
    result = svc.process(transcript=raw, language="en")
    # original is exactly what was passed in
    assert result.original_transcript == raw
    # normalized has collapsed spaces
    assert result.normalized_transcript == "Patient had a fever."
    assert result.original_transcript != result.normalized_transcript


# ============================================================================
# 20. Sentence indices are sequential and zero-based
# ============================================================================

def test_sentence_indices_sequential() -> None:
    """Requirement 20: Sentence indices start at 0 and are contiguous."""
    svc = TranscriptProcessingService()
    result = svc.process(
        transcript="First. Second. Third.",
        language="en",
    )
    indices = [s.index for s in result.sentences]
    assert indices == list(range(len(indices)))
    assert indices[0] == 0


# ============================================================================
# 21. Character offsets reference normalized_transcript
# ============================================================================

def test_sentence_offsets_reference_normalized() -> None:
    """Requirement 21: start_char / end_char are valid slices of normalized_transcript."""
    svc = TranscriptProcessingService()
    result = svc.process(
        transcript="Hello, I need an appointment tomorrow. I also need a prescription refill.",
        language="en",
    )
    norm = result.normalized_transcript
    for sent in result.sentences:
        if sent.start_char is not None and sent.end_char is not None:
            extracted = norm[sent.start_char : sent.end_char]
            assert extracted == sent.text, (
                f"Sentence {sent.index}: offset slice '{extracted}' != text '{sent.text}'"
            )


# ============================================================================
# 22. Phase 1 tests not broken — health and validation endpoints
# ============================================================================

def test_health_endpoint_still_works(client: TestClient) -> None:
    """Requirement 22: Phase 1 health endpoint unaffected by Phase 3 additions."""
    response = client.get(HEALTH_URL)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


def test_validate_endpoint_still_works(client: TestClient) -> None:
    """Requirement 22: Phase 1 transcript/validate endpoint still works."""
    payload = {"transcript": "Patient needs a refill.", "language": "en"}
    response = client.post(VALIDATE_URL, json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "valid"


# ============================================================================
# 23. Phase 2 transcription endpoint schema not broken
# ============================================================================

def test_transcription_endpoint_still_rejects_missing_file(client: TestClient) -> None:
    """Requirement 23: Phase 2 transcribe endpoint still rejects missing file with 422."""
    response = client.post(TRANSCRIBE_URL)
    assert response.status_code == 422


# ============================================================================
# 24. Service unit test — direct call, no HTTP layer
# ============================================================================

def test_service_direct_call_english() -> None:
    """Requirement 24: Service can be called directly without going through HTTP."""
    svc = TranscriptProcessingService()
    result = svc.process(
        transcript="Patient called about a follow-up appointment. She was concerned about her blood pressure.",
        language="en",
    )
    assert result.success is True
    assert result.language == "en"
    assert len(result.sentences) == 2
    assert result.metadata.sentence_count == 2
    assert result.metadata.character_count == len(result.normalized_transcript)


def test_service_rejects_empty_transcript() -> None:
    """Requirement 24: Service raises TranscriptProcessingError on empty input."""
    svc = TranscriptProcessingService()
    with pytest.raises(TranscriptProcessingError):
        svc.process(transcript="", language="en")


def test_service_rejects_whitespace_only() -> None:
    """Requirement 24: Service raises TranscriptProcessingError on whitespace-only input."""
    svc = TranscriptProcessingService()
    with pytest.raises(TranscriptProcessingError):
        svc.process(transcript="   \n  ", language="en")


# ============================================================================
# 25. Hindi danda (।) as sentence boundary
# ============================================================================

def test_hindi_danda_sentence_boundary() -> None:
    """Requirement 25: Hindi danda (।) is treated as a sentence terminator."""
    text = "मरीज को बुखार है। कृपया अपॉइंटमेंट बुक करें।"
    segments = segment_sentences(text)
    assert len(segments) == 2
    assert "मरीज को बुखार है।" == segments[0][0]


# ============================================================================
# 26. Abbreviation "Dr." does not trigger spurious split
# ============================================================================

def test_dr_abbreviation_not_split() -> None:
    """Requirement 26: 'Dr.' is not treated as a sentence terminator."""
    text = "Good morning, this is Dr. Smith from the clinic. How can I help you?"
    segments = segment_sentences(text)
    # "Dr. Smith" should NOT create a split after "Dr."
    texts = [s[0] for s in segments]
    # First segment should contain "Dr. Smith"
    assert any("Dr. Smith" in t for t in texts), f"Got segments: {texts}"


# ============================================================================
# 27. Response schema has expected top-level keys
# ============================================================================

def test_response_schema_keys(client: TestClient) -> None:
    """Requirement 27: Response contains all mandatory top-level fields."""
    payload = {"transcript": EN_SIMPLE, "language": "en"}
    response = client.post(PROCESS_URL, json=payload)
    assert response.status_code == 200
    data = response.json()

    expected_keys = {
        "success",
        "language",
        "original_transcript",
        "normalized_transcript",
        "sentences",
        "metadata",
    }
    assert expected_keys.issubset(data.keys()), (
        f"Missing keys: {expected_keys - set(data.keys())}"
    )

    # Metadata sub-keys
    meta = data["metadata"]
    assert "character_count" in meta
    assert "word_count" in meta
    assert "sentence_count" in meta
    assert "is_empty" in meta

    # Sentence sub-keys
    for sent in data["sentences"]:
        assert "index" in sent
        assert "text" in sent


# ============================================================================
# 28. Phase 4+ fields NOT present in Phase 3 response
# ============================================================================

def test_phase4_fields_absent(client: TestClient) -> None:
    """Requirement 28: Phase 3 response must NOT include Phase 4+ intelligence fields."""
    payload = {"transcript": EN_SIMPLE, "language": "en"}
    response = client.post(PROCESS_URL, json=payload)
    assert response.status_code == 200
    data = response.json()

    forbidden_keys = {
        "intent", "summary", "sentiment", "priority",
        "actions", "commitments", "sentiment_score",
    }
    present_forbidden = forbidden_keys.intersection(data.keys())
    assert not present_forbidden, (
        f"Phase 4+ fields must not be in Phase 3 response: {present_forbidden}"
    )


# ============================================================================
# Additional edge-case tests
# ============================================================================

def test_single_sentence_no_terminator(client: TestClient) -> None:
    """Single sentence without a trailing terminator is returned as one segment."""
    payload = {"transcript": "Patient called about their medication", "language": "en"}
    response = client.post(PROCESS_URL, json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["sentences"]) == 1
    assert data["sentences"][0]["index"] == 0


def test_multi_sentence_english_full_pipeline(client: TestClient) -> None:
    """Full pipeline on a multi-sentence English healthcare transcript."""
    response = client.post(PROCESS_URL, json={"transcript": EN_MULTI, "language": "en"})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    # EN_MULTI has 4 sentences; exact count depends on Dr. abbreviation handling
    assert data["metadata"]["sentence_count"] >= 3
    assert data["metadata"]["character_count"] == len(data["normalized_transcript"])
    # negation preserved in normalized
    assert "not" in data["normalized_transcript"]
    assert "never" in data["normalized_transcript"]


def test_is_empty_false_for_valid_transcript(client: TestClient) -> None:
    """metadata.is_empty must be False for a non-empty transcript."""
    payload = {"transcript": "Patient has a headache.", "language": "en"}
    response = client.post(PROCESS_URL, json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["metadata"]["is_empty"] is False


def test_crlf_normalization() -> None:
    """CRLF line endings in the transcript are normalized to LF."""
    raw = "First sentence.\r\nSecond sentence."
    result = normalize_transcript(raw)
    assert "\r\n" not in result
    assert "First sentence." in result
    assert "Second sentence." in result


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
